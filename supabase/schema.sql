-- ==============================================================================
-- FormFlow: Google Forms-inspired Full-Stack Application Schema for Supabase
-- Primary Admin: arujagadeesh801@gmail.com
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUMS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'organizer', 'user');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'form_status') THEN
    CREATE TYPE form_status AS ENUM ('draft', 'published', 'closed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_type') THEN
    CREATE TYPE question_type AS ENUM (
      'short_answer',
      'paragraph',
      'multiple_choice',
      'checkboxes',
      'dropdown',
      'date',
      'linear_scale'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'collaborator_role') THEN
    CREATE TYPE collaborator_role AS ENUM ('editor', 'viewer');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'registration_status') THEN
    CREATE TYPE registration_status AS ENUM ('registered', 'confirmed', 'attended', 'cancelled');
  END IF;
END $$;

-- 2. PROFILES TABLE (Linked with Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'organizer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. FORMS TABLE
CREATE TABLE IF NOT EXISTS public.forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'Untitled Form',
  description TEXT DEFAULT '',
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status form_status NOT NULL DEFAULT 'draft',
  
  -- Form settings
  is_public BOOLEAN NOT NULL DEFAULT true,
  requires_login BOOLEAN NOT NULL DEFAULT false,
  allow_multiple_responses BOOLEAN NOT NULL DEFAULT false,
  response_limit INTEGER DEFAULT NULL,
  deadline TIMESTAMPTZ DEFAULT NULL,
  
  -- Event Registration specific settings
  is_event BOOLEAN NOT NULL DEFAULT false,
  event_date TIMESTAMPTZ DEFAULT NULL,
  event_venue TEXT DEFAULT NULL,
  event_capacity INTEGER DEFAULT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Question',
  description TEXT DEFAULT '',
  type question_type NOT NULL DEFAULT 'short_answer',
  required BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  
  -- For choices (multiple_choice, checkboxes, dropdown)
  options JSONB NOT NULL DEFAULT '["Option 1"]'::jsonb,
  
  -- For linear scale
  scale_min INTEGER DEFAULT 1,
  scale_max INTEGER DEFAULT 5,
  scale_min_label TEXT DEFAULT 'Poor',
  scale_max_label TEXT DEFAULT 'Excellent',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. FORM COLLABORATORS TABLE
CREATE TABLE IF NOT EXISTS public.form_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role collaborator_role NOT NULL DEFAULT 'editor',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(form_id, user_id)
);

-- 6. RESPONSES TABLE
CREATE TABLE IF NOT EXISTS public.responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  respondent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  respondent_email TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 7. ANSWERS TABLE
CREATE TABLE IF NOT EXISTS public.answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES public.responses(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. EVENT REGISTRATIONS TABLE
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  response_id UUID REFERENCES public.responses(id) ON DELETE CASCADE,
  participant_name TEXT NOT NULL,
  participant_email TEXT NOT NULL,
  status registration_status NOT NULL DEFAULT 'registered',
  checked_in_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(form_id, participant_email)
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_forms_created_by ON public.forms(created_by);
CREATE INDEX IF NOT EXISTS idx_forms_status ON public.forms(status);
CREATE INDEX IF NOT EXISTS idx_questions_form_id ON public.questions(form_id, order_index);
CREATE INDEX IF NOT EXISTS idx_responses_form_id ON public.responses(form_id);
CREATE INDEX IF NOT EXISTS idx_answers_response_id ON public.answers(response_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_form ON public.event_registrations(form_id);

-- ==============================================================================
-- HELPER FUNCTIONS FOR ROLE-BASED ACCESS CONTROL (RBAC)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF user_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.can_manage_form(p_user_id UUID, p_form_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_user_id IS NULL OR p_form_id IS NULL THEN
    RETURN false;
  END IF;

  -- 1. Admins have platform-wide access
  IF public.is_admin(p_user_id) THEN
    RETURN true;
  END IF;

  -- 2. Check if user is creator or an editor collaborator
  RETURN EXISTS (
    SELECT 1 FROM public.forms
    WHERE id = p_form_id AND created_by = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.form_collaborators
    WHERE form_id = p_form_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Auto-sync new users from auth.users to profiles
-- All accounts default to 'organizer'.
-- The designated admin (arujagadeesh801@gmail.com) only receives 'admin' once email is confirmed.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role public.user_role := 'organizer';
BEGIN
  IF LOWER(NEW.email) = LOWER('arujagadeesh801@gmail.com') AND NEW.email_confirmed_at IS NOT NULL THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := 'organizer';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    assigned_role
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    role = CASE
      WHEN LOWER(EXCLUDED.email) = LOWER('arujagadeesh801@gmail.com') AND NEW.email_confirmed_at IS NOT NULL THEN 'admin'::public.user_role
      ELSE public.profiles.role
    END,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: When email becomes confirmed in auth.users, promote arujagadeesh801@gmail.com to admin
CREATE OR REPLACE FUNCTION public.handle_user_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF LOWER(NEW.email) = LOWER('arujagadeesh801@gmail.com') AND NEW.email_confirmed_at IS NOT NULL THEN
    UPDATE public.profiles
    SET role = 'admin', updated_at = now()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_verified ON auth.users;
CREATE TRIGGER on_auth_user_verified
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.handle_user_verification();

-- Trigger: Prevent regular users from modifying their role
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
      NEW.role := OLD.role;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS protect_profiles_role_trigger ON public.profiles;
CREATE TRIGGER protect_profiles_role_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- Auto-update updated_at timestamp on forms
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_forms_updated_at ON public.forms;
CREATE TRIGGER set_forms_updated_at
  BEFORE UPDATE ON public.forms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Server-side helper function to manually promote/verify designated admin
CREATE OR REPLACE FUNCTION public.promote_designated_admin(target_email TEXT DEFAULT 'arujagadeesh801@gmail.com')
RETURNS JSONB AS $$
DECLARE
  target_user RECORD;
BEGIN
  IF LOWER(target_email) <> LOWER('arujagadeesh801@gmail.com') THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Security restriction: Only arujagadeesh801@gmail.com can be promoted to Admin.'
    );
  END IF;

  SELECT id, email, email_confirmed_at INTO target_user
  FROM auth.users
  WHERE LOWER(email) = LOWER(target_email);

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User account does not exist in auth.users yet. Please sign up in the application first.'
    );
  END IF;

  IF target_user.email_confirmed_at IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Account exists but email is not confirmed. Please click the confirmation link sent to your email or confirm the user in Supabase Auth before granting Admin.'
    );
  END IF;

  UPDATE public.profiles
  SET role = 'admin', updated_at = now()
  WHERE id = target_user.id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Successfully verified arujagadeesh801@gmail.com and granted Administrator role.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Public profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 2. Forms Policies
DROP POLICY IF EXISTS "Published public forms are viewable by anyone" ON public.forms;
CREATE POLICY "Published public forms are viewable by anyone"
  ON public.forms FOR SELECT
  USING (
    (status = 'published' AND is_public = true)
    OR (auth.uid() IS NOT NULL AND public.can_manage_form(auth.uid(), id))
  );

DROP POLICY IF EXISTS "Organizers and Admins can create forms" ON public.forms;
CREATE POLICY "Organizers and Admins can create forms"
  ON public.forms FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND (
      public.is_admin(auth.uid()) OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'organizer')
      )
    )
  );

DROP POLICY IF EXISTS "Form owners, editors and Admins can update forms" ON public.forms;
CREATE POLICY "Form owners, editors and Admins can update forms"
  ON public.forms FOR UPDATE
  TO authenticated
  USING (public.can_manage_form(auth.uid(), id))
  WITH CHECK (public.can_manage_form(auth.uid(), id));

DROP POLICY IF EXISTS "Form owners and Admins can delete forms" ON public.forms;
CREATE POLICY "Form owners and Admins can delete forms"
  ON public.forms FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by OR public.is_admin(auth.uid()));

-- 3. Questions Policies
DROP POLICY IF EXISTS "Questions are viewable if parent form is accessible" ON public.questions;
CREATE POLICY "Questions are viewable if parent form is accessible"
  ON public.questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.forms
      WHERE forms.id = questions.form_id
      AND (
        (forms.status = 'published' AND forms.is_public = true)
        OR (auth.uid() IS NOT NULL AND public.can_manage_form(auth.uid(), forms.id))
      )
    )
  );

DROP POLICY IF EXISTS "Form managers can insert questions" ON public.questions;
CREATE POLICY "Form managers can insert questions"
  ON public.questions FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_form(auth.uid(), form_id));

DROP POLICY IF EXISTS "Form managers can update questions" ON public.questions;
CREATE POLICY "Form managers can update questions"
  ON public.questions FOR UPDATE
  TO authenticated
  USING (public.can_manage_form(auth.uid(), form_id))
  WITH CHECK (public.can_manage_form(auth.uid(), form_id));

DROP POLICY IF EXISTS "Form managers can delete questions" ON public.questions;
CREATE POLICY "Form managers can delete questions"
  ON public.questions FOR DELETE
  TO authenticated
  USING (public.can_manage_form(auth.uid(), form_id));

-- 4. Collaborators Policies
DROP POLICY IF EXISTS "Collaborators can view form sharing records" ON public.form_collaborators;
CREATE POLICY "Collaborators can view form sharing records"
  ON public.form_collaborators FOR SELECT
  TO authenticated
  USING (public.can_manage_form(auth.uid(), form_id));

DROP POLICY IF EXISTS "Owners and Admins can manage collaborators" ON public.form_collaborators;
CREATE POLICY "Owners and Admins can manage collaborators"
  ON public.form_collaborators FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.forms
      WHERE forms.id = form_collaborators.form_id
      AND (forms.created_by = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- 5. Responses Policies
DROP POLICY IF EXISTS "Anyone can submit response to published public forms" ON public.responses;
CREATE POLICY "Anyone can submit response to published public forms"
  ON public.responses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.forms
      WHERE forms.id = responses.form_id
      AND forms.status = 'published'
      AND forms.is_public = true
      AND (forms.deadline IS NULL OR forms.deadline > now())
    )
  );

DROP POLICY IF EXISTS "Form managers and Admins can view form responses" ON public.responses;
CREATE POLICY "Form managers and Admins can view form responses"
  ON public.responses FOR SELECT
  TO authenticated
  USING (
    public.can_manage_form(auth.uid(), form_id)
    OR respondent_id = auth.uid()
  );

DROP POLICY IF EXISTS "Form owners and Admins can delete responses" ON public.responses;
CREATE POLICY "Form owners and Admins can delete responses"
  ON public.responses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.forms
      WHERE forms.id = responses.form_id
      AND (forms.created_by = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- 6. Answers Policies
DROP POLICY IF EXISTS "Anyone can submit answers linked to their response" ON public.answers;
CREATE POLICY "Anyone can submit answers linked to their response"
  ON public.answers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.responses
      WHERE responses.id = answers.response_id
    )
  );

DROP POLICY IF EXISTS "Form managers and respondents can view answers" ON public.answers;
CREATE POLICY "Form managers and respondents can view answers"
  ON public.answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.responses
      WHERE responses.id = answers.response_id
      AND (
        public.can_manage_form(auth.uid(), responses.form_id)
        OR responses.respondent_id = auth.uid()
      )
    )
  );

-- 7. Event Registrations Policies
DROP POLICY IF EXISTS "Anyone can register for published event forms" ON public.event_registrations;
CREATE POLICY "Anyone can register for published event forms"
  ON public.event_registrations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.forms
      WHERE forms.id = event_registrations.form_id
      AND forms.status = 'published'
      AND forms.is_event = true
    )
  );

DROP POLICY IF EXISTS "Form managers can view and manage event registrations" ON public.event_registrations;
CREATE POLICY "Form managers can view and manage event registrations"
  ON public.event_registrations FOR ALL
  TO authenticated
  USING (public.can_manage_form(auth.uid(), form_id));
