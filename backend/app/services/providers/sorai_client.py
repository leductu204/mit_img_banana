import time
import logging
from curl_cffi import requests
from curl_cffi.requests import AsyncSession
from typing import Optional

logger = logging.getLogger(__name__)

class SoraiClient:
    """Client for interacting with sorai.me to download Sora videos."""
    
    BASE_URL = "https://sorai.me"
    
    @staticmethod
    async def get_download_link(post_id: str) -> str:
        """
        Get watermark-free video URL from sorai.me
        
        Args:
            post_id: Post ID from sora.chatgpt.com (e.g. s_12345)
            
        Returns:
            Direct download link
        """
        target_url = "https://sorai.me/get-sora-link"
        share_url = f"https://sora.chatgpt.com/p/{post_id}"
        
        headers = {
            'accept': '*/*',
            'accept-language': 'vi,zh-CN;q=0.9,zh;q=0.8,fr-FR;q=0.7,fr;q=0.6,en-US;q=0.5,en;q=0.4,zh-TW;q=0.3',
            'content-type': 'application/json',
            'origin': 'https://sorai.me',
            'priority': 'u=1, i',
            'referer': 'https://sorai.me/',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        
        json_data = {
            "url": share_url,
            "token": None
        }
        
        try:
            async with AsyncSession(impersonate="chrome120") as session:
                start_time = time.time()
                response = await session.post(
                    target_url,
                    headers=headers,
                    json=json_data,
                    timeout=30
                )
                duration_ms = (time.time() - start_time) * 1000
                
                if response.status_code != 200:
                    logger.error(f"Sorai.me returned {response.status_code}: {response.text}")
                    raise Exception(f"Sorai.me parsed failed: {response.status_code}")
                
                result = response.json()
                download_link = result.get("download_link")
                
                if not download_link:
                    raise Exception("No download_link in sorai.me response")
                
                logger.info(f"Sorai.me success ({duration_ms:.0f}ms): {download_link}")
                return download_link
                
        except Exception as e:
            logger.error(f"Sorai.me request failed: {str(e)}")
            raise

# Singleton instance
sorai_client = SoraiClient()
