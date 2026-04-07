CREATE TABLE IF NOT EXISTS "staff_invitations" (
  "id" serial PRIMARY KEY NOT NULL,
  "token_hash" text NOT NULL,
  "role" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "name" text,
  "phone" text,
  "notes" text,
  "invited_by" integer,
  "accepted_by" integer,
  "expires_at" timestamp NOT NULL,
  "accepted_at" timestamp,
  "revoked_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "staff_invitations_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'staff_invitations_invited_by_users_id_fk'
  ) THEN
    ALTER TABLE "staff_invitations"
      ADD CONSTRAINT "staff_invitations_invited_by_users_id_fk"
      FOREIGN KEY ("invited_by")
      REFERENCES "public"."users"("id")
      ON DELETE no action
      ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'staff_invitations_accepted_by_users_id_fk'
  ) THEN
    ALTER TABLE "staff_invitations"
      ADD CONSTRAINT "staff_invitations_accepted_by_users_id_fk"
      FOREIGN KEY ("accepted_by")
      REFERENCES "public"."users"("id")
      ON DELETE no action
      ON UPDATE no action;
  END IF;
END $$;
