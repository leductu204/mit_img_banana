import argparse
import sys
import os
from pathlib import Path

# Add backend directory to path so we can import app modules
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BACKEND_DIR))

from app.database.db import init_database
from app.services.api_keys_service import api_keys_service
from app.schemas.api_keys import APIKeyCreate

def main():
    parser = argparse.ArgumentParser(description="Issue a standalone API key (no user account).")
    parser.add_argument("--credits", type=int, required=True, help="Initial credit balance")
    parser.add_argument("--name", type=str, default="Standalone Key", help="Friendly name for the key")
    parser.add_argument("--mode", type=str, choices=["live", "test"], default="live", help="Key mode")
    
    args = parser.parse_args()
    
    print(f"Initializing database...")
    try:
        init_database()
    except Exception as e:
        print(f"Error initializing database: {e}")
        return

    print(f"Generating key '{args.name}' with {args.credits} credits ({args.mode})...")
    
    try:
        # Create key without user_id (None)
        key_data = APIKeyCreate(
            name=args.name,
            mode=args.mode,
            initial_balance=args.credits,
            expires_at=None
        )
        
        response = api_keys_service.create_key(user_id=None, data=key_data)
        
        print("\n" + "="*50)
        print("API KEY GENERATED SUCCESSFULLY")
        print("="*50)
        print(f"Key ID:      {response.key_id}")
        print(f"Name:        {args.name}")
        print(f"Credits:     {response.balance}")
        print(f"Secret Key:  {response.secret_key}")
        print("="*50)
        print("SAVE THIS KEY NOW. IT CANNOT BE RETRIEVED LATER.")
        print("="*50 + "\n")
        
    except Exception as e:
        print(f"Error generating key: {e}")

if __name__ == "__main__":
    main()
