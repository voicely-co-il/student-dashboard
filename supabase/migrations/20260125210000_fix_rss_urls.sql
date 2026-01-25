-- ============================
-- Fix RSS URLs for broken sources
-- Migration: 20260125200004_fix_rss_urls.sql
-- ============================

-- Ben's Bites - moved to Beehiiv, use their RSS format
update ai_lab.inspiration_sources set
  rss_url = 'https://rss.beehiiv.com/feeds/GBuS4dSHge.xml',
  last_fetch_error = null
where name = 'Ben''s Bites';

-- TLDR AI - use third-party RSS aggregator (no official RSS)
update ai_lab.inspiration_sources set
  rss_url = 'https://bullrich.dev/tldr-rss/tldr-ai.xml',
  last_fetch_error = null
where name = 'TLDR AI';

-- TheRundown AI - try alternative feed URL
update ai_lab.inspiration_sources set
  rss_url = 'https://www.therundown.ai/feed',
  fetch_enabled = false,  -- disable until we verify it works
  last_fetch_error = 'Needs manual verification'
where name = 'TheRundown AI';

-- Scott Detweiler - fix YouTube channel ID
update ai_lab.inspiration_sources set
  rss_url = 'https://www.youtube.com/feeds/videos.xml?channel_id=UC9kC4zCxE-i-g4GnB3KhWpA',
  last_fetch_error = null
where name = 'Scott Detweiler';

-- GitHub Trending - use alternative feed
update ai_lab.inspiration_sources set
  rss_url = 'https://rsshub.app/github/trending/daily/all/en',
  last_fetch_error = null
where name = 'GitHub Trending AI';

-- Hugging Face - use papers daily feed (no auth required)
update ai_lab.inspiration_sources set
  rss_url = 'https://rsshub.app/huggingface/daily-papers',
  last_fetch_error = null
where name = 'Hugging Face Trending';
