# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Description

Alpha Stocks — personal portfolio tracker and stock market analyzer with web (Next.js) and Android (Expo/React Native) apps sharing a TypeScript monorepo. Real-time quotes, interactive charts, portfolio P&L, watchlists with drag & drop, market indices, CSV import, news from multiple sources, earnings calendar, analyst recommendations, and 10-year financial statements.

## Commands

```bash
pnpm dev:web        # Start web dev server (localhost:3000)
pnpm dev:mobile     # Start Expo dev server
pnpm build          # Build all packages
pnpm lint           # Lint all packages
pnpm typecheck      # TypeScript check all packages (via turbo)
pnpm test           # Run all tests (vitest, via turbo)
pnpm format         # Prettier format all files
```

## Architecture

TypeScript monorepo using pnpm workspaces + Turborepo.

```
apps/web/            Next.js 16 (App Router, Turbopack, Tailwind CSS v4, React 19)
apps/mobile/         Expo SDK 55 (Expo Router, React Native 0.83, New Architecture)
packages/core/       Shared types, API client, hooks, providers, calculations
supabase/            Database migrations (Postgres with RLS)
.github/workflows/   CI pipeline (typecheck + test on push)
```

### Data flow

- **Market data** (quotes, charts, search, news, earnings, logos): Both apps call Next.js API routes (`/api/stocks/*`, `/api/news`, `/api/earnings`) which proxy to yahoo-finance2 (primary, server-only), Finnhub (secondary/fallback for news + earnings + logos), and Alpha Vantage (10-year financial statements). Batch quotes use `Promise.allSettled` for partial failure resilience.
- **News**: Dual-source from Finnhub + Yahoo Finance, merged with headline deduplication, filtered by symbol relevance, cached server-side for 10 minutes.
- **Financial data**: Alpha Vantage provides 10+ years of annual income statements and 12 quarters of earnings. Cached in Supabase (`api_cache` table) for 7 days with smart cache invalidation (rate-limited responses are not cached).
- **User data** (watchlists, portfolios, transactions): Stored in Supabase Postgres, accessed via Supabase JS client from `packages/core`. Auth via Google SSO through Supabase Auth. Row Level Security enforces per-user data isolation.
- **Logo proxy**: `/api/stocks/logo?symbol=X&proxy=1` fetches logo from Finnhub profile2, serves image bytes with 30-day cache headers. Server-side in-memory cache avoids repeated Finnhub calls.
- The mobile app depends on the Next.js server running for market data (both in dev and prod).

### Key shared code in packages/core

- `src/types/` — Stock (with analyst data, 52w range), Portfolio (with sort_order), Watchlist (with sort_order), Earnings, News, Financials types
- `src/providers/` — IStockProvider/IMarketDataProvider interfaces, yahoo-provider (server-only, includes quote + financialData for analyst targets), finnhub-provider, provider-registry with fallback chain
- `src/hooks/` — TanStack Query hooks (`useQueries`-based batch hooks for stable hook counts) for market data + Supabase CRUD hooks for watchlists/portfolios + auth hooks + reorder mutations + bulk transaction import
- `src/calculations/` — Portfolio metrics (positions, realized/unrealized gains, ROI, dividends), formatting helpers
- `src/api/` — Typed fetch client pointing to Next.js API routes (includes logo endpoint)
- `src/supabase/` — Supabase client factory + query functions for watchlists and portfolios (including reorder, rename, and bulk insert)

### Provider architecture

Providers in `packages/core/src/providers/` are **server-only** — they use yahoo-finance2 which requires Node.js. They are imported exclusively in `apps/web/app/api/` route handlers. Client code (hooks, components) never imports providers directly; they use the API client which calls the Next.js routes via fetch.

### API routes (apps/web/app/api/)

- `/api/stocks/quote` — single or batch stock quotes with analyst data (uses Promise.allSettled for partial failures)
- `/api/stocks/search` — symbol search with autocomplete
- `/api/stocks/historical` — OHLCV price history (supports ALL range)
- `/api/stocks/profile` — company profile
- `/api/stocks/financials` — 10-year annual financials + 12 quarterly earnings (Alpha Vantage + Yahoo, cached in Supabase)
- `/api/stocks/logo` — logo image proxy with server-side caching + 30-day browser cache
- `/api/news` — dual-source news (Finnhub + Yahoo) with deduplication, relevance filtering, and 10-min server cache
- `/api/earnings` — earnings calendar by date range

### Caching strategy

- **Financials** (`api_cache` table in Supabase): 7-day TTL, smart invalidation (won't cache rate-limited responses with <5 entries)
- **News** (server-side in-memory): 10-minute TTL per symbol
- **Logos** (server-side in-memory + browser): in-memory URL cache + 30-day browser cache headers
- **Client-side** (TanStack Query): 30s staleTime globally, 5min for news, 5min for historical prices

### UI libraries (web only)

- `@dnd-kit/core` + `@dnd-kit/sortable` — drag & drop reordering for watchlist items and portfolio cards
- `lightweight-charts` — stock price charts and portfolio value evolution chart

## Testing

78 tests across 3 packages using Vitest:

- **packages/core** (40 tests): formatCurrency, formatPercent, computePositions, computeRealizedGains, computePortfolioSummary
- **apps/web** (22 tests): API route tests for quote, search, historical, earnings, news (with mocked providers)
- **apps/mobile** (16 tests): market config, timeAgo utility, portfolio stats aggregation

CI runs on every push to main via GitHub Actions (`.github/workflows/ci.yml`).

## Deployment

### Web — Google Cloud Run

Multi-stage Dockerfile builds a standalone Next.js image. Cloud Build (`cloudbuild.yaml`) handles build, push, and deploy to `europe-west1`. Supabase public keys are passed as build args; `FINNHUB_API_KEY` and `ALPHA_VANTAGE_API_KEY` are runtime env vars on the Cloud Run service. Auth callback uses `x-forwarded-proto` + `host` headers for correct redirect behind Cloud Run proxy.

### Mobile — EAS Build

`eas.json` defines `preview` (APK) and `production` (AAB) profiles. The mobile app needs `API_BASE_URL` pointing to the deployed web server.

### Database migrations

Use Supabase CLI to push migrations:

```bash
supabase link --project-ref <ref>
supabase db push
```

Migration files use timestamp format (e.g., `20240101000000_initial_schema.sql`). Current tables: watchlists, watchlist_items, portfolios, transactions, api_cache.

## Environment Variables

```
FINNHUB_API_KEY              — Finnhub free tier key (required for news/earnings/logos)
ALPHA_VANTAGE_API_KEY        — Alpha Vantage free tier key (10yr financial statements, 25 req/day)
NEXT_PUBLIC_SUPABASE_URL     — Supabase project URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY — Supabase publishable key
```
