
-- Redefine is_current_user_admin() to use the admin_users table (same as is_admin(email))
-- Previously it checked raw_user_meta_data->>'role' = 'admin' which only matched 1 user.
-- This fixes all ~120 policies that depend on this function in one change.
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE email = auth.email()
  );
$$;
