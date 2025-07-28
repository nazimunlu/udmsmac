-- Fix documents table by adding missing category column
-- Run this SQL in your Supabase SQL editor

-- Add the category column to the documents table
ALTER TABLE public.documents 
ADD COLUMN category TEXT NOT NULL DEFAULT 'other';

-- Update existing records (if any) to have a default category
UPDATE public.documents 
SET category = 'other' 
WHERE category IS NULL;

-- Add a comment to document the column
COMMENT ON COLUMN public.documents.category IS 'Document category: student, finance, meb, or other';

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'documents' 
AND table_schema = 'public'
ORDER BY ordinal_position; 