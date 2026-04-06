-- Custom SQL migration file, put your code below! --

-- Update media_assets table
ALTER TABLE "media_assets" DROP COLUMN "case_id";
ALTER TABLE "media_assets" DROP COLUMN "file_name";
ALTER TABLE "media_assets" DROP COLUMN "original_name";
ALTER TABLE "media_assets" DROP COLUMN "mime_type";
ALTER TABLE "media_assets" DROP COLUMN "file_size";
ALTER TABLE "media_assets" DROP COLUMN "asset_type";
ALTER TABLE "media_assets" DROP COLUMN "description";

ALTER TABLE "media_assets" ADD COLUMN "entity_type" text NOT NULL;
ALTER TABLE "media_assets" ADD COLUMN "entity_id" integer NOT NULL;
ALTER TABLE "media_assets" ADD COLUMN "file_type" text NOT NULL;

-- Update notification_logs table
ALTER TABLE "notification_logs" DROP COLUMN "case_id";
ALTER TABLE "notification_logs" DROP COLUMN "channel";
ALTER TABLE "notification_logs" DROP COLUMN "recipient";
ALTER TABLE "notification_logs" DROP COLUMN "provider_response";
ALTER TABLE "notification_logs" DROP COLUMN "sent_by";
ALTER TABLE "notification_logs" DROP COLUMN "sent_at";

ALTER TABLE "notification_logs" ADD COLUMN "type" text NOT NULL;
ALTER TABLE "notification_logs" ADD COLUMN "target" text NOT NULL;
ALTER TABLE "notification_logs" ADD COLUMN "reference_type" text;
ALTER TABLE "notification_logs" ADD COLUMN "reference_id" integer;