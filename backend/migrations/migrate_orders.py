"""
Create orders table for PayOS integration.
"""
import sqlite3
import os
from pathlib import Path

# Database path - relative to backend directory
# Assuming this script is run from backend/migrations/ or similar, but let's be safe and use relative path logic or direct path if possible.
# Using logic similar to db.py
BASE_DIR = Path(__file__).resolve().parent.parent
DATABASE_PATH = BASE_DIR / "database" / "app.db"

def migrate_orders():
    print(f"Connecting to database at {DATABASE_PATH}")
    conn = sqlite3.connect(
        str(DATABASE_PATH),
        check_same_thread=False,
        timeout=30.0
    )
    
    try:
        # Check if table exists
        cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='orders'")
        if cursor.fetchone():
            print("orders table already exists.")
        else:
            print("Creating orders table...")
            conn.execute("""
                CREATE TABLE orders (
                    order_code INTEGER PRIMARY KEY, -- PayOS requires integer orderCode
                    user_id TEXT NOT NULL,
                    plan_id INTEGER NOT NULL,
                    amount INTEGER NOT NULL,
                    status TEXT DEFAULT 'PENDING', -- PENDING, PAID, CANCELLED
                    payment_link_id TEXT,
                    checkout_url TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(user_id),
                    FOREIGN KEY (plan_id) REFERENCES subscription_plans(plan_id)
                )
            """)
            
            # Indexes
            conn.execute("CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)")
            
            print("✓ orders table created")
            
        conn.commit()
        print("Migration completed successfully.")
        
    except Exception as e:
        conn.rollback()
        print(f"Error migrating database: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_orders()
