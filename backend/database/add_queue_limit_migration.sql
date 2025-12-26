-- Migration: Add queue_limit column to subscription_plans
-- This enables separate queue capacity per subscription plan

-- Add queue_limit column with default value
ALTER TABLE subscription_plans ADD COLUMN queue_limit INTEGER NOT NULL DEFAULT 5;

-- Update existing plans with appropriate queue limits
UPDATE subscription_plans SET queue_limit = 3 WHERE plan_id = 1;   -- Free
UPDATE subscription_plans SET queue_limit = 5 WHERE plan_id = 2;   -- Starter  
UPDATE subscription_plans SET queue_limit = 15 WHERE plan_id = 3;  -- Professional
UPDATE subscription_plans SET queue_limit = 30 WHERE plan_id = 4;  -- Business
