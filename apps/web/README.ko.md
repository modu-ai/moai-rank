# MoAI Rank - Claude Code 에이전트 리더보드

![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?style=flat-square&logo=postgresql)
![Clerk](https://img.shields.io/badge/Auth-Clerk-6C47FF?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

Claude Code 토큰 사용량을 추적하는 경쟁형 리더보드 플랫폼입니다. AI 코딩 세션을 추적하고, 커뮤니티와 비교하며, Vibe Coding Analytics를 통해 자신만의 코딩 스타일을 발견하세요.

[English](README.md) | [한국어](README.ko.md)

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
│   │   ├── api/               # API 라우트
│   │   │   ├── v1/            # 공개 CLI API (v1)
│   │   │   │   ├── sessions/  # 세션 기록
│   │   │   │   ├── rank/      # 사용자 랭킹
│   │   │   │   ├── status/    # API 상태 확인
│   │   │   │   └── verify/    # API 키 검증
│   │   │   ├── me/            # 사용자 대시보드 API
│   │   │   ├── leaderboard/   # 공개 리더보드
│   │   │   ├── cron/          # 스케줄 작업
│   │   │   └── auth/          # CLI 인증
│   │   ├── dashboard/         # 사용자 대시보드 페이지
│   │   └── users/             # 공개 사용자 프로필
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
    RATE --> REDIS
    API --> NEON
    CRON -->|일간| API
    VERCEL --> API
```

## 기술 스택

| 카테고리     | 기술              | 용도                        |
| ------------ | ----------------- | --------------------------- |
| 프레임워크   | Next.js 16        | 풀스택 React 프레임워크     |
| 언어         | TypeScript 5      | 타입 안전 개발              |
| 데이터베이스 | Neon (PostgreSQL) | 서버리스 PostgreSQL         |
| ORM          | Drizzle ORM       | 타입 안전 데이터베이스 쿼리 |
| 인증         | Clerk             | GitHub OAuth 인증           |
| 캐시         | Upstash Redis     | 분산 속도 제한              |
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

| 변수                | 설명                  | 기본값            |
| ------------------- | --------------------- | ----------------- |
| `KV_REST_API_URL`   | Upstash Redis URL     | 인메모리 폴백     |
| `KV_REST_API_TOKEN` | Upstash Redis 토큰    | 인메모리 폴백     |
| `CRON_SECRET`       | 크론 작업 인증 시크릿 | 프로덕션에서 필수 |

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
| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| `period` | string | `weekly` | `daily`, `weekly`, `monthly`, `all_time` |
| `limit` | number | `50` | 페이지당 결과 수 (1-100) |
| `offset` | number | `0` | 페이지네이션 오프셋 |

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

`vercel.json`에서 자동 랭킹 계산을 구성합니다:

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

매일 자정(UTC)에 모든 랭킹을 재계산합니다.

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

이 프로젝트는 MIT 라이선스에 따라 라이선스가 부여됩니다 - 자세한 내용은 [LICENSE](../../LICENSE) 파일을 참조하세요.

---

Next.js 16, Clerk, Neon으로 제작되었습니다.
