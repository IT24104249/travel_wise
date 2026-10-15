from __future__ import annotations
from typing import Any
from pydantic import BaseModel, Field
from app.services.weather_service import fetch_weather_and_assess_risk


class RiskAgentInput(BaseModel):
    destination: str = Field(..., description="Destination city/region")
    visiting_places: list[str] = Field(default_factory=list)
    travel_method: str = Field(default="PRIVATE_VEHICLE")
    high_risk_activities: list[str] = Field(default_factory=list)
    force_risk_level: str | None = Field(default=None, description="Optional override for simulation/testing: LOW, MODERATE, HIGH")


class RiskCategoryDetail(BaseModel):
    category: str
    level: str  # "LOW", "MODERATE", "HIGH"
    details: str


class RiskAgentResult(BaseModel):
    destination: str
    overall_risk_level: str  # "LOW", "MODERATE", "HIGH"
    halt_recommended: bool
    strong_warning_message: str | None = None
    weather_report: dict[str, Any]
    risk_breakdown: list[RiskCategoryDetail]
    emergency_contacts: dict[str, str]
    safety_recommendations: list[str]
    tools_used: list[str] = ["Open-Meteo-Live-Weather", "SriLanka-Disaster-Hazards-Model", "Extreme-Activity-Safety-Engine"]


def assess_trip_risk(input_data: RiskAgentInput) -> RiskAgentResult:
    """Risk Calculate Agent logic: evaluates weather, terrain, and high risk activities."""
    # 1. Fetch live Open-Meteo weather and base weather hazards
    weather = fetch_weather_and_assess_risk(input_data.destination)

    # 2. Category checks
    breakdown: list[RiskCategoryDetail] = []
    safety_recs: list[str] = []

    # Weather Risk
    breakdown.append(RiskCategoryDetail(
        category="Meteorological & Atmospheric",
        level=weather["risk_level"],
        details=f"{weather['weather_summary']}, temp {weather['temperature_c']}°C, rain probability {weather['precipitation_probability']}%, wind {weather['wind_speed_kmh']} km/h."
    ))

    # Activity Risk
    has_extreme_activities = len(input_data.high_risk_activities) > 0
    activity_risk_level = "LOW"
    if has_extreme_activities:
        activity_risk_level = "MODERATE"
        extreme_names = ", ".join(input_data.high_risk_activities)
        lower_names = extreme_names.lower()
        if "extreme" in lower_names:
            activity_risk_level = "HIGH"
        elif any(w in lower_names for w in ["rafting", "diving", "rock climb", "water sports"]):
            if weather["risk_level"] in {"MODERATE", "HIGH"} or weather.get("precipitation_probability", 0) > 40:
                activity_risk_level = "HIGH"
        breakdown.append(RiskCategoryDetail(
            category="Planned Adventure Activities",
            level=activity_risk_level,
            details=f"Activities identified: {extreme_names}. Certified gear & licensed instructors mandatory."
        ))
        safety_recs.append("Ensure international adventure travel insurance and verify operator SLS certifications.")
    else:
        breakdown.append(RiskCategoryDetail(
            category="Planned Adventure Activities",
            level="LOW",
            details="Standard sightseeing activities without technical mountaineering or aquatic hazards."
        ))

    # Road & Transport Risk
    transport_risk_level = "LOW"
    if "TUK" in input_data.travel_method.upper() and any(h in input_data.destination.lower() for h in ["ella", "nuwara", "kandy", "haldummulla"]):
        transport_risk_level = "MODERATE"
        breakdown.append(RiskCategoryDetail(
            category="Road & Vehicle Transit",
            level=transport_risk_level,
            details="Three-wheelers on steep hairpin curves (18-bends / mountain passes) experience brake fade and reduced stability."
        ))
        safety_recs.append("Exercise extreme caution on winding descents; avoid driving past 19:00 in dense hill fog.")
    else:
        breakdown.append(RiskCategoryDetail(
            category="Road & Vehicle Transit",
            level="LOW",
            details="Normal highway and paved provincial road conditions."
        ))

    # 3. Overall Risk synthesis
    levels = [b.level for b in breakdown]
    if input_data.force_risk_level and input_data.force_risk_level.upper() in {"LOW", "MODERATE", "HIGH"}:
        overall_level = input_data.force_risk_level.upper()
        if overall_level == "HIGH":
            halt_recommended = True
            strong_warning = (
                f"🚨 CRITICAL SAFETY WARNING FOR {input_data.destination.upper()}: "
                f"High hazard indicators detected. "
                f"IT IS STRONGLY ADVISED TO HALT OR POSTPONE PLANNED OUTDOOR EXPEDITIONS UNTIL AN ALL-CLEAR IS ISSUED."
            )
        elif overall_level == "MODERATE":
            halt_recommended = False
            strong_warning = None
        else:
            halt_recommended = False
            strong_warning = None
    elif "HIGH" in levels:
        overall_level = "HIGH"
        halt_recommended = True
        strong_warning = (
            f"🚨 CRITICAL SAFETY WARNING FOR {input_data.destination.upper()}: "
            f"High hazard indicators detected (Severe weather, elevated landslide/flood probability, or hazardous activity conditions). "
            f"IT IS STRONGLY ADVISED TO HALT OR POSTPONE PLANNED OUTDOOR EXPEDITIONS UNTIL AN ALL-CLEAR IS ISSUED."
        )
    elif "MODERATE" in levels:
        overall_level = "MODERATE"
        halt_recommended = False
        strong_warning = None
        safety_recs.append("Keep emergency contacts at hand and check local police/disaster bulletins before departures.")
    else:
        overall_level = "LOW"
        halt_recommended = False
        strong_warning = None
        safety_recs.append("Conditions are optimal. Observe standard travel safety precautions.")

    emergency_contacts = {
        "Tourist Police Hotline": "1912",
        "Sri Lanka Police Emergency": "119",
        "Suwa Seriya Ambulance": "1990",
        "Disaster Management Centre (DMC)": "117",
        "Fire & Rescue": "110",
    }

    return RiskAgentResult(
        destination=input_data.destination,
        overall_risk_level=overall_level,
        halt_recommended=halt_recommended,
        strong_warning_message=strong_warning,
        weather_report=weather,
        risk_breakdown=breakdown,
        emergency_contacts=emergency_contacts,
        safety_recommendations=safety_recs,
    )
