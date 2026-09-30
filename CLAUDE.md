# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Travel Planner — a full-stack web app for creating and managing travel itineraries, leveraging Google Maps API. Monorepo with a Next.js frontend, Hono backend, and a shared types package.

## Commands

### Root (both projects)
```bash
npm run lint          # Lint frontend + backend
npm run format:check  # Format check both
npm run typecheck     # Type check both
```


### Local Environment
```bash
make up       # docker-compose up -d (starts dev-db on 5432, test-db on 5433)
make down     # docker-compose down -v
make restart  # Full restart
```

## Architecture

```
/
├── backend/src/
│   ├── controllers/   # Business logic handlers
│   ├── routes/        # Hono route definitions with Zod OpenAPI validation
│   ├── models/        # Database schema types
│   ├── services/      # Business services
│   ├── db/            # Drizzle ORM setup (schema.ts, index.ts)
│   ├── middleware/     # Clerk auth middleware (requireAuth, optionalAuth)
│   ├── constants/     # App-wide limits
│   └── tests/         # Vitest spec files (*.spec.ts)
├── frontend/src/
│   ├── app/           # Next.js App Router pages
│   ├── components/    # React components
│   ├── hooks/         # Custom hooks (SWR data fetching)
│   ├── store/         # Zustand global state
│   ├── types/         # Frontend-only types (basic usage shared-types, but if extend types, create type extend shared-type or new types)
│   ├── models/        # Frontend type definitions (try not create or use this..., use shared_type)
│   ├── lib/           # Utilities
│   └── tests/         # Vitest + React Testing Library tests
├── packages/shared-types/src/index.ts  # Zod schemas shared by frontend & backend
└── docs/              # Design docs, requirements, test plans (Japanese)
```

### Key Architectural Decisions

**Database**: PostgreSQL with Drizzle ORM. Local dev uses Docker (`docker-compose up`). Production uses Neon Serverless. Different drizzle config files per environment (`drizzle.config.ts`, `drizzle-staging.config.ts`, `drizzle-production.config.ts`, `drizzle-test.config.ts`).

**Auth**: Clerk handles authentication. Backend uses `requireAuth`/`optionalAuth` middleware. Frontend integrates via Next Auth 5 (beta).

**Type sharing**: API types are defined in `packages/shared-types` (Zod schemas). Frontend-specific types go in `frontend/src/types/`. Component-local types stay in the component file without `export`.

**State**: Zustand for global client state; SWR for server state/caching. Minimize `use client`, `useEffect`, `useState` — prefer RSC and Next.js SSR.

**Backend deployment**: Hono runs on Node.js locally and can deploy to Cloudflare Workers (`wrangler.toml`).

## コミュニケーション
- 日本語で応答する（コード・変数名は英語）
- 簡潔に回答し、自明な説明は省略する
- 簡易的な修正であっても、先に実装計画書(md形式)を作成して、レビューをもらってから実装に移ること


## Documentation & Planning

- Requirements docs: `docs/tasks/<number>_<name>.md`
- Test plans: `docs/test/<number>_<name>.md`
- Design references: `docs/pages/` — always check here before implementation
- Do not implement features not covered in design docs; flag gaps and confirm first
- Implementation plans must reference specific files and components (no abstract descriptions)
