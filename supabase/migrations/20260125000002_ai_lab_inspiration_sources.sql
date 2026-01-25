-- ============================
-- Voicely AI Lab - Inspiration Sources
-- Migration: 20260125000002_ai_lab_inspiration_sources.sql
-- ============================

begin;

-- 1) Inspiration Sources Table
-- ----------------------------
create table if not exists ai_lab.inspiration_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('newsletter', 'twitter', 'youtube', 'github', 'website', 'podcast', 'discord', 'reddit')),
  url text,
  rss_url text,                              -- for auto-fetching
  handle text,                               -- @username for social
  language text not null default 'en',       -- 'en', 'he', 'mixed'
  tags text[] not null default '{}',         -- ['voice_ai', 'video', 'open_source', 'edtech']
  relevance_score int check (relevance_score between 1 and 10), -- 1-10 how relevant for Voicely
  update_frequency text,                     -- 'daily', 'weekly', 'irregular'
  last_checked_at timestamptz,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_inspiration_sources_type on ai_lab.inspiration_sources(type);
create index if not exists idx_inspiration_sources_tags on ai_lab.inspiration_sources using gin(tags);
create index if not exists idx_inspiration_sources_active on ai_lab.inspiration_sources(active);

create trigger trg_inspiration_sources_updated_at
before update on ai_lab.inspiration_sources
for each row execute function ai_lab.set_updated_at();

-- 2) Ideas Backlog (from inspiration sources)
-- -------------------------------------------
create table if not exists ai_lab.ideas_backlog (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references ai_lab.inspiration_sources(id) on delete set null,
  title text not null,
  description text,
  source_url text,                           -- link to original post/newsletter
  source_date date,                          -- when was it published
  category ai_lab.experiment_category not null default 'other',
  tags text[] not null default '{}',

  -- ICE-R Score (Impact, Confidence, Ease, Risk)
  ice_impact int check (ice_impact between 1 and 5),
  ice_confidence int check (ice_confidence between 1 and 5),
  ice_ease int check (ice_ease between 1 and 5),
  ice_risk int check (ice_risk between 1 and 5),
  ice_score numeric generated always as (
    case when ice_risk > 0 then
      (coalesce(ice_impact, 0) * coalesce(ice_confidence, 0) * coalesce(ice_ease, 0))::numeric / ice_risk
    else null end
  ) stored,

  status text not null default 'new' check (status in ('new', 'evaluating', 'approved', 'rejected', 'converted')),
  experiment_id uuid references ai_lab.experiments(id) on delete set null, -- if converted to experiment

  added_by uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ideas_backlog_status on ai_lab.ideas_backlog(status);
create index if not exists idx_ideas_backlog_category on ai_lab.ideas_backlog(category);
create index if not exists idx_ideas_backlog_ice on ai_lab.ideas_backlog(ice_score desc nulls last);

create trigger trg_ideas_backlog_updated_at
before update on ai_lab.ideas_backlog
for each row execute function ai_lab.set_updated_at();

-- 3) RLS for new tables
-- ---------------------
alter table ai_lab.inspiration_sources enable row level security;
alter table ai_lab.ideas_backlog enable row level security;

-- Inspiration sources: everyone can read; managers can write
drop policy if exists "inspiration_sources_read" on ai_lab.inspiration_sources;
create policy "inspiration_sources_read"
on ai_lab.inspiration_sources
for select
using (ai_lab.is_analyst());

drop policy if exists "inspiration_sources_write" on ai_lab.inspiration_sources;
create policy "inspiration_sources_write"
on ai_lab.inspiration_sources
for all
using (ai_lab.is_lab_manager())
with check (ai_lab.is_lab_manager());

-- Ideas backlog: analysts can read; managers can write
drop policy if exists "ideas_backlog_read" on ai_lab.ideas_backlog;
create policy "ideas_backlog_read"
on ai_lab.ideas_backlog
for select
using (ai_lab.is_analyst());

drop policy if exists "ideas_backlog_write" on ai_lab.ideas_backlog;
create policy "ideas_backlog_write"
on ai_lab.ideas_backlog
for all
using (ai_lab.is_lab_manager())
with check (ai_lab.is_lab_manager());

-- 4) Seed initial inspiration sources
-- -----------------------------------
insert into ai_lab.inspiration_sources (name, type, url, handle, language, tags, relevance_score, update_frequency, notes)
values
  -- ============================================
  -- TOP 5 MUST-FOLLOW
  -- ============================================

  ('AI Voice Newsletter', 'newsletter', 'https://aivoicenewsletter.com', null, 'en',
   array['voice_ai', 'tts', 'stt', 'voice_agents', 'practical'], 10, 'weekly',
   'הניוזלטר היחיד שמתמקד אך ורק ב-voice AI וסוכני שיחה - התחום המדויק שלנו'),

  ('Olivio Sarikas', 'youtube', 'https://youtube.com/c/OlivioSarikas', null, 'en',
   array['comfyui', 'workflows', 'tutorials', 'practical', 'free_course'], 10, 'weekly',
   'קורס ComfyUI חינמי עם workflows להורדה - מסביר בצורה ברורה מאוד'),

  ('ComfyUI Official', 'twitter', 'https://x.com/ComfyUI', 'ComfyUI', 'en',
   array['comfyui', 'updates', 'production', 'workflows'], 10, 'daily',
   'החשבון הרשמי - המקור הראשון לעדכונים על ComfyUI'),

  ('There''s An AI For That', 'newsletter', 'https://theresanaiforthat.com', null, 'en',
   array['tools', 'discovery', 'database', 'reviews'], 9, 'daily',
   '2.6M קוראים - Database של אלפי כלי AI מסווגים'),

  ('Ben''s Bites', 'newsletter', 'https://bensbites.co', null, 'en',
   array['tools', 'startups', 'practical', 'business'], 9, 'daily',
   '140K מנויים - AI נגיש בלי ז''רגון, deep dives שבועיים'),

  -- ============================================
  -- HEBREW SOURCES
  -- ============================================

  ('נועם - בינה בקיצור', 'newsletter', 'https://benina.beehiiv.com', null, 'he',
   array['open_source', 'comfyui', 'video', 'voice_ai', 'practical'], 10, 'weekly',
   'מקור מעולה לכלים פתוחים מיישמים, ComfyUI, וידאו ו-AI קולי'),

  -- ============================================
  -- NEWSLETTERS
  -- ============================================

  ('TheRundown AI', 'newsletter', 'https://therundown.ai', null, 'en',
   array['general_ai', 'news', 'tools', 'business'], 8, 'daily',
   'מתרגם חדשות AI ליישומים עסקיים מיידיים'),

  ('Superhuman AI', 'newsletter', 'https://superhumanai.beehiiv.com', null, 'en',
   array['productivity', 'tools', 'prompts', 'quick'], 7, 'daily',
   '1.25M קוראים - Get smarter about AI in 3 minutes a day'),

  ('The Neuron', 'newsletter', 'https://www.theneurondaily.com', null, 'en',
   array['technical', 'practical', 'human_first'], 7, 'daily',
   'Human-first style - קול אנושי בתחום רועש'),

  ('TLDR AI', 'newsletter', 'https://tldr.tech/ai', null, 'en',
   array['technical', 'model_updates', 'platform_changes'], 7, 'daily',
   'מסביר עדכוני מודלים ומתרגם ל-use cases'),

  -- ============================================
  -- TWITTER/X - COMFYUI EXPERTS
  -- ============================================

  ('JO. Z', 'twitter', 'https://x.com/jojodecayz', 'jojodecayz', 'en',
   array['comfyui', 'workflows', 'video', 'practical', 'templates'], 10, 'daily',
   'Community & Partnership @ComfyUI - workflows מעשיים להורדה'),

  ('Yoland Yan', 'twitter', 'https://x.com/yoland_yan', 'yoland_yan', 'en',
   array['comfyui', 'templates', 'production'], 9, 'daily',
   'Template Library ב-ComfyUI - workflows production-ready'),

  ('NerdyRodent', 'twitter', 'https://x.com/NerdyRodent', 'NerdyRodent', 'en',
   array['comfyui', 'open_source', 'tutorials', 'github'], 9, 'daily',
   'GitHub repo עם workflows לכל מיני שימושים - AVeryComfyNerd'),

  ('Copus.io', 'twitter', 'https://x.com/Copus_io', 'Copus_io', 'en',
   array['comfyui', 'workflow_map', 'community'], 7, 'weekly',
   'מארגנים ComfyUI workflow map - מיפוי של כל היוצרים'),

  -- ============================================
  -- TWITTER/X - INDIE HACKERS
  -- ============================================

  ('levelsio', 'twitter', 'https://x.com/levelsio', 'levelsio', 'en',
   array['indie_hacker', 'ai_tools', 'building', 'revenue'], 9, 'daily',
   'בונה מוצרי AI בפומבי - PhotoAI $155K MRR, שקיפות מוחלטת'),

  ('Indie Hackers', 'twitter', 'https://x.com/IndieHackers', 'IndieHackers', 'en',
   array['indie_hackers', 'solopreneurs', 'case_studies'], 8, 'daily',
   '143K followers - case studies של solo founders שהגיעו ל->$1M ARR'),

  ('The AI Solopreneur', 'twitter', 'https://x.com/aisolopreneur', 'aisolopreneur', 'en',
   array['solopreneur', 'content', 'growth'], 8, 'daily',
   '0 ל-100K followers ב-65 ימים, $200K בחודש מקורס'),

  -- ============================================
  -- TWITTER/X - AI EXPERTS
  -- ============================================

  ('Abhishek Thakur', 'twitter', 'https://x.com/abhi1thakur', 'abhi1thakur', 'en',
   array['huggingface', 'kaggle', 'automl', 'practical'], 8, 'daily',
   'Builds AutoTrain @huggingface, 4x Kaggle Grand Master'),

  ('kaborob', 'twitter', 'https://x.com/kaborob', 'kaborob', 'en',
   array['video', 'ai_video', 'tutorials'], 9, 'daily',
   'מומחה AI וידאו, טוב מאוד לכלים של יצירת תוכן'),

  -- ============================================
  -- YOUTUBE
  -- ============================================

  ('Matt Wolfe', 'youtube', 'https://youtube.com/@mreflow', null, 'en',
   array['tools', 'reviews', 'video', 'practical', 'news'], 9, 'weekly',
   '888K subscribers - סקירות מעמיקות, בודק בפועל'),

  ('Scott Detweiler', 'youtube', 'https://youtube.com/@sedetweiler', null, 'en',
   array['comfyui', 'beginner', 'tutorials', 'step_by_step'], 10, 'weekly',
   'סדרת ComfyUI - Getting Started המפורטת ביותר'),

  ('Sebastian Kamph', 'youtube', 'https://youtube.com/c/SebastianKamph', null, 'en',
   array['comfyui', 'advanced', 'controlnet', 'integration'], 8, 'weekly',
   'Advanced workflows ושילוב עם כלים נוספים'),

  ('Justin Brown - Primal Video', 'youtube', 'https://youtube.com/c/PrimalVideo', null, 'en',
   array['youtube_ai', 'video_creation', 'content'], 7, 'weekly',
   'AI tools ליוצרי תוכן ב-YouTube'),

  -- ============================================
  -- DISCORD / COMMUNITIES
  -- ============================================

  ('Comfy Deploy Discord', 'discord', 'https://discord.com/servers/comfy-deploy-1185598676983349338', null, 'en',
   array['comfyui', 'production', 'apis', 'deployment'], 9, 'daily',
   '4,382 חברים - דיפלוי ComfyUI workflows ל-production עם APIs'),

  ('r/comfyui', 'reddit', 'https://reddit.com/r/comfyui', null, 'en',
   array['comfyui', 'qa', 'resources', 'troubleshooting'], 8, 'daily',
   'קהילת Reddit פעילה - שאלות, תשובות, המלצות'),

  -- ============================================
  -- GITHUB / HUGGING FACE / PLATFORMS
  -- ============================================

  ('Hugging Face Spaces - Voice Cloning', 'website', 'https://huggingface.co/spaces?category=voice-cloning', null, 'en',
   array['voice_cloning', 'tts', 'demos', 'open_source'], 10, 'daily',
   'דמואים אינטראקטיביים של voice cloning - טסט בלי התקנה'),

  ('Replicate', 'website', 'https://replicate.com', null, 'en',
   array['api', 'models', 'deployment', 'one_line_code'], 9, 'daily',
   'רוצו מודלי AI עם API בשורה אחת - אלפי מודלים מוכנים'),

  ('OpenVoice', 'github', 'https://github.com/myshell-ai/OpenVoice', null, 'en',
   array['voice_cloning', 'open_source', 'mit_license', 'production'], 10, 'irregular',
   '35.6K stars, MIT License - voice cloning ברמה מקצועית, חינמי לשימוש מסחרי'),

  ('Hugging Face Trending', 'website', 'https://huggingface.co/models?sort=trending', null, 'en',
   array['models', 'open_source', 'cutting_edge'], 7, 'daily',
   'מודלים חדשים שעולים - לזהות טרנדים מוקדם'),

  ('GitHub Trending AI', 'github', 'https://github.com/trending?since=weekly&spoken_language_code=en', null, 'en',
   array['open_source', 'code', 'tools'], 7, 'weekly',
   'פרויקטים פתוחים חדשים'),

  -- ============================================
  -- VOICE AI SPECIALISTS
  -- ============================================

  ('ElevenLabs Docs', 'website', 'https://elevenlabs.io/docs', null, 'en',
   array['voice_cloning', 'tts', 'api', 'documentation'], 9, 'irregular',
   'ה-API documentation הכי טוב בתעשייה - קוד לדוגמה'),

  ('Vapi.ai', 'website', 'https://vapi.ai', null, 'en',
   array['voice_agents', 'real_time', 'developer'], 8, 'irregular',
   'פלטפורמה לבניית advanced voice AI agents תוך דקות'),

  ('Qwen Team', 'website', 'https://huggingface.co/Qwen', null, 'en',
   array['tts', 'open_source', 'bleeding_edge', 'multilingual'], 9, 'irregular',
   'Qwen3-TTS - מנצח את ElevenLabs בבדיקות, Apache 2.0')

on conflict do nothing;

commit;
