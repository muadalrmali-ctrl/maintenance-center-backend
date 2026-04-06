import { db } from "../../db";
import { cases, customers, devices, inventoryItems, invoices } from "../../db/schema";
import { eq, sql } from "drizzle-orm";

type DashboardSummary = {
  totalCases: number;
  activeCases: number;
  completedCases: number;
  totalCustomers: number;
  totalDevices: number;
  totalInventoryItems: number;
  lowStockItems: number;
  totalInvoices: number;
  pendingInvoices: number;
};

export const dashboardService = {
  async getDashboardSummary(): Promise<DashboardSummary> {
    // Get case counts
    const caseStats = await db
      .select({
        status: cases.status,
        count: sql<number>`count(*)`,
      })
      .from(cases)
      .where(eq(cases.isArchived, false))
      .groupBy(cases.status);

    const totalCases = caseStats.reduce((sum, stat) => sum + stat.count, 0);
    const activeCases = caseStats
      .filter(stat => !["completed", "delivered", "cancelled"].includes(stat.status))
      .reduce((sum, stat) => sum + stat.count, 0);
    const completedCases = caseStats
      .filter(stat => ["completed", "delivered"].includes(stat.status))
      .reduce((sum, stat) => sum + stat.count, 0);

    // Get other counts
    const [customersResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(customers);

    const [devicesResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(devices);

    const [inventoryResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(inventoryItems)
      .where(eq(inventoryItems.isActive, true));

    const [lowStockResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(inventoryItems)
      .where(sql`${inventoryItems.quantity} <= ${inventoryItems.minimumStock} AND ${inventoryItems.isActive} = true`);

    const [invoicesResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(invoices);

    const [pendingInvoicesResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(invoices)
      .where(sql`${invoices.status} IN ('draft', 'issued')`);

    return {
      totalCases,
      activeCases,
      completedCases,
      totalCustomers: customersResult.count,
      totalDevices: devicesResult.count,
      totalInventoryItems: inventoryResult.count,
      lowStockItems: lowStockResult.count,
      totalInvoices: invoicesResult.count,
      pendingInvoices: pendingInvoicesResult.count,
    };
  },

  async getRevenue(): Promise<{ totalRevenue: number }> {
    const [revenueResult] = await db
      .select({ total: sql<number>`sum(${invoices.total})` })
      .from(invoices)
      .where(eq(invoices.status, "paid"));

    return {
      totalRevenue: parseFloat(revenueResult.total?.toString() || "0"),
    };
  },

  async getCasesStats(): Promise<{ [key: string]: number }> {
    const caseStats = await db
      .select({
        status: cases.status,
        count: sql<number>`count(*)` as any,
      })
      .from(cases)
      .where(eq(cases.isArchived, false))
      .groupBy(cases.status);

    const stats: { [key: string]: number } = {};
    caseStats.forEach(stat => {
      stats[stat.status] = stat.count;
    });

    return stats;
  },
};