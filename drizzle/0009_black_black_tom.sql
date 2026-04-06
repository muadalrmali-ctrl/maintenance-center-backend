ALTER TABLE "media_assets" DROP CONSTRAINT "media_assets_case_id_cases_id_fk";
--> statement-breakpoint
ALTER TABLE "cases" ALTER COLUMN "customer_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "cases" ALTER COLUMN "device_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "cases" ALTER COLUMN "created_by" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "serial_number" text;--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "entity_type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "entity_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "file_type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD COLUMN "type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD COLUMN "target" text NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD COLUMN "reference_type" text;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD COLUMN "reference_id" integer;--> statement-breakpoint
ALTER TABLE "cases" DROP COLUMN "initial_check_notes";--> statement-breakpoint
ALTER TABLE "cases" DROP COLUMN "diagnosis_notes";--> statement-breakpoint
ALTER TABLE "cases" DROP COLUMN "internal_notes";--> statement-breakpoint
ALTER TABLE "media_assets" DROP COLUMN "case_id";--> statement-breakpoint
ALTER TABLE "media_assets" DROP COLUMN "file_name";--> statement-breakpoint
ALTER TABLE "media_assets" DROP COLUMN "original_name";--> statement-breakpoint
ALTER TABLE "media_assets" DROP COLUMN "mime_type";--> statement-breakpoint
ALTER TABLE "media_assets" DROP COLUMN "file_size";--> statement-breakpoint
ALTER TABLE "media_assets" DROP COLUMN "asset_type";--> statement-breakpoint
ALTER TABLE "media_assets" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "notification_logs" DROP COLUMN "case_id";--> statement-breakpoint
ALTER TABLE "notification_logs" DROP COLUMN "channel";--> statement-breakpoint
ALTER TABLE "notification_logs" DROP COLUMN "recipient";--> statement-breakpoint
ALTER TABLE "notification_logs" DROP COLUMN "provider_response";--> statement-breakpoint
ALTER TABLE "notification_logs" DROP COLUMN "sent_by";--> statement-breakpoint
ALTER TABLE "notification_logs" DROP COLUMN "sent_at";