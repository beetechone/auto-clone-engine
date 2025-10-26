import stripe, os
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from loguru import logger

router = APIRouter(prefix="/billing", tags=["billing"])
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")

PLANS = [
    {"id":"free","name":"Free","price":0,"currency":"usd","quota":{"qr_month":50}},
    {"id":"pro","name":"Pro","price":990,"currency":"usd","interval":"month","quota":{"qr_month":1000}},
    {"id":"team","name":"Team","price":2990,"currency":"usd","interval":"month","quota":{"qr_month":10000}},
]

@router.get("/plans")
def get_plans():
    return {"plans": PLANS}

@router.post("/checkout")
async def create_checkout_session(req: Request):
    body = await req.json()
    plan_id = body.get("plan_id")
    success_url = body.get("success_url", "http://localhost:3000/success")
    cancel_url = body.get("cancel_url", "http://localhost:3000/cancel")
    plan = next((p for p in PLANS if p["id"]==plan_id), None)
    if not plan: raise HTTPException(status_code=400, detail="Invalid plan_id")
    try:
        if plan["price"] == 0:
            return {"id": "free", "url": success_url}
        session = stripe.checkout.Session.create(
            mode="subscription",
            line_items=[{
                "price_data": {
                    "currency": plan["currency"],
                    "unit_amount": plan["price"],
                    "product_data": {"name": f"QR Cloner — {plan['name']}"},
                    "recurring": {"interval": plan.get("interval","month")},
                },
                "quantity": 1
            }],
            success_url=success_url + "?session_id={CHECKOUT_SESSION_ID}",
            cancel_url=cancel_url,
        )
        return {"id": session["id"], "url": session["url"]}
    except Exception as e:
        logger.error({"event":"stripe_checkout_error", "error": str(e)})
        raise HTTPException(status_code=500, detail="Stripe error")

@router.post("/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature")
    secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig, secret)
    except Exception as e:
        logger.error({"event":"stripe_webhook_error","error":str(e)})
        return JSONResponse(status_code=400, content={"ok": False})
    if event["type"] == "checkout.session.completed":
        data = event["data"]["object"]
        logger.info({"event":"checkout.completed","session":data.get("id")})
        # TODO: update DB: accounts.plan = selected
    return {"ok": True}
