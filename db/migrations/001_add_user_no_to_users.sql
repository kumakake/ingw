-- Migration: Add user_no column to users table
-- Date: 2024-12-20
-- Description: 利用者No（YYMM999999形式）を自動生成するためのカラム追加

-- Add user_no column
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_no VARCHAR(10) UNIQUE;

-- Generate user_no for existing users (YYMM + 6-digit random)
UPDATE users
SET user_no = TO_CHAR(created_at, 'YYMM') || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0')
WHERE user_no IS NULL;

-- Verify
SELECT id, login_account, user_no FROM users;
