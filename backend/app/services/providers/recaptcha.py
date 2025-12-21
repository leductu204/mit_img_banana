import requests
import json
import sys
import os
import time

# Support running as both script and module
if __name__ == "__main__":
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../..'))
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '../../../.env'))

from app.config import settings


def get_recaptcha_token(max_attempts: int = 1) -> str:
    """
    Fetch a fresh recaptcha token from the API with retry logic.
    
    Args:
        max_attempts: Maximum number of retry attempts (default: 1)
    
    Returns:
        str: The recaptcha token to be used in video generation requests
        
    Raises:
        Exception: If all retry attempts fail with a friendly error message
    """
    url = "https://new-rest.onewise.app/api/fix/get-token"
    
    # Get the auth key from environment
    auth_key = getattr(settings, 'RECAPTCHA_AUTH_KEY', '')
    if not auth_key:
        raise Exception("Recaptcha service is not configured. Please contact support.")
    
    headers = {
        'Authorization': auth_key  # Should be in format: "Bearer <token>"
    }
    
    last_error = None
    freshest_token = None
    freshest_age = float('inf')
    
    for attempt in range(1, max_attempts + 1):
        try:
            print(f"⏳ Fetching recaptcha token (attempt {attempt}/{max_attempts})...")
            
            # Try to get multiple tokens in rapid succession to find a fresh one
            tokens_to_try = 3 if attempt == 1 else 1  # Try 10 on first attempt, 1 on retries
            
            for sub_attempt in range(tokens_to_try):
                try:
                    # Add timestamp to prevent caching
                    import time as time_module
                    cache_buster = int(time_module.time() * 1000) + sub_attempt
                    url_with_params = f"{url}?t={cache_buster}"
                    
                    response = requests.get(url_with_params, headers=headers, timeout=10)
                    response.raise_for_status()
                    
                    data = response.json()
                    
                    if not data.get('success'):
                        continue
                    
                    token = data.get('token')
                    if not token:
                        continue
                    
                    token_age = data.get('age', 0)
                    
                    # Track the freshest token we've seen
                    if token_age < freshest_age:
                        freshest_age = token_age
                        freshest_token = token
                        
                        from datetime import datetime
                        local_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        print(f"   📍 Sub-attempt {sub_attempt + 1}: age={token_age}s (best so far)")
                        
                        # If we found a fresh token (< 5 min), use it immediately
                        if token_age < 300:
                            print(f"✅ Found fresh token! Age: {token_age}s")
                            return token
                    
                    # Small delay between sub-attempts
                    if sub_attempt < tokens_to_try - 1:
                        time_module.sleep(0.5)
                        
                except Exception as sub_e:
                    continue
            
            # If we have any token, even if not fresh, return the best one we found
            if freshest_token:
                from datetime import datetime
                local_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                print(f"📍 Local backend time: {local_time}")
                print(f"📍 Best token found has age: {freshest_age}s ({freshest_age/3600:.1f} hours)")
                
                if freshest_age > 300:
                    print(f"⚠️  WARNING: All tokens from external service are stale (>{freshest_age}s old)")
                    print(f"⚠️  This will likely be rejected by Google with 403 error")
                    print(f"⚠️  Contact service provider: new-rest.onewise.app")
                
                return freshest_token
            
            # No valid token found
            raise Exception("No valid token received from service")
            
        except requests.exceptions.Timeout:
            last_error = "Recaptcha service is taking too long to respond"
            print(f"✗ Attempt {attempt} failed: Timeout")
            
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 401:
                last_error = "Recaptcha authentication failed. Service configuration may be outdated."
            elif e.response.status_code == 403:
                last_error = "Access to recaptcha service was denied"
            else:
                last_error = f"Recaptcha service returned error (status {e.response.status_code})"
            print(f"✗ Attempt {attempt} failed: HTTP {e.response.status_code}")
            
        except requests.exceptions.ConnectionError:
            last_error = "Cannot connect to recaptcha service"
            print(f"✗ Attempt {attempt} failed: Connection error")
            
        except Exception as e:
            last_error = str(e) if str(e) else "Unknown error occurred while fetching recaptcha token"
            print(f"✗ Attempt {attempt} failed: {e}")
        
        # Wait before retry (except on last attempt)
        if attempt < max_attempts:
            wait_time = attempt * 1  # 1s, 2s wait between attempts
            print(f"   Retrying in {wait_time}s...")
            time.sleep(wait_time)
    
    # All attempts failed
    friendly_error = f"Failed to obtain recaptcha token after {max_attempts} attempts. {last_error}. Please try again later or contact support."
    print(f"✗✗✗ {friendly_error}")
    raise Exception(friendly_error)


if __name__ == "__main__":
    # Test the function when run directly
    token = get_recaptcha_token()
    print(f"\nToken (first 50 chars): {token[:50]}...")
    print(f"Token length: {len(token)} characters")
