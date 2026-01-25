# MoAI Rank - Claude Code 에이전트 리더보드

![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?style=flat-square&logo=postgresql)
![Clerk](https://img.shields.io/badge/Auth-Clerk-6C47FF?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

Claude Code 토큰 사용량을 추적하는 경쟁형 리더보드 플랫폼입니다. AI 코딩 세션을 추적하고, 커뮤니티와 비교하며, Agentic Coding Analytics를 통해 자신만의 코딩 스타일을 발견하세요.

[English](README.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [中文](README.zh.md)

> **⚠️ 중요 공지 (2025-01-25)**
>
> 프로덕션 환경 마이그레이션으로 인해 **기존 계정이 모두 초기화**되었습니다. 이전에 가입하셨던 분들은 [rank.mo.ai.kr](https://rank.mo.ai.kr)에서 **다시 회원가입**해 주세요. 불편을 드려 죄송합니다.

---

## 📚 모두의 AI 에이전틱 코딩 강의

이 프로젝트는 **MoAI-ADK의 실제 활용을 보여주는 강의용 예제**로 제작되었습니다.

### 🎯 프로젝트 목적

**에이전틱 코딩의 새로운 차원을 경험하세요!**

MoAI Rank는 다음과 같은 학습 목적으로 만들어졌습니다:

- **실전 AI 에이전트 오케스트레이션**: 20개 전문 에이전트가 협력하여 구축한 완전한 시스템
- **SPEC-First TDD 실현**: 명세서부터 테스트까지 완벽한 품질 프로세스
- **확장 가능한 아키텍처**: 캐싱, 데이터 보존 정책, 성능 최적화가 적용된 실무용 코드
- **오픈소스 기여**: 모든 코드를 공개하여 커뮤니티 학습에 기여

### ⚠️ 제작 환경

**48시간 핵킹 프로젝트**

이 프로젝트는 48시간 동안 MoAI-ADK를 활용하여 집중적으로 제작되었습니다. 실전 환경에서의 빠른 개발을 보여주는 실증 예제입니다.

**제작 특징**:

- MoAI-ADK의 `/moai:alfred` `/moai:loop` 명령어로 완전 자율 자동화 명령어로 핵심 기능 구현
- GLM 4.7과 Claude Opus를 하이브리드로 활용한 비용 효율적 개발
- Worktree 병렬 개발로 독립된 기능 모듈 동시 개발

**테스트 부족 안내**:

- 48시간 제작으로 인해 충분한 테스트가 이루어지지 않았을 수 있습니다
- 발견한 오류나 개선 사항은 언제든지 [GitHub Issues](https://github.com/modu-ai/moai-rank/issues)에 남겨주세요
- 커뮤니티의 기여는 프로젝트를 더욱 견고하게 만듭니다

### 🔗 관련 프로젝트

- **[MoAI-ADK](https://github.com/modu-ai/moai-adk)**: AI 개발 프레임워크

---

## 🚀 시작하기 전에: MoAI-ADK 설치

MoAI Rank를 사용하려면 먼저 **MoAI-ADK**가 설치되어 있어야 합니다.

### MoAI-ADK란?

MoAI-ADK는 **품질 있는 코드를 만드는 AI 개발 프레임워크**입니다.

- **SPEC-First TDD**: 명확한 명세서로 90% 재작업 감소
- **AI 오케스트레이션**: 20개 전문 에이전트 + 48개 스킬
- **다국어 지원**: 한국어/영어/일본어/중국어 자동 지원
- **Worktree 병렬 개발**: 완전 격리 환경에서 무제한 병렬 작업
- **MoAI Rank**: 바이브 코딩 리더보드로 동기부여

### 빠른 설치

```bash
# 방법 1: 빠른 설치 (권장)
curl -LsSf https://modu-ai.github.io/moai-adk/install.sh | sh

# 방법 2: 수동 설치
# Step 1: uv 설치 (macOS/Linux)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Step 2: MoAI-ADK 설치
uv tool install moai-adk
```

---

## 🎮 MoAI Rank CLI 명령어

MoAI-ADK가 설치되면 MoAI Rank CLI를 사용할 수 있습니다.

### 명령어 개요

```bash
moai rank [OPTIONS] COMMAND [ARGS]...

MoAI Rank - Claude Code 토큰 사용량 리더보드

Claude Code 세션을 추적하고 리더보드에서 경쟁하세요.
웹 대시보드: https://rank.mo.ai.kr

옵션:
  --help    도움말 표시

명령어:
  register   GitHub OAuth로 MoAI Rank에 등록
  status     현재 순위와 통계 표시
  exclude    프로젝트를 세션 추적에서 제외
  include    이전에 제외된 프로젝트를 다시 포함
  logout     저장된 MoAI Rank 자격 증명 제거
```

### 명령어 상세 설명

#### 1. register - GitHub OAuth 등록

```bash
moai rank register
```

**작동 원리**:

1. 브라우저를 열어 GitHub OAuth 인증 수행
2. 인증 성공 후 API 키 자동 생성 및 저장
3. 전역 훅(Hook)을 설치하여 세션 자동 추적 시작
4. `~/.moai/rank/credentials.json`에 안전하게 API 키 저장

**실행 예시**:

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

#### 2. sync - 세션 데이터 동기화

```bash
moai rank sync
```

로컬의 Claude Code 세션 데이터를 MoAI Rank 서버에 동기화합니다.

**출력 예시:**

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

#### 3. status - 내 순위 확인

```bash
moai rank status
```

**작동 원리**:

- 저장된 API 키로 `/api/v1/rank` 엔드포인트 호출
- 서버에서 사용자별 랭킹 데이터 조회
- 일간/주간/월간/전체 순위와 통계 표시

**실행 예시**:

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

#### 4. exclude/include - 프로젝트 관리

```bash
# 현재 프로젝트 제외
moai rank exclude

# 특정 경로 제외
moai rank exclude /path/to/private

# 와일드카드 패턴
moai rank exclude "*/confidential/*"

# 제외 목록 확인
moai rank list-excluded

# 다시 포함
moai rank include /path/to/project
```

**프라이버시 보호**:

- 민감한 프로젝트는 추적에서 제외할 수 있습니다
- 제외된 프로젝트의 데이터는 서버로 전송되지 않습니다

#### 5. logout - 로그아웃

```bash
moai rank logout
```

- 저장된 API 키 제거
- 전역 훅 제거
- 모든 추적 중단

---

## 📊 수집되는 메트릭

| 메트릭          | 설명                          | 수집 여부 |
| --------------- | ----------------------------- | --------- |
| **토큰 사용량** | 입력/출력 토큰, 캐시 토큰     | O         |
| **도구 사용**   | Read, Edit, Bash 등 사용 횟수 | O         |
| **모델 사용**   | Opus, Sonnet, Haiku별 분량    | O         |
| **코드 메트릭** | 추가/삭제 라인, 수정 파일     | O         |
| **세션 정보**   | 지속 시간, 턴 수, 타임스탬프  | O         |
| **코드 내용**   | 실제 코드 내용                | X         |
| **파일 경로**   | 프로젝트 내 파일 경로         | X         |
| **프롬프트**    | Claude와의 대화 내용          | X         |

**보증**: 수집 데이터는 **수치 메트릭만** 포함하며, 코드 내용이나 대화 내용은 전송되지 않습니다.

---

# 개발 내용 완전 공개

## 목차

- [기능](#기능)
- [아키텍처](#아키텍처)
- [기술 스택](#기술-스택)
- [시작하기](#시작하기)
- [환경 변수](#환경-변수)
- [데이터베이스 스키마](#데이터베이스-스키마)
- [API 레퍼런스](#api-레퍼런스)
- [개발](#개발)
- [배포](#배포)
- [보안](#보안)
- [성능 및 확장성](#성능-및-확장성)

## 기능

### 랭킹 시스템

- **다중 기간 랭킹**: 일간, 주간, 월간, 전체 기간 리더보드
- **복합 점수 계산**: 여러 요소를 고려한 가중치 알고리즘
  - 토큰 사용량 (40%): 총 입력 + 출력 토큰
  - 효율성 (25%): 출력/입력 비율 최적화
  - 세션 수 (20%): 코딩 세션 횟수
  - 연속 기록 (15%): 연속 활동 일수

### Vibe Coding Analytics

AI 분석을 통해 자신만의 코딩 성향을 발견하세요:

- **탐험가(Explorer)**: 코드 탐색과 시스템 이해에 집중
- **창작자(Creator)**: 새로운 기능과 코드 생성에 집중
- **리팩터러(Refactorer)**: 기존 코드 개선에 탁월
- **자동화러(Automator)**: 작업 자동화와 워크플로우 조율

### 대시보드 기능

- 실시간 토큰 사용량 추적
- 활동 히트맵 (GitHub 스타일)
- 모델 사용량 분석
- 시간대별 활동 패턴
- 주간 코딩 패턴
- 도구 사용 통계
- 익명 참여를 위한 프라이버시 모드

### 다국어 지원

4개 언어 완벽 지원:

- 영어 (en)
- 한국어 (ko)
- 일본어 (ja)
- 중국어 (zh)

## 아키텍처

```
apps/web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── [locale]/         # 다국어 라우트 (next-intl)
│   │   │   ├── api/          # API 라우트
│   │   │   │   ├── v1/       # 공개 CLI API (v1)
│   │   │   │   │   ├── sessions/ # 세션 기록
│   │   │   │   │   ├── rank/     # 사용자 랭킹
│   │   │   │   │   ├── status/   # API 상태 확인
│   │   │   │   │   └── verify/   # API 키 검증
│   │   │   │   ├── me/       # 사용자 대시보드 API
│   │   │   │   ├── leaderboard/ # 공개 리더보드
│   │   │   │   ├── cron/     # 스케줄 작업
│   │   │   │   │   ├── calculate-rankings/ # 랭킹 계산
│   │   │   │   │   └── cleanup-data/       # 데이터 정리
│   │   │   │   └── auth/     # CLI 인증
│   │   │   ├── dashboard/    # 사용자 대시보드 페이지
│   │   │   └── users/        # 공개 사용자 프로필
│   │   ├── layout.tsx        # 루트 레이아웃
│   │   └── globals.css       # 전역 스타일
│   ├── cache/                 # 캐시 레이어
│   │   ├── config.ts         # 캐시 TTL 설정
│   │   └── keys.ts           # 캐시 키 생성기
│   ├── components/            # React 컴포넌트
│   │   ├── ui/               # 기본 UI 컴포넌트
│   │   ├── layout/           # 레이아웃 컴포넌트
│   │   ├── leaderboard/      # 리더보드 컴포넌트
│   │   ├── dashboard/        # 대시보드 컴포넌트
│   │   └── profile/          # 프로필 컴포넌트
│   ├── db/                    # 데이터베이스 레이어
│   │   ├── schema.ts         # Drizzle ORM 스키마
│   │   ├── index.ts          # 데이터베이스 연결
│   │   ├── rls.ts            # Row-level 보안
│   │   └── seed.ts           # 시드 데이터 스크립트
│   ├── lib/                   # 유틸리티 함수
│   │   ├── auth.ts           # API 키 & HMAC 인증
│   │   ├── audit.ts          # 보안 감사 로깅
│   │   ├── cache.ts          # Redis 캐시 유틸리티
│   │   ├── rate-limiter.ts   # 속도 제한
│   │   ├── score.ts          # 점수 계산
│   │   └── api-response.ts   # 응답 헬퍼
│   └── i18n/                  # 국제화
├── messages/                   # 번역 파일
└── drizzle/                   # 데이터베이스 마이그레이션
```

### 시스템 아키텍처

```mermaid
graph TB
    subgraph "클라이언트 레이어"
        CLI[Claude Code CLI]
        WEB[웹 대시보드]
    end

    subgraph "애플리케이션 레이어"
        API[Next.js API 라우트]
        AUTH[Clerk 인증]
        RATE[속도 제한기]
    end

    subgraph "데이터 레이어"
        NEON[(Neon PostgreSQL)]
        REDIS[(Upstash Redis)]
    end

    subgraph "인프라"
        VERCEL[Vercel Edge]
        CRON[Vercel Cron]
    end

    CLI -->|HMAC 인증| API
    WEB -->|Clerk 세션| API
    API --> AUTH
    API --> RATE
    API --> CACHE{캐시 레이어}
    CACHE -->|Cache Miss| NEON
    CACHE -->|Cache Hit| RATE
    RATE --> REDIS
    CACHE --> REDIS
    CRON -->|일간 랭킹 계산| API
    CRON -->|"데이터 정리(2AM)"| NEON
    VERCEL --> API
```

## 기술 스택

| 카테고리     | 기술              | 용도                        |
| ------------ | ----------------- | --------------------------- |
| 프레임워크   | Next.js 16        | 풀스택 React 프레임워크     |
| 언어         | TypeScript 5      | 타입 안전 개발              |
| 데이터베이스 | Neon (PostgreSQL) | 서버리스 PostgreSQL         |
| ORM          | Drizzle ORM       | 타입 안전 데이터베이스 쿼리 |
| 캐시         | Upstash Redis     | 분산 캐싱 및 속도 제한      |
| 인증         | Clerk             | GitHub OAuth 인증           |
| UI           | Tailwind CSS 4    | 스타일링                    |
| 컴포넌트     | Radix UI          | 접근성 UI 프리미티브        |
| 차트         | Recharts          | 데이터 시각화               |
| 다국어       | next-intl         | 국제화                      |
| 검증         | Zod               | 런타임 타입 검증            |
| 분석         | Vercel Analytics  | 사용량 분석                 |

## 시작하기

### 사전 요구사항

- **Node.js** 20.x 이상
- **Bun** 1.x (권장) 또는 npm/yarn
- **PostgreSQL** (또는 Neon 계정)
- 인증을 위한 **Clerk** 계정
- Redis를 위한 **Upstash** 계정 (선택사항이지만 권장)

### 설치

1. **저장소 클론**

```bash
git clone https://github.com/your-org/moai-rank.git
cd moai-rank/apps/web
```

2. **의존성 설치**

```bash
bun install
```

3. **환경 변수 설정**

```bash
cp .env.example .env.local
# .env.local 파일을 열어 자격 증명 입력
```

4. **데이터베이스 설정**

```bash
# 마이그레이션 생성
bun run db:generate

# 스키마를 데이터베이스에 푸시
bun run db:push

# (선택사항) 샘플 데이터 시드
bun run db:seed
```

5. **개발 서버 시작**

```bash
bun run dev
```

[http://localhost:3000](http://localhost:3000)을 열어 애플리케이션을 확인하세요.

## 환경 변수

### 필수 변수

| 변수                                | 설명                        | 예시                                             |
| ----------------------------------- | --------------------------- | ------------------------------------------------ |
| `DATABASE_URL`                      | Neon PostgreSQL 연결 문자열 | `postgresql://user:pass@host/db?sslmode=require` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk 공개 키               | `pk_test_xxx`                                    |
| `CLERK_SECRET_KEY`                  | Clerk 비밀 키               | `sk_test_xxx`                                    |

### 선택 변수

| 변수                | 설명                               | 기본값            |
| ------------------- | ---------------------------------- | ----------------- |
| `KV_REST_API_URL`   | Upstash Redis URL (캐싱/속도 제한) | 인메모리 폴백     |
| `KV_REST_API_TOKEN` | Upstash Redis 토큰                 | 인메모리 폴백     |
| `CRON_SECRET`       | 크론 작업 인증 시크릿              | 프로덕션에서 필수 |

### 대체 변수명

Upstash Redis는 다음 변수명도 지원합니다:

- `UPSTASH_REDIS_REST_URL` (`KV_REST_API_URL` 대체)
- `UPSTASH_REDIS_REST_TOKEN` (`KV_REST_API_TOKEN` 대체)

### .env.local 예시

```env
# 데이터베이스 (필수)
DATABASE_URL="postgresql://neondb_owner:xxx@ep-xxx.aws.neon.tech/neondb?sslmode=require"

# Clerk 인증 (필수)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_xxx"
CLERK_SECRET_KEY="sk_test_xxx"

# Upstash Redis (선택사항 - 분산 속도 제한용)
KV_REST_API_URL="https://xxx.upstash.io"
KV_REST_API_TOKEN="xxx"

# 크론 인증 (프로덕션에서 필수)
CRON_SECRET="your-secure-random-string"
```

## 데이터베이스 스키마

### 엔티티 관계 다이어그램

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

### 테이블 개요

| 테이블               | 설명                                      |
| -------------------- | ----------------------------------------- |
| `users`              | Clerk를 통해 GitHub와 연결된 사용자 계정  |
| `sessions`           | 메타데이터가 포함된 Claude Code 세션 기록 |
| `token_usage`        | 세션별 상세 토큰 소비량                   |
| `daily_aggregates`   | 사전 계산된 일간 통계                     |
| `rankings`           | 각 기간별 계산된 랭킹                     |
| `security_audit_log` | 보안 이벤트 감사 추적                     |

## API 레퍼런스

### API v1 (CLI 통합)

기본 URL: `/api/v1`

#### API 상태 확인

```http
GET /api/v1/status
```

응답:

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

#### API 키 검증

```http
GET /api/v1/verify
X-API-Key: moai_rank_xxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

응답:

```json
{
  "valid": true,
  "username": "developer",
  "apiKeyPrefix": "moai_rank_xxxxxxxx",
  "privacyMode": false,
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

#### 세션 기록

```http
POST /api/v1/sessions
Content-Type: application/json
X-API-Key: moai_rank_xxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
X-Timestamp: 1704067200
X-Signature: <HMAC-SHA256 서명>
```

요청 본문:

```json
{
  "sessionHash": "<64자 해시>",
  "endedAt": "2025-01-11T12:00:00.000Z",
  "inputTokens": 50000,
  "outputTokens": 10000,
  "cacheCreationTokens": 5000,
  "cacheReadTokens": 20000,
  "modelName": "claude-sonnet-4-20250514",
  "anonymousProjectId": "proj_abc123"
}
```

응답:

```json
{
  "success": true,
  "sessionId": "uuid",
  "message": "Session recorded successfully"
}
```

#### 사용자 랭킹 조회

```http
GET /api/v1/rank
X-API-Key: moai_rank_xxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

응답:

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

### 공개 API

#### 리더보드 조회

```http
GET /api/leaderboard?period=weekly&limit=50&offset=0
```

쿼리 파라미터:
| 파라미터 | 타입   | 기본값   | 설명                                     |
| -------- | ------ | -------- | ---------------------------------------- |
| `period` | string | `weekly` | `daily`, `weekly`, `monthly`, `all_time` |
| `limit`  | number | `50`     | 페이지당 결과 수 (1-100)                 |
| `offset` | number | `0`      | 페이지네이션 오프셋                      |

응답:

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

### 인증 헤더

| 헤더          | 설명                 | 필수 여부    |
| ------------- | -------------------- | ------------ |
| `X-API-Key`   | 인증용 API 키        | 예           |
| `X-Timestamp` | Unix 타임스탬프 (초) | POST 요청 시 |
| `X-Signature` | HMAC-SHA256 서명     | POST 요청 시 |

### HMAC 서명 계산

```
message = timestamp + ":" + request_body
signature = HMAC-SHA256(api_key, message)
```

서명 검증 조건:

- 최대 타임스탬프 유효 시간: 5분
- 타이밍 공격 방지를 위한 상수 시간 비교

## 개발

### 사용 가능한 스크립트

```bash
# 개발
bun run dev          # Turbopack으로 개발 서버 시작

# 빌드
bun run build        # 프로덕션 빌드
bun run start        # 프로덕션 서버 시작

# 데이터베이스
bun run db:generate  # Drizzle 마이그레이션 생성
bun run db:migrate   # 마이그레이션 실행
bun run db:push      # 스키마 직접 푸시
bun run db:studio    # Drizzle Studio GUI 열기
bun run db:seed      # 샘플 데이터 시드

# 품질
bun run lint         # Biome 린터 실행
bun run lint:fix     # 린트 이슈 수정
bun run format       # 코드 포맷팅
bun run type-check   # TypeScript 타입 체크
```

### 코드 스타일

이 프로젝트는 **Biome**을 사용하여 린팅과 포맷팅을 수행합니다:

```bash
# 이슈 확인
bun run lint

# 자동 수정
bun run lint:fix

# 코드 포맷팅
bun run format
```

### 로컬 테스트

1. **curl로 API 테스트**

```bash
# API 상태 확인
curl http://localhost:3000/api/v1/status

# API 키 검증
curl -H "X-API-Key: your_api_key" http://localhost:3000/api/v1/verify
```

2. **데이터베이스 스튜디오**

```bash
bun run db:studio
```

[https://local.drizzle.studio](https://local.drizzle.studio)에서 Drizzle Studio가 열립니다.

## 배포

### Vercel 배포

1. **저장소 연결**
   - Vercel에 저장소 가져오기
   - 루트로 `apps/web` 디렉토리 선택

2. **환경 변수 구성**
   - Vercel 대시보드에서 모든 필수 환경 변수 추가
   - Neon 데이터베이스 연결 (Vercel Integration 사용 가능)
   - Upstash Redis 연결 (Vercel Integration 사용 가능)

3. **빌드 설정 구성**

   ```
   Root Directory: apps/web
   Build Command: next build
   Output Directory: .next
   ```

4. **크론 작업**

`vercel.json`에서 자동화 작업을 구성합니다:

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

- **랭킹 계산 (0 0 \* \* \*)**: 매일 자정(UTC)에 모든 랭킹 재계산
- **데이터 정리 (0 2 \* \* \*)**: 매일 새벽 2시(UTC)에 오래된 데이터 정리

### 리전 구성

기본적으로 아시아 지역 최적 성능을 위해 서울 리전(`icn1`)으로 배포됩니다:

```json
{
  "regions": ["icn1"]
}
```

배포 리전을 변경하려면 `vercel.json`을 수정하세요.

## 보안

### 인증

- **웹 대시보드**: Clerk OAuth (GitHub만 지원)
- **CLI API**: API 키 + HMAC-SHA256 서명

### API 보안 기능

| 기능               | 구현                              |
| ------------------ | --------------------------------- |
| API 키 해싱        | SHA-256 (해시만 저장)             |
| 요청 서명          | 타임스탬프가 포함된 HMAC-SHA256   |
| 속도 제한          | 100 req/min (Redis를 통한 분산)   |
| 타이밍 공격 방지   | 상수 시간 비교                    |
| 리플레이 공격 방지 | 5분 타임스탬프 허용 범위          |
| 세션 무결성        | 서버 측 해시 검증                 |
| 이상 탐지          | 평균 대비 10배 토큰 임계값 플래깅 |
| 감사 로깅          | 모든 보안 이벤트 기록             |

### 속도 제한

| 엔드포인트 유형 | 제한    | 윈도우 |
| --------------- | ------- | ------ |
| 일반 API        | 100 req | 1분    |
| 인증            | 10 req  | 1분    |
| 민감한 작업     | 30 req  | 1분    |
| 공개 읽기       | 200 req | 1분    |

### 보안 이벤트 유형

감사 로그가 추적하는 이벤트:

- `api_key_generated` / `api_key_regenerated` / `api_key_revoked`
- `api_key_validated` / `api_key_invalid`
- `hmac_signature_invalid` / `hmac_timestamp_expired`
- `rate_limit_exceeded`
- `session_created` / `session_duplicate`
- `suspicious_activity`
- `privacy_mode_changed`

## 성능 및 확장성

### 캐싱 전략

Upstash Redis를 활용한 분산 캐싱으로 API 응답 시간을 최적화합니다.

#### 캐시 TTL 설정

| 데이터 유형   | TTL        | 설명                       |
| ------------- | ---------- | -------------------------- |
| 일간 리더보드 | 23시간     | 다음 랭킹 계산 전까지 유효 |
| 주간 리더보드 | 6일 23시간 | 다음 랭킹 계산 전까지 유효 |
| 월간 리더보드 | 29일       | 다음 랭킹 계산 전까지 유효 |
| 전체 리더보드 | 6일 23시간 | 주간 리더보드와 동기화     |
| 사용자 랭킹   | 1시간      | 개별 사용자 데이터         |
| 사용자 통계   | 30분       | 대시보드용 상세 통계       |
| 전체 통계     | 15분       | 글로벌 집계 데이터         |

#### 캐시 무효화

랭킹 계산 크론 작업 완료 후 자동으로 관련 캐시를 무효화합니다:

```typescript
// 랭킹 계산 후 실행
await delPattern(`moai-rank:leaderboard:daily:*`);
await delPattern(`moai-rank:leaderboard:weekly:*`);
await delPattern(`moai-rank:leaderboard:monthly:*`);
await delPattern(`moai-rank:leaderboard:all_time:*`);
```

#### Graceful Degradation

Redis 연결 실패 시 캐싱을 우회하고 데이터베이스에서 직접 데이터를 조회하여 서비스 중단을 방지합니다.

### 데이터 보존 정책

데이터베이스 크기를 관리하고 성능을 유지하기 위한 자동 데이터 정리 정책입니다.

#### 보존 기간

| 테이블             | 보존 기간 | 정리 대상             |
| ------------------ | --------- | --------------------- |
| `token_usage`      | 90일      | 90일 이전 기록        |
| `daily_aggregates` | 90일      | 90일 이전 집계 데이터 |
| `rankings` (일간)  | 30일      | 30일 이전 일간 랭킹   |
| `sessions`         | 90일      | 90일 이전 세션 기록   |

#### 정리 스케줄

- **실행 시간**: 매일 새벽 2시 (UTC)
- **배치 처리**: 100건 단위로 처리하여 데이터베이스 부하 분산
- **로그 기록**: 삭제된 레코드 수와 실행 시간을 로그에 기록

#### 정리 로직 예시

```typescript
// 90일 이전 token_usage 정리
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

### 데이터베이스 최적화

#### 배치 처리

대량의 데이터 삽입/업데이트 시 배치 처리를 사용하여 성능을 최적화합니다:

- **배치 크기**: 100건
- **적용 대상**: 랭킹 업데이트, 일간 집계 업데이트
- **ORM 최적화**: PostgreSQL `INSERT ... ON CONFLICT` 활용

#### 연결 풀링

Vercel의 Neon Serverless Driver를 사용하여 연결 풀링을 구현합니다:

```typescript
// 일반 쿼리: 직접 연결
export const db = drizzle(pool, { schema });

// 배치 작업: 연결 풀러
export const getPooledDb = () =>
  drizzle(neon(process.env.DATABASE_URL!), { schema });
```

### 성능 모니터링

#### 주요 메트릭

- API 응답 시간 (캐시 Hit vs Miss)
- 데이터베이스 쿼리 실행 시간
- 크론 작업 실행 시간 및 처리 레코드 수
- Redis 캐시 적중률

#### 최적화 기회

- 캐시 적중률이 낮은 엔드포인트 식별
- 느린 쿼리 최적화
- 인덱스 추가 검토
- 파티셔닝 전략 고려 (대규모 트래픽 시)

## 복합 점수 알고리즘

```
Score = (Token * 0.40) + (Efficiency * 0.25) + (Session * 0.20) + (Streak * 0.15)

계산식:
- Token = min(1, log10(totalTokens + 1) / 10)
- Efficiency = min(outputTokens / inputTokens, 2) / 2
- Session = min(1, log10(sessions + 1) / 3)
- Streak = min(streak, 30) / 30

최종 점수 = 가중합 * 1000
```

### 점수 티어

| 티어       | 점수 범위 |
| ---------- | --------- |
| 다이아몬드 | 800+      |
| 플래티넘   | 600-799   |
| 골드       | 400-599   |
| 실버       | 200-399   |
| 브론즈     | 0-199     |

## 기여하기

1. 저장소 포크
2. 기능 브랜치 생성: `git checkout -b feature/amazing-feature`
3. 변경 사항 작성
4. 린팅 실행: `bun run lint:fix`
5. 커밋: `git commit -m 'feat: add amazing feature'`
6. 푸시: `git push origin feature/amazing-feature`
7. Pull Request 열기

## 라이선스

이 프로젝트는 **Copyleft License (COPYLEFT-3.0)**에 따라 라이선스가 부여됩니다 - 자세한 내용은 [LICENSE](../../LICENSE) 파일을 참조하세요.

---

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=modu-ai/moai-rank&type=date&legend=top-left)](https://www.star-history.com/#modu-ai/moai-rank&type=date&legend=top-left)

---

## 🙏 Made with ❤️ by MoAI-ADK Team

**Last Updated:** 2026-01-12
**MoAI**: MoAI는 "모두를 위한 AI (Modu-ui AI)"를 의미합니다.

> **"무한가능주의 - 모두의 AI"**
