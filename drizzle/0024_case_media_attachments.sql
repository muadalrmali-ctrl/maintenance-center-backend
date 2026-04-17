ALTER TABLE "media_assets"
  ADD COLUMN IF NOT EXISTS "case_id" integer,
  ADD COLUMN IF NOT EXISTS "category" text,
  ADD COLUMN IF NOT EXISTS "file_name" text,
  ADD COLUMN IF NOT EXISTS "file_path" text,
  ADD COLUMN IF NOT EXISTS "public_url" text,
  ADD COLUMN IF NOT EXISTS "mime_type" text,
  ADD COLUMN IF NOT EXISTS "size_bytes" integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'media_assets_case_id_cases_id_fk'
  ) THEN
    ALTER TABLE "media_assets"
      ADD CONSTRAINT "media_assets_case_id_cases_id_fk"
      FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE;
  END IF;
END $$;

UPDATE "media_assets"
SET
  "case_id" = CASE WHEN "entity_type" = 'case' THEN "entity_id" ELSE NULL END,
  "public_url" = COALESCE("public_url", "file_url"),
  "file_name" = COALESCE("file_name", split_part("file_url", '/', array_length(string_to_array("file_url", '/'), 1))),
  "category" = COALESCE("category", 'general')
WHERE
  "case_id" IS NULL
  OR "public_url" IS NULL
  OR "file_name" IS NULL
  OR "category" IS NULL;
