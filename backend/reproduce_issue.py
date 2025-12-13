
import sys
import os
sys.path.append(os.getcwd())

from app.services.providers.higgsfield_client import higgsfield_client
import traceback

def test():
    try:
        print("Attempting to generate image...")
        job_id = higgsfield_client.generate_image(
            prompt="test image",
            model="nano-banana",
            aspect_ratio="1:1",
            use_unlim=True
        )
        with open("error_log.txt", "w", encoding="utf-8") as f:
            f.write(f"Success! Job ID: {job_id}\n")
    except Exception as e:
        with open("error_log.txt", "w", encoding="utf-8") as f:
            f.write(f"Caught exception: {type(e).__name__}\n")
            f.write(str(e))

if __name__ == "__main__":
    test()
