import { db } from "../../db";
import { cases, caseStatusHistory, customers, devices, inventoryItems, users } from "../../db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { CaseStatus, CASE_STATUSES } from "./constants";
import { validateStatusTransition, validateStatusSpecificRules } from "./cases.validation";

type CreateCaseInput = {
  customerId?: number;
  customer?: {
    name: string;
    phone: string;
    address?: string;
    notes?: string;
  };
  deviceId?: number;
  device?: {
    applianceType: string;
    brand?: string;
    modelName: string;
    modelCode?: string;
    notes?: string;
  };
  customerComplaint: string;
  priority?: string;
  maintenanceTeam?: string;
  technicianName?: string;
  serialNumber?: string;
  notes?: string;
  deliveryDueAt?: Date;
  assignedTechnicianId?: number;
  createdBy: number;
};

type UpdateCaseInput = {
  deviceId?: number;
  customerComplaint?: string;
  priority?: string;
  maintenanceTeam?: string | null;
  technicianName?: string | null;
  serialNumber?: string | null;
  notes?: string | null;
  deliveryDueAt?: Date | null;
  waitingPartInventoryItemId?: number | null;
  waitingPartName?: string | null;
  waitingPartNotes?: string | null;
  waitingPartImageUrl?: string | null;
  diagnosisNote?: string | null;
  faultCause?: string | null;
  latestMessage?: string | null;
  latestMessageChannel?: string | null;
  latestMessageSentAt?: Date | null;
  assignedTechnicianId?: number | null;
  finalResult?: string | null;
};

type ChangeStatusInput = {
  toStatus: CaseStatus;
  notes?: string | null;
  executionDueAt?: Date | null;
  finalResult?: string | null;
  changedBy: number;
};

type CaseRow = {
  id: number;
  caseCode: string;
  customerId: number;
  deviceId: number;
  status: string;
  customerComplaint: string;
  priority: string;
  maintenanceTeam: string | null;
  technicianName: string | null;
  serialNumber: string | null;
  notes: string | null;
  deliveryDueAt: Date | null;
  executionStartedAt: Date | null;
  executionDueAt: Date | null;
  waitingPartInventoryItemId: number | null;
  waitingPartName: string | null;
  waitingPartNotes: string | null;
  waitingPartImageUrl: string | null;
  diagnosisNote: string | null;
  faultCause: string | null;
  latestMessage: string | null;
  latestMessageChannel: string | null;
  latestMessageSentAt: Date | null;
  finalResult: string | null;
  isArchived: boolean;
  createdBy: number;
  assignedTechnicianId: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

type CaseHistoryRow = {
  id: number;
  caseId: number | null;
  fromStatus: string | null;
  toStatus: string;
  changedBy: number | null;
  notes: string | null;
  createdAt: Date | null;
};

type CaseDetails = {
  caseData: CaseRow;
  customer: {
    id: number;
    name: string;
    phone: string;
    address: string | null;
  } | null;
  device: {
    id: number;
    applianceType: string;
    brand: string;
    modelName: string;
    modelCode: string | null;
    notes: string | null;
  } | null;
  history: CaseHistoryRow[];
  waitingPartInventoryItem: {
    id: number;
    name: string;
    code: string;
    imageUrl: string | null;
    sellingPrice: string | null;
  } | null;
  createdByUser: {
    id: number;
    name: string;
    email: string;
  } | null;
  assignedTechnician: {
    id: number;
    name: string;
    email: string;
  } | null;
};

const returnCaseFields = {
  id: cases.id,
  caseCode: cases.caseCode,
  customerId: cases.customerId,
  deviceId: cases.deviceId,
  status: cases.status,
  customerComplaint: cases.customerComplaint,
  priority: cases.priority,
  maintenanceTeam: cases.maintenanceTeam,
  technicianName: cases.technicianName,
  serialNumber: cases.serialNumber,
  notes: cases.notes,
  deliveryDueAt: cases.deliveryDueAt,
  executionStartedAt: cases.executionStartedAt,
  executionDueAt: cases.executionDueAt,
  waitingPartInventoryItemId: cases.waitingPartInventoryItemId,
  waitingPartName: cases.waitingPartName,
  waitingPartNotes: cases.waitingPartNotes,
  waitingPartImageUrl: cases.waitingPartImageUrl,
  diagnosisNote: cases.diagnosisNote,
  faultCause: cases.faultCause,
  latestMessage: cases.latestMessage,
  latestMessageChannel: cases.latestMessageChannel,
  latestMessageSentAt: cases.latestMessageSentAt,
  finalResult: cases.finalResult,
  isArchived: cases.isArchived,
  createdBy: cases.createdBy,
  assignedTechnicianId: cases.assignedTechnicianId,
  createdAt: cases.createdAt,
  updatedAt: cases.updatedAt,
};

export const caseService = {
  async generateCaseCode(tx: any = db): Promise<string> {
    const lastCase = await tx
      .select({ caseCode: cases.caseCode })
      .from(cases)
      .where(sql`${cases.caseCode} ~ '^C[0-9]+$'`)
      .orderBy(desc(sql`CAST(SUBSTRING(${cases.caseCode} FROM 2) AS integer)`))
      .limit(1);

    const lastNumber = lastCase[0]?.caseCode
      ? Number(lastCase[0].caseCode.replace(/^C/, ""))
      : 99;
    const nextNumber = Math.max(lastNumber + 1, 100);

    return `C${nextNumber}`;
  },

  async createCase(input: CreateCaseInput): Promise<CaseRow> {
    return await db.transaction(async (tx) => {
      await tx.execute(sql`LOCK TABLE "cases" IN EXCLUSIVE MODE`);

      const caseCode = await this.generateCaseCode(tx);
      let customerId = input.customerId;
      let deviceId = input.deviceId;

      if (!customerId && input.customer) {
        const createdCustomers = await tx
          .insert(customers)
          .values({
            name: input.customer.name,
            phone: input.customer.phone,
            address: input.customer.address,
            notes: input.customer.notes,
            createdBy: input.createdBy,
          })
          .returning({ id: customers.id });

        customerId = createdCustomers[0].id;
      }

      if (!deviceId && input.device) {
        const createdDevices = await tx
          .insert(devices)
          .values({
            applianceType: input.device.applianceType,
            brand: input.device.brand || "غير محدد",
            modelName: input.device.modelName,
            modelCode: input.device.modelCode,
            notes: input.device.notes,
            createdBy: input.createdBy,
          })
          .returning({ id: devices.id });

        deviceId = createdDevices[0].id;
      }

      if (!customerId || !deviceId) {
        throw new Error("Customer and device data are required");
      }

      const createdCases = await tx
        .insert(cases)
        .values({
          caseCode,
          customerId,
          deviceId,
          customerComplaint: input.customerComplaint,
          priority: input.priority || "متوسطة",
          maintenanceTeam: input.maintenanceTeam,
          technicianName: input.technicianName,
          serialNumber: input.serialNumber,
          notes: input.notes,
          deliveryDueAt: input.deliveryDueAt,
          assignedTechnicianId: input.assignedTechnicianId,
          createdBy: input.createdBy,
        })
        .returning(returnCaseFields);

      const createdCase = createdCases[0];

      await tx.insert(caseStatusHistory).values({
        caseId: createdCase.id,
        fromStatus: null,
        toStatus: CASE_STATUSES.RECEIVED,
        changedBy: input.createdBy,
        notes: "Case created",
      });

      return createdCase;
    });
  },

  async getCases(): Promise<any[]> {
    return await db
      .select({
        id: cases.id,
        caseCode: cases.caseCode,
        customerId: cases.customerId,
        deviceId: cases.deviceId,
        status: cases.status,
        customerComplaint: cases.customerComplaint,
        priority: cases.priority,
        maintenanceTeam: cases.maintenanceTeam,
        technicianName: cases.technicianName,
        serialNumber: cases.serialNumber,
        notes: cases.notes,
        deliveryDueAt: cases.deliveryDueAt,
        executionStartedAt: cases.executionStartedAt,
        executionDueAt: cases.executionDueAt,
        waitingPartInventoryItemId: cases.waitingPartInventoryItemId,
        waitingPartName: cases.waitingPartName,
        waitingPartNotes: cases.waitingPartNotes,
        waitingPartImageUrl: cases.waitingPartImageUrl,
        diagnosisNote: cases.diagnosisNote,
        faultCause: cases.faultCause,
        latestMessage: cases.latestMessage,
        latestMessageChannel: cases.latestMessageChannel,
        latestMessageSentAt: cases.latestMessageSentAt,
        finalResult: cases.finalResult,
        isArchived: cases.isArchived,
        createdBy: cases.createdBy,
        assignedTechnicianId: cases.assignedTechnicianId,
        createdAt: cases.createdAt,
        updatedAt: cases.updatedAt,
        customerName: customers.name,
        customerPhone: customers.phone,
        deviceApplianceType: devices.applianceType,
        deviceBrand: devices.brand,
        deviceModelName: devices.modelName,
        deviceModelCode: devices.modelCode,
        deviceNotes: devices.notes,
      })
      .from(cases)
      .leftJoin(customers, eq(cases.customerId, customers.id))
      .leftJoin(devices, eq(cases.deviceId, devices.id))
      .orderBy(desc(cases.createdAt));
  },

  async getCaseById(id: number): Promise<CaseDetails | undefined> {
    const foundCases = await db
      .select(returnCaseFields)
      .from(cases)
      .where(eq(cases.id, id))
      .limit(1);

    const caseData = foundCases[0];
    if (!caseData) {
      return undefined;
    }

    const customerResult = await db
      .select({
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
        address: customers.address,
      })
      .from(customers)
      .where(eq(customers.id, caseData.customerId))
      .limit(1);

    const deviceResult = await db
      .select({
        id: devices.id,
        applianceType: devices.applianceType,
        brand: devices.brand,
        modelName: devices.modelName,
        modelCode: devices.modelCode,
        notes: devices.notes,
      })
      .from(devices)
      .where(eq(devices.id, caseData.deviceId))
      .limit(1);

    const history = await db
      .select()
      .from(caseStatusHistory)
      .where(eq(caseStatusHistory.caseId, id))
      .orderBy(caseStatusHistory.createdAt);

    const waitingPartInventoryItem = caseData.waitingPartInventoryItemId
      ? (
          await db
            .select({
              id: inventoryItems.id,
              name: inventoryItems.name,
              code: inventoryItems.code,
              imageUrl: inventoryItems.imageUrl,
              sellingPrice: inventoryItems.sellingPrice,
            })
            .from(inventoryItems)
            .where(eq(inventoryItems.id, caseData.waitingPartInventoryItemId))
            .limit(1)
        )[0] || null
      : null;

    const createdByUser =
      (
        await db
          .select({ id: users.id, name: users.name, email: users.email })
          .from(users)
          .where(eq(users.id, caseData.createdBy))
          .limit(1)
      )[0] || null;

    const assignedTechnician = caseData.assignedTechnicianId
      ? (
          await db
            .select({ id: users.id, name: users.name, email: users.email })
            .from(users)
            .where(eq(users.id, caseData.assignedTechnicianId))
            .limit(1)
        )[0] || null
      : null;

    return {
      caseData,
      customer: customerResult[0] || null,
      device: deviceResult[0] || null,
      history,
      waitingPartInventoryItem,
      createdByUser,
      assignedTechnician,
    };
  },

  async updateCase(id: number, input: UpdateCaseInput): Promise<CaseRow | undefined> {
    const updateData: Partial<UpdateCaseInput & { updatedAt: Date }> = {
      updatedAt: new Date(),
    };

    if (input.deviceId !== undefined) updateData.deviceId = input.deviceId;
    if (input.customerComplaint !== undefined) updateData.customerComplaint = input.customerComplaint;
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.maintenanceTeam !== undefined) updateData.maintenanceTeam = input.maintenanceTeam;
    if (input.technicianName !== undefined) updateData.technicianName = input.technicianName;
    if (input.serialNumber !== undefined) updateData.serialNumber = input.serialNumber;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.deliveryDueAt !== undefined) updateData.deliveryDueAt = input.deliveryDueAt;
    if (input.waitingPartInventoryItemId !== undefined) updateData.waitingPartInventoryItemId = input.waitingPartInventoryItemId;
    if (input.waitingPartName !== undefined) updateData.waitingPartName = input.waitingPartName;
    if (input.waitingPartNotes !== undefined) updateData.waitingPartNotes = input.waitingPartNotes;
    if (input.waitingPartImageUrl !== undefined) updateData.waitingPartImageUrl = input.waitingPartImageUrl;
    if (input.diagnosisNote !== undefined) updateData.diagnosisNote = input.diagnosisNote;
    if (input.faultCause !== undefined) updateData.faultCause = input.faultCause;
    if (input.latestMessage !== undefined) updateData.latestMessage = input.latestMessage;
    if (input.latestMessageChannel !== undefined) updateData.latestMessageChannel = input.latestMessageChannel;
    if (input.latestMessageSentAt !== undefined) updateData.latestMessageSentAt = input.latestMessageSentAt;
    if (input.assignedTechnicianId !== undefined) updateData.assignedTechnicianId = input.assignedTechnicianId;
    if (input.finalResult !== undefined) updateData.finalResult = input.finalResult;

    const updatedCases = await db
      .update(cases)
      .set(updateData)
      .where(eq(cases.id, id))
      .returning(returnCaseFields);

    return updatedCases[0];
  },

  async changeStatus(id: number, input: ChangeStatusInput): Promise<{ case: CaseRow; history: CaseHistoryRow } | undefined> {
    const existingCase = await this.getCaseById(id);
    if (!existingCase) {
      throw new Error("Case not found");
    }

    const transitionValidation = validateStatusTransition(existingCase.caseData.status as CaseStatus, input.toStatus);
    if (!transitionValidation.valid) {
      throw new Error(transitionValidation.error);
    }

    const ruleValidation = validateStatusSpecificRules(input.toStatus, {
      notes: input.notes,
      executionDueAt: input.toStatus === CASE_STATUSES.IN_PROGRESS ? input.executionDueAt : null,
      finalResult: input.finalResult,
    });
    if (!ruleValidation.valid) {
      throw new Error(ruleValidation.error);
    }

    return await db.transaction(async (tx) => {
      const updateData: any = {
        status: input.toStatus,
        updatedAt: new Date(),
      };

      if (input.toStatus === CASE_STATUSES.IN_PROGRESS) {
        updateData.executionStartedAt = new Date();
        updateData.executionDueAt = input.executionDueAt;
      }

      if (input.toStatus === CASE_STATUSES.ARCHIVED) {
        updateData.isArchived = true;
      }

      if (input.finalResult !== undefined) {
        updateData.finalResult = input.finalResult;
      }

      const updatedCases = await tx
        .update(cases)
        .set(updateData)
        .where(eq(cases.id, id))
        .returning(returnCaseFields);

      const updatedCase = updatedCases[0];

      const historyRecords = await tx
        .insert(caseStatusHistory)
        .values({
          caseId: id,
          fromStatus: existingCase.caseData.status,
          toStatus: input.toStatus,
          changedBy: input.changedBy,
          notes: input.notes,
        })
        .returning({
          id: caseStatusHistory.id,
          caseId: caseStatusHistory.caseId,
          fromStatus: caseStatusHistory.fromStatus,
          toStatus: caseStatusHistory.toStatus,
          changedBy: caseStatusHistory.changedBy,
          notes: caseStatusHistory.notes,
          createdAt: caseStatusHistory.createdAt,
        });

      return { case: updatedCase, history: historyRecords[0] };
    });
  },
};
