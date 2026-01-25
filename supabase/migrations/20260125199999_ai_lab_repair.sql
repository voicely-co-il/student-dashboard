-- ============================
-- Repair migration: Re-create ai_lab schema if missing
-- Migration: 20260125199999_ai_lab_repair.sql
-- ============================
-- This migration repairs the ai_lab schema in case earlier migrations
-- were recorded but not actually applied.

-- 0) Extensions
create extension if not exists "pgcrypto";

-- 1) Schema
create schema if not exists ai_lab;

-- 2) Enums
do $$ begin
  create type ai_lab.experiment_category as enum ('voice_ai','vision_ai','content_ai','analytics','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ai_lab.experiment_status as enum ('discovery','alpha','private_beta','public_beta','ga','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ai_lab.experiment_decision as enum ('promote','iterate','archive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ai_lab.participant_role as enum ('teacher','student','parent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ai_lab.consent_status as enum ('pending','approved','declined','revoked');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ai_lab.age_group as enum ('u13','13_17','18_plus','unknown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ai_lab.consent_scope as enum ('telemetry_only','audio_only','video_only','audio_video','full');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ai_lab.metric_collection_method as enum ('manual','auto');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ai_lab.metric_aggregation as enum ('mean','median','sum','min','max','pct','pct95','count','custom');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ai_lab.rollout_type as enum ('user_list','role','percent','all','none');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ai_lab.risk_level as enum ('low','medium','high');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ai_lab.privacy_impact as enum ('none','minor','moderate','high');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ai_lab.event_type as enum (
    'experiment_created','experiment_updated','status_changed','decision_set',
    'flag_toggled','rollout_changed',
    'participant_added','participant_removed','consent_updated',
    'measurement_recorded','event_recorded',
    'export','delete','archive'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type ai_lab.idea_status as enum ('new','reviewing','approved','rejected','in_progress','completed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ai_lab.source_type as enum ('newsletter','twitter','youtube','reddit','github','podcast','blog','paper','other');
exception when duplicate_object then null; end $$;

-- 3) Helper functions
create or replace function ai_lab.current_user_id()
returns uuid
language sql
stable
as $$
  select
    coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), '')::uuid,
      auth.uid()
    );
$$;

create or replace function ai_lab.current_role()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (auth.jwt() ->> 'role'),
    'viewer'
  );
$$;

create or replace function ai_lab.is_admin()
returns boolean
language sql
stable
as $$
  select ai_lab.current_role() = 'admin';
$$;

create or replace function ai_lab.is_lab_manager()
returns boolean
language sql
stable
as $$
  select ai_lab.current_role() in ('admin','lab_manager');
$$;

create or replace function ai_lab.is_analyst()
returns boolean
language sql
stable
as $$
  select ai_lab.current_role() in ('admin','lab_manager','analyst');
$$;

create or replace function ai_lab.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- 4) Metric Dictionary
create table if not exists ai_lab.metric_definitions (
  metric_name text primary key,
  description text not null,
  unit text not null,
  higher_is_better boolean not null default true,
  collection_method ai_lab.metric_collection_method not null default 'manual',
  source text,
  aggregation ai_lab.metric_aggregation not null default 'mean',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_metric_definitions_updated_at on ai_lab.metric_definitions;
create trigger trg_metric_definitions_updated_at
before update on ai_lab.metric_definitions
for each row execute function ai_lab.set_updated_at();

-- 5) Experiments
create table if not exists ai_lab.experiments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  hypothesis text not null,
  category ai_lab.experiment_category not null default 'other',
  status ai_lab.experiment_status not null default 'discovery',
  source_url text,
  owner_user_id uuid not null,
  risk_level ai_lab.risk_level not null default 'medium',
  privacy_impact ai_lab.privacy_impact not null default 'minor',
  data_sensitivity text not null default 'telemetry',
  kill_criteria text not null,
  start_date date,
  end_date date,
  planned_duration_days int not null default 14,
  decision ai_lab.experiment_decision,
  learnings text,
  config_version int not null default 1,
  flag_key text unique,
  current_rollout_pct int not null default 0 check (current_rollout_pct between 0 and 100),
  cost_estimate numeric,
  expected_benefit numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_experiments_status on ai_lab.experiments(status);
create index if not exists idx_experiments_owner on ai_lab.experiments(owner_user_id);
create index if not exists idx_experiments_category on ai_lab.experiments(category);

drop trigger if exists trg_experiments_updated_at on ai_lab.experiments;
create trigger trg_experiments_updated_at
before update on ai_lab.experiments
for each row execute function ai_lab.set_updated_at();

-- 6) Experiment metrics
create table if not exists ai_lab.experiment_metrics (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references ai_lab.experiments(id) on delete cascade,
  metric_name text not null references ai_lab.metric_definitions(metric_name),
  baseline_value numeric,
  target_value numeric,
  target_direction text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (experiment_id, metric_name)
);

create index if not exists idx_experiment_metrics_experiment on ai_lab.experiment_metrics(experiment_id);

drop trigger if exists trg_experiment_metrics_updated_at on ai_lab.experiment_metrics;
create trigger trg_experiment_metrics_updated_at
before update on ai_lab.experiment_metrics
for each row execute function ai_lab.set_updated_at();

-- 7) Consent Forms
create table if not exists ai_lab.consent_forms (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  locale text not null default 'he-IL',
  doc_url text,
  required_for_roles ai_lab.participant_role[] not null default array['student'::ai_lab.participant_role],
  required_for_age_groups ai_lab.age_group[] not null default array['u13'::ai_lab.age_group,'13_17'::ai_lab.age_group],
  default_scope ai_lab.consent_scope not null default 'telemetry_only',
  retention_days int not null default 90,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(version, locale)
);

drop trigger if exists trg_consent_forms_updated_at on ai_lab.consent_forms;
create trigger trg_consent_forms_updated_at
before update on ai_lab.consent_forms
for each row execute function ai_lab.set_updated_at();

-- 8) Participants
create table if not exists ai_lab.participants (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references ai_lab.experiments(id) on delete cascade,
  user_id uuid,
  name text not null,
  email text,
  role ai_lab.participant_role not null,
  age_group ai_lab.age_group not null default 'unknown',
  parent_participant_id uuid references ai_lab.participants(id) on delete set null,
  consent_status ai_lab.consent_status not null default 'pending',
  consent_form_id uuid references ai_lab.consent_forms(id),
  consent_version text,
  consent_scope ai_lab.consent_scope,
  consent_date timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_participants_experiment on ai_lab.participants(experiment_id);
create index if not exists idx_participants_user_id on ai_lab.participants(user_id);
create index if not exists idx_participants_role on ai_lab.participants(role);

drop trigger if exists trg_participants_updated_at on ai_lab.participants;
create trigger trg_participants_updated_at
before update on ai_lab.participants
for each row execute function ai_lab.set_updated_at();

-- 9) Measurements
create table if not exists ai_lab.measurements (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references ai_lab.experiments(id) on delete cascade,
  participant_id uuid references ai_lab.participants(id) on delete set null,
  metric_name text not null references ai_lab.metric_definitions(metric_name),
  value numeric not null,
  unit text,
  source text,
  "window" text,
  config_version int not null default 1,
  measured_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_measurements_experiment on ai_lab.measurements(experiment_id, measured_at desc);
create index if not exists idx_measurements_metric on ai_lab.measurements(metric_name, measured_at desc);

-- 10) Events
create table if not exists ai_lab.events (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references ai_lab.experiments(id) on delete cascade,
  participant_id uuid references ai_lab.participants(id) on delete set null,
  event_name text not null,
  event_payload jsonb not null default '{}'::jsonb,
  config_version int not null default 1,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_events_experiment on ai_lab.events(experiment_id, occurred_at desc);
create index if not exists idx_events_name on ai_lab.events(event_name, occurred_at desc);

-- 11) Feature Flags
create table if not exists ai_lab.feature_flags (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references ai_lab.experiments(id) on delete cascade,
  flag_key text not null unique,
  active boolean not null default false,
  rollout_type ai_lab.rollout_type not null default 'none',
  rollout_value jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_feature_flags_updated_at on ai_lab.feature_flags;
create trigger trg_feature_flags_updated_at
before update on ai_lab.feature_flags
for each row execute function ai_lab.set_updated_at();

-- 12) Attachments
create table if not exists ai_lab.attachments (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references ai_lab.experiments(id) on delete cascade,
  title text not null,
  file_url text not null,
  file_type text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_attachments_experiment on ai_lab.attachments(experiment_id);

-- 13) Audit Log
create table if not exists ai_lab.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  actor_role text,
  event_type ai_lab.event_type not null,
  entity_table text not null,
  entity_id uuid,
  before_state jsonb,
  after_state jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_log_entity on ai_lab.audit_log(entity_table, entity_id, created_at desc);
create index if not exists idx_audit_log_event on ai_lab.audit_log(event_type, created_at desc);

-- 14) Inspiration Sources
create table if not exists ai_lab.inspiration_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  type ai_lab.source_type not null,
  url text not null,
  description text,
  tags text[] not null default '{}',
  relevance_score int not null default 50 check (relevance_score between 0 and 100),
  last_checked_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_inspiration_sources_updated_at on ai_lab.inspiration_sources;
create trigger trg_inspiration_sources_updated_at
before update on ai_lab.inspiration_sources
for each row execute function ai_lab.set_updated_at();

-- 15) Ideas Backlog
create table if not exists ai_lab.ideas_backlog (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references ai_lab.inspiration_sources(id) on delete set null,
  title text not null,
  description text,
  source_url text,
  source_date date,
  category ai_lab.experiment_category not null default 'other',
  tags text[] not null default '{}',
  ice_score numeric(4,1),
  status ai_lab.idea_status not null default 'new',
  notes text,
  experiment_id uuid references ai_lab.experiments(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ideas_backlog_status on ai_lab.ideas_backlog(status, created_at desc);
create index if not exists idx_ideas_backlog_source on ai_lab.ideas_backlog(source_id);
create index if not exists idx_ideas_backlog_category on ai_lab.ideas_backlog(category);
create index if not exists idx_ideas_backlog_ice on ai_lab.ideas_backlog(ice_score desc nulls last);

drop trigger if exists trg_ideas_backlog_updated_at on ai_lab.ideas_backlog;
create trigger trg_ideas_backlog_updated_at
before update on ai_lab.ideas_backlog
for each row execute function ai_lab.set_updated_at();

-- 16) Enable RLS on all tables
alter table ai_lab.metric_definitions enable row level security;
alter table ai_lab.experiments enable row level security;
alter table ai_lab.experiment_metrics enable row level security;
alter table ai_lab.consent_forms enable row level security;
alter table ai_lab.participants enable row level security;
alter table ai_lab.measurements enable row level security;
alter table ai_lab.events enable row level security;
alter table ai_lab.feature_flags enable row level security;
alter table ai_lab.attachments enable row level security;
alter table ai_lab.audit_log enable row level security;
alter table ai_lab.inspiration_sources enable row level security;
alter table ai_lab.ideas_backlog enable row level security;

-- 17) RLS Policies (using DROP IF EXISTS to be idempotent)
-- Metric definitions
drop policy if exists "metric_definitions_read" on ai_lab.metric_definitions;
create policy "metric_definitions_read" on ai_lab.metric_definitions for select using (ai_lab.is_analyst());
drop policy if exists "metric_definitions_write" on ai_lab.metric_definitions;
create policy "metric_definitions_write" on ai_lab.metric_definitions for all using (ai_lab.is_lab_manager()) with check (ai_lab.is_lab_manager());

-- Experiments
drop policy if exists "experiments_manager_all" on ai_lab.experiments;
create policy "experiments_manager_all" on ai_lab.experiments for all using (ai_lab.is_lab_manager()) with check (ai_lab.is_lab_manager());
drop policy if exists "experiments_owner_rw" on ai_lab.experiments;
create policy "experiments_owner_rw" on ai_lab.experiments for all using (owner_user_id = ai_lab.current_user_id()) with check (owner_user_id = ai_lab.current_user_id());
drop policy if exists "experiments_participant_read" on ai_lab.experiments;
create policy "experiments_participant_read" on ai_lab.experiments for select using (exists (select 1 from ai_lab.participants p where p.experiment_id = experiments.id and p.user_id = ai_lab.current_user_id()));

-- Experiment metrics
drop policy if exists "experiment_metrics_read" on ai_lab.experiment_metrics;
create policy "experiment_metrics_read" on ai_lab.experiment_metrics for select using (ai_lab.is_analyst() or exists (select 1 from ai_lab.experiments e where e.id = experiment_metrics.experiment_id and (ai_lab.is_lab_manager() or e.owner_user_id = ai_lab.current_user_id())));
drop policy if exists "experiment_metrics_write" on ai_lab.experiment_metrics;
create policy "experiment_metrics_write" on ai_lab.experiment_metrics for all using (exists (select 1 from ai_lab.experiments e where e.id = experiment_metrics.experiment_id and (ai_lab.is_lab_manager() or e.owner_user_id = ai_lab.current_user_id()))) with check (exists (select 1 from ai_lab.experiments e where e.id = experiment_metrics.experiment_id and (ai_lab.is_lab_manager() or e.owner_user_id = ai_lab.current_user_id())));

-- Consent forms
drop policy if exists "consent_forms_read" on ai_lab.consent_forms;
create policy "consent_forms_read" on ai_lab.consent_forms for select using (ai_lab.is_analyst());
drop policy if exists "consent_forms_write" on ai_lab.consent_forms;
create policy "consent_forms_write" on ai_lab.consent_forms for all using (ai_lab.is_lab_manager()) with check (ai_lab.is_lab_manager());

-- Participants
drop policy if exists "participants_manager_all" on ai_lab.participants;
create policy "participants_manager_all" on ai_lab.participants for all using (ai_lab.is_lab_manager()) with check (ai_lab.is_lab_manager());
drop policy if exists "participants_owner_all" on ai_lab.participants;
create policy "participants_owner_all" on ai_lab.participants for all using (exists (select 1 from ai_lab.experiments e where e.id = participants.experiment_id and e.owner_user_id = ai_lab.current_user_id())) with check (exists (select 1 from ai_lab.experiments e where e.id = participants.experiment_id and e.owner_user_id = ai_lab.current_user_id()));
drop policy if exists "participants_self_read" on ai_lab.participants;
create policy "participants_self_read" on ai_lab.participants for select using (user_id = ai_lab.current_user_id());

-- Measurements
drop policy if exists "measurements_read_analyst" on ai_lab.measurements;
create policy "measurements_read_analyst" on ai_lab.measurements for select using (ai_lab.is_analyst());
drop policy if exists "measurements_write_owner" on ai_lab.measurements;
create policy "measurements_write_owner" on ai_lab.measurements for insert with check (exists (select 1 from ai_lab.experiments e where e.id = measurements.experiment_id and (ai_lab.is_lab_manager() or e.owner_user_id = ai_lab.current_user_id())));
drop policy if exists "measurements_self_read" on ai_lab.measurements;
create policy "measurements_self_read" on ai_lab.measurements for select using (participant_id is not null and exists (select 1 from ai_lab.participants p where p.id = measurements.participant_id and p.user_id = ai_lab.current_user_id()));

-- Events
drop policy if exists "events_read_analyst" on ai_lab.events;
create policy "events_read_analyst" on ai_lab.events for select using (ai_lab.is_analyst());
drop policy if exists "events_write_owner" on ai_lab.events;
create policy "events_write_owner" on ai_lab.events for insert with check (exists (select 1 from ai_lab.experiments e where e.id = events.experiment_id and (ai_lab.is_lab_manager() or e.owner_user_id = ai_lab.current_user_id())));
drop policy if exists "events_self_read" on ai_lab.events;
create policy "events_self_read" on ai_lab.events for select using (participant_id is not null and exists (select 1 from ai_lab.participants p where p.id = events.participant_id and p.user_id = ai_lab.current_user_id()));

-- Feature flags
drop policy if exists "feature_flags_read" on ai_lab.feature_flags;
create policy "feature_flags_read" on ai_lab.feature_flags for select using (ai_lab.is_analyst());
drop policy if exists "feature_flags_write" on ai_lab.feature_flags;
create policy "feature_flags_write" on ai_lab.feature_flags for all using (exists (select 1 from ai_lab.experiments e where e.id = feature_flags.experiment_id and (ai_lab.is_lab_manager() or e.owner_user_id = ai_lab.current_user_id()))) with check (exists (select 1 from ai_lab.experiments e where e.id = feature_flags.experiment_id and (ai_lab.is_lab_manager() or e.owner_user_id = ai_lab.current_user_id())));

-- Attachments
drop policy if exists "attachments_read" on ai_lab.attachments;
create policy "attachments_read" on ai_lab.attachments for select using (ai_lab.is_analyst());
drop policy if exists "attachments_write" on ai_lab.attachments;
create policy "attachments_write" on ai_lab.attachments for all using (exists (select 1 from ai_lab.experiments e where e.id = attachments.experiment_id and (ai_lab.is_lab_manager() or e.owner_user_id = ai_lab.current_user_id()))) with check (exists (select 1 from ai_lab.experiments e where e.id = attachments.experiment_id and (ai_lab.is_lab_manager() or e.owner_user_id = ai_lab.current_user_id())));

-- Audit log
drop policy if exists "audit_read" on ai_lab.audit_log;
create policy "audit_read" on ai_lab.audit_log for select using (ai_lab.is_lab_manager());
drop policy if exists "audit_no_direct_write" on ai_lab.audit_log;
create policy "audit_no_direct_write" on ai_lab.audit_log for insert with check (false);

-- Inspiration sources (public read, manager write)
drop policy if exists "inspiration_sources_read" on ai_lab.inspiration_sources;
create policy "inspiration_sources_read" on ai_lab.inspiration_sources for select using (true);
drop policy if exists "inspiration_sources_write" on ai_lab.inspiration_sources;
create policy "inspiration_sources_write" on ai_lab.inspiration_sources for all using (ai_lab.is_lab_manager()) with check (ai_lab.is_lab_manager());

-- Ideas backlog (public read, manager write)
drop policy if exists "ideas_backlog_read" on ai_lab.ideas_backlog;
create policy "ideas_backlog_read" on ai_lab.ideas_backlog for select using (true);
drop policy if exists "ideas_backlog_write" on ai_lab.ideas_backlog;
create policy "ideas_backlog_write" on ai_lab.ideas_backlog for all using (ai_lab.is_lab_manager()) with check (ai_lab.is_lab_manager());

-- 18) Audit triggers
create or replace function ai_lab.audit_changes()
returns trigger
language plpgsql
as $$
declare
  v_event ai_lab.event_type;
  v_entity_id uuid;
begin
  if tg_op = 'INSERT' then
    v_event := 'experiment_created';
    v_entity_id := new.id;
    insert into ai_lab.audit_log(actor_user_id, actor_role, event_type, entity_table, entity_id, before_state, after_state)
    values (ai_lab.current_user_id(), ai_lab.current_role(), v_event, tg_table_name, v_entity_id, null, to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    v_event := 'experiment_updated';
    v_entity_id := new.id;
    if tg_table_name = 'experiments' and old.status is distinct from new.status then
      v_event := 'status_changed';
    elsif tg_table_name = 'experiments' and old.decision is distinct from new.decision then
      v_event := 'decision_set';
    elsif tg_table_name = 'feature_flags' and old.active is distinct from new.active then
      v_event := 'flag_toggled';
    elsif tg_table_name = 'feature_flags' and old.rollout_value is distinct from new.rollout_value then
      v_event := 'rollout_changed';
    elsif tg_table_name = 'participants' and old.consent_status is distinct from new.consent_status then
      v_event := 'consent_updated';
    end if;
    insert into ai_lab.audit_log(actor_user_id, actor_role, event_type, entity_table, entity_id, before_state, after_state)
    values (ai_lab.current_user_id(), ai_lab.current_role(), v_event, tg_table_name, v_entity_id, to_jsonb(old), to_jsonb(new));
    return new;
  elsif tg_op = 'DELETE' then
    v_event := 'delete';
    v_entity_id := old.id;
    insert into ai_lab.audit_log(actor_user_id, actor_role, event_type, entity_table, entity_id, before_state, after_state)
    values (ai_lab.current_user_id(), ai_lab.current_role(), v_event, tg_table_name, v_entity_id, to_jsonb(old), null);
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_audit_experiments on ai_lab.experiments;
create trigger trg_audit_experiments
after insert or update or delete on ai_lab.experiments
for each row execute function ai_lab.audit_changes();

drop trigger if exists trg_audit_feature_flags on ai_lab.feature_flags;
create trigger trg_audit_feature_flags
after insert or update or delete on ai_lab.feature_flags
for each row execute function ai_lab.audit_changes();

drop trigger if exists trg_audit_participants on ai_lab.participants;
create trigger trg_audit_participants
after insert or update or delete on ai_lab.participants
for each row execute function ai_lab.audit_changes();

-- 19) Grant permissions
grant usage on schema ai_lab to authenticated, service_role;
grant all on all tables in schema ai_lab to authenticated, service_role;
grant all on all sequences in schema ai_lab to authenticated, service_role;
grant execute on all functions in schema ai_lab to authenticated, service_role;
