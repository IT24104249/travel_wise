---
name: mobile-architecture-rules
description: Mandatory rules ensuring Flutter connects strictly through the ASP.NET Core Backend API and preserves backend/AI/web file isolation.
---

# Mobile Architecture & Development Boundaries

1. **NO Direct Supabase or AI Service Connections:**
   - Flutter (`mobile/`) MUST NOT make direct calls to the Python AI service (FastAPI port 8000) or to Supabase.
   - All network traffic from Flutter must go through the ASP.NET Core Backend API (`/api/...`).
   - The Backend API communicates internally with Supabase and the AI service.

2. **File Isolation & Scope Integrity:**
   - Flutter mobile app development must only edit files inside the `mobile/` directory.
   - Files in `src/`, `ai-service/`, and `web/` must remain untouched.
   - Use `docs/FRONTEND_FEATURE_SPEC.md` as the specification reference for all features, validations, and button behaviors.
