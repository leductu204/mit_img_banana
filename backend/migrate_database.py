"""
Migration script to add all missing tables and columns to existing database.
This preserves existing data while adding new schema elements.
"""
import sqlite3
import sys

def migrate_database():
    """Add missing tables and columns to existing database."""
    try:
        conn = sqlite3.connect('database/app.db')  # Fixed: database is in database/ folder
        cursor = conn.cursor()
        
        print("Starting database migration...")
        print("=" * 50)
        
        # Get existing tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        existing_tables = [row[0] for row in cursor.fetchall()]
        print(f"Existing tables: {', '.join(existing_tables) if existing_tables else 'None'}")
        print()
        
        # 0. Create users table if missing (MUST BE FIRST - other tables reference it)
        if 'users' not in existing_tables:
            print("Creating users table...")
            cursor.execute("""
                CREATE TABLE users (
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
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)")
            print("✓ users table created")
        else:
            print("✓ users table exists")
            # Add missing columns to existing users table
            cursor.execute("PRAGMA table_info(users)")
            user_columns = [col[1] for col in cursor.fetchall()]
            
            if 'plan_id' not in user_columns:
                cursor.execute("ALTER TABLE users ADD COLUMN plan_id INTEGER REFERENCES subscription_plans(plan_id)")
                cursor.execute("UPDATE users SET plan_id = 1 WHERE plan_id IS NULL")
                print("  + Added plan_id column (defaulted to Free)")
            if 'plan_started_at' not in user_columns:
                cursor.execute("ALTER TABLE users ADD COLUMN plan_started_at TIMESTAMP")
                print("  + Added plan_started_at column")
            if 'plan_expires_at' not in user_columns:
                cursor.execute("ALTER TABLE users ADD COLUMN plan_expires_at TIMESTAMP")
                print("  + Added plan_expires_at column")
            if 'last_login_at' not in user_columns:
                cursor.execute("ALTER TABLE users ADD COLUMN last_login_at TEXT")
                print("  + Added last_login_at column")
            if 'is_banned' not in user_columns:
                cursor.execute("ALTER TABLE users ADD COLUMN is_banned BOOLEAN DEFAULT FALSE")
                print("  + Added is_banned column")
        
        # 1. Create jobs table if missing
        if 'jobs' not in existing_tables:
            print("Creating jobs table...")
            cursor.execute("""
                CREATE TABLE jobs (
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
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_jobs_provider_job_id ON jobs(provider_job_id)")
            print("✓ jobs table created")
        else:
            print("✓ jobs table exists")
            # Add missing columns to existing jobs table
            cursor.execute("PRAGMA table_info(jobs)")
            job_columns = [col[1] for col in cursor.fetchall()]
            
            if 'provider_job_id' not in job_columns:
                cursor.execute("ALTER TABLE jobs ADD COLUMN provider_job_id TEXT")
                print("  + Added provider_job_id column")
            if 'plan_id_snapshot' not in job_columns:
                cursor.execute("ALTER TABLE jobs ADD COLUMN plan_id_snapshot INTEGER")
                print("  + Added plan_id_snapshot column")
            if 'started_processing_at' not in job_columns:
                cursor.execute("ALTER TABLE jobs ADD COLUMN started_processing_at TIMESTAMP")
                print("  + Added started_processing_at column")
        
        # 2. Create credit_transactions table if missing
        if 'credit_transactions' not in existing_tables:
            print("\nCreating credit_transactions table...")
            cursor.execute("""
                CREATE TABLE credit_transactions (
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
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON credit_transactions(user_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON credit_transactions(created_at)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_transactions_type ON credit_transactions(type)")
            print("✓ credit_transactions table created")
        else:
            print("\n✓ credit_transactions table exists")
        
        # 3. Create subscription_plans table if missing
        if 'subscription_plans' not in existing_tables:
            print("\nCreating subscription_plans table...")
            cursor.execute("""
                CREATE TABLE subscription_plans (
                    plan_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    price REAL NOT NULL DEFAULT 0.0,
                    total_concurrent_limit INTEGER NOT NULL DEFAULT 2,
                    image_concurrent_limit INTEGER NOT NULL DEFAULT 1,
                    video_concurrent_limit INTEGER NOT NULL DEFAULT 1,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            # Seed default plans
            cursor.execute("""
                INSERT INTO subscription_plans (plan_id, name, price, total_concurrent_limit, image_concurrent_limit, video_concurrent_limit, description)
                VALUES 
                    (1, 'Free', 0.0, 2, 1, 1, 'Basic plan for casual users'),
                    (2, 'Starter', 49000.0, 2, 1, 1, 'Gói Trải Nghiệm'),
                    (3, 'Professional', 149000.0, 4, 2, 2, 'Gói Tiết Kiệm'),
                    (4, 'Business', 499000.0, 6, 3, 3, 'Gói Sáng Tạo')
            """)
            print("✓ subscription_plans table created and seeded")
        else:
            print("\n✓ subscription_plans table exists")
        
        # 5. Create admins table if missing
        if 'admins' not in existing_tables:
            print("\nCreating admins table...")
            cursor.execute("""
                CREATE TABLE admins (
                    admin_id TEXT PRIMARY KEY,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    role TEXT DEFAULT 'admin' CHECK(role IN ('admin', 'super_admin')),
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_login_at TEXT
                )
            """)
            print("✓ admins table created")
        else:
            print("\n✓ admins table exists")
        
        # 6. Create admin_audit_logs table if missing
        if 'admin_audit_logs' not in existing_tables:
            print("\nCreating admin_audit_logs table...")
            cursor.execute("""
                CREATE TABLE admin_audit_logs (
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
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_admin_id ON admin_audit_logs(admin_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_created_at ON admin_audit_logs(created_at)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_action ON admin_audit_logs(action)")
            print("✓ admin_audit_logs table created")
        else:
            print("\n✓ admin_audit_logs table exists")
        
        # 7. Create model_costs table if missing
        if 'model_costs' not in existing_tables:
            print("\nCreating model_costs table...")
            cursor.execute("""
                CREATE TABLE model_costs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    model TEXT NOT NULL,
                    config_key TEXT NOT NULL,
                    credits INTEGER NOT NULL DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(model, config_key)
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_model_costs_model ON model_costs(model)")
            print("✓ model_costs table created")
        else:
            print("\n✓ model_costs table exists")
        
        # 8. Create system_settings table if missing
        if 'system_settings' not in existing_tables:
            print("\nCreating system_settings table...")
            cursor.execute("""
                CREATE TABLE system_settings (
                    setting_key TEXT PRIMARY KEY,
                    setting_value TEXT NOT NULL,
                    description TEXT,
                    is_public BOOLEAN DEFAULT FALSE,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_by TEXT
                )
            """)
            print("✓ system_settings table created")
        else:
            print("\n✓ system_settings table exists")
        
        # 9. Create api_keys table if missing
        if 'api_keys' not in existing_tables:
            print("\nCreating api_keys table...")
            cursor.execute("""
                CREATE TABLE api_keys (
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
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix)")
            print("✓ api_keys table created")
        else:
            print("\n✓ api_keys table exists")
        
        # 10. Create api_key_usage table if missing
        if 'api_key_usage' not in existing_tables:
            print("\nCreating api_key_usage table...")
            cursor.execute("""
                CREATE TABLE api_key_usage (
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
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_api_usage_key_id ON api_key_usage(key_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_key_usage(created_at)")
            print("✓ api_key_usage table created")
        else:
            print("\n✓ api_key_usage table exists")
        
        # Commit all changes
        conn.commit()
        
        print("\n" + "=" * 50)
        print("✅ Migration completed successfully!")
        print("\nFinal table list:")
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        for row in cursor.fetchall():
            print(f"  • {row[0]}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    success = migrate_database()
    sys.exit(0 if success else 1)
