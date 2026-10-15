from app.agents.wizard_suggestion_agent import (
    WizardSuggestionInput,
    analyze_wizard_and_suggest,
)


def test_wizard_suggestion_agent_missing_budget():
    inp = WizardSuggestionInput(
        name="Kandy Explorer",
        destination="Kandy",
        starting_point="Colombo",
        start_date="2026-11-01",
        end_date="2026-11-04",
        total_budget=0.0,  # Missing budget
        travel_method="RENTAL_VEHICLE",
        vehicle_type="Car",
    )
    result = analyze_wizard_and_suggest(inp)
    assert result.is_ready_for_admin_submission is False
    assert result.status_badge == "CRITICAL_MISSING_DATA"
    assert any(m.field == "totalBudget" and m.step == 2 for m in result.missing_fields)
    assert len(result.suggested_listings.accommodations) > 0


def test_wizard_suggestion_agent_complete_plan():
    inp = WizardSuggestionInput(
        name="Ella Holiday",
        destination="Ella",
        starting_point="Colombo",
        start_date="2026-11-10",
        end_date="2026-11-13",
        total_budget=80000.0,
        currency="LKR",
        travel_method="PRIVATE_VEHICLE",
        vehicle_type="Car",
        trip_mode="SOLO",
    )
    result = analyze_wizard_and_suggest(inp)
    assert result.is_ready_for_admin_submission is True
    assert result.readiness_score >= 90
    assert result.status_badge == "READY_FOR_SUBMISSION"
    assert len(result.suggested_listings.rental_vehicles) > 0


def test_wizard_suggestion_agent_bike_overload_3_passengers():
    """User test case: Bike selected with 3 group members without driver -> MUST flag error."""
    inp = WizardSuggestionInput(
        name="Bandarawela Trip",
        destination="Bandarawela",
        starting_point="Colombo",
        start_date="2026-11-10",
        end_date="2026-11-12",
        total_budget=50000.0,
        currency="LKR",
        travel_method="RENTAL_VEHICLE",
        vehicle_type="Bike",
        with_driver=False,
        trip_mode="GROUP",
        group_members=["Friend 1", "Friend 2", "Friend 3"],
    )
    result = analyze_wizard_and_suggest(inp)
    assert result.is_ready_for_admin_submission is False
    assert any(m.field == "vehicleCapacity" and "Motorbike" in m.title and m.severity == "ERROR" for m in result.missing_fields)


def test_wizard_suggestion_agent_bike_with_driver_2_passengers():
    """Bike hired with driver can only take 1 passenger."""
    inp = WizardSuggestionInput(
        name="Galle Trip",
        destination="Galle",
        starting_point="Colombo",
        start_date="2026-11-10",
        end_date="2026-11-12",
        total_budget=40000.0,
        currency="LKR",
        travel_method="RENTAL_VEHICLE",
        vehicle_type="Bike",
        with_driver=True,
        trip_mode="GROUP",
        group_members=["Passenger 1", "Passenger 2"],
    )
    result = analyze_wizard_and_suggest(inp)
    assert result.is_ready_for_admin_submission is False
    assert any(m.field == "vehicleCapacity" and m.severity == "ERROR" for m in result.missing_fields)


def test_wizard_suggestion_agent_car_overload_6_passengers():
    """Car with 6 passengers exceeds standard capacity."""
    inp = WizardSuggestionInput(
        name="Kandy Family",
        destination="Kandy",
        starting_point="Colombo",
        start_date="2026-11-10",
        end_date="2026-11-12",
        total_budget=80000.0,
        currency="LKR",
        travel_method="RENTAL_VEHICLE",
        vehicle_type="Car",
        with_driver=False,
        trip_mode="GROUP",
        group_members=["A", "B", "C", "D", "E", "F"],
    )
    result = analyze_wizard_and_suggest(inp)
    assert result.is_ready_for_admin_submission is False
    assert any(m.field == "vehicleCapacity" and "Car" in m.title for m in result.missing_fields)
