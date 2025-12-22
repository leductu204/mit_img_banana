"""
Selenium CAPTCHA solver using undetected-chromedriver.
This uses a stealth Chrome driver that automatically bypasses bot detection.

CRITICAL: Chrome must be VISIBLE (not headless) for reCAPTCHA to work!
Google detects and rejects tokens from headless browsers.
"""
import undetected_chromedriver as uc
import time
import threading
import random

# Global lock to ensure thread-safe Chrome operations
_chrome_lock = threading.Lock()

# Global persistent Chrome driver (stays alive between requests)
_persistent_driver = None
_driver_init_time = 0


def _initialize_persistent_chrome():
    """
    Initialize a persistent undetected Chrome instance.
    Chrome MUST be visible - Google rejects headless tokens!
    """
    global _persistent_driver, _driver_init_time
    
    print("[*] Initializing undetected Chrome browser (VISIBLE mode)...")
    
    # Configure undetected Chrome options
    options = uc.ChromeOptions()
    # CRITICAL: DO NOT enable headless - Google rejects those tokens!
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1920,1080")
    
    # Initialize undetected Chrome in VISIBLE mode
    _persistent_driver = uc.Chrome(
        options=options,
        version_main=None,  # Auto-detect Chrome version
        use_subprocess=True,
        headless=False  # MUST be False - Google rejects headless tokens!
    )
    
    _driver_init_time = time.time()
    print(f"[+] Undetected Chrome initialized (visible window)")


def solve_recaptcha_v3_enterprise(site_key, site_url, action='FLOW_GENERATION'):
    """
    Solves reCAPTCHA v3 Enterprise using undetected Chrome.
    Opens new tab, gets token, closes tab - Chrome stays alive for next request.
    """
    global _persistent_driver
    
    # Thread-safe Chrome operations
    with _chrome_lock:
        try:
            # Initialize Chrome if not already running
            if _persistent_driver is None:
                _initialize_persistent_chrome()
            
            # Check if Chrome is still alive
            try:
                _ = _persistent_driver.current_url
            except:
                print("[!] Chrome instance died. Reinitializing...")
                _persistent_driver = None
                _initialize_persistent_chrome()
            
            print(f"[*] Opening new tab for CAPTCHA solving...")
            
            # Open new tab
            _persistent_driver.execute_script("window.open('');")
            
            # Switch to the new tab (last one)
            _persistent_driver.switch_to.window(_persistent_driver.window_handles[-1])
            
            try:
                _persistent_driver.set_script_timeout(30)
                _persistent_driver.get(site_url)
                
                # Random human-like delay
                delay = random.uniform(2.0, 4.0)
                print(f"[*] Waiting {delay:.1f}s before CAPTCHA (human behavior)...")
                time.sleep(delay)

                print(f"[*] Requesting Enterprise Token for action: '{action}'...")
                
                # Inject and execute reCAPTCHA script
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
                }} catch (err) {{
                    callback('FATAL ERROR: ' + err.toString());
                }}
                """
                
                token = _persistent_driver.execute_async_script(script)
                
                if token and not token.startswith('ERROR'):
                    print("[+] Token generated successfully.")
                    time.sleep(random.uniform(0.3, 0.7))
                
                return token
                
            finally:
                # Close the current tab
                _persistent_driver.close()
                
                # Switch back to first tab if it exists
                if len(_persistent_driver.window_handles) > 0:
                    _persistent_driver.switch_to.window(_persistent_driver.window_handles[0])
                    print(f"[*] Tab closed. {len(_persistent_driver.window_handles)} tab(s) remaining.")
                
        except Exception as e:
            print(f"[-] Error: {e}")
            # On error, try to reset Chrome
            try:
                if _persistent_driver:
                    _persistent_driver.quit()
            except:
                pass
            _persistent_driver = None
            return None


def cleanup_chrome():
    """
    Cleanup function to properly close Chrome when shutting down.
    Call this on application shutdown if needed.
    """
    global _persistent_driver
    with _chrome_lock:
        if _persistent_driver:
            print("[*] Shutting down undetected Chrome...")
            try:
                _persistent_driver.quit()
            except:
                pass
            _persistent_driver = None
