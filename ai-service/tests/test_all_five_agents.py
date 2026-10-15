import pytest
from app.agents.trip_planner_agent import TripPlannerInput, plan_trip
from app.agents.budget_agent import BudgetAgentInput, calculate_budget
from app.agents.risk_calculate_agent import RiskAgentInput, assess_trip_risk
from app.agents.split_bill_agent import SplitBillAgentInput, split_group_bill
from app.agents.wizard_review_agent import WizardReviewInput, review_trip_wizard
from app.main import SequentialReviewInput, run_sequential_review


# 1. Test Trip Planner Agent
def test_trip_planner_agent_calculates_distance_and_generates_schedule():
    planner_input = TripPlannerInput(
        starting_location="Colombo Fort",
        destination_location="Ella",
        travel_method="RENTAL_VEHICLE",
        vehicle_type="Van",
        start_date="2026-11-01",
        end_date="2026-11-03",
    )
    res = plan_trip(planner_input)

    assert res.destination == "Ella"
    assert res.trip_days == 3
    assert res.is_single_day_picnic is False
    assert res.road_route["distance_km"] > 50  # Colombo to Ella is ~200km
    assert "duration_formatted" in res.road_route
    assert len(res.visiting_places) > 0
    assert len(res.accommodations) > 0
    assert len(res.restaurants) > 0
    assert len(res.itinerary_schedule) == 3
    # Check slots for day 1
    day1_slots = res.itinerary_schedule[0].schedule
    assert any("Depart" in s.activity for s in day1_slots)
    assert any("Lunch" in s.activity for s in day1_slots)


def test_trip_planner_agent_single_day_picnic():
    picnic_input = TripPlannerInput(
        starting_location="Colombo",
        destination_location="Galle",
        travel_method="PRIVATE_VEHICLE",
        vehicle_type="Car",
        start_date="2026-11-01",
        end_date="2026-11-01",
    )
    res = plan_trip(picnic_input)
    assert res.trip_days == 1
    assert res.is_single_day_picnic is True
    day1_slots = res.itinerary_schedule[0].schedule
    assert any("return journey" in s.activity.lower() for s in day1_slots)


# 2. Test Budget Agent
def test_budget_agent_calculates_10_percent_margin_and_difference():
    # User budget = 100,000 LKR
    b_input = BudgetAgentInput(
        user_budget=100000.0,
        currency="LKR",
        starting_location="Colombo",
        destination_location="Ella",
        travel_method="RENTAL_VEHICLE",
        vehicle_type="Van",
        trip_days=3,
        group_size=4,
    )
    res = calculate_budget(b_input)

    # Base cost checks
    assert res.accommodation_cost > 0
    assert res.transport_cost > 0
    assert res.restaurant_and_food_cost > 0
    assert res.extra_expenses_total > 0

    # Strict 10% safety margin test
    expected_10_pct = round(res.base_subtotal * 0.10, 2)
    assert abs(res.contingency_margin_10_percent - expected_10_pct) < 0.01
    assert abs(res.final_calculated_budget - (res.base_subtotal + expected_10_pct)) < 0.01

    # Budget difference test
    assert res.budget_difference == round(b_input.user_budget - res.final_calculated_budget, 2)
    assert res.difference_status in {"WITHIN_BUDGET", "EXCEEDED"}
    assert len(res.extra_expenses) >= 2


def test_budget_agent_exceeded_status():
    # Tiny user budget = 1,000 LKR for 3 days group of 4 -> must be EXCEEDED
    b_input = BudgetAgentInput(
        user_budget=1000.0,
        currency="LKR",
        starting_location="Colombo",
        destination_location="Kandy",
        travel_method="RENTAL_VEHICLE",
        vehicle_type="Van",
        trip_days=3,
        group_size=4,
    )
    res = calculate_budget(b_input)
    assert res.difference_status == "EXCEEDED"
    assert res.budget_difference < 0


def test_budget_agent_own_vehicle_rule_zero_transport_cost():
    # User Requirement 2: Own / Personal vehicle must have exactly 0 LKR transport cost
    b_input = BudgetAgentInput(
        user_budget=50000.0,
        currency="LKR",
        starting_location="Colombo",
        destination_location="Kandy",
        travel_method="OWN_VEHICLE",
        vehicle_type="Car",
        trip_days=2,
        group_size=2,
    )
    res = calculate_budget(b_input)
    assert res.transport_cost == 0.0
    # Check data sources attribution
    assert "Personal Vehicle" in res.data_sources.get("transport", "")
    assert res.final_calculated_budget > 0
    # 10% safety margin test still applies
    assert res.contingency_margin_10_percent == round(res.base_subtotal * 0.10, 2)


def test_budget_agent_public_transport_train_calculation_and_details():
    # User Request: Train public transport calculation should be realistic and detailed
    b_input = BudgetAgentInput(
        user_budget=50000.0,
        currency="LKR",
        starting_location="Colombo",
        destination_location="Ella",
        travel_method="PUBLIC_TRANSPORT",
        vehicle_type="Train",
        trip_days=3,
        group_size=1,
    )
    res = calculate_budget(b_input)
    # Realistic train cost: 1,000 outbound + 1,000 return + 3 * 350 local transit = 3,050 LKR (not 5,100+)
    assert res.transport_cost == 3050.0
    assert res.vehicle_details.is_public_transport is True
    assert "Train" in res.vehicle_details.selected_vehicle_name
    assert "1,000" in res.vehicle_details.pricing_explanation
    # Granular items must be populated
    assert len(res.detailed_line_items) >= 6
    categories = [i.category for i in res.detailed_line_items]
    assert "Transport" in categories
    assert "Lodging" in categories
    assert "Food" in categories
    assert "Tickets" in categories
    assert "Contingency" in categories


# 3. Test Risk Calculate Agent
def test_risk_calculate_agent_nominal_and_contacts():
    r_input = RiskAgentInput(
        destination="Galle",
        travel_method="PRIVATE_VEHICLE",
        high_risk_activities=[]
    )
    res = assess_trip_risk(r_input)
    assert res.destination == "Galle"
    assert res.overall_risk_level in {"LOW", "MODERATE", "HIGH"}
    assert "1912" in res.emergency_contacts["Tourist Police Hotline"]
    assert "1990" in res.emergency_contacts["Suwa Seriya Ambulance"]


def test_risk_calculate_agent_extreme_activity_and_halt_behavior():
    r_input = RiskAgentInput(
        destination="Ella",
        travel_method="RENTAL_VEHICLE",
        high_risk_activities=["White Water Rafting", "Extreme Rock Climbing"]
    )
    res = assess_trip_risk(r_input)
    # Activities are flagged in breakdown
    act_breakdown = [b for b in res.risk_breakdown if "Activities" in b.category][0]
    assert act_breakdown.level in {"MODERATE", "HIGH"}


# 4. Test Split-Bill Agent
def test_split_bill_agent_equal_and_currency_conversion():
    split_input = SplitBillAgentInput(
        total_cost=60000.0,
        currency="LKR",
        group_members=["Alex", "Kasun", "Nimal"],
        split_strategy="EQUAL",
        target_currency="USD",
        paid_by="Alex"
    )
    res = split_group_bill(split_input)
    assert res.member_count == 3
    assert res.total_cost == 60000.0
    for s in res.individual_shares:
        assert s.amount == 20000.0
        assert s.percentage == 33.33
        assert s.converted_currency == "USD"
        assert s.converted_amount is not None and s.converted_amount > 0

    # Settlements: Kasun & Nimal owe Alex 20,000 each
    assert len(res.settlement_transfers) == 2
    for t in res.settlement_transfers:
        assert t.to_member == "Alex"
        assert t.amount == 20000.0


# 5. Test Wizard Review Agent
def test_wizard_review_agent_detects_date_and_capacity_issues():
    # Invalid: End date before start date + 6 members on a Bike
    review_input = WizardReviewInput(
        name="Buggy Trip",
        destination="Kandy",
        starting_point="Colombo",
        start_date="2026-11-10",
        end_date="2026-11-05",  # Invalid
        travel_method="RENTAL_VEHICLE",
        vehicle_type="Bike",    # Incompatible with 6 members
        trip_mode="GROUP",
        group_members=["M1", "M2", "M3", "M4", "M5", "M6"],
        total_budget=5000.0,
        currency="LKR",
        traveller_name="Kasun",
    )
    res = review_trip_wizard(review_input)
    assert res.status == "NEEDS_CORRECTION"
    assert res.is_approved_for_admin is False
    assert len(res.detected_issues) >= 2
    # Check user notification draft
    assert "Dear Kasun" in res.user_notification_draft
    assert "End date" in res.user_notification_draft


def test_wizard_review_agent_valid_trip():
    valid_input = WizardReviewInput(
        name="Kandy Cultural Tour",
        destination="Kandy",
        starting_point="Colombo Fort",
        start_date="2026-11-01",
        end_date="2026-11-04",
        travel_method="RENTAL_VEHICLE",
        vehicle_type="Van",
        trip_mode="GROUP",
        group_members=["Alex", "Kasun", "Nimal", "Sunil"],
        total_budget=150000.0,
        currency="LKR",
        traveller_name="Alex",
    )
    res = review_trip_wizard(valid_input)
    assert res.status == "VALID"
    assert res.is_approved_for_admin is True
    assert "Approve" in res.admin_recommendation


# 6. Test Sequential Pipeline & Early Halt on High Risk
def test_sequential_review_normal_runs_all_four_agents():
    inp = SequentialReviewInput(
        destination="Kandy",
        starting_location="Colombo Fort",
        start_date="2026-11-01",
        end_date="2026-11-03",
        travel_method="RENTAL_VEHICLE",
        vehicle_type="Car",
        user_budget=75000.0,
        currency="LKR",
        group_members=["Traveller 1", "Traveller 2"],
        force_risk_level="LOW",
    )
    res = run_sequential_review(inp)
    assert res.halted_due_to_risk is False
    assert res.halt_reason is None
    assert res.trip_planner is not None
    assert res.risk_calculator is not None
    assert res.budget is not None
    assert res.split_bill is not None
    assert len(res.split_bill.individual_shares) == 2
    assert len(res.pipeline_steps) == 4
    assert res.pipeline_steps[0]["status"] == "COMPLETED"
    assert res.pipeline_steps[1]["status"] == "COMPLETED"
    assert res.pipeline_steps[2]["status"] == "COMPLETED"
    assert res.pipeline_steps[3]["status"] == "COMPLETED"


def test_sequential_review_halts_on_high_risk_and_skips_downstream():
    inp = SequentialReviewInput(
        destination="Ella",
        starting_location="Colombo Fort",
        start_date="2026-11-01",
        end_date="2026-11-03",
        travel_method="RENTAL_VEHICLE",
        vehicle_type="Car",
        user_budget=50000.0,
        currency="LKR",
        group_members=["Traveller 1", "Traveller 2"],
        force_risk_level="HIGH",
    )
    res = run_sequential_review(inp)
    # Must halt immediately
    assert res.halted_due_to_risk is True
    assert res.halt_reason is not None
    assert "CRITICAL" in res.halt_reason or "hazard" in res.halt_reason.lower()
    # Trip planner and risk calculator ran:
    assert res.trip_planner is not None
    assert res.risk_calculator is not None
    # Downstream budget & split bill must be None:
    assert res.budget is None
    assert res.split_bill is None
    # Pipeline steps must indicate skipped:
    assert res.pipeline_steps[1]["status"] == "HALT_TRIGGERED"
    assert res.pipeline_steps[2]["status"] == "SKIPPED_DUE_TO_HIGH_RISK"
    assert res.pipeline_steps[3]["status"] == "SKIPPED_DUE_TO_HIGH_RISK"

