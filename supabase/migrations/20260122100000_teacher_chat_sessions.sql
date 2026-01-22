-- ============================================
-- Teacher Chat Sessions Enhancement
-- Adds title column and RPC functions for
-- ChatGPT-style conversation history sidebar
-- ============================================

-- Add title column for conversation names
ALTER TABLE public.student_chat_sessions
ADD COLUMN IF NOT EXISTS title TEXT;

-- Index for efficient teacher sessions listing (ordered by updated_at)
CREATE INDEX IF NOT EXISTS idx_chat_sessions_teacher_list
ON public.student_chat_sessions(user_id, chat_type, updated_at DESC)
WHERE chat_type = 'teacher' AND status != 'archived';

-- ============================================
-- RPC: Get all teacher chat sessions for sidebar
-- Returns sessions grouped by most recent first
-- ============================================
CREATE OR REPLACE FUNCTION get_teacher_chat_sessions(
  p_user_id UUID,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  message_count INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  preview TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    scs.id,
    COALESCE(scs.title, 'שיחה חדשה') AS title,
    scs.message_count,
    scs.created_at,
    scs.updated_at,
    -- Extract first user message as preview (truncated to 60 chars)
    LEFT(
      (SELECT m->>'content'
       FROM jsonb_array_elements(scs.messages) m
       WHERE m->>'role' = 'user'
       LIMIT 1),
      60
    ) AS preview
  FROM public.student_chat_sessions scs
  WHERE scs.user_id = p_user_id
    AND scs.chat_type = 'teacher'
    AND scs.status != 'archived'
  ORDER BY scs.updated_at DESC
  LIMIT p_limit;
END;
$$;

-- ============================================
-- RPC: Delete (soft) a teacher chat session
-- Sets status to 'archived' instead of hard delete
-- ============================================
CREATE OR REPLACE FUNCTION delete_teacher_chat_session(
  p_session_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.student_chat_sessions
  SET status = 'archived',
      updated_at = NOW()
  WHERE id = p_session_id
    AND user_id = p_user_id
    AND chat_type = 'teacher';

  RETURN FOUND;
END;
$$;

-- ============================================
-- RPC: Get active teacher session (for auto-resume)
-- Returns most recent active session within time window
-- ============================================
CREATE OR REPLACE FUNCTION get_active_teacher_session(
  p_user_id UUID,
  p_max_age_hours INT DEFAULT 24
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  messages JSONB,
  message_count INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    scs.id,
    scs.title,
    scs.messages,
    scs.message_count,
    scs.created_at,
    scs.updated_at
  FROM public.student_chat_sessions scs
  WHERE scs.user_id = p_user_id
    AND scs.chat_type = 'teacher'
    AND scs.status = 'active'
    AND scs.updated_at > NOW() - (p_max_age_hours || ' hours')::INTERVAL
  ORDER BY scs.updated_at DESC
  LIMIT 1;
END;
$$;
