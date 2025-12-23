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
                raise RuntimeError("Linux требует DISPLAY. Run: export DISPLAY=:99 && Xvfb :99 &")
            print(f"[*] Using DISPLAY={display}")
        else:
            print(f"[*] Running on {platform.system()}")
        
        # Create isolated user data directory
        user_data_dir = tempfile.mkdtemp(prefix='chrome_captcha_')
        print(f"[*] Using isolated Chrome profile: {user_data_dir}")
        
        # Configure Chrome options
        options = uc.ChromeOptions()
        
        # Use isolated profile (won't touch user's Chrome)
        options.add_argument(f'--user-data-dir={user_data_dir}')
        
        # Essential flags
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-gpu')
        options.add_argument('--disable-setuid-sandbox')
        options.add_argument('--disable-extensions')
        options.add_argument('--window-size=1920,1080')
        options.add_argument('--disable-blink-features=AutomationControlled')
        
        # Realistic user agent
        options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')
        
        # Detect Chrome version and use appropriate driver
        # VPS usually has older Chrome (138), local has newer (143)
        is_vps = is_linux and os.environ.get('DISPLAY', '').startswith(':9')
        version = 138 if is_vps else None  # None = auto-detect
        
        version_str = f"v{version}" if version else "auto-detect"
        print(f"[*] Launching Chrome ({version_str})...")
        
        # Create Chrome instance
        # use_subprocess: True on Linux VPS, False on Windows
        driver = uc.Chrome(
            options=options,
            version_main=version,
            use_subprocess=(is_linux and is_vps),
            headless=False  # MUST be visible for reCAPTCHA
        )
        
        print(f"[*] ✓ Chrome opened (isolated instance)")
        print(f"[*] Navigating to {site_url}...")
        
        # Set timeouts
        driver.set_script_timeout(20)
        driver.set_page_load_timeout(30)
        
        # Navigate to site
        driver.get(site_url)
        
        # Human-like delay
        delay = random.uniform(1.5, 3.0)
        print(f"[*] Waiting {delay:.1f}s (human behavior)...")
        time.sleep(delay)
        
        # Inject anti-detection JavaScript
        print(f"[*] Injecting anti-detection scripts...")
        driver.execute_script("""
            Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
            Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3, 4, 5]});
            window.chrome = {runtime: {}};
        """)
        
        print(f"[*] Executing reCAPTCHA for action '{action}'...")
        
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
        
        # Small delay before closing
        time.sleep(0.5)
        
        return token
        
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
