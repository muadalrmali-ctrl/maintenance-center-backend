CREATE TABLE IF NOT EXISTS "reception_points" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "city" text NOT NULL,
  "area" text,
  "address" text,
  "phone" text,
  "manager_name" text,
  "status" text DEFAULT 'active' NOT NULL,
  "notes" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "reception_point_id" integer REFERENCES "reception_points"("id");

ALTER TABLE "staff_invitations"
  ADD COLUMN IF NOT EXISTS "reception_point_id" integer REFERENCES "reception_points"("id");

ALTER TABLE "cases"
  ADD COLUMN IF NOT EXISTS "source_type" text DEFAULT 'main_center' NOT NULL,
  ADD COLUMN IF NOT EXISTS "reception_point_id" integer REFERENCES "reception_points"("id"),
  ADD COLUMN IF NOT EXISTS "created_at_reception_point_by" integer REFERENCES "users"("id"),
  ADD COLUMN IF NOT EXISTS "processing_mode" text DEFAULT 'main_center_repair' NOT NULL,
  ADD COLUMN IF NOT EXISTS "transfer_status" text DEFAULT 'not_required' NOT NULL,
  ADD COLUMN IF NOT EXISTS "sent_to_main_center_at" timestamp,
  ADD COLUMN IF NOT EXISTS "main_center_received_at" timestamp,
  ADD COLUMN IF NOT EXISTS "main_center_received_by" integer REFERENCES "users"("id"),
  ADD COLUMN IF NOT EXISTS "main_center_receipt_notes" text,
  ADD COLUMN IF NOT EXISTS "local_technician_name" text,
  ADD COLUMN IF NOT EXISTS "local_technician_phone" text,
  ADD COLUMN IF NOT EXISTS "local_repair_notes" text;

INSERT INTO "permissions" ("key", "label", "group_name", "parent_key", "description", "sort_order", "created_at", "updated_at")
VALUES
  ('reception_points.view', 'عرض نقاط الاستلام', 'cases', NULL, 'الوصول إلى نقاط الاستلام وإحصائياتها.', 90, now(), now()),
  ('reception_points.manage', 'إدارة نقاط الاستلام', 'cases', 'reception_points.view', 'إنشاء وتعديل وتفعيل/تعطيل نقاط الاستلام.', 91, now(), now()),
  ('reception_points.receive_cases', 'استلام الحالات القادمة من نقاط الاستلام', 'cases', 'reception_points.view', 'تسجيل وصول الحالات المحولة إلى المركز الرئيسي.', 92, now(), now())
ON CONFLICT ("key") DO UPDATE
SET
  "label" = EXCLUDED."label",
  "group_name" = EXCLUDED."group_name",
  "parent_key" = EXCLUDED."parent_key",
  "description" = EXCLUDED."description",
  "sort_order" = EXCLUDED."sort_order",
  "updated_at" = now();
