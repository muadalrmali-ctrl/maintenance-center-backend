ALTER TABLE "cases"
  ADD COLUMN IF NOT EXISTS "waiting_part_inventory_item_id" integer,
  ADD COLUMN IF NOT EXISTS "waiting_part_name" text,
  ADD COLUMN IF NOT EXISTS "waiting_part_notes" text,
  ADD COLUMN IF NOT EXISTS "waiting_part_image_url" text,
  ADD COLUMN IF NOT EXISTS "diagnosis_note" text,
  ADD COLUMN IF NOT EXISTS "fault_cause" text,
  ADD COLUMN IF NOT EXISTS "latest_message" text,
  ADD COLUMN IF NOT EXISTS "latest_message_channel" text,
  ADD COLUMN IF NOT EXISTS "latest_message_sent_at" timestamp;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cases_waiting_part_inventory_item_id_inventory_items_id_fk'
  ) THEN
    ALTER TABLE "cases"
      ADD CONSTRAINT "cases_waiting_part_inventory_item_id_inventory_items_id_fk"
      FOREIGN KEY ("waiting_part_inventory_item_id")
      REFERENCES "public"."inventory_items"("id")
      ON DELETE no action
      ON UPDATE no action;
  END IF;
END $$;
