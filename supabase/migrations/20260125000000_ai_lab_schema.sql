-- ============================
-- Voicely AI Lab - Full Schema
-- Migration: 20260125000000_ai_lab_schema.sql
-- ============================

begin;

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

-- 3) Helper functions (adapt to your auth)
-- --------------------------------------

-- Returns current user UUID.
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

-- Returns current role string.
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

-- 4) Common trigger: updated_at
create or replace function ai_lab.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- 5) Metric Dictionary (Definitions)
-- ----------------------------------
create table if not exists ai_lab.metric_definitions (
  metric_name text primary key,
  description text not null,
  unit text not null,                       -- e.g. 'sec', '%', 'pts'
  higher_is_better boolean not null default true,
  collection_method ai_lab.metric_collection_method not null default 'manual',
  source text,                               -- e.g. 'survey', 'voice_bot', 'zoom_sdk'
  aggregation ai_lab.metric_aggregation not null default 'mean',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_metric_definitions_updated_at
before update on ai_lab.metric_definitions
for each row execute function ai_lab.set_updated_at();

-- 6) Experiments
-- --------------
create table if not exists ai_lab.experiments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  hypothesis text not null,
  category ai_lab.experiment_category not null default 'other',
  status ai_lab.experiment_status not null default 'discovery',
  source_url text,
  owner_user_id uuid not null,              -- who is accountable (admin/lab_manager/teacher)
  risk_level ai_lab.risk_level not null default 'medium',
  privacy_impact ai_lab.privacy_impact not null default 'minor',
  data_sensitivity text not null default 'telemetry', -- free text: 'PII','voice','video','behavioral','telemetry'
  kill_criteria text not null,
  start_date date,
  end_date date,
  planned_duration_days int not null default 14,
  decision ai_lab.experiment_decision,
  learnings text,
  config_version int not null default 1,     -- bump on major config changes
  flag_key text unique,                      -- tie to feature_flags.flag_key
  current_rollout_pct int not null default 0 check (current_rollout_pct between 0 and 100),

  cost_estimate numeric,                     -- optional
  expected_benefit numeric,                  -- optional
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_experiments_status on ai_lab.experiments(status);
create index if not exists idx_experiments_owner on ai_lab.experiments(owner_user_id);
create index if not exists idx_experiments_category on ai_lab.experiments(category);

create trigger trg_experiments_updated_at
before update on ai_lab.experiments
for each row execute function ai_lab.set_updated_at();

-- 7) Experiment metric targets (3-ish metrics per experiment, but flexible)
-- ------------------------------------------------------------------------
create table if not exists ai_lab.experiment_metrics (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references ai_lab.experiments(id) on delete cascade,
  metric_name text not null references ai_lab.metric_definitions(metric_name),
  baseline_value numeric,
  target_value numeric,
  target_direction text, -- optional: 'increase','decrease','maintain'
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (experiment_id, metric_name)
);

create index if not exists idx_experiment_metrics_experiment on ai_lab.experiment_metrics(experiment_id);

create trigger trg_experiment_metrics_updated_at
before update on ai_lab.experiment_metrics
for each row execute function ai_lab.set_updated_at();

-- 8) Consent Forms (versioned)
-- ----------------------------
create table if not exists ai_lab.consent_forms (
  id uuid primary key default gen_random_uuid(),
  version text not null,                     -- e.g. 'v1.0'
  locale text not null default 'he-IL',
  doc_url text,                              -- link to your stored doc
  required_for_roles ai_lab.participant_role[] not null default array['student'::ai_lab.participant_role],
  required_for_age_groups ai_lab.age_group[] not null default array['u13'::ai_lab.age_group,'13_17'::ai_lab.age_group],
  default_scope ai_lab.consent_scope not null default 'telemetry_only',
  retention_days int not null default 90,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(version, locale)
);

create trigger trg_consent_forms_updated_at
before update on ai_lab.consent_forms
for each row execute function ai_lab.set_updated_at();

-- 9) Participants
-- ---------------
create table if not exists ai_lab.participants (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references ai_lab.experiments(id) on delete cascade,
  user_id uuid,                              -- FK to your users if exists (optional)
  name text not null,
  email text,
  role ai_lab.participant_role not null,
  age_group ai_lab.age_group not null default 'unknown',

  parent_participant_id uuid references ai_lab.participants(id) on delete set null, -- link child->parent record if needed

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

create trigger trg_participants_updated_at
before update on ai_lab.participants
for each row execute function ai_lab.set_updated_at();

-- 10) Measurements (aggregated metric values)
-- -------------------------------------------
create table if not exists ai_lab.measurements (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references ai_lab.experiments(id) on delete cascade,
  participant_id uuid references ai_lab.participants(id) on delete set null,
  metric_name text not null references ai_lab.metric_definitions(metric_name),
  value numeric not null,
  unit text,                                 -- snapshot unit (optional)
  source text,                               -- snapshot source (optional)
  window text,                               -- e.g. 'per_session','daily','weekly'
  config_version int not null default 1,
  measured_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_measurements_experiment on ai_lab.measurements(experiment_id, measured_at desc);
create index if not exists idx_measurements_metric on ai_lab.measurements(metric_name, measured_at desc);

-- 11) Events (raw telemetry)
-- --------------------------
create table if not exists ai_lab.events (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references ai_lab.experiments(id) on delete cascade,
  participant_id uuid references ai_lab.participants(id) on delete set null,
  event_name text not null,                  -- free string, or map to your enums
  event_payload jsonb not null default '{}'::jsonb,
  config_version int not null default 1,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_events_experiment on ai_lab.events(experiment_id, occurred_at desc);
create index if not exists idx_events_name on ai_lab.events(event_name, occurred_at desc);

-- 12) Feature Flags
-- -----------------
create table if not exists ai_lab.feature_flags (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references ai_lab.experiments(id) on delete cascade,
  flag_key text not null unique,             -- e.g. 'ai_lab.voicely_talkback'
  active boolean not null default false,
  rollout_type ai_lab.rollout_type not null default 'none',
  rollout_value jsonb not null default '{}'::jsonb,
  -- examples:
  -- user_list: {"user_ids":[...]}
  -- role: {"roles":["teacher","student"]}
  -- percent: {"percent":10,"seed":"2026-01"}
  -- all: {}
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_feature_flags_updated_at
before update on ai_lab.feature_flags
for each row execute function ai_lab.set_updated_at();

-- 13) Attachments
-- ---------------
create table if not exists ai_lab.attachments (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references ai_lab.experiments(id) on delete cascade,
  title text not null,
  file_url text not null,                    -- store URL to object storage
  file_type text,                            -- 'pdf','video','image','config'
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_attachments_experiment on ai_lab.attachments(experiment_id);

-- 14) Audit Log
-- -------------
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

-- 15) Audit helper: generic trigger for experiments + flags + participants
-- -----------------------------------------------------------------------
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

    -- special cases
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

-- 16) RLS
-- -------
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

-- 16.1) Policies - Metric definitions: analysts can read; managers can write
drop policy if exists "metric_definitions_read" on ai_lab.metric_definitions;
create policy "metric_definitions_read"
on ai_lab.metric_definitions
for select
using (ai_lab.is_analyst());

drop policy if exists "metric_definitions_write" on ai_lab.metric_definitions;
create policy "metric_definitions_write"
on ai_lab.metric_definitions
for all
using (ai_lab.is_lab_manager())
with check (ai_lab.is_lab_manager());

-- 16.2) Experiments: managers full; owner can read/write; others read only if participant
drop policy if exists "experiments_manager_all" on ai_lab.experiments;
create policy "experiments_manager_all"
on ai_lab.experiments
for all
using (ai_lab.is_lab_manager())
with check (ai_lab.is_lab_manager());

drop policy if exists "experiments_owner_rw" on ai_lab.experiments;
create policy "experiments_owner_rw"
on ai_lab.experiments
for all
using (owner_user_id = ai_lab.current_user_id())
with check (owner_user_id = ai_lab.current_user_id());

-- Optional: allow teachers to see experiments they participate in (read-only)
drop policy if exists "experiments_participant_read" on ai_lab.experiments;
create policy "experiments_participant_read"
on ai_lab.experiments
for select
using (
  exists (
    select 1 from ai_lab.participants p
    where p.experiment_id = experiments.id
      and p.user_id = ai_lab.current_user_id()
  )
);

-- 16.3) Experiment metrics: follow experiment access
drop policy if exists "experiment_metrics_read" on ai_lab.experiment_metrics;
create policy "experiment_metrics_read"
on ai_lab.experiment_metrics
for select
using (
  ai_lab.is_analyst()
  or exists (select 1 from ai_lab.experiments e where e.id = experiment_metrics.experiment_id and (ai_lab.is_lab_manager() or e.owner_user_id = ai_lab.current_user_id()))
);

drop policy if exists "experiment_metrics_write" on ai_lab.experiment_metrics;
create policy "experiment_metrics_write"
on ai_lab.experiment_metrics
for all
using (
  exists (select 1 from ai_lab.experiments e where e.id = experiment_metrics.experiment_id and (ai_lab.is_lab_manager() or e.owner_user_id = ai_lab.current_user_id()))
)
with check (
  exists (select 1 from ai_lab.experiments e where e.id = experiment_metrics.experiment_id and (ai_lab.is_lab_manager() or e.owner_user_id = ai_lab.current_user_id()))
);

-- 16.4) Consent forms: managers only write; analysts read
drop policy if exists "consent_forms_read" on ai_lab.consent_forms;
create policy "consent_forms_read"
on ai_lab.consent_forms
for select
using (ai_lab.is_analyst());

drop policy if exists "consent_forms_write" on ai_lab.consent_forms;
create policy "consent_forms_write"
on ai_lab.consent_forms
for all
using (ai_lab.is_lab_manager())
with check (ai_lab.is_lab_manager());

-- 16.5) Participants: managers full; experiment owner full; (no analyst access due to PII)
drop policy if exists "participants_manager_all" on ai_lab.participants;
create policy "participants_manager_all"
on ai_lab.participants
for all
using (ai_lab.is_lab_manager())
with check (ai_lab.is_lab_manager());

drop policy if exists "participants_owner_all" on ai_lab.participants;
create policy "participants_owner_all"
on ai_lab.participants
for all
using (
  exists (select 1 from ai_lab.experiments e where e.id = participants.experiment_id and e.owner_user_id = ai_lab.current_user_id())
)
with check (
  exists (select 1 from ai_lab.experiments e where e.id = participants.experiment_id and e.owner_user_id = ai_lab.current_user_id())
);

-- Optional: participant can view own row (if user_id exists)
drop policy if exists "participants_self_read" on ai_lab.participants;
create policy "participants_self_read"
on ai_lab.participants
for select
using (user_id = ai_lab.current_user_id());

-- 16.6) Measurements: analysts read; managers/owners write; participants can read their own
drop policy if exists "measurements_read_analyst" on ai_lab.measurements;
create policy "measurements_read_analyst"
on ai_lab.measurements
for select
using (ai_lab.is_analyst());

drop policy if exists "measurements_write_owner" on ai_lab.measurements;
create policy "measurements_write_owner"
on ai_lab.measurements
for insert
using (
  exists (select 1 from ai_lab.experiments e where e.id = measurements.experiment_id and (ai_lab.is_lab_manager() or e.owner_user_id = ai_lab.current_user_id()))
)
with check (
  exists (select 1 from ai_lab.experiments e where e.id = measurements.experiment_id and (ai_lab.is_lab_manager() or e.owner_user_id = ai_lab.current_user_id()))
);

drop policy if exists "measurements_self_read" on ai_lab.measurements;
create policy "measurements_self_read"
on ai_lab.measurements
for select
using (
  participant_id is not null and exists (
    select 1 from ai_lab.participants p
    where p.id = measurements.participant_id
      and p.user_id = ai_lab.current_user_id()
  )
);

-- 16.7) Events: analysts read; managers/owners write; participants can read their own
drop policy if exists "events_read_analyst" on ai_lab.events;
create policy "events_read_analyst"
on ai_lab.events
for select
using (ai_lab.is_analyst());

drop policy if exists "events_write_owner" on ai_lab.events;
create policy "events_write_owner"
on ai_lab.events
for insert
using (
  exists (select 1 from ai_lab.experiments e where e.id = events.experiment_id and (ai_lab.is_lab_manager() or e.owner_user_id = ai_lab.current_user_id()))
)
with check (
  exists (select 1 from ai_lab.experiments e where e.id = events.experiment_id and (ai_lab.is_lab_manager() or e.owner_user_id = ai_lab.current_user_id()))
);

drop policy if exists "events_self_read" on ai_lab.events;
create policy "events_self_read"
on ai_lab.events
for select
using (
  participant_id is not null and exists (
    select 1 from ai_lab.participants p
    where p.id = events.participant_id
      and p.user_id = ai_lab.current_user_id()
  )
);

-- 16.8) Feature flags: managers + owner full; others read only
drop policy if exists "feature_flags_read" on ai_lab.feature_flags;
create policy "feature_flags_read"
on ai_lab.feature_flags
for select
using (ai_lab.is_analyst());

drop policy if exists "feature_flags_write" on ai_lab.feature_flags;
create policy "feature_flags_write"
on ai_lab.feature_flags
for all
using (
  exists (select 1 from ai_lab.experiments e where e.id = feature_flags.experiment_id and (ai_lab.is_lab_manager() or e.owner_user_id = ai_lab.current_user_id()))
)
with check (
  exists (select 1 from ai_lab.experiments e where e.id = feature_flags.experiment_id and (ai_lab.is_lab_manager() or e.owner_user_id = ai_lab.current_user_id()))
);

-- 16.9) Attachments: analysts read; owners/managers write
drop policy if exists "attachments_read" on ai_lab.attachments;
create policy "attachments_read"
on ai_lab.attachments
for select
using (ai_lab.is_analyst());

drop policy if exists "attachments_write" on ai_lab.attachments;
create policy "attachments_write"
on ai_lab.attachments
for all
using (
  exists (select 1 from ai_lab.experiments e where e.id = attachments.experiment_id and (ai_lab.is_lab_manager() or e.owner_user_id = ai_lab.current_user_id()))
)
with check (
  exists (select 1 from ai_lab.experiments e where e.id = attachments.experiment_id and (ai_lab.is_lab_manager() or e.owner_user_id = ai_lab.current_user_id()))
);

-- 16.10) Audit log: managers only (read); writes happen via triggers anyway
drop policy if exists "audit_read" on ai_lab.audit_log;
create policy "audit_read"
on ai_lab.audit_log
for select
using (ai_lab.is_lab_manager());

drop policy if exists "audit_no_direct_write" on ai_lab.audit_log;
create policy "audit_no_direct_write"
on ai_lab.audit_log
for insert
using (false)
with check (false);

-- 17) Views for analysts (redacted PII)
-- -------------------------------------
create or replace view ai_lab.participants_redacted as
select
  id,
  experiment_id,
  -- Redact PII
  left(name, 1) || '***' as name_redacted,
  role,
  age_group,
  consent_status,
  consent_version,
  consent_scope,
  consent_date,
  created_at,
  updated_at
from ai_lab.participants;

-- Grant to analysts
grant select on ai_lab.participants_redacted to authenticated;

commit;
