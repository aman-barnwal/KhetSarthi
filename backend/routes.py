import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, Response, Query
from fastapi.responses import StreamingResponse
from bson import ObjectId

from models import (RegisterInput, LoginInput, ForgotInput, ResetInput, ProfileUpdate,
                    CropInput, DiaryInput, ExpenseInput, ReminderInput, DemandInput,
                    HarvestInput, ListingInput, EnquiryInput, ChatInput, ScanContext,
                    PriceAlertInput, ManagedPriceInput, BulkPriceUpdate, VendorCreateInput, now_iso)
from auth import (hash_password, verify_password, create_access_token, create_refresh_token,
                  public_user, get_current_user, require_role, check_brute_force,
                  record_failed_login, clear_failed_logins, make_reset_token)
from services import WeatherService, GeocodingService, MarketPriceService, AIService, VisionService
from schemes_data import SCHEMES, FAQS, COMMODITIES

logger = logging.getLogger("routes")
router = APIRouter()


def get_db():
    from server import db
    return db


def oid(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")


def serialize(doc: dict) -> dict:
    if doc is None:
        return None
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    return doc


def set_auth_cookies(response: Response, user_id: str, email: str):
    response.set_cookie("access_token", create_access_token(user_id, email), httponly=True,
                        secure=True, samesite="none", max_age=604800, path="/")
    response.set_cookie("refresh_token", create_refresh_token(user_id), httponly=True,
                        secure=True, samesite="none", max_age=2592000, path="/")


async def notify(db, user_id: str, ntype: str, title: str, body: str, link: str = None):
    await db.notifications.insert_one({
        "user_id": user_id, "type": ntype, "title": title, "body": body,
        "link": link, "read": False, "created_at": now_iso()})


# ================= AUTH =================
@router.post("/auth/register")
async def register(data: RegisterInput, response: Response):
    db = get_db()
    email = data.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    doc = {"name": data.name.strip(), "email": email, "password_hash": hash_password(data.password),
           "role": None, "language": None, "onboarded": False, "verified": False, "active": True,
           "created_at": now_iso()}
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    set_auth_cookies(response, str(res.inserted_id), email)
    return public_user(doc)


@router.post("/auth/login")
async def login(data: LoginInput, request: Request, response: Response):
    db = get_db()
    email = data.email.lower().strip()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    await check_brute_force(db, identifier)
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user.get("password_hash", "")):
        await record_failed_login(db, identifier)
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if not user.get("active", True):
        raise HTTPException(status_code=403, detail="Account deactivated. Contact support.")
    await clear_failed_logins(db, identifier)
    set_auth_cookies(response, str(user["_id"]), email)
    return public_user(user)


@router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}


@router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


@router.post("/auth/forgot-password")
async def forgot_password(data: ForgotInput):
    db = get_db()
    user = await db.users.find_one({"email": data.email.lower().strip()})
    if user:
        token = make_reset_token()
        await db.password_reset_tokens.insert_one({
            "token": token, "user_id": str(user["_id"]), "used": False,
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=1)})
        logger.info(f"PASSWORD RESET TOKEN for {data.email}: {token}")
        return {"ok": True, "message": "Reset link generated", "reset_token": token}
    return {"ok": True, "message": "If the account exists, a reset link has been generated"}


@router.post("/auth/reset-password")
async def reset_password(data: ResetInput):
    db = get_db()
    rec = await db.password_reset_tokens.find_one({"token": data.token, "used": False})
    if not rec or rec["expires_at"].replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    await db.users.update_one({"_id": oid(rec["user_id"])}, {"$set": {"password_hash": hash_password(data.password)}})
    await db.password_reset_tokens.update_one({"token": data.token}, {"$set": {"used": True}})
    return {"ok": True}


@router.put("/profile")
async def update_profile(data: ProfileUpdate, user: dict = Depends(get_current_user)):
    db = get_db()
    update = {k: v for k, v in data.model_dump(exclude_none=True).items()}
    if "role" in update:
        if update["role"] not in ("farmer", "vendor"):
            raise HTTPException(status_code=400, detail="Invalid role")
        if user.get("role") == "admin":
            update.pop("role")
    await db.users.update_one({"_id": user["_id"]}, {"$set": update})
    fresh = await db.users.find_one({"_id": user["_id"]})
    return public_user(fresh)


@router.delete("/profile")
async def delete_account(user: dict = Depends(get_current_user)):
    db = get_db()
    uid = str(user["_id"])
    for coll in ["crops", "diary", "expenses", "reminders", "demand_posts", "harvests",
                 "listings", "enquiries", "notifications", "chat_messages", "scans", "price_alerts"]:
        await db[coll].delete_many({"user_id": uid})
    await db.users.delete_one({"_id": user["_id"]})
    return {"ok": True}


# ================= WEATHER & GEO =================
@router.get("/weather")
async def weather(lat: float, lon: float):
    try:
        return await WeatherService.get_forecast(lat, lon)
    except Exception:
        raise HTTPException(status_code=503, detail="Weather service is temporarily unavailable")


@router.get("/geocode/reverse")
async def geocode_reverse(lat: float, lon: float):
    return await GeocodingService.reverse(lat, lon)


@router.get("/geocode/search")
async def geocode_search(q: str):
    try:
        return await GeocodingService.search(q)
    except Exception:
        raise HTTPException(status_code=503, detail="Location search unavailable")


# ================= MANDI PRICES =================
@router.get("/prices")
async def prices(state: str = None, district: str = None, commodity: str = None,
                 limit: int = 50, offset: int = 0):
    return await MarketPriceService.get_prices(state, district, commodity, limit, offset)


@router.post("/price-alerts")
async def create_price_alert(data: PriceAlertInput, user: dict = Depends(get_current_user)):
    db = get_db()
    doc = data.model_dump()
    doc.update({"user_id": str(user["_id"]), "active": True, "created_at": now_iso()})
    res = await db.price_alerts.insert_one(doc)
    doc["_id"] = res.inserted_id
    return serialize(doc)


@router.get("/price-alerts")
async def list_price_alerts(user: dict = Depends(get_current_user)):
    db = get_db()
    docs = await db.price_alerts.find({"user_id": str(user["_id"])}).to_list(100)
    return [serialize(d) for d in docs]


@router.delete("/price-alerts/{alert_id}")
async def delete_price_alert(alert_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    await db.price_alerts.delete_one({"_id": oid(alert_id), "user_id": str(user["_id"])})
    return {"ok": True}


# ================= AI =================
@router.get("/ai/status")
async def ai_status():
    return {"configured": AIService.configured()}


@router.post("/ai/chat")
async def ai_chat(data: ChatInput, user: dict = Depends(get_current_user)):
    db = get_db()
    if not AIService.configured():
        raise HTTPException(status_code=503, detail="AI is not configured. Add GEMINI_API_KEY or GROQ_API_KEY on the server.")
    uid = str(user["_id"])
    session_id = data.session_id or str(uuid.uuid4())
    history = await db.chat_messages.find({"user_id": uid, "session_id": session_id}).sort("created_at", 1).to_list(20)
    hist = [{"role": h["role"], "content": h["content"]} for h in history]
    await db.chat_messages.insert_one({"user_id": uid, "session_id": session_id, "role": "user",
                                       "content": data.message, "created_at": now_iso()})

    async def gen():
        full = ""
        try:
            async for chunk in AIService.stream_chat(data.message, session_id, data.language or user.get("language") or "en", hist):
                full += chunk
                yield f"data: {chunk.replace(chr(10), '<|nl|>')}\n\n"
        except Exception as e:
            logger.error(f"chat stream error: {e}")
            yield "data: [ERROR]\n\n"
        if full:
            await db.chat_messages.insert_one({"user_id": uid, "session_id": session_id, "role": "assistant",
                                               "content": full, "created_at": now_iso()})
        yield f"data: [DONE:{session_id}]\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.get("/ai/history")
async def chat_history(session_id: str = None, user: dict = Depends(get_current_user)):
    db = get_db()
    q = {"user_id": str(user["_id"])}
    if session_id:
        q["session_id"] = session_id
    docs = await db.chat_messages.find(q).sort("created_at", 1).to_list(200)
    return [serialize(d) for d in docs]


@router.post("/ai/scan")
async def crop_scan(payload: dict, user: dict = Depends(get_current_user)):
    db = get_db()
    image_base64 = payload.get("image_base64")
    if not image_base64:
        raise HTTPException(status_code=400, detail="image_base64 required")
    if len(image_base64) > 8_000_000:
        raise HTTPException(status_code=400, detail="Image too large. Please use a smaller photo.")
    ctx = ScanContext(crop_type=payload.get("crop_type"), symptoms=payload.get("symptoms"),
                      growth_stage=payload.get("growth_stage"),
                      language=payload.get("language") or user.get("language") or "en")
    out = await VisionService.analyze_crop(image_base64, ctx)
    if not out.get("available"):
        raise HTTPException(status_code=503, detail="Crop scanning requires AI configuration (GEMINI_API_KEY)")
    doc = {"user_id": str(user["_id"]), "crop_type": ctx.crop_type, "symptoms": ctx.symptoms,
           "growth_stage": ctx.growth_stage, "result": out["result"],
           "image_base64": image_base64[:2_000_000], "created_at": now_iso()}
    res = await db.scans.insert_one(doc)
    return {"id": str(res.inserted_id), "result": out["result"], "created_at": doc["created_at"]}


@router.get("/ai/scans")
async def scan_history(user: dict = Depends(get_current_user)):
    db = get_db()
    docs = await db.scans.find({"user_id": str(user["_id"])}, {"image_base64": 0}).sort("created_at", -1).to_list(50)
    return [serialize(d) for d in docs]


# ================= CROPS / DIARY / EXPENSES / REMINDERS =================
async def _crud_create(coll, data, user):
    db = get_db()
    doc = data.model_dump(exclude_none=True)
    doc.update({"user_id": str(user["_id"]), "created_at": now_iso()})
    res = await db[coll].insert_one(doc)
    doc["_id"] = res.inserted_id
    return serialize(doc)


async def _crud_list(coll, user, sort_field="created_at", limit=200):
    db = get_db()
    docs = await db[coll].find({"user_id": str(user["_id"])}).sort(sort_field, -1).to_list(limit)
    return [serialize(d) for d in docs]


@router.post("/crops")
async def create_crop(data: CropInput, user: dict = Depends(get_current_user)):
    return await _crud_create("crops", data, user)


@router.get("/crops")
async def list_crops(user: dict = Depends(get_current_user)):
    return await _crud_list("crops", user)


@router.put("/crops/{crop_id}")
async def update_crop(crop_id: str, data: CropInput, user: dict = Depends(get_current_user)):
    db = get_db()
    await db.crops.update_one({"_id": oid(crop_id), "user_id": str(user["_id"])},
                              {"$set": data.model_dump(exclude_none=True)})
    return serialize(await db.crops.find_one({"_id": oid(crop_id)}))


@router.delete("/crops/{crop_id}")
async def delete_crop(crop_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    await db.crops.delete_one({"_id": oid(crop_id), "user_id": str(user["_id"])})
    return {"ok": True}


@router.post("/diary")
async def create_diary(data: DiaryInput, user: dict = Depends(get_current_user)):
    return await _crud_create("diary", data, user)


@router.get("/diary")
async def list_diary(user: dict = Depends(get_current_user)):
    return await _crud_list("diary", user, "date")


@router.delete("/diary/{entry_id}")
async def delete_diary(entry_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    await db.diary.delete_one({"_id": oid(entry_id), "user_id": str(user["_id"])})
    return {"ok": True}


@router.post("/expenses")
async def create_expense(data: ExpenseInput, user: dict = Depends(get_current_user)):
    return await _crud_create("expenses", data, user)


@router.get("/expenses")
async def list_expenses(user: dict = Depends(get_current_user)):
    return await _crud_list("expenses", user, "date")


@router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    await db.expenses.delete_one({"_id": oid(expense_id), "user_id": str(user["_id"])})
    return {"ok": True}


@router.get("/expenses/summary")
async def expense_summary(user: dict = Depends(get_current_user)):
    db = get_db()
    docs = await db.expenses.find({"user_id": str(user["_id"])}).to_list(2000)
    total_expense = sum(d["amount"] for d in docs if d.get("kind", "expense") == "expense")
    total_revenue = sum(d["amount"] for d in docs if d.get("kind") == "revenue")
    by_category, by_crop = {}, {}
    for d in docs:
        if d.get("kind", "expense") == "expense":
            by_category[d["category"]] = by_category.get(d["category"], 0) + d["amount"]
        cid = d.get("crop_id") or "general"
        entry = by_crop.setdefault(cid, {"expense": 0, "revenue": 0})
        entry["expense" if d.get("kind", "expense") == "expense" else "revenue"] += d["amount"]
    return {"total_expense": total_expense, "total_revenue": total_revenue,
            "profit": total_revenue - total_expense, "by_category": by_category, "by_crop": by_crop}


@router.post("/reminders")
async def create_reminder(data: ReminderInput, user: dict = Depends(get_current_user)):
    return await _crud_create("reminders", data, user)


@router.get("/reminders")
async def list_reminders(user: dict = Depends(get_current_user)):
    db = get_db()
    docs = await db.reminders.find({"user_id": str(user["_id"])}).sort("due_date", 1).to_list(200)
    return [serialize(d) for d in docs]


@router.patch("/reminders/{rid}")
async def toggle_reminder(rid: str, payload: dict, user: dict = Depends(get_current_user)):
    db = get_db()
    await db.reminders.update_one({"_id": oid(rid), "user_id": str(user["_id"])},
                                  {"$set": {"done": bool(payload.get("done", True))}})
    return {"ok": True}


@router.delete("/reminders/{rid}")
async def delete_reminder(rid: str, user: dict = Depends(get_current_user)):
    db = get_db()
    await db.reminders.delete_one({"_id": oid(rid), "user_id": str(user["_id"])})
    return {"ok": True}


# ================= DEMAND & SUPPLY =================
@router.get("/commodities")
async def commodities():
    return COMMODITIES


@router.post("/demand")
async def create_demand(data: DemandInput, user: dict = Depends(require_role("vendor", "admin"))):
    db = get_db()
    doc = data.model_dump(exclude_none=True)
    doc.update({"user_id": str(user["_id"]), "poster_name": user.get("vendor_profile", {}).get("business_name") or user["name"],
                "status": "open", "created_at": now_iso()})
    res = await db.demand_posts.insert_one(doc)
    doc["_id"] = res.inserted_id
    commodity = data.commodity.lower()
    matches = await db.harvests.find({"commodity": {"$regex": f"^{commodity}$", "$options": "i"}, "status": "open"}).to_list(50)
    notified = set()
    for h in matches:
        if h["user_id"] not in notified:
            await notify(db, h["user_id"], "demand_match", "New buyer demand matches your harvest",
                         f"{doc['poster_name']} needs {data.quantity} {data.unit} of {data.commodity}", "/demand")
            notified.add(h["user_id"])
    return serialize(doc)


@router.get("/demand")
async def list_demand(commodity: str = None, state: str = None, mine: bool = False,
                      user: dict = Depends(get_current_user)):
    db = get_db()
    q = {}
    if mine:
        q["user_id"] = str(user["_id"])
    else:
        q["status"] = "open"
    if commodity:
        q["commodity"] = {"$regex": f"^{commodity}$", "$options": "i"}
    if state:
        q["state"] = {"$regex": state, "$options": "i"}
    docs = await db.demand_posts.find(q).sort("created_at", -1).to_list(200)
    return [serialize(d) for d in docs]


@router.patch("/demand/{did}")
async def update_demand(did: str, payload: dict, user: dict = Depends(get_current_user)):
    db = get_db()
    q = {"_id": oid(did)}
    if user.get("role") != "admin":
        q["user_id"] = str(user["_id"])
    status = payload.get("status")
    if status not in ("open", "fulfilled", "cancelled"):
        raise HTTPException(status_code=400, detail="Invalid status")
    await db.demand_posts.update_one(q, {"$set": {"status": status}})
    return {"ok": True}


@router.post("/harvests")
async def declare_harvest(data: HarvestInput, user: dict = Depends(require_role("farmer", "admin"))):
    db = get_db()
    doc = data.model_dump(exclude_none=True)
    doc.update({"user_id": str(user["_id"]), "farmer_name": user["name"], "status": "open", "created_at": now_iso()})
    res = await db.harvests.insert_one(doc)
    doc["_id"] = res.inserted_id
    matches = await db.demand_posts.find({"commodity": {"$regex": f"^{data.commodity}$", "$options": "i"}, "status": "open"}).to_list(50)
    notified = set()
    for m in matches:
        if m["user_id"] not in notified:
            await notify(db, m["user_id"], "supply_match", "Upcoming harvest matches your demand",
                         f"A farmer expects {data.expected_quantity} {data.unit} of {data.commodity}", "/demand")
            notified.add(m["user_id"])
    return serialize(doc)


@router.get("/harvests")
async def list_harvests(commodity: str = None, mine: bool = False, user: dict = Depends(get_current_user)):
    db = get_db()
    q = {}
    if mine:
        q["user_id"] = str(user["_id"])
    else:
        q["status"] = "open"
    if commodity:
        q["commodity"] = {"$regex": f"^{commodity}$", "$options": "i"}
    docs = await db.harvests.find(q).sort("created_at", -1).to_list(200)
    out = []
    for d in docs:
        s = serialize(d)
        if s["user_id"] != str(user["_id"]) and user.get("role") != "admin":
            s.pop("user_id", None)
        out.append(s)
    return out


@router.get("/matches")
async def my_matches(user: dict = Depends(get_current_user)):
    db = get_db()
    uid = str(user["_id"])
    if user.get("role") == "farmer":
        my_items = await db.harvests.find({"user_id": uid, "status": "open"}).to_list(50)
        my_crops = await db.crops.find({"user_id": uid}).to_list(50)
        names = {h["commodity"].lower() for h in my_items} | {c["name"].lower() for c in my_crops}
        if not names:
            return []
        docs = await db.demand_posts.find({"status": "open"}).sort("created_at", -1).to_list(300)
        return [serialize(d) for d in docs if d["commodity"].lower() in names][:50]
    else:
        my_demands = await db.demand_posts.find({"user_id": uid, "status": "open"}).to_list(50)
        names = {d["commodity"].lower() for d in my_demands}
        if not names:
            return []
        docs = await db.harvests.find({"status": "open"}).sort("created_at", -1).to_list(300)
        out = []
        for d in docs:
            if d["commodity"].lower() in names:
                s = serialize(d)
                s.pop("user_id", None)
                out.append(s)
        return out[:50]


# ================= MARKETPLACE =================
@router.post("/listings")
async def create_listing(data: ListingInput, user: dict = Depends(get_current_user)):
    db = get_db()
    if data.listing_type == "input" and user.get("role") not in ("vendor", "admin"):
        raise HTTPException(status_code=403, detail="Only vendors can list inputs and services")
    if data.listing_type == "produce" and user.get("role") not in ("farmer", "admin"):
        raise HTTPException(status_code=403, detail="Only farmers can list produce")
    doc = data.model_dump(exclude_none=True)
    if doc.get("image_base64") and len(doc["image_base64"]) > 3_000_000:
        raise HTTPException(status_code=400, detail="Image too large")
    doc.update({"user_id": str(user["_id"]),
                "seller_name": (user.get("vendor_profile") or {}).get("business_name") or user["name"],
                "seller_verified": user.get("verified", False),
                "status": "active", "created_at": now_iso()})
    res = await db.listings.insert_one(doc)
    doc["_id"] = res.inserted_id
    return serialize(doc)


@router.get("/listings")
async def list_listings(listing_type: str = None, commodity: str = None, category: str = None,
                        q: str = None, mine: bool = False, user: dict = Depends(get_current_user)):
    db = get_db()
    query = {}
    if mine:
        query["user_id"] = str(user["_id"])
    else:
        query["status"] = "active"
    if listing_type:
        query["listing_type"] = listing_type
    if commodity:
        query["commodity"] = {"$regex": commodity, "$options": "i"}
    if category:
        query["category"] = category
    if q:
        query["$or"] = [{"title": {"$regex": q, "$options": "i"}}, {"description": {"$regex": q, "$options": "i"}}]
    docs = await db.listings.find(query).sort("created_at", -1).to_list(200)
    return [serialize(d) for d in docs]


@router.patch("/listings/{lid}")
async def update_listing(lid: str, payload: dict, user: dict = Depends(get_current_user)):
    db = get_db()
    q = {"_id": oid(lid)}
    if user.get("role") != "admin":
        q["user_id"] = str(user["_id"])
    status = payload.get("status")
    if status not in ("active", "sold", "paused", "removed"):
        raise HTTPException(status_code=400, detail="Invalid status")
    await db.listings.update_one(q, {"$set": {"status": status}})
    return {"ok": True}


ENQUIRY_STATES = ["new", "accepted", "preparing", "ready", "dispatched", "delivered", "cancelled", "disputed"]


@router.post("/enquiries")
async def create_enquiry(data: EnquiryInput, user: dict = Depends(get_current_user)):
    db = get_db()
    target_user, subject = None, None
    if data.listing_id:
        listing = await db.listings.find_one({"_id": oid(data.listing_id)})
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        target_user, subject = listing["user_id"], listing["title"]
    elif data.demand_id:
        demand = await db.demand_posts.find_one({"_id": oid(data.demand_id)})
        if not demand:
            raise HTTPException(status_code=404, detail="Demand post not found")
        target_user, subject = demand["user_id"], f"Demand: {demand['commodity']}"
    else:
        raise HTTPException(status_code=400, detail="listing_id or demand_id required")
    if target_user == str(user["_id"]):
        raise HTTPException(status_code=400, detail="You cannot enquire on your own post")
    doc = data.model_dump(exclude_none=True)
    doc.update({"from_user_id": str(user["_id"]), "from_name": user["name"], "to_user_id": target_user,
                "subject": subject, "status": "new", "created_at": now_iso()})
    res = await db.enquiries.insert_one(doc)
    doc["_id"] = res.inserted_id
    await notify(db, target_user, "enquiry", "New enquiry received", f"{user['name']}: {data.message[:80]}", "/market")
    return serialize(doc)


@router.get("/enquiries")
async def list_enquiries(box: str = "inbox", user: dict = Depends(get_current_user)):
    db = get_db()
    field = "to_user_id" if box == "inbox" else "from_user_id"
    docs = await db.enquiries.find({field: str(user["_id"])}).sort("created_at", -1).to_list(200)
    return [serialize(d) for d in docs]


@router.patch("/enquiries/{eid}")
async def update_enquiry(eid: str, payload: dict, user: dict = Depends(get_current_user)):
    db = get_db()
    status = payload.get("status")
    if status not in ENQUIRY_STATES:
        raise HTTPException(status_code=400, detail="Invalid status")
    enquiry = await db.enquiries.find_one({"_id": oid(eid)})
    if not enquiry:
        raise HTTPException(status_code=404, detail="Not found")
    uid = str(user["_id"])
    if uid not in (enquiry["to_user_id"], enquiry["from_user_id"]) and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Permission denied")
    await db.enquiries.update_one({"_id": oid(eid)}, {"$set": {"status": status}})
    other = enquiry["from_user_id"] if uid == enquiry["to_user_id"] else enquiry["to_user_id"]
    await notify(db, other, "enquiry_update", "Enquiry status updated", f"'{enquiry['subject']}' is now {status}", "/market")
    return {"ok": True}


# ================= VENDOR DIRECTORY =================
@router.get("/vendors")
async def vendor_directory(category: str = None, q: str = None, verified_only: bool = False,
                           user: dict = Depends(get_current_user)):
    db = get_db()
    query = {"role": "vendor", "onboarded": True, "active": True}
    docs = await db.users.find(query).to_list(500)
    out = []
    for d in docs:
        vp = d.get("vendor_profile") or {}
        if category and category not in (vp.get("categories") or []):
            continue
        if verified_only and not d.get("verified"):
            continue
        if q and q.lower() not in (vp.get("business_name", "") + " " + " ".join(vp.get("categories") or [])).lower():
            continue
        out.append({"id": str(d["_id"]), "business_name": vp.get("business_name") or d["name"],
                    "categories": vp.get("categories") or [], "service_area": vp.get("service_area"),
                    "location": vp.get("location_text"), "delivery": vp.get("delivery"),
                    "contact": vp.get("contact_public") and vp.get("contact"),
                    "verified": d.get("verified", False)})
    return out


# ================= NOTIFICATIONS =================
@router.get("/notifications")
async def list_notifications(user: dict = Depends(get_current_user)):
    db = get_db()
    docs = await db.notifications.find({"user_id": str(user["_id"])}).sort("created_at", -1).to_list(100)
    return [serialize(d) for d in docs]


@router.patch("/notifications/read-all")
async def read_all_notifications(user: dict = Depends(get_current_user)):
    db = get_db()
    await db.notifications.update_many({"user_id": str(user["_id"])}, {"$set": {"read": True}})
    return {"ok": True}


@router.patch("/notifications/{nid}")
async def read_notification(nid: str, user: dict = Depends(get_current_user)):
    db = get_db()
    await db.notifications.update_one({"_id": oid(nid), "user_id": str(user["_id"])}, {"$set": {"read": True}})
    return {"ok": True}


# ================= SCHEMES / FAQ / SEARCH =================
@router.get("/schemes")
async def schemes(category: str = None):
    items = SCHEMES
    if category:
        items = [s for s in items if s["category"] == category]
    return {"source": "Official central government scheme portals", "schemes": items}


@router.get("/faqs")
async def faqs(topic: str = None, q: str = None):
    items = FAQS
    if topic:
        items = [f for f in items if f["topic"] == topic]
    if q:
        items = [f for f in items if q.lower() in (f["q"] + f["a"]).lower()]
    return items


@router.get("/search")
async def global_search(q: str = Query(min_length=2), user: dict = Depends(get_current_user)):
    db = get_db()
    ql = q.lower()
    results = {"commodities": [c for c in COMMODITIES if ql in c["name"].lower()][:5],
               "schemes": [{"id": s["id"], "name": s["name"], "summary": s["summary"]} for s in SCHEMES if ql in (s["name"] + s["summary"]).lower()][:5],
               "faqs": [f for f in FAQS if ql in (f["q"] + f["a"]).lower()][:5]}
    listings = await db.listings.find({"status": "active", "$or": [
        {"title": {"$regex": q, "$options": "i"}}, {"commodity": {"$regex": q, "$options": "i"}}]}).to_list(5)
    demands = await db.demand_posts.find({"status": "open", "commodity": {"$regex": q, "$options": "i"}}).to_list(5)
    results["listings"] = [serialize(d) for d in listings]
    results["demand"] = [serialize(d) for d in demands]
    vendors = await db.users.find({"role": "vendor", "onboarded": True}).to_list(200)
    results["vendors"] = [{"id": str(v["_id"]), "business_name": (v.get("vendor_profile") or {}).get("business_name") or v["name"]}
                          for v in vendors if ql in ((v.get("vendor_profile") or {}).get("business_name") or v["name"]).lower()][:5]
    return results


# ================= DASHBOARD =================
@router.get("/dashboard")
async def dashboard(user: dict = Depends(get_current_user)):
    db = get_db()
    uid = str(user["_id"])
    unread = await db.notifications.count_documents({"user_id": uid, "read": False})
    if user.get("role") == "farmer":
        crops = await db.crops.find({"user_id": uid}).to_list(20)
        reminders = await db.reminders.find({"user_id": uid, "done": {"$ne": True}}).sort("due_date", 1).to_list(5)
        expenses = await db.expenses.find({"user_id": uid}).to_list(1000)
        total_expense = sum(e["amount"] for e in expenses if e.get("kind", "expense") == "expense")
        total_revenue = sum(e["amount"] for e in expenses if e.get("kind") == "revenue")
        demands = await db.demand_posts.find({"status": "open"}).sort("created_at", -1).to_list(100)
        crop_names = {c["name"].lower() for c in crops}
        harvests = await db.harvests.find({"user_id": uid, "status": "open"}).to_list(20)
        crop_names |= {h["commodity"].lower() for h in harvests}
        matched = [serialize(d) for d in demands if d["commodity"].lower() in crop_names][:5]
        scans = await db.scans.find({"user_id": uid}, {"image_base64": 0}).sort("created_at", -1).to_list(3)
        return {"role": "farmer", "unread_notifications": unread,
                "crops": [serialize(c) for c in crops], "reminders": [serialize(r) for r in reminders],
                "expense_summary": {"expense": total_expense, "revenue": total_revenue, "profit": total_revenue - total_expense},
                "demand_matches": matched, "recent_demand": [serialize(d) for d in demands[:5]],
                "recent_scans": [serialize(s) for s in scans]}
    elif user.get("role") == "vendor":
        my_demands = await db.demand_posts.find({"user_id": uid}).sort("created_at", -1).to_list(10)
        my_listings = await db.listings.find({"user_id": uid}).sort("created_at", -1).to_list(10)
        enquiries_in = await db.enquiries.find({"to_user_id": uid}).sort("created_at", -1).to_list(10)
        open_demand_names = {d["commodity"].lower() for d in my_demands if d.get("status") == "open"}
        harvests = await db.harvests.find({"status": "open"}).sort("created_at", -1).to_list(200)
        supply_matches = []
        for h in harvests:
            if h["commodity"].lower() in open_demand_names:
                s = serialize(h)
                s.pop("user_id", None)
                supply_matches.append(s)
        return {"role": "vendor", "unread_notifications": unread,
                "my_demands": [serialize(d) for d in my_demands],
                "my_listings": [serialize(d) for d in my_listings],
                "enquiries": [serialize(e) for e in enquiries_in],
                "supply_matches": supply_matches[:5], "verified": user.get("verified", False)}
    else:
        return {"role": user.get("role"), "unread_notifications": unread}


# ================= ADMIN =================
@router.get("/admin/stats")
async def admin_stats(user: dict = Depends(require_role("admin"))):
    db = get_db()
    return {
        "total_users": await db.users.count_documents({}),
        "farmers": await db.users.count_documents({"role": "farmer"}),
        "vendors": await db.users.count_documents({"role": "vendor"}),
        "onboarded": await db.users.count_documents({"onboarded": True}),
        "demand_posts": await db.demand_posts.count_documents({}),
        "open_demand": await db.demand_posts.count_documents({"status": "open"}),
        "harvest_declarations": await db.harvests.count_documents({}),
        "listings": await db.listings.count_documents({}),
        "enquiries": await db.enquiries.count_documents({}),
        "crop_scans": await db.scans.count_documents({}),
        "ai_messages": await db.chat_messages.count_documents({}),
    }


@router.get("/admin/users")
async def admin_users(role: str = None, user: dict = Depends(require_role("admin"))):
    db = get_db()
    q = {}
    if role:
        q["role"] = role
    docs = await db.users.find(q).sort("created_at", -1).to_list(500)
    return [public_user(d) for d in docs]


@router.patch("/admin/users/{uid}")
async def admin_update_user(uid: str, payload: dict, user: dict = Depends(require_role("admin"))):
    db = get_db()
    update = {}
    if "verified" in payload:
        update["verified"] = bool(payload["verified"])
    if "active" in payload:
        update["active"] = bool(payload["active"])
    if not update:
        raise HTTPException(status_code=400, detail="Nothing to update")
    await db.users.update_one({"_id": oid(uid)}, {"$set": update})
    return {"ok": True}


@router.get("/admin/moderation")
async def admin_moderation(user: dict = Depends(require_role("admin"))):
    db = get_db()
    listings = await db.listings.find({}).sort("created_at", -1).to_list(100)
    demands = await db.demand_posts.find({}).sort("created_at", -1).to_list(100)
    return {"listings": [serialize(d) for d in listings], "demand": [serialize(d) for d in demands]}


# ---- Managed reference prices (admin-curated: MSP / market / FPO rates) ----
@router.get("/managed-prices")
async def managed_prices(user: dict = Depends(get_current_user)):
    db = get_db()
    docs = await db.managed_prices.find({}).sort("commodity", 1).to_list(500)
    return [serialize(d) for d in docs]


@router.post("/admin/prices")
async def create_managed_price(data: ManagedPriceInput, user: dict = Depends(require_role("admin"))):
    db = get_db()
    doc = data.model_dump()
    doc.update({"updated_at": now_iso(), "updated_by": str(user["_id"])})
    existing = await db.managed_prices.find_one({"commodity": {"$regex": f"^{data.commodity}$", "$options": "i"}})
    if existing:
        await db.managed_prices.update_one({"_id": existing["_id"]}, {"$set": doc})
        return serialize(await db.managed_prices.find_one({"_id": existing["_id"]}))
    res = await db.managed_prices.insert_one(doc)
    doc["_id"] = res.inserted_id
    return serialize(doc)


@router.patch("/admin/prices/{pid}")
async def update_managed_price(pid: str, payload: dict, user: dict = Depends(require_role("admin"))):
    db = get_db()
    update = {k: payload[k] for k in ("msp", "market_price", "fpo_price", "unit", "commodity") if k in payload}
    if not update:
        raise HTTPException(status_code=400, detail="Nothing to update")
    update["updated_at"] = now_iso()
    await db.managed_prices.update_one({"_id": oid(pid)}, {"$set": update})
    return serialize(await db.managed_prices.find_one({"_id": oid(pid)}))


@router.delete("/admin/prices/{pid}")
async def delete_managed_price(pid: str, user: dict = Depends(require_role("admin"))):
    db = get_db()
    await db.managed_prices.delete_one({"_id": oid(pid)})
    return {"ok": True}


@router.post("/admin/prices/bulk")
async def bulk_update_prices(data: BulkPriceUpdate, user: dict = Depends(require_role("admin"))):
    db = get_db()
    if data.field not in ("msp", "market_price", "fpo_price"):
        raise HTTPException(status_code=400, detail="Invalid price field")
    q = {}
    if data.ids:
        q["_id"] = {"$in": [oid(i) for i in data.ids]}
    docs = await db.managed_prices.find(q).to_list(500)
    updated = 0
    for d in docs:
        cur = d.get(data.field)
        if data.mode == "set":
            new_val = data.value
        else:
            if cur is None:
                continue
            new_val = round(cur * (1 + data.value / 100), 2)
        await db.managed_prices.update_one({"_id": d["_id"]}, {"$set": {data.field: new_val, "updated_at": now_iso()}})
        updated += 1
    return {"ok": True, "updated": updated}


# ---- Admin vendor management ----
@router.post("/admin/vendors")
async def admin_create_vendor(data: VendorCreateInput, user: dict = Depends(require_role("admin"))):
    db = get_db()
    email = data.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    doc = {"name": data.name, "email": email, "password_hash": hash_password(data.password),
           "role": "vendor", "language": "en", "onboarded": True, "verified": data.verified,
           "active": True, "created_at": now_iso(),
           "vendor_profile": {"business_name": data.business_name, "contact": data.contact,
                              "categories": data.categories, "service_area": data.service_area,
                              "location_text": data.location_text, "delivery": False, "contact_public": True}}
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    return public_user(doc)


@router.get("/admin/vendors/{uid}/listings")
async def admin_vendor_listings(uid: str, user: dict = Depends(require_role("admin"))):
    db = get_db()
    docs = await db.listings.find({"user_id": uid}).sort("created_at", -1).to_list(200)
    return [serialize(d) for d in docs]


@router.delete("/admin/vendors/{uid}")
async def admin_remove_vendor(uid: str, user: dict = Depends(require_role("admin"))):
    """Soft removal: account deactivated + listings hidden. History (enquiries, past posts) is preserved."""
    db = get_db()
    target = await db.users.find_one({"_id": oid(uid)})
    if not target or target.get("role") != "vendor":
        raise HTTPException(status_code=404, detail="Vendor not found")
    await db.users.update_one({"_id": oid(uid)}, {"$set": {"active": False, "removed": True}})
    await db.listings.update_many({"user_id": uid}, {"$set": {"status": "removed"}})
    await db.demand_posts.update_many({"user_id": uid, "status": "open"}, {"$set": {"status": "cancelled"}})
    return {"ok": True}


@router.delete("/admin/content/{kind}/{cid}")
async def admin_remove_content(kind: str, cid: str, user: dict = Depends(require_role("admin"))):
    db = get_db()
    coll = {"listing": "listings", "demand": "demand_posts", "harvest": "harvests"}.get(kind)
    if not coll:
        raise HTTPException(status_code=400, detail="Invalid content kind")
    await db[coll].delete_one({"_id": oid(cid)})
    return {"ok": True}
