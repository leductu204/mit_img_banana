-- Migration script to update subscription plans to new tier structure
-- Run this on existing databases to update from old 3-tier to new 4-tier structure

-- Update existing plans
UPDATE subscription_plans SET 
    total_concurrent_limit = 2,
    image_concurrent_limit = 1,
    video_concurrent_limit = 1,
    description = 'Gói Trải Nghiệm'
WHERE plan_id = 2;

UPDATE subscription_plans SET 
    name = 'Professional',
    price = 149000.0,
    total_concurrent_limit = 4,
    image_concurrent_limit = 2,
    video_concurrent_limit = 2,
    description = 'Gói Tiết Kiệm'
WHERE plan_id = 3;

-- Add new Business plan if it doesn't exist
INSERT OR IGNORE INTO subscription_plans (plan_id, name, price, total_concurrent_limit, image_concurrent_limit, video_concurrent_limit, description)
VALUES (4, 'Business', 499000.0, 6, 3, 3, 'Gói Sáng Tạo');

-- Verify the changes
SELECT plan_id, name, price, total_concurrent_limit, image_concurrent_limit, video_concurrent_limit, description 
FROM subscription_plans 
ORDER BY plan_id;
