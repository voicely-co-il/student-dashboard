-- Create role enum
CREATE TYPE public.app_role AS ENUM ('student', 'teacher', 'admin');

-- Create level enum
CREATE TYPE public.student_level AS ENUM ('beginner', 'intermediate', 'advanced');

-- Create status enums
CREATE TYPE public.user_status AS ENUM ('active', 'paused', 'archived');
CREATE TYPE public.lesson_status AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show');
CREATE TYPE public.assignment_status AS ENUM ('assigned', 'submitted', 'reviewed');
CREATE TYPE public.assignment_type AS ENUM ('song', 'breathing_drill', 'diction', 'warm_up');
CREATE TYPE public.feedback_type AS ENUM ('text', 'audio', 'video');
CREATE TYPE public.file_type AS ENUM ('audio', 'video');

-- Create user_roles table for role-based access (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'student',
  UNIQUE (user_id, role)
);

-- Create profiles table (public user information)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT,
  phone TEXT,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  status user_status DEFAULT 'active',
  notion_id TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create students table (extended student profile)
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  level student_level DEFAULT 'beginner',
  tags TEXT[] DEFAULT '{}',
  goals TEXT,
  medical_notes TEXT,
  progress_score INTEGER DEFAULT 0 CHECK (progress_score >= 0 AND progress_score <= 100),
  start_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create lessons table
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 45,
  status lesson_status DEFAULT 'scheduled',
  attendance_note TEXT,
  recording_url TEXT,
  zoom_link TEXT,
  notion_lesson_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create assignments table
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type assignment_type DEFAULT 'song',
  due_date DATE,
  status assignment_status DEFAULT 'assigned',
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create recordings table
CREATE TABLE public.recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  file_type file_type DEFAULT 'audio',
  duration_seconds INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create feedback table
CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE SET NULL,
  recording_id UUID REFERENCES public.recordings(id) ON DELETE SET NULL,
  type feedback_type DEFAULT 'text',
  content TEXT,
  file_url TEXT,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create teacher_notes table (internal notes, not visible to students)
CREATE TABLE public.teacher_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT NOT NULL,
  is_operational BOOLEAN DEFAULT false,
  reminder_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create weekly_plans table
CREATE TABLE public.weekly_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  goals TEXT[],
  exercises JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (student_id, week_start)
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_plans ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get student_id from user_id
CREATE OR REPLACE FUNCTION public.get_student_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.students WHERE user_id = _user_id LIMIT 1
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Teachers can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'teacher'));

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Teachers can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for students
CREATE POLICY "Students can view their own student record"
  ON public.students FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Teachers can view all students"
  ON public.students FOR SELECT
  USING (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Students can update their own record"
  ON public.students FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own student record"
  ON public.students FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Teachers can update any student"
  ON public.students FOR UPDATE
  USING (public.has_role(auth.uid(), 'teacher'));

-- RLS Policies for lessons
CREATE POLICY "Students can view their own lessons"
  ON public.lessons FOR SELECT
  USING (student_id = public.get_student_id(auth.uid()));

CREATE POLICY "Teachers can view all lessons"
  ON public.lessons FOR SELECT
  USING (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers can insert lessons"
  ON public.lessons FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers can update lessons"
  ON public.lessons FOR UPDATE
  USING (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers can delete lessons"
  ON public.lessons FOR DELETE
  USING (public.has_role(auth.uid(), 'teacher'));

-- RLS Policies for assignments
CREATE POLICY "Students can view their own assignments"
  ON public.assignments FOR SELECT
  USING (student_id = public.get_student_id(auth.uid()));

CREATE POLICY "Teachers can view all assignments"
  ON public.assignments FOR SELECT
  USING (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers can insert assignments"
  ON public.assignments FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers can update assignments"
  ON public.assignments FOR UPDATE
  USING (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Students can update their own assignment status"
  ON public.assignments FOR UPDATE
  USING (student_id = public.get_student_id(auth.uid()));

-- RLS Policies for recordings
CREATE POLICY "Students can view their own recordings"
  ON public.recordings FOR SELECT
  USING (student_id = public.get_student_id(auth.uid()));

CREATE POLICY "Teachers can view all recordings"
  ON public.recordings FOR SELECT
  USING (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Students can insert their own recordings"
  ON public.recordings FOR INSERT
  WITH CHECK (student_id = public.get_student_id(auth.uid()));

CREATE POLICY "Students can delete their own recordings"
  ON public.recordings FOR DELETE
  USING (student_id = public.get_student_id(auth.uid()));

-- RLS Policies for feedback
CREATE POLICY "Students can view their own feedback"
  ON public.feedback FOR SELECT
  USING (student_id = public.get_student_id(auth.uid()));

CREATE POLICY "Teachers can view all feedback"
  ON public.feedback FOR SELECT
  USING (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers can insert feedback"
  ON public.feedback FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers can update feedback"
  ON public.feedback FOR UPDATE
  USING (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Students can update read_at on their own feedback"
  ON public.feedback FOR UPDATE
  USING (student_id = public.get_student_id(auth.uid()));

-- RLS Policies for teacher_notes (only teachers can access)
CREATE POLICY "Teachers can view all teacher notes"
  ON public.teacher_notes FOR SELECT
  USING (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers can insert teacher notes"
  ON public.teacher_notes FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers can update teacher notes"
  ON public.teacher_notes FOR UPDATE
  USING (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers can delete teacher notes"
  ON public.teacher_notes FOR DELETE
  USING (public.has_role(auth.uid(), 'teacher'));

-- RLS Policies for weekly_plans
CREATE POLICY "Students can view their own weekly plans"
  ON public.weekly_plans FOR SELECT
  USING (student_id = public.get_student_id(auth.uid()));

CREATE POLICY "Teachers can view all weekly plans"
  ON public.weekly_plans FOR SELECT
  USING (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers can insert weekly plans"
  ON public.weekly_plans FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers can update weekly plans"
  ON public.weekly_plans FOR UPDATE
  USING (public.has_role(auth.uid(), 'teacher'));

-- Create indexes for performance
CREATE INDEX idx_students_user_id ON public.students(user_id);
CREATE INDEX idx_lessons_student_id ON public.lessons(student_id);
CREATE INDEX idx_lessons_scheduled_at ON public.lessons(scheduled_at);
CREATE INDEX idx_assignments_student_id ON public.assignments(student_id);
CREATE INDEX idx_assignments_due_date ON public.assignments(due_date);
CREATE INDEX idx_feedback_student_id ON public.feedback(student_id);
CREATE INDEX idx_recordings_assignment_id ON public.recordings(assignment_id);
CREATE INDEX idx_teacher_notes_reminder ON public.teacher_notes(reminder_date) WHERE is_operational = true;
CREATE INDEX idx_weekly_plans_student_week ON public.weekly_plans(student_id, week_start);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teacher_notes_updated_at
  BEFORE UPDATE ON public.teacher_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_weekly_plans_updated_at
  BEFORE UPDATE ON public.weekly_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-create student profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', 'משתמש חדש'));
  
  -- Create student record (default role)
  INSERT INTO public.students (user_id)
  VALUES (NEW.id);
  
  -- Assign student role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create storage bucket for recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('recordings', 'recordings', false);

-- Storage policies for recordings
CREATE POLICY "Students can upload their own recordings"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'recordings' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Students can view their own recordings"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'recordings' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Teachers can view all recordings"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'recordings' 
    AND public.has_role(auth.uid(), 'teacher')
  );

CREATE POLICY "Students can delete their own recordings"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'recordings' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );