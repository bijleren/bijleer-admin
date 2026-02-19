/*
  # Create Demo Management System

  1. New Tables
    - `demo_platforms`
      - `id` (uuid, primary key)
      - `name` (text) - Platform name
      - `description` (text, nullable)
      - `created_at` (timestamptz)
      
    - `demo_sessions`
      - `id` (uuid, primary key)
      - `platform_id` (uuid, foreign key to demo_platforms)
      - `session_date` (timestamptz) - When the demo will take place
      - `title` (text) - Demo title
      - `description` (text, nullable)
      - `max_participants` (integer, nullable) - Max number of participants
      - `is_published` (boolean) - Whether demo is visible publicly
      - `recording_url` (text, nullable) - URL to recording after demo
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
    - `demo_registrations`
      - `id` (uuid, primary key)
      - `demo_session_id` (uuid, foreign key to demo_sessions)
      - `email` (text) - Registrant email
      - `wants_recording` (boolean) - Whether they want the recording
      - `attended` (boolean) - Whether they attended (admin can mark)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Public read access to published demo_sessions
    - Public insert access to demo_registrations
    - Authenticated users can manage platforms and sessions
    - Authenticated users can view all registrations

  3. Indexes
    - Index on demo_sessions.session_date for filtering
    - Index on demo_registrations.demo_session_id for lookups
    - Index on demo_registrations.email for lookups
*/

-- Create demo_platforms table
CREATE TABLE IF NOT EXISTS demo_platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create demo_sessions table
CREATE TABLE IF NOT EXISTS demo_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id uuid REFERENCES demo_platforms(id) ON DELETE CASCADE,
  session_date timestamptz NOT NULL,
  title text NOT NULL,
  description text,
  max_participants integer,
  is_published boolean DEFAULT false,
  recording_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create demo_registrations table
CREATE TABLE IF NOT EXISTS demo_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demo_session_id uuid REFERENCES demo_sessions(id) ON DELETE CASCADE,
  email text NOT NULL,
  wants_recording boolean DEFAULT false,
  attended boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(demo_session_id, email)
);

-- Enable RLS
ALTER TABLE demo_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_registrations ENABLE ROW LEVEL SECURITY;

-- Policies for demo_platforms
CREATE POLICY "Anyone can view platforms"
  ON demo_platforms
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert platforms"
  ON demo_platforms
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update platforms"
  ON demo_platforms
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete platforms"
  ON demo_platforms
  FOR DELETE
  TO authenticated
  USING (true);

-- Policies for demo_sessions
CREATE POLICY "Anyone can view published sessions"
  ON demo_sessions
  FOR SELECT
  USING (is_published = true OR auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert sessions"
  ON demo_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sessions"
  ON demo_sessions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete sessions"
  ON demo_sessions
  FOR DELETE
  TO authenticated
  USING (true);

-- Policies for demo_registrations
CREATE POLICY "Anyone can register for demos"
  ON demo_registrations
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view all registrations"
  ON demo_registrations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update registrations"
  ON demo_registrations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete registrations"
  ON demo_registrations
  FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_demo_sessions_date ON demo_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_demo_sessions_published ON demo_sessions(is_published);
CREATE INDEX IF NOT EXISTS idx_demo_registrations_session ON demo_registrations(demo_session_id);
CREATE INDEX IF NOT EXISTS idx_demo_registrations_email ON demo_registrations(email);

-- Insert some default platforms
INSERT INTO demo_platforms (name, description) VALUES
  ('Spelling Platform', 'Interactive spelling and phonics learning platform'),
  ('Reading Platform', 'Comprehensive reading comprehension tools'),
  ('Vocabulary Builder', 'Word frequency and meaning management system')
ON CONFLICT DO NOTHING;
