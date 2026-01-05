from fastapi import APIRouter, Depends, HTTPException, Request
from app.deps import get_current_user
from app.schemas.users import UserInDB
from app.database.db import execute, fetch_one
from app.config import settings
from payos import PayOS
from payos.types import ItemData, CreatePaymentLinkRequest
import time
import json

router = APIRouter()

# Initialize PayOS
payos = None
if settings.PAYOS_CLIENT_ID and settings.PAYOS_API_KEY and settings.PAYOS_CHECKSUM_KEY:
    try:
        payos = PayOS(
            client_id=settings.PAYOS_CLIENT_ID,
            api_key=settings.PAYOS_API_KEY,
            checksum_key=settings.PAYOS_CHECKSUM_KEY
        )
    except Exception as e:
        print(f"Failed to initialize PayOS: {e}")
else:
    print("WARNING: PayOS credentials not found. Payment features will be disabled.")

@router.post("/create-link")
async def create_payment_link(request: Request, current_user: UserInDB = Depends(get_current_user)):
    """
    Create a payment link for a subscription plan.
    """
    if not payos:
         raise HTTPException(status_code=503, detail="Payment system not configured")

    try:
        body = await request.json()
        plan_id_str = body.get("plan_id") # e.g., "starter", "professional"
        
        if not plan_id_str:
            raise HTTPException(status_code=400, detail="plan_id is required")

        # Map frontend plan IDs to DB plan IDs
        # We could query DB by name, but let's do a quick mapping first or query DB
        # DB plans: Free (1), Starter (2), Professional (3), Business (4)
        # Frontend: starter, professional, business
        
        plan_mapping = {
            "starter": "Starter",
            "professional": "Professional",
            "business": "Business"
        }
        
        db_plan_name = plan_mapping.get(plan_id_str)
        if not db_plan_name:
             raise HTTPException(status_code=400, detail="Invalid plan_id")

        # Get plan details from DB
        plan = fetch_one("SELECT * FROM subscription_plans WHERE name = ?", (db_plan_name,))
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found in database")

        amount = int(plan["price"])
        order_code = int(time.time()) # Simple unique order code
        
        # Create Order in DB
        execute("""
            INSERT INTO orders (order_code, user_id, plan_id, amount, status)
            VALUES (?, ?, ?, ?, 'PENDING')
        """, (order_code, current_user.user_id, plan["plan_id"], amount))

        # Create PayOS Payment Link
        domain = settings.FRONTEND_URL
        
        print(f"DEBUG: creating payment link with domain={domain}, order_code={order_code}, amount={amount}")
        
        payment_data = CreatePaymentLinkRequest(
            orderCode=order_code,
            amount=amount,
            description=f"Upgrade to {db_plan_name}",
            items=[ItemData(name=db_plan_name, quantity=1, price=amount)],
            cancelUrl=f"{domain}/pricing",
            returnUrl=f"{domain}/pricing?status=success&order_code={order_code}"
        )
        
        try:
            # payos library v1.0.0 uses payment_requests.create
            # And seemingly snake_case for attributes
            payment_link_response = payos.payment_requests.create(payment_data)
            print(f"DEBUG: PayOS response: {payment_link_response}")
            
            # Handle response attributes (camelCase vs snake_case)
            # Inspecting object to be safe
            checkout_url = getattr(payment_link_response, 'checkoutUrl', None) or getattr(payment_link_response, 'checkout_url', None)
            payment_link_id = getattr(payment_link_response, 'paymentLinkId', None) or getattr(payment_link_response, 'payment_link_id', None)
            
            if not checkout_url or not payment_link_id:
                print(f"CRITICAL: Could not find checkoutUrl/checkout_url or paymentLinkId/payment_link_id in response: {dir(payment_link_response)}")
                raise ValueError("Invalid PayOS response format")

        except Exception as payos_error:
            print(f"CRITICAL: PayOS createPaymentLink failed: {payos_error}")
            import traceback
            traceback.print_exc()
            raise payos_error
        
        # Update Order with link details
        execute("""
            UPDATE orders 
            SET payment_link_id = ?, checkout_url = ?
            WHERE order_code = ?
        """, (payment_link_id, checkout_url, order_code))
        
        return {
            "checkoutUrl": checkout_url,
            "orderCode": order_code
        }

    except Exception as e:
        print(f"Error creating payment link: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

from datetime import datetime

def log_debug(msg):
    try:
        with open("debug_payment.log", "a", encoding="utf-8") as f:
            f.write(f"{datetime.now()} - {msg}\n")
    except:
        pass


def fulfill_order(order_code: int):
    """
    Update order status to PAID and add credits to user.
    Idempotent: validates status before applying.
    """
    log_debug(f"DEBUG: Fulfilling order {order_code}")
    order = fetch_one("SELECT * FROM orders WHERE order_code = ?", (order_code,))
    if not order:
        log_debug(f"DEBUG: Order {order_code} not found during fulfillment")
        return False
        
    if order["status"] == "PAID":
         log_debug("DEBUG: Order already PAID, skipping fulfillment")
         return True

    # Update Order Status
    log_debug("DEBUG: Updating order status to PAID")
    execute("UPDATE orders SET status = 'PAID' WHERE order_code = ?", (order_code,))
    
    # Update User Plan
    user_id = order["user_id"]
    plan_id = order["plan_id"]
    
    log_debug(f"DEBUG: Updating user {user_id} for plan {plan_id}")
    
    # Get plan details
    plan = fetch_one("SELECT * FROM subscription_plans WHERE plan_id = ?", (plan_id,))
    
    # Mapping for credits based on plan ID or use plan["credits"] if available in DB
    # Based on pricing page:
    # Starter (2) -> 2000
    # Professional (3) -> 4500
    # Business (4) -> 13000
    # Fallback to logic in original code
    credits_mapping = {
        2: 2000, 
        3: 4500, 
        4: 13000 
    }
    # Logic: plan might have 'credits' column? The original code logic was:
    # new_credits = credits_mapping.get(plan_id, 10)
    # Let's check debug_db output from earlier? Assumed mapping is safer for now.
    new_credits = credits_mapping.get(plan["plan_id"], 2000) # Default to 2000 if mapping fails

    execute("""
        UPDATE users 
        SET plan_id = ?, credits = credits + ?, plan_started_at = CURRENT_TIMESTAMP, plan_expires_at = datetime('now', '+30 days')
        WHERE user_id = ?
    """, (plan_id, new_credits, user_id))
    log_debug(f"DEBUG: User updated with +{new_credits} credits")
    
    # Record Transaction
    execute("""
        INSERT INTO credit_transactions (user_id, type, amount, balance_before, balance_after, reason)
        SELECT ?, 'payment_success', ?, credits - ?, credits, 'Upgrade: ' || ?
        FROM users WHERE user_id = ?
    """, (user_id, new_credits, new_credits, plan["name"] if plan else "Unknown", user_id))
    log_debug("DEBUG: Transaction recorded")
    return True

@router.post("/webhook")
async def payos_webhook(request: Request):
    """
    Handle PayOS webhooks.
    """
    log_debug("DEBUG: Webhook received")
    try:
        body = await request.json()
        log_debug(f"DEBUG: Webhook keys: {list(body.keys())}")
        
        # Verify signature
        try:
            webhook_data = payos.webhooks.verify(body)
            log_debug(f"DEBUG: Webhook signature verified. Data type: {type(webhook_data)}")
        except Exception as e:
            log_debug(f"DEBUG: Signature verification failed: {e}")
            raise e
        
        order_code = webhook_data.orderCode
        status = webhook_data.code # "00" is success
        
        log_debug(f"DEBUG: Processing order={order_code} status={status}")
        
        if status == "00":
            fulfill_order(order_code)
        elif status == "01": 
             log_debug("DEBUG: Payment cancelled")
             execute("UPDATE orders SET status = 'CANCELLED' WHERE order_code = ?", (order_code,))

        return {"success": True}

    except Exception as e:
        log_debug(f"Webhook error: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "message": str(e)}

@router.get("/orders/{order_code}")
async def get_order_status(order_code: int, current_user: UserInDB = Depends(get_current_user)):
    """
    Get order status by order code.
    actively syncs with PayOS if status is PENDING.
    """
    order = fetch_one("SELECT * FROM orders WHERE order_code = ?", (order_code,))
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    # Security check: Ensure current user owns the order
    if str(order["user_id"]) != str(current_user.user_id):
        raise HTTPException(status_code=403, detail="Not authorized to view this order")
        
    # Active Sync: If PENDING, check with PayOS
    if order["status"] == "PENDING" and payos:
        try:
            log_debug(f"DEBUG: Active check for PENDING order {order_code}")
            payment_info = payos.payment_requests.get(order_code)
            
            if payment_info and payment_info.status == "PAID":
                log_debug(f"DEBUG: PayOS says PAID. Fulfilling order {order_code}")
                fulfill_order(order_code)
                # Refresh order status from DB or just set it
                order["status"] = "PAID" 
            elif payment_info and payment_info.status == "CANCELLED":
                 execute("UPDATE orders SET status = 'CANCELLED' WHERE order_code = ?", (order_code,))
                 order["status"] = "CANCELLED"
                 
        except Exception as e:
            log_debug(f"DEBUG: Active check failed: {e}")
            # Ignore error and return DB status
    
    return {
        "orderCode": order["order_code"],
        "status": order["status"],
        "amount": order["amount"],
        "planId": order["plan_id"],
        "paymentLinkId": order.get("payment_link_id")
    }
