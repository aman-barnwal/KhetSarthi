# Krishiyog — PRD & Progress Memory

## Original Problem Statement (condensed)
Build Krishiyog: a production-grade, multilingual, AI-powered digital operating system for Indian agriculture connecting farmers, vendors, buyers, Panchayats and FPOs. Premium (non-generic) UI, real user journeys, role-based dashboards, voice-first accessibility, provider-independent service abstractions, graceful loading/offline/empty/error states, no fabricated data, server-side permission enforcement. Co-founders Aman Barnwal & Swastika Kumari on About page (no invented bios). Later addition (June 2026): full admin back-office — managed reference price table (MSP/market/FPO, inline + bulk edit) and vendor directory management (add/deactivate/soft-remove, view listings), with a SINGLE admin credential.

## User Choices
- FastAPI + MongoDB + JWT auth (not Supabase)
- User's own Gemini key (gemini-3-flash-preview, text+vision) + Groq key as text fallback
- data.gov.in Agmarknet key: configured in backend/.env (DATA_GOV_API_KEY)
- All major languages (22 scheduled languages listed; en+hi full translations, 10 more with core keys, fallback→en)
- Browser-native Web Speech API for voice (v1)
- SINGLE admin: login ID `AmanSwastika` / password `SwastikaAman@2026010405` (login accepts ID in email field; startup demotes any other admins)

## Architecture
- backend/: server.py (assembly+seeding+indexes), routes.py (all /api endpoints), auth.py (JWT/bcrypt/brute-force), services.py (WeatherService=Open-Meteo, GeocodingService=Open-Meteo+Nominatim, MarketPriceService=Agmarknet, AIService=Gemini→Groq SSE, VisionService=Gemini multimodal), models.py, schemes_data.py (10 real central schemes, FAQs, 28 commodities), .env / .env.example
- frontend/src/: lib/i18n.js (22-lang context), lib/api.js, context/AuthContext.js, components/ (AppShell sidebar+bottom-nav, VoiceAssistant FAB, Shared), pages/ (Landing, Auth, Onboarding, Dashboard [farmer+vendor], KrishiAI, WeatherPage, CropScanner, Crops [crops/diary/reminders], DemandSupply, Market, VendorsDir, MandiPrices, Schemes, Expenses, Notifications, SearchPage, About [co-founders+tutorial chapters], Help, Settings, Admin [prices/vendors/users/moderation], Legal)
- Design: organic/earthy palette (#0F3821 green, #D69F39 gold, #C85A32 terracotta, #F9F6F0 cream), Outfit+DM Sans, phosphor duotone icons, glass headers, per design_guidelines.json

## Implemented (July 2026 — MVP complete, all tested 41/41 backend + full frontend flows)
- Auth: register/login/logout/me/forgot/reset, httpOnly cookies + Bearer, brute-force lockout, single-admin seeding
- Guided onboarding: language → farmer/vendor role → role-specific profile forms; persisted; role-protected routes (server-side 403s)
- Farmer dashboard (weather card, AI card, stats, demand matches, reminders, quick actions); Vendor dashboard (demands, supply matches, enquiries, verification status)
- KrishiAI SSE streaming chat (Gemini, multilingual, disclaimers); Crop scanner (image → structured JSON: conditions/confidence/actions/prevention + history)
- Weather: GPS + place search, hourly/7-day, derived farm advisories, dynamic gradients, graceful denied state
- Demand & Supply Exchange: commodity cards, vendor demand posts, farmer harvest declarations, bidirectional match notifications, enquiries
- Krishi Market: produce + input listings, enquiry lifecycle (new→accepted→…→delivered/disputed)
- Vendor directory with filters + verification badges (admin-controlled, never fabricated)
- Mandi prices: live Agmarknet (fixed UA + lowercase schema), unavailable-state honesty, price alerts, admin reference prices (MSP/market/FPO) shown to users
- Schemes (10 real, official links), Expenses (+revenue, pie chart, profit), Crops/Diary/Reminders CRUD, Notifications center, Global search, FAQ/Help + Ask-AI escalation, Settings (name/language/legal/account delete), Legal pages (Privacy/Terms/AI Disclaimer)
- Admin panel: stats, managed price table (inline edit, add, bulk %/set update), vendor management (create account, verify, deactivate, soft-remove preserving history, view listings), user table, content moderation
- Voice assistant FAB: Web Speech STT/TTS, nav commands (en/hi keywords), AI fallback
- README.md, .env.example, test_credentials.md

## Key decisions
- Vendor "remove" = soft delete (account inactive, listings hidden, history preserved)
- Price types: MSP + market + FPO rate per commodity (admin-managed reference layer, clearly separated from live Agmarknet)
- Role separation: admin-only back-office for now; FPO-manager scoping is a future role

## Backlog (prioritized)
- P0: real tutorial video asset (player + chapters ready, src replaceable in About.js); PWA manifest + service worker for offline caching
- P1: /auth/refresh endpoint (refresh cookie issued but unused); price history charts (needs historical Agmarknet ingestion); scheduled price-alert evaluation job (alerts stored, not yet evaluated); distance-based matching (currently commodity-name match)
- P1: FPO/buyer/Krishiyog Mitra roles (role field architecture supports it); QR onboarding flows
- P2: community/knowledge sharing with moderation; OCR receipt entry; demand/supply heatmaps; email delivery for password reset (token currently returned in response/logs)

## Test accounts
See /app/memory/test_credentials.md (admin AmanSwastika, farmer@test.com, vendor@test.com — all onboarded).
