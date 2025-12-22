from selenium import webdriver
from selenium.webdriver.chrome.options import Options
import time
import tempfile
import uuid
import threading

# Global lock to ensure thread-safe Chrome operations
_chrome_lock = threading.Lock()

# Global persistent Chrome driver (stays alive between requests)
_persistent_driver = None
_driver_init_time = 0

def _initialize_persistent_chrome():
    """
    Initialize a persistent Chrome instance that stays alive.
    This is called once and the browser is reused for all CAPTCHA requests.
    """
    global _persistent_driver, _driver_init_time
    
    print("[*] Initializing persistent Chrome browser...")
    chrome_options = Options()
    
    # Use unique temp directory
    unique_data_dir = tempfile.mkdtemp(prefix=f"chrome_persistent_{uuid.uuid4().hex[:8]}_")
    chrome_options.add_argument(f"--user-data-dir={unique_data_dir}")
    
    # Headless mode for VPS
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--window-size=1920,1080")
    
    # Disable automation flags
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option('useAutomationExtension', False)
    
    # User agent
    UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    chrome_options.add_argument(f'user-agent={UA}')
    
    _persistent_driver = webdriver.Chrome(options=chrome_options)
    _driver_init_time = time.time()
    print(f"[+] Persistent Chrome initialized successfully")


def solve_recaptcha_v3_enterprise(site_key, site_url, action='FLOW_GENERATION'):
    """
    Solves reCAPTCHA v3 Enterprise using a persistent Chrome instance.
    Opens a new tab, gets token, closes tab - Chrome stays alive for next request.
    """
    global _persistent_driver
    
    # Thread-safe Chrome operations
    with _chrome_lock:
        try:
            # Initialize Chrome if not already running
            if _persistent_driver is None:
                _initialize_persistent_chrome()
            
            # Check if Chrome is still alive (try to get current URL)
            try:
                _ = _persistent_driver.current_url
            except:
                # Chrome crashed or was closed - reinitialize
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
                time.sleep(3)  # Wait for page load

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
                
                return token
                
            finally:
                # Close the current tab (CAPTCHA tab)
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
    Call this on application shutdown.
    """
    global _persistent_driver
    with _chrome_lock:
        if _persistent_driver:
            print("[*] Shutting down persistent Chrome...")
            try:
                _persistent_driver.quit()
            except:
                pass
            _persistent_driver = None


if __name__ == "__main__":
    # Test Configuration
    SITE_KEY = '6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV'
    URL = 'https://labs.google'
    
    # Test multiple requests to see tab reuse
    print("\n=== Testing Persistent Chrome with Multiple Requests ===\n")
    
    for i in range(3):
        print(f"\n--- Request {i+1} ---")
        token = solve_recaptcha_v3_enterprise(SITE_KEY, URL)
        if token:
            print(f"✓ Token: {token[:50]}...")
        time.sleep(1)
    
    # Cleanup
    cleanup_chrome()
    print("\n[*] Test complete. Chrome closed.")
