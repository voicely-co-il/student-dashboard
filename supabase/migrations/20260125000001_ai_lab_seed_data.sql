-- ============================
-- Voicely AI Lab - Seed Data
-- Migration: 20260125000001_ai_lab_seed_data.sql
-- ============================

begin;

-- 1) Seed Metric Definitions
-- --------------------------
insert into ai_lab.metric_definitions (metric_name, description, unit, higher_is_better, collection_method, source, aggregation)
values
  -- Voice/Practice Metrics
  ('mpt', 'Maximum Phonation Time - sustained breath duration', 'sec', true, 'auto', 'voice_bot', 'mean'),
  ('breath_control', 'Breath control score based on sustained exercises', 'pts', true, 'auto', 'voice_bot', 'mean'),
  ('pitch_accuracy', 'Pitch accuracy percentage in vocal exercises', '%', true, 'auto', 'voice_bot', 'mean'),
  ('diction_score', 'Diction clarity score from tongue twisters', 'pts', true, 'auto', 'voice_bot', 'mean'),

  -- Completion/Engagement Metrics
  ('homework_completion', 'Percentage of homework/practice sessions completed', '%', true, 'auto', 'telemetry', 'mean'),
  ('task_completion', 'Task completion rate', '%', true, 'auto', 'telemetry', 'mean'),
  ('session_duration', 'Average practice session duration', 'min', true, 'auto', 'telemetry', 'mean'),
  ('practice_frequency', 'Number of practice sessions per week', 'sessions', true, 'auto', 'telemetry', 'sum'),
  ('return_rate', 'Percentage of users returning for next session', '%', true, 'auto', 'telemetry', 'mean'),

  -- Satisfaction Metrics
  ('nps', 'Net Promoter Score (0-10)', 'pts', true, 'manual', 'survey', 'mean'),
  ('satisfaction', 'General satisfaction score (0-100)', '%', true, 'manual', 'survey', 'mean'),
  ('teacher_satisfaction', 'Teacher satisfaction with feature (0-100)', '%', true, 'manual', 'survey', 'mean'),
  ('parent_satisfaction', 'Parent satisfaction with child progress (0-100)', '%', true, 'manual', 'survey', 'mean'),

  -- Teaching Efficiency Metrics
  ('corrections_per_lesson', 'Number of verbal corrections per lesson', 'count', false, 'manual', 'observation', 'mean'),
  ('time_to_correct_posture', 'Time until posture is corrected', 'sec', false, 'auto', 'vision_ai', 'median'),
  ('teacher_prep_time', 'Teacher preparation time per lesson', 'min', false, 'manual', 'survey', 'mean'),

  -- Quality Metrics
  ('vocal_fatigue_score', 'Vocal fatigue self-report (1-5)', 'pts', false, 'manual', 'survey', 'mean'),
  ('voice_quality_rating', 'Overall voice quality rating by teacher', 'pts', true, 'manual', 'teacher_eval', 'mean'),

  -- Technical Metrics
  ('error_rate', 'System error rate', '%', false, 'auto', 'telemetry', 'mean'),
  ('latency_p95', '95th percentile response latency', 'ms', false, 'auto', 'telemetry', 'pct95'),
  ('uptime', 'System uptime percentage', '%', true, 'auto', 'telemetry', 'mean'),

  -- Bug/Issue Tracking
  ('critical_bugs', 'Number of critical bugs reported', 'count', false, 'manual', 'issue_tracker', 'count'),
  ('complaints', 'Number of user complaints', 'count', false, 'manual', 'support', 'count')

on conflict (metric_name) do update set
  description = excluded.description,
  unit = excluded.unit,
  higher_is_better = excluded.higher_is_better,
  collection_method = excluded.collection_method,
  source = excluded.source,
  aggregation = excluded.aggregation,
  updated_at = now();

-- 2) Seed Default Consent Form (Hebrew)
-- -------------------------------------
insert into ai_lab.consent_forms (version, locale, doc_url, required_for_roles, required_for_age_groups, default_scope, retention_days, active)
values
  ('v1.0', 'he-IL', null,
   array['student'::ai_lab.participant_role, 'parent'::ai_lab.participant_role],
   array['u13'::ai_lab.age_group, '13_17'::ai_lab.age_group],
   'telemetry_only', 90, true)
on conflict (version, locale) do nothing;

-- 3) Example Experiment: Voicely Talkback (Discovery status)
-- ---------------------------------------------------------
-- Note: You'll need to replace 'owner_user_id' with an actual admin UUID
-- This is commented out - uncomment and modify when ready to use

/*
do $$
declare
  v_experiment_id uuid;
  v_owner_id uuid := '00000000-0000-0000-0000-000000000000'; -- Replace with actual admin UUID
begin
  -- Create experiment
  insert into ai_lab.experiments (
    name,
    description,
    hypothesis,
    category,
    status,
    source_url,
    owner_user_id,
    risk_level,
    privacy_impact,
    data_sensitivity,
    kill_criteria,
    planned_duration_days,
    flag_key,
    cost_estimate,
    expected_benefit,
    notes
  ) values (
    'Voicely Talkback',
    'Real-time voice practice assistant that listens and speaks with students during homework',
    'If we provide a voice assistant that listens and responds in real-time, we will see a 20% increase in homework completion, because it makes practice more structured and engaging',
    'voice_ai',
    'discovery',
    'https://nvidia.com/personaplex',
    v_owner_id,
    'medium',
    'moderate',
    'audio',
    '>10% complaints OR any privacy incident OR critical bug unresolved >48h',
    14,
    'ai_lab.voicely_talkback',
    5000, -- dev hours cost estimate
    15000, -- retention value estimate
    'Inspired by NVIDIA PersonaPlex from newsletter #46'
  )
  returning id into v_experiment_id;

  -- Add metrics
  insert into ai_lab.experiment_metrics (experiment_id, metric_name, baseline_value, target_value, target_direction, is_primary)
  values
    (v_experiment_id, 'homework_completion', 45, 65, 'increase', true),
    (v_experiment_id, 'mpt', 8, 12, 'increase', false),
    (v_experiment_id, 'nps', null, 7, 'increase', false);

  -- Create feature flag (disabled)
  insert into ai_lab.feature_flags (experiment_id, flag_key, active, rollout_type, rollout_value)
  values (v_experiment_id, 'ai_lab.voicely_talkback', false, 'none', '{}'::jsonb);

  raise notice 'Created experiment: %', v_experiment_id;
end;
$$;
*/

commit;
