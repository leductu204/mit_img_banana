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
        
        # Also initialize admin tables
        init_admin_tables(conn)
        
    except Exception as e:
        print(f"Error initializing database: {e}")
        raise
    finally:
        conn.close()


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
        
        conn.commit()
        print("Admin tables initialized successfully")
    except Exception as e:
        print(f"Error initializing admin tables: {e}")
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
