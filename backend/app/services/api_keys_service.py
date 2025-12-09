from typing import List, Optional
from app.repositories import api_keys_repo
from app.schemas.api_keys import APIKeyCreate, APIKeyResponse

class APIKeysService:
    """Service for managing API keys."""
    
    def create_key(self, user_id: Optional[str], data: APIKeyCreate) -> APIKeyResponse:
        """Create a new API key for a user (or anonymous)."""
        # Create key in database
        key_record = api_keys_repo.create(data, user_id)
        
        # Return response including the secret key (only time it's visible)
        return APIKeyResponse(**key_record)
        
    def get_user_keys(self, user_id: str) -> List[APIKeyResponse]:
        """Get all keys for a user."""
        keys = api_keys_repo.get_by_user(user_id)
        return [APIKeyResponse(**k) for k in keys]
        
    def get_key_details(self, user_id: str, key_id: str) -> Optional[APIKeyResponse]:
        """Get details for a specific key if owned by user."""
        key = api_keys_repo.get_by_id(key_id)
        if not key or key["user_id"] != user_id:
            return None
        return APIKeyResponse(**key)
        
    def revoke_key(self, user_id: str, key_id: str) -> bool:
        """Revoke a user's key."""
        # Verify ownership efficiently
        key = api_keys_repo.get_by_id(key_id)
        if not key or key["user_id"] != user_id:
            return False
            
        return api_keys_repo.revoke(key_id)
        
    def top_up_balance(self, user_id: str, key_id: str, amount: int) -> int:
        """
        Transfer credits from user's main wallet to API key.
        """
        if amount <= 0:
            raise ValueError("Amount must be positive")
            
        key = api_keys_repo.get_by_id(key_id)
        if not key or key["user_id"] != user_id:
            raise ValueError("Key not found or access denied")
            
        from app.services.credits_service import credits_service, InsufficientCreditsError
        
        # 1. Deduct from User Wallet
        try:
            credits_service.deduct_credits(
                user_id=user_id,
                amount=amount,
                job_id=None,
                reason=f"Transfer to API Key {key_id}"
            )
        except InsufficientCreditsError:
            raise ValueError(f"Insufficient credits in main wallet to transfer {amount}")
            
        # 2. Add to API Key
        # If this fails, we should ideally refund, but for MVP we assume DB stability 
        # after successful deduction.
        try:
            return api_keys_repo.add_balance(key_id, amount)
        except Exception as e:
            # Critical: Failed to add but already deducted. 
            # Attempt refund (manual rollback)
            print(f"CRITICAL ERROR: Failed to add balance to {key_id} after deduction. Attempting refund.")
            credits_service.add_credits(
                user_id=user_id,
                amount=amount,
                reason=f"Refund: Failed API Key transfer to {key_id}"
            )
            raise e

# Singleton instance
api_keys_service = APIKeysService()
