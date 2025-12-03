-- Migration: Add cancel_at_period_end column to users table
-- Date: 2025-12-02
-- Description: サブスクリプションの期間終了時キャンセルフラグを追加

-- Add cancel_at_period_end column if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN users.cancel_at_period_end IS 'Whether subscription will be canceled at period end';

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'cancel_at_period_end';
