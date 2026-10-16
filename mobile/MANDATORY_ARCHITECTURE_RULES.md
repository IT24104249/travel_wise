# Flutter Mobile App: Mandatory Architecture & Connection Guidelines

> [!CAUTION]
> **DO NOT BYPASS THE BACKEND API!**
> This mobile application interacts with the TravelWise ecosystem solely through the ASP.NET Core Backend API.

## Core Rules:
1. **Zero Direct Access to Python AI Service:**
   - The Flutter mobile app does NOT send HTTP requests directly to `http://localhost:8000` or the Python AI service.
   - All AI workflow actions (such as generating itinerary suggestions, validating budgets, or AI reviews) are dispatched to the ASP.NET Core Backend API (e.g., `/api/workflows`, `/api/trips/{id}/submit-admin`).
   - The Backend API communicates with the AI service behind the scenes.

2. **Zero Direct Access to Supabase:**
   - Flutter does NOT use `@supabase/supabase-js` or direct Supabase client SDKs.
   - All database reads and writes pass through the ASP.NET Core API endpoints (`/api/auth/*`, `/api/trips/*`, `/api/budgets/*`, `/api/expenses/*`, `/api/catalog/*`, etc.).

3. **Backend Configuration:**
   - Configured in [lib/services/api_service.dart](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/mobile/lib/services/api_service.dart).
   - Local Android Emulator: `http://10.0.2.2:5127`
   - Local Web/Desktop: `http://localhost:5127`
   - Cloud / Production: Pass `--dart-define=API_URL=https://travelwise-api.onrender.com`

4. **Directory Isolation:**
   - During mobile development, do not edit files outside `mobile/`.
   - Feature references and validations are documented in [docs/FRONTEND_FEATURE_SPEC.md](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/docs/FRONTEND_FEATURE_SPEC.md).
