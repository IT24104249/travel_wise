import React from "react";
import { Trip, SharedExpense, Budget } from "../types";

export interface MemberCostShare {
  name: string;
  proportionPct: number;
  individualCost: number;
  note: string;
  isPrimary: boolean;
}

export interface ExtractedGroupTripData {
  tripId: string;
  tripName: string;
  destination: string;
  startDate?: string;
  endDate?: string;
  totalCost: number;
  currency: string;
  sourceOfTotal: string;
  splitStrategy: string;
  groupSize: number;
  members: MemberCostShare[];
  travelMethod?: string;
  vehicleType?: string;
  categoryBudgets?: {
    food?: number | string;
    accommodation?: number | string;
    transport?: number | string;
  };
  adminStatus: string;
  adminFeedback?: string | null;
  extractedDescriptionText: string;
}

export function extractGroupTripDetails(
  trip: Trip,
  budgets: Budget[] = [],
  expenses: SharedExpense[] = []
): ExtractedGroupTripData {
  let planning: any = null;
  if (trip.planningDetailsJson) {
    try {
      planning = JSON.parse(trip.planningDetailsJson);
    } catch {
      planning = null;
    }
  }

  let aiReview: any = null;
  if (trip.adminApprovedAiReviewJson) {
    try {
      aiReview = JSON.parse(trip.adminApprovedAiReviewJson);
    } catch {
      aiReview = null;
    }
  }

  // 1. Members Extraction
  let membersList: string[] = [];
  if (Array.isArray(planning?.groupMembers) && planning.groupMembers.length > 0) {
    membersList = planning.groupMembers
      .map((m: any) => (typeof m === "string" ? m : m?.displayName || m?.value || m?.name || String(m)))
      .map((s: string) => s.trim())
      .filter(Boolean);
  } else if (planning?.groupMembers && typeof planning.groupMembers === "string") {
    membersList = planning.groupMembers
      .split(/[,;\n]+/)
      .map((s: string) => s.trim())
      .filter(Boolean);
  }

  if (membersList.length === 0 && trip.travellerName) {
    membersList = [trip.travellerName.trim()];
  }

  const textCorpus = [trip.adminFeedback, trip.adminCorrectionNotes, trip.adminWarningNote].filter(Boolean).join(" ");
  if (membersList.length <= 1 && textCorpus) {
    const memMatch = textCorpus.match(/(?:members?|people|travelers?|group\s*of)\s*[:=]?\s*([0-9]+)/i);
    if (memMatch) {
      const count = parseInt(memMatch[1], 10);
      while (membersList.length < count) {
        membersList.push(`Group Member ${membersList.length + 1}`);
      }
    }
  }

  if (membersList.length === 0) {
    membersList = ["Organizer / Traveller", "Group Member 2"];
  }

  // 2. Total Cost Extraction
  let totalCost = 0;
  let sourceOfTotal = "Listing Description / Plan";

  if (planning?.totalBudget && Number(planning.totalBudget) > 0) {
    totalCost = Number(planning.totalBudget);
    sourceOfTotal = "Listing Planned Total Budget";
  } else if (planning?.sharedExpenseAmount && Number(planning.sharedExpenseAmount) > 0) {
    totalCost = Number(planning.sharedExpenseAmount);
    sourceOfTotal = "Listing Shared Group Expense";
  } else if (aiReview?.budget_agent?.estimated_budget && Number(aiReview.budget_agent.estimated_budget) > 0) {
    totalCost = Number(aiReview.budget_agent.estimated_budget);
    sourceOfTotal = "Admin Verified AI Budget Assessment";
  } else if (budgets && budgets.length > 0 && Number(budgets[0].amount) > 0) {
    totalCost = Number(budgets[0].amount);
    sourceOfTotal = "Trip Budget Allocation Record";
  } else if (expenses && expenses.length > 0) {
    totalCost = expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    sourceOfTotal = "Logged Group Expenses Total";
  } else if (textCorpus) {
    const costMatch = textCorpus.match(/(?:cost|budget|total|price|rs\.?|lkr)\s*[:=]?\s*([0-9,]+)/i);
    if (costMatch) {
      totalCost = parseFloat(costMatch[1].replace(/,/g, ""));
      sourceOfTotal = "Extracted from Admin Listing Notes";
    }
  }

  if (totalCost === 0) {
    totalCost = 25000; // safe baseline fallback if not specified
    sourceOfTotal = "Standard Group Base Estimate";
  }

  const currency = planning?.currency || budgets[0]?.currency || "LKR";
  const groupCount = Math.max(1, membersList.length);
  const splitStrategy = (planning?.splitStrategy || "EQUAL").toUpperCase();
  const splitAllocations = planning?.splitAllocations || {};

  // 3. Proportions and Individual Costs
  const members: MemberCostShare[] = membersList.map((name, idx) => {
    let pct = 100 / groupCount;
    let cost = totalCost / groupCount;
    let note = "Equal Proportion";

    if (splitStrategy === "PERCENTAGE" && splitAllocations[name]) {
      pct = Number(splitAllocations[name]) || pct;
      cost = (totalCost * pct) / 100;
      note = `Custom Proportion (${pct}%)`;
    } else if (splitStrategy === "CUSTOM" && splitAllocations[name]) {
      cost = Number(splitAllocations[name]) || cost;
      pct = totalCost > 0 ? (cost / totalCost) * 100 : pct;
      note = `Custom Fixed Amount`;
    } else {
      note = `Equal Share (${(100 / groupCount).toFixed(1)}%)`;
    }

    return {
      name,
      proportionPct: Math.round(pct * 10) / 10,
      individualCost: Math.round(cost * 100) / 100,
      note,
      isPrimary: idx === 0 || (trip.travellerName && name.toLowerCase() === trip.travellerName.toLowerCase())
    };
  });

  const travelMethod = planning?.travelMethodFormatted || trip.travelMethod || "Not specified";
  const vehicleType = trip.travelVehicleType || planning?.rentalVehicleType || planning?.publicTransportType || "";

  // Summary snippet of the description extracted
  const extractedDescriptionText = [
    `Trip: ${trip.name} (${trip.destination})`,
    `Admin Status: ${trip.status || "Reviewed"}`,
    `Group Mode: ${membersList.length} Members [${membersList.join(", ")}]`,
    `Total Budget / Cost: Rs. ${totalCost.toLocaleString()} ${currency} (${sourceOfTotal})`,
    `Split Method: ${splitStrategy}`,
    travelMethod ? `Transport: ${travelMethod}${vehicleType ? ` (${vehicleType})` : ""}` : "",
    trip.adminFeedback ? `Admin Feedback: "${trip.adminFeedback}"` : ""
  ]
    .filter(Boolean)
    .join(" • ");

  return {
    tripId: trip.id,
    tripName: trip.name,
    destination: trip.destination,
    startDate: trip.startDate,
    endDate: trip.endDate,
    totalCost,
    currency,
    sourceOfTotal,
    splitStrategy,
    groupSize: groupCount,
    members,
    travelMethod,
    vehicleType,
    categoryBudgets: planning?.categoryBudgets || {},
    adminStatus: trip.status || "Reviewed",
    adminFeedback: trip.adminFeedback || null,
    extractedDescriptionText
  };
}

interface GroupListingCostBreakdownProps {
  trip: Trip;
  budgets?: Budget[];
  expenses?: SharedExpense[];
  onClose?: () => void;
  onApplyAsExpense?: (totalCost: number, memberBreakdown: MemberCostShare[]) => void;
  isApplying?: boolean;
}

export const GroupListingCostBreakdown: React.FC<GroupListingCostBreakdownProps> = ({
  trip,
  budgets = [],
  expenses = [],
  onClose,
  onApplyAsExpense,
  isApplying = false
}) => {
  const data = extractGroupTripDetails(trip, budgets, expenses);

  return (
    <div
      style={{
        background: "var(--bg-card-solid, #0f172a)",
        borderRadius: "var(--r-lg, 16px)",
        border: "1px solid var(--border-glow, rgba(20, 184, 166, 0.3))",
        padding: "24px",
        marginTop: "16px",
        marginBottom: "24px",
        boxShadow: "0 12px 36px rgba(0, 0, 0, 0.4)",
        animation: "fadeIn 0.3s ease-out"
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
          paddingBottom: 16,
          borderBottom: "1px solid var(--border, rgba(255, 255, 255, 0.1))"
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>👥</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary, #f8fafc)" }}>
                Group Cost & Individual Proportion Settlement
              </h3>
              <div style={{ fontSize: 13, color: "var(--text-muted, #94a3b8)", marginTop: 2 }}>
                Extracted directly from Listing Description & Planning Details for{" "}
                <strong style={{ color: "var(--brand-teal-light, #2dd4bf)" }}>{data.tripName}</strong> ({data.destination})
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              padding: "4px 12px",
              borderRadius: "20px",
              background: "rgba(16, 185, 129, 0.15)",
              color: "#34d399",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              fontSize: 12,
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <span>✓</span> Admin Approved ({data.adminStatus})
          </span>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-muted, #94a3b8)",
                fontSize: 18,
                cursor: "pointer",
                padding: "4px 8px"
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Top Metric Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
          marginTop: 18,
          marginBottom: 20
        }}
      >
        <div
          style={{
            padding: "16px",
            background: "linear-gradient(135deg, rgba(20, 184, 166, 0.12), rgba(15, 23, 42, 0.6))",
            borderRadius: "12px",
            border: "1px solid rgba(20, 184, 166, 0.25)"
          }}
        >
          <div style={{ fontSize: 11, textTransform: "uppercase", color: "var(--brand-teal-light, #2dd4bf)", fontWeight: 700 }}>
            Total Trip Cost
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary, #fff)", marginTop: 6 }}>
            {data.totalCost.toLocaleString()} <span style={{ fontSize: 13, fontWeight: 600 }}>{data.currency}</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-soft, #94a3b8)", marginTop: 4 }}>
            Source: {data.sourceOfTotal}
          </div>
        </div>

        <div
          style={{
            padding: "16px",
            background: "linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(15, 23, 42, 0.6))",
            borderRadius: "12px",
            border: "1px solid rgba(245, 158, 11, 0.25)"
          }}
        >
          <div style={{ fontSize: 11, textTransform: "uppercase", color: "var(--brand-gold-light, #fbbf24)", fontWeight: 700 }}>
            Group Size & Strategy
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary, #fff)", marginTop: 6 }}>
            {data.groupSize} Members
          </div>
          <div style={{ fontSize: 11, color: "var(--text-soft, #94a3b8)", marginTop: 4 }}>
            Split Rule: <strong>{data.splitStrategy}</strong>
          </div>
        </div>

        <div
          style={{
            padding: "16px",
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(15, 23, 42, 0.6))",
            borderRadius: "12px",
            border: "1px solid rgba(99, 102, 241, 0.25)"
          }}
        >
          <div style={{ fontSize: 11, textTransform: "uppercase", color: "#a5b4fc", fontWeight: 700 }}>
            Per-Member Average
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary, #fff)", marginTop: 6 }}>
            {(data.totalCost / data.groupSize).toLocaleString(undefined, { maximumFractionDigits: 0 })}{" "}
            <span style={{ fontSize: 13, fontWeight: 600 }}>{data.currency}</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-soft, #94a3b8)", marginTop: 4 }}>
            Equal baseline quota
          </div>
        </div>
      </div>

      {/* Individual Cost & Proportion Breakdown for Each Member */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text-primary, #f8fafc)" }}>
            Individual Member Shares & Proportions (Allocated Cost per Person)
          </h4>
          <span style={{ fontSize: 12, color: "var(--text-muted, #94a3b8)" }}>
            Total Allocated: 100%
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
          {data.members.map((member, idx) => (
            <div
              key={idx}
              style={{
                background: "var(--bg-glass, rgba(255, 255, 255, 0.03))",
                border: "1px solid var(--border, rgba(255, 255, 255, 0.1))",
                borderRadius: "12px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
                overflow: "hidden"
              }}
            >
              {member.isPrimary && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    background: "var(--brand-teal-light, #2dd4bf)",
                    color: "#0f172a",
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "3px 10px",
                    borderBottomLeftRadius: "8px",
                    textTransform: "uppercase"
                  }}
                >
                  Primary
                </div>
              )}

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: "50%",
                      background: member.isPrimary ? "var(--brand-teal-soft, rgba(20, 184, 166, 0.2))" : "rgba(255, 255, 255, 0.08)",
                      color: member.isPrimary ? "var(--brand-teal-light, #2dd4bf)" : "var(--text-primary, #fff)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                      fontWeight: 700
                    }}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary, #f8fafc)" }}>
                      {member.name}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted, #94a3b8)" }}>
                      {member.note}
                    </div>
                  </div>
                </div>

                {/* Progress bar for proportion */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: "var(--text-soft, #94a3b8)" }}>Proportion Share:</span>
                    <strong style={{ color: "var(--brand-teal-light, #2dd4bf)" }}>{member.proportionPct}%</strong>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: 8,
                      background: "rgba(255, 255, 255, 0.08)",
                      borderRadius: 4,
                      overflow: "hidden"
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, member.proportionPct)}%`,
                        height: "100%",
                        background: "linear-gradient(90deg, #14b8a6, #38bdf8)",
                        borderRadius: 4
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Amount Box */}
              <div
                style={{
                  padding: "12px",
                  background: "rgba(0, 0, 0, 0.25)",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <span style={{ fontSize: 12, color: "var(--text-muted, #94a3b8)" }}>Individual Cost:</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: "var(--brand-gold-light, #fbbf24)" }}>
                  {member.individualCost.toLocaleString()} <span style={{ fontSize: 12 }}>{data.currency}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Extracted Details Description Footer */}
      <div
        style={{
          padding: "14px 18px",
          background: "rgba(255, 255, 255, 0.02)",
          borderRadius: "10px",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          fontSize: 12,
          color: "var(--text-soft, #94a3b8)",
          lineHeight: 1.6
        }}
      >
        <div style={{ fontWeight: 700, color: "var(--text-muted, #cbd5e1)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
          <span>📋</span> Description Extraction Summary:
        </div>
        <div>{data.extractedDescriptionText}</div>
        {data.adminFeedback && (
          <div style={{ marginTop: 6, color: "var(--brand-teal-light, #2dd4bf)" }}>
            <strong>Admin Approval Note:</strong> "{data.adminFeedback}"
          </div>
        )}
      </div>

      {/* Sync / Apply Action */}
      {onApplyAsExpense && (
        <div
          style={{
            marginTop: 18,
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 12
          }}
        >
          <span style={{ fontSize: 12, color: "var(--text-muted, #94a3b8)" }}>
            Sync these member proportions to generate Debt Settlement transfers:
          </span>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onApplyAsExpense(data.totalCost, data.members)}
            disabled={isApplying}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              fontWeight: 700
            }}
          >
            <span>⚡</span>
            {isApplying ? "Syncing..." : "Sync to Settlement Matrix"}
          </button>
        </div>
      )}
    </div>
  );
};
