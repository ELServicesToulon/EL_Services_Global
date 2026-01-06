-- Migration: Create bookings table
-- Run this in Supabase SQL Editor

-- Table: bookings
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  email TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  stops_count INTEGER DEFAULT 1,
  has_return BOOLEAN DEFAULT false,
  is_urgent BOOLEAN DEFAULT false,
  is_saturday BOOLEAN DEFAULT false,
  resident_mode TEXT, -- 'standard' | 'urgence' | NULL
  price_estimated DECIMAL(10,2),
  status TEXT DEFAULT 'pending', -- pending, confirmed, completed, cancelled
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own bookings (by user_id OR email)
CREATE POLICY "Users see own bookings" ON public.bookings
  FOR SELECT USING (auth.uid() = user_id OR email = auth.email());

-- Policy: Users can insert bookings
CREATE POLICY "Users can create bookings" ON public.bookings
  FOR INSERT WITH CHECK (true);

-- Policy: Users can update their own bookings
CREATE POLICY "Users can update own bookings" ON public.bookings
  FOR UPDATE USING (auth.uid() = user_id OR email = auth.email());

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_email ON public.bookings(email);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_date ON public.bookings(scheduled_date);
