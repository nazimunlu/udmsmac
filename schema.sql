-- This schema is designed to be comprehensive and reflect all data points identified from the frontend components.
-- It includes all tables, columns, data types, and relationships necessary for the application.

-- Table: public.groups
CREATE TABLE public.groups (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  group_name TEXT NOT NULL,
  schedule JSONB, -- Stores days, start_time, end_time
  color TEXT,
  start_date DATE,
  end_date DATE,
  program_length TEXT, -- e.g., '12' for 12 weeks
  is_archived BOOLEAN DEFAULT FALSE NOT NULL
);

-- Table: public.students
CREATE TABLE public.students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  full_name TEXT NOT NULL,
  student_contact TEXT,
  parent_name TEXT,
  parent_contact TEXT,
  group_id BIGINT REFERENCES public.groups(id) ON DELETE SET NULL,
  is_tutoring BOOLEAN DEFAULT FALSE NOT NULL,
  is_archived BOOLEAN DEFAULT FALSE NOT NULL,
  installments JSONB, -- Array of installment objects
  fee_details JSONB, -- Object with totalFee, numberOfInstallments
  tutoring_details JSONB, -- Object with pricePerLesson, totalCalculatedFee, numberOfLessons, endDate, schedule
  documents JSONB, -- Object with nationalIdUrl, agreementUrl
  document_names JSONB, -- Object with nationalId, agreement
  enrollment_date DATE,
  birth_date DATE,
  price_per_lesson NUMERIC -- This field seems redundant if tutoring_details.pricePerLesson exists, but kept for now based on previous schema.
);

-- Table: public.lessons
CREATE TABLE public.lessons (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  group_id BIGINT REFERENCES public.groups(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE, -- For tutoring students
  lesson_date DATE NOT NULL,
  topic TEXT,
  attendance JSONB, -- Object mapping student_id to attendance status (e.g., { "uuid": "Present" })
  start_time TEXT, -- e.g., "09:00"
  end_time TEXT, -- e.g., "10:00"
  material_url TEXT,
  material_name TEXT,
  status TEXT DEFAULT 'Incomplete' -- e.g., 'Complete', 'Incomplete'
);

-- Table: public.transactions
CREATE TABLE public.transactions (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL, -- 'income-group', 'income-tutoring', 'expense-business', 'expense-personal'
  description TEXT,
  transaction_date DATE NOT NULL,
  category TEXT, -- e.g., 'Rent', 'Food', 'Salaries'
  expense_type TEXT, -- 'business' or 'personal' (redundant with 'type' but kept for now)
  invoice_url TEXT,
  invoice_name TEXT,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL -- For income transactions related to students
);

-- Table: public.documents
CREATE TABLE public.documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  student_id UUID REFERENCES public.students(id),
  description TEXT,
  url TEXT NOT NULL,
  upload_date DATE,
  storage_path TEXT,
  CONSTRAINT documents_pkey PRIMARY KEY (id)
);

-- Table: public.events
CREATE TABLE public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  event_name TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  is_all_day BOOLEAN DEFAULT FALSE NOT NULL,
  category TEXT DEFAULT 'other'
);

-- Table: public.settings
CREATE TABLE public.settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  key TEXT UNIQUE NOT NULL,
  value TEXT -- Stores settings like pricePerLesson
);

-- Table: public.todos
CREATE TABLE public.todos (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  task TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE
);

-- Functions (if still needed by apiClient or other parts of the app)
-- Example: get_groups_with_student_count (if used by apiClient.getGroupsWithStudentCount)
-- CREATE OR REPLACE FUNCTION get_groups_with_student_count()
-- RETURNS TABLE (id BIGINT, group_name TEXT, student_count BIGINT)
-- LANGUAGE plpgsql
-- AS $$
-- BEGIN
--     RETURN QUERY
--     SELECT
--         g.id,
--         g.group_name,
--         COUNT(s.id) AS student_count
--     FROM
--         public.groups g
--     LEFT JOIN
--         public.students s ON g.id = s.group_id
--     GROUP BY
--         g.id, g.group_name;
-- END;
-- $$;
