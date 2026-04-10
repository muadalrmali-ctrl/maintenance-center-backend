ALTER TABLE "cases"
ADD COLUMN "customer_approved_at" timestamp,
ADD COLUMN "customer_approved_by" integer REFERENCES "users"("id");

ALTER TABLE "case_parts"
ADD COLUMN "handoff_status" text NOT NULL DEFAULT 'pending',
ADD COLUMN "delivered_at" timestamp,
ADD COLUMN "delivered_by" integer REFERENCES "users"("id"),
ADD COLUMN "received_at" timestamp,
ADD COLUMN "received_by" integer REFERENCES "users"("id"),
ADD COLUMN "returned_at" timestamp,
ADD COLUMN "returned_by" integer REFERENCES "users"("id"),
ADD COLUMN "consumed_at" timestamp,
ADD COLUMN "consumed_by" integer REFERENCES "users"("id");
