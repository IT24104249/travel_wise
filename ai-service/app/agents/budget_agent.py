from __future__ import annotations
import math
import os
import urllib.request
import urllib.parse
import json
from typing import Any
from pydantic import BaseModel, Field
from app.services.osrm_client import get_road_distance_and_duration


class BudgetAgentInput(BaseModel):
    user_budget: float = Field(default=50000.0, description="User proposed budget")
    currency: str = Field(default="LKR")
    starting_location: str = Field(default="Colombo")
    destination_location: str = Field(default="Ella")
    travel_method: str = Field(default="PRIVATE_VEHICLE", description="PRIVATE_VEHICLE, OWN_VEHICLE, RENTAL_VEHICLE, PUBLIC_TRANSPORT")
    vehicle_type: str = Field(default="Car")
    trip_days: int = Field(default=3, ge=1)
    group_size: int = Field(default=1, ge=1)
    selected_accommodation_rate: float | None = None
    selected_places_ticket_total: float | None = None


class ItemizedCost(BaseModel):
    category: str
    amount: float
    description: str
    source_type: str = "Method (i) - Benchmark"  # "Method (ii) - Verified Local Listings" or "Method (i) - Benchmark"


class ExtraExpenseItem(BaseModel):
    item: str
    amount: float
    reason: str


class BudgetVehicleDetails(BaseModel):
    selected_vehicle_name: str = ""
    travel_method: str = ""
    vehicle_category: str = ""
    is_own_vehicle: bool = False
    is_public_transport: bool = False
    is_rental_vehicle: bool = False
    total_travel_km: float = 0.0
    fare_basis: str = ""
    pricing_explanation: str = ""
    cost_subtotal: float = 0.0


class BudgetLineItem(BaseModel):
    category: str  # "Transport", "Lodging", "Food", "Tickets", "Buffer & Activities", "Contingency"
    item_name: str
    unit_rate: float = 0.0
    unit_label: str = ""
    quantity: float = 1.0
    quantity_label: str = ""
    subtotal: float = 0.0
    details: str = ""
    source_type: str = "Method (ii) - Verified Provider Listings"


class BudgetAgentResult(BaseModel):
    currency: str
    user_budget: float
    final_calculated_budget: float
    budget_difference: float
    difference_status: str  # "WITHIN_BUDGET" | "EXCEEDED"
    difference_percentage: float
    status_summary: str
    calculation_mode: str = "HYBRID_PRIORITY_METHOD_2"  # "METHOD_2_VERIFIED_LISTINGS" | "HYBRID_PRIORITY_METHOD_2" | "METHOD_1_BENCHMARK_FALLBACK"
    data_sources: dict[str, str] = Field(default_factory=dict)
    accommodation_cost: float
    transport_cost: float
    restaurant_and_food_cost: float
    extra_expenses: list[ExtraExpenseItem]
    extra_expenses_total: float
    base_subtotal: float
    contingency_margin_10_percent: float
    itemized_breakdown: list[ItemizedCost]
    vehicle_details: BudgetVehicleDetails = Field(default_factory=BudgetVehicleDetails)
    detailed_line_items: list[BudgetLineItem] = Field(default_factory=list)
    tools_used: list[str] = [
        "Method-2-Local-Provider-Listings-Engine",
        "OSRM-Distance-Cost-Engine",
        "SriLanka-Pricing-Model",
        "10-Percent-Margin-Safety-Calculator"
    ]


def fetch_rental_vehicle_rates() -> dict:
    """Fetch verified rental vehicle rates from the C# TravelWise backend."""
    api_url = os.getenv("BACKEND_API_URL", "http://localhost:5127")
    try:
        req = urllib.request.Request(
            f"{api_url}/api/rental-vehicles/rates-summary",
            headers={"User-Agent": "TravelWise-AI-Agent"}
        )
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                return data.get("vehicleRates", {})
    except Exception:
        pass
    return {}


def fetch_destination_pricing(destination_name: str) -> dict:
    """Method (ii): Query published Service Provider & Admin listings (Accommodations, Restaurants, Food, Tickets)
    for the specific destination from the C# TravelWise backend.
    """
    api_url = os.getenv("BACKEND_API_URL", "http://localhost:5127")
    try:
        encoded_dest = urllib.parse.quote(destination_name.strip())
        req = urllib.request.Request(
            f"{api_url}/api/destinations/pricing-lookup?destination={encoded_dest}",
            headers={"User-Agent": "TravelWise-AI-Agent"}
        )
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            if resp.status == 200:
                return json.loads(resp.read().decode("utf-8"))
    except Exception:
        pass
    return {"found": False}


def fetch_transport_fare_csv(category: str) -> dict:
    """Method (ii): Query approved Service Provider & Admin public transport CSV fare datasets
    (Railway or Bus) from the C# TravelWise backend.
    """
    api_url = os.getenv("BACKEND_API_URL", "http://localhost:5127")
    try:
        clean_cat = urllib.parse.quote(category.strip())
        req = urllib.request.Request(
            f"{api_url}/api/transport-fares?category={clean_cat}&status=Approved",
            headers={"User-Agent": "TravelWise-AI-Agent"}
        )
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            if resp.status == 200:
                files = json.loads(resp.read().decode("utf-8"))
                if isinstance(files, list) and len(files) > 0:
                    return files[0]
    except Exception:
        pass
    return {}


def lookup_railway_fare_from_csv(fare_file: dict, starting_loc: str, dest_loc: str) -> dict | None:
    """Read the approved Service Provider's railway fare CSV and look up the exact station ticket price."""
    if not fare_file:
        return None

    csv_text = ""
    public_url = fare_file.get("publicUrl")
    if public_url:
        try:
            req = urllib.request.Request(public_url, headers={"User-Agent": "TravelWise-AI-Agent"})
            with urllib.request.urlopen(req, timeout=2.0) as resp:
                if resp.status == 200:
                    csv_text = resp.read().decode("utf-8", errors="ignore")
        except Exception:
            csv_text = ""

    start_norm = starting_loc.strip().lower()
    dest_norm = dest_loc.strip().lower()
    rows_data = []

    if csv_text:
        import csv
        import io
        reader = csv.reader(io.StringIO(csv_text))
        headers = None
        for row in reader:
            if not row or not any(row):
                continue
            if headers is None:
                headers = [h.strip().lower() for h in row]
                continue
            row_dict = {headers[i]: row[i].strip() for i in range(min(len(headers), len(row)))}
            rows_data.append(row_dict)
    elif fare_file.get("samplePreviewJson"):
        try:
            preview = json.loads(fare_file["samplePreviewJson"])
            p_headers = [h.strip().lower() for h in preview.get("headers", [])]
            for row in preview.get("rows", []):
                row_dict = {p_headers[i]: str(row[i]).strip() for i in range(min(len(p_headers), len(row)))}
                rows_data.append(row_dict)
        except Exception:
            pass

    if rows_data:
        # 1. Search for 2nd Class ticket match between start and destination
        for r in rows_data:
            from_st = r.get("fromstation", "").lower()
            to_st = r.get("tostation", "").lower()
            cls = r.get("class", "").lower()
            start_matches = (start_norm in from_st) or (from_st in start_norm) or ("colombo" in start_norm and "colombo" in from_st)
            dest_matches = (dest_norm in to_st) or (to_st in dest_norm)

            if start_matches and dest_matches and ("2nd" in cls or "second" in cls):
                fare_str = r.get("farelkr") or r.get("fare") or r.get("price")
                try:
                    return {
                        "matched": True,
                        "fare": float(fare_str),
                        "class": r.get("class", "2nd Class"),
                        "from": r.get("fromstation", starting_loc),
                        "to": r.get("tostation", dest_loc),
                        "fileName": fare_file.get("fileName", "railway_fares.csv"),
                        "distanceKM": r.get("distancekm")
                    }
                except (ValueError, TypeError):
                    pass

        # 2. If 2nd Class not explicitly labelled, match any class
        for r in rows_data:
            from_st = r.get("fromstation", "").lower()
            to_st = r.get("tostation", "").lower()
            start_matches = (start_norm in from_st) or (from_st in start_norm) or ("colombo" in start_norm and "colombo" in from_st)
            dest_matches = (dest_norm in to_st) or (to_st in dest_norm)
            if start_matches and dest_matches:
                fare_str = r.get("farelkr") or r.get("fare") or r.get("price")
                try:
                    return {
                        "matched": True,
                        "fare": float(fare_str),
                        "class": r.get("class", "Standard"),
                        "from": r.get("fromstation", starting_loc),
                        "to": r.get("tostation", dest_loc),
                        "fileName": fare_file.get("fileName", "railway_fares.csv"),
                        "distanceKM": r.get("distancekm")
                    }
                except (ValueError, TypeError):
                    pass

    return None


def lookup_bus_fare_from_csv(fare_file: dict, one_way_km: float) -> dict | None:
    """Read the approved Service Provider's bus fare CSV and look up the distance stage fare."""
    if not fare_file:
        return None

    csv_text = ""
    public_url = fare_file.get("publicUrl")
    if public_url:
        try:
            req = urllib.request.Request(public_url, headers={"User-Agent": "TravelWise-AI-Agent"})
            with urllib.request.urlopen(req, timeout=2.0) as resp:
                if resp.status == 200:
                    csv_text = resp.read().decode("utf-8", errors="ignore")
        except Exception:
            csv_text = ""

    stages = []
    if csv_text:
        import csv
        import io
        reader = csv.reader(io.StringIO(csv_text))
        headers = None
        for row in reader:
            if not row or not any(row):
                continue
            if headers is None:
                headers = [h.strip().lower() for h in row]
                continue
            row_dict = {headers[i]: row[i].strip() for i in range(min(len(headers), len(row)))}
            dist_val = row_dict.get("distance_km") or row_dict.get("distance") or row_dict.get("km")
            fare_val = row_dict.get("new_fare_rs") or row_dict.get("fare") or row_dict.get("price")
            try:
                stages.append((float(dist_val), float(fare_val), row_dict.get("stage", "1")))
            except (ValueError, TypeError):
                continue
    elif fare_file.get("samplePreviewJson"):
        try:
            preview = json.loads(fare_file["samplePreviewJson"])
            p_headers = [h.strip().lower() for h in preview.get("headers", [])]
            for row in preview.get("rows", []):
                row_dict = {p_headers[i]: str(row[i]).strip() for i in range(min(len(p_headers), len(row)))}
                dist_val = row_dict.get("distance_km") or row_dict.get("distance") or row_dict.get("km")
                fare_val = row_dict.get("new_fare_rs") or row_dict.get("fare") or row_dict.get("price")
                try:
                    stages.append((float(dist_val), float(fare_val), row_dict.get("stage", "1")))
                except (ValueError, TypeError):
                    continue
        except Exception:
            pass

    if stages:
        stages.sort(key=lambda s: s[0])
        for max_dist, fare, stage in stages:
            if one_way_km <= max_dist:
                return {
                    "matched": True,
                    "fare": fare,
                    "stage": stage,
                    "max_km": max_dist,
                    "fileName": fare_file.get("fileName", "bus_fare.csv")
                }
        # If distance exceeds largest stage, extrapolate using highest stage rate per km
        last_dist, last_fare, last_stage = stages[-1]
        per_km_rate = last_fare / max(1.0, last_dist)
        extrapolated_fare = round(one_way_km * per_km_rate, 0)
        return {
            "matched": True,
            "fare": extrapolated_fare,
            "stage": f"Stage {last_stage}+",
            "max_km": one_way_km,
            "fileName": fare_file.get("fileName", "bus_fare.csv")
        }

    return None


def calculate_budget(input_data: BudgetAgentInput) -> BudgetAgentResult:
    """Budget Agent Hybrid Calculation Engine:
    - Highest Priority (Method ii): Uses real published provider/admin listings & CSV datasets for the specific destination.
    - Graceful Fallback (Method i): Uses APIs/benchmarks only when specific local listings are missing.
    - Rule: If travel_method is 'Own vehicle' / 'Private vehicle', transport_cost = 0.0 (no fuel/vehicle fare added).
    - Rule: Mandatory 10% contingency safety margin is added to base subtotal.
    """
    # Query Method (ii) destination pricing for the requested location
    dest_data = fetch_destination_pricing(input_data.destination_location)
    matched_dest_name = dest_data.get("matchedDestinationName", input_data.destination_location)
    data_sources: dict[str, str] = {}
    methods_used_tracker: list[str] = []

    # 1. Road distance via OSRM
    route = get_road_distance_and_duration(input_data.starting_location, input_data.destination_location)
    one_way_km = route["distance_km"]
    local_km = max(0, (input_data.trip_days - 1)) * 25.0
    total_travel_km = round((one_way_km * 2) + local_km, 1)

    # 2. Transport cost based on travel_method and vehicle_type
    method = input_data.travel_method.upper().strip()
    v_type = input_data.vehicle_type.upper().strip()
    transport_cost = 0.0
    transport_source = ""
    transport_source_type = "Method (i) - Benchmark"

    is_own_vehicle = ("OWN" in method) or ("PRIVATE" in method) or ("PERSONAL" in method)
    is_rental = "RENTAL" in method
    is_public = "PUBLIC" in method

    v_details = BudgetVehicleDetails()
    detailed_lines: list[BudgetLineItem] = []

    if is_own_vehicle:
        # User Requirement: Own/Personal vehicle -> ZERO travel cost added to budget
        transport_cost = 0.0
        transport_source = f"Method (ii) - Personal Vehicle Rule (Own {input_data.vehicle_type}: 0 LKR Transit Tariff applied)"
        transport_source_type = "Method (ii) - Personal Vehicle Rule"
        methods_used_tracker.append("Method (ii)")
        v_details = BudgetVehicleDetails(
            selected_vehicle_name=f"Personal / Own {input_data.vehicle_type}",
            travel_method="OWN_VEHICLE",
            vehicle_category=input_data.vehicle_type,
            is_own_vehicle=True,
            total_travel_km=total_travel_km,
            fare_basis="Personal Vehicle Exemption (0.00 LKR)",
            pricing_explanation=(
                f"Traveller is utilizing their personal/own {input_data.vehicle_type}. "
                "Per system policy, commercial rental rates and public passenger ticket tariffs are excluded (0.00 LKR)."
            ),
            cost_subtotal=0.0
        )
        detailed_lines.append(BudgetLineItem(
            category="Transport",
            item_name=f"Personal Vehicle Usage ({input_data.vehicle_type})",
            unit_rate=0.0,
            unit_label="own vehicle tariff",
            quantity=1.0,
            quantity_label=f"{total_travel_km} km journey",
            subtotal=0.0,
            details=f"Personal {input_data.vehicle_type} used for travel ({total_travel_km} km route). Commercial rental and ticket fees exempt.",
            source_type="Method (ii) - Personal Vehicle Rule"
        ))
    elif is_rental:
        # Method (ii) Priority: Query live verified rental vehicle rates
        rates_summary = fetch_rental_vehicle_rates()
        matched_category = None
        for cat in ["Bike", "Car", "Van", "Bus", "TukTuk"]:
            if cat.upper() in v_type or (cat == "TukTuk" and "TUK" in v_type):
                matched_category = cat
                break

        nights = max(0, input_data.trip_days - 1)
        if matched_category and matched_category in rates_summary:
            cat_data = rates_summary[matched_category]
            rate_per_km = float(cat_data.get("avgRatePerKm", 85.0))
            night_charge = float(cat_data.get("avgExtraChargePerNight", 1500.0))
            mileage_cost = round(total_travel_km * rate_per_km, 2)
            overnight_cost = round(nights * night_charge, 2)
            transport_cost = mileage_cost + overnight_cost
            transport_source = f"Method (ii) - Live Verified Rental Fleet ({matched_category}: Rs. {rate_per_km:,.0f}/km + Rs. {night_charge:,.0f}/night)"
            transport_source_type = "Method (ii) - Verified Provider Listings"
            methods_used_tracker.append("Method (ii)")

            v_details = BudgetVehicleDetails(
                selected_vehicle_name=f"Rental {matched_category} (Verified Provider Fleet)",
                travel_method="RENTAL_VEHICLE",
                vehicle_category=matched_category,
                is_rental_vehicle=True,
                total_travel_km=total_travel_km,
                fare_basis=f"Rs. {rate_per_km:,.0f}/km + Rs. {night_charge:,.0f}/night",
                pricing_explanation=(
                    f"Rental {matched_category} calculated from live verified provider listings: "
                    f"{total_travel_km} km @ Rs. {rate_per_km:,.0f}/km (Rs. {mileage_cost:,.0f}) + "
                    f"{nights} night(s) driver/fleet overnight charge @ Rs. {night_charge:,.0f}/night (Rs. {overnight_cost:,.0f})."
                ),
                cost_subtotal=transport_cost
            )
            detailed_lines.append(BudgetLineItem(
                category="Transport",
                item_name=f"Rental {matched_category} Mileage ({total_travel_km} km)",
                unit_rate=rate_per_km,
                unit_label="per km",
                quantity=total_travel_km,
                quantity_label=f"{total_travel_km} km total transit",
                subtotal=mileage_cost,
                details=f"Live verified rental provider tariff ({matched_category}) covering return and local road transit.",
                source_type="Method (ii) - Verified Provider Listings"
            ))
            if overnight_cost > 0:
                detailed_lines.append(BudgetLineItem(
                    category="Transport",
                    item_name=f"Driver & Fleet Overnight Charge ({nights} nights)",
                    unit_rate=night_charge,
                    unit_label="per night",
                    quantity=float(nights),
                    quantity_label=f"{nights} night(s)",
                    subtotal=overnight_cost,
                    details="Standard verified fleet overnight allowance for outstation driver/vehicle.",
                    source_type="Method (ii) - Verified Provider Listings"
                ))
        else:
            # Fallback Method (i) standard Sri Lankan rental rates
            daily_rates = {
                "BIKE": 2000.0,
                "CAR": 6500.0,
                "VAN": 11000.0,
                "BUS": 22000.0,
                "TUK": 2800.0,
            }
            matched_rate = 6500.0
            matched_name = input_data.vehicle_type
            for k, v in daily_rates.items():
                if k in v_type:
                    matched_rate = v
                    matched_name = k.capitalize()
                    break
            rental_base = matched_rate * input_data.trip_days
            fuel_cost = round(total_travel_km * 28.0, 2)
            transport_cost = rental_base + fuel_cost
            transport_source = f"Method (i) - Standard Rental Market Benchmark ({matched_name} @ Rs. {matched_rate:,.0f}/day + fuel)"
            transport_source_type = "Method (i) - Benchmark"
            methods_used_tracker.append("Method (i)")

            v_details = BudgetVehicleDetails(
                selected_vehicle_name=f"Rental {matched_name} (Island Benchmark)",
                travel_method="RENTAL_VEHICLE",
                vehicle_category=matched_name,
                is_rental_vehicle=True,
                total_travel_km=total_travel_km,
                fare_basis=f"Rs. {matched_rate:,.0f}/day + fuel @ Rs. 34/km",
                pricing_explanation=(
                    f"Rental {matched_name} based on Sri Lanka standard market benchmarks: "
                    f"{input_data.trip_days} day(s) base rental @ Rs. {matched_rate:,.0f}/day (Rs. {rental_base:,.0f}) + "
                    f"estimated fuel for {total_travel_km} km @ Rs. 34/km (Rs. {fuel_cost:,.0f})."
                ),
                cost_subtotal=transport_cost
            )
            detailed_lines.append(BudgetLineItem(
                category="Transport",
                item_name=f"Vehicle Rental Base Fee ({matched_name})",
                unit_rate=matched_rate,
                unit_label="per day",
                quantity=float(input_data.trip_days),
                quantity_label=f"{input_data.trip_days} rental day(s)",
                subtotal=rental_base,
                details=f"Island-wide standard rental agency daily benchmark for {matched_name}.",
                source_type="Method (i) - Benchmark"
            ))
            detailed_lines.append(BudgetLineItem(
                category="Transport",
                item_name=f"Estimated Fuel Consumption ({total_travel_km} km)",
                unit_rate=34.0,
                unit_label="per km",
                quantity=total_travel_km,
                quantity_label=f"{total_travel_km} km travelled",
                subtotal=fuel_cost,
                details="Estimated fuel based on Ceylon Petroleum fuel prices and average vehicle consumption (Rs. 34/km).",
                source_type="Method (i) - Benchmark"
            ))
    elif is_public:
        # Public transport (Train / Bus)
        is_train = "TRAIN" in v_type
        if is_train:
            # Query approved Service Provider Railway Fare CSV
            train_csv = fetch_transport_fare_csv("Railway")
            route_match = lookup_railway_fare_from_csv(
                train_csv,
                input_data.starting_location,
                input_data.destination_location
            )

            if route_match and route_match.get("matched"):
                ticket_unit = float(route_match["fare"])
                class_name = route_match.get("class", "2nd Class")
                csv_name = route_match.get("fileName", "railway_fares.csv")
                vehicle_name = f"Train (Sri Lanka Railways - {class_name})"
                fare_source_desc = f"Method (ii) - Service Provider CSV ({csv_name}: {route_match['from']} -> {route_match['to']} @ Rs. {ticket_unit:,.0f})"
                transport_source_type = "Method (ii) - Service Provider CSV Dataset"
                line_item_source = f"Method (ii) - Service Provider CSV ({csv_name})"
                methods_used_tracker.append("Method (ii)")
            else:
                ticket_unit = 1000.0  # realistic fallback benchmark
                vehicle_name = "Train (Sri Lanka Railways - 2nd Class Reserved Main Line)"
                fare_source_desc = f"Method (i) - Sri Lanka Railway Benchmark ({input_data.vehicle_type})"
                transport_source_type = "Method (i) - Benchmark"
                line_item_source = "Method (i) - Sri Lanka Railway Tariff Benchmark"
                methods_used_tracker.append("Method (i)")

            outbound_total = ticket_unit * input_data.group_size
            return_total = ticket_unit * input_data.group_size
            train_fares = outbound_total + return_total
            local_daily_transfer = 350.0  # station-to-hotel / site transfers via local tuk/bus
            local_transfers = round(input_data.trip_days * local_daily_transfer * input_data.group_size, 2)
            transport_cost = train_fares + local_transfers

            transport_source = fare_source_desc + f" + local station transit (Rs. {local_transfers:,.0f})"

            v_details = BudgetVehicleDetails(
                selected_vehicle_name=vehicle_name,
                travel_method="PUBLIC_TRANSPORT",
                vehicle_category="Train",
                is_public_transport=True,
                total_travel_km=total_travel_km,
                fare_basis=f"Rs. {ticket_unit:,.0f}/person/ticket + Rs. {local_daily_transfer:,.0f}/person/day local transit",
                pricing_explanation=(
                    f"Selected Vehicle: {vehicle_name}. "
                    f"Outbound train ticket (Rs. {ticket_unit:,.0f} × {input_data.group_size} pax = Rs. {outbound_total:,.0f}) + "
                    f"Return train ticket (Rs. {ticket_unit:,.0f} × {input_data.group_size} pax = Rs. {return_total:,.0f}) + "
                    f"First/Last-mile local station & hotel transit transfers (Rs. {local_daily_transfer:,.0f}/day × {input_data.trip_days} days × {input_data.group_size} pax = Rs. {local_transfers:,.0f}). "
                    f"Total Public Train Transit: Rs. {transport_cost:,.0f} LKR. (Source: {fare_source_desc})"
                ),
                cost_subtotal=transport_cost
            )
            detailed_lines.append(BudgetLineItem(
                category="Transport",
                item_name=f"Train Outbound Ticket ({input_data.starting_location} -> {matched_dest_name})",
                unit_rate=ticket_unit,
                unit_label="per passenger ticket",
                quantity=float(input_data.group_size),
                quantity_label=f"{input_data.group_size} ticket(s)",
                subtotal=outbound_total,
                details=f"Official train fare from {input_data.starting_location} to {matched_dest_name}.",
                source_type=line_item_source
            ))
            detailed_lines.append(BudgetLineItem(
                category="Transport",
                item_name=f"Train Return Ticket ({matched_dest_name} -> {input_data.starting_location})",
                unit_rate=ticket_unit,
                unit_label="per passenger ticket",
                quantity=float(input_data.group_size),
                quantity_label=f"{input_data.group_size} ticket(s)",
                subtotal=return_total,
                details=f"Official train return fare from {matched_dest_name} back to {input_data.starting_location}.",
                source_type=line_item_source
            ))
            detailed_lines.append(BudgetLineItem(
                category="Transport",
                item_name="Local Station & In-City Transit Transfers",
                unit_rate=local_daily_transfer,
                unit_label="per person / day",
                quantity=float(input_data.trip_days * input_data.group_size),
                quantity_label=f"{input_data.trip_days} day(s) × {input_data.group_size} pax",
                subtotal=local_transfers,
                details="Local tuk-tuk / city transit connecting railway station, accommodation, and nearby points of interest.",
                source_type="Method (i) - Local Transit Tariff Benchmark"
            ))
        else:
            # Public Bus
            bus_csv = fetch_transport_fare_csv("Bus")
            bus_match = lookup_bus_fare_from_csv(bus_csv, one_way_km)

            if bus_match and bus_match.get("matched"):
                ticket_unit = float(bus_match["fare"])
                csv_name = bus_match.get("fileName", "bus_fares.csv")
                vehicle_name = f"Public Bus (Intercity Express - {bus_match.get('stage')})"
                fare_source_desc = f"Method (ii) - Service Provider CSV ({csv_name}: {bus_match.get('stage')} @ Rs. {ticket_unit:,.0f})"
                transport_source_type = "Method (ii) - Service Provider CSV Dataset"
                line_item_source = f"Method (ii) - Service Provider CSV ({csv_name})"
                methods_used_tracker.append("Method (ii)")
            else:
                ticket_unit = 850.0  # standard intercity express bus benchmark
                vehicle_name = "Intercity / Highway Express Public Bus"
                fare_source_desc = f"Method (i) - Standard Highway Bus Benchmark ({input_data.vehicle_type})"
                transport_source_type = "Method (i) - Benchmark"
                line_item_source = "Method (i) - Local Transit Tariff Benchmark"
                methods_used_tracker.append("Method (i)")

            outbound_total = ticket_unit * input_data.group_size
            return_total = ticket_unit * input_data.group_size
            bus_fares = outbound_total + return_total
            local_daily_transfer = 300.0
            local_transfers = round(input_data.trip_days * local_daily_transfer * input_data.group_size, 2)
            transport_cost = bus_fares + local_transfers

            transport_source = fare_source_desc + f" + local bus transit (Rs. {local_transfers:,.0f})"

            v_details = BudgetVehicleDetails(
                selected_vehicle_name=vehicle_name,
                travel_method="PUBLIC_TRANSPORT",
                vehicle_category="Bus",
                is_public_transport=True,
                total_travel_km=total_travel_km,
                fare_basis=f"Rs. {ticket_unit:,.0f}/person/ticket + Rs. {local_daily_transfer:,.0f}/person/day local transit",
                pricing_explanation=(
                    f"Selected Vehicle: {vehicle_name}. "
                    f"Outbound express bus ticket (Rs. {ticket_unit:,.0f} × {input_data.group_size} pax = Rs. {outbound_total:,.0f}) + "
                    f"Return express bus ticket (Rs. {ticket_unit:,.0f} × {input_data.group_size} pax = Rs. {return_total:,.0f}) + "
                    f"Local bus/short-distance transfers (Rs. {local_daily_transfer:,.0f}/day × {input_data.trip_days} days × {input_data.group_size} pax = Rs. {local_transfers:,.0f}). "
                    f"Total Public Bus Transit: Rs. {transport_cost:,.0f} LKR. (Source: {fare_source_desc})"
                ),
                cost_subtotal=transport_cost
            )
            detailed_lines.append(BudgetLineItem(
                category="Transport",
                item_name=f"Intercity Express Bus Outbound Ticket ({input_data.starting_location} -> {matched_dest_name})",
                unit_rate=ticket_unit,
                unit_label="per passenger ticket",
                quantity=float(input_data.group_size),
                quantity_label=f"{input_data.group_size} ticket(s)",
                subtotal=outbound_total,
                details=f"Regulated NTC Express / Highway Bus service to {matched_dest_name}.",
                source_type=line_item_source
            ))
            detailed_lines.append(BudgetLineItem(
                category="Transport",
                item_name=f"Intercity Express Bus Return Ticket ({matched_dest_name} -> {input_data.starting_location})",
                unit_rate=ticket_unit,
                unit_label="per passenger ticket",
                quantity=float(input_data.group_size),
                quantity_label=f"{input_data.group_size} ticket(s)",
                subtotal=return_total,
                details=f"Regulated NTC Express / Highway Bus return to {input_data.starting_location}.",
                source_type=line_item_source
            ))
            detailed_lines.append(BudgetLineItem(
                category="Transport",
                item_name="Local In-City Bus & Station Transfers",
                unit_rate=local_daily_transfer,
                unit_label="per person / day",
                quantity=float(input_data.trip_days * input_data.group_size),
                quantity_label=f"{input_data.trip_days} day(s) × {input_data.group_size} pax",
                subtotal=local_transfers,
                details="Short-distance local bus and station transfers.",
                source_type="Method (i) - Local Transit Tariff Benchmark"
            ))
    else:
        # Default fallback to zero if unknown own vehicle
        transport_cost = 0.0
        transport_source = "Method (ii) - Own / Personal Transit (0 LKR)"
        transport_source_type = "Method (ii) - Personal Vehicle Rule"
        methods_used_tracker.append("Method (ii)")
        v_details = BudgetVehicleDetails(
            selected_vehicle_name=input_data.vehicle_type,
            travel_method=input_data.travel_method,
            vehicle_category=input_data.vehicle_type,
            is_own_vehicle=True,
            total_travel_km=total_travel_km,
            fare_basis="Exempt",
            pricing_explanation="Default transit tariff: 0.00 LKR.",
            cost_subtotal=0.0
        )

    transport_cost = round(transport_cost, 2)
    data_sources["transport"] = transport_source

    # 3. Accommodation cost (Priority Method ii: verified local listings in destination)
    nights = max(0, input_data.trip_days - 1)
    rooms_needed = math.ceil(input_data.group_size / 2)
    accommodation_source_type = "Method (i) - Benchmark"

    if dest_data.get("hasAccommodationData") and dest_data.get("avgPricePerNight"):
        night_rate = float(dest_data["avgPricePerNight"])
        accommodation_source = (
            f"Method (ii) - {dest_data.get('accommodationsCount')} Verified Partner Stays in {matched_dest_name} "
            f"(Avg Rs. {night_rate:,.0f}/night)"
        )
        accommodation_source_type = "Method (ii) - Verified Provider Listings"
        methods_used_tracker.append("Method (ii)")
    else:
        night_rate = input_data.selected_accommodation_rate or 7000.0
        accommodation_source = (
            f"Method (i) - Island-wide Standard Stay Benchmark (Rs. {night_rate:,.0f}/night) "
            f"[No local partner stays listed yet for {matched_dest_name}]"
        )
        accommodation_source_type = "Method (i) - Benchmark"
        methods_used_tracker.append("Method (i)")

    total_room_nights = nights * rooms_needed
    accommodation_cost = round(total_room_nights * night_rate, 2)
    data_sources["accommodation"] = accommodation_source

    if nights > 0:
        detailed_lines.append(BudgetLineItem(
            category="Lodging",
            item_name=f"Verified Stays / Lodging ({rooms_needed} room{'s' if rooms_needed > 1 else ''})",
            unit_rate=night_rate,
            unit_label="per room / night",
            quantity=float(total_room_nights),
            quantity_label=f"{nights} night(s) × {rooms_needed} room(s)",
            subtotal=accommodation_cost,
            details=f"Room accommodation in {matched_dest_name}. ({accommodation_source})",
            source_type=accommodation_source_type
        ))
    else:
        detailed_lines.append(BudgetLineItem(
            category="Lodging",
            item_name="Day Trip (No Overnight Stay Required)",
            unit_rate=0.0,
            unit_label="day trip",
            quantity=0.0,
            quantity_label="0 nights",
            subtotal=0.0,
            details="Single-day travel excursion. Overnight accommodation charges not required.",
            source_type="Method (ii) - Day Tour Rule"
        ))

    # 4. Restaurant & Food cost (Priority Method ii: dishes from local restaurants)
    food_source_type = "Method (i) - Benchmark"
    if dest_data.get("hasFoodData") and dest_data.get("avgDailyFoodPerPerson"):
        daily_food_per_person = float(dest_data["avgDailyFoodPerPerson"])
        food_source = (
            f"Method (ii) - {dest_data.get('foodItemsCount')} Dishes in Partner Restaurants in {matched_dest_name} "
            f"(Avg Rs. {daily_food_per_person:,.0f}/day/person)"
        )
        food_source_type = "Method (ii) - Verified Provider Listings"
        methods_used_tracker.append("Method (ii)")
    else:
        daily_food_per_person = 1650.0
        food_source = (
            f"Method (i) - Standard Dining Benchmark (3 meals/day: Rs. {daily_food_per_person:,.0f}/person) "
            f"[No local dining listings yet for {matched_dest_name}]"
        )
        food_source_type = "Method (i) - Benchmark"
        methods_used_tracker.append("Method (i)")

    total_person_days = input_data.trip_days * input_data.group_size
    food_cost = round(total_person_days * daily_food_per_person, 2)
    data_sources["food"] = food_source

    detailed_lines.append(BudgetLineItem(
        category="Food",
        item_name="Daily Dining (Breakfast, Lunch & Dinner)",
        unit_rate=daily_food_per_person,
        unit_label="per person / day",
        quantity=float(total_person_days),
        quantity_label=f"{input_data.trip_days} day(s) × {input_data.group_size} person(s)",
        subtotal=food_cost,
        details=f"3 hearty meals per day in {matched_dest_name}. ({food_source})",
        source_type=food_source_type
    ))

    # 5. Itemized Extra Expenses (Priority Method ii for tickets)
    extras: list[ExtraExpenseItem] = []

    ticket_source_type = "Method (i) - Benchmark"
    if dest_data.get("hasTicketData") and dest_data.get("totalTicketPrices", 0) > 0:
        tickets_per_person = float(dest_data["totalTicketPrices"])
        ticket_reason = f"Official entrance fees for {dest_data.get('ticketPlacesCount')} verified attraction(s) in {matched_dest_name}."
        data_sources["tickets"] = f"Method (ii) - Official tickets in {matched_dest_name} (Rs. {tickets_per_person:,.0f}/person)"
        ticket_source_type = "Method (ii) - Verified Provider Listings"
        methods_used_tracker.append("Method (ii)")
    else:
        tickets_per_person = input_data.selected_places_ticket_total or 1000.0
        ticket_reason = f"Standard entrance passes and conservation fees for {input_data.group_size} visitor(s)."
        data_sources["tickets"] = f"Method (i) - Standard attraction passes benchmark (Rs. {tickets_per_person:,.0f}/person)"
        ticket_source_type = "Method (i) - Benchmark"
        methods_used_tracker.append("Method (i)")

    tickets_total = round(tickets_per_person * input_data.group_size, 2)
    extras.append(ExtraExpenseItem(
        item="Visiting Places & Monument Tickets",
        amount=tickets_total,
        reason=ticket_reason
    ))
    detailed_lines.append(BudgetLineItem(
        category="Tickets",
        item_name="Visiting Places & Monument Entry Passes",
        unit_rate=tickets_per_person,
        unit_label="per person",
        quantity=float(input_data.group_size),
        quantity_label=f"{input_data.group_size} pass(es)",
        subtotal=tickets_total,
        details=ticket_reason,
        source_type=ticket_source_type
    ))

    # Activity & Wildlife/Guide Charges (if group or multi-day)
    activity_fees = 1500.0 * max(1, input_data.trip_days // 2)
    extras.append(ExtraExpenseItem(
        item="Local Guide & Regional Activity Permits",
        amount=round(activity_fees, 2),
        reason="Local cultural site guides, equipment rentals, or environmental permits."
    ))
    detailed_lines.append(BudgetLineItem(
        category="Buffer & Activities",
        item_name="Local Regional Guide & Activity Permits",
        unit_rate=1500.0,
        unit_label="per session",
        quantity=float(max(1, input_data.trip_days // 2)),
        quantity_label=f"{max(1, input_data.trip_days // 2)} session(s)",
        subtotal=round(activity_fees, 2),
        details="Local cultural site guides, environmental access, or activity equipment rentals.",
        source_type="Method (i) - Standard Regional Allowance"
    ))

    extra_expenses_total = round(sum(e.amount for e in extras), 2)

    # 6. Base Subtotal + MANDATORY 10% Safety Contingency Margin
    base_subtotal = round(accommodation_cost + transport_cost + food_cost + extra_expenses_total, 2)
    contingency_10 = round(base_subtotal * 0.10, 2)
    final_calculated_budget = round(base_subtotal + contingency_10, 2)

    detailed_lines.append(BudgetLineItem(
        category="Contingency",
        item_name="Mandatory 10% Safety & Risk Margin",
        unit_rate=contingency_10,
        unit_label="fixed 10% on base subtotal",
        quantity=1.0,
        quantity_label="10% margin",
        subtotal=contingency_10,
        details=(
            f"Mandatory safety buffer calculated on base subtotal of {base_subtotal:,.2f} {input_data.currency} "
            "to protect against price escalations, route detours, unexpected medical needs, or emergency transport."
        ),
        source_type="Platform Regulatory Rule (Mandatory 10%)"
    ))

    # 7. Overall Calculation Mode determination
    method_2_count = methods_used_tracker.count("Method (ii)")
    if method_2_count == len(methods_used_tracker) and method_2_count > 0:
        calculation_mode = "METHOD_2_VERIFIED_LISTINGS"
    elif method_2_count > 0:
        calculation_mode = "HYBRID_PRIORITY_METHOD_2"
    else:
        calculation_mode = "METHOD_1_BENCHMARK_FALLBACK"

    # 8. Compare with user's initial budget
    diff = round(input_data.user_budget - final_calculated_budget, 2)
    diff_pct = round((abs(diff) / input_data.user_budget * 100), 1) if input_data.user_budget > 0 else 0.0

    if diff >= 0:
        diff_status = "WITHIN_BUDGET"
        status_summary = (
            f"✅ Within Budget: Your proposed budget of {input_data.user_budget:,.2f} {input_data.currency} "
            f"comfortably covers the calculated expenses of {final_calculated_budget:,.2f} {input_data.currency} "
            f"(including a 10% safety buffer of {contingency_10:,.2f} {input_data.currency}). "
            f"Estimated surplus: {diff:,.2f} {input_data.currency} ({diff_pct}% buffer)."
        )
    else:
        diff_status = "EXCEEDED"
        status_summary = (
            f"⚠️ Budget Exceeded: The calculated expenses of {final_calculated_budget:,.2f} {input_data.currency} "
            f"(including a 10% safety buffer) exceed your allocated budget of {input_data.user_budget:,.2f} {input_data.currency} "
            f"by {abs(diff):,.2f} {input_data.currency} (+{diff_pct}%). Consider adjusting accommodation tier or transport choice."
        )

    itemized = [
        ItemizedCost(
            category="Accommodation",
            amount=accommodation_cost,
            description=f"{nights} night(s) for {rooms_needed} room(s) — {accommodation_source}",
            source_type=accommodation_source_type
        ),
        ItemizedCost(
            category="Transport",
            amount=transport_cost,
            description=f"{v_details.selected_vehicle_name} ({v_details.pricing_explanation})",
            source_type=transport_source_type
        ),
        ItemizedCost(
            category="Food & Dining",
            amount=food_cost,
            description=f"{input_data.trip_days} day(s) meals for {input_data.group_size} person(s) — {food_source}",
            source_type=food_source_type
        ),
        ItemizedCost(
            category="Extra Expenses & Tickets",
            amount=extra_expenses_total,
            description=f"Tickets ({data_sources.get('tickets')}), local guide permits & entrance fees",
            source_type=ticket_source_type
        ),
        ItemizedCost(
            category="Safety Margin (10%)",
            amount=contingency_10,
            description="Mandatory 10% contingency buffer for unforeseen expenses & price fluctuations",
            source_type="Rule - Safety Buffer"
        ),
    ]

    return BudgetAgentResult(
        currency=input_data.currency,
        user_budget=input_data.user_budget,
        final_calculated_budget=final_calculated_budget,
        budget_difference=diff,
        difference_status=diff_status,
        difference_percentage=diff_pct,
        status_summary=status_summary,
        calculation_mode=calculation_mode,
        data_sources=data_sources,
        accommodation_cost=accommodation_cost,
        transport_cost=transport_cost,
        restaurant_and_food_cost=food_cost,
        extra_expenses=extras,
        extra_expenses_total=extra_expenses_total,
        base_subtotal=base_subtotal,
        contingency_margin_10_percent=contingency_10,
        itemized_breakdown=itemized,
        vehicle_details=v_details,
        detailed_line_items=detailed_lines,
    )
