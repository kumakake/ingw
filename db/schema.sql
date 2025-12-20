-- Instagram OAuth Database Schema
--
-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop existing tables
DROP TABLE IF EXISTS post_history CASCADE;
DROP TABLE IF EXISTS email_verifications CASCADE;
DROP TABLE IF EXISTS password_resets CASCADE;
DROP TABLE IF EXISTS licenses CASCADE;
DROP TABLE IF EXISTS users CASCADE;
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

-- Users table for authentication
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    login_account VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email_encrypted BYTEA NOT NULL,
    stripe_customer_id VARCHAR(255),
    subscription_status VARCHAR(50) DEFAULT 'none',
    subscription_id VARCHAR(255),
    subscription_plan VARCHAR(50),
    subscription_current_period_end TIMESTAMP,
    trial_end TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT false,
    user_no VARCHAR(10) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_login_account ON users(login_account);
CREATE INDEX idx_users_stripe_customer_id ON users(stripe_customer_id);

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE users IS 'User accounts for service authentication';
COMMENT ON COLUMN users.login_account IS 'Unique login account name';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password';
COMMENT ON COLUMN users.email_encrypted IS 'PGP encrypted email address';
COMMENT ON COLUMN users.subscription_status IS 'Stripe subscription status: none, trialing, active, past_due, canceled, unpaid';
COMMENT ON COLUMN users.cancel_at_period_end IS 'Whether subscription will be canceled at period end';

-- Email verifications table for new user registration
CREATE TABLE email_verifications (
    id SERIAL PRIMARY KEY,
    email_encrypted BYTEA NOT NULL,
    token VARCHAR(64) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_verifications_token ON email_verifications(token);

COMMENT ON TABLE email_verifications IS 'Temporary tokens for email verification during registration';

-- Password resets table
CREATE TABLE password_resets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(64) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_password_resets_token ON password_resets(token);
CREATE INDEX idx_password_resets_user_id ON password_resets(user_id);

COMMENT ON TABLE password_resets IS 'Temporary tokens for password reset requests';

-- Licenses table for plugin authorization
CREATE TABLE licenses (
    id SERIAL PRIMARY KEY,
    license_key VARCHAR(32) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    domain VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    activated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_license_key ON licenses(license_key);
CREATE INDEX idx_license_domain ON licenses(domain);
CREATE INDEX idx_license_user_id ON licenses(user_id);

CREATE TRIGGER update_licenses_updated_at
    BEFORE UPDATE ON licenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE licenses IS 'Plugin license keys for authorization';
COMMENT ON COLUMN licenses.license_key IS '32-character unique license key';
COMMENT ON COLUMN licenses.user_id IS 'Reference to user who owns this license';
COMMENT ON COLUMN licenses.domain IS 'Activated domain for this license';
COMMENT ON COLUMN licenses.is_active IS 'Whether the license is currently active';

-- Post history table for tracking Instagram posts
CREATE TABLE post_history (
    id SERIAL PRIMARY KEY,
    license_id INTEGER REFERENCES licenses(id) ON DELETE SET NULL,
    facebook_page_id VARCHAR(255) NOT NULL,
    instagram_media_id VARCHAR(255) NOT NULL,
    wordpress_post_id VARCHAR(255),
    caption TEXT,
    image_url TEXT,
    permalink TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_post_history_license_id ON post_history(license_id);
CREATE INDEX idx_post_history_facebook_page_id ON post_history(facebook_page_id);
CREATE INDEX idx_post_history_created_at ON post_history(created_at);

COMMENT ON TABLE post_history IS 'History of Instagram posts made through the API';
COMMENT ON COLUMN post_history.license_id IS 'Reference to the license used for posting';
COMMENT ON COLUMN post_history.facebook_page_id IS 'Facebook Page ID used for posting';
COMMENT ON COLUMN post_history.instagram_media_id IS 'Instagram Media ID of the published post';
COMMENT ON COLUMN post_history.wordpress_post_id IS 'WordPress Post ID for tracking source';
COMMENT ON COLUMN post_history.permalink IS 'Instagram permalink to the published post';

-- Post attempts table for tracking all posting attempts (success and failure)
CREATE TABLE post_attempts (
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

CREATE INDEX idx_post_attempts_license_id ON post_attempts(license_id);
CREATE INDEX idx_post_attempts_status ON post_attempts(status);
CREATE INDEX idx_post_attempts_created_at ON post_attempts(created_at);

COMMENT ON TABLE post_attempts IS 'Log of all Instagram posting attempts for analysis';
COMMENT ON COLUMN post_attempts.status IS 'Attempt status: success, failed, rate_limited, token_expired';
COMMENT ON COLUMN post_attempts.error_code IS 'Error code for categorization';
COMMENT ON COLUMN post_attempts.quota_usage IS 'Publishing quota usage at time of attempt';
COMMENT ON COLUMN post_attempts.container_id IS 'Instagram container ID if created';
COMMENT ON COLUMN post_attempts.media_id IS 'Instagram media ID if published';

-- Helper function to encrypt data with PGP
CREATE OR REPLACE FUNCTION encrypt_data(data TEXT, key TEXT)
RETURNS BYTEA AS $$
BEGIN
    RETURN pgp_sym_encrypt(data, key);
END;
$$ LANGUAGE plpgsql;

-- Helper function to decrypt data with PGP
CREATE OR REPLACE FUNCTION decrypt_data(encrypted_data BYTEA, key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_decrypt(encrypted_data, key);
END;
$$ LANGUAGE plpgsql;
