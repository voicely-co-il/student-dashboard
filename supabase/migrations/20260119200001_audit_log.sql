-- =====================================================
-- VOICELY SECURITY: Audit Log System
-- =====================================================
-- Tracks access to sensitive data for security and
-- compliance purposes (GDPR, etc.)
-- =====================================================

-- Create audit log table
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who performed the action
  user_id UUID REFERENCES auth.users(id),
  user_role TEXT,

  -- What action was performed
  action TEXT NOT NULL CHECK (action IN (
    'view_transcription',
    'view_recording',
    'download_recording',
    'view_ai_analysis',
    'view_learning_insights',
    'export_user_data',
    'delete_user_data',
    'change_permissions',
    'admin_impersonate',
    'login',
    'logout',
    'failed_login'
  )),

  -- What resource was accessed
  resource_type TEXT CHECK (resource_type IN (
    'transcription',
    'recording',
    'ai_analysis',
    'learning_insight',
    'user',
    'lesson',
    'session'
  )),
  resource_id UUID,

  -- Additional context
  metadata JSONB DEFAULT '{}',

  -- Request information
  ip_address INET,
  user_agent TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

-- Enable RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON audit_log FOR SELECT
USING (public.is_admin());

-- Users can view their own audit entries
CREATE POLICY "Users can view own audit entries"
ON audit_log FOR SELECT
USING (auth.uid() = user_id);

-- Only service role can insert audit logs (from Edge Functions)
CREATE POLICY "Service can insert audit logs"
ON audit_log FOR INSERT
WITH CHECK (true); -- Edge Functions use service role

-- No one can update or delete audit logs (immutable)
-- (No UPDATE or DELETE policies = denied)

-- =====================================================
-- AUDIT HELPER FUNCTION
-- Call this from Edge Functions to log actions
-- =====================================================

CREATE OR REPLACE FUNCTION public.log_audit(
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}',
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_user_role TEXT;
  v_log_id UUID;
BEGIN
  -- Get user role
  SELECT role INTO v_user_role
  FROM public.users
  WHERE id = p_user_id;

  -- Insert audit log
  INSERT INTO public.audit_log (
    user_id,
    user_role,
    action,
    resource_type,
    resource_id,
    metadata,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    v_user_role,
    p_action,
    p_resource_type,
    p_resource_id,
    p_metadata,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role only
REVOKE ALL ON FUNCTION public.log_audit FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_audit TO service_role;

-- =====================================================
-- DATA RETENTION: Auto-delete old audit logs
-- Keep logs for 2 years (adjust as needed for compliance)
-- =====================================================

-- Create a function to clean old logs
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.audit_log
  WHERE created_at < NOW() - INTERVAL '2 years';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule this to run weekly via pg_cron (if enabled) or Vercel Cron

-- =====================================================
-- VIEW: Audit Summary for Admins
-- =====================================================

CREATE OR REPLACE VIEW public.audit_summary AS
SELECT
  DATE_TRUNC('day', created_at) as day,
  action,
  resource_type,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) as unique_users
FROM public.audit_log
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at), action, resource_type
ORDER BY day DESC, count DESC;

-- Only admins can view the summary
GRANT SELECT ON public.audit_summary TO authenticated;
