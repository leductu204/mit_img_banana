"""
Migration script to update subscription plans to new 4-tier structure.
Run this to update the database from old 3-tier to new 4-tier subscription structure.
"""
import sqlite3

def migrate_subscription_plans():
    conn = sqlite3.connect('app.db')
    cursor = conn.cursor()
    
    try:
        print("Starting migration...")
        
        # Update existing Starter plan (plan_id 2)
        cursor.execute("""
            UPDATE subscription_plans SET 
                total_concurrent_limit = 2,
                image_concurrent_limit = 1,
                video_concurrent_limit = 1,
                description = 'Gói Trải Nghiệm'
            WHERE plan_id = 2
        """)
        print("✓ Updated Starter plan (ID 2)")
        
        # Update existing plan 3 to Professional
        cursor.execute("""
            UPDATE subscription_plans SET 
                name = 'Professional',
                price = 149000.0,
                total_concurrent_limit = 4,
                image_concurrent_limit = 2,
                video_concurrent_limit = 2,
                description = 'Gói Tiết Kiệm'
            WHERE plan_id = 3
        """)
        print("✓ Updated plan 3 to Professional")
        
        # Add new Business plan (plan_id 4)
        cursor.execute("""
            INSERT OR IGNORE INTO subscription_plans 
            (plan_id, name, price, total_concurrent_limit, image_concurrent_limit, video_concurrent_limit, description)
            VALUES (4, 'Business', 499000.0, 6, 3, 3, 'Gói Sáng Tạo')
        """)
        print("✓ Added Business plan (ID 4)")
        
        conn.commit()
        
        # Verify the changes
        cursor.execute("""
            SELECT plan_id, name, price, total_concurrent_limit, 
                   image_concurrent_limit, video_concurrent_limit, description 
            FROM subscription_plans 
            ORDER BY plan_id
        """)
        
        print("\n=== Current Subscription Plans ===")
        for row in cursor.fetchall():
            plan_id, name, price, total, img, vid, desc = row
            print(f"ID {plan_id}: {name} ({desc})")
            print(f"  Price: {price:,.0f}đ")
            print(f"  Concurrent: Total={total}, Image={img}, Video={vid}")
            print()
        
        print("Migration completed successfully!")
        
    except Exception as e:
        conn.rollback()
        print(f"Error during migration: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_subscription_plans()
