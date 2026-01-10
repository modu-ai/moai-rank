# MoAI Rank

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://rank.mo.ai.kr)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)

**한국 개발자를 위한 Claude Code 사용량 리더보드**

> Claude Code 토큰 사용량을 추적하고, 다른 개발자들과 경쟁하며, AI 기반 개발 생산성을 뽐내보세요.

[서비스 바로가기](https://rank.mo.ai.kr) | [English Documentation](README.md)

---

## :star: MoAI Rank란?

MoAI Rank는 한국 개발자들의 Claude Code 토큰 사용량을 추적하는 오픈소스 리더보드 플랫폼입니다.

- **실시간 랭킹** - 일간, 주간, 월간, 전체 기간 리더보드 제공
- **사용량 분석** - 상세한 토큰 사용 통계 및 효율성 지표
- **CLI 연동** - MoAI-ADK를 통한 터미널 환경 지원
- **프라이버시 설정** - 데이터 공개 범위 직접 제어

### 왜 MoAI Rank인가요?

Claude Code는 개발자들의 코딩 방식을 혁신적으로 바꾸고 있지만, 커뮤니티 전체의 사용 패턴을 측정하고 비교할 방법이 없었습니다. MoAI Rank는 이 간극을 메워줍니다:

- Claude Code 활용을 독려하는 건전한 경쟁 환경 제공
- 자신만의 개발 패턴과 토큰 효율성에 대한 인사이트
- AI 코딩 어시스턴트를 다른 개발자들이 어떻게 활용하는지 벤치마크

---

## :rocket: 시작하기

### 1. GitHub으로 가입

[rank.mo.ai.kr](https://rank.mo.ai.kr)에 방문해서 GitHub 계정으로 로그인하세요. 비밀번호 없이 안전하게 접속할 수 있도록 GitHub OAuth를 사용합니다.

### 2. API 키 발급

로그인 후 **대시보드**에서 개인 API 키를 발급받으세요. 이 키는 CLI 연동에 필요하며, 한 번만 표시되니 안전한 곳에 저장해 주세요!

> **중요**: API 키는 해시 처리 후 저장됩니다. 원본 API 키는 서버에 절대 저장되지 않습니다.

### 3. MoAI-ADK 설치

MoAI Rank는 Claude Code 경험을 향상시키는 AI 개발 키트인 [MoAI-ADK](https://github.com/moai-project/moai-adk)와 연동됩니다.

```bash
# MoAI-ADK 설치
pip install moai-adk

# API 키로 등록
moai rank register
```

### 4. 추적 시작

등록이 완료되면, Claude Code 세션이 자동으로 추적되어 리더보드에 반영됩니다!

---

## :computer: CLI 사용 가이드

MoAI Rank는 MoAI-ADK를 통해 강력한 CLI 인터페이스를 제공합니다.

### 명령어 요약

| 명령어                  | 설명                   | 옵션                  |
| ----------------------- | ---------------------- | --------------------- |
| `moai rank register`    | GitHub OAuth로 등록    | -                     |
| `moai rank status`      | 현재 순위 및 통계 확인 | -                     |
| `moai rank leaderboard` | 리더보드 조회          | `--period`, `--limit` |
| `moai rank verify`      | API 키 유효성 검증     | -                     |
| `moai rank logout`      | 저장된 인증 정보 삭제  | -                     |

### 상세 명령어 사용법

#### 등록 (Register)

GitHub OAuth 흐름을 시작하여 계정을 등록하고 API 키를 발급받습니다.

```bash
moai rank register
```

실행하면:

1. 브라우저가 열리며 GitHub 인증 진행
2. GitHub 계정이 MoAI Rank에 연결
3. API 키가 생성되어 로컬에 저장

#### 상태 확인 (Status)

현재 순위와 사용량 통계를 확인합니다.

```bash
moai rank status
```

출력 예시:

```
MoAI Rank 현황 - @your-username

순위:
  일간:    156명 중 #12위
  주간:    342명 중 #8위
  월간:    523명 중 #15위
  전체:    1,205명 중 #42위

통계:
  총 토큰:      2,450,000
  총 세션:      127회
  입력 토큰:    1,200,000
  출력 토큰:    1,250,000
```

#### 리더보드 조회 (Leaderboard)

현재 리더보드 순위를 조회합니다.

```bash
# 기본: 주간 리더보드 상위 10명
moai rank leaderboard

# 일간 리더보드 조회
moai rank leaderboard --period daily

# 월간 리더보드 상위 25명 조회
moai rank leaderboard --period monthly --limit 25

# 사용 가능한 기간: daily, weekly, monthly, all_time
```

#### API 키 검증 (Verify)

API 키가 유효하고 올바르게 설정되어 있는지 확인합니다.

```bash
moai rank verify
```

#### 로그아웃 (Logout)

로컬에 저장된 인증 정보를 삭제합니다.

```bash
moai rank logout
```

---

## :shield: 보안 & 개인정보

**여러분의 프라이버시가 최우선입니다.** MoAI Rank는 보안과 투명성을 핵심 가치로 설계되었습니다.

### 수집하는 데이터

| 데이터            | 목적                            | 저장 방식     |
| ----------------- | ------------------------------- | ------------- |
| GitHub 사용자명   | 공개 표시 (비공개 모드 해제 시) | 평문          |
| GitHub 아바타 URL | 프로필 표시                     | 평문          |
| 토큰 사용량       | 순위 계산                       | 집계된 숫자만 |
| 세션 수           | 통계                            | 개수만        |

### 수집하지 않는 데이터

- **코드 내용 없음** - 여러분의 코드나 대화 내용에 접근하지 않습니다
- **프로젝트명 없음** - 프로젝트 식별자는 익명화됩니다
- **파일 경로 없음** - 프로젝트 구조에 대한 정보 없음
- **프롬프트 내용 없음** - Claude와의 대화는 비공개로 유지됩니다
- **원본 API 키 없음** - 해시 처리된 버전만 저장됩니다

### 프라이버시 설정

- **비공개 모드** - 활성화하면 리더보드에 "User #X"로 표시됩니다
- **데이터 내보내기** - 언제든지 전체 데이터 내보내기 요청 가능
- **계정 삭제** - 클릭 한 번으로 모든 데이터 영구 삭제

### 보안 조치

- **HMAC 인증** - API 요청은 HMAC-SHA256으로 서명됩니다
- **해시 처리된 인증 정보** - API 키는 솔트와 함께 해시 처리 후 저장
- **감사 로깅** - 모든 보안 이벤트가 모니터링을 위해 기록됩니다
- **속도 제한** - 악용 및 공격으로부터 보호
- **HTTPS 전용** - 모든 트래픽은 전송 중 암호화됩니다

### 왜 오픈소스인가요?

MoAI Rank는 완전한 오픈소스입니다. **신뢰는 투명성에서 나옵니다.**

- 여러분의 데이터를 처리하는 모든 코드를 검토할 수 있습니다
- 원하시면 직접 인스턴스를 호스팅할 수 있습니다
- 코드 리뷰를 통해 프라이버시 약속을 검증할 수 있습니다
- 개선사항과 보안 수정에 기여할 수 있습니다

---

## :bulb: MoAI-ADK 소개

[MoAI-ADK](https://github.com/moai-project/moai-adk) (AI Development Kit)는 Claude Code 개발 경험을 향상시키는 종합 툴킷입니다.

- **지능형 워크플로우** - AI를 활용한 자동화된 개발 워크플로우
- **에이전트 오케스트레이션** - 작업별 특화된 AI 에이전트
- **품질 보증** - 내장된 TDD 및 코드 품질 도구
- **문서 생성** - 코드에서 자동으로 문서 생성

MoAI Rank는 MoAI-ADK에서 제공하는 여러 통합 기능 중 하나입니다. 전체 툴킷을 설치하여 모든 잠재력을 활용해 보세요:

```bash
pip install moai-adk
moai init  # 프로젝트에서 초기화
```

자세한 내용: [github.com/moai-project/moai-adk](https://github.com/moai-project/moai-adk)

---

## :wrench: 기술 스택

- **프레임워크**: Next.js 16 (App Router)
- **UI**: React 19, Tailwind CSS, Radix UI
- **데이터베이스**: Neon PostgreSQL + Drizzle ORM
- **인증**: Clerk (GitHub OAuth)
- **배포**: Vercel
- **패키지 매니저**: Bun
- **모노레포**: Turborepo

---

## :handshake: 기여하기

커뮤니티의 기여를 환영합니다! 함께 더 나은 서비스를 만들어가요.

### 개발 환경 설정

```bash
# 저장소 클론
git clone https://github.com/GoosLab/moai-rank.git
cd moai-rank

# 의존성 설치
bun install

# 환경 변수 설정
cp apps/web/.env.example apps/web/.env.local
# .env.local에 인증 정보 입력

# 데이터베이스 마이그레이션
cd apps/web && bun run db:push

# 개발 서버 실행
bun run dev
```

### 환경 변수

로컬 개발에 필요한 환경 변수:

```env
# Clerk 인증
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# 데이터베이스
DATABASE_URL=postgresql://...

# 선택사항
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 기여 가이드라인

1. 저장소를 **Fork** 합니다
2. 기능 브랜치를 **생성**합니다 (`git checkout -b feature/amazing-feature`)
3. 명확한 메시지와 함께 **커밋**합니다
4. 브랜치에 **푸시**합니다 (`git push origin feature/amazing-feature`)
5. **Pull Request**를 생성합니다

코드 제출 전 확인사항:

- 린트 검사 통과 (`bun run lint`)
- 적절한 테스트 포함
- 기존 코드 스타일 준수
- 명확한 커밋 메시지

---

## :scroll: 라이선스

MoAI Rank는 **GNU Affero General Public License v3.0 (AGPL-3.0)** 라이선스로 배포됩니다.

### 카피레프트(Copyleft)란?

AGPL-3.0은 **카피레프트** 라이선스입니다. 이는 다음을 의미합니다:

- **사용의 자유**: 어떤 목적으로든 소프트웨어 사용 가능
- **학습의 자유**: 소스 코드 열람 및 수정 가능
- **공유의 자유**: 다른 사람에게 복사본 배포 가능
- **개선의 자유**: 수정한 버전 배포 가능

**카피레프트 조건**: MoAI Rank를 수정하여 네트워크를 통해 제공하는 경우(예: 수정된 버전을 웹 서비스로 운영), 해당 소스 코드도 **반드시** 동일한 AGPL-3.0 라이선스로 공개해야 합니다.

이를 통해 MoAI Rank의 개선사항이 전체 커뮤니티에 이익이 되도록 보장하며, 누구도 이 소프트웨어의 비공개 버전을 만들 수 없습니다.

전체 라이선스 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

---

## :link: 링크

- **서비스**: [rank.mo.ai.kr](https://rank.mo.ai.kr)
- **GitHub**: [github.com/GoosLab/moai-rank](https://github.com/GoosLab/moai-rank)
- **MoAI-ADK**: [github.com/moai-project/moai-adk](https://github.com/moai-project/moai-adk)

---

<p align="center">
  한국 Claude Code 커뮤니티가 :heart:를 담아 만들었습니다
</p>
