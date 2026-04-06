-- Custom SQL migration file, put your code below! --
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cases'
      AND column_name = 'problem_description'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cases'
      AND column_name = 'customer_complaint'
  ) THEN
    ALTER TABLE cases RENAME COLUMN problem_description TO customer_complaint;
  END IF;
END $$;

ALTER TABLE cases ADD COLUMN IF NOT EXISTS device_id INTEGER;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cases'
      AND column_name = 'device_name'
  ) THEN
    EXECUTE $migration$
      INSERT INTO devices (appliance_type, brand, model_name, created_by)
      SELECT DISTINCT
        COALESCE(NULLIF(cases.device_name, ''), 'Unknown'),
        'Unknown',
        COALESCE(NULLIF(cases.device_model, ''), 'Unknown'),
        cases.created_by
      FROM cases
      WHERE cases.device_id IS NULL
    $migration$;

    EXECUTE $migration$
      UPDATE cases
      SET device_id = (
        SELECT devices.id
        FROM devices
        WHERE devices.appliance_type = COALESCE(NULLIF(cases.device_name, ''), 'Unknown')
          AND devices.brand = 'Unknown'
          AND devices.model_name = COALESCE(NULLIF(cases.device_model, ''), 'Unknown')
          AND (
            devices.created_by = cases.created_by
            OR (devices.created_by IS NULL AND cases.created_by IS NULL)
          )
        ORDER BY devices.id
        LIMIT 1
      )
      WHERE cases.device_id IS NULL
    $migration$;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cases WHERE device_id IS NULL) THEN
    RAISE EXCEPTION 'Cannot enforce cases.device_id NOT NULL because some legacy cases could not be backfilled';
  END IF;
END $$;

ALTER TABLE cases ALTER COLUMN device_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cases_device_id_devices_id_fk'
  ) THEN
    ALTER TABLE cases
      ADD CONSTRAINT cases_device_id_devices_id_fk
      FOREIGN KEY (device_id)
      REFERENCES devices(id);
  END IF;
END $$;

ALTER TABLE cases DROP COLUMN IF EXISTS device_name;
ALTER TABLE cases DROP COLUMN IF EXISTS device_model;
