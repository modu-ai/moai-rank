# MoAI Rank - Project Structure

## Monorepo Layout

MoAI Rank uses a Turborepo monorepo with Bun as the package manager. The repository is organized into two workspaces: `apps/` for deployable applications and `packages/` for shared libraries.

```
moai-rank/
├── apps/
│   └── web/                          # Next.js 16.1 application
│       ├── src/
│       │   ├── app/                  # Next.js App Router
│       │   │   ├── [locale]/         # i18n page routes
│       │   │   │   ├── page.tsx                      # Home / leaderboard page
│       │   │   │   ├── dashboard/
│       │   │   │   │   ├── page.tsx                  # User dashboard
│       │   │   │   │   └── settings/page.tsx         # Account settings
│       │   │   │   ├── users/[username]/page.tsx      # Public user profile
│       │   │   │   ├── sign-in/[[...sign-in]]/page.tsx  # Clerk sign-in
│       │   │   │   └── sign-up/[[...sign-up]]/page.tsx  # Clerk sign-up
│       │   │   └── api/              # REST API endpoints (17 routes)
│       │   │       ├── v1/
│       │   │       │   ├── sessions/
│       │   │       │   │   ├── route.ts              # POST: submit session
│       │   │       │   │   └── batch/route.ts        # POST: batch submit
│       │   │       │   ├── rank/route.ts             # GET: ranking data
│       │   │       │   ├── status/route.ts           # GET: API health check
│       │   │       │   └── verify/route.ts           # POST: verify API key
│       │   │       ├── auth/
│       │   │       │   └── cli/
│       │   │       │       ├── route.ts              # POST: CLI auth initiation
│       │   │       │       └── callback/route.ts     # GET: CLI auth callback
│       │   │       ├── me/
│       │   │       │   ├── route.ts                  # GET: current user info
│       │   │       │   ├── stats/route.ts            # GET: personal stats
│       │   │       │   ├── settings/route.ts         # PATCH: update settings
│       │   │       │   ├── regenerate-key/route.ts   # POST: regenerate API key
│       │   │       │   └── revoke-key/route.ts       # POST: revoke API key
│       │   │       ├── leaderboard/route.ts          # GET: leaderboard data
│       │   │       ├── users/[username]/route.ts     # GET: public user data
│       │   │       ├── stats/global/route.ts         # GET: global statistics
│       │   │       └── cron/
│       │   │           ├── calculate-rankings/route.ts  # Cron: ranking calc
│       │   │           └── cleanup-data/route.ts        # Cron: data cleanup
│       │   ├── components/           # React components
│       │   │   ├── dashboard/        # Dashboard widgets
│       │   │   │   ├── index.ts
│       │   │   │   ├── stats-overview.tsx       # Stats summary cards
│       │   │   │   ├── token-chart.tsx          # Token usage chart
│       │   │   │   ├── api-key-card.tsx         # API key management
│       │   │   │   └── privacy-toggle.tsx       # Privacy mode toggle
│       │   │   ├── leaderboard/      # Leaderboard display
│       │   │   │   ├── index.ts
│       │   │   │   ├── ranking-table.tsx        # Rankings data table
│       │   │   │   ├── period-filter.tsx        # Period selection tabs
│       │   │   │   ├── pagination.tsx           # Pagination controls
│       │   │   │   └── leaderboard-skeleton.tsx # Loading skeleton
│       │   │   ├── profile/          # User profile components
│       │   │   │   ├── activity-heatmap.tsx     # Contribution calendar
│       │   │   │   ├── token-breakdown.tsx      # Token category analysis
│       │   │   │   ├── tool-usage-chart.tsx     # Tool distribution
│       │   │   │   ├── model-usage-chart.tsx    # Model distribution
│       │   │   │   ├── hourly-activity-chart.tsx   # Hourly patterns
│       │   │   │   ├── day-of-week-chart.tsx    # Weekly patterns
│       │   │   │   ├── code-productivity-chart.tsx # Code metrics
│       │   │   │   ├── streak-card.tsx          # Activity streaks
│       │   │   │   └── vibe-style-card.tsx      # Coding style card
│       │   │   ├── layout/           # Navigation and chrome
│       │   │   │   ├── index.ts
│       │   │   │   ├── header.tsx               # Site header
│       │   │   │   ├── footer.tsx               # Site footer
│       │   │   │   ├── theme-toggle.tsx         # Dark/light toggle
│       │   │   │   ├── language-selector.tsx    # i18n language picker
│       │   │   │   └── github-button.tsx        # GitHub link
│       │   │   ├── providers/
│       │   │   │   └── theme-provider.tsx       # next-themes provider
│       │   │   └── ui/               # Radix UI component wrappers
│       │   │       ├── avatar.tsx
│       │   │       ├── badge.tsx
│       │   │       ├── button.tsx
│       │   │       ├── card.tsx
│       │   │       ├── dialog.tsx
│       │   │       ├── dropdown-menu.tsx
│       │   │       ├── select.tsx
│       │   │       ├── skeleton.tsx
│       │   │       ├── switch.tsx
│       │   │       ├── table.tsx
│       │   │       ├── tabs.tsx
│       │   │       └── tooltip.tsx
│       │   ├── db/                   # Database layer (Drizzle ORM)
│       │   │   ├── schema.ts         # Table definitions (6 tables)
│       │   │   ├── index.ts          # Database connection and exports
│       │   │   ├── rls.ts            # Row-level security policies
│       │   │   └── seed.ts           # Database seeding script
│       │   ├── lib/                  # Core utilities
│       │   │   ├── auth.ts           # API key generation, HMAC verification
│       │   │   ├── cache.ts          # Redis cache-aside layer
│       │   │   ├── rate-limiter.ts   # Upstash rate limiting
│       │   │   ├── score.ts          # Composite scoring algorithm
│       │   │   ├── date-utils.ts     # Period start/end calculations
│       │   │   ├── date-utils.test.ts  # Date utility tests
│       │   │   ├── audit.ts          # Security audit logging
│       │   │   ├── api-response.ts   # Standardized API responses
│       │   │   └── utils.ts          # General utilities (cn, etc.)
│       │   ├── cache/                # Cache configuration
│       │   ├── i18n/                 # i18n configuration
│       │   └── middleware.ts         # Request middleware (Clerk, i18n)
│       ├── public/                   # Static assets
│       ├── messages/                 # Translation files
│       │   ├── ko.json              # Korean translations
│       │   ├── en.json              # English translations
│       │   ├── ja.json              # Japanese translations
│       │   └── zh.json              # Chinese translations
│       ├── drizzle/                  # Database migrations
│       │   ├── 0000_jittery_lightspeed.sql      # Initial schema
│       │   ├── migrations/
│       │   │   ├── 0001_add_row_level_security.sql
│       │   │   ├── 0002_schema_improvements.sql
│       │   │   └── 0003_enable_uuid_v7.sql
│       │   └── meta/                 # Drizzle migration metadata
│       └── scripts/
│           └── backfill-rankings.ts  # Backfill historical rankings
├── packages/
│   └── shared/                       # Shared TypeScript library
│       └── src/
│           ├── index.ts              # Package entry point
│           ├── schemas/              # Zod validation schemas
│           │   ├── index.ts
│           │   ├── api.ts            # API request/response schemas
│           │   ├── user.ts           # User data schemas
│           │   ├── token.ts          # Token usage schemas
│           │   └── ranking.ts        # Ranking data schemas
│           └── types/                # TypeScript type definitions
│               ├── index.ts
│               ├── user.ts           # User type interfaces
│               ├── token.ts          # Token type interfaces
│               └── ranking.ts        # Ranking type interfaces
├── turbo.json                        # Monorepo build orchestration
├── biome.json                        # Linter and formatter config
├── vercel.json                       # Deployment configuration
└── package.json                      # Root workspace config
```

## Module Organization

### API Layer (`apps/web/src/app/api/`)

The API is organized into four groups:

| Group         | Path Prefix         | Purpose                                       |
|---------------|---------------------|-----------------------------------------------|
| **v1**        | `/api/v1/`          | Public API for CLI session submission and data |
| **auth**      | `/api/auth/`        | CLI authentication flow (OAuth via browser)    |
| **me**        | `/api/me/`          | Authenticated user operations (Clerk session)  |
| **internal**  | `/api/cron/`, etc.  | Cron jobs, leaderboard queries, global stats   |

The v1 API uses HMAC-SHA256 authentication via request headers. The `me` endpoints use Clerk session authentication. Cron endpoints are secured by Vercel's cron secret.

### Business Logic (`apps/web/src/lib/`)

Core business logic is in standalone utility modules:

| Module           | Responsibility                                          |
|------------------|---------------------------------------------------------|
| `auth.ts`        | API key lifecycle, HMAC signature verification          |
| `score.ts`       | Composite score calculation with weighted components    |
| `cache.ts`       | Redis cache-aside pattern with graceful fallback        |
| `rate-limiter.ts`| Per-user rate limiting via Upstash                      |
| `date-utils.ts`  | Period boundary calculations (daily, weekly, monthly)   |
| `audit.ts`       | Security event logging to database                      |
| `api-response.ts`| Standardized JSON response formatting                   |

### Data Layer (`apps/web/src/db/`)

The database layer uses Drizzle ORM with PostgreSQL and consists of 6 core tables:

| Table                | Purpose                                              |
|----------------------|------------------------------------------------------|
| `users`              | User accounts linked to Clerk/GitHub OAuth           |
| `sessions`           | Claude Code session records with metrics             |
| `token_usage`        | Per-session token consumption breakdown              |
| `daily_aggregates`   | Pre-computed daily statistics for fast queries        |
| `rankings`           | Computed rankings by period (daily/weekly/monthly/all)|
| `security_audit_log` | Security event audit trail                           |

Migrations are managed by Drizzle Kit and stored in `apps/web/drizzle/`.

### Frontend (`apps/web/src/components/`)

Components are organized by feature domain:

| Directory       | Purpose                                       | Component Count |
|-----------------|-----------------------------------------------|-----------------|
| `dashboard/`    | Personal dashboard widgets and stats           | 4               |
| `leaderboard/`  | Public leaderboard display and filtering       | 4               |
| `profile/`      | User profile analytics and visualizations      | 9               |
| `layout/`       | Site chrome (header, footer, navigation)       | 5               |
| `providers/`    | React context providers                        | 1               |
| `ui/`           | Radix UI primitive wrappers                    | 12              |

### Shared Library (`packages/shared/`)

The shared package provides type-safe contracts between the CLI client and the web application:

- **Schemas** (`src/schemas/`): Zod validation schemas for API requests and responses, ensuring runtime type safety at API boundaries.
- **Types** (`src/types/`): TypeScript interfaces and type definitions shared between packages.

## Key File Locations

| File                          | Purpose                                       |
|-------------------------------|-----------------------------------------------|
| `turbo.json`                  | Turborepo pipeline configuration              |
| `biome.json`                  | Biome linter/formatter rules                  |
| `vercel.json`                 | Vercel deployment, cron jobs, region config    |
| `apps/web/src/middleware.ts`  | Clerk auth + i18n middleware chain             |
| `apps/web/src/db/schema.ts`  | Complete database schema definition            |
| `apps/web/src/lib/score.ts`  | Composite scoring algorithm                    |
| `apps/web/src/lib/auth.ts`   | HMAC authentication implementation             |
| `apps/web/messages/*.json`   | Translation files for 4 languages              |
