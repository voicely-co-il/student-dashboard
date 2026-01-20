-- Function to get database size
CREATE OR REPLACE FUNCTION get_database_size()
RETURNS TABLE (size_bytes BIGINT, size_pretty TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pg_database_size(current_database())::BIGINT as size_bytes,
    pg_size_pretty(pg_database_size(current_database())) as size_pretty;
END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION get_database_size() TO authenticated;
GRANT EXECUTE ON FUNCTION get_database_size() TO service_role;
