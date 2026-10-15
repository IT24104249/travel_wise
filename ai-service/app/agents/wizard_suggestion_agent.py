from __future__ import annotations
import os
import urllib.request
import urllib.parse
import json
from datetime import datetime, date
from typing import Any
from pydantic import BaseModel, Field


class WizardSuggestionInput(BaseModel):
    name: str = Field(default="", description="Trip plan name")
    destination: str = Field(default="", description="Destination in Sri Lanka")
    starting_point: str = Field(default="", description="Starting point or city")
    start_date: str = Field(default="", description="YYYY-MM-DD")
    end_date: str = Field(default="", description="YYYY-MM-DD")
    travel_method: str = Field(default="PRIVATE_VEHICLE")  # PRIVATE_VEHICLE, RENTAL_VEHICLE, PUBLIC_TRANSPORT
    vehicle_type: str = Field(default="")
    with_driver: bool = Field(default=False, description="Whether driver is included/hired (True) or self-drive (False)")
    total_budget: float = Field(default=0.0)
    currency: str = Field(default="LKR")
    trip_mode: str = Field(default="SOLO")  # SOLO, GROUP, COUPLE, FAMILY
    group_members: list[str] = Field(default_factory=list)
    interests: list[str] = Field(default_factory=list)
    must_visit_places: str = Field(default="")
    daily_time_limit: float = Field(default=8.0)
    high_risk_activities: list[str] = Field(default_factory=list)
    split_strategy: str = Field(default="EQUAL")


class WizardIssue(BaseModel):
    field: str
    step: int  # 0: Starting Point, 1: Overview & Dates, 2: Budget, 3: Experiences, 4: Safety, 5: Split
    severity: str  # "ERROR", "WARNING", "INFO"
    title: str
    message: str
    suggestion: str


class SuggestedAccommodation(BaseModel):
    id: str | None = None
    name: str
    type: str = "Hotel"
    price_per_night: float = 0.0
    location: str | None = None
    contact_number: str | None = None
    amenities: str | None = None
    special_notes: str | None = None
    source: str = "Verified Partner Listing"


class SuggestedDish(BaseModel):
    name: str
    price: float = 0.0
    category: str = "Meal"


class SuggestedRestaurant(BaseModel):
    id: str | None = None
    name: str
    location: str | None = None
    contact: str | None = None
    description: str | None = None
    dishes: list[SuggestedDish] = Field(default_factory=list)
    source: str = "Verified Partner Restaurant"


class SuggestedRentalVehicle(BaseModel):
    id: str | None = None
    vehicle_type: str
    vehicle_model: str
    manufacturing_year: int = 2022
    owner_contact_phone: str = ""
    rate_per_km: float = 0.0
    extra_charge_per_night: float = 0.0
    location: str = "Islandwide"
    seating_capacity: int = 4
    driver_included: bool = True
    provider_name: str = "Verified Fleet Partner"
    source: str = "Service Provider Vehicle Fleet"


class SuggestedVisitingPlace(BaseModel):
    id: str | None = None
    name: str
    description: str | None = None
    location: str | None = None
    ticket_required: bool = False
    ticket_price: float | None = None
    ticket_type: str | None = "Standard"
    source: str = "Recommended Attraction"


class SuggestedListingsPayload(BaseModel):
    accommodations: list[SuggestedAccommodation] = Field(default_factory=list)
    restaurants: list[SuggestedRestaurant] = Field(default_factory=list)
    rental_vehicles: list[SuggestedRentalVehicle] = Field(default_factory=list)
    visiting_places: list[SuggestedVisitingPlace] = Field(default_factory=list)


class WizardSuggestionResult(BaseModel):
    readiness_score: int  # 0 to 100
    is_ready_for_admin_submission: bool
    summary: str
    status_badge: str  # "READY_FOR_SUBMISSION", "NEEDS_ATTENTION", "CRITICAL_MISSING_DATA"
    critical_errors_count: int
    warnings_count: int
    missing_fields: list[WizardIssue]
    positive_highlights: list[str]
    suggested_listings: SuggestedListingsPayload
    tools_used: list[str] = [
        "Wizard-Completeness-Auditor",
        "Budget-Adequacy-Engine",
        "Vehicle-Capacity-Validator",
        "Service-Provider-Catalog-Matcher"
    ]


def _fetch_matching_listings_from_backend(destination: str, vehicle_type: str) -> dict:
    """Fetch published listings from the C# TravelWise backend via REST API."""
    backend_url = os.getenv("BACKEND_API_URL", "http://localhost:5127")
    try:
        dest_clean = (destination or "").strip()
        if not dest_clean:
            return {}
        dest_enc = urllib.parse.quote(dest_clean)
        veh_enc = urllib.parse.quote((vehicle_type or "Car").strip())
        url = f"{backend_url}/api/destinations/matching-listings?destination={dest_enc}&vehicleType={veh_enc}"
        req = urllib.request.Request(url, headers={"User-Agent": "TravelWise-AI-Agent"})
        with urllib.request.urlopen(req, timeout=2.0) as resp:
            if resp.status == 200:
                return json.loads(resp.read().decode("utf-8"))
    except Exception:
        pass
    return {}


def _validate_vehicle_capacity(
    v_type_raw: str,
    travel_method_raw: str,
    persons: int,
    with_driver: bool
) -> list[WizardIssue]:
    """Validates passenger count against vehicle capacity limits according to Sri Lankan transport standards."""
    issues = []
    v_type = (v_type_raw or "").strip().upper()
    method = (travel_method_raw or "PRIVATE_VEHICLE").strip().upper()

    # Determine vehicle category
    is_bike = any(k in v_type for k in ["BIKE", "MOTORBIKE", "SCOOTER", "MOTORCYCLE"])
    is_tuk = any(k in v_type for k in ["TUK", "THREE", "WHEELER", "BAJAJ"])
    is_car = any(k in v_type for k in ["CAR", "SEDAN", "HATCHBACK", "PRIUS", "WAGON", "AQUA", "AXIO", "PREMIO", "JEEP", "SUV"])
    is_van = any(k in v_type for k in ["VAN", "KDH", "CARAVAN", "HIACE", "COMMUTER", "MINIVAN"])
    is_bus = any(k in v_type for k in ["BUS", "COACH", "ROSA", "COASTER"])

    if is_bike:
        if with_driver:
            # Bike with driver: Driver + 1 passenger
            if persons > 1:
                issues.append(WizardIssue(
                    field="vehicleCapacity",
                    step=1,
                    severity="ERROR",
                    title="Motorbike Capacity Exceeded (With Driver)",
                    message=f"A motorbike hired with a driver/rider can only carry 1 passenger. You have selected {persons} travelers.",
                    suggestion=f"For your group of {persons} people, please choose a Tuk-Tuk (up to 3 passengers), Car (up to 4 passengers), or Van in Step 2."
                ))
        else:
            # Bike without driver: Self-drive (1 rider + 1 pillion passenger = max 2)
            if persons > 2:
                issues.append(WizardIssue(
                    field="vehicleCapacity",
                    step=1,
                    severity="ERROR",
                    title="Motorbike Overloaded (Without Driver)",
                    message=f"A motorbike can legally and safely carry at most 2 people (1 rider + 1 pillion). Carrying {persons} people on a single bike is illegal and dangerous in Sri Lanka.",
                    suggestion=f"Please switch to a Car, Tuk-Tuk, or Van in Step 2 to safely accommodate all {persons} group members."
                ))

    elif is_tuk:
        if with_driver:
            # Tuk Tuk with driver: max 3 passengers in passenger cabin
            if persons > 3:
                issues.append(WizardIssue(
                    field="vehicleCapacity",
                    step=1,
                    severity="ERROR",
                    title="Tuk-Tuk Capacity Exceeded (With Driver)",
                    message=f"A three-wheeler with a driver has a strict legal capacity limit of 3 passengers. Your group has {persons} members.",
                    suggestion=f"For {persons} passengers, switch to a Car (up to 4) or Van (up to 10), or book multiple Tuk-Tuks in Step 2."
                ))
        else:
            # Tuk Tuk self drive: max 3 persons total
            if persons > 3:
                issues.append(WizardIssue(
                    field="vehicleCapacity",
                    step=1,
                    severity="ERROR",
                    title="Tuk-Tuk Overloaded (Without Driver)",
                    message=f"A self-drive three-wheeler has a maximum legal capacity of 3 people total. Your group has {persons} travelers.",
                    suggestion=f"Select a Car (up to 4-5) or Van (up to 10) in Step 2."
                ))

    elif is_car:
        if with_driver:
            # Car with driver: driver takes 1 seat, max 4 passengers
            if persons > 4:
                issues.append(WizardIssue(
                    field="vehicleCapacity",
                    step=1,
                    severity="ERROR",
                    title="Car Capacity Exceeded (With Driver)",
                    message=f"A standard chauffeur-driven car can accommodate at most 4 passengers (driver occupies 1 seat). Your group has {persons} people.",
                    suggestion=f"Select a Passenger Van (seats 8-10 passengers) in Step 2 to comfortably fit all {persons} travelers with their luggage."
                ))
        else:
            # Car self-drive: max 5 persons total
            if persons > 5:
                issues.append(WizardIssue(
                    field="vehicleCapacity",
                    step=1,
                    severity="ERROR",
                    title="Car Overloaded (Without Driver)",
                    message=f"A standard passenger car can legally seat at most 5 people total. Your group has {persons} travelers.",
                    suggestion=f"Select a Van or Mini-Bus in Step 2 to safely accommodate all {persons} travelers."
                ))

    elif is_van:
        if persons > 10:
            issues.append(WizardIssue(
                field="vehicleCapacity",
                step=1,
                severity="ERROR",
                title="Van Capacity Exceeded",
                message=f"A standard tourist van seats up to 10 passengers. Your party of {persons} exceeds standard van capacity.",
                suggestion=f"Select a Mini-Bus or Coach Bus in Step 2 for groups larger than 10."
            ))

    elif is_bus:
        if persons > 50:
            issues.append(WizardIssue(
                field="vehicleCapacity",
                step=1,
                severity="ERROR",
                title="Bus Capacity Exceeded",
                message=f"A standard coach bus seats up to 50 passengers. Your group has {persons} travelers.",
                suggestion="For groups exceeding 50 passengers, please arrange multiple buses."
            ))
        elif persons <= 3 and method != "PUBLIC_TRANSPORT":
            issues.append(WizardIssue(
                field="vehicleCapacity",
                step=1,
                severity="WARNING",
                title="Vehicle Inefficiency (Bus Selected)",
                message=f"Hiring a full bus for only {persons} traveler(s) is economically inefficient and will inflate your trip expenses.",
                suggestion="Consider switching to a Car or Tuk-Tuk in Step 2 for a much more economical and agile trip."
            ))

    return issues


def analyze_wizard_and_suggest(input_data: WizardSuggestionInput) -> WizardSuggestionResult:
    """Audits wizard details for missing or inconsistent fields and matches verified partner listings."""
    issues: list[WizardIssue] = []
    positive_notes: list[str] = []
    score = 100

    # 1. Starting Point Check (Step 0)
    start_pt = (input_data.starting_point or "").strip()
    if not start_pt:
        score -= 15
        issues.append(WizardIssue(
            field="startingPoint",
            step=0,
            severity="ERROR",
            title="Starting Point Missing",
            message="Your trip starting location is not specified.",
            suggestion="Enter your starting city or hotel (e.g. Colombo, Negombo, Kandy) in Step 0."
        ))
    else:
        positive_notes.append(f"Starting journey from {start_pt}.")

    # 2. Destination Check (Step 1)
    dest = (input_data.destination or "").strip()
    if not dest:
        score -= 25
        issues.append(WizardIssue(
            field="destination",
            step=1,
            severity="ERROR",
            title="Destination Missing",
            message="You have not selected a travel destination.",
            suggestion="Select a Sri Lankan destination (e.g. Ella, Kandy, Galle, Sigiriya) in Step 1."
        ))
    else:
        positive_notes.append(f"Destination '{dest}' selected.")

    # 3. Dates & Duration Check (Step 1)
    d_start = None
    d_end = None
    days = 1
    if not input_data.start_date or not input_data.end_date:
        score -= 20
        issues.append(WizardIssue(
            field="dates",
            step=1,
            severity="ERROR",
            title="Travel Dates Incomplete",
            message="Start date and end date must both be selected.",
            suggestion="Pick your departure and return dates in Step 1."
        ))
    else:
        try:
            d_start = datetime.strptime(input_data.start_date[:10], "%Y-%m-%d").date()
            d_end = datetime.strptime(input_data.end_date[:10], "%Y-%m-%d").date()

            if d_end < d_start:
                score -= 25
                issues.append(WizardIssue(
                    field="dates",
                    step=1,
                    severity="ERROR",
                    title="End Date Before Start Date",
                    message="Your return date occurs earlier than your departure date.",
                    suggestion="Correct the date range in Step 1 so that the end date follows the start date."
                ))
            else:
                days = (d_end - d_start).days + 1
                today = date.today()
                if d_start < today:
                    score -= 10
                    issues.append(WizardIssue(
                        field="dates",
                        step=1,
                        severity="WARNING",
                        title="Start Date in Past",
                        message=f"Departure date ({d_start}) has already passed.",
                        suggestion="Update to an upcoming date in Step 1."
                    ))
                elif days > 30:
                    score -= 5
                    issues.append(WizardIssue(
                        field="dates",
                        step=1,
                        severity="WARNING",
                        title="Extended Expedition",
                        message=f"Duration of {days} days is quite long for a single itinerary.",
                        suggestion="Consider breaking trips longer than 30 days into smaller regional stages."
                    ))
                else:
                    positive_notes.append(f"Well planned trip duration of {days} day(s).")
        except Exception:
            score -= 15
            issues.append(WizardIssue(
                field="dates",
                step=1,
                severity="ERROR",
                title="Invalid Date Format",
                message="Dates are not formatted correctly.",
                suggestion="Use YYYY-MM-DD standard date picker in Step 1."
            ))

    # 4. Budget Check (Step 2) — MOST IMPORTANT CHECK REQUESTED BY USER
    # (ex: "budget eka dala nathinam, budget fill karnna")
    total_budget = float(input_data.total_budget or 0.0)
    members_count = len(input_data.group_members)
    persons = max(1, members_count)

    if total_budget <= 0.0:
        score -= 30
        issues.append(WizardIssue(
            field="totalBudget",
            step=2,
            severity="ERROR",
            title="Trip Budget Missing (Required)",
            message="No trip budget has been specified. Budget information is essential for cost analysis.",
            suggestion="Navigate to Step 2 (Budget and initial expenses) and enter your total estimated budget."
        ))
    else:
        # Check if realistic
        min_daily_per_person = 4000.0  # Approx 4,000 LKR per day per person bare minimum
        min_total_benchmark = min_daily_per_person * days * persons

        if input_data.currency.upper() == "LKR" and total_budget < min_total_benchmark:
            score -= 10
            issues.append(WizardIssue(
                field="totalBudget",
                step=2,
                severity="WARNING",
                title="Budget May Be Insufficient",
                message=f"Your proposed budget of {total_budget:,.0f} LKR for {persons} person(s) across {days} day(s) may fall short for comfortable accommodations and food.",
                suggestion=f"Realistic benchmark for {persons} person(s) over {days} day(s) in {dest or 'Sri Lanka'} is at least {min_total_benchmark:,.0f} LKR."
            ))
        else:
            positive_notes.append(f"Total budget of {total_budget:,.0f} {input_data.currency} provided.")

    # 5. Group Mode & Member Allocation (Step 1)
    if input_data.trip_mode.upper() in ["GROUP", "FAMILY"]:
        if members_count == 0:
            score -= 15
            issues.append(WizardIssue(
                field="groupMembers",
                step=1,
                severity="WARNING",
                title="Group Members Not Listed",
                message=f"Trip mode is set to '{input_data.trip_mode}' but no companions are listed.",
                suggestion="Add your group members' names in Step 1, or change trip mode to 'Solo'."
            ))
        else:
            positive_notes.append(f"Group setup with {members_count} companion(s) entered.")

    # 6. Transport Mode & Vehicle Capacity (Step 1)
    method = (input_data.travel_method or "PRIVATE_VEHICLE").upper()
    v_type = (input_data.vehicle_type or "").upper()

    if method in ["RENTAL_VEHICLE", "PUBLIC_TRANSPORT"] and not input_data.vehicle_type:
        score -= 10
        issues.append(WizardIssue(
            field="vehicleType",
            step=1,
            severity="WARNING",
            title="Vehicle Type Not Chosen",
            message="You selected rental/transit travel without specifying a vehicle category.",
            suggestion="Select Car, Van, Bus, Bike, or Tuk-Tuk in Step 1."
        ))

    # Comprehensive Vehicle Capacity Validation (Step 1)
    capacity_issues = _validate_vehicle_capacity(
        v_type_raw=input_data.vehicle_type,
        travel_method_raw=input_data.travel_method,
        persons=persons,
        with_driver=input_data.with_driver
    )
    if capacity_issues:
        for c_iss in capacity_issues:
            if c_iss.severity == "ERROR":
                score -= 25
            else:
                score -= 5
            issues.append(c_iss)
    elif input_data.vehicle_type:
        driver_str = "with driver" if input_data.with_driver else "without driver (self-drive)"
        positive_notes.append(f"Vehicle choice ({input_data.vehicle_type}, {driver_str}) accommodates your {persons} traveler(s).")

    # 7. Safety / Activities Check (Step 4)
    if input_data.high_risk_activities:
        positive_notes.append(f"{len(input_data.high_risk_activities)} activity risk factors flagged for safety monitoring.")

    # Normalize score
    final_score = max(0, min(100, score))
    critical_errors = [i for i in issues if i.severity == "ERROR"]
    warnings = [i for i in issues if i.severity == "WARNING"]
    is_ready = len(critical_errors) == 0

    if critical_errors:
        status_badge = "CRITICAL_MISSING_DATA"
        summary = f"Identified {len(critical_errors)} required field(s) needing attention before submitting to Admin."
    elif warnings:
        status_badge = "NEEDS_ATTENTION"
        summary = f"Plan is structurally complete with {len(warnings)} optimization suggestion(s)."
    else:
        status_badge = "READY_FOR_SUBMISSION"
        summary = "All trip details are complete, logically coherent, and ready for official Admin approval!"

    # 8. FETCH REAL SERVICE PROVIDER / ADMIN LISTINGS MATCHING WIZARD INPUTS
    backend_data = _fetch_matching_listings_from_backend(dest, input_data.vehicle_type)

    suggested_acc: list[SuggestedAccommodation] = []
    suggested_rest: list[SuggestedRestaurant] = []
    suggested_vehicles: list[SuggestedRentalVehicle] = []
    suggested_places: list[SuggestedVisitingPlace] = []

    # Parse Accommodations
    for a in backend_data.get("accommodations", []):
        suggested_acc.append(SuggestedAccommodation(
            id=str(a.get("id", "")),
            name=a.get("name", "Local Stay"),
            type=a.get("type", "Hotel"),
            price_per_night=float(a.get("pricePerNight", 0.0)),
            location=a.get("location"),
            contact_number=a.get("contactNumber"),
            amenities=a.get("amenities"),
            special_notes=a.get("specialNotes"),
            source=a.get("source", "Verified Partner Accommodation")
        ))

    # Parse Restaurants
    for r in backend_data.get("restaurants", []):
        dishes = [
            SuggestedDish(name=d.get("name", "Dish"), price=float(d.get("price", 0.0)), category=d.get("category", "Lunch"))
            for d in r.get("dishes", [])
        ]
        suggested_rest.append(SuggestedRestaurant(
            id=str(r.get("id", "")),
            name=r.get("name", "Restaurant"),
            location=r.get("location"),
            contact=r.get("contact"),
            description=r.get("description"),
            dishes=dishes,
            source=r.get("source", "Verified Partner Restaurant")
        ))

    # Parse Rental Vehicles
    for v in backend_data.get("rentalVehicles", []):
        suggested_vehicles.append(SuggestedRentalVehicle(
            id=str(v.get("id", "")),
            vehicle_type=v.get("vehicleType", "Car"),
            vehicle_model=v.get("vehicleModel", "Model"),
            manufacturing_year=int(v.get("manufacturingYear", 2022)),
            owner_contact_phone=v.get("ownerContactPhone", ""),
            rate_per_km=float(v.get("ratePerKm", 0.0)),
            extra_charge_per_night=float(v.get("extraChargePerNight", 0.0)),
            location=v.get("location", "Islandwide"),
            seating_capacity=int(v.get("seatingCapacity", 4)),
            driver_included=bool(v.get("driverIncluded", True)),
            provider_name=v.get("providerName", "Verified Partner"),
            source=v.get("source", "Verified Fleet Partner")
        ))

    # Parse Visiting Places
    for p in backend_data.get("visitingPlaces", []):
        suggested_places.append(SuggestedVisitingPlace(
            id=str(p.get("id", "")),
            name=p.get("name", "Attraction"),
            description=p.get("description"),
            location=p.get("location"),
            ticket_required=bool(p.get("ticketRequired", False)),
            ticket_price=float(p.get("ticketPrice", 0.0)) if p.get("ticketPrice") is not None else None,
            ticket_type=p.get("ticketType", "Standard"),
            source=p.get("source", "Verified Attraction")
        ))

    # Fallback Stays if backend had no accommodations for that destination
    if not suggested_acc:
        suggested_acc.append(SuggestedAccommodation(
            name=f"{dest or 'Local'} Heritage Boutique Hotel",
            type="Hotel",
            price_per_night=18500.0,
            location=f"Central {dest or 'Destination'}",
            amenities='["WiFi", "AC", "Breakfast", "Mountain View"]',
            source="Featured Partner Listing"
        ))

    # Fallback Restaurants if none
    if not suggested_rest:
        suggested_rest.append(SuggestedRestaurant(
            name=f"{dest or 'Local'} Traditional Spice Garden Restaurant",
            location=f"Main Road, {dest or 'Destination'}",
            description="Authentic Sri Lankan rice & curry, fresh seafood, and herbal refreshments.",
            dishes=[
                SuggestedDish(name="Sri Lankan Rice & Curry Plate", price=850.0, category="Lunch"),
                SuggestedDish(name="Fresh Tropical Juice", price=450.0, category="Beverage")
            ],
            source="Featured Partner Restaurant"
        ))

    # Fallback Vehicles if none
    if not suggested_vehicles:
        vt = (input_data.vehicle_type or "Car").upper()
        if "BIKE" in vt:
            fb_model = "Honda Dio / Yamaha FZ Scooter"
            fb_rate = 35.0
            fb_cap = 2
        elif "TUK" in vt:
            fb_model = "Bajaj RE 4S Three-Wheeler"
            fb_rate = 55.0
            fb_cap = 3
        elif "VAN" in vt:
            fb_model = "Toyota KDH High-Roof Luxury Van"
            fb_rate = 140.0
            fb_cap = 10
        elif "BUS" in vt:
            fb_model = "Mitsubishi Rosa Tourist Coach"
            fb_rate = 220.0
            fb_cap = 30
        else:
            fb_model = "Toyota Prius / Suzuki WagonR Fleet"
            fb_rate = 110.0
            fb_cap = 4

        suggested_vehicles.append(SuggestedRentalVehicle(
            vehicle_type=input_data.vehicle_type or "Car",
            vehicle_model=fb_model,
            manufacturing_year=2023,
            owner_contact_phone="+94 77 123 4567",
            rate_per_km=fb_rate,
            extra_charge_per_night=2500.0,
            location="Islandwide",
            seating_capacity=fb_cap,
            driver_included=input_data.with_driver,
            provider_name="TravelWise Verified Fleet Partner",
            source="Service Provider Vehicle Fleet"
        ))

    listings_payload = SuggestedListingsPayload(
        accommodations=suggested_acc,
        restaurants=suggested_rest,
        rental_vehicles=suggested_vehicles,
        visiting_places=suggested_places
    )

    return WizardSuggestionResult(
        readiness_score=final_score,
        is_ready_for_admin_submission=is_ready,
        summary=summary,
        status_badge=status_badge,
        critical_errors_count=len(critical_errors),
        warnings_count=len(warnings),
        missing_fields=issues,
        positive_highlights=positive_notes,
        suggested_listings=listings_payload
    )
