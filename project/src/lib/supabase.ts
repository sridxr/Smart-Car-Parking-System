import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: 'user' | 'admin';
  created_at: string;
};

export type ParkingSlot = {
  id: string;
  slot_number: string;
  location: string;
  slot_type: 'regular' | 'compact' | 'handicapped' | 'electric';
  status: 'free' | 'occupied' | 'reserved';
  created_at: string;
  updated_at: string;
};

export type Booking = {
  id: string;
  user_id: string;
  slot_id: string;
  booking_time: string;
  release_time: string | null;
  status: 'active' | 'completed';
  created_at: string;
};

export type BookingWithDetails = Booking & {
  parking_slots: ParkingSlot;
  profiles: Profile;
};
