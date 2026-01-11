# MoAI Rank - Claude Code Agent Leaderboard

![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?style=flat-square&logo=postgresql)
![Clerk](https://img.shields.io/badge/Auth-Clerk-6C47FF?style=flat-square)
![License](https://img.shields.io/badge/License-Copyleft-green?style=flat-square)

A competitive leaderboard platform for tracking Claude Code token usage. Track your AI coding sessions, compete with the community, and discover your own coding style through Agentic Coding Analytics.

[English](README.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [中文](README.zh.md)

---

## 📚 Everyone's AI Agentic Coding Lecture

This project was created as a **lecture example demonstrating practical MoAI-ADK usage**.

### 🎯 Project Purpose

**Experience a new dimension of agentic coding!**

MoAI Rank was created for the following learning purposes:

- **Real-world AI Agent Orchestration**: A complete system built through collaboration of 20 specialized agents
- **SPEC-First TDD Realization**: Perfect quality process from specifications to tests
- **Scalable Architecture**: Production-ready code with caching, data retention policies, and performance optimizations
- **Open Source Contribution**: Releasing all code to contribute to community learning

### ⚠️ Development Environment

**48-Hour Hacking Project**

This project was intensively built using MoAI-ADK over 48 hours. A practical example demonstrating rapid development in real-world environments.

**Development Characteristics**:

- Core functionality implemented using MoAI-ADK's `/moai:alfred` `/moai:loop` fully autonomous automation commands
- Cost-effective development using GLM 4.7 and Claude Opus in hybrid
- Worktree parallel development for simultaneous development of independent functional modules

**Testing Insufficiency Notice**:

- Due to the 48-hour development, sufficient testing may not have been conducted
- If you find any errors or improvements, please leave them at [GitHub Issues](https://github.com/modu-ai/moai-rank/issues)
- Community contributions make the project more robust

### 🔗 Related Projects

- **[MoAI-ADK](https://github.com/modu-ai/moai-adk)**: AI Development Framework

---

## 🚀 Before You Start: Install MoAI-ADK

To use MoAI Rank, **MoAI-ADK** must be installed first.

### What is MoAI-ADK?

MoAI-ADK is an **AI development framework that creates quality code**.

- **SPEC-First TDD**: 90% rework reduction with clear specifications
- **AI Orchestration**: 20 specialized agents + 48 skills
- **Multi-language Support**: Automatic Korean/English/Japanese/Chinese support
- **Worktree Parallel Development**: Unlimited parallel work in completely isolated environments
- **MoAI Rank**: Motivation through vibe coding leaderboard

### Quick Installation

```bash
# Method 1: Quick Installation (Recommended)
curl -LsSf https://modu-ai.github.io/moai-adk/install.sh | sh

# Method 2: Manual Installation
# Step 1: Install uv (macOS/Linux)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Step 2: Install MoAI-ADK
uv tool install moai-adk
```

---

## 🎮 MoAI Rank CLI Commands

Once MoAI-ADK is installed, you can use the MoAI Rank CLI.

### Command Overview

```bash
moai rank [OPTIONS] COMMAND [ARGS]...

MoAI Rank - Claude Code Token Usage Leaderboard

Track your Claude Code sessions and compete on the leaderboard.
Web dashboard: https://rank.mo.ai.kr

Options:
  --help    Show help message

Commands:
  register   Register with MoAI Rank via GitHub OAuth
  status     Show current rank and statistics
  exclude    Exclude project from session tracking
  include    Re-include previously excluded project
  logout     Remove stored MoAI Rank credentials
```

### Detailed Command Explanations

#### 1. register - GitHub OAuth Registration

```bash
moai rank register
```

**How It Works**:

1. Opens browser for GitHub OAuth authentication
2. Automatically generates and stores API key after successful authentication
3. Installs global hook to start automatic session tracking
4. Securely stores API key in `~/.moai/rank/credentials.json`

**Execution Example**:

```bash
❯ moai rank register

╭──────────────────────────── Registration ────────────────────────────╮
│ MoAI Rank Registration                                               │
│                                                                      │
│ This will open your browser to authorize with GitHub.                │
│ After authorization, your API key will be stored securely.           │
╰──────────────────────────────────────────────────────────────────────╯

Opening browser for GitHub authorization...
Waiting for authorization (timeout: 5 minutes)...

╭───────────────────────── Registration Complete ──────────────────────╮
│ Successfully registered as your-github-id                            │
│                                                                      │
│ API Key: moai_rank_a9011fac_c...                                     │
│ Stored in: ~/.moai/rank/credentials.json                             │
╰──────────────────────────────────────────────────────────────────────╯

╭───────────────────────── Global Hook Installed ──────────────────────╮
│ Session tracking hook installed globally.                            │
│                                                                      │
│ Your Claude Code sessions will be automatically tracked.             │
│ Hook location: ~/.claude/hooks/moai/session_end__rank_submit.py      │
│                                                                      │
│ To exclude specific projects:                                        │
│   moai rank exclude /path/to/project                                 │
╰──────────────────────────────────────────────────────────────────────╯
```

#### 2. sync - Sync Session Data

```bash
moai rank sync
```

Synchronizes local Claude Code session data to the MoAI Rank server.

**Example Output:**

```bash
❯ moai rank sync

Syncing 2577 session(s) to MoAI Rank
Phase 1: Parsing transcripts (parallel: 20 workers)

Parsing transcripts ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 100% (2577/2577)

Phase 2: Submitting 1873 session(s) (batch mode)
Batch size: 100 | Batches: 19

Submitting batches ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 100% (19/19)

Sync Complete
✓ Submitted: 0
○ Skipped:   704 (no usage or duplicate)
✗ Failed:    500
```

#### 3. status - Check My Rank

```bash
moai rank status
```

**How It Works**:

- Calls `/api/v1/rank` endpoint with stored API key
- Retrieves user-specific ranking data from server
- Displays daily/weekly/monthly/all-time ranks and statistics

**Execution Example**:

```bash
❯ moai rank status

╭────────────────────────────── MoAI Rank ─────────────────────────────╮
│ your-github-id                                                       │
│                                                                      │
│ 🏆 Global Rank: #42                                                  │
╰──────────────────────────────────────────────────────────────────────╯
╭───── Daily ──────╮  ╭───── Weekly ─────╮  ╭──── Monthly ─────╮  ╭──── All Time ────╮
│ #12              │  │ #28              │  │ #42              │  │ #156             │
╰──────────────────╯  ╰──────────────────╯  ╰──────────────────╯  ╰──────────────────╯
╭─────────────────────────── Token Usage ──────────────────────────────╮
│ 1,247,832 total tokens                                               │
│                                                                      │
│ Input  ██████████████░░░░░░ 847,291 (68%)                            │
│ Output ██████░░░░░░░░░░░░░░ 400,541 (32%)                            │
│                                                                      │
│ Sessions: 47                                                         │
╰──────────────────────────────────────────────────────────────────────╯

● Hook: Installed  |  https://rank.mo.ai.kr
```

#### 4. exclude/include - Project Management

```bash
# Exclude current project
moai rank exclude

# Exclude specific path
moai rank exclude /path/to/private

# Wildcard patterns
moai rank exclude "*/confidential/*"

# List excluded projects
moai rank list-excluded

# Re-include
moai rank include /path/to/project
```

**Privacy Protection**:

- Sensitive projects can be excluded from tracking
- Data from excluded projects is not sent to the server

#### 5. logout - Logout

```bash
moai rank logout
```

- Removes stored API key
- Removes global hook
- Stops all tracking

---

## 📊 Collected Metrics

| Metric           | Description                         | Collected |
| ---------------- | ----------------------------------- | --------- |
| **Token Usage**  | Input/Output tokens, Cache tokens   | O         |
| **Tool Usage**   | Read, Edit, Bash usage counts       | O         |
| **Model Usage**  | Opus, Sonnet, Haiku breakdown       | O         |
| **Code Metrics** | Added/deleted lines, modified files | O         |
| **Session Info** | Duration, turn count, timestamps    | O         |
| **Code Content** | Actual code content                 | X         |
| **File Paths**   | File paths within project           | X         |
| **Prompts**      | Conversation content with Claude    | X         |

**Guarantee**: Collected data contains **only numerical metrics**; code content or conversation details are never transmitted.

---

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
- [Performance & Scalability](#performance--scalability)

## Features

### Ranking System

- **Multi-Period Rankings**: Daily, weekly, monthly, and all-time leaderboards
- **Composite Score Calculation**: Weighted algorithm considering multiple factors
  - Token Usage (40%): Total input + output tokens
  - Efficiency (25%): Output/input ratio optimization
  - Session Count (20%): Number of coding sessions
  - Streak (15%): Consecutive active days

### Vibe Coding Analytics

Discover your own coding style through AI analysis:

- **Explorer**: Focus on code exploration and system understanding
- **Creator**: Focus on creating new features and code
- **Refactorer**: Excellence in improving existing code
- **Automator**: Task automation and workflow orchestration

### Dashboard Features

- Real-time token usage tracking
- Activity heatmap (GitHub style)
- Model usage analysis
- Hourly activity patterns
- Weekly coding patterns
- Tool usage statistics
- Privacy mode for anonymous participation

### Multi-language Support

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
│   │   ├── [locale]/         # Multi-language routes (next-intl)
│   │   │   ├── api/          # API routes
│   │   │   │   ├── v1/       # Public CLI API (v1)
│   │   │   │   │   ├── sessions/ # Session records
│   │   │   │   │   ├── rank/     # User ranking
│   │   │   │   │   ├── status/   # API status check
│   │   │   │   │   └── verify/   # API key verification
│   │   │   │   ├── me/       # User dashboard API
│   │   │   │   ├── leaderboard/ # Public leaderboard
│   │   │   │   ├── cron/     # Scheduled tasks
│   │   │   │   │   ├── calculate-rankings/ # Ranking calculation
│   │   │   │   │   └── cleanup-data/       # Data cleanup
│   │   │   │   └── auth/     # CLI authentication
│   │   │   ├── dashboard/    # User dashboard pages
│   │   │   └── users/        # Public user profiles
│   │   ├── layout.tsx        # Root layout
│   │   └── globals.css       # Global styles
│   ├── cache/                 # Cache layer
│   │   ├── config.ts         # Cache TTL settings
│   │   └── keys.ts           # Cache key generators
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
│   │   ├── auth.ts           # API key & HMAC authentication
│   │   ├── audit.ts          # Security audit logging
│   │   ├── cache.ts          # Redis cache utilities
│   │   ├── rate-limiter.ts   # Rate limiting
│   │   ├── score.ts          # Score calculation
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
        AUTH[Clerk Authentication]
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

    CLI -->|HMAC Authentication| API
    WEB -->|Clerk Session| API
    API --> AUTH
    API --> RATE
    API --> CACHE{Cache Layer}
    CACHE -->|Cache Miss| NEON
    CACHE -->|Cache Hit| RATE
    RATE --> REDIS
    CACHE --> REDIS
    CRON -->|Daily Ranking Calculation| API
    CRON -->|"Data Cleanup (2AM)"| NEON
    VERCEL --> API
```

## Tech Stack

| Category   | Technology        | Purpose                          |
| ---------- | ----------------- | -------------------------------- |
| Framework  | Next.js 16        | Full-stack React framework       |
| Language   | TypeScript 5      | Type-safe development            |
| Database   | Neon (PostgreSQL) | Serverless PostgreSQL            |
| ORM        | Drizzle ORM       | Type-safe database queries       |
| Cache      | Upstash Redis     | Distributed caching & rate limit |
| Auth       | Clerk             | GitHub OAuth authentication      |
| UI         | Tailwind CSS 4    | Styling                          |
| Components | Radix UI          | Accessible UI primitives         |
| Charts     | Recharts          | Data visualization               |
| i18n       | next-intl         | Internationalization             |
| Validation | Zod               | Runtime type validation          |
| Analytics  | Vercel Analytics  | Usage analytics                  |

## Getting Started

### Prerequisites

- **Node.js** 20.x or higher
- **Bun** 1.x (recommended) or npm/yarn
- **PostgreSQL** (or Neon account)
- **Clerk** account for authentication
- **Upstash** account for Redis (optional but recommended)

### Installation

1. **Clone Repository**

```bash
git clone https://github.com/your-org/moai-rank.git
cd moai-rank/apps/web
```

2. **Install Dependencies**

```bash
bun install
```

3. **Set Up Environment Variables**

```bash
cp .env.example .env.local
# Open .env.local and enter your credentials
```

4. **Set Up Database**

```bash
# Generate migration
bun run db:generate

# Push schema to database
bun run db:push

# (Optional) Seed sample data
bun run db:seed
```

5. **Start Development Server**

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Environment Variables

### Required Variables

| Variable                            | Description                | Example                                          |
| ----------------------------------- | -------------------------- | ------------------------------------------------ |
| `DATABASE_URL`                      | Neon PostgreSQL connection | `postgresql://user:pass@host/db?sslmode=require` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key           | `pk_test_xxx`                                    |
| `CLERK_SECRET_KEY`                  | Clerk secret key           | `sk_test_xxx`                                    |

### Optional Variables

| Variable            | Description                            | Default                |
| ------------------- | -------------------------------------- | ---------------------- |
| `KV_REST_API_URL`   | Upstash Redis URL (caching/rate limit) | In-memory fallback     |
| `KV_REST_API_TOKEN` | Upstash Redis token                    | In-memory fallback     |
| `CRON_SECRET`       | Cron job authentication secret         | Required in production |

### Alternative Variable Names

Upstash Redis also supports these variable names:

- `UPSTASH_REDIS_REST_URL` (alternative to `KV_REST_API_URL`)
- `UPSTASH_REDIS_REST_TOKEN` (alternative to `KV_REST_API_TOKEN`)

### .env.local Example

```env
# Database (required)
DATABASE_URL="postgresql://neondb_owner:xxx@ep-xxx.aws.neon.tech/neondb?sslmode=require"

# Clerk Authentication (required)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_xxx"
CLERK_SECRET_KEY="sk_test_xxx"

# Upstash Redis (optional - for distributed rate limiting)
KV_REST_API_URL="https://xxx.upstash.io"
KV_REST_API_TOKEN="xxx"

# Cron Authentication (required in production)
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

### Table Overview

| Table                | Description                               |
| -------------------- | ----------------------------------------- |
| `users`              | User accounts linked to GitHub via Clerk  |
| `sessions`           | Claude Code session records with metadata |
| `token_usage`        | Detailed token consumption per session    |
| `daily_aggregates`   | Pre-calculated daily statistics           |
| `rankings`           | Calculated rankings for each period       |
| `security_audit_log` | Security event audit trail                |

## API Reference

### API v1 (CLI Integration)

Base URL: `/api/v1`

#### API Status Check

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

#### API Key Verification

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

#### Session Record

```http
POST /api/v1/sessions
Content-Type: application/json
X-API-Key: moai_rank_xxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
X-Timestamp: 1704067200
X-Signature: <HMAC-SHA256 signature>
```

Request body:

```json
{
  "sessionHash": "<64-character hash>",
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

#### User Ranking Query

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

#### Leaderboard Query

```http
GET /api/leaderboard?period=weekly&limit=50&offset=0
```

Query parameters:
| Parameter | Type | Default | Description |
| --------- | ------ | ------- | ------------------------------------------------ |
| `period` | string | `weekly`| `daily`, `weekly`, `monthly`, `all_time` |
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

| Header        | Description                | Required |
| ------------- | -------------------------- | -------- |
| `X-API-Key`   | API key for authentication | Yes      |
| `X-Timestamp` | Unix timestamp in seconds  | For POST |
| `X-Signature` | HMAC-SHA256 signature      | For POST |

### HMAC Signature Calculation

```
message = timestamp + ":" + request_body
signature = HMAC-SHA256(api_key, message)
```

Signature verification conditions:

- Maximum timestamp validity: 5 minutes
- Constant-time comparison for timing attack prevention

## Development

### Available Scripts

```bash
# Development
bun run dev          # Start dev server with Turbopack

# Build
bun run build        # Production build
bun run start        # Start production server

# Database
bun run db:generate  # Generate Drizzle migration
bun run db:migrate   # Run migration
bun run db:push      # Direct schema push
bun run db:studio    # Open Drizzle Studio GUI
bun run db:seed      # Seed sample data

# Quality
bun run lint         # Run Biome linter
bun run lint:fix     # Fix lint issues
bun run format       # Code formatting
bun run type-check   # TypeScript type checking
```

### Code Style

This project uses **Biome** for linting and formatting:

```bash
# Check issues
bun run lint

# Auto-fix
bun run lint:fix

# Format code
bun run format
```

### Local Testing

1. **API Testing with curl**

```bash
# API status check
curl http://localhost:3000/api/v1/status

# API key verification
curl -H "X-API-Key: your_api_key" http://localhost:3000/api/v1/verify
```

2. **Database Studio**

```bash
bun run db:studio
```

Drizzle Studio opens at [https://local.drizzle.studio](https://local.drizzle.studio).

## Deployment

### Vercel Deployment

1. **Connect Repository**
   - Import repository to Vercel
   - Select `apps/web` directory as root

2. **Configure Environment Variables**
   - Add all required environment variables in Vercel dashboard
   - Connect Neon database (Vercel Integration available)
   - Connect Upstash Redis (Vercel Integration available)

3. **Configure Build Settings**

   ```
   Root Directory: apps/web
   Build Command: next build
   Output Directory: .next
   ```

4. **Cron Jobs**

Configure automated tasks in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/calculate-rankings",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/cleanup-data",
      "schedule": "0 2 * * *"
    }
  ]
}
```

- **Ranking Calculation (0 0 \* \* \*)**: Recalculate all rankings daily at midnight UTC
- **Data Cleanup (0 2 \* \* \*)**: Clean up old data daily at 2 AM UTC

### Region Configuration

By default, deployed to Seoul region (`icn1`) for optimal performance in Asia:

```json
{
  "regions": ["icn1"]
}
```

To change deployment region, modify `vercel.json`.

## Security

### Authentication

- **Web Dashboard**: Clerk OAuth (GitHub only)
- **CLI API**: API Key + HMAC-SHA256 signature

### API Security Features

| Feature                  | Implementation                        |
| ------------------------ | ------------------------------------- |
| API Key Hashing          | SHA-256 (stores hash only)            |
| Request Signing          | HMAC-SHA256 with timestamp            |
| Rate Limiting            | 100 req/min (Redis-based distributed) |
| Timing Attack Prevention | Constant-time comparison              |
| Replay Attack Prevention | 5-minute timestamp validity window    |
| Session Integrity        | Server-side hash verification         |
| Anomaly Detection        | 10x token threshold flagging          |
| Audit Logging            | All security events logged            |

### Rate Limits

| Endpoint Type        | Limit   | Window |
| -------------------- | ------- | ------ |
| Normal API           | 100 req | 1 min  |
| Authentication       | 10 req  | 1 min  |
| Sensitive Operations | 30 req  | 1 min  |
| Public Read          | 200 req | 1 min  |

### Security Event Types

Events tracked by audit logs:

- `api_key_generated` / `api_key_regenerated` / `api_key_revoked`
- `api_key_validated` / `api_key_invalid`
- `hmac_signature_invalid` / `hmac_timestamp_expired`
- `rate_limit_exceeded`
- `session_created` / `session_duplicate`
- `suspicious_activity`
- `privacy_mode_changed`

## Performance & Scalability

### Caching Strategy

Optimize API response times with distributed caching using Upstash Redis.

#### Cache TTL Settings

| Data Type            | TTL             | Description                          |
| -------------------- | --------------- | ------------------------------------ |
| Daily Leaderboard    | 23 hours        | Valid until next ranking calculation |
| Weekly Leaderboard   | 6 days 23 hours | Valid until next ranking calculation |
| Monthly Leaderboard  | 29 days         | Valid until next ranking calculation |
| All-Time Leaderboard | 6 days 23 hours | Synchronized with weekly leaderboard |
| User Rank            | 1 hour          | Individual user data                 |
| User Stats           | 30 minutes      | Detailed statistics for dashboard    |
| Global Stats         | 15 minutes      | Global aggregate data                |

#### Cache Invalidation

Automatically invalidates related caches after ranking calculation cron job completes:

```typescript
// Execute after ranking calculation
await delPattern(`moai-rank:leaderboard:daily:*`);
await delPattern(`moai-rank:leaderboard:weekly:*`);
await delPattern(`moai-rank:leaderboard:monthly:*`);
await delPattern(`moai-rank:leaderboard:all_time:*`);
```

#### Graceful Degradation

When Redis connection fails, bypasses caching and queries database directly to prevent service disruption.

### Data Retention Policy

Automatic data cleanup policies to manage database size and maintain performance.

#### Retention Periods

| Table              | Retention | Cleanup Target                     |
| ------------------ | --------- | ---------------------------------- |
| `token_usage`      | 90 days   | Records older than 90 days         |
| `daily_aggregates` | 90 days   | Aggregate data older than 90 days  |
| `rankings` (daily) | 30 days   | Daily rankings older than 30 days  |
| `sessions`         | 90 days   | Session records older than 90 days |

#### Cleanup Schedule

- **Execution Time**: Daily at 2 AM UTC
- **Batch Processing**: Processes in batches of 100 to distribute database load
- **Logging**: Logs deleted record count and execution time

#### Cleanup Logic Example

```typescript
// Cleanup token_usage older than 90 days
while (true) {
  const idsToDelete = await pooledDb
    .select({ id: tokenUsage.id })
    .from(tokenUsage)
    .where(lt(tokenUsage.recordedAt, cutoffDate))
    .limit(100);

  if (idsToDelete.length === 0) break;

  for (const row of idsToDelete) {
    await pooledDb.delete(tokenUsage).where(eq(tokenUsage.id, row.id));
  }
}
```

### Database Optimization

#### Batch Processing

Optimize performance with batch processing for large data insertions/updates:

- **Batch Size**: 100 records
- **Applied To**: Ranking updates, daily aggregate updates
- **ORM Optimization**: Leverage PostgreSQL `INSERT ... ON CONFLICT`

#### Connection Pooling

Implements connection pooling using Vercel's Neon Serverless Driver:

```typescript
// Normal queries: Direct connection
export const db = drizzle(pool, { schema });

// Batch operations: Connection pooler
export const getPooledDb = () =>
  drizzle(neon(process.env.DATABASE_URL!), { schema });
```

### Performance Monitoring

#### Key Metrics

- API response times (cache Hit vs Miss)
- Database query execution times
- Cron job execution times and processed record counts
- Redis cache hit rates

#### Optimization Opportunities

- Identify endpoints with low cache hit rates
- Optimize slow queries
- Review index additions
- Consider partitioning strategies (at high traffic volumes)

## Composite Score Algorithm

```
Score = (Token * 0.40) + (Efficiency * 0.25) + (Session * 0.20) + (Streak * 0.15)

Calculations:
- Token = min(1, log10(totalTokens + 1) / 10)
- Efficiency = min(outputTokens / inputTokens, 2) / 2
- Session = min(1, log10(sessions + 1) / 3)
- Streak = min(streak, 30) / 30

Final Score = Weighted Sum * 1000
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
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run linting: `bun run lint:fix`
5. Commit: `git commit -m 'feat: add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open Pull Request

## License

This project is licensed under the **Copyleft License (COPYLEFT-3.0)** - see the [LICENSE](../../LICENSE) file for details.

---

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=modu-ai/moai-rank&type=date&legend=top-left)](https://www.star-history.com/#modu-ai/moai-rank&type=date&legend=top-left)

---

## 🙏 Made with ❤️ by MoAI-ADK Team

**Last Updated:** 2026-01-12
**MoAI**: MoAI stands for "AI for Everyone (Modu-ui AI)".

> **"Infinite Possibilism - AI for Everyone"**
