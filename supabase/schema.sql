-- ==============================================================================
-- Care Connect: Supabase PostgreSQL Schema
-- Tables: residents, caregivers, care_logs
-- Includes: Foreign Keys, Indexes, Row Level Security (RLS), and Auto-Updated Timestamps
-- ==============================================================================

-- 1. Enable UUID Extension (standard for Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper function for auto-updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- Table: caregivers
-- Stores nursing staff and caregiver profiles
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.caregivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Links to Supabase Auth user if available
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Caregiver', -- e.g. 'Senior Caregiver', 'Registered Nurse', 'Nurse Aide'
    shift TEXT DEFAULT 'Day Shift',         -- e.g. 'Morning (06:00 - 14:00)', 'Night Shift'
    phone TEXT,
    email TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for caregivers updated_at
CREATE TRIGGER set_caregivers_updated_at
BEFORE UPDATE ON public.caregivers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- Table: residents
-- Stores elder residents, their room & bed numbers, and emergency contacts
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.residents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    preferred_name TEXT,
    room_number TEXT NOT NULL,
    bed_number TEXT NOT NULL DEFAULT 'Bed A',
    age INTEGER,
    avatar_url TEXT,
    dietary_notes TEXT,
    primary_contact_name TEXT,
    primary_contact_phone TEXT,
    primary_contact_relationship TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for quick searching by room and name
CREATE INDEX IF NOT EXISTS idx_residents_room ON public.residents(room_number);
CREATE INDEX IF NOT EXISTS idx_residents_name ON public.residents(full_name);

-- Trigger for residents updated_at
CREATE TRIGGER set_residents_updated_at
BEFORE UPDATE ON public.residents
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- Table: care_logs
-- Daily care activities, pre-7 AM watermarked vitals photos, OCR readings, and notes
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.care_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
    caregiver_id UUID REFERENCES public.caregivers(id) ON DELETE SET NULL,
    caregiver_name TEXT NOT NULL,
    
    -- Category of Log: 'vital_signs', 'meal', 'medication', 'activity', 'mood', 'sleep'
    category TEXT NOT NULL DEFAULT 'vital_signs',
    
    -- Media & Verification
    photo_url TEXT,                      -- Storage URL to watermarked / original photo
    watermark_verified BOOLEAN DEFAULT FALSE,
    is_before_7am BOOLEAN DEFAULT FALSE, -- Flag for Pre-7 AM morning vital rounds
    
    -- Telemetry / OCR Readings
    blood_pressure TEXT,                -- e.g. '118/76'
    pulse_rate INTEGER,                 -- e.g. 72 (bpm)
    spo2 INTEGER,                       -- e.g. 98 (% SpO2)
    temperature NUMERIC(4, 1),          -- e.g. 36.6 (°C)
    blood_sugar NUMERIC(4, 1),          -- e.g. 5.4 (mmol/L)
    device_type TEXT,                   -- Recognized medical monitor model
    ai_extracted BOOLEAN DEFAULT FALSE, -- Extracted via Gemini AI OCR
    ai_confidence INTEGER,              -- Confidence score (0-100)
    
    -- Care Notes & Family Communication
    notes TEXT,                         -- Clinical notes by nurse
    family_summary TEXT,                -- Warm tone AI summary generated for family
    status TEXT NOT NULL DEFAULT 'published', -- 'pending_review', 'published', 'flagged'
    
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for quick chronological lookups per resident
CREATE INDEX IF NOT EXISTS idx_care_logs_resident_id ON public.care_logs(resident_id);
CREATE INDEX IF NOT EXISTS idx_care_logs_logged_at ON public.care_logs(logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_care_logs_category ON public.care_logs(category);

-- Trigger for care_logs updated_at
CREATE TRIGGER set_care_logs_updated_at
BEFORE UPDATE ON public.care_logs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- Row Level Security (RLS) Setup
-- Enable RLS on all tables for Supabase production security
-- ==============================================================================
ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caregivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_logs ENABLE ROW LEVEL SECURITY;

-- 1. Public Read for authenticated users (Staff, Admins, Connected Family)
CREATE POLICY "Allow read access to authenticated users"
ON public.residents FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow read access to caregivers"
ON public.caregivers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow read access to care_logs"
ON public.care_logs FOR SELECT
TO authenticated
USING (true);

-- 2. Staff and Admin Insert/Update access
CREATE POLICY "Allow authenticated users to insert residents"
ON public.residents FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update residents"
ON public.residents FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert care_logs"
ON public.care_logs FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update care_logs"
ON public.care_logs FOR UPDATE
TO authenticated
USING (true);

-- 3. Anonymous/Public access policy for easy initial dev testing (Optional - remove for strict prod)
CREATE POLICY "Allow anon select during dev"
ON public.residents FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow anon insert during dev"
ON public.residents FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow anon select care_logs during dev"
ON public.care_logs FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow anon insert care_logs during dev"
ON public.care_logs FOR INSERT
TO anon
WITH CHECK (true);
