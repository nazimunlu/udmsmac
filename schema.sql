-- Create the tables in an order that respects dependencies.

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

CREATE TABLE public.students (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  full_name text NOT NULL,
  student_contact text,
  parent_name text,
  parent_contact text,
  group_id bigint,
  is_archived boolean NOT NULL DEFAULT false,
  installments jsonb,
  price_per_lesson NUMERIC,
  CONSTRAINT students_pkey PRIMARY KEY (id),
  CONSTRAINT students_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE SET NULL
);

CREATE TABLE public.lessons (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  group_id bigint NOT NULL,
  lesson_date date NOT NULL,
  topic text,
  attendance jsonb,
  CONSTRAINT lessons_pkey PRIMARY KEY (id),
  CONSTRAINT lessons_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE
);

CREATE TABLE public.transactions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  amount numeric NOT NULL,
  type text NOT NULL, -- 'income' or 'expense'
  description text,
  transaction_date date NOT NULL,
  category text,
  expense_type text, -- For expenses: 'business' or 'personal'
  invoice_url text,
  student_id uuid,
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE SET NULL
);

CREATE TABLE public.documents (
  id text NOT NULL DEFAULT uuid_generate_v4(),
  created_at text NOT NULL DEFAULT now(),
  name text NOT NULL,
  type text NOT NULL,
  url text NOT NULL,
  uploadDate text,
  storagePath text,
  CONSTRAINT documents_pkey PRIMARY KEY (id)
);

CREATE TABLE public.events (
  id text NOT NULL DEFAULT uuid_generate_v4(),
  created_at text NOT NULL DEFAULT now(),
  eventName text NOT NULL,
  startTime text NOT NULL,
  endTime text NOT NULL,
  isAllDay boolean NOT NULL,
  CONSTRAINT events_pkey PRIMARY KEY (id)
);

CREATE TABLE public.settings (
  id text NOT NULL DEFAULT uuid_generate_v4(),
  created_at text NOT NULL DEFAULT now(),
  key text NOT NULL UNIQUE,
  value text,
  CONSTRAINT settings_pkey PRIMARY KEY (id)
);

CREATE TABLE public.todos (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL,
  task text NOT NULL,
  is_completed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  due_date timestamp with time zone,
  CONSTRAINT todos_pkey PRIMARY KEY (id),
  CONSTRAINT todos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);