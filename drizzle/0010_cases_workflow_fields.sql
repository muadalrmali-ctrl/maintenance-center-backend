ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "priority" text DEFAULT 'متوسطة' NOT NULL;
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "maintenance_team" text;
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "technician_name" text;
