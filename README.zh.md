# MoAI Rank - Claude Code 代理排行榜

![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?style=flat-square&logo=postgresql)
![Clerk](https://img.shields.io/badge/Auth-Clerk-6C47FF?style=flat-square)
![License](https://img.shields.io/badge/License-Copyleft-green?style=flat-square)

追踪 Claude Code 令牌使用量的竞争型排行榜平台。追踪您的 AI 编码会话，与社区竞争，通过代理编码分析发现您独特的编码风格。

[English](README.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [中文](README.zh.md)

---

## 📚 大家 AI 代理编码讲座

本项目作为 **展示 MoAI-ADK 实际应用的讲座示例**而创建。

### 🎯 项目目的

**体验代理编码的新维度！**

MoAI Rank 的创建目的如下：

- **实战 AI 代理编排**: 通过 20 个专业代理协作构建的完整系统
- **SPEC-First TDD 实现**: 从规格说明到测试的完美质量流程
- **可扩展架构**: 应用缓存、数据保留策略、性能优化的实战代码
- **开源贡献**: 公开所有代码为社区学习做贡献

### ⚠️ 开发环境

**48 小时黑客马拉松项目**

本项目在 48 小时内使用 MoAI-ADK 集中开发完成。展示实战环境中快速开发的实证示例。

**开发特征**：

- 使用 MoAI-ADK 的 `/moai:alfred` `/moai:loop` 完全自主自动化命令实现核心功能
- 混合使用 GLM 4.7 和 Claude Opus 进行成本效益开发
- Worktree 并行开发同时开发独立功能模块

**测试不足说明**：

- 由于 48 小时开发，可能未进行充分测试
- 如果发现任何错误或改进建议，请在 [GitHub Issues](https://github.com/modu-ai/moai-rank/issues) 留言
- 社区贡献使项目更加稳健

### 🔗 相关项目

- **[MoAI-ADK](https://github.com/modu-ai/moai-adk)**: AI 开发框架

---

## 🚀 开始之前：安装 MoAI-ADK

使用 MoAI Rank 之前，必须先安装 **MoAI-ADK**。

### 什么是 MoAI-ADK？

MoAI-ADK 是一个 **创建高质量代码的 AI 开发框架**。

- **SPEC-First TDD**: 通过明确的规格说明减少 90% 的返工
- **AI 编排**: 20 个专业代理 + 48 个技能
- **多语言支持**: 自动支持韩语/英语/日语/中文
- **Worktree 并行开发**: 在完全隔离的环境中进行无限制的并行工作
- **MoAI Rank**: 通过 vibe coding 排行榜提供动力

### 快速安装

```bash
# 方法 1: 快速安装（推荐）
curl -LsSf https://modu-ai.github.io/moai-adk/install.sh | sh

# 方法 2: 手动安装
# 步骤 1: 安装 uv（macOS/Linux）
curl -LsSf https://astral.sh/uv/install.sh | sh

# 步骤 2: 安装 MoAI-ADK
uv tool install moai-adk
```

---

## 🎮 MoAI Rank CLI 命令

安装 MoAI-ADK 后，您可以使用 MoAI Rank CLI。

### 命令概述

```bash
moai rank [OPTIONS] COMMAND [ARGS]...

MoAI Rank - Claude Code 令牌使用量排行榜

追踪您的 Claude Code 会话并在排行榜上竞争。
网页仪表板: https://rank.mo.ai.kr

选项:
  --help    显示帮助信息

命令:
  register   通过 GitHub OAuth 注册 MoAI Rank
  status     显示当前排名和统计信息
  exclude    将项目从会话追踪中排除
  include    重新包含之前排除的项目
  logout     删除存储的 MoAI Rank 凭证信息
```

### 命令详细说明

#### 1. register - GitHub OAuth 注册

```bash
moai rank register
```

**工作原理**:

1. 打开浏览器进行 GitHub OAuth 认证
2. 认证成功后自动生成并存储 API 密钥
3. 安装全局挂钩开始自动会话追踪
4. 将 API 密钥安全存储在 `~/.moai/rank/credentials.json`

**执行示例**:

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

#### 2. sync - 同步会话数据

```bash
moai rank sync
```

将本地 Claude Code 会话数据同步到 MoAI Rank 服务器。

**输出示例:**

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

#### 3. status - 查看我的排名

```bash
moai rank status
```

**工作原理**:

- 使用存储的 API 密钥调用 `/api/v1/rank` 端点
- 从服务器检索用户特定的排名数据
- 显示日次/周次/月次/全期间排名和统计信息

**执行示例**:

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

#### 4. exclude/include - 项目管理

```bash
# 排除当前项目
moai rank exclude

# 排除特定路径
moai rank exclude /path/to/private

# 通配符模式
moai rank exclude "*/confidential/*"

# 列出排除的项目
moai rank list-excluded

# 重新包含
moai rank include /path/to/project
```

**隐私保护**:

- 可以从追踪中排除敏感项目
- 排除的项目数据不会发送到服务器

#### 5. logout - 登出

```bash
moai rank logout
```

- 删除存储的 API 密钥
- 删除全局挂钩
- 停止所有追踪

---

## 📊 收集的指标

| 指标           | 说明                      | 是否收集 |
| -------------- | ------------------------- | -------- |
| **令牌使用量** | 输入/输出令牌、缓存令牌   | O        |
| **工具使用**   | Read、Edit、Bash 使用次数 | O        |
| **模型使用**   | Opus、Sonnet、Haiku 详细  | O        |
| **代码指标**   | 添加/删除行、修改文件     | O        |
| **会话信息**   | 持续时间、回合数、时间戳  | O        |
| **代码内容**   | 实际代码内容              | X        |
| **文件路径**   | 项目内的文件路径          | X        |
| **提示**       | 与 Claude 的对话内容      | X        |

**保证**: 收集的数据**仅包含数值指标**，从不传输代码内容或对话详细信息。

---

## 目录

- [功能](#功能)
- [架构](#架构)
- [技术栈](#技术栈)
- [开始使用](#开始使用)
- [环境变量](#环境变量)
- [数据库架构](#数据库架构)
- [API 参考](#api-参考)
- [开发](#开发)
- [部署](#部署)
- [安全](#安全)
- [性能和可扩展性](#性能和可扩展性)

## 功能

### 排名系统

- **多期间排名**: 日次、周次、月次和全期间排行榜
- **综合评分计算**: 考虑多个因素的加权算法
  - 令牌使用量 (40%): 总输入 + 输出令牌
  - 效率 (25%): 输出/输入比优化
  - 会话数 (20%): 编码会话数
  - 连续记录 (15%): 连续活跃天数

### Vibe 编码分析

通过 AI 分析发现您独特的编码风格：

- **探索者**: 专注于代码探索和系统理解
- **创造者**: 专注于创建新功能和代码
- **重构者**: 擅长改进现有代码
- **自动化者**: 任务自动化和工作流程协调

### 仪表板功能

- 实时令牌使用量追踪
- 活动热力图（GitHub 风格）
- 模型使用量分析
- 每小时活动模式
- 每周编码模式
- 工具使用统计
- 匿名参与的隐私模式

### 多语言支持

完全支持 4 种语言：

- 英语 (en)
- 韩语 (ko)
- 日语 (ja)
- 中文 (zh)

## 架构

```
apps/web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── [locale]/         # 多语言路由 (next-intl)
│   │   │   ├── api/          # API 路由
│   │   │   │   ├── v1/       # 公开 CLI API (v1)
│   │   │   │   │   ├── sessions/ # 会话记录
│   │   │   │   │   ├── rank/     # 用户排名
│   │   │   │   │   ├── status/   # API 状态检查
│   │   │   │   │   └── verify/   # API 密钥验证
│   │   │   │   ├── me/       # 用户仪表板 API
│   │   │   │   ├── leaderboard/ # 公开排行榜
│   │   │   │   ├── cron/     # 定时任务
│   │   │   │   │   ├── calculate-rankings/ # 排名计算
│   │   │   │   │   └── cleanup-data/       # 数据清理
│   │   │   │   └── auth/     # CLI 认证
│   │   │   ├── dashboard/    # 用户仪表板页面
│   │   │   └── users/        # 公开用户资料
│   │   ├── layout.tsx        # 根布局
│   │   └── globals.css       # 全局样式
│   ├── cache/                 # 缓存层
│   │   ├── config.ts         # 缓存 TTL 设置
│   │   └── keys.ts           # 缓存密钥生成器
│   ├── components/            # React 组件
│   │   ├── ui/               # 基础 UI 组件
│   │   ├── layout/           # 布局组件
│   │   ├── leaderboard/      # 排行榜组件
│   │   ├── dashboard/        # 仪表板组件
│   │   └── profile/          # 资料组件
│   ├── db/                    # 数据库层
│   │   ├── schema.ts         # Drizzle ORM 架构
│   │   ├── index.ts          # 数据库连接
│   │   ├── rls.ts            # 行级安全
│   │   └── seed.ts           # 种子数据脚本
│   ├── lib/                   # 工具函数
│   │   ├── auth.ts           # API 密钥和 HMAC 认证
│   │   ├── audit.ts          # 安全审计日志
│   │   ├── cache.ts          # Redis 缓存工具
│   │   ├── rate-limiter.ts   # 速率限制
│   │   ├── score.ts          # 评分计算
│   │   └── api-response.ts   # 响应助手
│   └── i18n/                  # 国际化
├── messages/                   # 翻译文件
└── drizzle/                   # 数据库迁移
```

### 系统架构

```mermaid
graph TB
    subgraph "客户端层"
        CLI[Claude Code CLI]
        WEB[网页仪表板]
    end

    subgraph "应用层"
        API[Next.js API 路由]
        AUTH[Clerk 认证]
        RATE[速率限制器]
    end

    subgraph "数据层"
        NEON[(Neon PostgreSQL)]
        REDIS[(Upstash Redis)]
    end

    subgraph "基础设施"
        VERCEL[Vercel Edge]
        CRON[Vercel Cron]
    end

    CLI -->|HMAC 认证| API
    WEB -->|Clerk 会话| API
    API --> AUTH
    API --> RATE
    API --> CACHE{缓存层}
    CACHE -->|Cache Miss| NEON
    CACHE -->|Cache Hit| RATE
    RATE --> REDIS
    CACHE --> REDIS
    CRON -->|每日排名计算| API
    CRON -->|"数据清理 (2AM)"| NEON
    VERCEL --> API
```

## 技术栈

| 类别   | 技术              | 目的                 |
| ------ | ----------------- | -------------------- |
| 框架   | Next.js 16        | 全栈 React 框架      |
| 语言   | TypeScript 5      | 类型安全开发         |
| 数据库 | Neon (PostgreSQL) | 无服务器 PostgreSQL  |
| ORM    | Drizzle ORM       | 类型安全数据库查询   |
| 缓存   | Upstash Redis     | 分布式缓存和速率限制 |
| 认证   | Clerk             | GitHub OAuth 认证    |
| UI     | Tailwind CSS 4    | 样式                 |
| 组件   | Radix UI          | 无障碍 UI 原语       |
| 图表   | Recharts          | 数据可视化           |
| i18n   | next-intl         | 国际化               |
| 验证   | Zod               | 运行时类型验证       |
| 分析   | Vercel Analytics  | 使用量分析           |

## 开始使用

### 前提条件

- **Node.js** 20.x 或更高版本
- **Bun** 1.x（推荐）或 npm/yarn
- **PostgreSQL**（或 Neon 账户）
- 用于认证的 **Clerk** 账户
- 用于 Redis 的 **Upstash** 账户（可选但推荐）

### 安装

1. **克隆仓库**

```bash
git clone https://github.com/your-org/moai-rank.git
cd moai-rank/apps/web
```

2. **安装依赖**

```bash
bun install
```

3. **设置环境变量**

```bash
cp .env.example .env.local
# 打开 .env.local 并输入您的凭证
```

4. **设置数据库**

```bash
# 生成迁移
bun run db:generate

# 将架构推送到数据库
bun run db:push

# （可选）种子示例数据
bun run db:seed
```

5. **启动开发服务器**

```bash
bun run dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看应用程序。

## 环境变量

### 必需变量

| 变量                                | 说明                 | 示例                                             |
| ----------------------------------- | -------------------- | ------------------------------------------------ |
| `DATABASE_URL`                      | Neon PostgreSQL 连接 | `postgresql://user:pass@host/db?sslmode=require` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk 公开密钥       | `pk_test_xxx`                                    |
| `CLERK_SECRET_KEY`                  | Clerk 私密密钥       | `sk_test_xxx`                                    |

### 可选变量

| 变量                | 说明                               | 默认值       |
| ------------------- | ---------------------------------- | ------------ |
| `KV_REST_API_URL`   | Upstash Redis URL（缓存/速率限制） | 内存回退     |
| `KV_REST_API_TOKEN` | Upstash Redis 令牌                 | 内存回退     |
| `CRON_SECRET`       | Cron 任务认证密钥                  | 生产环境必需 |

### 替代变量名

Upstash Redis 也支持以下变量名：

- `UPSTASH_REDIS_REST_URL`（`KV_REST_API_URL` 的替代）
- `UPSTASH_REDIS_REST_TOKEN`（`KV_REST_API_TOKEN` 的替代）

### .env.local 示例

```env
# 数据库（必需）
DATABASE_URL="postgresql://neondb_owner:xxx@ep-xxx.aws.neon.tech/neondb?sslmode=require"

# Clerk 认证（必需）
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_xxx"
CLERK_SECRET_KEY="sk_test_xxx"

# Upstash Redis（可选 - 用于分布式速率限制）
KV_REST_API_URL="https://xxx.upstash.io"
KV_REST_API_TOKEN="xxx"

# Cron 认证（生产环境必需）
CRON_SECRET="your-secure-random-string"
```

## 数据库架构

### 实体关系图

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

### 表概述

| 表                   | 说明                                |
| -------------------- | ----------------------------------- |
| `users`              | 通过 Clerk 与 GitHub 关联的用户账户 |
| `sessions`           | 包含元数据的 Claude Code 会话记录   |
| `token_usage`        | 每个会话的详细令牌消耗量            |
| `daily_aggregates`   | 预先计算的每日统计                  |
| `rankings`           | 每个期间的计算排名                  |
| `security_audit_log` | 安全事件审计跟踪                    |

## API 参考

### API v1 (CLI 集成)

基础 URL: `/api/v1`

#### API 状态检查

```http
GET /api/v1/status
```

响应:

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

#### API 密钥验证

```http
GET /api/v1/verify
X-API-Key: moai_rank_xxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

响应:

```json
{
  "valid": true,
  "username": "developer",
  "apiKeyPrefix": "moai_rank_xxxxxxxx",
  "privacyMode": false,
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

#### 会话记录

```http
POST /api/v1/sessions
Content-Type: application/json
X-API-Key: moai_rank_xxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
X-Timestamp: 1704067200
X-Signature: <HMAC-SHA256 签名>
```

请求体:

```json
{
  "sessionHash": "<64位哈希>",
  "endedAt": "2025-01-11T12:00:00.000Z",
  "inputTokens": 50000,
  "outputTokens": 10000,
  "cacheCreationTokens": 5000,
  "cacheReadTokens": 20000,
  "modelName": "claude-sonnet-4-20250514",
  "anonymousProjectId": "proj_abc123"
}
```

响应:

```json
{
  "success": true,
  "sessionId": "uuid",
  "message": "Session recorded successfully"
}
```

#### 用户排名查询

```http
GET /api/v1/rank
X-API-Key: moai_rank_xxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

响应:

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

### 公开 API

#### 排行榜查询

```http
GET /api/leaderboard?period=weekly&limit=50&offset=0
```

查询参数:
| 参数 | 类型 | 默认值 | 说明 |
| -------- | ------- | -------- | ----------------------------------------- |
| `period` | string | `weekly` | `daily`, `weekly`, `monthly`, `all_time` |
| `limit` | number | `50` | 每页结果数 (1-100) |
| `offset` | number | `0` | 分页偏移 |

响应:

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

### 认证头

| 头部          | 说明                | 必需 |
| ------------- | ------------------- | ---- |
| `X-API-Key`   | 用于认证的 API 密钥 | 是   |
| `X-Timestamp` | Unix 时间戳（秒）   | POST |
| `X-Signature` | HMAC-SHA256 签名    | POST |

### HMAC 签名计算

```
message = timestamp + ":" + request_body
signature = HMAC-SHA256(api_key, message)
```

签名验证条件:

- 最大时间戳有效期：5 分钟
- 定时时间比较以防止定时攻击

## 开发

### 可用脚本

```bash
# 开发
bun run dev          # 使用 Turbopack 启动开发服务器

# 构建
bun run build        # 生产构建
bun run start        # 启动生产服务器

# 数据库
bun run db:generate  # 生成 Drizzle 迁移
bun run db:migrate   # 运行迁移
bun run db:push      # 直接推送架构
bun run db:studio    # 打开 Drizzle Studio GUI
bun run db:seed      # 种子示例数据

# 质量
bun run lint         # 运行 Biome linter
bun run lint:fix     # 修复 linter 问题
bun run format       # 代码格式化
bun run type-check   # TypeScript 类型检查
```

### 代码风格

本项目使用 **Biome** 进行 linter 和格式化：

```bash
# 检查问题
bun run lint

# 自动修复
bun run lint:fix

# 格式化代码
bun run format
```

### 本地测试

1. **使用 curl 进行 API 测试**

```bash
# API 状态检查
curl http://localhost:3000/api/v1/status

# API 密钥验证
curl -H "X-API-Key: your_api_key" http://localhost:3000/api/v1/verify
```

2. **数据库 Studio**

```bash
bun run db:studio
```

Drizzle Studio 在 [https://local.drizzle.studio](https://local.drizzle.studio) 打开。

## 部署

### Vercel 部署

1. **连接仓库**
   - 将仓库导入到 Vercel
   - 选择 `apps/web` 目录作为根目录

2. **配置环境变量**
   - 在 Vercel 仪表板中添加所有必需的环境变量
   - 连接 Neon 数据库（可使用 Vercel Integration）
   - 连接 Upstash Redis（可使用 Vercel Integration）

3. **配置构建设置**

   ```
   Root Directory: apps/web
   Build Command: next build
   Output Directory: .next
   ```

4. **Cron 任务**

在 `vercel.json` 中配置自动化任务：

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

- **排名计算 (0 0 \* \* \*)**: 每天午夜 UTC 重新计算所有排名
- **数据清理 (0 2 \* \* \*)**: 每天凌晨 2 点 UTC 清理旧数据

### 区域配置

默认情况下，部署到首尔区域（`icn1`）以在亚洲获得最佳性能：

```json
{
  "regions": ["icn1"]
}
```

要更改部署区域，请修改 `vercel.json`。

## 安全

### 认证

- **网页仪表板**: Clerk OAuth（仅 GitHub）
- **CLI API**: API 密钥 + HMAC-SHA256 签名

### API 安全功能

| 功能         | 实现                               |
| ------------ | ---------------------------------- |
| API 密钥哈希 | SHA-256（仅存储哈希）              |
| 请求签名     | 带时间戳的 HMAC-SHA256             |
| 速率限制     | 100 req/min（基于 Redis 的分布式） |
| 定时攻击防止 | 定时时间比较                       |
| 重放攻击防止 | 5 分钟时间戳有效期窗口             |
| 会话完整性   | 服务器端哈希验证                   |
| 异常检测     | 10 倍令牌阈值标记                  |
| 审计日志     | 记录所有安全事件                   |

### 速率限制

| 端点类型 | 限制    | 窗口   |
| -------- | ------- | ------ |
| 一般 API | 100 req | 1 分钟 |
| 认证     | 10 req  | 1 分钟 |
| 敏感操作 | 30 req  | 1 分钟 |
| 公开读取 | 200 req | 1 分钟 |

### 安全事件类型

审计日志跟踪的事件：

- `api_key_generated` / `api_key_regenerated` / `api_key_revoked`
- `api_key_validated` / `api_key_invalid`
- `hmac_signature_invalid` / `hmac_timestamp_expired`
- `rate_limit_exceeded`
- `session_created` / `session_duplicate`
- `suspicious_activity`
- `privacy_mode_changed`

## 性能和可扩展性

### 缓存策略

使用 Upstash Redis 的分布式缓存优化 API 响应时间。

#### 缓存 TTL 设置

| 数据类型     | TTL          | 说明               |
| ------------ | ------------ | ------------------ |
| 日次排行榜   | 23 小时      | 下次排名计算前有效 |
| 周次排行榜   | 6 天 23 小时 | 下次排名计算前有效 |
| 月次排行榜   | 29 天        | 下次排名计算前有效 |
| 全期间排行榜 | 6 天 23 小时 | 与周次排行榜同步   |
| 用户排名     | 1 小时       | 个别用户数据       |
| 用户统计     | 30 分钟      | 仪表板详细统计     |
| 全局统计     | 15 分钟      | 全局聚合数据       |

#### 缓存失效

排名计算 Cron 任务完成后自动使相关缓存失效：

```typescript
// 排名计算后执行
await delPattern(`moai-rank:leaderboard:daily:*`);
await delPattern(`moai-rank:leaderboard:weekly:*`);
await delPattern(`moai-rank:leaderboard:monthly:*`);
await delPattern(`moai-rank:leaderboard:all_time:*`);
```

#### 优雅降级

当 Redis 连接失败时，绕过缓存并直接从数据库查询数据以防止服务中断。

### 数据保留策略

用于管理数据库大小并维护性能的自动数据清理策略。

#### 保留期限

| 表                 | 保留期限 | 清理目标            |
| ------------------ | -------- | ------------------- |
| `token_usage`      | 90 天    | 90 天以前的记录     |
| `daily_aggregates` | 90 天    | 90 天以前的聚合数据 |
| `rankings` (日次)  | 30 天    | 30 天以前的日次排名 |
| `sessions`         | 90 天    | 90 天以前的会话记录 |

#### 清理时间表

- **执行时间**: 每天凌晨 2 点 UTC
- **批处理**: 以 100 为单位处理以分散数据库负载
- **日志记录**: 记录删除的记录数和执行时间

#### 清理逻辑示例

```typescript
// 清理 90 天以前的 token_usage
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

### 数据库优化

#### 批处理

使用批处理优化大量数据插入/更新的性能：

- **批大小**: 100 条记录
- **应用于**: 排名更新、日次聚合更新
- **ORM 优化**: 利用 PostgreSQL `INSERT ... ON CONFLICT`

#### 连接池

使用 Vercel 的 Neon Serverless Driver 实现连接池：

```typescript
// 普通查询：直接连接
export const db = drizzle(pool, { schema });

// 批处理：连接池
export const getPooledDb = () =>
  drizzle(neon(process.env.DATABASE_URL!), { schema });
```

### 性能监控

#### 关键指标

- API 响应时间（缓存 Hit vs Miss）
- 数据库查询执行时间
- Cron 任务执行时间和处理的记录数
- Redis 缓存命中率

#### 优化机会

- 识别缓存命中率低的端点
- 优化慢查询
- 审查索引添加
- 考虑分区策略（高流量时）

## 综合评分算法

```
Score = (Token * 0.40) + (Efficiency * 0.25) + (Session * 0.20) + (Streak * 0.15)

计算公式:
- Token = min(1, log10(totalTokens + 1) / 10)
- Efficiency = min(outputTokens / inputTokens, 2) / 2
- Session = min(1, log10(sessions + 1) / 3)
- Streak = min(streak, 30) / 30

最终评分 = 加权和 * 1000
```

### 评分等级

| 等级 | 评分范围 |
| ---- | -------- |
| 钻石 | 800+     |
| 铂金 | 600-799  |
| 黄金 | 400-599  |
| 白银 | 200-399  |
| 青铜 | 0-199    |

## 贡献

1. Fork 仓库
2. 创建功能分支: `git checkout -b feature/amazing-feature`
3. 进行更改
4. 运行 linter: `bun run lint:fix`
5. 提交: `git commit -m 'feat: add amazing feature'`
6. 推送: `git push origin feature/amazing-feature`
7. 打开 Pull Request

## 许可证

本项目采用 **Copyleft License (COPYLEFT-3.0)** 许可 - 详见 [LICENSE](../../LICENSE) 文件。

---

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=modu-ai/moai-rank&type=date&legend=top-left)](https://www.star-history.com/#modu-ai/moai-rank&type=date&legend=top-left)

---

## 🙏 Made with ❤️ by MoAI-ADK Team

**Last Updated:** 2026-01-12
**MoAI**: MoAI 代表"大家的 AI (Modu-ui AI)"。

> **"无限可能主义 - 大家的 AI"**
