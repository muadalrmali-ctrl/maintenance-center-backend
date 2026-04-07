ALTER TABLE "cases"
  ADD COLUMN IF NOT EXISTS "not_repairable_reason" text;

ALTER TABLE "invoices"
  ALTER COLUMN "case_id" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "customer_id" integer REFERENCES "customers"("id"),
  ADD COLUMN IF NOT EXISTS "invoice_type" text NOT NULL DEFAULT 'maintenance',
  ADD COLUMN IF NOT EXISTS "direct_customer_name" text,
  ADD COLUMN IF NOT EXISTS "direct_customer_phone" text;

UPDATE "invoices"
SET "customer_id" = "cases"."customer_id",
    "invoice_type" = 'maintenance'
FROM "cases"
WHERE "invoices"."case_id" = "cases"."id"
  AND "invoices"."customer_id" IS NULL;
