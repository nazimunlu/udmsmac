-- Update documents table to add new fields
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'other';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.students(id);
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS description TEXT;

-- Update existing documents to have a default category based on their type
UPDATE public.documents SET category = 'student' WHERE type IN ('nationalId', 'agreement', 'certificate') AND category IS NULL;
UPDATE public.documents SET category = 'finance' WHERE type IN ('invoice', 'receipt', 'contract') AND category IS NULL;
UPDATE public.documents SET category = 'meb' WHERE type IN ('received', 'sent', 'official') AND category IS NULL;
UPDATE public.documents SET category = 'other' WHERE category IS NULL; 