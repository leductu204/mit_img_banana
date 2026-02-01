"""
Kling AI API Client
Handles direct interaction with Kling AI API for Motion Control generation
Based on working kling_module.py implementation
"""

import os
import time
import requests
import json
import logging
from typing import Optional, Tuple
from io import BytesIO

logger = logging.getLogger(__name__)


class KlingClient:
    """Direct Kling AI API client for Motion Control"""
    
    # Default modal ID for Motion Control (skipping preprocessing)
    DEFAULT_MODAL_ID = 301550469312331
    
    def __init__(self, cookie: str):
        """
        Initialize Kling client with authentication cookie
        
        Args:
            cookie: Kling authentication cookie
        """
        self.cookie = cookie
        self.session = requests.Session()
        self.session.headers.update({
            'accept': 'application/json, text/plain, */*',
            'accept-language': 'en-001',
            'cache-control': 'no-cache',
            'content-type': 'application/json',
            'origin': 'https://app.klingai.com',
            'pragma': 'no-cache',
            'priority': 'u=1, i',
            'referer': 'https://app.klingai.com/',
            'sec-ch-ua': '"Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-site',
            'time-zone': 'Asia/Saigon',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
            'Cookie': cookie
        })
    
    @classmethod
    def create_from_account(cls, account_id: int):
        """
        Create a Kling client from a database account ID.
        
        Args:
            account_id: The account ID from kling_accounts table
            
        Returns:
            KlingClient instance
        """
        from app.repositories.kling_accounts_repo import kling_accounts_repo
        
        account = kling_accounts_repo.get_by_id(account_id)
        if not account:
            raise ValueError(f"Kling account {account_id} not found")
        
        return cls(account['cookie'])
    
    def upload_image_bytes(self, image_data: bytes, file_name: str = "image.png") -> Optional[str]:
        """Upload image from bytes and return URL (with retry)"""
        max_retries = 3
        for attempt in range(max_retries):
            try:
                logger.info(f"Uploading image bytes (Attempt {attempt+1}/{max_retries}): {len(image_data)} bytes")
                
                # Get upload token
                token_url = f"https://klingai.com/api/upload/issue/token?__NS_hxfalcon=HUDR_sFnX-FFuAW5VsfDNK0XOP6snthhLcvIxjxBz8_r61UvYFIc7AGaHwcmlb_Lw36QFxBn0Bj4EKN4Zb24e3VuXscYogNAE2VkjOwO2iSi43de2oR63LL1hZW0okM8dUmYrH6VQSB7Y7ZSTIxoF0X7LUSWUr1pXnbkf6P4o8SqzzdFR6IIMKBvrgRoI4U6ivRMLenA12ccSYtqQsn85UO-V55wKLh87pmyfVY92u_w47ZGGHPcBCYfNb7Y-DUebawDGyFDWBuxlhjysy9UYLytVP-1IMguC-KRgllf55hwhB1hchZjTLMyPuOep7qjJKXKohviYJq9yEr3YRVSrfxkxmUK9OuW87_O0UcJ-v4UxM4S1TdCmv0k843-20iJWvQRlTrCoJ4oP36JUVD1X8bbGP0at7v_41KOxvcre2qiAJdV6eslCZxsCyj6Npn-TJqu9yZZgpP-j1JsrWHg2xYyptJpjmC2e2Ffzva2L_qe7D1TEuJ0k4echK3yD4RKgk7ZZa9W1GZOALWhwt2-21kbMNgczsrZANJxztHEbDpiPR86UxWFzHoN1cUWNcTiC8KvwzS7MWycXZhE66tQ1i48QMwoXBL9qijJI8cxve2vAWxCCQLTSJMkjmKf7Jej1IVD0H-qjH98QN2OAX2MGM6vQIr4ubU4iJy3lu_nqEOdz_ndDpadLakzN7fuCmTsz8aIdPsxeamdL3HW4TsfDS_Ckr0NHfee5kQgXGSJt0fLA8hnlVOU.$HE_6778e0858728bb70d2b72d8c5d953118732d2c2c2c2d5fb480963ca60d99281b351bb72db77a12f6577a12c42c&caver=2&filename={file_name}"
                
                token_response = self.session.get(token_url)
                
                token_data = token_response.json()
                data_obj = token_data.get("data", {})
                token = data_obj.get("token")
                http_endpoints = data_obj.get("httpEndpoints", [])

                if not token:
                    logger.error("No token in response")
                    if attempt < max_retries - 1: continue
                    return None
                
                # Use first endpoint or fallback
                upload_domain = http_endpoints[0] if http_endpoints else "az2-upload.uvfuns.com"
                logger.info(f"Using upload domain: {upload_domain}")

                # Resume upload
                resume_url = f"https://{upload_domain}/api/upload/resume?upload_token={token}"
                resume_response = self.session.get(resume_url)
                if resume_response.status_code != 200:
                    logger.error(f"Resume request failed: HTTP {resume_response.status_code}")
                    if attempt < max_retries - 1: continue
                    return None
                
                resume_data = resume_response.json()
                if resume_data.get("result") != 1:
                    logger.error(f"Resume request failed: {resume_data.get('message', 'Unknown error')}")
                    if attempt < max_retries - 1: continue
                    return None
                
                # Upload fragment
                fragment_url = f"https://{upload_domain}/api/upload/fragment"
                fragment_response = self.session.post(
                    fragment_url,
                    data=image_data,
                    params=dict(upload_token=token, fragment_id=0),
                    headers={"Content-Type": "application/octet-stream"},
                )
                
                if fragment_response.status_code != 200:
                    logger.error(f"Fragment upload failed: HTTP {fragment_response.status_code}")
                    if attempt < max_retries - 1: continue
                    return None
                
                fragment_data = fragment_response.json()
                if fragment_data.get("result") != 1:
                    logger.error(f"Fragment upload failed: {fragment_data.get('message', 'Unknown error')}")
                    if attempt < max_retries - 1: continue
                    return None
                
                # Complete upload
                complete_url = f"https://{upload_domain}/api/upload/complete"
                complete_response = self.session.post(
                    complete_url,
                    params=dict(upload_token=token, fragment_count=1),
                )
                
                if complete_response.status_code != 200:
                    logger.error(f"Complete upload failed: HTTP {complete_response.status_code}")
                    if attempt < max_retries - 1: continue
                    return None
                
                complete_data = complete_response.json()
                if complete_data.get("result") != 1:
                    logger.error(f"Complete upload failed: {complete_data.get('message', 'Unknown error')}")
                    if attempt < max_retries - 1: continue
                    return None
                
                time.sleep(1)
                
                # Get final URL
                verify_url = f"https://klingai.com/api/upload/verify/token?__NS_hxfalcon=HUDR_sFnX-FFuAW5VsfDNK0XOP6snthhLcvIxjxBz8_r61UvYFIc7AGaHwcmlb_Lw36QFxBn0Bj4EKN4Zb24e3VuXscYogNAE2VkjOwO2iSi43de2oR63LL1hZW0okM8dUmYrH6VQSB7Y7ZSTIxoF0X7LUSWUr1pXnbkf6P4o8SqzzdFR6IIMKBvrgRoI4U6ivRMLenA12ccSYtqQsn85UO-V55wKLh87pmyfVY92u_w47ZGGHPcBCYfNb7Y-DUebawDGyFDWBuxlhjysy9UYLytVP-1IMguC-KRgllf55hwhB1hchZjTLMyPuOep7qjJKXKohviYJq9yEr3YRVSrfxkxmUK9OuW87_O0UcJ-v4UxM4S1TdCmv0k843-20iJWvQRlTrCoJ4oP36JUVD1X8bbGP0at7v_41KOxvcre2qiAJdV6eslCZxsCyj6Npn-TJqu9yZZgpP-j1JsrWHg2xYyptJpjmC2e2Ffzva2L_qe7D1TEuJ0k4echK3yD4RKgk7ZZa9W1GZOALWhwt2-21kbMNgczsrZANJxztHEbDpiPR86UxWFzHoN1cUWNcTiC8KvwzS7MWycXZhE66tQ1i48QMwoXBL9qijJI8cxve2vAWxCCQLTSJMkjmKf7Jej1IVD0H-qjH98QN2OAX2MGM6vQIr4ubU4iJy3lu_nqEOdz_ndDpadLakzN7fuCmTsz8aIdPsxeamdL3HW4TsfDS_Ckr0NHfee5kQgXGSJt0fLA8hnlVOU.$HE_6778e0858728bb70d2b72d8c5d953118732d2c2c2c2d5fb480963ca60d99281b351bb72db77a12f6577a12c42c&caver=2&token={token}&type=image"
                verify_response = self.session.get(verify_url)
                
                image_url = verify_response.json().get("data", {}).get("url")
                if not image_url:
                    logger.error("No URL in verify response")
                    if attempt < max_retries - 1: continue
                    return None
                
                logger.info(f"✅ Image uploaded successfully: {image_url[:50]}...")
                return image_url
                
            except Exception as e:
                logger.error(f"Error uploading image (Attempt {attempt+1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    time.sleep(2)
                    continue
                return None
        return None

    def upload_image(self, image_path: str) -> Optional[str]:
        """Upload image from file path and return URL"""
        try:
            if not os.path.exists(image_path):
                logger.error(f"Image file not found: {image_path}")
                return None
            
            logger.info(f"Uploading image: {image_path}")
            
            # Read file and use bytes upload
            with open(image_path, "rb") as f:
                image_data = f.read()
            
            file_name = os.path.basename(image_path)
            return self.upload_image_bytes(image_data, file_name)
            
        except Exception as e:
            logger.error(f"Error uploading image: {e}")
            return None
    
    def upload_video_bytes(self, video_data: bytes, file_name: str = "video.mp4") -> Optional[Tuple[str, str]]:
        """Upload video from bytes and return (video_url, cover_url) (with retry)"""
        max_retries = 3
        for attempt in range(max_retries):
            try:
                logger.info(f"Uploading video bytes (Attempt {attempt+1}/{max_retries}): {len(video_data)} bytes")
                
                # Get upload token
                token_url = f"https://klingai.com/api/upload/issue/token?__NS_hxfalcon=HUDR_sFnX-FFuAW5VsfDNK0XOP6snthhLcvIxjxBz8_r61UvYFIc7AGaHwcmlb_Lw36QFxBn0Bj4EKN4Zb24e3VuXsMYojNEC2VAlN0_LMZHDhJK9nym8Jrx2cnp4iNdoYGECPbgEPyzfyJ_9LRRA2kT4Wi-fsgpPhcwt79cK7Hy9w4ZK644eMCLcihAJ9lm17QsTGX880s53arOcuxc1MeOcg-45Kx4xpyrjTOt_3Mkr_ImHFudSAZ-FJ7Y-DUacbgvXwTT7HftjkXvbvtUJeS55VYcnIluB1M4K-Uv1gmtWclhEjpbde9eMtPWx05vCI3m11uCAQ4dyGrbRAD2MclQ_kSuxM4i3sMrwRdB-v8N3O4y1TZjuv0k84zX-0WgfvkgoTratJ8VA3qdUVEsglNKSEk-4zsj4yb75p6P72qGCI9g2M85afhcA3yOLpxu5Jqu9iIM0wZT7w5YySD0-hZCpsJkqjS3BmUu1uqiM9-7-CFHDsZsspqotKT7H6RWq0vpeYZbzEZSKcmhzsW6xywLLMwA6qMtANJxzyg8XApiPFZwk82JzStdTeEWNK2KC8KvwoUKWSScXFmHyeNQ1-v5zUAoXdswP7kZM8oV6ezSBR1aFRbPbbYwknaDyI-CybFz2Xa6rGNVRe2SKHCUONKGPIr0obEk_YyrgvPCgSvV0sSpBuKwAJF7N--qFxX4qrfsONcZVdzhLvleGWsPrdszg61oOduyxlggaEyYoojpS8hl0x-Y5$HE_edf26a0f0d6ab5515c3da72fb0ebf1cb5aa7a6a6a6a78f3e0a1cb07ad316e366c9953da73df0987cddf0984ea6&caver=2&filename={file_name}"
                token_response = self.session.get(token_url)
                
                if token_response.status_code != 200:
                    logger.error(f"Token request failed: HTTP {token_response.status_code}")
                    if attempt < max_retries - 1: continue
                    return None
                
                token_data = token_response.json()
                if token_data.get("status") != 200:
                    logger.error(f"Token request failed: {token_data.get('message', 'Unknown error')}")
                    if attempt < max_retries - 1: continue
                    return None
                
                data_obj = token_data.get("data", {})
                token = data_obj.get("token")
                http_endpoints = data_obj.get("httpEndpoints", [])
                
                if not token:
                    logger.error("No token in response")
                    if attempt < max_retries - 1: continue
                    return None
                    
                # Use first endpoint or fallback
                upload_domain = http_endpoints[0] if http_endpoints else "az2-upload.uvfuns.com"
                logger.info(f"Using upload domain: {upload_domain}")
                
                # Resume upload
                resume_url = f"https://{upload_domain}/api/upload/resume?upload_token={token}"
                resume_response = self.session.get(resume_url)
                if resume_response.status_code != 200:
                    logger.error(f"Resume request failed: HTTP {resume_response.status_code}")
                    if attempt < max_retries - 1: continue
                    return None
                
                resume_data = resume_response.json()
                if resume_data.get("result") != 1:
                    logger.error(f"Resume request failed: {resume_data.get('message', 'Unknown error')}")
                    if attempt < max_retries - 1: continue
                    return None
                
                # Upload fragment
                fragment_url = f"https://{upload_domain}/api/upload/fragment"
                fragment_response = self.session.post(
                    fragment_url,
                    data=video_data,
                    params=dict(upload_token=token, fragment_id=0),
                    headers={"Content-Type": "application/octet-stream"},
                )
                
                if fragment_response.status_code != 200:
                    logger.error(f"Fragment upload failed: HTTP {fragment_response.status_code}")
                    if attempt < max_retries - 1: continue
                    return None
                
                fragment_data = fragment_response.json()
                if fragment_data.get("result") != 1:
                    logger.error(f"Fragment upload failed: {fragment_data.get('message', 'Unknown error')}")
                    if attempt < max_retries - 1: continue
                    return None
                
                # Complete upload
                complete_url = f"https://{upload_domain}/api/upload/complete"
                complete_response = self.session.post(
                    complete_url,
                    params=dict(upload_token=token, fragment_count=1),
                )
                
                if complete_response.status_code != 200:
                    logger.error(f"Complete upload failed: HTTP {complete_response.status_code}")
                    if attempt < max_retries - 1: continue
                    return None
                
                complete_data = complete_response.json()
                if complete_data.get("result") != 1:
                    logger.error(f"Complete upload failed: {complete_data.get('message', 'Unknown error')}")
                    if attempt < max_retries - 1: continue
                    return None
                
                time.sleep(2)
                
                # Get final URL
                verify_url = f"https://klingai.com/api/upload/verify/video?__NS_hxfalcon=HUDR_sFnX-FFuAW5VsfDNK0XOP6snthhLcvIxjxBz8_r61UvYFIc7AGaHwcmlb_Lw36QFxBn0Bj4EKN4Zb24e3VuXscYogNAE2VkjOwO2iSi43de2oR63LL1hZW0okM8dUmYrH6VQSB7Y7ZSTIxoF0X7LUSWUr1pXnbkf6P4o8SqzzdFR6IIMKBvrgRoI4U6ivRMLenA12ccSYtqQsn85UO-V55wKLh87pmyfVY92u_w47ZGGHPcBCYfNb7Y-DUebawDGyFDWBuxlhjysy9UYLytVP-1IMguC-KRgllf55hwhB1hchZjTLMyPuOep7qjJKXKohviYJq9yEr3YRVSrfxkxmUK9OuW87_O0UcJ-v4UxM4S1TdCmv0k843-20iJWvQRlTrCoJ4oP36JUVD1X8bbGP0at7v_41KOxvcre2qiAJdV6eslCZxsCyj6Npn-TJqu9yZZgpP-j1JsrWHg2xYyptJpjmC2e2Ffzva2L_qe7D1TEuJ0k4echK3yD4RKgk7ZZa9W1GZOALWhwt2-21kbMNgczsrZANJxztHEbDpiPR86UxWFzHoN1cUWNcTiC8KvwzS7MWycXZhE66tQ1i48QMwoXBL9qijJI8cxve2vAWxCCQLTSJMkjmKf7Jej1IVD0H-qjH98QN2OAX2MGM6vQIr4ubU4iJy3lu_nqEOdz_ndDpadLakzN7fuCmTsz8aIdPsxeamdL3HW4TsfDS_Ckr0NHfee5kQgXGSJt0fLA8hnlVOU.$HE_6778e0858728bb70d2b72d8c5d953118732d2c2c2c2d5fb480963ca60d99281b351bb72db77a12f6577a12c42c&caver=2&token={token}&type=video"
                verify_response = self.session.get(verify_url)
                
                if verify_response.status_code != 200:
                    logger.error(f"Verify upload failed: HTTP {verify_response.status_code}")
                    if attempt < max_retries - 1: continue
                    return None
                
                verify_data = verify_response.json()
                if verify_data.get("status") != 200:
                    logger.error(f"Verify upload failed: {verify_data}")
                    if attempt < max_retries - 1: continue
                    return None
                
                video_url = verify_data.get("data", {}).get("resourceUrl")
                video_cover_url = verify_data.get("data", {}).get("coverUrl")
                if not video_url:
                    logger.error("No URL in verify response")
                    if attempt < max_retries - 1: continue
                    return None
                
                logger.info(f"✅ Video uploaded successfully: {video_url}")
                logger.info(f"Video cover url: {video_cover_url}")
                return video_url, video_cover_url
                
            except Exception as e:
                logger.error(f"Error uploading video (Attempt {attempt+1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    time.sleep(2)
                    continue
                return None
        return None

    def upload_video(self, video_path: str) -> Optional[Tuple[str, str]]:
        """Upload video from file path and return (video_url, cover_url)"""
        try:
            if not os.path.exists(video_path):
                logger.error(f"Video file not found: {video_path}")
                return None
            
            logger.info(f"Uploading video: {video_path}")
            
            # Read file and use bytes upload
            with open(video_path, "rb") as f:
                video_data = f.read()
            
            file_name = os.path.basename(video_path)
            return self.upload_video_bytes(video_data, file_name)
            
        except Exception as e:
            logger.error(f"Error uploading video: {e}")
            return None
    
    def preprocess_motion_control(self, video_url: str, video_cover_url: str) -> Optional[Tuple[int, str, str]]:
        """
        Preprocess motion control (get modalId and URLs)
        
        Args:
            video_url: URL of motion video
            video_cover_url: URL of video cover
            
        Returns:
            Tuple of (modal_id, motion_url, cover_url) or None if failed
        """
        try:
            url = "https://api-app-global.klingai.com/api/task/preprocess?__NS_hxfalcon=HUDR_sFnX-FFuAW5VsfDNK0XOP6snthhLcvIxjxBz8_r61UvYFIc7AGaHwcmlb_Lw36QFxBn0Bj4EKN4Zb24e3VuXscYogNAE2VkjOwO2iSi43de2oR63LL1hZW0okM8dUmYrH6VQSB7Y7ZSTIxoF0X7LUSWUr1pXnbkf6P4o8SqzzdFR6IIMKBvrgRoI4U6ivRMLenA12ccSYtqQsn85UO-V55wKLh87pmyfVY92u_w47ZGGHPcBCYfNb7Y-DUebawDGyFDWBuxlhjysy9UYLytVP-1IMguC-KRgllf55hwhB1hchZjTLMyPuOep7qjJKXKohviYJq9yEr3YRVSrfxkxmUK9OuW87_O0UcJ-v4UxM4S1TdCmv0k843-20iJWvQRlTrCoJ4oP36JUVD1X8bbGP0at7v_41KOxvcre2qiAJdV6eslCZxsCyj6Npn-TJqu9yZZgpP-j1JsrWHg2xYyptJpjmC2e2Ffzva2L_qe7D1TEuJ0k4echK3yD4RKgk7ZZa9W1GZOALWhwt2-21kbMNgczsrZANJxztHEbDpiPR84v02FzHoMVcUWNcTiC8KvwzS4bWycXZhEQ6tQ1i48SMwoXBL9qii5M9oYzbjTeBkrDQrbcZMVhmqX1Kua6KxH6X-zvENJbOiiNFmZIPKaFfb0rakg4fm7nufepAK9mtmUcurELbxDf-_yUwiJvtKdXOcZVfTJL0EuyMfTeJNakr0NHfue6kQkcHCBt0djA8hnlVOU.$HE_c4db4326248b18d371148e6d9fd844cdb18e8f8f8f8ed6172335cb5dfa3e3d0b60b8148e14d9b155f4d9b1678f&caver=2"

            payload = {
                "type": "motion_controller_media_info",
                "arguments": [{"name": "addModality", "value": True}],
                "inputs": [{
                    "name": "video",
                    "inputType": "URL",
                    "url": video_url,
                    "cover": video_cover_url
                }]
            }
            
            logger.info(f"Video url: {video_url}")
            logger.info(f"Video cover url: {video_cover_url}")
            
            # Manually converting to json with separators to match minified format
            raw_payload = json.dumps(payload, separators=(',', ':'))
            process_response = self.session.post(url, data=raw_payload, timeout=30)
            
            if process_response.status_code == 200:
                data = process_response.json()
                if data.get("status") == 200 and data.get("result") == 1:
                    res = data.get("data", {}).get("res", {})
                    asset = res.get("modalityAsset", {})
                    
                    modal_id = asset.get("id")
                    resource = asset.get("resource", {})
                    motion_url = resource.get("motionUrl")
                    cover_url = resource.get("coverUrl")
                    
                    if modal_id and motion_url:
                        logger.info(f"✅ Preprocess successful, Modal ID: {modal_id}")
                        return modal_id, motion_url, cover_url
                    else:
                        logger.error(f"Preprocess response missing asset data: {json.dumps(data)}")
                else:
                    logger.error(f"Preprocess failed: {data.get('message', 'Unknown error')}")
            else:
                logger.error(f"Preprocess request failed: HTTP {process_response.status_code}")
                
            return None

        except Exception as e:
            logger.error(f"Error preprocessing motion control: {e}")
            return None
    
    def generate_motion_control(
        self,
        image_url: str,
        video_url: str,
        video_cover_url: str,
        mode: str = "pro"
    ) -> Optional[Tuple[str, Optional[str]]]:
        """
        Generate motion control video
        
        Args:
            image_url: URL of character image
            video_url: URL of motion video  
            video_cover_url: URL of video cover
            modal_id: Modal ID from preprocessing
            mode: Generation mode ('pro' or 'std')
            
        Returns:
            Tuple of (task_id, creative_id) or None if failed
        """
        try:
            url = "https://api-app-global.klingai.com/api/task/submit?__NS_hxfalcon=HUDR_sFnX-FFuAW5VsfDNK0XOP6snthhLcvIxjxBz8_r61UvYFIc7AGaHwcmlb_Lw36QFxBn0Bj4EKN4Zb24e3VuXscYogNAE2VkjOwO2iSi43de2oR63LL1hZW0okM8dUmYrH6VQSB7Y7ZSTIxoF0X7LUSWUr1pXnbkf6P4o8SqzzdFR6IIMKBvrgRoI4U6ivRMLenA12ccSYtqQsn85UO-V55wKLh87pmyfVY92u_w47ZGGHPcBCYfNb7Y-DUebawDGyFDWBuxlhjysy9UYLytVP-1IMguC-KRgllf55hwhB1hchZjTLMyPuOep7qjJKXKohviYJq9yEr3YRVSrfxkxmUK9OuW87_O0V8J-v4UxM4S1TdCmv0k843-20iJWvQRlTrCoJ4oP36JUVD1X8bbGP0at7v_41KOxvcre2qiAJdV6eslCZxsCyj6Npn-TJqu9yZZgpP-j1JsrWHg2xYyptJpjmC2e2Ffzva2L_qe7D1TEuJ0k4echK3yD4RKgk7ZZa9W1GZOALWhwt2-21kbMNgczsrZANJxztHEbDpiPR85pxmFzHoN4cUWNcTiC8KvwzS6XWycXZhFK6tQ1i48QMwoXBL9qii1U65gnenCdHxWJSLObac0i3qL_IO_0IVv3HeqjH98OZTXaRzpKPKmIfes3LxlvYTH-uvroBvFitnNC5akXJE3b-_-e2CIl86AXfc5eaidL0FS6Y7zEK9ukr0NHfee6lgQYHD1t0YLA8hnlVOU.$HE_7f60f89d9f672943cdaf3554c8dfe680fe353434343537ac988e27eb40d690380605af35af620aee4f620adc34&caver=2"

            # Determine price based on mode
            show_price = 800 if mode == "pro" else 500
            
            payload = {
                "type": "m2v_motion_control",
                "inputs": [
                    {
                        "name": "video",
                        "inputType": "URL",
                        "url": video_url,
                        "cover": video_cover_url,
                        "resourceType": "MOTION",
                        "fromModalityAssetId": self.DEFAULT_MODAL_ID
                    },
                    {
                        "name": "image",
                        "inputType": "URL",
                        "url": image_url
                    }
                ],
                "arguments": [
                    {"name": "biz", "value": "klingai"},
                    {"name": "prompt", "value": ""},
                    {"name": "duration", "value": 1},
                    {"name": "imageCount", "value": 1},
                    {"name": "kling_version", "value": "2.6"},
                    {"name": "keep_original_sound", "value": True},
                    {"name": "motion_direction", "value": "motion_direction"},
                    {"name": "model_mode", "value": mode},
                    {"name": "showPrice", "value": show_price}
                ],
                "callbackPayloads": [
                    {"name": "motionFrom", "value": "LIBRARY"}
                ]
            }
            
            logger.info(f"🚀 Submitting motion control task (mode={mode}, price={show_price})...")
            response = self.session.post(url, json=payload, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == 200:
                    task_id = data.get("data", {}).get("task", {}).get("id")
                    # taskWorks is a list, get creativeId from first item
                    task_works = data.get("data", {}).get("taskWorks", [])
                    creative_id = None
                    if task_works and isinstance(task_works, list) and len(task_works) > 0:
                        creative_id = task_works[0].get("id")  # Use "id" field from first work
                    logger.info(f"✅ Motion control task submitted: {task_id}")
                    return (str(task_id), str(creative_id) if creative_id else None)
                else:
                    logger.error(f"Submission failed: {data.get('message', 'Unknown error')}")
            else:
                logger.error(f"Submission request failed: HTTP {response.status_code}")
                
            return None
            
        except Exception as e:
            logger.error(f"Error in generate_motion_control: {e}")
            return None
    
    def check_task_status(self, task_id: str) -> dict:
        """
        Check task status
        
        Args:
            task_id: Task ID to check
            
        Returns:
            Dict with status, work_ids, and result info
        """
        try:
            url = f"https://api-app-global.klingai.com/api/task/status?__NS_hxfalcon=HUDR_sFnX-FFuAW5VsfDNK0XOP6snthhLcvIxjxBz8_r61UvYFIc7AGaHwcmlb_Lw36QFxBn0Bj4EKN4Zb24e3VuXsMYojNEC2VAlN0_LMZHDhJK9nym8Jrx2cnp4iNdoYGECPbgEPyzfyJ_9LRRA2kT4Wi-fsgpPhcwt79cK7Hy9w4ZK644eMCLcihAJ9lm17QsTGX880s53arOcuxc1MeOcg-45Kx4xpyrjTOt_3Mkr_ImHFudSAZ-FJ7Y-DUacbgvXwTT7HftjkXvbvtUJeS55VYcnIluB1M4K-Uv1gmtWclhEjpbde9eMtPWx05vCI3m11uCAQ4dyGrbRAD2MclQ_kSuxM4i3sMrwRch-v8N3O4y1TZjuv0k84zX-0WgfvkgoTjavJ8VA3qxUVesglNKSEk-4zsj4yb75p6P72qGCI9g2M85afhcA3yOLpxu5Jqu9iIM0wab7w5YySD0-hZCpsJkqjS3BmUi1uqiM9-7-CFHDsZsspqotKT7H6RWq0vpeYZbzEZSKcmhzsW6xywLLMwA6qMtANJxzyg8XApiPFZwkfG1zStdTVkWNK2KC8KvwoUKWWCcXFmHyJNQ1-v5zUAoXdswP7kYX8sRtP3eYGBzAQrbcZMUumOf_K-z0KVz9Xq6jH98SP2SKHDlUZfHUIaNxNBVjK2z7sPzqBut-_ndDpac7albRp-6CxTQ0rfsSI4dYdi4D6zWvMPyRUM_m9h4XP-e5nggYHy0qojoO8hl0x-Y5$HE_170890f5f7121521dcc45df278b5180c6c5d5c5c5c5d29c4f0e61d867ab964e19414c45dc70a6286270a62b45c&caver=2&taskId={task_id}"
            
            response = self.session.get(url, timeout=30)
            
            if response.status_code != 200:
                return {"status": "processing", "completed": False}
            
            data = response.json()
            
            # Check outer message for failure (handles both status!=200 and status=200 cases)
            msg = data.get("message", "").lower()
            if "failed" in msg or "sensitive" in msg:
                return {
                    "status": "failed",
                    "completed": True,
                    "error": "Vi phạm NSFW nội dung phản cảm, vui lòng thử lại. Nếu vẫn không được vui lòng dùng ảnh kín đáo hơn"
                }

            if data.get("status") != 200:
                return {"status": "processing", "completed": False}
            
            task_data = data.get("data", {})
            status_code = task_data.get("status")
            
            # Status codes: 10 = processing, 50 = generating, 99 = completed, "failed" = error
            if status_code == 99:
                # Get work IDs - use 'workId' field from each work object
                works = task_data.get("works", [])
                work_ids = [str(work.get("workId")) for work in works if work.get("workId")]
                
                # Download the first video to get CDN URL
                result_url = None
                if work_ids:
                    # 1. Try explicit download first (best quality/cdn)
                    result_url = self.download_video(work_ids[0])
                    
                    # 2. Fallback: Check works array for legacy/direct URL if download failed
                    if not result_url and works:
                        try:
                            work = works[0]
                            resource = work.get("resource", {})
                            # Try known keys - added 'resource' based on logs
                            # Verify value is a string and looks like a URL
                            potential_url = resource.get("resource") or resource.get("url") or resource.get("motionUrl") or resource.get("resource") or work.get("videoUrl")
                            
                            if potential_url and isinstance(potential_url, str) and potential_url.startswith("http"):
                                logger.info(f"⚠️ 'Service busy' or download failed. Using fallback URL: {potential_url}")
                                result_url = potential_url
                            else:
                                logger.warning(f"No fallback URL found. Resource content: {resource}")
                                
                        except Exception as e_fallback:
                            logger.error(f"Error extracting fallback URL: {e_fallback}")
                
                return {
                    "status": "completed",
                    "completed": True,
                    "work_ids": work_ids,
                    "result": result_url
                }
            elif status_code == "failed" or (isinstance(status_code, int) and status_code < 0):
                return {
                    "status": "failed",
                    "completed": True,
                    "error": task_data.get("message", "Task failed")
                }
            else:
                # Check for inner message failure (e.g. status 50 but message says failed)
                inner_msg = task_data.get("message", "").lower()
                if "failed" in inner_msg or "sensitive" in inner_msg:
                     return {
                        "status": "failed",
                        "completed": True,
                        "error": "Vi phạm NSFW nội dung phản cảm, vui lòng thử lại. Nếu vẫn không được vui lòng dùng ảnh kín đáo hơn"
                    }

                return {
                    "status": "processing",
                    "completed": False
                }
                
        except Exception as e:
            logger.error(f"Error checking task status: {e}")
            return {"status": "processing", "completed": False}
    
    def download_video(self, work_id: str) -> Optional[str]:
        """
        Get download URL for completed work
        
        Args:
            work_id: Work ID from completed task
            
        Returns:
            CDN URL for video or None if failed
        """
        try:
            url = f"https://api-app-global.klingai.com/api/works/batch_download_v2?__NS_hxfalcon=HUDR_sFnX-FFuAW5VsfDNK0XOP6snthhLcvIxjxBz8_r61UvYFIc7AGaHwcmlb_Lw36QFxBn0Bj4EKN4Zb24e3VuXsMYojNEC2VAlN0_LMZHDhJK9nym8Jrx2cnp4iNdoYGECPbgEPyzfyJ_9LRRA2kT4Wi-fsgpPhcwt79cK7Hy9w4ZK644eMCLcihAJ9lm17QsTGX880s53arOcuxc1MeOcg-45Kx4xpyrjTOt_3Mkr_ImHFudSAZ-FJ7Y-DUacbgvXwTT7HftjkXvbvtUJeS55VYcnIluB1M4K-Uv1gmtWclhEjpbde9eMtPWx05vCI3m11uCAQ4dyGrbRAD2MclQ_kSuxM4i3sMrwRch-v8N3O4y1TZjuv0k84zX-0WgfvkgoTjavJ8VA3qxUVesglNKSEk-4zsj4yb75p6P72qGCI9g2M85afhcA3yOLpxu5Jqu9iIM0wab7w5YySD0-hZCpsJkqjS3BmUi1uqiM9-7-CFHDsZsspqotKT7H6RWq0vpeYZbzEZSKcmhzsW6xywLLMwA6qMtANJxzyg8XApiPFZwkfG1zStdTVkWNK2KC8KvwoUKWWCcXFmHyJNQ1-v5zUAoXdswP7kYX8sRtP3eYGBzAQrbcZMUumOf_K-z0KVz9Xq6jH98SP2SKHDlUZfHUIaNxNBVjK2z7sPzqBut-_ndDpac7albRp-6CxTQ0rfsSI4dYdi4D6zWvMPyRUM_m9h4XP-e5nggYHy0qojoO8hl0x-Y5$HE_170890f5f7121521dcc45df278b5180c6c5d5c5c5c5d29c4f0e61d867ab964e19414c45dc70a6286270a62b45c&caver=2&workIds={work_id}&fwm=false&fileTypes=MP4&audioTrack=true"
                        
            response = self.session.get(url, timeout=30)
            
            if response.status_code != 200:
                logger.error(f"Download request failed: HTTP {response.status_code}")
                return None
            
            data = response.json()
            
            if data.get("status") != 200:
                logger.error(f"Download failed: {data.get('message')}")
                return None
            
            data_content = data.get("data", {})
            cdn_url = data_content.get("cdnUrl")
            
            if cdn_url:
                logger.info(f"✅ Got download URL: {cdn_url}")
                return cdn_url
            
            # Fallback check for works array (just in case)
            works = data_content.get("works", [])
            if works:
                cdn_url = works[0].get("resource", {}).get("cdnUrl")
                if cdn_url:
                    logger.info(f"✅ Got download URL from works: {cdn_url}")
                    return cdn_url
            
            logger.error(f"No CDN URL in response. Data: {data_content}")
            return None
                
        except Exception as e:
            logger.error(f"Error downloading video: {e}")
            return None


# Global client instance (initialized lazily)
_kling_client: Optional[KlingClient] = None


def get_kling_client() -> Optional[KlingClient]:
    """Get global Kling client instance"""
    global _kling_client
    
    if _kling_client is None:
        # Try to get cookie from environment or database
        from app.repositories.kling_accounts_repo import kling_accounts_repo
        
        try:
            accounts = kling_accounts_repo.list_accounts(active_only=True)
            if accounts:
                # Use highest priority account
                cookie = accounts[0]['cookie']
                _kling_client = KlingClient(cookie)
                logger.info("Initialized Kling client from database account")
        except Exception as e:
            logger.warning(f"Could not initialize Kling client from DB: {e}")
            
            # Fallback to environment
            cookie = os.environ.get("KLING_COOKIE")
            if cookie:
                _kling_client = KlingClient(cookie)
                logger.info("Initialized Kling client from environment")
    
    return _kling_client


# Alias for backward compatibility
kling_client = get_kling_client()
