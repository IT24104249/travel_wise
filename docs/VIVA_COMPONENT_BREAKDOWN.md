# TravelWise — Group Member Component Breakdown (Viva Defense Guide)

This document provides a comprehensive mapping of the **4 Core Business Components** assigned to the group members of the TravelWise project. For each component, the exact folder locations, file names, roles, and interactions across the **Agentic AI Microservice**, **ASP.NET Core Backend API**, **React Web Frontend**, and **Flutter Mobile Application** are detailed.

---

## Component Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             TravelWise Architecture                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   [React Web Frontend]                [Flutter Mobile App]                  │
│   (Vite + TypeScript)                 (Cross-Platform Dart)                 │
│             │                                   │                           │
│             └─────────────────┬─────────────────┘                           │
│                               │ HTTP / JSON                                 │
│                               ▼                                             │
│                [ASP.NET Core Web API (Port 5127)]                           │
│                (Clean Architecture + Supabase PostgreSQL)                   │
│                               │                                             │
│                               ▼ Internal Service Bus                        │
│                [Agentic AI Service (FastAPI - Port 8000)]                   │
│                (Multi-Agent Loops + Gemini 10-Key Auto-Failover)            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 1. Budget & Expense Management (Member 1)

### Member Responsibility
Managing financial allocations, tracking individual and group expenditures, category spend limits, multi-currency conversions (LKR, USD), budget health evaluations (HEALTHY, WARNING, CRITICAL), and camera receipt verification.

### File Locations & Implementation Details

#### A. AI Agent Service (`ai-service/`)
- [`ai-service/app/agents/budget_controller_agent.py`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/ai-service/app/agents/budget_controller_agent.py):
  - **Function**: Analyzes burn rates against total trip budget. Detects potential overruns across categories (Lodging, Transit, Food, Activities) and suggests cost optimizations.
- [`ai-service/app/agents/budget_allocation_agent.py`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/ai-service/app/agents/budget_allocation_agent.py):
  - **Function**: Distributes available funds dynamically according to travel pace and style (Luxury, Balanced, Backpacker).

#### B. Backend API (`src/TravelWise.Api/`)
- [`src/TravelWise.Api/Controllers/BudgetsController.cs`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/src/TravelWise.Api/Controllers/BudgetsController.cs):
  - **Endpoints**: `GET /api/budgets/trip/{tripId}`, `POST /api/budgets`, `PUT /api/budgets/{id}`
  - **Function**: Manages baseline target budgets, allocated amounts, and currency settings.
- [`src/TravelWise.Api/Controllers/ExpensesController.cs`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/src/TravelWise.Api/Controllers/ExpensesController.cs):
  - **Endpoints**: `GET /api/expenses/trip/{tripId}`, `POST /api/expenses`
  - **Function**: Records trip expenditures, payer identities, and timestamps.
- [`src/TravelWise.Api/Controllers/ReceiptsController.cs`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/src/TravelWise.Api/Controllers/ReceiptsController.cs):
  - **Endpoints**: `POST /api/receipts`
  - **Function**: Handles multipart binary receipt image uploads and links them to Supabase storage.
- [`src/TravelWise.Api/Models/Budget.cs`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/src/TravelWise.Api/Models/Budget.cs) & [`src/TravelWise.Api/Models/Expense.cs`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/src/TravelWise.Api/Models/Expense.cs):
  - **Function**: Entity definitions and relational schema bindings.

#### C. Web Frontend (`web/src/`)
- [`web/src/main.tsx`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/web/src/main.tsx):
  - **UI Components**: Target Budget vs Spent progress bar, category allocation breakdown, real-time burn-rate calculation, currency toggle (LKR/USD), and receipt viewer.

#### D. Flutter Mobile App (`mobile/lib/`)
- [`mobile/lib/screens/trip_detail_screen.dart`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/mobile/lib/screens/trip_detail_screen.dart):
  - **Tabs**: `Budgets` & `Expenses` tabs.
  - **Features**: "Set Target Budget" modal dialog, expense logging, camera and gallery receipt capture via `image_picker`, and upload via `api.uploadReceipt`.
- [`mobile/lib/services/api_service.dart`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/mobile/lib/services/api_service.dart):
  - `getBudgets()`, `createBudget()`, `getExpenses()`, `createExpense()`, `uploadReceipt()`.

---

# 2. Experience & Activity Planning (Member 2)

### Member Responsibility
Curating rich travel itineraries, managing day-by-day activity timelines, preventing scheduling collisions, multi-step trip creation, destination intelligence across 20+ Sri Lankan regions, and OSRM road distance routing.

### File Locations & Implementation Details

#### A. AI Agent Service (`ai-service/`)
- [`ai-service/app/agents/trip_planner_agent.py`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/ai-service/app/agents/trip_planner_agent.py):
  - **Function**: Generates sequenced day-by-day travel timelines (Morning, Afternoon, Evening) matching traveler preferences.
- [`ai-service/app/agents/wizard_suggestion_agent.py`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/ai-service/app/agents/wizard_suggestion_agent.py):
  - **Function**: Analyzes user starting locations, dates, travel mode, and recommends tailored itineraries.
- [`ai-service/app/services/places_service.py`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/ai-service/app/services/places_service.py):
  - **Function**: Curated database of 20+ Sri Lankan regions (Ella, Sigiriya, Kandy, Mirissa, Nuwara Eliya, Ampara, Yala, etc.) with verified attractions and dynamic fallback generation.
- [`ai-service/app/services/osrm_client.py`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/ai-service/app/services/osrm_client.py):
  - **Function**: Queries OpenStreetMap OSRM routing coordinates to calculate realistic travel times between stops.
- [`ai-service/app/agents/orchestrator.py`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/ai-service/app/agents/orchestrator.py):
  - **Function**: Central multi-agent coordinator that manages execution across all specialist agents.

#### B. Backend API (`src/TravelWise.Api/`)
- [`src/TravelWise.Api/Controllers/TripsController.cs`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/src/TravelWise.Api/Controllers/TripsController.cs):
  - **Endpoints**: `GET /api/trips`, `POST /api/trips`, `PUT /api/trips/{id}`, `DELETE /api/trips/{id}`
  - **Function**: Manages trip master records, starting points, travel methods, and destinations.
- [`src/TravelWise.Api/Controllers/ActivitiesController.cs`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/src/TravelWise.Api/Controllers/ActivitiesController.cs):
  - **Endpoints**: `GET /api/activities/trip/{tripId}`, `POST /api/activities`, `DELETE /api/activities/{id}`
  - **Function**: Manages scheduled activity time slots, locations, and completion statuses.
- [`src/TravelWise.Api/Controllers/DestinationsController.cs`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/src/TravelWise.Api/Controllers/DestinationsController.cs) & [`src/TravelWise.Api/Controllers/CatalogController.cs`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/src/TravelWise.Api/Controllers/CatalogController.cs):
  - **Function**: Supplies destination metadata, categories, and service provider offerings.

#### C. Web Frontend (`web/src/`)
- [`web/src/components/ExploreSriLankaView.tsx`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/web/src/components/ExploreSriLankaView.tsx):
  - **Function**: Interactive catalog covering 9 provinces, category filtering (Cultural, Nature, Beach, Mountain, Heritage), and destination details modal.
- [`web/src/main.tsx`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/web/src/main.tsx):
  - **Function**: Trip Creation Wizard modal, interactive itinerary timeline, drag-and-drop day scheduler, and popular escape cards.

#### D. Flutter Mobile App (`mobile/lib/`)
- [`mobile/lib/screens/dashboard_screen.dart`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/mobile/lib/screens/dashboard_screen.dart):
  - **Function**: Coastal hero card, popular escapes deck (Ella, Sigiriya, Mirissa) with 1-tap trip planner trigger, and quick search bar.
- [`mobile/lib/screens/explore_screen.dart`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/mobile/lib/screens/explore_screen.dart):
  - **Function**: Sri Lanka attraction cards, category filters, and verified partner service integration.
- [`mobile/lib/screens/trip_wizard_dialog.dart`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/mobile/lib/screens/trip_wizard_dialog.dart):
  - **Function**: 4-step stepper wizard (Destination, Dates, Solo/Group, Transport Mode, Budget & Interests).
- [`mobile/lib/screens/trips_screen.dart`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/mobile/lib/screens/trips_screen.dart) & [`mobile/lib/screens/trip_detail_screen.dart`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/mobile/lib/screens/trip_detail_screen.dart):
  - **Function**: Activity timeline management, add activity dialog, delete trip with confirmation.

---

# 3. Travel Safety & Risk Management (Member 3)

### Member Responsibility
Evaluating environmental travel safety, integrating real-time weather forecasts, monitoring weather hazards (flash floods, landslides in hill country, rough sea alerts), checking itinerary compliance (BR-RISK-01), and providing direct emergency hotline access.

### File Locations & Implementation Details

#### A. AI Agent Service (`ai-service/`)
- [`ai-service/app/agents/risk_calculate_agent.py`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/ai-service/app/agents/risk_calculate_agent.py):
  - **Function**: Evaluates outdoor itinerary activities against meteorological conditions (rainfall, wind speed). Flags high-risk hazards (BR-RISK-01 compliance).
- [`ai-service/app/agents/sequential_review_agent.py`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/ai-service/app/agents/sequential_review_agent.py):
  - **Function**: Performs sequential automated plan reviews, ensuring safety constraints and travel methods are verified prior to approval.

#### B. Backend API (`src/TravelWise.Api/`)
- [`src/TravelWise.Api/Controllers/WeatherController.cs`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/src/TravelWise.Api/Controllers/WeatherController.cs):
  - **Endpoints**: `GET /api/weather?destination={destination}`
  - **Function**: Queries Open-Meteo Geocoding and Forecast APIs to deliver live temperature, precipitation, and wind speeds without exposing client API keys.
- [`src/TravelWise.Api/Controllers/RisksController.cs`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/src/TravelWise.Api/Controllers/RisksController.cs):
  - **Endpoints**: `GET /api/risks/trip/{tripId}`
  - **Function**: Returns destination safety advisories and risk indicators.
- [`src/TravelWise.Api/Models/RiskIndicator.cs`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/src/TravelWise.Api/Models/RiskIndicator.cs):
  - **Function**: Risk entity definition.

#### C. Web Frontend (`web/src/`)
- [`web/src/main.tsx`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/web/src/main.tsx) (`activeNav === "weather"`):
  - **UI Components**: Real-time weather cards for top Sri Lankan destinations, Open-Meteo live condition displays, BR-RISK-01 compliance verification badge, and emergency hotlines.

#### D. Flutter Mobile App (`mobile/lib/`)
- [`mobile/lib/screens/weather_safety_screen.dart`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/mobile/lib/screens/weather_safety_screen.dart):
  - **Function**: Destination search bar, 10 popular city chips (Ella, Sigiriya, Mirissa, etc.), live temperature/rain/wind cards, environmental safety advisory banner, and emergency hotline speed-dial cards:
    - `1912` — Sri Lanka Tourist Police Hotline
    - `117` — Disaster Management Centre (DMC)
    - `1990` — 1990 Suwa Seriya Free Emergency Ambulance
    - `119` — Police Emergency Helpline
- [`mobile/lib/screens/trip_detail_screen.dart`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/mobile/lib/screens/trip_detail_screen.dart):
  - **Tab**: `Risks` tab for trip-specific hazards.
- [`mobile/lib/services/api_service.dart`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/mobile/lib/services/api_service.dart):
  - `getWeather(destination)`, `getRisks(tripId)`.

---

# 4. Group Split Billing & Shared Expenses (Member 4)

### Member Responsibility
Facilitating group travel collaboration, managing group rosters, equal and proportional expense sharing, and executing the Greedy Minimum Cash Flow graph algorithm to compute the minimal transactions needed to clear all group debts.

### File Locations & Implementation Details

#### A. AI Agent Service (`ai-service/`)
- [`ai-service/app/agents/budget_controller_agent.py`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/ai-service/app/agents/budget_controller_agent.py):
  - **Function**: Formulates initial fair split strategies (Equal, Custom proportions) among group participants.

#### B. Backend API (`src/TravelWise.Api/`)
- [`src/TravelWise.Api/Controllers/SettlementsController.cs`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/src/TravelWise.Api/Controllers/SettlementsController.cs):
  - **Endpoints**: `GET /api/settlements/trip/{tripId}`
  - **Function**: Implements the **Greedy Minimum Cash Flow algorithm**. Computes individual net balances (`Amount Paid - Share`), groups into Debtors and Creditors, and calculates the minimum pairwise payments required to settle all debts (conserving `sum(balances) == 0`).
- [`src/TravelWise.Api/Controllers/GroupController.cs`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/src/TravelWise.Api/Controllers/GroupController.cs):
  - **Endpoints**: `GET /api/groups/{tripId}/members`, `POST /api/groups/members`, `DELETE /api/groups/members/{id}`
  - **Function**: Manages group member rosters and traveler invitations.
- [`src/TravelWise.Api/Models/SharedExpense.cs`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/src/TravelWise.Api/Models/SharedExpense.cs), [`src/TravelWise.Api/Models/ExpenseSplit.cs`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/src/TravelWise.Api/Models/ExpenseSplit.cs), [`src/TravelWise.Api/Models/GroupMember.cs`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/src/TravelWise.Api/Models/GroupMember.cs), [`src/TravelWise.Api/Models/SettlementRecord.cs`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/src/TravelWise.Api/Models/SettlementRecord.cs):
  - **Function**: Relational entities modeling splits and settlements.

#### C. Web Frontend (`web/src/`)
- [`web/src/main.tsx`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/web/src/main.tsx) (`activeNav === "settlement"`):
  - **UI Components**: Group Debt Settlement Matrix, group trip selector, member balance cards (+ owes / - is owed), and pairwise minimum transfer directions ("Kasun pays Nimal LKR 5,000").

#### D. Flutter Mobile App (`mobile/lib/`)
- [`mobile/lib/screens/settlement_screen.dart`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/mobile/lib/screens/settlement_screen.dart):
  - **Function**: Standalone group settlement dashboard with trip picker, member net balance sheets, optimal transfers list, and fully settled status indicator.
- [`mobile/lib/screens/trip_detail_screen.dart`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/mobile/lib/screens/trip_detail_screen.dart):
  - **Tabs**: `Members` tab (invite member by name/email), `Expenses` tab (split breakdown), and `Settlement` tab.
- [`mobile/lib/services/api_service.dart`](file:///c:/Users/Arosha%20Induma/OneDrive/Desktop/SEF%20final%20project/new/TravelWise/mobile/lib/services/api_service.dart):
  - `getGroupMembers()`, `addGroupMember()`, `deleteGroupMember()`, `getSettlement()`.
