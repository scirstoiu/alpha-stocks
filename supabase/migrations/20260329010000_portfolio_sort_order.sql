-- Add sort_order column for drag & drop reordering of portfolios
ALTER TABLE portfolios ADD COLUMN sort_order integer DEFAULT 0;

-- Backfill existing rows
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) - 1 AS rn
  FROM portfolios
)
UPDATE portfolios
SET sort_order = ranked.rn
FROM ranked
WHERE portfolios.id = ranked.id;
