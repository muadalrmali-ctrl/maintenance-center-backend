ALTER TABLE "invoices"
ADD COLUMN "sale_code" text;

ALTER TABLE "invoices"
ADD COLUMN "confirmed_at" timestamp;

ALTER TABLE "invoices"
ADD COLUMN "confirmed_by" integer REFERENCES "users"("id");

CREATE UNIQUE INDEX IF NOT EXISTS "invoices_sale_code_unique" ON "invoices" ("sale_code");
