ALTER TABLE cases
  RENAME COLUMN customer_complaint TO problem_description;

ALTER TABLE cases
  ADD COLUMN device_name text NOT NULL DEFAULT '';

ALTER TABLE cases
  ADD COLUMN device_model text;

ALTER TABLE cases
  ADD COLUMN serial_number text;

ALTER TABLE cases
  ADD COLUMN notes text;

ALTER TABLE cases
  DROP COLUMN device_id;

ALTER TABLE cases
  DROP COLUMN initial_check_notes;

ALTER TABLE cases
  DROP COLUMN diagnosis_notes;

ALTER TABLE cases
  DROP COLUMN internal_notes;

ALTER TABLE cases
  ALTER COLUMN device_name DROP DEFAULT;

ALTER TABLE cases
  ALTER COLUMN customer_id SET NOT NULL;

ALTER TABLE cases
  ALTER COLUMN created_by SET NOT NULL;
