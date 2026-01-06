# services/providers/google_client.py
"""Google Veo 3.1 video generation client based on veo_api.py implementation."""

import json
import time
import random
import uuid
import base64
import requests
from typing import Optional, Tuple, List
from app.config import settings


class GoogleVeoClient:
    """Client for Google Veo 3.1 video generation API."""
    
    # Available Veo 3.1 models mapped to API model names
    VEO_MODELS = {
        # veo3.1-low: Ultra relaxed variants
        "veo3.1-low": {
            "t2v": "veo_3_1_t2v_fast_ultra_relaxed",
            "t2v_portrait": "veo_3_1_t2v_fast_portrait_ultra_relaxed",
            "i2v": "veo_3_1_i2v_s_fast_ultra_relaxed",
            "i2v_portrait": "veo_3_1_i2v_s_fast_portrait_ultra_relaxed"
        },
        # veo3.1-fast: Fast ultra variants
        "veo3.1-fast": {
            "t2v": "veo_3_1_t2v_fast_ultra",
            "t2v_portrait": "veo_3_1_t2v_fast_portrait_ultra",
            "i2v": "veo_3_1_i2v_s_fast_ultra",
            "i2v_portrait": "veo_3_1_i2v_s_fast_portrait_ultra"
        },
        # veo3.1-high: Standard high quality
        "veo3.1-high": {
            "t2v": "veo_3_1_t2v",
            "t2v_portrait": "veo_3_1_t2v_portrait",
            "i2v": "veo_3_1_i2v_s",
            "i2v_portrait": "veo_3_1_i2v_s_portrait"
        }
    }
    
    # Aspect ratio mappings for Veo API
    ASPECT_RATIOS = {
        "16:9": "VIDEO_ASPECT_RATIO_LANDSCAPE",
        "9:16": "VIDEO_ASPECT_RATIO_PORTRAIT",
    }
    
    # Image upload aspect ratios
    IMAGE_ASPECT_RATIOS = {
        "9:16": "IMAGE_ASPECT_RATIO_PORTRAIT",
        "16:9": "IMAGE_ASPECT_RATIO_LANDSCAPE",
    }

    
    def __init__(self):
        self.cookie = getattr(settings, 'GOOGLE_VEO_COOKIE', '')
        if not self.cookie:
            print("WARNING: GOOGLE_VEO_COOKIE is not set!")
            
        # Current access token
        self._access_token = None
        self._token_expiry = 0
    
    def reload_credentials(self):
        """Reload credentials from .env file (called after admin updates)."""
        from dotenv import load_dotenv
        load_dotenv(override=True)  # Force reload from .env
        import os
        self.cookie = os.getenv("GOOGLE_VEO_COOKIE", "")
        self._access_token = None  # Clear cached token
        self._token_expiry = 0

    def _generate_random_string(self) -> str:
        """Generate a random alphanumeric boundary string."""
        return str(uuid.uuid4())
    
    def _get_common_headers(self, access_token: str, user_agent: Optional[str] = None) -> dict:
        """Get standard headers for API requests matching veo_api.py."""
        headers = {
            'accept': '*/*',
            'accept-language': 'vi,zh-CN;q=0.9,zh;q=0.8,fr-FR;q=0.7,fr;q=0.6,en-US;q=0.5,en;q=0.4,zh-TW;q=0.3',
            'authorization': f'Bearer {access_token}',
            'content-type': 'text/plain;charset=UTF-8',
            'origin': 'https://labs.google',
            'priority': 'u=1, i',
            'referer': 'https://labs.google/'
        }
        
        return headers

    
    def get_jwt_token(self) -> str:
        """Get Access Token from Google using cookie."""
        if not self.cookie:
            raise ValueError("GOOGLE_VEO_COOKIE is missing. Please set it in .env")
            
        # Cache token logic could go here, but for now fetch fresh
        url = "https://labs.google/fx/api/auth/session"
        headers = {
            'accept': '*/*',
            'accept-language': 'vi,zh-CN;q=0.9,zh;q=0.8,fr-FR;q=0.7,fr;q=0.6,en-US;q=0.5,en;q=0.4,zh-TW;q=0.3',
            'content-type': 'application/json',
            'priority': 'u=1, i',
            # 'sec-ch-ua': '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            # 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
            'Cookie': self.cookie
        }
        
        try:
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            token = response.json().get('access_token')
            if not token:
                raise ValueError("No access_token in response")
            return token
        except Exception as e:
            print(f"Error getting auth token: {e}")
            raise ValueError(f"Failed to authenticate: {e}")

    
    def upload_image_bytes(self, image_data: bytes, aspect_ratio: str = "9:16", user_agent: Optional[str] = None) -> str:
        """
        Upload image bytes for I2V generation.
        """
        token = self.get_jwt_token()
        image_base64 = base64.b64encode(image_data).decode('utf-8')
        
        url = "https://aisandbox-pa.googleapis.com/v1:uploadUserImage"
        
        # Determine aspect ratio format for upload
        mapped_ratio = self.IMAGE_ASPECT_RATIOS.get(aspect_ratio, aspect_ratio)
        
        payload_dict = {
            "imageInput": {
                "rawImageBytes": image_base64,
                "mimeType": "image/jpeg",
                "isUserUploaded": True,
                "aspectRatio": mapped_ratio
            },
            "clientContext": {
                "sessionId": f";{int(time.time() * 1000)}",
                "tool": "ASSET_MANAGER"
            }
        }
        
        headers = self._get_common_headers(token, user_agent=user_agent)
        headers['content-type'] = 'application/json'
        
        response = requests.post(url, json=payload_dict, headers=headers)
        response.raise_for_status()
        
        return response.json().get('mediaGenerationId', {}).get('mediaGenerationId')
    
    
    def generate_i2v_video(
        self,
        media_id: str,
        aspect_ratio: str,
        model_name: str,
        prompt: str,
        recaptchaToken: str,
        user_agent: Optional[str] = None
    ) -> Tuple[str, str]:
        """Start I2V video generation."""
        token = self.get_jwt_token()
        url = "https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoStartImage"
        
        mapped_ratio = self.ASPECT_RATIOS.get(aspect_ratio, aspect_ratio)


        requests_list = [{
            "aspectRatio": mapped_ratio,
            "seed": random.randint(1000, 15000),
            "textInput": {
                "prompt": prompt
            },
            "videoModelKey": model_name,
            "startImage": {
                "mediaId": media_id
            },
            "metadata": {
                "sceneId": self._generate_random_string()
            }
        }]
        
        payload = {
            "clientContext": {
                "recaptchaToken": recaptchaToken,
                "sessionId": f";{int(time.time() * 1000)}",
                "projectId": "5d27bce6-e7b7-4a6a-9352-999aa1d43a2d",
                "tool": "PINHOLE",
                "userPaygateTier": "PAYGATE_TIER_TWO"
            },
            "requests": requests_list
        }
        
        headers = self._get_common_headers(token, user_agent=user_agent)
        
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()
        
        # Extract operation name and scene ID
        if "operations" in data and len(data["operations"]) > 0:
            op = data["operations"][0]
            operation_name = op["operation"]["name"]
            scene_id = op["sceneId"]
            return operation_name, scene_id
            
        raise ValueError("No operation returned from API")


    def generate_t2v_video(
        self,
        aspect_ratio: str,
        model_name: str,
        prompt: str,
        recaptchaToken: str,
        user_agent: Optional[str] = None
    ) -> Tuple[str, str]:
        """Start T2V video generation."""
        token = self.get_jwt_token()
        url = "https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoText"
        
        mapped_ratio = self.ASPECT_RATIOS.get(aspect_ratio, aspect_ratio)


        requests_list = [{
            "aspectRatio": mapped_ratio,
            "seed": random.randint(1000, 15000),
            "textInput": {
                "prompt": prompt
            },
            "videoModelKey": model_name,
            "metadata": {
                "sceneId": self._generate_random_string()
            }
        }]
        
        payload = {
            "clientContext": {
                "recaptchaToken": recaptchaToken,
                "sessionId": f";{int(time.time() * 1000)}",
                "projectId": "9d293984-e8a6-4e3c-b911-e31027cce6f1",
                "tool": "PINHOLE",
                "userPaygateTier": "PAYGATE_TIER_TWO"
            },
            "requests": requests_list
        }
        
        headers = self._get_common_headers(token, user_agent=user_agent)
        # specific header from veo_api.py
        headers['accept-language'] = 'en-GB,en-US;q=0.9,en;q=0.8'
        headers['cache-control'] = 'no-cache'
        headers['pragma'] = 'no-cache'
        
        response = requests.post(url, json=payload, headers=headers)
        try:
            response.raise_for_status()
        except requests.exceptions.HTTPError:
            raise Exception(f"Veo T2V API Error {response.status_code}: {response.text}")
        data = response.json()
        
        if "operations" in data and len(data["operations"]) > 0:
            op = data["operations"][0]
            operation_name = op["operation"]["name"]
            scene_id = op["sceneId"]
            return operation_name, scene_id
            
        raise ValueError("No operation returned from API")


    def check_video_status(self, operation_name: str, scene_id: str) -> dict:
        """Check status of video generation."""
        token = self.get_jwt_token()
        url = "https://aisandbox-pa.googleapis.com/v1/video:batchCheckAsyncVideoGenerationStatus"
        
        payload = {
            "operations": [
                {
                    "operation": {
                        "name": operation_name
                    },
                    "sceneId": scene_id,
                    "status": "MEDIA_GENERATION_STATUS_PENDING"
                }
            ]
        }
        
        headers = self._get_common_headers(token)
        
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()
        
        # Parse result using logic from veo_api.py
        result = {"status": "processing", "result": None}
        
        if "operations" in data:
            for op in data["operations"]:
                # Find matching operation if multiple (here we only send one)
                if op["operation"]["name"] == operation_name:
                    status = op.get("status")
                    
                    if status == "MEDIA_GENERATION_STATUS_SUCCESSFUL":
                        result["status"] = "completed"
                        if "metadata" in op["operation"] and "video" in op["operation"]["metadata"]:
                            result["result"] = op["operation"]["metadata"]["video"].get("fifeUrl")
                    elif status in ["MEDIA_GENERATION_STATUS_FAILED", "MEDIA_GENERATION_STATUS_CANCELLED"]:
                        result["status"] = "failed"
                        result["error"] = "Generation failed"
                    else:
                        result["status"] = "processing"
                    
                    break
                    
        return result


    def generate_video(
        self,
        prompt: str,
        recaptchaToken: str,
        model: str = "veo3.1-high",
        aspect_ratio: str = "9:16",
        input_image: dict = None,
        user_agent: Optional[str] = None
    ) -> str:
        """Main dispatcher for video generation."""
        # Allow choosing 1 in 3 modes using short names or full names
        if model in ["low", "fast", "high"]:
            model = f"veo3.1-{model}"

        if model not in self.VEO_MODELS:
            # Fallback to high quality if model name is unknown or invalid
            print(f"DEBUG: Model '{model}' not found, defaulting to veo3.1-high")
            model = "veo3.1-high"
        
        model_variants = self.VEO_MODELS[model]
        is_portrait = aspect_ratio == "9:16"
        
        if input_image:
            # I2V
            if "media_id" not in input_image and "url" in input_image:
                # Download and re-upload
                img_response = requests.get(input_image["url"])
                img_response.raise_for_status()
                media_id = self.upload_image_bytes(img_response.content, aspect_ratio, user_agent=user_agent)
            elif "media_id" in input_image:
                media_id = input_image["media_id"]
            else:
                 # Try uploading using stored ID/URL if we implement that?
                 # For now require URL or media_id
                 raise ValueError("input_image missing url or media_id")
            
            # Select correct model key
            model_name = model_variants["i2v_portrait"] if is_portrait else model_variants["i2v"]
            
            operation_name, scene_id = self.generate_i2v_video(
                media_id=media_id,
                aspect_ratio=aspect_ratio,
                model_name=model_name,
                prompt=prompt,
                recaptchaToken=recaptchaToken,
                user_agent=user_agent
            )
        else:
            # T2V
            # Try to find portrait specific model, fallback to standard t2v
            if is_portrait and "t2v_portrait" in model_variants:
                model_name = model_variants["t2v_portrait"]
            else:
                model_name = model_variants["t2v"]
                
            operation_name, scene_id = self.generate_t2v_video(
                aspect_ratio=aspect_ratio,
                model_name=model_name,
                prompt=prompt,
                recaptchaToken=recaptchaToken,
                user_agent=user_agent
            )
            
        return f"{operation_name}|{scene_id}"

    def get_job_status(self, job_id: str) -> dict:
        parts = job_id.split("|")
        if len(parts) != 2:
            return {"status": "error", "error": "Invalid job_id"}
        return self.check_video_status(parts[0], parts[1])

google_veo_client = GoogleVeoClient()
