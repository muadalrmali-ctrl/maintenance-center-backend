ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "phone" text;

ALTER TABLE "staff_invitations"
  ADD COLUMN IF NOT EXISTS "token" text,
  ADD COLUMN IF NOT EXISTS "email" text;

UPDATE "staff_invitations"
SET
  "status" = 'used',
  "updated_at" = now()
WHERE "status" = 'accepted';

UPDATE "staff_invitations"
SET "token" = md5(random()::text || clock_timestamp()::text || id::text || coalesce(token_hash, ''))
WHERE "token" IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'staff_invitations_token_unique'
  ) THEN
    ALTER TABLE "staff_invitations"
      ADD CONSTRAINT "staff_invitations_token_unique" UNIQUE ("token");
  END IF;
END $$;
