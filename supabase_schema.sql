-- ==============================================================================
-- ORCA Maritime Platform - Supabase Database Schema
-- Run this SQL in your Supabase Project: SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create User Profiles Table (Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  vessel_name TEXT DEFAULT 'Matsya Sagar',
  home_port TEXT DEFAULT 'Kochi (Cochin) Port',
  role TEXT DEFAULT 'skipper',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- 3. Create SOS Alerts Table
-- Stores exact timestamp, who sent the SOS (skipper name, phone, vessel), and GPS coordinates
CREATE TABLE IF NOT EXISTS public.sos_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  vessel_name TEXT NOT NULL,
  registration_no TEXT NOT NULL,
  crew_count INTEGER DEFAULT 1,
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  nearest_port TEXT DEFAULT 'Kochi Harbor',
  distance_to_coast_nm DOUBLE PRECISION DEFAULT 15.0,
  distress_type TEXT NOT NULL DEFAULT 'taking_water',
  severity TEXT NOT NULL DEFAULT 'critical',
  status TEXT NOT NULL DEFAULT 'active',
  emergency_message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- 4. Set Up Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sos_alerts ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- SOS Alerts Policies (Emergency signals can be reported and viewed by all relevant parties)
DROP POLICY IF EXISTS "Anyone can insert distress alerts" ON public.sos_alerts;
CREATE POLICY "Anyone can insert distress alerts"
  ON public.sos_alerts FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view distress alerts" ON public.sos_alerts;
CREATE POLICY "Anyone can view distress alerts"
  ON public.sos_alerts FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users or responders can update alerts" ON public.sos_alerts;
CREATE POLICY "Authenticated users or responders can update alerts"
  ON public.sos_alerts FOR UPDATE
  USING (true);

-- 5. Trigger to automatically create a Profile when a User signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone, email, vessel_name, home_port, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    new.email,
    COALESCE(new.raw_user_meta_data->>'vessel_name', 'Matsya Sagar'),
    COALESCE(new.raw_user_meta_data->>'home_port', 'Kochi (Cochin) Port'),
    'skipper'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. Enable Realtime on SOS Alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_alerts;

-- 7. Indexes for High Performance Live Feeds
CREATE INDEX IF NOT EXISTS idx_sos_alerts_status ON public.sos_alerts(status);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_created_at ON public.sos_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_location ON public.sos_alerts(lat, lon);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
