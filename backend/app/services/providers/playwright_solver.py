"""
Playwright-based reCAPTCHA v3 Enterprise solver.
Uses async Playwright with Chromium for captcha token generation.
Supports proxy configuration, persistent browser context, and robust injection.
"""
import asyncio
import random
import os
import re
import time
from typing import Tuple, Optional, Dict
from playwright.async_api import async_playwright, BrowserContext, Page

# Configuration
SITE_KEY = '6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV'
SITE_URL = 'https://labs.google'


def parse_proxy_url(proxy_url: str) -> Optional[Dict[str, str]]:
    """Parse proxy URL, separating protocol, host, port, and authentication info"""
    if not proxy_url:
        return None
        
    proxy_pattern = r'^(socks5|http|https)://(?:([^:]+):([^@]+)@)?([^:]+):(\d+)$'
    match = re.match(proxy_pattern, proxy_url)
    if match:
        protocol, username, password, host, port = match.groups()
        proxy_config = {'server': f'{protocol}://{host}:{port}'}
        if username and password:
            proxy_config['username'] = username
            proxy_config['password'] = password
        return proxy_config
    return None


class PlaywrightSolver:
    """
    Singleton class for Playwright-based reCAPTCHA solving.
    Maintains a persistent browser context for better performance and trust scores.
    """
    _instance: Optional['PlaywrightSolver'] = None
    _lock = asyncio.Lock()

    def __init__(self):
        self.playwright = None
        self.context: Optional[BrowserContext] = None
        self._initialized = False
        # Use a local directory for persistent profile data
        self.user_data_dir = os.path.join(os.getcwd(), "browser_data")
        
    @classmethod
    async def get_instance(cls) -> 'PlaywrightSolver':
        if cls._instance is None:
            async with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    async def initialize(self, headless: bool = False, proxy_url: Optional[str] = None):
        """Initialize persistent browser context"""
        if self._initialized and self.context:
            return

        try:
            print(f"[PlaywrightSolver] Starting browser (data dir: {self.user_data_dir})...", flush=True)
            self.playwright = await async_playwright().start()

            # Configure launch options
            launch_options = {
                'headless': headless,
                'user_data_dir': self.user_data_dir,
                'viewport': {'width': 1280, 'height': 720},
                'args': [
                    '--disable-blink-features=AutomationControlled',
                    '--disable-infobars',
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                ]
            }

            # Proxy configuration
            if proxy_url:
                proxy_config = parse_proxy_url(proxy_url)
                if proxy_config:
                    # Note: SOCKS5 auth is limited in Playwright; HTTP auth works fine.
                    launch_options['proxy'] = proxy_config
                    print(f"[PlaywrightSolver] Using proxy: {proxy_config['server']}", flush=True)

            # Launch persistent context
            self.context = await self.playwright.chromium.launch_persistent_context(**launch_options)
            self.context.set_default_timeout(30000)
            
            # Inject stealth scripts globally for this context if possible
            # Note: For persistent context, add_init_script works on the context
            from app.services.providers.stealth_config import get_advanced_stealth_script
            await self.context.add_init_script(get_advanced_stealth_script())

            self._initialized = True
            print(f"[PlaywrightSolver] Browser started successfully.", flush=True)

        except Exception as e:
            print(f"[PlaywrightSolver] Browser start failed: {str(e)}", flush=True)
            raise

    async def get_token(
        self,
        site_key: str = SITE_KEY,
        site_url: str = SITE_URL,
        action: str = 'FLOW_GENERATION'
    ) -> Tuple[str, str]:
        """
        Get reCAPTCHA token using the persistent browser context.
        """
        print(f"[PlaywrightSolver] 🔍 Requesting Token for Action: '{action}'", flush=True)

        if not self._initialized or not self.context:
            await self.initialize()

        page: Optional[Page] = None
        try:
            # Create new tab in existing context
            page = await self.context.new_page()
            
            print(f"[PlaywrightSolver] Navigating to {site_url}...", flush=True)
            try:
                await page.goto(site_url, wait_until="domcontentloaded", timeout=45000)
            except Exception as e:
                print(f"[PlaywrightSolver] Page load warning (continuing): {str(e)}", flush=True)

            # Human-like delay
            await asyncio.sleep(random.uniform(1.0, 2.0))

            # Check and inject reCAPTCHA v3 script
            script_loaded = await page.evaluate(f"""
                () => {{
                    return !!(window.grecaptcha && window.grecaptcha.enterprise && window.grecaptcha.enterprise.execute);
                }}
            """)

            if not script_loaded:
                print(f"[PlaywrightSolver] Injecting reCAPTCHA script...", flush=True)
                await page.evaluate(f"""
                    () => {{
                        return new Promise((resolve) => {{
                            const script = document.createElement('script');
                            script.src = 'https://www.google.com/recaptcha/enterprise.js?render={site_key}';
                            script.async = true;
                            script.defer = true;
                            script.onload = () => resolve(true);
                            script.onerror = () => resolve(false);
                            document.head.appendChild(script);
                        }});
                    }}
                """)
                # Wait for grecaptcha to be ready
                for _ in range(20):
                    is_ready = await page.evaluate("""
                        () => {
                            return window.grecaptcha && 
                                   window.grecaptcha.enterprise && 
                                   typeof window.grecaptcha.enterprise.execute === 'function';
                        }
                    """)
                    if is_ready:
                        break
                    await asyncio.sleep(0.5)

            # Execute verification
            print(f"[PlaywrightSolver] Executing reCAPTCHA for action '{action}'...", flush=True)
            token = await page.evaluate(f"""
                async () => {{
                    try {{
                        return await window.grecaptcha.enterprise.execute('{site_key}', {{ action: '{action}' }});
                    }} catch (e) {{
                        console.error('Execution failed:', e);
                        return null;
                    }}
                }}
            """)

            actual_ua = await page.evaluate("navigator.userAgent")

            if token:
                print(f"[PlaywrightSolver] Token received ({len(token)} chars)", flush=True)
                return token, actual_ua
            else:
                raise ValueError("Token execution returned null")

        except Exception as e:
            print(f"[PlaywrightSolver] Error during token retrieval: {str(e)}", flush=True)
            # If context crashed, reset initialization state
            if "Target closed" in str(e) or "Session closed" in str(e):
                self._initialized = False
            return "", ""
        finally:
            if page:
                try:
                    await page.close()
                except:
                    pass

    async def close(self):
        """Clean up resource"""
        try:
            if self.context:
                await self.context.close()
                self.context = None
            if self.playwright:
                await self.playwright.stop()
                self.playwright = None
            self._initialized = False
        except Exception as e:
            print(f"[PlaywrightSolver] Close error: {str(e)}", flush=True)


# --- Global Instance Helper ---

async def solve_recaptcha_playwright_async(
    site_key: str = SITE_KEY,
    site_url: str = SITE_URL,
    action: str = 'FLOW_GENERATION',
    headless: bool = False
) -> Tuple[str, str]:
    """
    Async wrapper that uses the Singleton PlaywrightSolver.
    Note: 'headless' argument is passed to initialize() only if the instance isn't already running.
    """
    solver = await PlaywrightSolver.get_instance()
    # Initialize if needed (passing headless preference)
    await solver.initialize(headless=headless)
    
    token, ua = await solver.get_token(site_key, site_url, action)
    if not token:
        raise Exception("Failed to retrieve reCAPTCHA token")
    return token, ua


def solve_recaptcha_playwright(
    site_key: str = SITE_KEY,
    site_url: str = SITE_URL,
    action: str = 'FLOW_GENERATION',
    headless: bool = False
) -> Tuple[str, str]:
    """
    Sync wrapper - This creates a fresh ad-hoc run because Singleton is async.
    Ideally this should not be used if high performance is needed.
    Kept for backward compatibility.
    """
    import asyncio
    
    # If on Windows, force isolated execution to avoid Loop conflicts
    import sys
    if sys.platform == 'win32':
        return get_token_isolated(site_key, site_url, action)

    # Simple strategy for non-Windows or if not in loop
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    if loop.is_running():
         # If we are already in a running loop (e.g. Linux Uvicorn worker), we can't use run_until_complete
         # This is a generic problem. But let's assume this function is mainly for sync contexts.
         # For Windows we already delegated.
         pass

    return loop.run_until_complete(
        solve_recaptcha_playwright_async(site_key, site_url, action, headless)
    )


# For backwards compatibility with selenium_solver interface
def solve_recaptcha_v3_enterprise(
    site_key: str = SITE_KEY,
    site_url: str = SITE_URL,
    action: str = 'FLOW_GENERATION',
    proxy: str = None
) -> Tuple[str, str]:
    """
    Drop-in replacement for selenium_solver.solve_recaptcha_v3_enterprise.
    """
    # Note: Singleton instance maintains its own proxy config if initialized with one.
    # Dynamically changing proxy for singleton is not fully supported in this simple implementation
    # without re-initialization.
    return solve_recaptcha_playwright(site_key, site_url, action, headless=False)
    return solve_recaptcha_playwright(site_key, site_url, action, headless=False)


def get_token_isolated(
    site_key: str = SITE_KEY,
    site_url: str = SITE_URL,
    action: str = 'FLOW_GENERATION'
) -> Tuple[str, str]:
    """
    Stand-alone function to run Playwright in a completely new Event Loop.
    This bypasses the Main Thread's SelectorEventLoop issues on Windows/Uvicorn.
    """
    import sys
    import asyncio
    
    # 1. Enforce Proactor for this thread/process
    if sys.platform == 'win32':
        try:
            asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
            print(f"[Isolated] Win32 Policy set to: {type(asyncio.get_event_loop_policy())}", flush=True)
        except Exception as e:
            print(f"[Isolated] Failed to set policy: {e}", flush=True)
        
    # 2. Create new loop
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    print(f"[Isolated] Event Loop created: {type(loop)}", flush=True)
    
    async def _run():
        # Create FRESH instance, do not use Singleton to avoid Lock issues
        solver = PlaywrightSolver()
        try:
            print("[Isolated] Initializing solver with headless=False...", flush=True)
            await solver.initialize(headless=False) # Visual debug
            return await solver.get_token(site_key, site_url, action)
        except Exception as e:
            print(f"[Isolated] Solver error: {e}", flush=True)
            raise
        finally:
            await solver.close()
            
    try:
        return loop.run_until_complete(_run())
    except Exception as e:
        print(f"[Isolated] Loop execution error: {e}", flush=True)
        raise
    finally:
        loop.close()
