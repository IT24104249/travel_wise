import React, { useState, useEffect } from "react";
import { Role, RentalVehicleListing, RentalVehicleCategory, CreateRentalVehicleDraft } from "../types";
import { apiRequest } from "../utils/api";
import { CarIcon, ClockIcon, BotIcon, EditIcon, PlusIcon } from "./Icons";

interface RentalVehiclesPortalProps {
  role: Role;
  userId?: string;
  userEmail?: string;
  initialTab?: "fleet" | "pending" | "add" | "rates";
  onVehicleCountChange?: (pendingCount: number) => void;
}

export const RentalVehiclesPortal: React.FC<RentalVehiclesPortalProps> = ({
  role,
  userId = "",
  userEmail = "",
  initialTab = "fleet",
  onVehicleCountChange,
}) => {
  const isAdmin = role === "StaffAdmin";
  const isProvider = role === "ServiceProvider";

  // Navigation tab
  const [activeTab, setActiveTab] = useState<"fleet" | "pending" | "add" | "rates">(initialTab);
  const [categoryFilter, setCategoryFilter] = useState<RentalVehicleCategory | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Data states
  const [vehicles, setVehicles] = useState<RentalVehicleListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Rate summary from backend (AI consumption view)
  const [ratesSummary, setRatesSummary] = useState<any[]>([]);
  const [loadingRates, setLoadingRates] = useState(false);

  // Add / Edit Modal or Form state
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formDraft, setFormDraft] = useState<CreateRentalVehicleDraft>({
    vehicleType: "Car",
    vehicleModel: "",
    manufacturingYear: new Date().getFullYear().toString(),
    ownerContactPhone: "",
    ratePerKm: "120",
    extraChargePerNight: "2000",
    location: "Colombo",
    description: "",
    imageUrl: "",
    driverIncluded: true,
    seatingCapacity: "4",
  });

  // Admin Review Modal state
  const [reviewingVehicle, setReviewingVehicle] = useState<RentalVehicleListing | null>(null);
  const [reviewDecision, setReviewDecision] = useState<"Approve" | "Reject">("Approve");
  const [reviewNote, setReviewNote] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Delete modal state
  const [vehicleToDelete, setVehicleToDelete] = useState<RentalVehicleListing | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load vehicles
  const loadVehicles = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await apiRequest<RentalVehicleListing[]>(
        "/api/rental-vehicles",
        { method: "GET" },
        role,
        userId
      );
      const list = Array.isArray(data) ? data : [];
      setVehicles(list);

      const pendingCount = list.filter((v) => v.status === "PendingReview").length;
      if (onVehicleCountChange) {
        onVehicleCountChange(pendingCount);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load rental vehicles.");
    } finally {
      setLoading(false);
    }
  };

  // Load AI Rate Summary
  const loadRatesSummary = async () => {
    setLoadingRates(true);
    try {
      const data = await apiRequest<any>(
        "/api/rental-vehicles/rates-summary",
        { method: "GET" },
        role,
        userId
      );
      if (data && Array.isArray(data.rates)) {
        setRatesSummary(data.rates);
      }
    } catch {
      // Graceful fallback
    } finally {
      setLoadingRates(false);
    }
  };

  useEffect(() => {
    loadVehicles();
    loadRatesSummary();
  }, []);

  // Filter listings
  const filteredVehicles = vehicles.filter((v) => {
    // Tab filter
    if (activeTab === "fleet") {
      if (v.status !== "Approved") return false;
    } else if (activeTab === "pending") {
      if (v.status === "Approved") return false;
    }

    // Category filter
    if (categoryFilter !== "ALL" && v.vehicleType !== categoryFilter) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        v.vehicleModel.toLowerCase().includes(q) ||
        v.vehicleType.toLowerCase().includes(q) ||
        v.location.toLowerCase().includes(q) ||
        v.ownerContactPhone.includes(q) ||
        (v.providerName && v.providerName.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  });

  const pendingCount = vehicles.filter((v) => v.status === "PendingReview").length;
  const approvedCount = vehicles.filter((v) => v.status === "Approved").length;

  // Handle Form Submit
  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validation
    const year = parseInt(formDraft.manufacturingYear);
    const rate = parseFloat(formDraft.ratePerKm);
    const nightCharge = parseFloat(formDraft.extraChargePerNight);
    const seats = parseInt(formDraft.seatingCapacity) || 4;

    if (!formDraft.vehicleModel.trim()) {
      setErrorMsg("Please enter the vehicle model name (e.g., Toyota KDH, Honda Dio, Bajaj RE).");
      return;
    }
    if (isNaN(year) || year < 1990 || year > new Date().getFullYear() + 1) {
      setErrorMsg(`Please enter a valid manufacturing year between 1990 and ${new Date().getFullYear() + 1}.`);
      return;
    }
    if (!formDraft.ownerContactPhone.trim() || formDraft.ownerContactPhone.length < 9) {
      setErrorMsg("Please provide a valid vehicle owner mobile contact number.");
      return;
    }
    if (isNaN(rate) || rate <= 0) {
      setErrorMsg("Please enter a valid rate per kilometer (Rs.).");
      return;
    }
    if (isNaN(nightCharge) || nightCharge < 0) {
      setErrorMsg("Please enter a valid extra charge per night (Rs.).");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        vehicleType: formDraft.vehicleType,
        vehicleModel: formDraft.vehicleModel.trim(),
        manufacturingYear: year,
        ownerContactPhone: formDraft.ownerContactPhone.trim(),
        ratePerKm: rate,
        extraChargePerNight: nightCharge,
        location: formDraft.location.trim() || "Sri Lanka",
        description: formDraft.description.trim(),
        imageUrl: formDraft.imageUrl.trim(),
        driverIncluded: formDraft.driverIncluded,
        seatingCapacity: seats,
      };

      if (editingVehicleId) {
        await apiRequest(
          `/api/rental-vehicles/${editingVehicleId}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          },
          role,
          userId
        );
        setSuccessMsg(
          isAdmin
            ? "Vehicle listing updated successfully!"
            : "Vehicle updated! Sent for Admin re-verification before going live."
        );
      } else {
        await apiRequest(
          "/api/rental-vehicles",
          {
            method: "POST",
            body: JSON.stringify(payload),
          },
          role,
          userId
        );
        setSuccessMsg(
          isAdmin
            ? "Vehicle listing created and approved immediately!"
            : "Vehicle listing successfully submitted! It is now pending Admin verification."
        );
      }

      // Reset form
      setEditingVehicleId(null);
      setFormDraft({
        vehicleType: "Car",
        vehicleModel: "",
        manufacturingYear: new Date().getFullYear().toString(),
        ownerContactPhone: "",
        ratePerKm: "120",
        extraChargePerNight: "2000",
        location: "Colombo",
        description: "",
        imageUrl: "",
        driverIncluded: true,
        seatingCapacity: "4",
      });

      await loadVehicles();
      await loadRatesSummary();
      setActiveTab(isAdmin ? "fleet" : "pending");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save rental vehicle listing.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Start Edit
  const handleStartEdit = (v: RentalVehicleListing) => {
    setEditingVehicleId(v.id);
    setFormDraft({
      vehicleType: v.vehicleType,
      vehicleModel: v.vehicleModel,
      manufacturingYear: v.manufacturingYear.toString(),
      ownerContactPhone: v.ownerContactPhone,
      ratePerKm: v.ratePerKm.toString(),
      extraChargePerNight: v.extraChargePerNight.toString(),
      location: v.location,
      description: v.description || "",
      imageUrl: v.imageUrl || "",
      driverIncluded: v.driverIncluded,
      seatingCapacity: (v.seatingCapacity || 4).toString(),
    });
    setActiveTab("add");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Admin Review Submit
  const handleReviewSubmit = async () => {
    if (!reviewingVehicle) return;
    setSubmittingReview(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await apiRequest(
        `/api/rental-vehicles/${reviewingVehicle.id}/review`,
        {
          method: "POST",
          body: JSON.stringify({
            decision: reviewDecision,
            adminFeedback: reviewNote.trim() || undefined,
          }),
        },
        role,
        userId
      );
      setSuccessMsg(
        reviewDecision === "Approve"
          ? `Listing for "${reviewingVehicle.vehicleModel}" approved! AI agents can now use its rates.`
          : `Listing for "${reviewingVehicle.vehicleModel}" was rejected with feedback.`
      );
      setReviewingVehicle(null);
      setReviewNote("");
      await loadVehicles();
      await loadRatesSummary();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit vehicle review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  // Delete vehicle
  const handleDeleteConfirm = async () => {
    if (!vehicleToDelete) return;
    setDeleting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await apiRequest(
        `/api/rental-vehicles/${vehicleToDelete.id}`,
        { method: "DELETE" },
        role,
        userId
      );
      setSuccessMsg(`Vehicle "${vehicleToDelete.vehicleModel}" has been removed.`);
      setVehicleToDelete(null);
      await loadVehicles();
      await loadRatesSummary();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete vehicle.");
    } finally {
      setDeleting(false);
    }
  };

  // Vehicle Category Icon Helper
  const getCategoryIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "bike":
        return "🏍️";
      case "car":
        return "🚗";
      case "van":
        return "🚐";
      case "bus":
        return "🚌";
      case "tuktuk":
      case "tuk tuk":
      case "three-wheeler":
        return "🛺";
      default:
        return "🚙";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* 1. HERO & ACTION BANNER */}
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 41, 59, 0.85) 100%)",
          border: "1px solid rgba(20, 184, 166, 0.35)",
          borderRadius: 16,
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
          padding: "24px 28px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 32 }}>🚗</span>
              <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: "var(--text-main)" }}>
                Rental Vehicles & Fleet Management
              </h2>
              <span className="badge badge-primary" style={{ fontSize: 12, padding: "4px 10px" }}>
                AI-Integrated Rates
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", maxWidth: 700, lineHeight: 1.5 }}>
              Register and manage verified rental vehicle listings with per-kilometer rates and overnight tour charges.
              All approved rates directly power TravelWise AI Budget and Trip Planner calculations!
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              className={`btn ${activeTab === "add" ? "btn-primary" : "btn-accent"}`}
              onClick={() => {
                setEditingVehicleId(null);
                setFormDraft({
                  vehicleType: "Car",
                  vehicleModel: "",
                  manufacturingYear: new Date().getFullYear().toString(),
                  ownerContactPhone: "",
                  ratePerKm: "120",
                  extraChargePerNight: "2000",
                  location: "Colombo",
                  description: "",
                  imageUrl: "",
                  driverIncluded: true,
                  seatingCapacity: "4",
                });
                setActiveTab("add");
              }}
              style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}
            >
              <span>➕</span> Register Rental Vehicle
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                loadVehicles();
                loadRatesSummary();
              }}
              disabled={loading}
              title="Refresh vehicle list"
            >
              <span>🔄</span> Refresh
            </button>
          </div>
        </div>

        {/* STATS OVERVIEW CARDS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            marginTop: 20,
            paddingTop: 18,
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(255, 255, 255, 0.06)" }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Active Verified Fleet</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#4ade80", marginTop: 4 }}>
              {approvedCount} Vehicles
            </div>
          </div>
          <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(255, 255, 255, 0.06)" }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Awaiting Admin Approval</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: pendingCount > 0 ? "#fbbf24" : "var(--text-soft)", marginTop: 4 }}>
              {pendingCount} Pending
            </div>
          </div>
          <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(255, 255, 255, 0.06)" }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>AI Live Benchmark Categories</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--brand-teal-light)", marginTop: 4 }}>
              {ratesSummary.length} Supported
            </div>
          </div>
        </div>
      </div>

      {/* ALERTS */}
      {errorMsg && (
        <div className="alert alert-danger" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span>⚠️</span>
          <span style={{ flex: 1 }}>{errorMsg}</span>
          <button style={{ background: "none", border: "none", color: "inherit", cursor: "pointer" }} onClick={() => setErrorMsg(null)}>✕</button>
        </div>
      )}
      {successMsg && (
        <div className="alert alert-success" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span>✅</span>
          <span style={{ flex: 1 }}>{successMsg}</span>
          <button style={{ background: "none", border: "none", color: "inherit", cursor: "pointer" }} onClick={() => setSuccessMsg(null)}>✕</button>
        </div>
      )}

      {/* 2. TABS & FILTER BAR */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
        <div className="tabs-bar" style={{ margin: 0 }}>
          <button
            className={`tab-item ${activeTab === "fleet" ? "active" : ""}`}
            onClick={() => setActiveTab("fleet")}
            style={{ display: "flex", alignItems: "center", gap: 7 }}
          >
            <CarIcon size={15} />
            <span>Approved Fleet</span>
            <span className="badge badge-success" style={{ fontSize: 11, padding: "2px 7px" }}>{approvedCount}</span>
          </button>
          <button
            className={`tab-item ${activeTab === "pending" ? "active" : ""}`}
            onClick={() => setActiveTab("pending")}
            style={{ display: "flex", alignItems: "center", gap: 7 }}
          >
            <ClockIcon size={15} />
            <span>Verification Queue</span>
            {pendingCount > 0 && (
              <span className="badge badge-warning" style={{ fontSize: 11, padding: "2px 7px" }}>{pendingCount}</span>
            )}
          </button>
          <button
            className={`tab-item ${activeTab === "rates" ? "active" : ""}`}
            onClick={() => setActiveTab("rates")}
            style={{ display: "flex", alignItems: "center", gap: 7 }}
          >
            <BotIcon size={15} />
            <span>AI Rates Benchmark</span>
          </button>
          <button
            className={`tab-item ${activeTab === "add" ? "active" : ""}`}
            onClick={() => setActiveTab("add")}
            style={{ display: "flex", alignItems: "center", gap: 7 }}
          >
            {editingVehicleId ? <EditIcon size={15} /> : <PlusIcon size={15} />}
            <span>{editingVehicleId ? "Edit Vehicle" : "Add Vehicle"}</span>
          </button>
        </div>

        {/* SEARCH & CATEGORY FILTER (VISIBLE ON FLEET & PENDING TABS) */}
        {(activeTab === "fleet" || activeTab === "pending") && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="text"
              placeholder="Search model, location, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-control"
              style={{ width: 230, padding: "7px 12px", fontSize: 13 }}
            />
            <div style={{ display: "flex", gap: 4 }}>
              {(["ALL", "Bike", "Car", "Van", "Bus", "TukTuk"] as const).map((cat) => (
                <button
                  key={cat}
                  className={`btn btn-sm ${categoryFilter === cat ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setCategoryFilter(cat)}
                  style={{ fontSize: 12, padding: "5px 10px" }}
                >
                  {cat === "ALL" ? "All" : `${getCategoryIcon(cat)} ${cat}`}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. TAB CONTENT */}

      {/* TAB A: ADD / EDIT VEHICLE FORM */}
      {activeTab === "add" && (
        <section
          className="card"
          style={{
            background: "rgba(15, 23, 42, 0.7)",
            border: "1px solid rgba(20, 184, 166, 0.3)",
            borderRadius: 16,
            padding: 24,
          }}
        >
          <div className="card-header" style={{ marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: "var(--brand-teal-light)" }}>
                {editingVehicleId ? "✏️ Edit Rental Vehicle Listing" : "🚗 Register New Rental Vehicle Listing"}
              </h3>
              <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "var(--text-muted)" }}>
                Fill in the official details required by TravelWise. Once submitted, our Admin team will review and verify your listing.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveVehicle} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 }}>
              {/* 1. Vehicle Type Selection */}
              <div className="form-group">
                <label style={{ fontWeight: 600, color: "var(--text-main)", marginBottom: 6, display: "block" }}>
                  1. Vehicle Type <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <select
                  className="form-control"
                  value={formDraft.vehicleType}
                  onChange={(e) => setFormDraft({ ...formDraft, vehicleType: e.target.value })}
                  required
                >
                  <option value="Bike">🏍️ Bike (Motorcycle / Scooter)</option>
                  <option value="Car">🚗 Car (Sedan / Hatchback / SUV)</option>
                  <option value="Van">🚐 Van (Mini-van / High-Roof KDH / Caravan)</option>
                  <option value="Bus">🚌 Bus (Mini-bus / Coach / 29-45 Seater)</option>
                  <option value="TukTuk">🛺 Tuk Tuk (Three-Wheeler)</option>
                </select>
                <small style={{ color: "var(--text-muted)", fontSize: 11 }}>
                  Select the primary vehicle category matching user travel requirements.
                </small>
              </div>

              {/* 2. Vehicle Model */}
              <div className="form-group">
                <label style={{ fontWeight: 600, color: "var(--text-main)", marginBottom: 6, display: "block" }}>
                  Vehicle Make & Model <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Toyota KDH Super GL, Bajaj RE 4S, Honda Dio, Prius"
                  value={formDraft.vehicleModel}
                  onChange={(e) => setFormDraft({ ...formDraft, vehicleModel: e.target.value })}
                  required
                />
              </div>

              {/* 3. Manufacturing Year */}
              <div className="form-group">
                <label style={{ fontWeight: 600, color: "var(--text-main)", marginBottom: 6, display: "block" }}>
                  2. Manufacturing Year <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="e.g. 2018"
                  min={1990}
                  max={new Date().getFullYear() + 1}
                  value={formDraft.manufacturingYear}
                  onChange={(e) => setFormDraft({ ...formDraft, manufacturingYear: e.target.value })}
                  required
                />
                <small style={{ color: "var(--text-muted)", fontSize: 11 }}>
                  Year of vehicle manufacture for passenger safety evaluation.
                </small>
              </div>

              {/* 4. Owner Contact Phone */}
              <div className="form-group">
                <label style={{ fontWeight: 600, color: "var(--text-main)", marginBottom: 6, display: "block" }}>
                  3. Vehicle Owner's Mobile Number <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <input
                  type="tel"
                  className="form-control"
                  placeholder="e.g. 0771234567 or +94771234567"
                  value={formDraft.ownerContactPhone}
                  onChange={(e) => setFormDraft({ ...formDraft, ownerContactPhone: e.target.value })}
                  required
                />
                <small style={{ color: "var(--text-muted)", fontSize: 11 }}>
                  Direct phone line for bookings and verification inquiries.
                </small>
              </div>

              {/* 5. Rate Per Kilometer */}
              <div className="form-group">
                <label style={{ fontWeight: 600, color: "var(--text-main)", marginBottom: 6, display: "block" }}>
                  4. Rate per 1 Kilometer (Rs.) <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontWeight: 700 }}>
                    Rs.
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    className="form-control"
                    placeholder="e.g. 150.00"
                    value={formDraft.ratePerKm}
                    onChange={(e) => setFormDraft({ ...formDraft, ratePerKm: e.target.value })}
                    style={{ paddingLeft: 44 }}
                    required
                  />
                </div>
                <small style={{ color: "var(--text-muted)", fontSize: 11 }}>
                  Base transport tariff per km used by the AI Budget Agent.
                </small>
              </div>

              {/* 6. Extra Charge Per 1 Night */}
              <div className="form-group">
                <label style={{ fontWeight: 600, color: "var(--text-main)", marginBottom: 6, display: "block" }}>
                  5. Extra Charges per 1 Night (Rs.) <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontWeight: 700 }}>
                    Rs.
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    placeholder="e.g. 2500.00"
                    value={formDraft.extraChargePerNight}
                    onChange={(e) => setFormDraft({ ...formDraft, extraChargePerNight: e.target.value })}
                    style={{ paddingLeft: 44 }}
                    required
                  />
                </div>
                <small style={{ color: "var(--text-muted)", fontSize: 11 }}>
                  Driver stay & overnight holding surcharge for multi-day tours.
                </small>
              </div>

              {/* 7. Base Location */}
              <div className="form-group">
                <label style={{ fontWeight: 600, color: "var(--text-main)", marginBottom: 6, display: "block" }}>
                  Primary Location / Hub
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Colombo, Kandy, Galle, Ella, Negombo"
                  value={formDraft.location}
                  onChange={(e) => setFormDraft({ ...formDraft, location: e.target.value })}
                />
              </div>

              {/* 8. Seating Capacity */}
              <div className="form-group">
                <label style={{ fontWeight: 600, color: "var(--text-main)", marginBottom: 6, display: "block" }}>
                  Passenger Seating Capacity
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  className="form-control"
                  placeholder="e.g. 4"
                  value={formDraft.seatingCapacity}
                  onChange={(e) => setFormDraft({ ...formDraft, seatingCapacity: e.target.value })}
                />
              </div>
            </div>

            {/* Additional Features Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
              {/* Driver Included Checkbox */}
              <div
                style={{
                  padding: "14px 18px",
                  borderRadius: 12,
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <input
                  type="checkbox"
                  id="driverIncludedCheck"
                  checked={formDraft.driverIncluded}
                  onChange={(e) => setFormDraft({ ...formDraft, driverIncluded: e.target.checked })}
                  style={{ width: 18, height: 18, cursor: "pointer" }}
                />
                <label htmlFor="driverIncludedCheck" style={{ cursor: "pointer", fontSize: 13 }}>
                  <strong>Driver Included in Pricing</strong>
                  <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 2 }}>
                    Uncheck if this is a self-drive rental vehicle.
                  </div>
                </label>
              </div>

              {/* Image URL */}
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 600, color: "var(--text-main)", marginBottom: 6, display: "block" }}>
                  Vehicle Photo URL (Optional)
                </label>
                <input
                  type="url"
                  className="form-control"
                  placeholder="https://example.com/vehicle-photo.jpg"
                  value={formDraft.imageUrl}
                  onChange={(e) => setFormDraft({ ...formDraft, imageUrl: e.target.value })}
                />
              </div>
            </div>

            {/* Description */}
            <div className="form-group">
              <label style={{ fontWeight: 600, color: "var(--text-main)", marginBottom: 6, display: "block" }}>
                Vehicle Description & Amenities (Optional)
              </label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Air conditioned, luggage boot space, USB charging ports, English speaking tour chauffeur, etc."
                value={formDraft.description}
                onChange={(e) => setFormDraft({ ...formDraft, description: e.target.value })}
              />
            </div>

            {/* Verification Notice */}
            <div
              style={{
                padding: "14px 18px",
                borderRadius: 12,
                background: "rgba(20, 184, 166, 0.08)",
                border: "1px solid rgba(20, 184, 166, 0.25)",
                fontSize: 13,
                color: "var(--brand-teal-light)",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 24 }}>🛡️</span>
              <div>
                <strong>Administrator Review Policy:</strong>
                <div>
                  Your listing will be submitted to the Admin for tariff verification. Once approved, TravelWise AI Agents will use your rates to calculate transport estimates for travellers island-wide!
                </div>
              </div>
            </div>

            {/* Submit & Cancel Buttons */}
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
              {editingVehicleId && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setEditingVehicleId(null);
                    setActiveTab("fleet");
                  }}
                >
                  Cancel Edit
                </button>
              )}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
                style={{ padding: "10px 24px", fontWeight: 700 }}
              >
                {isSubmitting
                  ? "Saving Listing..."
                  : editingVehicleId
                  ? "Update Listing"
                  : "Submit for Admin Approval 🚀"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* TAB B: ACTIVE FLEET & PENDING QUEUE */}
      {(activeTab === "fleet" || activeTab === "pending") && (
        <div>
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🔄</div>
              <h4>Loading rental vehicle fleet...</h4>
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Fetching up-to-date listings from database.</p>
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div
              className="card"
              style={{
                textAlign: "center",
                padding: "60px 20px",
                background: "rgba(15, 23, 42, 0.4)",
                border: "1px dashed rgba(255, 255, 255, 0.15)",
                borderRadius: 16,
              }}
            >
              <div style={{ fontSize: 44, marginBottom: 12 }}>
                {activeTab === "fleet" ? "🚗" : "⏳"}
              </div>
              <h3 style={{ fontSize: 18, color: "var(--text-main)", marginBottom: 6 }}>
                {activeTab === "fleet" ? "No Approved Rental Vehicles Found" : "No Pending Listings Awaiting Review"}
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: 13, maxWidth: 500, margin: "0 auto 16px auto" }}>
                {activeTab === "fleet"
                  ? "Be the first partner to register a verified rental vehicle with custom rates."
                  : "All submitted rental vehicles have been reviewed and approved by administrators!"}
              </p>
              <button className="btn btn-primary btn-sm" onClick={() => setActiveTab("add")}>
                ➕ Register Vehicle Now
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
              {filteredVehicles.map((vehicle) => {
                const isPending = vehicle.status === "PendingReview";
                const isApproved = vehicle.status === "Approved";
                const isRejected = vehicle.status === "Rejected";

                return (
                  <div
                    key={vehicle.id}
                    className="card"
                    style={{
                      background: "rgba(15, 23, 42, 0.75)",
                      border: isPending
                        ? "1px solid rgba(245, 158, 11, 0.4)"
                        : isRejected
                        ? "1px solid rgba(239, 68, 68, 0.4)"
                        : "1px solid rgba(34, 197, 94, 0.35)",
                      borderRadius: 16,
                      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25)",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                      transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    }}
                  >
                    {/* Header Image or Graphic Header */}
                    <div
                      style={{
                        height: 120,
                        background: vehicle.imageUrl
                          ? `url(${vehicle.imageUrl}) center/cover no-repeat`
                          : "linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)",
                        position: "relative",
                        display: "flex",
                        alignItems: "flex-end",
                        padding: "12px 16px",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "linear-gradient(to top, rgba(15, 23, 42, 0.95) 0%, transparent 80%)",
                        }}
                      />

                      {/* Status Badge */}
                      <div style={{ position: "absolute", top: 12, right: 12 }}>
                        <span
                          className={`badge ${
                            isApproved ? "badge-success" : isPending ? "badge-warning" : "badge-danger"
                          }`}
                          style={{ fontSize: 11, padding: "3px 8px" }}
                        >
                          {isApproved ? "✅ Approved & Live" : isPending ? "⏳ Pending Review" : "❌ Rejected"}
                        </span>
                      </div>

                      {/* Type Badge */}
                      <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            background: "rgba(0, 0, 0, 0.6)",
                            backdropFilter: "blur(4px)",
                            padding: "4px 10px",
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 700,
                            color: "var(--brand-teal-light)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                          }}
                        >
                          {getCategoryIcon(vehicle.vehicleType)} {vehicle.vehicleType}
                        </span>
                        <span
                          style={{
                            background: "rgba(0, 0, 0, 0.6)",
                            backdropFilter: "blur(4px)",
                            padding: "4px 8px",
                            borderRadius: 8,
                            fontSize: 12,
                            color: "var(--text-soft)",
                          }}
                        >
                          📅 {vehicle.manufacturingYear}
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
                      <div>
                        <h4 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "var(--text-main)" }}>
                          {vehicle.vehicleModel}
                        </h4>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
                          <span>📍 {vehicle.location || "Island-wide"}</span>
                          <span>•</span>
                          <span>👥 {vehicle.seatingCapacity || 4} Seats</span>
                          <span>•</span>
                          <span>{vehicle.driverIncluded ? "👨‍✈️ Driver Included" : "🔑 Self-Drive"}</span>
                        </div>
                      </div>

                      {/* 2 PRIORITY RATE METRICS */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 10,
                          padding: 12,
                          borderRadius: 10,
                          background: "rgba(0, 0, 0, 0.3)",
                          border: "1px solid rgba(255, 255, 255, 0.06)",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>
                            Rate per KM
                          </div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: "#4ade80", marginTop: 2 }}>
                            Rs. {vehicle.ratePerKm.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>
                            Extra / 1 Night
                          </div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--brand-teal-light)", marginTop: 2 }}>
                            Rs. {vehicle.extraChargePerNight.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {/* Owner Contact */}
                      <div
                        style={{
                          fontSize: 13,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 12px",
                          borderRadius: 8,
                          background: "rgba(255, 255, 255, 0.03)",
                        }}
                      >
                        <span style={{ color: "var(--text-muted)" }}>Owner Contact:</span>
                        <a
                          href={`tel:${vehicle.ownerContactPhone}`}
                          style={{
                            fontWeight: 700,
                            color: "var(--brand-teal-light)",
                            textDecoration: "none",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          📞 {vehicle.ownerContactPhone}
                        </a>
                      </div>

                      {/* Description if present */}
                      {vehicle.description && (
                        <p style={{ margin: 0, fontSize: 12, color: "var(--text-soft)", lineHeight: 1.4 }}>
                          {vehicle.description}
                        </p>
                      )}

                      {/* Admin Feedback / Rejection Note */}
                      {vehicle.adminFeedback && (
                        <div
                          style={{
                            padding: "8px 12px",
                            borderRadius: 8,
                            fontSize: 12,
                            background: isApproved ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                            border: isApproved ? "1px solid rgba(34, 197, 94, 0.25)" : "1px solid rgba(239, 68, 68, 0.25)",
                            color: isApproved ? "#4ade80" : "#fca5a5",
                          }}
                        >
                          <strong>Admin Note:</strong> {vehicle.adminFeedback}
                        </div>
                      )}

                      {/* Provider info for Admin */}
                      {isAdmin && (
                        <div style={{ fontSize: 11, color: "var(--text-muted)", borderTop: "1px dashed rgba(255, 255, 255, 0.08)", paddingTop: 8 }}>
                          <span>Submitted by: </span>
                          <strong style={{ color: "var(--text-soft)" }}>{vehicle.providerName || vehicle.providerEmail || "Provider"}</strong>
                          <span style={{ marginLeft: 8 }}>({new Date(vehicle.createdAt).toLocaleDateString()})</span>
                        </div>
                      )}

                      {/* Card Action Buttons */}
                      <div
                        style={{
                          marginTop: "auto",
                          paddingTop: 12,
                          borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        {/* Admin Review Action */}
                        {isAdmin && isPending && (
                          <>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => {
                                setReviewingVehicle(vehicle);
                                setReviewDecision("Approve");
                                setReviewNote("");
                              }}
                              style={{ flex: 1, fontWeight: 700, background: "linear-gradient(135deg, #22c55e, #16a34a)" }}
                            >
                              ✅ Approve
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => {
                                setReviewingVehicle(vehicle);
                                setReviewDecision("Reject");
                                setReviewNote("");
                              }}
                              style={{ flex: 1, fontWeight: 700 }}
                            >
                              ❌ Decline
                            </button>
                          </>
                        )}

                        {/* Provider Actions or Admin Edit */}
                        {(isProvider || isAdmin) && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleStartEdit(vehicle)}
                            style={{ display: "flex", alignItems: "center", gap: 4 }}
                          >
                            ✏️ Edit
                          </button>
                        )}

                        {(isProvider || isAdmin) && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => setVehicleToDelete(vehicle)}
                            title="Delete Vehicle Listing"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB C: AI LIVE RATES MATRIX */}
      {activeTab === "rates" && (
        <section
          className="card"
          style={{
            background: "rgba(15, 23, 42, 0.75)",
            border: "1px solid rgba(99, 102, 241, 0.35)",
            borderRadius: 16,
            padding: 24,
          }}
        >
          <div className="card-header" style={{ marginBottom: 20 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <BotIcon size={24} color="#a78bfa" />
                <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: "#c4b5fd" }}>
                  AI Agent Transport Rates Benchmark
                </h3>
              </div>
              <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "var(--text-muted)" }}>
                These aggregated rates are continuously fetched by the <strong>Budget Agent</strong> and <strong>Trip Planner Agent</strong> to estimate realistic transport costs for travellers across Sri Lanka.
              </p>
            </div>
          </div>

          {loadingRates ? (
            <div style={{ textAlign: "center", padding: 30 }}>Loading rates benchmark...</div>
          ) : ratesSummary.length === 0 ? (
            <div style={{ textAlign: "center", padding: 30, color: "var(--text-muted)" }}>
              No rates data available yet. Approve rental vehicle listings to populate live benchmarks.
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Vehicle Type</th>
                    <th>Active Fleet Size</th>
                    <th>Average Rate / KM (Rs.)</th>
                    <th>Average Overnight Extra (Rs.)</th>
                    <th>Rate Range (Min - Max / KM)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ratesSummary.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 18 }}>{getCategoryIcon(item.vehicleType)}</span>
                        <span>{item.vehicleType}</span>
                      </td>
                      <td>
                        <span className="badge badge-info">{item.vehicleCount} Vehicles</span>
                      </td>
                      <td style={{ fontWeight: 700, color: "#4ade80" }}>
                        Rs. {Math.round(item.avgRatePerKm).toLocaleString()} / km
                      </td>
                      <td style={{ fontWeight: 700, color: "var(--brand-teal-light)" }}>
                        Rs. {Math.round(item.avgExtraChargePerNight).toLocaleString()} / night
                      </td>
                      <td style={{ fontSize: 12, color: "var(--text-soft)" }}>
                        Rs. {item.minRatePerKm} - Rs. {item.maxRatePerKm}
                      </td>
                      <td>
                        <span className="badge badge-success">● Active in AI Service</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* AI Calculation Formula Explanation */}
          <div
            style={{
              marginTop: 20,
              padding: "16px 20px",
              borderRadius: 12,
              background: "rgba(99, 102, 241, 0.08)",
              border: "1px solid rgba(99, 102, 241, 0.2)",
              fontSize: 13,
            }}
          >
            <div style={{ fontWeight: 700, color: "#c4b5fd", marginBottom: 6 }}>
              📐 How AI Agents Calculate Rental Vehicle Costs:
            </div>
            <div style={{ color: "var(--text-soft)", lineHeight: 1.6 }}>
              <code>Transport Cost = (Total OSRM Distance in KM × Avg. Rate Per KM) + (Overnight Stay Count × Avg. Overnight Extra Surcharge)</code>
              <br />
              Whenever an administrator approves a new vehicle listing, this formula immediately recalculates with the latest market rates!
            </div>
          </div>
        </section>
      )}

      {/* 4. ADMIN REVIEW MODAL */}
      {reviewingVehicle && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 520, borderRadius: 16 }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
                  {reviewDecision === "Approve" ? "✅ Approve Rental Vehicle Listing" : "❌ Decline Rental Vehicle Listing"}
                </h3>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  Review submitted listing details before finalizing decision.
                </div>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setReviewingVehicle(null)}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "16px 0", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ padding: 12, borderRadius: 8, background: "rgba(255, 255, 255, 0.04)" }}>
                <div><strong>Model:</strong> {reviewingVehicle.vehicleModel} ({reviewingVehicle.vehicleType})</div>
                <div><strong>Year:</strong> {reviewingVehicle.manufacturingYear} · <strong>Seats:</strong> {reviewingVehicle.seatingCapacity}</div>
                <div><strong>Rate / KM:</strong> Rs. {reviewingVehicle.ratePerKm} · <strong>Night Surcharge:</strong> Rs. {reviewingVehicle.extraChargePerNight}</div>
                <div><strong>Owner Phone:</strong> {reviewingVehicle.ownerContactPhone}</div>
                <div><strong>Location:</strong> {reviewingVehicle.location}</div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                  Decision:
                </label>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${reviewDecision === "Approve" ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setReviewDecision("Approve")}
                    style={{ flex: 1 }}
                  >
                    ✅ Approve & Make Live
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${reviewDecision === "Reject" ? "btn-danger" : "btn-secondary"}`}
                    onClick={() => setReviewDecision("Reject")}
                    style={{ flex: 1 }}
                  >
                    ❌ Decline / Request Changes
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                  Admin Review Note / Reason to Partner:
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder={
                    reviewDecision === "Approve"
                      ? "Optional: Listing verified and compliant with safety & pricing guidelines."
                      : "Explain why this vehicle listing cannot be approved (e.g., excessive per-km rate, missing contact info)..."
                  }
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-actions" style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setReviewingVehicle(null)}
                disabled={submittingReview}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn ${reviewDecision === "Approve" ? "btn-primary" : "btn-danger"} btn-sm`}
                onClick={handleReviewSubmit}
                disabled={submittingReview}
                style={{ padding: "8px 20px", fontWeight: 700 }}
              >
                {submittingReview ? "Submitting..." : reviewDecision === "Approve" ? "Confirm Approval" : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. DELETE CONFIRMATION MODAL */}
      {vehicleToDelete && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 440, borderRadius: 16 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: 18, color: "#f87171" }}>🗑️ Delete Vehicle Listing</h3>
              <button type="button" className="close-btn" onClick={() => setVehicleToDelete(null)}>✕</button>
            </div>
            <div style={{ padding: "16px 0", fontSize: 13, color: "var(--text-soft)" }}>
              Are you sure you want to delete <strong>"{vehicleToDelete.vehicleModel}"</strong>? This will remove the listing from active fleets and exclude it from future AI price computations.
            </div>
            <div className="modal-actions" style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setVehicleToDelete(null)} disabled={deleting}>
                Cancel
              </button>
              <button className="btn btn-danger btn-sm" onClick={handleDeleteConfirm} disabled={deleting}>
                {deleting ? "Deleting..." : "Yes, Delete Listing"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
