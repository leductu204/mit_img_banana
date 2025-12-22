from selenium import webdriver
from selenium.webdriver.chrome.options import Options
import time
import tempfile
import uuid

def solve_recaptcha_v3_enterprise(site_key, site_url, action='FLOW_GENERATION'):
    """
    Solves reCAPTCHA v3 Enterprise using Selenium by executing JavaScript directly.
    """
    chrome_options = Options()
    
    unique_data_dir = tempfile.mkdtemp(prefix=f"chrome_captcha_{uuid.uuid4().hex[:8]}_")
    chrome_options.add_argument(f"--user-data-dir={unique_data_dir}")
    
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--window-size=1920,1080")
    
    # Disable automation flags to avoid detection
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option('useAutomationExtension', False)
    
    # Matching Browser Identity to avoid detection
    UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    chrome_options.add_argument(f'user-agent={UA}')

    print(f"[*] Initializing Chrome and navigating to {site_url}...")
    driver = webdriver.Chrome(options=chrome_options)
    
    try:
        driver.set_script_timeout(30) # Allow time for reCAPTCHA to respond
        driver.get(site_url)
        time.sleep(3) # Wait for initial page scripts

        print(f"[*] Requesting Enterprise Token for action: '{action}'...")
        
        # This script injects the reCAPTCHA script if missing and executes the action
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
        
        token = driver.execute_async_script(script)
        if token and not token.startswith('ERROR'):
            print("[+] Token generated successfully.")
        return token

    except Exception as e:
        print(f"[-] Selenium Error: {e}")
        return None
    finally:
        driver.quit()
        # Clean up temp directory
        try:
            import shutil
            shutil.rmtree(unique_data_dir, ignore_errors=True)
        except:
            pass  # Ignore cleanup errors

if __name__ == "__main__":
    # Test Configuration
    SITE_KEY = '6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV'
    URL = 'https://labs.google'
    
    token = solve_recaptcha_v3_enterprise(SITE_KEY, URL)
    if token:
        print(f"\n[TOKEN]\n{token}")
