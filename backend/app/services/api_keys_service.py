from typing import List, Optional
from app.repositories import api_keys_repo, users_repo
from app.schemas.api_keys import APIKeyCreate, APIKeyResponse

class APIKeysService:
    """Service for managing API keys."""
    
    def create_key(self, user_id: Optional[str], data: APIKeyCreate) -> APIKeyResponse:
        """Create a new API key for a user (or anonymous)."""
        # Create key in database
        key_record = api_keys_repo.create(data, user_id)
        
        # Override balance with user's global balance
        current_credits = users_repo.get_credits(user_id) or 0
        key_record["balance"] = current_credits
        
        # Return response including the secret key (only time it's visible)
        return APIKeyResponse(**key_record)
        
    def get_user_keys(self, user_id: str) -> List[APIKeyResponse]:
        """Get all keys for a user."""
        keys = api_keys_repo.get_by_user(user_id)
        current_credits = users_repo.get_credits(user_id) or 0
        
        # Inject global balance into all key records
        for k in keys:
            k["balance"] = current_credits
            
        return [APIKeyResponse(**k) for k in keys]
        
    def get_key_details(self, user_id: str, key_id: str) -> Optional[APIKeyResponse]:
        """Get details for a specific key if owned by user."""
        key = api_keys_repo.get_by_id(key_id)
        if not key or key["user_id"] != user_id:
            return None
            
        current_credits = users_repo.get_credits(user_id) or 0
        key["balance"] = current_credits
            
        return APIKeyResponse(**key)
        
    def revoke_key(self, user_id: str, key_id: str) -> bool:
        """Revoke a user's key."""
        # Verify ownership efficiently
        key = api_keys_repo.get_by_id(key_id)
        if not key or key["user_id"] != user_id:
            return False
            
        return api_keys_repo.revoke(key_id)
        
        
    # top_up_balance removed as keys now share user global balance

# Singleton instance
api_keys_service = APIKeysService()
