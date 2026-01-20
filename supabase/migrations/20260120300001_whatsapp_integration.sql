-- WhatsApp Business API Integration
-- Tables for WhatsApp Cloud API integration

-- WhatsApp business accounts (can have multiple phone numbers)
CREATE TABLE public.whatsapp_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Meta Business Account info
  waba_id TEXT NOT NULL UNIQUE, -- WhatsApp Business Account ID
  phone_number_id TEXT NOT NULL UNIQUE, -- Phone Number ID from Meta
  display_phone_number TEXT NOT NULL, -- The actual phone number (+972...)
  business_name TEXT,

  -- API credentials (stored securely)
  access_token_encrypted TEXT, -- Encrypted permanent access token

  -- Account status
  status TEXT DEFAULT 'pending', -- 'pending', 'active', 'suspended', 'disconnected'
  quality_rating TEXT, -- 'GREEN', 'YELLOW', 'RED'
  messaging_limit TEXT, -- 'TIER_1K', 'TIER_10K', 'TIER_100K', 'UNLIMITED'

  -- Webhook config
  webhook_verify_token TEXT,
  webhook_secret TEXT,

  -- Settings
  default_language TEXT DEFAULT 'he',
  auto_reply_enabled BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE
);

-- WhatsApp conversations (linked to chat_sessions)
CREATE TABLE public.whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- WhatsApp identifiers
  wa_conversation_id TEXT, -- WhatsApp's conversation ID
  wa_phone_number TEXT NOT NULL, -- Customer's phone number
  wa_profile_name TEXT, -- Customer's WhatsApp profile name

  -- Link to our chat system
  chat_session_id UUID REFERENCES public.chat_sessions(id),
  whatsapp_account_id UUID REFERENCES public.whatsapp_accounts(id) NOT NULL,

  -- Conversation state
  status TEXT DEFAULT 'active', -- 'active', 'closed', 'expired'
  conversation_type TEXT, -- 'marketing', 'utility', 'authentication', 'service'

  -- 24-hour window tracking
  last_customer_message_at TIMESTAMP WITH TIME ZONE,
  window_expires_at TIMESTAMP WITH TIME ZONE, -- 24 hours after last customer message

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- WhatsApp messages (for detailed tracking)
CREATE TABLE public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- WhatsApp identifiers
  wa_message_id TEXT UNIQUE NOT NULL, -- WhatsApp's message ID (wamid.xxx)

  -- References
  conversation_id UUID REFERENCES public.whatsapp_conversations(id) NOT NULL,

  -- Message details
  direction TEXT NOT NULL, -- 'inbound', 'outbound'
  message_type TEXT NOT NULL, -- 'text', 'image', 'audio', 'video', 'document', 'sticker', 'location', 'contacts', 'interactive', 'template'

  -- Content (depends on type)
  content JSONB NOT NULL,
  -- text: { body: '...' }
  -- audio: { id, mime_type, voice: true/false }
  -- template: { name, language, components }
  -- interactive: { type, header?, body, footer?, action }

  -- Status tracking (for outbound)
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'read', 'failed'
  status_updated_at TIMESTAMP WITH TIME ZONE,
  error_code TEXT,
  error_message TEXT,

  -- Pricing (for analytics)
  pricing_category TEXT, -- 'business_initiated', 'user_initiated'
  pricing_model TEXT, -- 'CBP' (conversation-based pricing)

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  wa_timestamp TIMESTAMP WITH TIME ZONE -- WhatsApp's timestamp
);

-- WhatsApp message templates (pre-approved templates)
CREATE TABLE public.whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template info
  whatsapp_account_id UUID REFERENCES public.whatsapp_accounts(id) NOT NULL,
  template_name TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'he',

  -- Template category
  category TEXT NOT NULL, -- 'MARKETING', 'UTILITY', 'AUTHENTICATION'

  -- Template content
  components JSONB NOT NULL,
  -- [{ type: 'HEADER'|'BODY'|'FOOTER'|'BUTTONS', ... }]

  -- Approval status
  status TEXT DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
  rejection_reason TEXT,

  -- Usage
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  approved_at TIMESTAMP WITH TIME ZONE,

  UNIQUE(whatsapp_account_id, template_name, language)
);

-- Enable RLS
ALTER TABLE public.whatsapp_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies (admin only for sensitive data)
CREATE POLICY "Service role full access to whatsapp_accounts"
  ON public.whatsapp_accounts FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Admins can view whatsapp_accounts"
  ON public.whatsapp_accounts FOR SELECT
  USING (auth.role() = 'authenticated');

-- Conversations - teachers can view
CREATE POLICY "Service role full access to whatsapp_conversations"
  ON public.whatsapp_conversations FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated can view whatsapp_conversations"
  ON public.whatsapp_conversations FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can update whatsapp_conversations"
  ON public.whatsapp_conversations FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Messages - teachers can view
CREATE POLICY "Service role full access to whatsapp_messages"
  ON public.whatsapp_messages FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated can view whatsapp_messages"
  ON public.whatsapp_messages FOR SELECT
  USING (auth.role() = 'authenticated');

-- Templates - teachers can view
CREATE POLICY "Service role full access to whatsapp_templates"
  ON public.whatsapp_templates FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated can view whatsapp_templates"
  ON public.whatsapp_templates FOR SELECT
  USING (auth.role() = 'authenticated');

-- Indexes
CREATE INDEX idx_wa_conversations_phone ON public.whatsapp_conversations(wa_phone_number);
CREATE INDEX idx_wa_conversations_session ON public.whatsapp_conversations(chat_session_id);
CREATE INDEX idx_wa_conversations_status ON public.whatsapp_conversations(status);
CREATE INDEX idx_wa_conversations_window ON public.whatsapp_conversations(window_expires_at)
  WHERE status = 'active';

CREATE INDEX idx_wa_messages_conversation ON public.whatsapp_messages(conversation_id);
CREATE INDEX idx_wa_messages_wa_id ON public.whatsapp_messages(wa_message_id);
CREATE INDEX idx_wa_messages_created ON public.whatsapp_messages(created_at DESC);
CREATE INDEX idx_wa_messages_status ON public.whatsapp_messages(status)
  WHERE direction = 'outbound';

CREATE INDEX idx_wa_templates_account ON public.whatsapp_templates(whatsapp_account_id);
CREATE INDEX idx_wa_templates_status ON public.whatsapp_templates(status);

-- Triggers
CREATE TRIGGER update_whatsapp_accounts_updated_at
  BEFORE UPDATE ON public.whatsapp_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_conversations_updated_at
  BEFORE UPDATE ON public.whatsapp_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_templates_updated_at
  BEFORE UPDATE ON public.whatsapp_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add WhatsApp source to chat_sessions
-- Update the source field to include 'whatsapp' option
COMMENT ON COLUMN public.chat_sessions.source IS 'Source: widget, chat_page, embed, whatsapp';

-- Add whatsapp channel indicator to leads
-- Update metadata to include channel info
COMMENT ON COLUMN public.leads.metadata IS 'Metadata including channel (web, whatsapp), interested_in, age_group, etc.';

COMMENT ON TABLE public.whatsapp_accounts IS 'WhatsApp Business API account configuration';
COMMENT ON TABLE public.whatsapp_conversations IS 'WhatsApp conversations linked to chat sessions';
COMMENT ON TABLE public.whatsapp_messages IS 'Individual WhatsApp messages with status tracking';
COMMENT ON TABLE public.whatsapp_templates IS 'Pre-approved WhatsApp message templates';
