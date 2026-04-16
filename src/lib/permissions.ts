import type { AppRole } from "./roles";

export type PermissionGroup =
  | "dashboard"
  | "cases"
  | "maintenance_operations"
  | "inventory"
  | "sales"
  | "reports"
  | "accounting";

export type PermissionCatalogEntry = {
  key: string;
  label: string;
  group: PermissionGroup;
  parentKey?: string;
  description?: string;
};

export const PERMISSION_CATALOG: PermissionCatalogEntry[] = [
  {
    key: "dashboard.view",
    label: "عرض لوحة التحكم",
    group: "dashboard",
    description: "الوصول إلى لوحة التحكم الرئيسية.",
  },
  {
    key: "cases.view",
    label: "عرض صفحة الحالات",
    group: "cases",
    description: "الوصول إلى صفحة الحالات ولوحة سير العمل.",
  },
  { key: "cases.create", label: "إنشاء حالة جديدة", group: "cases", parentKey: "cases.view" },
  { key: "cases.column.new.view", label: "عرض عمود حالة جديدة", group: "cases", parentKey: "cases.view" },
  { key: "cases.column.waiting.view", label: "عرض عمود بانتظار القطعة", group: "cases", parentKey: "cases.view" },
  { key: "cases.column.diagnosis.view", label: "عرض عمود قيد التشخيص", group: "cases", parentKey: "cases.view" },
  { key: "cases.diagnosis.edit", label: "تعديل التشخيص والفاتورة", group: "cases", parentKey: "cases.column.diagnosis.view" },
  {
    key: "cases.diagnosis.invoice.preview",
    label: "معاينة فاتورة التشخيص",
    group: "cases",
    parentKey: "cases.column.diagnosis.view",
  },
  {
    key: "cases.column.approval_part_delivery.view",
    label: "عرض عمود الموافقة وتسليم القطعة",
    group: "cases",
    parentKey: "cases.view",
  },
  {
    key: "cases.approval.invoice.preview",
    label: "معاينة فاتورة الموافقة",
    group: "cases",
    parentKey: "cases.column.approval_part_delivery.view",
  },
  {
    key: "cases.approval.approve",
    label: "تأكيد موافقة العميل",
    group: "cases",
    parentKey: "cases.column.approval_part_delivery.view",
  },
  {
    key: "cases.approval.part_delivery_receive",
    label: "تسليم / استلام / عهدة القطع",
    group: "cases",
    parentKey: "cases.column.approval_part_delivery.view",
  },
  {
    key: "cases.approval.prepare_execution",
    label: "تجهيز بدء التنفيذ",
    group: "cases",
    parentKey: "cases.column.approval_part_delivery.view",
  },
  { key: "cases.column.in_progress.view", label: "عرض عمود قيد التنفيذ", group: "cases", parentKey: "cases.view" },
  {
    key: "cases.in_progress.execution.preview",
    label: "عرض لوحة التنفيذ",
    group: "cases",
    parentKey: "cases.column.in_progress.view",
  },
  {
    key: "cases.in_progress.invoice.preview",
    label: "معاينة فاتورة التنفيذ",
    group: "cases",
    parentKey: "cases.column.in_progress.view",
  },
  {
    key: "cases.in_progress.mark_repaired",
    label: "تسجيل تم الإصلاح",
    group: "cases",
    parentKey: "cases.column.in_progress.view",
  },
  { key: "cases.column.repaired.view", label: "عرض عمود تم الإصلاح", group: "cases", parentKey: "cases.view" },
  {
    key: "cases.repaired.summary.view",
    label: "عرض ملخص الإصلاح",
    group: "cases",
    parentKey: "cases.column.repaired.view",
  },
  {
    key: "cases.repaired.invoice.preview",
    label: "معاينة فاتورة الإصلاح النهائية",
    group: "cases",
    parentKey: "cases.column.repaired.view",
  },
  {
    key: "cases.repaired.post_repair_quality.view",
    label: "حفظ بيانات الجودة بعد الإصلاح",
    group: "cases",
    parentKey: "cases.column.repaired.view",
  },
  {
    key: "cases.repaired.ready_notification.send",
    label: "إرسال إشعار الجاهزية",
    group: "cases",
    parentKey: "cases.column.repaired.view",
  },
  { key: "cases.column.not_repairable.view", label: "عرض عمود لا يمكن إصلاحها", group: "cases", parentKey: "cases.view" },
  { key: "maintenance_operations.view", label: "عرض عمليات الصيانة", group: "maintenance_operations" },
  {
    key: "maintenance_operations.quality_saved_data.view",
    label: "عرض بيانات الجودة المحفوظة",
    group: "maintenance_operations",
    parentKey: "maintenance_operations.view",
  },
  {
    key: "maintenance_operations.final_invoice.view",
    label: "عرض الفاتورة النهائية",
    group: "maintenance_operations",
    parentKey: "maintenance_operations.view",
  },
  {
    key: "maintenance_operations.after_repair_image.view",
    label: "عرض صور ما بعد الإصلاح",
    group: "maintenance_operations",
    parentKey: "maintenance_operations.view",
  },
  {
    key: "maintenance_operations.after_repair_video.view",
    label: "عرض فيديو ما بعد الإصلاح",
    group: "maintenance_operations",
    parentKey: "maintenance_operations.view",
  },
  {
    key: "maintenance_operations.damaged_part_image.view",
    label: "عرض صور القطعة المعطوبة",
    group: "maintenance_operations",
    parentKey: "maintenance_operations.view",
  },
  { key: "inventory.view", label: "عرض صفحة المخزون", group: "inventory" },
  { key: "inventory.admin_actions", label: "إجراءات إدارة المخزون", group: "inventory", parentKey: "inventory.view" },
  { key: "inventory.item.create", label: "إضافة قطعة", group: "inventory", parentKey: "inventory.admin_actions" },
  { key: "inventory.item.edit", label: "تعديل قطعة", group: "inventory", parentKey: "inventory.admin_actions" },
  { key: "inventory.item.delete", label: "حذف / أرشفة قطعة", group: "inventory", parentKey: "inventory.admin_actions" },
  {
    key: "inventory.item.quantity.update",
    label: "تعديل كمية المخزون",
    group: "inventory",
    parentKey: "inventory.admin_actions",
  },
  { key: "sales.view", label: "عرض صفحة المبيعات", group: "sales" },
  { key: "sales.create", label: "إنشاء بيع مباشر", group: "sales", parentKey: "sales.view" },
  { key: "sales.confirm", label: "تأكيد البيع وخروج المخزون", group: "sales", parentKey: "sales.view" },
  { key: "reports.view", label: "عرض صفحة التقارير", group: "reports" },
  { key: "reports.cases.view", label: "عرض تقارير الحالات", group: "reports", parentKey: "reports.view" },
  { key: "reports.technicians.view", label: "عرض تقارير الفنيين", group: "reports", parentKey: "reports.view" },
  { key: "reports.inventory.view", label: "عرض تقارير المخزون", group: "reports", parentKey: "reports.view" },
  { key: "reports.sales.view", label: "عرض تقارير المبيعات", group: "reports", parentKey: "reports.view" },
  { key: "reports.customers.view", label: "عرض تقارير العملاء", group: "reports", parentKey: "reports.view" },
  {
    key: "reports.operations_workflow.view",
    label: "عرض تقارير التشغيل وسير العمل",
    group: "reports",
    parentKey: "reports.view",
  },
  { key: "accounting.view", label: "عرض صفحة المحاسبة", group: "accounting" },
  { key: "accounting.customers.view", label: "عرض قسم العملاء", group: "accounting", parentKey: "accounting.view" },
  { key: "accounting.team.view", label: "عرض قسم الفريق", group: "accounting", parentKey: "accounting.view" },
];

export const ALL_PERMISSION_KEYS = PERMISSION_CATALOG.map((permission) => permission.key);

export const REPORT_CATEGORY_PERMISSION_MAP = {
  cases: "reports.cases.view",
  technicians: "reports.technicians.view",
  inventory: "reports.inventory.view",
  sales: "reports.sales.view",
  customers: "reports.customers.view",
  operations: "reports.operations_workflow.view",
} as const;

const DEFAULT_RECEPTIONIST_PERMISSIONS = [
  "dashboard.view",
  "cases.view",
  "cases.create",
  "cases.column.new.view",
  "cases.column.waiting.view",
  "cases.column.diagnosis.view",
  "cases.diagnosis.invoice.preview",
  "cases.column.approval_part_delivery.view",
  "cases.approval.invoice.preview",
  "cases.approval.approve",
  "cases.approval.prepare_execution",
  "cases.column.in_progress.view",
  "cases.in_progress.execution.preview",
  "cases.in_progress.invoice.preview",
  "cases.column.repaired.view",
  "cases.repaired.summary.view",
  "cases.repaired.invoice.preview",
  "cases.repaired.ready_notification.send",
  "cases.column.not_repairable.view",
  "maintenance_operations.view",
  "maintenance_operations.quality_saved_data.view",
  "maintenance_operations.final_invoice.view",
  "maintenance_operations.after_repair_image.view",
  "maintenance_operations.after_repair_video.view",
  "maintenance_operations.damaged_part_image.view",
  "sales.view",
  "sales.create",
  "reports.view",
  "reports.cases.view",
  "reports.sales.view",
  "reports.customers.view",
  "reports.operations_workflow.view",
  "accounting.view",
  "accounting.customers.view",
  "accounting.team.view",
];

const DEFAULT_TECHNICIAN_PERMISSIONS = [
  "dashboard.view",
  "cases.view",
  "cases.column.new.view",
  "cases.column.waiting.view",
  "cases.column.diagnosis.view",
  "cases.diagnosis.edit",
  "cases.diagnosis.invoice.preview",
  "cases.column.approval_part_delivery.view",
  "cases.approval.invoice.preview",
  "cases.approval.part_delivery_receive",
  "cases.column.in_progress.view",
  "cases.in_progress.execution.preview",
  "cases.in_progress.invoice.preview",
  "cases.in_progress.mark_repaired",
  "cases.column.repaired.view",
  "cases.repaired.summary.view",
  "cases.repaired.invoice.preview",
  "cases.repaired.post_repair_quality.view",
  "cases.repaired.ready_notification.send",
  "cases.column.not_repairable.view",
  "maintenance_operations.view",
  "maintenance_operations.quality_saved_data.view",
  "maintenance_operations.final_invoice.view",
  "maintenance_operations.after_repair_image.view",
  "maintenance_operations.after_repair_video.view",
  "maintenance_operations.damaged_part_image.view",
];

const DEFAULT_STORE_MANAGER_PERMISSIONS = [
  "dashboard.view",
  "cases.view",
  "cases.column.new.view",
  "cases.column.waiting.view",
  "cases.column.diagnosis.view",
  "cases.diagnosis.invoice.preview",
  "cases.column.approval_part_delivery.view",
  "cases.approval.invoice.preview",
  "cases.approval.part_delivery_receive",
  "cases.column.in_progress.view",
  "cases.in_progress.invoice.preview",
  "cases.column.repaired.view",
  "cases.repaired.invoice.preview",
  "cases.column.not_repairable.view",
  "inventory.view",
  "inventory.admin_actions",
  "inventory.item.create",
  "inventory.item.edit",
  "inventory.item.delete",
  "inventory.item.quantity.update",
  "sales.view",
  "sales.create",
  "sales.confirm",
  "reports.view",
  "reports.cases.view",
  "reports.inventory.view",
  "reports.sales.view",
  "reports.customers.view",
  "reports.operations_workflow.view",
];

const DEFAULT_TECHNICIAN_MANAGER_PERMISSIONS = [
  "dashboard.view",
  "cases.view",
  "cases.column.new.view",
  "cases.column.waiting.view",
  "cases.column.diagnosis.view",
  "cases.diagnosis.edit",
  "cases.diagnosis.invoice.preview",
  "cases.column.approval_part_delivery.view",
  "cases.approval.invoice.preview",
  "cases.approval.approve",
  "cases.approval.part_delivery_receive",
  "cases.approval.prepare_execution",
  "cases.column.in_progress.view",
  "cases.in_progress.execution.preview",
  "cases.in_progress.invoice.preview",
  "cases.in_progress.mark_repaired",
  "cases.column.repaired.view",
  "cases.repaired.summary.view",
  "cases.repaired.invoice.preview",
  "cases.repaired.post_repair_quality.view",
  "cases.repaired.ready_notification.send",
  "cases.column.not_repairable.view",
  "maintenance_operations.view",
  "maintenance_operations.quality_saved_data.view",
  "maintenance_operations.final_invoice.view",
  "maintenance_operations.after_repair_image.view",
  "maintenance_operations.after_repair_video.view",
  "maintenance_operations.damaged_part_image.view",
  "reports.view",
  "reports.cases.view",
  "reports.technicians.view",
  "reports.operations_workflow.view",
  "accounting.view",
  "accounting.team.view",
];

const DEFAULT_MAINTENANCE_MANAGER_PERMISSIONS = [
  ...DEFAULT_TECHNICIAN_MANAGER_PERMISSIONS,
  "cases.create",
  "sales.view",
  "sales.create",
  "reports.sales.view",
  "reports.customers.view",
  "accounting.customers.view",
];

export const DEFAULT_ROLE_PERMISSION_KEYS: Record<AppRole, string[]> = {
  admin: [...ALL_PERMISSION_KEYS],
  receptionist: DEFAULT_RECEPTIONIST_PERMISSIONS,
  technician: DEFAULT_TECHNICIAN_PERMISSIONS,
  store_manager: DEFAULT_STORE_MANAGER_PERMISSIONS,
  technician_manager: DEFAULT_TECHNICIAN_MANAGER_PERMISSIONS,
  maintenance_manager: DEFAULT_MAINTENANCE_MANAGER_PERMISSIONS,
};

export const getDefaultPermissionKeysForRole = (role: AppRole) =>
  [...new Set(DEFAULT_ROLE_PERMISSION_KEYS[role] ?? [])];

export const isPermissionKey = (key: string): key is string =>
  ALL_PERMISSION_KEYS.includes(key);
