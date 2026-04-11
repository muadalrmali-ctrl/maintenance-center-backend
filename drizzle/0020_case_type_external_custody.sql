ALTER TABLE "cases"
ADD COLUMN IF NOT EXISTS "case_type" text NOT NULL DEFAULT 'internal';

UPDATE "cases"
SET "case_type" = 'internal'
WHERE "case_type" IS NULL OR "case_type" = '';
