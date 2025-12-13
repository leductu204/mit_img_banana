-- MIT Nano Img Database Schema
-- SQLite database for user authentication and credits management

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- ============================================
-- USERS TABLE
-- Stores user information from Google OAuth
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    google_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    username TEXT,
    avatar_url TEXT,
    credits INTEGER DEFAULT 1000 CHECK (credits >= 0),
    is_banned BOOLEAN DEFAULT FALSE,
    plan_id INTEGER REFERENCES subscription_plans(plan_id),
    plan_started_at TIMESTAMP,
    plan_expires_at TIMESTAMP,
    last_login_at TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- ============================================
-- JOBS TABLE
-- Stores all generation jobs (images and videos)
-- ============================================
CREATE TABLE IF NOT EXISTS jobs (
    job_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('t2i', 'i2i', 't2v', 'i2v')),
    model TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    prompt TEXT NOT NULL,
    input_params TEXT,
    input_images TEXT,
    output_url TEXT,
    credits_cost INTEGER NOT NULL CHECK (credits_cost >= 0),
    credits_refunded BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    provider_job_id TEXT,
    plan_id_snapshot INTEGER,
    started_processing_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Indexes for jobs table
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_user_created ON jobs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_provider_job_id ON jobs(provider_job_id);

-- ============================================
-- CREDIT TRANSACTIONS TABLE
-- Audit trail for all credit changes
-- ============================================
CREATE TABLE IF NOT EXISTS credit_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    job_id TEXT,
    type TEXT NOT NULL CHECK (type IN ('deduct', 'refund', 'admin_add', 'admin_reset', 'initial')),
    amount INTEGER NOT NULL,
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE SET NULL
);

-- Indexes for credit_transactions table
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON credit_transactions(type);

-- ============================================
-- SUBSCRIPTION PLANS TABLE
-- Defines concurrent limits per plan
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_plans (
    plan_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    price REAL NOT NULL DEFAULT 0.0,
    total_concurrent_limit INTEGER NOT NULL DEFAULT 2,
    image_concurrent_limit INTEGER NOT NULL DEFAULT 1,
    video_concurrent_limit INTEGER NOT NULL DEFAULT 1,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default subscription plans
INSERT OR IGNORE INTO subscription_plans (plan_id, name, price, total_concurrent_limit, image_concurrent_limit, video_concurrent_limit, description)
VALUES 
    (1, 'Free', 0.0, 2, 1, 1, 'Basic plan for casual users'),
    (2, 'Starter', 49000.0, 2, 1, 1, 'Gói Trải Nghiệm'),
    (3, 'Professional', 149000.0, 4, 2, 2, 'Gói Tiết Kiệm'),
    (4, 'Business', 499000.0, 6, 3, 3, 'Gói Sáng Tạo');

-- ============================================
-- ADMINS TABLE
-- Store admin accounts
-- ============================================
CREATE TABLE IF NOT EXISTS admins (
    admin_id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'admin' CHECK(role IN ('admin', 'super_admin')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TEXT
);

-- ============================================
-- ADMIN AUDIT LOGS TABLE
-- Track all admin actions
-- ============================================
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admins(admin_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_audit_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON admin_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_action ON admin_audit_logs(action);

-- ============================================
-- MODEL COSTS TABLE
-- Dynamic pricing per model/config
-- ============================================
CREATE TABLE IF NOT EXISTS model_costs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model TEXT NOT NULL,
    config_key TEXT NOT NULL,
    credits INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(model, config_key)
);

CREATE INDEX IF NOT EXISTS idx_model_costs_model ON model_costs(model);

-- ============================================
-- SYSTEM SETTINGS TABLE
-- Key-value store for app settings
-- ============================================
CREATE TABLE IF NOT EXISTS system_settings (
    setting_key TEXT PRIMARY KEY,
    setting_value TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by TEXT
);

-- ============================================
-- API KEYS TABLE
-- For public API access
-- ============================================
CREATE TABLE IF NOT EXISTS api_keys (
    key_id TEXT PRIMARY KEY,
    user_id TEXT,
    key_hash TEXT NOT NULL,
    key_full TEXT,
    key_prefix TEXT NOT NULL,
    name TEXT NOT NULL,
    mode TEXT DEFAULT 'live' CHECK(mode IN ('live', 'test')),
    balance INTEGER DEFAULT 0 CHECK(balance >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TEXT,
    expires_at TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);

-- ============================================
-- API KEY USAGE TABLE
-- Track API key usage
-- ============================================
CREATE TABLE IF NOT EXISTS api_key_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_id TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    job_id TEXT,
    cost INTEGER NOT NULL,
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    status TEXT DEFAULT 'success',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (key_id) REFERENCES api_keys(key_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_api_usage_key_id ON api_key_usage(key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_key_usage(created_at);

-- Trigger to update updated_at on users table
CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
    AFTER UPDATE ON users
    FOR EACH ROW
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE user_id = OLD.user_id;
END;
