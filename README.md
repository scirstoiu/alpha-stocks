# Alpha Stocks

**Track your edge.** A personal portfolio tracker and stock market analyzer with real-time quotes, interactive charts, and cross-platform coverage — web and Android from one codebase.

## Features

- **Real-time quotes** — live prices, change, and percent change via Yahoo Finance + Finnhub fallback
- **Interactive charts** — historical price charts across 9 time ranges (1D to 5Y) using Lightweight Charts
- **Portfolio tracking** — multiple portfolios with buy/sell/dividend transactions, cost basis, realized and unrealized gains, daily P&L
- **Watchlists** — organize stocks into watchlists, see top movers at a glance
- **News feed** — general market news and company-specific headlines
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

- **Market data** — both apps call Next.js API routes (`/api/stocks/*`, `/api/news`, `/api/earnings`) which proxy to yahoo-finance2 (primary) and Finnhub (fallback + news/earnings). Providers are server-only (Node.js).
- **User data** — watchlists, portfolios, and transactions live in Supabase Postgres, accessed directly via the Supabase JS client. Row Level Security enforces per-user isolation.
- **Auth** — Google OAuth through Supabase Auth with server-side session management.

The mobile app depends on the Next.js server for market data, both in development and production.

### API routes

| Endpoint | Description |
|---|---|
| `/api/stocks/quote` | Single or batch stock quotes |
| `/api/stocks/search` | Symbol search with autocomplete |
| `/api/stocks/historical` | OHLCV price history |
| `/api/stocks/profile` | Company profile |
| `/api/news` | General or company-specific news |
| `/api/earnings` | Earnings calendar by date range |

## Getting started

### Prerequisites

- Node.js 20+
- pnpm 10+
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

Run the migration in `supabase/migrations/001_initial_schema.sql` against your Supabase project to create the `watchlists`, `watchlist_items`, `portfolios`, and `transactions` tables with RLS policies.

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
| Data fetching | TanStack Query 5 |
| Database | Supabase (Postgres + Auth) |
| Market data | yahoo-finance2, Finnhub |
| Build | Turborepo, pnpm workspaces |
| Deploy | Google Cloud Run, EAS Build |
| Language | TypeScript 5.6 (strict) |
