import React, { useState } from "react";
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
  SparklesIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ClockIcon,
  LandmarkIcon,
  EditIcon,
} from "./Icons";
import { BudgetItemizedBreakdownModal } from "./BudgetItemizedBreakdownModal";

interface VerifiedAiReviewModalProps {
  trip: Trip;
  onClose: () => void;
}

export const VerifiedAiReviewModal: React.FC<VerifiedAiReviewModalProps> = ({ trip, onClose }) => {
  const [activeTab, setActiveTab] = useState<"ALL" | "PLANNER" | "RISK" | "BUDGET" | "SPLIT">("ALL");
  const [activeScheduleDay, setActiveScheduleDay] = useState<number>(0);
  const [showDetailedBreakdown, setShowDetailedBreakdown] = useState<boolean>(false);

  // Parse approved AI evaluation JSON
  let aiData: any = null;
  if (trip.adminApprovedAiReviewJson) {
    try {
      aiData = typeof trip.adminApprovedAiReviewJson === "string" 
        ? JSON.parse(trip.adminApprovedAiReviewJson) 
        : trip.adminApprovedAiReviewJson;
    } catch (e) {
      aiData = null;
    }
  }

  // Parse admin correction notes
  let correctionNotes: { tripPlanner?: string; risk?: string; budget?: string; splitBill?: string } | null = null;
  if (trip.adminCorrectionNotes) {
    try {
      correctionNotes = typeof trip.adminCorrectionNotes === "string"
        ? JSON.parse(trip.adminCorrectionNotes)
        : trip.adminCorrectionNotes;
    } catch {
      correctionNotes = null;
    }
  }

  const bgImage = getDestinationImage(trip.destination, "Trip");
  const isHalted = aiData?.halted_due_to_risk;
  const tp = aiData?.trip_planner;
  const risk = aiData?.risk_calculator;
  const budget = aiData?.budget;
  const split = aiData?.split_bill;

  const hasAnyCorrection = correctionNotes && (
    correctionNotes.tripPlanner?.trim() ||
    correctionNotes.risk?.trim() ||
    correctionNotes.budget?.trim() ||
    correctionNotes.splitBill?.trim()
  );

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        padding: "1.25rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "linear-gradient(180deg, #0b1329 0%, #0f172a 100%)",
          borderRadius: "24px",
          border: "1px solid rgba(99, 102, 241, 0.35)",
          maxWidth: "960px",
          width: "100%",
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 25px 70px rgba(0, 0, 0, 0.8), 0 0 30px rgba(99, 102, 241, 0.2)",
          position: "relative",
          color: "#f8fafc",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero Header with Destination Wallpaper */}
        <div
          style={{
            height: "170px",
            position: "relative",
            backgroundImage: `url(${bgImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            display: "flex",
            alignItems: "flex-end",
            padding: "1.5rem 2rem",
            borderTopLeftRadius: "24px",
            borderTopRightRadius: "24px",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "linear-gradient(to bottom, rgba(11, 19, 41, 0.3) 0%, rgba(15, 23, 42, 0.95) 100%)",
              borderTopLeftRadius: "24px",
              borderTopRightRadius: "24px",
            }}
          />

          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
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
              zIndex: 2,
              transition: "all 0.2s",
            }}
            title="Close"
          >
            ✕
          </button>

          <div style={{ position: "relative", zIndex: 1, width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.4rem" }}>
              <span
                style={{
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  color: "#ffffff",
                  padding: "0.3rem 0.85rem",
                  borderRadius: "20px",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  boxShadow: "0 0 15px rgba(16, 185, 129, 0.4)",
                  border: "1px solid rgba(52, 211, 153, 0.5)",
                }}
              >
                <ShieldCheckIcon size={14} color="#34d399" /> Verified & Approved by Admin
              </span>
              <span style={{ fontSize: "0.85rem", color: "#cbd5e1", display: "inline-flex", alignItems: "center", gap: 5 }}>
                <CalendarIcon size={13} color="#cbd5e1" /> {trip.startDate || "Date flexible"} {trip.endDate ? `➔ ${trip.endDate}` : ""}
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: "1.85rem", fontWeight: 800, color: "#ffffff", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
              {trip.name || `${trip.destination} Tour Plan`}
            </h2>
            <div style={{ fontSize: "0.9rem", color: "#38bdf8", marginTop: "2px", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
              <MapPinIcon size={14} color="#38bdf8" /> Destination: {trip.destination} · Starting from: {trip.startingPoint || "Colombo"}
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "1.75rem 2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Admin Feedback Official Note (Approval Note / Warning Note) */}
          {(trip.adminFeedback || trip.adminWarningNote) && (
            <div
              style={{
                padding: "1rem 1.25rem",
                borderRadius: "14px",
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.35)",
                borderLeft: "6px solid #10b981",
                display: "flex",
                flexDirection: "column",
                gap: "0.45rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, color: "#34d399", fontSize: "0.95rem" }}>
                <CheckCircleIcon size={16} color="#34d399" /> Admin Official Feedback & Instructions:
              </div>
              <div style={{ color: "#e2e8f0", fontSize: "0.9rem", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                {trip.adminFeedback || trip.adminWarningNote}
              </div>
              {trip.adminFeedback && trip.adminWarningNote && trip.adminFeedback !== trip.adminWarningNote && (
                <div style={{ color: "#fcd34d", fontSize: "0.85rem", lineHeight: 1.45, marginTop: "0.3rem", paddingTop: "0.3rem", borderTop: "1px dashed rgba(255,255,255,0.1)" }}>
                  <strong style={{ color: "#fbbf24" }}>⚠️ Warning Advisory: </strong>{trip.adminWarningNote}
                </div>
              )}
            </div>
          )}

          {/* Admin Per-Agent Manual Corrections Section (if admin added adjustments) */}
          {hasAnyCorrection && (
            <div
              style={{
                padding: "1.25rem",
                borderRadius: "16px",
                background: "rgba(245, 158, 11, 0.08)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                display: "flex",
                flexDirection: "column",
                gap: "0.85rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontWeight: 700, color: "#fbbf24", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <EditIcon size={15} color="#fbbf24" /> Admin Manual Adjustments & Agent Review Notes:
                </div>
                <span style={{ fontSize: "0.75rem", color: "var(--brand-teal-light)", background: "rgba(245, 158, 11, 0.15)", padding: "2px 8px", borderRadius: "10px" }}>
                  Custom Admin Guidance
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
                {correctionNotes?.tripPlanner?.trim() && (
                  <div style={{ padding: "0.75rem", borderRadius: "10px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(56, 189, 248, 0.2)" }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#38bdf8", marginBottom: "0.3rem", display: "flex", alignItems: "center", gap: 5 }}>
                      <CompassIcon size={13} color="#38bdf8" /> Planner Note:
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#cbd5e1" }}>{correctionNotes.tripPlanner}</div>
                  </div>
                )}
                {correctionNotes?.risk?.trim() && (
                  <div style={{ padding: "0.75rem", borderRadius: "10px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#f87171", marginBottom: "0.3rem", display: "flex", alignItems: "center", gap: 5 }}>
                      <ShieldCheckIcon size={13} color="#f87171" /> Safety / Hazard Note:
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#cbd5e1" }}>{correctionNotes.risk}</div>
                  </div>
                )}
                {correctionNotes?.budget?.trim() && (
                  <div style={{ padding: "0.75rem", borderRadius: "10px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(34, 197, 94, 0.2)" }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#4ade80", marginBottom: "0.3rem", display: "flex", alignItems: "center", gap: 5 }}>
                      <WalletIcon size={13} color="#4ade80" /> Budget Adjustment:
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#cbd5e1" }}>{correctionNotes.budget}</div>
                  </div>
                )}
                {correctionNotes?.splitBill?.trim() && (
                  <div style={{ padding: "0.75rem", borderRadius: "10px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(168, 85, 247, 0.2)" }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#c084fc", marginBottom: "0.3rem", display: "flex", alignItems: "center", gap: 5 }}>
                      <UsersIcon size={13} color="#c084fc" /> Split-Bill Guideline:
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#cbd5e1" }}>{correctionNotes.splitBill}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation Filter Tabs */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", paddingBottom: "0.75rem" }}>
            <button
              onClick={() => setActiveTab("ALL")}
              style={{
                padding: "0.45rem 1rem",
                borderRadius: "8px",
                fontSize: "0.85rem",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                background: activeTab === "ALL" ? "linear-gradient(135deg, #6366f1, #4f46e5)" : "rgba(255, 255, 255, 0.06)",
                color: activeTab === "ALL" ? "#ffffff" : "#94a3b8",
              }}
            >
              All 4 Agents Overview
            </button>
            <button
              onClick={() => setActiveTab("PLANNER")}
              style={{
                padding: "0.45rem 1rem",
                borderRadius: "8px",
                fontSize: "0.85rem",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                background: activeTab === "PLANNER" ? "rgba(14, 165, 233, 0.25)" : "rgba(255, 255, 255, 0.06)",
                color: activeTab === "PLANNER" ? "#38bdf8" : "#94a3b8",
                borderBottom: activeTab === "PLANNER" ? "2px solid #38bdf8" : "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <CompassIcon size={13} /> 1. Trip Planner
            </button>
            <button
              onClick={() => setActiveTab("RISK")}
              style={{
                padding: "0.45rem 1rem",
                borderRadius: "8px",
                fontSize: "0.85rem",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                background: activeTab === "RISK" ? "rgba(239, 68, 68, 0.2)" : "rgba(255, 255, 255, 0.06)",
                color: activeTab === "RISK" ? "#f87171" : "#94a3b8",
                borderBottom: activeTab === "RISK" ? "2px solid #ef4444" : "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <ShieldCheckIcon size={13} /> 2. Safety & Risk
            </button>
            <button
              onClick={() => setActiveTab("BUDGET")}
              style={{
                padding: "0.45rem 1rem",
                borderRadius: "8px",
                fontSize: "0.85rem",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                background: activeTab === "BUDGET" ? "rgba(34, 197, 94, 0.2)" : "rgba(255, 255, 255, 0.06)",
                color: activeTab === "BUDGET" ? "#4ade80" : "#94a3b8",
                borderBottom: activeTab === "BUDGET" ? "2px solid #22c55e" : "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <WalletIcon size={13} /> 3. Budget & Costs
            </button>
            <button
              onClick={() => setActiveTab("SPLIT")}
              style={{
                padding: "0.45rem 1rem",
                borderRadius: "8px",
                fontSize: "0.85rem",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                background: activeTab === "SPLIT" ? "rgba(168, 85, 247, 0.2)" : "rgba(255, 255, 255, 0.06)",
                color: activeTab === "SPLIT" ? "#c084fc" : "#94a3b8",
                borderBottom: activeTab === "SPLIT" ? "2px solid #a855f7" : "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <UsersIcon size={13} /> 4. Split-Bill
            </button>
          </div>

          {!aiData ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#94a3b8" }}>
              <div style={{ marginBottom: "0.75rem", display: "flex", justifyContent: "center" }}>
                <SparklesIcon size={42} color="var(--brand-teal-light)" />
              </div>
              <h3 style={{ color: "#ffffff", margin: "0 0 0.5rem" }}>No Structured AI Review Data Available</h3>
              <p style={{ fontSize: "0.9rem", margin: 0 }}>
                This trip has been verified by the Admin with standard approval. If you require a refreshed multi-agent evaluation, please consult your administrator.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

              {/* HALTED ALERT IF APPLICABLE */}
              {isHalted && (
                <div
                  style={{
                    padding: "1.25rem",
                    borderRadius: "14px",
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    borderLeft: "6px solid #ef4444",
                  }}
                >
                  <div style={{ fontWeight: 800, color: "#f87171", fontSize: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    🚨 HIGH RISK ACTIVITY DETECTED — WORKFLOW SAFELY CONSTRAINED
                  </div>
                  <div style={{ fontSize: "0.9rem", color: "#fecaca", marginTop: "0.4rem" }}>
                    {aiData.halt_reason || "Trip parameters triggered safety limits for traveler security."}
                  </div>
                </div>
              )}

              {/* 1. TRIP PLANNER AGENT */}
              {(activeTab === "ALL" || activeTab === "PLANNER") && tp && (
                <div
                  style={{
                    padding: "1.25rem 1.5rem",
                    borderRadius: "16px",
                    background: "rgba(14, 165, 233, 0.06)",
                    border: "1px solid rgba(14, 165, 233, 0.3)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.6rem" }}>
                    <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "#38bdf8", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      🗺️ 1. Trip Planner Agent — Itinerary & Route
                    </div>
                    <span style={{ fontSize: "0.75rem", background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", padding: "3px 10px", borderRadius: "12px", fontWeight: 700 }}>
                      {tp.trip_days} Day(s) {tp.is_single_day_picnic ? "Picnic" : "Tour"}
                    </span>
                  </div>

                  {/* Route & Vehicle */}
                  <div style={{ padding: "0.85rem 1rem", borderRadius: "10px", background: "rgba(0,0,0,0.3)", fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    <div>📍 <strong>Route:</strong> {tp.starting_point} ➔ {tp.destination}</div>
                    <div>🛣️ <strong>Road Distance:</strong> <span style={{ color: "var(--brand-teal-light)", fontWeight: 700 }}>{tp.road_route?.distance_km} km</span> ({tp.road_route?.duration_formatted})</div>
                    <div>🚗 <strong>Transport:</strong> <span style={{ color: "#fbbf24", fontWeight: 600 }}>{tp.suggested_transport_type}</span></div>
                    {tp.transport_advisory && <div style={{ color: "#94a3b8", fontSize: "0.8rem", marginTop: "2px" }}>💡 {tp.transport_advisory}</div>}
                  </div>

                  {/* Recommended Attractions */}
                  {tp.visiting_places && tp.visiting_places.length > 0 && (
                    <div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#94a3b8", marginBottom: "0.4rem" }}>
                        🏛️ Recommended Attractions to Visit:
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                        {tp.visiting_places.map((p: any, idx: number) => (
                          <div key={idx} style={{ padding: "0.35rem 0.75rem", borderRadius: "8px", background: "rgba(255,255,255,0.05)", fontSize: "0.8rem", border: "1px solid rgba(255,255,255,0.08)" }}>
                            <strong>{p.name}</strong> <span style={{ color: "#94a3b8" }}>({p.type || "Sight"} · ⭐{p.rating || 4.5})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Stays & Dining */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.75rem", fontSize: "0.85rem" }}>
                    <div style={{ padding: "0.75rem", borderRadius: "8px", background: "rgba(0,0,0,0.25)" }}>
                      <strong style={{ color: "#a5b4fc" }}>🏨 Accommodation Recommendation:</strong>
                      <div style={{ marginTop: "0.25rem", color: "#e2e8f0" }}>
                        {tp.accommodations?.[0]?.name || "Verified Local Guest House / Hotel"}
                        {tp.accommodations?.[0]?.price_lkr ? ` (~${tp.accommodations[0].price_lkr.toLocaleString()} LKR/night)` : ""}
                      </div>
                    </div>
                    <div style={{ padding: "0.75rem", borderRadius: "8px", background: "rgba(0,0,0,0.25)" }}>
                      <strong style={{ color: "#fca5a5" }}>🍽️ Dining Recommendation:</strong>
                      <div style={{ marginTop: "0.25rem", color: "#e2e8f0" }}>
                        {tp.restaurants?.[0]?.name || "Popular Local Restaurant"} (⭐{tp.restaurants?.[0]?.rating || "4.6"})
                      </div>
                    </div>
                  </div>

                  {/* Day by Day Timetable */}
                  {tp.itinerary_schedule && tp.itinerary_schedule.length > 0 && (
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "0.75rem" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem", flexWrap: "wrap", gap: "0.4rem" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#94a3b8" }}>📅 Daily Timetable:</span>
                        <div style={{ display: "flex", gap: "0.35rem" }}>
                          {tp.itinerary_schedule.map((day: any, dIdx: number) => (
                            <button
                              key={dIdx}
                              type="button"
                              onClick={() => setActiveScheduleDay(dIdx)}
                              style={{
                                padding: "0.25rem 0.65rem",
                                borderRadius: "6px",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                cursor: "pointer",
                                background: activeScheduleDay === dIdx ? "#0ea5e9" : "rgba(255,255,255,0.08)",
                                color: "#ffffff",
                                border: "none",
                              }}
                            >
                              Day {day.day_number}
                            </button>
                          ))}
                        </div>
                      </div>

                      {(() => {
                        const currDay = tp.itinerary_schedule[activeScheduleDay] || tp.itinerary_schedule[0];
                        return (
                          <div style={{ padding: "0.75rem 1rem", borderRadius: "10px", background: "rgba(0,0,0,0.35)", fontSize: "0.85rem" }}>
                            <div style={{ fontWeight: 700, color: "#38bdf8", marginBottom: "0.4rem" }}>
                              Day {currDay.day_number}: {currDay.theme}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                              {currDay.schedule?.map((slot: any, sIdx: number) => (
                                <div key={sIdx} style={{ display: "flex", gap: "0.5rem", alignItems: "baseline" }}>
                                  <span style={{ color: "var(--brand-gold-light)", fontWeight: 700, minWidth: "50px" }}>{slot.time}</span>
                                  <span style={{ color: "#f8fafc" }}>{slot.activity}</span>
                                  <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>({slot.location})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* 2. RISK CALCULATE AGENT */}
              {(activeTab === "ALL" || activeTab === "RISK") && risk && (
                <div
                  style={{
                    padding: "1.25rem 1.5rem",
                    borderRadius: "16px",
                    background: risk.overall_risk_level === "HIGH" ? "rgba(239, 68, 68, 0.08)" : "rgba(245, 158, 11, 0.05)",
                    border: risk.overall_risk_level === "HIGH" ? "1px solid rgba(239, 68, 68, 0.35)" : "1px solid rgba(245, 158, 11, 0.25)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.6rem" }}>
                    <div style={{ fontWeight: 800, fontSize: "1.05rem", color: risk.overall_risk_level === "HIGH" ? "#f87171" : "#fbbf24", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      🛡️ 2. Risk Calculate Agent — Safety & Weather
                    </div>
                    <span
                      style={{
                        padding: "3px 12px",
                        borderRadius: "12px",
                        fontSize: "0.75rem",
                        fontWeight: 800,
                        background: risk.overall_risk_level === "HIGH" ? "rgba(239,68,68,0.2)" : risk.overall_risk_level === "MODERATE" ? "rgba(245,158,11,0.2)" : "rgba(34,197,94,0.2)",
                        color: risk.overall_risk_level === "HIGH" ? "#ef4444" : risk.overall_risk_level === "MODERATE" ? "#f59e0b" : "#22c55e",
                        border: `1px solid ${risk.overall_risk_level === "HIGH" ? "#ef4444" : risk.overall_risk_level === "MODERATE" ? "#f59e0b" : "#22c55e"}`,
                      }}
                    >
                      {risk.overall_risk_level} RISK
                    </span>
                  </div>

                  {/* Weather report */}
                  {risk.weather_report && (
                    <div style={{ padding: "0.85rem 1rem", borderRadius: "10px", background: "rgba(0,0,0,0.3)", fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      <div style={{ fontWeight: 700, color: "var(--brand-teal-light)" }}>⛅ Live Open-Meteo Weather for {trip.destination}:</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", marginTop: "0.25rem" }}>
                        <div style={{ padding: "0.4rem", borderRadius: "6px", background: "rgba(255,255,255,0.03)", textAlign: "center" }}>
                          <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Temperature</div>
                          <div style={{ fontSize: "0.95rem", fontWeight: 700 }}>{risk.weather_report.temperature_c}°C</div>
                        </div>
                        <div style={{ padding: "0.4rem", borderRadius: "6px", background: "rgba(255,255,255,0.03)", textAlign: "center" }}>
                          <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Precipitation</div>
                          <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#38bdf8" }}>{risk.weather_report.precipitation_probability}%</div>
                        </div>
                        <div style={{ padding: "0.4rem", borderRadius: "6px", background: "rgba(255,255,255,0.03)", textAlign: "center" }}>
                          <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Wind Speed</div>
                          <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#a5b4fc" }}>{risk.weather_report.wind_speed_kmh} km/h</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Risk categories */}
                  {risk.risk_breakdown && risk.risk_breakdown.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      {risk.risk_breakdown.map((cat: any, idx: number) => (
                        <div key={idx} style={{ padding: "0.6rem 0.85rem", borderRadius: "8px", background: "rgba(0,0,0,0.25)", fontSize: "0.8rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <strong style={{ color: "#f8fafc" }}>{cat.hazard_name || cat.name}: </strong>
                            <span style={{ color: "#94a3b8" }}>{cat.recommendation || cat.description}</span>
                          </div>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: "6px",
                              fontWeight: 700,
                              fontSize: "0.7rem",
                              color: cat.level === "HIGH" ? "#ef4444" : cat.level === "MODERATE" ? "#f59e0b" : "#22c55e",
                            }}
                          >
                            {cat.level}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Sri Lanka Emergency Contacts Hotline */}
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "0.75rem", fontSize: "0.8rem" }}>
                    <span style={{ fontWeight: 700, color: "#fca5a5" }}>🚨 Emergency Sri Lanka Numbers: </span>
                    <span style={{ color: "#cbd5e1" }}>Police: <strong>119</strong> · Ambulance: <strong>1990</strong> · Disaster Management: <strong>117</strong> · Tourist Police: <strong>1912</strong></span>
                  </div>
                </div>
              )}

              {/* 3. BUDGET AGENT */}
              {(activeTab === "ALL" || activeTab === "BUDGET") && budget && (
                <div
                  style={{
                    padding: "1.25rem 1.5rem",
                    borderRadius: "16px",
                    background: "rgba(34, 197, 94, 0.06)",
                    border: "1px solid rgba(34, 197, 94, 0.3)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.6rem", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "#4ade80", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      💰 3. Budget Agent — Priority Method (ii) Costing
                    </div>
                    <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                      {budget.calculation_mode && (
                        <span style={{ fontSize: "0.75rem", background: "rgba(20, 184, 166, 0.2)", color: "var(--brand-teal-light)", padding: "2px 8px", borderRadius: "10px", fontWeight: 700 }}>
                          {budget.calculation_mode.includes("METHOD_2") ? "🏛️ Method (ii): Live Provider Listings" : "🔄 Hybrid Benchmark"}
                        </span>
                      )}
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: "12px",
                          fontSize: "0.75rem",
                          fontWeight: 800,
                          background: budget.difference_status === "WITHIN_BUDGET" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
                          color: budget.difference_status === "WITHIN_BUDGET" ? "#22c55e" : "#ef4444",
                        }}
                      >
                        {budget.difference_status}
                      </span>
                    </div>
                  </div>

                  {/* Budget Summary Comparison Card */}
                  <div style={{ padding: "0.85rem 1.1rem", borderRadius: "10px", background: "rgba(0,0,0,0.3)", fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#94a3b8" }}>Calculated Total Budget:</span>
                      <strong style={{ color: "var(--brand-teal-light)", fontSize: "1.05rem" }}>
                        {budget.final_calculated_budget?.toLocaleString()} {budget.currency}
                      </strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#94a3b8" }}>Traveller's Proposed Budget:</span>
                      <strong>{budget.user_budget?.toLocaleString()} {budget.currency}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed rgba(255,255,255,0.08)", paddingTop: "0.35rem" }}>
                      <span style={{ color: "#94a3b8" }}>Variance / Difference:</span>
                      <strong style={{ color: budget.budget_difference >= 0 ? "#22c55e" : "#ef4444" }}>
                        {budget.budget_difference >= 0 ? `+${budget.budget_difference.toLocaleString()} (Surplus)` : `${budget.budget_difference.toLocaleString()} (Deficit)`}
                      </strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#fbbf24", fontSize: "0.8rem" }}>
                      <span>🛡️ Mandatory 10% Contingency Margin:</span>
                      <strong>+{budget.contingency_margin_10_percent?.toLocaleString()} {budget.currency}</strong>
                    </div>
                  </div>

                  {/* Itemized Categories Breakdown */}
                  <div style={{ fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "0.45rem 0.75rem", borderRadius: "6px", background: "rgba(255,255,255,0.03)" }}>
                      <span>🚗 Transport & Fuel:</span>
                      <span style={{ fontWeight: 700, color: budget.transport_cost === 0 ? "#34d399" : "#f8fafc" }}>
                        {budget.transport_cost === 0 ? "0.0 LKR (Own Vehicle - Fuel & Transit Excluded)" : `${budget.transport_cost?.toLocaleString()} ${budget.currency}`}
                      </span>
                    </div>

                    {budget.vehicle_details?.selected_vehicle_name && (
                      <div style={{ fontSize: "0.8rem", color: "#38bdf8", padding: "0.2rem 0.75rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <span>🚆 Vehicle:</span>
                        <strong>{budget.vehicle_details.selected_vehicle_name}</strong>
                      </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between", padding: "0.45rem 0.75rem", borderRadius: "6px", background: "rgba(255,255,255,0.03)" }}>
                      <span>🏨 Lodging / Stays:</span>
                      <span style={{ fontWeight: 700 }}>{budget.accommodation_cost?.toLocaleString()} {budget.currency}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "0.45rem 0.75rem", borderRadius: "6px", background: "rgba(255,255,255,0.03)" }}>
                      <span>🍽️ Food & Meals:</span>
                      <span style={{ fontWeight: 700 }}>{budget.restaurant_and_food_cost?.toLocaleString()} {budget.currency}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "0.45rem 0.75rem", borderRadius: "6px", background: "rgba(255,255,255,0.03)" }}>
                      <span>🎟️ Attractions & Buffer:</span>
                      <span style={{ fontWeight: 700 }}>{budget.extra_expenses_total?.toLocaleString()} {budget.currency}</span>
                    </div>
                  </div>

                  {/* Button to Open Dedicated Detailed Itemized Breakdown Modal */}
                  <button
                    type="button"
                    onClick={() => setShowDetailedBreakdown(true)}
                    style={{
                      background: "linear-gradient(135deg, rgba(34, 197, 94, 0.22) 0%, rgba(16, 185, 129, 0.15) 100%)",
                      border: "1px solid rgba(34, 197, 94, 0.45)",
                      borderRadius: "10px",
                      color: "#4ade80",
                      padding: "9px 14px",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      boxShadow: "0 2px 10px rgba(34, 197, 94, 0.15)",
                      transition: "all 0.2s",
                      marginTop: "0.25rem",
                    }}
                  >
                    <WalletIcon size={16} color="#4ade80" /> 📋 View Granular Cost Breakdown & Vehicle Tariff
                  </button>

                  {/* Method 2 Data Sources Attribution if present */}
                  {budget.data_sources && (
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "0.5rem", fontSize: "0.75rem", color: "#94a3b8" }}>
                      <span style={{ fontWeight: 700, color: "var(--brand-teal-light)" }}>🏛️ Verified Provider Sources: </span>
                      {Array.isArray(budget.data_sources) ? budget.data_sources.join(" · ") : Object.values(budget.data_sources).join(" · ")}
                    </div>
                  )}
                </div>
              )}

              {/* 4. SPLIT-BILL AGENT */}
              {(activeTab === "ALL" || activeTab === "SPLIT") && split && (
                <div
                  style={{
                    padding: "1.25rem 1.5rem",
                    borderRadius: "16px",
                    background: "rgba(168, 85, 247, 0.06)",
                    border: "1px solid rgba(168, 85, 247, 0.3)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.6rem" }}>
                    <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "#c084fc", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      👥 4. Split-Bill Agent — Fair Share & Settlements
                    </div>
                    <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 700, background: "rgba(168,85,247,0.2)", color: "#c084fc" }}>
                      {split.member_count || 1} Member(s)
                    </span>
                  </div>

                  {/* Individual Share Summary */}
                  <div style={{ padding: "0.85rem 1.1rem", borderRadius: "10px", background: "rgba(0,0,0,0.3)", fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#94a3b8" }}>Equal Fair Share / Person:</span>
                      <strong style={{ color: "#c084fc", fontSize: "1.05rem" }}>
                        {split.individual_shares?.[0]?.amount?.toLocaleString()} {split.currency}
                      </strong>
                    </div>
                    {split.individual_shares?.[0]?.converted_amount && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--brand-teal-light)" }}>
                        <span>Converted Currency Share:</span>
                        <strong>~${split.individual_shares[0].converted_amount.toFixed(2)} USD</strong>
                      </div>
                    )}
                  </div>

                  {/* Member shares chips */}
                  {split.individual_shares && split.individual_shares.length > 0 && (
                    <div>
                      <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#94a3b8", marginBottom: "0.35rem" }}>Member Allocations:</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                        {split.individual_shares.map((s: any, idx: number) => (
                          <div key={idx} style={{ padding: "0.35rem 0.75rem", borderRadius: "6px", background: "rgba(255,255,255,0.05)", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                            <span>👤 <strong>{s.member_name}:</strong></span>
                            <span style={{ color: "#c084fc" }}>{s.amount?.toLocaleString()} {s.currency}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Debt Settlements Transfers */}
                  {split.settlement_transfers && split.settlement_transfers.length > 0 && (
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "0.6rem", fontSize: "0.8rem" }}>
                      <div style={{ fontWeight: 700, color: "#94a3b8", marginBottom: "0.35rem" }}>Debt Settlements / Payment Transfers:</div>
                      {split.settlement_transfers.map((t: any, tIdx: number) => (
                        <div key={tIdx} style={{ color: "#e2e8f0", padding: "0.25rem 0" }}>
                          • {t.from_member} ➔ pays {t.to_member}: <strong style={{ color: "#34d399" }}>{t.amount?.toLocaleString()} {t.currency}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* Modal Footer */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", borderTop: "1px solid rgba(255, 255, 255, 0.1)", paddingTop: "1.25rem" }}>
            <button
              onClick={onClose}
              style={{
                background: "linear-gradient(135deg, #4f46e5, #6366f1)",
                color: "#ffffff",
                border: "none",
                padding: "0.65rem 1.75rem",
                borderRadius: "10px",
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(79, 70, 229, 0.4)",
              }}
            >
              Close AI Evaluation
            </button>
          </div>

        </div>
      </div>

      {/* Itemized Cost & Vehicle Details Popup Modal */}
      {showDetailedBreakdown && budget && (
        <BudgetItemizedBreakdownModal
          budget={budget}
          destinationName={trip.destination}
          tripDays={tp?.trip_days || 3}
          groupSize={split?.member_count || 1}
          onClose={() => setShowDetailedBreakdown(false)}
        />
      )}
    </div>
  );
};
