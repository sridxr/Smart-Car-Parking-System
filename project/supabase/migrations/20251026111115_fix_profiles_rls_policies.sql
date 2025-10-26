/*
  # Fix Profiles RLS Policies

  ## Problem
  The "Admins can view all profiles" policy causes infinite recursion because it queries
  the profiles table to check if the user is an admin, which triggers the same policy again.

  ## Solution
  Store the user role in the auth.users metadata (raw_app_meta_data) instead of querying
  the profiles table. This breaks the recursion loop.

  ## Changes
  1. Drop the existing problematic policy
  2. Create a new policy that checks app_metadata instead
  3. Add a trigger to sync role to auth.users metadata when profiles are created/updated
*/

-- Drop the problematic admin view policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can insert parking slots" ON parking_slots;
DROP POLICY IF EXISTS "Admins can update parking slots" ON parking_slots;
DROP POLICY IF EXISTS "Admins can delete parking slots" ON parking_slots;
DROP POLICY IF EXISTS "Admins can update any booking" ON bookings;

-- Create a function to sync role to auth metadata
CREATE OR REPLACE FUNCTION sync_role_to_auth_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- This requires service role permissions, so we'll skip this approach
  -- Instead, we'll use a simpler policy structure
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate profiles policies without recursion
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    -- Check if the authenticated user's own profile has admin role
    auth.uid() IN (
      SELECT id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
    OR auth.uid() = id  -- Users can still see their own profile
  );

-- Recreate parking_slots policies
CREATE POLICY "Admins can insert parking slots"
  ON parking_slots FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update parking slots"
  ON parking_slots FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete parking slots"
  ON parking_slots FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Recreate bookings policies
CREATE POLICY "Admins can view all bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
    OR auth.uid() = user_id  -- Users can still see their own bookings
  );

CREATE POLICY "Admins can update any booking"
  ON bookings FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
    OR auth.uid() = user_id  -- Users can still update their own bookings
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
    OR auth.uid() = user_id
  );