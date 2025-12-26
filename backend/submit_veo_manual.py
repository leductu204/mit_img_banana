import sys
import os
import time

# Add current script directory to path
script_dir = os.path.dirname(os.path.abspath(__file__))
if script_dir not in sys.path:
    sys.path.insert(0, script_dir)

try:
    from app.services.providers.google_client import GoogleVeoClient
    print("✓ GoogleVeoClient imported successfully")
except ImportError as e:
    print(f"✗ Import failed: {e}")
    print(f"  Current Path: {sys.path[0]}")
    print(f"  Looking for 'app' in: {script_dir}")
    sys.exit(1)

def main():
    print("="*60)
    print("      VEO 3.1 MANUAL TOKEN SUBMISSION")
    print("="*60)

    # 1. Get Token from user
    token = input("\n[1] Paste your reCAPTCHA token here: ").strip()
    
    if not token:
        print("Error: Token cannot be empty.")
        return

    # 2. Get Prompt from user
    prompt = input("[2] Enter video prompt (default: 'A futuristic city'): ").strip()
    if not prompt:
        prompt = "A futuristic city at sunset, cinematic lighting, 4k"

    print("\n" + "-"*60)
    print(f"[*] Initializing Google Veo client...")
    client = GoogleVeoClient()

    print(f"[*] Submitting T2V request (Model: veo3.1-low)...")
    print(f"[*] Prompt: {prompt}")
    
    try:
        # Submit the job
        # Note: We don't pass user_agent here, it will use the default v143 we fixed earlier
        result = client.generate_video(
            prompt=prompt,
            recaptchaToken=token,
            model="veo3.1-low",
            aspect_ratio="16:9"
        )
        
        print("\n" + "="*60)
        print("✓ SUCCESS: Job Submitted to Google!")
        print("="*60)
        
        if '|' in result:
            op_name, scene_id = result.split('|')
            print(f"  Operation Name: {op_name}")
            print(f"  Scene ID:       {scene_id}")
            print("\n  Logic: Manual Token -> submission successful!")
        else:
            print(f"  Result: {result}")

    except Exception as e:
        print("\n" + "!"*60)
        print("✗ SUBMISSION FAILED")
        print("!"*60)
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
