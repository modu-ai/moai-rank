-- =============================================================================
-- V0003: Enable UUID v7 Support (Optional)
-- =============================================================================
-- Description: Enables UUID v7 generation using Neon's pg_uuidv7 extension
--
-- Benefits of UUID v7 over UUID v4:
--   - Time-ordered (sortable by creation time)
--   - Better B-tree index performance (sequential inserts)
--   - 33% faster than UUID v4
--   - Extract timestamp from UUID
--
-- IMPORTANT:
--   - This migration is OPTIONAL
--   - Existing UUID v4 values remain valid (no data migration needed)
--   - Only NEW records will use UUID v7
--   - Requires Neon PostgreSQL (pg_uuidv7 extension pre-installed)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PART 1: Enable pg_uuidv7 extension
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_uuidv7;

-- -----------------------------------------------------------------------------
-- PART 2: Create wrapper function for consistent usage
-- -----------------------------------------------------------------------------
-- This function provides a consistent interface for UUID v7 generation
-- and allows for easy switching between native (PG18) and extension-based generation

CREATE OR REPLACE FUNCTION gen_uuid_v7()
RETURNS uuid AS $$
BEGIN
  -- Use pg_uuidv7 extension function
  RETURN uuid_generate_v7();
END;
$$ LANGUAGE plpgsql VOLATILE;

COMMENT ON FUNCTION gen_uuid_v7() IS 'Generates a time-ordered UUID v7 using pg_uuidv7 extension';

-- -----------------------------------------------------------------------------
-- PART 3: Update default values for primary keys to use UUID v7
-- -----------------------------------------------------------------------------
-- Note: This only affects NEW records. Existing UUID v4 values remain unchanged.

-- 3.1 Users table
ALTER TABLE users
  ALTER COLUMN id SET DEFAULT uuid_generate_v7();

-- 3.2 Sessions table
ALTER TABLE sessions
  ALTER COLUMN id SET DEFAULT uuid_generate_v7();

-- 3.3 Token Usage table
ALTER TABLE token_usage
  ALTER COLUMN id SET DEFAULT uuid_generate_v7();

-- 3.4 Daily Aggregates table
ALTER TABLE daily_aggregates
  ALTER COLUMN id SET DEFAULT uuid_generate_v7();

-- 3.5 Rankings table
ALTER TABLE rankings
  ALTER COLUMN id SET DEFAULT uuid_generate_v7();

-- 3.6 Security Audit Log table
ALTER TABLE security_audit_log
  ALTER COLUMN id SET DEFAULT uuid_generate_v7();

-- -----------------------------------------------------------------------------
-- PART 4: Utility functions for UUID v7
-- -----------------------------------------------------------------------------

-- 4.1 Extract timestamp from UUID v7
CREATE OR REPLACE FUNCTION uuid_v7_timestamp(uuid_val uuid)
RETURNS timestamptz AS $$
BEGIN
  RETURN uuid_v7_to_timestamptz(uuid_val);
EXCEPTION
  WHEN OTHERS THEN
    -- Return NULL for non-v7 UUIDs
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION uuid_v7_timestamp(uuid) IS 'Extracts the embedded timestamp from a UUID v7. Returns NULL for non-v7 UUIDs.';

-- 4.2 Check if UUID is version 7
CREATE OR REPLACE FUNCTION is_uuid_v7(uuid_val uuid)
RETURNS boolean AS $$
DECLARE
  version_char char;
BEGIN
  -- UUID version is encoded in the 13th character (4 bits at position 48-51)
  version_char := substring(uuid_val::text from 15 for 1);
  RETURN version_char = '7';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION is_uuid_v7(uuid) IS 'Returns TRUE if the UUID is version 7';

-- -----------------------------------------------------------------------------
-- PART 5: Verification queries (run manually to verify)
-- -----------------------------------------------------------------------------
--
-- Test UUID v7 generation:
-- SELECT uuid_generate_v7() AS new_uuid_v7;
--
-- Test timestamp extraction:
-- SELECT
--   uuid_generate_v7() AS uuid_v7,
--   uuid_v7_to_timestamptz(uuid_generate_v7()) AS extracted_timestamp;
--
-- Verify extension is installed:
-- SELECT * FROM pg_extension WHERE extname = 'pg_uuidv7';
--
-- Check default values:
-- SELECT
--   table_name,
--   column_name,
--   column_default
-- FROM information_schema.columns
-- WHERE column_name = 'id'
--   AND table_name IN ('users', 'sessions', 'token_usage', 'daily_aggregates', 'rankings', 'security_audit_log');
--
-- Compare existing UUIDs:
-- SELECT
--   COUNT(*) as total,
--   COUNT(*) FILTER (WHERE is_uuid_v7(id)) as uuid_v7_count,
--   COUNT(*) FILTER (WHERE NOT is_uuid_v7(id)) as uuid_v4_count
-- FROM users;
-- -----------------------------------------------------------------------------

-- =============================================================================
-- Migration Complete
-- =============================================================================
--
-- Summary of changes:
-- 1. Enabled pg_uuidv7 extension
-- 2. Created gen_uuid_v7() wrapper function
-- 3. Updated all tables to use uuid_generate_v7() as default for id columns
-- 4. Added utility functions: uuid_v7_timestamp(), is_uuid_v7()
--
-- Rollback (if needed):
-- ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid();
-- ALTER TABLE sessions ALTER COLUMN id SET DEFAULT gen_random_uuid();
-- ALTER TABLE token_usage ALTER COLUMN id SET DEFAULT gen_random_uuid();
-- ALTER TABLE daily_aggregates ALTER COLUMN id SET DEFAULT gen_random_uuid();
-- ALTER TABLE rankings ALTER COLUMN id SET DEFAULT gen_random_uuid();
-- ALTER TABLE security_audit_log ALTER COLUMN id SET DEFAULT gen_random_uuid();
-- DROP FUNCTION IF EXISTS gen_uuid_v7();
-- DROP FUNCTION IF EXISTS uuid_v7_timestamp(uuid);
-- DROP FUNCTION IF EXISTS is_uuid_v7(uuid);
-- DROP EXTENSION IF EXISTS pg_uuidv7;
-- =============================================================================
