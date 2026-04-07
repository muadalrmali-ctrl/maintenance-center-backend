ALTER TABLE "cases"
  ADD COLUMN IF NOT EXISTS "post_repair_completed_work" text,
  ADD COLUMN IF NOT EXISTS "post_repair_tested" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "post_repair_test_count" integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "post_repair_cleaned" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "post_repair_recommendations" text,
  ADD COLUMN IF NOT EXISTS "post_repair_images" text,
  ADD COLUMN IF NOT EXISTS "post_repair_damaged_part_images" text,
  ADD COLUMN IF NOT EXISTS "post_repair_note" text,
  ADD COLUMN IF NOT EXISTS "ready_notification_message" text,
  ADD COLUMN IF NOT EXISTS "ready_notification_channel" text,
  ADD COLUMN IF NOT EXISTS "ready_notification_sent_at" timestamp,
  ADD COLUMN IF NOT EXISTS "customer_received_at" timestamp,
  ADD COLUMN IF NOT EXISTS "operation_finalized_at" timestamp;
