# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Description

Alpha Stocks — personal portfolio tracker and stock analyzer with web (Next.js) and Android (Expo/React Native) apps sharing a TypeScript monorepo.

## Commands

```bash
pnpm dev:web        # Start web dev server (localhost:3000)
pnpm dev:mobile     # Start Expo dev server
pnpm build          # Build all packages
pnpm lint           # Lint all packages
pnpm typecheck      # TypeScript check all packages (via turbo)
pnpm format         # Prettier format all files
```

## Architecture

TypeScript monorepo using pnpm workspaces + Turborepo.

```
apps/web/            Next.js 16 (App Router, Turbopack, Tailwind CSS v4)
apps/mobile/         Expo SDK 55 (Expo Router, React Native)
packages/core/       Shared types, API client, hooks, providers, calculations
```

### Data flow

- **Market data** (quotes, charts, search, news, earnings): Both apps call Next.js API routes (`/api/stocks/*`, `/api/news`, `/api/earnings`) which proxy to yahoo-finance2 (primary, server-only) and Finnhub (secondary/fallback, also used for news + earnings).
- **User data** (watchlists, portfolios, transactions): Stored in Supabase Postgres, accessed via Supabase JS client from `packages/core`. Auth via Google SSO through Supabase Auth.
- The mobile app depends on the Next.js server running for market data (both in dev and prod).

### Key shared code in packages/core

- `src/types/` — Stock, Portfolio, Watchlist, Earnings, News types
- `src/providers/` — IStockProvider/IMarketDataProvider interfaces, yahoo-provider (server-only), finnhub-provider, provider-registry with fallback chain
- `src/hooks/` — TanStack Query hooks for market data + Supabase CRUD hooks for watchlists/portfolios + auth hooks
- `src/calculations/` — Portfolio metrics (positions, realized/unrealized gains, ROI), formatting helpers
- `src/api/` — Typed fetch client pointing to Next.js API routes
- `src/supabase/` — Supabase client factory + query functions for watchlists and portfolios

### Provider architecture

Providers in `packages/core/src/providers/` are **server-only** — they use yahoo-finance2 which requires Node.js. They are imported exclusively in `apps/web/app/api/` route handlers. Client code (hooks, components) never imports providers directly; they use the API client which calls the Next.js routes via fetch.

## Environment Variables

```
FINNHUB_API_KEY              — Finnhub free tier key (required for news/earnings)
NEXT_PUBLIC_SUPABASE_URL     — Supabase project URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY — Supabase publishable key
```
