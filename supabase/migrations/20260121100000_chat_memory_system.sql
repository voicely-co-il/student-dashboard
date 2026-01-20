-- ============================================
-- Chat Memory System for Voicely
-- Phase 1: Foundation tables and functions
-- ============================================

-- Note: vector extension already enabled in extensions schema

-- ============================================
-- 1. USER MEMORIES - Long-term facts about users
-- ============================================
CREATE TABLE public.user_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Memory content
  memory_type TEXT NOT NULL CHECK (memory_type IN ('fact', 'preference', 'goal', 'challenge', 'achievement')),
  content TEXT NOT NULL,
  confidence FLOAT DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  importance FLOAT DEFAULT 0.5 CHECK (importance >= 0 AND importance <= 1),

  -- Metadata
  source TEXT DEFAULT 'chat' CHECK (source IN ('chat', 'lesson', 'recording', 'manual', 'system')),
  source_id UUID, -- reference to original source (chat_session, lesson, etc.)

  -- Embeddings for semantic search
  embedding extensions.vector(1536),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_accessed_at TIMESTAMPTZ,

  -- Soft delete and versioning
  is_active BOOLEAN DEFAULT true,
  superseded_by UUID REFERENCES public.user_memories(id)
);

-- Indexes
CREATE INDEX idx_user_memories_user_id ON public.user_memories(user_id, is_active);
CREATE INDEX idx_user_memories_type ON public.user_memories(user_id, memory_type) WHERE is_active = true;
CREATE INDEX idx_user_memories_embedding ON public.user_memories
  USING ivfflat (embedding extensions.vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_user_memories_importance ON public.user_memories(user_id, importance DESC) WHERE is_active = true;

-- ============================================
-- 2. STUDENT CHAT SESSIONS - Extended for memory
-- ============================================
CREATE TABLE public.student_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Messages history
  messages JSONB DEFAULT '[]'::jsonb,
  -- [{ id, role, content, timestamp, actions? }]

  -- Memory tracking
  summary TEXT, -- AI-generated summary
  extracted_memories UUID[] DEFAULT '{}', -- IDs of memories extracted from this session
  context_used UUID[] DEFAULT '{}', -- IDs of memories retrieved for this session

  -- Session metadata
  chat_type TEXT DEFAULT 'student' CHECK (chat_type IN ('student', 'teacher')),
  message_count INTEGER DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'summarized', 'archived')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_message_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_student_chat_sessions_user ON public.student_chat_sessions(user_id, status);
CREATE INDEX idx_student_chat_sessions_updated ON public.student_chat_sessions(user_id, updated_at DESC);
CREATE INDEX idx_student_chat_sessions_active ON public.student_chat_sessions(user_id, last_message_at DESC)
  WHERE status = 'active';

-- ============================================
-- 3. MEMORY OPERATIONS LOG - For debugging and analytics
-- ============================================
CREATE TABLE public.memory_operations_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.student_chat_sessions(id) ON DELETE SET NULL,

  -- Operation details
  operation TEXT NOT NULL CHECK (operation IN ('extract', 'update', 'merge', 'delete', 'retrieve', 'summarize')),

  -- Data
  input_data JSONB,
  output_data JSONB,
  memories_affected UUID[],

  -- Performance
  tokens_used INTEGER,
  latency_ms INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for debugging
CREATE INDEX idx_memory_ops_user ON public.memory_operations_log(user_id, created_at DESC);
CREATE INDEX idx_memory_ops_session ON public.memory_operations_log(session_id);

-- ============================================
-- 4. RPC FUNCTIONS
-- ============================================

-- Function to search memories by vector similarity
CREATE OR REPLACE FUNCTION match_user_memories(
  query_embedding extensions.vector(1536),
  p_user_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  memory_type TEXT,
  content TEXT,
  confidence FLOAT,
  importance FLOAT,
  similarity FLOAT,
  created_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    um.id,
    um.memory_type,
    um.content,
    um.confidence,
    um.importance,
    1 - (um.embedding OPERATOR(extensions.<=>) query_embedding) AS similarity,
    um.created_at,
    um.last_accessed_at
  FROM public.user_memories um
  WHERE um.user_id = p_user_id
    AND um.is_active = true
    AND um.embedding IS NOT NULL
    AND 1 - (um.embedding OPERATOR(extensions.<=>) query_embedding) > match_threshold
  ORDER BY
    -- Combined score: similarity * importance * recency_boost
    (1 - (um.embedding OPERATOR(extensions.<=>) query_embedding)) * um.importance *
    CASE
      WHEN um.last_accessed_at > NOW() - INTERVAL '1 day' THEN 1.2
      WHEN um.last_accessed_at > NOW() - INTERVAL '7 days' THEN 1.1
      ELSE 1.0
    END DESC
  LIMIT match_count;
END;
$$;

-- Function to get recent active session for user
CREATE OR REPLACE FUNCTION get_active_chat_session(
  p_user_id UUID,
  p_chat_type TEXT DEFAULT 'student',
  p_max_age_hours INT DEFAULT 24
)
RETURNS TABLE (
  id UUID,
  messages JSONB,
  summary TEXT,
  message_count INTEGER,
  created_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    scs.id,
    scs.messages,
    scs.summary,
    scs.message_count,
    scs.created_at,
    scs.last_message_at
  FROM public.student_chat_sessions scs
  WHERE scs.user_id = p_user_id
    AND scs.chat_type = p_chat_type
    AND scs.status = 'active'
    AND scs.updated_at > NOW() - (p_max_age_hours || ' hours')::INTERVAL
  ORDER BY scs.updated_at DESC
  LIMIT 1;
END;
$$;

-- Function to update memory access timestamp
CREATE OR REPLACE FUNCTION touch_memories(memory_ids UUID[])
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.user_memories
  SET last_accessed_at = NOW()
  WHERE id = ANY(memory_ids);
END;
$$;

-- Function to get user memory stats
CREATE OR REPLACE FUNCTION get_user_memory_stats(p_user_id UUID)
RETURNS TABLE (
  total_memories BIGINT,
  facts_count BIGINT,
  preferences_count BIGINT,
  goals_count BIGINT,
  challenges_count BIGINT,
  achievements_count BIGINT,
  avg_confidence FLOAT,
  oldest_memory TIMESTAMPTZ,
  newest_memory TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) AS total_memories,
    COUNT(*) FILTER (WHERE memory_type = 'fact') AS facts_count,
    COUNT(*) FILTER (WHERE memory_type = 'preference') AS preferences_count,
    COUNT(*) FILTER (WHERE memory_type = 'goal') AS goals_count,
    COUNT(*) FILTER (WHERE memory_type = 'challenge') AS challenges_count,
    COUNT(*) FILTER (WHERE memory_type = 'achievement') AS achievements_count,
    AVG(confidence)::FLOAT AS avg_confidence,
    MIN(created_at) AS oldest_memory,
    MAX(created_at) AS newest_memory
  FROM public.user_memories
  WHERE user_id = p_user_id AND is_active = true;
END;
$$;

-- ============================================
-- 5. ROW LEVEL SECURITY
-- ============================================

-- Enable RLS
ALTER TABLE public.user_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_operations_log ENABLE ROW LEVEL SECURITY;

-- User memories: users can only see their own
CREATE POLICY "Users can view own memories"
  ON public.user_memories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own memories"
  ON public.user_memories FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role full access to user_memories"
  ON public.user_memories FOR ALL
  USING (auth.role() = 'service_role');

-- Student chat sessions: users can only see their own
CREATE POLICY "Users can view own chat sessions"
  ON public.student_chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat sessions"
  ON public.student_chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat sessions"
  ON public.student_chat_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to student_chat_sessions"
  ON public.student_chat_sessions FOR ALL
  USING (auth.role() = 'service_role');

-- Memory operations log: service role only
CREATE POLICY "Service role full access to memory_operations_log"
  ON public.memory_operations_log FOR ALL
  USING (auth.role() = 'service_role');

-- Admins can view logs
CREATE POLICY "Admins can view memory_operations_log"
  ON public.memory_operations_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- ============================================
-- 6. TRIGGERS
-- ============================================

-- Updated_at trigger for user_memories
CREATE TRIGGER update_user_memories_updated_at
  BEFORE UPDATE ON public.user_memories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Updated_at trigger for student_chat_sessions
CREATE TRIGGER update_student_chat_sessions_updated_at
  BEFORE UPDATE ON public.student_chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 7. REALTIME
-- ============================================

-- Enable realtime for chat sessions (for live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_chat_sessions;

-- ============================================
-- 8. COMMENTS
-- ============================================

COMMENT ON TABLE public.user_memories IS 'Long-term memories about users extracted from chat conversations';
COMMENT ON TABLE public.student_chat_sessions IS 'Chat sessions for students/teachers with message history';
COMMENT ON TABLE public.memory_operations_log IS 'Log of all memory operations for debugging';

COMMENT ON COLUMN public.user_memories.memory_type IS 'fact, preference, goal, challenge, or achievement';
COMMENT ON COLUMN public.user_memories.confidence IS '0-1 score, decreases when contradicted';
COMMENT ON COLUMN public.user_memories.importance IS '0-1 score, affects retrieval priority';
COMMENT ON COLUMN public.user_memories.superseded_by IS 'If memory was updated, points to newer version';

COMMENT ON COLUMN public.student_chat_sessions.summary IS 'AI-generated summary when session is closed';
COMMENT ON COLUMN public.student_chat_sessions.extracted_memories IS 'UUIDs of memories extracted from this session';
COMMENT ON COLUMN public.student_chat_sessions.context_used IS 'UUIDs of memories used as context in this session';
