DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Candidate' AND column_name = 'noticePeriod'
  ) THEN
    ALTER TABLE "Candidate" ADD COLUMN "noticePeriod" TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$
DECLARE
  target record;
BEGIN
  FOR target IN
    SELECT * FROM (VALUES
      ('Job', 'requiredSkills'),
      ('Job', 'preferredSkills'),
      ('Job', 'certifications'),
      ('Job', 'keywords'),
      ('JobTemplate', 'requiredSkills'),
      ('JobTemplate', 'preferredSkills'),
      ('Candidate', 'skills'),
      ('Candidate', 'certifications'),
      ('Candidate', 'education'),
      ('Candidate', 'employmentHistory'),
      ('Candidate', 'projects'),
      ('Screening', 'strengths'),
      ('Screening', 'weaknesses'),
      ('Screening', 'missingSkills'),
      ('AuditLog', 'metadata')
    ) AS fields(table_name, column_name)
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE information_schema.columns.table_name = target.table_name
        AND information_schema.columns.column_name = target.column_name
        AND information_schema.columns.udt_name <> 'jsonb'
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ALTER COLUMN %I TYPE JSONB USING COALESCE(NULLIF(%I, ''''), ''[]'')::jsonb',
        target.table_name,
        target.column_name,
        target.column_name
      );
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Candidate' AND column_name = 'resumeText'
  ) THEN
    ALTER TABLE "Candidate" DROP COLUMN "resumeText";
  END IF;
END $$;
