# services/cost_calculator.py
"""Credit cost calculation based on model and parameters."""

from typing import Optional
from app.repositories import model_costs_repo


class CostCalculationError(Exception):
    """Exception raised when cost cannot be calculated."""
    pass


def get_model_costs() -> dict:
    """
    Get all model costs from database and structure them for easy lookup.
    Returns a nested dictionary matching the expected frontend structure.
    """
    all_costs = model_costs_repo.get_all_costs()
    
    # Build nested structure: {model: {resolution: {aspect_ratio: credits}}}
    # For nano-banana (no resolution): {model: {aspect_ratio: credits}}
    structured = {}
    
    for cost in all_costs:
        model = cost["model"]
        config_key = cost["config_key"]
        credits = cost["credits"]
        
        if model not in structured:
            structured[model] = {}
        
        # Parse config_key to build nested structure
        if model == "nano-banana":
            # Direct aspect ratio: "1:1", "4:3", "16:9", etc.
            # Store directly under model without resolution tier
            structured[model][config_key] = credits
            
        elif model == "nano-banana-pro":
            # Format: "resolution-aspect_ratio" like "1k-1:1", "2k-16:9"
            parts = config_key.split("-", 1)
            if len(parts) == 2:
                resolution, aspect_ratio = parts
                if resolution not in structured[model]:
                    structured[model][resolution] = {}
                structured[model][resolution][aspect_ratio] = credits
                
        elif model in ["kling-2.5-turbo", "kling-o1-video", "kling-2.6"]:
            # Format: "resolution-duration" or "resolution-duration-audio"
            # like "720p-5s", "720p-10s-audio"
            parts = config_key.split("-", 1)
            if len(parts) == 2:
                resolution, rest = parts
                if resolution not in structured[model]:
                    structured[model][resolution] = {}
                structured[model][resolution][rest] = credits
        
        elif model in ["veo3.1-low", "veo3.1-fast", "veo3.1-high"]:
            # Simple key mapping for Veo models (just "8s" -> credits)
            structured[model][config_key] = credits
    
    # Fallback: Ensure Veo3 models exist even if DB is empty/lagging
    veo_defaults = {
        "veo3.1-low": {"8s": 15},
        "veo3.1-fast": {"8s": 10},
        "veo3.1-high": {"8s": 20}
    }
    for m, c in veo_defaults.items():
        if m not in structured:
            print(f"DEBUG: Using fallback cost for {m}")
            structured[m] = c
    
    return structured


def calculate_image_cost(
    model: str,
    aspect_ratio: str = "1:1",
    resolution: Optional[str] = None
) -> int:
    """
    Calculate credit cost for image generation.
    
    Args:
        model: Model name (nano-banana, nano-banana-pro)
        aspect_ratio: Aspect ratio (1:1, 16:9, 9:16, etc.)
        resolution: Resolution for pro model (1k, 2k, 4k)
        
    Returns:
        Credit cost as integer
        
    Raises:
        CostCalculationError: If parameters are invalid
    """
    costs = get_model_costs()
    
    if model not in costs:
        raise CostCalculationError(f"Unknown model: {model}")
    
    model_costs = costs[model]
    
    if model == "nano-banana":
        # Standard model: only aspect ratio matters
        # Direct lookup: costs[model][aspect_ratio]
        if aspect_ratio not in model_costs:
            raise CostCalculationError(f"Invalid aspect ratio: {aspect_ratio}")
        
        return model_costs[aspect_ratio]
    
    elif model == "nano-banana-pro":
        # Pro model: resolution + aspect ratio
        if not resolution:
            resolution = "1k"  # Default resolution
        
        if resolution not in model_costs:
            raise CostCalculationError(f"Invalid resolution: {resolution}")
        
        if aspect_ratio not in model_costs[resolution]:
            raise CostCalculationError(f"Invalid aspect ratio: {aspect_ratio}")
        
        return model_costs[resolution][aspect_ratio]
    
    else:
        raise CostCalculationError(f"Unknown image model: {model}")


def calculate_video_cost(
    model: str,
    duration: str = "5s",
    resolution: str = "720p",
    aspect_ratio: str = "16:9",
    audio: bool = False
) -> int:
    """
    Calculate credit cost for video generation.
    
    Args:
        model: Model name (kling-2.5-turbo, kling-o1-video, kling-2.6)
        duration: Video duration (5s, 10s)
        resolution: Video resolution (720p, 1080p)
        aspect_ratio: Aspect ratio (1:1, 16:9, 9:16)
        audio: Whether audio is enabled (for kling-2.6)
        
    Returns:
        Credit cost as integer
        
    Raises:
        CostCalculationError: If parameters are invalid
    """
    costs = get_model_costs()
    
    if model not in costs:
        raise CostCalculationError(f"Unknown model: {model}")
    
    model_costs = costs[model]
    
    # Normalize duration (remove 's' if present)
    duration_key = duration.replace("s", "") + "s"
    
    if model == "kling-2.5-turbo":
        # Only duration matters
        if resolution not in model_costs:
            resolution = "720p"  # Default
        
        if duration_key not in model_costs[resolution]:
            raise CostCalculationError(f"Invalid duration: {duration}")
        
        return model_costs[resolution][duration_key]
    
    elif model == "kling-o1-video":
        # Duration + resolution + aspect ratio
        if resolution not in model_costs:
            raise CostCalculationError(f"Invalid resolution: {resolution}")
        
        # Build key like "5s-16:9"
        key = f"{duration_key}-{aspect_ratio}"
        
        if key not in model_costs[resolution]:
            raise CostCalculationError(f"Invalid parameters: {key}")
        
        return model_costs[resolution][key]
    
    elif model == "kling-2.6":
        # Duration + resolution + optional audio
        if resolution not in model_costs:
            resolution = "720p"  # Default
        
        # Build key like "5s" or "5s-audio"
        key = duration_key
        if audio:
            key = f"{duration_key}-audio"
        
        if key not in model_costs[resolution]:
            raise CostCalculationError(f"Invalid parameters: {key}")
        
        return model_costs[resolution][key]
    
    elif model in ["veo3.1-low", "veo3.1-fast", "veo3.1-high"]:
        # Veo 3.1 - fixed 8s duration
        if "8s" in model_costs:
            return model_costs["8s"]
        else:
            # Fallback to a reasonable default
            raise CostCalculationError(f"Cost config not found for {model}")
    
    else:
        raise CostCalculationError(f"Unknown video model: {model}")


def calculate_cost(
    model: str,
    aspect_ratio: str = "1:1",
    resolution: Optional[str] = None,
    duration: Optional[str] = None,
    audio: bool = False
) -> int:
    """
    Universal cost calculator - routes to image or video calculation.
    
    Args:
        model: Model name
        aspect_ratio: Aspect ratio
        resolution: Resolution (for pro image or video)
        duration: Duration (for video)
        audio: Audio enabled (for kling-2.6)
        
    Returns:
        Credit cost as integer
    """
    # Determine if this is a video model
    video_models = ["kling-2.5-turbo", "kling-o1-video", "kling-2.6", "veo3.1-low", "veo3.1-fast", "veo3.1-high"]
    
    if model in video_models:
        return calculate_video_cost(
            model=model,
            duration=duration or "5s",
            resolution=resolution or "720p",
            aspect_ratio=aspect_ratio,
            audio=audio
        )
    else:
        return calculate_image_cost(
            model=model,
            aspect_ratio=aspect_ratio,
            resolution=resolution
        )
