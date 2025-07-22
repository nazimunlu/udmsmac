
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_name TEXT NOT NULL,
    color TEXT,
    schedule JSONB,
    start_date DATE,
    end_date DATE,
    is_archived BOOLEAN DEFAULT FALSE
);

CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    student_contact TEXT,
    parent_contact TEXT,
    enrollment_date DATE,
    is_tutoring BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    installments JSONB,
    price_per_lesson NUMERIC
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount NUMERIC NOT NULL,
    transaction_date DATE NOT NULL,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount NUMERIC NOT NULL,
    transaction_date DATE NOT NULL,
    expense_type TEXT NOT NULL
);

-- Function to get a student's group
CREATE OR REPLACE FUNCTION get_student_group(student_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    group_data JSON;
BEGIN
    SELECT json_build_object(
        'id', g.id,
        'group_name', g.group_name,
        'color', g.color
    )
    INTO group_data
    FROM groups g
    JOIN students s ON s.group_id = g.id
    WHERE s.id = student_id_param;

    RETURN group_data;
END;
$$;

-- Function to get a student's payments
CREATE OR REPLACE FUNCTION get_student_payments(student_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    payments_data JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'id', p.id,
            'amount', p.amount,
            'transaction_date', p.transaction_date
        )
    )
    INTO payments_data
    FROM payments p
    WHERE p.student_id = student_id_param;

    RETURN payments_data;
END;
$$;
