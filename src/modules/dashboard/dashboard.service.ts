import { and, desc, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  caseStatusHistory,
  cases,
  customers,
  devices,
  inventoryItems,
  invoices,
  receptionPoints,
  users,
} from "../../db/schema";

type DashboardAccessContext = {
  role?: string | null;
  userId?: number | null;
  receptionPointId?: number | null;
};

type DashboardSummary = {
  casesByStatus: Record<string, number>;
  totalCases: number;
  newCases: number;
  diagnosingCases: number;
  waitingApprovalCases: number;
  inProgressCases: number;
  repairedCases: number;
  notRepairableCases: number;
  completedOperations: number;
  incomingReceptionPointCases: number;
  maintenanceOperationsCount: number;
  inventorySummary: {
    totalItems: number;
    lowStockItems: number;
    outOfStockItems: number;
  };
  salesSummary: {
    totalRevenue: number;
    totalInvoices: number;
    pendingInvoices: number;
  };
  totalCustomers: number;
  totalDevices: number;
  recentCases: Array<{
    id: number;
    caseCode: string;
    status: string;
    customerName: string | null;
    deviceLabel: string | null;
    receptionPointName: string | null;
    createdAt: Date | null;
  }>;
  recentActivities: Array<{
    id: number;
    caseId: number | null;
    caseCode: string | null;
    title: string;
    actorName: string | null;
    createdAt: Date | null;
  }>;
};

const toNumber = (value: unknown) => Number(value ?? 0);

const buildCaseScope = (access?: DashboardAccessContext) => {
  if (access?.role !== "reception_point_user") {
    return undefined;
  }

  if (!access.receptionPointId) {
    return sql`false`;
  }

  return eq(cases.receptionPointId, access.receptionPointId);
};

const buildActiveCaseWhere = (access?: DashboardAccessContext) => {
  const clauses = [eq(cases.isArchived, false)];
  const scope = buildCaseScope(access);
  if (scope) clauses.push(scope);
  return and(...clauses);
};

const buildInvoiceScope = (access?: DashboardAccessContext) => {
  if (access?.role !== "reception_point_user") {
    return undefined;
  }

  if (!access.receptionPointId) {
    return sql`false`;
  }

  return eq(cases.receptionPointId, access.receptionPointId);
};

export const dashboardService = {
  async getDashboardSummary(access?: DashboardAccessContext): Promise<DashboardSummary> {
    const caseWhere = buildActiveCaseWhere(access);

    const caseStats = await db
      .select({
        status: cases.status,
        count: sql<number>`count(*)`,
      })
      .from(cases)
      .where(caseWhere)
      .groupBy(cases.status);

    const casesByStatus = caseStats.reduce<Record<string, number>>((acc, stat) => {
      acc[stat.status] = toNumber(stat.count);
      return acc;
    }, {});

    const totalCases = Object.values(casesByStatus).reduce((sum, count) => sum + count, 0);

    const incomingWhere = and(
      buildActiveCaseWhere(access),
      eq(cases.processingMode, "send_to_main_center"),
      isNull(cases.mainCenterReceivedAt),
      or(eq(cases.status, "in_transit_to_main_center"), inArray(cases.transferStatus, ["pending_send", "in_transit"]))
    );

    const [incomingResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(cases)
      .where(incomingWhere);

    const [completedOperationsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(cases)
      .where(and(buildActiveCaseWhere(access), isNotNull(cases.operationFinalizedAt)));

    const [maintenanceOperationsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(cases)
      .where(and(buildActiveCaseWhere(access), inArray(cases.status, ["repaired", "completed", "delivered", "not_repairable"])));

    const [customersResult] = access?.role === "reception_point_user"
      ? await db
          .select({ count: sql<number>`count(distinct ${cases.customerId})` })
          .from(cases)
          .where(caseWhere)
      : await db.select({ count: sql<number>`count(*)` }).from(customers);

    const [devicesResult] = access?.role === "reception_point_user"
      ? await db
          .select({ count: sql<number>`count(distinct ${cases.deviceId})` })
          .from(cases)
          .where(caseWhere)
      : await db.select({ count: sql<number>`count(*)` }).from(devices);

    const [inventoryResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(inventoryItems)
      .where(eq(inventoryItems.isActive, true));

    const [lowStockResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(inventoryItems)
      .where(sql`${inventoryItems.isActive} = true and ${inventoryItems.quantity} <= coalesce(${inventoryItems.minimumStock}, 0)`);

    const [outOfStockResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(inventoryItems)
      .where(sql`${inventoryItems.isActive} = true and ${inventoryItems.quantity} <= 0`);

    const invoiceScope = buildInvoiceScope(access);
    const invoiceBase = db
      .select({
        totalInvoices: sql<number>`count(${invoices.id})`,
        pendingInvoices: sql<number>`count(${invoices.id}) filter (where ${invoices.status} in ('draft', 'issued'))`,
        totalRevenue: sql<number>`coalesce(sum(${invoices.total}) filter (where ${invoices.status} = 'paid'), 0)`,
      })
      .from(invoices)
      .leftJoin(cases, eq(invoices.caseId, cases.id));

    const [salesResult] = invoiceScope ? await invoiceBase.where(invoiceScope) : await invoiceBase;

    const recentCases = await db
      .select({
        id: cases.id,
        caseCode: cases.caseCode,
        status: cases.status,
        customerName: customers.name,
        deviceLabel: sql<string | null>`concat_ws(' ', ${devices.brand}, ${devices.applianceType}, ${devices.modelName})`,
        receptionPointName: receptionPoints.name,
        createdAt: cases.createdAt,
      })
      .from(cases)
      .leftJoin(customers, eq(cases.customerId, customers.id))
      .leftJoin(devices, eq(cases.deviceId, devices.id))
      .leftJoin(receptionPoints, eq(cases.receptionPointId, receptionPoints.id))
      .where(caseWhere)
      .orderBy(desc(cases.createdAt))
      .limit(6);

    const recentActivities = await db
      .select({
        id: caseStatusHistory.id,
        caseId: caseStatusHistory.caseId,
        caseCode: cases.caseCode,
        title: caseStatusHistory.notes,
        actorName: users.name,
        createdAt: caseStatusHistory.createdAt,
      })
      .from(caseStatusHistory)
      .innerJoin(cases, eq(caseStatusHistory.caseId, cases.id))
      .leftJoin(users, eq(caseStatusHistory.changedBy, users.id))
      .where(caseWhere)
      .orderBy(desc(caseStatusHistory.createdAt))
      .limit(6);

    return {
      casesByStatus,
      totalCases,
      newCases: (casesByStatus.new ?? 0) + (casesByStatus.received ?? 0),
      diagnosingCases: (casesByStatus.diagnosis ?? 0) + (casesByStatus.diagnosing ?? 0),
      waitingApprovalCases: casesByStatus.waiting_approval ?? 0,
      inProgressCases: casesByStatus.in_progress ?? 0,
      repairedCases: casesByStatus.repaired ?? 0,
      notRepairableCases: casesByStatus.not_repairable ?? 0,
      completedOperations: toNumber(completedOperationsResult?.count),
      incomingReceptionPointCases: toNumber(incomingResult?.count),
      maintenanceOperationsCount: toNumber(maintenanceOperationsResult?.count),
      inventorySummary: {
        totalItems: toNumber(inventoryResult?.count),
        lowStockItems: toNumber(lowStockResult?.count),
        outOfStockItems: toNumber(outOfStockResult?.count),
      },
      salesSummary: {
        totalRevenue: toNumber(salesResult?.totalRevenue),
        totalInvoices: toNumber(salesResult?.totalInvoices),
        pendingInvoices: toNumber(salesResult?.pendingInvoices),
      },
      totalCustomers: toNumber(customersResult?.count),
      totalDevices: toNumber(devicesResult?.count),
      recentCases,
      recentActivities: recentActivities.map((activity) => ({
        ...activity,
        title: activity.title || "Case status updated",
      })),
    };
  },

  async getRevenue(access?: DashboardAccessContext): Promise<{ totalRevenue: number }> {
    const summary = await this.getDashboardSummary(access);
    return {
      totalRevenue: summary.salesSummary.totalRevenue,
    };
  },

  async getCasesStats(access?: DashboardAccessContext): Promise<Record<string, number>> {
    const summary = await this.getDashboardSummary(access);
    return summary.casesByStatus;
  },
};
