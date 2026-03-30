# Alpha Stocks

**Track your edge.** A personal portfolio tracker and stock market analyzer with real-time quotes, interactive charts, and cross-platform coverage — web and Android from one codebase.

## Features

- **Real-time quotes** — live prices, change, and percent change via Yahoo Finance + Finnhub fallback
- **Interactive charts** — historical price charts across 9 time ranges (1D to 5Y) using Lightweight Charts
- **Stock logos** — company logos served via image proxy with browser caching for instant display
- **Market indices** — Google Finance-style index cards with tabs for US, Europe, Asia, and Currencies
- **Portfolio tracking** — multiple portfolios with buy/sell/dividend transactions, cost basis, realized/unrealized gains, daily P&L, portfolio value evolution chart
- **CSV import** — bulk-import transactions from CSV files with preview and validation
- **Watchlists** — organize stocks into watchlists with drag & drop reordering, top movers view, earnings and news tabs
- **News feed** — stock-specific news prioritized from your watchlists and portfolios
- **Earnings calendar** — upcoming earnings with EPS/revenue estimates, filterable by your watchlists
- **Google sign-in** — OAuth via Supabase Auth, data stays private per user

## Architecture

TypeScript monorepo using pnpm workspaces + Turborepo.

```
apps/web/            Next.js 16 — App Router, Turbopack, Tailwind CSS v4, React 19
apps/mobile/         Expo SDK 55 — Expo Router, React Native 0.83 (New Architecture)
packages/core/       Shared types, API client, hooks, providers, calculations
supabase/            Database migrations (Postgres with RLS)
```

### Data flow

- **Market data** — both apps call Next.js API routes (`/api/stocks/*`, `/api/news`, `/api/earnings`) which proxy to yahoo-finance2 (primary) and Finnhub (fallback + news/earnings). Providers are server-only (Node.js). Batch quotes use `Promise.allSettled` for partial failure resilience.
- **User data** — watchlists, portfolios, and transactions live in Supabase Postgres, accessed directly via the Supabase JS client. Row Level Security enforces per-user isolation.
- **Auth** — Google OAuth through Supabase Auth with server-side session management. Callback uses forwarded headers for correct redirect on Cloud Run.

The mobile app depends on the Next.js server for market data, both in development and production.

### API routes

| Endpoint | Description |
|---|---|
| `/api/stocks/quote` | Single or batch stock quotes (partial failure safe) |
| `/api/stocks/search` | Symbol search with autocomplete |
| `/api/stocks/historical` | OHLCV price history |
| `/api/stocks/profile` | Company profile |
| `/api/stocks/logo` | Stock logo image proxy with 30-day browser caching |
| `/api/news` | General or company-specific news |
| `/api/earnings` | Earnings calendar by date range |

## Getting started

### Prerequisites

- Node.js 20+
- pnpm 10+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for migrations)
- A [Finnhub](https://finnhub.io/register) API key (free tier)
- A [Supabase](https://supabase.com) project

### Setup

```bash
git clone <repo-url> && cd alpha-stocks
pnpm install
cp .env.example .env.local   # fill in your keys
```

### Environment variables

```
FINNHUB_API_KEY                        Finnhub free tier key
NEXT_PUBLIC_SUPABASE_URL               Supabase project URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY   Supabase publishable key
```

### Development

```bash
pnpm dev:web        # Web app at localhost:3000
pnpm dev:mobile     # Expo dev server (Android)
pnpm build          # Build all packages
pnpm lint           # Lint all packages
pnpm typecheck      # TypeScript check all packages
pnpm format         # Prettier format
```

### Database

Link and push migrations using the Supabase CLI:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

Migrations:
- `20240101000000_initial_schema.sql` — watchlists, portfolios, transactions tables with RLS
- `20260329000000_watchlist_item_sort_order.sql` — drag & drop ordering for watchlist items
- `20260329010000_portfolio_sort_order.sql` — drag & drop ordering for portfolios

## Deployment

### Web (Google Cloud Run)

The web app ships as a standalone Next.js build in a multi-stage Docker image. Cloud Build handles build, push, and deploy:

```bash
gcloud builds submit --config=cloudbuild.yaml \
  --substitutions=_NEXT_PUBLIC_SUPABASE_URL=...,_NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

Set `FINNHUB_API_KEY` as a runtime environment variable on the Cloud Run service.

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
| Market data | yahoo-finance2, Finnhub |
| Build | Turborepo, pnpm workspaces |
| Deploy | Google Cloud Run, EAS Build |
| Language | TypeScript 5.6 (strict) |
