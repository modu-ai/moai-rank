# MoAI Rank - Claude Code Agent Leaderboard

![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?style=flat-square&logo=postgresql)
![Clerk](https://img.shields.io/badge/Auth-Clerk-6C47FF?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

A competitive leaderboard platform for tracking Claude Code token usage. Track your AI coding sessions, compare with the community, and discover your unique coding style through Vibe Coding Analytics.

[English](README.md) | [한국어](README.ko.md)

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Development](#development)
- [Deployment](#deployment)
- [Security](#security)

## Features

### Ranking System

- **Multi-Period Rankings**: Daily, Weekly, Monthly, and All-Time leaderboards
- **Composite Scoring**: Weighted algorithm considering multiple factors
  - Token Usage (40%): Total input + output tokens
  - Efficiency (25%): Output/input ratio optimization
  - Sessions (20%): Number of coding sessions
  - Streak (15%): Consecutive days of activity

### Vibe Coding Analytics

Discover your unique coding personality through AI-powered analysis:

- **Explorer**: Deep code navigation and system understanding
- **Creator**: Focused on building new features and code
- **Refactorer**: Excellence in improving existing code
- **Automator**: Task automation and workflow orchestration

### Dashboard Features

- Real-time token usage tracking
- Activity heatmap (GitHub-style)
- Model usage breakdown
- Hourly activity patterns
- Weekly coding patterns
- Tool usage statistics
- Privacy mode for anonymous participation

### Internationalization

Full support for 4 languages:

- English (en)
- Korean (ko)
- Japanese (ja)
- Chinese (zh)

## Architecture

```
apps/web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API Routes
│   │   │   ├── v1/            # Public CLI API (v1)
│   │   │   │   ├── sessions/  # Session recording
│   │   │   │   ├── rank/      # User ranking
│   │   │   │   ├── status/    # API health check
│   │   │   │   └── verify/    # API key verification
│   │   │   ├── me/            # User dashboard APIs
│   │   │   ├── leaderboard/   # Public leaderboard
│   │   │   ├── cron/          # Scheduled jobs
│   │   │   └── auth/          # CLI authentication
│   │   ├── dashboard/         # User dashboard pages
│   │   └── users/             # Public user profiles
│   ├── components/            # React components
│   │   ├── ui/               # Base UI components
│   │   ├── layout/           # Layout components
│   │   ├── leaderboard/      # Leaderboard components
│   │   ├── dashboard/        # Dashboard components
│   │   └── profile/          # Profile components
│   ├── db/                    # Database layer
│   │   ├── schema.ts         # Drizzle ORM schema
│   │   ├── index.ts          # Database connection
│   │   ├── rls.ts            # Row-level security
│   │   └── seed.ts           # Seed data script
│   ├── lib/                   # Utility functions
│   │   ├── auth.ts           # API key & HMAC auth
│   │   ├── audit.ts          # Security audit logging
│   │   ├── rate-limiter.ts   # Rate limiting
│   │   ├── score.ts          # Score calculations
│   │   └── api-response.ts   # Response helpers
│   └── i18n/                  # Internationalization
├── messages/                   # Translation files
└── drizzle/                   # Database migrations
```

### System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        CLI[Claude Code CLI]
        WEB[Web Dashboard]
    end

    subgraph "Application Layer"
        API[Next.js API Routes]
        AUTH[Clerk Auth]
        RATE[Rate Limiter]
    end

    subgraph "Data Layer"
        NEON[(Neon PostgreSQL)]
        REDIS[(Upstash Redis)]
    end

    subgraph "Infrastructure"
        VERCEL[Vercel Edge]
        CRON[Vercel Cron]
    end

    CLI -->|HMAC Auth| API
    WEB -->|Clerk Session| API
    API --> AUTH
    API --> RATE
    RATE --> REDIS
    API --> NEON
    CRON -->|Daily| API
    VERCEL --> API
```

## Tech Stack

| Category   | Technology        | Purpose                     |
| ---------- | ----------------- | --------------------------- |
| Framework  | Next.js 16        | Full-stack React framework  |
| Language   | TypeScript 5      | Type-safe development       |
| Database   | Neon (PostgreSQL) | Serverless PostgreSQL       |
| ORM        | Drizzle ORM       | Type-safe database queries  |
| Auth       | Clerk             | GitHub OAuth authentication |
| Cache      | Upstash Redis     | Distributed rate limiting   |
| UI         | Tailwind CSS 4    | Styling                     |
| Components | Radix UI          | Accessible UI primitives    |
| Charts     | Recharts          | Data visualization          |
| i18n       | next-intl         | Internationalization        |
| Validation | Zod               | Runtime type validation     |
| Analytics  | Vercel Analytics  | Usage analytics             |

## Getting Started

### Prerequisites

- **Node.js** 20.x or later
- **Bun** 1.x (recommended) or npm/yarn
- **PostgreSQL** (or Neon account)
- **Clerk** account for authentication
- **Upstash** account for Redis (optional but recommended)

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/your-org/moai-rank.git
cd moai-rank/apps/web
```

2. **Install dependencies**

```bash
bun install
```

3. **Set up environment variables**

```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

4. **Set up the database**

```bash
# Generate migrations
bun run db:generate

# Push schema to database
bun run db:push

# (Optional) Seed with sample data
bun run db:seed
```

5. **Start the development server**

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Environment Variables

### Required Variables

| Variable                            | Description                       | Example                                          |
| ----------------------------------- | --------------------------------- | ------------------------------------------------ |
| `DATABASE_URL`                      | Neon PostgreSQL connection string | `postgresql://user:pass@host/db?sslmode=require` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key                  | `pk_test_xxx`                                    |
| `CLERK_SECRET_KEY`                  | Clerk secret key                  | `sk_test_xxx`                                    |

### Optional Variables

| Variable            | Description                        | Default                |
| ------------------- | ---------------------------------- | ---------------------- |
| `KV_REST_API_URL`   | Upstash Redis URL                  | In-memory fallback     |
| `KV_REST_API_TOKEN` | Upstash Redis token                | In-memory fallback     |
| `CRON_SECRET`       | Secret for cron job authentication | Required in production |

### Alternative Variable Names

Upstash Redis also supports these variable names:

- `UPSTASH_REDIS_REST_URL` (alternative to `KV_REST_API_URL`)
- `UPSTASH_REDIS_REST_TOKEN` (alternative to `KV_REST_API_TOKEN`)

### Example .env.local

```env
# Database (Required)
DATABASE_URL="postgresql://neondb_owner:xxx@ep-xxx.aws.neon.tech/neondb?sslmode=require"

# Clerk Authentication (Required)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_xxx"
CLERK_SECRET_KEY="sk_test_xxx"

# Upstash Redis (Optional - for distributed rate limiting)
KV_REST_API_URL="https://xxx.upstash.io"
KV_REST_API_TOKEN="xxx"

# Cron Authentication (Required in production)
CRON_SECRET="your-secure-random-string"
```

## Database Schema

### Entity Relationship Diagram

```mermaid
erDiagram
    users ||--o{ sessions : has
    users ||--o{ token_usage : has
    users ||--o{ daily_aggregates : has
    users ||--o{ rankings : has
    users ||--o{ security_audit_log : logs

    users {
        uuid id PK
        varchar clerk_id UK
        varchar github_id UK
        varchar github_username
        text github_avatar_url
        varchar api_key_hash
        varchar api_key_prefix
        varchar user_salt
        boolean privacy_mode
        timestamp created_at
        timestamp updated_at
    }

    sessions {
        uuid id PK
        uuid user_id FK
        varchar server_session_hash UK
        varchar anonymous_project_id
        timestamp started_at
        timestamp ended_at
        integer duration_seconds
        varchar model_name
        integer turn_count
        jsonb tool_usage
        jsonb code_metrics
        jsonb model_usage_details
        timestamp created_at
    }

    token_usage {
        uuid id PK
        uuid session_id FK
        uuid user_id FK
        bigint input_tokens
        bigint output_tokens
        bigint cache_creation_tokens
        bigint cache_read_tokens
        timestamp recorded_at
    }

    daily_aggregates {
        uuid id PK
        uuid user_id FK
        date date
        bigint total_input_tokens
        bigint total_output_tokens
        bigint total_cache_tokens
        integer session_count
        decimal avg_efficiency
        decimal composite_score
    }

    rankings {
        uuid id PK
        uuid user_id FK
        varchar period_type
        date period_start
        integer rank_position
        bigint total_tokens
        decimal composite_score
        integer session_count
        decimal efficiency_score
        timestamp updated_at
    }

    security_audit_log {
        uuid id PK
        uuid user_id FK
        varchar event_type
        varchar ip_address
        text user_agent
        jsonb details
        timestamp created_at
    }
```

### Tables Overview

| Table                | Description                               |
| -------------------- | ----------------------------------------- |
| `users`              | User accounts linked to GitHub via Clerk  |
| `sessions`           | Claude Code session records with metadata |
| `token_usage`        | Detailed token consumption per session    |
| `daily_aggregates`   | Pre-computed daily statistics             |
| `rankings`           | Calculated rankings for each period       |
| `security_audit_log` | Security event audit trail                |

## API Reference

### API v1 (CLI Integration)

Base URL: `/api/v1`

#### Check API Status

```http
GET /api/v1/status
```

Response:

```json
{
  "status": "operational",
  "version": "1.0.0",
  "timestamp": "2025-01-11T00:00:00.000Z",
  "endpoints": {
    "sessions": "/api/v1/sessions",
    "rank": "/api/v1/rank",
    "status": "/api/v1/status"
  }
}
```

#### Verify API Key

```http
GET /api/v1/verify
X-API-Key: moai_rank_xxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Response:

```json
{
  "valid": true,
  "username": "developer",
  "apiKeyPrefix": "moai_rank_xxxxxxxx",
  "privacyMode": false,
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

#### Record Session

```http
POST /api/v1/sessions
Content-Type: application/json
X-API-Key: moai_rank_xxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
X-Timestamp: 1704067200
X-Signature: <HMAC-SHA256 signature>
```

Request Body:

```json
{
  "sessionHash": "<64-char hash>",
  "endedAt": "2025-01-11T12:00:00.000Z",
  "inputTokens": 50000,
  "outputTokens": 10000,
  "cacheCreationTokens": 5000,
  "cacheReadTokens": 20000,
  "modelName": "claude-sonnet-4-20250514",
  "anonymousProjectId": "proj_abc123"
}
```

Response:

```json
{
  "success": true,
  "sessionId": "uuid",
  "message": "Session recorded successfully"
}
```

#### Get User Rank

```http
GET /api/v1/rank
X-API-Key: moai_rank_xxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Response:

```json
{
  "username": "developer",
  "rankings": {
    "daily": {
      "position": 5,
      "compositeScore": 450.25,
      "totalParticipants": 100
    },
    "weekly": {
      "position": 12,
      "compositeScore": 380.5,
      "totalParticipants": 250
    },
    "monthly": null,
    "allTime": {
      "position": 8,
      "compositeScore": 520.75,
      "totalParticipants": 500
    }
  },
  "stats": {
    "totalTokens": 1500000,
    "totalSessions": 45,
    "inputTokens": 1200000,
    "outputTokens": 300000
  },
  "lastUpdated": "2025-01-11T00:00:00.000Z"
}
```

### Public API

#### Get Leaderboard

```http
GET /api/leaderboard?period=weekly&limit=50&offset=0
```

Query Parameters:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `period` | string | `weekly` | `daily`, `weekly`, `monthly`, `all_time` |
| `limit` | number | `50` | Results per page (1-100) |
| `offset` | number | `0` | Pagination offset |

Response:

```json
{
  "data": [
    {
      "rank": 1,
      "userId": "uuid",
      "username": "top_coder",
      "avatarUrl": "https://...",
      "totalTokens": 5000000,
      "compositeScore": 850.5,
      "sessionCount": 120,
      "efficiencyScore": 0.85,
      "isPrivate": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 500,
    "totalPages": 10,
    "hasMore": true
  }
}
```

### Authentication Headers

| Header        | Description                | Required          |
| ------------- | -------------------------- | ----------------- |
| `X-API-Key`   | API key for authentication | Yes               |
| `X-Timestamp` | Unix timestamp in seconds  | For POST requests |
| `X-Signature` | HMAC-SHA256 signature      | For POST requests |

### HMAC Signature Calculation

```
message = timestamp + ":" + request_body
signature = HMAC-SHA256(api_key, message)
```

The signature is verified with:

- Maximum timestamp age: 5 minutes
- Constant-time comparison to prevent timing attacks

## Development

### Available Scripts

```bash
# Development
bun run dev          # Start dev server with Turbopack

# Build
bun run build        # Production build
bun run start        # Start production server

# Database
bun run db:generate  # Generate Drizzle migrations
bun run db:migrate   # Run migrations
bun run db:push      # Push schema directly
bun run db:studio    # Open Drizzle Studio GUI
bun run db:seed      # Seed sample data

# Quality
bun run lint         # Run Biome linter
bun run lint:fix     # Fix lint issues
bun run format       # Format code
bun run type-check   # TypeScript type checking
```

### Code Style

This project uses **Biome** for linting and formatting:

```bash
# Check for issues
bun run lint

# Auto-fix issues
bun run lint:fix

# Format code
bun run format
```

### Testing Locally

1. **API Testing with curl**

```bash
# Check API status
curl http://localhost:3000/api/v1/status

# Verify API key
curl -H "X-API-Key: your_api_key" http://localhost:3000/api/v1/verify
```

2. **Database Studio**

```bash
bun run db:studio
```

Opens Drizzle Studio at [https://local.drizzle.studio](https://local.drizzle.studio)

## Deployment

### Vercel Deployment

1. **Connect Repository**
   - Import your repository to Vercel
   - Select the `apps/web` directory as the root

2. **Configure Environment Variables**
   - Add all required environment variables in Vercel dashboard
   - Link Neon database (Vercel Integration available)
   - Link Upstash Redis (Vercel Integration available)

3. **Configure Build Settings**

   ```
   Root Directory: apps/web
   Build Command: next build
   Output Directory: .next
   ```

4. **Cron Jobs**

The `vercel.json` configures automatic ranking calculations:

```json
{
  "crons": [
    {
      "path": "/api/cron/calculate-rankings",
      "schedule": "0 0 * * *"
    }
  ]
}
```

This runs daily at midnight UTC to recalculate all rankings.

### Region Configuration

By default, deployments target the Seoul region (`icn1`) for optimal performance in Asia:

```json
{
  "regions": ["icn1"]
}
```

Modify `vercel.json` to change the deployment region.

## Security

### Authentication

- **Web Dashboard**: Clerk OAuth (GitHub only)
- **CLI API**: API Key + HMAC-SHA256 signatures

### API Security Features

| Feature                  | Implementation                       |
| ------------------------ | ------------------------------------ |
| API Key Hashing          | SHA-256 (only hash stored)           |
| Request Signing          | HMAC-SHA256 with timestamp           |
| Rate Limiting            | 100 req/min (distributed via Redis)  |
| Timing Attack Prevention | Constant-time comparison             |
| Replay Attack Prevention | 5-minute timestamp tolerance         |
| Session Integrity        | Server-side hash verification        |
| Anomaly Detection        | 10x average token threshold flagging |
| Audit Logging            | All security events logged           |

### Rate Limits

| Endpoint Type        | Limit   | Window   |
| -------------------- | ------- | -------- |
| General API          | 100 req | 1 minute |
| Authentication       | 10 req  | 1 minute |
| Sensitive Operations | 30 req  | 1 minute |
| Public Read          | 200 req | 1 minute |

### Security Event Types

The audit log tracks these events:

- `api_key_generated` / `api_key_regenerated` / `api_key_revoked`
- `api_key_validated` / `api_key_invalid`
- `hmac_signature_invalid` / `hmac_timestamp_expired`
- `rate_limit_exceeded`
- `session_created` / `session_duplicate`
- `suspicious_activity`
- `privacy_mode_changed`

## Composite Score Algorithm

```
Score = (Token * 0.40) + (Efficiency * 0.25) + (Session * 0.20) + (Streak * 0.15)

Where:
- Token = min(1, log10(totalTokens + 1) / 10)
- Efficiency = min(outputTokens / inputTokens, 2) / 2
- Session = min(1, log10(sessions + 1) / 3)
- Streak = min(streak, 30) / 30

Final Score = WeightedSum * 1000
```

### Score Tiers

| Tier     | Score Range |
| -------- | ----------- |
| Diamond  | 800+        |
| Platinum | 600-799     |
| Gold     | 400-599     |
| Silver   | 200-399     |
| Bronze   | 0-199       |

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run linting: `bun run lint:fix`
5. Commit: `git commit -m 'feat: add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.

---

Built with Next.js 16, Clerk, and Neon.
