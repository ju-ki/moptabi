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

### Backend (`cd backend`, uses Bun)
```bash
bun run dev           # Dev server on port 8787
bun run test          # Run all tests
bun run test <file>   # Run a single test file (e.g. bun run test trip.service.spec.ts)
bun run test:coverage
bun run lint
bun run typecheck
bun run db:generate   # Generate Drizzle migrations
bun run db:push       # Apply schema to dev DB
bun run db:studio     # Drizzle Studio UI
bun run db:push:test  # Apply schema to test DB
bun run db:reset:test # Reset test DB
```

### Frontend (`cd frontend`, uses pnpm)
```bash
pnpm run dev          # Dev server on port 3000
pnpm run test         # Run all tests
pnpm run test -- <file>  # Run a single test file
pnpm run test:watch
pnpm run test:coverage
pnpm run lint
pnpm run typecheck
pnpm run build
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

## Testing Guidelines

**Backend tests** (`backend/src/tests/*.spec.ts`):
- Test schema/model first, then API responses
- Use `describe('GET /api/path')` naming for API tests
- Base assertions on types defined in `models/`
- Run `bun run test` before finishing any task

**Frontend tests** (`frontend/src/tests/`):
- Use Vitest + React Testing Library
- Write `describe`/`it` labels in Japanese
- Avoid mocks where possible; if needed, leave a comment explaining why
- Use `data-testid` attributes when element selection is otherwise difficult
- Do not refactor source files during testing — leave a comment instead

**Always run type check as final step**: `bun run typecheck` (backend) or `pnpm run typecheck` (frontend).

## Documentation & Planning

- Requirements docs: `docs/tasks/<number>_<name>.md`
- Test plans: `docs/test/<number>_<name>.md`
- Design references: `docs/pages/` — always check here before implementation
- Do not implement features not covered in design docs; flag gaps and confirm first
- Implementation plans must reference specific files and components (no abstract descriptions)
