-- Voice Messages Support
-- Adds voice message storage for chat system

-- Create storage bucket for voice messages
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voice-messages',
  'voice-messages',
  false,
  10485760, -- 10MB max per file
  ARRAY['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for voice messages bucket
CREATE POLICY "Service role can manage voice messages"
  ON storage.objects FOR ALL
  USING (bucket_id = 'voice-messages' AND auth.role() = 'service_role');

CREATE POLICY "Authenticated users can upload voice messages"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'voice-messages' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read voice messages"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'voice-messages' AND auth.role() = 'authenticated');

-- Voice messages table (for metadata and transcription)
CREATE TABLE public.voice_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  chat_session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),

  -- Audio file info
  storage_path TEXT NOT NULL, -- Path in storage bucket
  file_name TEXT,
  mime_type TEXT DEFAULT 'audio/webm',
  duration_seconds DECIMAL(10,2), -- Duration of audio
  file_size_bytes INTEGER,

  -- Transcription
  transcription TEXT, -- Transcribed text
  transcription_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  transcription_language TEXT DEFAULT 'he', -- Hebrew default
  transcription_error TEXT,

  -- Message context
  message_role TEXT DEFAULT 'user', -- 'user', 'agent'
  message_index INTEGER, -- Position in chat messages array

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  transcribed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.voice_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Service role full access to voice_messages"
  ON public.voice_messages FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Users can view their own voice messages"
  ON public.voice_messages FOR SELECT
  USING (auth.uid() = user_id OR auth.role() = 'authenticated');

CREATE POLICY "Users can insert voice messages"
  ON public.voice_messages FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Indexes
CREATE INDEX idx_voice_messages_chat_session ON public.voice_messages(chat_session_id);
CREATE INDEX idx_voice_messages_created ON public.voice_messages(created_at DESC);
CREATE INDEX idx_voice_messages_status ON public.voice_messages(transcription_status);

-- Updated at trigger
CREATE TRIGGER update_voice_messages_updated_at
  BEFORE UPDATE ON public.voice_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add voice message support to chat_sessions messages schema
-- Messages JSONB now supports: { role, content, timestamp, type?, voice_message_id? }
-- type: 'text' (default) | 'voice' | 'image'
-- voice_message_id: UUID reference to voice_messages table

COMMENT ON TABLE public.voice_messages IS 'Voice message metadata and transcriptions for chat system';
COMMENT ON COLUMN public.voice_messages.storage_path IS 'Path in voice-messages storage bucket';
COMMENT ON COLUMN public.voice_messages.message_index IS 'Position in chat_sessions.messages JSONB array';
