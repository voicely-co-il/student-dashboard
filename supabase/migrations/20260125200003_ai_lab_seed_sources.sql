-- ============================
-- AI Lab - Seed Inspiration Sources with RSS URLs
-- Migration: 20260125200003_ai_lab_seed_sources.sql
-- ============================

-- Clear existing sources and re-insert with proper data
truncate ai_lab.inspiration_sources cascade;

insert into ai_lab.inspiration_sources (name, type, url, tags, relevance_score, is_active, rss_url, fetch_enabled, description)
values
  -- TOP NEWSLETTERS WITH RSS
  ('Ben''s Bites', 'newsletter', 'https://bensbites.co',
   array['tools', 'startups', 'practical', 'business'], 90, true,
   'https://bensbites.beehiiv.com/feed', true,
   '140K מנויים - AI נגיש בלי ז''רגון, deep dives שבועיים'),

  ('TLDR AI', 'newsletter', 'https://tldr.tech/ai',
   array['technical', 'model_updates', 'platform_changes'], 80, true,
   'https://tldr.tech/ai/rss', true,
   'מסביר עדכוני מודלים ומתרגם ל-use cases'),

  ('TheRundown AI', 'newsletter', 'https://therundown.ai',
   array['general_ai', 'news', 'tools', 'business'], 85, true,
   'https://therundown.ai/feed', true,
   'מתרגם חדשות AI ליישומים עסקיים מיידיים'),

  -- YOUTUBE CHANNELS WITH RSS
  ('Olivio Sarikas', 'youtube', 'https://youtube.com/c/OlivioSarikas',
   array['comfyui', 'workflows', 'tutorials', 'practical', 'free_course'], 95, true,
   'https://www.youtube.com/feeds/videos.xml?channel_id=UCWXCrItCF6ZgXrdozUS-Idw', true,
   'קורס ComfyUI חינמי עם workflows להורדה - מסביר בצורה ברורה מאוד'),

  ('Matt Wolfe', 'youtube', 'https://youtube.com/@mreflow',
   array['tools', 'reviews', 'video', 'practical', 'news'], 90, true,
   'https://www.youtube.com/feeds/videos.xml?channel_id=UC4JX40jDee_tINbkjycV4Sg', true,
   '888K subscribers - סקירות מעמיקות, בודק בפועל'),

  ('Scott Detweiler', 'youtube', 'https://youtube.com/@sedetweiler',
   array['comfyui', 'beginner', 'tutorials', 'step_by_step'], 95, true,
   'https://www.youtube.com/feeds/videos.xml?channel_id=UCVBWCOicbfgwnJMdNlvhfRg', true,
   'סדרת ComfyUI - Getting Started המפורטת ביותר'),

  -- REDDIT WITH RSS
  ('r/comfyui', 'reddit', 'https://reddit.com/r/comfyui',
   array['comfyui', 'qa', 'resources', 'troubleshooting'], 85, true,
   'https://www.reddit.com/r/comfyui/hot.rss', true,
   'קהילת Reddit פעילה - שאלות, תשובות, המלצות'),

  -- GITHUB TRENDING
  ('GitHub Trending AI', 'github', 'https://github.com/trending',
   array['open_source', 'code', 'tools'], 75, true,
   'https://mshibanerm.github.io/GitHubTrendingRSS/weekly/all.xml', true,
   'פרויקטים פתוחים חדשים מ-GitHub Trending'),

  -- HUGGING FACE
  ('Hugging Face Trending', 'other', 'https://huggingface.co/models?sort=trending',
   array['models', 'open_source', 'cutting_edge'], 80, true,
   'https://huggingface.co/papers/rss.xml', true,
   'מאמרים וחדשות מ-Hugging Face'),

  -- HEBREW SOURCES (no RSS but still track)
  ('נועם - בינה בקיצור', 'newsletter', 'https://benina.beehiiv.com',
   array['open_source', 'comfyui', 'video', 'voice_ai', 'practical', 'hebrew'], 95, true,
   null, false,
   'מקור מעולה לכלים פתוחים מיישמים, ComfyUI, וידאו ו-AI קולי - בעברית'),

  -- VOICE AI SPECIALISTS (no RSS but track manually)
  ('AI Voice Newsletter', 'newsletter', 'https://aivoicenewsletter.com',
   array['voice_ai', 'tts', 'stt', 'voice_agents', 'practical'], 100, true,
   null, false,
   'הניוזלטר היחיד שמתמקד אך ורק ב-voice AI וסוכני שיחה - התחום המדויק שלנו'),

  ('ElevenLabs Blog', 'blog', 'https://elevenlabs.io/blog',
   array['voice_cloning', 'tts', 'api', 'documentation'], 90, true,
   null, false,
   'ה-API documentation הכי טוב בתעשייה - קוד לדוגמה'),

  -- ADDITIONAL SOURCES WITHOUT RSS
  ('There''s An AI For That', 'other', 'https://theresanaiforthat.com',
   array['tools', 'discovery', 'database', 'reviews'], 85, true,
   null, false,
   '2.6M קוראים - Database של אלפי כלי AI מסווגים'),

  ('Replicate', 'other', 'https://replicate.com',
   array['api', 'models', 'deployment', 'one_line_code'], 85, true,
   null, false,
   'רוצו מודלי AI עם API בשורה אחת - אלפי מודלים מוכנים'),

  ('OpenVoice GitHub', 'github', 'https://github.com/myshell-ai/OpenVoice',
   array['voice_cloning', 'open_source', 'mit_license', 'production'], 95, true,
   null, false,
   '35.6K stars, MIT License - voice cloning ברמה מקצועית, חינמי לשימוש מסחרי')
;
