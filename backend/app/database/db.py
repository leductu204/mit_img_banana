"""
Database connection management for SQLite.
Provides connection pooling, transaction support, and schema initialization.
"""

import sqlite3
import os
from pathlib import Path
from contextlib import contextmanager
from typing import Generator, Callable, Any

# Database path - relative to backend directory
DATABASE_DIR = Path(__file__).parent.parent.parent / "database"
DATABASE_PATH = DATABASE_DIR / "app.db"
SCHEMA_PATH = DATABASE_DIR / "schema.sql"


def get_db_connection() -> sqlite3.Connection:
    """
    Get a new database connection with optimized settings.
    Each call returns a new connection - caller is responsible for closing.
    """
    # Ensure database directory exists
    DATABASE_DIR.mkdir(parents=True, exist_ok=True)
    
    conn = sqlite3.connect(
        str(DATABASE_PATH),
        check_same_thread=False,
        timeout=30.0
    )
    
    # Enable foreign keys
    conn.execute("PRAGMA foreign_keys = ON")
    
    # Use WAL mode for better concurrency
    conn.execute("PRAGMA journal_mode = WAL")
    
    # Return rows as dictionaries
    conn.row_factory = sqlite3.Row
    
    return conn


@contextmanager
def get_db_context() -> Generator[sqlite3.Connection, None, None]:
    """
    Context manager for database connections.
    Automatically commits on success, rolls back on error.
    """
    conn = get_db_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def execute_in_transaction(operations: Callable[[sqlite3.Connection], Any]) -> Any:
    """
    Execute multiple operations in a single transaction.
    
    Args:
        operations: A callable that takes a connection and performs operations.
        
    Returns:
        The result of the operations callable.
        
    Example:
        def my_operations(conn):
            conn.execute("UPDATE users SET credits = credits - 5 WHERE user_id = ?", (user_id,))
            conn.execute("INSERT INTO credit_transactions (...) VALUES (...)")
            return True
        
        result = execute_in_transaction(my_operations)
    """
    conn = get_db_connection()
    try:
        conn.execute("BEGIN IMMEDIATE")
        result = operations(conn)
        conn.commit()
        return result
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_higgsfield_accounts_table(conn=None) -> None:
    """
    Initialize Higgsfield Accounts table for managing multiple provider accounts.
    Also migrates jobs table to add account_id foreign key.
    """
    should_close = False
    if conn is None:
        conn = get_db_connection()
        should_close = True
    
    try:
        # Create higgsfield_accounts table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS higgsfield_accounts (
                account_id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                sses TEXT NOT NULL,
                cookie TEXT NOT NULL,
                max_parallel_images INTEGER NOT NULL DEFAULT 8,
                max_parallel_videos INTEGER NOT NULL DEFAULT 8,
                max_slow_images INTEGER NOT NULL DEFAULT 4,
                max_slow_videos INTEGER NOT NULL DEFAULT 4,
                priority INTEGER NOT NULL DEFAULT 100,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Create index for active accounts lookup
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_higgsfield_accounts_active 
            ON higgsfield_accounts(is_active, priority DESC);
        """)
        
        # Migrate jobs table to add account_id column
        cursor = conn.execute("PRAGMA table_info(jobs)")
        job_columns = [row[1] for row in cursor.fetchall()]
        
        if 'account_id' not in job_columns:
            print("Migrating jobs table to add account_id...")
            conn.execute("""
                ALTER TABLE jobs 
                ADD COLUMN account_id INTEGER 
                REFERENCES higgsfield_accounts(account_id)
            """)
            print("Jobs table migrated successfully")
        
        conn.commit()
        print("Higgsfield accounts table initialized/migrated successfully")
        
    except Exception as e:
        print(f"Error initializing higgsfield accounts table: {e}")
        raise
    finally:
        if should_close:
            conn.close()


def init_database() -> None:
    """
    Initialize the database schema.
    Creates all tables if they don't exist.
    """
    # Read schema file
    if not SCHEMA_PATH.exists():
        raise FileNotFoundError(f"Schema file not found: {SCHEMA_PATH}")
    
    schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")
    
    # Execute schema
    conn = get_db_connection()
    try:
        conn.executescript(schema_sql)
        conn.commit()
        print(f"Database initialized at: {DATABASE_PATH}")
        
        # Migration: Update jobs table CHECK constraint to include 'cancelled'
        migrate_jobs_table_for_cancelled_status(conn)
        
        # Initialize admin tables
        init_admin_tables(conn)
        
        # Initialize API Key tables (Public API)
        init_api_key_tables(conn)

        # Initialize Subscription tables and migrate users/jobs
        init_subscription_tables(conn)
        
        # Initialize Higgsfield Accounts table
        init_higgsfield_accounts_table(conn)
        
    except Exception as e:
        print(f"Error initializing database: {e}")
        raise
    finally:
        conn.close()


def init_subscription_tables(conn=None) -> None:
    """
    Initialize subscription plan tables and migrate users/jobs tables.
    """
    should_close = False
    if conn is None:
        conn = get_db_connection()
        should_close = True

    try:
        # 1. Create Subscription Plans table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS subscription_plans (
                plan_id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE, -- e.g. Free, Starter
                price REAL NOT NULL DEFAULT 0.0,
                total_concurrent_limit INTEGER NOT NULL,
                image_concurrent_limit INTEGER NOT NULL,
                video_concurrent_limit INTEGER NOT NULL,
                queue_limit INTEGER NOT NULL DEFAULT 5,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 1.5 Migrate queue_limit column if not exists (for existing tables)
        cursor = conn.execute("PRAGMA table_info(subscription_plans)")
        sp_columns = [row[1] for row in cursor.fetchall()]
        
        if 'queue_limit' not in sp_columns:
            print("Adding queue_limit column to subscription_plans...")
            conn.execute("ALTER TABLE subscription_plans ADD COLUMN queue_limit INTEGER NOT NULL DEFAULT 5")
            # Update existing plans with appropriate queue limits
            conn.execute("UPDATE subscription_plans SET queue_limit = 3 WHERE plan_id = 1")  # Free
            conn.execute("UPDATE subscription_plans SET queue_limit = 5 WHERE plan_id = 2")  # Starter
            conn.execute("UPDATE subscription_plans SET queue_limit = 15 WHERE plan_id = 3") # Professional
            conn.execute("UPDATE subscription_plans SET queue_limit = 30 WHERE plan_id = 4") # Business
            conn.commit()
            print("queue_limit column added successfully")

        # 2. Seed Default Plans (now queue_limit column exists)
        seed_subscription_plans(conn)

        # 3. Migrate Users Table
        # Check if plan_id column exists
        cursor = conn.execute("PRAGMA table_info(users)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if 'plan_id' not in columns:
            print("Migrating users table for subscriptions...")
            conn.execute("ALTER TABLE users ADD COLUMN plan_id INTEGER REFERENCES subscription_plans(plan_id)")
            conn.execute("ALTER TABLE users ADD COLUMN plan_started_at TIMESTAMP")
            conn.execute("ALTER TABLE users ADD COLUMN plan_expires_at TIMESTAMP")
            
            # Set default plan (Free) for existing users
            # Assuming Free plan has ID 1 (will be verified in seed)
            conn.execute("UPDATE users SET plan_id = 1 WHERE plan_id IS NULL")
        
        # 4. Migrate Jobs Table
        cursor = conn.execute("PRAGMA table_info(jobs)")
        job_columns = [row[1] for row in cursor.fetchall()]
        
        migrated_jobs = False
        if 'plan_id_snapshot' not in job_columns:
            print("Migrating jobs table for subscriptions (plan_id)...")
            conn.execute("ALTER TABLE jobs ADD COLUMN plan_id_snapshot INTEGER")
            conn.execute("ALTER TABLE jobs ADD COLUMN started_processing_at TIMESTAMP")
            migrated_jobs = True
            
        if 'provider_job_id' not in job_columns:
            print("Migrating jobs table for subscriptions (provider_job_id)...")
            conn.execute("ALTER TABLE jobs ADD COLUMN provider_job_id TEXT")
            # For existing jobs, the job_id IS the provider_job_id
            conn.execute("UPDATE jobs SET provider_job_id = job_id WHERE provider_job_id IS NULL")
            migrated_jobs = True
            
        conn.commit()
        print("Subscription tables initialized/migrated successfully")

    except Exception as e:
        print(f"Error initializing subscription tables: {e}")
        raise
    finally:
        if should_close:
            conn.close()


def seed_subscription_plans(conn):
    """
    Seed default subscription plans if they don't exist.
    """
    plans = [
        # ID 1: Free
        {
            "name": "Free",
            "price": 0.0,
            "total_concurrent_limit": 2,
            "image_concurrent_limit": 1,
            "video_concurrent_limit": 1,
            "queue_limit": 3,
            "description": "Basic plan for casual users"
        },
        # ID 2: Starter
        {
            "name": "Starter",
            "price": 49000.0,
            "total_concurrent_limit": 2,
            "image_concurrent_limit": 1,
            "video_concurrent_limit": 1,
            "queue_limit": 5,
            "description": "Gói Trải Nghiệm"
        },
        # ID 3: Professional
        {
            "name": "Professional",
            "price": 149000.0,
            "total_concurrent_limit": 4,
            "image_concurrent_limit": 2,
            "video_concurrent_limit": 2,
            "queue_limit": 15,
            "description": "Gói Tiết Kiệm"
        },
        # ID 4: Business
        {
            "name": "Business",
            "price": 499000.0,
            "total_concurrent_limit": 6,
            "image_concurrent_limit": 3,
            "video_concurrent_limit": 3,
            "queue_limit": 30,
            "description": "Gói Sáng Tạo"
        }
    ]

    for plan in plans:
        conn.execute("""
            INSERT OR IGNORE INTO subscription_plans 
            (name, price, total_concurrent_limit, image_concurrent_limit, video_concurrent_limit, queue_limit, description)
            VALUES (:name, :price, :total_concurrent_limit, :image_concurrent_limit, :video_concurrent_limit, :queue_limit, :description)
        """, plan)
        
        # If the plan exists but parameters might have changed (optional: update logic could go here)
        # For now, we rely on name uniqueness and ignore if exists.


def migrate_jobs_table_for_cancelled_status(conn) -> None:
    """
    Migrate existing jobs table to support 'cancelled' status.
    SQLite doesn't allow altering CHECK constraints, so we need to recreate the table.
    """
    try:
        # Check if jobs table exists
        cursor = conn.execute(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name='jobs'"
        )
        result = cursor.fetchone()
        
        if not result:
            return  # Table doesn't exist
        
        table_sql = result[0] or ""
        
        # Check if 'cancelled' is already in the CHECK constraint
        if "'cancelled'" in table_sql or '"cancelled"' in table_sql:
            print("Jobs table already supports 'cancelled' status")
            return
        
        print("Migrating jobs table to support 'cancelled' status...")
        
        # Recreate the table with updated constraint
        conn.executescript("""
            -- Create new table with updated constraint
            CREATE TABLE IF NOT EXISTS jobs_new (
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
            );
            
            -- Copy data
            INSERT OR IGNORE INTO jobs_new SELECT * FROM jobs;
            
            -- Drop old table and rename new
            DROP TABLE IF EXISTS jobs;
            ALTER TABLE jobs_new RENAME TO jobs;
            
            -- Recreate indexes
            CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
            CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
            CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
            CREATE INDEX IF NOT EXISTS idx_jobs_user_created ON jobs(user_id, created_at);
        """)
        conn.commit()
        print("Jobs table migration completed successfully")
        
    except Exception as e:
        print(f"Warning: Jobs table migration failed: {e}")
        # Don't raise - allow app to continue, cancel will just fail


def init_admin_tables(conn=None) -> None:
    """
    Initialize admin panel tables.
    Creates admins, admin_audit_logs, and model_costs tables.
    """
    admin_schema = """
    -- Admins table (separate from users)
    CREATE TABLE IF NOT EXISTS admins (
        admin_id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'admin' CHECK(role IN ('admin', 'super_admin')),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TEXT DEFAULT (datetime('now')),
        last_login_at TEXT
    );

    -- Indexes for admins
    CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);
    CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);

    -- Admin audit logs
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id TEXT NOT NULL,
        action TEXT NOT NULL,
        target_type TEXT,
        target_id TEXT,
        details TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (admin_id) REFERENCES admins(admin_id)
    );

    -- Indexes for audit logs
    CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_audit_logs(admin_id);
    CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_audit_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_audit_logs(action);

    -- Model costs table (replaces JSON config for easier admin editing)
    CREATE TABLE IF NOT EXISTS model_costs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        model TEXT NOT NULL,
        config_key TEXT NOT NULL,
        credits INTEGER NOT NULL,
        updated_at TEXT DEFAULT (datetime('now')),
        updated_by TEXT,
        UNIQUE(model, config_key)
    );

    -- Index for model costs
    CREATE INDEX IF NOT EXISTS idx_model_costs_model ON model_costs(model);
    
    -- Add is_banned column to users if not exists
    -- SQLite doesn't support IF NOT EXISTS for columns, so we check first
    """
    
    should_close = False
    if conn is None:
        conn = get_db_connection()
        should_close = True
    
    try:
        conn.executescript(admin_schema)
        
        # Check if is_banned column exists in users table
        cursor = conn.execute("PRAGMA table_info(users)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if 'is_banned' not in columns:
            conn.execute("ALTER TABLE users ADD COLUMN is_banned BOOLEAN DEFAULT FALSE")
        
        if 'last_login_at' not in columns:
            conn.execute("ALTER TABLE users ADD COLUMN last_login_at TEXT")

        # Check for missing columns in admins table (migration)
        cursor = conn.execute("PRAGMA table_info(admins)")
        admin_columns = [row[1] for row in cursor.fetchall()]
        
        if 'role' not in admin_columns:
            conn.execute("ALTER TABLE admins ADD COLUMN role TEXT DEFAULT 'admin'")
        if 'is_active' not in admin_columns:
            conn.execute("ALTER TABLE admins ADD COLUMN is_active BOOLEAN DEFAULT TRUE")
        if 'last_login_at' not in admin_columns:
            conn.execute("ALTER TABLE admins ADD COLUMN last_login_at TEXT")
        
        # System Settings Table (Generic Key-Value Store)
        settings_schema = """
        CREATE TABLE IF NOT EXISTS system_settings (
            setting_key TEXT PRIMARY KEY,
            setting_value TEXT NOT NULL,
            description TEXT,
            is_public BOOLEAN DEFAULT FALSE,  -- If true, accessible via public API
            updated_at TEXT DEFAULT (datetime('now')),
            updated_by TEXT
        );
        """
        conn.executescript(settings_schema)
        
        # Seed default notification settings if not exist
        try:
            conn.execute("""
                INSERT OR IGNORE INTO system_settings (setting_key, setting_value, description, is_public)
                VALUES 
                ('notification_title', 'Thông báo', 'Title of the global popup notification', 1),
                ('notification_message', '<span>OPEN BETA - Sử dụng miễn phí Nano Banana PRO và KLING. Nếu website gặp lỗi, hãy liên hệ <a href="https://zalo.me/0352143210" target="_blank" class="text-blue-500 hover:underline">ZALO 0352143210</a></span>', 'HTML content of the global popup notification', 1),
                ('notification_active', 'true', 'Whether the notification popup is enabled', 1)
            """)
        except Exception as e:
            print(f"Error seeding settings: {e}")

        conn.commit()
        print("Admin tables initialized successfully")
    except Exception as e:
        print(f"Error initializing admin tables: {e}")
        raise
    finally:
        if should_close:
            conn.close()


def init_api_key_tables(conn=None) -> None:
    """
    Initialize API Key tables for Public API system.
    Creates api_keys, api_key_usage, and api_key_quotas tables.
    """
    api_schema = """
    -- API Keys table
    CREATE TABLE IF NOT EXISTS api_keys (
        key_id TEXT PRIMARY KEY,
        user_id TEXT,                      -- NULLABLE (can be unlinked)
        key_hash TEXT NOT NULL,            -- bcrypt hash of the key (for auth)
        key_full TEXT,                     -- Full key for admin viewing (added later)
        key_prefix TEXT NOT NULL,          -- Display prefix: "sk_live_abc..."
        name TEXT,                         -- Optional friendly name for the key
        balance INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TEXT DEFAULT (datetime('now')),
        expires_at TEXT,                   -- Optional expiry
        revoked_at TEXT,                   -- If manually revoked
        last_used_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
    );

    -- Indexes for api_keys
    CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
    CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);

    -- API Key Usage Audit Log
    CREATE TABLE IF NOT EXISTS api_key_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key_id TEXT NOT NULL,
        endpoint TEXT NOT NULL,            -- "/v1/image/generate"
        job_id TEXT,                       -- Link to jobs table if applicable
        cost INTEGER NOT NULL,             -- Credits deducted
        balance_before INTEGER NOT NULL,
        balance_after INTEGER NOT NULL,
        status TEXT,                       -- "success", "failed", "insufficient_balance"
        response_time_ms INTEGER,
        ip_address TEXT,
        user_agent TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (key_id) REFERENCES api_keys(key_id) ON DELETE CASCADE
    );

    -- Indexes for usage logs
    CREATE INDEX IF NOT EXISTS idx_api_usage_key ON api_key_usage(key_id);
    CREATE INDEX IF NOT EXISTS idx_api_usage_created ON api_key_usage(created_at);
    CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON api_key_usage(endpoint);

    -- API Key Quotas (Optional - for future analytics/limits)
    CREATE TABLE IF NOT EXISTS api_key_quotas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key_id TEXT NOT NULL,
        period TEXT NOT NULL,              -- "2025-12" (YYYY-MM format)
        requests_count INTEGER DEFAULT 0,
        credits_used INTEGER DEFAULT 0,
        images_generated INTEGER DEFAULT 0,
        videos_generated INTEGER DEFAULT 0,
        FOREIGN KEY (key_id) REFERENCES api_keys(key_id) ON DELETE CASCADE,
        UNIQUE(key_id, period)
    );

    CREATE INDEX IF NOT EXISTS idx_api_quotas_key_period ON api_key_quotas(key_id, period);
    """
    
    should_close = False
    if conn is None:
        conn = get_db_connection()
        should_close = True
    
    try:
        conn.executescript(api_schema)
        
        # Migration: Add 'name' column to api_keys if not exists
        try:
            cursor = conn.execute("PRAGMA table_info(api_keys)")
            columns = [row[1] for row in cursor.fetchall()]
            
            if 'name' not in columns and 'api_keys' in [r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]:
                conn.execute("ALTER TABLE api_keys ADD COLUMN name TEXT")
                print("Added 'name' column to api_keys table")
            
            if 'key_full' not in columns and 'api_keys' in [r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]:
                conn.execute("ALTER TABLE api_keys ADD COLUMN key_full TEXT")
                print("Added 'key_full' column to api_keys table")
        except Exception as e:
            print(f"Migration note (api_keys columns): {e}")
        
        # Seed system user for unlinked public API usage
        # This ensures 'jobs' table foreign key constraints are met
        try:
            conn.execute(
                """
                INSERT OR IGNORE INTO users (user_id, google_id, email, username, credits)
                VALUES ('system_public_api', 'system_public_api', 'public-api@system.local', 'Public API System', 0)
                """
            )
        except Exception as e:
            print(f"Warning seeding system user: {e}")
            
        conn.commit()
        print("API Key tables initialized successfully")
    except Exception as e:
        print(f"Error initializing API Key tables: {e}")
        raise
    finally:
        if should_close:
            conn.close()


def reset_database() -> None:
    """
    Reset the database by deleting and reinitializing.
    WARNING: This will delete all data!
    """
    if DATABASE_PATH.exists():
        # Close any existing connections first
        os.remove(DATABASE_PATH)
        
        # Also remove WAL files if they exist
        wal_path = DATABASE_PATH.with_suffix(".db-wal")
        shm_path = DATABASE_PATH.with_suffix(".db-shm")
        if wal_path.exists():
            os.remove(wal_path)
        if shm_path.exists():
            os.remove(shm_path)
    
    init_database()
    print("Database reset complete.")


# Helper functions for common operations
def fetch_one(query: str, params: tuple = ()) -> dict | None:
    """Execute a query and return a single row as a dictionary."""
    with get_db_context() as conn:
        cursor = conn.execute(query, params)
        row = cursor.fetchone()
        if row:
            return dict(row)
        return None


def fetch_all(query: str, params: tuple = ()) -> list[dict]:
    """Execute a query and return all rows as a list of dictionaries."""
    with get_db_context() as conn:
        cursor = conn.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]


def execute(query: str, params: tuple = ()) -> int:
    """Execute a query and return the number of affected rows."""
    with get_db_context() as conn:
        cursor = conn.execute(query, params)
        return cursor.rowcount


def execute_returning_id(query: str, params: tuple = ()) -> int:
    """Execute an INSERT query and return the last inserted row ID."""
    with get_db_context() as conn:
        cursor = conn.execute(query, params)
        return cursor.lastrowid
