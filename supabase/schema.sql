-- ==============================================================================
-- FormFlow: Google Forms-inspired Full-Stack Application Schema for Supabase
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUMS
CREATE TYPE user_role AS ENUM ('admin', 'organizer', 'user');
CREATE TYPE form_status AS ENUM ('draft', 'published', 'closed');
CREATE TYPE question_type AS ENUM (
  'short_answer',
  'paragraph',
  'multiple_choice',
  'checkboxes',
  'dropdown',
  'date',
  'linear_scale'
);
CREATE TYPE collaborator_role AS ENUM ('editor', 'viewer');
CREATE TYPE registration_status AS ENUM ('registered', 'confirmed', 'attended', 'cancelled');

-- 2. PROFILES TABLE (Linked with Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'organizer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. FORMS TABLE
CREATE TABLE IF NOT EXISTS forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'Untitled Form',
  description TEXT DEFAULT '',
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
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
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
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
CREATE TABLE IF NOT EXISTS form_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role collaborator_role NOT NULL DEFAULT 'editor',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(form_id, user_id)
);

-- 6. RESPONSES TABLE
CREATE TABLE IF NOT EXISTS responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  respondent_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  respondent_email TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 7. ANSWERS TABLE
CREATE TABLE IF NOT EXISTS answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. EVENT REGISTRATIONS TABLE
CREATE TABLE IF NOT EXISTS event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  response_id UUID REFERENCES responses(id) ON DELETE CASCADE,
  participant_name TEXT NOT NULL,
  participant_email TEXT NOT NULL,
  status registration_status NOT NULL DEFAULT 'registered',
  checked_in_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(form_id, participant_email)
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_forms_created_by ON forms(created_by);
CREATE INDEX IF NOT EXISTS idx_forms_status ON forms(status);
CREATE INDEX IF NOT EXISTS idx_questions_form_id ON questions(form_id, order_index);
CREATE INDEX IF NOT EXISTS idx_responses_form_id ON responses(form_id);
CREATE INDEX IF NOT EXISTS idx_answers_response_id ON answers(response_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_form ON event_registrations(form_id);

-- ==============================================================================
-- HELPER FUNCTIONS FOR ROLE-BASED ACCESS CONTROL (RBAC)
-- ==============================================================================

CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_manage_form(user_id UUID, form_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF is_admin(user_id) THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM forms WHERE id = form_uuid AND created_by = user_id
  ) OR EXISTS (
    SELECT 1 FROM form_collaborators WHERE form_id = form_uuid AND user_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-sync new users from auth.users to profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'organizer')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at timestamp on forms
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_forms_updated_at ON forms;
CREATE TRIGGER set_forms_updated_at
  BEFORE UPDATE ON forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
CREATE POLICY "Public profiles are viewable by authenticated users"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- 2. Forms Policies
CREATE POLICY "Published public forms are viewable by anyone"
  ON forms FOR SELECT
  USING (
    status = 'published' AND is_public = true
    OR (auth.uid() IS NOT NULL AND can_manage_form(auth.uid(), id))
  );

CREATE POLICY "Organizers and Admins can create forms"
  ON forms FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by OR is_admin(auth.uid()));

CREATE POLICY "Form owners, editors and Admins can update forms"
  ON forms FOR UPDATE
  TO authenticated
  USING (can_manage_form(auth.uid(), id));

CREATE POLICY "Form owners and Admins can delete forms"
  ON forms FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by OR is_admin(auth.uid()));

-- 3. Questions Policies
CREATE POLICY "Questions are viewable if parent form is accessible"
  ON questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM forms
      WHERE forms.id = questions.form_id
      AND (
        (forms.status = 'published' AND forms.is_public = true)
        OR (auth.uid() IS NOT NULL AND can_manage_form(auth.uid(), forms.id))
      )
    )
  );

CREATE POLICY "Form managers can insert questions"
  ON questions FOR INSERT
  TO authenticated
  WITH CHECK (can_manage_form(auth.uid(), form_id));

CREATE POLICY "Form managers can update questions"
  ON questions FOR UPDATE
  TO authenticated
  USING (can_manage_form(auth.uid(), form_id));

CREATE POLICY "Form managers can delete questions"
  ON questions FOR DELETE
  TO authenticated
  USING (can_manage_form(auth.uid(), form_id));

-- 4. Collaborators Policies
CREATE POLICY "Collaborators can view form sharing records"
  ON form_collaborators FOR SELECT
  TO authenticated
  USING (can_manage_form(auth.uid(), form_id));

CREATE POLICY "Owners and Admins can manage collaborators"
  ON form_collaborators FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM forms
      WHERE forms.id = form_collaborators.form_id
      AND (forms.created_by = auth.uid() OR is_admin(auth.uid()))
    )
  );

-- 5. Responses Policies
CREATE POLICY "Anyone can submit response to published public forms"
  ON responses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM forms
      WHERE forms.id = responses.form_id
      AND forms.status = 'published'
      AND (forms.deadline IS NULL OR forms.deadline > now())
    )
  );

CREATE POLICY "Form managers and Admins can view form responses"
  ON responses FOR SELECT
  TO authenticated
  USING (can_manage_form(auth.uid(), form_id) OR respondent_id = auth.uid());

-- 6. Answers Policies
CREATE POLICY "Anyone can submit answers linked to their response"
  ON answers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM responses
      WHERE responses.id = answers.response_id
    )
  );

CREATE POLICY "Form managers can view answers"
  ON answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM responses
      WHERE responses.id = answers.response_id
      AND (can_manage_form(auth.uid(), responses.form_id) OR responses.respondent_id = auth.uid())
    )
  );

-- 7. Event Registrations Policies
CREATE POLICY "Anyone can register for published event forms"
  ON event_registrations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM forms
      WHERE forms.id = event_registrations.form_id
      AND forms.status = 'published'
      AND forms.is_event = true
    )
  );

CREATE POLICY "Form managers can view and manage event registrations"
  ON event_registrations FOR ALL
  TO authenticated
  USING (can_manage_form(auth.uid(), form_id));
