import React, { useState, useEffect } from "react";
import { Trip } from "../types";
import { getDestinationImage } from "../utils/helpers";
import {
  MapPinIcon,
  CalendarIcon,
  CarIcon,
  UtensilsIcon,
  HotelIcon,
  CompassIcon,
  SparklesIcon,
  ShieldCheckIcon,
} from "./Icons";

interface TripSuggestedListingsModalProps {
  trip: Trip;
  onClose: () => void;
  onUpdateTripPlanning?: (tripId: string, updatedPlanning: any) => Promise<void>;
}

export const TripSuggestedListingsModal: React.FC<TripSuggestedListingsModalProps> = ({
  trip,
  onClose,
  onUpdateTripPlanning,
}) => {
  // Parse planning details
  let initialPlanning: any = null;
  if (trip.planningDetailsJson) {
    try {
      initialPlanning = JSON.parse(trip.planningDetailsJson);
    } catch {
      initialPlanning = null;
    }
  }

  const existingSuggestions =
    initialPlanning?.wizardAiSuggestions ||
    (initialPlanning?.suggestedListings
      ? { suggested_listings: initialPlanning.suggestedListings }
      : null);

  const [activeTab, setActiveTab] = useState<"ALL" | "ACCOM" | "REST" | "VEHICLES" | "PLACES">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any | null>(existingSuggestions);
  const [savedLocally, setSavedLocally] = useState(false);

  // If no suggestions exist in the trip, fetch automatically on open
  useEffect(() => {
    if (!existingSuggestions) {
      fetchSuggestions();
    }
  }, [trip.id]);

  async function fetchSuggestions() {
    setLoading(true);
    setError(null);
    try {
      const aiUrl =
        (import.meta.env.VITE_AI_URL || "http://localhost:8000") +
        "/agents/wizard-suggestions";

      const destination = trip.destination || initialPlanning?.destination || "Sri Lanka";
      const startingPoint = trip.startingPoint || initialPlanning?.startingPoint || "Colombo";
      const startDate = trip.startDate || new Date().toISOString().split("T")[0];
      const endDate = trip.endDate || new Date().toISOString().split("T")[0];
      const travelMethod = trip.travelMethod || initialPlanning?.travelMethod || "PRIVATE_VEHICLE";
      const vehicleType =
        trip.travelVehicleType ||
        initialPlanning?.rentalVehicleType ||
        initialPlanning?.publicTransportType ||
        "Car";
      const totalBudget = parseFloat(initialPlanning?.totalBudget || "0") || 50000;
      const currency = initialPlanning?.currency || "LKR";

      const payload = {
        name: trip.name || `${destination} Tour`,
        destination: destination,
        starting_point: startingPoint,
        start_date: startDate,
        end_date: endDate,
        travel_method: travelMethod,
        vehicle_type: vehicleType,
        with_driver: Boolean(initialPlanning?.withDriver),
        total_budget: totalBudget,
        currency: currency,
        trip_mode: initialPlanning?.tripMode || "SOLO",
        group_members: Array.isArray(initialPlanning?.groupMembers)
          ? initialPlanning.groupMembers
          : [],
        interests: Array.isArray(initialPlanning?.interests)
          ? initialPlanning.interests
          : [],
        must_visit_places: initialPlanning?.mustVisitPlaces || "",
        daily_time_limit: parseFloat(initialPlanning?.dailyTimeLimit || "8") || 8,
        high_risk_activities: Array.isArray(initialPlanning?.highRiskActivities)
          ? initialPlanning.highRiskActivities
          : [],
        split_strategy: initialPlanning?.splitStrategy || "EQUAL",
      };

      const resp = await fetch(aiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`AI Service returned error: ${errText}`);
      }

      const result = await resp.json();
      setSuggestions(result);

      // Save into trip planningDetailsJson so it is permanently cached
      if (onUpdateTripPlanning) {
        const updatedPlanning = {
          ...(initialPlanning || {}),
          wizardAiSuggestions: result,
          suggestedListings: result.suggested_listings,
        };
        await onUpdateTripPlanning(trip.id, updatedPlanning);
        setSavedLocally(true);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load suggested listings from AI service.");
    } finally {
      setLoading(false);
    }
  }

  const listings = suggestions?.suggested_listings || {};
  const accoms = listings.accommodations || [];
  const rests = listings.restaurants || [];
  const vehs = listings.rental_vehicles || [];
  const places = listings.visiting_places || [];

  const totalCount = accoms.length + rests.length + vehs.length + places.length;

  // Filter listings based on search query
  const q = searchQuery.trim().toLowerCase();
  const filteredAccoms = accoms.filter(
    (a: any) =>
      !q ||
      a.name?.toLowerCase().includes(q) ||
      a.type?.toLowerCase().includes(q) ||
      a.location?.toLowerCase().includes(q)
  );
  const filteredRests = rests.filter(
    (r: any) =>
      !q ||
      r.name?.toLowerCase().includes(q) ||
      r.location?.toLowerCase().includes(q) ||
      r.dishes?.some((d: any) => d.name?.toLowerCase().includes(q))
  );
  const filteredVehs = vehs.filter(
    (v: any) =>
      !q ||
      v.vehicle_model?.toLowerCase().includes(q) ||
      v.vehicle_type?.toLowerCase().includes(q) ||
      v.provider_name?.toLowerCase().includes(q)
  );
  const filteredPlaces = places.filter(
    (p: any) =>
      !q ||
      p.name?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.location?.toLowerCase().includes(q)
  );

  const bgImage = getDestinationImage(trip.destination, "Trip");

  return (
    <div
      className="modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        className="modal-content trip-wizard-modal"
        style={{
          maxWidth: "1050px",
          width: "96vw",
          maxHeight: "92vh",
          overflowY: "auto",
          background: "linear-gradient(145deg, #0f172a, #0b1120)",
          border: "1px solid rgba(56, 189, 248, 0.25)",
          borderRadius: "18px",
          padding: "28px",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 25px rgba(56, 189, 248, 0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "16px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            paddingBottom: "18px",
            marginBottom: "20px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
              <span
                style={{
                  background: "linear-gradient(135deg, rgba(14, 165, 233, 0.2), rgba(2, 132, 199, 0.35))",
                  border: "1px solid rgba(56, 189, 248, 0.5)",
                  color: "#38bdf8",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: 800,
                  letterSpacing: "0.5px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <SparklesIcon size={14} color="#38bdf8" /> AI Wizard Suggested Listings
              </span>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                📍 {trip.destination || "Sri Lanka"}
              </span>
              {savedLocally && (
                <span
                  style={{
                    background: "rgba(34, 197, 94, 0.15)",
                    border: "1px solid rgba(34, 197, 94, 0.35)",
                    color: "#4ade80",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}
                >
                  ✓ Saved to Trip
                </span>
              )}
            </div>
            <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#f8fafc" }}>
              {trip.name}
            </h2>
            <div style={{ fontSize: "13px", color: "#94a3b8", marginTop: 4, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <span>📅 {trip.startDate} → {trip.endDate}</span>
              {trip.startingPoint && <span>🚩 Start: {trip.startingPoint}</span>}
              {trip.travelMethod && (
                <span>
                  🚗 {trip.travelMethod === "PRIVATE_VEHICLE" ? "Private Vehicle" : trip.travelMethod === "RENTAL_VEHICLE" ? `Rental (${trip.travelVehicleType || 'Car'})` : `Public Transport (${trip.travelVehicleType || 'Bus'})`}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={fetchSuggestions}
              disabled={loading}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                padding: "6px 12px",
              }}
              title="Re-run AI Suggestion Agent"
            >
              🔄 {loading ? "Analyzing..." : "Refresh Listings"}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "none",
                color: "#94a3b8",
                width: 36,
                height: 36,
                borderRadius: "50%",
                cursor: "pointer",
                fontSize: 18,
                display: "grid",
                placeItems: "center",
                transition: "all 0.2s",
              }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                border: "3px solid rgba(56, 189, 248, 0.2)",
                borderTopColor: "#38bdf8",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <div style={{ fontSize: 16, fontWeight: 700, color: "#f8fafc" }}>
              Consulting Wizard Suggestion Agent...
            </div>
            <div style={{ fontSize: 13, color: "#94a3b8", maxWidth: 460 }}>
              Searching verified accommodations, restaurant partners, rental vehicle fleet, and visiting sights for <strong>{trip.destination}</strong>.
            </div>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div
            style={{
              padding: "20px",
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              borderRadius: "12px",
              color: "#f87171",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <strong>Error:</strong> {error}
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={fetchSuggestions}
              style={{ borderColor: "rgba(239, 68, 68, 0.5)", color: "#ffffff" }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Content Body */}
        {!loading && !error && suggestions && (
          <>
            {/* Readiness & Summary Banner */}
            <div
              style={{
                padding: "16px 20px",
                borderRadius: "12px",
                background: "rgba(15, 23, 42, 0.85)",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
                marginBottom: "20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                {suggestions.readiness_score !== undefined && (
                  <div
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: "50%",
                      background: "rgba(34, 197, 94, 0.15)",
                      border: "3px solid #22c55e",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 900,
                      fontSize: 16,
                      color: "#22c55e",
                    }}
                  >
                    {suggestions.readiness_score}%
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: "#f8fafc" }}>
                    {suggestions.is_ready_for_admin_submission
                      ? "✅ Verified Recommendations Available"
                      : "✨ AI Suggested Partner Listings"}
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2, lineHeight: 1.4 }}>
                    {suggestions.summary ||
                      `Discovered ${totalCount} matching service provider listings tailored to your travel dates and route.`}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, padding: "4px 10px", borderRadius: 8, background: "rgba(56, 189, 248, 0.15)", border: "1px solid rgba(56, 189, 248, 0.3)", color: "#38bdf8", fontWeight: 700 }}>
                  🏨 {accoms.length} Stays
                </span>
                <span style={{ fontSize: 12, padding: "4px 10px", borderRadius: 8, background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.3)", color: "#fbbf24", fontWeight: 700 }}>
                  🍽️ {rests.length} Dining
                </span>
                <span style={{ fontSize: 12, padding: "4px 10px", borderRadius: 8, background: "rgba(168, 85, 247, 0.15)", border: "1px solid rgba(168, 85, 247, 0.3)", color: "#c084fc", fontWeight: 700 }}>
                  🚗 {vehs.length} Vehicles
                </span>
                <span style={{ fontSize: 12, padding: "4px 10px", borderRadius: 8, background: "rgba(34, 197, 94, 0.15)", border: "1px solid rgba(34, 197, 94, 0.3)", color: "#4ade80", fontWeight: 700 }}>
                  🏛️ {places.length} Sights
                </span>
              </div>
            </div>

            {/* Filter Tabs & Search Row */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className={`btn btn-small ${activeTab === "ALL" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setActiveTab("ALL")}
                  style={{ fontSize: 12, padding: "5px 12px", borderRadius: 8 }}
                >
                  All Listings ({totalCount})
                </button>
                <button
                  type="button"
                  className={`btn btn-small ${activeTab === "ACCOM" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setActiveTab("ACCOM")}
                  style={{ fontSize: 12, padding: "5px 12px", borderRadius: 8 }}
                >
                  🏨 Stays ({accoms.length})
                </button>
                <button
                  type="button"
                  className={`btn btn-small ${activeTab === "REST" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setActiveTab("REST")}
                  style={{ fontSize: 12, padding: "5px 12px", borderRadius: 8 }}
                >
                  🍽️ Food ({rests.length})
                </button>
                <button
                  type="button"
                  className={`btn btn-small ${activeTab === "VEHICLES" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setActiveTab("VEHICLES")}
                  style={{ fontSize: 12, padding: "5px 12px", borderRadius: 8 }}
                >
                  🚗 Vehicles ({vehs.length})
                </button>
                <button
                  type="button"
                  className={`btn btn-small ${activeTab === "PLACES" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setActiveTab("PLACES")}
                  style={{ fontSize: 12, padding: "5px 12px", borderRadius: 8 }}
                >
                  🏛️ Sights ({places.length})
                </button>
              </div>

              {/* Search box */}
              <div style={{ minWidth: 220, flex: "0 1 260px" }}>
                <input
                  type="text"
                  placeholder="🔍 Search listings, dishes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "7px 12px",
                    borderRadius: 8,
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#f8fafc",
                    fontSize: 12,
                  }}
                />
              </div>
            </div>

            {/* Listings Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: 16,
              }}
            >
              {/* Accommodations */}
              {(activeTab === "ALL" || activeTab === "ACCOM") &&
                filteredAccoms.map((a: any, idx: number) => (
                  <div
                    key={`accom-${idx}`}
                    style={{
                      padding: "16px",
                      borderRadius: 12,
                      background: "rgba(15, 23, 42, 0.75)",
                      border: "1px solid rgba(56, 189, 248, 0.3)",
                      fontSize: 12,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                      <strong style={{ color: "#38bdf8", fontSize: 14 }}>🏨 {a.name}</strong>
                      <span
                        style={{
                          fontSize: 10,
                          background: "rgba(56,189,248,0.15)",
                          color: "#38bdf8",
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontWeight: 700,
                        }}
                      >
                        {a.type || "Hotel"}
                      </span>
                    </div>

                    <div style={{ color: "#4ade80", fontWeight: 800, fontSize: 15 }}>
                      ~Rs. {Number(a.price_per_night || 0).toLocaleString()}{" "}
                      <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-muted)" }}>/ night</span>
                    </div>

                    {a.location && (
                      <div style={{ color: "#94a3b8", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                        📍 {a.location}
                      </div>
                    )}

                    {a.contact_number && (
                      <div style={{ color: "#fbbf24", fontSize: 12 }}>
                        📞 <a href={`tel:${a.contact_number}`} style={{ color: "inherit", textDecoration: "none" }}>{a.contact_number}</a>
                      </div>
                    )}

                    {a.amenities && (
                      <div style={{ fontSize: 11, color: "#cbd5e1", lineHeight: 1.4 }}>
                        ✨ <em>{a.amenities}</em>
                      </div>
                    )}

                    {a.special_notes && (
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>
                        ℹ️ {a.special_notes}
                      </div>
                    )}

                    <div
                      style={{
                        fontSize: 10,
                        color: "#64748b",
                        borderTop: "1px dashed rgba(255,255,255,0.08)",
                        paddingTop: 6,
                        marginTop: "auto",
                      }}
                    >
                      ✓ {a.source || "Verified Partner Listing"}
                    </div>
                  </div>
                ))}

              {/* Restaurants & Dishes */}
              {(activeTab === "ALL" || activeTab === "REST") &&
                filteredRests.map((r: any, idx: number) => (
                  <div
                    key={`rest-${idx}`}
                    style={{
                      padding: "16px",
                      borderRadius: 12,
                      background: "rgba(15, 23, 42, 0.75)",
                      border: "1px solid rgba(245, 158, 11, 0.3)",
                      fontSize: 12,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                      <strong style={{ color: "#fbbf24", fontSize: 14 }}>🍽️ {r.name}</strong>
                      <span
                        style={{
                          fontSize: 10,
                          background: "rgba(245,158,11,0.15)",
                          color: "#fbbf24",
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontWeight: 700,
                        }}
                      >
                        Dining Partner
                      </span>
                    </div>

                    {r.location && <div style={{ color: "#94a3b8", fontSize: 12 }}>📍 {r.location}</div>}
                    {r.contact && <div style={{ color: "#fbbf24", fontSize: 12 }}>📞 {r.contact}</div>}
                    {r.description && <div style={{ fontSize: 11, color: "#cbd5e1" }}>{r.description}</div>}

                    {/* Dishes sub-list */}
                    {r.dishes && r.dishes.length > 0 && (
                      <div
                        style={{
                          background: "rgba(0,0,0,0.25)",
                          borderRadius: 8,
                          padding: "8px 10px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                          marginTop: 4,
                        }}
                      >
                        <span style={{ fontSize: 10, fontWeight: 800, color: "#f59e0b", textTransform: "uppercase" }}>
                          🍛 Suggested Local Dishes:
                        </span>
                        {r.dishes.map((d: any, dIdx: number) => (
                          <div
                            key={dIdx}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: 11,
                              color: "#e2e8f0",
                            }}
                          >
                            <span>• {d.name}</span>
                            <span style={{ color: "#4ade80", fontWeight: 700 }}>
                              Rs. {Number(d.price || 0).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div
                      style={{
                        fontSize: 10,
                        color: "#64748b",
                        borderTop: "1px dashed rgba(255,255,255,0.08)",
                        paddingTop: 6,
                        marginTop: "auto",
                      }}
                    >
                      ✓ {r.source || "Verified Partner Restaurant"}
                    </div>
                  </div>
                ))}

              {/* Rental Vehicles */}
              {(activeTab === "ALL" || activeTab === "VEHICLES") &&
                filteredVehs.map((v: any, idx: number) => (
                  <div
                    key={`veh-${idx}`}
                    style={{
                      padding: "16px",
                      borderRadius: 12,
                      background: "rgba(15, 23, 42, 0.75)",
                      border: "1px solid rgba(168, 85, 247, 0.3)",
                      fontSize: 12,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                      <strong style={{ color: "#c084fc", fontSize: 14 }}>
                        🚗 {v.vehicle_model} {v.manufacturing_year ? `(${v.manufacturing_year})` : ""}
                      </strong>
                      <span
                        style={{
                          fontSize: 10,
                          background: "rgba(168,85,247,0.15)",
                          color: "#c084fc",
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontWeight: 700,
                        }}
                      >
                        {v.vehicle_type || "Vehicle"}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", color: "#e2e8f0" }}>
                      <div>
                        Rate: <strong style={{ color: "#4ade80" }}>Rs. {v.rate_per_km}/km</strong>
                      </div>
                      {v.extra_charge_per_night > 0 && (
                        <div>
                          Overnight: <strong style={{ color: "#fbbf24" }}>Rs. {Number(v.extra_charge_per_night).toLocaleString()}/night</strong>
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: 10, fontSize: 11, color: "#94a3b8" }}>
                      <span>👥 {v.seating_capacity || 4} Passengers</span>
                      <span>•</span>
                      <span>{v.driver_included ? "👨‍✈️ Driver Included" : "🔑 Self-Drive"}</span>
                    </div>

                    {v.owner_contact_phone && (
                      <div style={{ color: "#fbbf24", fontSize: 12 }}>
                        📞 Partner: <a href={`tel:${v.owner_contact_phone}`} style={{ color: "inherit", textDecoration: "none" }}>{v.owner_contact_phone}</a>
                      </div>
                    )}

                    <div
                      style={{
                        fontSize: 10,
                        color: "#64748b",
                        borderTop: "1px dashed rgba(255,255,255,0.08)",
                        paddingTop: 6,
                        marginTop: "auto",
                      }}
                    >
                      ✓ {v.provider_name || v.source || "Fleet Partner"}
                    </div>
                  </div>
                ))}

              {/* Visiting Places */}
              {(activeTab === "ALL" || activeTab === "PLACES") &&
                filteredPlaces.map((p: any, idx: number) => (
                  <div
                    key={`place-${idx}`}
                    style={{
                      padding: "16px",
                      borderRadius: 12,
                      background: "rgba(15, 23, 42, 0.75)",
                      border: "1px solid rgba(34, 197, 94, 0.3)",
                      fontSize: 12,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                      <strong style={{ color: "#4ade80", fontSize: 14 }}>🏛️ {p.name}</strong>
                      <span
                        style={{
                          fontSize: 10,
                          background: "rgba(34,197,94,0.15)",
                          color: "#4ade80",
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontWeight: 700,
                        }}
                      >
                        {p.ticket_type || "Attraction"}
                      </span>
                    </div>

                    {p.location && <div style={{ color: "#94a3b8", fontSize: 12 }}>📍 {p.location}</div>}
                    {p.description && <div style={{ fontSize: 11, color: "#cbd5e1", lineHeight: 1.4 }}>{p.description}</div>}

                    <div style={{ color: "#fbbf24", fontWeight: 700, marginTop: 2 }}>
                      Admission:{" "}
                      {p.ticket_price && p.ticket_price > 0
                        ? `Rs. ${Number(p.ticket_price).toLocaleString()}`
                        : "Free / Standard"}
                    </div>

                    <div
                      style={{
                        fontSize: 10,
                        color: "#64748b",
                        borderTop: "1px dashed rgba(255,255,255,0.08)",
                        paddingTop: 6,
                        marginTop: "auto",
                      }}
                    >
                      ✓ {p.source || "Recommended Attraction"}
                    </div>
                  </div>
                ))}
            </div>

            {/* Empty state when search yields nothing */}
            {totalCount > 0 &&
              filteredAccoms.length === 0 &&
              filteredRests.length === 0 &&
              filteredVehs.length === 0 &&
              filteredPlaces.length === 0 && (
                <div
                  style={{
                    padding: "36px",
                    textAlign: "center",
                    color: "#94a3b8",
                    fontSize: 13,
                  }}
                >
                  🔍 No listings matched your search query "{searchQuery}".
                </div>
              )}

            {totalCount === 0 && (
              <div
                style={{
                  padding: "36px",
                  textAlign: "center",
                  color: "#94a3b8",
                  fontSize: 13,
                }}
              >
                No specific partner listings matched this destination yet. Try clicking "Refresh Listings" to ask the AI Suggestion Agent to search broader locations.
              </div>
            )}
          </>
        )}

        {/* Modal Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "24px",
            paddingTop: "16px",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 12, color: "#94a3b8" }}>
            💡 Provided by <strong>TravelWise AI Suggestion Agent</strong> & Registered Service Providers
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{ padding: "8px 20px" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
