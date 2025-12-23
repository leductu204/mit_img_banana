#!/usr/bin/env python3
"""
Quick check for selenium_solver on local machine
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def main():
    print("="*70)
    print("  CHECKING SELENIUM SOLVER (LOCAL)")
    print("="*70)

    # Import the solver
    try:
        from app.services.providers.selenium_solver import solve_recaptcha_v3_enterprise
        print("✓ Import successful")
    except Exception as e:
        print(f"✗ Import failed: {e}")
        sys.exit(1)

    # Configuration (exact production values from video.py)
    SITE_KEY = '6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV'
    SITE_URL = 'https://labs.google'  # Test với Google.com trước

    print(f"\n[*] Checking reCAPTCHA solver...")
    print(f"[*] Site: {SITE_URL}")
    print(f"[*] Key: {SITE_KEY[:20]}...")

    try:
        print("\n" + "="*70)
        token = solve_recaptcha_v3_enterprise(SITE_KEY, SITE_URL)
        print("="*70)
        
        if token and len(token) > 50:
            print(f"\n✓ ✓ ✓ SUCCESS! ✓ ✓ ✓")
            print(f"\nToken received ({len(token)} chars):")
            print(f"{token[:50]}...{token[-20:]}")
            print(f"\n✓ Selenium solver works on local machine!")
            sys.exit(0)
        else:
            print(f"\n✗ FAILED: Invalid token")
            print(f"Token: {token}")
            sys.exit(1)
            
    except Exception as e:
        print("="*70)
        print(f"\n✗ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
