ALTER TABLE public.users ADD COLUMN IF NOT EXISTS student_number integer;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS group_code text;
UPDATE public.users SET student_number = name::integer
WHERE student_number IS NULL AND name ~ '^[0-9]+$';
CREATE UNIQUE INDEX IF NOT EXISTS users_student_number_unique
  ON public.users(student_number) WHERE student_number IS NOT NULL;

CREATE POLICY "Teachers can update student group codes" ON public.users
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users me WHERE me.id = auth.uid() AND me.role IN ('teacher', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users me WHERE me.id = auth.uid() AND me.role IN ('teacher', 'admin')));
