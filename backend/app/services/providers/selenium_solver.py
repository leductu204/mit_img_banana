"""
Selenium CAPTCHA solver using undetected-chromedriver.
Configured to run on VPS as root with GUI.

CRITICAL: Chrome must be VISIBLE (not headless) for reCAPTCHA to work!
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
    Configured with all flags needed to run as root on VPS.
    """
    global _persistent_driver, _driver_init_time
    
    print("[*] Initializing undetected Chrome (VPS root mode)...")
    
    # Configure Chrome options - CRITICAL for running as root
    options = uc.ChromeOptions()
    
    # Essential flags for running Chrome as root on VPS
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--disable-software-rasterizer")
    options.add_argument("--disable-setuid-sandbox")
    options.add_argument("--disable-extensions")
    
    # Stability flags
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--start-maximized")
    options.add_argument("--remote-debugging-port=0")
    options.add_argument("--disable-blink-features=AutomationControlled")
    
    # User agent
    options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
    
    # Initialize undetected Chrome
    _persistent_driver = uc.Chrome(
        options=options,
        version_main=None,
        use_subprocess=False,  # Better for VPS
        headless=False  # MUST be False - visible mode required
    )
    
    _driver_init_time = time.time()
    print(f"[+] Chrome initialized (visible, root-safe)")


def solve_recaptcha_v3_enterprise(site_key, site_url, action='FLOW_GENERATION'):
    """
    Solves reCAPTCHA v3 Enterprise using undetected Chrome.
    Opens new tab, gets token, closes tab - Chrome stays alive.
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
                print("[!] Chrome died. Reinitializing...")
                _persistent_driver = None
                _initialize_persistent_chrome()
            
            print(f"[*] Opening new tab for CAPTCHA...")
            
            # Open new tab
            _persistent_driver.execute_script("window.open('');")
            
            # Switch to the new tab
            _persistent_driver.switch_to.window(_persistent_driver.window_handles[-1])
            
            try:
                _persistent_driver.set_script_timeout(30)
                _persistent_driver.get(site_url)
                
                # Human-like delay
                delay = random.uniform(2.0, 4.0)
                print(f"[*] Waiting {delay:.1f}s (human behavior)...")
                time.sleep(delay)

                print(f"[*] Executing reCAPTCHA for action '{action}'...")
                
                # Inject and execute reCAPTCHA
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
                    print("[+] Token generated successfully")
                    time.sleep(random.uniform(0.3, 0.7))
                else:
                    print(f"[-] Token generation failed: {token}")
                
                return token
                
            finally:
                # Close the tab
                _persistent_driver.close()
                
                # Switch back to first tab
                if len(_persistent_driver.window_handles) > 0:
                    _persistent_driver.switch_to.window(_persistent_driver.window_handles[0])
                    print(f"[*] Tab closed. {len(_persistent_driver.window_handles)} tab(s) remaining")
                
        except Exception as e:
            print(f"[-] Error: {e}")
            # On error, reset Chrome
            try:
                if _persistent_driver:
                    _persistent_driver.quit()
            except:
                pass
            _persistent_driver = None
            return None


def cleanup_chrome():
    """
    Cleanup - close Chrome on shutdown.
    """
    global _persistent_driver
    with _chrome_lock:
        if _persistent_driver:
            print("[*] Shutting down Chrome...")
            try:
                _persistent_driver.quit()
            except:
                pass
            _persistent_driver = None
