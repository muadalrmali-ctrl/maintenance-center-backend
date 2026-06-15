import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { cases, customers, devices, receptionPoints } from "../../db/schema";

type ReceptionPointInput = {
  name?: string;
  city?: string;
  area?: string | null;
  address?: string | null;
  phone?: string | null;
  managerName?: string | null;
  status?: "active" | "inactive";
  notes?: string | null;
};

const receptionPointFields = {
  id: receptionPoints.id,
  name: receptionPoints.name,
  city: receptionPoints.city,
  area: receptionPoints.area,
  address: receptionPoints.address,
  phone: receptionPoints.phone,
  managerName: receptionPoints.managerName,
  status: receptionPoints.status,
  notes: receptionPoints.notes,
  createdAt: receptionPoints.createdAt,
  updatedAt: receptionPoints.updatedAt,
};

const caseSummaryFields = {
  id: cases.id,
  caseCode: cases.caseCode,
  status: cases.status,
  processingMode: cases.processingMode,
  transferStatus: cases.transferStatus,
  customerComplaint: cases.customerComplaint,
  customerName: customers.name,
  customerPhone: customers.phone,
  deviceApplianceType: devices.applianceType,
  deviceBrand: devices.brand,
  deviceModelName: devices.modelName,
  createdAt: cases.createdAt,
};

const buildStats = async (receptionPointId: number) => {
  const [stats] = await db
    .select({
      totalCases: sql<number>`count(*)::int`,
      casesSentToMainCenter: sql<number>`count(*) filter (where ${cases.processingMode} = 'send_to_main_center')::int`,
      casesInTransit: sql<number>`count(*) filter (where ${cases.transferStatus} in ('pending_send', 'in_transit') or ${cases.status} = 'in_transit_to_main_center')::int`,
      casesReceivedByMainCenter: sql<number>`count(*) filter (where ${cases.transferStatus} = 'received_at_main_center')::int`,
      localRepairCases: sql<number>`count(*) filter (where ${cases.processingMode} = 'local_repair')::int`,
      repairedCases: sql<number>`count(*) filter (where ${cases.status} in ('repaired', 'completed', 'delivered'))::int`,
      notRepairableCases: sql<number>`count(*) filter (where ${cases.status} = 'not_repairable')::int`,
    })
    .from(cases)
    .where(eq(cases.receptionPointId, receptionPointId));

  return stats ?? {
    totalCases: 0,
    casesSentToMainCenter: 0,
    casesInTransit: 0,
    casesReceivedByMainCenter: 0,
    localRepairCases: 0,
    repairedCases: 0,
    notRepairableCases: 0,
  };
};

export const receptionPointsService = {
  async list() {
    const rows = await db.select(receptionPointFields).from(receptionPoints).orderBy(desc(receptionPoints.createdAt));
    const stats = await Promise.all(rows.map((row) => buildStats(row.id)));
    return rows.map((row, index) => ({ ...row, stats: stats[index] }));
  },

  async create(input: Required<Pick<ReceptionPointInput, "name" | "city">> & ReceptionPointInput) {
    const [created] = await db
      .insert(receptionPoints)
      .values({
        name: input.name.trim(),
        city: input.city.trim(),
        area: input.area?.trim() || null,
        address: input.address?.trim() || null,
        phone: input.phone?.trim() || null,
        managerName: input.managerName?.trim() || null,
        status: input.status ?? "active",
        notes: input.notes?.trim() || null,
      })
      .returning(receptionPointFields);

    return { ...created, stats: await buildStats(created.id) };
  },

  async update(id: number, input: ReceptionPointInput) {
    const updateData: ReceptionPointInput & { updatedAt: Date } = { updatedAt: new Date() } as any;

    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.city !== undefined) updateData.city = input.city.trim();
    if (input.area !== undefined) updateData.area = input.area?.trim() || null;
    if (input.address !== undefined) updateData.address = input.address?.trim() || null;
    if (input.phone !== undefined) updateData.phone = input.phone?.trim() || null;
    if (input.managerName !== undefined) updateData.managerName = input.managerName?.trim() || null;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.notes !== undefined) updateData.notes = input.notes?.trim() || null;

    const [updated] = await db
      .update(receptionPoints)
      .set(updateData)
      .where(eq(receptionPoints.id, id))
      .returning(receptionPointFields);

    if (!updated) return undefined;
    return { ...updated, stats: await buildStats(updated.id) };
  },

  async getById(id: number) {
    const [point] = await db.select(receptionPointFields).from(receptionPoints).where(eq(receptionPoints.id, id)).limit(1);
    if (!point) return undefined;

    const pointCases = await db
      .select(caseSummaryFields)
      .from(cases)
      .leftJoin(customers, eq(cases.customerId, customers.id))
      .leftJoin(devices, eq(cases.deviceId, devices.id))
      .where(eq(cases.receptionPointId, id))
      .orderBy(desc(cases.createdAt));

    return {
      ...point,
      stats: await buildStats(id),
      cases: pointCases,
    };
  },

  async assertActiveReceptionPoint(id: number) {
    const [point] = await db
      .select({ id: receptionPoints.id, status: receptionPoints.status })
      .from(receptionPoints)
      .where(and(eq(receptionPoints.id, id), eq(receptionPoints.status, "active")))
      .limit(1);

    if (!point) {
      throw new Error("Reception point is not active or does not exist");
    }
  },
};
