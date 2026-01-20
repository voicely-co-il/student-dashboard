-- Function to get table sizes
CREATE OR REPLACE FUNCTION get_table_sizes()
RETURNS TABLE (
  table_name TEXT,
  total_size TEXT,
  total_bytes BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.tablename::TEXT as table_name,
    pg_size_pretty(pg_total_relation_size('"' || t.schemaname || '"."' || t.tablename || '"')) as total_size,
    pg_total_relation_size('"' || t.schemaname || '"."' || t.tablename || '"')::BIGINT as total_bytes
  FROM pg_tables t
  WHERE t.schemaname = 'public'
  ORDER BY pg_total_relation_size('"' || t.schemaname || '"."' || t.tablename || '"') DESC
  LIMIT 20;
END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION get_table_sizes() TO authenticated;
GRANT EXECUTE ON FUNCTION get_table_sizes() TO service_role;
