
import asyncio
import logging
import sys
import os

# Setup path to import backend app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'app')))

from app.services.providers.sora_client import sora_client_instance
from app.services.sora_service import sora_service

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def main():
    logger.info("--- Starting Sora Full Flow Verification ---")
    
    # 1. Get Token
    account = sora_service.get_active_token()
    if not account:
        logger.error("No active Sora account found.")
        return
    
    token = account['access_token']
    logger.info(f"Using Account: {account['email']}")

    # 2. Generate Video
    prompt = "A futuristic city with flying cars, cyberpunk style, detailed, 4k"
    logger.info(f"Generating video with prompt: '{prompt}'")
    
    try:
        gen_id = await sora_client_instance.generate_video(prompt, model="sy_8", n_frames=300, size="small") # 10s
        logger.info(f"Generation UUID: {gen_id}")
    except Exception as e:
        logger.error(f"Generation failed: {e}")
        return

    # 3. Monitor Status
    logger.info("Polling for status...")
    job_status = "processing"
    final_result = None
    
    for _ in range(120): # 6 mins max
        status_data = await sora_client_instance.get_job_status(gen_id, token)
        job_status = status_data.get("status")
        progress = status_data.get("progress", 0)
        
        logger.info(f"Status: {job_status} - Progress: {progress}%")
        
        if job_status == "completed":
            final_result = status_data.get("result")
            raw_data = status_data.get("raw", {})
            logger.info("Job Completed!")
            break
        elif job_status == "failed":
            logger.error(f"Job Failed: {status_data.get('error')}")
            return
            
        await asyncio.sleep(3)
        
    if job_status != "completed":
        logger.error("Timed out waiting for completion.")
        return

    # 4. Watermark Removal Flow
    logger.info("--- Testing Watermark Removal Flow (Merged Client) ---")
    
    # Check if we already have an s_ ID (sometimes validation finds it directly)
    post_id = None
    if final_result and "/p/" in final_result:
        import re
        match = re.search(r'/p/([^/?#]+)', final_result)
        if match:
            post_id = match.group(1)
            logger.info(f"Existing Post ID found: {post_id}")
            
    if not post_id:
        logger.info("No Post ID found. Creating temporary post...")
        try:
            new_post_id = await sora_client_instance.post_video_for_watermark_free(gen_id, prompt, token)
            logger.info(f"Created Post ID: {new_post_id}")
            post_id = new_post_id
            
            logger.info("Waiting 5s for propagation...")
            await asyncio.sleep(5)
            
        except Exception as e:
            logger.error(f"Failed to create post: {e}")
            # Check fallback
            if final_result:
                 logger.info(f"FALLBACK: Post creation failed, but direct URL is available: {final_result}")
            return

    # Check for empty post_id from successful call (but failed internally)
    if not post_id:
        logger.error("Post ID creation returned empty string (likely 500 error from OpenAI swallowed by client).")
        if final_result:
             logger.info(f"FALLBACK: Direct URL is available: {final_result}")
        return

    # 5. Get Clean Link (Using NEW merged method)
    logger.info(f"Attempting to get clean link for {post_id} using sora_client_instance...")
    try:
        clean_link = await sora_client_instance.get_watermark_free_url_sorai(post_id)
        logger.info(f"FINAL SUCCESS: {clean_link}")
    except Exception as e:
        logger.error(f"Watermark removal failed: {e}")

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
