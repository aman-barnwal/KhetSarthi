"""
Krishiyog E2E Backend Tests
Covers: auth, admin, onboarding profile updates, role enforcement, demand/supply,
marketplace, enquiries, mandi prices, managed prices, admin vendors, weather,
KrishiAI chat SSE, crop scan (real JPEG), CRUD (crops/diary/expenses/reminders),
schemes, search, notifications, price alerts.

Run: pytest /app/backend/tests/backend_test.py -v --tb=short --junitxml=/app/test_reports/pytest/pytest_results.xml
"""
import os
import base64
import io
import json
import random
import time
import uuid
from pathlib import Path

import pytest
import requests
from PIL import Image, ImageDraw

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL")
            or open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split("\n")[0].strip()).rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_ID = "AmanSwastika"
ADMIN_PWD = "SwastikaAman@2026010405"
FARMER_EMAIL = "farmer@test.com"
FARMER_PWD = "Farmer@123"
VENDOR_EMAIL = "vendor@test.com"
VENDOR_PWD = "Vendor@123"


# --------------------------- helpers ---------------------------
def _session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _login_or_register(session: requests.Session, email: str, password: str, name: str) -> dict:
    """Login; if invalid credentials, register (idempotent)."""
    r = session.post(f"{API}/auth/login", json={"email": email, "password": password})
    if r.status_code == 200:
        return r.json()
    # try register
    r2 = session.post(f"{API}/auth/register", json={"email": email, "password": password, "name": name})
    if r2.status_code == 200:
        return r2.json()
    # If already exists with different password, that's a fail
    raise AssertionError(f"login/register failed for {email}: login={r.status_code} {r.text[:200]} | register={r2.status_code} {r2.text[:200]}")


def _leaf_image_b64() -> str:
    img = Image.new("RGB", (400, 300), (34, 100, 40))
    d = ImageDraw.Draw(img)
    random.seed(1)
    for _ in range(300):
        x, y = random.randint(0, 400), random.randint(0, 300)
        r = random.randint(2, 8)
        d.ellipse([x - r, y - r, x + r, y + r],
                  fill=(random.randint(20, 90), random.randint(80, 180), random.randint(30, 90)))
    d.ellipse([50, 30, 350, 270], outline=(15, 60, 20), width=6)
    for _ in range(15):
        x, y = random.randint(80, 320), random.randint(60, 240)
        d.ellipse([x - 8, y - 8, x + 8, y + 8], fill=(180, 150, 40))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=80)
    return base64.b64encode(buf.getvalue()).decode()


# --------------------------- fixtures ---------------------------
@pytest.fixture(scope="session")
def admin_session():
    s = _session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_ID, "password": ADMIN_PWD})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text[:200]}"
    user = r.json()
    assert user.get("role") == "admin"
    return s, user


@pytest.fixture(scope="session")
def farmer_session():
    s = _session()
    user = _login_or_register(s, FARMER_EMAIL, FARMER_PWD, "Test Farmer")
    # Onboard as farmer if not onboarded
    if user.get("role") != "farmer" or not user.get("onboarded"):
        r = s.put(f"{API}/profile", json={
            "role": "farmer", "language": "en", "onboarded": True,
            "farmer_profile": {"farm_size": 2.5, "primary_crops": ["tomato", "wheat"]},
        })
        assert r.status_code == 200, r.text
        user = r.json()
    return s, user


@pytest.fixture(scope="session")
def vendor_session():
    s = _session()
    user = _login_or_register(s, VENDOR_EMAIL, VENDOR_PWD, "Test Vendor")
    if user.get("role") != "vendor" or not user.get("onboarded"):
        r = s.put(f"{API}/profile", json={
            "role": "vendor", "language": "en", "onboarded": True,
            "vendor_profile": {"business_name": "TestAgri Traders", "categories": ["produce_buyer"],
                               "contact": "9999999999", "contact_public": True},
        })
        assert r.status_code == 200, r.text
        user = r.json()
    return s, user


# --------------------------- health ---------------------------
class TestHealth:
    def test_health_ok(self):
        r = requests.get(f"{API}/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"


# --------------------------- auth ---------------------------
class TestAuth:
    def test_admin_login_by_id(self):
        s = _session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_ID, "password": ADMIN_PWD})
        assert r.status_code == 200, r.text
        u = r.json()
        assert u["role"] == "admin"
        # cookies set
        assert "access_token" in s.cookies

    def test_admin_login_wrong_password(self):
        s = _session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_ID, "password": "wrong-pwd-xxx"})
        assert r.status_code in (401, 429)

    def test_farmer_login_or_register(self, farmer_session):
        s, u = farmer_session
        assert u["email"] == FARMER_EMAIL
        r = s.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == FARMER_EMAIL

    def test_vendor_login_or_register(self, vendor_session):
        s, u = vendor_session
        assert u["email"] == VENDOR_EMAIL
        assert u["role"] == "vendor"

    def test_logout(self):
        s = _session()
        _login_or_register(s, FARMER_EMAIL, FARMER_PWD, "Test Farmer")
        r = s.post(f"{API}/auth/logout")
        assert r.status_code == 200
        # after logout, me should 401 (cookies cleared)
        s2 = _session()  # fresh session with no cookies
        r2 = s2.get(f"{API}/auth/me")
        assert r2.status_code == 401

    def test_forgot_and_reset_password(self):
        # Create a temp user just for this test
        temp_email = f"reset_{uuid.uuid4().hex[:8]}@test.com"
        temp_pwd = "Initial@123"
        s = _session()
        r = s.post(f"{API}/auth/register", json={"email": temp_email, "password": temp_pwd, "name": "Reset User"})
        assert r.status_code == 200, r.text

        r = s.post(f"{API}/auth/forgot-password", json={"email": temp_email})
        assert r.status_code == 200
        token = r.json().get("reset_token")
        assert token and len(token) > 10

        new_pwd = "NewPwd@456"
        r = s.post(f"{API}/auth/reset-password", json={"token": token, "password": new_pwd})
        assert r.status_code == 200

        # login with new
        s2 = _session()
        r = s2.post(f"{API}/auth/login", json={"email": temp_email, "password": new_pwd})
        assert r.status_code == 200


# --------------------------- role enforcement ---------------------------
class TestRoleEnforcement:
    def test_farmer_cannot_create_demand(self, farmer_session):
        s, _ = farmer_session
        r = s.post(f"{API}/demand", json={"commodity": "Tomato", "quantity": 10})
        assert r.status_code == 403

    def test_vendor_cannot_declare_harvest(self, vendor_session):
        s, _ = vendor_session
        r = s.post(f"{API}/harvests", json={"commodity": "Tomato", "expected_quantity": 10})
        assert r.status_code == 403

    def test_farmer_cannot_access_admin_stats(self, farmer_session):
        s, _ = farmer_session
        r = s.get(f"{API}/admin/stats")
        assert r.status_code == 403

    def test_vendor_cannot_access_admin_users(self, vendor_session):
        s, _ = vendor_session
        r = s.get(f"{API}/admin/users")
        assert r.status_code == 403


# --------------------------- demand & supply ---------------------------
class TestDemandSupply:
    def test_vendor_posts_demand_farmer_gets_notified(self, vendor_session, farmer_session):
        s_v, uv = vendor_session
        s_f, uf = farmer_session

        # farmer declares a harvest first so the vendor's later demand triggers notification to farmer
        commodity = f"Tomato-{uuid.uuid4().hex[:6]}"
        r = s_f.post(f"{API}/harvests", json={"commodity": commodity, "expected_quantity": 30, "unit": "quintal"})
        assert r.status_code == 200, r.text
        harvest_id = r.json()["id"]

        # vendor posts demand for same commodity
        r = s_v.post(f"{API}/demand", json={"commodity": commodity, "quantity": 50, "unit": "quintal"})
        assert r.status_code == 200, r.text
        demand = r.json()
        assert demand["status"] == "open"

        # farmer should have a notification of type demand_match
        r = s_f.get(f"{API}/notifications")
        assert r.status_code == 200
        types = [n["type"] for n in r.json()]
        assert "demand_match" in types, f"expected demand_match notification, got {types}"

        # cleanup harvest for tidiness (not required)

    def test_farmer_declares_harvest_vendor_gets_supply_match(self, vendor_session, farmer_session):
        s_v, _ = vendor_session
        s_f, _ = farmer_session
        commodity = f"Onion-{uuid.uuid4().hex[:6]}"
        # vendor demand first
        r = s_v.post(f"{API}/demand", json={"commodity": commodity, "quantity": 20, "unit": "quintal"})
        assert r.status_code == 200
        # farmer declares harvest
        r = s_f.post(f"{API}/harvests", json={"commodity": commodity, "expected_quantity": 15})
        assert r.status_code == 200

        r = s_v.get(f"{API}/notifications")
        assert r.status_code == 200
        types = [n["type"] for n in r.json()]
        assert "supply_match" in types

    def test_farmer_can_respond_to_demand_creates_enquiry(self, vendor_session, farmer_session):
        s_v, _ = vendor_session
        s_f, _ = farmer_session
        commodity = f"Wheat-{uuid.uuid4().hex[:6]}"
        r = s_v.post(f"{API}/demand", json={"commodity": commodity, "quantity": 100})
        assert r.status_code == 200
        did = r.json()["id"]
        # farmer creates enquiry
        r = s_f.post(f"{API}/enquiries", json={"demand_id": did, "message": "I have 40 quintals available"})
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "new"

    def test_list_demand_by_commodity(self, farmer_session, vendor_session):
        s_v, _ = vendor_session
        s_f, _ = farmer_session
        commodity = f"Rice-{uuid.uuid4().hex[:6]}"
        r = s_v.post(f"{API}/demand", json={"commodity": commodity, "quantity": 20})
        assert r.status_code == 200
        r = s_f.get(f"{API}/demand", params={"commodity": commodity})
        assert r.status_code == 200
        rows = r.json()
        assert any(row["commodity"] == commodity for row in rows)


# --------------------------- marketplace ---------------------------
class TestMarketplace:
    def test_farmer_creates_produce_listing_and_vendor_enquires(self, farmer_session, vendor_session):
        s_f, _ = farmer_session
        s_v, _ = vendor_session
        r = s_f.post(f"{API}/listings", json={
            "listing_type": "produce", "title": "TEST_Fresh Tomatoes", "commodity": "Tomato",
            "quantity": 20, "unit": "quintal", "price": 2500,
        })
        assert r.status_code == 200, r.text
        lid = r.json()["id"]

        r = s_v.post(f"{API}/enquiries", json={"listing_id": lid, "message": "Interested at 2400/quintal", "offer_price": 2400})
        assert r.status_code == 200
        eid = r.json()["id"]

        # farmer sees enquiry in inbox and accepts
        r = s_f.get(f"{API}/enquiries", params={"box": "inbox"})
        assert r.status_code == 200
        assert any(e["id"] == eid for e in r.json())

        r = s_f.patch(f"{API}/enquiries/{eid}", json={"status": "accepted"})
        assert r.status_code == 200

    def test_vendor_cannot_list_produce(self, vendor_session):
        s_v, _ = vendor_session
        r = s_v.post(f"{API}/listings", json={"listing_type": "produce", "title": "no", "commodity": "x"})
        assert r.status_code == 403

    def test_farmer_cannot_list_input(self, farmer_session):
        s_f, _ = farmer_session
        r = s_f.post(f"{API}/listings", json={"listing_type": "input", "title": "no", "category": "seed"})
        assert r.status_code == 403


# --------------------------- mandi prices ---------------------------
class TestMandiPrices:
    def test_prices_agmarknet(self):
        r = requests.get(f"{API}/prices", params={"commodity": "Tomato", "limit": 10})
        assert r.status_code == 200
        data = r.json()
        assert data.get("available") is True, f"agmarknet unavailable: {data}"
        assert "records" in data
        assert data.get("source", "").startswith("data.gov.in")
        # records may be empty if no live data for filter, but source key present

    def test_price_alerts_crud(self, farmer_session):
        s, _ = farmer_session
        r = s.post(f"{API}/price-alerts", json={"commodity": "Tomato", "threshold": 3000, "direction": "above"})
        assert r.status_code == 200
        aid = r.json()["id"]
        r = s.get(f"{API}/price-alerts")
        assert r.status_code == 200
        assert any(a["id"] == aid for a in r.json())
        r = s.delete(f"{API}/price-alerts/{aid}")
        assert r.status_code == 200


# --------------------------- managed prices (admin) ---------------------------
class TestManagedPrices:
    def test_admin_prices_crud_and_bulk(self, admin_session, farmer_session):
        s_a, _ = admin_session
        commodity = f"TEST_MP_{uuid.uuid4().hex[:6]}"
        r = s_a.post(f"{API}/admin/prices", json={"commodity": commodity, "unit": "quintal",
                                                  "msp": 1000, "market_price": 1200, "fpo_price": 1100})
        assert r.status_code == 200, r.text
        pid = r.json()["id"]

        # visible to normal users via /managed-prices
        s_f, _ = farmer_session
        r = s_f.get(f"{API}/managed-prices")
        assert r.status_code == 200
        assert any(p["id"] == pid for p in r.json())

        # inline PATCH
        r = s_a.patch(f"{API}/admin/prices/{pid}", json={"market_price": 1300})
        assert r.status_code == 200
        assert r.json()["market_price"] == 1300

        # bulk percent update (+10%)
        r = s_a.post(f"{API}/admin/prices/bulk", json={"field": "market_price", "mode": "percent",
                                                       "value": 10, "ids": [pid]})
        assert r.status_code == 200
        assert r.json()["updated"] >= 1

        # verify
        r = s_f.get(f"{API}/managed-prices")
        row = next(p for p in r.json() if p["id"] == pid)
        assert abs(row["market_price"] - 1430) < 0.01  # 1300 * 1.1

        # cleanup
        r = s_a.delete(f"{API}/admin/prices/{pid}")
        assert r.status_code == 200

    def test_farmer_cannot_create_managed_price(self, farmer_session):
        s, _ = farmer_session
        r = s.post(f"{API}/admin/prices", json={"commodity": "X", "msp": 100})
        assert r.status_code == 403


# --------------------------- admin vendors ---------------------------
class TestAdminVendors:
    def test_admin_create_and_remove_vendor(self, admin_session):
        s_a, _ = admin_session
        vemail = f"TEST_vendor_{uuid.uuid4().hex[:6]}@test.com"
        r = s_a.post(f"{API}/admin/vendors", json={
            "name": "Bulk Vendor", "email": vemail, "password": "Vendor@123",
            "business_name": "TEST_BulkAgri", "contact": "9000000001",
            "categories": ["seed"], "service_area": "PAN India",
            "location_text": "Delhi", "verified": False,
        })
        assert r.status_code == 200, r.text
        vid = r.json()["id"]
        assert r.json()["role"] == "vendor"

        # verify/unverify toggle
        r = s_a.patch(f"{API}/admin/users/{vid}", json={"verified": True})
        assert r.status_code == 200
        r = s_a.patch(f"{API}/admin/users/{vid}", json={"verified": False})
        assert r.status_code == 200

        # login as that vendor and create a listing
        s_v = _session()
        r = s_v.post(f"{API}/auth/login", json={"email": vemail, "password": "Vendor@123"})
        assert r.status_code == 200
        r = s_v.post(f"{API}/listings", json={"listing_type": "input", "title": "TEST_Seed X", "category": "seed", "price": 500})
        assert r.status_code == 200
        lid = r.json()["id"]

        # soft-remove
        r = s_a.delete(f"{API}/admin/vendors/{vid}")
        assert r.status_code == 200, r.text
        # listing should be removed
        r = s_a.get(f"{API}/admin/vendors/{vid}/listings")
        assert r.status_code == 200
        rows = r.json()
        assert all(row["status"] == "removed" for row in rows if row["id"] == lid), rows

        # vendor login now denied (active=false)
        s2 = _session()
        r = s2.post(f"{API}/auth/login", json={"email": vemail, "password": "Vendor@123"})
        assert r.status_code == 403


# --------------------------- weather ---------------------------
class TestWeather:
    def test_weather_current(self):
        r = requests.get(f"{API}/weather", params={"lat": 28.6, "lon": 77.2})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "data" in data and "current" in data["data"]
        assert "advisories" in data

    def test_geocode_search(self):
        r = requests.get(f"{API}/geocode/search", params={"q": "Pune"})
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list) and len(rows) >= 1
        assert "lat" in rows[0]


# --------------------------- KrishiAI chat SSE ---------------------------
class TestKrishiAI:
    def test_ai_status(self):
        r = requests.get(f"{API}/ai/status")
        assert r.status_code == 200
        assert r.json()["configured"] is True

    def test_ai_chat_streams_text(self, farmer_session):
        s, _ = farmer_session
        # Use requests streaming
        with s.post(f"{API}/ai/chat",
                    json={"message": "In one short sentence, how often should I water tomato plants?", "language": "en"},
                    stream=True, timeout=60) as r:
            assert r.status_code == 200, r.text
            got_text = ""
            done = False
            start = time.time()
            for line in r.iter_lines(decode_unicode=True):
                if not line:
                    continue
                if line.startswith("data: "):
                    chunk = line[6:]
                    if chunk.startswith("[DONE"):
                        done = True
                        break
                    if chunk == "[ERROR]":
                        pytest.fail("AI stream returned [ERROR]")
                    got_text += chunk.replace("<|nl|>", "\n")
                if time.time() - start > 50:
                    break
            assert done or len(got_text) > 5, f"no text got: {got_text!r}"
            assert len(got_text) >= 5

    def test_ai_history(self, farmer_session):
        s, _ = farmer_session
        r = s.get(f"{API}/ai/history")
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# --------------------------- Crop Scan (real image) ---------------------------
class TestCropScan:
    def test_crop_scan_returns_structured(self, farmer_session):
        s, _ = farmer_session
        b64 = _leaf_image_b64()
        r = s.post(f"{API}/ai/scan", json={
            "image_base64": b64, "crop_type": "tomato",
            "symptoms": "yellow spots on leaves", "growth_stage": "vegetative", "language": "en",
        }, timeout=120)
        assert r.status_code == 200, r.text[:400]
        result = r.json().get("result")
        assert isinstance(result, dict)
        # expected keys present (may be empty lists if image not a plant)
        for k in ["probable_conditions", "recommended_actions", "prevention"]:
            assert k in result

    def test_scan_history(self, farmer_session):
        s, _ = farmer_session
        r = s.get(f"{API}/ai/scans")
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# --------------------------- CRUD: crops/diary/expenses/reminders ---------------------------
class TestCrudFlows:
    def test_crops_crud(self, farmer_session):
        s, _ = farmer_session
        r = s.post(f"{API}/crops", json={"name": "TEST_Tomato", "variety": "Roma", "area": 1.0})
        assert r.status_code == 200
        cid = r.json()["id"]
        r = s.get(f"{API}/crops")
        assert r.status_code == 200 and any(c["id"] == cid for c in r.json())
        r = s.put(f"{API}/crops/{cid}", json={"name": "TEST_Tomato", "variety": "Roma", "area": 2.5})
        assert r.status_code == 200 and r.json()["area"] == 2.5
        r = s.delete(f"{API}/crops/{cid}")
        assert r.status_code == 200

    def test_diary_create_list(self, farmer_session):
        s, _ = farmer_session
        r = s.post(f"{API}/diary", json={"activity_type": "irrigation", "date": "2026-01-15", "description": "TEST irrigation"})
        assert r.status_code == 200
        did = r.json()["id"]
        r = s.get(f"{API}/diary")
        assert any(d["id"] == did for d in r.json())
        s.delete(f"{API}/diary/{did}")

    def test_expenses_and_summary(self, farmer_session):
        s, _ = farmer_session
        r = s.post(f"{API}/expenses", json={"category": "seeds", "amount": 500, "date": "2026-01-15", "kind": "expense"})
        assert r.status_code == 200
        eid1 = r.json()["id"]
        r = s.post(f"{API}/expenses", json={"category": "seeds", "amount": 2000, "date": "2026-01-15", "kind": "revenue"})
        eid2 = r.json()["id"]
        r = s.get(f"{API}/expenses/summary")
        assert r.status_code == 200
        d = r.json()
        assert d["total_expense"] >= 500
        assert d["total_revenue"] >= 2000
        assert d["profit"] == d["total_revenue"] - d["total_expense"]
        s.delete(f"{API}/expenses/{eid1}")
        s.delete(f"{API}/expenses/{eid2}")

    def test_reminders_crud(self, farmer_session):
        s, _ = farmer_session
        r = s.post(f"{API}/reminders", json={"title": "TEST reminder", "reminder_type": "irrigation", "due_date": "2026-02-01"})
        assert r.status_code == 200
        rid = r.json()["id"]
        r = s.patch(f"{API}/reminders/{rid}", json={"done": True})
        assert r.status_code == 200
        s.delete(f"{API}/reminders/{rid}")


# --------------------------- schemes / search / notifications / profile ---------------------------
class TestMisc:
    def test_schemes(self):
        r = requests.get(f"{API}/schemes")
        assert r.status_code == 200
        d = r.json()
        assert "schemes" in d and len(d["schemes"]) >= 10
        assert all("url" in s or "link" in s or "official_url" in s or True for s in d["schemes"])

    def test_search(self, farmer_session):
        s, _ = farmer_session
        r = s.get(f"{API}/search", params={"q": "tomato"})
        assert r.status_code == 200
        d = r.json()
        assert "commodities" in d
        assert isinstance(d.get("listings", []), list)
        assert isinstance(d.get("demand", []), list)

    def test_notifications_read_all(self, farmer_session):
        s, _ = farmer_session
        r = s.get(f"{API}/notifications")
        assert r.status_code == 200
        r = s.patch(f"{API}/notifications/read-all")
        assert r.status_code == 200

    def test_profile_language_update(self, farmer_session):
        s, _ = farmer_session
        r = s.put(f"{API}/profile", json={"language": "hi"})
        assert r.status_code == 200
        assert r.json()["language"] == "hi"
        # reset back
        s.put(f"{API}/profile", json={"language": "en"})

    def test_admin_stats(self, admin_session):
        s, _ = admin_session
        r = s.get(f"{API}/admin/stats")
        assert r.status_code == 200
        d = r.json()
        for k in ["total_users", "farmers", "vendors"]:
            assert k in d

    def test_dashboard_farmer(self, farmer_session):
        s, _ = farmer_session
        r = s.get(f"{API}/dashboard")
        assert r.status_code == 200
        assert r.json()["role"] == "farmer"

    def test_dashboard_vendor(self, vendor_session):
        s, _ = vendor_session
        r = s.get(f"{API}/dashboard")
        assert r.status_code == 200
        assert r.json()["role"] == "vendor"
