#!/usr/bin/env python3
"""
Script to verify all required dependencies are installed
Run this after installing requirements.txt
"""

import sys

def check_imports():
    """Check if all required packages can be imported"""
    
    required_packages = {
        'fastapi': 'FastAPI',
        'uvicorn': 'Uvicorn',
        'pydantic': 'Pydantic',
        'pydantic_settings': 'Pydantic Settings',
        'requests': 'Requests',
        'httpx': 'HTTPX',
        'dotenv': 'Python-dotenv',
        'PIL': 'Pillow',
        'jwt': 'PyJWT',
        'bcrypt': 'bcrypt',
        'email_validator': 'email-validator',
    }
    
    missing = []
    installed = []
    
    print("🔍 Checking dependencies...\n")
    
    for module, name in required_packages.items():
        try:
            __import__(module)
            installed.append(name)
            print(f"✅ {name}")
        except ImportError:
            missing.append(name)
            print(f"❌ {name} - NOT FOUND")
    
    print(f"\n📊 Summary:")
    print(f"   Installed: {len(installed)}/{len(required_packages)}")
    
    if missing:
        print(f"\n⚠️  Missing packages:")
        for pkg in missing:
            print(f"   - {pkg}")
        print(f"\n💡 Install missing packages:")
        print(f"   pip install -r requirements.txt")
        return False
    else:
        print(f"\n✅ All dependencies are installed!")
        return True

if __name__ == "__main__":
    success = check_imports()
    sys.exit(0 if success else 1)
