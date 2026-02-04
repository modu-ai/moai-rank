# Database Cleanup Scripts

## cleanup-orphaned-users.ts

Clerk에 존재하지 않는 사용자의 고아 레코드를 안전하게 정리하는 스크립트입니다.

### 기능

- **Phase 1: 데이터 수집**
  - Clerk API를 통해 모든 활성 사용자 가져오기
  - 데이터베이스의 모든 사용자 조회
  - 차집합을 통해 고아 사용자 식별

- **Phase 2: 영향 범위 분석**
  - 각 고아 사용자의 연관 레코드 개수 계산
  - 삭제 영향 범위 상세 출력

- **Phase 3: 안전한 삭제**
  - 트랜잭션 기반 일괄 삭제
  - Foreign Key 제약 순서 준수
  - 실패 시 자동 롤백

### 안전장치

1. **Dry-run 모드 (기본값)**
   - 기본적으로 분석만 수행하고 삭제하지 않음
   - `--execute` 플래그로만 실제 삭제 가능

2. **삭제 제한**
   - 한 번에 최대 100명까지만 삭제
   - `--force` 플래그로 제한 우회 (경고 포함)

3. **수동 확인 프롬프트**
   - `--execute` 모드에서도 Y/N 확인 요청
   - 삭제 대상 수와 영향 범위 명시

4. **상세 로깅**
   - 콘솔 출력: 진행 상황 + 요약
   - 파일 로깅: `cleanup-orphaned-users-YYYY-MM-DD-HH-mm-ss.log`

5. **에러 처리**
   - Clerk API 호출 실패: 재시도 3회
   - DB 트랜잭션 실패: 자동 롤백
   - 모든 에러는 로그 파일에 기록

### 사용법

#### 1. Dry-run (분석만 수행)

```bash
# npm scripts 사용
npm run cleanup:orphaned-users

# 또는 직접 실행
bun run src/scripts/cleanup-orphaned-users.ts
```

**출력 예시:**

```
╔═══════════════════════════════════════════════════════════════╗
║        Orphaned Users Cleanup Report (DRY RUN)               ║
╚═══════════════════════════════════════════════════════════════╝

📊 Summary:
  • Clerk users found: 150
  • Database users found: 153
  • Orphaned users: 3

🔍 Orphaned User Details:

[1] clerkId: user_abc123
    userId: 550e8400-e29b-41d4-a716-446655440000
    ├─ rankings: 10 records
    ├─ sessions: 25 records
    ├─ tokenUsage: 100 records
    ├─ dailyAggregates: 30 records
    └─ securityAuditLog: 5 records

📈 Total Impact:
  • Users: 3
  • Rankings: 23 records
  • Sessions: 55 records
  • TokenUsage: 230 records
  • DailyAggregates: 70 records
  • SecurityAuditLog: 10 records

[DRY RUN] No data was deleted.
Run with --execute to perform actual deletion.
```

#### 2. 실제 삭제 (확인 프롬프트 포함)

```bash
# npm scripts 사용
npm run cleanup:orphaned-users:execute

# 또는 직접 실행
bun run src/scripts/cleanup-orphaned-users.ts --execute
```

**프롬프트:**

```
⚠️  WARNING: This operation will permanently delete data.
Please ensure you have:
  1. Database backup (Neon PITR enabled)
  2. Reviewed the dry-run results
  3. Confirmed the deletion targets

About to delete 3 orphaned user(s) and all related data.

Continue? (y/N):
```

#### 3. 100명 제한 우회

```bash
bun run src/scripts/cleanup-orphaned-users.ts --execute --force
```

**경고:**

```
⚠️  WARNING: Proceeding with 152 users (--force enabled)
```

### 환경 변수

스크립트 실행 전 다음 환경 변수가 설정되어 있어야 합니다:

```bash
DATABASE_URL=postgresql://...          # Neon PostgreSQL 연결 URL
CLERK_SECRET_KEY=sk_live_...          # Clerk API 인증 키
```

### 권장 워크플로우

1. **백업 확인**
   ```bash
   # Neon Dashboard에서 PITR(Point-in-Time Recovery) 활성화 확인
   ```

2. **Dry-run 실행**
   ```bash
   npm run cleanup:orphaned-users
   ```

3. **결과 검토**
   - 로그 파일 확인
   - 삭제 대상 사용자 검증
   - 영향 범위 확인

4. **실제 삭제 (신중하게)**
   ```bash
   npm run cleanup:orphaned-users:execute
   ```

5. **삭제 후 확인**
   ```bash
   # 로그 파일에서 삭제 결과 확인
   cat cleanup-orphaned-users-*.log | grep "✓ Deleted user"
   ```

### 테스트 (Staging 환경 권장)

```bash
# 1. Staging 환경 설정
export DATABASE_URL="postgresql://staging..."
export CLERK_SECRET_KEY="sk_test_..."

# 2. Dry-run으로 테스트
npm run cleanup:orphaned-users

# 3. 실제 삭제 테스트
npm run cleanup:orphaned-users:execute

# 4. 데이터베이스 확인
npm run db:studio
```

### 주의사항

- ⚠️ **프로덕션 환경에서는 반드시 백업 후 실행**
- ⚠️ **Dry-run으로 먼저 확인 후 실행**
- ⚠️ **삭제된 데이터는 복구 불가 (PITR로만 복원 가능)**
- ⚠️ **Clerk에서 사용자를 영구 삭제한 경우에만 실행**

### 로그 파일

모든 실행 결과는 다음 형식의 로그 파일에 저장됩니다:

```
cleanup-orphaned-users-2026-02-05T10-30-45-123Z.log
```

로그 파일 내용:
- 타임스탬프별 진행 상황
- Clerk API 호출 결과
- 각 사용자의 영향 범위 분석
- 삭제 성공/실패 결과
- 에러 스택 트레이스 (에러 발생 시)

### 트러블슈팅

#### 1. Clerk API 호출 실패

```
❌ ERROR: Failed to fetch Clerk users after 3 retries
```

**해결 방법:**
- CLERK_SECRET_KEY 환경 변수 확인
- Clerk Dashboard에서 API 키 유효성 확인
- 네트워크 연결 확인

#### 2. 데이터베이스 연결 실패

```
❌ ERROR: DATABASE_URL environment variable is required.
```

**해결 방법:**
- DATABASE_URL 환경 변수 설정 확인
- Neon 데이터베이스 상태 확인

#### 3. 트랜잭션 실패

```
❌ ERROR: Transaction failed, rolling back...
```

**해결 방법:**
- 로그 파일에서 상세 에러 확인
- 데이터베이스 제약 조건 확인
- 네트워크 안정성 확인

### 관련 테이블

스크립트가 영향을 주는 테이블:

1. `users` (메인 테이블)
2. `rankings` (userId 참조)
3. `sessions` (userId 참조)
4. `token_usage` (userId 참조)
5. `daily_aggregates` (userId 참조)
6. `security_audit_log` (userId 참조, nullable)

### 삭제 순서

Foreign Key 제약을 준수하기 위한 삭제 순서:

```typescript
1. rankings (userId FK)
2. dailyAggregates (userId FK)
3. tokenUsage (userId FK)
4. sessions (userId FK)
5. securityAuditLog (userId FK, nullable)
6. users (PK)
```

### 성능 최적화

- Clerk API: 페이지네이션 (500개씩)
- 데이터베이스: 병렬 쿼리 사용
- 트랜잭션: 일괄 처리로 성능 향상

### 예상 실행 시간

- 사용자 1,000명: ~10초
- 사용자 10,000명: ~1분
- 사용자 100,000명: ~5분

(네트워크 속도와 DB 성능에 따라 달라질 수 있음)
