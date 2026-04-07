ALTER TABLE "cases"
  ADD COLUMN IF NOT EXISTS "execution_duration_days" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "execution_duration_hours" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "execution_timer_started_at" timestamp,
  ADD COLUMN IF NOT EXISTS "execution_timer_paused_at" timestamp,
  ADD COLUMN IF NOT EXISTS "execution_total_paused_seconds" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "execution_completed_at" timestamp;

