"""Script to run the queue_limit migration."""
import sqlite3
import os

# Get the database path
db_path = os.path.join(os.path.dirname(__file__), "app.db")
print(f"Database path: {db_path}")

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# Check if queue_limit column exists
cursor.execute("PRAGMA table_info(subscription_plans)")
columns = [col["name"] for col in cursor.fetchall()]
print(f"Existing columns: {columns}")

if "queue_limit" in columns:
    print("queue_limit column already exists!")
else:
    print("Adding queue_limit column...")
    cursor.execute("ALTER TABLE subscription_plans ADD COLUMN queue_limit INTEGER NOT NULL DEFAULT 5")
    
    # Update plan-specific queue limits
    updates = [
        (3, 1),   # Free: queue_limit = 3
        (5, 2),   # Starter: queue_limit = 5
        (15, 3),  # Professional: queue_limit = 15
        (30, 4),  # Business: queue_limit = 30
    ]
    
    for queue_limit, plan_id in updates:
        cursor.execute("UPDATE subscription_plans SET queue_limit = ? WHERE plan_id = ?", (queue_limit, plan_id))
        print(f"  Updated plan_id={plan_id} with queue_limit={queue_limit}")
    
    conn.commit()
    print("Migration complete!")

# Verify the changes
cursor.execute("SELECT plan_id, name, total_concurrent_limit, queue_limit FROM subscription_plans")
plans = cursor.fetchall()
print("\nCurrent subscription plans:")
for plan in plans:
    print(f"  {plan['plan_id']}: {plan['name']} - concurrent={plan['total_concurrent_limit']}, queue={plan['queue_limit']}")

conn.close()
