-- Chat System Tables
-- For Voicely website chatbot with leads and live chat

-- Chat sessions table
CREATE TABLE public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Visitor info
  visitor_info JSONB DEFAULT '{}'::jsonb,
  -- { name, email, phone, etc. }

  -- Messages history
  messages JSONB DEFAULT '[]'::jsonb,
  -- [{ role: 'user'|'assistant', content: '...', timestamp: '...' }]

  -- Session metadata
  source TEXT DEFAULT 'widget', -- 'widget', 'chat_page', 'embed'
  page_url TEXT,
  user_agent TEXT,
  ip_address TEXT,

  -- Live chat state
  is_live BOOLEAN DEFAULT false, -- true if human agent is responding
  assigned_to UUID REFERENCES auth.users(id),

  -- Status
  status TEXT DEFAULT 'active', -- 'active', 'closed', 'archived'

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Leads table (from chat and other sources)
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contact info
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,

  -- Lead details
  notes TEXT,
  source TEXT DEFAULT 'chat', -- 'chat_widget', 'chat_page', 'embed', 'manual'

  -- Related chat session
  chat_session_id UUID REFERENCES public.chat_sessions(id),

  -- Lead status
  status TEXT DEFAULT 'new', -- 'new', 'contacted', 'qualified', 'converted', 'lost'

  -- Assignment
  assigned_to UUID REFERENCES auth.users(id),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  -- { interested_in: 'juniors'|'private', age_group: '10-12', etc. }

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  contacted_at TIMESTAMP WITH TIME ZONE,
  converted_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_sessions
-- Service role can do everything
CREATE POLICY "Service role full access to chat_sessions"
  ON public.chat_sessions FOR ALL
  USING (auth.role() = 'service_role');

-- Teachers can view all sessions
CREATE POLICY "Teachers can view chat_sessions"
  ON public.chat_sessions FOR SELECT
  USING (auth.role() = 'authenticated');

-- Teachers can update sessions (for live chat)
CREATE POLICY "Teachers can update chat_sessions"
  ON public.chat_sessions FOR UPDATE
  USING (auth.role() = 'authenticated');

-- RLS Policies for leads
-- Service role can do everything
CREATE POLICY "Service role full access to leads"
  ON public.leads FOR ALL
  USING (auth.role() = 'service_role');

-- Teachers can view and manage leads
CREATE POLICY "Teachers can view leads"
  ON public.leads FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Teachers can insert leads"
  ON public.leads FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Teachers can update leads"
  ON public.leads FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Indexes
CREATE INDEX idx_chat_sessions_status ON public.chat_sessions(status);
CREATE INDEX idx_chat_sessions_created ON public.chat_sessions(created_at DESC);
CREATE INDEX idx_chat_sessions_last_message ON public.chat_sessions(last_message_at DESC);
CREATE INDEX idx_chat_sessions_is_live ON public.chat_sessions(is_live) WHERE is_live = true;

CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_created ON public.leads(created_at DESC);
CREATE INDEX idx_leads_source ON public.leads(source);
CREATE INDEX idx_leads_phone ON public.leads(phone);
CREATE INDEX idx_leads_email ON public.leads(email);

-- Triggers for updated_at
CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for live chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_sessions;
