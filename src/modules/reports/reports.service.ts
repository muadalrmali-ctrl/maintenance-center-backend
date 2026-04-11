import { and, desc, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  caseParts,
  caseStatusHistory,
  cases,
  customers,
  devices,
  inventoryItems,
  inventoryMovements,
  invoiceItems,
  invoices,
  users,
} from "../../db/schema";

type ReportCategory =
  | "cases"
  | "technicians"
  | "inventory"
  | "sales"
  | "customers"
  | "operations";

type ReportFilters = {
  category: ReportCategory;
  reportType?: string;
  dateFrom?: Date | null;
  dateTo?: Date | null;
  status?: string | null;
  technicianId?: number | null;
  productId?: number | null;
  customerId?: number | null;
};

type ReportColumn = {
  key: string;
  label: string;
};

type ReportSummaryItem = {
  label: string;
  value: string | number;
};

type ReportResponse = {
  category: ReportCategory;
  reportType: string;
  title: string;
  generatedAt: string;
  filters: Record<string, string>;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  summary: ReportSummaryItem[];
};

const OPEN_CASE_STATUSES = [
  "received",
  "waiting_part",
  "diagnosing",
  "waiting_approval",
  "in_progress",
  "repaired",
] as const;

const CLOSED_CASE_STATUSES = ["completed", "delivered", "archived"] as const;

const startOfDay = (value: Date) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (value: Date) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

const formatDateLabel = (value?: Date | null) =>
  value
    ? new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(value)
    : "الكل";

const buildFiltersMeta = (filters: ReportFilters) => ({
  "من تاريخ": formatDateLabel(filters.dateFrom),
  "إلى تاريخ": formatDateLabel(filters.dateTo),
  "الحالة": filters.status || "الكل",
  "الفني": filters.technicianId ? String(filters.technicianId) : "الكل",
  "القطعة": filters.productId ? String(filters.productId) : "الكل",
  "العميل": filters.customerId ? String(filters.customerId) : "الكل",
});

const buildDateClauses = (column: any, filters: ReportFilters) => {
  const clauses = [];
  if (filters.dateFrom) clauses.push(sql`${column} >= ${startOfDay(filters.dateFrom)}`);
  if (filters.dateTo) clauses.push(sql`${column} <= ${endOfDay(filters.dateTo)}`);
  return clauses;
};

const toReport = (input: Omit<ReportResponse, "generatedAt" | "filters"> & { filters: ReportFilters }): ReportResponse => ({
  ...input,
  generatedAt: new Date().toISOString(),
  filters: buildFiltersMeta(input.filters),
});

const buildCaseListReport = async (
  filters: ReportFilters,
  title: string,
  extraClauses: any[] = []
): Promise<ReportResponse> => {
  const clauses = [...buildDateClauses(cases.createdAt, filters), ...extraClauses];
  if (filters.status) clauses.push(eq(cases.status, filters.status));
  if (filters.technicianId) clauses.push(eq(cases.assignedTechnicianId, filters.technicianId));
  if (filters.customerId) clauses.push(eq(cases.customerId, filters.customerId));

  const rows = await db
    .select({
      caseCode: cases.caseCode,
      caseType: cases.caseType,
      status: cases.status,
      priority: cases.priority,
      customerName: customers.name,
      technicianName: users.name,
      deviceType: devices.applianceType,
      deviceLabel: sql<string>`trim(concat_ws(' - ', ${devices.brand}, ${devices.applianceType}, ${devices.modelName}))`,
      createdAt: cases.createdAt,
      executionDueAt: cases.executionDueAt,
      finalResult: cases.finalResult,
    })
    .from(cases)
    .leftJoin(customers, eq(cases.customerId, customers.id))
    .leftJoin(devices, eq(cases.deviceId, devices.id))
    .leftJoin(users, eq(cases.assignedTechnicianId, users.id))
    .where(clauses.length ? and(...clauses) : undefined)
    .orderBy(desc(cases.createdAt));

  return toReport({
    category: "cases",
    reportType: filters.reportType || "all_cases",
    title,
    filters,
    columns: [
      { key: "caseCode", label: "كود الحالة" },
      { key: "caseType", label: "النوع" },
      { key: "status", label: "الحالة" },
      { key: "priority", label: "الأولوية" },
      { key: "customerName", label: "العميل" },
      { key: "technicianName", label: "الفني" },
      { key: "deviceLabel", label: "الجهاز" },
      { key: "createdAt", label: "تاريخ الإنشاء" },
      { key: "executionDueAt", label: "تاريخ الاستحقاق" },
      { key: "finalResult", label: "النتيجة النهائية" },
    ],
    rows: rows as Record<string, unknown>[],
    summary: [
      { label: "إجمالي الحالات", value: rows.length },
      { label: "الحالات الخارجية", value: rows.filter((row) => row.caseType === "external").length },
      { label: "الحالات الداخلية", value: rows.filter((row) => row.caseType !== "external").length },
    ],
  });
};

const buildSalesListReport = async (
  filters: ReportFilters,
  title: string,
  extraClauses: any[] = []
): Promise<ReportResponse> => {
  const clauses = [...extraClauses];
  if (filters.dateFrom) clauses.push(sql`coalesce(${invoices.confirmedAt}, ${invoices.issuedAt}, ${invoices.createdAt}) >= ${startOfDay(filters.dateFrom)}`);
  if (filters.dateTo) clauses.push(sql`coalesce(${invoices.confirmedAt}, ${invoices.issuedAt}, ${invoices.createdAt}) <= ${endOfDay(filters.dateTo)}`);
  if (filters.customerId) clauses.push(eq(invoices.customerId, filters.customerId));

  const rows = await db
    .select({
      saleCode: invoices.saleCode,
      invoiceNumber: invoices.invoiceNumber,
      invoiceType: invoices.invoiceType,
      status: invoices.status,
      caseCode: cases.caseCode,
      customerName: sql<string | null>`coalesce(${customers.name}, ${invoices.directCustomerName})`,
      total: invoices.total,
      saleDate: sql<Date | null>`coalesce(${invoices.confirmedAt}, ${invoices.issuedAt}, ${invoices.createdAt})`,
      createdByName: users.name,
    })
    .from(invoices)
    .leftJoin(cases, eq(invoices.caseId, cases.id))
    .leftJoin(customers, eq(invoices.customerId, customers.id))
    .leftJoin(users, eq(invoices.createdBy, users.id))
    .where(clauses.length ? and(...clauses) : undefined)
    .orderBy(desc(sql`coalesce(${invoices.confirmedAt}, ${invoices.issuedAt}, ${invoices.createdAt})`));

  const totalValue = rows.reduce((sum, row) => sum + Number(row.total || 0), 0);

  return toReport({
    category: "sales",
    reportType: filters.reportType || "all_sales",
    title,
    filters,
    columns: [
      { key: "saleCode", label: "كود البيع" },
      { key: "invoiceNumber", label: "المرجع" },
      { key: "invoiceType", label: "النوع" },
      { key: "status", label: "الحالة" },
      { key: "caseCode", label: "كود الحالة" },
      { key: "customerName", label: "العميل" },
      { key: "saleDate", label: "التاريخ" },
      { key: "total", label: "الإجمالي" },
      { key: "createdByName", label: "تم الإنشاء بواسطة" },
    ],
    rows: rows as Record<string, unknown>[],
    summary: [
      { label: "إجمالي السجلات", value: rows.length },
      { label: "إجمالي المبيعات", value: totalValue.toFixed(3) },
      { label: "المبيعات المؤكدة", value: rows.filter((row) => row.status === "paid").length },
    ],
  });
};

const buildCasesByStatusReport = async (filters: ReportFilters): Promise<ReportResponse> => {
  const clauses = buildDateClauses(cases.createdAt, filters);
  if (filters.technicianId) clauses.push(eq(cases.assignedTechnicianId, filters.technicianId));
  if (filters.customerId) clauses.push(eq(cases.customerId, filters.customerId));

  const rows = await db
    .select({
      status: cases.status,
      count: sql<number>`count(*)::int`,
    })
    .from(cases)
    .where(clauses.length ? and(...clauses) : undefined)
    .groupBy(cases.status)
    .orderBy(desc(sql`count(*)`));

  return toReport({
    category: "cases",
    reportType: "cases_by_status",
    title: "تقرير الحالات حسب الحالة",
    filters,
    columns: [
      { key: "status", label: "الحالة" },
      { key: "count", label: "العدد" },
    ],
    rows: rows as Record<string, unknown>[],
    summary: [{ label: "إجمالي الحالات", value: rows.reduce((sum, row) => sum + Number(row.count || 0), 0) }],
  });
};

const buildCasesByTechnicianReport = async (filters: ReportFilters): Promise<ReportResponse> => {
  const clauses = buildDateClauses(cases.createdAt, filters);
  if (filters.status) clauses.push(eq(cases.status, filters.status));

  const rows = await db
    .select({
      technicianName: users.name,
      totalCases: sql<number>`count(*)::int`,
      completedCases: sql<number>`count(*) filter (where ${cases.operationFinalizedAt} is not null)::int`,
      delayedCases: sql<number>`count(*) filter (where ${cases.executionDueAt} is not null and ${cases.operationFinalizedAt} is null and ${cases.executionDueAt} < now())::int`,
    })
    .from(cases)
    .leftJoin(users, eq(cases.assignedTechnicianId, users.id))
    .where(clauses.length ? and(...clauses) : undefined)
    .groupBy(users.name)
    .orderBy(desc(sql`count(*)`));

  return toReport({
    category: "cases",
    reportType: "cases_by_technician",
    title: "تقرير الحالات حسب الفني",
    filters,
    columns: [
      { key: "technicianName", label: "الفني" },
      { key: "totalCases", label: "إجمالي الحالات" },
      { key: "completedCases", label: "المكتملة" },
      { key: "delayedCases", label: "المتأخرة" },
    ],
    rows: rows as Record<string, unknown>[],
    summary: [{ label: "عدد الفنيين", value: rows.length }],
  });
};

const buildCasesByDeviceTypeReport = async (filters: ReportFilters): Promise<ReportResponse> => {
  const clauses = buildDateClauses(cases.createdAt, filters);
  if (filters.technicianId) clauses.push(eq(cases.assignedTechnicianId, filters.technicianId));

  const rows = await db
    .select({
      deviceType: devices.applianceType,
      count: sql<number>`count(*)::int`,
    })
    .from(cases)
    .leftJoin(devices, eq(cases.deviceId, devices.id))
    .where(clauses.length ? and(...clauses) : undefined)
    .groupBy(devices.applianceType)
    .orderBy(desc(sql`count(*)`));

  return toReport({
    category: "cases",
    reportType: "cases_by_device_type",
    title: "تقرير الحالات حسب نوع الجهاز",
    filters,
    columns: [
      { key: "deviceType", label: "نوع الجهاز" },
      { key: "count", label: "العدد" },
    ],
    rows: rows as Record<string, unknown>[],
    summary: [{ label: "أنواع الأجهزة", value: rows.length }],
  });
};

const buildTechnicianPerformanceReport = async (filters: ReportFilters): Promise<ReportResponse> => {
  const rows = await db.execute(sql`
    select
      u.id as "technicianId",
      u.name as "technicianName",
      count(c.id)::int as "totalCases",
      count(c.id) filter (where c.operation_finalized_at is not null)::int as "completedCases",
      count(c.id) filter (where c.operation_finalized_at is null and c.status not in ('completed', 'delivered', 'archived'))::int as "currentCases",
      count(c.id) filter (where c.execution_due_at is not null and c.operation_finalized_at is null and c.execution_due_at < now())::int as "delayedCases",
      avg(
        case
          when c.execution_started_at is not null and coalesce(c.operation_finalized_at, c.execution_completed_at) is not null
          then extract(epoch from (coalesce(c.operation_finalized_at, c.execution_completed_at) - c.execution_started_at)) / 3600
          else null
        end
      )::numeric(10,1) as "averageRepairDurationHours"
    from users u
    left join cases c on c.assigned_technician_id = u.id
    where u.role in ('technician', 'technician_manager')
      ${filters.dateFrom ? sql`and c.created_at >= ${startOfDay(filters.dateFrom)}` : sql``}
      ${filters.dateTo ? sql`and c.created_at <= ${endOfDay(filters.dateTo)}` : sql``}
      ${filters.technicianId ? sql`and u.id = ${filters.technicianId}` : sql``}
    group by u.id, u.name
    order by count(c.id) desc, u.name asc
  `);

  const mapped = (rows.rows as Array<Record<string, unknown>>).map((row) => {
    const totalCases = Number(row.totalCases || 0);
    const completedCases = Number(row.completedCases || 0);
    const delayedCases = Number(row.delayedCases || 0);
    return {
      ...row,
      completionRate: totalCases > 0 ? Number(((completedCases / totalCases) * 100).toFixed(1)) : 0,
      delayRate: totalCases > 0 ? Number(((delayedCases / totalCases) * 100).toFixed(1)) : 0,
    };
  });

  return toReport({
    category: "technicians",
    reportType: "performance",
    title: "تقرير أداء الفنيين",
    filters,
    columns: [
      { key: "technicianName", label: "الفني" },
      { key: "totalCases", label: "إجمالي الحالات" },
      { key: "completedCases", label: "المكتملة" },
      { key: "currentCases", label: "الحالية" },
      { key: "delayedCases", label: "المتأخرة" },
      { key: "averageRepairDurationHours", label: "متوسط مدة الإصلاح / ساعة" },
      { key: "completionRate", label: "نسبة الإكمال %" },
      { key: "delayRate", label: "نسبة التأخير %" },
    ],
    rows: mapped,
    summary: [{ label: "عدد الفنيين", value: mapped.length }],
  });
};

const buildInventoryQuantityReport = async (filters: ReportFilters, mode: "all" | "low" | "out"): Promise<ReportResponse> => {
  const items = await db
    .select({
      id: inventoryItems.id,
      name: inventoryItems.name,
      code: inventoryItems.code,
      brand: inventoryItems.brand,
      quantity: inventoryItems.quantity,
      minimumStock: inventoryItems.minimumStock,
      location: inventoryItems.location,
      sellingPrice: inventoryItems.sellingPrice,
      unitCost: inventoryItems.unitCost,
    })
    .from(inventoryItems)
    .where(filters.productId ? eq(inventoryItems.id, filters.productId) : undefined)
    .orderBy(inventoryItems.name);

  const allocations = await db.execute(sql`
    select
      cp.inventory_item_id as "inventoryItemId",
      sum(cp.quantity)::int as quantity
    from case_parts cp
    where cp.handoff_status in ('delivered', 'received')
    group by cp.inventory_item_id
  `);

  const allocationMap = new Map<number, number>(
    (allocations.rows as Array<{ inventoryItemId: number; quantity: number }>).map((row) => [
      Number(row.inventoryItemId),
      Number(row.quantity || 0),
    ])
  );

  const mapped = items
    .map((item) => {
      const warehouseQuantity = Number(item.quantity || 0);
      const allocatedQuantity = allocationMap.get(item.id) || 0;
      return {
        name: item.name,
        code: item.code,
        brand: item.brand,
        warehouseQuantity,
        allocatedQuantity,
        totalQuantity: warehouseQuantity + allocatedQuantity,
        minimumStock: item.minimumStock,
        location: item.location,
        sellingPrice: item.sellingPrice,
        unitCost: item.unitCost,
      };
    })
    .filter((item) => {
      if (mode === "low") return item.totalQuantity > 0 && item.totalQuantity <= Number(item.minimumStock || 0);
      if (mode === "out") return item.totalQuantity <= 0;
      return true;
    });

  const title =
    mode === "low"
      ? "تقرير المخزون المنخفض"
      : mode === "out"
        ? "تقرير المخزون غير المتوفر"
        : "تقرير المخزون الحالي";

  return toReport({
    category: "inventory",
    reportType: mode === "all" ? "current_inventory" : mode === "low" ? "low_stock" : "out_of_stock",
    title,
    filters,
    columns: [
      { key: "name", label: "القطعة" },
      { key: "code", label: "الكود" },
      { key: "brand", label: "العلامة" },
      { key: "warehouseQuantity", label: "في المخزن" },
      { key: "allocatedQuantity", label: "مخصص للحالات" },
      { key: "totalQuantity", label: "الإجمالي" },
      { key: "minimumStock", label: "حد التنبيه" },
      { key: "sellingPrice", label: "سعر البيع" },
    ],
    rows: mapped,
    summary: [
      { label: "عدد القطع", value: mapped.length },
      { label: "إجمالي الكمية المتتبعة", value: mapped.reduce((sum, item) => sum + Number(item.totalQuantity || 0), 0) },
    ],
  });
};

const buildStockMovementsReport = async (filters: ReportFilters): Promise<ReportResponse> => {
  const clauses = [];
  if (filters.productId) clauses.push(eq(inventoryMovements.inventoryItemId, filters.productId));
  if (filters.dateFrom) clauses.push(sql`${inventoryMovements.createdAt} >= ${startOfDay(filters.dateFrom)}`);
  if (filters.dateTo) clauses.push(sql`${inventoryMovements.createdAt} <= ${endOfDay(filters.dateTo)}`);

  const rows = await db
    .select({
      createdAt: inventoryMovements.createdAt,
      movementType: inventoryMovements.movementType,
      quantity: inventoryMovements.quantity,
      itemName: inventoryItems.name,
      itemCode: inventoryItems.code,
      notes: inventoryMovements.notes,
      createdByName: users.name,
    })
    .from(inventoryMovements)
    .leftJoin(inventoryItems, eq(inventoryMovements.inventoryItemId, inventoryItems.id))
    .leftJoin(users, eq(inventoryMovements.createdBy, users.id))
    .where(clauses.length ? and(...clauses) : undefined)
    .orderBy(desc(inventoryMovements.createdAt));

  return toReport({
    category: "inventory",
    reportType: "stock_movements",
    title: "تقرير حركات المخزون",
    filters,
    columns: [
      { key: "createdAt", label: "التاريخ" },
      { key: "movementType", label: "نوع الحركة" },
      { key: "itemName", label: "القطعة" },
      { key: "itemCode", label: "الكود" },
      { key: "quantity", label: "الكمية" },
      { key: "createdByName", label: "بواسطة" },
      { key: "notes", label: "ملاحظات" },
    ],
    rows: rows as Record<string, unknown>[],
    summary: [{ label: "إجمالي الحركات", value: rows.length }],
  });
};

const buildCaseAllocationsReport = async (filters: ReportFilters): Promise<ReportResponse> => {
  const rows = await db.execute(sql`
    select
      ii.name as "itemName",
      ii.code as "itemCode",
      c.case_code as "caseCode",
      c.case_type as "caseType",
      cp.handoff_status as "handoffStatus",
      cp.quantity,
      cp.delivered_at as "deliveredAt",
      cp.received_at as "receivedAt"
    from case_parts cp
    inner join inventory_items ii on ii.id = cp.inventory_item_id
    inner join cases c on c.id = cp.case_id
    where cp.handoff_status in ('delivered', 'received')
      ${filters.productId ? sql`and cp.inventory_item_id = ${filters.productId}` : sql``}
      ${filters.dateFrom ? sql`and coalesce(cp.received_at, cp.delivered_at, cp.created_at) >= ${startOfDay(filters.dateFrom)}` : sql``}
      ${filters.dateTo ? sql`and coalesce(cp.received_at, cp.delivered_at, cp.created_at) <= ${endOfDay(filters.dateTo)}` : sql``}
    order by coalesce(cp.received_at, cp.delivered_at, cp.created_at) desc
  `);

  return toReport({
    category: "inventory",
    reportType: "case_allocations",
    title: "تقرير القطع تحت العهدة أو المخصصة للحالات",
    filters,
    columns: [
      { key: "itemName", label: "القطعة" },
      { key: "itemCode", label: "الكود" },
      { key: "caseCode", label: "كود الحالة" },
      { key: "caseType", label: "نوع الحالة" },
      { key: "handoffStatus", label: "الحالة" },
      { key: "quantity", label: "الكمية" },
      { key: "deliveredAt", label: "تاريخ التسليم" },
      { key: "receivedAt", label: "تاريخ الاستلام" },
    ],
    rows: rows.rows as Record<string, unknown>[],
    summary: [{ label: "إجمالي البنود", value: rows.rows.length }],
  });
};

const buildReturnedPartsReport = async (filters: ReportFilters): Promise<ReportResponse> => {
  const rows = await db.execute(sql`
    select
      ii.name as "itemName",
      ii.code as "itemCode",
      im.quantity,
      im.notes,
      im.created_at as "createdAt",
      u.name as "createdByName"
    from inventory_movements im
    left join inventory_items ii on ii.id = im.inventory_item_id
    left join users u on u.id = im.created_by
    where im.movement_type in ('returned_from_case', 'returned_from_technician_custody')
      ${filters.productId ? sql`and im.inventory_item_id = ${filters.productId}` : sql``}
      ${filters.dateFrom ? sql`and im.created_at >= ${startOfDay(filters.dateFrom)}` : sql``}
      ${filters.dateTo ? sql`and im.created_at <= ${endOfDay(filters.dateTo)}` : sql``}
    order by im.created_at desc
  `);

  return toReport({
    category: "inventory",
    reportType: "returned_parts",
    title: "تقرير القطع المعادة",
    filters,
    columns: [
      { key: "createdAt", label: "التاريخ" },
      { key: "itemName", label: "القطعة" },
      { key: "itemCode", label: "الكود" },
      { key: "quantity", label: "الكمية" },
      { key: "createdByName", label: "بواسطة" },
      { key: "notes", label: "ملاحظات" },
    ],
    rows: rows.rows as Record<string, unknown>[],
    summary: [{ label: "إجمالي الإعادات", value: rows.rows.length }],
  });
};

const buildMostUsedPartsReport = async (filters: ReportFilters): Promise<ReportResponse> => {
  const rows = await db.execute(sql`
    select
      ii.name as "itemName",
      ii.code as "itemCode",
      sum(ii2.quantity)::int as "totalQuantity",
      count(*)::int as "usageCount"
    from invoice_items ii2
    inner join inventory_items ii on ii.id = ii2.reference_id
    inner join invoices i on i.id = ii2.invoice_id
    where ii2.reference_id is not null
      and ii2.item_type in ('direct_part', 'part')
      and i.status = 'paid'
      ${filters.productId ? sql`and ii.id = ${filters.productId}` : sql``}
      ${filters.dateFrom ? sql`and coalesce(i.confirmed_at, i.issued_at, i.created_at) >= ${startOfDay(filters.dateFrom)}` : sql``}
      ${filters.dateTo ? sql`and coalesce(i.confirmed_at, i.issued_at, i.created_at) <= ${endOfDay(filters.dateTo)}` : sql``}
    group by ii.name, ii.code
    order by sum(ii2.quantity) desc, ii.name asc
    limit 25
  `);

  return toReport({
    category: "inventory",
    reportType: "most_used_parts",
    title: "تقرير أكثر القطع استخداماً أو بيعاً",
    filters,
    columns: [
      { key: "itemName", label: "القطعة" },
      { key: "itemCode", label: "الكود" },
      { key: "totalQuantity", label: "إجمالي الكمية" },
      { key: "usageCount", label: "عدد مرات الظهور" },
    ],
    rows: rows.rows as Record<string, unknown>[],
    summary: [{ label: "عدد القطع", value: rows.rows.length }],
  });
};

const buildTopSoldItemsReport = async (filters: ReportFilters): Promise<ReportResponse> => {
  const rows = await db.execute(sql`
    select
      ii.name as "itemName",
      ii.code as "itemCode",
      sum(inv_it.quantity)::int as "totalQuantity",
      sum(inv_it.total_price::numeric)::numeric(12,3) as "totalSales"
    from invoice_items inv_it
    inner join invoices i on i.id = inv_it.invoice_id
    inner join inventory_items ii on ii.id = inv_it.reference_id
    where inv_it.item_type in ('direct_part', 'part')
      and i.status = 'paid'
      ${filters.dateFrom ? sql`and coalesce(i.confirmed_at, i.issued_at, i.created_at) >= ${startOfDay(filters.dateFrom)}` : sql``}
      ${filters.dateTo ? sql`and coalesce(i.confirmed_at, i.issued_at, i.created_at) <= ${endOfDay(filters.dateTo)}` : sql``}
      ${filters.productId ? sql`and ii.id = ${filters.productId}` : sql``}
    group by ii.name, ii.code
    order by sum(inv_it.total_price::numeric) desc, ii.name asc
    limit 25
  `);

  return toReport({
    category: "sales",
    reportType: "top_items",
    title: "تقرير أعلى الأصناف مبيعاً",
    filters,
    columns: [
      { key: "itemName", label: "القطعة" },
      { key: "itemCode", label: "الكود" },
      { key: "totalQuantity", label: "الكمية المباعة" },
      { key: "totalSales", label: "إجمالي المبيعات" },
    ],
    rows: rows.rows as Record<string, unknown>[],
    summary: [{ label: "عدد الأصناف", value: rows.rows.length }],
  });
};

const buildCustomersReport = async (
  filters: ReportFilters,
  mode: "all" | "by_cases" | "open_cases" | "new_customers" | "by_total_spend"
): Promise<ReportResponse> => {
  const rows = await db.execute(sql`
    select
      cu.id,
      cu.name,
      cu.phone,
      cu.address,
      cu.created_at as "createdAt",
      count(distinct c.id)::int as "casesCount",
      count(distinct c.id) filter (where c.operation_finalized_at is null and c.status not in ('completed', 'delivered', 'archived'))::int as "openCasesCount",
      coalesce(sum(case when i.status = 'paid' then i.total::numeric else 0 end), 0)::numeric(12,3) as "totalSpend"
    from customers cu
    left join cases c on c.customer_id = cu.id
    left join invoices i on i.customer_id = cu.id
    where 1=1
      ${filters.customerId ? sql`and cu.id = ${filters.customerId}` : sql``}
      ${filters.dateFrom ? sql`and cu.created_at >= ${startOfDay(filters.dateFrom)}` : sql``}
      ${filters.dateTo ? sql`and cu.created_at <= ${endOfDay(filters.dateTo)}` : sql``}
    group by cu.id, cu.name, cu.phone, cu.address, cu.created_at
  `);

  const mapped = (rows.rows as Array<Record<string, unknown>>).filter((row) => {
    if (mode === "open_cases") return Number(row.openCasesCount || 0) > 0;
    return true;
  });

  const sorted =
    mode === "by_cases"
      ? [...mapped].sort((a, b) => Number(b.casesCount || 0) - Number(a.casesCount || 0))
      : mode === "by_total_spend"
        ? [...mapped].sort((a, b) => Number(b.totalSpend || 0) - Number(a.totalSpend || 0))
        : [...mapped].sort((a, b) => new Date(String(b.createdAt || 0)).getTime() - new Date(String(a.createdAt || 0)).getTime());

  const titleMap = {
    all: "تقرير العملاء",
    by_cases: "تقرير العملاء حسب عدد الحالات",
    open_cases: "تقرير العملاء ذوي الحالات المفتوحة",
    new_customers: "تقرير العملاء الجدد",
    by_total_spend: "تقرير العملاء حسب إجمالي الإنفاق",
  } as const;

  return toReport({
    category: "customers",
    reportType: mode,
    title: titleMap[mode],
    filters,
    columns: [
      { key: "name", label: "العميل" },
      { key: "phone", label: "الهاتف" },
      { key: "address", label: "العنوان" },
      { key: "createdAt", label: "تاريخ الإنشاء" },
      { key: "casesCount", label: "عدد الحالات" },
      { key: "openCasesCount", label: "الحالات المفتوحة" },
      { key: "totalSpend", label: "إجمالي الإنفاق" },
    ],
    rows: sorted,
    summary: [{ label: "عدد العملاء", value: sorted.length }],
  });
};

const buildActivityTimelineReport = async (filters: ReportFilters, granularity: "day" | "week" | "month"): Promise<ReportResponse> => {
  const periodExpr =
    granularity === "day"
      ? sql.raw(`date_trunc('day', csh.created_at)`)
      : granularity === "week"
        ? sql.raw(`date_trunc('week', csh.created_at)`)
        : sql.raw(`date_trunc('month', csh.created_at)`);

  const rows = await db.execute(sql`
    select
      ${periodExpr} as period,
      count(*)::int as "caseEvents"
    from case_status_history csh
    where 1=1
      ${filters.dateFrom ? sql`and csh.created_at >= ${startOfDay(filters.dateFrom)}` : sql``}
      ${filters.dateTo ? sql`and csh.created_at <= ${endOfDay(filters.dateTo)}` : sql``}
    group by ${periodExpr}
    order by ${periodExpr} desc
  `);

  const title =
    granularity === "day"
      ? "التقرير اليومي للنشاط"
      : granularity === "week"
        ? "التقرير الأسبوعي للنشاط"
        : "التقرير الشهري للنشاط";

  return toReport({
    category: "operations",
    reportType: `${granularity}_activity`,
    title,
    filters,
    columns: [
      { key: "period", label: "الفترة" },
      { key: "caseEvents", label: "أحداث الحالات" },
    ],
    rows: rows.rows as Record<string, unknown>[],
    summary: [{ label: "عدد الفترات", value: rows.rows.length }],
  });
};

const buildPendingApprovalsReport = (filters: ReportFilters) =>
  buildCaseListReport(filters, "تقرير الموافقات المعلقة", [eq(cases.status, "waiting_approval"), isNull(cases.customerApprovedAt)]);

const buildPendingHandoffReport = async (filters: ReportFilters): Promise<ReportResponse> => {
  const rows = await db.execute(sql`
    select
      c.case_code as "caseCode",
      c.case_type as "caseType",
      cu.name as "customerName",
      ii.name as "partName",
      ii.code as "partCode",
      cp.quantity,
      cp.handoff_status as "handoffStatus",
      cp.created_at as "createdAt"
    from case_parts cp
    inner join cases c on c.id = cp.case_id
    left join customers cu on cu.id = c.customer_id
    left join inventory_items ii on ii.id = cp.inventory_item_id
    where cp.handoff_status in ('pending', 'requested', 'delivered')
      ${filters.productId ? sql`and cp.inventory_item_id = ${filters.productId}` : sql``}
      ${filters.dateFrom ? sql`and cp.created_at >= ${startOfDay(filters.dateFrom)}` : sql``}
      ${filters.dateTo ? sql`and cp.created_at <= ${endOfDay(filters.dateTo)}` : sql``}
    order by cp.created_at desc
  `);

  return toReport({
    category: "operations",
    reportType: "spare_part_handoff_pending",
    title: "تقرير تسليم واستلام القطع المعلق",
    filters,
    columns: [
      { key: "caseCode", label: "كود الحالة" },
      { key: "caseType", label: "نوع الحالة" },
      { key: "customerName", label: "العميل" },
      { key: "partName", label: "القطعة" },
      { key: "partCode", label: "الكود" },
      { key: "quantity", label: "الكمية" },
      { key: "handoffStatus", label: "الحالة" },
      { key: "createdAt", label: "تاريخ الإضافة" },
    ],
    rows: rows.rows as Record<string, unknown>[],
    summary: [{ label: "إجمالي البنود", value: rows.rows.length }],
  });
};

const buildDelayedWorkflowReport = (filters: ReportFilters) =>
  buildCaseListReport(filters, "تقرير الحالات المتأخرة في سير العمل", [
    isNotNull(cases.executionDueAt),
    isNull(cases.operationFinalizedAt),
    sql`${cases.executionDueAt} < now()`,
  ]);

export const reportsService = {
  async getMeta() {
    const [technicians, products, customerRows] = await Promise.all([
      db
        .select({
          id: users.id,
          name: users.name,
        })
        .from(users)
        .where(inArray(users.role, ["technician", "technician_manager"]))
        .orderBy(users.name),
      db
        .select({
          id: inventoryItems.id,
          name: inventoryItems.name,
          code: inventoryItems.code,
        })
        .from(inventoryItems)
        .orderBy(inventoryItems.name),
      db
        .select({
          id: customers.id,
          name: customers.name,
          phone: customers.phone,
        })
        .from(customers)
        .orderBy(customers.name),
    ]);

    return {
      technicians,
      products,
      customers: customerRows,
    };
  },

  async getReport(filters: ReportFilters): Promise<ReportResponse> {
    const reportType = filters.reportType || "";

    if (filters.category === "cases") {
      switch (reportType) {
        case "open_cases":
          return buildCaseListReport(filters, "تقرير الحالات المفتوحة", [inArray(cases.status, [...OPEN_CASE_STATUSES])]);
        case "completed_cases":
          return buildCaseListReport(filters, "تقرير الحالات المغلقة / المكتملة", [
            or(inArray(cases.status, [...CLOSED_CASE_STATUSES]), isNotNull(cases.operationFinalizedAt)),
          ]);
        case "delayed_cases":
          return buildCaseListReport(filters, "تقرير الحالات المتأخرة", [
            isNotNull(cases.executionDueAt),
            isNull(cases.operationFinalizedAt),
            sql`${cases.executionDueAt} < now()`,
          ]);
        case "cases_by_status":
          return buildCasesByStatusReport(filters);
        case "cases_by_technician":
          return buildCasesByTechnicianReport(filters);
        case "cases_by_device_type":
          return buildCasesByDeviceTypeReport(filters);
        case "waiting_approval":
          return buildCaseListReport(filters, "تقرير الحالات بانتظار الموافقة", [eq(cases.status, "waiting_approval")]);
        case "waiting_part":
          return buildCaseListReport(filters, "تقرير الحالات بانتظار القطعة", [eq(cases.status, "waiting_part")]);
        case "repaired_cases":
          return buildCaseListReport(filters, "تقرير الحالات التي تم إصلاحها", [eq(cases.status, "repaired")]);
        case "not_repairable_cases":
          return buildCaseListReport(filters, "تقرير الحالات غير القابلة للإصلاح", [eq(cases.status, "not_repairable")]);
        case "by_case_type":
          return buildCaseListReport(filters, "تقرير الحالات الداخلية والخارجية");
        case "all_cases":
        default:
          return buildCaseListReport(filters, "تقرير جميع الحالات");
      }
    }

    if (filters.category === "technicians") {
      return buildTechnicianPerformanceReport(filters);
    }

    if (filters.category === "inventory") {
      switch (reportType) {
        case "low_stock":
          return buildInventoryQuantityReport(filters, "low");
        case "out_of_stock":
          return buildInventoryQuantityReport(filters, "out");
        case "stock_movements":
          return buildStockMovementsReport(filters);
        case "case_allocations":
          return buildCaseAllocationsReport(filters);
        case "returned_parts":
          return buildReturnedPartsReport(filters);
        case "most_used_parts":
        case "consumed_parts":
          return buildMostUsedPartsReport(filters);
        case "current_inventory":
        default:
          return buildInventoryQuantityReport(filters, "all");
      }
    }

    if (filters.category === "sales") {
      switch (reportType) {
        case "direct_sales":
          return buildSalesListReport(filters, "تقرير المبيعات المباشرة", [eq(invoices.invoiceType, "direct_sale")]);
        case "maintenance_sales":
          return buildSalesListReport(filters, "تقرير مبيعات الصيانة", [eq(invoices.invoiceType, "maintenance")]);
        case "confirmed_sales":
          return buildSalesListReport(filters, "تقرير المبيعات المؤكدة", [eq(invoices.status, "paid")]);
        case "unconfirmed_sales":
          return buildSalesListReport(filters, "تقرير المبيعات غير المؤكدة", [eq(invoices.status, "draft")]);
        case "top_items":
          return buildTopSoldItemsReport(filters);
        case "all_sales":
        default:
          return buildSalesListReport(filters, "تقرير جميع المبيعات");
      }
    }

    if (filters.category === "customers") {
      switch (reportType) {
        case "by_cases_count":
          return buildCustomersReport(filters, "by_cases");
        case "with_open_cases":
          return buildCustomersReport(filters, "open_cases");
        case "new_customers":
          return buildCustomersReport(filters, "new_customers");
        case "by_total_spend":
          return buildCustomersReport(filters, "by_total_spend");
        case "all_customers":
        default:
          return buildCustomersReport(filters, "all");
      }
    }

    switch (reportType) {
      case "weekly_activity":
        return buildActivityTimelineReport(filters, "week");
      case "monthly_activity":
        return buildActivityTimelineReport(filters, "month");
      case "approvals_pending":
        return buildPendingApprovalsReport(filters);
      case "spare_part_handoff_pending":
        return buildPendingHandoffReport(filters);
      case "delayed_workflow":
        return buildDelayedWorkflowReport(filters);
      case "daily_activity":
      default:
        return buildActivityTimelineReport(filters, "day");
    }
  },
};
