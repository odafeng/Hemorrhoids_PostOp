-- Fix wound column: VARCHAR(20) is too narrow for multi-select values
-- e.g., "腫脹,分泌物,其他:紅腫化膿" exceeds 20 chars
ALTER TABLE symptom_reports ALTER COLUMN wound TYPE TEXT;
