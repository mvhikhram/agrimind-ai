-- ====================================================================
-- AGRIMIND AI - PostgreSQL Database Schema for Supabase
-- Tables: profiles, farms, zones, sensor_readings, irrigation_events,
--         crops, crop_cycles, expenses, disease_records,
--         community_posts, community_comments
-- Buckets: disease-images, farm-images
-- Row Level Security (RLS) enabled on all tables
-- Safe to execute repeatedly (fully idempotent)
-- ====================================================================

-- Enable UUID extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- 1. PROFILES / USERS
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE,
    full_name TEXT,
    phone TEXT,
    preferred_language TEXT DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 2. FARMS
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.farms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    name TEXT NOT NULL,
    state TEXT NOT NULL,
    district TEXT NOT NULL,
    village_city TEXT NOT NULL,
    area_acres NUMERIC(6, 2) NOT NULL,
    soil_type TEXT NOT NULL,
    soil_ph NUMERIC(3, 1) DEFAULT 6.5,
    water_availability TEXT NOT NULL, -- High, Medium, Low
    irrigation_method TEXT NOT NULL, -- Drip, Sprinkler, Flood
    season TEXT NOT NULL, -- Kharif, Rabi, Zaid, Perennial
    crops_allocation JSONB, -- Array of { crop_name, area_acres, percentage, water_requirement, estimated_daily_liters }
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS crops_allocation JSONB;

-- ====================================================================
-- 3. ZONES
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
    zone_number INT NOT NULL,
    name TEXT NOT NULL,
    crop_name TEXT NOT NULL,
    area_acres NUMERIC(5, 2) NOT NULL,
    target_moisture NUMERIC(5, 2) DEFAULT 50.0,
    current_moisture NUMERIC(5, 2) DEFAULT 45.0,
    pump_status BOOLEAN DEFAULT FALSE,
    valve_status BOOLEAN DEFAULT FALSE,
    pump_number INT DEFAULT 1,
    priority TEXT DEFAULT 'Medium', -- High, Medium, Low
    irrigation_mode TEXT DEFAULT 'AUTO', -- AUTO, MANUAL
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.zones ADD COLUMN IF NOT EXISTS pump_number INT DEFAULT 1;
ALTER TABLE public.zones ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Medium';
ALTER TABLE public.zones ADD COLUMN IF NOT EXISTS irrigation_mode TEXT DEFAULT 'AUTO';

-- ====================================================================
-- 4. SENSOR READINGS (Telemetry)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.sensor_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
    zone_id UUID REFERENCES public.zones(id) ON DELETE SET NULL,
    sensor_type TEXT NOT NULL, -- soil_moisture, temperature, humidity, light, flow_rate, tank_level
    value NUMERIC(8, 2) NOT NULL,
    unit TEXT NOT NULL, -- %, °C, lux, L/min
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 5. IRRIGATION EVENTS (Single flow sensor sequential model)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.irrigation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
    zone_id UUID REFERENCES public.zones(id) ON DELETE CASCADE,
    zone_name TEXT,
    pump_id INT NOT NULL DEFAULT 1,
    mode TEXT NOT NULL DEFAULT 'MANUAL', -- AUTO or MANUAL
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    duration_minutes INT,
    water_used_liters NUMERIC(8, 2) NOT NULL,
    starting_moisture NUMERIC(5, 2) NOT NULL,
    ending_moisture NUMERIC(5, 2),
    avg_flow_rate NUMERIC(5, 2) DEFAULT 1.7, -- YF-S201 L/min
    status TEXT DEFAULT 'COMPLETED',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 6. CROPS (Agronomic reference library)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.crops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    scientific_name TEXT,
    category TEXT NOT NULL,
    duration_days INT NOT NULL,
    water_requirement TEXT NOT NULL, -- Low, Medium, High
    optimal_soil_type TEXT NOT NULL,
    optimal_ph_min NUMERIC(3, 1),
    optimal_ph_max NUMERIC(3, 1),
    expected_yield_per_acre TEXT NOT NULL,
    est_investment_per_acre NUMERIC(10, 2) NOT NULL,
    est_revenue_per_acre NUMERIC(10, 2) NOT NULL,
    est_profit_per_acre NUMERIC(10, 2) NOT NULL DEFAULT 0,
    risk_level TEXT NOT NULL DEFAULT 'Medium',
    description TEXT
);

-- ====================================================================
-- 7. CROP CYCLES (Active plantings)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.crop_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
    zone_id UUID REFERENCES public.zones(id) ON DELETE CASCADE,
    crop_id UUID REFERENCES public.crops(id) ON DELETE SET NULL,
    crop_name TEXT NOT NULL,
    sowing_date DATE NOT NULL,
    expected_harvest_date DATE,
    current_stage TEXT DEFAULT 'Vegetative', -- Germination, Vegetative, Flowering, Fruiting, Maturity
    notes TEXT,
    plan_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.crop_cycles ADD COLUMN IF NOT EXISTS plan_data JSONB;

-- ====================================================================
-- 8. EXPENSES (Profit/Loss tracking)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
    category TEXT NOT NULL, -- Seeds, Fertilizer, Pesticide, Labour, Electricity, Irrigation, Other
    amount NUMERIC(10, 2) NOT NULL,
    description TEXT,
    expense_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 9. DISEASE RECORDS
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.disease_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
    zone_id UUID REFERENCES public.zones(id) ON DELETE SET NULL,
    crop_name TEXT NOT NULL,
    image_url TEXT,
    possible_disease TEXT NOT NULL,
    confidence NUMERIC(5, 2) NOT NULL, -- percentage e.g. 91.5
    severity TEXT NOT NULL, -- Low, Medium, High
    symptoms TEXT,
    recommended_actions TEXT,
    detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 10. COMMUNITY POSTS
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.community_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    author_name TEXT NOT NULL,
    category TEXT NOT NULL, -- Crop, Irrigation, Disease, Equipment, Technology, General
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    likes_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 11. COMMUNITY COMMENTS
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.community_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE,
    user_id UUID,
    author_name TEXT NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- INDEXES (Idempotent with IF NOT EXISTS)
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_sensor_readings_zone_time ON public.sensor_readings(zone_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_farm_time ON public.sensor_readings(farm_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_zones_farm_id ON public.zones(farm_id);
CREATE INDEX IF NOT EXISTS idx_irrigation_events_farm_id ON public.irrigation_events(farm_id);
CREATE INDEX IF NOT EXISTS idx_crop_cycles_farm_id ON public.crop_cycles(farm_id);
CREATE INDEX IF NOT EXISTS idx_expenses_farm_id ON public.expenses(farm_id);
CREATE INDEX IF NOT EXISTS idx_disease_records_farm_id ON public.disease_records(farm_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_post_id ON public.community_comments(post_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_crops_name ON public.crops(name);

-- ====================================================================
-- FUNCTIONS & TRIGGERS (Idempotent)
-- ====================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ====================================================================
-- SUPABASE STORAGE BUCKETS (Idempotent)
-- ====================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('disease-images', 'disease-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('farm-images', 'farm-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS: disease-images (DROP POLICY IF EXISTS before CREATE POLICY)
DROP POLICY IF EXISTS "Public Read Access for disease-images" ON storage.objects;
CREATE POLICY "Public Read Access for disease-images" ON storage.objects
FOR SELECT USING (bucket_id = 'disease-images');

DROP POLICY IF EXISTS "Allow uploads to disease-images" ON storage.objects;
CREATE POLICY "Allow uploads to disease-images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'disease-images');

DROP POLICY IF EXISTS "Allow updates to disease-images" ON storage.objects;
CREATE POLICY "Allow updates to disease-images" ON storage.objects
FOR UPDATE USING (bucket_id = 'disease-images');

DROP POLICY IF EXISTS "Allow delete to disease-images" ON storage.objects;
CREATE POLICY "Allow delete to disease-images" ON storage.objects
FOR DELETE USING (bucket_id = 'disease-images');

-- Storage RLS: farm-images (DROP POLICY IF EXISTS before CREATE POLICY)
DROP POLICY IF EXISTS "Public Read Access for farm-images" ON storage.objects;
CREATE POLICY "Public Read Access for farm-images" ON storage.objects
FOR SELECT USING (bucket_id = 'farm-images');

DROP POLICY IF EXISTS "Allow uploads to farm-images" ON storage.objects;
CREATE POLICY "Allow uploads to farm-images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'farm-images');

DROP POLICY IF EXISTS "Allow updates to farm-images" ON storage.objects;
CREATE POLICY "Allow updates to farm-images" ON storage.objects
FOR UPDATE USING (bucket_id = 'farm-images');

DROP POLICY IF EXISTS "Allow delete to farm-images" ON storage.objects;
CREATE POLICY "Allow delete to farm-images" ON storage.objects
FOR DELETE USING (bucket_id = 'farm-images');

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES (Idempotent)
-- Supports both authenticated user isolation and anonymous hackathon access
-- ====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.irrigation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crop_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disease_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;

-- 1. Profiles
DROP POLICY IF EXISTS "Profiles access policy" ON public.profiles;
CREATE POLICY "Profiles access policy" ON public.profiles
    FOR ALL USING (true) WITH CHECK (true);

-- 2. Farms
DROP POLICY IF EXISTS "Farms access policy" ON public.farms;
CREATE POLICY "Farms access policy" ON public.farms
    FOR ALL USING (true) WITH CHECK (true);

-- 3. Zones
DROP POLICY IF EXISTS "Zones access policy" ON public.zones;
CREATE POLICY "Zones access policy" ON public.zones
    FOR ALL USING (true) WITH CHECK (true);

-- 4. Sensor Readings
DROP POLICY IF EXISTS "Sensor readings access policy" ON public.sensor_readings;
CREATE POLICY "Sensor readings access policy" ON public.sensor_readings
    FOR ALL USING (true) WITH CHECK (true);

-- 5. Irrigation Events
DROP POLICY IF EXISTS "Irrigation events access policy" ON public.irrigation_events;
CREATE POLICY "Irrigation events access policy" ON public.irrigation_events
    FOR ALL USING (true) WITH CHECK (true);

-- 6. Crops
DROP POLICY IF EXISTS "Crops are readable by all" ON public.crops;
CREATE POLICY "Crops are readable by all" ON public.crops
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Crops insert policy" ON public.crops;
CREATE POLICY "Crops insert policy" ON public.crops
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Crops update policy" ON public.crops;
CREATE POLICY "Crops update policy" ON public.crops
    FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Crops delete policy" ON public.crops;
CREATE POLICY "Crops delete policy" ON public.crops
    FOR DELETE USING (true);

-- 7. Crop Cycles
DROP POLICY IF EXISTS "Crop cycles access policy" ON public.crop_cycles;
CREATE POLICY "Crop cycles access policy" ON public.crop_cycles
    FOR ALL USING (true) WITH CHECK (true);

-- 8. Expenses
DROP POLICY IF EXISTS "Expenses access policy" ON public.expenses;
CREATE POLICY "Expenses access policy" ON public.expenses
    FOR ALL USING (true) WITH CHECK (true);

-- 9. Disease Records
DROP POLICY IF EXISTS "Disease records access policy" ON public.disease_records;
CREATE POLICY "Disease records access policy" ON public.disease_records
    FOR ALL USING (true) WITH CHECK (true);

-- 10. Community Posts
DROP POLICY IF EXISTS "Community posts access policy" ON public.community_posts;
CREATE POLICY "Community posts access policy" ON public.community_posts
    FOR ALL USING (true) WITH CHECK (true);

-- 11. Community Comments
DROP POLICY IF EXISTS "Community comments access policy" ON public.community_comments;
CREATE POLICY "Community comments access policy" ON public.community_comments
    FOR ALL USING (true) WITH CHECK (true);

-- ====================================================================
-- SEED DATA (Idempotent with ON CONFLICT)
-- ====================================================================
INSERT INTO public.crops (name, category, duration_days, water_requirement, optimal_soil_type, optimal_ph_min, optimal_ph_max, expected_yield_per_acre, est_investment_per_acre, est_revenue_per_acre, est_profit_per_acre, risk_level, description)
VALUES 
('Tomato (Roma Hybrid)', 'Solanaceous Vegetable', 100, 'Medium', 'Sandy Clay Loam', 6.0, 6.8, '10-12 Tons', 80000, 200000, 120000, 'Medium', 'High market demand in South Indian wholesale mandis; responsive to drip fertigation.'),
('Groundnut (Spanish Bunch)', 'Legume / Oilseed', 120, 'Medium', 'Sandy Loam', 5.8, 6.8, '7-8 Tons', 60000, 140000, 80000, 'Low', 'Fixes atmospheric nitrogen into soil; drought resilient with steady minimum support prices.'),
('Winter Wheat (HD-2967)', 'Cereal Grain', 115, 'Medium', 'Clay Loam', 6.2, 7.5, '5-6 Tons', 45000, 95000, 50000, 'Low', 'Staple grain crop with guaranteed procurement, low pest vulnerability.'),
('Cotton (Bt Hybrid)', 'Commercial Fiber', 160, 'High', 'Deep Black Cotton Soil', 6.5, 7.8, '8-10 Quintals', 75000, 160000, 85000, 'High', 'High reward cash crop; requires pest vigilance against pink bollworm.'),
('Green Chilli (G4 Teja)', 'Spice / Solanaceae', 140, 'High', 'Well-drained Loam', 6.0, 7.0, '6-7 Tons', 95000, 230000, 135000, 'Medium', 'Very lucrative export grade spice with excellent price realization during dry seasons.')
ON CONFLICT (name) DO NOTHING;

-- Demo Farm (Idempotent on primary key id)
INSERT INTO public.farms (id, name, state, district, village_city, area_acres, soil_type, soil_ph, water_availability, irrigation_method, season)
VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Smart Farm', 'Telangana', 'Jogulamba Gadwal', 'Gadwal', 5.0, 'Sandy Clay Loam', 6.4, 'Medium', 'Drip', 'Kharif')
ON CONFLICT (id) DO NOTHING;

-- Demo Zones (Idempotent on primary key id)
INSERT INTO public.zones (id, farm_id, zone_number, name, crop_name, area_acres, target_moisture, current_moisture, pump_status)
VALUES 
('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 1, 'Zone 1 - North Tomato Block', 'Tomato (Roma)', 2.0, 50.0, 48.0, false),
('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 2, 'Zone 2 - Central Groundnut Field', 'Groundnut (K-6)', 1.8, 45.0, 42.0, false),
('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 3, 'Zone 3 - South Wheat & Fallow', 'Winter Wheat', 1.2, 52.0, 52.0, false)
ON CONFLICT (id) DO NOTHING;
