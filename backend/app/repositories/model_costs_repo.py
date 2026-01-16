# repositories/model_costs_repo.py
"""Repository for model costs CRUD operations."""

from datetime import datetime
from typing import Optional, List

from app.database.db import get_db_context, fetch_one, fetch_all, execute


def get_cost(model: str, config_key: str) -> Optional[int]:
    """Get credit cost for a specific model/config combination."""
    result = fetch_one(
        "SELECT credits FROM model_costs WHERE model = ? AND config_key = ?",
        (model, config_key)
    )
    return result["credits"] if result else None


def get_all_costs() -> List[dict]:
    """Get all model costs."""
    return fetch_all(
        "SELECT * FROM model_costs ORDER BY model, config_key"
    )


def get_costs_by_model(model: str) -> List[dict]:
    """Get all costs for a specific model."""
    return fetch_all(
        "SELECT * FROM model_costs WHERE model = ? ORDER BY config_key",
        (model,)
    )


def upsert_cost(model: str, config_key: str, credits: int, admin_id: Optional[str] = None) -> None:
    """Insert or update a model cost."""
    with get_db_context() as conn:
        conn.execute(
            """
            INSERT INTO model_costs (model, config_key, credits, updated_at, updated_by)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(model, config_key) 
            DO UPDATE SET credits = ?, updated_at = ?, updated_by = ?
            """,
            (
                model, config_key, credits, datetime.utcnow().isoformat(), admin_id,
                credits, datetime.utcnow().isoformat(), admin_id
            )
        )


def delete_cost(model: str, config_key: str) -> bool:
    """Delete a model cost. Returns True if deleted."""
    rows = execute(
        "DELETE FROM model_costs WHERE model = ? AND config_key = ?",
        (model, config_key)
    )
    return rows > 0


def seed_default_costs() -> None:
    """Seed default model costs. Inserts any missing default costs."""
    # Get existing keys to avoid duplicates
    existing = fetch_all("SELECT model, config_key FROM model_costs")
    existing_set = {(r["model"], r["config_key"]) for r in existing}
    
    # Default costs based on model_costs.json
    default_costs = [
        # Nano Banana (Simplified - "default-fast" and "default-slow")
        ("nano-banana", "default-fast", 1),
        ("nano-banana", "default-slow", 1),
        
        # Nano Banana PRO (Simplified - resolution + speed)
        # 1k
        ("nano-banana-pro", "1k-fast", 3),
        ("nano-banana-pro", "1k-slow", 3),
        
        # 2k
        ("nano-banana-pro", "2k-fast", 5),
        ("nano-banana-pro", "2k-slow", 5),
        
        # 4k
        ("nano-banana-pro", "4k-fast", 10),
        ("nano-banana-pro", "4k-slow", 10),
        
        # Kling 2.5 Turbo (Duration + speed)
        ("kling-2.5-turbo", "720p-5s-fast", 5),
        ("kling-2.5-turbo", "720p-5s-slow", 5),
        ("kling-2.5-turbo", "720p-10s-fast", 8),
        ("kling-2.5-turbo", "720p-10s-slow", 8),
        
        # Kling 2.5 Turbo 1080p (Pro Mode)
        ("kling-2.5-turbo", "1080p-5s-fast", 10),
        ("kling-2.5-turbo", "1080p-5s-slow", 10),
        ("kling-2.5-turbo", "1080p-10s-fast", 15),
        ("kling-2.5-turbo", "1080p-10s-slow", 15),
        
        # Kling O1 Video - Flat structure
        ("kling-o1-video", "5s-fast", 6),
        ("kling-o1-video", "5s-slow", 6),
        ("kling-o1-video", "10s-fast", 10),
        
        # Status Flags (1=Enabled, 0=Disabled) - For ALL models
        ("nano-banana", "is_enabled", 1),
        ("nano-banana-pro", "is_enabled", 1),
        ("kling-2.5-turbo", "is_enabled", 1),
        ("kling-2.6", "is_enabled", 1),
        ("kling-o1-video", "is_enabled", 1),
        ("veo3.1-low", "is_enabled", 1),
        ("veo3.1-fast", "is_enabled", 1),
        ("veo3.1-high", "is_enabled", 1),

        # Slow Mode Feature Flags (1=Enabled, 0=Disabled)
        ("kling-2.5-turbo", "is_slow_mode_enabled", 1),
        ("kling-2.6", "is_slow_mode_enabled", 1),
        ("kling-o1-video", "is_slow_mode_enabled", 1),
        ("veo3.1-low", "is_slow_mode_enabled", 1),
        ("veo3.1-fast", "is_slow_mode_enabled", 1),
        ("veo3.1-high", "is_slow_mode_enabled", 1),
        ("nano-banana", "is_slow_mode_enabled", 1),
        ("nano-banana-pro", "is_slow_mode_enabled_1k", 1),
        ("nano-banana-pro", "is_slow_mode_enabled_2k", 1),
        ("nano-banana-pro", "is_slow_mode_enabled_4k", 1),
        ("kling-o1-video", "10s-slow", 10),
        
        # Kling 2.6 - Flat structure
        ("kling-2.6", "5s-fast", 8),
        ("kling-2.6", "5s-slow", 6),
        ("kling-2.6", "10s-fast", 14),
        ("kling-2.6", "10s-slow", 10),
        ("kling-2.6", "5s-audio-fast", 10),
        ("kling-2.6", "5s-audio-slow", 8),
        ("kling-2.6", "10s-audio-fast", 18),
        ("kling-2.6", "10s-audio-slow", 14),
        
        # Veo 3.1 LOW (ultra relaxed - slower, higher quality)
        ("veo3.1-low", "8s", 15),
        
        # Veo 3.1 FAST (fast ultra - faster generation)
        ("veo3.1-fast", "8s", 10),
        
        # Veo 3.1 HIGH (standard high quality)
        ("veo3.1-high", "8s", 20),

        # Google Veo Image Models (New)
        ("nano-banana-cheap", "default", 1),      # Nano Banana Cheap (Gemini 2.5)
        ("nano-banana-pro-cheap", "default", 2),  # Nano Banana Pro Cheap (Gemini 3.0)
        ("image-4.0", "default", 2),              # Imagen 4.0

        # Enable New Models
        ("nano-banana-cheap", "is_enabled", 1),
        ("nano-banana-pro-cheap", "is_enabled", 1),
        ("image-4.0", "is_enabled", 1),

        # Sora 2.0
        ("sora-2.0", "10s-fast", 20),
        ("sora-2.0", "10s-slow", 20),
        ("sora-2.0", "15s-fast", 30),
        ("sora-2.0", "15s-slow", 30),
        ("sora-2.0", "is_enabled", 1),
        ("sora-2.0", "is_slow_mode_enabled", 1),
    ]
    
    with get_db_context() as conn:
        count = 0
        for model, config_key, credits in default_costs:
            if (model, config_key) not in existing_set:
                conn.execute(
                    """
                    INSERT INTO model_costs (model, config_key, credits)
                    VALUES (?, ?, ?)
                    """,
                    (model, config_key, credits)
                )
                count += 1
    
    if count > 0:
        print(f"Seeded {count} new model costs")
