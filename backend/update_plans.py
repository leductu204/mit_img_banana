import sqlite3
import os

# Try common locations
possible_paths = [
    "database/app.db",          # Running from /backend
    "backend/database/app.db",  # Running from root
]

db_path = None
for p in possible_paths:
    if os.path.exists(p):
        db_path = p
        break

def update_plans():
    if not db_path:
        print(f"Error: Database not found in any of: {possible_paths}")
        return

    print(f"Connecting to {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Correct Plan Mapping (Name -> Price)
        # ID 2: Starter -> 99.000 (Was 49.000)
        # ID 3: Professional -> 199.000 (Was 149.000)
        # ID 4: Business -> 499.000 (Correct)
        
        updates = [
            ("Starter", 99000.0),
            ("Professional", 199000.0),
            ("Business", 499000.0) # Confirming this one
        ]

        for name, price in updates:
            print(f"Updating {name} to {price:,.0f}...")
            cursor.execute("UPDATE subscription_plans SET price = ? WHERE name = ?", (price, name))
        
        conn.commit()
        print("Plans updated successfully.")
        
        # Verify
        print("\nVerifying current plans:")
        cursor.execute("SELECT * FROM subscription_plans")
        rows = cursor.fetchall()
        for row in rows:
            print(row)

    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    update_plans()
