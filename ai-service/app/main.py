from __future__ import annotations

from datetime import datetime, timezone
from enum import StrEnum
import os
from typing import Any, Callable
from uuid import UUID

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from .gemini import generate_plan, key_pool
from .services.osrm_client import get_road_distance_and_duration
from .services.places_service import get_places_for_destination
from .services.weather_service import fetch_weather_and_assess_risk
from .services.currency_service import convert_amount
from .agents.trip_planner_agent import TripPlannerInput, TripPlannerResult, plan_trip
from .agents.budget_agent import BudgetAgentInput, BudgetAgentResult, calculate_budget
from .agents.risk_calculate_agent import RiskAgentInput, RiskAgentResult, assess_trip_risk
from .agents.split_bill_agent import SplitBillAgentInput, SplitBillAgentResult, split_group_bill
from .agents.wizard_review_agent import WizardReviewInput, WizardReviewAgentResult, review_trip_wizard
from .agents.wizard_suggestion_agent import WizardSuggestionInput, WizardSuggestionResult, analyze_wizard_and_suggest

from fastapi.middleware.cors import CORSMiddleware

# Auto-reload triggered for calibrated budget benchmarks
load_dotenv()
app = FastAPI(title="TravelWise Agentic AI", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class WorkflowState(StrEnum):
    CREATED = "CREATED"
    PLANNING = "PLANNING"
    DELEGATING = "DELEGATING"
    AGENTS_RUNNING = "AGENTS_RUNNING"
    VALIDATING = "VALIDATING"
    AWAITING_APPROVAL = "AWAITING_APPROVAL"
    COMPLETED = "COMPLETED"
    VALIDATION_FAILED = "VALIDATION_FAILED"
    AGENT_FAILED = "AGENT_FAILED"


class WorkflowRequest(BaseModel):
    workflow_id: UUID
    objective: str = Field(min_length=10, max_length=1000)
    destination: str = Field(default="", max_length=200)
    catalog_items: list[dict[str, Any]] = Field(default_factory=list, max_length=50)
    starting_point: str = Field(default="Colombo", max_length=200)
    travel_method: str = Field(default="PRIVATE_VEHICLE", max_length=50)
    vehicle_type: str = Field(default="Car", max_length=50)
    start_date: str = Field(default="", max_length=50)
    end_date: str = Field(default="", max_length=50)
    total_budget: float = Field(default=80000.0)
    currency: str = Field(default="LKR", max_length=10)
    group_members: list[str] = Field(default_factory=list)


class AgentResult(BaseModel):
    agent: str
    responsibility: str
    output: dict[str, Any]
    tools_used: list[str]


class WorkflowResponse(BaseModel):
    workflow_id: UUID
    objective: str
    state: WorkflowState
    plan: list[str]
    agents: list[AgentResult]
    validation: dict[str, Any]
    approval_required: bool
    updated_at: datetime
    model: str = "deterministic-tools"
    gemini_plan: dict[str, Any] | None = None


_workflows: dict[UUID, WorkflowResponse] = {}


# --- Deterministic Legacy Tool Functions for Backwards Compatibility ---

def get_trip_budget(context: dict[str, Any]) -> dict[str, Any]:
    b = float(context.get("total_budget", 80000.0) or 80000.0)
    curr = str(context.get("currency", "LKR") or "LKR")
    return {
        "total_budget": b,
        "currency": curr,
        "categories": {
            "accommodation": round(b * 0.40, 2),
            "transport": round(b * 0.25, 2),
            "food": round(b * 0.20, 2),
            "activities": round(b * 0.15, 2),
        },
        "source": "allocated-trip-budget"
    }


def get_expenses(context: dict[str, Any]) -> dict[str, Any]:
    return {
        "total": 48000.0,
        "currency": context.get("currency", "LKR"),
        "items": [
            {"description": "Ella Villa Lodging", "amount": 32000.0, "payer": "Alex"},
            {"description": "Private Van Transit", "amount": 16000.0, "payer": "Kasun"}
        ]
    }


def calculate_health(context: dict[str, Any]) -> dict[str, Any]:
    budget = float(context.get("total_budget", 80000.0) or 80000.0)
    spent = 48000.0
    ratio = spent / budget if budget > 0 else 0.0
    status = "CRITICAL" if ratio > 1.0 else "WARNING" if ratio > 0.85 else "HEALTHY"
    return {
        "budget_limit": budget,
        "total_spent": spent,
        "utilization_ratio": round(ratio, 2),
        "status": status,
        "burn_rate_daily": round(spent / 2, 2)
    }


def search_activities(context: dict[str, Any]) -> dict[str, Any]:
    dest = context.get("destination", "Ella")
    places = get_places_for_destination(dest, context.get("catalog_items"))
    acts = [
        {"name": vp["name"], "type": vp.get("type", "Attraction"), "rating": vp.get("rating", 4.7)}
        for vp in places["visiting_places"][:4]
    ]
    return {
        "destination": dest,
        "activities": acts
    }


def get_details(context: dict[str, Any]) -> dict[str, Any]:
    dest = context.get("destination", "Ella")
    return {
        "location": f"{dest}, Sri Lanka",
        "operating_hours": "06:00 - 18:30",
        "advisory": "Follow local guidelines and verify attraction schedules."
    }


def check_conflict(context: dict[str, Any]) -> dict[str, Any]:
    return {"has_conflict": False, "conflicts": [], "resolution": "No temporal overlaps detected in schedule."}


def get_weather(context: dict[str, Any]) -> dict[str, Any]:
    dest = context.get("destination", "Ella")
    w = fetch_weather_and_assess_risk(dest)
    return {
        "provider": "Open-Meteo-Live",
        "severity": w["risk_level"],
        "temperature_c": w["temperature_c"],
        "precipitation_probability": w["precipitation_probability"],
        "advisory": w["weather_summary"]
    }


def get_destination_risk(context: dict[str, Any]) -> dict[str, Any]:
    dest = context.get("destination", "Ella")
    w = fetch_weather_and_assess_risk(dest)
    return {
        "destination": dest,
        "risk_index": 20 if w["risk_level"] == "LOW" else 55 if w["risk_level"] == "MODERATE" else 85,
        "hazard_category": f"{w['risk_level']}_RISK",
        "emergency_contacts": {"police": "119", "tourist_hotline": "1912", "ambulance": "1990"}
    }


def calculate_balances(context: dict[str, Any]) -> dict[str, Any]:
    members = context.get("group_members") or ["Alex", "Kasun", "Dilan", "Bhanuka"]
    # Net sum conservation
    return {
        "balances": [
            {"member": members[0] if len(members) > 0 else "Alex", "net": 20000.0},
            {"member": members[1] if len(members) > 1 else "Kasun", "net": 4000.0},
            {"member": members[2] if len(members) > 2 else "Dilan", "net": -12000.0},
            {"member": members[3] if len(members) > 3 else "Bhanuka", "net": -12000.0}
        ],
        "net_balance_sum": 0.0
    }


def convert_currency_tool(context: dict[str, Any]) -> dict[str, Any]:
    base = context.get("currency", "LKR")
    target = context.get("target_currency", "USD")
    res = convert_amount(100.0, base, target)
    return {"rate": res["exchange_rate"], "base_currency": base, "target_currency": target, "timestamp": res["timestamp"]}


def generate_settlement_plan_tool(context: dict[str, Any]) -> dict[str, Any]:
    members = context.get("group_members") or ["Alex", "Kasun", "Dilan", "Bhanuka"]
    curr = context.get("currency", "LKR")
    return {
        "transfers": [
            {"from": members[2] if len(members) > 2 else "Dilan", "to": members[0] if len(members) > 0 else "Alex", "amount": 12000.0, "currency": curr},
            {"from": members[3] if len(members) > 3 else "Bhanuka", "to": members[0] if len(members) > 0 else "Alex", "amount": 8000.0, "currency": curr},
            {"from": members[3] if len(members) > 3 else "Bhanuka", "to": members[1] if len(members) > 1 else "Kasun", "amount": 4000.0, "currency": curr}
        ],
        "transaction_count": 3,
        "requires_human_approval": True
    }


def search_catalog_tool(context: dict[str, Any]) -> dict[str, Any]:
    items = context.get("catalog_items", [])
    visiting_places = [i for i in items if i.get("type") == "VisitingPlace"]
    restaurants = [i for i in items if i.get("type") == "Restaurant"]
    accommodations = [i for i in items if i.get("type") == "Accommodation"]
    food_prices = [i for i in items if i.get("type") == "FoodPrice"]
    return {
        "items": items,
        "count": len(items),
        "categories": {
            "visiting_places": visiting_places,
            "restaurants": restaurants,
            "accommodations": accommodations,
            "food_prices": food_prices,
        },
        "recommendations_summary": f"Found {len(visiting_places)} visiting places, {len(restaurants)} restaurants, {len(accommodations)} stay options, and {len(food_prices)} food price quotes for {context.get('destination', 'the destination')}.",
        "source": "approved-provider-catalog"
    }


TOOLS: dict[str, Callable[[dict[str, Any]], dict[str, Any]]] = {
    "GetTripBudget": get_trip_budget,
    "GetExpenses": get_expenses,
    "CalculateHealth": calculate_health,
    "SearchActivities": search_activities,
    "GetDetails": get_details,
    "CheckConflict": check_conflict,
    "GetWeather": get_weather,
    "GetDestinationRisk": get_destination_risk,
    "CalculateBalances": calculate_balances,
    "ConvertCurrency": convert_currency_tool,
    "GenerateSettlementPlan": generate_settlement_plan_tool,
    "SearchCatalog": search_catalog_tool,
}


def run_agent(name: str, responsibility: str, tool_names: list[str], context: dict[str, Any]) -> AgentResult:
    outputs = {tool: TOOLS[tool](context) for tool in tool_names if tool in TOOLS}
    return AgentResult(agent=name, responsibility=responsibility, output=outputs, tools_used=tool_names)


def orchestrate(request: WorkflowRequest) -> WorkflowResponse:
    plan = [
        "1. Trip Planner Agent audits route distance, detects places/stays/food, and crafts advanced schedule.",
        "2. Budget Agent calculates itemized transport, accommodation, food, and extras + 10% safety margin.",
        "3. Risk Calculate Agent assesses meteorological, terrain, and activity hazards (flags halts on High Risk).",
        "4. Split-Bill Agent computes fair individual member cost allocations, forex, and cash settlements.",
        "5. Wizard Review Agent audits full trip wizard data for anomalies, budget coherence, and admin approval.",
    ]
    context = {
        "workflow_id": str(request.workflow_id),
        "objective": request.objective,
        "destination": request.destination or "Ella",
        "catalog_items": request.catalog_items,
        "starting_point": request.starting_point,
        "travel_method": request.travel_method,
        "vehicle_type": request.vehicle_type,
        "start_date": request.start_date,
        "end_date": request.end_date,
        "total_budget": request.total_budget,
        "currency": request.currency,
        "group_members": request.group_members,
    }

    # 1. Execute Trip Planner Agent
    dest = request.destination or "Ella"
    trip_plan_res = plan_trip(TripPlannerInput(
        starting_location=request.starting_point or "Colombo",
        destination_location=dest,
        travel_method=request.travel_method or "PRIVATE_VEHICLE",
        vehicle_type=request.vehicle_type or "Car",
        start_date=request.start_date,
        end_date=request.end_date,
        catalog_items=request.catalog_items
    ))

    # 2. Execute Budget Agent (uses Trip Planner Agent's road route & days)
    budget_res = calculate_budget(BudgetAgentInput(
        user_budget=request.total_budget or 80000.0,
        currency=request.currency or "LKR",
        starting_location=request.starting_point or "Colombo",
        destination_location=dest,
        travel_method=request.travel_method or "PRIVATE_VEHICLE",
        vehicle_type=request.vehicle_type or "Car",
        trip_days=trip_plan_res.trip_days,
        group_size=max(1, len(request.group_members))
    ))

    # 3. Execute Risk Calculate Agent
    risk_res = assess_trip_risk(RiskAgentInput(
        destination=dest,
        travel_method=request.travel_method or "PRIVATE_VEHICLE"
    ))

    # 4. Execute Split-Bill Agent
    split_res = split_group_bill(SplitBillAgentInput(
        total_cost=budget_res.final_calculated_budget,
        currency=request.currency or "LKR",
        group_members=request.group_members or ["Primary Traveller"],
        split_strategy="EQUAL"
    ))

    # 5. Execute Wizard Review Agent
    review_res = review_trip_wizard(WizardReviewInput(
        name=f"Trip to {dest}",
        destination=dest,
        starting_point=request.starting_point or "Colombo",
        start_date=request.start_date,
        end_date=request.end_date,
        travel_method=request.travel_method or "PRIVATE_VEHICLE",
        vehicle_type=request.vehicle_type or "Car",
        total_budget=request.total_budget,
        currency=request.currency or "LKR",
        group_members=request.group_members,
    ))

    # Compile the 5 distinct agents
    agents = [
        AgentResult(
            agent="Trip Planner Agent",
            responsibility="OSRM road distance calculation, attraction/stay/restaurant discovery, and hourly itinerary scheduling.",
            output=trip_plan_res.model_dump(),
            tools_used=trip_plan_res.tools_used
        ),
        AgentResult(
            agent="Budget Agent",
            responsibility="Itemized expense calculation, 10% safety margin buffer, and budget difference analysis.",
            output=budget_res.model_dump(),
            tools_used=budget_res.tools_used
        ),
        AgentResult(
            agent="Risk Calculate Agent",
            responsibility="Live Open-Meteo weather hazards, terrain risk classification, and expedition halt alerts.",
            output=risk_res.model_dump(),
            tools_used=risk_res.tools_used
        ),
        AgentResult(
            agent="Split-Bill Agent",
            responsibility="Group individual member cost shares, forex conversion, and minimum cash debt settlement.",
            output=split_res.model_dump(),
            tools_used=split_res.tools_used
        ),
        AgentResult(
            agent="Wizard Review Agent",
            responsibility="Pre-submission QA audit, anomaly detection, admin recommendation, and traveller notification draft.",
            output=review_res.model_dump(),
            tools_used=review_res.tools_used
        ),
    ]

    model_plan = generate_plan(
        request.objective,
        [agent.agent for agent in agents],
        request.destination,
        request.catalog_items,
    )

    validation = {
        "schema_valid": all(agent.output is not None for agent in agents),
        "model_output_valid": model_plan is None or isinstance(model_plan, dict),
        "business_rules": ["BR-BUD-01", "BR-ACT-01", "BR-RISK-01", "BR-SPLIT-01", "BR-SPLIT-02", "BR-WIZARD-01"],
        "safe_failure": True,
    }
    state = WorkflowState.AWAITING_APPROVAL if validation["schema_valid"] and validation["model_output_valid"] else WorkflowState.VALIDATION_FAILED
    return WorkflowResponse(
        workflow_id=request.workflow_id,
        objective=request.objective,
        state=state,
        plan=plan,
        agents=agents,
        validation=validation,
        approval_required=state == WorkflowState.AWAITING_APPROVAL,
        updated_at=datetime.now(timezone.utc),
        model=os.getenv("GEMINI_MODEL", "deterministic-tools") if model_plan else "deterministic-tools",
        gemini_plan=model_plan,
    )


# --- HTTP Endpoints ---

@app.get("/")
def root() -> dict[str, Any]:
    return {
        "service": "travelwise-agentic-ai",
        "status": "ok",
        "health": "/health",
        "docs": "/docs",
        "workflows": "/internal/workflows",
        "agents": [
            "/agents/trip-planner",
            "/agents/budget",
            "/agents/risk",
            "/agents/split-bill",
            "/agents/wizard-review"
        ]
    }


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "travelwise-agentic-ai",
        "gemini_pool": key_pool.get_status(),
    }


@app.get("/agents/gemini-status")
def get_gemini_status() -> dict[str, Any]:
    return key_pool.get_status()


@app.post("/internal/workflows", response_model=WorkflowResponse)
def start_workflow(request: WorkflowRequest) -> WorkflowResponse:
    try:
        result = orchestrate(request)
    except Exception as error:
        raise HTTPException(status_code=502, detail=f"AI workflow failed safely: {error}") from error
    _workflows[request.workflow_id] = result
    return result


@app.get("/internal/workflows/{workflow_id}", response_model=WorkflowResponse)
def get_workflow(workflow_id: UUID) -> WorkflowResponse:
    if workflow_id not in _workflows:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return _workflows[workflow_id]


# --- Dedicated Standalone Agent Endpoints ---

@app.post("/agents/trip-planner", response_model=TripPlannerResult)
def run_trip_planner(input_data: TripPlannerInput) -> TripPlannerResult:
    """1. Trip Planner Agent: OSRM distance, transport advice, attractions, accommodations, and hourly schedule."""
    try:
        return plan_trip(input_data)
    except Exception as ex:
        raise HTTPException(status_code=500, detail=f"Trip Planner Agent error: {ex}") from ex


@app.post("/agents/budget", response_model=BudgetAgentResult)
def run_budget_agent(input_data: BudgetAgentInput) -> BudgetAgentResult:
    """2. Budget Agent: OSRM road distance cost, itemized breakdown, +10% safety margin, and budget difference analysis."""
    try:
        return calculate_budget(input_data)
    except Exception as ex:
        raise HTTPException(status_code=500, detail=f"Budget Agent error: {ex}") from ex


@app.post("/agents/risk", response_model=RiskAgentResult)
def run_risk_agent(input_data: RiskAgentInput) -> RiskAgentResult:
    """3. Risk Calculate Agent: Live Open-Meteo weather hazards, terrain alerts, and expedition halt trigger on High Risk."""
    try:
        return assess_trip_risk(input_data)
    except Exception as ex:
        raise HTTPException(status_code=500, detail=f"Risk Calculate Agent error: {ex}") from ex


@app.post("/agents/split-bill", response_model=SplitBillAgentResult)
def run_split_bill_agent(input_data: SplitBillAgentInput) -> SplitBillAgentResult:
    """4. Split-Bill Agent: Group individual shares, currency conversion, and optimal cash debt settlements."""
    try:
        return split_group_bill(input_data)
    except Exception as ex:
        raise HTTPException(status_code=500, detail=f"Split-Bill Agent error: {ex}") from ex


@app.post("/agents/wizard-review", response_model=WizardReviewAgentResult)
def run_wizard_review_agent(input_data: WizardReviewInput) -> WizardReviewAgentResult:
    """5. Wizard Review Agent: QA audit of trip wizard submission, anomaly detection, admin recommendation, and notification draft."""
    try:
        return review_trip_wizard(input_data)
    except Exception as ex:
        raise HTTPException(status_code=500, detail=f"Wizard Review Agent error: {ex}") from ex


@app.post("/agents/wizard-suggestions", response_model=WizardSuggestionResult)
def run_wizard_suggestions_agent(input_data: WizardSuggestionInput) -> WizardSuggestionResult:
    """6. Trip Wizard AI Suggestion & Validation Agent:
    Validates traveler inputs (missing budget, dates, members), checks inconsistencies,
    and returns matching Service Provider / Admin published listings (hotels, restaurants, vehicles, places).
    """
    try:
        return analyze_wizard_and_suggest(input_data)
    except Exception as ex:
        raise HTTPException(status_code=500, detail=f"Wizard Suggestion Agent error: {ex}") from ex


# --- Sequential Admin AI Review Pipeline ---

class SequentialReviewInput(BaseModel):
    starting_location: str = Field(default="Colombo", description="Starting point or hotel")
    destination: str = Field(..., description="Destination in Sri Lanka")
    start_date: str = Field(default="", description="YYYY-MM-DD")
    end_date: str = Field(default="", description="YYYY-MM-DD")
    travel_method: str = Field(default="PRIVATE_VEHICLE")
    vehicle_type: str = Field(default="Car")
    user_budget: float = Field(default=50000.0)
    currency: str = Field(default="LKR")
    daily_time_limit_hours: float = Field(default=8.0)
    interests: list[str] = Field(default_factory=list)
    must_visit_places: str = Field(default="")
    high_risk_activities: list[str] = Field(default_factory=list)
    group_mode: str = Field(default="SOLO")
    group_members: list[str] = Field(default_factory=list)
    target_currency: str = Field(default="USD")
    force_risk_level: str | None = Field(default=None, description="Optional risk override for testing/demo")


class SequentialReviewResult(BaseModel):
    destination: str
    starting_location: str
    halted_due_to_risk: bool
    halt_reason: str | None = None
    trip_planner: TripPlannerResult | None = None
    risk_calculator: RiskAgentResult | None = None
    budget: BudgetAgentResult | None = None
    split_bill: SplitBillAgentResult | None = None
    admin_summary: str
    pipeline_steps: list[dict[str, Any]]


@app.post("/agents/sequential-review", response_model=SequentialReviewResult)
def run_sequential_review(input_data: SequentialReviewInput) -> SequentialReviewResult:
    """Sequential Admin AI Review:
    Order:
    1. Trip Planner Agent
    2. Risk Calculate Agent
    --> [CRITICAL HALT CHECK]: If High Risk detected, halts immediately and skips Budget & Split-Bill.
    3. Budget Agent (if risk <= MODERATE)
    4. Split-Bill Agent (if risk <= MODERATE)
    """
    pipeline_steps: list[dict[str, Any]] = []

    # Step 1: Trip Planner Agent
    trip_plan = plan_trip(TripPlannerInput(
        starting_location=input_data.starting_location,
        destination_location=input_data.destination,
        travel_method=input_data.travel_method,
        vehicle_type=input_data.vehicle_type,
        start_date=input_data.start_date,
        end_date=input_data.end_date,
        interests=input_data.interests,
        daily_time_limit_hours=input_data.daily_time_limit_hours,
        must_visit_places=input_data.must_visit_places,
    ))
    pipeline_steps.append({
        "order": 1,
        "agent": "Trip Planner Agent",
        "status": "COMPLETED",
        "summary": f"Calculated {trip_plan.trip_days} day(s) itinerary. Road distance: {trip_plan.road_route.get('distance_km', 0)} km. Transport: {trip_plan.suggested_transport_type}."
    })

    # Step 2: Risk Calculate Agent
    visiting_names = [p.get("name", "") for p in trip_plan.visiting_places if isinstance(p, dict)]
    risk_res = assess_trip_risk(RiskAgentInput(
        destination=input_data.destination,
        visiting_places=visiting_names,
        travel_method=input_data.travel_method,
        high_risk_activities=input_data.high_risk_activities,
        force_risk_level=input_data.force_risk_level,
    ))

    # CRITICAL HALT CHECK: Early break if high risk
    is_high_risk = (risk_res.overall_risk_level.upper() == "HIGH" or risk_res.halt_recommended)
    if is_high_risk:
        pipeline_steps.append({
            "order": 2,
            "agent": "Risk Calculate Agent",
            "status": "HALT_TRIGGERED",
            "summary": f"HIGH RISK DETECTED ({risk_res.weather_report.get('weather_summary', 'Hazardous')}). Early break activated."
        })
        pipeline_steps.append({
            "order": 3,
            "agent": "Budget Agent",
            "status": "SKIPPED_DUE_TO_HIGH_RISK",
            "summary": "Execution halted to prevent resource waste and token exhaustion on dangerous trip."
        })
        pipeline_steps.append({
            "order": 4,
            "agent": "Split-Bill Agent",
            "status": "SKIPPED_DUE_TO_HIGH_RISK",
            "summary": "Execution halted to prevent resource waste and token exhaustion on dangerous trip."
        })

        halt_reason = (
            risk_res.strong_warning_message
            or f"Extreme hazard detected in {input_data.destination}. Weather/terrain/activity safety index is critical."
        )
        return SequentialReviewResult(
            destination=input_data.destination,
            starting_location=input_data.starting_location,
            halted_due_to_risk=True,
            halt_reason=halt_reason,
            trip_planner=trip_plan,
            risk_calculator=risk_res,
            budget=None,
            split_bill=None,
            admin_summary=(
                f"🚨 CRITICAL DANGER ALERT: Destination '{input_data.destination}' flagged as HIGH RISK. "
                "Downstream execution of Budget Agent and Split-Bill Agent was immediately broken to protect traveller safety and conserve AI resources."
            ),
            pipeline_steps=pipeline_steps,
        )

    # If risk is acceptable (LOW or MODERATE):
    pipeline_steps.append({
        "order": 2,
        "agent": "Risk Calculate Agent",
        "status": "COMPLETED",
        "summary": f"Safety assessment: {risk_res.overall_risk_level} Risk. Temp: {risk_res.weather_report.get('temperature_c')}°C, Rain: {risk_res.weather_report.get('precipitation_probability')}%."
    })

    # Step 3: Budget Agent
    group_size = len(input_data.group_members) if input_data.group_members else 1
    budget_res = calculate_budget(BudgetAgentInput(
        user_budget=input_data.user_budget,
        currency=input_data.currency,
        starting_location=input_data.starting_location,
        destination_location=input_data.destination,
        travel_method=input_data.travel_method,
        vehicle_type=input_data.vehicle_type,
        trip_days=trip_plan.trip_days,
        group_size=group_size,
    ))
    pipeline_steps.append({
        "order": 3,
        "agent": "Budget Agent",
        "status": "COMPLETED",
        "summary": f"Calculated: {budget_res.final_calculated_budget:,.2f} {budget_res.currency} (Status: {budget_res.difference_status}, Diff: {budget_res.budget_difference:+,.2f} {budget_res.currency}, Margin 10%: {budget_res.contingency_margin_10_percent:,.2f})."
    })

    # Step 4: Split-Bill Agent
    members = input_data.group_members if input_data.group_members else ["Primary Traveller"]
    split_res = split_group_bill(SplitBillAgentInput(
        total_cost=budget_res.final_calculated_budget,
        currency=budget_res.currency,
        group_members=members,
        split_strategy="EQUAL",
        target_currency=input_data.target_currency or "USD",
    ))
    pipeline_steps.append({
        "order": 4,
        "agent": "Split-Bill Agent",
        "status": "COMPLETED",
        "summary": f"Split across {len(members)} member(s): ~{split_res.individual_shares[0].amount:,.2f} {split_res.currency} each."
    })

    admin_summary = (
        f"✅ AI Review Complete for {input_data.destination}. "
        f"Trip: {trip_plan.trip_days} day(s), {trip_plan.road_route.get('distance_km', 0)} km. "
        f"Safety: {risk_res.overall_risk_level}. "
        f"Budget: {budget_res.difference_status} (Est: {budget_res.final_calculated_budget:,.2f} {budget_res.currency} vs User: {budget_res.user_budget:,.2f} {budget_res.currency}). "
        f"Split: {len(members)} traveller(s), {split_res.individual_shares[0].amount:,.2f} {split_res.currency} each."
    )

    return SequentialReviewResult(
        destination=input_data.destination,
        starting_location=input_data.starting_location,
        halted_due_to_risk=False,
        halt_reason=None,
        trip_planner=trip_plan,
        risk_calculator=risk_res,
        budget=budget_res,
        split_bill=split_res,
        admin_summary=admin_summary,
        pipeline_steps=pipeline_steps,
    )

