-- Watchlists
create table watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Watchlist items
create table watchlist_items (
  id uuid primary key default gen_random_uuid(),
  watchlist_id uuid references watchlists(id) on delete cascade not null,
  symbol text not null,
  notes text,
  added_at timestamptz default now(),
  unique(watchlist_id, symbol)
);

-- Portfolios
create table portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Transactions
create table transactions (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid references portfolios(id) on delete cascade not null,
  symbol text not null,
  type text not null check (type in ('buy', 'sell', 'dividend')),
  shares numeric not null,
  price_per_share numeric not null,
  fees numeric default 0,
  date date not null,
  notes text,
  created_at timestamptz default now()
);

-- Indexes
create index idx_watchlists_user_id on watchlists(user_id);
create index idx_watchlist_items_watchlist_id on watchlist_items(watchlist_id);
create index idx_portfolios_user_id on portfolios(user_id);
create index idx_transactions_portfolio_id on transactions(portfolio_id);
create index idx_transactions_symbol on transactions(symbol);

-- Enable RLS
alter table watchlists enable row level security;
alter table watchlist_items enable row level security;
alter table portfolios enable row level security;
alter table transactions enable row level security;

-- RLS policies: watchlists
create policy "Users can view their own watchlists"
  on watchlists for select using (auth.uid() = user_id);
create policy "Users can create their own watchlists"
  on watchlists for insert with check (auth.uid() = user_id);
create policy "Users can update their own watchlists"
  on watchlists for update using (auth.uid() = user_id);
create policy "Users can delete their own watchlists"
  on watchlists for delete using (auth.uid() = user_id);

-- RLS policies: watchlist_items
create policy "Users can view items in their watchlists"
  on watchlist_items for select using (
    watchlist_id in (select id from watchlists where user_id = auth.uid())
  );
create policy "Users can add items to their watchlists"
  on watchlist_items for insert with check (
    watchlist_id in (select id from watchlists where user_id = auth.uid())
  );
create policy "Users can update items in their watchlists"
  on watchlist_items for update using (
    watchlist_id in (select id from watchlists where user_id = auth.uid())
  );
create policy "Users can delete items from their watchlists"
  on watchlist_items for delete using (
    watchlist_id in (select id from watchlists where user_id = auth.uid())
  );

-- RLS policies: portfolios
create policy "Users can view their own portfolios"
  on portfolios for select using (auth.uid() = user_id);
create policy "Users can create their own portfolios"
  on portfolios for insert with check (auth.uid() = user_id);
create policy "Users can update their own portfolios"
  on portfolios for update using (auth.uid() = user_id);
create policy "Users can delete their own portfolios"
  on portfolios for delete using (auth.uid() = user_id);

-- RLS policies: transactions
create policy "Users can view transactions in their portfolios"
  on transactions for select using (
    portfolio_id in (select id from portfolios where user_id = auth.uid())
  );
create policy "Users can add transactions to their portfolios"
  on transactions for insert with check (
    portfolio_id in (select id from portfolios where user_id = auth.uid())
  );
create policy "Users can update transactions in their portfolios"
  on transactions for update using (
    portfolio_id in (select id from portfolios where user_id = auth.uid())
  );
create policy "Users can delete transactions from their portfolios"
  on transactions for delete using (
    portfolio_id in (select id from portfolios where user_id = auth.uid())
  );
