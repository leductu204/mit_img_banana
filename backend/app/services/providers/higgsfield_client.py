import json
import time
import random
from curl_cffi import requests
from PIL import Image
from io import BytesIO
from app.config import settings

class HiggsfieldClient:
    def __init__(self, sses: str, cookie: str):
        """
        Initialize Higgsfield client with credentials.
        
        Args:
            sses: Higgsfield SSES session token
            cookie: Higgsfield authentication cookie
        """
        self.sses = sses
        self.cookie = cookie
        self.base_url = "https://fnf.higgsfield.ai"
        self.clerk_url = "https://clerk.higgsfield.ai"
    
    @classmethod
    def create_from_account(cls, account_id: int):
        """
        Create client instance from database account.
        
        Args:
            account_id: ID of Higgsfield account in database
            
        Returns:
            HiggsfieldClient instance
            
        Raises:
            ValueError: If account not found or inactive
        """
        from app.repositories.higgsfield_accounts_repo import higgsfield_accounts_repo
        
        account = higgsfield_accounts_repo.get_account(account_id)
        if not account:
            raise ValueError(f"Higgsfield account {account_id} not found")
        
        if not account['is_active']:
            raise ValueError(f"Higgsfield account {account_id} is inactive")
        
        return cls(sses=account['sses'], cookie=account['cookie'])
    
    @classmethod
    def create_default(cls):
        """
        Create client instance from .env settings (fallback).
        
        Returns:
            HiggsfieldClient instance
            
        Raises:
            ValueError: If credentials not set in .env
        """
        sses = settings.HIGGSFIELD_SSES
        cookie = settings.HIGGSFIELD_COOKIE
        
        if not sses or not cookie:
            raise ValueError("HIGGSFIELD_SSES and HIGGSFIELD_COOKIE must be set in .env")
        
        return cls(sses=sses, cookie=cookie)
    
    def reload_credentials(self):
        """
        Reload credentials from .env file (called after admin updates).
        Note: This only works for instances created with create_default().
        """
        from dotenv import load_dotenv
        load_dotenv(override=True)  # Force reload from .env
        import os
        self.sses = os.getenv("HIGGSFIELD_SSES", "")
        self.cookie = os.getenv("HIGGSFIELD_COOKIE", "")

    def _get_headers(self, auth_token: str = None):
        headers = {
            'accept': '*/*',
            'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
            'origin': 'https://higgsfield.ai',
            'priority': 'u=1, i',
            'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-site',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
            'Cookie': self.cookie
        }
        if auth_token:
            headers['authorization'] = auth_token
        return headers

    def _handle_response(self, response: requests.Response, operation: str = "API request"):
        """Sanitize HTTP errors to prevent exposing internal URLs"""
        try:
            response.raise_for_status()
        except requests.exceptions.HTTPError:
            raise Exception(f"{operation} failed with status {response.status_code}: {response.text}")

    def get_jwt_token(self) -> str:
        url = f"{self.clerk_url}/v1/client/sessions/{self.sses}/tokens?__clerk_api_version=2025-11-10&_clerk_js_version=5.109.0"
        payload = 'organization_id='
        headers = self._get_headers()
        headers['content-type'] = 'application/x-www-form-urlencoded'

        response = requests.post(url, headers=headers, data=payload, impersonate="chrome")
        self._handle_response(response, "Authentication")
        
        try:
            data = response.json()
            token = data.get("jwt")
            if not token:
                 raise ValueError("JWT token not found in response")
            return "Bearer " + token
        except (json.JSONDecodeError, ValueError) as e:
            raise Exception(f"Failed to parse authentication response")

    def get_jwt_token_with_retry(self, max_retries: int = 3) -> str:
        for attempt in range(max_retries):
            try:
                return self.get_jwt_token()
            except Exception:
                if attempt < max_retries - 1:
                    time.sleep(2)
                    continue
                raise

    def check_upload(self, img_id: str, max_retries: int = 3) -> str:
        for attempt in range(max_retries):
            try:
                jwt_token = self.get_jwt_token_with_retry()
                url = f"{self.base_url}/media/{img_id}/upload"
                headers = self._get_headers(jwt_token)
                headers['content-length'] = '0'

                response = requests.post(url, headers=headers, data={}, impersonate="chrome")
                self._handle_response(response, "Upload check")
                return response.text
            except (requests.RequestException, Exception) as e:
                if attempt < max_retries - 1:
                    time.sleep(2)
                    continue
                raise Exception(f"Failed to check upload after {max_retries} attempts: {e}")

    def create_reference_media(self, max_retries: int = 3) -> dict:
        for attempt in range(max_retries):
            try:
                jwt_token = self.get_jwt_token_with_retry()
                url = f"{self.base_url}/reference-media"
                headers = self._get_headers(jwt_token)
                headers['content-type'] = 'application/json'
                
                payload = json.dumps({"mimetype": "image/jpeg"})

                response = requests.post(url, headers=headers, data=payload, impersonate="chrome")
                self._handle_response(response, "Create reference media")
                
                data = response.json()
                if not data.get("id") or not data.get("upload_url"):
                     raise ValueError(f"Missing required fields in response: {data}")

                return {
                    "id": data.get("id"),
                    "url": data.get("url"),
                    "upload_url": data.get("upload_url")
                }
            except (json.JSONDecodeError, ValueError, requests.RequestException) as e:
                if attempt < max_retries - 1:
                    time.sleep(2)
                    continue
                response_text = getattr(response, 'text', 'No response')[:200] if 'response' in locals() else 'No response'
                raise Exception(f"Failed to create reference media after {max_retries} attempts: {e}, Response: {response_text}")

    def batch_media(self, max_retries: int = 3) -> dict:
        for attempt in range(max_retries):
            try:
                jwt_token = self.get_jwt_token_with_retry()
                url = f"{self.base_url}/media/batch"
                headers = self._get_headers(jwt_token)
                headers['content-type'] = 'application/json'
                
                payload = json.dumps({"mimetypes": ["image/jpeg"]})

                response = requests.post(url, headers=headers, data=payload, impersonate="chrome")
                self._handle_response(response, "Check reference media")
                
                data = response.json()
                
                # batch_media returns a list, take the first item
                item = None
                if isinstance(data, list) and len(data) > 0:
                    item = data[0]
                elif isinstance(data, dict):
                    item = data
                
                if not item or not item.get("id") or not item.get("upload_url"):
                     raise ValueError(f"Invalid or missing data in batch response: {data}")

                return {
                    "id": item.get("id"),
                    "url": item.get("url"),
                    "upload_url": item.get("upload_url")
                }
            except (json.JSONDecodeError, ValueError, requests.RequestException) as e:
                if attempt < max_retries - 1:
                    time.sleep(2)
                    continue
                response_text = getattr(response, 'text', 'No response')[:200] if 'response' in locals() else 'No response'
                raise Exception(f"Failed to create batch media after {max_retries} attempts: {e}, Response: {response_text}")

    def upload_image_complete(self, image_data: bytes) -> dict:
        """
        Complete image upload workflow:
        1. Create upload link
        2. Upload image to S3
        3. Confirm upload
        4. Get image dimensions
        
        Args:
            image_data: Image binary data
            
        Returns:
            dict with keys: id, url, width, height
        """
        # Step 1: Create upload link
        jwt_token = self.get_jwt_token_with_retry()
        url = f"{self.base_url}/media?require_consent=true"
        headers = self._get_headers(jwt_token)
        headers['content-length'] = '0'
        
        response = requests.post(url, headers=headers, data={}, impersonate="chrome")
        self._handle_response(response, "Get image dimensions")
        
        data = response.json()
        img_id = data.get("id")
        img_url = data.get("url")
        upload_url = data.get("upload_url")
        
        if not img_id or not img_url or not upload_url:
            raise ValueError(f"Missing required fields in response: {data}")
        
        # Step 2: Upload image to S3
        upload_headers = {
            'Accept': '*/*',
            'Content-Type': 'image/jpeg',
            'Origin': 'https://higgsfield.ai'
        }
        
        upload_response = requests.put(upload_url, headers=upload_headers, data=image_data, impersonate="chrome")
        self._handle_response(upload_response, "Upload image")
        
        # Step 3: Confirm upload
        self.check_upload(img_id)
        
        # Step 4: Get image dimensions
        img_response = requests.get(img_url, impersonate="chrome")
        self._handle_response(img_response, "Get image info")
        img = Image.open(BytesIO(img_response.content))
        width, height = img.size
        
        return {
            "id": img_id,
            "url": img_url,
            "width": width,
            "height": height
        }

    def generate_image(self, prompt: str, input_images: list = [], aspect_ratio: str = "9:16", resolution: str = "1k", model: str = "nano-banana", use_unlim: bool = True) -> str:
        jwt_token = self.get_jwt_token_with_retry()
        
        # Default dimensions
        width = 1024
        height = 1024
        
        # Infer dimensions from first input image if available (I2I)
        if input_images and len(input_images) > 0:
            first_img = input_images[0]
            if 'width' in first_img and 'height' in first_img:
                width = first_img['width']
                height = first_img['height']
        else:
            # Calculate dimensions from aspect ratio for T2I
            width, height = self._get_image_dimensions_from_ratio(aspect_ratio)

        # Check if it's regular Nano Banana (not PRO)
        # Handle both "nano-banana" and "Nano Banana" formats
        model_lower = model.lower().replace("-", " ")  # Normalize to space-separated
        
        if "nano banana" in model_lower and "pro" not in model_lower:
            url = f"{self.base_url}/jobs/nano-banana"
            # nano-banana: Include aspect_ratio to ensure correct dimensions
            payload = json.dumps({
                "params": {
                    "prompt": prompt,
                    "input_images": input_images,
                    "width": width,
                    "height": height,
                    "aspect_ratio": aspect_ratio,  # Added to fix dimension issue
                    "batch_size": 1,
                    "use_unlim": use_unlim
                },
                "use_unlim": use_unlim
            })
        else:
            # Default to nano-banana-pro (nano-banana-2) for PRO models
            url = f"{self.base_url}/jobs/nano-banana-2"
            # nano-banana-pro: aspect_ratio AND resolution supported
            payload = json.dumps({
                "params": {
                    "prompt": prompt,
                    "input_images": input_images,
                    "width": width,
                    "height": height,
                    "batch_size": 1,
                    "aspect_ratio": aspect_ratio,
                    "use_unlim": use_unlim,
                    "resolution": resolution
                },
                "use_unlim": use_unlim
            })
        
        headers = self._get_headers(jwt_token)
        headers['content-type'] = 'application/json'

        response = requests.post(url, headers=headers, data=payload, impersonate="chrome")
        self._handle_response(response, "Generate image")
        try:
            data = response.json()
            if 'job_sets' in data and len(data['job_sets']) > 0:
                return data['job_sets'][0]['id']
            return None
        except (json.JSONDecodeError, ValueError) as e:
            raise Exception(f"Failed to parse image generation response")

    def get_job_status(self, job_id: str) -> dict:
        jwt_token = self.get_jwt_token_with_retry()
        url = f"{self.base_url}/job-sets/{job_id}"
        headers = self._get_headers(jwt_token)

        response = requests.get(url, headers=headers, impersonate="chrome")
        try:
            data = response.json()
            first_job = data['jobs'][0]
            status = first_job['status']
            result = None
            
            if status == 'completed':
                result = first_job['results']['raw']['url']
            
            error_msg = None
            if status in ('failed', 'error', 'cancelled'):
                # Try to find error detail
                if 'error' in first_job:
                    error_msg = str(first_job['error'])
                elif 'failure_reason' in first_job:
                    error_msg = str(first_job['failure_reason'])
                elif 'message' in first_job:
                    error_msg = str(first_job['message'])
            
            return {"status": status, "result": result, "error": error_msg}
        except (json.JSONDecodeError, ValueError) as e:
            raise Exception(f"Failed to parse job status response: {e}, Response: {response.text[:200]}")
        except (KeyError, IndexError, TypeError) as e:
            # Debug logging (commented out - uncomment only when needed)
            # print(f"[higgsfield_client.get_job_status] Exception parsing response: {e}")
            # print(f"[higgsfield_client.get_job_status] Raw response: {response.text[:500]}")
            # Return processing status instead of error - let the job_monitor keep polling
            return {"status": "processing", "result": None, "error": None}

    def _parse_duration(self, duration: str) -> int:
        """Convert duration string to integer (e.g., '5s' -> 5)"""
        return int(duration.replace('s', ''))

    def _get_image_dimensions_from_ratio(self, aspect_ratio: str) -> tuple:
        """Get width and height from aspect ratio for Image models (approx 1MP)"""
        mapping = {
            "1:1": (1024, 1024),
            "16:9": (1344, 768),
            "9:16": (768, 1344),
            "4:3": (1152, 864),
            "3:4": (864, 1152),
            "21:9": (1536, 640),
            "5:4": (1136, 912),
            "4:5": (912, 1136),
            "3:2": (1216, 816),
            "2:3": (816, 1216),
            "auto": (1024, 1024)
        }
        return mapping.get(aspect_ratio, (1024, 1024))

    def _get_dimensions_from_aspect_ratio(self, aspect_ratio: str) -> tuple:
        """Get width and height from aspect ratio for Video models (HD/FHD)"""
        mapping = {
            "16:9": (1920, 1080),
            "9:16": (1080, 1920),
            "1:1": (1080, 1080),
            "4:3": (1440, 1080),
            "3:4": (1080, 1440),
            "21:9": (2560, 1080)
        }
        # Fallback to 9:16 for unknown ratios often used in mobile
        return mapping.get(aspect_ratio, (1080, 1920))

    def generate_video_kling_2_5_turbo(self, prompt: str, duration: int, resolution: str,
                                        input_image: dict = None, use_unlim: bool = True) -> str:
        """
        Generate video using Kling 2.5 Turbo
        Uses /jobs/kling endpoint with resolution parameter
        """
        jwt_token = self.get_jwt_token_with_retry()
        url = f"{self.base_url}/jobs/kling"
        
        # Default dimensions
        width = 1024
        height = 1024
        
        # Get dimensions from input image if provided
        if input_image:
            width = input_image.get('width', 1024)
            height = input_image.get('height', 1024)
        
        payload = {
            "params": {
                "width": width,
                "height": height,
                "prompt": prompt,
                "seed": random.randint(1000, 1000000),
                "cfg_scale": 0.5,
                "camera_control": None,
                "duration": duration,  # API expects integer (5 or 10)
                "model": "kling-v2-5-turbo",
                "resolution": resolution,
                "motion_id": "7077cde8-7947-46d6-aea2-dbf2ff9d441c",
                "enhance_prompt": False,
                "mode": "std",
                "input_image_end": None
            },
            "use_unlim": use_unlim
        }
        
        # Add input image for I2V only (do not include field for T2V)
        if input_image:
            payload["params"]["input_image"] = {
                "type": "media_input",
                "id": input_image["id"],
                "url": input_image["url"],
                "width": input_image["width"],
                "height": input_image["height"]
            }
        
        headers = self._get_headers(jwt_token)
        headers['content-type'] = 'application/json'

        response = requests.post(url, headers=headers, data=json.dumps(payload), impersonate="chrome")
        self._handle_response(response, "Kling 2.5 Turbo Generate")
        
        data = response.json()
        if 'job_sets' in data and len(data['job_sets']) > 0:
            return data['job_sets'][0]['id']
        return None

    def generate_video_kling_o1(self, prompt: str, duration: int, aspect_ratio: str,
                                 input_image: dict = None, use_unlim: bool = True) -> str:
        """
        Generate video using Kling O1 Video
        Uses /jobs/kling-omni-flf endpoint with aspect_ratio parameter
        """
        jwt_token = self.get_jwt_token_with_retry()
        url = f"{self.base_url}/jobs/kling-omni-flf"
        
        width, height = self._get_dimensions_from_aspect_ratio(aspect_ratio)
        
        # Override with input image dimensions if provided
        if input_image:
            width = input_image.get('width', width)
            height = input_image.get('height', height)
        
        payload = {
            "params": {
                "aspect_ratio": aspect_ratio,
                "duration": duration,
                "prompt": prompt,
                "model": "kling-omni-flf",
                "input_image_end": None,
                "height": height,
                "width": width,
                "use_unlim": use_unlim
            },
            "use_unlim": use_unlim
        }
        
        # Add input image for I2V - Kling O1 format (no width/height in input_image)
        if input_image:
            payload["params"]["input_image"] = {
                "id": input_image["id"],
                "type": "media_input",
                "url": input_image["url"]
            }
        else:
            payload["params"]["input_image"] = None
        
        headers = self._get_headers(jwt_token)
        headers['content-type'] = 'application/json'

        response = requests.post(url, headers=headers, data=json.dumps(payload), impersonate="chrome")
        self._handle_response(response, "Get job status")
        
        data = response.json()
        if 'job_sets' in data and len(data['job_sets']) > 0:
            return data['job_sets'][0]['id']
        return None

    def generate_video_kling_2_6(self, prompt: str, duration: int, aspect_ratio: str,
                                  sound: bool = True, input_image: dict = None, 
                                  use_unlim: bool = True) -> str:
        """
        Generate video using Kling 2.6
        Uses /jobs/kling2-6 endpoint with aspect_ratio and sound parameters
        """
        jwt_token = self.get_jwt_token_with_retry()
        url = f"{self.base_url}/jobs/kling2-6"
        
        width, height = self._get_dimensions_from_aspect_ratio(aspect_ratio)
        
        # Override with input image dimensions if provided
        if input_image:
            width = input_image.get('width', width)
            height = input_image.get('height', height)
        
        payload = {
            "params": {
                "width": width,
                "height": height,
                "prompt": prompt,
                "duration": duration,
                "aspect_ratio": aspect_ratio,
                "cfg_scale": 0.5,
                "sound": sound,
                "negative_prompt": None,
                "enhance_prompt": False,
                "motion_id": "7077cde8-7947-46d6-aea2-dbf2ff9d441c",
                "use_unlim": use_unlim
            },
            "use_unlim": use_unlim
        }
        
        # Add input image for I2V - Kling 2.6 format (no width/height in input_image)
        if input_image:
            payload["params"]["input_image"] = {
                "id": input_image["id"],
                "type": "media_input",
                "url": input_image["url"]
            }
        else:
            payload["params"]["input_image"] = None
        
        headers = self._get_headers(jwt_token)
        headers['content-type'] = 'application/json'

        response = requests.post(url, headers=headers, data=json.dumps(payload), impersonate="chrome")
        self._handle_response(response, "Generate video")
        
        data = response.json()
        if 'job_sets' in data and len(data['job_sets']) > 0:
            return data['job_sets'][0]['id']
        return None

    def generate_video(self, prompt: str, model: str = "kling-2.5-turbo",
                       duration: str = "5s", resolution: str = "720p",
                       aspect_ratio: str = "16:9", audio: bool = True,
                       input_images: list = None, use_unlim: bool = True) -> str:
        """
        Dispatcher method - routes to correct model-specific method
        
        Args:
            prompt: Text description of the video
            model: Model to use (kling-2.5-turbo, kling-o1-video, kling-2.6)
            duration: Video duration ("5s" or "10s")
            resolution: Video resolution for kling-2.5-turbo ("720p")
            aspect_ratio: Video aspect ratio for kling-o1/2.6 ("9:16", "16:9", "1:1")
            audio: Whether to generate audio (for kling-2.6, maps to 'sound')
            input_images: List of input images for I2V mode
            use_unlim: Use unlimited credits
            
        Returns:
            job_id: ID to poll for video generation status
        """
        duration_int = self._parse_duration(duration)
        
        # Extract first input image if provided
        input_image = None
        if input_images and len(input_images) > 0:
            input_image = input_images[0]
        
        if model == "kling-2.5-turbo":
            return self.generate_video_kling_2_5_turbo(
                prompt=prompt,
                duration=duration_int,
                resolution=resolution,
                input_image=input_image,
                use_unlim=use_unlim
            )
        elif model == "kling-o1-video":
            return self.generate_video_kling_o1(
                prompt=prompt,
                duration=duration_int,
                aspect_ratio=aspect_ratio,
                input_image=input_image,
                use_unlim=use_unlim
            )
        elif model == "kling-2.6":
            return self.generate_video_kling_2_6(
                prompt=prompt,
                duration=duration_int,
                aspect_ratio=aspect_ratio,
                sound=audio,
                input_image=input_image,
                use_unlim=use_unlim
            )
        else:
            raise ValueError(f"Unknown model: {model}")

    # ============================================
    # NEW MODEL-SPECIFIC METHODS (matching higgsfield_api.py)
    # ============================================
    
    def send_job_kling_2_5_turbo_i2v(self, prompt: str, duration: int, resolution: str,
                                      img_id: str, img_url: str, width: int, height: int,
                                      input_image_end: dict = None, mode: str = "std",
                                      use_unlim: bool = True) -> str:
        """
        Kling 2.5 Turbo I2V - matches send_job_i2v_kling_2_5_turbo in higgsfield_api.py
        """
        jwt_token = self.get_jwt_token_with_retry()
        url = f"{self.base_url}/jobs/kling"
        
        payload = {
            "params": {
                "input_image": {
                    "type": "media_input",
                    "id": img_id,
                    "url": img_url,
                    "width": width,
                    "height": height
                },
                "input_image_end": input_image_end,
                "width": width,
                "height": height,
                "prompt": prompt,
                "seed": random.randint(1000, 1000000),
                "cfg_scale": 0.5,
                "camera_control": None,
                "duration": duration,
                "model": "kling-v2-5-turbo",
                "resolution": resolution,
                "motion_id": "7077cde8-7947-46d6-aea2-dbf2ff9d441c",
                "enhance_prompt": False,
                "mode": mode,
            },
            "use_unlim": use_unlim
        }
        
        headers = self._get_headers(jwt_token)
        headers['content-type'] = 'application/json'
        
        response = requests.post(url, headers=headers, data=json.dumps(payload), impersonate="chrome")
        self._handle_response(response, "Kling 2.5 Turbo I2V")
        
        data = response.json()
        if 'job_sets' in data and len(data['job_sets']) > 0:
            return data['job_sets'][0]['id']
        return None

    def send_job_kling_o1_i2v(self, prompt: str, duration: int, aspect_ratio: str,
                              img_id: str, img_url: str, width: int, height: int,
                              input_image_end: dict = None,
                              use_unlim: bool = True) -> str:
        """
        Kling O1 I2V - matches send_job_i2v_kling_o1 in higgsfield_api.py
        """
        jwt_token = self.get_jwt_token_with_retry()
        url = f"{self.base_url}/jobs/kling-omni-flf"
        
        payload = {
            "params": {
                "aspect_ratio": aspect_ratio,
                "duration": duration,
                "prompt": prompt,
                "model": "kling-omni-flf",
                "input_image": {
                    "id": img_id,
                    "type": "media_input",
                    "url": img_url
                },
                "input_image_end": input_image_end,
                "height": height,
                "width": width,
                "use_unlim": use_unlim
            },
            "use_unlim": use_unlim
        }
        
        headers = self._get_headers(jwt_token)
        headers['content-type'] = 'application/json'
        
        response = requests.post(url, headers=headers, data=json.dumps(payload), impersonate="chrome")
        self._handle_response(response, "Kling O1 I2V")
        
        data = response.json()
        if 'job_sets' in data and len(data['job_sets']) > 0:
            return data['job_sets'][0]['id']
        return None

    def send_job_kling_2_6_t2v(self, prompt: str, duration: int, aspect_ratio: str,
                               sound: bool = True, use_unlim: bool = True) -> str:
        """
        Kling 2.6 T2V - matches send_job_t2v_kling_2_6 in higgsfield_api.py
        """
        jwt_token = self.get_jwt_token_with_retry()
        url = f"{self.base_url}/jobs/kling2-6"
        
        # Calculate dimensions from aspect ratio
        width, height = self._get_dimensions_from_aspect_ratio(aspect_ratio)
        
        payload = {
            "params": {
                "width": width,
                "height": height,
                "prompt": prompt,
                "duration": duration,
                "aspect_ratio": aspect_ratio,
                "cfg_scale": 0.5,
                "sound": sound,
                "input_image": None,
                "negative_prompt": None,
                "enhance_prompt": False,
                "motion_id": "7077cde8-7947-46d6-aea2-dbf2ff9d441c",
                "use_unlim": use_unlim
            },
            "use_unlim": use_unlim
        }
        
        headers = self._get_headers(jwt_token)
        headers['content-type'] = 'application/json'
        
        response = requests.post(url, headers=headers, data=json.dumps(payload), impersonate="chrome")
        self._handle_response(response, "Kling 2.6 T2V")
        
        data = response.json()
        if 'job_sets' in data and len(data['job_sets']) > 0:
            return data['job_sets'][0]['id']
        return None

    def send_job_kling_2_6_i2v(self, prompt: str, duration: int, sound: bool,
                               img_id: str, img_url: str, width: int, height: int,
                               use_unlim: bool = True) -> str:
        """
        Kling 2.6 I2V - matches send_job_i2v_kling_2_6 in higgsfield_api.py
        """
        jwt_token = self.get_jwt_token_with_retry()
        url = f"{self.base_url}/jobs/kling2-6"
        
        payload = {
            "params": {
                "width": width,
                "height": height,
                "prompt": prompt,
                "duration": duration,
                "cfg_scale": 0.5,
                "sound": sound,
                "input_image": {
                    "type": "media_input",
                    "id": img_id,
                    "url": img_url,
                    "width": width,
                    "height": height
                },
                "negative_prompt": None,
                "enhance_prompt": False,
                "motion_id": "7077cde8-7947-46d6-aea2-dbf2ff9d441c",
                "use_unlim": use_unlim
            },
            "use_unlim": use_unlim
        }
        
        headers = self._get_headers(jwt_token)
        headers['content-type'] = 'application/json'
        
        response = requests.post(url, headers=headers, data=json.dumps(payload), impersonate="chrome")
        self._handle_response(response, "Kling 2.6 I2V")
        
        data = response.json()
        if 'job_sets' in data and len(data['job_sets']) > 0:
            return data['job_sets'][0]['id']
        return None

# Singleton instance for backward compatibility (uses .env credentials)
# For multi-account support, use Higgsfield Client.create_from_account(account_id)
higgsfield_client = HiggsfieldClient.create_default()

