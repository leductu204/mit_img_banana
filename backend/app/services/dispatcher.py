# services/dispatcher.py
"""Dispatcher maps model keys to provider client functions."""

def get_provider_client(model_key: str):
    # Placeholder mapping
    mapping = {
        "nano": "nano_client",
        "kling": "kling_client",
        "openai": "openai_client",
    }
    return mapping.get(model_key, "nano_client")
