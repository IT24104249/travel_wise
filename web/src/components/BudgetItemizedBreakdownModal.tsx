import React from "react";
import {
  WalletIcon,
  CarIcon,
  ShieldCheckIcon,
  HotelIcon,
  UtensilsIcon,
  LandmarkIcon,
  CompassIcon,
  CheckCircleIcon
} from "./Icons";

export interface BudgetItemizedBreakdownModalProps {
  budget: any;
  destinationName?: string;
  tripDays?: number;
  groupSize?: number;
  onClose: () => void;
}

export const BudgetItemizedBreakdownModal: React.FC<BudgetItemizedBreakdownModalProps> = ({
  budget,
  destinationName,
  tripDays,
  groupSize,
  onClose,
}) => {
  if (!budget) return null;

  const currency = budget.currency || "LKR";
  const vehicle = budget.vehicle_details || {};
  const hasVehicleDetails = Boolean(vehicle.selected_vehicle_name || vehicle.pricing_explanation);

  // Use detailed line items if present, or construct from itemized breakdown / totals
  const lineItems: any[] = (budget.detailed_line_items && budget.detailed_line_items.length > 0)
    ? budget.detailed_line_items
    : (budget.itemized_breakdown || []).map((b: any) => ({
        category: b.category,
        item_name: b.category,
        unit_rate: b.amount,
        unit_label: "subtotal",
        quantity: 1,
        quantity_label: "1 item",
        subtotal: b.amount,
        details: b.description,
        source_type: b.source_type || "Benchmark"
      }));

  const getCategoryIcon = (cat: string) => {
    const c = (cat || "").toLowerCase();
    if (c.includes("trans") || c.includes("vehic") || c.includes("fuel")) return <CarIcon size={16} color="#38bdf8" />;
    if (c.includes("lodg") || c.includes("stay") || c.includes("hotel") || c.includes("accom")) return <HotelIcon size={16} color="#fb923c" />;
    if (c.includes("food") || c.includes("rest") || c.includes("din")) return <UtensilsIcon size={16} color="#f472b6" />;
    if (c.includes("tick") || c.includes("monu") || c.includes("plac")) return <LandmarkIcon size={16} color="#a78bfa" />;
    if (c.includes("guide") || c.includes("activ") || c.includes("buffer")) return <CompassIcon size={16} color="#34d399" />;
    if (c.includes("contin") || c.includes("margin") || c.includes("safe")) return <ShieldCheckIcon size={16} color="#fde047" />;
    return <WalletIcon size={16} color="#4ade80" />;
  };

  const getCategoryBadgeStyle = (cat: string) => {
    const c = (cat || "").toLowerCase();
    if (c.includes("trans")) return { bg: "rgba(56, 189, 248, 0.15)", text: "#38bdf8", border: "rgba(56, 189, 248, 0.3)" };
    if (c.includes("lodg") || c.includes("stay") || c.includes("hotel") || c.includes("accom")) return { bg: "rgba(251, 146, 60, 0.15)", text: "#fb923c", border: "rgba(251, 146, 60, 0.3)" };
    if (c.includes("food") || c.includes("rest")) return { bg: "rgba(244, 114, 182, 0.15)", text: "#f472b6", border: "rgba(244, 114, 182, 0.3)" };
    if (c.includes("tick")) return { bg: "rgba(167, 139, 250, 0.15)", text: "#a78bfa", border: "rgba(167, 139, 250, 0.3)" };
    if (c.includes("guide") || c.includes("activ")) return { bg: "rgba(52, 211, 153, 0.15)", text: "#34d399", border: "rgba(52, 211, 153, 0.3)" };
    if (c.includes("contin") || c.includes("margin")) return { bg: "rgba(250, 204, 21, 0.15)", text: "#fde047", border: "rgba(250, 204, 21, 0.3)" };
    return { bg: "rgba(74, 222, 128, 0.15)", text: "#4ade80", border: "rgba(74, 222, 128, 0.3)" };
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 11000,
        padding: "1.25rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "linear-gradient(180deg, #090e1f 0%, #0f172a 100%)",
          borderRadius: "24px",
          border: "1px solid rgba(74, 222, 128, 0.35)",
          maxWidth: "1050px",
          width: "100%",
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 25px 80px rgba(0, 0, 0, 0.85), 0 0 40px rgba(34, 197, 94, 0.2)",
          position: "relative",
          color: "#f8fafc",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.5rem 2rem",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(34, 197, 94, 0.08)",
            borderTopLeftRadius: "24px",
            borderTopRightRadius: "24px",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <span
                style={{
                  background: "rgba(34, 197, 94, 0.2)",
                  color: "#4ade80",
                  padding: "3px 10px",
                  borderRadius: "20px",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  border: "1px solid rgba(34, 197, 94, 0.4)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                }}
              >
                <WalletIcon size={14} color="#4ade80" /> Granular Cost Ledger
              </span>
              {destinationName && (
                <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                  Destination: <strong style={{ color: "#38bdf8" }}>{destinationName}</strong>
                </span>
              )}
            </div>
            <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800, color: "#ffffff" }}>
              Detailed Itemized Cost Breakdown & Vehicle Fare Calculation
            </h2>
            <div style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: "4px" }}>
              Every single direct fare, booking tariff, meal rate, and safety buffer itemized in transparent detail.
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "rgba(15, 23, 42, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "#ffffff",
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "1.1rem",
              transition: "all 0.2s",
            }}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "1.75rem 2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Vehicle & Transport Transparency Section */}
          <div
            style={{
              borderRadius: "18px",
              background: "rgba(15, 23, 42, 0.75)",
              border: "1px solid rgba(56, 189, 248, 0.35)",
              padding: "1.25rem 1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.85rem",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span style={{ background: "rgba(56, 189, 248, 0.2)", padding: "8px", borderRadius: "10px", display: "flex" }}>
                  <CarIcon size={20} color="#38bdf8" />
                </span>
                <div>
                  <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#38bdf8", fontWeight: 800 }}>
                    Selected Vehicle & Route Transit Analysis
                  </div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#ffffff" }}>
                    {vehicle.selected_vehicle_name || (budget.transport_cost === 0 ? "Personal / Own Vehicle" : "Transit Transport")}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span
                  style={{
                    background: vehicle.is_own_vehicle ? "rgba(34, 197, 94, 0.2)" : "rgba(56, 189, 248, 0.2)",
                    color: vehicle.is_own_vehicle ? "#34d399" : "#38bdf8",
                    padding: "4px 12px",
                    borderRadius: "20px",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  {vehicle.is_own_vehicle ? "🚗 Personal Vehicle (0 LKR Transit Tariff)" : vehicle.is_public_transport ? "🚆 Regulated Public Transit Tariff" : "🚐 Rental Vehicle Fleet"}
                </span>

                <span
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    color: "#f8fafc",
                    padding: "4px 12px",
                    borderRadius: "20px",
                    fontSize: "0.8rem",
                    fontWeight: 800,
                  }}
                >
                  Transport Cost: {budget.transport_cost === 0 ? "0.00 LKR" : `${budget.transport_cost?.toLocaleString()} ${currency}`}
                </span>
              </div>
            </div>

            {/* Fare Explanation Note */}
            <div
              style={{
                background: "rgba(0, 0, 0, 0.35)",
                borderRadius: "12px",
                padding: "0.85rem 1rem",
                border: "1px dashed rgba(56, 189, 248, 0.3)",
                fontSize: "0.9rem",
                lineHeight: 1.55,
                color: "#e2e8f0",
              }}
            >
              <strong style={{ color: "#38bdf8" }}>Vehicle Fare Rationale & Cost Structure: </strong>
              {vehicle.pricing_explanation || (
                budget.transport_cost === 0
                  ? "Personal / own vehicle selected. Zero transit tariffs applied as commercial rentals or public fares are not charged."
                  : `Calculated transport based on ${budget.data_sources?.transport || "standard tariff benchmarks"}.`
              )}
            </div>
          </div>

          {/* Granular Line Items Table */}
          <div
            style={{
              borderRadius: "18px",
              background: "rgba(15, 23, 42, 0.75)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              padding: "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#ffffff", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span>📋 Micro-Cost Itemized Ledger</span>
                <span style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: 500 }}>({lineItems.length} line items)</span>
              </h3>
              <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                Figures in <strong style={{ color: "#4ade80" }}>{currency}</strong>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 8px", fontSize: "0.88rem" }}>
                <thead>
                  <tr style={{ color: "#94a3b8", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    <th style={{ textAlign: "left", padding: "8px 12px" }}>Category & Item</th>
                    <th style={{ textAlign: "right", padding: "8px 12px" }}>Unit Rate</th>
                    <th style={{ textAlign: "center", padding: "8px 12px" }}>Qty / Duration</th>
                    <th style={{ textAlign: "right", padding: "8px 12px" }}>Subtotal</th>
                    <th style={{ textAlign: "left", padding: "8px 12px" }}>Tariff Source & Explanation</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item: any, idx: number) => {
                    const badge = getCategoryBadgeStyle(item.category);
                    return (
                      <tr
                        key={idx}
                        style={{
                          background: "rgba(255, 255, 255, 0.025)",
                          borderRadius: "10px",
                          transition: "all 0.2s",
                        }}
                      >
                        {/* Category & Item */}
                        <td style={{ padding: "12px", borderTopLeftRadius: "10px", borderBottomLeftRadius: "10px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "4px" }}>
                            <span
                              style={{
                                background: badge.bg,
                                color: badge.text,
                                border: `1px solid ${badge.border}`,
                                padding: "2px 8px",
                                borderRadius: "6px",
                                fontSize: "0.7rem",
                                fontWeight: 800,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.25rem",
                              }}
                            >
                              {getCategoryIcon(item.category)} {item.category}
                            </span>
                          </div>
                          <div style={{ fontWeight: 700, color: "#ffffff", fontSize: "0.92rem" }}>
                            {item.item_name}
                          </div>
                        </td>

                        {/* Unit Rate */}
                        <td style={{ padding: "12px", textAlign: "right", whiteSpace: "nowrap" }}>
                          {item.unit_rate === 0 ? (
                            <span style={{ color: "#34d399", fontWeight: 700 }}>0.00 LKR</span>
                          ) : (
                            <div>
                              <strong style={{ color: "#f8fafc" }}>{item.unit_rate?.toLocaleString()}</strong>
                              <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{item.unit_label || "unit"}</div>
                            </div>
                          )}
                        </td>

                        {/* Quantity */}
                        <td style={{ padding: "12px", textAlign: "center", whiteSpace: "nowrap" }}>
                          <span
                            style={{
                              background: "rgba(255,255,255,0.06)",
                              padding: "4px 8px",
                              borderRadius: "8px",
                              fontSize: "0.8rem",
                              color: "#cbd5e1",
                              fontWeight: 600,
                            }}
                          >
                            {item.quantity_label || `${item.quantity || 1}`}
                          </span>
                        </td>

                        {/* Subtotal */}
                        <td style={{ padding: "12px", textAlign: "right", whiteSpace: "nowrap" }}>
                          <span
                            style={{
                              fontWeight: 800,
                              fontSize: "1rem",
                              color: item.category?.toLowerCase().includes("margin") ? "#fde047" : "#4ade80",
                            }}
                          >
                            {item.subtotal === 0 ? "0.00" : item.subtotal?.toLocaleString()} {currency}
                          </span>
                        </td>

                        {/* Details & Source */}
                        <td style={{ padding: "12px", borderTopRightRadius: "10px", borderBottomRightRadius: "10px", maxWidth: "340px" }}>
                          <div style={{ color: "#cbd5e1", fontSize: "0.82rem", lineHeight: 1.45, marginBottom: "4px" }}>
                            {item.details}
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "#94a3b8", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                            <CheckCircleIcon size={12} color="#38bdf8" />
                            <span style={{ fontStyle: "italic" }}>{item.source_type}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Budget Grand Total Summary Bar */}
          <div
            style={{
              padding: "1.25rem 1.5rem",
              borderRadius: "16px",
              background: "linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(6, 78, 59, 0.35) 100%)",
              border: "1px solid rgba(34, 197, 94, 0.4)",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Base Subtotal (Direct Costs):</div>
              <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#f8fafc" }}>
                {budget.base_subtotal?.toLocaleString()} {currency}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "0.8rem", color: "#fbbf24" }}>Mandatory 10% Margin:</div>
              <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#fde047" }}>
                +{budget.contingency_margin_10_percent?.toLocaleString()} {currency}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "0.8rem", color: "#38bdf8" }}>Final Calculated Budget:</div>
              <div style={{ fontSize: "1.45rem", fontWeight: 900, color: "#4ade80" }}>
                {budget.final_calculated_budget?.toLocaleString()} {currency}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>Traveller's Proposed:</div>
              <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#ffffff" }}>
                {budget.user_budget?.toLocaleString()} {currency}
              </div>
              <div
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  marginTop: "2px",
                  color: budget.budget_difference >= 0 ? "#34d399" : "#f87171",
                }}
              >
                {budget.budget_difference >= 0
                  ? `+${budget.budget_difference?.toLocaleString()} LKR (Surplus)`
                  : `${budget.budget_difference?.toLocaleString()} LKR (Deficit)`}
              </div>
            </div>
          </div>

        </div>

        {/* Footer Close Button */}
        <div
          style={{
            padding: "1rem 2rem",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            justifyContent: "flex-end",
            background: "rgba(11, 19, 41, 0.4)",
            borderBottomLeftRadius: "24px",
            borderBottomRightRadius: "24px",
          }}
        >
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{
              padding: "8px 24px",
              borderRadius: "10px",
              fontWeight: 700,
              fontSize: "0.9rem",
            }}
          >
            Close Breakdown
          </button>
        </div>
      </div>
    </div>
  );
};
