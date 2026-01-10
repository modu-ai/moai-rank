-- =============================================================================
-- V008: Row-Level Security (RLS) Migration for Neon PostgreSQL
-- =============================================================================
-- CVSS Score: 8.1 (High)
-- Description: Enables RLS policies to ensure users can only access their own data
--
-- IMPORTANT: Run this migration with database owner privileges
-- After running, configure your application to set app.current_user_id
-- before each request using: SET LOCAL app.current_user_id = 'user-uuid';
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper function to get current user ID from session context
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_current_user_id() RETURNS uuid AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_user_id', true), '')::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- Sessions Table RLS
-- -----------------------------------------------------------------------------
-- Enable RLS on sessions table
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Users can only view their own sessions
CREATE POLICY "users_select_own_sessions" ON sessions
  FOR SELECT
  USING (user_id = get_current_user_id());

-- Users can only insert their own sessions
CREATE POLICY "users_insert_own_sessions" ON sessions
  FOR INSERT
  WITH CHECK (user_id = get_current_user_id());

-- Users can only update their own sessions
CREATE POLICY "users_update_own_sessions" ON sessions
  FOR UPDATE
  USING (user_id = get_current_user_id())
  WITH CHECK (user_id = get_current_user_id());

-- Users can only delete their own sessions
CREATE POLICY "users_delete_own_sessions" ON sessions
  FOR DELETE
  USING (user_id = get_current_user_id());

-- -----------------------------------------------------------------------------
-- Token Usage Table RLS
-- -----------------------------------------------------------------------------
-- Enable RLS on token_usage table
ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;

-- Users can only view their own token usage
CREATE POLICY "users_select_own_token_usage" ON token_usage
  FOR SELECT
  USING (user_id = get_current_user_id());

-- Users can only insert their own token usage
CREATE POLICY "users_insert_own_token_usage" ON token_usage
  FOR INSERT
  WITH CHECK (user_id = get_current_user_id());

-- Users can only update their own token usage
CREATE POLICY "users_update_own_token_usage" ON token_usage
  FOR UPDATE
  USING (user_id = get_current_user_id())
  WITH CHECK (user_id = get_current_user_id());

-- Users can only delete their own token usage
CREATE POLICY "users_delete_own_token_usage" ON token_usage
  FOR DELETE
  USING (user_id = get_current_user_id());

-- -----------------------------------------------------------------------------
-- Daily Aggregates Table RLS
-- -----------------------------------------------------------------------------
-- Enable RLS on daily_aggregates table
ALTER TABLE daily_aggregates ENABLE ROW LEVEL SECURITY;

-- Users can only view their own daily aggregates
CREATE POLICY "users_select_own_daily_aggregates" ON daily_aggregates
  FOR SELECT
  USING (user_id = get_current_user_id());

-- Users can only insert their own daily aggregates
CREATE POLICY "users_insert_own_daily_aggregates" ON daily_aggregates
  FOR INSERT
  WITH CHECK (user_id = get_current_user_id());

-- Users can only update their own daily aggregates
CREATE POLICY "users_update_own_daily_aggregates" ON daily_aggregates
  FOR UPDATE
  USING (user_id = get_current_user_id())
  WITH CHECK (user_id = get_current_user_id());

-- Users can only delete their own daily aggregates
CREATE POLICY "users_delete_own_daily_aggregates" ON daily_aggregates
  FOR DELETE
  USING (user_id = get_current_user_id());

-- -----------------------------------------------------------------------------
-- Rankings Table RLS
-- -----------------------------------------------------------------------------
-- Enable RLS on rankings table
ALTER TABLE rankings ENABLE ROW LEVEL SECURITY;

-- Rankings are publicly viewable for leaderboard functionality
-- But only users can modify their own rankings (system-managed)
CREATE POLICY "public_select_rankings" ON rankings
  FOR SELECT
  USING (true);

-- Only allow insert/update for own rankings (typically system-managed)
CREATE POLICY "users_insert_own_rankings" ON rankings
  FOR INSERT
  WITH CHECK (user_id = get_current_user_id());

CREATE POLICY "users_update_own_rankings" ON rankings
  FOR UPDATE
  USING (user_id = get_current_user_id())
  WITH CHECK (user_id = get_current_user_id());

CREATE POLICY "users_delete_own_rankings" ON rankings
  FOR DELETE
  USING (user_id = get_current_user_id());

-- -----------------------------------------------------------------------------
-- Users Table RLS
-- -----------------------------------------------------------------------------
-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can view public profiles (privacy_mode = false) or their own profile
CREATE POLICY "public_profiles_viewable" ON users
  FOR SELECT
  USING (
    privacy_mode = false
    OR id = get_current_user_id()
  );

-- Users can only insert their own profile (during registration)
CREATE POLICY "users_insert_own_profile" ON users
  FOR INSERT
  WITH CHECK (id = get_current_user_id());

-- Users can only update their own profile
CREATE POLICY "users_update_own_profile" ON users
  FOR UPDATE
  USING (id = get_current_user_id())
  WITH CHECK (id = get_current_user_id());

-- Users can only delete their own profile
CREATE POLICY "users_delete_own_profile" ON users
  FOR DELETE
  USING (id = get_current_user_id());

-- -----------------------------------------------------------------------------
-- Security Audit Log Table RLS
-- -----------------------------------------------------------------------------
-- Enable RLS on security_audit_log table
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can only view their own security audit logs
CREATE POLICY "users_select_own_audit_logs" ON security_audit_log
  FOR SELECT
  USING (user_id = get_current_user_id());

-- Only system can insert audit logs (no user policy needed for insert)
-- This is handled by the application using a service role

-- -----------------------------------------------------------------------------
-- Service Role Bypass
-- -----------------------------------------------------------------------------
-- Create a service role that bypasses RLS for administrative operations
-- This role should be used by background jobs and administrative scripts
--
-- IMPORTANT: Only use this role for trusted server-side operations
-- Never expose this role to client applications
--
-- To create the service role (run as superuser):
-- CREATE ROLE moai_rank_service NOLOGIN;
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO moai_rank_service;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO moai_rank_service;
--
-- To bypass RLS for service operations:
-- SET ROLE moai_rank_service;
-- ... perform operations ...
-- RESET ROLE;

-- -----------------------------------------------------------------------------
-- Application Integration Notes
-- -----------------------------------------------------------------------------
--
-- To use RLS in your application:
--
-- 1. Before each request, set the current user ID:
--    await db.execute(sql`SET LOCAL app.current_user_id = ${userId}`);
--
-- 2. For Drizzle ORM with Neon serverless, wrap queries in a transaction:
--    await db.transaction(async (tx) => {
--      await tx.execute(sql`SET LOCAL app.current_user_id = ${userId}`);
--      const result = await tx.select().from(sessions);
--      return result;
--    });
--
-- 3. For public endpoints (like leaderboard), use a null or service role context
--
-- 4. For administrative operations, use the service role
-- -----------------------------------------------------------------------------
