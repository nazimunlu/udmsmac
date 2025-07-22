-- Drop tables in an order that respects foreign key constraints, or use CASCADE
DROP TABLE IF EXISTS public.lessons CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.students CASCADE;
DROP TABLE IF EXISTS public.todos CASCADE;
DROP TABLE IF EXISTS public.groups CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;

-- Also drop the functions I created earlier, just in case they were run
DROP FUNCTION IF EXISTS get_student_group(UUID);
DROP FUNCTION IF EXISTS get_student_payments(UUID);