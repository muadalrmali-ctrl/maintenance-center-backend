import { desc, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { branches, cases, customers, devices, users } from "../../db/schema";
import { CASE_STATUSES } from "../cases/constants";

type BranchInput = {
  name: string;
  code: string;
  city: string;
  address?: string | null;
  phone?: string | null;
  status?: "active" | "inactive";
  notes?: string | null;
};

export const branchesService = {
  async listBranches() {
    const branchRows = await db
      .select({
        id: branches.id,
        name: branches.name,
        code: branches.code,
        city: branches.city,
        address: branches.address,
        phone: branches.phone,
        status: branches.status,
        notes: branches.notes,
        createdAt: branches.createdAt,
        updatedAt: branches.updatedAt,
      })
      .from(branches)
      .orderBy(desc(branches.createdAt));

    return Promise.all(
      branchRows.map(async (branch) => ({
        ...branch,
        stats: await this.getBranchStats(branch.id),
      }))
    );
  },

  async createBranch(input: BranchInput) {
    const created = await db
      .insert(branches)
      .values({
        name: input.name.trim(),
        code: input.code.trim().toUpperCase(),
        city: input.city.trim(),
        address: input.address?.trim() || null,
        phone: input.phone?.trim() || null,
        status: input.status ?? "active",
        notes: input.notes?.trim() || null,
        updatedAt: new Date(),
      })
      .returning();

    return created[0];
  },

  async updateBranch(id: number, input: Partial<BranchInput>) {
    const updated = await db
      .update(branches)
      .set({
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.code !== undefined ? { code: input.code.trim().toUpperCase() } : {}),
        ...(input.city !== undefined ? { city: input.city.trim() } : {}),
        ...(input.address !== undefined ? { address: input.address?.trim() || null } : {}),
        ...(input.phone !== undefined ? { phone: input.phone?.trim() || null } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
        updatedAt: new Date(),
      })
      .where(eq(branches.id, id))
      .returning();

    return updated[0];
  },

  async getBranchById(id: number) {
    const branch = await db
      .select()
      .from(branches)
      .where(eq(branches.id, id))
      .limit(1);

    if (!branch[0]) return undefined;

    const branchUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.branchId, id))
      .orderBy(users.name);

    const branchCases = await db
      .select({
        id: cases.id,
        caseCode: cases.caseCode,
        status: cases.status,
        sourceType: cases.sourceType,
        customerComplaint: cases.customerComplaint,
        branchNotes: cases.branchNotes,
        customerName: customers.name,
        deviceApplianceType: devices.applianceType,
        deviceBrand: devices.brand,
        deviceModelName: devices.modelName,
        createdAt: cases.createdAt,
      })
      .from(cases)
      .leftJoin(customers, eq(cases.customerId, customers.id))
      .leftJoin(devices, eq(cases.deviceId, devices.id))
      .where(eq(cases.branchId, id))
      .orderBy(desc(cases.createdAt));

    return {
      ...branch[0],
      stats: await this.getBranchStats(id),
      users: branchUsers,
      cases: branchCases,
    };
  },

  async getBranchStats(id: number) {
    const [summary] = await db
      .select({
        totalCases: sql<number>`count(*)::int`,
        awaitingCenterReceipt: sql<number>`count(*) filter (where ${cases.status} = ${CASE_STATUSES.AWAITING_CENTER_RECEIPT})::int`,
        newCases: sql<number>`count(*) filter (where ${cases.status} in (${CASE_STATUSES.RECEIVED}, 'new'))::int`,
        repairedCases: sql<number>`count(*) filter (where ${cases.status} = ${CASE_STATUSES.REPAIRED})::int`,
        notRepairableCases: sql<number>`count(*) filter (where ${cases.status} = ${CASE_STATUSES.NOT_REPAIRABLE})::int`,
        completedOperations: sql<number>`count(*) filter (where ${cases.operationFinalizedAt} is not null or ${cases.status} = ${CASE_STATUSES.COMPLETED})::int`,
        activeCases: sql<number>`count(*) filter (where ${cases.operationFinalizedAt} is null)::int`,
        completedCases: sql<number>`count(*) filter (where ${cases.operationFinalizedAt} is not null or ${cases.status} = ${CASE_STATUSES.COMPLETED})::int`,
      })
      .from(cases)
      .where(eq(cases.branchId, id));

    return summary ?? {
      totalCases: 0,
      awaitingCenterReceipt: 0,
      newCases: 0,
      repairedCases: 0,
      notRepairableCases: 0,
      completedOperations: 0,
      activeCases: 0,
      completedCases: 0,
    };
  },
};
