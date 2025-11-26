# providers/nano_client.py
"""Placeholder client for Nano vendor (text-to-image / image-to-image)."""

def generate_text_to_image(prompt: str, parameters: dict = None):
    return {"status": "completed", "image_url": "https://example.com/nano_image.png"}

def generate_image_to_image(image_url: str, prompt: str, parameters: dict = None):
    return {"status": "completed", "image_url": "https://example.com/nano_i2i.png"}
