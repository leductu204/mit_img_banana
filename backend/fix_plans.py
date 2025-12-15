
import sqlite3

def fix_plans():
    db_path = 'database/app.db'
    print(f"Connecting to {db_path}...")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 1. Reset/Upsert Plans
        print("Upserting subscription plans...")
        plans = [
             (1, 'Free', 0.0, 2, 1, 1, 'Basic plan for casual users'),
             (2, 'Starter', 49000.0, 2, 1, 1, 'Gói Trải Nghiệm'),
             (3, 'Professional', 149000.0, 4, 2, 2, 'Gói Tiết Kiệm'),
             (4, 'Business', 499000.0, 6, 3, 3, 'Gói Sáng Tạo')
        ]
        
        for p in plans:
            # Check if exists
            cursor.execute("SELECT plan_id FROM subscription_plans WHERE plan_id = ?", (p[0],))
            exists = cursor.fetchone()
            
            if exists:
                cursor.execute("""
                    UPDATE subscription_plans SET 
                        name=?, price=?, total_concurrent_limit=?, 
                        image_concurrent_limit=?, video_concurrent_limit=?, description=?
                    WHERE plan_id=?
                """, (p[1], p[2], p[3], p[4], p[5], p[6], p[0]))
                print(f"Updated Plan {p[0]}: {p[1]}")
            else:
                cursor.execute("""
                    INSERT INTO subscription_plans 
                    (plan_id, name, price, total_concurrent_limit, image_concurrent_limit, video_concurrent_limit, description)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, p)
                print(f"Inserted Plan {p[0]}: {p[1]}")

        # 2. Force Update User Plan
        print("\nUpdating user 'leductummo@gmail.com' to Professional (Plan 3)...")
        cursor.execute("UPDATE users SET plan_id = 3 WHERE email='leductummo@gmail.com'")
        
        cursor.execute("SELECT plan_id FROM users WHERE email='leductummo@gmail.com'")
        row = cursor.fetchone()
        if row:
            print(f"User plan_id is now: {row[0]}")
            if row[0] == 3:
                 print("SUCCESS: User is set to Professional plan.")
            else:
                 print(f"WARNING: User is on plan {row[0]}.")
        else:
            print("User not found.")

        conn.commit()
        conn.close()
        print("\nDone!")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fix_plans()
