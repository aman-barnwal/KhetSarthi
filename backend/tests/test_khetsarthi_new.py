"""
KhetSarthi iteration_2 delta tests:
- /api/schemes → each scheme has 'image' URL and 'hi' object with Hindi summary/benefits/eligibility/how_to_apply
- /api/commodities → each has name_hi
- AI identity: asking "who created you" mentions KhetSarthi / Aman / Swastika and NOT Gemini/Google/Groq/OpenAI
- AI markdown-safe (asterisks in raw response are OK; frontend renders them)
- PWA static files (/manifest.json served OK — CRA dev may not serve sw.js so tolerate)
"""
import os
import re
import time

import pytest
import requests

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL")
            or open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split("\n")[0].strip()).rstrip("/")
API = f"{BASE_URL}/api"

FARMER_EMAIL = "farmer@test.com"
FARMER_PWD = "Farmer@123"


@pytest.fixture(scope="module")
def farmer_sess():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json={"email": FARMER_EMAIL, "password": FARMER_PWD})
    assert r.status_code == 200, f"farmer login failed: {r.status_code} {r.text[:200]}"
    return s


class TestSchemesDelta:
    def test_each_scheme_has_image_and_hi(self):
        r = requests.get(f"{API}/schemes")
        assert r.status_code == 200
        schemes = r.json().get("schemes", [])
        assert len(schemes) >= 10, f"expected >=10 schemes, got {len(schemes)}"
        missing_image = [s["id"] for s in schemes if not s.get("image")]
        missing_hi = [s["id"] for s in schemes if not s.get("hi") or not s["hi"].get("summary")]
        assert not missing_image, f"schemes missing image: {missing_image}"
        assert not missing_hi, f"schemes missing hi.summary: {missing_hi}"

    def test_scheme_hi_fields_completeness(self):
        r = requests.get(f"{API}/schemes")
        schemes = r.json()["schemes"]
        for s in schemes:
            for k in ("summary", "benefits", "eligibility", "how_to_apply"):
                assert s["hi"].get(k), f"scheme {s['id']} missing hi.{k}"

    def test_scheme_image_urls_reachable(self):
        r = requests.get(f"{API}/schemes")
        schemes = r.json()["schemes"]
        # HEAD-check up to 3 image URLs so we don't hammer unsplash
        bad = []
        for s in schemes[:3]:
            try:
                h = requests.head(s["image"], timeout=8, allow_redirects=True)
                if h.status_code >= 400:
                    # try GET (some CDNs disallow HEAD)
                    g = requests.get(s["image"], timeout=8, stream=True)
                    if g.status_code >= 400:
                        bad.append((s["id"], h.status_code))
                    g.close()
            except Exception as e:
                bad.append((s["id"], str(e)[:80]))
        assert not bad, f"unreachable scheme images: {bad}"


class TestCommoditiesHindi:
    def test_commodities_have_name_hi(self):
        r = requests.get(f"{API}/commodities")
        assert r.status_code == 200
        commodities = r.json()
        assert len(commodities) >= 20
        for c in commodities:
            assert c.get("name_hi"), f"commodity {c.get('key')} missing name_hi"
        # spot-check known translations
        d = {c["key"]: c["name_hi"] for c in commodities}
        assert d.get("tomato") == "टमाटर"
        assert d.get("potato") == "आलू"
        assert d.get("onion") == "प्याज"


class TestAIIdentity:
    def _stream(self, sess, prompt):
        with sess.post(f"{API}/ai/chat",
                       json={"message": prompt, "language": "en"}, stream=True, timeout=90) as r:
            assert r.status_code == 200, r.text[:200]
            got = ""
            start = time.time()
            for line in r.iter_lines(decode_unicode=True):
                if line and line.startswith("data: "):
                    ch = line[6:]
                    if ch.startswith("[DONE"):
                        break
                    if ch == "[ERROR]":
                        pytest.fail("AI [ERROR]")
                    got += ch.replace("<|nl|>", "\n")
                if time.time() - start > 75:
                    break
            return got

    def test_ai_identity_khetsarthi(self, farmer_sess):
        reply = self._stream(farmer_sess, "Who created you? Who are the founders of KhetSarthi?")
        assert reply.strip(), "empty AI reply"
        rlow = reply.lower()
        # Must mention KhetSarthi or the founders
        assert ("khetsarthi" in rlow) or ("aman" in rlow) or ("swastika" in rlow), \
            f"reply does not mention KhetSarthi/founders: {reply[:400]}"
        # Must NOT mention the underlying providers
        for forbidden in ("gemini", "google", "openai", "groq", "llama", "anthropic", "claude"):
            assert forbidden not in rlow, f"reply leaked provider name '{forbidden}': {reply[:400]}"


class TestPWAAssets:
    def test_manifest_served(self):
        # public path — CRA dev serves manifest.json
        r = requests.get(f"{BASE_URL}/manifest.json", timeout=15)
        assert r.status_code == 200, f"manifest not served: {r.status_code}"
        j = r.json()
        assert "KhetSarthi" in j.get("name", "")

    def test_logo_and_founder_images_served(self):
        # These need to exist because About page + header rely on them
        for path in ("/logo.png", "/favicon.png", "/swastika.jpg", "/aman.jpg"):
            r = requests.get(f"{BASE_URL}{path}", timeout=15)
            assert r.status_code == 200, f"{path} not served: {r.status_code}"
            assert int(r.headers.get("content-length", "0") or len(r.content)) > 500, \
                f"{path} is suspiciously tiny"
