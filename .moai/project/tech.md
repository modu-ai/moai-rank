# MoAI Rank - Technology Stack

## Runtime and Build

| Technology     | Version | Purpose                                 |
|----------------|---------|-----------------------------------------|
| Bun            | 1.3.5   | Package manager and JavaScript runtime  |
| Turborepo      | 2.3.3   | Monorepo build orchestration            |
| TypeScript     | 5.7.3+  | Type-safe development (strict mode)     |

Bun serves as both the package manager (replacing npm/yarn) and the script runner for development tasks. Turborepo manages the build pipeline across the `apps/web` and `packages/shared` workspaces, with task dependencies defined in `turbo.json`. Global environment variables (database, Clerk, Redis credentials) are declared in the Turborepo configuration.

## Framework

| Technology     | Version | Purpose                                 |
|----------------|---------|-----------------------------------------|
| Next.js        | 16.1.1  | Full-stack React framework (App Router) |
| React          | 19.2.3  | UI component library                    |

The application uses Next.js App Router with Turbopack for development builds (`next dev --turbopack`). Pages are organized under `[locale]/` for internationalized routing. API routes use Next.js Route Handlers for the REST API.

## UI

| Technology       | Version | Purpose                                |
|------------------|---------|----------------------------------------|
| Tailwind CSS     | 4       | Utility-first CSS framework            |
| Radix UI         | Various | Accessible component primitives        |
| Recharts         | 3.6.0   | Data visualization charts              |
| Lucide React     | 0.562.0 | Icon library                           |
| HugeIcons React  | 0.3.0   | Additional icon set                    |
| next-themes      | 0.4.6   | Dark/light mode theming                |
| class-variance-authority | 0.7.1 | Component variant management    |
| tailwind-merge   | 3.4.0   | Tailwind class deduplication           |
| clsx             | 2.1.1   | Conditional class composition          |

Radix UI provides the accessible primitives for 12 UI components: Avatar, Badge, Button, Card, Dialog, Dropdown Menu, Select, Skeleton, Switch, Table, Tabs, and Tooltip. Recharts powers all data visualization including token charts, activity heatmaps, tool usage distributions, and productivity charts.

## Database

| Technology             | Version | Purpose                             |
|------------------------|---------|-------------------------------------|
| PostgreSQL             | -       | Primary database (via Neon)         |
| Neon                   | 1.0.2   | Serverless PostgreSQL with pooling  |
| Drizzle ORM            | 0.45.1  | Type-safe SQL query builder         |
| Drizzle Kit            | 0.31.8  | Migration management tool           |

### Database Schema

The database consists of 6 core tables:

| Table                  | Purpose                                         |
|------------------------|-------------------------------------------------|
| `users`                | User accounts with Clerk/GitHub OAuth linkage, API key hashes, privacy settings |
| `sessions`             | Claude Code session records with tool usage (JSONB), code metrics (JSONB), model usage details (JSONB) |
| `token_usage`          | Per-session token breakdown: input, output, cache creation, cache read tokens |
| `daily_aggregates`     | Pre-computed daily statistics for efficient leaderboard queries |
| `rankings`             | Computed rankings by period type (daily, weekly, monthly, all_time) |
| `security_audit_log`   | Security event audit trail with IP, user agent, and event details |

Neon provides serverless PostgreSQL with both direct and connection pooler endpoints. Row-level security policies are applied via migration scripts. UUID v7 is enabled for time-ordered primary keys.

## Authentication

| Technology     | Version | Purpose                                 |
|----------------|---------|-----------------------------------------|
| Clerk          | 6.36.7  | User authentication (GitHub OAuth)      |
| HMAC-SHA256    | Native  | API key authentication for CLI          |

Two authentication mechanisms operate in parallel:

- **Web Application**: Clerk handles GitHub OAuth sign-in/sign-up with session management via middleware.
- **CLI API (v1)**: HMAC-SHA256 signature verification using three headers (`X-API-Key`, `X-Timestamp`, `X-Signature`). API keys follow the format `moai_rank_{prefix}_{secret}`, where only the SHA-256 hash is stored in the database. Signatures are verified with constant-time comparison to prevent timing attacks. Request timestamps are validated within a 5-minute window.

## Caching

| Technology       | Version | Purpose                               |
|------------------|---------|---------------------------------------|
| Upstash Redis    | 1.34.3  | Distributed cache (REST-based)        |
| @upstash/ratelimit | 2.0.5 | Token bucket rate limiting            |

The cache layer implements a cache-aside pattern with graceful degradation. When Redis is unavailable, the application falls back to direct database queries. Features include type-safe get/set operations, pattern-based cache invalidation, and automatic TTL management. Rate limiting is configured at 100 requests per minute per user.

## Internationalization

| Technology     | Version | Purpose                                 |
|----------------|---------|-----------------------------------------|
| next-intl      | 4.7.0   | Internationalization framework          |

Supported languages:

| Code | Language |
|------|----------|
| ko   | Korean   |
| en   | English  |
| ja   | Japanese |
| zh   | Chinese  |

Translation files are stored in `apps/web/messages/` as JSON files. Locale routing uses the `[locale]` dynamic segment in the App Router. Language selection is persistent via the URL prefix.

## Validation and Code Quality

| Technology     | Version  | Purpose                                |
|----------------|----------|----------------------------------------|
| Zod            | 3.25.42  | Runtime schema validation              |
| Biome          | 2.3.10   | Linting and formatting                 |

Zod schemas in `packages/shared/src/schemas/` validate all API request and response payloads at runtime. The shared package exports both Zod schemas and TypeScript types to maintain a single source of truth.

Biome replaces ESLint and Prettier with a unified tool. Key configuration:

- Indent: 2 spaces
- Line width: 100 characters
- Quote style: single quotes
- Semicolons: always
- Trailing commas: ES5
- Strict rules: no unused imports (error), no unused variables (error), use const (error), use import type (error)

## Deployment

| Technology     | Purpose                                         |
|----------------|-------------------------------------------------|
| Vercel         | Application hosting (Seoul region, `icn1`)      |
| Neon           | Managed PostgreSQL (direct + pooler connections) |
| Upstash Redis  | Managed Redis (REST API)                        |

### Vercel Configuration

- Framework: Next.js (auto-detected)
- Build command: `bun run build --filter=@moai-rank/web`
- Install command: `bun install`
- Output directory: `apps/web/.next`
- Region: `icn1` (Seoul, South Korea)
- API headers: `Cache-Control: no-store, max-age=0` for all API routes

### Cron Jobs

| Schedule       | Endpoint                           | Purpose                           |
|----------------|------------------------------------|-----------------------------------|
| `0 0 * * *`   | `/api/cron/calculate-rankings`     | Compute daily/weekly/monthly/all-time rankings at midnight UTC |
| `0 2 * * *`   | `/api/cron/cleanup-data`           | Clean up expired data at 2 AM UTC |

## Security

### Authentication Security

- **API Key Storage**: Only SHA-256 hashes are stored in the database; plaintext keys are shown once at generation time.
- **HMAC Signatures**: Request bodies are signed with `HMAC-SHA256(apiKey, timestamp + ":" + body)` and verified server-side.
- **Timing Attack Prevention**: Constant-time string comparison using `crypto.timingSafeEqual` with length-padding to prevent length oracle attacks.
- **Timestamp Validation**: Requests older than 5 minutes are rejected to prevent replay attacks.

### Data Integrity

- **Session Deduplication**: Server-side session hashes computed from `userId + userSalt + sessionData` prevent duplicate session submissions.
- **Anomaly Detection**: Sessions with token counts exceeding 10x the user's average are flagged for review.
- **Per-User Salt**: Each user has a unique salt for session hash computation.

### Rate Limiting and Access Control

- **Rate Limiting**: 100 requests per minute per user via Upstash Redis token bucket.
- **Row-Level Security**: PostgreSQL RLS policies restrict data access at the database level.
- **Audit Logging**: Security events (key generation, key revocation, authentication failures) are logged with IP address, user agent, and event details.

## Environment Variables

| Variable                            | Purpose                              |
|-------------------------------------|--------------------------------------|
| `DATABASE_URL`                      | Neon PostgreSQL connection string    |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk frontend authentication key    |
| `CLERK_SECRET_KEY`                  | Clerk backend authentication key     |
| `NEXT_PUBLIC_APP_URL`               | Application base URL                 |
| `KV_REST_API_URL`                   | Vercel KV / Upstash Redis URL        |
| `KV_REST_API_TOKEN`                 | Vercel KV / Upstash Redis token      |
| `UPSTASH_REDIS_REST_URL`            | Upstash Redis URL (fallback)         |
| `UPSTASH_REDIS_REST_TOKEN`          | Upstash Redis token (fallback)       |
