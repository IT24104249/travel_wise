from uuid import uuid4

from app.main import TOOLS, WorkflowRequest, WorkflowState, orchestrate


def test_minimum_workflow_has_five_distinct_agents_and_requires_approval() -> None:
    result = orchestrate(WorkflowRequest(workflow_id=uuid4(), objective="Prepare a safe group trip plan for Ella"))
    assert result.state == WorkflowState.AWAITING_APPROVAL
    assert result.approval_required is True
    assert len(result.agents) == 5
    agent_names = {agent.agent for agent in result.agents}
    expected_agents = {
        "Trip Planner Agent",
        "Budget Agent",
        "Risk Calculate Agent",
        "Split-Bill Agent",
        "Wizard Review Agent"
    }
    assert agent_names == expected_agents
    assert result.validation["schema_valid"] is True


def test_all_twelve_controlled_tools_registered() -> None:
    expected_tools = {
        "GetTripBudget",
        "GetExpenses",
        "CalculateHealth",
        "SearchActivities",
        "GetDetails",
        "CheckConflict",
        "GetWeather",
        "GetDestinationRisk",
        "CalculateBalances",
        "ConvertCurrency",
        "GenerateSettlementPlan",
        "SearchCatalog",
    }
    for tool_name in expected_tools:
        assert tool_name in TOOLS, f"Missing tool: {tool_name}"
        output = TOOLS[tool_name]({"destination": "Ella"})
        assert isinstance(output, dict), f"Tool {tool_name} must return dict"


def test_budget_agent_tools_and_health_calculation() -> None:
    ctx = {"destination": "Ella"}
    budget = TOOLS["GetTripBudget"](ctx)
    assert budget["total_budget"] > 0
    health = TOOLS["CalculateHealth"](ctx)
    assert health["status"] in {"HEALTHY", "WARNING", "CRITICAL"}
    assert health["utilization_ratio"] >= 0


def test_split_bill_agent_conserves_balance_sum() -> None:
    ctx = {"destination": "Ella"}
    balances_res = TOOLS["CalculateBalances"](ctx)
    balances = balances_res["balances"]
    net_sum = sum(b["net"] for b in balances)
    assert abs(net_sum) < 0.001, "Sum of net balances must be zero"
    settlement = TOOLS["GenerateSettlementPlan"](ctx)
    assert len(settlement["transfers"]) > 0
    assert settlement["requires_human_approval"] is True


def test_short_objective_is_rejected() -> None:
    try:
        WorkflowRequest(workflow_id=uuid4(), objective="short")
    except ValueError:
        return
    raise AssertionError("Expected Pydantic validation error")
