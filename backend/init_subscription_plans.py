"""
Create subscription_plans table and seed initial data.
"""
import sqlite3

def init_subscription_plans():
    conn = sqlite3.connect('app.db')
    cursor = conn.cursor()
    
    try:
        # Check if table exists
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='subscription_plans'
        """)
        
        if cursor.fetchone():
            print("subscription_plans table already exists. Updating plans...")
        else:
            print("Creating subscription_plans table...")
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
            print("✓ Table created")
        
        # Insert or update plans
        plans = [
            (1, 'Free', 0.0, 2, 1, 1, 'Basic plan for casual users'),
            (2, 'Starter', 99000.0, 2, 1, 1, 'Gói Trải Nghiệm'),
            (3, 'Professional', 199000.0, 4, 2, 2, 'Gói Tiết Kiệm'),
            (4, 'Business', 499000.0, 6, 3, 3, 'Gói Sáng Tạo')
        ]
        
        for plan in plans:
            cursor.execute("""
                INSERT OR REPLACE INTO subscription_plans 
                (plan_id, name, price, total_concurrent_limit, image_concurrent_limit, video_concurrent_limit, description)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, plan)
            print(f"✓ Added/Updated plan {plan[0]}: {plan[1]}")
        
        conn.commit()
        
        # Verify
        cursor.execute("""
            SELECT plan_id, name, price, total_concurrent_limit, 
                   image_concurrent_limit, video_concurrent_limit, description 
            FROM subscription_plans 
            ORDER BY plan_id
        """)
        
        print("\n=== Subscription Plans ===")
        for row in cursor.fetchall():
            plan_id, name, price, total, img, vid, desc = row
            print(f"\nID {plan_id}: {name} - {desc}")
            print(f"  Price: {price:,.0f}đ")
            print(f"  Total: {total} concurrent | Images: {img} max | Videos: {vid} max")
        
        print("\n✓ Database initialized successfully!")
        
    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    init_subscription_plans()
