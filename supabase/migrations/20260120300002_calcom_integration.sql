-- Cal.com Integration
-- Tables for scheduling and booking integration

-- Cal.com configuration (API settings)
CREATE TABLE public.calcom_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- API credentials
  api_key_encrypted TEXT, -- Encrypted API key (cal_ prefix)
  api_version TEXT DEFAULT '2024-08-13',

  -- Organization info
  organization_slug TEXT,
  default_username TEXT, -- Default user for bookings

  -- Settings
  base_url TEXT DEFAULT 'https://api.cal.com/v2',

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_verified_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Event types (synced from Cal.com)
CREATE TABLE public.calcom_event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Cal.com identifiers
  calcom_event_type_id INTEGER NOT NULL UNIQUE,
  calcom_username TEXT,

  -- Event info
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,

  -- Duration
  length_minutes INTEGER NOT NULL,

  -- Type
  event_type TEXT DEFAULT 'one_on_one', -- 'one_on_one', 'group', 'recurring'

  -- Pricing (if applicable)
  price DECIMAL(10,2),
  currency TEXT DEFAULT 'ILS',

  -- Settings
  requires_confirmation BOOLEAN DEFAULT false,
  hidden BOOLEAN DEFAULT false,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  synced_at TIMESTAMP WITH TIME ZONE
);

-- Bookings (synced from Cal.com and created via API)
CREATE TABLE public.calcom_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Cal.com identifiers
  calcom_booking_id INTEGER UNIQUE,
  calcom_booking_uid TEXT UNIQUE, -- The UUID used in booking links

  -- Event type reference
  event_type_id UUID REFERENCES public.calcom_event_types(id),

  -- Attendee info
  attendee_name TEXT NOT NULL,
  attendee_email TEXT NOT NULL,
  attendee_phone TEXT,
  attendee_timezone TEXT DEFAULT 'Asia/Jerusalem',
  attendee_language TEXT DEFAULT 'he',

  -- Booking times
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'cancelled', 'rejected', 'rescheduled'
  cancellation_reason TEXT,

  -- Meeting details
  meeting_url TEXT, -- Video call URL
  location_type TEXT, -- 'integrations:google:meet', 'integrations:zoom', 'phone', 'in_person'
  location_value TEXT, -- Address or phone number

  -- Source tracking
  source TEXT, -- 'chat', 'widget', 'direct', 'whatsapp'
  chat_session_id UUID REFERENCES public.chat_sessions(id),
  lead_id UUID REFERENCES public.leads(id),

  -- Metadata from booking
  metadata JSONB DEFAULT '{}'::jsonb,
  booking_fields_responses JSONB DEFAULT '{}'::jsonb,

  -- Reminders
  reminder_sent_24h BOOLEAN DEFAULT false,
  reminder_sent_1h BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Availability slots (cached from Cal.com)
CREATE TABLE public.calcom_availability_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event type
  event_type_id UUID REFERENCES public.calcom_event_types(id) NOT NULL,

  -- Date range cached
  date DATE NOT NULL,

  -- Available slots for this date
  slots JSONB NOT NULL, -- [{ time: '09:00', available: true }, ...]

  -- Cache metadata
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

  UNIQUE(event_type_id, date)
);

-- Enable RLS
ALTER TABLE public.calcom_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calcom_event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calcom_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calcom_availability_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Config - service role and admins only
CREATE POLICY "Service role full access to calcom_config"
  ON public.calcom_config FOR ALL
  USING (auth.role() = 'service_role');

-- Event types - everyone can read
CREATE POLICY "Service role full access to calcom_event_types"
  ON public.calcom_event_types FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Anyone can view event types"
  ON public.calcom_event_types FOR SELECT
  USING (true);

-- Bookings - authenticated users can view and create
CREATE POLICY "Service role full access to calcom_bookings"
  ON public.calcom_bookings FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated can view bookings"
  ON public.calcom_bookings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can insert bookings"
  ON public.calcom_bookings FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can update bookings"
  ON public.calcom_bookings FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Availability cache - everyone can read
CREATE POLICY "Service role full access to availability_cache"
  ON public.calcom_availability_cache FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Anyone can view availability"
  ON public.calcom_availability_cache FOR SELECT
  USING (true);

-- Indexes
CREATE INDEX idx_calcom_bookings_start ON public.calcom_bookings(start_time);
CREATE INDEX idx_calcom_bookings_status ON public.calcom_bookings(status);
CREATE INDEX idx_calcom_bookings_email ON public.calcom_bookings(attendee_email);
CREATE INDEX idx_calcom_bookings_phone ON public.calcom_bookings(attendee_phone);
CREATE INDEX idx_calcom_bookings_chat_session ON public.calcom_bookings(chat_session_id);
CREATE INDEX idx_calcom_bookings_lead ON public.calcom_bookings(lead_id);

CREATE INDEX idx_calcom_availability_date ON public.calcom_availability_cache(date);
CREATE INDEX idx_calcom_availability_expires ON public.calcom_availability_cache(expires_at);

-- Triggers
CREATE TRIGGER update_calcom_config_updated_at
  BEFORE UPDATE ON public.calcom_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calcom_event_types_updated_at
  BEFORE UPDATE ON public.calcom_event_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calcom_bookings_updated_at
  BEFORE UPDATE ON public.calcom_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to clean expired availability cache
CREATE OR REPLACE FUNCTION clean_expired_availability()
RETURNS void AS $$
BEGIN
  DELETE FROM public.calcom_availability_cache
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.calcom_config IS 'Cal.com API configuration and credentials';
COMMENT ON TABLE public.calcom_event_types IS 'Synced event types from Cal.com';
COMMENT ON TABLE public.calcom_bookings IS 'Bookings created via chat or synced from Cal.com';
COMMENT ON TABLE public.calcom_availability_cache IS 'Cached availability slots for quick display';
