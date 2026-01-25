// =====================================================
// VOICELY GROUPS PLATFORM - TYPE DEFINITIONS
// =====================================================

// =====================================================
// ENUMS
// =====================================================

export type ExerciseCategory = 'warmup' | 'technique' | 'song' | 'breathing' | 'rhythm';
export type ExerciseDifficulty = 'easy' | 'medium' | 'advanced';
export type AgeGroup = '10-12' | '13-14';
export type PracticeStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';
export type AnalysisStatus = 'queued' | 'processing' | 'complete' | 'failed';
export type LeaderboardMode = 'full' | 'semi' | 'private';
export type ChallengeStatus = 'draft' | 'active' | 'ended' | 'archived';
export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

// =====================================================
// GROUP STUDENT
// =====================================================

export interface GroupStudent {
  id: string;
  user_id: string;

  // Parent info
  parent_email: string;
  parent_name: string;
  parent_phone?: string;

  // Student info
  student_name: string;
  student_name_en?: string;
  age: number;
  birth_date?: string;
  avatar_url?: string;
  avatar_emoji: string;

  // Group
  group_id?: string;

  // Consent
  consent_audio_recording: boolean;
  consent_data_processing: boolean;
  consent_peer_sharing: boolean;
  consent_date?: string;

  // Settings
  age_group: AgeGroup;
  ui_theme: 'auto' | 'playful' | 'mature';
  notification_preferences: NotificationPreferences;

  // Gamification
  current_streak: number;
  longest_streak: number;
  total_xp: number;
  current_level: number;

  // Status
  is_active: boolean;
  last_practice_at?: string;
  onboarding_completed: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  daily_reminder: boolean;
  challenge_updates: boolean;
  weekly_report: boolean;
}

// =====================================================
// PRACTICE EXERCISES
// =====================================================

export interface ExerciseInstruction {
  step: number;
  text_he: string;
  text_en?: string;
  duration_sec: number;
}

export interface SuccessCriteria {
  min_duration_percent: number;
  pitch_accuracy_threshold: number;
  breath_steadiness_threshold: number;
}

export interface AIFeedbackTemplates {
  excellent: string[];
  good: string[];
  needs_work: string[];
}

export interface PracticeExercise {
  id: string;

  // Basic info
  title: string;
  title_he: string;
  description?: string;
  description_he?: string;

  // Classification
  category: ExerciseCategory;
  difficulty: ExerciseDifficulty;
  age_groups: AgeGroup[];
  tags: string[];

  // Duration
  duration_minutes: number;
  min_duration_seconds: number;
  max_duration_seconds: number;

  // Instructions
  instructions: ExerciseInstruction[];

  // Media
  audio_demo_url?: string;
  video_demo_url?: string;
  thumbnail_url?: string;

  // Criteria
  success_criteria: SuccessCriteria;
  ai_feedback_templates: AIFeedbackTemplates;

  // Metadata
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

// =====================================================
// DAILY PRACTICE PLANS
// =====================================================

export interface PlannedExercise {
  exercise_id: string;
  order: number;
  type: ExerciseCategory;
}

export interface DailyPracticePlan {
  id: string;
  student_id: string;
  plan_date: string;

  // Exercises
  exercises: PlannedExercise[];
  completed_exercises: string[];
  status: PracticeStatus;

  // Time
  estimated_duration_minutes: number;
  actual_duration_minutes: number;
  started_at?: string;
  completed_at?: string;

  // Performance
  avg_score?: number;
  exercises_count: number;
  completed_count: number;

  // XP
  xp_earned: number;

  created_at: string;
  updated_at: string;
}

// =====================================================
// EXERCISE RECORDINGS
// =====================================================

export interface AIAnalysisResult {
  pitch_accuracy: number;
  rhythm_accuracy: number;
  breath_control: number;
  energy_level: number;
  resonance_quality: 'excellent' | 'good' | 'fair' | 'needs_work';
  detected_issues: string[];
  strengths: string[];
}

export interface ExerciseRecording {
  id: string;
  student_id: string;
  exercise_id: string;
  daily_plan_id?: string;

  // Audio
  audio_url: string;
  audio_format: string;
  duration_seconds: number;
  file_size_bytes?: number;

  // Analysis
  analysis_status: AnalysisStatus;
  analysis_started_at?: string;
  analysis_completed_at?: string;
  ai_analysis?: AIAnalysisResult;

  // Scores
  overall_score?: number;
  pitch_score?: number;
  rhythm_score?: number;
  breath_score?: number;
  energy_score?: number;

  // Feedback
  ai_feedback_text?: string;
  ai_feedback_he?: string;
  ai_suggestions?: string[];
  teacher_feedback?: string;
  teacher_score?: number;

  // XP
  xp_earned: number;

  // Metadata
  attempt_number: number;
  is_best_attempt: boolean;

  created_at: string;
  updated_at: string;
}

// =====================================================
// WEEKLY CHALLENGES
// =====================================================

export interface ChallengeCriteria {
  min_pitch_accuracy: number;
  min_energy_level: number;
  no_breaks: boolean;
  duration_range: [number, number];
}

export interface ScoringWeights {
  ai_score: number;
  teacher_score: number;
  effort_score: number;
  participation_bonus: number;
}

export interface ChallengePrizes {
  first: { xp: number; badge?: string };
  second: { xp: number; badge?: string };
  third: { xp: number; badge?: string };
  participation: { xp: number };
}

export interface WeeklyChallenge {
  id: string;
  group_id: string;

  // Info
  title: string;
  title_he: string;
  description?: string;
  description_he?: string;

  // Song
  song_title: string;
  song_artist?: string;
  song_excerpt_start_sec: number;
  song_excerpt_end_sec: number;
  reference_audio_url?: string;
  lyrics_text?: string;
  lyrics_he?: string;

  // Rules
  criteria: ChallengeCriteria;
  max_attempts: number;
  scoring_weights: ScoringWeights;

  // Display
  leaderboard_mode: LeaderboardMode;
  allow_comments: boolean;
  show_scores_publicly: boolean;

  // Prizes
  prizes: ChallengePrizes;

  // Timeline
  status: ChallengeStatus;
  starts_at: string;
  ends_at: string;
  results_announced_at?: string;

  // Creator
  created_by: string;
  created_at: string;
  updated_at: string;
}

// =====================================================
// CHALLENGE ENTRIES
// =====================================================

export interface ChallengeEntry {
  id: string;
  challenge_id: string;
  student_id: string;

  // Recording
  recording_url: string;
  duration_seconds: number;
  attempt_number: number;

  // Scores
  ai_score?: number;
  teacher_score?: number;
  effort_score?: number;
  participation_bonus: number;
  final_score?: number;

  // Ranking
  rank?: number;

  // Feedback
  ai_analysis?: AIAnalysisResult;
  ai_feedback?: string;
  ai_feedback_he?: string;
  teacher_feedback?: string;
  teacher_feedback_he?: string;

  // Sharing
  is_shared: boolean;
  shared_at?: string;

  // Engagement
  likes_count: number;
  comments_count: number;

  // XP
  xp_earned: number;

  // Status
  is_best_entry: boolean;
  is_disqualified: boolean;

  created_at: string;
  updated_at: string;

  // Relations (when joined)
  student?: GroupStudent;
  challenge?: WeeklyChallenge;
}

// =====================================================
// CHALLENGE COMMENTS
// =====================================================

export interface ChallengeComment {
  id: string;
  entry_id: string;
  author_id: string;
  content: string;
  is_approved: boolean;
  is_hidden: boolean;
  created_at: string;

  // Relations
  author?: GroupStudent;
}

// =====================================================
// STUDENT PROGRESS
// =====================================================

export interface StudentProgress {
  id: string;
  student_id: string;
  progress_date: string;

  // Performance
  pitch_accuracy_avg?: number;
  rhythm_accuracy_avg?: number;
  breath_control_avg?: number;
  energy_level_avg?: number;
  overall_score_avg?: number;

  // Activity
  exercises_completed: number;
  exercises_total: number;
  practice_minutes: number;
  recordings_count: number;

  // Streak
  streak_days: number;
  streak_continued: boolean;

  // XP
  xp_earned: number;
  total_xp: number;

  // Level
  level_at_date: number;

  // Challenges
  challenges_participated: number;
  challenge_rank?: number;

  created_at: string;
}

// =====================================================
// STUDENT ACHIEVEMENTS
// =====================================================

export interface StudentAchievement {
  id: string;
  student_id: string;

  // Achievement
  achievement_type: string;
  achievement_name: string;
  achievement_name_he: string;
  achievement_description?: string;
  achievement_icon: string;

  // Rarity
  rarity: AchievementRarity;

  // XP
  xp_reward: number;

  // Context
  achievement_data?: Record<string, unknown>;

  // Display
  is_displayed: boolean;

  earned_at: string;
}

// =====================================================
// UI TYPES
// =====================================================

export interface ExerciseWithProgress extends PracticeExercise {
  isCompleted: boolean;
  bestScore?: number;
  lastAttempt?: ExerciseRecording;
}

export interface DailyPlanWithExercises extends DailyPracticePlan {
  exerciseDetails: ExerciseWithProgress[];
}

export interface ChallengeWithEntries extends WeeklyChallenge {
  entries: ChallengeEntry[];
  myEntry?: ChallengeEntry;
  participantsCount: number;
  timeRemaining?: string;
}

export interface LeaderboardEntry {
  rank: number;
  student: GroupStudent;
  entry: ChallengeEntry;
  isCurrentUser: boolean;
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface DailyPlanResponse {
  plan: DailyPracticePlan;
  exercises: PracticeExercise[];
}

export interface RecordingAnalysisResponse {
  recording_id: string;
  analysis: AIAnalysisResult;
  feedback_he: string;
  suggestions: string[];
  score: number;
  xp_earned: number;
}

export interface ChallengeLeaderboardResponse {
  challenge: WeeklyChallenge;
  leaderboard: LeaderboardEntry[];
  myRank?: number;
  myEntry?: ChallengeEntry;
}

// =====================================================
// FORM TYPES
// =====================================================

export interface RegistrationFormData {
  parent_name: string;
  parent_email: string;
  parent_phone: string;
  student_name: string;
  student_age: number;
  avatar_emoji: string;
  consent_audio_recording: boolean;
  consent_data_processing: boolean;
  consent_peer_sharing: boolean;
}

export interface ChallengeFormData {
  title_he: string;
  description_he?: string;
  song_title: string;
  song_artist?: string;
  song_excerpt_start_sec: number;
  song_excerpt_end_sec: number;
  reference_audio_url?: string;
  lyrics_he?: string;
  max_attempts: number;
  leaderboard_mode: LeaderboardMode;
  allow_comments: boolean;
  starts_at: string;
  ends_at: string;
}

// =====================================================
// CONTEXT TYPES
// =====================================================

export interface GroupStudentContextType {
  student: GroupStudent | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  updateStudent: (data: Partial<GroupStudent>) => Promise<void>;
}

export interface PracticeContextType {
  todaysPlan: DailyPlanWithExercises | null;
  isLoading: boolean;
  currentExercise: ExerciseWithProgress | null;
  setCurrentExercise: (exercise: ExerciseWithProgress | null) => void;
  completeExercise: (exerciseId: string, recording: ExerciseRecording) => Promise<void>;
  refetchPlan: () => void;
}
