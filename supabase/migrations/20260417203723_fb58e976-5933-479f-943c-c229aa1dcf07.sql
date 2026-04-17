-- Add unit enum and column to courses (separate course per unit)
CREATE TYPE public.course_unit AS ENUM ('sao_paulo', 'brasilia');

ALTER TABLE public.courses
  ADD COLUMN unit public.course_unit NOT NULL DEFAULT 'sao_paulo';

CREATE INDEX idx_courses_unit ON public.courses(unit);