# TravelWise: Comprehensive Frontend Feature & Validation Specification

> [!IMPORTANT]
> **MANDATORY ARCHITECTURAL PRINCIPLE FOR FLUTTER APP DEVELOPMENT:**
> - The Flutter mobile app **MUST NEVER** connect directly to the Python AI service (port 8000) or directly to Supabase.
> - **All network traffic** flows strictly through the public ASP.NET Core Backend API (`TravelWise.Api` - port 5127 locally or hosted cloud URL).
> - The ASP.NET Core API handles all database reads/writes with Supabase and internal communication with the Python AI service.
> - During mobile app development, **no backend, AI, or web files are to be altered**. All changes must stay inside `mobile/`.

---

## 1. System Roles & Access Control

| Role | Description | Core Capabilities |
| :--- | :--- | :--- |
| **User (Traveller)** | General traveller creating itineraries and exploring Sri Lanka. | Browse Explore catalog, use 6-step AI Trip Wizard, manage trips, track budgets & shared expenses, view weather & safety alerts, browse transport fares and rental vehicles. |
| **ServiceProvider** | Tourism vendor (Hotels, Restaurants, Transport, Attractions). | Same as User + publish listings (Visiting Places, Restaurants, Accommodations, Rental Vehicles), view verification status of their listings, manage provider profile. |
| **StaffAdmin** | System administrator / verifier. | System overview, approve/reject provider applications, approve/reject catalog listings, review AI trip submissions, approve transport fare sheets, inspect audit logs. |

---

## 2. Comprehensive Feature Breakdown & Screen Flows

### 2.1 Authentication & Onboarding Module
* **Views / Modes:**
  1. **Login Mode:** Email + Password.
  2. **Register Mode:** Role selector (`User` vs `ServiceProvider`), Email, Password, Display Name, Contact Phone (mandatory for Service Provider), Service Type dropdown.
  3. **Forgot Password:** Request password reset email / OTP token.
  4. **Reset Password:** Token + New Password + Confirm Password.
* **Buttons & Actions:**
  * **"Sign In" Button:**
    - Action: `POST /api/auth/login` with `{ email, password }`.
    - Returns: JWT access token + user object (`id`, `email`, `displayName`, `role`).
    - Post-Action: Store token securely (`FlutterSecureStorage`), navigate to Main Navigation / Dashboard.
  * **"Create Account" Button:**
    - Action: `POST /api/auth/register` with `{ email, password, role, displayName, contactPhone, serviceType }`.
    - Feedback: Success message prompting login.
  * **"Forgot Password?" Link:** Opens forgot password input view.
  * **"Send Reset Link" Button:** `POST /api/auth/forgot-password` with `{ email }`.
  * **"Update Password" Button:** `POST /api/auth/reset-password` with `{ email, token, newPassword }`.
* **Validations & Constraints:**
  * Email must be a valid email format (`regex: ^[^\s@]+@[^\s@]+\.[^\s@]+$`).
  * Password minimum length: **6 characters** (recommended 8+ with alphanumeric).
  * Display name cannot be empty.
  * For Service Provider: `contactPhone` must not be blank and must contain valid phone characters (digits, +, -).

---

### 2.2 Dashboard & Quick Planner (Coastal Hero)
* **Components:**
  1. **Coastal Hero Quick Planner:**
     - Quick Destination dropdown / autocomplete (`Ella`, `Sigiriya`, `Mirissa`, `Kandy`, `Nuwara Eliya`, `Galle`, `Yala`, `Colombo`, `Arugam Bay`, `Trincomalee`).
     - Start Date & End Date pickers (Default: today to today + 3 days).
     - Guest / Traveller count spinner (Default: 2).
     - **"Plan Trip Now" Button:** Opens the 6-step Trip Wizard pre-populated with destination, dates, and mode (Group if guests > 1, else Solo).
  2. **Metric Summary Cards:**
     - Active Trips Count
     - Total Planned Budget (in LKR or preferred currency)
     - Weather & Safety alerts badge
  3. **Recent Trips Carousel / List:**
     - Cards showing Destination, Dates, Status badge (`DRAFT`, `PENDING_REVIEW`, `APPROVED`), and progress indicators.
     - Tapping a trip navigates to the **Trip Detail View**.

---

### 2.3 Explore Sri Lanka / Catalog
* **Features:**
  1. **Category Pills Filter:**
     - `ALL` (All Attractions)
     - `Beaches` (Beaches & Coastal)
     - `Historical Ruins` (Ancient Ruins & UNESCO)
     - `Natural Waterfalls` (Natural Waterfalls)
     - `Hiking & Peaks` (Hiking & Misty Peaks)
     - `Wildlife & Nature` (Wildlife Safaris & Nature)
  2. **Search Bar & Sort Options:**
     - Real-time search query filtering by destination or name.
     - Sort by: Rating (Highest first), Name (A-Z), Price (Low to High), Price (High to Low).
  3. **Attraction Card Details:**
     - Image, Name, Category badge, Destination, Rating stars, Price/Ticket indication, Description snippet.
     - **"View Details" Action:** Opens detailed modal with full description, travel tips, contact/location info.
     - **"Plan a Trip Here" Button:** Pre-populates Trip Wizard with this destination.
  4. **Provider / Admin Listing Management:**
     - Providers can click **"+ Add Listing"** to submit a new place/service.
     - Submits `POST /api/catalog` with `{ type, name, destination, description, price, address, contact }`.
* **Validations:**
  * Listing title and destination are required.
  * Price must be `>= 0`.

---

### 2.4 Six-Step AI Trip Planning Wizard
The cornerstone feature of TravelWise, providing intelligent itinerary generation.

| Step | Step Title | Fields & User Inputs | Validations & Business Logic |
| :---: | :--- | :--- | :--- |
| **0** | **Starting Point** | `startingPoint` (Autocomplete / text input of Sri Lankan city of origin, e.g. Colombo, Negombo, Airport). | Cannot be empty. Must be a valid origin. |
| **1** | **Trip Setup** | 1. Trip Name.<br>2. Destination.<br>3. Start Date & End Date.<br>4. Trip Mode: `SOLO` or `GROUP`.<br>5. Travel Method: `PRIVATE_VEHICLE`, `RENTAL_VEHICLE`, `PUBLIC_TRANSPORT`.<br>6. Sub-options: Rental vehicle type (`Bike`, `Car`, `Van`, `Bus`, `Tuk-Tuk`), With Driver checkbox (`true`/`false`), or Public Transport type (`Bus`, `Train`).<br>7. If `GROUP`: Dynamic group member email inputs. | - `name` required.<br>- `destination` required.<br>- `startDate <= endDate`.<br>- At least 1 day duration.<br>- Group mode requires valid email entries for members. |
| **2** | **Budget** | 1. Total Budget amount (numeric).<br>2. Currency (`LKR`, `USD`, `EUR`, `GBP`).<br>3. Itemized Category Budgets: Food, Accommodation, Transport.<br>4. Multi-Currency Conversion toggle. | - Total Budget must be `> 0`.<br>- Sum of category budgets should not exceed total budget.<br>- Numeric validation only. |
| **3** | **Activities** | 1. Interest tags (Multi-select: Hiking, Nature, Culture, Nightlife, Historical, Foodie).<br>2. Daily Time Limit (hours per day).<br>3. Must-Visit Places (comma-separated or free text). | - At least 1 interest tag recommended.<br>- Time limit must be between 1 and 18 hours. |
| **4** | **Safety** | 1. Safety Location confirmation.<br>2. High-Risk Activities selection (Hiking, Water Sports, Extreme Sports).<br>3. Emergency contact confirmation. | High-risk activities flag the trip for enhanced safety evaluation. |
| **5** | **Review & AI Audit** | 1. Summary of all inputs.<br>2. **"Generate AI Suggestions" Button:** Triggers `POST /api/workflows` to generate tailored itinerary activities, budget analysis, and safety advice.<br>3. Submit to Admin Review checkbox (`submitToAdmin: true`).<br>4. **"Create Trip" Final Button.** | - Triggers `POST /api/trips` to save the trip.<br>- If `submitToAdmin` is checked, triggers `POST /api/trips/{id}/submit-admin`. |

---

### 2.5 Trip Detail View & Sub-Modules
When a user opens an existing trip:

1. **Overview & Header:**
   - Destination banner, status badge (`Draft`, `Submitted`, `Approved`, `Rejected`), Dates, Traveller info.
   - Admin feedback banner (displays admin warnings, advice, or approval notes).
2. **Itemized Budget Breakdown Modal:**
   - Visual progress bar: Spent vs Allocated budget.
   - Breakdown by Food, Accommodation, Transport, Activities, Miscellaneous.
3. **Shared Expenses & Group Settlement:**
   - List of expenses: Amount, Currency, Description, Paid By, Date.
   - Add Expense Button: Dialog with description, amount, payer selector, and receipt upload.
   - **Settlement Calculator:** Automatically calculates simplified peer-to-peer debts (e.g., *"Alice owes Bob Rs. 2,500"*).
4. **Day-by-Day Activities:**
   - Chronological list of itinerary items with start/end times and locations.
   - Add / Edit / Delete Activity capabilities.
5. **Weather & Safety Risk Assessment:**
   - Fetches live destination weather (`GET /api/weather?destination=...`).
   - Risk severity indicator: `Low` (Green), `Medium` (Yellow), `High` (Orange), `Critical` (Red).
   - Weather summary, safety precautions, emergency local hotline numbers.
6. **Group Members Collaboration:**
   - List members, invite new members via email, toggle active status.
7. **Suggested Listings & Verified AI Reviews:**
   - Recommended accommodations and dining vetted for this trip.

---

### 2.6 Transport Fare & Rental Vehicles Portals
1. **Transport Fare Portal:**
   - Tabs: **Railway** vs **Bus**.
   - Displays official public transit route fares, stations, and schedule matrices.
   - Role permissions: Admin / Verified Providers can upload updated CSV fare schedules (`POST /api/transportfares/upload`).
2. **Rental Vehicles Portal:**
   - Filters: Vehicle category (`Bike`, `Car`, `Van`, `Bus`, `TukTuk`), Driver Included (`Yes`/`No`), Max Rate per KM.
   - Card details: Model, Year, Rate/km, Extra Night charge, Seating capacity, Location, Provider phone.
   - **Provider Action ("List Your Vehicle"):**
     - Form: Model, Year, Rate/km, Night charge, Seats, Driver option, Phone, Location.
     - Validations: Year must be between 1990 and current year + 1; Rate/km must be `> 0`.

---

### 2.7 Profile, Password Change & Danger Zone
1. **Profile Details:**
   - Edit Display Name, Phone Number, Service Type.
   - Save updates via `POST /api/auth/profile`.
2. **Change Password:**
   - Current Password + New Password (min 6 characters) + Confirm New Password.
   - Validates that `newPassword === confirmPassword` and `newPassword !== currentPassword`.
3. **Permanent Account Deletion (Danger Zone):**
   - High-security confirmation dialog.
   - Requires typing exact phrase `"DELETE"` or user email to confirm.
   - Submits `POST /api/auth/delete-account` or flags deletion request for admin review.

---

## 3. Master Button & API Endpoint Mapping

| Feature Screen | Button / Action | Method | Endpoint Path | Primary Request Payload | Success UI Feedback |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **Auth** | Sign In | `POST` | `/api/auth/login` | `{ email, password }` | Save token, transition to Dashboard. |
| **Auth** | Register | `POST` | `/api/auth/register` | `{ email, password, role, displayName, contactPhone }` | Display success alert, switch to Login. |
| **Auth** | Forgot Password | `POST` | `/api/auth/forgot-password` | `{ email }` | Show token sent confirmation. |
| **Auth** | Reset Password | `POST` | `/api/auth/reset-password` | `{ email, token, newPassword }` | Show password updated success. |
| **Quick Planner** | Plan Trip Now | - | Local Client Navigation | Pre-fills Trip Wizard state | Opens Wizard at Step 0. |
| **Wizard** | Generate AI Suggestions | `POST` | `/api/workflows` | `{ tripId, objective: "wizard_plan" }` | Populates suggestions card with AI activities & budget advice. |
| **Wizard** | Create Trip | `POST` | `/api/trips` | `{ name, destination, startDate, endDate, ... }` | Adds to trip list, navigates to Trip Detail. |
| **Wizard** | Submit for Admin Review | `POST` | `/api/trips/{id}/submit-admin` | `{ planningDetailsJson: ... }` | Status badge updates to `PENDING_REVIEW`. |
| **Trip Detail** | Add Budget | `POST` | `/api/budgets` | `{ tripId, amount, currency }` | Refreshes budget bar. |
| **Trip Detail** | Add Expense | `POST` | `/api/expenses` | `{ tripId, amount, description, paidBy, currency }` | Appends expense, recalculates settlements. |
| **Trip Detail** | Upload Receipt | `POST` | `/api/receipts` | Multipart file upload | Shows green checkmark & links to expense. |
| **Trip Detail** | Add Activity | `POST` | `/api/activities` | `{ tripId, name, location, startAt, endAt }` | Inserts activity into timeline. |
| **Trip Detail** | Delete Activity | `DELETE`| `/api/activities/{id}` | None | Removes item from timeline. |
| **Trip Detail** | Add Group Member | `POST` | `/api/groups/members` | `{ tripId, displayName, email }` | Member added to list. |
| **Trip Detail** | Delete Trip | `DELETE`| `/api/trips/{id}` | None | Navigates back to Dashboard/Trips list. |
| **Explore** | Add Attraction/Listing | `POST` | `/api/catalog` | `{ type, name, destination, description, price, ... }` | Listing pending approval or published. |
| **Transport** | Upload Fare File | `POST` | `/api/transportfares/upload` | Multipart CSV file | New fare schedule pending approval. |
| **Vehicles** | Create Vehicle Listing | `POST` | `/api/rentalvehicles` | `{ vehicleType, vehicleModel, ratePerKm, ... }` | Card added with `PendingReview` badge. |
| **Profile** | Update Profile | `POST` | `/api/auth/profile` | `{ displayName, contactPhone, serviceType }` | Success toast message. |
| **Profile** | Change Password | `POST` | `/api/auth/change-password` | `{ currentPassword, newPassword }` | Clear inputs, show success banner. |
| **Profile** | Delete Account | `POST` | `/api/auth/delete-account` | `{ confirmText, reason }` | Signs out, clears storage, redirects to Auth. |

---

## 4. Mobile UX Guidelines & Best Practices for Flutter

1. **State Management & Async Feedback:**
   - Every network operation must show an active spinner (`CircularProgressIndicator` or skeleton loader).
   - Show user-friendly error dialogs / SnackBars on network failure.
2. **Form Validations:**
   - Real-time client-side validation using Flutter `Form` and `TextFormField(validator: ...)`.
   - Prevent button submission while form is invalid or already submitting (`busy == true`).
3. **Date Pickers:**
   - Use Flutter's native `showDatePicker` with `firstDate: DateTime.now()`.
   - Automatically constrain `endDate >= startDate`.
4. **Offline Resilience & Fallbacks:**
   - If the backend is slow or unreachable, show retry banners instead of crashing.
5. **Theme & Styling:**
   - Adhere to the established coastal turquoise/emerald palette defined in `lib/theme/app_theme.dart`.
   - Support crisp typography, rounded cards (border radius 12-16px), subtle elevation, and intuitive bottom navigation.
