-- ============================
-- AI Lab - Public Schema Views
-- Migration: 20260125200002_ai_lab_public_views.sql
-- ============================
-- These views expose ai_lab tables to the public schema
-- so Edge Functions can access them via PostgREST

-- Inspiration sources view
create or replace view public.inspiration_sources as
select * from ai_lab.inspiration_sources;

-- Grant access
grant select, insert, update, delete on public.inspiration_sources to authenticated, service_role;

-- Ideas backlog view (with write support via trigger)
create or replace view public.ideas_backlog as
select * from ai_lab.ideas_backlog;

grant select, insert, update, delete on public.ideas_backlog to authenticated, service_role;

-- Fetch log view
create or replace view public.fetch_log as
select * from ai_lab.fetch_log;

grant select, insert on public.fetch_log to authenticated, service_role;

-- Create INSTEAD OF triggers for inserts through views

-- Trigger for inspiration_sources inserts
create or replace function public.insert_inspiration_source()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into ai_lab.inspiration_sources (
    id, name, type, url, description, tags, relevance_score,
    last_checked_at, is_active, rss_url, fetch_enabled,
    last_fetched_at, last_fetch_error, fetch_interval_hours
  ) values (
    coalesce(new.id, gen_random_uuid()),
    new.name, new.type, new.url, new.description, coalesce(new.tags, '{}'),
    coalesce(new.relevance_score, 50), new.last_checked_at,
    coalesce(new.is_active, true), new.rss_url, coalesce(new.fetch_enabled, false),
    new.last_fetched_at, new.last_fetch_error, coalesce(new.fetch_interval_hours, 24)
  );
  return new;
end;
$$;

drop trigger if exists trg_insert_inspiration_source on public.inspiration_sources;
create trigger trg_insert_inspiration_source
instead of insert on public.inspiration_sources
for each row execute function public.insert_inspiration_source();

-- Trigger for inspiration_sources updates
create or replace function public.update_inspiration_source()
returns trigger
language plpgsql
security definer
as $$
begin
  update ai_lab.inspiration_sources set
    name = new.name,
    type = new.type,
    url = new.url,
    description = new.description,
    tags = new.tags,
    relevance_score = new.relevance_score,
    last_checked_at = new.last_checked_at,
    is_active = new.is_active,
    rss_url = new.rss_url,
    fetch_enabled = new.fetch_enabled,
    last_fetched_at = new.last_fetched_at,
    last_fetch_error = new.last_fetch_error,
    fetch_interval_hours = new.fetch_interval_hours,
    updated_at = now()
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists trg_update_inspiration_source on public.inspiration_sources;
create trigger trg_update_inspiration_source
instead of update on public.inspiration_sources
for each row execute function public.update_inspiration_source();

-- Trigger for ideas_backlog inserts
create or replace function public.insert_ideas_backlog()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into ai_lab.ideas_backlog (
    id, source_id, title, description, source_url, source_date,
    category, tags, status, notes, experiment_id,
    featured, cover_image_url, content_html, reading_time_min,
    ai_summary, ai_relevance_score, ai_relevance_reason, published_at, view_count
  ) values (
    coalesce(new.id, gen_random_uuid()),
    new.source_id, new.title, new.description, new.source_url, new.source_date,
    coalesce(new.category, 'other'), coalesce(new.tags, '{}'),
    coalesce(new.status, 'new'), new.notes, new.experiment_id,
    coalesce(new.featured, false), new.cover_image_url, new.content_html, new.reading_time_min,
    new.ai_summary, new.ai_relevance_score, new.ai_relevance_reason, new.published_at,
    coalesce(new.view_count, 0)
  );
  return new;
end;
$$;

drop trigger if exists trg_insert_ideas_backlog on public.ideas_backlog;
create trigger trg_insert_ideas_backlog
instead of insert on public.ideas_backlog
for each row execute function public.insert_ideas_backlog();

-- Trigger for ideas_backlog updates
create or replace function public.update_ideas_backlog()
returns trigger
language plpgsql
security definer
as $$
begin
  update ai_lab.ideas_backlog set
    source_id = new.source_id,
    title = new.title,
    description = new.description,
    source_url = new.source_url,
    source_date = new.source_date,
    category = new.category,
    tags = new.tags,
    status = new.status,
    notes = new.notes,
    experiment_id = new.experiment_id,
    featured = new.featured,
    cover_image_url = new.cover_image_url,
    content_html = new.content_html,
    reading_time_min = new.reading_time_min,
    ai_summary = new.ai_summary,
    ai_relevance_score = new.ai_relevance_score,
    ai_relevance_reason = new.ai_relevance_reason,
    published_at = new.published_at,
    view_count = new.view_count,
    updated_at = now()
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists trg_update_ideas_backlog on public.ideas_backlog;
create trigger trg_update_ideas_backlog
instead of update on public.ideas_backlog
for each row execute function public.update_ideas_backlog();

-- Trigger for fetch_log inserts
create or replace function public.insert_fetch_log()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into ai_lab.fetch_log (
    id, source_id, fetched_at, items_found, items_added,
    items_filtered, error, duration_ms
  ) values (
    coalesce(new.id, gen_random_uuid()),
    new.source_id, coalesce(new.fetched_at, now()),
    coalesce(new.items_found, 0), coalesce(new.items_added, 0),
    coalesce(new.items_filtered, 0), new.error, new.duration_ms
  );
  return new;
end;
$$;

drop trigger if exists trg_insert_fetch_log on public.fetch_log;
create trigger trg_insert_fetch_log
instead of insert on public.fetch_log
for each row execute function public.insert_fetch_log();
