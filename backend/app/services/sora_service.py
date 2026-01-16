import datetime
from datetime import datetime
import time
import jwt
from typing import Optional, List, Dict
from app.database.db import execute, fetch_all, fetch_one, execute_returning_id
from curl_cffi.requests import AsyncSession

class SoraService:
    @staticmethod
    async def convert_st_to_at(session_token: str) -> dict:
        headers = {
            "Cookie": f"__Secure-next-auth.session-token={session_token}",
            "Accept": "application/json",
            "Origin": "https://sora.chatgpt.com",
            "Referer": "https://sora.chatgpt.com/"
        }
        
        async with AsyncSession(impersonate="chrome") as session:
            try:
                response = await session.get(
                    "https://sora.chatgpt.com/api/auth/session",
                    headers=headers,
                    timeout=30
                )
                
                if response.status_code != 200:
                    raise ValueError(f"Failed to convert ST: {response.status_code}")
                
                data = response.json()
                if not data or not data.get("accessToken"):
                     raise ValueError("Invalid session response or no accessToken")
                
                return {
                    "access_token": data.get("accessToken"),
                    "email": data.get("user", {}).get("email"),
                    "expires": data.get("expires")
                }
            except Exception as e:
                raise ValueError(f"ST Conversion failed: {str(e)}")

    @staticmethod
    async def convert_rt_to_at(refresh_token: str) -> dict:
        client_id = "app_LlGpXReQgckcGGUo2JrYvtJK"
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
        json_data = {
            "client_id": client_id,
            "grant_type": "refresh_token",
            "redirect_uri": "com.openai.chat://auth0.openai.com/ios/com.openai.chat/callback",
            "refresh_token": refresh_token
        }
        
        async with AsyncSession(impersonate="chrome") as session:
            try:
                response = await session.post(
                    "https://auth.openai.com/oauth/token",
                    headers=headers,
                    json=json_data,
                    timeout=30
                )
                
                if response.status_code != 200:
                    raise ValueError(f"Failed to convert RT: {response.status_code} - {response.text}")
                
                data = response.json()
                return {
                    "access_token": data.get("access_token"),
                    "refresh_token": data.get("refresh_token"),
                    "expires_in": data.get("expires_in")
                }
            except Exception as e:
                raise ValueError(f"RT Conversion failed: {str(e)}")

    @staticmethod
    async def refresh_token(account_id: int) -> dict:
        """
        Refresh token using RT stored in database and update database.
        """
        account = fetch_one("SELECT * FROM sora_accounts WHERE id = ?", (account_id,))
        if not account or not account.get('refresh_token'):
            raise ValueError("Account not found or no refresh token")
            
        try:
            result = await SoraService.convert_rt_to_at(account['refresh_token'])
            
            # Update DB
            updates = {
                "access_token": result['access_token'],
                "expiration_time": int(time.time()) + result['expires_in']
            }
            if result.get('refresh_token'):
                updates['refresh_token'] = result['refresh_token']
                
            SoraService.update_account(account_id, updates)
            
            return fetch_one("SELECT * FROM sora_accounts WHERE id = ?", (account_id,))
        except Exception as e:
            execute("UPDATE sora_accounts SET is_active = 0, remark = ? WHERE id = ?", (f"Refresh failed: {str(e)}", account_id))
            raise e

    @staticmethod
    def decode_jwt(token: str) -> dict:
        try:
            return jwt.decode(token, options={"verify_signature": False})
        except Exception as e:
            raise ValueError(f"Invalid JWT: {str(e)}")

    @staticmethod
    def add_account(token: str, session_token: str = None, refresh_token: str = None, remark: str = None, 
                   proxy_url: str = None, client_id: str = None, name: str = None,
                   image_concurrency: int = -1, video_concurrency: int = -1) -> int:
        decoded = SoraService.decode_jwt(token)
        # OpenAI JWT structure usually has email in profile claim
        profile = decoded.get('https://api.openai.com/profile', {})
        email = profile.get('email')
        exp = decoded.get('exp')
        
        if not email:
            # Try finding email in other claims or generate a placeholder
            email = decoded.get('email') or f"unknown_{int(time.time())}"
        
        # Check if exists
        existing = fetch_one("SELECT id FROM sora_accounts WHERE email = ?", (email,))
        if existing:
            # Update
            execute("""
                UPDATE sora_accounts 
                SET access_token = ?, session_token = ?, refresh_token = ?, 
                    expiration_time = ?, updated_at = CURRENT_TIMESTAMP, is_active = 1, remark = ?,
                    proxy_url = ?, client_id = ?, name = ?, image_concurrency = ?, video_concurrency = ?
                WHERE email = ?
            """, (token, session_token, refresh_token, exp, remark, proxy_url, client_id, name, image_concurrency, video_concurrency, email))
            return existing['id']
        else:
            return execute_returning_id("""
                INSERT INTO sora_accounts (
                    email, access_token, session_token, refresh_token, expiration_time, remark,
                    proxy_url, client_id, name, image_concurrency, video_concurrency
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (email, token, session_token, refresh_token, exp, remark, proxy_url, client_id, name, image_concurrency, video_concurrency))

    @staticmethod
    def get_accounts() -> List[Dict]:
        return fetch_all("SELECT * FROM sora_accounts ORDER BY created_at DESC")
    
    @staticmethod
    def update_account(account_id: int, data: dict) -> None:
        # Generic update
        set_clause = ", ".join([f"{k} = ?" for k in data.keys()])
        values = list(data.values())
        values.append(account_id)
        execute(f"UPDATE sora_accounts SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?", tuple(values))

    @staticmethod
    def delete_account(account_id: int) -> None:
        execute("DELETE FROM sora_accounts WHERE id = ?", (account_id,))

    @staticmethod
    async def get_sora_client_session(proxy_url: str = None) -> AsyncSession:
        return AsyncSession(impersonate="chrome", proxy=proxy_url)

    @staticmethod
    async def test_token(account_id: int) -> dict:
        """
        Test token validity and update account stats (subscription, sora2 usage, etc.)
        Mimics logic from sora2api token_manager.py
        """
        account = fetch_one("SELECT * FROM sora_accounts WHERE id = ?", (account_id,))
        if not account:
            raise ValueError("Account not found")
            
        token = account['access_token']
        # Convert simple proxy string to full URL if needed, or just pass as is
        proxy = account['proxy_url'] 

        updates = {}
        
        async with await SoraService.get_sora_client_session(proxy) as session:
            # 1. Get User Info
            try:
                resp = await session.get(
                    "https://sora.chatgpt.com/me",
                    headers={"Authorization": f"Bearer {token}"}
                )
                if resp.status_code == 401:
                     # Check if token invalidated
                     data = resp.json()
                     if data.get('error', {}).get('code') == 'token_invalidated':
                         updates['is_active'] = 0
                         updates['remark'] = "Token invalidated"
            except Exception as e:
                print(f"Error checking /me: {e}")

            # 2. Get Subscription Info
            try:
                resp = await session.get(
                    "https://sora.chatgpt.com/backend/billing/subscriptions",
                    headers={"Authorization": f"Bearer {token}"}
                )
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("data"):
                        sub = data["data"][0]
                        updates['plan_type'] = sub.get("plan", {}).get("id")
                        updates['plan_title'] = sub.get("plan", {}).get("title")
                        updates['subscription_end'] = sub.get("end_ts")
            except Exception as e:
                print(f"Error checking subscriptions: {e}")

            # 3. Get Sora 2 Stats (Remaining Count)
            try:
                resp = await session.get(
                    "https://sora.chatgpt.com/backend/nf/check",
                    headers={
                        "Authorization": f"Bearer {token}",
                         "User-Agent": "Sora/1.2026.007 (Android 15; 24122RKC7C; build 2600700)"
                    }
                )
                if resp.status_code == 200:
                    data = resp.json()
                    rate_info = data.get("rate_limit_and_credit_balance", {})
                    updates['sora2_remaining_count'] = rate_info.get("estimated_num_videos_remaining", 0)
                    updates['sora2_cooldown_until'] = datetime.now().timestamp() + rate_info.get("access_resets_in_seconds", 0) if rate_info.get("access_resets_in_seconds") else None
            except Exception as e:
                print(f"Error checking Sora2 stats: {e}")

            # 4. Get Sora 2 Invite/Support Status
            try:
                resp = await session.get(
                    "https://sora.chatgpt.com/backend/project_y/invite/mine",
                    headers={"Authorization": f"Bearer {token}"}
                )
                if resp.status_code == 200:
                    data = resp.json()
                    updates['sora2_supported'] = True
                    updates['sora2_invite_code'] = data.get("invite_code")
                    updates['sora2_redeemed_count'] = data.get("redeemed_count", 0)
                    updates['sora2_total_count'] = data.get("total_count", 0)
                elif resp.status_code == 401:
                    # Try to bootstrap if unauthorized for project_y (likely not active)
                    # For now just mark unsupported
                    updates['sora2_supported'] = False
            except Exception as e:
                 print(f"Error checking request invite: {e}")
        
        # Update DB
        if updates:
            SoraService.update_account(account_id, updates)
            
        # Return updated account
        return fetch_one("SELECT * FROM sora_accounts WHERE id = ?", (account_id,))

    @staticmethod
    def get_active_token() -> Optional[Dict]:
        """
        Get logic:
        1. Active accounts
        2. Not expired (expiration_time)
        3. Determine if we should filter by sora2_remaining_count?
           The logic requested is: if available times == 0, change account.
           This implies we should filter out accounts with sora2_remaining_count <= 0 if sora2 is supported.
        """
        now = int(time.time())
        # We prioritize accounts with > 0 remaining count
        # Accounts that don't support Sora2 (None) or have count > 0 are preferred.
        # Actually, if sora2_supported is TRUE and remaining_count <= 0, we skip.
        
        return fetch_one("""
            SELECT * FROM sora_accounts 
            WHERE is_active = 1 
            AND (expiration_time IS NULL OR expiration_time > ?)
            AND (
                sora2_supported IS NOT 1 
                OR 
                (sora2_supported = 1 AND sora2_remaining_count > 0)
            )
            ORDER BY priority DESC, updated_at DESC
            LIMIT 1
        """, (now,))

sora_service = SoraService()
