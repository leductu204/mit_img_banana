
"""
Dispatcher service to re-construct and execute API calls from stored job records.
Used by JobQueueService to promote PENDING jobs to PROCESSING.
"""
import json
import logging
from typing import Optional, Dict, Any

from app.services.providers.higgsfield_client import higgsfield_client, HiggsfieldClient
from app.services.providers.google_client import google_veo_client
from app.repositories import jobs_repo
from app.repositories.higgsfield_accounts_repo import higgsfield_accounts_repo

logger = logging.getLogger(__name__)

def get_higgsfield_client():
    """
    Get Higgsfield client using active account from DB (highest priority).
    Falls back to default .env client if no active accounts found.
    """
    try:
        accounts = higgsfield_accounts_repo.list_accounts(active_only=True)
        if accounts:
            account_id = accounts[0]['account_id']
            return HiggsfieldClient.create_from_account(account_id)
    except Exception as e:
        logger.error(f"Error fetching Higgsfield account: {e}")
    return higgsfield_client

class Dispatcher:
    """Handles execution of jobs based on database records."""

    @staticmethod
    def execute_job(job: Dict[str, Any]) -> Optional[str]:
        """
        Executes a job based on its type and model.
        Returns the provider_job_id if successful, None otherwise.
        """
        try:
            job_type = job.get("type")
            model = job.get("model")
            prompt = job.get("prompt")
            
            # Parse inputs
            input_params = json.loads(job.get("input_params") or "{}")
            input_images_data = json.loads(job.get("input_images") or "[]")
            
            # Helper to extract common params
            def get_param(key, default=None):
                return input_params.get(key, default)

            aspect_ratio = get_param("aspect_ratio", "16:9") # Default vary by model but safe fallback
            resolution = get_param("resolution", "720p")
            duration = get_param("duration")
            speed = get_param("speed", "fast")
            audio = get_param("audio")
            sound = get_param("sound") # Alias for audio in some endpoints
            
            # Normalize audio boolean
            has_audio = audio if audio is not None else (sound if sound is not None else False)
            
            # Normalize input images
            # Some clients expect list of dicts, some expect list of strings (urls)
            # Need to match specific client method signatures.
            
            provider_job_id = None
            
            # ============================================
            # IMAGE GENERATION
            # ============================================
            if model == "nano-banana":
                use_unlim = True if speed == "slow" else False
                client = get_higgsfield_client()
                provider_job_id = client.generate_image(
                    prompt=prompt,
                    input_images=input_images_data,
                    aspect_ratio=aspect_ratio,
                    model=model,
                    use_unlim=use_unlim
                )
                
            elif model == "nano-banana-pro":
                use_unlim = True if speed == "slow" else False
                client = get_higgsfield_client()
                provider_job_id = client.generate_image(
                    prompt=prompt,
                    input_images=input_images_data,
                    aspect_ratio=aspect_ratio,
                    resolution=resolution,
                    model=model,
                    use_unlim=use_unlim
                )

            # ============================================
            # VIDEO GENERATION - VEO
            # ============================================
            elif model in ["veo3.1-low", "veo3.1-fast", "veo3.1-high"]:
                input_image = None
                if input_images_data and len(input_images_data) > 0:
                    # Veo client expects single input image dict or None
                    input_image = input_images_data[0]
                
                provider_job_id = google_veo_client.generate_video(
                    prompt=prompt,
                    model=model,
                    aspect_ratio=aspect_ratio,
                    input_image=input_image
                )

            # ============================================
            # VIDEO GENERATION - KLING (HIGGSFIELD)
            # ============================================
            elif model == "kling-2.5-turbo":
                use_unlim = True if speed == "slow" else False
                if job_type == "i2v":
                    # I2V requires specific image fields
                    img = input_images_data[0] if input_images_data else {}
                    client = get_higgsfield_client()
                    provider_job_id = client.send_job_kling_2_5_turbo_i2v(
                        prompt=prompt,
                        duration=duration or 5,
                        resolution=resolution,
                        img_id=img.get("id"),
                        img_url=img.get("url"),
                        width=img.get("width"),
                        height=img.get("height"),
                        use_unlim=use_unlim
                    )
                else:
                    # T2V - Not currently supported/used for Turbo in router?
                    # Router only has I2V for turbo form. 
                    # If we add T2V support later, add here.
                    logger.warning(f"Unsupported job type {job_type} for model {model}")

            elif model == "kling-o1-video":
                use_unlim = True if speed == "slow" else False
                if job_type == "i2v":
                    img = input_images_data[0] if input_images_data else {}
                    client = get_higgsfield_client()
                    provider_job_id = client.send_job_kling_o1_i2v(
                        prompt=prompt,
                        duration=duration or 5,
                        aspect_ratio=aspect_ratio,
                        img_id=img.get("id"),
                        img_url=img.get("url"),
                        width=img.get("width"),
                        height=img.get("height"),
                        use_unlim=use_unlim
                    )
            
            elif model == "kling-2.6":
                use_unlim = True if speed == "slow" else False
                if job_type == "t2v":
                    client = get_higgsfield_client()
                    provider_job_id = client.send_job_kling_2_6_t2v(
                        prompt=prompt,
                        duration=duration or 5,
                        aspect_ratio=aspect_ratio,
                        sound=has_audio,
                        use_unlim=use_unlim
                    )
                elif job_type == "i2v":
                    img = input_images_data[0] if input_images_data else {}
                    client = get_higgsfield_client()
                    provider_job_id = client.send_job_kling_2_6_i2v(
                        prompt=prompt,
                        duration=duration or 5,
                        sound=has_audio,
                        img_id=img.get("id"),
                        img_url=img.get("url"),
                        width=img.get("width"),
                        height=img.get("height"),
                        use_unlim=use_unlim
                    )
            
            # ============================================
            # DEFAULT / FALLBACK
            # ============================================
            else:
                # Generic fallback if routers use main generate_video method 
                # (Active for generic kling requests from JSON endpoint)
                use_unlim = True if speed == "slow" else False
                client = get_higgsfield_client()
                provider_job_id = client.generate_video(
                    prompt=prompt,
                    model=model,
                    duration=duration,
                    resolution=resolution,
                    aspect_ratio=aspect_ratio,
                    audio=has_audio,
                    input_images=input_images_data,
                    use_unlim=use_unlim
                )

            return provider_job_id

        except Exception as e:
            logger.error(f"Dispatcher failed to execute job {job.get('job_id')}: {str(e)}")
            import traceback
            traceback.print_exc()
            return None
