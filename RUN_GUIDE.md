# TravelWise: Complete Project Setup & Execution Guide

This comprehensive guide is designed for **anyone starting on a brand-new computer or environment with zero prior knowledge**. Following these instructions step-by-step will take you from an empty machine to a fully functional TravelWise platform.

---

## Table of Contents
1. [Architecture Overview & Port Mapping](#1-architecture-overview--port-mapping)
2. [Prerequisites & Software Installation](#2-prerequisites--software-installation)
3. [Step 1: Clone Repository & Directory Structure](#3-step-1-clone-repository--directory-structure)
4. [Step 2: Supabase Setup (Database & Storage Buckets)](#4-step-2-supabase-setup-database--storage-buckets)
5. [Step 3: Backend API Setup (ASP.NET Core 8)](#5-step-3-backend-api-setup-aspnet-core-8)
6. [Step 4: AI Service Setup (Python FastAPI & Multi-Agent System)](#6-step-4-ai-service-setup-python-fastapi--multi-agent-system)
7. [Step 5: Frontend Setup (React, TypeScript & Vite)](#7-step-5-frontend-setup-react-typescript--vite)
8. [Step 6: Seeding Initial Sri Lankan Attractions & Data](#8-step-6-seeding-initial-sri-lankan-attractions--data)
9. [Step 7: Testing User Roles & Default Credentials](#9-step-7-testing-user-roles--default-credentials)
10. [Troubleshooting & Common Questions](#10-troubleshooting--common-questions)

---

## 1. Architecture Overview & Port Mapping

TravelWise consists of three coordinated local services and a cloud-hosted Supabase instance:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             TRAVELWISE PLATFORM                             │
├─────────────────────────┬──────────────────────────┬────────────────────────┤
│ React Web Frontend      │ ASP.NET Core Web API     │ Python AI Service      │
│ (Vite + TypeScript)     │ (C# .NET 8 + JWT Auth)   │ (FastAPI + Gemini)     │
│ Port: 5173              │ Port: 5127               │ Port: 8000             │
│ http://localhost:5173   │ http://localhost:5127    │ http://localhost:8000  │
└────────────┬────────────┴─────────────┬────────────┴───────────┬────────────┘
             │                          │                        │
             ▼                          ▼                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SUPABASE CLOUD SERVICES                            │
│  • PostgreSQL Relational Database (Connection Pooler Port: 5432)            │
│  • Storage Buckets: travelwise-images, railway-fares, bus-fares, receipts   │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Component | Technology | Directory | Default URL / Port |
| :--- | :--- | :--- | :--- |
| **Frontend Web** | React 18, TypeScript, Vite | `web/` | `http://localhost:5173` |
| **Backend API** | ASP.NET Core 8, EF Core | `src/TravelWise.Api/` | `http://localhost:5127` |
| **AI Multi-Agent Service** | Python 3.10+, FastAPI, Google Gemini | `ai-service/` | `http://localhost:8000` |
| **Database & Storage** | Supabase (PostgreSQL 15 + S3 Storage) | Cloud | `aws-0-*.pooler.supabase.com:5432` |

---

## 2. Prerequisites & Software Installation

Before running the project on a new computer, install the following required software:

### 2.1 Required Tools
1. **Git**
   - Download: [https://git-scm.com/downloads](https://git-scm.com/downloads)
   - Verify: `git --version`
2. **.NET 8.0 SDK** (or newer)
   - Download: [https://dotnet.microsoft.com/download/dotnet/8.0](https://dotnet.microsoft.com/download/dotnet/8.0)
   - Verify: `dotnet --version` (should output `8.0.xxx`)
3. **Node.js (LTS version 18 or 20)**
   - Download: [https://nodejs.org/](https://nodejs.org/)
   - Verify: `node --version` and `npm --version`
4. **Python (version 3.10, 3.11, or 3.12)**
   - Download: [https://www.python.org/downloads/](https://www.python.org/downloads/)
   - *Important:* During Windows installation, check the box: **"Add Python to PATH"**.
   - Verify: `python --version`

### 2.2 PowerShell Execution Policy (Windows Only)
To allow Python virtual environments to activate in PowerShell, open PowerShell as Administrator and run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 3. Step 1: Clone Repository & Directory Structure

Clone or download the project files into your chosen folder:

```powershell
cd C:\Projects
git clone https://github.com/your-org/TravelWise.git
cd TravelWise
```

### Folder Layout
- `web/`: The React web application.
- `src/TravelWise.Api/`: The C# ASP.NET Core API backend.
- `ai-service/`: The Python FastAPI AI microservice with multi-agent planning.
- `docs/`: Database schemas, storage setups, and architecture records.
- `seed_explore.py`: Python automation script to publish curated Sri Lankan attractions.

---

## 4. Step 2: Supabase Setup (Database & Storage Buckets)

TravelWise uses Supabase strictly as a **PostgreSQL Database** and **Media Storage Host**. (Authentication is handled natively by the ASP.NET Core backend).

### 4.1 Create a Free Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and log in or create a free account.
2. Click **New project**.
3. Choose a name (e.g., `TravelWise`), select your region (e.g., `Singapore` or nearest), and choose a strong Database Password.
4. Wait 1-2 minutes for the database to provision.

### 4.2 Run the Complete Database & Storage Setup SQL
To create all database tables, storage buckets, and policies in a single click:

1. Open your project on the [Supabase Dashboard](https://supabase.com/dashboard).
2. On the left sidebar, click on **SQL Editor** (icon: `>_`).
3. Click **New query**.
4. Open the file in this repository: [`docs/SUPABASE_MASTER_SETUP.sql`](docs/SUPABASE_MASTER_SETUP.sql).
5. Copy the entire contents of `docs/SUPABASE_MASTER_SETUP.sql` and paste it into the Supabase SQL Editor.
6. Click **Run** (green button).

> **What this script automatically provisions:**
> - **4 Storage Buckets:**
>   - `travelwise-images` (Public bucket for tourist places, hotel photos, and vehicle images)
>   - `railway-fares` (Public bucket for Sri Lanka Railways CSV fare tables)
>   - `bus-fares` (Public bucket for Sri Lanka Bus route CSV fare tables)
>   - `receipts` (Private bucket for traveler expense receipts)
> - **Storage RLS Policies:** Public read policies for media and upload permissions.
> - **19 Database Tables:** `UserAccounts`, `Trips`, `Budgets`, `SharedExpenses`, `ExpenseSplits`, `Activities`, `RiskAssessments`, `GroupMembers`, `TravelCatalogItems`, `Destinations`, `VisitingPlaces`, `Restaurants`, `FoodItems`, `Accommodations`, `TransportFareFiles`, `RentalVehicleListings`, `ProviderRegistrations`, `Workflows`, `AuditLogs`.
> - **Default Seed Admins:** Seeds initial admin accounts (`admin@travelwise.com` and `admin@travelwise.lk`).

### 4.3 Get Supabase Keys & Connection String
From your Supabase Project Dashboard:
1. **Database Connection String (Session Pooler):**
   - Click **Connect** (top right) -> **Transaction/Session Pooler**.
   - Note down:
     - Host: `aws-0-[region].pooler.supabase.com`
     - Port: `5432`
     - Database: `postgres`
     - User: `postgres.[project-ref]`
     - Password: `[YOUR_PASSWORD]`
2. **Project URL & Anon Key:**
   - Go to **Project Settings** -> **API**.
   - Copy **Project URL** (e.g. `https://xyz.supabase.co`).
   - Copy **anon public key** (`eyJhbGci...`).

---

## 5. Step 3: Backend API Setup (ASP.NET Core 8)

The backend handles JWT authentication, role-based access control, catalog listings, trip management, and coordinates with Supabase.

### 5.1 Configure `appsettings.Local.json`
Navigate to `src/TravelWise.Api/`:

```powershell
cd src\TravelWise.Api
```

Create `appsettings.Local.json` (or copy from `appsettings.Local.json.example`):

```powershell
Copy-Item appsettings.Local.json.example appsettings.Local.json
```

Open `appsettings.Local.json` in any text editor and fill in your Supabase credentials:

```json
{
  "ConnectionStrings": {
    "Supabase": "Host=aws-0-ap-southeast-1.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.fhnttrinouhhkjmmvydr;Password=YOUR_DATABASE_PASSWORD;SSL Mode=Require;Trust Server Certificate=true"
  },
  "AI_SERVICE_URL": "http://localhost:8000",
  "Jwt": {
    "Key": "TravelWise_Secret_Key_For_Jwt_Auth_SE3090_Assignment1_AtLeast32BytesLong!",
    "Issuer": "TravelWise.Api",
    "Audience": "TravelWise.Client",
    "ExpiryMinutes": 60
  },
  "Supabase": {
    "Url": "https://YOUR_SUPABASE_PROJECT.supabase.co",
    "AnonKey": "YOUR_SUPABASE_ANON_KEY",
    "ServiceRoleKey": "YOUR_SUPABASE_SERVICE_ROLE_KEY"
  },
  "Email": {
    "SmtpHost": "smtp.gmail.com",
    "SmtpPort": "587",
    "SmtpUser": "project2026sef@gmail.com",
    "SmtpPassword": "YOUR_SMTP_APP_PASSWORD",
    "FromName": "TravelWise",
    "FrontendUrl": "http://localhost:5173"
  }
}
```

> [!NOTE]
> Make sure the connection string uses the **Session Pooler** (`pooler.supabase.com` on port `5432`) to guarantee reliable IPv4 connectivity on all home and mobile internet connections.

### 5.2 Build & Run the API
In your terminal, navigate back to the project root and run:

```powershell
# In Terminal Window 1:
dotnet build src\TravelWise.Api\TravelWise.Api.csproj
dotnet run --project src\TravelWise.Api\TravelWise.Api.csproj --launch-profile http
```

### 5.3 Verify the API is Healthy
Open your web browser and navigate to:
- **Swagger Documentation:** [http://localhost:5127/swagger](http://localhost:5127/swagger)
- **Health Check:** [http://localhost:5127/health](http://localhost:5127/health) (Should return `Healthy`)

Leave **Terminal 1** running.

---

## 6. Step 4: AI Service Setup (Python FastAPI & Multi-Agent System)

The AI Service provides intelligent trip itinerary suggestions, budget estimation, and risk analysis using Google Gemini.

### 6.1 Create Python Virtual Environment
Open a **new terminal window (Terminal 2)**:

```powershell
# Navigate to the ai-service directory
cd "C:\Path\To\TravelWise\ai-service"

# Create a virtual environment named .venv
python -m venv .venv

# Activate the virtual environment
.\.venv\Scripts\Activate.ps1

# Upgrade pip and install all required packages
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 6.2 Configure AI `.env`
Inside the `ai-service/` folder, create `.env` (or copy from `.env.example`):

```powershell
Copy-Item .env.example .env
```

Open `.env` and configure your Google Gemini API Key:

```env
# Get a free API key at: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
GEMINI_MODEL=gemini-1.5-flash
AI_REQUIRE_GEMINI=false
AI_INTERNAL_API_KEY=TravelWise_Ai_Internal_Secret_2026!
CORS_ORIGINS=["http://localhost:5173","http://localhost:5127"]
```

> [!TIP]
> You can generate a free API key instantly at [Google AI Studio](https://aistudio.google.com/app/apikey).

### 6.3 Run the AI Service
Start the FastAPI server on port 8000:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

### 6.4 Verify AI Service
Open your web browser and navigate to:
- **Interactive OpenAPI Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check:** [http://localhost:8000/health](http://localhost:8000/health)

Leave **Terminal 2** running.

---

## 7. Step 5: Frontend Setup (React, TypeScript & Vite)

The frontend is a responsive web dashboard designed for international travelers, service providers, and administrators.

### 7.1 Install NPM Dependencies
Open a **new terminal window (Terminal 3)**:

```powershell
# Navigate to the web folder
cd "C:\Path\To\TravelWise\web"

# Install all dependencies
npm install
```

### 7.2 Configure Frontend `.env`
In the `web/` folder, create a file named `.env`:

```powershell
Copy-Item .env.example .env
```

Open `web/.env` and verify the settings:

```env
VITE_API_URL=http://localhost:5127
VITE_SUPABASE_URL=https://YOUR_SUPABASE_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

### 7.3 Run the Frontend Development Server
Start the Vite dev server:

```powershell
npm run dev
```

The terminal will display the local development URL:
```
  VITE v5.4.21  ready in 450 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Open **[http://localhost:5173](http://localhost:5173)** in Google Chrome, Microsoft Edge, or Mozilla Firefox.

Leave **Terminal 3** running.

---

## 8. Step 6: Seeding Initial Sri Lankan Attractions & Data

To immediately populate the **Explore Sri Lanka** tourist guide with curated high-resolution destinations, travel tips, and foreigner entry fees:

Open a **new terminal (Terminal 4)** and run:

```powershell
cd "C:\Path\To\TravelWise"
python seed_explore.py
```

### What gets published:
- 🏖️ **Beaches & Coastal:** Mirissa Beach & Coconut Tree Hill, Unawatuna & Jungle Beach, Nilaveli Beach & Pigeon Island, Arugam Bay Surf Haven, Tangalle Silent Beach.
- 🏛️ **Historical Ruins & UNESCO:** Sigiriya Lion Rock Fortress, Ancient City of Polonnaruwa, Sacred City of Anuradhapura, Dambulla Royal Cave Temple, Galle Dutch Fort & Lighthouse.
- 🌊 **Natural Waterfalls:** Diyaluma Falls & Infinity Rock Pools, Ravana Falls, Dunhinda Smoky Falls, Bambarakanda Falls.
- 🥾 **Hiking & Misty Peaks:** Ella Rock & Nine Arches Bridge, Adam's Peak (Sri Pada), Pidurangala Rock Sunrise Scramble, Knuckles Mountain Range.
- 🌿 **Wildlife & Nature:** Yala National Park Leopard Safari, Udawalawe Elephant Sanctuary, Sinharaja Virgin Rainforest, Minneriya Elephant Gathering.

---

## 9. Step 7: Testing User Roles & Default Credentials

TravelWise includes three distinct account roles. You can test each persona immediately:

### 👑 1. System Administrator
- **Email:** `admin@travelwise.com` or `admin@travelwise.lk`
- **Password:** `Admin@123`
- **Capabilities:**
  - **Explore Sri Lanka Showcase:** Click **"✨ Publish New Attraction"** to upload an image and type a description; use **"✏️ Edit Listing"** to update any attraction; click **"🗑️ Delete"** to remove an attraction.
  - **Transport Fares Portal:** Verify and publish Sri Lanka Railway and Bus CSV fare datasets.
  - **Provider Verifications:** Review and approve/reject Service Provider account applications.
  - **Rental Vehicles:** Approve or reject partner vehicle listings and mileage rates.
  - **AI Plan Reviews:** Review and audit AI itinerary suggestions with human-in-the-loop oversight.

### 🏢 2. Service Provider
- **Email:** `project2026sef@gmail.com` (or click **"Sign Up"** and select **"Service Provider"**)
- **Password:** `Provider@123`
- **Capabilities:**
  - **My Travel Listings:** Add and manage destinations, hotels, visiting places, and restaurants.
  - **Transport Fares:** Upload official `.csv` fare tables (automatically sent to Admin moderation queue).
  - **Rental Vehicles:** Register rental vehicles with daily rates and per-kilometer costs.

### ✈️ 3. International Traveller
- **Email:** `traveller@travelwise.lk` (or click **"Sign Up"** and select **"Traveller"**)
- **Password:** `Traveller@123`
- **Capabilities:**
  - **Explore Sri Lanka:** Filter public attractions by category (Beaches, Ruins, Waterfalls, Hiking, Wildlife), view foreigner fees and travel advice, or click **"Plan Trip Here"**.
  - **Trip Planner Wizard:** Plan Solo or Group trips with auto-calculated budgets, transit options, and AI schedule generation.
  - **Group Debt Settlement:** Add expenses, select group trips, and view individual member cost-share proportions.

---

## 10. Troubleshooting & Common Questions

### Q1: The C# API fails to connect to Supabase database (Timeout / Host Unreachable)
**Solution:** Ensure you are using the Supabase **Session Pooler** connection string (`aws-0-*.pooler.supabase.com:5432`) rather than the direct database connection. Direct Supabase connections require IPv6, which is not supported by all Internet Service Providers.

### Q2: PowerShell says `Activate.ps1 cannot be loaded because running scripts is disabled`
**Solution:** Run this command once in PowerShell:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
Then run `.\.venv\Scripts\Activate.ps1` again.

### Q3: How do I stop or restart a running service?
Press `Ctrl + C` in the respective terminal window. If a process hangs on a port, terminate it in PowerShell:
```powershell
# Kill port 5127 (C# API)
Get-Process -Name "TravelWise.Api" -ErrorAction SilentlyContinue | Stop-Process -Force

# Kill port 8000 (Python AI Service)
Get-Process -Name "python" -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Q4: Are image uploads stored in Supabase or as URLs?
**Both are supported:**
- Administrators can paste any public image link (`https://...`).
- Administrators can click **"📁 Upload File"** to pick a file from their local computer. The image is previewed instantly and saved directly with the listing.

### Q5: Is the UI English only?
**Yes.** The user interface is strictly English-only to guarantee accessibility for international travelers.
