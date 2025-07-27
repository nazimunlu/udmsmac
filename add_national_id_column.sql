-- Add national_id column to students table
ALTER TABLE public.students ADD COLUMN national_id TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.students.national_id IS 'National ID number for the student'; 