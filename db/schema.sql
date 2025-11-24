-- Instagram OAuth Database Schema

-- Drop existing tables
DROP TABLE IF EXISTS instagram_users CASCADE;

-- Create instagram_users table
CREATE TABLE instagram_users (
    id SERIAL PRIMARY KEY,
    facebook_user_id VARCHAR(255) UNIQUE NOT NULL,
    access_token TEXT NOT NULL,
    token_expires_at TIMESTAMP NOT NULL,
    facebook_page_id VARCHAR(255) NOT NULL,
    facebook_page_name VARCHAR(255),
    instagram_user_id VARCHAR(255) NOT NULL,
    instagram_username VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX idx_facebook_user_id ON instagram_users(facebook_user_id);
CREATE INDEX idx_instagram_user_id ON instagram_users(instagram_user_id);
CREATE INDEX idx_facebook_page_id ON instagram_users(facebook_page_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_instagram_users_updated_at
    BEFORE UPDATE ON instagram_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE instagram_users IS 'Stores Instagram Business Account information and access tokens for WordPress integration';
COMMENT ON COLUMN instagram_users.facebook_user_id IS 'Unique Facebook user identifier';
COMMENT ON COLUMN instagram_users.access_token IS 'Long-lived Facebook access token (60 days validity)';
COMMENT ON COLUMN instagram_users.token_expires_at IS 'Timestamp when the access token expires';
COMMENT ON COLUMN instagram_users.facebook_page_id IS 'Facebook Page ID connected to Instagram Business Account';
COMMENT ON COLUMN instagram_users.instagram_user_id IS 'Instagram Business Account ID (IG_USER_ID) - primary data for WordPress';

-- Licenses table for plugin authorization
DROP TABLE IF EXISTS licenses CASCADE;

CREATE TABLE licenses (
    id SERIAL PRIMARY KEY,
    license_key VARCHAR(32) UNIQUE NOT NULL,
    domain VARCHAR(255),
    user_no VARCHAR(255),
    user_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    activated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_license_key ON licenses(license_key);
CREATE INDEX idx_license_domain ON licenses(domain);

CREATE TRIGGER update_licenses_updated_at
    BEFORE UPDATE ON licenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE licenses IS 'Plugin license keys for authorization';
COMMENT ON COLUMN licenses.license_key IS '32-character unique license key';
COMMENT ON COLUMN licenses.domain IS 'Activated domain for this license';
COMMENT ON COLUMN licenses.is_active IS 'Whether the license is currently active';
