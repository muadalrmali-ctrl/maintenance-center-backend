CREATE TABLE IF NOT EXISTS "permissions" (
  "id" serial PRIMARY KEY NOT NULL,
  "key" text NOT NULL,
  "label" text NOT NULL,
  "group_name" text NOT NULL,
  "parent_key" text,
  "description" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "permissions_key_unique" UNIQUE ("key")
);

CREATE TABLE IF NOT EXISTS "user_permissions" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "permission_id" integer NOT NULL,
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "user_permissions_user_permission_unique" UNIQUE ("user_id","permission_id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_permissions_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "user_permissions"
      ADD CONSTRAINT "user_permissions_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_permissions_permission_id_permissions_id_fk'
  ) THEN
    ALTER TABLE "user_permissions"
      ADD CONSTRAINT "user_permissions_permission_id_permissions_id_fk"
      FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE;
  END IF;
END $$;

INSERT INTO "permissions" ("key", "label", "group_name", "parent_key", "description", "sort_order", "created_at", "updated_at")
VALUES
  ('dashboard.view', 'عرض لوحة التحكم', 'dashboard', NULL, 'الوصول إلى لوحة التحكم الرئيسية.', 0, now(), now()),
  ('cases.view', 'عرض صفحة الحالات', 'cases', NULL, 'الوصول إلى صفحة الحالات ولوحة سير العمل.', 1, now(), now()),
  ('cases.create', 'إنشاء حالة جديدة', 'cases', 'cases.view', NULL, 2, now(), now()),
  ('cases.column.new.view', 'عرض عمود حالة جديدة', 'cases', 'cases.view', NULL, 3, now(), now()),
  ('cases.column.waiting.view', 'عرض عمود بانتظار القطعة', 'cases', 'cases.view', NULL, 4, now(), now()),
  ('cases.column.diagnosis.view', 'عرض عمود قيد التشخيص', 'cases', 'cases.view', NULL, 5, now(), now()),
  ('cases.diagnosis.edit', 'تعديل التشخيص والفاتورة', 'cases', 'cases.column.diagnosis.view', NULL, 6, now(), now()),
  ('cases.diagnosis.invoice.preview', 'معاينة فاتورة التشخيص', 'cases', 'cases.column.diagnosis.view', NULL, 7, now(), now()),
  ('cases.column.approval_part_delivery.view', 'عرض عمود الموافقة وتسليم القطعة', 'cases', 'cases.view', NULL, 8, now(), now()),
  ('cases.approval.invoice.preview', 'معاينة فاتورة الموافقة', 'cases', 'cases.column.approval_part_delivery.view', NULL, 9, now(), now()),
  ('cases.approval.approve', 'تأكيد موافقة العميل', 'cases', 'cases.column.approval_part_delivery.view', NULL, 10, now(), now()),
  ('cases.approval.part_delivery_receive', 'تسليم / استلام / عهدة القطع', 'cases', 'cases.column.approval_part_delivery.view', NULL, 11, now(), now()),
  ('cases.approval.prepare_execution', 'تجهيز بدء التنفيذ', 'cases', 'cases.column.approval_part_delivery.view', NULL, 12, now(), now()),
  ('cases.column.in_progress.view', 'عرض عمود قيد التنفيذ', 'cases', 'cases.view', NULL, 13, now(), now()),
  ('cases.in_progress.execution.preview', 'عرض لوحة التنفيذ', 'cases', 'cases.column.in_progress.view', NULL, 14, now(), now()),
  ('cases.in_progress.invoice.preview', 'معاينة فاتورة التنفيذ', 'cases', 'cases.column.in_progress.view', NULL, 15, now(), now()),
  ('cases.in_progress.mark_repaired', 'تسجيل تم الإصلاح', 'cases', 'cases.column.in_progress.view', NULL, 16, now(), now()),
  ('cases.column.repaired.view', 'عرض عمود تم الإصلاح', 'cases', 'cases.view', NULL, 17, now(), now()),
  ('cases.repaired.summary.view', 'عرض ملخص الإصلاح', 'cases', 'cases.column.repaired.view', NULL, 18, now(), now()),
  ('cases.repaired.invoice.preview', 'معاينة فاتورة الإصلاح النهائية', 'cases', 'cases.column.repaired.view', NULL, 19, now(), now()),
  ('cases.repaired.post_repair_quality.view', 'حفظ بيانات الجودة بعد الإصلاح', 'cases', 'cases.column.repaired.view', NULL, 20, now(), now()),
  ('cases.repaired.ready_notification.send', 'إرسال إشعار الجاهزية', 'cases', 'cases.column.repaired.view', NULL, 21, now(), now()),
  ('cases.column.not_repairable.view', 'عرض عمود لا يمكن إصلاحها', 'cases', 'cases.view', NULL, 22, now(), now()),
  ('maintenance_operations.view', 'عرض عمليات الصيانة', 'maintenance_operations', NULL, NULL, 23, now(), now()),
  ('maintenance_operations.quality_saved_data.view', 'عرض بيانات الجودة المحفوظة', 'maintenance_operations', 'maintenance_operations.view', NULL, 24, now(), now()),
  ('maintenance_operations.final_invoice.view', 'عرض الفاتورة النهائية', 'maintenance_operations', 'maintenance_operations.view', NULL, 25, now(), now()),
  ('maintenance_operations.after_repair_image.view', 'عرض صور ما بعد الإصلاح', 'maintenance_operations', 'maintenance_operations.view', NULL, 26, now(), now()),
  ('maintenance_operations.after_repair_video.view', 'عرض فيديو ما بعد الإصلاح', 'maintenance_operations', 'maintenance_operations.view', NULL, 27, now(), now()),
  ('maintenance_operations.damaged_part_image.view', 'عرض صور القطعة المعطوبة', 'maintenance_operations', 'maintenance_operations.view', NULL, 28, now(), now()),
  ('inventory.view', 'عرض صفحة المخزون', 'inventory', NULL, NULL, 29, now(), now()),
  ('inventory.admin_actions', 'إجراءات إدارة المخزون', 'inventory', 'inventory.view', NULL, 30, now(), now()),
  ('inventory.item.create', 'إضافة قطعة', 'inventory', 'inventory.admin_actions', NULL, 31, now(), now()),
  ('inventory.item.edit', 'تعديل قطعة', 'inventory', 'inventory.admin_actions', NULL, 32, now(), now()),
  ('inventory.item.delete', 'حذف / أرشفة قطعة', 'inventory', 'inventory.admin_actions', NULL, 33, now(), now()),
  ('inventory.item.quantity.update', 'تعديل كمية المخزون', 'inventory', 'inventory.admin_actions', NULL, 34, now(), now()),
  ('sales.view', 'عرض صفحة المبيعات', 'sales', NULL, NULL, 35, now(), now()),
  ('sales.create', 'إنشاء بيع مباشر', 'sales', 'sales.view', NULL, 36, now(), now()),
  ('sales.confirm', 'تأكيد البيع وخروج المخزون', 'sales', 'sales.view', NULL, 37, now(), now()),
  ('reports.view', 'عرض صفحة التقارير', 'reports', NULL, NULL, 38, now(), now()),
  ('reports.cases.view', 'عرض تقارير الحالات', 'reports', 'reports.view', NULL, 39, now(), now()),
  ('reports.technicians.view', 'عرض تقارير الفنيين', 'reports', 'reports.view', NULL, 40, now(), now()),
  ('reports.inventory.view', 'عرض تقارير المخزون', 'reports', 'reports.view', NULL, 41, now(), now()),
  ('reports.sales.view', 'عرض تقارير المبيعات', 'reports', 'reports.view', NULL, 42, now(), now()),
  ('reports.customers.view', 'عرض تقارير العملاء', 'reports', 'reports.view', NULL, 43, now(), now()),
  ('reports.operations_workflow.view', 'عرض تقارير التشغيل وسير العمل', 'reports', 'reports.view', NULL, 44, now(), now()),
  ('accounting.view', 'عرض صفحة المحاسبة', 'accounting', NULL, NULL, 45, now(), now()),
  ('accounting.customers.view', 'عرض قسم العملاء', 'accounting', 'accounting.view', NULL, 46, now(), now()),
  ('accounting.team.view', 'عرض قسم الفريق', 'accounting', 'accounting.view', NULL, 47, now(), now())
ON CONFLICT ("key") DO UPDATE SET
  "label" = EXCLUDED."label",
  "group_name" = EXCLUDED."group_name",
  "parent_key" = EXCLUDED."parent_key",
  "description" = EXCLUDED."description",
  "sort_order" = EXCLUDED."sort_order",
  "updated_at" = now();
