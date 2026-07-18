from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="Krishiyog API")

api_router = APIRouter(prefix="/api")


@api_router.get("/health")
async def health():
    return {"status": "ok", "service": "krishiyog"}


from routes import router as feature_router
api_router.include_router(feature_router)
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    from auth import hash_password, verify_password
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.notifications.create_index([("user_id", 1), ("created_at", -1)])
    await db.demand_posts.create_index([("commodity", 1), ("status", 1)])
    await db.harvests.create_index([("commodity", 1), ("status", 1)])
    await db.listings.create_index([("listing_type", 1), ("status", 1)])
    for coll in ["crops", "diary", "expenses", "reminders", "chat_messages", "scans", "enquiries"]:
        await db[coll].create_index("user_id")
    admin_email = (os.environ.get("ADMIN_EMAIL") or "").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD")
    if admin_email and admin_password:
        # single-admin policy: demote any other admin accounts
        await db.users.update_many({"role": "admin", "email": {"$ne": admin_email}}, {"$set": {"role": None}})
        existing = await db.users.find_one({"email": admin_email})
        if existing is None:
            await db.users.insert_one({
                "email": admin_email, "password_hash": hash_password(admin_password),
                "name": "Krishiyog Admin", "role": "admin", "language": "en", "onboarded": True,
                "verified": True, "active": True, "created_at": datetime.now(timezone.utc).isoformat()})
            logger.info("Admin user seeded")
        elif not verify_password(admin_password, existing.get("password_hash", "")):
            await db.users.update_one({"email": admin_email},
                                      {"$set": {"password_hash": hash_password(admin_password), "role": "admin"}})


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
