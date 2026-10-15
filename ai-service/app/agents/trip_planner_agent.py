from __future__ import annotations
import math
from datetime import datetime, date
from typing import Any
from pydantic import BaseModel, Field

from app.services.osrm_client import get_road_distance_and_duration
from app.services.places_service import get_places_for_destination


class TripPlannerInput(BaseModel):
    starting_location: str = Field(default="Colombo", description="Starting point or hotel")
    destination_location: str = Field(..., description="Destination in Sri Lanka")
    travel_method: str = Field(default="PRIVATE_VEHICLE", description="PRIVATE_VEHICLE, RENTAL_VEHICLE, PUBLIC_TRANSPORT")
    vehicle_type: str = Field(default="Car", description="Car, Van, Bike, Bus, Tuk-Tuk, Train")
    start_date: str = Field(default="", description="YYYY-MM-DD")
    end_date: str = Field(default="", description="YYYY-MM-DD")
    interests: list[str] = Field(default_factory=list)
    daily_time_limit_hours: float = Field(default=8.0)
    must_visit_places: str = Field(default="")
    catalog_items: list[dict[str, Any]] = Field(default_factory=list)


class ScheduleSlot(BaseModel):
    time: str
    activity: str
    location: str
    place_type: str
    notes: str
    opening_hours: str = "Open"
    est_duration_minutes: int = 60


class DayPlan(BaseModel):
    day_number: int
    date_str: str
    theme: str
    schedule: list[ScheduleSlot]


class TripPlannerResult(BaseModel):
    destination: str
    starting_point: str
    trip_days: int
    is_single_day_picnic: bool
    road_route: dict[str, Any]
    suggested_transport_type: str
    transport_advisory: str
    visiting_places: list[dict[str, Any]]
    accommodations: list[dict[str, Any]]
    restaurants: list[dict[str, Any]]
    itinerary_schedule: list[DayPlan]
    tools_used: list[str] = ["OSRM-Distance-Engine", "Places-Catalog-Service", "Timeline-Scheduler"]


def calculate_days(start_str: str, end_str: str) -> int:
    try:
        d1 = datetime.strptime(start_str[:10], "%Y-%m-%d").date()
        d2 = datetime.strptime(end_str[:10], "%Y-%m-%d").date()
        diff = (d2 - d1).days + 1
        return max(1, diff)
    except Exception:
        return 3


def plan_trip(input_data: TripPlannerInput) -> TripPlannerResult:
    """Trip Planner Agent logic: calculates OSRM distance, selects places, and builds advanced schedules."""
    # 1. Calculate road distance & travel time via OSRM
    route = get_road_distance_and_duration(input_data.starting_location, input_data.destination_location)
    dist_km = route["distance_km"]

    # 2. Analyze and recommend transport type
    transport_method = input_data.travel_method.upper()
    v_type = input_data.vehicle_type.strip()
    suggested_type = v_type or "Car"
    advisory = "Selected transport is well suited for this route."

    if "TUK" in v_type.upper() and dist_km > 120:
        suggested_type = "Car / Van"
        advisory = f"Route distance is {dist_km} km. A Tuk-Tuk is not recommended for long highway/hill routes; consider upgrading to a Car or Van for safety."
    elif dist_km > 180 and ("KANDY" in input_data.destination_location.upper() or "ELLA" in input_data.destination_location.upper()) and transport_method == "PUBLIC_TRANSPORT":
        suggested_type = "Scenic Main Line Train (Sri Lanka Railways)"
        advisory = "The Colombo-Kandy-Ella scenic railway is heavily recommended for public transport across this route."
    elif transport_method == "PRIVATE_VEHICLE" and ("NINE ARCH" in input_data.destination_location.upper() or "HORTON" in input_data.destination_location.upper()):
        suggested_type = "SUV / High-Clearance Car"
        advisory = "High-clearance vehicle recommended for hill roads and unpaved access tracks."

    # 3. Retrieve relevant visiting places, stays, and restaurants
    places_data = get_places_for_destination(input_data.destination_location, input_data.catalog_items)
    visiting_places = places_data["visiting_places"]
    accommodations = places_data["accommodations"]
    restaurants = places_data["restaurants"]

    # 4. Generate multi-day or single-day picnic schedule
    days_count = calculate_days(input_data.start_date, input_data.end_date)
    is_picnic = days_count == 1

    days_plan: list[DayPlan] = []
    current_date = None
    try:
        current_date = datetime.strptime(input_data.start_date[:10], "%Y-%m-%d").date()
    except Exception:
        current_date = date.today()

    for day_i in range(1, days_count + 1):
        day_date_str = current_date.strftime("%Y-%m-%d") if current_date else f"Day {day_i}"
        schedule_slots: list[ScheduleSlot] = []

        if day_i == 1:
            theme = "Arrival, Scenic Exploration & Cultural Landmarks" if not is_picnic else "Single-Day Scenic Picnic & Adventure"
            # Morning departure
            schedule_slots.append(ScheduleSlot(
                time="07:30 AM",
                activity=f"Depart from {input_data.starting_location}",
                location=input_data.starting_location,
                place_type="Travel Transit",
                notes=f"Transit via {suggested_type}. Estimated drive: {route['duration_formatted']} ({dist_km} km).",
                opening_hours="Open 24h",
                est_duration_minutes=route["duration_minutes"]
            ))

            # Lunch Stop
            lunch_spot = restaurants[0]["name"] if restaurants else "Local Authentic Restaurant"
            lunch_time = "12:30 PM" if route["duration_minutes"] >= 180 else "11:30 AM"
            schedule_slots.append(ScheduleSlot(
                time=lunch_time,
                activity=f"Lunch & Refreshment at {lunch_spot}",
                location=input_data.destination_location,
                place_type="Dining & Rest",
                notes=f"Traditional Sri Lankan specialties. Avg cost: LKR {restaurants[0].get('avg_cost_per_person_lkr', 1500) if restaurants else 1500}/person.",
                opening_hours=restaurants[0].get("opening_hours", "10:00 - 22:00") if restaurants else "10:00 - 22:00",
                est_duration_minutes=60
            ))

            # Visiting Place 1
            if visiting_places:
                vp1 = visiting_places[0]
                schedule_slots.append(ScheduleSlot(
                    time="02:00 PM",
                    activity=f"Explore {vp1['name']}",
                    location=input_data.destination_location,
                    place_type=vp1.get("type", "Attraction"),
                    notes=f"Ticket: LKR {vp1.get('ticket_price_lkr', 0)}. Guided sightseeing & photography.",
                    opening_hours=vp1.get("opening_hours", "08:00 - 18:00"),
                    est_duration_minutes=vp1.get("est_visit_minutes", 90)
                ))

            # Visiting Place 2 (if exists)
            if len(visiting_places) > 1:
                vp2 = visiting_places[1]
                schedule_slots.append(ScheduleSlot(
                    time="04:30 PM",
                    activity=f"Sunset visit to {vp2['name']}",
                    location=input_data.destination_location,
                    place_type=vp2.get("type", "Attraction"),
                    notes=f"Ticket: LKR {vp2.get('ticket_price_lkr', 0)}. Panoramic twilight vista.",
                    opening_hours=vp2.get("opening_hours", "08:00 - 18:00"),
                    est_duration_minutes=vp2.get("est_visit_minutes", 75)
                ))

            # Evening Check-in & Dinner
            if not is_picnic:
                hotel = accommodations[0]["name"] if accommodations else "Destination Hotel"
                schedule_slots.append(ScheduleSlot(
                    time="07:00 PM",
                    activity=f"Check-in & Dinner at {hotel}",
                    location=input_data.destination_location,
                    place_type="Accommodation & Dining",
                    notes="Unpack, relax, and prepare for next day's adventure.",
                    opening_hours="24h Front Desk",
                    est_duration_minutes=90
                ))
            else:
                schedule_slots.append(ScheduleSlot(
                    time="06:30 PM",
                    activity=f"Evening return journey to {input_data.starting_location}",
                    location=input_data.starting_location,
                    place_type="Return Transit",
                    notes="Picnic concluded. Safe journey home.",
                    opening_hours="Open",
                    est_duration_minutes=route["duration_minutes"]
                ))
        else:
            theme = f"Day {day_i} Sightseeing & Excursions"
            vp_idx = (day_i) % len(visiting_places) if visiting_places else 0
            vp = visiting_places[vp_idx] if visiting_places else {"name": "Local Cultural Center", "type": "Sightseeing", "opening_hours": "08:30 - 17:30", "ticket_price_lkr": 500, "est_visit_minutes": 90}

            schedule_slots.append(ScheduleSlot(
                time="08:30 AM",
                activity=f"Morning Excursion to {vp['name']}",
                location=input_data.destination_location,
                place_type=vp.get("type", "Attraction"),
                notes=f"Ticket: LKR {vp.get('ticket_price_lkr', 0)}. Morning light photography and guided tour.",
                opening_hours=vp.get("opening_hours", "08:00 - 18:00"),
                est_duration_minutes=vp.get("est_visit_minutes", 120)
            ))
            schedule_slots.append(ScheduleSlot(
                time="01:00 PM",
                activity=f"Lunch at {restaurants[min(len(restaurants)-1, day_i - 1)]['name'] if restaurants else 'Local Restaurant'}",
                location=input_data.destination_location,
                place_type="Dining",
                notes="Mid-day break and fresh regional cuisine.",
                opening_hours="11:00 - 22:00",
                est_duration_minutes=60
            ))
            schedule_slots.append(ScheduleSlot(
                time="03:30 PM",
                activity="Local Crafts, Souvenirs & Village Walk",
                location=input_data.destination_location,
                place_type="Leisure",
                notes="Supporting local artisans, buying authentic spices and tea.",
                opening_hours="09:00 - 20:00",
                est_duration_minutes=90
            ))

        days_plan.append(DayPlan(day_number=day_i, date_str=day_date_str, theme=theme, schedule=schedule_slots))
        if current_date:
            try:
                from datetime import timedelta
                current_date = current_date + timedelta(days=1)
            except Exception:
                pass

    return TripPlannerResult(
        destination=input_data.destination_location,
        starting_point=input_data.starting_location,
        trip_days=days_count,
        is_single_day_picnic=is_picnic,
        road_route=route,
        suggested_transport_type=suggested_type,
        transport_advisory=advisory,
        visiting_places=visiting_places[:5],
        accommodations=accommodations[:4],
        restaurants=restaurants[:4],
        itinerary_schedule=days_plan,
    )
