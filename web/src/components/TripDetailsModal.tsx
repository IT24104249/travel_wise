import React from "react";
import { Trip } from "../types";
import { getDestinationImage } from "../utils/helpers";
import {
  MapPinIcon,
  CalendarIcon,
  PlaneIcon,
  CarIcon,
  UsersIcon,
  UtensilsIcon,
  HotelIcon,
  CompassIcon,
  ShieldCheckIcon,
  WalletIcon,
  EyeIcon,
  EditIcon,
  AlertCircleIcon,
  SparklesIcon,
  TrashIcon,
} from "./Icons";

interface TripDetailsModalProps {
  trip: Trip;
  onClose: () => void;
  onSelectActive: (trip: Trip) => void;
  isActiveTrip: boolean;
  onEditWizard: (trip: Trip) => void;
  onRunAiReview: (trip: Trip) => void;
  onDeleteTrip?: (trip: Trip) => void;
  onViewSuggestedListings?: (trip: Trip) => void;
  aiReviewLoading?: boolean;
}

export const TripDetailsModal: React.FC<TripDetailsModalProps> = ({
  trip,
  onClose,
  onSelectActive,
  isActiveTrip,
  onEditWizard,
  onRunAiReview,
  onDeleteTrip,
  onViewSuggestedListings,
  aiReviewLoading = false,
}) => {
  // Parse planningDetailsJson if available
  let planning: any = null;
  if (trip.planningDetailsJson) {
    try {
      planning = JSON.parse(trip.planningDetailsJson);
    } catch {
      planning = null;
    }
  }

  const isApproved = trip.status === "Reviewed" || trip.status === "Approved";
  const isPending = trip.status === "PendingReview";
  const isDeclined = trip.status === "Declined";
  const isDraft = !isApproved && !isPending && !isDeclined;

  const bgImage = getDestinationImage(trip.destination, "Trip");

  // Calculate duration in days
  let durationDays: number | null = null;
  if (trip.startDate && trip.endDate) {
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (diff > 0) durationDays = diff;
  }

  const startingPoint = trip.startingPoint || planning?.startingPoint || planning?.startingLocation || "Not specified";
  const travelMethod = planning?.travelMethod || trip.travelMethod || "PRIVATE_VEHICLE";
  const vehicleType = planning?.rentalVehicleType || planning?.publicTransportType || trip.travelVehicleType || "";
  const totalBudget = planning?.totalBudget || "";
  const currency = planning?.currency || "LKR";
  const categoryBudgets = planning?.categoryBudgets || {};
  const groupMembers = Array.isArray(planning?.groupMembers) ? planning.groupMembers : [];
  const interests = Array.isArray(planning?.interests) ? planning.interests : [];
  const mustVisitPlaces = planning?.mustVisitPlaces || "";
  const dailyTimeLimit = planning?.dailyTimeLimit || "";
  const safetyLocation = planning?.safetyLocation || "";
  const highRiskActivities = Array.isArray(planning?.highRiskActivities) ? planning.highRiskActivities : [];
  const initialExpenses = Array.isArray(planning?.initialExpenses) ? planning.initialExpenses : [];
  const splitStrategy = planning?.splitStrategy || "";
  const sharedExpensePaidBy = planning?.sharedExpensePaidBy || "";
  const sharedExpenseAmount = planning?.sharedExpenseAmount || "";

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        padding: "1.5rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#0f172a",
          borderRadius: "20px",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          maxWidth: "800px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.6)",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Hero Banner with Destination Image */}
        <div
          style={{
            position: "relative",
            height: "220px",
            overflow: "hidden",
            borderTopLeftRadius: "20px",
            borderTopRightRadius: "20px",
          }}
        >
          <img
            src={bgImage}
            alt={trip.destination}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(180deg, rgba(15, 23, 42, 0.3) 0%, rgba(15, 23, 42, 0.95) 100%)",
            }}
          />

          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              zIndex: 10,
              background: "rgba(0, 0, 0, 0.5)",
              backdropFilter: "blur(6px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "#ffffff",
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              cursor: "pointer",
              fontSize: "1.2rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>

          {/* Status Badge */}
          <div style={{ position: "absolute", top: 16, left: 16, zIndex: 10 }}>
            {isApproved && (
              <span
                style={{
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  color: "#ffffff",
                  padding: "6px 14px",
                  borderRadius: "9999px",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  boxShadow: "0 4px 12px rgba(16, 185, 129, 0.4)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                }}
              >
                <span>✅</span> Admin Approved
              </span>
            )}
            {isPending && (
              <span
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  color: "#ffffff",
                  padding: "6px 14px",
                  borderRadius: "9999px",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  boxShadow: "0 4px 12px rgba(245, 158, 11, 0.4)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                }}
              >
                <span>⏳</span> Pending Admin Review
              </span>
            )}
            {isDeclined && (
              <span
                style={{
                  background: "linear-gradient(135deg, #ef4444, #dc2626)",
                  color: "#ffffff",
                  padding: "6px 14px",
                  borderRadius: "9999px",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  boxShadow: "0 4px 12px rgba(239, 68, 68, 0.4)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                }}
              >
                <span>❌</span> Declined by Admin
              </span>
            )}
            {isDraft && (
              <span
                style={{
                  background: "linear-gradient(135deg, #64748b, #475569)",
                  color: "#ffffff",
                  padding: "6px 14px",
                  borderRadius: "9999px",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                }}
              >
                <span>📝</span> Draft Plan
              </span>
            )}
          </div>

          {/* Title & Destination in Overlay */}
          <div style={{ position: "absolute", bottom: 16, left: 24, right: 24, zIndex: 10 }}>
            <h2 style={{ margin: 0, fontSize: "1.85rem", fontWeight: 800, color: "#ffffff", textShadow: "0 2px 10px rgba(0,0,0,0.8)" }}>
              {trip.name}
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "6px", flexWrap: "wrap" }}>
              <span
                style={{
                  background: "rgba(20, 184, 166, 0.25)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(45, 212, 191, 0.4)",
                  color: "#5eead4",
                  padding: "4px 12px",
                  borderRadius: "9999px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <MapPinIcon size={13} color="#5eead4" /> {trip.destination}
                </span>
              </span>
              <span style={{ color: "#cbd5e1", fontSize: "0.85rem", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 5 }}>
                <CalendarIcon size={13} color="#cbd5e1" /> {trip.startDate} → {trip.endDate} {durationDays ? `(${durationDays} Days)` : ""}
              </span>
              {isActiveTrip && (
                <span
                  style={{
                    background: "rgba(34, 197, 94, 0.2)",
                    color: "#4ade80",
                    border: "1px solid rgba(34, 197, 94, 0.4)",
                    padding: "3px 10px",
                    borderRadius: "9999px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                  }}
                >
                  ● Active Workspace
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: "1.75rem" }}>
          {/* Admin Verification Alerts */}
          {isApproved && (
            <div
              style={{
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                borderRadius: "12px",
                padding: "1rem 1.25rem",
                marginBottom: "1.5rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#34d399", fontWeight: 700, fontSize: "0.95rem" }}>
                <span>✅ Admin Approval Verified</span>
              </div>
              <p style={{ margin: "0.4rem 0 0 0", color: "#cbd5e1", fontSize: "0.88rem" }}>
                This trip plan has been verified and approved by TravelWise Admin. Your itinerary, safety routes, and transport arrangements meet the island travel guidelines.
              </p>
              {trip.adminFeedback && (
                <div style={{ marginTop: "0.5rem", padding: "0.5rem 0.75rem", background: "rgba(15, 23, 42, 0.6)", borderRadius: "6px", color: "#a7f3d0", fontSize: "0.85rem" }}>
                  <strong>Admin Feedback:</strong> {trip.adminFeedback}
                </div>
              )}
            </div>
          )}

          {isPending && (
            <div
              style={{
                background: "rgba(245, 158, 11, 0.12)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                borderRadius: "12px",
                padding: "1rem 1.25rem",
                marginBottom: "1.5rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#fbbf24", fontWeight: 700, fontSize: "0.95rem" }}>
                <span>⏳ Awaiting Staff Administrator Review</span>
              </div>
              <p style={{ margin: "0.4rem 0 0 0", color: "#cbd5e1", fontSize: "0.88rem" }}>
                This trip plan was submitted to TravelWise staff administrators. Administrators will inspect the itinerary, budget feasibility, and safety recommendations shortly.
              </p>
            </div>
          )}

          {isDeclined && (
            <div
              style={{
                background: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: "12px",
                padding: "1rem 1.25rem",
                marginBottom: "1.5rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#f87171", fontWeight: 700, fontSize: "0.95rem" }}>
                <span>❌ Trip Plan Declined</span>
              </div>
              <p style={{ margin: "0.4rem 0 0 0", color: "#cbd5e1", fontSize: "0.88rem" }}>
                This trip plan was declined by Admin during verification. Please edit the plan using the wizard to adjust requirements and resubmit.
              </p>
              {trip.adminFeedback && (
                <div style={{ marginTop: "0.5rem", padding: "0.5rem 0.75rem", background: "rgba(15, 23, 42, 0.6)", borderRadius: "6px", color: "#fca5a5", fontSize: "0.85rem" }}>
                  <strong>Admin Reason:</strong> {trip.adminFeedback}
                </div>
              )}
            </div>
          )}

          {trip.adminWarningNote && (
            <div
              style={{
                background: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.4)",
                borderRadius: "12px",
                padding: "0.85rem 1.25rem",
                marginBottom: "1.5rem",
                color: "#fbbf24",
                fontSize: "0.88rem",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <AlertCircleIcon size={16} color="#fbbf24" />
              <div><strong>Travel Advisory Note from Admin:</strong> {trip.adminWarningNote}</div>
            </div>
          )}

          {/* Quick Info Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1rem",
              marginBottom: "1.5rem",
            }}
          >
            {/* Starting Point & Destination */}
            <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "1rem", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>Route Overview</div>
              <div style={{ marginTop: "0.35rem", color: "#f8fafc", fontWeight: 600, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: 6 }}>
                <PlaneIcon size={14} color="var(--brand-teal-light)" /> {startingPoint} <span style={{ color: "#38bdf8" }}>→</span> <MapPinIcon size={14} color="#fbbf24" /> {trip.destination}
              </div>
            </div>

            {/* Travel Method */}
            <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "1rem", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>Transport Setup</div>
              <div style={{ marginTop: "0.35rem", color: "#f8fafc", fontWeight: 600, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: 6 }}>
                <CarIcon size={14} color="#38bdf8" /> {travelMethod.replace(/_/g, " ")} {vehicleType ? `(${vehicleType})` : ""}
              </div>
            </div>

            {/* Total Budget */}
            <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "1rem", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>Total Budget</div>
              <div style={{ marginTop: "0.35rem", color: "#34d399", fontWeight: 700, fontSize: "1.1rem", display: "flex", alignItems: "center", gap: 6 }}>
                <WalletIcon size={15} color="#34d399" /> {totalBudget ? `${currency} ${Number(totalBudget).toLocaleString()}` : "Not configured"}
              </div>
            </div>

            {/* Group Members Count */}
            <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "1rem", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>Group Crew</div>
              <div style={{ marginTop: "0.35rem", color: "#f8fafc", fontWeight: 600, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: 6 }}>
                <UsersIcon size={14} color="#a78bfa" /> {groupMembers.length > 0 ? `${groupMembers.length} member(s)` : "Solo Explorer"}
              </div>
            </div>
          </div>

          {/* Category Budgets & Expenses */}
          {(categoryBudgets.food || categoryBudgets.accommodation || categoryBudgets.transport || initialExpenses.length > 0) && (
            <div style={{ background: "rgba(255, 255, 255, 0.02)", padding: "1.25rem", borderRadius: "14px", border: "1px solid rgba(255, 255, 255, 0.07)", marginBottom: "1.5rem" }}>
              <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.95rem", color: "#38bdf8", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                <WalletIcon size={15} color="#38bdf8" /> Budget Allocations & Initial Expenses
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem", marginBottom: "0.75rem" }}>
                {categoryBudgets.food && (
                  <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "0.6rem 0.85rem", borderRadius: "8px" }}>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8", display: "flex", alignItems: "center", gap: 5 }}>
                      <UtensilsIcon size={12} color="#fca5a5" /> Food & Dining
                    </div>
                    <div style={{ fontWeight: 600, color: "#f8fafc" }}>{currency} {Number(categoryBudgets.food).toLocaleString()}</div>
                  </div>
                )}
                {categoryBudgets.accommodation && (
                  <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "0.6rem 0.85rem", borderRadius: "8px" }}>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8", display: "flex", alignItems: "center", gap: 5 }}>
                      <HotelIcon size={12} color="#a5b4fc" /> Accommodation
                    </div>
                    <div style={{ fontWeight: 600, color: "#f8fafc" }}>{currency} {Number(categoryBudgets.accommodation).toLocaleString()}</div>
                  </div>
                )}
                {categoryBudgets.transport && (
                  <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "0.6rem 0.85rem", borderRadius: "8px" }}>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8", display: "flex", alignItems: "center", gap: 5 }}>
                      <CarIcon size={12} color="#fde047" /> Transport
                    </div>
                    <div style={{ fontWeight: 600, color: "#f8fafc" }}>{currency} {Number(categoryBudgets.transport).toLocaleString()}</div>
                  </div>
                )}
              </div>

              {initialExpenses.length > 0 && (
                <div style={{ marginTop: "0.75rem" }}>
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: "0.4rem" }}>Recorded Initial Expenses:</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {initialExpenses.map((exp: any, idx: number) => (
                      <div key={idx} style={{ display: "flex", justifyContent: "space-between", background: "rgba(15, 23, 42, 0.4)", padding: "0.4rem 0.75rem", borderRadius: "6px", fontSize: "0.85rem" }}>
                        <span style={{ color: "#cbd5e1" }}>{exp.category}: {exp.description}</span>
                        <span style={{ fontWeight: 600, color: "#34d399" }}>{currency} {Number(exp.amount).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Interests, Must-Visit Places & Safety */}
          <div style={{ background: "rgba(255, 255, 255, 0.02)", padding: "1.25rem", borderRadius: "14px", border: "1px solid rgba(255, 255, 255, 0.07)", marginBottom: "1.5rem" }}>
            <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.95rem", color: "#fbbf24", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              <CompassIcon size={15} color="#fbbf24" /> Itinerary Preferences & Safety
            </h4>
            
            {interests.length > 0 && (
              <div style={{ marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Interests: </span>
                <span style={{ display: "inline-flex", gap: "0.4rem", flexWrap: "wrap", marginLeft: "0.5rem" }}>
                  {interests.map((int: string) => (
                    <span key={int} style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", padding: "2px 8px", borderRadius: "6px", fontSize: "0.75rem" }}>
                      {int}
                    </span>
                  ))}
                </span>
              </div>
            )}

            {mustVisitPlaces && (
              <div style={{ marginBottom: "0.6rem", fontSize: "0.85rem", color: "#cbd5e1" }}>
                <strong style={{ color: "#94a3b8" }}>Must-Visit Places:</strong> {mustVisitPlaces}
              </div>
            )}

            {dailyTimeLimit && (
              <div style={{ marginBottom: "0.6rem", fontSize: "0.85rem", color: "#cbd5e1" }}>
                <strong style={{ color: "#94a3b8" }}>Daily Activity Limit:</strong> {dailyTimeLimit} hours/day
              </div>
            )}

            {safetyLocation && (
              <div style={{ marginBottom: "0.6rem", fontSize: "0.85rem", color: "#cbd5e1" }}>
                <strong style={{ color: "#94a3b8" }}>Emergency Safety Location:</strong> {safetyLocation}
              </div>
            )}

            {highRiskActivities.length > 0 && (
              <div style={{ marginTop: "0.5rem" }}>
                <span style={{ fontSize: "0.8rem", color: "#f87171" }}>High-Risk Activities Declared: </span>
                <span style={{ display: "inline-flex", gap: "0.4rem", flexWrap: "wrap", marginLeft: "0.5rem" }}>
                  {highRiskActivities.map((act: string) => (
                    <span key={act} style={{ background: "rgba(239, 68, 68, 0.15)", color: "#f87171", padding: "2px 8px", borderRadius: "6px", fontSize: "0.75rem" }}>
                      {act}
                    </span>
                  ))}
                </span>
              </div>
            )}
          </div>

          {/* Group Members & Billing */}
          {groupMembers.length > 0 && (
            <div style={{ background: "rgba(255, 255, 255, 0.02)", padding: "1.25rem", borderRadius: "14px", border: "1px solid rgba(255, 255, 255, 0.07)", marginBottom: "1.5rem" }}>
              <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.95rem", color: "#a855f7", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                <UsersIcon size={15} color="#a855f7" /> Group Members & Billing Strategy
              </h4>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                {groupMembers.map((m: any, idx: number) => (
                  <div key={idx} style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255, 255, 255, 0.1)", padding: "0.4rem 0.75rem", borderRadius: "8px", fontSize: "0.85rem", color: "#f8fafc", display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <UsersIcon size={12} color="#94a3b8" /> {m.value || m.displayName || m}
                  </div>
                ))}
              </div>
              {splitStrategy && (
                <div style={{ fontSize: "0.85rem", color: "#cbd5e1" }}>
                  <strong style={{ color: "#94a3b8" }}>Debt Split Strategy:</strong> {splitStrategy}
                  {sharedExpenseAmount && ` • Shared: ${currency} ${Number(sharedExpenseAmount).toLocaleString()} (Paid by: ${sharedExpensePaidBy || "Primary"})`}
                </div>
              )}
            </div>
          )}

          {/* Admin Verified AI Banner */}
          {trip.adminApprovedAiReviewJson && (
            <div style={{
              padding: "1rem 1.25rem",
              borderRadius: "12px",
              background: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              flexWrap: "wrap",
            }}>
              <div>
                <div style={{ fontWeight: 700, color: "#34d399", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <ShieldCheckIcon size={16} color="#34d399" /> Admin Verified AI Plan & Budget Assessment
                </div>
                <div style={{ fontSize: "0.85rem", color: "#cbd5e1", marginTop: "2px" }}>
                  This itinerary, safety risk analysis, and priority Method (ii) budget have been officially reviewed and approved by the administrator.
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRunAiReview(trip)}
                style={{
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  color: "#ffffff",
                  border: "none",
                  padding: "0.5rem 1rem",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <EyeIcon size={14} color="#ffffff" /> View Verified Evaluation
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", flexWrap: "wrap", borderTop: "1px solid rgba(255, 255, 255, 0.1)", paddingTop: "1.25rem" }}>
            {onViewSuggestedListings && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewSuggestedListings(trip);
                }}
                style={{
                  background: "linear-gradient(135deg, rgba(14, 165, 233, 0.18), rgba(2, 132, 199, 0.32))",
                  border: "1px solid rgba(56, 189, 248, 0.45)",
                  color: "#38bdf8",
                  padding: "0.6rem 1.25rem",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  boxShadow: "0 2px 8px rgba(14, 165, 233, 0.2)"
                }}
                title="View Accommodations, Restaurants, Food, Vehicles & Sights suggested by AI"
              >
                <HotelIcon size={15} color="#38bdf8" /> 🏨 AI Suggested Listings
              </button>
            )}

            <button
              onClick={() => {
                onSelectActive(trip);
                onClose();
              }}
              style={{
                background: isActiveTrip ? "rgba(34, 197, 94, 0.2)" : "#0284c7",
                color: "#ffffff",
                border: isActiveTrip ? "1px solid #22c55e" : "none",
                padding: "0.6rem 1.25rem",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              {isActiveTrip ? "✓ Active Workspace Selected" : "Open in Workspace"}
            </button>

            <button
              onClick={() => {
                onClose();
                onEditWizard(trip);
              }}
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                color: "#e2e8f0",
                padding: "0.6rem 1.25rem",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <EditIcon size={14} color="#e2e8f0" /> Edit with Wizard
            </button>

            {onDeleteTrip && (
              <button
                type="button"
                onClick={() => {
                  onDeleteTrip(trip);
                }}
                title="Delete Trip Permanently"
                style={{
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                  color: "#f87171",
                  padding: "0.6rem 1.25rem",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#ef4444";
                  e.currentTarget.style.color = "#ffffff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(239, 68, 68, 0.12)";
                  e.currentTarget.style.color = "#f87171";
                }}
              >
                <TrashIcon size={14} color="currentColor" /> Delete Trip
              </button>
            )}

            <button
              onClick={() => {
                onRunAiReview(trip);
              }}
              disabled={aiReviewLoading}
              style={{
                background: trip.adminApprovedAiReviewJson
                  ? "linear-gradient(135deg, #10b981, #059669)"
                  : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "#ffffff",
                border: trip.adminApprovedAiReviewJson ? "1px solid #34d399" : "none",
                padding: "0.6rem 1.25rem",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: aiReviewLoading ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                boxShadow: trip.adminApprovedAiReviewJson ? "0 4px 14px rgba(16, 185, 129, 0.4)" : "0 4px 12px rgba(99, 102, 241, 0.3)",
              }}
            >
              {aiReviewLoading ? "Running AI Review..." : trip.adminApprovedAiReviewJson ? (
                <><ShieldCheckIcon size={15} color="#ffffff" /> View Verified AI Plan</>
              ) : (
                <><SparklesIcon size={15} color="#ffffff" /> Run AI Review</>
              )}
            </button>

            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#94a3b8",
                padding: "0.6rem 1.25rem",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
