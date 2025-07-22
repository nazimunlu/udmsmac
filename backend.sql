-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text NOT NULL,
  type text NOT NULL,
  url text NOT NULL,
  upload_date date,
  storage_path text,
  CONSTRAINT documents_pkey PRIMARY KEY (id)
);
CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  event_name text NOT NULL,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  is_all_day boolean NOT NULL DEFAULT false,
  CONSTRAINT events_pkey PRIMARY KEY (id)
);
CREATE TABLE public.groups (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  group_name text NOT NULL,
  schedule jsonb,
  color text,
  start_date date,
  end_date date,
  program_length text,
  is_archived boolean NOT NULL DEFAULT false,
  CONSTRAINT groups_pkey PRIMARY KEY (id)
);
CREATE TABLE public.lessons (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  group_id bigint,
  student_id uuid,
  lesson_date date NOT NULL,
  topic text,
  attendance jsonb,
  start_time text,
  end_time text,
  material_url text,
  material_name text,
  status text DEFAULT 'Incomplete'::text,
  CONSTRAINT lessons_pkey PRIMARY KEY (id),
  CONSTRAINT lessons_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id),
  CONSTRAINT lessons_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id)
);
CREATE TABLE public.settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  key text NOT NULL UNIQUE,
  value text,
  CONSTRAINT settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.students (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  full_name text NOT NULL,
  student_contact text,
  parent_name text,
  parent_contact text,
  group_id bigint,
  is_tutoring boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  installments jsonb,
  fee_details jsonb,
  tutoring_details jsonb,
  documents jsonb,
  document_names jsonb,
  enrollment_date date,
  birth_date date,
  price_per_lesson numeric,
  CONSTRAINT students_pkey PRIMARY KEY (id),
  CONSTRAINT students_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id)
);
CREATE TABLE public.todos (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL,
  task text NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  due_date timestamp with time zone,
  CONSTRAINT todos_pkey PRIMARY KEY (id),
  CONSTRAINT todos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.transactions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  amount numeric NOT NULL,
  type text NOT NULL,
  description text,
  transaction_date date NOT NULL,
  category text,
  expense_type text,
  invoice_url text,
  invoice_name text,
  student_id uuid,
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id)
);