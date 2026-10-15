from __future__ import annotations
from datetime import datetime, date
from typing import Any
from pydantic import BaseModel, Field
from app.services.osrm_client import get_road_distance_and_duration


class WizardReviewInput(BaseModel):
    name: str = Field(..., min_length=1)
    destination: str = Field(..., min_length=1)
    starting_point: str | None = Field(default="")
    start_date: str = Field(default="")
    end_date: str = Field(default="")
    travel_method: str = Field(default="PRIVATE_VEHICLE")
    vehicle_type: str = Field(default="Car")
    total_budget: float = Field(default=0.0)
    currency: str = Field(default="LKR")
    trip_mode: str = Field(default="SOLO")
    group_members: list[str] = Field(default_factory=list)
    traveller_name: str | None = Field(default="")
    traveller_email: str | None = Field(default="")
    planning_details: dict[str, Any] | None = Field(default_factory=dict)


class DetectedIssue(BaseModel):
    severity: str  # "ERROR", "WARNING", "INFO"
    category: str
    message: str
    suggestion: str


class WizardReviewAgentResult(BaseModel):
    status: str  # "VALID", "NEEDS_CORRECTION", "SUSPICIOUS"
    is_approved_for_admin: bool
    summary: str
    detected_issues: list[DetectedIssue]
    admin_recommendation: str
    user_notification_draft: str
    tools_used: list[str] = ["Route-Feasibility-Validator", "Budget-Coherence-Checker", "Temporal-Consistency-Inspector"]


def review_trip_wizard(input_data: WizardReviewInput) -> WizardReviewAgentResult:
    """Wizard Review Agent: checks for inconsistencies, budget mismatches, and route feasibility."""
    issues: list[DetectedIssue] = []

    # 1. Temporal / Date Consistency Checks
    d_start = None
    d_end = None
    if input_data.start_date and input_data.end_date:
        try:
            d_start = datetime.strptime(input_data.start_date[:10], "%Y-%m-%d").date()
            d_end = datetime.strptime(input_data.end_date[:10], "%Y-%m-%d").date()

            if d_end < d_start:
                issues.append(DetectedIssue(
                    severity="ERROR",
                    category="Dates & Duration",
                    message="End date occurs earlier than start date.",
                    suggestion="Please ensure your departure and return dates are in chronological order."
                ))
            elif (d_end - d_start).days > 30:
                issues.append(DetectedIssue(
                    severity="WARNING",
                    category="Dates & Duration",
                    message="Trip duration exceeds 30 consecutive days.",
                    suggestion="Extended expeditions require special long-term stay permits and structured sub-itineraries."
                ))
        except Exception:
            issues.append(DetectedIssue(
                severity="ERROR",
                category="Dates & Duration",
                message="Invalid date format provided.",
                suggestion="Use YYYY-MM-DD standard date notation."
            ))

    # 2. Starting Point & Destination Route Feasibility
    start_pt = input_data.starting_point or "Colombo"
    dest = input_data.destination
    route = get_road_distance_and_duration(start_pt, dest)
    dist_km = route["distance_km"]

    v_type = input_data.vehicle_type.upper()
    method = input_data.travel_method.upper()

    if "TUK" in v_type and dist_km > 150:
        issues.append(DetectedIssue(
            severity="WARNING",
            category="Vehicle & Route Feasibility",
            message=f"Traveling {dist_km} km to {dest} in a Tuk-Tuk is high fatigue and hazardous on highways.",
            suggestion="Consider a rental Car, Van, or scenic Train for journeys over 150 km."
        ))

    # Capacity vs Members
    members_count = len(input_data.group_members)
    if input_data.trip_mode.upper() == "GROUP":
        if members_count == 0:
            issues.append(DetectedIssue(
                severity="WARNING",
                category="Group Configuration",
                message="Trip mode is set to 'GROUP' but no group members have been listed.",
                suggestion="Add your traveling companions' names or switch to Solo trip mode."
            ))
        elif ("BIKE" in v_type or "TUK" in v_type) and members_count > 3:
            issues.append(DetectedIssue(
                severity="ERROR",
                category="Vehicle Capacity",
                message=f"A {input_data.vehicle_type} cannot legally or safely transport {members_count} group members.",
                suggestion="Select a Van or Bus matching your passenger group size."
            ))

    # 3. Budget Coherence & Adequacy Checks
    days = ((d_end - d_start).days + 1) if (d_start and d_end and d_end >= d_start) else 1
    total_persons = max(1, members_count)
    min_realistic_cost = total_persons * days * 3500.0  # Bare minimum 3500 LKR per person per day in Sri Lanka

    if input_data.total_budget > 0 and input_data.currency.upper() == "LKR":
        if input_data.total_budget < min_realistic_cost:
            issues.append(DetectedIssue(
                severity="WARNING",
                category="Budget Coherence",
                message=f"Proposed budget of LKR {input_data.total_budget:,.2f} appears significantly lower than realistic minimum expenses (approx LKR {min_realistic_cost:,.2f} for {total_persons} person(s) across {days} day(s)).",
                suggestion="Review accommodation and transport allowances to avoid cash shortfalls during the trip."
            ))

    # 4. Synthesize Status
    errors = [i for i in issues if i.severity == "ERROR"]
    warnings = [i for i in issues if i.severity == "WARNING"]

    if errors:
        status = "NEEDS_CORRECTION"
        is_approved = False
        summary = f"Review detected {len(errors)} critical error(s) and {len(warnings)} warning(s). Revisions required before trip confirmation."
        admin_rec = "Decline approval and send notification to traveller with the highlighted corrections."
    elif warnings:
        status = "NEEDS_CORRECTION" if len(warnings) >= 2 else "VALID"
        is_approved = len(warnings) < 2
        summary = f"Review detected {len(warnings)} advisory item(s). Trip plan is structurally viable with minor optimizations."
        admin_rec = "Approve with advisory notes, or prompt traveller for vehicle/budget confirmation."
    else:
        status = "VALID"
        is_approved = True
        summary = "All trip parameters validated successfully with zero logical or logistical anomalies."
        admin_rec = "Approve trip plan and release to AI itinerary execution queue."

    # 5. Draft user notification
    bullet_points = "\n".join([f"• [{i.category}]: {i.message} (Suggestion: {i.suggestion})" for i in issues])
    notification_draft = (
        f"Dear {input_data.traveller_name or 'Traveller'},\n\n"
        f"Thank you for submitting your trip plan '{input_data.name}' for {input_data.destination}.\n"
        f"Our Wizard Review Agent audited your details and noted the following observations:\n\n"
        f"{bullet_points if bullet_points else '• All details look fantastic and ready to go!'}\n\n"
        f"Please update your plan in your Traveller Dashboard or contact our support team if you have any questions.\n\n"
        f"Safe Travels,\nTravelWise Team"
    )

    return WizardReviewAgentResult(
        status=status,
        is_approved_for_admin=is_approved,
        summary=summary,
        detected_issues=issues,
        admin_recommendation=admin_rec,
        user_notification_draft=notification_draft,
    )
