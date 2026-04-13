# Alpha Stocks

**Track your edge.** A personal portfolio tracker and stock market analyzer with real-time quotes, interactive charts, and cross-platform coverage — web and Android from one codebase.

## Features

- **Real-time quotes** — live prices, change, and percent change via Yahoo Finance + Finnhub fallback, including pre/post market data
- **Analyst insights** — price target, recommendation (Buy/Hold/Sell), upside %, powered by Yahoo Finance financialData
- **Interactive charts** — historical price charts across 8 time ranges (1D to All Time) using Lightweight Charts, with period change % row (like TradingView)
- **Stock overview** — Day's Range & 52 Week Range sliders, key metrics (P/E, Forward P/E, EPS, Beta, Price/Book, Dividend Yield, etc.), next earnings date, employees
- **10-year financials** — Revenue & Net Income annual chart (Alpha Vantage) with YoY growth %, hover tooltips, and 12-quarter earnings table with EPS surprise
- **Stock logos** — company logos served via image proxy with browser caching for instant display
- **Market indices** — index cards with tabs for US, Europe, Asia, and Currencies
- **Portfolio tracking** — multiple portfolios with buy/sell/dividend transactions, cost basis, realized/unrealized gains, daily P&L, portfolio value evolution chart, portfolio switching dropdown, sortable positions table with per-portfolio sort persistence
- **Portfolio stats** — stock distribution pie chart with hover tooltips, expandable per-portfolio breakdown sorted by value
- **CSV import** — bulk-import transactions from CSV files with preview and validation
- **Watchlists** — organize stocks into watchlists with drag & drop reordering, gainers/losers split columns
- **News feed** — dual-source (Yahoo Finance + Finnhub), deduplicated by headline, filtered by symbol relevance, weighted by portfolio value on home page
- **Earnings calendar** — quote-based earnings dates for all watchlist + portfolio stocks within 30 days, deduplicated by company name
- **Dynamic page titles** — every page sets `document.title` (e.g., "ARM stock - Alpha Stocks")
- **Currency view** — simplified detail page for forex pairs (no tabs, just quote + overview + chart), default 6M range
- **Google sign-in** — OAuth via Supabase Auth, data stays private per user
- **Mobile app** — full-featured Android app with stock detail (analyst data, ranges, news), portfolio management, in-app news browser (expo-web-browser)

## Architecture

TypeScript monorepo using pnpm workspaces + Turborepo.

```
apps/web/            Next.js 16 — App Router, Turbopack, Tailwind CSS v4, React 19
apps/mobile/         Expo SDK 55 — Expo Router, React Native 0.83 (New Architecture)
packages/core/       Shared types, API client, hooks, providers, calculations
supabase/            Database migrations (Postgres with RLS)
.github/workflows/   CI pipeline (typecheck + test on every push)
```

### Data flow

- **Market data** — both apps call Next.js API routes (`/api/stocks/*`, `/api/news`) which proxy to yahoo-finance2 (primary) and Finnhub (fallback + news/logos). Yahoo's `quoteSummary` fetches analyst targets alongside quotes. Alpha Vantage provides 10-year financial statements. Batch quotes use `Promise.allSettled` for partial failure resilience.
- **News** — dual-source from Finnhub + Yahoo Finance, merged with headline deduplication, filtered by symbol relevance, server-side cached for 10 minutes.
- **Financial data** — Alpha Vantage INCOME_STATEMENT (annuals) + EARNINGS (quarterly EPS), cached in Supabase `api_cache` table for 7 days. Smart cache: rate-limited responses (< 5 entries) are not cached, so the next visit retries. Falls back to Yahoo (4 years) when Alpha Vantage is unavailable.
- **User data** — watchlists, portfolios, and transactions live in Supabase Postgres, accessed directly via the Supabase JS client. Row Level Security enforces per-user isolation.
- **Auth** — Google OAuth through Supabase Auth with server-side session management. Callback uses forwarded headers for correct redirect on Cloud Run.

The mobile app depends on the Next.js server for market data, both in development and production.

### API routes

| Endpoint | Description |
|---|---|
| `/api/stocks/quote` | Single or batch stock quotes with analyst data (partial failure safe) |
| `/api/stocks/search` | Symbol search with autocomplete |
| `/api/stocks/historical` | OHLCV price history (1D to ALL range) |
| `/api/stocks/profile` | Company profile |
| `/api/stocks/financials` | 10-year annual financials + 12 quarterly earnings (Alpha Vantage + Yahoo, Supabase cached) |
| `/api/stocks/logo` | Stock logo image proxy with 30-day browser caching |
| `/api/news` | Dual-source news (Finnhub + Yahoo) with dedup, relevance filter, 10-min cache |
| `/api/earnings` | Earnings calendar by date range |

### Caching strategy

| Data | Storage | TTL | Notes |
|------|---------|-----|-------|
| Financials | Supabase `api_cache` | 7 days | Smart: won't cache rate-limited responses |
| News | Server in-memory | 10 min | Per symbol |
| Logos | Server in-memory + browser | 30 days | URL cache + Cache-Control header |
| Client queries | TanStack Query | 30s default | 5min for news/historical |

## Getting started

### Prerequisites

- Node.js 22+
- pnpm 10+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for migrations)
- A [Finnhub](https://finnhub.io/register) API key (free tier)
- An [Alpha Vantage](https://www.alphavantage.co/support/#api-key) API key (free tier, 25 req/day)
- A [Supabase](https://supabase.com) project

### Setup

```bash
git clone <repo-url> && cd alpha-stocks
pnpm install
```

Create `apps/web/.env.local`:

```
FINNHUB_API_KEY=your_finnhub_key
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
```

### Development

```bash
pnpm dev:web        # Web app at localhost:3000
pnpm dev:mobile     # Expo dev server (Android)
pnpm build          # Build all packages
pnpm lint           # Lint all packages
pnpm typecheck      # TypeScript check all packages
pnpm test           # Run all 78 tests
pnpm format         # Prettier format
```

### Database

Link and push migrations using the Supabase CLI:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

Tables: watchlists, watchlist_items, portfolios, transactions, api_cache.

## Testing

78 tests across 3 packages using Vitest:

| Package | Tests | Coverage |
|---------|-------|----------|
| `packages/core` | 40 | Formatting helpers, portfolio metrics (positions, realized gains, dividends, summary) |
| `apps/web` | 22 | API routes: quote, search, historical, earnings, news (mocked providers) |
| `apps/mobile` | 16 | Market config, timeAgo utility, portfolio stats aggregation |

CI runs automatically on every push to `main` via GitHub Actions.

## Deployment

### Web (Google Cloud Run)

The web app ships as a standalone Next.js build in a multi-stage Docker image. Cloud Build handles build, push, and deploy:

```bash
gcloud builds submit --config=cloudbuild.yaml \
  --substitutions=_NEXT_PUBLIC_SUPABASE_URL=...,_NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

Set `FINNHUB_API_KEY` and `ALPHA_VANTAGE_API_KEY` as runtime environment variables on the Cloud Run service.

### Mobile (EAS Build)

```bash
cd apps/mobile
eas build --profile preview   # APK for testing
eas build --profile production # AAB for Play Store
```

The mobile app needs `API_BASE_URL` pointing to your deployed web server.

## Tech stack

| Layer | Technology |
|---|---|
| Web framework | Next.js 16 (App Router, Turbopack) |
| Mobile framework | Expo SDK 55, React Native 0.83 |
| UI | React 19, Tailwind CSS v4 |
| Charts | Lightweight Charts 5 |
| Drag & drop | @dnd-kit |
| Data fetching | TanStack Query 5 |
| Database | Supabase (Postgres + Auth) |
| Market data | yahoo-finance2, Finnhub, Alpha Vantage |
| Testing | Vitest |
| CI/CD | GitHub Actions, Google Cloud Build + Cloud Run, EAS Build |
| Language | TypeScript 5.6 (strict) |
