/*
  # Fix RLS Policies with Security Definer Function

  ## Problem
  The RLS policies cause infinite recursion when checking admin role from the profiles table.

  ## Solution
  Create a SECURITY DEFINER function that can check the role without triggering RLS,
  then use this function in the policies.

  ## Changes
  1. Drop all existing problematic policies
  2. Create a security definer function to check if user is admin
  3. Recreate all policies using this function
*/

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

DROP POLICY IF EXISTS "Authenticated users can view parking slots" ON parking_slots;
DROP POLICY IF EXISTS "Admins can insert parking slots" ON parking_slots;
DROP POLICY IF EXISTS "Admins can update parking slots" ON parking_slots;
DROP POLICY IF EXISTS "Admins can delete parking slots" ON parking_slots;

DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Users can create own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can update any booking" ON bookings;

-- Create a security definer function to check admin status
-- This bypasses RLS when checking the role
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Recreate profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR is_admin(auth.uid()));

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Recreate parking_slots policies
CREATE POLICY "All authenticated users can view parking slots"
  ON parking_slots FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert parking slots"
  ON parking_slots FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update parking slots"
  ON parking_slots FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete parking slots"
  ON parking_slots FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

-- Recreate bookings policies
CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Users can create own bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()));