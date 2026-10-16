# TravelWise Agent Rules & Mandatory Architecture Guidelines

> [!IMPORTANT]
> **CRITICAL ARCHITECTURAL CONSTRAINTS - MUST BE OBSERVED BY ALL AI AGENTS IN ALL SESSIONS**

## 1. Single Gateway Backend Communication (NO Direct Supabase or AI Service Access)
* **The Flutter Mobile App (`mobile/`) MUST NEVER connect directly to the Python AI service or directly to the Supabase database.**
* **Single Gateway Pattern:** The Flutter app connects **EXCLUSIVELY** to the public ASP.NET Core Backend API (`TravelWise.Api` - port 5127 locally, or hosted production URL).
* The ASP.NET Core Backend API is solely responsible for:
  - Performing all database operations with Supabase via Entity Framework Core.
  - Proxying / orchestrating AI workflows by communicating internally with the Python AI Service.
  - Enforcing authentication, role checks, and JWT verification.
* Any Flutter service, model, or network call must point to the Backend API (`/api/...`) via `ApiService`.

## 2. Strict Scope Boundary During Mobile App Development
* During Flutter mobile application development:
  - **DO NOT modify** files in `src/` (ASP.NET Core API).
  - **DO NOT modify** files in `ai-service/` (Python FastAPI service).
  - **DO NOT modify** files in `web/` (React Vite Web dashboard).
* Keep all code edits, additions, and updates **strictly confined to the `mobile/` directory**.
* Do not unnecessarily scan or re-read `src/`, `ai-service/`, or `web/` during daily mobile tasks. Refer to `docs/FRONTEND_FEATURE_SPEC.md` as the authoritative source of truth for frontend features, validations, and workflows.

## 3. Reference Feature Specification
* For feature parity, button actions, workflows, validations, and UI behavior, always consult:
  - [FRONTEND_FEATURE_SPEC.md](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/docs/FRONTEND_FEATURE_SPEC.md)
