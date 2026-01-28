-- Migration: Add Kling accounts table
-- Date: 2026-01-28
-- Description: Creates table for managing Kling AI provider accounts

CREATE TABLE IF NOT EXISTS kling_accounts (
    account_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    cookie TEXT NOT NULL,
    priority INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kling_accounts_active_priority 
ON kling_accounts (is_active, priority DESC);
