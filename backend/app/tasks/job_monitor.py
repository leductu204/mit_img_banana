# tasks/job_monitor.py
"""Background task for actively polling and updating job statuses."""

import asyncio
import logging
from app.repositories import jobs_repo
from app.services.credits_service import credits_service
from app.services.providers.higgsfield_client import higgsfield_client, HiggsfieldClient
from app.services.providers.google_client import google_veo_client
from app.services.job_queue_service import JobQueueService
from app.repositories.higgsfield_accounts_repo import higgsfield_accounts_repo

logger = logging.getLogger(__name__)


def map_external_status(external_status: str) -> str:
    """Map external API status to our internal status values."""
    status_lower = external_status.lower() if external_status else "processing"
    
    if status_lower in ("completed", "complete", "done", "success", "finished"):
        return "completed"
    if status_lower in ("failed", "error", "cancelled", "canceled", "timeout"):
        return "failed"
    if status_lower in ("pending", "queued", "waiting"):
        return "pending"
    
    return "processing"


def get_higgsfield_client():
    """
    Get Higgsfield client using active account from DB (highest priority).
    Falls back to default .env client if no active accounts found.
    """
    try:
        accounts = higgsfield_accounts_repo.list_accounts(active_only=True)
        if accounts:
            # Accounts are already ordered by priority DESC in repo
            # Pick the first one (highest priority)
            account_id = accounts[0]['account_id']
            return HiggsfieldClient.create_from_account(account_id)
    except Exception as e:
        logger.error(f"Error fetching Higgsfield account: {e}")
    
    # Fallback to default
    return higgsfield_client


async def run_job_monitor(check_interval_seconds: int = 30):
    """
    Background task to actively monitor all pending/processing jobs.
    
    This ensures jobs are updated even if the user closes their browser.
    Runs every check_interval_seconds.
    """
    logger.info(f"Starting job monitor task (interval={check_interval_seconds}s)")
    
    while True:
        try:
            # Get active higgsfield client for this iteration
            # We fetch it fresh each loop in case credentials updated
            client = get_higgsfield_client()
            
            # Get all active jobs (only ones that have been submitted to provider)
            active_jobs = jobs_repo.get_active_jobs()
            
            if active_jobs:
                logger.debug(f"Job monitor: checking {len(active_jobs)} active jobs")
                
                for job in active_jobs:
                    job_id = job["job_id"]
                    # Use provider_job_id for external API calls, fallback to job_id if None (migration)
                    provider_job_id = job.get("provider_job_id") or job_id
                    
                    user_id = job["user_id"]
                    current_status = job["status"]
                    
                    try:
                        # Determine provider based on job_id format (legacy) or provider_id format
                        # Assuming Veo3 IDs might still be identifiable, or we just trust the provider_id
                        if "|" in provider_job_id:
                            # Veo3 job
                            result = google_veo_client.get_job_status(provider_job_id)
                        elif job.get("model") == "sora-2.0":
                            # Sora 2.0 job
                            from app.services.providers.sora_client import sora_client_instance
                            from app.services.sora_service import sora_service
                            
                            # Get an active admin token
                            # Since we don't track which account created the job, we pick the highest priority active one
                            # This assumes all accounts can see all jobs OR we only have one account
                            # Use recursion/retry for 401
                            try:
                                account = sora_service.get_active_token()
                                if not account:
                                    logger.error(f"Job {job_id}: No active Sora account to check status")
                                    continue
                                
                                token = account['access_token']
                                try:
                                    result = await sora_client_instance.get_job_status(provider_job_id, token)
                                except Exception as e:
                                    # Check for auth error
                                    if "401" in str(e) or "Signed out" in str(e):
                                        logger.warning(f"Sora Auth failed for account {account['id']}. Attempting refresh...")
                                        # Try refresh
                                        try:
                                            new_account = await sora_service.refresh_token(account['id'])
                                            if new_account:
                                                token = new_account['access_token']
                                                # Retry once
                                                result = await sora_client_instance.get_job_status(provider_job_id, token)
                                            else:
                                                raise Exception("Refresh returned None")
                                        except Exception as refresh_error:
                                            logger.error(f"Token refresh failed: {refresh_error}")
                                            raise e # Re-raise original or new error
                                    else:
                                        raise e
                            except Exception as e:
                                logger.error(f"Sora status check failed for job {job_id}: {e}")
                                # If we caught generic error here, we might want to let the main loop catch it too?
                                # The main loop has try/except Exception as e logging "Error checking job {job_id}: {e}"
                                # So raising here allows main loop to handle it consistently.
                                raise e
                        elif job.get("model") == "motion-control":
                            # Kling Motion Control job
                            from app.services.providers.kling_client import kling_client
                            result = kling_client.check_task_status(provider_job_id)
                        else:
                            # Higgsfield job - Use dynamic client
                            result = client.get_job_status(provider_job_id)
                            
                            # Fallback: If job not found on DB account, try Default (.env) account
                            # This handles "Split-Brain" where job was created with .env creds but monitor uses DB creds
                            if result.get("status") == "failed" and "not found" in str(result.get("error", "")).lower():
                                # Only try if we have a distinctive default client
                                try:
                                    logger.info(f"Job {job_id} not found on active DB account. Trying fallback to default .env account...")
                                    # We use the imported 'higgsfield_client' which is the .env instance
                                    fallback_res = higgsfield_client.get_job_status(provider_job_id)
                                    
                                    # If fallback found something different (e.g. not "failed" -> "not found"), use it
                                    # Or if it returns "failed" but with a different error (e.g. 401), use that so we know.
                                    # Simplest strategy: Always use fallback result if the first one was definitely "Not Found"
                                    result = fallback_res
                                    
                                    if result.get("status") != "failed":
                                        logger.info(f"Fallback successful for Job {job_id}. Status: {result.get('status')}")
                                except Exception as fallback_e:
                                    logger.warning(f"Fallback check failed for Job {job_id}: {fallback_e}")
                        
                        # Debug (commented out)
                        # print(f"[JobMonitor] Job {job_id[:8]}... returned: {result}")
                        
                        external_status = result.get("status", "processing")
                        new_status = map_external_status(external_status)
                        output_url = result.get("result")
                        
                        # Handle Sora error specifically if present
                        if new_status == "failed" and result.get("error"):
                            logger.error(f"Job {job_id} failed from provider: {result.get('error')}")

                        
                        # Define active (non-terminal) states
                        active_states = {"pending", "processing"}
                        terminal_states = {"completed", "failed"}
                        
                        # Only update if status changed
                        # Debug (commented out)
                        # print(f"[JobMonitor] Job {job_id[:8]}... current_status={current_status}, new_status={new_status}")
                        if new_status != current_status:
                            logger.info(f"Job {job_id}: {current_status} -> {new_status}")
                            
                            # Prevent downgrading from processing to pending
                            # Both are active states, no need to update
                            if current_status in active_states and new_status in active_states:
                                logger.debug(f"Job {job_id}: Skipping status update (both active states)")
                                continue
                            
                            if new_status == "completed":
                                # Remove Watermark for Sora Jobs
                                if "sora" in job.get("model", "").lower():
                                    if output_url:
                                        try:
                                            from app.services.providers.sora_client import sora_client_instance
                                            logger.info(f"Sora Job {job_id} Completed. output_url: {output_url}")
                                            
                                            # 0. Initialize post_id
                                            post_id = None
                                            
                                            # Check raw result for 'id' or 'share_url'
                                            raw_data = result.get("raw", {})
                                            if raw_data:
                                                # Check commonly named fields (adjust based on actual API response)
                                                if raw_data.get("id"):
                                                     # Sora ID often starts with 's_' or similar
                                                     possible_id = raw_data.get("id")
                                                     logger.info(f"Checking raw ID: {possible_id}")
                                                     if possible_id and possible_id.startswith("s_"):
                                                        post_id = possible_id
                                                     else:
                                                        logger.info(f"Raw ID {possible_id} does not look like a post ID (s_...). Ignoring.")
                                            
                                            # 1. Try to extract from URL if it's a share link (override raw if found)
                                            import re
                                            match = re.search(r'/p/([^/?#]+)', output_url)
                                            if match:
                                                post_id = match.group(1)
                                                logger.info(f"Extracted post_id from URL: {post_id}")
                                            
                                            # 2. Fallback to usage of provider_job_id
                                            if not post_id and provider_job_id and not "|" in provider_job_id:
                                                # If it looks like an s_ ID, use it.
                                                if provider_job_id.startswith("s_"):
                                                    post_id = provider_job_id
                                                    logger.info(f"Using provider_job_id as post_id: {post_id}")
                                                
                                            # 3. Last Resort: Identify by UUID/gen_id and create a post to get ID
                                            if not post_id and provider_job_id: 
                                                # Likely a gen_ ID or UUID
                                                logger.info(f"Could not extract s_ ID. Attempting to create temporary post for ID: {provider_job_id}")
                                                try:
                                                    from app.services.providers.sora_client import sora_client_instance
                                                    # sora_service might be needed for getting token if I use it here, but sora_client_instance uses it internally? No, post_video needs prompt and token.
                                                    # Actually, the logic for 'create temp post' ALREADY imports sora_client_instance inside its own block or reuses?
                                                    # Wait, I am replacing the TOP block import.
                                                    # The inner block (line 200) imports it AGAIN "from app... import sora_client_instance". That's fine (python handles it), but redundant.
                                                    # I will leave the inner block alone for now to minimize diff, or just let it exist.
                                                    
                                                    from app.services.sora_service import sora_service
                                                    
                                                    # We need an active token
                                                    account = sora_service.get_active_token()
                                                    if account:
                                                        token = account['access_token']
                                                        # Create post
                                                        # Note: provider_job_id is usually 'task_id', but we need 'generation_id' (gen_...)
                                                        # The 'raw_data' from get_job_status contains the generation object
                                                        gen_id = raw_data.get("id") if raw_data and raw_data.get("id") else provider_job_id
                                                        logger.info(f"Calling post_video_for_watermark_free for gen_id: {gen_id}")
                                                        
                                                        temp_post_id = await sora_client_instance.post_video_for_watermark_free(gen_id, "", token)
                                                        
                                                        if temp_post_id:
                                                            logger.info(f"Created temp post: {temp_post_id}. Waiting 5s for propagation...")
                                                            await asyncio.sleep(5)
                                                            post_id = temp_post_id
                                                    else:
                                                        logger.warning("No active Sora account found to create temp post.")
                                                except Exception as e_post:
                                                    logger.error(f"Failed to create temp post for watermark removal: {e_post}")

                                            if post_id:
                                                logger.info(f"Attempting watermark removal for job {job_id} (post_id: {post_id})...")
                                                clean_url = await sora_client_instance.get_watermark_free_url_sorai(post_id)
                                                if clean_url:
                                                    logger.info(f"Watermark removed for job {job_id}. Old: {output_url} -> New: {clean_url}")
                                                    # Verify it's different and looks valid
                                                    if clean_url != output_url and clean_url.startswith("http"):
                                                        output_url = clean_url
                                                    else:
                                                         logger.warning(f"Clean URL is same or invalid. clean: {clean_url}")
                                                else:
                                                    logger.warning("sora_client returned None for safe watermark removal")
                                            else:
                                                logger.warning(f"Could not extract Sora post_id for job {job_id}. URL: {output_url}, Raw keys: {list(raw_data.keys()) if raw_data else 'None'}")
                                                
                                        except Exception as e_wm:
                                            logger.error(f"Failed to remove watermark for job {job_id}: {e_wm}")
                                            
                                            # CRITICAL FALLBACK: Try all possible keys to get the Video URL
                                            # logic ported from reference implementation
                                            if raw_data:
                                                fallback_url = raw_data.get("downloadable_url") or raw_data.get("url") or raw_data.get("signed_url") or raw_data.get("video_url")
                                                if fallback_url:
                                                    logger.info(f"Fallback URL found: {fallback_url[:50]}...")
                                                    output_url = fallback_url
                                                else:
                                                    logger.error(f"CRITICAL: Video URL not found in fallback logic. Raw keys: {list(raw_data.keys())}")
                                    else:
                                        logger.warning(f"Sora Job {job_id} completed but no output_url found.")

                                # Debug (commented out)
                                # print(f"[JobMonitor] Updating job {job_id} to COMPLETED with URL: {output_url[:50]}...")
                                success = jobs_repo.update_status(job_id, new_status, output_url=output_url)
                                # Debug (commented out)
                                # print(f"[JobMonitor] Job {job_id} update returned: {success}")
                                
                                # Verify the update (debug - commented out)
                                # verify_job = jobs_repo.get_by_id(job_id)
                                # print(f"[JobMonitor] Verified DB status: {verify_job['status'] if verify_job else 'NOT FOUND'}")
                                
                                # Job finished, free up slot -> promote next
                                JobQueueService.promote_next_job(user_id)
                                
                            elif new_status == "failed":
                                error_msg = result.get("error", "Generation failed")
                                jobs_repo.update_status(job_id, new_status, error_message=error_msg)
                                
                                # Refund credits if not already refunded
                                if not job.get("credits_refunded", False):
                                    refund_result = credits_service.refund_credits(
                                        user_id=user_id,
                                        job_id=job_id
                                    )
                                    if refund_result is not None:
                                        logger.info(f"Refunded job {job_id}. New balance: {refund_result}")
                                
                                # Job failed (but finished), free up slot -> promote next
                                JobQueueService.promote_next_job(user_id)
                                        
                            else:
                                # Other status changes (e.g., pending -> processing)
                                jobs_repo.update_status(job_id, new_status)
                                
                    except Exception as e:
                        logger.error(f"Error checking job {job_id}: {e}")
                    
                    # Wait between each job check to avoid rate limiting
                    await asyncio.sleep(2)
                        
        except Exception as e:
            logger.error(f"Error in job monitor loop: {e}")
        
        # Sleep until next check
        await asyncio.sleep(check_interval_seconds)

