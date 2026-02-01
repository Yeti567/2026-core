-- Migration: Add subscription and trial fields to companies table
-- Run this in your Supabase SQL Editor

-- Add subscription status enum type if not exists
DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'past_due', 'cancelled', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add subscription plan enum type if not exists  
DO $$ BEGIN
    CREATE TYPE subscription_plan AS ENUM ('starter', 'professional', 'enterprise');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new columns to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS subscription_status subscription_status DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS subscription_plan subscription_plan DEFAULT NULL,
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '5 days');

-- Update existing companies to have trial data based on created_at
UPDATE companies 
SET 
    subscription_status = 'trial',
    trial_started_at = created_at,
    trial_ends_at = created_at + INTERVAL '5 days'
WHERE subscription_status IS NULL OR trial_started_at IS NULL;

-- Add index for faster subscription queries
CREATE INDEX IF NOT EXISTS idx_companies_subscription_status ON companies(subscription_status);
CREATE INDEX IF NOT EXISTS idx_companies_trial_ends_at ON companies(trial_ends_at);

-- Comment for documentation
COMMENT ON COLUMN companies.subscription_status IS 'Current subscription status: trial, active, past_due, cancelled, expired';
COMMENT ON COLUMN companies.subscription_plan IS 'Selected plan: starter (1-5), professional (6-15), enterprise (16-40)';
COMMENT ON COLUMN companies.trial_started_at IS 'When the 5-day free trial began';
COMMENT ON COLUMN companies.trial_ends_at IS 'When the trial expires (5 days after start)';
