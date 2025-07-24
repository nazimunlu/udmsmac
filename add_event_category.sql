-- Add category field to events table
ALTER TABLE public.events ADD COLUMN category TEXT DEFAULT 'other';

-- Update existing events to have a default category
UPDATE public.events SET category = 'other' WHERE category IS NULL; 