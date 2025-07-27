-- Migration script to add color column to students table
-- Run this script on existing databases to add the color column

-- Add color column to students table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3B82F6';

-- Update existing students to have a default color if they don't have one
UPDATE public.students 
SET color = '#3B82F6' 
WHERE color IS NULL;

-- Make sure the column is not null for future inserts
ALTER TABLE public.students 
ALTER COLUMN color SET NOT NULL; 