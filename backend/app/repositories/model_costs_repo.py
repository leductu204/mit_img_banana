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
    """Seed default model costs from JSON config if table is empty."""
    # Check if table is empty
    result = fetch_one("SELECT COUNT(*) as count FROM model_costs")
    if result and result["count"] > 0:
        return  # Already has data
    
    # Default costs based on model_costs.json
    default_costs = [
        # Nano Banana
        ("nano-banana", "auto", 1),
        ("nano-banana", "1:1", 1),
        ("nano-banana", "16:9", 2),
        ("nano-banana", "9:16", 2),
        ("nano-banana", "4:3", 2),
        ("nano-banana", "3:4", 2),
        ("nano-banana", "21:9", 2),
        ("nano-banana", "5:4", 2),
        ("nano-banana", "3:2", 2),
        ("nano-banana", "2:3", 2),
        ("nano-banana", "4:5", 2),
        
        # Nano Banana PRO
        # 1k
        ("nano-banana-pro", "1k-auto", 3),
        ("nano-banana-pro", "1k-1:1", 3),
        ("nano-banana-pro", "1k-16:9", 4),
        ("nano-banana-pro", "1k-9:16", 4),
        ("nano-banana-pro", "1k-4:3", 4),
        ("nano-banana-pro", "1k-3:4", 4),
        ("nano-banana-pro", "1k-21:9", 4),
        ("nano-banana-pro", "1k-5:4", 4),
        ("nano-banana-pro", "1k-3:2", 4),
        ("nano-banana-pro", "1k-2:3", 4),
        ("nano-banana-pro", "1k-4:5", 4),
        
        # 2k
        ("nano-banana-pro", "2k-auto", 5),
        ("nano-banana-pro", "2k-1:1", 5),
        ("nano-banana-pro", "2k-16:9", 6),
        ("nano-banana-pro", "2k-9:16", 6),
        ("nano-banana-pro", "2k-4:3", 6),
        ("nano-banana-pro", "2k-3:4", 6),
        ("nano-banana-pro", "2k-21:9", 6),
        ("nano-banana-pro", "2k-5:4", 6),
        ("nano-banana-pro", "2k-3:2", 6),
        ("nano-banana-pro", "2k-2:3", 6),
        ("nano-banana-pro", "2k-4:5", 6),
        
        # 4k
        ("nano-banana-pro", "4k-auto", 10),
        ("nano-banana-pro", "4k-1:1", 10),
        ("nano-banana-pro", "4k-16:9", 12),
        ("nano-banana-pro", "4k-9:16", 12),
        ("nano-banana-pro", "4k-4:3", 11),
        ("nano-banana-pro", "4k-3:4", 11),
        ("nano-banana-pro", "4k-21:9", 12),
        ("nano-banana-pro", "4k-5:4", 12),
        ("nano-banana-pro", "4k-3:2", 12),
        ("nano-banana-pro", "4k-2:3", 12),
        ("nano-banana-pro", "4k-4:5", 12),
        
        # Kling 2.5 Turbo
        ("kling-2.5-turbo", "720p-5s", 5),
        ("kling-2.5-turbo", "720p-10s", 8),
        
        # Kling O1 Video
        ("kling-o1-video", "720p-5s", 6),
        ("kling-o1-video", "720p-10s", 10),
        
        # Kling 2.6
        ("kling-2.6", "720p-5s", 8),
        ("kling-2.6", "720p-10s", 14),
        ("kling-2.6", "720p-5s-audio", 10),
        ("kling-2.6", "720p-10s-audio", 18),
        
        # Veo 3.1 LOW (ultra relaxed - slower, higher quality)
        ("veo3.1-low", "8s", 15),
        
        # Veo 3.1 FAST (fast ultra - faster generation)
        ("veo3.1-fast", "8s", 10),
        
        # Veo 3.1 HIGH (standard high quality)
        ("veo3.1-high", "8s", 20),
    ]
    
    with get_db_context() as conn:
        for model, config_key, credits in default_costs:
            conn.execute(
                """
                INSERT INTO model_costs (model, config_key, credits)
                VALUES (?, ?, ?)
                """,
                (model, config_key, credits)
            )
    
    print(f"Seeded {len(default_costs)} default model costs")
