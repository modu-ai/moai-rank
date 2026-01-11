-- =============================================================================
-- V0002: Schema Improvements Migration
-- =============================================================================
-- Description: Comprehensive schema fixes including:
--   1. ON DELETE behaviors for all foreign keys
--   2. NOT NULL constraints for critical columns
--   3. New composite indexes for performance
--   4. ENUM type for period_type
--   5. Increased decimal precision for efficiency scores
--   6. Added createdAt/updatedAt to daily_aggregates
--
-- IMPORTANT:
--   - Run this migration during a maintenance window
--   - Ensure no NULL values exist in columns being made NOT NULL
--   - The RLS policies from migration 0001 will continue to work
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PART 1: Create ENUM type for period_type
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'period_type') THEN
    CREATE TYPE period_type AS ENUM ('daily', 'weekly', 'monthly', 'all_time');
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- PART 2: Handle orphaned records before adding NOT NULL constraints
-- -----------------------------------------------------------------------------
-- Delete any orphaned sessions (where user_id is NULL)
DELETE FROM sessions WHERE user_id IS NULL;

-- Delete any orphaned token_usage records
DELETE FROM token_usage WHERE user_id IS NULL OR session_id IS NULL;

-- Delete any orphaned daily_aggregates records
DELETE FROM daily_aggregates WHERE user_id IS NULL;

-- Delete any orphaned rankings records
DELETE FROM rankings WHERE user_id IS NULL;

-- -----------------------------------------------------------------------------
-- PART 3: Update Foreign Key Constraints with ON DELETE behavior
-- -----------------------------------------------------------------------------

-- 3.1 Sessions table - CASCADE delete when user is deleted
ALTER TABLE sessions
  DROP CONSTRAINT IF EXISTS sessions_user_id_users_id_fk;

ALTER TABLE sessions
  ADD CONSTRAINT sessions_user_id_users_id_fk
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 3.2 Token Usage table - CASCADE delete for both user and session
ALTER TABLE token_usage
  DROP CONSTRAINT IF EXISTS token_usage_session_id_sessions_id_fk;

ALTER TABLE token_usage
  DROP CONSTRAINT IF EXISTS token_usage_user_id_users_id_fk;

ALTER TABLE token_usage
  ADD CONSTRAINT token_usage_session_id_sessions_id_fk
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;

ALTER TABLE token_usage
  ADD CONSTRAINT token_usage_user_id_users_id_fk
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 3.3 Daily Aggregates table - CASCADE delete when user is deleted
ALTER TABLE daily_aggregates
  DROP CONSTRAINT IF EXISTS daily_aggregates_user_id_users_id_fk;

ALTER TABLE daily_aggregates
  ADD CONSTRAINT daily_aggregates_user_id_users_id_fk
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 3.4 Rankings table - CASCADE delete when user is deleted
ALTER TABLE rankings
  DROP CONSTRAINT IF EXISTS rankings_user_id_users_id_fk;

ALTER TABLE rankings
  ADD CONSTRAINT rankings_user_id_users_id_fk
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 3.5 Security Audit Log table - SET NULL to preserve audit history
ALTER TABLE security_audit_log
  DROP CONSTRAINT IF EXISTS security_audit_log_user_id_users_id_fk;

ALTER TABLE security_audit_log
  ADD CONSTRAINT security_audit_log_user_id_users_id_fk
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- PART 4: Add NOT NULL constraints
-- -----------------------------------------------------------------------------

-- 4.1 Sessions.user_id - must belong to a user
ALTER TABLE sessions
  ALTER COLUMN user_id SET NOT NULL;

-- 4.2 Token Usage - must have both user and session
ALTER TABLE token_usage
  ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE token_usage
  ALTER COLUMN session_id SET NOT NULL;

-- 4.3 Daily Aggregates - must belong to a user
ALTER TABLE daily_aggregates
  ALTER COLUMN user_id SET NOT NULL;

-- 4.4 Rankings - must belong to a user
ALTER TABLE rankings
  ALTER COLUMN user_id SET NOT NULL;

-- -----------------------------------------------------------------------------
-- PART 5: Add new indexes for performance
-- -----------------------------------------------------------------------------

-- 5.1 Sessions: composite index for user session queries
CREATE INDEX IF NOT EXISTS sessions_user_ended_at_idx
  ON sessions (user_id, ended_at);

-- 5.2 Rankings: composite index for leaderboard queries
CREATE INDEX IF NOT EXISTS rankings_period_rank_idx
  ON rankings (period_type, period_start, rank_position);

-- 5.3 Security Audit Log: index for IP-based queries
CREATE INDEX IF NOT EXISTS audit_log_ip_address_idx
  ON security_audit_log (ip_address);

-- -----------------------------------------------------------------------------
-- PART 6: Convert period_type column to ENUM
-- -----------------------------------------------------------------------------

-- 6.1 Add new ENUM column
ALTER TABLE rankings
  ADD COLUMN period_type_new period_type;

-- 6.2 Migrate data from varchar to enum
UPDATE rankings SET period_type_new = period_type::period_type;

-- 6.3 Drop old column and rename new one
ALTER TABLE rankings DROP COLUMN period_type;
ALTER TABLE rankings RENAME COLUMN period_type_new TO period_type;

-- 6.4 Add NOT NULL constraint
ALTER TABLE rankings ALTER COLUMN period_type SET NOT NULL;

-- 6.5 Recreate unique constraint (it references period_type)
ALTER TABLE rankings
  DROP CONSTRAINT IF EXISTS rankings_user_id_period_type_period_start_unique;

ALTER TABLE rankings
  ADD CONSTRAINT rankings_user_id_period_type_period_start_unique
  UNIQUE (user_id, period_type, period_start);

-- 6.6 Recreate indexes that reference period_type
DROP INDEX IF EXISTS rankings_period_type_idx;
DROP INDEX IF EXISTS rankings_rank_position_idx;
DROP INDEX IF EXISTS rankings_period_rank_idx;

CREATE INDEX rankings_period_type_idx ON rankings (period_type);
CREATE INDEX rankings_rank_position_idx ON rankings (period_type, rank_position);
CREATE INDEX rankings_period_rank_idx ON rankings (period_type, period_start, rank_position);

-- -----------------------------------------------------------------------------
-- PART 7: Increase decimal precision for efficiency scores
-- -----------------------------------------------------------------------------

-- 7.1 Daily Aggregates - avg_efficiency from (5,4) to (7,4)
ALTER TABLE daily_aggregates
  ALTER COLUMN avg_efficiency TYPE numeric(7, 4);

-- 7.2 Rankings - efficiency_score from (5,4) to (7,4)
ALTER TABLE rankings
  ALTER COLUMN efficiency_score TYPE numeric(7, 4);

-- -----------------------------------------------------------------------------
-- PART 8: Add timestamp columns to daily_aggregates
-- -----------------------------------------------------------------------------

-- 8.1 Add created_at column with default
ALTER TABLE daily_aggregates
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 8.2 Add updated_at column with default
ALTER TABLE daily_aggregates
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 8.3 Create trigger function for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8.4 Create trigger for daily_aggregates
DROP TRIGGER IF EXISTS update_daily_aggregates_updated_at ON daily_aggregates;
CREATE TRIGGER update_daily_aggregates_updated_at
  BEFORE UPDATE ON daily_aggregates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8.5 Create trigger for rankings (already has updated_at column)
DROP TRIGGER IF EXISTS update_rankings_updated_at ON rankings;
CREATE TRIGGER update_rankings_updated_at
  BEFORE UPDATE ON rankings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8.6 Create trigger for users (already has updated_at column)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- PART 9: Verification queries (commented out, run manually to verify)
-- -----------------------------------------------------------------------------
--
-- Verify foreign key constraints:
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid IN ('sessions'::regclass, 'token_usage'::regclass,
--                    'daily_aggregates'::regclass, 'rankings'::regclass,
--                    'security_audit_log'::regclass)
--   AND contype = 'f';
--
-- Verify NOT NULL constraints:
-- SELECT table_name, column_name, is_nullable
-- FROM information_schema.columns
-- WHERE table_name IN ('sessions', 'token_usage', 'daily_aggregates', 'rankings')
--   AND column_name = 'user_id';
--
-- Verify indexes:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename IN ('sessions', 'rankings', 'security_audit_log');
--
-- Verify enum type:
-- SELECT enumlabel FROM pg_enum
-- WHERE enumtypid = 'period_type'::regtype;
-- -----------------------------------------------------------------------------

-- =============================================================================
-- Migration Complete
-- =============================================================================
--
-- Summary of changes:
-- 1. Created period_type ENUM with values: daily, weekly, monthly, all_time
-- 2. Added ON DELETE CASCADE to: sessions, token_usage, daily_aggregates, rankings
-- 3. Added ON DELETE SET NULL to: security_audit_log (preserves audit history)
-- 4. Added NOT NULL to: sessions.user_id, token_usage.user_id, token_usage.session_id,
--    daily_aggregates.user_id, rankings.user_id
-- 5. Added indexes: sessions_user_ended_at_idx, rankings_period_rank_idx, audit_log_ip_address_idx
-- 6. Converted rankings.period_type from VARCHAR(20) to ENUM
-- 7. Increased precision: avg_efficiency (5,4)->(7,4), efficiency_score (5,4)->(7,4)
-- 8. Added created_at/updated_at to daily_aggregates with auto-update trigger
-- 9. Added auto-update triggers for updated_at on all tables with that column
-- =============================================================================
