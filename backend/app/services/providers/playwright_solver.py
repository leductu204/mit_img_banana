"""
Playwright-based reCAPTCHA v3 Enterprise solver.
Uses async Playwright with Chromium for captcha token generation.
Supports proxy configuration for API requests.
"""
import asyncio
import random
import os
from typing import Tuple, Optional
from playwright.async_api import async_playwright

# Configuration
SITE_KEY = '6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV'
SITE_URL = 'https://labs.google'


async def solve_recaptcha_playwright_async(
    site_key: str = SITE_KEY,
    site_url: str = SITE_URL,
    action: str = 'FLOW_GENERATION',
    headless: bool = False
) -> Tuple[str, str]:
    """
    Async function to solve reCAPTCHA v3 Enterprise using Playwright Chromium.
    
    Args:
        site_key: The reCAPTCHA site key
        site_url: The URL to navigate to
        action: The reCAPTCHA action name
        headless: Run browser in headless mode (not recommended for captcha)
    
    Returns:
        Tuple of (token, user_agent)
    """
    from app.services.providers.stealth_config import get_advanced_stealth_script
    
    async with async_playwright() as p:
        print(f"[Playwright] Launching Chromium...", flush=True)
        
        browser = await p.chromium.launch(headless=headless)
        
        # Create context with native browser identity
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080}
        )
        
        page = await context.new_page()
        
        # Set timeouts for slow connections
        page.set_default_timeout(90000)
        page.set_default_navigation_timeout(90000)
        
        # Inject stealth before navigating
        await page.add_init_script(get_advanced_stealth_script())
        
        # Navigate to target site
        print(f"[Playwright] Navigating to {site_url}...", flush=True)
        await page.goto(site_url)
        
        # Human-like delay
        await asyncio.sleep(random.uniform(2.0, 4.0))
        
        print(f"[Playwright] Executing reCAPTCHA for action '{action}'...", flush=True)
        
        # Execute reCAPTCHA injection
        script = f"""
        async () => {{
            return new Promise((resolve, reject) => {{
                try {{
                    if (!window.grecaptcha || !window.grecaptcha.enterprise) {{
                        const script = document.createElement('script');
                        script.src = 'https://www.google.com/recaptcha/enterprise.js?render={site_key}';
                        script.onload = () => {{
                            window.grecaptcha.enterprise.ready(async () => {{
                                try {{
                                    const token = await window.grecaptcha.enterprise.execute('{site_key}', {{ action: '{action}' }});
                                    resolve(token);
                                }} catch (e) {{
                                    reject(e.toString());
                                }}
                            }});
                        }};
                        document.head.appendChild(script);
                    }} else {{
                        window.grecaptcha.enterprise.ready(async () => {{
                            try {{
                                const token = await window.grecaptcha.enterprise.execute('{site_key}', {{ action: '{action}' }});
                                resolve(token);
                            }} catch (e) {{
                                reject(e.toString());
                            }}
                        }});
                    }}
                }} catch (e) {{
                    reject(e.toString());
                }}
            }});
        }}
        """
        
        try:
            token = await page.evaluate(script)
            if not token or len(token) < 50:
                raise ValueError(f"Invalid token: {token}")
            
            # Get the actual UA from the browser
            actual_ua = await page.evaluate("navigator.userAgent")
            print(f"[Playwright] Token received ({len(token)} chars)", flush=True)
            
            # Brief wait
            await asyncio.sleep(2)
            
            await browser.close()
            return token, actual_ua
            
        except Exception as e:
            await browser.close()
            raise Exception(f"Playwright captcha failed: {e}")


def solve_recaptcha_playwright(
    site_key: str = SITE_KEY,
    site_url: str = SITE_URL,
    action: str = 'FLOW_GENERATION',
    headless: bool = False
) -> Tuple[str, str]:
    """
    Sync Playwright reCAPTCHA solver (no asyncio - works on Windows).
    Uses sync_playwright API to avoid subprocess issues on Windows.
    
    Returns:
        Tuple of (token, user_agent)
    """
    import time
    from playwright.sync_api import sync_playwright
    from app.services.providers.stealth_config import get_advanced_stealth_script
    
    with sync_playwright() as p:
        print(f"[Playwright] Launching Chromium...", flush=True)
        
        browser = p.chromium.launch(headless=headless)
        
        # Create context with native browser identity
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080}
        )
        
        page = context.new_page()
        
        # Set timeouts for slow connections
        page.set_default_timeout(90000)
        page.set_default_navigation_timeout(90000)
        
        # Inject stealth before navigating
        page.add_init_script(get_advanced_stealth_script())
        
        # Navigate to target site
        print(f"[Playwright] Navigating to {site_url}...", flush=True)
        page.goto(site_url)
        
        # Human-like delay
        time.sleep(random.uniform(2.0, 4.0))
        
        print(f"[Playwright] Executing reCAPTCHA for action '{action}'...", flush=True)
        
        # Execute reCAPTCHA injection
        script = f"""
        async () => {{
            return new Promise((resolve, reject) => {{
                try {{
                    if (!window.grecaptcha || !window.grecaptcha.enterprise) {{
                        const script = document.createElement('script');
                        script.src = 'https://www.google.com/recaptcha/enterprise.js?render={site_key}';
                        script.onload = () => {{
                            window.grecaptcha.enterprise.ready(async () => {{
                                try {{
                                    const token = await window.grecaptcha.enterprise.execute('{site_key}', {{ action: '{action}' }});
                                    resolve(token);
                                }} catch (e) {{
                                    reject(e.toString());
                                }}
                            }});
                        }};
                        document.head.appendChild(script);
                    }} else {{
                        window.grecaptcha.enterprise.ready(async () => {{
                            try {{
                                const token = await window.grecaptcha.enterprise.execute('{site_key}', {{ action: '{action}' }});
                                resolve(token);
                            }} catch (e) {{
                                reject(e.toString());
                            }}
                        }});
                    }}
                }} catch (e) {{
                    reject(e.toString());
                }}
            }});
        }}
        """
        
        try:
            token = page.evaluate(script)
            if not token or len(token) < 50:
                raise ValueError(f"Invalid token: {token}")
            
            # Get the actual UA from the browser
            actual_ua = page.evaluate("navigator.userAgent")
            print(f"[Playwright] Token received ({len(token)} chars)", flush=True)
            
            # Brief wait
            time.sleep(2)
            
            browser.close()
            return token, actual_ua
            
        except Exception as e:
            browser.close()
            raise Exception(f"Playwright captcha failed: {e}")


# For backwards compatibility with selenium_solver interface
def solve_recaptcha_v3_enterprise(
    site_key: str = SITE_KEY,
    site_url: str = SITE_URL,
    action: str = 'FLOW_GENERATION',
    proxy: str = None  # Proxy not used for browser, only for API
) -> Tuple[str, str]:
    """
    Drop-in replacement for selenium_solver.solve_recaptcha_v3_enterprise.
    Uses Playwright instead of undetected-chromedriver.
    
    Note: proxy parameter is ignored for browser (Playwright doesn't support SOCKS5 auth).
    Proxy should be applied to API requests separately.
    """
    return solve_recaptcha_playwright(site_key, site_url, action, headless=False)
