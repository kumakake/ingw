-- Migration: Support multiple Instagram accounts per Facebook user
-- Date: 2024-12-29
-- Description: Changes unique constraint from facebook_user_id to facebook_page_id
--              to allow one Facebook user to have multiple Instagram accounts

-- Step 1: Remove UNIQUE constraint from facebook_user_id
ALTER TABLE instagram_users 
DROP CONSTRAINT IF EXISTS instagram_users_facebook_user_id_key;

-- Step 2: Add UNIQUE constraint to facebook_page_id
-- Note: This will fail if there are duplicate facebook_page_id values
ALTER TABLE instagram_users 
ADD CONSTRAINT instagram_users_facebook_page_id_key UNIQUE (facebook_page_id);

-- Verification query (run manually to check)
-- SELECT facebook_user_id, COUNT(*) as account_count 
-- FROM instagram_users 
-- GROUP BY facebook_user_id;
