-- Enable RLS on api_cache to prevent unauthenticated public access.
-- The table stores shared market data (not user-specific), so all
-- authenticated users can read and write.
alter table api_cache enable row level security;

create policy "Authenticated users can read cache"
  on api_cache for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert cache"
  on api_cache for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can update cache"
  on api_cache for update using (auth.role() = 'authenticated');
