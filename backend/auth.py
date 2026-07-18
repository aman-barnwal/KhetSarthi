import os
import secrets
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from fastapi import Request, HTTPException, Depends
from bson import ObjectId

JWT_ALGORITHM = "HS256"


def get_db():
    from server import db
    return db


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def _secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "type": "access",
               "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "type": "refresh",
               "exp": datetime.now(timezone.utc) + timedelta(days=30)}
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)


def public_user(user: dict) -> dict:
    return {
        "id": str(user["_id"]),
        "name": user.get("name"),
        "email": user.get("email"),
        "role": user.get("role"),
        "language": user.get("language"),
        "onboarded": user.get("onboarded", False),
        "farmer_profile": user.get("farmer_profile"),
        "vendor_profile": user.get("vendor_profile"),
        "notification_prefs": user.get("notification_prefs"),
        "location": user.get("location"),
        "verified": user.get("verified", False),
        "active": user.get("active", True),
        "created_at": user.get("created_at"),
    }


async def get_current_user(request: Request) -> dict:
    db = get_db()
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, _secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        if not user.get("active", True):
            raise HTTPException(status_code=403, detail="Account deactivated")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_role(*roles):
    async def checker(user: dict = Depends(get_current_user)):
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Permission denied for your role")
        return user
    return checker


async def check_brute_force(db, identifier: str):
    rec = await db.login_attempts.find_one({"identifier": identifier})
    if rec and rec.get("count", 0) >= 5:
        locked_at = rec.get("locked_at")
        if locked_at and (datetime.now(timezone.utc) - datetime.fromisoformat(locked_at)).total_seconds() < 900:
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in 15 minutes.")
        await db.login_attempts.delete_one({"identifier": identifier})


async def record_failed_login(db, identifier: str):
    rec = await db.login_attempts.find_one({"identifier": identifier})
    count = (rec.get("count", 0) if rec else 0) + 1
    update = {"count": count}
    if count >= 5:
        update["locked_at"] = datetime.now(timezone.utc).isoformat()
    await db.login_attempts.update_one({"identifier": identifier}, {"$set": update}, upsert=True)


async def clear_failed_logins(db, identifier: str):
    await db.login_attempts.delete_one({"identifier": identifier})


def make_reset_token() -> str:
    return secrets.token_urlsafe(32)
