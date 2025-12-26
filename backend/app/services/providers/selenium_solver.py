"""
Selenium CAPTCHA solver using undetected-chromedriver.
Simple approach: Open Chrome -> Get token -> Close Chrome
Each call creates a NEW Chrome instance with isolated profile.
"""
import undetected_chromedriver as uc
import time
import random
import os
import tempfile
import platform


def solve_recaptcha_v3_enterprise(site_key, site_url, action='FLOW_GENERATION'):
    """
    Solves reCAPTCHA v3 Enterprise.
    Opens NEW Chrome instance -> Gets token -> Closes Chrome.
    Does NOT interfere with user's personal Chrome.
    """
    driver = None
    
    try:
        print(f"[*] Starting reCAPTCHA solver for {site_url}...")
        
        # Detect OS
        is_windows = platform.system() == 'Windows'
        is_linux = platform.system() == 'Linux'
        
        # Check DISPLAY on Linux
        if is_linux:
            display = os.environ.get('DISPLAY')
            if not display:
                raise RuntimeError("Linux requires DISPLAY. Run: export DISPLAY=:0 (or check VNC display)")
            
            # Detect display type
            if display.startswith(':99') or display.startswith(':98'):
                print(f"[*] WARNING: Using virtual display {display}")
                print(f"[*] Chrome will NOT be visible in VNC viewer!")
                print(f"[*] To see Chrome in VNC, find VNC display with:")
                print(f"[*]   ps aux | grep vnc")
                print(f"[*] Then: export DISPLAY=:0 (or whatever VNC uses)")
            else:
                print(f"[*] Using REAL display: {display}")
                print(f"[*] Chrome should be visible in VNC viewer")
        else:
            print(f"[*] Running on {platform.system()}")
        
        # Create isolated user data directory
        user_data_dir = tempfile.mkdtemp(prefix='chrome_captcha_')
        print(f"[*] Using isolated Chrome profile: {user_data_dir}")
        
        # Configure Chrome options
        options = uc.ChromeOptions()
        
        # Use isolated profile (won't touch user's Chrome)
        options.add_argument(f'--user-data-dir={user_data_dir}')
        
        # CRITICAL: Force REAL visible window
        options.add_argument('--start-maximized')
        options.add_argument('--window-size=1920,1080')
        options.add_argument('--window-position=0,0')
        
        # Essential flags for VPS/root
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-setuid-sandbox')
        
        # Anti-detection: REMOVE automation indicators
        options.add_argument('--disable-blink-features=AutomationControlled')
        
        # Realistic user agent - Set to Chrome v143
        fixed_ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
        options.add_argument(f'--user-agent={fixed_ua}')
        
        
        # Detect Chrome version and use appropriate driver
        version = None  # Will be set below
        
        if is_linux:
            # Try to detect installed Chrome version
            try:
                import subprocess
                result = subprocess.run(
                    ['google-chrome', '--version'],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                if result.returncode == 0:
                    import re
                    match = re.search(r'(\d+)\.', result.stdout)
                    if match:
                        detected_version = int(match.group(1))
                        version = detected_version
                        print(f"[*] Detected Chrome version: {detected_version}")
            except Exception as e:
                print(f"[*] Could not detect Chrome version: {e}")
                # Fallback to 138 for VPS
                version = 138
        
        version_str = f"v{version}" if version else "auto-detect"
        print(f"[*] Using ChromeDriver {version_str}")
        print(f"[*] Launching Chrome with VISIBLE UI...")
        
        # Create Chrome instance - MUST be visible!
        driver = uc.Chrome(
            options=options,
            version_main=version,
            use_subprocess=is_linux,
            headless=False,  # CRITICAL: Must be False!
            driver_executable_path=None  # Let uc handle this
        )
        
        
        print(f"[*] ✓ Chrome window should be VISIBLE now!")
        print(f"[*] Check if you can see Chrome window on screen...")
        
        # Set timeouts
        driver.set_script_timeout(25)
        driver.set_page_load_timeout(30)
        
        # Navigate to site
        print(f"[*] Navigating to {site_url}...")
        driver.get(site_url)
        
        # Human-like delay (longer to appear more natural)
        delay = random.uniform(2.0, 4.0)
        print(f"[*] Waiting {delay:.1f}s (human behavior)...")
        time.sleep(delay)
        
        # Get actual User-Agent to return
        actual_ua = driver.execute_script("return navigator.userAgent")
        print(f"[*] Captured browser User-Agent: {actual_ua}")
        
        # Advanced anti-detection JavaScript
        print(f"[*] Injecting MAXIMUM stealth scripts...")
        
        from .stealth_config import get_advanced_stealth_script
        driver.execute_script(get_advanced_stealth_script())
        
        print(f"[*] Executing reCAPTCHA for action '{action}'...")
        print(f"[*] You should see Chrome interacting with {site_url}...")
        
        # Execute reCAPTCHA
        script = f"""
        const callback = arguments[arguments.length - 1];
        try {{
            if (!window.grecaptcha || !window.grecaptcha.enterprise) {{
                const script = document.createElement('script');
                script.src = 'https://www.google.com/recaptcha/enterprise.js?render={site_key}';
                script.onload = () => {{
                    window.grecaptcha.enterprise.ready(async () => {{
                        try {{
                            const token = await window.grecaptcha.enterprise.execute('{site_key}', {{ action: '{action}' }});
                            callback(token);
                        }} catch (e) {{
                            callback('ERROR: ' + e.toString());
                        }}
                    }});
                }};
                document.head.appendChild(script);
            }} else {{
                window.grecaptcha.enterprise.ready(async () => {{
                    try {{
                        const token = await window.grecaptcha.enterprise.execute('{site_key}', {{ action: '{action}' }});
                        callback(token);
                    }} catch (e) {{
                        callback('ERROR: ' + e.toString());
                    }}
                }});
            }}
        }} catch (e) {{
            callback('ERROR: ' + e.toString());
        }}
        """
        
        token = driver.execute_async_script(script)
        
        if token and token.startswith('ERROR'):
            raise ValueError(f"reCAPTCHA execution failed: {token}")
        
        if not token or len(token) < 50:
            raise ValueError(f"Invalid token received: {token}")
        
        print(f"[*] ✓ Token received ({len(token)} chars)")
        print(f"[*] Token: {token[:50]}...{token[-20:]}")
        
        # Keep window open a bit longer for verification
        print(f"[*] Keeping window open for 2s to verify visibility...")
        time.sleep(2)
        
        return token, actual_ua
        
    except Exception as e:
        print(f"[-] Error: {e}")
        raise ValueError(f"CAPTCHA solver failed: {e}")
        
    finally:
        # ALWAYS close Chrome and clean up
        if driver:
            try:
                print(f"[*] Closing Chrome instance...")
                driver.quit()
                print(f"[*] ✓ Chrome closed")
            except:
                pass
        
        # Clean up temp directory
        try:
            if 'user_data_dir' in locals():
                import shutil
                shutil.rmtree(user_data_dir, ignore_errors=True)
        except:
            pass


def cleanup_chrome():
    """
    Cleanup function (not needed in new non-persistent approach).
    Kept for compatibility.
    """
    print("[*] Cleanup called (no-op in non-persistent mode)")
    pass
