
-- Enum para tipos de curso
CREATE TYPE public.course_type AS ENUM ('pos_graduacao', 'modular');

-- Enum para status de turma
CREATE TYPE public.class_status AS ENUM ('atual', 'proxima', 'encerrada');

-- Enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'member');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles (separated for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Courses
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  type course_type NOT NULL DEFAULT 'modular',
  description TEXT,
  cover_url TEXT,
  workload_hours INTEGER,
  modality TEXT,
  price NUMERIC(10,2),
  installments INTEGER,
  payment_methods TEXT,
  highlights TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Course modules
CREATE TABLE public.course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  workload_hours INTEGER,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Course classes (turmas)
CREATE TABLE public.course_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  start_date DATE,
  end_date DATE,
  status class_status NOT NULL DEFAULT 'proxima',
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_modules_course ON public.course_modules(course_id, order_index);
CREATE INDEX idx_classes_course ON public.course_classes(course_id, start_date);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_classes ENABLE ROW LEVEL SECURITY;

-- has_role function (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_courses_updated BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile and assign 'member' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS POLICIES

-- profiles
CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- user_roles (read only own; admins manage all)
CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- courses (any authenticated user can do everything)
CREATE POLICY "Authenticated read courses" ON public.courses
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert courses" ON public.courses
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update courses" ON public.courses
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete courses" ON public.courses
  FOR DELETE TO authenticated USING (true);

-- course_modules
CREATE POLICY "Authenticated read modules" ON public.course_modules
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert modules" ON public.course_modules
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update modules" ON public.course_modules
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete modules" ON public.course_modules
  FOR DELETE TO authenticated USING (true);

-- course_classes
CREATE POLICY "Authenticated read classes" ON public.course_classes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert classes" ON public.course_classes
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update classes" ON public.course_classes
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete classes" ON public.course_classes
  FOR DELETE TO authenticated USING (true);

-- Storage bucket for course covers
INSERT INTO storage.buckets (id, name, public) VALUES ('course-covers', 'course-covers', true);

CREATE POLICY "Public read course covers" ON storage.objects
  FOR SELECT USING (bucket_id = 'course-covers');
CREATE POLICY "Auth upload course covers" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'course-covers');
CREATE POLICY "Auth update course covers" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'course-covers');
CREATE POLICY "Auth delete course covers" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'course-covers');
