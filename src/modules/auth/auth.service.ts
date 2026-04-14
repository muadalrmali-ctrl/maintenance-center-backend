import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { caseStatusHistory, cases, customers, devices, inventoryItems, inventoryMovements, invoices, staffInvitations, users } from "../../db/schema";
import { env } from "../../config/env";
import { APP_ROLES, TEAM_ROLES, isAppRole, roleLabels, type AppRole } from "../../lib/roles";

type RegisterUserInput = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: string;
};

type LoginUserInput = {
  email: string;
  password: string;
};

type ActivateStaffAccountInput = {
  name: string;
  email: string;
  role: AppRole;
  temporaryPassword?: string;
};

type LoginResult = {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    createdAt: Date | null;
  };
  token: string;
};

type ActivatedStaffAccount = {
  id: number;
  name: string;
  email: string;
  role: AppRole;
  temporaryPassword: string;
  created: boolean;
};

type TeamMemberDetails = {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    phone: string | null;
    status: string;
    joinDate: Date | null;
    specialty: string | null;
    profilePhotoUrl: string | null;
  };
  technicianSummary?: {
    totalCasesWorked: number;
    totalCompletedCases: number;
    totalCurrentCases: number;
    totalDelayedCases: number;
    averageRepairDurationHours: number | null;
    completionRate: number | null;
    delayRate: number | null;
    returnedOrReopenedCasesCount?: number | null;
    overallRating?: number | null;
    managerNotes?: string | null;
    lastActivityAt?: Date | null;
    lastCaseWorkedOn?: {
      caseId: number;
      caseCode: string;
      customerName: string | null;
      deviceLabel: string | null;
    } | null;
  };
  storeManagerSummary?: {
    totalPartDeliveryActions: number;
    totalStockConfirmationActions: number;
    totalPendingConfirmations: number;
    lastActivityAt?: Date | null;
  };
  currentCases?: Array<{
    id: number;
    caseCode: string;
    customerName: string | null;
    deviceLabel: string | null;
    status: string;
    priority: string;
    executionDueAt?: Date | null;
  }>;
  completedCases?: Array<{
    id: number;
    caseCode: string;
    customerName: string | null;
    deviceLabel: string | null;
    completedAt?: Date | null;
    finalResult?: string | null;
  }>;
  pendingConfirmations?: {
    directSales: Array<{
      id: number;
      saleCode: string | null;
      invoiceNumber: string;
      customerName: string | null;
      total: string;
      createdAt?: Date | null;
    }>;
    pendingPartHandoffs: Array<{
      caseId: number;
      caseCode: string;
      customerName: string | null;
      partName: string | null;
      quantity: number;
      addedAt?: Date | null;
    }>;
  };
  recentStockMovements?: Array<{
    id: number;
    movementType: string;
    quantity: number;
    itemName: string | null;
    notes: string | null;
    createdAt: Date | null;
  }>;
  activities: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    caseId?: number | null;
    caseCode?: string | null;
    occurredAt: Date | null;
  }>;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const generateTemporaryPassword = () => {
  const token = crypto.randomBytes(9).toString("base64url");
  return `Tmp-${token}9!`;
};

const getRoleLabel = (role: string) => {
  switch (role) {
    case "technician":
      return "فني صيانة";
    case "technician_manager":
      return "مسؤول الفنيين";
    case "store_manager":
      return "مسؤول مخزن";
    case "receptionist":
      return "موظف استقبال";
    case "admin":
      return "إدارة";
    default:
      return role;
  }
};

const buildDeviceLabel = (brand?: string | null, applianceType?: string | null, modelName?: string | null) =>
  [brand, applianceType, modelName].filter(Boolean).join(" - ") || null;

const toPercent = (value: number, total: number) => {
  if (total <= 0) return null;
  return Number(((value / total) * 100).toFixed(1));
};

const toAverageHours = (values: number[]) => {
  if (!values.length) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Number((total / values.length).toFixed(1));
};

export const authService = {
  async getTeamMembers() {
    return await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(inArray(users.role, [...TEAM_ROLES]));
  },

  async getTechnicians() {
    return await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(inArray(users.role, ["technician", "technician_manager"]));
  },

  async getTeamMemberDetails(userId: number): Promise<TeamMemberDetails | undefined> {
    const foundUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const member = foundUsers[0];
    if (!member || !TEAM_ROLES.includes(member.role as (typeof TEAM_ROLES)[number])) {
      return undefined;
    }

    const invitationRows = await db
      .select({
        phone: staffInvitations.phone,
        acceptedAt: staffInvitations.acceptedAt,
        status: staffInvitations.status,
      })
      .from(staffInvitations)
      .where(eq(staffInvitations.acceptedBy, userId))
      .orderBy(desc(staffInvitations.acceptedAt), desc(staffInvitations.createdAt))
      .limit(1);

    const baseDetails: TeamMemberDetails = {
      user: {
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
        phone: member.phone ?? invitationRows[0]?.phone ?? null,
        status: "نشط",
        joinDate: member.createdAt,
        specialty: null,
        profilePhotoUrl: null,
      },
      activities: [],
    };

    if (member.role === "technician" || member.role === "technician_manager") {
      const currentCases = await db
        .select({
          id: cases.id,
          caseCode: cases.caseCode,
          customerName: customers.name,
          deviceBrand: devices.brand,
          deviceApplianceType: devices.applianceType,
          deviceModelName: devices.modelName,
          status: cases.status,
          priority: cases.priority,
          executionDueAt: cases.executionDueAt,
        })
        .from(cases)
        .leftJoin(customers, eq(cases.customerId, customers.id))
        .leftJoin(devices, eq(cases.deviceId, devices.id))
        .where(sql`${cases.assignedTechnicianId} = ${userId} and ${cases.operationFinalizedAt} is null`)
        .orderBy(desc(cases.updatedAt));

      const completedCases = await db
        .select({
          id: cases.id,
          caseCode: cases.caseCode,
          customerName: customers.name,
          deviceBrand: devices.brand,
          deviceApplianceType: devices.applianceType,
          deviceModelName: devices.modelName,
          executionCompletedAt: cases.executionCompletedAt,
          operationFinalizedAt: cases.operationFinalizedAt,
          finalResult: cases.finalResult,
          executionStartedAt: cases.executionStartedAt,
        })
        .from(cases)
        .leftJoin(customers, eq(cases.customerId, customers.id))
        .leftJoin(devices, eq(cases.deviceId, devices.id))
        .where(sql`${cases.assignedTechnicianId} = ${userId} and ${cases.operationFinalizedAt} is not null`)
        .orderBy(desc(cases.operationFinalizedAt));

      const recentCaseActivities = await db.execute(sql`
        select
          csh.id,
          csh.to_status as "type",
          csh.notes,
          csh.created_at as "occurredAt",
          c.id as "caseId",
          c.case_code as "caseCode"
        from case_status_history csh
        left join cases c on c.id = csh.case_id
        where csh.changed_by = ${userId}
        order by csh.created_at desc
        limit 8
      `);

      const assignmentRows = await db
        .select({
          caseId: cases.id,
          caseCode: cases.caseCode,
          customerName: customers.name,
          deviceBrand: devices.brand,
          deviceApplianceType: devices.applianceType,
          deviceModelName: devices.modelName,
          createdAt: cases.createdAt,
        })
        .from(cases)
        .leftJoin(customers, eq(cases.customerId, customers.id))
        .leftJoin(devices, eq(cases.deviceId, devices.id))
        .where(eq(cases.assignedTechnicianId, userId))
        .orderBy(desc(cases.createdAt))
        .limit(4);

      const delayedCases = currentCases.filter((entry) => entry.executionDueAt && new Date(entry.executionDueAt) < new Date()).length;
      const totalCasesWorked = currentCases.length + completedCases.length;
      const durationHours = completedCases
        .map((entry) => {
          const start = entry.executionStartedAt ? new Date(entry.executionStartedAt) : null;
          const end = entry.operationFinalizedAt ? new Date(entry.operationFinalizedAt) : entry.executionCompletedAt ? new Date(entry.executionCompletedAt) : null;
          return start && end ? (end.getTime() - start.getTime()) / (1000 * 60 * 60) : null;
        })
        .filter((value): value is number => value != null && value >= 0);

      const activityRows = [
        ...assignmentRows.map((entry) => ({
          id: `assignment-${entry.caseId}`,
          type: "assignment",
          title: "تم تعيينه على الحالة",
          description: `${entry.caseCode} • ${entry.customerName || "بدون عميل"}${buildDeviceLabel(entry.deviceBrand, entry.deviceApplianceType, entry.deviceModelName) ? ` • ${buildDeviceLabel(entry.deviceBrand, entry.deviceApplianceType, entry.deviceModelName)}` : ""}`,
          caseId: entry.caseId,
          caseCode: entry.caseCode,
          occurredAt: entry.createdAt,
        })),
        ...(recentCaseActivities.rows as Array<{ id: number; type: string; notes: string | null; occurredAt: Date | null; caseId: number | null; caseCode: string | null }>).map((entry) => ({
          id: `history-${entry.id}`,
          type: entry.type,
          title:
            entry.type === "in_progress"
              ? "بدأ التنفيذ"
              : entry.type === "repaired"
                ? "أكمل الإصلاح"
                : entry.type === "completed"
                  ? "أنهى الحالة"
                  : "تحديث على الحالة",
          description: `${entry.caseCode || "بدون حالة"}${entry.notes ? ` • ${entry.notes}` : ""}`,
          caseId: entry.caseId,
          caseCode: entry.caseCode,
          occurredAt: entry.occurredAt,
        })),
      ]
        .sort((left, right) => new Date(String(right.occurredAt ?? 0)).getTime() - new Date(String(left.occurredAt ?? 0)).getTime())
        .slice(0, 10);

      return {
        ...baseDetails,
        technicianSummary: {
          totalCasesWorked,
          totalCompletedCases: completedCases.length,
          totalCurrentCases: currentCases.length,
          totalDelayedCases: delayedCases,
          averageRepairDurationHours: toAverageHours(durationHours),
          completionRate: toPercent(completedCases.length, totalCasesWorked),
          delayRate: toPercent(delayedCases, totalCasesWorked),
          returnedOrReopenedCasesCount: null,
          overallRating: null,
          managerNotes: null,
          lastActivityAt: activityRows[0]?.occurredAt ?? null,
          lastCaseWorkedOn: completedCases[0]
            ? {
                caseId: completedCases[0].id,
                caseCode: completedCases[0].caseCode,
                customerName: completedCases[0].customerName,
                deviceLabel: buildDeviceLabel(
                  completedCases[0].deviceBrand,
                  completedCases[0].deviceApplianceType,
                  completedCases[0].deviceModelName
                ),
              }
            : currentCases[0]
              ? {
                  caseId: currentCases[0].id,
                  caseCode: currentCases[0].caseCode,
                  customerName: currentCases[0].customerName,
                  deviceLabel: buildDeviceLabel(
                    currentCases[0].deviceBrand,
                    currentCases[0].deviceApplianceType,
                    currentCases[0].deviceModelName
                  ),
                }
              : null,
        },
        currentCases: currentCases.map((entry) => ({
          id: entry.id,
          caseCode: entry.caseCode,
          customerName: entry.customerName,
          deviceLabel: buildDeviceLabel(entry.deviceBrand, entry.deviceApplianceType, entry.deviceModelName),
          status: entry.status,
          priority: entry.priority,
          executionDueAt: entry.executionDueAt,
        })),
        completedCases: completedCases.map((entry) => ({
          id: entry.id,
          caseCode: entry.caseCode,
          customerName: entry.customerName,
          deviceLabel: buildDeviceLabel(entry.deviceBrand, entry.deviceApplianceType, entry.deviceModelName),
          completedAt: entry.operationFinalizedAt ?? entry.executionCompletedAt,
          finalResult: entry.finalResult,
        })),
        activities: activityRows,
      };
    }

    if (member.role === "store_manager") {
      const deliveryCountResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(inventoryMovements)
        .where(sql`${inventoryMovements.createdBy} = ${userId} and ${inventoryMovements.movementType} = 'delivered_to_case'`);

      const confirmationCountResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(invoices)
        .where(sql`${invoices.confirmedBy} = ${userId} and ${invoices.invoiceType} = 'direct_sale'`);

      const pendingDirectSales = await db
        .select({
          id: invoices.id,
          saleCode: invoices.saleCode,
          invoiceNumber: invoices.invoiceNumber,
          customerName: sql<string | null>`coalesce(${customers.name}, ${invoices.directCustomerName})`,
          total: invoices.total,
          createdAt: invoices.createdAt,
        })
        .from(invoices)
        .leftJoin(customers, eq(invoices.customerId, customers.id))
        .where(sql`${invoices.invoiceType} = 'direct_sale' and ${invoices.status} = 'draft'`)
        .orderBy(desc(invoices.createdAt));

      const pendingPartHandoffs = await db.execute(sql`
        select
          c.id as "caseId",
          c.case_code as "caseCode",
          cu.name as "customerName",
          ii.name as "partName",
          cp.quantity,
          cp.created_at as "addedAt"
        from case_parts cp
        inner join cases c on c.id = cp.case_id
        left join customers cu on cu.id = c.customer_id
        left join inventory_items ii on ii.id = cp.inventory_item_id
        where cp.handoff_status = 'pending'
          and c.status = 'waiting_approval'
          and c.customer_approved_at is not null
        order by cp.created_at desc
        limit 10
      `);

      const recentStockMovements = await db.execute(sql`
        select
          im.id,
          im.movement_type as "movementType",
          im.quantity,
          ii.name as "itemName",
          im.notes,
          im.created_at as "createdAt"
        from inventory_movements im
        left join inventory_items ii on ii.id = im.inventory_item_id
        where im.created_by = ${userId}
        order by im.created_at desc
        limit 10
      `);

      const activities = (recentStockMovements.rows as Array<{ id: number; movementType: string; quantity: number; itemName: string | null; notes: string | null; createdAt: Date | null }>).map((entry) => ({
        id: `movement-${entry.id}`,
        type: entry.movementType,
        title:
          entry.movementType === "delivered_to_case"
            ? "سلّم قطعة إلى حالة"
            : entry.movementType === "sold_direct"
              ? "أكد بيعاً مباشراً"
              : entry.movementType === "adjustment"
                ? "حدّث كمية مخزون"
                : entry.movementType === "item_updated"
                  ? "حدّث بيانات قطعة"
                  : entry.movementType === "item_archived"
                    ? "أرشف قطعة"
                    : "نشاط مخزني",
        description: [entry.itemName, entry.notes].filter(Boolean).join(" • ") || "نشاط مخزني",
        occurredAt: entry.createdAt,
      }));

      return {
        ...baseDetails,
        storeManagerSummary: {
          totalPartDeliveryActions: deliveryCountResult[0]?.count ?? 0,
          totalStockConfirmationActions: confirmationCountResult[0]?.count ?? 0,
          totalPendingConfirmations: pendingDirectSales.length + pendingPartHandoffs.rows.length,
          lastActivityAt: activities[0]?.occurredAt ?? null,
        },
        pendingConfirmations: {
          directSales: pendingDirectSales,
          pendingPartHandoffs: pendingPartHandoffs.rows as Array<{
            caseId: number;
            caseCode: string;
            customerName: string | null;
            partName: string | null;
            quantity: number;
            addedAt: Date | null;
          }>,
        },
        recentStockMovements: recentStockMovements.rows as TeamMemberDetails["recentStockMovements"],
        activities,
      };
    }

    const caseCreations = await db
      .select({
        id: cases.id,
        caseCode: cases.caseCode,
        createdAt: cases.createdAt,
      })
      .from(cases)
      .where(eq(cases.createdBy, userId))
      .orderBy(desc(cases.createdAt))
      .limit(6);

    const caseUpdates = await db.execute(sql`
      select
        csh.id,
        csh.notes,
        csh.created_at as "occurredAt",
        c.id as "caseId",
        c.case_code as "caseCode"
      from case_status_history csh
      left join cases c on c.id = csh.case_id
      where csh.changed_by = ${userId}
      order by csh.created_at desc
      limit 6
    `);

    return {
      ...baseDetails,
      activities: [
        ...caseCreations.map((entry) => ({
          id: `created-case-${entry.id}`,
          type: "case_created",
          title: "أنشأ حالة",
          description: entry.caseCode,
          caseId: entry.id,
          caseCode: entry.caseCode,
          occurredAt: entry.createdAt,
        })),
        ...(caseUpdates.rows as Array<{ id: number; notes: string | null; occurredAt: Date | null; caseId: number | null; caseCode: string | null }>).map((entry) => ({
          id: `case-update-${entry.id}`,
          type: "case_update",
          title: "نشاط على حالة",
          description: `${entry.caseCode || "بدون حالة"}${entry.notes ? ` • ${entry.notes}` : ""}`,
          caseId: entry.caseId,
          caseCode: entry.caseCode,
          occurredAt: entry.occurredAt,
        })),
      ]
        .sort((left, right) => new Date(String(right.occurredAt ?? 0)).getTime() - new Date(String(left.occurredAt ?? 0)).getTime())
        .slice(0, 10),
    };
  },

  async registerUser(input: RegisterUserInput) {
    const { name, password, phone, role = "technician" } = input;
    const email = normalizeEmail(input.email);

    if (!isAppRole(role)) {
      throw new Error("Invalid role specified");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const createdUsers = await db
      .insert(users)
      .values({
        name,
        email,
        password: hashedPassword,
        phone: phone?.trim() || null,
        role,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      });

    return createdUsers[0];
  },

  async loginUser(data: LoginUserInput): Promise<LoginResult> {
    const email = normalizeEmail(data.email);
    const foundUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const user = foundUsers[0];

    if (!user) {
      throw new Error("User not found");
    }

    const isMatch = await bcrypt.compare(data.password, user.password);

    if (!isMatch) {
      throw new Error("Invalid password");
    }

    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      env.JWT_SECRET,
      {
        expiresIn: env.JWT_EXPIRES_IN,
      }
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      token,
    };
  },

  async activateStaffAccounts(accounts: ActivateStaffAccountInput[]): Promise<ActivatedStaffAccount[]> {
    if (!accounts.length) {
      throw new Error("At least one staff account is required");
    }

    const activatedAccounts: ActivatedStaffAccount[] = [];

    for (const account of accounts) {
      const email = normalizeEmail(account.email);
      const name = account.name.trim();

      if (!name) {
        throw new Error("Staff name is required");
      }

      if (!email) {
        throw new Error("Staff email is required");
      }

      if (!isAppRole(account.role)) {
        throw new Error(`Invalid role specified for ${email}`);
      }

      const temporaryPassword = account.temporaryPassword?.trim() || generateTemporaryPassword();
      if (temporaryPassword.length < 8) {
        throw new Error(`Temporary password for ${email} must be at least 8 characters`);
      }

      const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

      const existingUsers = await db
        .select({
          id: users.id,
        })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUsers[0]) {
        const updatedUsers = await db
          .update(users)
          .set({
            name,
            email,
            password: hashedPassword,
            role: account.role,
          })
          .where(eq(users.id, existingUsers[0].id))
          .returning({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
          });

        activatedAccounts.push({
          id: updatedUsers[0].id,
          name: updatedUsers[0].name,
          email: updatedUsers[0].email,
          role: updatedUsers[0].role as AppRole,
          temporaryPassword,
          created: false,
        });

        continue;
      }

      const createdUsers = await db
        .insert(users)
        .values({
          name,
          email,
          password: hashedPassword,
          role: account.role,
        })
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
        });

      activatedAccounts.push({
        id: createdUsers[0].id,
        name: createdUsers[0].name,
        email: createdUsers[0].email,
        role: createdUsers[0].role as AppRole,
        temporaryPassword,
        created: true,
      });
    }

    return activatedAccounts;
  },
};
