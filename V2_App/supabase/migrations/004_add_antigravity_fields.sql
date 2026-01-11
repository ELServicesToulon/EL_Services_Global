-- Migration: Add Antigravity Treadmill support
-- Backward compatible: defaults used for existing records

ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS treadmill_model TEXT, -- NULL means standard treadmill
ADD COLUMN IF NOT EXISTS gravity_offset INTEGER DEFAULT 0; -- 0% (standard gravity)

-- Optional: Add validation constraint for gravity_offset
ALTER TABLE public.bookings 
ADD CONSTRAINT check_gravity_offset_range 
CHECK (gravity_offset >= 0 AND gravity_offset <= 100);

-- Comment on columns
COMMENT ON COLUMN public.bookings.gravity_offset IS 'Percentage of body weight offloaded (0-100)';
