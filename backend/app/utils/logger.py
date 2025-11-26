# utils/logger.py
"""Basic logger configuration using the standard library."""
import logging

logger = logging.getLogger("mit_img_video")
logger.setLevel(logging.INFO)

handler = logging.StreamHandler()
formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
handler.setFormatter(formatter)
logger.addHandler(handler)
