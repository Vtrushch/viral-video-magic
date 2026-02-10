
-- Add settings JSONB column to videos table for analysis configuration
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT NULL;
