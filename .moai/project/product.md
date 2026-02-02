# MoAI Rank - Product Overview

## Project Name

MoAI Rank

## Description

MoAI Rank is a competitive leaderboard platform for tracking Claude Code AI assistant token usage. It records detailed session metrics from Claude Code interactions and computes composite scores that enable developers to rank, compare, and analyze their AI coding productivity over time.

## Target Audience

Developers using Claude Code who want to track and compare their AI coding session metrics. This includes individual developers monitoring their own productivity, teams benchmarking AI-assisted coding efficiency, and the broader Claude Code community interested in usage analytics.

## Core Features

### Session Tracking

Records Claude Code sessions with detailed metrics including:

- **Token Metrics**: Input tokens, output tokens, cache creation tokens, cache read tokens
- **Tool Usage**: Per-tool invocation counts (Read, Write, Edit, Bash, Grep, Glob, etc.)
- **Code Metrics**: Lines added, lines deleted, files modified, files created
- **Model Usage Breakdown**: Per-model input/output token counts (e.g., claude-opus-4, claude-sonnet-4)
- **Session Metadata**: Duration, turn count, model name, timestamps

Sessions are submitted via the CLI through the REST API with HMAC-SHA256 authentication, and each session is deduplicated using a server-computed hash to prevent double-counting.

### Rankings and Leaderboards

Provides competitive rankings across four time periods:

| Period    | Description                         | Calculation Schedule     |
|-----------|-------------------------------------|--------------------------|
| Daily     | Rankings for the current day        | Cron job at 00:00 UTC    |
| Weekly    | Rankings for the current week       | Cron job at 00:00 UTC    |
| Monthly   | Rankings for the current month      | Cron job at 00:00 UTC    |
| All-Time  | Cumulative lifetime rankings        | Cron job at 00:00 UTC    |

Rankings are based on a composite score calculated from four weighted components:

- **Token Usage (40%)**: Logarithmic scaling of total tokens to prevent runaway leaders
- **Efficiency (25%)**: Output-to-input token ratio, capped at 2:1
- **Session Count (20%)**: Logarithmic scaling of total sessions
- **Activity Streak (15%)**: Consecutive days of activity, capped at 30 days

Score tiers: Bronze (0-199), Silver (200-399), Gold (400-599), Platinum (600-799), Diamond (800+).

### User Dashboard

Personal dashboard providing:

- **Stats Overview**: Total tokens, sessions, efficiency score, current rank
- **Token Chart**: Historical token usage visualization
- **API Key Management**: Generate, view prefix, regenerate, and revoke API keys
- **Privacy Toggle**: Opt-in/opt-out of public leaderboard visibility
- **Settings Page**: Account preferences and configuration

### User Profile Pages

Public profile pages (at `/users/[username]`) displaying:

- **Activity Heatmap**: GitHub-style contribution calendar
- **Token Breakdown**: Detailed token category analysis
- **Tool Usage Chart**: Distribution of tool invocations
- **Model Usage Chart**: Distribution across AI models
- **Hourly Activity Chart**: Session distribution by hour of day
- **Day-of-Week Chart**: Session distribution by weekday
- **Code Productivity Chart**: Lines added/deleted over time
- **Streak Card**: Current and longest activity streaks
- **Vibe Style Card**: Coding style classification based on usage patterns

### API Integration

REST API (v1) endpoints for programmatic access:

- `POST /api/v1/sessions` - Submit a single session
- `POST /api/v1/sessions/batch` - Submit multiple sessions in batch
- `GET /api/v1/rank` - Retrieve ranking data
- `GET /api/v1/status` - API health check
- `POST /api/v1/verify` - Verify API key validity
- `POST /api/auth/cli` - Initiate CLI authentication flow
- `GET /api/auth/cli/callback` - Handle CLI auth callback

Authentication uses HMAC-SHA256 signatures with the following headers:

- `X-API-Key`: The user's API key
- `X-Timestamp`: Unix timestamp in seconds
- `X-Signature`: HMAC-SHA256 signature of `timestamp:body`

### Multi-Language Support

Full internationalization across four languages:

- Korean (ko) - Default
- English (en)
- Japanese (ja)
- Chinese (zh)

All UI text, navigation labels, and user-facing content are translated. Language selection is URL-based with locale prefix routing.

### Privacy Controls

Users can enable privacy mode to:

- Hide their profile from the public leaderboard
- Remove their username from ranking tables
- Maintain session tracking for personal analytics only

## Use Cases

- **Track Personal AI Coding Productivity**: Monitor daily, weekly, and monthly token consumption and session patterns to understand personal AI-assisted development habits.
- **Compare Coding Efficiency with Other Developers**: Compete on public leaderboards to see how AI usage patterns compare with peers.
- **Analyze Tool Usage Patterns and Code Metrics**: Gain insights into which tools are used most frequently, how code output correlates with token input, and how coding patterns vary by time of day.
- **Vibe Coding Analytics**: Classify and visualize coding styles through automated pattern analysis of session data and tool usage distributions.
