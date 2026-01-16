# services/providers/google_client.py
"""Google Veo 3.1 video generation client based on veo_api.py implementation."""

import json
import time
import random
import uuid
import base64
import requests
from typing import Optional, Tuple, List
import io
from PIL import Image
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
    # veo3.1-high: Standard high quality
        "veo3.1-high": {
            "t2v": "veo_3_1_t2v",
            "t2v_portrait": "veo_3_1_t2v_portrait",
            "i2v": "veo_3_1_i2v_s",
            "i2v_portrait": "veo_3_1_i2v_s_portrait"
        }
    }

    # Image Generation Models
    IMAGE_MODELS = {
        "nano-banana-cheap": { # Nano Banana Cheap
            "model_name": "GEM_PIX", # Gemini 2.5 Flash
        },
        "nano-banana-pro-cheap": { # Nano Banana Pro Cheap
            "model_name": "GEM_PIX_2", # Gemini 3.0 Pro
        },
        "image-4.0": {
            "model_name": "IMAGEN_3_5",
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
            
        # Proxy settings
        self.proxy_enabled = getattr(settings, 'PROXY_ENABLED', False)
        self.proxy_url = getattr(settings, 'PROXY_URL', '')
        self._proxies = self._get_proxies()
            
        # Current access token
        # Current access token & project
        self._access_token = None
        self._token_expiry = 0
        self._project_id = None # Dynamic project ID

    def _get_valid_aspect_ratio(self, aspect_ratio: str, is_image: bool = False) -> str:
        """Helper to ensure correct aspect ratio format."""
        # Clean input
        ar_clean = aspect_ratio.strip().upper()
        
        # If it's already a valid key in ASPECT_RATIOS, map it
        if aspect_ratio in self.ASPECT_RATIOS:
            ratio_name = self.ASPECT_RATIOS[aspect_ratio]
        elif ar_clean.startswith("VIDEO_ASPECT_RATIO_") or ar_clean.startswith("IMAGE_ASPECT_RATIO_"):
            ratio_name = ar_clean
        else:
            # Fallback default
            ratio_name = "VIDEO_ASPECT_RATIO_PORTRAIT" if aspect_ratio == "9:16" else "VIDEO_ASPECT_RATIO_LANDSCAPE"
        
        # Cross conversion if needed
        if is_image and "VIDEO_" in ratio_name:
            ratio_name = ratio_name.replace("VIDEO_", "IMAGE_")
        elif not is_image and "IMAGE_" in ratio_name:
            ratio_name = ratio_name.replace("IMAGE_", "VIDEO_")
            
        return ratio_name
    
    def _get_proxies(self) -> dict:
        """Get proxies dict for requests library. Supports multiple formats."""
        if not (self.proxy_enabled and self.proxy_url):
            return {}

        url = self.proxy_url.strip()
        
        # Determine protocol (default to socks5 if not specified)
        is_http = url.startswith('http://')
        
        # Handle "socks5://host:port:user:pass", "http://host:port:user:pass" or raw "host:port:user:pass"
        clean_url = url.replace('socks5://', '').replace('http://', '')
        parts = clean_url.split(':')
        
        if len(parts) == 4:
            # Format is host:port:user:pass
            h, p, u, pw = parts
            protocol = "http" if is_http else "socks5h"
            final_url = f"{protocol}://{u}:{pw}@{h}:{p}"
        elif '@' not in url and url.count(':') >= 2:
            # Maybe it's just host:port:user:pass without protocol
            # We already handled this above, but for safety:
            final_url = url # fallback
        else:
            # Standard format like socks5://user:pass@host:port
            final_url = url
            if final_url.startswith('socks5://'):
                final_url = final_url.replace('socks5://', 'socks5h://', 1)
        
        return {"http": final_url, "https": final_url}
    
    def reload_credentials(self):
        """Reload credentials from .env file (called after admin updates)."""
        from dotenv import load_dotenv
        load_dotenv(override=True)  # Force reload from .env
        import os
        self.cookie = os.getenv("GOOGLE_VEO_COOKIE", "")
        self.proxy_enabled = os.getenv("PROXY_ENABLED", "false").lower() == "true"
        self.proxy_url = os.getenv("PROXY_URL", "")
        self._proxies = self._get_proxies()
        self._access_token = None  # Clear cached token
        self._token_expiry = 0
        print(f"[GoogleVeoClient] Credentials reloaded. Proxy: {'enabled' if self.proxy_enabled else 'disabled'}")

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
            response = requests.get(url, headers=headers, proxies=self._proxies)
            response.raise_for_status()
            token = response.json().get('access_token')
            if not token:
                raise ValueError("No access_token in response")
            return token
        except Exception as e:
            error_details = str(e)
            if hasattr(e, 'response') and e.response is not None:
                error_details += f"\nResponse Text: {e.response.text}"
            
            print(f"Error getting auth token: {error_details}")
            raise ValueError(f"Failed to authenticate: {error_details}")

    def create_project(self, title: str = "T2V_Generation") -> str:
        """Create a new project dynamically to isolate tasks."""
        if not self.cookie:
             raise ValueError("GOOGLE_VEO_COOKIE is missing.")

        url = "https://labs.google/fx/api/trpc/project.createProject"
        
        # Use full cookie for authentication (ST token is inside the cookie)
        headers = {
            'accept': '*/*',
            'content-type': 'application/json',
            'origin': 'https://labs.google',
            'referer': 'https://labs.google/fx/tools/flow',
            'Cookie': self.cookie
        }
        
        payload = {
            "json": {
                "projectTitle": title,
                "toolName": "PINHOLE"
            }
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers, proxies=self._proxies)
            response.raise_for_status()
            data = response.json()
            # Path: result -> data -> json -> result -> projectId
            project_id = data["result"]["data"]["json"]["result"]["projectId"]
            print(f"[GoogleVeoClient] Created new Project ID: {project_id}")
            self._project_id = project_id
            return project_id
        except Exception as e:
            print(f"[GoogleVeoClient] Failed to create project: {e}")
            # Fallback to a hardcoded one if specific dynamic failure occurs, or re-raise?
            # User wants Project Management logic, so we should rely on it.
            # But for robustness, maybe just raise.
            raise ValueError(f"Failed to create project: {e}")


    
    def upload_image_bytes(self, image_data: bytes, aspect_ratio: str = "9:16", mime_type: str = "image/jpeg", user_agent: Optional[str] = None) -> str:
        """
        Upload image bytes for I2V generation. Corresponds to `flow_client.upload_image`.
        Always converts to JPEG to match flow_client hardcoded behavior and ensure compatibility.
        """
        token = self.get_jwt_token()
        
        # Convert to JPEG (standardize input)
        try:
            image = Image.open(io.BytesIO(image_data))
            if image.mode in ('RGBA', 'P'):
                image = image.convert('RGB')
                
            output_buffer = io.BytesIO()
            image.save(output_buffer, format='JPEG', quality=95)
            jpeg_data = output_buffer.getvalue()
            
            # Use the verified JPEG data
            image_base64 = base64.b64encode(jpeg_data).decode('utf-8')
            final_mime_type = "image/jpeg" 
            
        except Exception as e:
            print(f"[GoogleVeoClient] Image check/conversion failed: {e}. Falling back to original data.")
            # Fallback (e.g. if PIL fails or not installed? though we imported it)
            image_base64 = base64.b64encode(image_data).decode('utf-8')
            final_mime_type = mime_type

        url = "https://aisandbox-pa.googleapis.com/v1:uploadUserImage"
        
        # Determine aspect ratio format for upload
        mapped_ratio = self.IMAGE_ASPECT_RATIOS.get(aspect_ratio, aspect_ratio)
        
        payload_dict = {
            "imageInput": {
                "rawImageBytes": image_base64,
                "mimeType": final_mime_type, # Always JPEG if conversion succeeded
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
        
        print(f"[GoogleVeoClient] Uploading image. Original Size: {len(image_data)}, Final Mime: {final_mime_type}, Ratio: {mapped_ratio}")
        response = requests.post(url, json=payload_dict, headers=headers, proxies=self._proxies)
        
        if response.status_code != 200:
            print(f"[GoogleVeoClient] Upload FAILED: {response.status_code} - {response.text}")
            
        response.raise_for_status()
        
        return response.json().get('mediaGenerationId', {}).get('mediaGenerationId')
    
    
    def generate_video_start_end(
        self,
        project_id: str,
        aspect_ratio: str,
        model_name: str,
        prompt: str,
        recaptchaToken: str,
        start_media_id: str = None,
        end_media_id: str = None,
        user_agent: Optional[str] = None
    ) -> Tuple[str, str]:
        """
        Generate I2V video using Start and/or End frames.
        Endpoint: .../video:batchAsyncGenerateVideoStartAndEndImage
        """
        token = self.get_jwt_token()
        url = "https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoStartAndEndImage"
        
        mapped_ratio = self._get_valid_aspect_ratio(aspect_ratio, is_image=False)
        scene_id = self._generate_random_string()

        request_payload = {
            "aspectRatio": mapped_ratio,
            "seed": random.randint(1000, 15000),
            "textInput": {
                "prompt": prompt
            },
            "videoModelKey": model_name,
            "metadata": {
                "sceneId": scene_id
            }
        }
        
        if start_media_id:
            request_payload["startImage"] = {"mediaId": start_media_id}
        if end_media_id:
            request_payload["endImage"] = {"mediaId": end_media_id}

        requests_list = [request_payload]
        
        payload = {
            "clientContext": {
                "recaptchaToken": recaptchaToken,
                "sessionId": f";{int(time.time() * 1000)}",
                "projectId": project_id,
                "tool": "PINHOLE",
                "userPaygateTier": "PAYGATE_TIER_ONE" # Made configurable/default to ONE to be safe
            },
            "requests": requests_list
        }
        
        headers = self._get_common_headers(token, user_agent=user_agent)
        
        try:
            response = requests.post(url, json=payload, headers=headers, proxies=self._proxies)
            response.raise_for_status()
            data = response.json()
            
            if "operations" in data and len(data["operations"]) > 0:
                op = data["operations"][0]
                operation_name = op["operation"]["name"]
                scene_id = op.get("sceneId", scene_id)
                return operation_name, scene_id
                
            raise ValueError(f"No operation returned. Response: {data}")
        except Exception as e:
             raise ValueError(f"I2V Generation failed: {e}")


    def generate_t2v_video(
        self,
        project_id: str,
        aspect_ratio: str,
        model_name: str,
        prompt: str,
        recaptchaToken: str,
        user_agent: Optional[str] = None
    ) -> Tuple[str, str]:
        """Start T2V video generation."""
        token = self.get_jwt_token()
        url = "https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoText"
        
        mapped_ratio = self._get_valid_aspect_ratio(aspect_ratio, is_image=False)


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
                "projectId": project_id,
                "tool": "PINHOLE",
                "userPaygateTier": "PAYGATE_TIER_ONE"
            },
            "requests": requests_list
        }
        
        headers = self._get_common_headers(token, user_agent=user_agent)
        # specific header from veo_api.py
        headers['accept-language'] = 'en-GB,en-US;q=0.9,en;q=0.8'
        headers['cache-control'] = 'no-cache'
        headers['pragma'] = 'no-cache'
        
        response = requests.post(url, json=payload, headers=headers, proxies=self._proxies)
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
        
        response = requests.post(url, json=payload, headers=headers, proxies=self._proxies)
        
        if response.status_code != 200:
             try:
                 with open("backend/test_results.txt", "a", encoding="utf-8") as f:
                     f.write(f"\n--- DEBUG ERROR ---\n")
                     f.write(f"Status: {response.status_code}\n")
                     f.write(f"Headers: {response.headers}\n")
                     f.write(f"Text: {response.text}\n")
                     f.write(f"-------------------\n")
             except Exception as write_err:
                 print(f"Failed to write debug log: {write_err}")

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


    def generate_image(
        self,
        prompt: str,
        recaptchaToken: str,
        model: str = "nano-banana-cheap",
        aspect_ratio: str = "9:16",
        input_images: List[dict] = None,
        user_agent: Optional[str] = None
    ) -> str:
        """
        Generate static image (T2I).
        Returns the URL of the generated image.
        """
        # 1. Project Management
        if not self._project_id:
            self._project_id = self.create_project(title="Image_Generation")
        
        project_id = self._project_id

        # 2. Model Selection
        if model not in self.IMAGE_MODELS:
            print(f"DEBUG: Image Model '{model}' not found, defaulting to nano-banana-cheap")
            model = "nano-banana-cheap"
        
        model_config = self.IMAGE_MODELS[model]
        model_name = model_config["model_name"]
        
        token = self.get_jwt_token()
        # Note: Endpoint includes the project_id in the URL
        url = f"https://aisandbox-pa.googleapis.com/v1/projects/{project_id}/flowMedia:batchGenerateImages"
        
        mapped_ratio = self._get_valid_aspect_ratio(aspect_ratio, is_image=True)
        
        # Process Input Images
        processed_inputs = []
        if input_images:
            for img in input_images:
                # Expecting img to have 'id' (Media ID)
                if "id" in img and img["id"]:
                    processed_inputs.append({
                        "name": img["id"],
                        "imageInputType": "IMAGE_INPUT_TYPE_REFERENCE"
                    })
                # If only URL is present and not ID, we might need to upload?
                # For now assume ID is provided via the google upload endpoint.

        request_data = {
            "clientContext": {
                "recaptchaToken": recaptchaToken,
                "projectId": project_id,
                "sessionId": f";{int(time.time() * 1000)}",
                "tool": "PINHOLE"
            },
            "seed": random.randint(1, 99999),
            "imageModelName": model_name,
            "imageAspectRatio": mapped_ratio,
            "prompt": prompt,
            "imageInputs": processed_inputs
        }

        payload = {
            "clientContext": {
                "recaptchaToken": recaptchaToken,
                "sessionId": f";{int(time.time() * 1000)}"
            },
            "requests": [request_data]
        }
        
        headers = self._get_common_headers(token, user_agent=user_agent)
        
        try:
            response = requests.post(url, json=payload, headers=headers, proxies=self._proxies)
            response.raise_for_status()
            data = response.json()
            
            # Extract Image URL
            # Path: media -> [0] -> image -> generatedImage -> fifeUrl
            media = data.get("media", [])
            if media and len(media) > 0:
                image_url = media[0]["image"]["generatedImage"]["fifeUrl"]
                return f"image|{image_url}" # Prefix to indicate image result type for higher level handlers
            
            print(f"DEBUG: Image Gen Response: {data}")
            raise ValueError(f"No media returned. Response: {data}")

        except Exception as e:
            raise ValueError(f"Image Generation failed: {e}")

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
        
        # Check if this is an image generation model
        if model in self.IMAGE_MODELS:
            return self.generate_image(prompt, recaptchaToken, model, aspect_ratio, user_agent)

        # 1. Ensure Project ID exists
        if not self._project_id:
            try:
                self._project_id = self.create_project(title="Video_Generation")
            except Exception as e:
                print(f"[Warning] Project creation failed: {e}. Trying to proceed...")
                # If project creation fails, we might not have a fallback if endpoint requires it.
                # But let's let the call fail naturally or define a fallback ID if known.
                pass
        
        project_id = self._project_id
        if not project_id:
             raise ValueError("Project ID could not be created or determined.")

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
            # I2V with Start and/or End frame
            start_media_id = None
            end_media_id = None

            # Check if input_image is actually a list (End frame support)
            # The interface `input_image: dict` is singular in signature, 
            # but user might pass a dict containing multiple keys or a list wrapper?
            # Let's support the existing signature where `input_image` contains keys for 'url'/'media_id'
            # PLUS support 'end_image' key if we want.
            
            # Logic: If input_image has "start_image" and "end_image" keys, use them.
            # Else fallback to standard single image logic.
            
            if "start_image" in input_image:
                 # Complex dictionary input
                 start_info = input_image.get("start_image", {})
                 end_info = input_image.get("end_image", {})
                 
                 if "url" in start_info:
                     r = requests.get(start_info["url"])
                     r.raise_for_status()
                     start_media_id = self.upload_image_bytes(r.content, aspect_ratio, user_agent)
                 elif "media_id" in start_info:
                     start_media_id = start_info["media_id"]

                 if "url" in end_info:
                     r = requests.get(end_info["url"])
                     r.raise_for_status()
                     end_media_id = self.upload_image_bytes(r.content, aspect_ratio, user_agent)
                 elif "media_id" in end_info:
                     end_media_id = end_info["media_id"]

            else:
                # Classic single image input
                if "media_id" not in input_image and "url" in input_image:
                    img_response = requests.get(input_image["url"])
                    img_response.raise_for_status()
                    start_media_id = self.upload_image_bytes(img_response.content, aspect_ratio, user_agent=user_agent)
                elif "media_id" in input_image:
                    start_media_id = input_image["media_id"]
                
                # Check for optional end_image nested or flat? 
                # Let's keep it simple for now, classic input = start frame only.
            
            if not start_media_id:
                 raise ValueError("Start image missing url or media_id")
            
            # Select correct model key
            model_name = model_variants["i2v_portrait"] if is_portrait else model_variants["i2v"]
            
            operation_name, scene_id = self.generate_video_start_end(
                project_id=project_id,
                aspect_ratio=aspect_ratio,
                model_name=model_name,
                prompt=prompt,
                recaptchaToken=recaptchaToken,
                start_media_id=start_media_id,
                end_media_id=end_media_id,
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
                project_id=project_id,
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
