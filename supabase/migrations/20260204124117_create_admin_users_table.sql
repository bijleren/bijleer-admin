/*
  # Create admin_users table
  
  1. New Tables
    - `admin_users`
      - `id` (uuid, primary key) - Unique identifier for admin record
      - `email` (text, unique, not null) - Email address of authorized admin user
      - `created_at` (timestamptz) - Timestamp when admin was added
  
  2. Security
    - Enable RLS on `admin_users` table
    - Add policy for authenticated users to read their own admin status
    - This allows users to check if they are admins without exposing other admin emails
*/

CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can check their own admin status"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));
