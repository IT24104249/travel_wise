from __future__ import annotations
import math
from typing import Any
from pydantic import BaseModel, Field
from app.services.currency_service import convert_amount


class SplitBillAgentInput(BaseModel):
    total_cost: float = Field(..., gt=0, description="Total cost from Budget Agent or shared expenses")
    currency: str = Field(default="LKR")
    group_members: list[str] = Field(default_factory=list, description="Names of group members")
    split_strategy: str = Field(default="EQUAL", description="EQUAL, PERCENTAGE, CUSTOM")
    split_allocations: dict[str, float] = Field(default_factory=dict, description="Percentage or custom amounts per member")
    target_currency: str | None = Field(default=None, description="Optional target currency for conversion (e.g. USD, EUR, GBP)")
    paid_by: str | None = Field(default=None, description="Member who originally paid or fronted the expense")


class MemberShare(BaseModel):
    member_name: str
    amount: float
    percentage: float
    currency: str
    converted_amount: float | None = None
    converted_currency: str | None = None


class DebtSettlementTransfer(BaseModel):
    from_member: str
    to_member: str
    amount: float
    currency: str


class SplitBillAgentResult(BaseModel):
    total_cost: float
    currency: str
    split_strategy: str
    member_count: int
    individual_shares: list[MemberShare]
    settlement_transfers: list[DebtSettlementTransfer]
    requires_human_approval: bool = True
    conversion_info: dict[str, Any] | None = None
    tools_used: list[str] = ["Group-Expense-Splitter", "Minimum-Cash-Flow-Settlement-Engine", "Forex-Currency-Converter"]


def split_group_bill(input_data: SplitBillAgentInput) -> SplitBillAgentResult:
    """Split-Bill Agent logic: computes individual member shares, currency conversion, and debt settlements."""
    members = [m.strip() for m in input_data.group_members if m.strip()]
    if not members:
        members = ["Primary Traveller"]

    total = input_data.total_cost
    count = len(members)
    strategy = input_data.split_strategy.upper()

    shares: list[MemberShare] = []
    # Calculate each member's share
    if strategy == "PERCENTAGE":
        for m in members:
            pct = input_data.split_allocations.get(m, 100.0 / count)
            amt = round((total * pct) / 100.0, 2)
            shares.append(MemberShare(member_name=m, amount=amt, percentage=round(pct, 2), currency=input_data.currency))
    elif strategy == "CUSTOM":
        total_custom = sum(input_data.split_allocations.get(m, 0) for m in members)
        for m in members:
            amt = round(input_data.split_allocations.get(m, total / count), 2)
            pct = round((amt / total) * 100.0, 2) if total > 0 else 0.0
            shares.append(MemberShare(member_name=m, amount=amt, percentage=pct, currency=input_data.currency))
    else:
        # Default: EQUAL split
        equal_amt = round(total / count, 2)
        pct = round(100.0 / count, 2)
        for m in members:
            shares.append(MemberShare(member_name=m, amount=equal_amt, percentage=pct, currency=input_data.currency))

    # Optional Currency Conversion
    conv_info: dict[str, Any] | None = None
    target_c = input_data.target_currency.upper().strip() if input_data.target_currency else None
    if target_c and target_c != input_data.currency.upper():
        conv_info = convert_amount(total, input_data.currency, target_c)
        for s in shares:
            conv = convert_amount(s.amount, input_data.currency, target_c)
            s.converted_amount = conv["converted_amount"]
            s.converted_currency = target_c

    # Calculate optimal settlement transfers
    payer = input_data.paid_by.strip() if input_data.paid_by and input_data.paid_by in members else members[0]
    transfers: list[DebtSettlementTransfer] = []

    # If payer fronted total cost, everyone else owes their share to payer
    for s in shares:
        if s.member_name != payer and s.amount > 0:
            transfers.append(DebtSettlementTransfer(
                from_member=s.member_name,
                to_member=payer,
                amount=s.amount,
                currency=input_data.currency
            ))

    return SplitBillAgentResult(
        total_cost=total,
        currency=input_data.currency,
        split_strategy=strategy,
        member_count=count,
        individual_shares=shares,
        settlement_transfers=transfers,
        requires_human_approval=True,
        conversion_info=conv_info,
    )
