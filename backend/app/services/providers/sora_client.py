
import time
import random
import string
import json
import base64
import hashlib
import re
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from typing import Optional, Dict, Any, Tuple
from curl_cffi.requests import AsyncSession
from curl_cffi import CurlMime
from app.services.sora_service import sora_service

# PoW related constants
POW_MAX_ITERATION = 500000
POW_CORES = [8, 16, 24, 32]
POW_SCRIPTS = [
    "https://cdn.oaistatic.com/_next/static/cXh69klOLzS0Gy2joLDRS/_ssgManifest.js?dpl=453ebaec0d44c2decab71692e1bfe39be35a24b3"
]
POW_DPL = ["prod-f501fe933b3edf57aea882da888e1a544df99840"]
POW_NAVIGATOR_KEYS = [
    "registerProtocolHandler−function registerProtocolHandler() { [native code] }",
    "storage−[object StorageManager]",
    "locks−[object LockManager]",
    "appCodeName−Mozilla",
    "permissions−[object Permissions]",
    "webdriver−false",
    "vendor−Google Inc.",
    "mediaDevices−[object MediaDevices]",
    "cookieEnabled−true",
    "product−Gecko",
    "productSub−20030107",
    "hardwareConcurrency−32",
    "onLine−true",
]
POW_DOCUMENT_KEYS = ["_reactListeningo743lnnpvdg", "location"]
POW_WINDOW_KEYS = [
    "0", "window", "self", "document", "name", "location",
    "navigator", "screen", "innerWidth", "innerHeight",
    "localStorage", "sessionStorage", "crypto", "performance",
    "fetch", "setTimeout", "setInterval", "console",
]

class SoraClient:
    CHATGPT_BASE_URL = "https://chatgpt.com"
    BASE_URL = "https://sora.chatgpt.com/backend"
    SENTINEL_FLOW = "sora_2_create_task"

    @staticmethod
    def _get_pow_parse_time() -> str:
        """Generate time string for PoW (EST timezone)"""
        now = datetime.now(timezone(timedelta(hours=-5)))
        return now.strftime("%a %b %d %Y %H:%M:%S") + " GMT-0500 (Eastern Standard Time)"

    @staticmethod
    def _get_pow_config(user_agent: str) -> list:
        """Generate PoW config array with browser fingerprint"""
        return [
            random.choice([1920 + 1080, 2560 + 1440, 1920 + 1200, 2560 + 1600]),
            SoraClient._get_pow_parse_time(),
            4294705152,
            0,  # [3] dynamic
            user_agent,
            random.choice(POW_SCRIPTS) if POW_SCRIPTS else "",
            random.choice(POW_DPL) if POW_DPL else None,
            "en-US",
            "en-US,es-US,en,es",
            0,  # [9] dynamic
            random.choice(POW_NAVIGATOR_KEYS),
            random.choice(POW_DOCUMENT_KEYS),
            random.choice(POW_WINDOW_KEYS),
            time.perf_counter() * 1000,
            str(uuid4()),
            "",
            random.choice(POW_CORES),
            time.time() * 1000 - (time.perf_counter() * 1000),
        ]

    @staticmethod
    def _solve_pow(seed: str, difficulty: str, config_list: list) -> Tuple[str, bool]:
        """Execute PoW calculation using SHA3-512 hash collision"""
        diff_len = len(difficulty) // 2
        seed_encoded = seed.encode()
        target_diff = bytes.fromhex(difficulty)

        static_part1 = (json.dumps(config_list[:3], separators=(',', ':'), ensure_ascii=False)[:-1] + ',').encode()
        static_part2 = (',' + json.dumps(config_list[4:9], separators=(',', ':'), ensure_ascii=False)[1:-1] + ',').encode()
        static_part3 = (',' + json.dumps(config_list[10:], separators=(',', ':'), ensure_ascii=False)[1:]).encode()

        for i in range(POW_MAX_ITERATION):
            dynamic_i = str(i).encode()
            dynamic_j = str(i >> 1).encode()

            final_json = static_part1 + dynamic_i + static_part2 + dynamic_j + static_part3
            b64_encoded = base64.b64encode(final_json)

            hash_value = hashlib.sha3_512(seed_encoded + b64_encoded).digest()

            if hash_value[:diff_len] <= target_diff:
                return b64_encoded.decode(), True

        error_token = "wQ8Lk5FbGpA2NcR9dShT6gYjU7VxZ4D" + base64.b64encode(f'"{seed}"'.encode()).decode()
        return error_token, False

    @staticmethod
    def _get_pow_token(user_agent: str) -> str:
        """Generate initial PoW token"""
        config_list = SoraClient._get_pow_config(user_agent)
        seed = format(random.random())
        difficulty = "0fffff"
        solution, _ = SoraClient._solve_pow(seed, difficulty, config_list)
        return "gAAAAAC" + solution

    @staticmethod
    def _build_sentinel_token(
        flow: str,
        req_id: str,
        pow_token: str,
        resp: Dict[str, Any],
        user_agent: str,
    ) -> str:
        """Build openai-sentinel-token from PoW response"""
        final_pow_token = pow_token

        # Check if PoW is required
        proofofwork = resp.get("proofofwork", {})
        if proofofwork.get("required"):
            seed = proofofwork.get("seed", "")
            difficulty = proofofwork.get("difficulty", "")
            if seed and difficulty:
                config_list = SoraClient._get_pow_config(user_agent)
                solution, success = SoraClient._solve_pow(seed, difficulty, config_list)
                final_pow_token = "gAAAAAB" + solution
        
        token_payload = {
            "p": final_pow_token,
            "t": resp.get("turnstile", {}).get("dx", ""),
            "c": resp.get("token", ""),
            "id": req_id,
            "flow": flow,
        }
        return json.dumps(token_payload, ensure_ascii=False, separators=(",", ":"))

    async def _generate_sentinel_token(self, token: Optional[str] = None) -> str:
        """Generate openai-sentinel-token"""
        req_id = str(uuid4())
        user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        pow_token = self._get_pow_token(user_agent)

        url = f"{self.CHATGPT_BASE_URL}/backend-api/sentinel/req"
        payload = {"p": pow_token, "flow": self.SENTINEL_FLOW, "id": req_id}
        headers = {
            "Accept": "application/json, text/plain, */*",
            "Content-Type": "application/json",
            "Origin": "https://sora.chatgpt.com",
            "Referer": "https://sora.chatgpt.com/",
            "User-Agent": user_agent,
        }
        if token:
            headers["Authorization"] = f"Bearer {token}"

        async with AsyncSession(impersonate="chrome") as session:
            response = await session.post(url, headers=headers, json=payload, timeout=10)
            if response.status_code not in [200, 201]:
                raise Exception(f"Sentinel request failed: {response.status_code}")
            resp = response.json()

        return self._build_sentinel_token(self.SENTINEL_FLOW, req_id, pow_token, resp, user_agent)

    async def _make_request(self, method: str, endpoint: str, token: str, 
                          json_data: Optional[Dict] = None, 
                          multipart: Optional[Any] = None,
                          add_sentinel_token: bool = False) -> Dict[str, Any]:
        
        headers = {
            "Authorization": f"Bearer {token}",
            "User-Agent": "Sora/1.2026.007 (Android 15; 24122RKC7C; build 2600700)"
        }

        if add_sentinel_token:
            headers["openai-sentinel-token"] = await self._generate_sentinel_token(token)

        async with AsyncSession(impersonate="chrome") as session:
            url = f"{self.BASE_URL}{endpoint}"
            kwargs = {
                "headers": headers,
                "timeout": 120
            }
            if json_data:
                kwargs["json"] = json_data
            
            if multipart:
                kwargs["multipart"] = multipart

            if method == "POST":
                response = await session.post(url, **kwargs)
            else:
                response = await session.get(url, **kwargs)

            if response.status_code not in [200, 201]:
                # Log error
                print(f"Request failed: {response.status_code} - {response.text}")
                try:
                    return response.json() # Sometimes error details are in JSON
                except:
                    pass
                raise Exception(f"API request failed: {response.status_code} - {response.text}")

            return response.json()

    async def upload_image(self, image_data: bytes, token: str, filename: str = "image.png") -> str:
        """Upload image and return media_id"""
        # Detect mime type
        mime_type = "image/png"
        if filename.lower().endswith('.jpg') or filename.lower().endswith('.jpeg'):
            mime_type = "image/jpeg"
        elif filename.lower().endswith('.webp'):
            mime_type = "image/webp"

        # Create CurlMime object
        mp = CurlMime()

        # Add file part
        mp.addpart(
            name="file",
            content_type=mime_type,
            filename=filename,
            data=image_data
        )

        # Add file name field
        mp.addpart(
            name="file_name",
            data=filename.encode('utf-8')
        )

        result = await self._make_request("POST", "/uploads", token, multipart=mp)
        return result["id"]

    async def generate_video(self, 
                             prompt: str, 
                             model: str = "sy_8",
                             n_frames: int = 450,
                             orientation: str = "landscape",
                             size: str = "small",
                             media_id: Optional[str] = None,
                             token: Optional[str] = None) -> str:
        """
        Generates a video using an active account.
        Returns the generation ID.
        """
        # 1. Get active token if not provided
        if not token:
            account = sora_service.get_active_token()
            if not account:
                raise Exception("No active Sora account found.")
            token = account['access_token']
        
        inpaint_items = []
        if media_id:
            inpaint_items = [{
                "kind": "upload",
                "upload_id": media_id
            }]

        # 2. Prepare payload
        json_data = {
            "kind": "video",
            "prompt": prompt,
            "orientation": orientation,
            "size": size, # "small" for standard, "large" for HD
            "n_frames": n_frames, 
            "model": model, # "sy_8"
            "inpaint_items": inpaint_items,
            "style_id": None
        }

        # 3. Request
        result = await self._make_request("POST", "/nf/create", token, json_data=json_data, add_sentinel_token=True)
        if "id" not in result:
             raise Exception(f"Sora API Error: {result}")
        return result.get("id")

    async def get_pending_tasks(self, token: str) -> list:
        """Get pending video generation tasks"""
        result = await self._make_request("GET", "/nf/pending/v2", token)
        return result if isinstance(result, list) else []

    async def get_video_drafts(self, token: str, limit: int = 50) -> Dict[str, Any]:
        """Get recent video drafts"""
        return await self._make_request("GET", f"/project_y/profile/drafts?limit={limit}", token)

    async def get_job_status(self, job_id: str, token: str) -> Dict[str, Any]:
        """
        Get job status from Sora API.
        Logic:
        1. Check pending list (/nf/pending/v2). If there, it's processing.
        2. If not pending, check drafts (/project_y/profile/drafts). If there, it's completed/failed.
        """
        try:
            # 1. Check pending
            pending_tasks = await self.get_pending_tasks(token)
            
            for task in pending_tasks:
                if task.get("id") == job_id:
                    # Found in pending
                    status = "processing"
                    progress = task.get("progress_pct", 0)
                    # Sora returns float 0.0-1.0
                    return {
                        "status": "processing",
                        "result": None,
                        "progress": int(progress * 100) if progress else 0
                    }
            
            # 2. Not in pending, check drafts (Completed or Failed)
            # 2. Not in pending, check drafts (Completed or Failed)
            # Retry a few times to handle eventual consistency (Pending -> Drafts transition delay)
            # Increased to 10 attempts (30s) as some jobs take longer to appear
            for attempt in range(10):
                drafts = await self.get_video_drafts(token, limit=60)
                items = drafts.get("items", [])
                
                for item in items:
                    if item.get("task_id") == job_id:
                        # Found in drafts (Success or Content Violation)
                        
                        kind = item.get("kind")
                        reason_str = item.get("reason_str") or item.get("markdown_reason_str")
                        url = item.get("url") or item.get("downloadable_url")
                        
                        if kind == "sora_content_violation" or (reason_str and reason_str.strip()) or not url:
                            return {
                                "status": "failed",
                                "result": None,
                                "error": reason_str or "Content violates guardrails"
                            }
                        
                        return {
                            "status": "completed",
                            "result": url,
                            "raw": item
                        }
                
                # If not found, wait and retry
                if attempt < 9:
                    await asyncio.sleep(3)
            
            # 3. Not found after retries
            return {
                "status": "failed",
                "result": None,
                "error": "Job not found in pending or recent drafts."
            }

        except Exception as e:
            raise e

    async def post_video_for_watermark_free(self, generation_id: str, prompt: str, token: str) -> str:
        """Post video to get watermark-free version
        
        Returns:
            Post ID (e.g., s_690ce161c2488191a3476e9969911522)
        """
        json_data = {
            "attachments_to_create": [
                {
                    "generation_id": generation_id,
                    "kind": "sora"
                }
            ],
            "post_text": ""
        }

        # Request with sentinel token
        result = await self._make_request("POST", "/project_y/post", token, json_data=json_data, add_sentinel_token=True)

        # Return post.id
        return result.get("post", {}).get("id", "")

    async def delete_post(self, post_id: str, token: str) -> bool:
        """Delete a published post"""
        # Note: Using direct request as _make_request handles headers/sentinel
        # But this is a DELETE. _make_request supports DELETE? No, let's update _make_request or just implement here.
        # _make_request only supports GET/POST.
        
        headers = {
            "Authorization": f"Bearer {token}",
            "User-Agent": "Sora/1.2026.007 (Android 15; 24122RKC7C; build 2600700)"
        }
        
        async with AsyncSession(impersonate="chrome") as session:
             url = f"{self.BASE_URL}/project_y/post/{post_id}"
             response = await session.delete(url, headers=headers, timeout=30)
             return response.status_code in [200, 204]

sora_client_instance = SoraClient()
