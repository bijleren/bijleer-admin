/*
  # Add Missing Tables

  1. New Tables
    - `classes`
      - `id` (uuid, primary key)
      - `school_id` (uuid, foreign key to schools)
      - `name` (text, not null)
      - `grade_level` (text)
      - `teacher_name` (text)
      - `room_number` (text)
      - `student_count` (integer, default 0)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
    
    - `school_users`
      - `id` (uuid, primary key)
      - `school_id` (uuid, foreign key to schools)
      - `user_id` (uuid, foreign key to profiles)
      - `role` (text, default 'staff')
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to access data
*/

-- Create classes table
CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools ON DELETE CASCADE,
  name text NOT NULL,
  grade_level text,
  teacher_name text,
  room_number text,
  student_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view classes"
  ON classes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert classes"
  ON classes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update classes"
  ON classes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete classes"
  ON classes FOR DELETE
  TO authenticated
  USING (true);

-- Create school_users junction table
CREATE TABLE IF NOT EXISTS school_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  role text DEFAULT 'staff' CHECK (role IN ('admin', 'teacher', 'staff')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(school_id, user_id)
);

ALTER TABLE school_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view school users"
  ON school_users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert school users"
  ON school_users FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update school users"
  ON school_users FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete school users"
  ON school_users FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_classes_school_id ON classes(school_id);
CREATE INDEX IF NOT EXISTS idx_school_users_school_id ON school_users(school_id);
CREATE INDEX IF NOT EXISTS idx_school_users_user_id ON school_users(user_id);