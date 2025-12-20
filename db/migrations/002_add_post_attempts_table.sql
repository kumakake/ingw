-- Migration: Add post_attempts table for tracking all posting attempts
-- Date: 2024-12-20
-- Description: 投稿試行ログテーブル（成功/失敗両方を記録し、エラー分析に活用）

-- Create post_attempts table
CREATE TABLE IF NOT EXISTS post_attempts (
    id SERIAL PRIMARY KEY,
    license_id INTEGER REFERENCES licenses(id) ON DELETE SET NULL,
    facebook_page_id VARCHAR(255) NOT NULL,
    image_url TEXT,
    wordpress_post_id VARCHAR(255),
    status VARCHAR(20) NOT NULL,
    error_code VARCHAR(50),
    error_message TEXT,
    quota_usage INTEGER,
    quota_total INTEGER DEFAULT 25,
    container_id VARCHAR(255),
    media_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_post_attempts_license_id ON post_attempts(license_id);
CREATE INDEX IF NOT EXISTS idx_post_attempts_status ON post_attempts(status);
CREATE INDEX IF NOT EXISTS idx_post_attempts_created_at ON post_attempts(created_at);

-- Add comments
COMMENT ON TABLE post_attempts IS 'Log of all Instagram posting attempts for analysis';
COMMENT ON COLUMN post_attempts.status IS 'Attempt status: success, failed, rate_limited, token_expired, container_error, publish_error';
COMMENT ON COLUMN post_attempts.error_code IS 'Error code for categorization';
COMMENT ON COLUMN post_attempts.quota_usage IS 'Publishing quota usage at time of attempt';
COMMENT ON COLUMN post_attempts.container_id IS 'Instagram container ID if created';
COMMENT ON COLUMN post_attempts.media_id IS 'Instagram media ID if published';

-- Verify table creation
SELECT 'post_attempts table created successfully' AS result;
