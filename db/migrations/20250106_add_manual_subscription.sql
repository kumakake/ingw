-- 手動サブスクリプション有効化機能のためのカラム追加
-- 2025-01-06

-- 手動有効化フラグ
ALTER TABLE users ADD COLUMN IF NOT EXISTS manual_subscription_enabled BOOLEAN DEFAULT false;

-- 手動サブスクリプション有効期限（NULLの場合は無期限）
ALTER TABLE users ADD COLUMN IF NOT EXISTS manual_subscription_end TIMESTAMP;

-- 手動有効化の備考（振込日、請求書番号等）
ALTER TABLE users ADD COLUMN IF NOT EXISTS manual_subscription_note TEXT;

-- コメント追加
COMMENT ON COLUMN users.manual_subscription_enabled IS '手動有効化フラグ（銀行振込、特別対応等）';
COMMENT ON COLUMN users.manual_subscription_end IS '手動サブスクリプション有効期限（NULL=無期限）';
COMMENT ON COLUMN users.manual_subscription_note IS '手動有効化の備考';
