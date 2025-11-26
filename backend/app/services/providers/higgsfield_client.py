import json
import time
import random
import requests
from app.config import settings

class HiggsfieldClient:
    def __init__(self):
        self.sses = settings.HIGGSFIELD_SSES
        self.cookie = settings.HIGGSFIELD_COOKIE
        self.base_url = "https://fnf.higgsfield.ai"
        self.clerk_url = "https://clerk.higgsfield.ai"

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

    def get_jwt_token(self) -> str:
        url = f"{self.clerk_url}/v1/client/sessions/{self.sses}/tokens?__clerk_api_version=2025-11-10&_clerk_js_version=5.109.0"
        payload = 'organization_id='
        headers = self._get_headers()
        headers['content-type'] = 'application/x-www-form-urlencoded'

        response = requests.post(url, headers=headers, data=payload)
        response.raise_for_status()
        
        try:
            data = response.json()
            token = data.get("jwt")
            if not token:
                 raise ValueError("JWT token not found in response")
            return "Bearer " + token
        except (json.JSONDecodeError, ValueError) as e:
            raise Exception(f"Failed to parse JWT response: {e}, Response: {response.text[:200]}")

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

                response = requests.post(url, headers=headers, data={})
                response.raise_for_status()
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

                response = requests.post(url, headers=headers, data=payload)
                response.raise_for_status() # Raise exception for 4xx/5xx
                
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

                response = requests.post(url, headers=headers, data=payload)
                response.raise_for_status()
                
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
            # Force 1024x1024 for T2I
            width = 1024
            height = 1024

        if model == "nano-banana":
            url = f"{self.base_url}/jobs/nano-banana"
            # nano-banana: aspect_ratio supported, resolution NOT supported
            payload = json.dumps({
                "params": {
                    "prompt": prompt,
                    "input_images": input_images,
                    "width": width,
                    "height": height,
                    "batch_size": 1,
                    "aspect_ratio": aspect_ratio,
                    "use_unlim": use_unlim
                },
                "use_unlim": use_unlim
            })
        else:
            # Default to nano-banana-pro (nano-banana-2)
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

        response = requests.post(url, headers=headers, data=payload)
        response.raise_for_status()
        try:
            data = response.json()
            if 'job_sets' in data and len(data['job_sets']) > 0:
                return data['job_sets'][0]['id']
            return None
        except (json.JSONDecodeError, ValueError) as e:
            raise Exception(f"Failed to parse generate response: {e}, Response: {response.text[:200]}")

    def get_job_status(self, job_id: str) -> dict:
        jwt_token = self.get_jwt_token_with_retry()
        url = f"{self.base_url}/job-sets/{job_id}"
        headers = self._get_headers(jwt_token)

        response = requests.get(url, headers=headers)
        try:
            data = response.json()
            first_job = data['jobs'][0]
            status = first_job['status']
            result = None
            
            if status == 'completed':
                result = first_job['results']['raw']['url']
            
            return {"status": status, "result": result}
        except (json.JSONDecodeError, ValueError) as e:
            raise Exception(f"Failed to parse job status response: {e}, Response: {response.text[:200]}")
        except (KeyError, IndexError, TypeError):
            return {"status": "error", "result": None}

higgsfield_client = HiggsfieldClient()
