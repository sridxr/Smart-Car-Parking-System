/*
  # Smart Car Parking System Database Schema

  ## Overview
  This migration creates the complete database schema for the Smart Car Parking System,
  including user authentication, parking slot management, and booking functionality.

  ## New Tables

  ### 1. profiles
  - `id` (uuid, primary key) - References auth.users
  - `email` (text) - User email address
  - `full_name` (text) - User's full name
  - `role` (text) - User role: 'user' or 'admin'
  - `created_at` (timestamptz) - Account creation timestamp

  ### 2. parking_slots
  - `id` (uuid, primary key) - Unique slot identifier
  - `slot_number` (text, unique) - Human-readable slot number (e.g., "A-101")
  - `location` (text) - Physical location description
  - `slot_type` (text) - Type: 'regular', 'compact', 'handicapped', 'electric'
  - `status` (text) - Current status: 'free', 'occupied', 'reserved'
  - `created_at` (timestamptz) - Slot creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 3. bookings
  - `id` (uuid, primary key) - Unique booking identifier
  - `user_id` (uuid, foreign key) - References profiles.id
  - `slot_id` (uuid, foreign key) - References parking_slots.id
  - `booking_time` (timestamptz) - When booking was made
  - `release_time` (timestamptz, nullable) - When slot was released
  - `status` (text) - Booking status: 'active' or 'completed'
  - `created_at` (timestamptz) - Record creation timestamp

  ## Security

  ### Row Level Security (RLS)
  All tables have RLS enabled with the following policies:

  #### profiles table:
  - Users can view their own profile
  - Users can update their own profile
  - Admins can view all profiles

  #### parking_slots table:
  - All authenticated users can view parking slots
  - Only admins can insert new slots
  - Only admins can update slots
  - Only admins can delete slots

  #### bookings table:
  - Users can view their own bookings
  - Admins can view all bookings
  - Users can create bookings for themselves
  - Users can update their own bookings
  - Admins can update any booking

  ## Indexes
  - Index on parking_slots.status for quick availability queries
  - Index on bookings.user_id for user booking history
  - Index on bookings.slot_id for slot booking history
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create parking_slots table
CREATE TABLE IF NOT EXISTS parking_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_number text UNIQUE NOT NULL,
  location text NOT NULL,
  slot_type text NOT NULL DEFAULT 'regular' CHECK (slot_type IN ('regular', 'compact', 'handicapped', 'electric')),
  status text NOT NULL DEFAULT 'free' CHECK (status IN ('free', 'occupied', 'reserved')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE parking_slots ENABLE ROW LEVEL SECURITY;

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  slot_id uuid NOT NULL REFERENCES parking_slots(id) ON DELETE CASCADE,
  booking_time timestamptz DEFAULT now(),
  release_time timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_parking_slots_status ON parking_slots(status);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_slot_id ON bookings(slot_id);

-- RLS Policies for profiles table

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for parking_slots table

CREATE POLICY "Authenticated users can view parking slots"
  ON parking_slots FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert parking slots"
  ON parking_slots FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update parking slots"
  ON parking_slots FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete parking slots"
  ON parking_slots FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for bookings table

CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can create own bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update any booking"
  ON bookings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Insert some sample parking slots
INSERT INTO parking_slots (slot_number, location, slot_type, status)
VALUES
  ('A-101', 'Ground Floor - Section A', 'regular', 'free'),
  ('A-102', 'Ground Floor - Section A', 'regular', 'free'),
  ('A-103', 'Ground Floor - Section A', 'compact', 'free'),
  ('A-104', 'Ground Floor - Section A', 'handicapped', 'free'),
  ('B-201', 'First Floor - Section B', 'regular', 'free'),
  ('B-202', 'First Floor - Section B', 'electric', 'free'),
  ('B-203', 'First Floor - Section B', 'regular', 'free'),
  ('C-301', 'Second Floor - Section C', 'regular', 'free'),
  ('C-302', 'Second Floor - Section C', 'compact', 'free'),
  ('C-303', 'Second Floor - Section C', 'regular', 'free')
ON CONFLICT (slot_number) DO NOTHING;