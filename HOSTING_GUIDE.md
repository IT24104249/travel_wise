# TravelWise: Independent Component Hosting Guide

This guide provides clear, step-by-step instructions to host each component of TravelWise independently on modern cloud platforms.

```
+-----------------------------------------------------------------------------------+
|                         INDEPENDENT HOSTING TOPOLOGY                              |
+-----------------------------------------------------------------------------------+

 1. Database (PostgreSQL)  --->  Supabase Cloud
 2. Public Backend API     --->  Render / Railway Web Service (ASP.NET Core 8)
 3. Agentic AI Service     --->  Render Web Service (Python 3.11 / FastAPI)
 4. Web Dashboard          --->  Vercel (React 18 / Vite / TypeScript)
 5. Mobile Application     --->  Android Release APK (Flutter 3.x)
```

---

## 1. Component 1: PostgreSQL Database (Supabase Cloud)

Supabase is used **strictly as the PostgreSQL database provider and file storage**. It does **not** handle authentication.

1. Create a project at [supabase.com](https://supabase.com).
2. Go to **Project Settings -> Database -> Connection string**.
3. Select **URI** or **Parameters** for .NET / Npgsql.
   - Example connection string:
     ```text
     Host=db.YOUR_PROJECT_REF.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=YOUR_PASSWORD;SSL Mode=Require;Trust Server Certificate=true
     ```
4. On first startup of the ASP.NET Core API, all 13 database tables (including `UserAccounts`) will be automatically created via `EnsureCreated()`.

---

## 2. Component 2: Backend API (Render / Railway)

- **Source Code Path:** `src/TravelWise.Api`
- **Recommended Platform:** [Render](https://render.com) or [Railway](https://railway.app)
- **Deployment Type:** Docker or Web Service (.NET 8)

### Option A: Deploy on Render via Docker (Recommended)
1. On Render, click **New -> Web Service**.
2. Connect your GitHub repository.
3. Configure the service:
   - **Name:** `travelwise-api`
   - **Root Directory:** `src/TravelWise.Api`
   - **Environment:** `Docker` (Render will auto-detect `src/TravelWise.Api/Dockerfile`)
4. Add the following **Environment Variables**:
   | Variable Name | Value |
   |---|---|
   | `ASPNETCORE_ENVIRONMENT` | `Production` |
   | `ConnectionStrings__Supabase` | `Host=db.YOUR_REF.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=YOUR_PASSWORD;SSL Mode=Require;Trust Server Certificate=true` |
   | `AI_SERVICE_URL` | `https://your-ai-service.onrender.com` |
   | `Jwt__Key` | `TravelWise_Secret_Key_For_Jwt_Auth_SE3090_Assignment1_AtLeast32BytesLong!` |
   | `Jwt__Issuer` | `TravelWise.Api` |
   | `Jwt__Audience` | `TravelWise.Client` |
   | `Jwt__ExpiryMinutes` | `60` |
5. Click **Create Web Service**.
6. Once deployed, verify via:
   - Live URL: `https://travelwise-api.onrender.com`
   - Health Check: `https://travelwise-api.onrender.com/health`
   - Swagger Docs: `https://travelwise-api.onrender.com/swagger`

---

## 3. Component 3: Agentic AI Microservice (Render)

- **Source Code Path:** `ai-service`
- **Recommended Platform:** [Render](https://render.com)
- **Deployment Type:** Python Web Service or Docker

### Option A: Deploy on Render via Native Python
1. On Render, click **New -> Web Service**.
2. Connect your GitHub repository.
3. Configure the service:
   - **Name:** `travelwise-ai`
   - **Root Directory:** `ai-service`
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add the following **Environment Variables**:
   | Variable Name | Value |
   |---|---|
   | `PORT` | `10000` |
   | `GEMINI_API_KEY` | `YOUR_GEMINI_API_KEY` |
   | `GEMINI_MODEL` | `gemini-2.0-flash` |
   | `AI_REQUIRE_GEMINI` | `false` *(allows safe-failure deterministic fallback if API limit reached)* |
5. Click **Create Web Service**.
6. Verify via:
   - Live URL: `https://travelwise-ai.onrender.com/health` (returns `{"status": "ok", "service": "travelwise-agentic-ai"}`)

---

## 4. Component 4: Web Dashboard (Vercel)

- **Source Code Path:** `web`
- **Recommended Platform:** [Vercel](https://vercel.com)
- **Deployment Type:** Static / Edge React App (Vite)

1. On Vercel, click **Add New -> Project**.
2. Import your GitHub repository.
3. In project settings, configure:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click Edit and select `web`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. In **Environment Variables**, add:
   | Variable Name | Value |
   |---|---|
   | `VITE_API_URL` | `https://travelwise-api.onrender.com` *(Your deployed Backend API URL)* |
5. Click **Deploy**.
6. Vercel will build the frontend and provide a global live URL (e.g., `https://travelwise-web.vercel.app`).

---

## 5. Component 5: Mobile Application (Flutter APK Build)

- **Source Code Path:** `mobile`
- **Output:** Native Android `.apk`

To build the mobile app pointing to your hosted cloud backend:

1. Open PowerShell and go to `mobile`:
   ```powershell
   cd "C:\Users\Arosha Induma\OneDrive\Desktop\SEF final project\new\TravelWise\mobile"
   ```
2. Build the production release APK with the production API URL:
   ```powershell
   flutter build apk --release --dart-define=API_URL=https://travelwise-api.onrender.com
   ```
3. The generated release APK will be located at:
   ```text
   mobile/build/app/outputs/flutter-apk/app-release.apk
   ```
4. Transfer this APK to any Android device or emulator to test.

---

## 6. Hosting Order & Integration Verification

To ensure zero downtime, launch in this order:

```
[1. Supabase DB Ready] -> [2. AI Service on Render] -> [3. API on Render] -> [4. Web on Vercel] & [5. Mobile APK]
```

1. **Verify Database:** Supabase is active and connection string is verified.
2. **Launch AI Service:** Deploy `ai-service` on Render and obtain its URL (`https://travelwise-ai.onrender.com`).
3. **Launch API Service:** Deploy `src/TravelWise.Api` on Render, setting `AI_SERVICE_URL` to the URL from step 2.
4. **Launch Web:** Deploy `web` on Vercel, setting `VITE_API_URL` to the API URL from step 3.
5. **Build Mobile:** Compile the Flutter APK using the API URL from step 3.
