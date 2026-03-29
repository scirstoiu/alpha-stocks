-- Add sort_order column for drag & drop reordering
ALTER TABLE watchlist_items ADD COLUMN sort_order integer DEFAULT 0;

-- Backfill existing rows: assign sort_order based on added_at within each watchlist
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY watchlist_id ORDER BY added_at) - 1 AS rn
  FROM watchlist_items
)
UPDATE watchlist_items
SET sort_order = ranked.rn
FROM ranked
WHERE watchlist_items.id = ranked.id;
