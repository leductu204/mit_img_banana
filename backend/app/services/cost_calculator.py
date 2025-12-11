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
        # All keys now end with -fast or -slow
        structured[model][config_key] = credits
            
    return structured


def calculate_image_cost(
    model: str,
    aspect_ratio: str = "1:1",
    resolution: Optional[str] = None,
    speed: str = "fast"
) -> int:
    """
    Calculate credit cost for image generation.
    
    Args:
        model: Model name (nano-banana, nano-banana-pro)
        aspect_ratio: Aspect ratio (1:1, 16:9, 9:16, etc.)
        resolution: Resolution for pro model (1k, 2k, 4k)
        speed: Generation speed (fast/slow)
        
    Returns:
        Credit cost as integer
        
    Raises:
        CostCalculationError: If parameters are invalid
    """
    costs = get_model_costs()
    
    if model not in costs:
        raise CostCalculationError(f"Unknown model: {model}")
    
    model_costs = costs[model]
    
    # Ensure speed is valid suffix
    speed_suffix = speed.lower()
    if speed_suffix not in ["fast", "slow"]:
        speed_suffix = "fast"
    
    if model == "nano-banana":
        # Standard model: fixed cost ("default-fast" or "default-slow")
        key = f"default-{speed_suffix}"
        if key in model_costs:
            return model_costs[key]
            
        # Fallback to old keys ("default") or simplified generic
        if "default" in model_costs:
            return model_costs["default"]
            
        # Logic specific fallback
        return 1
    
    elif model == "nano-banana-pro":
        # Pro model: resolution + speed
        if not resolution:
            resolution = "1k"  # Default resolution
            
        # Look for "1k-fast" etc.
        key = f"{resolution}-{speed_suffix}"
        
        if key in model_costs:
            return model_costs[key]
        
        # Fallback to just resolution if specific speed key missing
        if resolution in model_costs:
            return model_costs[resolution]
            
        raise CostCalculationError(f"Invalid resolution/speed: {key}")
    
    else:
        raise CostCalculationError(f"Unknown image model: {model}")


def calculate_video_cost(
    model: str,
    duration: str = "5s",
    resolution: str = "720p",
    aspect_ratio: str = "16:9",
    audio: bool = False,
    speed: str = "fast"
) -> int:
    """
    Calculate credit cost for video generation.
    
    Args:
        model: Model name (kling-2.5-turbo, kling-o1-video, kling-2.6)
        duration: Video duration (5s, 10s)
        resolution: Video resolution (720p, 1080p)
        aspect_ratio: Aspect ratio (1:1, 16:9, 9:16)
        audio: Whether audio is enabled (for kling-2.6)
        speed: Generation speed (fast/slow)
        
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
    
    # Ensure speed is valid suffix
    speed_suffix = speed.lower()
    if speed_suffix not in ["fast", "slow"]:
        speed_suffix = "fast"
    
    base_key = ""
    
    if model == "kling-2.5-turbo":
        # Only duration matters (720p presumed default in repo keys)
        # Repo keys: 720p-5s-fast
        base_key = f"{resolution}-{duration_key}"
        
    elif model == "kling-o1-video":
        # Duration + resolution (repo keys same format as 2.5 turbo mostly)
        base_key = f"{resolution}-{duration_key}"
    
    elif model == "kling-2.6":
        # Duration + resolution + optional audio
        base_key = f"{resolution}-{duration_key}"
        if audio:
            base_key += "-audio"
    
    elif model in ["veo3.1-low", "veo3.1-fast", "veo3.1-high"]:
        # Veo 3.1 - fixed 8s duration, speed param doesn't affect cost lookup name (already built into model name)
        # We ignore 'speed' param here for lookup as the model name IS the speed variant
        if "8s" in model_costs:
            return model_costs["8s"]
        return 10 # Fallback
    
    else:
        raise CostCalculationError(f"Unknown video model: {model}")
        
    # Final lookup with speed suffix
    full_key = f"{base_key}-{speed_suffix}"
    
    if full_key in model_costs:
        return model_costs[full_key]
        
    # Fallback: Try without speed suffix (backward compat)
    if base_key in model_costs:
        return model_costs[base_key]
        
    raise CostCalculationError(f"Invalid parameters: {full_key}")


def calculate_cost(
    model: str,
    aspect_ratio: str = "1:1",
    resolution: Optional[str] = None,
    duration: Optional[str] = None,
    audio: bool = False,
    speed: str = "fast"
) -> int:
    """
    Universal cost calculator - routes to image or video calculation.
    
    Args:
        model: Model name
        aspect_ratio: Aspect ratio
        resolution: Resolution (for pro image or video)
        duration: Duration (for video)
        audio: Audio enabled (for kling-2.6)
        speed: Generation speed
        
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
            audio=audio,
            speed=speed
        )
    else:
        return calculate_image_cost(
            model=model,
            aspect_ratio=aspect_ratio,
            resolution=resolution,
            speed=speed
        )
