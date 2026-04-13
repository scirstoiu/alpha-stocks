-- API response cache (financial data, etc.)
-- No RLS needed — this is shared public market data, not user data.
create table api_cache (
  key text primary key,
  data jsonb not null,
  created_at timestamptz default now(),
  expires_at timestamptz not null
);

-- Index for cleanup queries
create index idx_api_cache_expires on api_cache (expires_at);
