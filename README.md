# Krishiyog — Digital Operating System for Indian Agriculture

Multilingual, AI-powered platform connecting farmers, vendors and buyers: weather intelligence, KrishiAI assistant, crop disease scanning, mandi prices, Demand & Supply Exchange, Krishi Market, government schemes, farm records and voice-first accessibility.

## Stack
- **Frontend**: React 19 (CRA + craco), Tailwind, shadcn/ui, phosphor icons, recharts, sonner
- **Backend**: FastAPI + MongoDB (motor), JWT auth (httpOnly cookies + Bearer fallback)
- **AI**: Gemini (`gemini-3-flash-preview`) via emergentintegrations, Groq fallback (`llama-3.3-70b-versatile`)

## Setup
```bash
cd backend && pip install -r requirements.txt
cd frontend && yarn install
sudo supervisorctl restart backend frontend
```

## Environment variables
See `backend/.env.example`. Key variables:
- `MONGO_URL`, `DB_NAME` — MongoDB
- `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` — auth + admin seeding (idempotent, runs on startup)
- `AI_PROVIDER` (`gemini` | `groq`), `GEMINI_API_KEY`, `GROQ_API_KEY` — AI/vision
- `DATA_GOV_API_KEY` — Agmarknet daily mandi prices
- Frontend uses only `REACT_APP_BACKEND_URL` (no secrets client-side)

## Service abstractions (provider-independent)
All in `backend/services.py`:
| Service | Current provider | Notes |
|---|---|---|
| WeatherService | Open-Meteo (free, no key) | 15-min cache; agri advisories derived from raw data |
| GeocodingService | Open-Meteo (forward), OSM Nominatim (reverse) | Nominatim is rate-limited (1 req/s) and requires attribution — replace for scale |
| MarketPriceService | data.gov.in Agmarknet | 30-min cache; shows explicit "unavailable" state, never fabricates prices |
| AIService | Gemini → Groq fallback | streaming SSE chat |
| VisionService | Gemini multimodal | structured JSON crop-scan output; replaceable with specialized agri models |
| SpeechService | Browser Web Speech API (client) | STT/TTS keys reserved in .env.example for cloud providers |

To replace a provider: implement the same method signatures in `services.py` and switch env vars. Pages never call providers directly.

## Data & integrity rules
- Government schemes (`schemes_data.py`) are real central schemes with official links — verify deadlines on official portals.
- No fabricated mandi prices, ratings or verification badges. Vendor verification is manual via Admin Dashboard.
- AI outputs carry disclaimers; crop scans are probabilistic guidance, not diagnoses.

## Roles & permissions (enforced server-side)
- `farmer`: crops, diary, expenses, reminders, harvest declarations, produce listings
- `vendor`: demand posts, input/service listings, directory presence
- `admin`: stats, user verification/deactivation, content moderation (seeded from env; role cannot be self-assigned via API)

## Test credentials
See `/app/memory/test_credentials.md`.

## Development commands
- Backend logs: `tail -n 100 /var/log/supervisor/backend.err.log`
- API base: all routes prefixed `/api`
- Update deps: `pip install X && pip freeze > backend/requirements.txt`; `yarn add Y` (never npm)
