-- ============================
-- Voicely AI Lab - RSS Fetching & Blog
-- Migration: 20260125000003_ai_lab_rss_fetching.sql
-- ============================

begin;

-- 1) Add RSS URL to inspiration_sources
-- -------------------------------------
alter table ai_lab.inspiration_sources
  add column if not exists rss_url text,
  add column if not exists fetch_enabled boolean not null default false,
  add column if not exists last_fetched_at timestamptz,
  add column if not exists last_fetch_error text,
  add column if not exists fetch_interval_hours int not null default 24;

-- 2) Fetch Log table
-- ------------------
create table if not exists ai_lab.fetch_log (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references ai_lab.inspiration_sources(id) on delete cascade,
  fetched_at timestamptz not null default now(),
  items_found int not null default 0,
  items_added int not null default 0,
  items_filtered int not null default 0,
  error text,
  duration_ms int,
  created_at timestamptz not null default now()
);

create index if not exists idx_fetch_log_source on ai_lab.fetch_log(source_id, fetched_at desc);

-- 3) Enhance ideas_backlog for blog display
-- -----------------------------------------
alter table ai_lab.ideas_backlog
  add column if not exists featured boolean not null default false,
  add column if not exists cover_image_url text,
  add column if not exists content_html text,
  add column if not exists reading_time_min int,
  add column if not exists ai_summary text,
  add column if not exists ai_relevance_score int check (ai_relevance_score between 0 and 100),
  add column if not exists ai_relevance_reason text,
  add column if not exists published_at timestamptz,
  add column if not exists view_count int not null default 0;

create index if not exists idx_ideas_backlog_featured on ai_lab.ideas_backlog(featured, created_at desc);
create index if not exists idx_ideas_backlog_published on ai_lab.ideas_backlog(published_at desc nulls last);
create index if not exists idx_ideas_backlog_ai_score on ai_lab.ideas_backlog(ai_relevance_score desc nulls last);

-- 4) RLS for fetch_log
-- --------------------
alter table ai_lab.fetch_log enable row level security;

drop policy if exists "fetch_log_read" on ai_lab.fetch_log;
create policy "fetch_log_read"
on ai_lab.fetch_log
for select
using (ai_lab.is_analyst());

drop policy if exists "fetch_log_write" on ai_lab.fetch_log;
create policy "fetch_log_write"
on ai_lab.fetch_log
for insert
with check (ai_lab.is_lab_manager());

-- 5) Update inspiration_sources with RSS URLs
-- -------------------------------------------
update ai_lab.inspiration_sources set
  rss_url = 'https://bensbites.beehiiv.com/feed',
  fetch_enabled = true
where name = 'Ben''s Bites';

update ai_lab.inspiration_sources set
  rss_url = 'https://tldr.tech/ai/rss',
  fetch_enabled = true
where name = 'TLDR AI';

update ai_lab.inspiration_sources set
  rss_url = 'https://therundown.ai/feed',
  fetch_enabled = true
where name = 'TheRundown AI';

update ai_lab.inspiration_sources set
  rss_url = 'https://www.youtube.com/feeds/videos.xml?channel_id=UCWXCrItCF6ZgXrdozUS-Idw',
  fetch_enabled = true
where name = 'Olivio Sarikas';

update ai_lab.inspiration_sources set
  rss_url = 'https://www.youtube.com/feeds/videos.xml?channel_id=UC4JX40jDee_tINbkjycV4Sg',
  fetch_enabled = true
where name = 'Matt Wolfe';

update ai_lab.inspiration_sources set
  rss_url = 'https://www.youtube.com/feeds/videos.xml?channel_id=UCVBWCOicbfgwnJMdNlvhfRg',
  fetch_enabled = true
where name = 'Scott Detweiler';

-- Reddit RSS
update ai_lab.inspiration_sources set
  rss_url = 'https://www.reddit.com/r/comfyui/hot.rss',
  fetch_enabled = true
where name = 'r/comfyui';

-- GitHub Trending (via unofficial RSS)
update ai_lab.inspiration_sources set
  rss_url = 'https://mshibanern.github.io/GitHubTrendingRSS/weekly/all.xml',
  fetch_enabled = true
where name = 'GitHub Trending AI';

-- Hugging Face (papers)
update ai_lab.inspiration_sources set
  rss_url = 'https://huggingface.co/papers/rss.xml',
  fetch_enabled = true
where name = 'Hugging Face Trending';

-- 6) View for blog display
-- ------------------------
create or replace view ai_lab.ideas_blog as
select
  ib.id,
  ib.title,
  ib.description,
  ib.source_url,
  ib.source_date,
  ib.category,
  ib.tags,
  ib.ice_score,
  ib.status,
  ib.featured,
  ib.cover_image_url,
  ib.content_html,
  ib.reading_time_min,
  ib.ai_summary,
  ib.ai_relevance_score,
  ib.ai_relevance_reason,
  ib.published_at,
  ib.view_count,
  ib.created_at,
  -- Source info
  src.name as source_name,
  src.type as source_type,
  src.url as source_base_url,
  src.relevance_score as source_relevance_score
from ai_lab.ideas_backlog ib
left join ai_lab.inspiration_sources src on src.id = ib.source_id
where ib.status != 'rejected'
order by
  ib.featured desc,
  ib.ai_relevance_score desc nulls last,
  ib.created_at desc;

grant select on ai_lab.ideas_blog to authenticated;

-- 7) Function to increment view count
-- -----------------------------------
create or replace function ai_lab.increment_idea_view(idea_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update ai_lab.ideas_backlog
  set view_count = view_count + 1
  where id = idea_id;
end;
$$;

commit;
