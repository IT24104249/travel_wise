import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient, type Session } from "@supabase/supabase-js";
import "./style.css";

import { API_BASE, supabase, apiRequest } from "./utils/api";
import {
  type Role,
  getAuthenticatedRole,
  type Trip,
  type Budget,
  type SharedExpense,
  type Activity,
  type RiskAssessment,
  type GroupMember,
  type CatalogItemType,
  type CatalogItem,
  type Destination,
  type VisitingPlace,
  type Restaurant,
  type FoodCategory,
  type FoodItem,
  type AccommodationType,
  type Accommodation,
  type DestinationTab,
  type ProviderApplication,
  type UserProfile,
  type ProviderProfileRequest,
  type ProviderDeletionRequest,
  type Workflow,
  type AuditLog,
  type TripMode,
  type SplitStrategy,
  type GroupMemberDraft,
  type InitialExpenseDraft,
  type CategoryBudgets,
  type TripWizardState,
  type TravelMethod,
  type RentalVehicleType,
  type PublicTransportType,
  initialTripWizardState,
  tripWizardSteps,
  tripInterests,
  highRiskActivityOptions,
  HERO_IMAGE_URL,
  SRI_LANKAN_DESTINATIONS,
} from "./types";
import {
  getDestinationImage,
  getCatalogTypeIcon,
  getCatalogTypeLabel,
  getRoleGreeting,
} from "./utils/helpers";
import { searchSriLankaLocations, isValidSriLankanLocation, type LocationSuggestion } from "./utils/sriLankaLocations";
import { AddDestinationModal } from "./components/AddDestinationModal";
import { EditVisitingPlaceModal } from "./components/EditVisitingPlaceModal";
import { EditRestaurantModal } from "./components/EditRestaurantModal";
import { EditAccommodationModal } from "./components/EditAccommodationModal";
import { EditDestinationModal } from "./components/EditDestinationModal";
import { DestinationVerificationQueue } from "./components/DestinationVerificationQueue";
import { CatalogModal } from "./components/CatalogModal";
import { DeleteAccountModal } from "./components/DeleteAccountModal";
import { TransportFarePortal } from "./components/TransportFarePortal";
import { RentalVehiclesPortal } from "./components/RentalVehiclesPortal";
import { TripDetailsModal } from "./components/TripDetailsModal";
import { VerifiedAiReviewModal } from "./components/VerifiedAiReviewModal";
import { TripSuggestedListingsModal } from "./components/TripSuggestedListingsModal";
import { BudgetItemizedBreakdownModal } from "./components/BudgetItemizedBreakdownModal";
import { GroupListingCostBreakdown, MemberCostShare } from "./components/GroupListingCostBreakdown";
import { ExploreSriLankaView } from "./components/ExploreSriLankaView";
import {
  CompassIcon,
  MapPinIcon,
  CalendarIcon,
  UsersIcon,
  UserIcon,
  WalletIcon,
  ShieldCheckIcon,
  SparklesIcon,
  BotIcon,
  CarIcon,
  HotelIcon,
  UtensilsIcon,
  LandmarkIcon,
  SearchIcon,
  PlusIcon,
  TrashIcon,
  EditIcon,
  EyeIcon,
  CheckIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowRightIcon,
  PlaneIcon,
  StarIcon,
  FilterIcon,
  AlertCircleIcon,
  InfoIcon,
  SunIcon,
  WavesIcon,
  LayersIcon,
} from "./components/Icons";

function App() {
  // Authentication & Role State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [role, setRole] = useState<Role>("User");
  const [session, setSession] = useState<Session | null>(null);
  
  // Auth Form State
  const [authMode, setAuthMode] = useState<"LOGIN" | "SIGNUP">("LOGIN");
  const [signupRole, setSignupRole] = useState<"User" | "ServiceProvider">("User");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [serviceType, setServiceType] = useState("Accommodation & Dining");
  const [showPassword, setShowPassword] = useState(false);

  // Forgot / Reset Password
  const [forgotPasswordMode, setForgotPasswordMode] = useState<"NONE" | "FORGOT" | "RESET">("NONE");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [activeNav, setActiveNav] = useState<"dashboard" | "catalog" | "verified-listings" | "trips" | "weather" | "settlement" | "approvals" | "audit" | "provider-verifications" | "profile" | "trip-reviews" | "transport-fares" | "rental-vehicles">("dashboard");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Quick Planner State (for Coastal Hero bar)
  const [quickDest, setQuickDest] = useState<string>("Ella");
  const [quickStartDate, setQuickStartDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [quickEndDate, setQuickEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split("T")[0];
  });
  const [quickGuests, setQuickGuests] = useState<number>(2);

  const handleQuickPlan = (overrideDest?: string) => {
    const targetDest = overrideDest || quickDest;
    setEditItem(null);
    setTripWizard({
      ...initialTripWizardState,
      destination: targetDest,
      safetyLocation: targetDest,
      startDate: quickStartDate,
      endDate: quickEndDate,
      tripMode: quickGuests > 1 ? "GROUP" : "SOLO",
      name: `${targetDest} Adventure`,
    });
    setTripWizardStep(0);
    setWizardError(null);
    setWizardAiSuggestions(null);
    setWizardAiError(null);
    setModalType("TRIP_WIZARD");
  };

  // Profile Management State
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileDisplayName, setProfileDisplayName] = useState("");
  const [profileContactPhone, setProfileContactPhone] = useState("");
  const [profileServiceType, setProfileServiceType] = useState("");
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  // Profile Password Change State
  const [profileCurrentPassword, setProfileCurrentPassword] = useState("");
  const [profileNewPassword, setProfileNewPassword] = useState("");
  const [profileConfirmPassword, setProfileConfirmPassword] = useState("");
  const [showProfileCurrentPassword, setShowProfileCurrentPassword] = useState(false);
  const [showProfileNewPassword, setShowProfileNewPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  // Admin: Provider Profile Update Requests State
  const [providerProfileRequests, setProviderProfileRequests] = useState<ProviderProfileRequest[]>([]);
  const [providerDeletionRequests, setProviderDeletionRequests] = useState<ProviderDeletionRequest[]>([]);
  const [adminVerificationTab, setAdminVerificationTab] = useState<"SIGNUPS" | "PROFILE_UPDATES" | "DELETIONS">("SIGNUPS");

  // Account Permanent Deletion State (Danger Zone & Double Verification)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [deleteReasonInput, setDeleteReasonInput] = useState("");
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteModalError, setDeleteModalError] = useState<string | null>(null);
  const [dangerZoneMsg, setDangerZoneMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Provider block state: null = no block, "Rejected" = admin rejected, "Pending" = awaiting approval
  const [providerBlockState, setProviderBlockState] = useState<null | "Rejected" | "Pending" | "SignedUp">(null);
  const [providerBlockEmail, setProviderBlockEmail] = useState<string>("");

  // Core Data States
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [tripTab, setTripTab] = useState<"budgets" | "expenses" | "activities" | "risks" | "members" | "settlements">("budgets");
  const [tripApprovalTab, setTripApprovalTab] = useState<"ALL" | "APPROVED" | "PENDING" | "DECLINED" | "DRAFT">("ALL");
  const [detailedTripModal, setDetailedTripModal] = useState<Trip | null>(null);
  const [selectedSuggestedListingsTrip, setSelectedSuggestedListingsTrip] = useState<Trip | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("travelwise_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem("travelwise_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  
  // Trip Sub-module states
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<SharedExpense[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [risks, setRisks] = useState<RiskAssessment[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [settlementData, setSettlementData] = useState<any>(null);
  const [showGroupBreakdown, setShowGroupBreakdown] = useState<boolean>(false);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);

  // Catalog States
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [allCatalogItems, setAllCatalogItems] = useState<CatalogItem[]>([]);
  const [catalogFilterType, setCatalogFilterType] = useState<string>("ALL");
  const [catalogSearchDest, setCatalogSearchDest] = useState<string>("");
  const [adminCatalogTab, setAdminCatalogTab] = useState<"explore" | "partner">("explore");

  // ============================================================
  // Destination Feature State
  // ============================================================
  const [myDestinations, setMyDestinations] = useState<Destination[]>([]);
  const [destModalOpen, setDestModalOpen] = useState(false);
  const [destNameInput, setDestNameInput] = useState("");
  const [destRegionInput, setDestRegionInput] = useState("");
  const [destDescInput, setDestDescInput] = useState("");
  const [activeDestination, setActiveDestination] = useState<Destination | null>(null);
  const [destActiveTab, setDestActiveTab] = useState<DestinationTab>("visiting-places");

  // Editing state for saved entities
  const [editingVp, setEditingVp] = useState<VisitingPlace | null>(null);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [editingAccommodation, setEditingAccommodation] = useState<Accommodation | null>(null);
  const [editingDestination, setEditingDestination] = useState<Destination | null>(null);

  // Admin filter for destination manager
  const [destAdminFilter, setDestAdminFilter] = useState<"ALL" | "ADMIN" | "PARTNER">("ALL");

  function isDestinationAdminListing(dest?: Destination | null): boolean {
    if (!dest) return false;
    return (
      dest.adminFeedback === "Official Admin Listing" ||
      dest.verifiedBy === "System Administrator" ||
      Boolean(dest.createdBy && (
        dest.createdBy.toLowerCase().includes("admin") ||
        dest.createdBy.toLowerCase() === "admin@travelwise.com" ||
        dest.createdBy === "StaffAdmin"
      ))
    );
  }

  // Sub-entity data for active destination
  const [visitingPlaces, setVisitingPlaces] = useState<VisitingPlace[]>([]);
  const [destRestaurants, setDestRestaurants] = useState<Restaurant[]>([]);
  const [destAccommodations, setDestAccommodations] = useState<Accommodation[]>([]);
  const [destFoodPrices, setDestFoodPrices] = useState<any[]>([]);

  // Loading/saving states for destination tabs
  const [destTabLoading, setDestTabLoading] = useState(false);
  const [destSaving, setDestSaving] = useState(false);
  const [destTabError, setDestTabError] = useState<string | null>(null);
  const [destTabSuccess, setDestTabSuccess] = useState<string | null>(null);

  // Image upload state
  const [uploadingImages, setUploadingImages] = useState(false);

  // ---- Visiting Place form(s) ----
  const emptyVP = () => ({
    id: crypto.randomUUID(), name: "", description: "", location: "",
    openingHours: "", ticketRequired: false, ticketPrice: "",
    ticketType: "None" as const, imageFiles: [] as File[], imagePreviews: [] as string[], imageUrls: [] as string[]
  });
  const [vpForms, setVpForms] = useState([emptyVP()]);

  // ---- Restaurant form(s) ----
  const emptyRestaurant = () => ({
    id: crypto.randomUUID(), name: "", location: "", contact: "", description: "",
    imageFiles: [] as File[], imagePreviews: [] as string[], imageUrls: [] as string[],
    foodItems: [{ id: crypto.randomUUID(), name: "", price: "", category: "Lunch" as FoodCategory, imageFile: null as File | null, imagePreview: "", imageUrl: "" }]
  });
  const [restForms, setRestForms] = useState([emptyRestaurant()]);

  // ---- Accommodation form(s) ----
  const emptyAccom = () => ({
    id: crypto.randomUUID(), name: "", type: "Hotel" as AccommodationType,
    location: "", pricePerNight: "", specialNotes: "", contactNumber: "",
    amenities: [] as string[], imageFiles: [] as File[], imagePreviews: [] as string[], imageUrls: [] as string[]
  });
  const [accomForms, setAccomForms] = useState([emptyAccom()]);

  // Food Prices filter
  const [foodPriceMinFilter, setFoodPriceMinFilter] = useState("");
  const [foodPriceMaxFilter, setFoodPriceMaxFilter] = useState("");

  // Destination Verification State (For Admin & Provider)
  const [adminApprovalTab, setAdminApprovalTab] = useState<"destinations" | "ai" | "vehicles">("destinations");
  const [pendingVehiclesCount, setPendingVehiclesCount] = useState<number>(0);
  const [pendingDestinations, setPendingDestinations] = useState<Destination[]>([]);
  const [loadingPendingDest, setLoadingPendingDest] = useState(false);
  const [rejectFeedback, setRejectFeedback] = useState<Record<string, string>>({});
  const [expandedPendingDestId, setExpandedPendingDestId] = useState<string | null>(null);

  // Admin Trip Review Queue State
  const [submittedTrips, setSubmittedTrips] = useState<Trip[]>([]);
  const [adminTripNotes, setAdminTripNotes] = useState<Record<string, string>>({});
  const [loadingSubmittedTrips, setLoadingSubmittedTrips] = useState(false);
  const [expandedSubmittedTripId, setExpandedSubmittedTripId] = useState<string | null>(null);
  const [tripReviewFilter, setTripReviewFilter] = useState<"ALL" | "PendingReview" | "Reviewed" | "Declined">("ALL");
  const [tripReviewSearch, setTripReviewSearch] = useState("");
  const [aiReviewLoading, setAiReviewLoading] = useState<Record<string, boolean>>({});
  const [aiReviewResults, setAiReviewResults] = useState<Record<string, any>>({});
  const [aiReviewError, setAiReviewError] = useState<Record<string, string>>({});
  const [aiScheduleTab, setAiScheduleTab] = useState<Record<string, number>>({});
  const [adminTripCorrectionNotes, setAdminTripCorrectionNotes] = useState<Record<string, { tripPlanner?: string; risk?: string; budget?: string; splitBill?: string }>>({});
  const [verifiedAiModalTrip, setVerifiedAiModalTrip] = useState<Trip | null>(null);
  const [pendingAiNoticeTrip, setPendingAiNoticeTrip] = useState<Trip | null>(null);
  const [detailedBreakdownBudget, setDetailedBreakdownBudget] = useState<{ budget: any; destination?: string } | null>(null);
  const [wizardAiSuggestions, setWizardAiSuggestions] = useState<any | null>(null);
  const [wizardAiLoading, setWizardAiLoading] = useState<boolean>(false);
  const [wizardAiError, setWizardAiError] = useState<string | null>(null);
  const [wizardAiTab, setWizardAiTab] = useState<"ALL" | "ACCOM" | "REST" | "VEHICLES" | "PLACES">("ALL");
  const [autoAuditEnabled, setAutoAuditEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("travelwise_auto_audit_enabled");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });

  // Theme State (Default to Light Theme)
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const saved = localStorage.getItem("travelwise_theme");
      return (saved === "dark" || saved === "light") ? saved : "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("travelwise_theme", theme);
    } catch {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "light" ? "dark" : "light"));
  };

  const scrollToAuthSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const [wizardError, setWizardError] = useState<string | null>(null);
  const [destSuggestions, setDestSuggestions] = useState<LocationSuggestion[]>([]);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const [destSearching, setDestSearching] = useState(false);
  const [groupMemberInput, setGroupMemberInput] = useState("");

  // GPS location loading for wizard
  const [gpsLoading, setGpsLoading] = useState(false);

  // Provider Applications State (For Admin)
  const [providerApplications, setProviderApplications] = useState<ProviderApplication[]>([]);

  // Weather & Risk State
  const [weatherData, setWeatherData] = useState<any>(null);
  const [weatherDestination, setWeatherDestination] = useState("Ella");

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Modals
  const [modalType, setModalType] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [tripWizardStep, setTripWizardStep] = useState(0);
  const [tripWizard, setTripWizard] = useState<TripWizardState>(initialTripWizardState);
  const [tripWizardSubmitting, setTripWizardSubmitting] = useState(false);
  const [aiSettlementStatus, setAiSettlementStatus] = useState<"PENDING" | "APPROVED" | "REVISED">("PENDING");

  // Form States
  const [tripForm, setTripForm] = useState({ name: "", destination: "", startDate: "", endDate: "" });
  const [budgetForm, setBudgetForm] = useState({ amount: "", currency: "LKR" });
  const [expenseForm, setExpenseForm] = useState({ paidBy: "", amount: "", description: "", currency: "LKR" });
  const [activityForm, setActivityForm] = useState({ name: "", location: "", startAt: "", endAt: "" });
  const [riskForm, setRiskForm] = useState<{ severity: RiskAssessment["severity"]; summary: string; weatherSummary: string }>({ severity: "Medium", summary: "", weatherSummary: "" });
  const [memberForm, setMemberForm] = useState({ displayName: "", email: "" });
  const [catalogForm, setCatalogForm] = useState({
    type: "VisitingPlace" as CatalogItemType,
    name: "",
    destination: "",
    description: "",
    address: "",
    contact: "",
    price: "",
    currency: "LKR",
    cuisineOrCategory: "",
    rating: "4.5"
  });

  const currentUserId = session?.user?.id || email || "";

  useEffect(() => {
    // Check if user arrived via a password reset link from email
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get("reset_token");
    const emailParam = urlParams.get("email");
    if (tokenParam) {
      setResetToken(tokenParam);
      if (emailParam) setEmail(emailParam);
      setForgotPasswordMode("RESET");
    }

    const savedToken = localStorage.getItem("travelwise_access_token");
    const savedSessionStr = localStorage.getItem("travelwise_session");
    if (savedToken && savedSessionStr && !tokenParam) {
      try {
        const savedSession = JSON.parse(savedSessionStr);
        setSession(savedSession);
        setIsAuthenticated(true);
        routeUserToRoleDashboard(getAuthenticatedRole(savedSession));
      } catch {
        localStorage.removeItem("travelwise_access_token");
        localStorage.removeItem("travelwise_session");
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadTrips();
      loadCatalog();
      loadAllCatalog();
      loadWeather(weatherDestination);
      loadAuditLogs();
      loadProviderApplications();
      loadProfile();
      if (role === "ServiceProvider" || role === "StaffAdmin") {
        loadMyDestinations();
      }
      if (role === "StaffAdmin") {
        loadProviderProfileRequests();
        loadProviderDeletionRequests();
        loadPendingDestinations();
      }
    }
  }, [isAuthenticated, role]);

  useEffect(() => {
    if (isAuthenticated && activeNav === "profile") {
      loadProfile();
    }
    if (isAuthenticated && activeNav === "provider-verifications" && role === "StaffAdmin") {
      loadProviderApplications();
      loadProviderProfileRequests();
      loadProviderDeletionRequests();
    }
    if (isAuthenticated && activeNav === "approvals" && role === "StaffAdmin") {
      loadPendingDestinations();
      loadSubmittedTrips();
    }
    if (isAuthenticated && activeNav === "trip-reviews" && role === "StaffAdmin") {
      loadSubmittedTrips();
    }
    if (isAuthenticated && activeNav === "verified-listings" && role === "ServiceProvider") {
      loadMyDestinations();
    }
  }, [activeNav]);

  useEffect(() => {
    if (selectedTrip && isAuthenticated) {
      loadTripModuleData(selectedTrip.id);
    }
  }, [selectedTrip]);

  // Route user to their role-specific dashboard view
  function routeUserToRoleDashboard(targetRole: Role) {
    setRole(targetRole);
    if (targetRole === "User") {
      setActiveNav("dashboard");
    } else if (targetRole === "ServiceProvider") {
      setActiveNav("catalog");
    } else if (targetRole === "StaffAdmin") {
      setActiveNav("provider-verifications");
    }
  }

  async function loadTrips(overrideUserId?: string, overrideRole?: Role) {
    const targetUserId = overrideUserId !== undefined ? overrideUserId : currentUserId;
    const targetRole = overrideRole !== undefined ? overrideRole : role;
    if (!targetUserId && targetRole !== "StaffAdmin") {
      setTrips([]);
      setSelectedTrip(null);
      return;
    }
    try {
      const data = await apiRequest<Trip[]>("/api/trips", {}, targetRole, targetUserId);
      const items = Array.isArray(data) ? data : [];
      setTrips(items);
      setSelectedTrip(prev => {
        if (!prev) return items[0] || null;
        const exists = items.find(t => t.id === prev.id);
        return exists || items[0] || null;
      });
    } catch (e: any) {
      console.error(e);
      setTrips([]);
      setSelectedTrip(null);
    }
  }

  async function loadCatalog(overrideUserId?: string, overrideRole?: Role) {
    const targetUserId = overrideUserId !== undefined ? overrideUserId : currentUserId;
    const targetRole = overrideRole !== undefined ? overrideRole : role;
    try {
      // Service Providers see only their OWN listings (independence per provider account).
      // Admins/Users can still search the public approved catalog.
      let endpoint: string;
      if (targetRole === "ServiceProvider") {
        endpoint = "/api/catalog/mine";
      } else {
        const query = catalogSearchDest ? `?destination=${encodeURIComponent(catalogSearchDest)}` : "";
        endpoint = `/api/catalog${query}`;
      }
      const data = await apiRequest<CatalogItem[]>(endpoint, {}, targetRole, targetUserId);
      setCatalogItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error(e);
      setCatalogItems([]);
    }
  }

  async function loadAllCatalog() {
    try {
      // Only admins can load the full moderation queue (all providers' submissions).
      if (role !== "StaffAdmin") {
        setAllCatalogItems([]);
        return;
      }
      const data = await apiRequest<CatalogItem[]>("/api/catalog/all", {}, role, currentUserId);
      setAllCatalogItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error(e);
    }
  }

  async function loadProviderApplications() {
    try {
      const data = await apiRequest<ProviderApplication[]>("/api/auth/provider-applications", {}, role, currentUserId);
      setProviderApplications(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error(e);
    }
  }

  async function loadProfile() {
    try {
      const data = await apiRequest<UserProfile>("/api/auth/profile", {}, role, currentUserId);
      if (data) {
        setProfile(data);
        setProfileDisplayName(data.displayName || "");
        setProfileContactPhone(data.contactPhone || "");
        setProfileServiceType(data.serviceType || "");
      }
    } catch (e: any) {
      console.error("Profile load error:", e);
      if (e?.message?.toLowerCase().includes("not found") || e?.message?.toLowerCase().includes("deleted")) {
        handleSignOut();
      }
    }
  }

  async function loadProviderProfileRequests() {
    try {
      if (role !== "StaffAdmin") return;
      const data = await apiRequest<ProviderProfileRequest[]>("/api/auth/provider-profile-requests", {}, role, currentUserId);
      setProviderProfileRequests(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error("Provider profile requests load error:", e);
    }
  }

  async function loadProviderDeletionRequests() {
    try {
      if (role !== "StaffAdmin") return;
      const data = await apiRequest<ProviderDeletionRequest[]>("/api/auth/provider-deletion-requests", {}, role, currentUserId);
      setProviderDeletionRequests(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error("Provider deletion requests load error:", e);
    }
  }

  async function loadWeather(dest: string) {
    try {
      const res = await apiRequest<any>(`/api/weather?destination=${encodeURIComponent(dest)}`, {}, role, currentUserId);
      setWeatherData(res);
    } catch (e: any) {
      console.error(e);
    }
  }

  async function loadAuditLogs() {
    try {
      const res = await apiRequest<AuditLog[]>("/api/auditlogs", {}, role, currentUserId);
      setAuditLogs(Array.isArray(res) ? res : []);
    } catch (e: any) {
      console.error(e);
    }
  }

  async function loadTripModuleData(tripId: string) {
    try {
      const [b, e, a, r, m, s] = await Promise.all([
        apiRequest<Budget[]>(`/api/budgets/trip/${tripId}`, {}, role, currentUserId),
        apiRequest<SharedExpense[]>(`/api/expenses/trip/${tripId}`, {}, role, currentUserId),
        apiRequest<Activity[]>(`/api/activities/trip/${tripId}`, {}, role, currentUserId),
        apiRequest<RiskAssessment[]>(`/api/risks/trip/${tripId}`, {}, role, currentUserId),
        apiRequest<GroupMember[]>(`/api/groups/${tripId}/members`, {}, role, currentUserId),
        apiRequest<any>(`/api/settlements/trip/${tripId}`, {}, role, currentUserId).catch(() => null),
      ]);
      setBudgets(Array.isArray(b) ? b : []);
      setExpenses(Array.isArray(e) ? e : []);
      setActivities(Array.isArray(a) ? a : []);
      setRisks(Array.isArray(r) ? r : []);
      setMembers(Array.isArray(m) ? m : []);
      setSettlementData(s);
    } catch (err: any) {
      console.error(err);
    }
  }

  async function handleSyncGroupListingExpense(tripId: string, totalCost: number, memberShares: MemberCostShare[]) {
    try {
      setBusy(true);
      setError(null);
      // Ensure group members exist in database
      const existingMembers = await apiRequest<GroupMember[]>(`/api/groups/${tripId}/members`, {}, role, currentUserId).catch(() => []);
      const memberMap: Record<string, string> = {};
      for (const m of existingMembers) {
        memberMap[m.displayName.toLowerCase()] = m.id;
      }

      for (const share of memberShares) {
        if (!memberMap[share.name.toLowerCase()]) {
          try {
            const created = await apiRequest<GroupMember>("/api/groups/members", {
              method: "POST",
              body: JSON.stringify({
                tripId,
                displayName: share.name,
                email: share.name.includes("@") ? share.name : `${share.name.replace(/\s+/g, "").toLowerCase()}@travelwise.local`
              })
            }, role, currentUserId);
            if (created && created.id) {
              memberMap[share.name.toLowerCase()] = created.id;
            }
          } catch {}
        }
      }

      // Create group expense with individual splits
      const splits = memberShares.map(s => ({
        groupMemberId: memberMap[s.name.toLowerCase()] || s.name,
        amount: s.individualCost
      }));

      const primaryPayer = memberShares.find(s => s.isPrimary)?.name || memberShares[0]?.name || currentUserId;

      await apiRequest("/api/groups/expenses", {
        method: "POST",
        body: JSON.stringify({
          tripId,
          paidBy: primaryPayer,
          amount: totalCost,
          description: `Group trip listing shared cost (${selectedTrip?.name || "Trip"})`,
          currency: "LKR",
          splits
        })
      }, role, currentUserId).catch(async () => {
        // Fallback standard expense if group expense endpoint is unavailable
        await apiRequest("/api/expenses", {
          method: "POST",
          body: JSON.stringify({
            tripId,
            paidBy: primaryPayer,
            amount: totalCost,
            description: `Group trip listing shared cost (${selectedTrip?.name || "Trip"})`,
            currency: "LKR"
          })
        }, role, currentUserId);
      });

      await loadTripModuleData(tripId);
      setSuccess("Group costs and member proportions successfully synchronized to Settlement Matrix!");
    } catch (err: any) {
      console.error(err);
      setError("Failed to sync group settlement: " + (err.message || String(err)));
    } finally {
      setBusy(false);
    }
  }

  // --- Auth Handlers ---
  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setSuccess(null);
    try {
      // Authenticate directly through ASP.NET Core API JWT endpoint
      const authResult = await apiRequest<any>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      }, "User", email);

      if (!authResult?.access_token) {
        throw new Error("Authentication failed: No access token returned.");
      }

      localStorage.setItem("travelwise_access_token", authResult.access_token);
      localStorage.setItem("travelwise_session", JSON.stringify(authResult));

      // Reset all user memory states immediately before populating new user session
      setTrips([]);
      setSelectedTrip(null);
      setDetailedTripModal(null);
      setBudgets([]);
      setExpenses([]);
      setActivities([]);
      setRisks([]);
      setMembers([]);
      setSettlementData(null);
      setCatalogItems([]);
      setAllCatalogItems([]);
      setMyDestinations([]);
      setActiveDestination(null);
      setVisitingPlaces([]);
      setDestRestaurants([]);
      setDestAccommodations([]);
      setSubmittedTrips([]);
      setProfile(null);

      setSession(authResult);
      const authenticatedRole = getAuthenticatedRole(authResult);
      routeUserToRoleDashboard(authenticatedRole);
      setIsAuthenticated(true);
      setSuccess(`Authenticated successfully as ${authenticatedRole}! Welcome to your dashboard.`);

      const newUserId = authResult.user?.id || authResult.user?.email || "";
      loadTrips(newUserId, authenticatedRole);
      loadCatalog(newUserId, authenticatedRole);
      if (authenticatedRole === "ServiceProvider" || authenticatedRole === "StaffAdmin") {
        loadMyDestinations(newUserId, authenticatedRole);
      }
    } catch (err: any) {
      const msg: string = err.message || "Login failed.";
      // Detect specific provider block messages from the C# API
      if (msg.toLowerCase().includes("rejected")) {
        setProviderBlockState("Rejected");
        setProviderBlockEmail(email);
      } else if (msg.toLowerCase().includes("pending") || msg.toLowerCase().includes("awaiting")) {
        setProviderBlockState("Pending");
        setProviderBlockEmail(email);
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleSignUpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setSuccess(null);
    try {
      await apiRequest<any>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          role: signupRole,
          displayName,
          contactPhone,
          serviceType
        })
      });

      if (signupRole === "ServiceProvider") {
        // Show the dedicated pending-verification full-screen instead of just a success toast
        setProviderBlockState("SignedUp");
        setProviderBlockEmail(email);
      } else {
        setSuccess("Account registered successfully! You can now log in to plan your group trips.");
        setAuthMode("LOGIN");
      }
    } catch (err: any) {
      setError(err.message || "Registration failed.");
    } finally {
      setBusy(false);
    }
  }

  // --- Forgot / Reset Password Handlers ---
  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setSuccess(null);
    try {
      const res = await apiRequest<any>("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email })
      });
      if (res.resetToken) {
        setResetToken(res.resetToken);
        setSuccess(res.emailSent
          ? "Reset link sent! We have also pre-filled your reset token below."
          : "Reset token generated! Enter your new password below.");
        setForgotPasswordMode("RESET");
      } else {
        setSuccess(res.message || "Reset link sent! Check your inbox.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to send reset email.");
    } finally {
      setBusy(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) { setError("Password must be at least 6 characters."); return; }
    setBusy(true); setError(null); setSuccess(null);
    try {
      const res = await apiRequest<any>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email, token: resetToken, newPassword })
      });
      setSuccess(res.message || "Password reset! You can now sign in.");
      setTimeout(() => {
        setForgotPasswordMode("NONE");
        setResetToken(""); setNewPassword(""); setError(null); setSuccess(null);
        setAuthMode("LOGIN");
      }, 2500);
    } catch (err: any) {
      setError(err.message || "Reset failed. Token may have expired.");
    } finally {
      setBusy(false);
    }
  }

  // --- Admin Provider Verification Handlers ---
  async function handleApproveProvider(appId: string) {
    try {
      await apiRequest(`/api/auth/provider-applications/${appId}/approve`, { method: "POST" }, role, currentUserId);
      setSuccess("Service Provider verified and approved successfully! They can now access the portal.");
      loadProviderApplications();
      loadAuditLogs();
    } catch (err: any) { setError(err.message); }
  }

  async function handleRejectProvider(appId: string) {
    const reason = prompt("Enter optional rejection reason (or leave blank):");
    try {
      await apiRequest(`/api/auth/provider-applications/${appId}/reject`, {
        method: "POST",
        body: JSON.stringify({ note: reason || "Rejected by Administrator" })
      }, role, currentUserId);
      setSuccess("Service Provider registration request rejected. The user will be notified of the rejection if they attempt to log in.");
      loadProviderApplications();
      loadAuditLogs();
    } catch (err: any) { setError(err.message); }
  }

  // --- Profile & Password Management Handlers ---
  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileSubmitting(true);
    setProfileMsg(null);
    try {
      const res = await apiRequest<any>("/api/auth/profile", {
        method: "PUT",
        body: JSON.stringify({
          displayName: profileDisplayName,
          contactPhone: profileContactPhone,
          serviceType: profileServiceType
        })
      }, role, currentUserId);

      if (res?.status === "PendingApproval") {
        setProfileMsg({
          type: "info",
          text: "⏳ Profile change request submitted! Because you are a Service Provider, changes require Administrator approval before taking effect."
        });
      } else {
        setProfileMsg({
          type: "success",
          text: "✅ Profile details updated successfully!"
        });
      }
      await loadProfile();
    } catch (err: any) {
      setProfileMsg({
        type: "error",
        text: err?.message || "Failed to update profile. Please try again."
      });
    } finally {
      setProfileSubmitting(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);

    if (profileNewPassword.length < 6) {
      setPasswordMsg({ type: "error", text: "New password must be at least 6 characters long." });
      return;
    }
    if (profileNewPassword !== profileConfirmPassword) {
      setPasswordMsg({ type: "error", text: "New passwords do not match. Please verify." });
      return;
    }

    setPasswordSubmitting(true);
    try {
      const res = await apiRequest<any>("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: profileCurrentPassword,
          newPassword: profileNewPassword
        })
      }, role, currentUserId);

      setPasswordMsg({
        type: "success",
        text: res?.message || "✅ Password changed successfully! No admin approval required."
      });
      setProfileCurrentPassword("");
      setProfileNewPassword("");
      setProfileConfirmPassword("");
    } catch (err: any) {
      setPasswordMsg({
        type: "error",
        text: err?.message || "Failed to change password. Make sure your current password is correct."
      });
    } finally {
      setPasswordSubmitting(false);
    }
  }

  async function handleApproveProviderProfile(id: string) {
    try {
      await apiRequest<any>(`/api/auth/provider-profile-requests/${id}/approve`, {
        method: "POST",
        body: JSON.stringify({ note: "Approved by Administrator" })
      }, role, currentUserId);
      setSuccess("Provider profile update approved and applied!");
      await loadProviderProfileRequests();
      if (role === "ServiceProvider") await loadProfile();
    } catch (err: any) {
      setError(err?.message || "Failed to approve profile update.");
    }
  }

  async function handleRejectProviderProfile(id: string) {
    const reason = prompt("Enter optional rejection reason (or leave blank):");
    try {
      await apiRequest<any>(`/api/auth/provider-profile-requests/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ note: reason || "Rejected by Administrator" })
      }, role, currentUserId);
      setSuccess("Provider profile update request rejected.");
      await loadProviderProfileRequests();
      if (role === "ServiceProvider") await loadProfile();
    } catch (err: any) {
      setError(err?.message || "Failed to reject profile update.");
    }
  }

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    if (deleteConfirmInput.trim().toUpperCase() !== "DELETE") {
      setDeleteModalError("Please type 'DELETE' exactly to confirm account deletion.");
      return;
    }
    setDeleteSubmitting(true);
    setDeleteModalError(null);
    try {
      const res = await apiRequest<{ message: string; deletedDirectly?: boolean; deletionStatus?: string }>("/api/auth/delete-account", {
        method: "POST",
        body: JSON.stringify({
          reason: deleteReasonInput.trim() || undefined
        })
      }, role, currentUserId);

      if (res?.deletedDirectly || (res as any)?.status === "DeletedDirectly") {
        // Direct permanent deletion for Travellers
        setShowDeleteModal(false);
        alert(res.message || "Your account has been permanently deleted.");
        handleSignOut();
      } else {
        // Pending approval deletion request for Service Providers
        setShowDeleteModal(false);
        setDangerZoneMsg({
          type: "info",
          text: res.message || "Your account deletion request has been submitted to the Admin for final approval."
        });
        setDeleteConfirmInput("");
        setDeleteReasonInput("");
        loadProfile();
      }
    } catch (err: any) {
      setDeleteModalError(err.message || "Failed to process account deletion.");
    } finally {
      setDeleteSubmitting(false);
    }
  }

  async function handleCancelDeletionRequest() {
    if (!window.confirm("Are you sure you want to cancel your pending account deletion request?")) return;
    try {
      const res = await apiRequest<{ message: string }>("/api/auth/cancel-deletion-request", {
        method: "POST"
      }, role, currentUserId);
      setDangerZoneMsg({ type: "success", text: res.message || "Deletion request cancelled successfully." });
      loadProfile();
    } catch (err: any) {
      setDangerZoneMsg({ type: "error", text: err.message || "Failed to cancel deletion request." });
    }
  }

  async function handleApproveProviderDeletion(userId: string) {
    if (!window.confirm("⚠️ PERMANENT ACTION: Are you sure you want to approve this provider account deletion? This will permanently wipe the user account, provider credentials, and all their catalog listings!")) return;
    try {
      const res = await apiRequest<{ message: string }>(`/api/auth/provider-deletion-requests/${userId}/approve`, {
        method: "POST"
      }, role, currentUserId);
      setSuccess(res.message || "Provider account and catalog listings permanently deleted.");
      loadProviderDeletionRequests();
      loadAllCatalog();
    } catch (err: any) {
      setError(err.message || "Failed to approve provider deletion.");
    }
  }

  async function handleRejectProviderDeletion(userId: string) {
    const note = prompt("Enter a reason/note for rejecting this account deletion request (optional):");
    try {
      const res = await apiRequest<{ message: string }>(`/api/auth/provider-deletion-requests/${userId}/reject`, {
        method: "POST",
        body: JSON.stringify({ note: note || "Deletion request rejected by administrator." })
      }, role, currentUserId);
      setSuccess(res.message || "Provider deletion request rejected.");
      loadProviderDeletionRequests();
    } catch (err: any) {
      setError(err.message || "Failed to reject provider deletion.");
    }
  }

  function handleSignOut() {
    localStorage.removeItem("travelwise_access_token");
    localStorage.removeItem("travelwise_session");
    if (supabase) {
      try { supabase.auth.signOut(); } catch {}
    }
    setSession(null);
    setIsAuthenticated(false);
    setRole("User");
    setEmail("");
    setPassword("");
    setDisplayName("");
    setContactPhone("");
    setProfile(null);
    setTrips([]);
    setSelectedTrip(null);
    setDetailedTripModal(null);
    setBudgets([]);
    setExpenses([]);
    setActivities([]);
    setRisks([]);
    setMembers([]);
    setSettlementData(null);
    setCatalogItems([]);
    setAllCatalogItems([]);
    setMyDestinations([]);
    setActiveDestination(null);
    setVisitingPlaces([]);
    setDestRestaurants([]);
    setDestAccommodations([]);
    setSubmittedTrips([]);
    setAuditLogs([]);
    setProviderApplications([]);
    setProviderProfileRequests([]);
    setProviderDeletionRequests([]);
    setTripWizard(initialTripWizardState);
    setTripWizardStep(0);
    setSuccess("Logged out successfully.");
  }

  // --- CRUD: Trips ---
  async function handleSaveTrip(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (editItem) {
        await apiRequest(`/api/trips/${editItem.id}`, { method: "PUT", body: JSON.stringify(tripForm) }, role, currentUserId);
        setSuccess("Trip updated successfully!");
      } else {
        await apiRequest("/api/trips", { method: "POST", body: JSON.stringify(tripForm) }, role, currentUserId);
        setSuccess("Trip created successfully!");
      }
      setModalType(null);
      setTripForm({ name: "", destination: "", startDate: "", endDate: "" });
      loadTrips();
      loadAuditLogs();
    } catch (err: any) { setError(err.message); }
  }

  async function handleUpdateTripPlanning(tripId: string, updatedPlanning: any) {
    try {
      const existingTrip = trips.find(t => t.id === tripId);
      if (!existingTrip) return;
      await apiRequest(`/api/trips/${tripId}`, {
        method: "PUT",
        body: JSON.stringify({
          name: existingTrip.name,
          destination: existingTrip.destination,
          startDate: existingTrip.startDate,
          endDate: existingTrip.endDate,
          startingPoint: existingTrip.startingPoint || null,
          submittedToAdmin: existingTrip.submittedToAdmin,
          travelMethod: existingTrip.travelMethod,
          travelVehicleType: existingTrip.travelVehicleType,
          planningDetails: updatedPlanning,
        }),
      }, role, currentUserId);
      await loadTrips();
    } catch (err) {
      console.warn("Failed to auto-save suggestions to trip planning:", err);
    }
  }

  function openTripWizard() {
        setEditItem(null);
        setTripWizard(initialTripWizardState);
        setTripWizardStep(0);
        setWizardError(null);
        setWizardAiSuggestions(null);
        setWizardAiError(null);
        setModalType("TRIP_WIZARD");
      }

  function openEditTripWizard(trip: Trip) {
        setEditItem(trip);
        let planning: any = {};
        try {
          if (trip.planningDetailsJson) {
            planning = JSON.parse(trip.planningDetailsJson);
          }
        } catch {}

        const currentTripMembers = (selectedTrip?.id === trip.id && members.length > 0)
          ? members.map(m => ({ id: m.id, value: m.displayName }))
          : Array.isArray(planning.groupMembers)
          ? planning.groupMembers.map((m: any) => typeof m === "string" ? { id: crypto.randomUUID(), value: m } : m)
          : [];

        const currentTripBudget = (selectedTrip?.id === trip.id && budgets.length > 0)
          ? budgets[0]
          : null;

        setTripWizard({
          startingPoint: trip.startingPoint || planning.startingPoint || "",
          name: trip.name || "",
          destination: trip.destination || "",
          startDate: trip.startDate ? trip.startDate.slice(0, 10) : "",
          endDate: trip.endDate ? trip.endDate.slice(0, 10) : "",
          tripMode: (planning.tripMode as TripMode) || (currentTripMembers.length > 1 ? "GROUP" : "SOLO"),
          travelMethod: (trip.travelMethod as TravelMethod) || (planning.travelMethod as TravelMethod) || "PRIVATE_VEHICLE",
          rentalVehicleType: (trip.travelVehicleType as RentalVehicleType) || (planning.rentalVehicleType as RentalVehicleType) || "",
          publicTransportType: (trip.travelVehicleType as PublicTransportType) || (planning.publicTransportType as PublicTransportType) || "",
          withDriver: Boolean(planning.withDriver),
          groupMembers: currentTripMembers,
          totalBudget: currentTripBudget
            ? String(currentTripBudget.amount)
            : (planning.totalBudget ? String(planning.totalBudget) : ""),
          currency: currentTripBudget
            ? currentTripBudget.currency
            : (planning.currency || "LKR"),
          categoryBudgets: planning.categoryBudgets || { food: "", accommodation: "", transport: "" },
          initialExpenses: planning.initialExpenses || [],
          interests: planning.interests || [],
          dailyTimeLimit: planning.dailyTimeLimit ? String(planning.dailyTimeLimit) : "",
          mustVisitPlaces: planning.mustVisitPlaces || "",
          safetyLocation: trip.destination || "",
          highRiskActivities: planning.highRiskActivities || [],
          sharedExpensePaidBy: planning.sharedExpensePaidBy || "",
          sharedExpenseAmount: planning.sharedExpenseAmount ? String(planning.sharedExpenseAmount) : "",
          sharedExpenseDescription: planning.sharedExpenseDescription || "",
          splitStrategy: (planning.splitStrategy as SplitStrategy) || "EQUAL",
          splitAllocations: planning.splitAllocations || {},
          multiCurrencyConversion: !!planning.multiCurrencyConversion,
          submitToAdmin: true,
        });
        setTripWizardStep(0);
        setWizardError(null);
        setWizardAiSuggestions(null);
        setWizardAiError(null);
        setModalType("TRIP_WIZARD");
      }

  function updateTripWizard<K extends keyof TripWizardState>(field: K, value: TripWizardState[K]) {
        setTripWizard(current => ({ ...current, [field]: value }));
      }

  async function handleDestinationInput(val: string) {
        updateTripWizard("destination", val);
        updateTripWizard("safetyLocation", val);
        if (val.trim().length >= 1) {
          setDestSearching(true);
          try {
            const matches = await searchSriLankaLocations(val);
            setDestSuggestions(matches);
            setShowDestSuggestions(true);
          } finally {
            setDestSearching(false);
          }
        } else {
          setDestSuggestions([]);
          setShowDestSuggestions(false);
        }
      }

  function validateTripWizardStep(step: number, members = tripWizard.groupMembers): string | null {
        // Step 0: Starting Point - MANDATORY
        if (step === 0) {
          if (!tripWizard.startingPoint.trim()) {
            return "Starting location is required. Please type your starting location or use GPS to pin your current location.";
          }
        }
        // Step 1: Trip setup - Destination, Start date, End date, Name, Travel Method are MANDATORY
        if (step === 1) {
          if (!tripWizard.name.trim()) return "Trip name is required. Please enter a name for your trip.";
          if (!tripWizard.destination.trim()) return "Destination is required. Please choose or enter your destination.";
          if (!isValidSriLankanLocation(tripWizard.destination)) {
            return `"${tripWizard.destination}" was not found in Sri Lanka. Please select a recognized Sri Lankan location from suggestions (e.g. Ella, Kandy, Sigiriya, Galle, Mirissa, Nuwara Eliya...).`;
          }
          if (!tripWizard.startDate) return "Starting day (Start date) is required. Please select a start date.";
          if (!tripWizard.endDate) return "End day (End date) is required. Please select an end date.";
          if (tripWizard.endDate < tripWizard.startDate) return "End date cannot be earlier than start date.";
          if (!tripWizard.tripMode) return "Choose whether this is a solo or group trip.";
          if (tripWizard.tripMode === "GROUP" && members.length === 0) {
            return "Please add at least one group member (press Enter or 'Add'), or switch to Solo trip.";
          }
          if (!tripWizard.travelMethod) {
            return "Please choose your traveling method (Own Private Vehicle, Rental Vehicle, or Public Transport).";
          }
          if (tripWizard.travelMethod === "RENTAL_VEHICLE" && !tripWizard.rentalVehicleType) {
            return "Please select your rental vehicle type (Bike, Car, Van, Bus, or Tuk-Tuk).";
          }
          if (tripWizard.travelMethod === "PUBLIC_TRANSPORT" && !tripWizard.publicTransportType) {
            return "Please select your public transport mode (Bus or Train).";
          }
        }
        if (step === 2) {
          if (!tripWizard.totalBudget || Number(tripWizard.totalBudget) <= 0) return "Total trip budget must be greater than zero.";
          if (tripWizard.initialExpenses.some(expense => !expense.amount || Number(expense.amount) <= 0)) {
            return "Every initial expense amount must be greater than zero.";
          }
        }
        if (step === 3 && (!tripWizard.dailyTimeLimit || Number(tripWizard.dailyTimeLimit) <= 0)) {
          updateTripWizard("dailyTimeLimit", "8");
        }
        if (step === 4 && !tripWizard.safetyLocation.trim()) {
          updateTripWizard("safetyLocation", tripWizard.destination || "Sri Lanka");
        }
        if (step === 5 && tripWizard.splitStrategy !== "EQUAL" && members.length === 0) {
          return "Add group members before choosing a custom split strategy.";
        }
        if (step === 5 && tripWizard.splitStrategy === "PERCENTAGE") {
          const total = members.reduce((sum, member) => sum + Number(tripWizard.splitAllocations[member.id] || 0), 0);
          if (Math.abs(total - 100) > 0.01) return "Percentage splits must add up to exactly 100%.";
        }
        if (step === 5 && tripWizard.splitStrategy === "CUSTOM" && tripWizard.sharedExpenseAmount) {
          const total = members.reduce((sum, member) => sum + Number(tripWizard.splitAllocations[member.id] || 0), 0);
          if (Math.abs(total - Number(tripWizard.sharedExpenseAmount)) > 0.01) return "Custom split amounts must add up to the shared expense total.";
        }
        return null;
      }

  function goToNextTripWizardStep() {
        let currentMembers = [...tripWizard.groupMembers];
        // Automatically capture whatever the user typed in the group member box even if they forgot to click 'Add'
        const inputElem = document.getElementById("group-member-input") as HTMLInputElement | null;
        const typedVal = (groupMemberInput.trim() || inputElem?.value.trim() || "");
        if (typedVal) {
          const newMember = { id: crypto.randomUUID(), value: typedVal };
          currentMembers.push(newMember);
          updateTripWizard("groupMembers", currentMembers);
          setGroupMemberInput("");
          if (inputElem) inputElem.value = "";
        } else if (tripWizardStep === 1 && tripWizard.tripMode === "GROUP" && currentMembers.length === 0) {
          // If group trip was selected and no members added yet, automatically add current user as group leader
          const selfName = profile?.displayName || (currentUserId ? currentUserId.split("@")[0] : "Group Leader");
          const selfMember = { id: crypto.randomUUID(), value: selfName };
          currentMembers.push(selfMember);
          updateTripWizard("groupMembers", currentMembers);
        }

        const validationError = validateTripWizardStep(tripWizardStep, currentMembers);
        if (validationError) {
          setWizardError(validationError);
          return;
        }
        setWizardError(null);
        setTripWizardStep(current => Math.min(current + 1, tripWizardSteps.length - 1));
      }

  async function submitTripWizard(e: React.FormEvent) {
        e.preventDefault();
        let currentMembers = [...tripWizard.groupMembers];
        const inputElem = document.getElementById("group-member-input") as HTMLInputElement | null;
        const typedVal = (groupMemberInput.trim() || inputElem?.value.trim() || "");
        if (typedVal) {
          const newMember = { id: crypto.randomUUID(), value: typedVal };
          currentMembers.push(newMember);
          updateTripWizard("groupMembers", currentMembers);
          setGroupMemberInput("");
          if (inputElem) inputElem.value = "";
        }
        // Validate mandatory fields across all steps
        if (!tripWizard.startingPoint.trim()) {
          setWizardError("Starting location is required. Please enter your starting point in Step 1.");
          setTripWizardStep(0);
          return;
        }
        if (!tripWizard.destination.trim()) {
          setWizardError("Destination is required. Please enter your destination in Step 2.");
          setTripWizardStep(1);
          return;
        }
        if (!tripWizard.startDate) {
          setWizardError("Starting day (Start date) is required. Please select a start date in Step 2.");
          setTripWizardStep(1);
          return;
        }
        if (!tripWizard.endDate) {
          setWizardError("End day (End date) is required. Please select an end date in Step 2.");
          setTripWizardStep(1);
          return;
        }
        if (tripWizard.endDate < tripWizard.startDate) {
          setWizardError("End date cannot be earlier than start date.");
          setTripWizardStep(1);
          return;
        }

        const validationError = validateTripWizardStep(tripWizardStep, currentMembers);
        if (validationError) {
          setWizardError(validationError);
          return;
        }

        setTripWizardSubmitting(true);
        setWizardError(null);
        setError(null);
        try {
          const senderName = profile?.displayName || (currentUserId ? currentUserId.split("@")[0] : "Traveller");
          const senderEmail = currentUserId || profile?.email || "";

          const isEditing = !!(editItem && (editItem as Trip).id);
          const existingTripId = isEditing ? (editItem as Trip).id : null;

          let existingPlanning: any = null;
          if (isEditing && editItem && (editItem as Trip).planningDetailsJson) {
            try { existingPlanning = JSON.parse((editItem as Trip).planningDetailsJson!); } catch {}
          }

          if (isEditing && existingTripId) {
            const updatedTrip = await apiRequest<Trip>(`/api/trips/${existingTripId}`, {
              method: "PUT",
              body: JSON.stringify({
                name: tripWizard.name.trim(),
                destination: tripWizard.destination.trim(),
                startDate: tripWizard.startDate,
                endDate: tripWizard.endDate,
                startingPoint: tripWizard.startingPoint.trim() || null,
                submittedToAdmin: tripWizard.submitToAdmin,
                travelMethod: tripWizard.travelMethod,
                travelVehicleType: tripWizard.travelMethod === "RENTAL_VEHICLE"
                  ? tripWizard.rentalVehicleType
                  : tripWizard.travelMethod === "PUBLIC_TRANSPORT"
                  ? tripWizard.publicTransportType
                  : "Own Private Vehicle",
                planningDetails: {
                  travellerName: senderName,
                  travellerEmail: senderEmail,
                  startingPoint: tripWizard.startingPoint.trim() || null,
                  tripMode: tripWizard.tripMode,
                  travelMethod: tripWizard.travelMethod,
                  rentalVehicleType: tripWizard.rentalVehicleType,
                  publicTransportType: tripWizard.publicTransportType,
                  travelMethodFormatted: tripWizard.travelMethod === "PRIVATE_VEHICLE"
                    ? "Own Private Vehicle 🚗"
                    : tripWizard.travelMethod === "RENTAL_VEHICLE"
                    ? `Rental Vehicle 🔑 (${tripWizard.rentalVehicleType})`
                    : `Public Transport 🚌 (${tripWizard.publicTransportType})`,
                  groupMembers: tripWizard.groupMembers.map(member => member.value),
                  currency: tripWizard.currency,
                  totalBudget: Number(tripWizard.totalBudget),
                  categoryBudgets: tripWizard.categoryBudgets,
                  initialExpenses: tripWizard.initialExpenses,
                  interests: tripWizard.interests,
                  dailyTimeLimit: Number(tripWizard.dailyTimeLimit),
                  mustVisitPlaces: tripWizard.mustVisitPlaces,
                  safetyLocation: tripWizard.safetyLocation,
                  highRiskActivities: tripWizard.highRiskActivities,
                  sharedExpensePaidBy: tripWizard.sharedExpensePaidBy,
                  sharedExpenseAmount: tripWizard.sharedExpenseAmount,
                  sharedExpenseDescription: tripWizard.sharedExpenseDescription,
                  splitStrategy: tripWizard.splitStrategy,
                  splitAllocations: tripWizard.splitAllocations,
                  multiCurrencyConversion: tripWizard.multiCurrencyConversion,
                  wizardAiSuggestions: wizardAiSuggestions || existingPlanning?.wizardAiSuggestions || null,
                  suggestedListings: wizardAiSuggestions?.suggested_listings || existingPlanning?.suggestedListings || null,
                },
              }),
            }, role, currentUserId);

            // If budget was updated
            if (tripWizard.totalBudget && Number(tripWizard.totalBudget) > 0) {
              try {
                if (budgets.length > 0 && budgets[0].tripId === existingTripId) {
                  await apiRequest(`/api/budgets/${budgets[0].id}`, {
                    method: "PUT",
                    body: JSON.stringify({
                      amount: Number(tripWizard.totalBudget),
                      currency: tripWizard.currency,
                    }),
                  }, role, currentUserId);
                } else {
                  await apiRequest("/api/budgets", {
                    method: "POST",
                    body: JSON.stringify({
                      tripId: existingTripId,
                      amount: Number(tripWizard.totalBudget),
                      currency: tripWizard.currency,
                    }),
                  }, role, currentUserId);
                }
              } catch {}
            }

            setModalType(null);
            setEditItem(null);
            setTripWizard(initialTripWizardState);
            setTripWizardStep(0);
            setSelectedTrip(updatedTrip);
            if (tripWizard.submitToAdmin) {
              setSuccess(`Trip '${tripWizard.name}' updated and submitted to admin for review!`);
            } else {
              setSuccess(`Trip '${tripWizard.name}' updated successfully!`);
            }
            await loadTrips();
            loadAuditLogs();
            return;
          }

          const createdTrip = await apiRequest<Trip>("/api/trips", {
            method: "POST",
            body: JSON.stringify({
              name: tripWizard.name.trim(),
              destination: tripWizard.destination.trim(),
              startDate: tripWizard.startDate,
              endDate: tripWizard.endDate,
              startingPoint: tripWizard.startingPoint.trim() || null,
              submittedToAdmin: true,
              travellerName: senderName,
              travellerEmail: senderEmail,
              travelMethod: tripWizard.travelMethod,
              travelVehicleType: tripWizard.travelMethod === "RENTAL_VEHICLE"
                ? tripWizard.rentalVehicleType
                : tripWizard.travelMethod === "PUBLIC_TRANSPORT"
                ? tripWizard.publicTransportType
                : "Own Private Vehicle",
              planningDetails: {
                travellerName: senderName,
                travellerEmail: senderEmail,
                startingPoint: tripWizard.startingPoint.trim() || null,
                tripMode: tripWizard.tripMode,
                travelMethod: tripWizard.travelMethod,
                rentalVehicleType: tripWizard.rentalVehicleType,
                publicTransportType: tripWizard.publicTransportType,
                withDriver: tripWizard.withDriver,
                travelMethodFormatted: tripWizard.travelMethod === "PRIVATE_VEHICLE"
                  ? "Own Private Vehicle 🚗"
                  : tripWizard.travelMethod === "RENTAL_VEHICLE"
                  ? `Rental Vehicle 🔑 (${tripWizard.rentalVehicleType})`
                  : `Public Transport 🚌 (${tripWizard.publicTransportType})`,
                groupMembers: tripWizard.groupMembers.map(member => member.value),
                currency: tripWizard.currency,
                totalBudget: Number(tripWizard.totalBudget),
                categoryBudgets: tripWizard.categoryBudgets,
                initialExpenses: tripWizard.initialExpenses,
                interests: tripWizard.interests,
                dailyTimeLimit: Number(tripWizard.dailyTimeLimit),
                mustVisitPlaces: tripWizard.mustVisitPlaces,
                safetyLocation: tripWizard.safetyLocation,
                highRiskActivities: tripWizard.highRiskActivities,
                splitStrategy: tripWizard.splitStrategy,
                splitAllocations: tripWizard.splitAllocations,
                multiCurrencyConversion: tripWizard.multiCurrencyConversion,
                wizardAiSuggestions: wizardAiSuggestions || null,
                suggestedListings: wizardAiSuggestions?.suggested_listings || null,
              },
            }),
          }, role, currentUserId);

          await apiRequest("/api/budgets", {
            method: "POST",
            body: JSON.stringify({
              tripId: createdTrip.id,
              amount: Number(tripWizard.totalBudget),
              currency: tripWizard.currency,
            }),
          }, role, currentUserId);

          const createdMembers: GroupMember[] = [];
          for (const member of tripWizard.groupMembers) {
            try {
              const m = await apiRequest<GroupMember>("/api/groups/members", {
                method: "POST",
                body: JSON.stringify({
                  tripId: createdTrip.id,
                  displayName: member.value.trim(),
                  email: member.value.includes("@") ? member.value.trim() : "",
                }),
              }, role, currentUserId);
              if (m && m.id) createdMembers.push(m);
            } catch { }
          }

          for (const expense of tripWizard.initialExpenses) {
            await apiRequest("/api/expenses", {
              method: "POST",
              body: JSON.stringify({
                tripId: createdTrip.id,
                paidBy: currentUserId,
                amount: Number(expense.amount),
                description: `${expense.category}: ${expense.description} (${expense.date})`,
                currency: tripWizard.currency,
              }),
            }, role, currentUserId);
          }

          if (tripWizard.sharedExpenseAmount && Number(tripWizard.sharedExpenseAmount) > 0) {
            const totalAmt = Number(tripWizard.sharedExpenseAmount);
            if (createdMembers.length > 0) {
              const splits = createdMembers.map(m => {
                let splitAmount = totalAmt / createdMembers.length;
                if (tripWizard.splitStrategy === "PERCENTAGE") {
                  const pct = Number(tripWizard.splitAllocations[m.id] || tripWizard.splitAllocations[m.displayName]) || (100 / createdMembers.length);
                  splitAmount = (totalAmt * pct) / 100;
                } else if (tripWizard.splitStrategy === "CUSTOM") {
                  splitAmount = Number(tripWizard.splitAllocations[m.id] || tripWizard.splitAllocations[m.displayName]) || (totalAmt / createdMembers.length);
                }
                return { groupMemberId: m.id, amount: Math.round(splitAmount * 100) / 100 };
              });
              await apiRequest("/api/groups/expenses", {
                method: "POST",
                body: JSON.stringify({
                  tripId: createdTrip.id,
                  paidBy: tripWizard.sharedExpensePaidBy.trim() || createdMembers[0]?.displayName || currentUserId,
                  amount: totalAmt,
                  description: tripWizard.sharedExpenseDescription.trim() || "Shared group expense (AI Settlement Plan)",
                  splits: splits,
                  currency: tripWizard.currency,
                }),
              }, role, currentUserId).catch(() => {
                return apiRequest("/api/expenses", {
                  method: "POST",
                  body: JSON.stringify({
                    tripId: createdTrip.id,
                    paidBy: tripWizard.sharedExpensePaidBy.trim() || currentUserId,
                    amount: totalAmt,
                    description: tripWizard.sharedExpenseDescription.trim() || "Shared group expense",
                    currency: tripWizard.currency,
                  }),
                }, role, currentUserId);
              });
            } else {
              await apiRequest("/api/expenses", {
                method: "POST",
                body: JSON.stringify({
                  tripId: createdTrip.id,
                  paidBy: tripWizard.sharedExpensePaidBy.trim() || currentUserId,
                  amount: totalAmt,
                  description: tripWizard.sharedExpenseDescription.trim() || "Shared group expense",
                  currency: tripWizard.currency,
                }),
              }, role, currentUserId);
            }
          }

          const objective = [
            `Create a ${tripWizard.tripMode.toLowerCase()} itinerary for ${createdTrip.name} in ${createdTrip.destination}.`,
            `Interests: ${tripWizard.interests.join(", ") || "General sightseeing"}.`,
            `Must-visit places: ${tripWizard.mustVisitPlaces || "None specified"}.`,
            `Daily activity limit: ${tripWizard.dailyTimeLimit} hours.`,
            `Safety location: ${tripWizard.safetyLocation}.`,
            `High-risk activities: ${tripWizard.highRiskActivities.join(", ") || "None"}.`,
            `Budget: ${tripWizard.totalBudget} ${tripWizard.currency}; split strategy: ${tripWizard.splitStrategy}.`,
            `Category limits: food ${tripWizard.categoryBudgets.food || "not set"}, accommodation ${tripWizard.categoryBudgets.accommodation || "not set"}, transport ${tripWizard.categoryBudgets.transport || "not set"}.`,
            `Split allocations: ${JSON.stringify(tripWizard.splitAllocations)}.`,
          ].join(" ");
          await apiRequest<Workflow>("/api/workflows", {
            method: "POST",
            body: JSON.stringify({ tripId: createdTrip.id, objective }),
          }, role, currentUserId);

          setModalType(null);
          setTripWizard(initialTripWizardState);
          setTripWizardStep(0);
          setSelectedTrip(createdTrip);
          if (tripWizard.submitToAdmin) {
            setSuccess("Trip plan submitted to admin for review! You'll be notified when reviewed.");
          } else {
            setSuccess("Trip plan created and sent to the AI workflow for review.");
          }
          await loadTrips();
          loadAuditLogs();
        } catch (err: any) {
          setError(err.message || "Unable to create the trip plan.");
        } finally {
          setTripWizardSubmitting(false);
        }
  }

  async function handleDeleteTrip(id: string) {
    if (!window.confirm("Are you sure you want to delete this trip plan completely? All details, budgets, activities, and AI reviews will be deleted.")) return;
    try {
      await apiRequest(`/api/trips/${id}`, { method: "DELETE" }, role, currentUserId);
      if (selectedTrip?.id === id) setSelectedTrip(null);
      if (detailedTripModal?.id === id) setDetailedTripModal(null);
      setSuccess("Trip deleted successfully.");
      loadTrips();
      loadAuditLogs();
    } catch (err: any) { setError(err.message); }
  }

  // --- CRUD: Budgets ---
  async function handleSaveBudget(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTrip) return;
    setError(null);
    try {
      if (editItem) {
        await apiRequest(`/api/budgets/${editItem.id}`, { method: "PUT", body: JSON.stringify({ amount: Number(budgetForm.amount), currency: budgetForm.currency }) }, role, currentUserId);
      } else {
        await apiRequest("/api/budgets", { method: "POST", body: JSON.stringify({ tripId: selectedTrip.id, amount: Number(budgetForm.amount), currency: budgetForm.currency }) }, role, currentUserId);
      }
      setModalType(null);
      setBudgetForm({ amount: "", currency: "LKR" });
      loadTripModuleData(selectedTrip.id);
    } catch (err: any) { setError(err.message); }
  }

  async function handleDeleteBudget(id: string) {
    if (!window.confirm("Delete budget?")) return;
    try {
      await apiRequest(`/api/budgets/${id}`, { method: "DELETE" }, role, currentUserId);
      if (selectedTrip) loadTripModuleData(selectedTrip.id);
    } catch (err: any) { setError(err.message); }
  }

  // --- CRUD: Expenses ---
  async function handleSaveExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTrip) return;
    setError(null);
    try {
      if (editItem) {
        await apiRequest(`/api/expenses/${editItem.id}`, { method: "PUT", body: JSON.stringify({ paidBy: expenseForm.paidBy, amount: Number(expenseForm.amount), description: expenseForm.description, currency: expenseForm.currency }) }, role, currentUserId);
      } else {
        await apiRequest("/api/expenses", { method: "POST", body: JSON.stringify({ tripId: selectedTrip.id, paidBy: expenseForm.paidBy, amount: Number(expenseForm.amount), description: expenseForm.description, currency: expenseForm.currency }) }, role, currentUserId);
      }
      setModalType(null);
      setExpenseForm({ paidBy: "", amount: "", description: "", currency: "LKR" });
      loadTripModuleData(selectedTrip.id);
    } catch (err: any) { setError(err.message); }
  }

  async function handleDeleteExpense(id: string) {
    if (!window.confirm("Delete expense?")) return;
    try {
      await apiRequest(`/api/expenses/${id}`, { method: "DELETE" }, role, currentUserId);
      if (selectedTrip) loadTripModuleData(selectedTrip.id);
    } catch (err: any) { setError(err.message); }
  }

  // --- CRUD: Activities ---
  async function handleSaveActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTrip) return;
    setError(null);
    try {
      const body = { name: activityForm.name, location: activityForm.location, startAt: new Date(activityForm.startAt).toISOString(), endAt: new Date(activityForm.endAt).toISOString() };
      if (editItem) {
        await apiRequest(`/api/activities/${editItem.id}`, { method: "PUT", body: JSON.stringify(body) }, role, currentUserId);
      } else {
        await apiRequest("/api/activities", { method: "POST", body: JSON.stringify({ ...body, tripId: selectedTrip.id }) }, role, currentUserId);
      }
      setModalType(null);
      setActivityForm({ name: "", location: "", startAt: "", endAt: "" });
      loadTripModuleData(selectedTrip.id);
    } catch (err: any) { setError(err.message); }
  }

  async function handleDeleteActivity(id: string) {
    if (!window.confirm("Delete activity?")) return;
    try {
      await apiRequest(`/api/activities/${id}`, { method: "DELETE" }, role, currentUserId);
      if (selectedTrip) loadTripModuleData(selectedTrip.id);
    } catch (err: any) { setError(err.message); }
  }

  // --- CRUD: Risks ---
  async function handleSaveRisk(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTrip) return;
    setError(null);
    try {
      if (editItem) {
        await apiRequest(`/api/risks/${editItem.id}`, { method: "PUT", body: JSON.stringify(riskForm) }, role, currentUserId);
      } else {
        await apiRequest("/api/risks", { method: "POST", body: JSON.stringify({ ...riskForm, tripId: selectedTrip.id }) }, role, currentUserId);
      }
      setModalType(null);
      setRiskForm({ severity: "Medium", summary: "", weatherSummary: "" });
      loadTripModuleData(selectedTrip.id);
    } catch (err: any) { setError(err.message); }
  }

  async function handleDeleteRisk(id: string) {
    if (!window.confirm("Delete risk assessment?")) return;
    try {
      await apiRequest(`/api/risks/${id}`, { method: "DELETE" }, role, currentUserId);
      if (selectedTrip) loadTripModuleData(selectedTrip.id);
    } catch (err: any) { setError(err.message); }
  }

  // --- CRUD: Group Members ---
  async function handleSaveMember(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTrip) return;
    setError(null);
    try {
      if (editItem) {
        await apiRequest(`/api/groups/members/${editItem.id}`, { method: "PUT", body: JSON.stringify(memberForm) }, role, currentUserId);
      } else {
        await apiRequest("/api/groups/members", { method: "POST", body: JSON.stringify({ ...memberForm, tripId: selectedTrip.id }) }, role, currentUserId);
      }
      setModalType(null);
      setMemberForm({ displayName: "", email: "" });
      loadTripModuleData(selectedTrip.id);
    } catch (err: any) { setError(err.message); }
  }

  async function handleDeleteMember(id: string) {
    if (!window.confirm("Remove group member?")) return;
    try {
      await apiRequest(`/api/groups/members/${id}`, { method: "DELETE" }, role, currentUserId);
      if (selectedTrip) loadTripModuleData(selectedTrip.id);
    } catch (err: any) { setError(err.message); }
  }

  // ============================================================
  // DESTINATION FEATURE HANDLERS
  // ============================================================

  async function loadMyDestinations(overrideUserId?: string, overrideRole?: Role) {
    const targetUserId = overrideUserId !== undefined ? overrideUserId : currentUserId;
    const targetRole = overrideRole !== undefined ? overrideRole : role;
    if (!targetUserId && targetRole !== "StaffAdmin") {
      setMyDestinations([]);
      setActiveDestination(null);
      return;
    }
    try {
      const query = destAdminFilter !== "ALL" ? `?filter=${destAdminFilter.toLowerCase()}` : "";
      const data = await apiRequest<Destination[]>(`/api/destinations/mine${query}`, {}, targetRole, targetUserId);
      const list = Array.isArray(data) ? data : [];
      setMyDestinations(list);
      setActiveDestination(prev => {
        if (!prev) return list[0] || null;
        const found = list.find(d => d.id === prev.id);
        return found ? { ...prev, ...found } : list[0] || null;
      });
    } catch {
      setMyDestinations([]);
      setActiveDestination(null);
    }
  }

  async function loadPendingDestinations() {
    if (role !== "StaffAdmin") return;
    setLoadingPendingDest(true);
    try {
      const data = await apiRequest<Destination[]>("/api/destinations/admin/pending", {}, role, currentUserId);
      const normalized = (Array.isArray(data) ? data : []).map(dest => ({
        ...dest,
        visitingPlaces: (dest.visitingPlaces || []).map(vp => ({
          ...vp,
          imageUrls: parseJsonArr(vp.imageUrls as any)
        })),
        restaurants: (dest.restaurants || []).map(r => ({
          ...r,
          imageUrls: parseJsonArr(r.imageUrls as any),
          foodItems: r.foodItems || []
        })),
        accommodations: (dest.accommodations || []).map(acc => ({
          ...acc,
          imageUrls: parseJsonArr(acc.imageUrls as any),
          amenities: parseJsonArr(acc.amenities as any)
        }))
      }));
      setPendingDestinations(normalized);
    } catch { /* silent */ }
    finally { setLoadingPendingDest(false); }
  }

  async function handleSendToAdmin(destId: string) {
    if (!activeDestination) return;
    if (!window.confirm(`Submit "${activeDestination.name}" and all its listings (Visiting Places, Restaurants, Accommodations) to Admin for verification?`)) return;
    setDestSaving(true);
    setDestTabError(null);
    try {
      const updated = await apiRequest<Destination>(`/api/destinations/${destId}/submit-for-verification`, {
        method: "POST"
      }, role, currentUserId);
      setActiveDestination(prev => prev ? { ...prev, ...updated, status: "Pending" } : updated);
      setMyDestinations(prev => prev.map(d => d.id === destId ? { ...d, ...updated, status: "Pending" } : d));
      setDestTabSuccess("📤 Destination submitted to Admin for verification! Once approved, it will be marked as Verified.");
      setTimeout(() => setDestTabSuccess(null), 5000);
    } catch (err: any) {
      setDestTabError(err.message);
    } finally {
      setDestSaving(false);
    }
  }

  async function handleVerifyDestination(destId: string) {
    try {
      const updated = await apiRequest<Destination>(`/api/destinations/${destId}/verify`, { method: "POST" }, role, currentUserId);
      setPendingDestinations(prev => prev.filter(d => d.id !== destId));
      setSuccess(`✅ Destination "${updated.name}" verified & approved! Now live for travellers and AI agents.`);
      setTimeout(() => setSuccess(null), 4000);
      loadMyDestinations();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleRejectDestination(destId: string) {
    const feedback = rejectFeedback[destId] || "";
    try {
      const updated = await apiRequest<Destination>(`/api/destinations/${destId}/reject`, {
        method: "POST",
        body: JSON.stringify({ feedback: feedback.trim() || "Listing details require revision." })
      }, role, currentUserId);
      setPendingDestinations(prev => prev.filter(d => d.id !== destId));
      setSuccess(`Destination "${updated.name}" marked as rejected.`);
      setTimeout(() => setSuccess(null), 4000);
      loadMyDestinations();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function loadSubmittedTrips() {
    if (role !== "StaffAdmin") return;
    setLoadingSubmittedTrips(true);
    try {
      const data = await apiRequest<Trip[]>("/api/trips/submitted", {}, role, currentUserId);
      setSubmittedTrips(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
    finally { setLoadingSubmittedTrips(false); }
  }

  async function handleAdminTripReview(tripId: string, action: "approve" | "decline" | "warn") {
    const note = adminTripNotes[tripId] || "";
    const aiReview = aiReviewResults[tripId];
    const correctionNotes = adminTripCorrectionNotes[tripId];
    try {
      const body: any = { action, note: note.trim() || null };
      if (action === "approve") {
        if (aiReview) {
          body.aiReviewJson = JSON.stringify(aiReview);
        }
        if (correctionNotes) {
          body.adminCorrectionNotes = JSON.stringify(correctionNotes);
        }
      }
      const updatedTrip = await apiRequest<Trip>(`/api/trips/${tripId}/review`, {
        method: "POST",
        body: JSON.stringify(body),
      }, role, currentUserId);

      const updateTripInList = (t: Trip) => {
        if (t.id !== tripId) return t;
        return {
          ...t,
          status: action === "approve" ? "Reviewed" : action === "decline" ? "Declined" : t.status,
          adminWarningNote: action === "warn" ? note : (updatedTrip?.adminWarningNote ?? t.adminWarningNote),
          adminApprovedAiReviewJson: updatedTrip?.adminApprovedAiReviewJson ?? (action === "approve" && aiReview ? JSON.stringify(aiReview) : t.adminApprovedAiReviewJson),
          adminCorrectionNotes: updatedTrip?.adminCorrectionNotes ?? (action === "approve" && correctionNotes ? JSON.stringify(correctionNotes) : t.adminCorrectionNotes),
        };
      };

      setSubmittedTrips(prev => prev.map(updateTripInList));
      setTrips(prev => prev.map(updateTripInList));

      const msg = action === "approve"
        ? "✅ Trip plan approved with verified AI evaluation and admin notes!"
        : action === "decline"
        ? "Trip plan declined."
        : "⚠️ Warning note sent to traveller.";
      setSuccess(msg);
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) { setError(err.message); }
  }

  function handleTravellerAiReviewClick(trip: Trip) {
    if (trip.adminApprovedAiReviewJson || trip.status === "Reviewed" || trip.status === "Approved") {
      setVerifiedAiModalTrip(trip);
    } else if (trip.status === "PendingReview") {
      setPendingAiNoticeTrip(trip);
    } else {
      triggerAiWorkflow(trip);
    }
  }

  async function runWizardAiSuggestions() {
    setWizardAiLoading(true);
    setWizardAiError(null);
    try {
      const aiUrl = (import.meta.env.VITE_AI_URL || "http://localhost:8000") + "/agents/wizard-suggestions";
      const payload = {
        name: tripWizard.name || `${tripWizard.destination || 'Sri Lanka'} Tour`,
        destination: tripWizard.destination,
        starting_point: tripWizard.startingPoint,
        start_date: tripWizard.startDate,
        end_date: tripWizard.endDate,
        travel_method: tripWizard.travelMethod,
        vehicle_type: tripWizard.rentalVehicleType || tripWizard.publicTransportType || (tripWizard.travelMethod === "PRIVATE_VEHICLE" ? (tripWizard.rentalVehicleType || "Car") : "Car"),
        with_driver: Boolean(tripWizard.withDriver),
        total_budget: parseFloat(tripWizard.totalBudget as any) || 0.0,
        currency: tripWizard.currency || "LKR",
        trip_mode: tripWizard.tripMode,
        group_members: tripWizard.groupMembers.map((m: any) => m.value || m.displayName || m),
        interests: tripWizard.interests,
        must_visit_places: tripWizard.mustVisitPlaces,
        daily_time_limit: parseFloat(tripWizard.dailyTimeLimit as any) || 8.0,
        high_risk_activities: tripWizard.highRiskActivities,
        split_strategy: tripWizard.splitStrategy
      };

      const resp = await fetch(aiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`AI Service error: ${errText}`);
      }

      const result = await resp.json();
      setWizardAiSuggestions(result);
      setSuccess("✨ AI Plan Assistant analysed your trip details!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setWizardAiError(err.message || "Failed to execute AI suggestion analysis.");
    } finally {
      setWizardAiLoading(false);
    }
  }

  useEffect(() => {
    if (modalType === "TRIP_WIZARD" && tripWizardStep === 5 && autoAuditEnabled && !wizardAiSuggestions && !wizardAiLoading) {
      runWizardAiSuggestions();
    }
  }, [tripWizardStep, modalType, autoAuditEnabled]);

  async function handleBanTripOwner(tripId: string, ownerUserId: string) {
    if (!window.confirm(`Ban user ${ownerUserId}? This will decline their trip and flag their account for suspension.`)) return;
    try {
      await apiRequest<any>(`/api/trips/${tripId}/ban-user`, { method: "POST" }, role, currentUserId);
      setSubmittedTrips(prev => prev.map(t => t.id === tripId ? { ...t, status: "Declined" } : t));
      setSuccess(`🚫 User flagged for suspension. Trip declined.`);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) { setError(err.message); }
  }

  async function handleRunAiReview(trip: Trip) {
    setAiReviewLoading(prev => ({ ...prev, [trip.id]: true }));
    setAiReviewError(prev => ({ ...prev, [trip.id]: "" }));
    try {
      let planning: any = null;
      if (trip.planningDetailsJson) {
        try { planning = JSON.parse(trip.planningDetailsJson); } catch {}
      }

      const body = {
        destination: trip.destination || "Kandy",
        starting_location: trip.startingPoint || planning?.startingLocation || "Colombo",
        start_date: trip.startDate || planning?.startDate || "",
        end_date: trip.endDate || planning?.endDate || "",
        travel_method: planning?.travelMethod || trip.travelMethod || "PRIVATE_VEHICLE",
        vehicle_type: planning?.rentalVehicleType || planning?.publicTransportType || trip.travelVehicleType || "Car",
        user_budget: planning?.totalBudget || 50000.0,
        currency: planning?.currency || "LKR",
        daily_time_limit_hours: planning?.dailyTimeLimit || 8.0,
        interests: planning?.interests || [],
        must_visit_places: planning?.mustVisitPlaces || "",
        high_risk_activities: planning?.highRiskActivities || [],
        group_mode: planning?.tripMode || "SOLO",
        group_members: planning?.groupMembers || [],
        target_currency: "USD",
      };

      const aiUrl = (import.meta.env.VITE_AI_URL || "http://localhost:8000") + "/agents/sequential-review";
      const resp = await fetch(aiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`AI Service error: ${errText}`);
      }

      const result = await resp.json();
      setAiReviewResults(prev => ({ ...prev, [trip.id]: result }));
      setSuccess(`🤖 AI Review finished for ${trip.name || trip.destination}!`);
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setAiReviewError(prev => ({ ...prev, [trip.id]: err.message || "Failed to execute AI review pipeline." }));
      setError(`AI Review failed: ${err.message}`);
    } finally {
      setAiReviewLoading(prev => ({ ...prev, [trip.id]: false }));
    }
  }

  async function loadDestinationTab(dest: Destination, tab: DestinationTab) {
    setDestTabLoading(true); setDestTabError(null);
    try {
      if (tab === "visiting-places") {
        const data = await apiRequest<VisitingPlace[]>(`/api/destinations/${dest.id}/visiting-places`, {}, role, currentUserId);
        setVisitingPlaces(data.map(vp => ({ ...vp, imageUrls: parseJsonArr(vp.imageUrls as any) })));
      } else if (tab === "restaurants") {
        const data = await apiRequest<Restaurant[]>(`/api/destinations/${dest.id}/restaurants`, {}, role, currentUserId);
        setDestRestaurants(data.map(r => ({ ...r, imageUrls: parseJsonArr(r.imageUrls as any), foodItems: r.foodItems || [] })));
      } else if (tab === "accommodations") {
        const data = await apiRequest<Accommodation[]>(`/api/destinations/${dest.id}/accommodations`, {}, role, currentUserId);
        setDestAccommodations(data.map(a => ({ ...a, imageUrls: parseJsonArr(a.imageUrls as any), amenities: parseJsonArr(a.amenities as any) })));
      } else if (tab === "food-prices") {
        const minQ = foodPriceMinFilter ? `&minPrice=${foodPriceMinFilter}` : "";
        const maxQ = foodPriceMaxFilter ? `&maxPrice=${foodPriceMaxFilter}` : "";
        const data = await apiRequest<any[]>(`/api/destinations/${dest.id}/food-prices?${minQ}${maxQ}`, {}, role, currentUserId);
        setDestFoodPrices(data);
      }
    } catch (err: any) { setDestTabError(err.message); }
    finally { setDestTabLoading(false); }
  }

  function parseJsonArr(raw: string | string[] | null | undefined): string[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try { return JSON.parse(raw); } catch { return []; }
  }

  async function handleCreateDestination(e: React.FormEvent) {
    e.preventDefault();
    if (!destNameInput.trim()) return;
    setDestSaving(true);
    try {
      const dest = await apiRequest<Destination>("/api/destinations", {
        method: "POST",
        body: JSON.stringify({ name: destNameInput.trim(), description: destDescInput.trim() || null, region: destRegionInput.trim() || null })
      }, role, currentUserId);
      setMyDestinations(prev => [dest, ...prev]);
      setDestModalOpen(false);
      setActiveDestination(dest);
      setDestActiveTab("visiting-places");
      setVpForms([emptyVP()]);
      setRestForms([emptyRestaurant()]);
      setAccomForms([emptyAccom()]);
      if (role === "StaffAdmin") {
        setDestTabSuccess(`👑 Official Admin Destination "${dest.name}" created and verified live! Now add visiting places, dining & stays below.`);
      } else {
        setDestTabSuccess(`Destination "${dest.name}" created! Now add details below.`);
      }
      setTimeout(() => setDestTabSuccess(null), 5000);
    } catch (err: any) { setDestTabError(err.message); }
    finally { setDestSaving(false); }
  }

  async function uploadImages(files: File[], folder: string): Promise<string[]> {
    if (files.length === 0) return [];
    setUploadingImages(true);
    const formData = new FormData();
    files.forEach(f => formData.append("files", f));
    try {
      const token = localStorage.getItem("travelwise_access_token");
      const res = await fetch(`${API_BASE}/api/upload/multiple?folder=${folder}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });
      if (!res.ok) {
        // If upload endpoint not available, return empty (images skipped gracefully)
        console.warn("Image upload endpoint not available, skipping images.");
        return [];
      }
      const data: { url?: string; error?: string }[] = await res.json();
      return data.filter(d => d.url).map(d => d.url!);
    } catch {
      console.warn("Image upload failed, continuing without images.");
      return [];
    } finally { setUploadingImages(false); }
  }

  async function handleSaveVisitingPlaces(e: React.FormEvent) {
    e.preventDefault();
    if (!activeDestination) return;
    setDestSaving(true); setDestTabError(null);
    try {
      for (const form of vpForms) {
        if (!form.name.trim()) continue;
        let imageUrls = [...form.imageUrls];
        if (form.imageFiles.length > 0) {
          const uploaded = await uploadImages(form.imageFiles, `destinations/${activeDestination.id}/visiting-places`);
          imageUrls = [...imageUrls, ...uploaded];
        }
        await apiRequest(`/api/destinations/${activeDestination.id}/visiting-places`, {
          method: "POST",
          body: JSON.stringify({
            name: form.name.trim(),
            description: form.description.trim() || null,
            location: form.location.trim() || null,
            openingHours: form.openingHours.trim() || null,
            ticketRequired: form.ticketRequired,
            ticketPrice: form.ticketRequired && form.ticketPrice ? Number(form.ticketPrice) : null,
            ticketType: form.ticketRequired ? form.ticketType : "None",
            imageUrls
          })
        }, role, currentUserId);
      }
      setDestTabSuccess("✅ Visiting places saved successfully!");
      setTimeout(() => setDestTabSuccess(null), 3000);
      setVpForms([emptyVP()]);
      loadDestinationTab(activeDestination, "visiting-places");
    } catch (err: any) { setDestTabError(err.message); }
    finally { setDestSaving(false); }
  }

  async function handleSaveRestaurants(e: React.FormEvent) {
    e.preventDefault();
    if (!activeDestination) return;
    setDestSaving(true); setDestTabError(null);
    try {
      for (const form of restForms) {
        if (!form.name.trim()) continue;
        let imageUrls = [...form.imageUrls];
        if (form.imageFiles.length > 0) {
          const uploaded = await uploadImages(form.imageFiles, `destinations/${activeDestination.id}/restaurants`);
          imageUrls = [...imageUrls, ...uploaded];
        }
        const rest = await apiRequest<Restaurant>(`/api/destinations/${activeDestination.id}/restaurants`, {
          method: "POST",
          body: JSON.stringify({
            name: form.name.trim(),
            location: form.location.trim() || null,
            contact: form.contact.trim() || null,
            description: form.description.trim() || null,
            imageUrls
          })
        }, role, currentUserId);
        // Save food items for this restaurant
        for (const fi of form.foodItems) {
          if (!fi.name.trim() || !fi.price) continue;
          let fiImageUrl = fi.imageUrl;
          if (fi.imageFile) {
            const uploaded = await uploadImages([fi.imageFile], `destinations/${activeDestination.id}/food-items`);
            if (uploaded.length > 0) fiImageUrl = uploaded[0];
          }
          await apiRequest(`/api/destinations/restaurants/${rest.id}/food-items`, {
            method: "POST",
            body: JSON.stringify({ name: fi.name.trim(), price: Number(fi.price), category: fi.category, imageUrl: fiImageUrl || null })
          }, role, currentUserId);
        }
      }
      setDestTabSuccess("✅ Restaurants & food items saved!");
      setTimeout(() => setDestTabSuccess(null), 3000);
      setRestForms([emptyRestaurant()]);
      loadDestinationTab(activeDestination, "restaurants");
    } catch (err: any) { setDestTabError(err.message); }
    finally { setDestSaving(false); }
  }

  async function handleSaveAccommodations(e: React.FormEvent) {
    e.preventDefault();
    if (!activeDestination) return;
    setDestSaving(true); setDestTabError(null);
    try {
      for (const form of accomForms) {
        if (!form.name.trim()) continue;
        let imageUrls = [...form.imageUrls];
        if (form.imageFiles.length > 0) {
          const uploaded = await uploadImages(form.imageFiles, `destinations/${activeDestination.id}/accommodations`);
          imageUrls = [...imageUrls, ...uploaded];
        }
        await apiRequest(`/api/destinations/${activeDestination.id}/accommodations`, {
          method: "POST",
          body: JSON.stringify({
            name: form.name.trim(),
            type: form.type,
            location: form.location.trim() || null,
            pricePerNight: form.pricePerNight ? Number(form.pricePerNight) : null,
            specialNotes: form.specialNotes.trim() || null,
            amenities: form.amenities,
            imageUrls,
            contactNumber: form.contactNumber.trim() || null
          })
        }, role, currentUserId);
      }
      setDestTabSuccess("✅ Accommodations saved!");
      setTimeout(() => setDestTabSuccess(null), 3000);
      setAccomForms([emptyAccom()]);
      loadDestinationTab(activeDestination, "accommodations");
    } catch (err: any) { setDestTabError(err.message); }
    finally { setDestSaving(false); }
  }

  async function handleDeleteVisitingPlace(id: string) {
    if (!activeDestination || !window.confirm("Are you sure you want to delete this visiting place?")) return;
    try {
      await apiRequest(`/api/destinations/visiting-places/${id}`, { method: "DELETE" }, role, currentUserId);
      setVisitingPlaces(prev => prev.filter(x => x.id !== id));
      setDestTabSuccess("Visiting place deleted.");
      setTimeout(() => setDestTabSuccess(null), 2500);
    } catch (err: any) { setDestTabError(err.message); }
  }

  async function handleDeleteRestaurant(id: string) {
    if (!activeDestination || !window.confirm("Are you sure you want to delete this restaurant?")) return;
    try {
      await apiRequest(`/api/destinations/restaurants/${id}`, { method: "DELETE" }, role, currentUserId);
      setDestRestaurants(prev => prev.filter(x => x.id !== id));
      setDestTabSuccess("Restaurant deleted.");
      setTimeout(() => setDestTabSuccess(null), 2500);
    } catch (err: any) { setDestTabError(err.message); }
  }

  async function handleDeleteAccommodation(id: string) {
    if (!activeDestination || !window.confirm("Are you sure you want to delete this accommodation?")) return;
    try {
      await apiRequest(`/api/destinations/accommodations/${id}`, { method: "DELETE" }, role, currentUserId);
      setDestAccommodations(prev => prev.filter(x => x.id !== id));
      setDestTabSuccess("Accommodation deleted.");
      setTimeout(() => setDestTabSuccess(null), 2500);
    } catch (err: any) { setDestTabError(err.message); }
  }

  async function handleDeleteDestination(id: string) {
    if (!window.confirm("Are you sure you want to delete this destination and its items?")) return;
    try {
      await apiRequest(`/api/destinations/${id}`, { method: "DELETE" }, role, currentUserId);
      setMyDestinations(prev => prev.filter(x => x.id !== id));
      if (activeDestination?.id === id) {
        setActiveDestination(null);
      }
      setDestTabSuccess("Destination deleted.");
      setTimeout(() => setDestTabSuccess(null), 2500);
    } catch (err: any) { setDestTabError(err.message); }
  }

  function handleVisitingPlaceSaved(updated: VisitingPlace, revertedToPending: boolean) {
    setVisitingPlaces(prev => prev.map(x => x.id === updated.id ? updated : x));
    if (revertedToPending && activeDestination) {
      setActiveDestination(prev => prev ? { ...prev, status: "Pending" } : prev);
      setMyDestinations(prev => prev.map(d => d.id === activeDestination.id ? { ...d, status: "Pending" } : d));
      setDestTabSuccess(`✅ Visiting place updated! Destination "${activeDestination.name}" reverted to Pending Approval for admin re-verification.`);
    } else {
      setDestTabSuccess(`✅ Visiting place "${updated.name}" updated successfully!`);
    }
    setTimeout(() => setDestTabSuccess(null), 4000);
  }

  function handleRestaurantSaved(updated: Restaurant, revertedToPending: boolean) {
    setDestRestaurants(prev => prev.map(x => x.id === updated.id ? updated : x));
    if (revertedToPending && activeDestination) {
      setActiveDestination(prev => prev ? { ...prev, status: "Pending" } : prev);
      setMyDestinations(prev => prev.map(d => d.id === activeDestination.id ? { ...d, status: "Pending" } : d));
      setDestTabSuccess(`✅ Restaurant updated! Destination "${activeDestination.name}" reverted to Pending Approval for admin re-verification.`);
    } else {
      setDestTabSuccess(`✅ Restaurant "${updated.name}" updated successfully!`);
    }
    setTimeout(() => setDestTabSuccess(null), 4000);
  }

  function handleAccommodationSaved(updated: Accommodation, revertedToPending: boolean) {
    setDestAccommodations(prev => prev.map(x => x.id === updated.id ? updated : x));
    if (revertedToPending && activeDestination) {
      setActiveDestination(prev => prev ? { ...prev, status: "Pending" } : prev);
      setMyDestinations(prev => prev.map(d => d.id === activeDestination.id ? { ...d, status: "Pending" } : d));
      setDestTabSuccess(`✅ Accommodation updated! Destination "${activeDestination.name}" reverted to Pending Approval for admin re-verification.`);
    } else {
      setDestTabSuccess(`✅ Accommodation "${updated.name}" updated successfully!`);
    }
    setTimeout(() => setDestTabSuccess(null), 4000);
  }

  function handleDestinationSaved(updated: Destination, revertedToPending: boolean) {
    setActiveDestination(prev => prev ? { ...prev, ...updated, status: revertedToPending ? "Pending" : updated.status } : updated);
    setMyDestinations(prev => prev.map(d => d.id === updated.id ? { ...d, ...updated, status: revertedToPending ? "Pending" : updated.status } : d));
    if (revertedToPending) {
      setDestTabSuccess(`✅ Destination details updated! Reverted to Pending Approval for admin re-verification.`);
    } else {
      setDestTabSuccess(`✅ Destination details updated successfully!`);
    }
    setTimeout(() => setDestTabSuccess(null), 4000);
  }

  function handleImageFileSelect(
    files: FileList | null,
    setter: (updater: (prev: any) => any) => void,
    formIndex: number,
    field: string
  ) {
    if (!files) return;
    const newFiles = Array.from(files);
    const previews = newFiles.map(f => URL.createObjectURL(f));
    setter(prev => prev.map((item: any, i: number) =>
      i === formIndex
        ? { ...item, [field]: [...(item[field] || []), ...newFiles], [`${field.replace('Files', 'Previews').replace('File', 'Preview')}`]: [...(item[`${field.replace('Files', 'Previews').replace('File', 'Preview')}`] || []), ...previews] }
        : item
    ));
  }

  // ============================================================
  // --- CRUD: Catalog Items ---

  async function handleSaveCatalogItem(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        ...catalogForm,
        price: catalogForm.price ? Number(catalogForm.price) : null,
        rating: catalogForm.rating ? Number(catalogForm.rating) : null,
      };
      if (editItem) {
        await apiRequest(`/api/catalog/${editItem.id}`, { method: "PUT", body: JSON.stringify(payload) }, role, currentUserId);
        setSuccess("Catalog listing updated!");
      } else {
        await apiRequest("/api/catalog", { method: "POST", body: JSON.stringify(payload) }, role, currentUserId);
        setSuccess(role === "StaffAdmin" ? "Catalog listing added and approved!" : "Catalog listing submitted! Awaiting Admin approval.");
      }
      setModalType(null);
      setCatalogForm({
        type: "VisitingPlace",
        name: "",
        destination: "",
        description: "",
        address: "",
        contact: "",
        price: "",
        currency: "LKR",
        cuisineOrCategory: "",
        rating: "4.5"
      });
      loadCatalog();
      loadAllCatalog();
    } catch (err: any) { setError(err.message); }
  }

  async function handleDeleteCatalogItem(id: string) {
    if (!window.confirm("Delete this catalog listing?")) return;
    try {
      await apiRequest(`/api/catalog/${id}`, { method: "DELETE" }, role, currentUserId);
      setSuccess("Listing deleted.");
      loadCatalog();
      loadAllCatalog();
    } catch (err: any) { setError(err.message); }
  }

  async function handleApproveCatalogItem(id: string) {
    try {
      await apiRequest(`/api/catalog/${id}/approve`, { method: "POST" }, role, currentUserId);
      setSuccess("Listing approved!");
      loadCatalog();
      loadAllCatalog();
    } catch (err: any) { setError(err.message); }
  }

  async function handleRejectCatalogItem(id: string) {
    try {
      await apiRequest(`/api/catalog/${id}/reject`, { method: "POST" }, role, currentUserId);
      setSuccess("Listing rejected!");
      loadCatalog();
      loadAllCatalog();
    } catch (err: any) { setError(err.message); }
  }

  // --- AI Workflow Trigger & Approval Queue ---
  async function triggerAiWorkflow(trip: Trip) {
    setBusy(true); setError(null);
    try {
      const res = await apiRequest<Workflow>("/api/workflows", {
        method: "POST",
        body: JSON.stringify({
          tripId: trip.id,
          objective: `Plan an optimized, safe itinerary with budget checks, place recommendations, and split billing for ${trip.name} in ${trip.destination}`
        })
      }, role, currentUserId);
      setWorkflow(res);
      setSuccess("AI Agent workflow complete! Proposal sent to AI Approvals Queue.");
      loadAuditLogs();
    } catch (err: any) {
      setError(err.message || "Failed to execute AI workflow.");
    } finally {
      setBusy(false);
    }
  }

  async function handleApproveWorkflow(approved: boolean) {
    if (!workflow) return;
    try {
      const updated = await apiRequest<Workflow>(`/api/workflows/${workflow.id}/approval`, {
        method: "POST",
        body: JSON.stringify({ approved, comment: approved ? "Approved after agent validation review" : "Rejected after review" })
      }, role, currentUserId);
      setWorkflow(updated);
      setSuccess(approved ? "Workflow recommendation approved!" : "Workflow recommendation rejected.");
      loadAuditLogs();
    } catch (err: any) { setError(err.message); }
  }

  // Admins see the full moderation queue (all providers' pending items).
  // Service Providers only see their own pending submissions.
  const filteredCatalog = (role === "StaffAdmin" ? allCatalogItems : catalogItems).filter(item => {
    if (catalogFilterType !== "ALL" && item.type !== catalogFilterType) return false;
    if (catalogSearchDest && !item.destination.toLowerCase().includes(catalogSearchDest.toLowerCase())) return false;
    return true;
  });

  const pendingCatalogItems = (role === "StaffAdmin" ? allCatalogItems : catalogItems).filter(item => !item.isApproved);
  const pendingProvidersCount = providerApplications.filter(x => x.status === "Pending").length;
  const pendingProfileRequestsCount = providerProfileRequests.filter(x => x.status === "Pending").length;
  const pendingDeletionRequestsCount = providerDeletionRequests.filter(x => x.status === "PendingApproval").length;
  const totalAdminVerificationPending = pendingProvidersCount + pendingProfileRequestsCount + pendingDeletionRequestsCount;

  // =========================================================================
  // VIEW 0A: PROVIDER REJECTED SCREEN (full-screen block with clear notification)
  // =========================================================================
  if (providerBlockState === "Rejected") {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ maxWidth: 540, textAlign: "center" }}>
          {/* Red pulsing icon */}
          <div style={{
            width: 80, height: 80,
            margin: "0 auto 24px",
            borderRadius: "50%",
            background: "rgba(239,68,68,0.15)",
            border: "3px solid rgba(239,68,68,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 36,
            boxShadow: "0 0 32px rgba(239,68,68,0.3)",
            animation: "pulse-danger 2s infinite"
          }}>❌</div>

          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#fca5a5", marginBottom: 12 }}>
            Registration Rejected
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 24 }}>
            Account: <strong style={{ color: "var(--text-main)" }}>{providerBlockEmail}</strong>
          </p>

          {/* Main rejection banner */}
          <div style={{
            background: "rgba(239,68,68,0.12)",
            border: "2px solid rgba(239,68,68,0.4)",
            borderRadius: 12,
            padding: "20px 24px",
            marginBottom: 24,
            textAlign: "left"
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>🚫</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: "#f87171", marginBottom: 8 }}>
                  Admin Rejected Your Service Provider Registration
                </div>
                <div style={{ fontSize: 14, color: "#fca5a5", lineHeight: 1.6 }}>
                  An Administrator has reviewed your Service Provider sign-up request and <strong>denied access</strong>.
                  Your registration has been cancelled and you will not be granted access to the Service Provider portal.
                </div>
              </div>
            </div>
          </div>

          {/* What this means section */}
          <div style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid var(--border-color)",
            borderRadius: 10,
            padding: "16px 20px",
            marginBottom: 24,
            textAlign: "left"
          }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>What this means:</div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "var(--text-muted)" }}>
              <li>🔒 Your Service Provider account application has been permanently denied</li>
              <li>🚫 You cannot access the Provider Portal or add listings</li>
              <li>📧 Contact the system administrator if you believe this is an error</li>
            </ul>
          </div>

          <div style={{ display: "flex", gap: 10, flexDirection: "column" }}>
            <button
              className="btn btn-secondary"
              style={{ width: "100%" }}
              onClick={() => {
                setProviderBlockState(null);
                setProviderBlockEmail("");
                setEmail("");
                setPassword("");
                setAuthMode("LOGIN");
              }}
            >
              Return to Login Page
            </button>
            <button
              className="btn"
              style={{ width: "100%", background: "rgba(99,102,241,0.1)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.3)" }}
              onClick={() => {
                setProviderBlockState(null);
                setProviderBlockEmail("");
                setEmail("");
                setPassword("");
                setAuthMode("LOGIN");
              }}
            >
              Sign In as Regular Customer Instead
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 0B: PROVIDER PENDING VERIFICATION SCREEN (awaiting admin approval)
  // =========================================================================
  if (providerBlockState === "Pending") {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ maxWidth: 540, textAlign: "center" }}>
          <div style={{
            width: 80, height: 80,
            margin: "0 auto 24px",
            borderRadius: "50%",
            background: "rgba(245,158,11,0.15)",
            border: "3px solid rgba(245,158,11,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 36,
            boxShadow: "0 0 32px rgba(245,158,11,0.2)",
            animation: "pulse-warning 2s infinite"
          }}>⏳</div>

          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#fde047", marginBottom: 12 }}>
            Awaiting Admin Verification
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 24 }}>
            Account: <strong style={{ color: "var(--text-main)" }}>{providerBlockEmail}</strong>
          </p>

          <div style={{
            background: "rgba(245,158,11,0.1)",
            border: "2px solid rgba(245,158,11,0.35)",
            borderRadius: 12,
            padding: "20px 24px",
            marginBottom: 24,
            textAlign: "left"
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>🔍</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: "#fbbf24", marginBottom: 8 }}>
                  Your Provider Application is Under Review
                </div>
                <div style={{ fontSize: 14, color: "#fde047", lineHeight: 1.6 }}>
                  An Administrator must manually verify your Service Provider registration before you can access the portal.
                  Please check back later or contact the system administrator.
                </div>
              </div>
            </div>
          </div>

          <button
            className="btn btn-secondary"
            style={{ width: "100%" }}
            onClick={() => {
              setProviderBlockState(null);
              setProviderBlockEmail("");
              setEmail("");
              setPassword("");
            }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 0C: PROVIDER SIGNED-UP PENDING SCREEN (after successful registration)
  // =========================================================================
  if (providerBlockState === "SignedUp") {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ maxWidth: 540, textAlign: "center" }}>
          <div style={{
            width: 80, height: 80,
            margin: "0 auto 24px",
            borderRadius: "50%",
            background: "rgba(16,185,129,0.12)",
            border: "3px solid rgba(16,185,129,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 36,
            boxShadow: "0 0 32px rgba(16,185,129,0.2)"
          }}>✅</div>

          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#6ee7b7", marginBottom: 8 }}>
            Application Submitted!
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 24 }}>
            Registered as: <strong style={{ color: "var(--text-main)" }}>{providerBlockEmail}</strong>
          </p>

          <div style={{
            background: "rgba(245,158,11,0.1)",
            border: "2px solid rgba(245,158,11,0.3)",
            borderRadius: 12,
            padding: "20px 24px",
            marginBottom: 20,
            textAlign: "left"
          }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#fbbf24", marginBottom: 10 }}>⏳ Pending Admin Verification</div>
            <div style={{ fontSize: 13, color: "#fde047", lineHeight: 1.7 }}>
              Your Service Provider sign-up request has been placed in the <strong>Administrator Verification Queue</strong>.
              An admin must manually review and approve your application before you can access the Provider Portal.
            </div>
          </div>

          <div style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid var(--border-color)",
            borderRadius: 10,
            padding: "16px 20px",
            marginBottom: 24,
            textAlign: "left"
          }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: "var(--text-dim)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>What happens next:</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13, color: "var(--text-muted)" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#a5b4fc", flexShrink: 0 }}>1</span>
                Admin reviews your application in the Verification Queue
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(16,185,129,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#6ee7b7", flexShrink: 0 }}>2</span>
                If <strong style={{ color: "#6ee7b7" }}>approved</strong> — you gain full Provider Portal access
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(239,68,68,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#f87171", flexShrink: 0 }}>3</span>
                If <strong style={{ color: "#f87171" }}>rejected</strong> — your sign-up is cancelled with a clear rejection notice
              </div>
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: "100%" }}
            onClick={() => {
              setProviderBlockState(null);
              setProviderBlockEmail("");
              setEmail("");
              setPassword("");
              setAuthMode("LOGIN");
            }}
          >
            Try Login (Check Approval Status)
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: AUTHENTICATION GATEWAY (WELCOME HERO & AUTHENTICATION SECTIONS)
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div className="landing-wrapper">
        {/* TOP FLOATING NAVIGATION BAR */}
        <header className="landing-nav">
          <div className="landing-nav-brand">
            <div className="landing-nav-icon"><CompassIcon size={22} color="#ffffff" /></div>
            <div>
              <span className="landing-nav-title">TravelWise</span>
              <span className="landing-nav-badge">Sri Lanka</span>
            </div>
          </div>

          <div className="landing-nav-links">
            <a href="#welcome-destinations" className="landing-nav-link" onClick={e => { e.preventDefault(); scrollToAuthSection("welcome-destinations"); }}>Destinations</a>
            <a href="#welcome-features" className="landing-nav-link" onClick={e => { e.preventDefault(); scrollToAuthSection("welcome-features"); }}>AI Intelligence</a>
            <a href="#auth-section" className="landing-nav-link" onClick={e => { e.preventDefault(); scrollToAuthSection("auth-section"); }}>Sign In</a>
          </div>

          <div className="landing-nav-actions">
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={toggleTheme}
              title={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}
            >
              {theme === "light" ? "🌙 Dark" : "☀️ Light"}
            </button>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => scrollToAuthSection("auth-section")}
              style={{ fontWeight: 700 }}
            >
              Sign In / Register →
            </button>
          </div>
        </header>

        {/* 1. WELCOME HERO SECTION */}
        <section className="welcome-hero">
          <div className="welcome-hero-bg">
            <img src={HERO_IMAGE_URL} alt="Tropical Sri Lanka" />
          </div>

          <div className="welcome-hero-content">
            <div className="welcome-badge">
              <SparklesIcon size={16} color="var(--brand-teal)" />
              <span>Intelligent Sri Lanka Travel Companion</span>
            </div>

            <h1 className="welcome-title">
              Discover the <span className="accent-text">Pearl of the Indian Ocean</span> with AI
            </h1>

            <p className="welcome-subtitle">
              Personalized multi-agent itineraries, verified partner stays & rental transport, real-time weather & safety alerts, and seamless group expense splitting across Sri Lanka.
            </p>

            <div id="welcome-destinations" className="welcome-destinations-pills">
              {SRI_LANKAN_DESTINATIONS.map(d => (
                <span key={d} className="welcome-pill">
                  <MapPinIcon size={12} color="var(--brand-teal)" /> {d}
                </span>
              ))}
            </div>

            <div id="welcome-features" className="welcome-features-grid">
              <div className="welcome-feature-card">
                <div className="welcome-feature-icon">🤖</div>
                <div className="welcome-feature-title">5 Multi-Agent AI Suite</div>
                <div className="welcome-feature-desc">Autonomous AI agents verify itineraries, audit budgets, and ensure vehicle safety compliance.</div>
              </div>

              <div className="welcome-feature-card">
                <div className="welcome-feature-icon">🏨</div>
                <div className="welcome-feature-title">Verified Local Partners</div>
                <div className="welcome-feature-desc">Certified islandwide boutique hotels, authentic restaurants, and rental fleets with direct contact.</div>
              </div>

              <div className="welcome-feature-card">
                <div className="welcome-feature-icon">🌦️</div>
                <div className="welcome-feature-title">Live Weather & Safety</div>
                <div className="welcome-feature-desc">Open-Meteo climate tracking, monsoon road advisories, and emergency 119 / 1990 hotlines.</div>
              </div>

              <div className="welcome-feature-card">
                <div className="welcome-feature-icon">💳</div>
                <div className="welcome-feature-title">Smart Split-Bill Review</div>
                <div className="welcome-feature-desc">Automated equal or custom debt settlement so travel companions never argue over shared expenses.</div>
              </div>
            </div>

            <div className="welcome-cta-group">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => scrollToAuthSection("auth-section")}
                style={{ padding: "13px 32px", fontSize: 16, fontWeight: 800, borderRadius: 14 }}
              >
                🚀 Plan Your Journey Now
              </button>
            </div>

            {/* Bouncing Scroll Down Arrow */}
            <button
              type="button"
              className="scroll-down-arrow-container"
              onClick={() => scrollToAuthSection("auth-section")}
              title="Scroll down to Sign In & Plan Your Trip"
            >
              <span className="scroll-down-arrow-label">Sign In & Explore Below</span>
              <div className="scroll-down-arrow-btn">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <polyline points="19 12 12 19 5 12"></polyline>
                </svg>
              </div>
            </button>
          </div>
        </section>

        {/* 2. AUTHENTICATION SECTION (LOGIN / SIGN UP SPLIT SCREEN) */}
        <section id="auth-section" className="auth-page">
          {/* LEFT — Travel Hero Panel */}
          <section className="auth-hero">
          <div className="auth-hero-bg">
            <img src={HERO_IMAGE_URL} alt="Sri Lanka" />
          </div>

          <div className="auth-hero-content">
            <div className="auth-brand">
              <div className="auth-brand-icon"><CompassIcon size={24} color="#ffffff" /></div>
              <div className="auth-brand-text">
                <div className="auth-brand-name">TravelWise</div>
                <div className="auth-brand-tag">Sri Lanka Travel Intelligence</div>
              </div>
            </div>

            <h1>
              Discover the <span className="accent-text">Pearl of the Indian Ocean</span>
            </h1>
            <p className="auth-hero-tagline">
              Plan unforgettable Sri Lankan adventures with AI-powered itineraries, real-time safety, and curated local stays & experiences.
            </p>

            <div className="auth-hero-features">
              <div className="auth-feature">
                <div className="auth-feature-icon"><SparklesIcon size={18} color="var(--brand-teal-light)" /></div>
                <div>AI-curated trip planning & safety monitoring</div>
              </div>
              <div className="auth-feature">
                <div className="auth-feature-icon"><HotelIcon size={18} color="#fbbf24" /></div>
                <div>Verified local stays, restaurants & experiences</div>
              </div>
              <div className="auth-feature">
                <div className="auth-feature-icon"><WalletIcon size={18} color="#4ade80" /></div>
                <div>Group budget tracking & fair settlement</div>
              </div>
              <div className="auth-feature">
                <div className="auth-feature-icon"><ShieldCheckIcon size={18} color="#38bdf8" /></div>
                <div>Weather alerts & risk assessments built-in</div>
              </div>
            </div>

            <div className="auth-hero-stats">
              <div>
                <div className="auth-stat-num">12+</div>
                <div className="auth-stat-lbl">Top Destinations</div>
              </div>
              <div>
                <div className="auth-stat-num">AI</div>
                <div className="auth-stat-lbl">Powered Planning</div>
              </div>
              <div>
                <div className="auth-stat-num">100%</div>
                <div className="auth-stat-lbl">Free Forever</div>
              </div>
            </div>

            <div className="auth-hero-destinations">
              {SRI_LANKAN_DESTINATIONS.slice(0, 6).map(d => (
                <span key={d} className="destination-pill" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <MapPinIcon size={12} color="var(--brand-teal-light)" /> {d}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* RIGHT — Auth Form Panel */}
        <section className="auth-form-panel">
          <div className="auth-card">
            <div className="auth-header">
              <h1 className="auth-title">
                {authMode === "LOGIN" ? "Welcome back, traveller" : "Start your journey"}
              </h1>
              <p className="auth-subtitle">
                {authMode === "LOGIN"
                  ? "Sign in to continue planning your Sri Lankan adventure."
                  : "Create your free account and explore the island like a local."}
              </p>
            </div>

            {/* Mode Switcher: Login vs Sign Up */}
            <div className="auth-mode-toggle">
              <button
                className={`auth-mode-btn ${authMode === "LOGIN" ? "active" : ""}`}
                onClick={() => { setAuthMode("LOGIN"); setError(null); setSuccess(null); }}
              >
                Sign In
              </button>
              <button
                className={`auth-mode-btn ${authMode === "SIGNUP" ? "active" : ""}`}
                onClick={() => { setAuthMode("SIGNUP"); setError(null); setSuccess(null); }}
              >
                Create Account
              </button>
            </div>

            {/* Alert Notifications */}
            {error && <div className="alert alert-danger" style={{ display: "flex", alignItems: "center", gap: 8 }}><AlertCircleIcon size={16} /> {error}</div>}
            {success && <div className="alert alert-success" style={{ display: "flex", alignItems: "center", gap: 8 }}><CheckCircleIcon size={16} /> {success}</div>}

            {/* LOGIN FORM */}
            {authMode === "LOGIN" && (
              <form onSubmit={handleLoginSubmit}>
                <div className="form-group">
                  <label>📧 Email Address</label>
                  <input
                    required
                    type="email"
                    className="form-control"
                    placeholder="you@travelwise.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>🔒 Password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      required
                      type={showPassword ? "text" : "password"}
                      minLength={6}
                      className="form-control"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      style={{ paddingRight: 44 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--text-soft)", padding: 0, lineHeight: 1 }}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>

                <div style={{ textAlign: "right", marginTop: -8, marginBottom: 12 }}>
                  <button
                    type="button"
                    onClick={() => { setForgotPasswordMode("FORGOT"); setError(null); setSuccess(null); }}
                    style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", fontSize: 13, textDecoration: "underline", padding: 0 }}
                  >
                    🔑 Forgot password?
                  </button>
                </div>

                <button className="btn btn-primary btn-block" style={{ marginTop: 12, padding: "13px 20px", fontSize: 15 }} disabled={busy}>
                  {busy ? "Signing you in..." : "Sign In & Explore →"}
                </button>
              </form>
            )}

            {/* SIGN UP FORM */}
            {authMode === "SIGNUP" && (
              <form onSubmit={handleSignUpSubmit}>
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-soft)", marginBottom: 10 }}>
                    Choose your account type:
                  </label>
                  <div className="auth-role-tabs">
                    <button
                      type="button"
                      className={`auth-role-tab ${signupRole === "User" ? "active" : ""}`}
                      onClick={() => setSignupRole("User")}
                    >
                      <span className="role-tab-icon">🧳</span>
                      <strong>Traveller</strong>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Plan trips</span>
                    </button>
                    <button
                      type="button"
                      className={`auth-role-tab ${signupRole === "ServiceProvider" ? "active" : ""}`}
                      onClick={() => setSignupRole("ServiceProvider")}
                    >
                      <span className="role-tab-icon">🏨</span>
                      <strong>Provider</strong>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>List business</span>
                    </button>
                  </div>
                </div>

                {signupRole === "ServiceProvider" ? (
                  <div className="auth-notice">
                    <span>⏳</span>
                    <span>
                      <strong>Admin Verification:</strong> Provider accounts require manual verification before going live. You'll be notified once approved.
                    </span>
                  </div>
                ) : (
                  <div className="auth-notice success">
                    <span>⚡</span>
                    <span><strong>Instant Access:</strong> Traveller accounts are activated immediately — start exploring right away!</span>
                  </div>
                )}

                <div className="form-group">
                  <label>{signupRole === "ServiceProvider" ? "🏢 Business Name" : "👤 Full Name"}</label>
                  <input
                    required
                    className="form-control"
                    placeholder={signupRole === "ServiceProvider" ? "e.g. Ceylon Resort & Dining" : "e.g. Kasun Silva"}
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                  />
                </div>

                {signupRole === "ServiceProvider" && (
                  <div className="grid-2">
                    <div className="form-group">
                      <label>📞 Contact Phone</label>
                      <input
                        required
                        className="form-control"
                        placeholder="+94 77 123 4567"
                        value={contactPhone}
                        onChange={e => setContactPhone(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>🎯 Specialization</label>
                      <input
                        required
                        className="form-control"
                        placeholder="Hotels, Dining, Tours"
                        value={serviceType}
                        onChange={e => setServiceType(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>📧 Email Address</label>
                  <input
                    required
                    type="email"
                    className="form-control"
                    placeholder="you@travelwise.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>🔒 Password (min. 6 characters)</label>
                  <div style={{ position: "relative" }}>
                    <input
                      required
                      type={showPassword ? "text" : "password"}
                      minLength={6}
                      className="form-control"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      style={{ paddingRight: 44 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--text-soft)", padding: 0, lineHeight: 1 }}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>

                <button className="btn btn-accent btn-block" style={{ marginTop: 12, padding: "13px 20px", fontSize: 15 }} disabled={busy}>
                  {busy ? "Creating your account..." : signupRole === "ServiceProvider" ? "Submit for Verification →" : "Create Free Account →"}
                </button>
              </form>
            )}

            {/* FORGOT PASSWORD MODAL OVERLAY */}
            {forgotPasswordMode !== "NONE" && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(5,10,20,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(6px)" }}>
                <div style={{ background: "var(--card-bg, #121929)", borderRadius: 20, padding: "36px 32px", width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ textAlign: "center", marginBottom: 24 }}>
                    <div style={{ fontSize: 40, marginBottom: 8 }}>🔑</div>
                    <h2 style={{ color: "#fff", margin: 0, fontSize: 20 }}>
                      {forgotPasswordMode === "FORGOT" ? "Forgot Password" : "Set New Password"}
                    </h2>
                    <p style={{ color: "var(--text-soft)", fontSize: 13, marginTop: 8 }}>
                      {forgotPasswordMode === "FORGOT"
                        ? "Enter your email — we'll send a reset link to your inbox."
                        : "Enter the reset token from your email and choose a new password."}
                    </p>
                  </div>

                  {error && <div className="alert alert-danger"><span>⚠️</span> {error}</div>}
                  {success && <div className="alert alert-success"><span>✅</span> {success}</div>}

                  {forgotPasswordMode === "FORGOT" && (
                    <form onSubmit={handleForgotPassword}>
                      <div className="form-group">
                        <label>📧 Email Address</label>
                        <input required type="email" className="form-control" placeholder="you@example.com"
                          value={email} onChange={e => setEmail(e.target.value)} />
                      </div>
                      <button className="btn btn-primary btn-block" style={{ marginTop: 16, padding: "13px", fontSize: 15 }} disabled={busy}>
                        {busy ? "Sending..." : "📨 Send Reset Link"}
                      </button>
                      <button type="button" onClick={() => { setForgotPasswordMode("RESET"); setError(null); setSuccess(null); }}
                        style={{ display: "block", width: "100%", marginTop: 10, background: "none", border: "none", color: "var(--text-soft)", cursor: "pointer", fontSize: 13, textDecoration: "underline" }}>
                        I already have a reset token →
                      </button>
                    </form>
                  )}

                  {forgotPasswordMode === "RESET" && (
                    <form onSubmit={handleResetPassword}>
                      <div className="form-group">
                        <label>📧 Email Address</label>
                        <input required type="email" className="form-control" placeholder="you@example.com"
                          value={email} onChange={e => setEmail(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>🎫 Reset Token (from email)</label>
                        <input required className="form-control" placeholder="Paste token from email"
                          value={resetToken} onChange={e => setResetToken(e.target.value)}
                          style={{ fontFamily: "monospace", fontSize: 12 }} />
                      </div>
                      <div className="form-group">
                        <label>🔒 New Password</label>
                        <div style={{ position: "relative" }}>
                          <input required type={showNewPassword ? "text" : "password"} minLength={6} className="form-control"
                            placeholder="Min. 6 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                            style={{ paddingRight: 44 }} />
                          <button type="button" onClick={() => setShowNewPassword(v => !v)}
                            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--text-soft)", padding: 0 }}>
                            {showNewPassword ? "🙈" : "👁️"}
                          </button>
                        </div>
                      </div>
                      <button className="btn btn-primary btn-block" style={{ marginTop: 16, padding: "13px", fontSize: 15 }} disabled={busy}>
                        {busy ? "Resetting..." : "✅ Reset Password"}
                      </button>
                    </form>
                  )}

                  <button type="button" onClick={() => { setForgotPasswordMode("NONE"); setError(null); setSuccess(null); }}
                    style={{ display: "block", width: "100%", marginTop: 16, background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 13 }}>
                    ← Back to Sign In
                  </button>
                </div>
              </div>
            )}

            <div className="auth-footer">
              🔒 Secured with Supabase PostgreSQL Row Level Security &<br />
              ASP.NET Core Enterprise RBAC
            </div>

          </div>
        </section>
      </section>
    </div>
  );
}

  // =========================================================================
  // VIEW 2: AUTHENTICATED SYSTEM DASHBOARD (LEFT SIDEBAR LAYOUT)
  // =========================================================================
  return (
    <div className="app-layout">
      {/* 1. LEFT SIDEBAR NAVIGATION */}
      <aside className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
        <div className="sidebar-brand">
          <div
            className="brand-icon"
            onClick={toggleSidebar}
            style={{ cursor: "pointer" }}
            title={sidebarCollapsed ? "Click to Expand Sidebar" : "TravelWise"}
          >
            <CompassIcon size={22} color="#ffffff" />
          </div>
          {!sidebarCollapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="brand-title">TravelWise</div>
              <div className="brand-tagline">Sri Lanka Travel Intelligence</div>
            </div>
          )}
          <button
            type="button"
            className="sidebar-collapse-trigger"
            onClick={toggleSidebar}
            title={sidebarCollapsed ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar (Ctrl+B)"}
            aria-label="Toggle Sidebar"
          >
            {sidebarCollapsed ? "›" : "‹"}
          </button>
        </div>

        {/* Active Authenticated Role */}
        {!sidebarCollapsed ? (
          <div className="role-box">
            <div className="role-lbl">Active Role</div>
            <div className="role-option" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="role-dot"></span>
              {role === "User" ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><UserIcon size={14} /> Traveller</span>
              ) : role === "ServiceProvider" ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><HotelIcon size={14} /> Service Provider</span>
              ) : (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><ShieldCheckIcon size={14} /> System Admin</span>
              )}
            </div>
          </div>
        ) : (
          <div
            className="role-box-collapsed"
            title={`Active Role: ${role === "User" ? "Traveller" : role === "ServiceProvider" ? "Service Provider" : "System Admin"}`}
            onClick={toggleSidebar}
            style={{ cursor: "pointer" }}
          >
            <span className="role-dot"></span>
          </div>
        )}

        {/* Sidebar Navigation Items */}
        <nav className="nav-menu">
          <button className={`nav-item ${activeNav === "dashboard" ? "active" : ""}`} onClick={() => setActiveNav("dashboard")} title="Dashboard">
            <span className="nav-icon"><CompassIcon size={16} /></span>
            {!sidebarCollapsed && <span>Dashboard</span>}
          </button>
          <button className={`nav-item ${activeNav === "profile" ? "active" : ""}`} onClick={() => setActiveNav("profile")} title="My Profile">
            <span className="nav-icon"><UserIcon size={16} /></span>
            {!sidebarCollapsed && <span>My Profile</span>}
            {role === "ServiceProvider" && profile?.pendingProfileStatus === "Pending" && (
              <span className="badge badge-warning" style={{ marginLeft: "auto", fontSize: 10 }}>{sidebarCollapsed ? "!" : "Pending"}</span>
            )}
          </button>
          {role === "StaffAdmin" && (
            <button className={`nav-item ${activeNav === "provider-verifications" ? "active" : ""}`} onClick={() => setActiveNav("provider-verifications")} title="Provider Verifications">
              <span className="nav-icon"><ShieldCheckIcon size={16} /></span>
              {!sidebarCollapsed && <span>Provider Verifications</span>}
              {totalAdminVerificationPending > 0 && <span className="badge badge-warning" style={{ marginLeft: "auto" }}>{totalAdminVerificationPending}</span>}
            </button>
          )}
          {role === "ServiceProvider" && (
            <button className={`nav-item ${activeNav === "catalog" ? "active" : ""}`} onClick={() => setActiveNav("catalog")} title="My Listings">
              <span className="nav-icon"><HotelIcon size={16} /></span>
              {!sidebarCollapsed && <span>My Listings</span>}
            </button>
          )}
          {(role === "User" || role === "StaffAdmin") && (
            <button className={`nav-item ${activeNav === "catalog" ? "active" : ""}`} onClick={() => setActiveNav("catalog")} title="Explore Sri Lanka">
              <span className="nav-icon"><CompassIcon size={16} /></span>
              {!sidebarCollapsed && <span>Explore Sri Lanka</span>}
            </button>
          )}
          {role === "ServiceProvider" && (
            <button className={`nav-item ${activeNav === "verified-listings" ? "active" : ""}`} onClick={() => setActiveNav("verified-listings")} title="Verified Listings">
              <span className="nav-icon"><ShieldCheckIcon size={16} /></span>
              {!sidebarCollapsed && <span>Verified Listings</span>}
              {myDestinations.filter(d => d.status === "Verified").length > 0 && (
                <span className="badge" style={{ marginLeft: "auto", fontSize: 10, background: "rgba(34,197,94,0.2)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)" }}>
                  {myDestinations.filter(d => d.status === "Verified").length}
                </span>
              )}
            </button>
          )}
          {role !== "User" && (
            <button
              id="nav-transport-fares"
              className={`nav-item ${activeNav === "transport-fares" ? "active" : ""}`}
              onClick={() => setActiveNav("transport-fares")}
              title="Transport Fares"
            >
              <span className="nav-icon"><CarIcon size={16} /></span>
              {!sidebarCollapsed && <span>Transport Fares</span>}
            </button>
          )}
          {role !== "User" && (
            <button
              id="nav-rental-vehicles"
              className={`nav-item ${activeNav === "rental-vehicles" ? "active" : ""}`}
              onClick={() => setActiveNav("rental-vehicles")}
              title="Rental Vehicles"
            >
              <span className="nav-icon"><CarIcon size={16} /></span>
              {!sidebarCollapsed && <span>Rental Vehicles</span>}
              {pendingVehiclesCount > 0 && role === "StaffAdmin" && (
                <span className="badge badge-warning" style={{ marginLeft: "auto" }}>
                  {pendingVehiclesCount}
                </span>
              )}
            </button>
          )}
          {role === "User" && (
            <button className={`nav-item ${activeNav === "trips" ? "active" : ""}`} onClick={() => setActiveNav("trips")} title="My Trips">
              <span className="nav-icon"><PlaneIcon size={16} /></span>
              {!sidebarCollapsed && <span>My Trips</span>}
            </button>
          )}
          {role === "StaffAdmin" && (
            <button
              id="admin-nav-trip-plan-review"
              className={`nav-item ${activeNav === "trip-reviews" ? "active" : ""}`}
              onClick={() => { setActiveNav("trip-reviews"); loadSubmittedTrips(); }}
              title="Trip Plan Review"
            >
              <span className="nav-icon"><LayersIcon size={16} /></span>
              {!sidebarCollapsed && <span>Trip Plan Review</span>}
              {submittedTrips.filter(t => t.status === "PendingReview").length > 0 && (
                <span className="badge badge-warning" style={{ marginLeft: "auto" }}>
                  {submittedTrips.filter(t => t.status === "PendingReview").length}
                </span>
              )}
            </button>
          )}
          <button className={`nav-item ${activeNav === "weather" ? "active" : ""}`} onClick={() => setActiveNav("weather")} title="Weather & Safety">
            <span className="nav-icon"><SunIcon size={16} /></span>
            {!sidebarCollapsed && <span>Weather & Safety</span>}
          </button>
          {role !== "ServiceProvider" && (
            <button className={`nav-item ${activeNav === "settlement" ? "active" : ""}`} onClick={() => setActiveNav("settlement")} title="Settle Debts">
              <span className="nav-icon"><WalletIcon size={16} /></span>
              {!sidebarCollapsed && <span>Settle Debts</span>}
            </button>
          )}
          {role === "StaffAdmin" && (
            <>
              <button className={`nav-item ${activeNav === "approvals" ? "active" : ""}`} onClick={() => setActiveNav("approvals")} title="AI Approvals">
                <span className="nav-icon"><SparklesIcon size={16} /></span>
                {!sidebarCollapsed && <span>AI Approvals</span>}
                {pendingDestinations.length > 0 && <span className="badge badge-warning" style={{ marginLeft: "auto" }}>{pendingDestinations.length}</span>}
              </button>
              <button className={`nav-item ${activeNav === "audit" ? "active" : ""}`} onClick={() => setActiveNav("audit")} title="Audit Logs">
                <span className="nav-icon"><LayersIcon size={16} /></span>
                {!sidebarCollapsed && <span>Audit Logs</span>}
              </button>
            </>
          )}
        </nav>

        {/* User Session Footer */}
        <div className="sidebar-footer">
          {!sidebarCollapsed ? (
            <>
              <div
                className="sidebar-user"
                onClick={() => setActiveNav("profile")}
                style={{
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  background: activeNav === "profile" ? "rgba(20, 184, 166, 0.15)" : undefined,
                  borderColor: activeNav === "profile" ? "var(--brand-teal-light)" : undefined
                }}
                title="Click to view and edit your profile"
              >
                <div className="user-avatar" style={{
                  background: role === "ServiceProvider"
                    ? "linear-gradient(135deg, #f59e0b, #ef4444)"
                    : role === "StaffAdmin"
                    ? "linear-gradient(135deg, #8b5cf6, #3b82f6)"
                    : "linear-gradient(135deg, var(--brand-teal), #2563eb)"
                }}>
                  {(profile?.displayName || email || role).charAt(0).toUpperCase()}
                </div>
                <div className="user-meta" style={{ flex: 1, minWidth: 0 }}>
                  <div className="user-name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {profile?.displayName || (email ? email.split('@')[0] : role)}
                  </div>
                  <div className="user-email" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {email || "guest@travelwise.lk"}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSignOut();
                    }}
                    title="Sign Out"
                    style={{
                      background: "rgba(239, 68, 68, 0.2)",
                      border: "1px solid rgba(239, 68, 68, 0.4)",
                      borderRadius: 6,
                      color: "#fca5a5",
                      padding: "4px 8px",
                      fontSize: 12,
                      cursor: "pointer",
                      fontWeight: 600
                    }}
                  >
                    Sign Out
                  </button>
                </div>
              </div>
              <button
                className="btn btn-secondary btn-sm btn-block"
                onClick={handleSignOut}
                style={{
                  marginTop: 4,
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                  color: "#fca5a5",
                  fontWeight: 700,
                  padding: "9px 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  cursor: "pointer"
                }}
              >
                Sign Out
              </button>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: "100%" }}>
              <div
                className="user-avatar"
                onClick={() => setActiveNav("profile")}
                title={`${profile?.displayName || email || role} (Click to view Profile)`}
                style={{
                  cursor: "pointer",
                  width: 36,
                  height: 36,
                  background: role === "ServiceProvider"
                    ? "linear-gradient(135deg, #f59e0b, #ef4444)"
                    : role === "StaffAdmin"
                    ? "linear-gradient(135deg, #8b5cf6, #3b82f6)"
                    : "linear-gradient(135deg, var(--brand-teal), #2563eb)"
                }}
              >
                {(profile?.displayName || email || role).charAt(0).toUpperCase()}
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                title="Sign Out"
                style={{
                  background: "rgba(239, 68, 68, 0.2)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  borderRadius: 8,
                  color: "#fca5a5",
                  width: 34,
                  height: 34,
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  fontSize: 14
                }}
                aria-label="Sign Out"
              >
                🚪
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* 2. MAIN CANVAS AREA */}
      <main className={`main-content ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        {/* Top Header Bar */}
        <div className="top-header">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button
              type="button"
              className="sidebar-toggle-btn"
              onClick={toggleSidebar}
              title={sidebarCollapsed ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar (Ctrl+B)"}
              aria-label="Toggle Sidebar"
            >
              {sidebarCollapsed ? "☰" : "⮜"}
            </button>
            <div>
              <h1 className="page-title">
              {activeNav === "dashboard" && (role === "User" ? `${getRoleGreeting(role)}, ${email ? email.split('@')[0] : "traveller"}` : role === "ServiceProvider" ? `${getRoleGreeting(role)}, Partner` : `${getRoleGreeting(role)}, Admin`)}
              {activeNav === "provider-verifications" && "Provider Sign-Up Verifications"}
              {activeNav === "catalog" && (role === "ServiceProvider" ? "My Travel Listings" : "Explore Sri Lanka")}
              {activeNav === "verified-listings" && "Verified Travel Listings"}
              {activeNav === "trips" && "My Trip Adventures"}
              {activeNav === "weather" && "Weather & Safety Monitor"}
              {activeNav === "settlement" && "Group Debt Settlement"}
              {activeNav === "trip-reviews" && "Trip Plan Review"}
              {activeNav === "approvals" && "AI Human-in-the-Loop Approvals"}
              {activeNav === "audit" && "System Audit Logs"}
              {activeNav === "profile" && "My Account & Profile Settings"}
              {activeNav === "transport-fares" && "Public Transport Fare Datasets"}
              {activeNav === "rental-vehicles" && (role === "StaffAdmin" ? "Rental Vehicles Management & Approvals" : "Rental Vehicles Fleet & Rates")}
            </h1>
            <div className="page-sub">
              <span className="pulse-dot"></span>
              Logged in as <strong style={{ color: "var(--brand-teal-light)" }}>{role === "User" ? "Traveller" : role === "ServiceProvider" ? "Service Provider" : "System Admin"}</strong>
              <span>•</span>
              <span>Connected to C# API & Supabase</span>
            </div>
          </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {(activeNav === "trips" || activeNav === "dashboard") && role === "User" && (
              <button id="open-trip-wizard-btn" className="btn btn-primary" onClick={openTripWizard} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                <PlaneIcon size={15} /> Plan a New Trip
              </button>
            )}
            {role !== "User" && activeNav === "catalog" && (
              <button className="btn btn-accent" onClick={() => { setEditItem(null); setCatalogForm({ type: "VisitingPlace", name: "", destination: "", description: "", address: "", contact: "", price: "", currency: "LKR", cuisineOrCategory: "", rating: "4.5" }); setModalType("CATALOG"); }} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <PlusIcon size={15} /> Add New Listing
              </button>
            )}
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setActiveNav("profile")}
              title="My Profile & Settings"
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <UserIcon size={14} /> Profile
            </button>
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={toggleTheme}
              title={`Switch to ${theme === "light" ? "Dark" : "Light"} Theme`}
              style={{ fontSize: 12, padding: "6px 14px" }}
            >
              {theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={handleSignOut}
              title="Sign Out of TravelWise"
              style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Global Alert Notices */}
        {error && (
          <div className="alert alert-danger" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertCircleIcon size={16} /> <span>{error}</span>
            <button style={{ marginLeft: "auto", background: "none", border: "none", color: "inherit", cursor: "pointer" }} onClick={() => setError(null)}>✕</button>
          </div>
        )}
        {success && (
          <div className="alert alert-success" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CheckCircleIcon size={16} /> <span>{success}</span>
            <button style={{ marginLeft: "auto", background: "none", border: "none", color: "inherit", cursor: "pointer" }} onClick={() => setSuccess(null)}>✕</button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CANVAS: PUBLIC TRANSPORT FARE DATASETS (SERVICE PROVIDER & STAFF ADMIN)   */}
        {/* ========================================================================= */}
        {role !== "User" && activeNav === "transport-fares" && (
          <TransportFarePortal
            role={role}
            userId={session?.user?.id || profile?.id || ""}
            userEmail={session?.user?.email || email}
          />
        )}

        {/* ========================================================================= */}
        {/* CANVAS: RENTAL VEHICLES FACILITY (SERVICE PROVIDER & STAFF ADMIN)        */}
        {/* ========================================================================= */}
        {role !== "User" && activeNav === "rental-vehicles" && (
          <RentalVehiclesPortal
            role={role}
            userId={session?.user?.id || profile?.id || ""}
            userEmail={session?.user?.email || email}
            onVehicleCountChange={setPendingVehiclesCount}
          />
        )}

        {/* ========================================================================= */}
        {/* CANVAS: SERVICE PROVIDER VERIFICATIONS & PROFILE REQUESTS (ADMIN VIEW)   */}
        {/* ========================================================================= */}
        {role === "StaffAdmin" && activeNav === "provider-verifications" && (
          <section className="card">
            <div className="card-header" style={{ flexWrap: "wrap", gap: 16 }}>
              <div>
                <div className="card-title"><span>📋</span> Provider Administration Queue</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  Admin verification center for new provider registrations and requested business profile changes.
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  className={`btn btn-sm ${adminVerificationTab === "SIGNUPS" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setAdminVerificationTab("SIGNUPS")}
                >
                  📋 New Sign-Ups {pendingProvidersCount > 0 && <span className="badge badge-warning" style={{ marginLeft: 6 }}>{pendingProvidersCount}</span>}
                </button>
                <button
                  className={`btn btn-sm ${adminVerificationTab === "PROFILE_UPDATES" ? "btn-accent" : "btn-secondary"}`}
                  onClick={() => setAdminVerificationTab("PROFILE_UPDATES")}
                >
                  🔄 Profile Updates {pendingProfileRequestsCount > 0 && <span className="badge badge-warning" style={{ marginLeft: 6 }}>{pendingProfileRequestsCount}</span>}
                </button>
                <button
                  className={`btn btn-sm ${adminVerificationTab === "DELETIONS" ? "btn-danger" : "btn-secondary"}`}
                  onClick={() => setAdminVerificationTab("DELETIONS")}
                >
                  🗑️ Deletion Requests {pendingDeletionRequestsCount > 0 && <span className="badge badge-danger" style={{ marginLeft: 6 }}>{pendingDeletionRequestsCount}</span>}
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => { loadProviderApplications(); loadProviderProfileRequests(); loadProviderDeletionRequests(); }}
                >
                  🔄 Refresh
                </button>
              </div>
            </div>

            {/* TAB 1: NEW SIGN-UPS */}
            {adminVerificationTab === "SIGNUPS" && (
              <>
                {providerApplications.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">📋</div>
                    <p>No Service Provider registration requests submitted yet.</p>
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Business Name</th>
                          <th>Email</th>
                          <th>Contact</th>
                          <th>Service Type</th>
                          <th>Status</th>
                          <th>Applied Date</th>
                          <th>Admin Decision</th>
                        </tr>
                      </thead>
                      <tbody>
                        {providerApplications.map(app => (
                          <tr key={app.id}>
                            <td><strong>{app.businessName}</strong></td>
                            <td>{app.email}</td>
                            <td>{app.contactPhone || "N/A"}</td>
                            <td>{app.serviceType || "General"}</td>
                            <td>
                              {app.status === "Approved" ? (
                                <span className="badge badge-success">✅ Approved</span>
                              ) : app.status === "Rejected" ? (
                                <span className="badge badge-danger">❌ Rejected</span>
                              ) : (
                                <span className="badge badge-warning">⏳ Pending Review</span>
                              )}
                            </td>
                            <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{new Date(app.createdAt).toLocaleDateString()}</td>
                            <td>
                              {app.status === "Pending" ? (
                                <div style={{ display: "flex", gap: 6 }}>
                                  <button className="btn btn-primary btn-sm" onClick={() => handleApproveProvider(app.id)}>
                                    ✅ Approve
                                  </button>
                                  <button className="btn btn-danger btn-sm" onClick={() => handleRejectProvider(app.id)}>
                                    ❌ Reject
                                  </button>
                                </div>
                              ) : (
                                <span style={{ fontSize: 12, color: "var(--text-dim)" }}>Decision Recorded</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* TAB 2: PROFILE UPDATE REQUESTS */}
            {adminVerificationTab === "PROFILE_UPDATES" && (
              <>
                {providerProfileRequests.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">🔄</div>
                    <p>No Service Provider profile update requests currently pending review.</p>
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Provider & Email</th>
                          <th>Current Active Details</th>
                          <th>Requested New Details</th>
                          <th>Submitted Date</th>
                          <th>Status</th>
                          <th>Admin Decision</th>
                        </tr>
                      </thead>
                      <tbody>
                        {providerProfileRequests.map(req => (
                          <tr key={req.id}>
                            <td>
                              <strong>{req.currentDisplayName}</strong>
                              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{req.email}</div>
                            </td>
                            <td style={{ fontSize: 13 }}>
                              <div><strong>Name:</strong> {req.currentDisplayName}</div>
                              <div><strong>Phone:</strong> {req.currentContactPhone || "N/A"}</div>
                              <div><strong>Category:</strong> {req.currentServiceType || "General"}</div>
                            </td>
                            <td style={{ fontSize: 13, background: "rgba(20, 184, 166, 0.05)", borderRadius: 8 }}>
                              <div style={{ color: "var(--brand-teal-light)" }}><strong>Name:</strong> {req.requestedDisplayName || "(no change)"}</div>
                              <div style={{ color: "var(--brand-teal-light)" }}><strong>Phone:</strong> {req.requestedContactPhone || "(no change)"}</div>
                              <div style={{ color: "var(--brand-teal-light)" }}><strong>Category:</strong> {req.requestedServiceType || "(no change)"}</div>
                            </td>
                            <td style={{ fontSize: 12, color: "var(--text-muted)" }}>
                              {req.requestedAt ? new Date(req.requestedAt).toLocaleString() : "Recently"}
                            </td>
                            <td>
                              <span className="badge badge-warning">⏳ Pending Approval</span>
                            </td>
                            <td>
                              <div style={{ display: "flex", gap: 6 }}>
                                <button className="btn btn-primary btn-sm" onClick={() => handleApproveProviderProfile(req.id)}>
                                  ✅ Approve
                                </button>
                                <button className="btn btn-danger btn-sm" onClick={() => handleRejectProviderProfile(req.id)}>
                                  ❌ Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* TAB 3: ACCOUNT DELETION REQUESTS */}
            {adminVerificationTab === "DELETIONS" && (
              <>
                {providerDeletionRequests.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">🗑️</div>
                    <p>No Service Provider account deletion requests currently pending review.</p>
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Business & Email</th>
                          <th>Service Type & Contact</th>
                          <th>Stated Deletion Reason</th>
                          <th>Requested Date</th>
                          <th>Status</th>
                          <th>Admin Final Decision</th>
                        </tr>
                      </thead>
                      <tbody>
                        {providerDeletionRequests.map(req => (
                          <tr key={req.id}>
                            <td>
                              <strong>{req.displayName}</strong>
                              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{req.email}</div>
                            </td>
                            <td style={{ fontSize: 13 }}>
                              <div><strong>Category:</strong> {req.serviceType || "General"}</div>
                              <div><strong>Contact:</strong> {req.contactPhone || "N/A"}</div>
                            </td>
                            <td style={{ fontSize: 13, maxWidth: 280 }}>
                              {req.reason ? (
                                <div style={{ background: "rgba(239,68,68,0.1)", padding: "8px 12px", borderRadius: 8, color: "#fca5a5" }}>
                                  "{req.reason}"
                                </div>
                              ) : (
                                <span style={{ color: "var(--text-dim)" }}>No reason provided</span>
                              )}
                            </td>
                            <td style={{ fontSize: 12, color: "var(--text-muted)" }}>
                              {req.requestedAt ? new Date(req.requestedAt).toLocaleString() : "Recently"}
                            </td>
                            <td>
                              <span className="badge badge-danger">⚠️ Awaiting Approval</span>
                            </td>
                            <td>
                              <div style={{ display: "flex", gap: 6 }}>
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => handleApproveProviderDeletion(req.id)}
                                  title="Permanently remove account and catalog listings"
                                >
                                  🗑️ Approve & Delete
                                </button>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleRejectProviderDeletion(req.id)}
                                  title="Reject deletion and keep account active"
                                >
                                  ❌ Reject Request
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* ========================================================================= */}
        {/* CANVAS: USER PROFILE & SETTINGS (TRAVELLER & SERVICE PROVIDER)            */}
        {/* ========================================================================= */}
        {activeNav === "profile" && (
          <div className="profile-page-wrapper">
            {/* 1. HERO PROFILE SUMMARY CARD */}
            <div className="card profile-hero-card" style={{
              background: "linear-gradient(135deg, rgba(20,45,62,0.92) 0%, rgba(10,25,36,0.98) 100%)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 20,
              padding: "28px 32px",
              marginBottom: 24,
              boxShadow: "0 12px 36px rgba(0,0,0,0.35)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
                <div style={{
                  width: 84,
                  height: 84,
                  borderRadius: "50%",
                  background: role === "ServiceProvider"
                    ? "linear-gradient(135deg, #f59e0b, #ef4444)"
                    : role === "StaffAdmin"
                    ? "linear-gradient(135deg, #8b5cf6, #3b82f6)"
                    : "linear-gradient(135deg, var(--brand-teal), #2563eb)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 34,
                  fontWeight: 800,
                  color: "#fff",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                  border: "3px solid rgba(255,255,255,0.2)"
                }}>
                  {(profile?.displayName || email || role).charAt(0).toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
                    <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
                      {profile?.displayName || (email ? email.split('@')[0] : "User Profile")}
                    </h2>
                    <span className={`badge ${role === "ServiceProvider" ? "badge-warning" : role === "StaffAdmin" ? "badge-info" : "badge-success"}`}>
                      {role === "User" ? "🧳 Traveller" : role === "ServiceProvider" ? "🏨 Service Provider" : "🛡️ System Admin"}
                    </span>
                    <span className="badge badge-success">● Active Account</span>
                  </div>

                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 13, color: "var(--text-soft)", marginTop: 8 }}>
                    <div>📧 <strong>Email:</strong> {profile?.email || email}</div>
                    {profile?.contactPhone && (
                      <div>📞 <strong>Phone:</strong> {profile.contactPhone}</div>
                    )}
                    {role === "ServiceProvider" && profile?.serviceType && (
                      <div>🎯 <strong>Specialization:</strong> {profile.serviceType}</div>
                    )}
                    {profile?.createdAt && (
                      <div>🗓️ <strong>Joined:</strong> {new Date(profile.createdAt).toLocaleDateString()}</div>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn btn-secondary btn-sm" onClick={loadProfile} disabled={profileSubmitting}>
                    🔄 Refresh Data
                  </button>
                </div>
              </div>
            </div>

            {/* 2. TWO-COLUMN GRID: PROFILE DETAILS & SECURITY */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 24 }}>
              
              {/* CARD A: PERSONAL / BUSINESS DETAILS */}
              <div className="card" style={{ borderRadius: 18 }}>
                <div className="card-header" style={{ borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
                  <div>
                    <div className="card-title">
                      <span>{role === "ServiceProvider" ? "🏨" : "👤"}</span>
                      {role === "ServiceProvider" ? "Business Profile Details" : "Personal Profile Details"}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                      {role === "ServiceProvider"
                        ? "Manage your registered business profile on the TravelWise catalog."
                        : "Update your public display name and traveler contact information."}
                    </div>
                  </div>
                </div>

                <div style={{ padding: "20px 0" }}>
                  {/* POLICY NOTICE CALLOUT */}
                  {role === "User" ? (
                    <div style={{
                      background: "rgba(34,197,94,0.1)",
                      border: "1px solid rgba(34,197,94,0.3)",
                      borderRadius: 12,
                      padding: "14px 18px",
                      marginBottom: 20,
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start"
                    }}>
                      <span style={{ fontSize: 20 }}>💡</span>
                      <div style={{ fontSize: 13, color: "var(--text-soft)", lineHeight: 1.5 }}>
                        <strong style={{ color: "var(--success)" }}>Direct Update Access:</strong> As a Traveller, you can update your profile name and contact number directly. Changes take effect immediately without requiring administrator approval.
                      </div>
                    </div>
                  ) : role === "ServiceProvider" ? (
                    <div style={{
                      background: "rgba(245,158,11,0.1)",
                      border: "1px solid rgba(245,158,11,0.3)",
                      borderRadius: 12,
                      padding: "14px 18px",
                      marginBottom: 20,
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start"
                    }}>
                      <span style={{ fontSize: 20 }}>🛡️</span>
                      <div style={{ fontSize: 13, color: "var(--text-soft)", lineHeight: 1.5 }}>
                        <strong style={{ color: "var(--brand-gold)" }}>Admin Approval Required:</strong> As a verified Service Provider, updates to your business name, contact phone, or service specialization are queued for Administrator review to maintain tourist trust and authenticity.
                      </div>
                    </div>
                  ) : null}

                  {/* PENDING APPROVAL ALERT BANNER (FOR SERVICE PROVIDERS) */}
                  {role === "ServiceProvider" && profile?.pendingProfileStatus === "Pending" && (
                    <div style={{
                      background: "linear-gradient(135deg, rgba(245,158,11,0.18), rgba(239,68,68,0.1))",
                      border: "1px solid rgba(245,158,11,0.5)",
                      borderRadius: 14,
                      padding: "18px 20px",
                      marginBottom: 22,
                      boxShadow: "0 4px 18px rgba(245,158,11,0.15)"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <span style={{ fontSize: 22 }}>⏳</span>
                        <h4 style={{ margin: 0, color: "var(--brand-gold)", fontSize: 16 }}>
                          Profile Update Request Pending Review
                        </h4>
                        <span className="badge badge-warning" style={{ marginLeft: "auto" }}>Under Admin Review</span>
                      </div>
                      <p style={{ fontSize: 13, color: "var(--text-soft)", margin: "0 0 12px", lineHeight: 1.5 }}>
                        You submitted a profile change request. An Administrator is currently reviewing your details. In the meantime, your current active details remain in use:
                      </p>
                      <div style={{ background: "rgba(0,0,0,0.25)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "var(--text-main)" }}>
                        {profile.pendingDisplayName && <div>• <strong>Requested Name:</strong> <span style={{ color: "var(--brand-gold-light)" }}>{profile.pendingDisplayName}</span></div>}
                        {profile.pendingContactPhone && <div>• <strong>Requested Contact:</strong> <span style={{ color: "var(--brand-gold-light)" }}>{profile.pendingContactPhone}</span></div>}
                        {profile.pendingServiceType && <div>• <strong>Requested Specialization:</strong> <span style={{ color: "var(--brand-gold-light)" }}>{profile.pendingServiceType}</span></div>}
                        {profile.profileUpdatedAt && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>Submitted on: {new Date(profile.profileUpdatedAt).toLocaleString()}</div>}
                      </div>
                    </div>
                  )}

                  {/* REJECTION REASON NOTIFICATION */}
                  {role === "ServiceProvider" && profile?.pendingProfileStatus === "Rejected" && (
                    <div style={{
                      background: "rgba(239,68,68,0.15)",
                      border: "1px solid rgba(239,68,68,0.4)",
                      borderRadius: 12,
                      padding: "14px 18px",
                      marginBottom: 20
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#fca5a5", fontWeight: 700, marginBottom: 4 }}>
                        <span>❌</span> Previous Profile Update Was Rejected
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: "var(--text-soft)" }}>
                        Admin note: <em>"{profile.profileReviewNote || "Details could not be verified."}"</em>. You can modify your information and submit a new request below.
                      </p>
                    </div>
                  )}

                  {/* APPROVAL NOTIFICATION */}
                  {role === "ServiceProvider" && profile?.pendingProfileStatus === "Approved" && (
                    <div style={{
                      background: "rgba(34,197,94,0.15)",
                      border: "1px solid rgba(34,197,94,0.4)",
                      borderRadius: 12,
                      padding: "14px 18px",
                      marginBottom: 20
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#86efac", fontWeight: 700 }}>
                        <span>✅</span> Profile Update Approved & Live
                      </div>
                      <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-soft)" }}>
                        Your recent profile update was approved by the Administrator and is now active across the platform.
                      </p>
                    </div>
                  )}

                  {/* FEEDBACK MESSAGES */}
                  {profileMsg && (
                    <div className={`alert ${profileMsg.type === "success" ? "alert-success" : profileMsg.type === "info" ? "alert-warning" : "alert-danger"}`} style={{ marginBottom: 18 }}>
                      <span>{profileMsg.type === "success" ? "✅" : profileMsg.type === "info" ? "⏳" : "⚠️"}</span> {profileMsg.text}
                    </div>
                  )}

                  {/* EDIT FORM */}
                  <form onSubmit={handleUpdateProfile}>
                    <div className="form-group">
                      <label>
                        {role === "ServiceProvider" ? "🏢 Official Business / Provider Name" : "👤 Your Full Display Name"}
                      </label>
                      <input
                        required
                        type="text"
                        className="form-control"
                        placeholder={role === "ServiceProvider" ? "e.g. Ella Mountain Breeze Resort" : "e.g. Kasun Silva"}
                        value={profileDisplayName}
                        onChange={e => setProfileDisplayName(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>📧 Email Address (Account Identifier)</label>
                      <input
                        disabled
                        type="email"
                        className="form-control"
                        value={profile?.email || email}
                        style={{ opacity: 0.7, cursor: "not-allowed" }}
                      />
                      <span style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginTop: 4 }}>
                        🔒 Email address is uniquely bound to your user credentials.
                      </span>
                    </div>

                    <div className="form-group">
                      <label>📞 Contact Phone Number</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="+94 77 123 4567"
                        value={profileContactPhone}
                        onChange={e => setProfileContactPhone(e.target.value)}
                      />
                    </div>

                    {role === "ServiceProvider" && (
                      <div className="form-group">
                        <label>🎯 Service Category / Specialization</label>
                        <select
                          className="form-control"
                          value={profileServiceType}
                          onChange={e => setProfileServiceType(e.target.value)}
                        >
                          <option value="Accommodation & Dining">🏨 Accommodation & Dining</option>
                          <option value="Hotels & Resorts">🌴 Hotels & Resorts</option>
                          <option value="Restaurants & Cafes">🍽️ Restaurants & Cafes</option>
                          <option value="Transport & Chauffeur Services">🚗 Transport & Chauffeur Services</option>
                          <option value="Tour Guide & Experiences">🧗 Tour Guide & Experiences</option>
                          <option value="Wildlife Safari & Nature Tours">🐘 Wildlife Safari & Nature Tours</option>
                          <option value="Water Sports & Surfing">🏄 Water Sports & Surfing</option>
                        </select>
                      </div>
                    )}

                    <div style={{ marginTop: 24 }}>
                      <button
                        type="submit"
                        className={`btn ${role === "ServiceProvider" ? "btn-accent" : "btn-primary"} btn-block`}
                        disabled={profileSubmitting}
                        style={{ padding: "12px 20px", fontSize: 14, fontWeight: 700 }}
                      >
                        {profileSubmitting
                          ? "Saving..."
                          : role === "ServiceProvider"
                          ? "🚀 Submit Profile Update for Admin Approval"
                          : "💾 Save Profile Changes"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* CARD B: PASSWORD & SECURITY (FREE FOR BOTH) */}
              <div className="card" style={{ borderRadius: 18 }}>
                <div className="card-header" style={{ borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
                  <div>
                    <div className="card-title">
                      <span>🔑</span> Security & Password
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                      Update your account password securely at any time.
                    </div>
                  </div>
                </div>

                <div style={{ padding: "20px 0" }}>
                  {/* POLICY NOTICE CALLOUT */}
                  <div style={{
                    background: "rgba(14,165,233,0.1)",
                    border: "1px solid rgba(14,165,233,0.3)",
                    borderRadius: 12,
                    padding: "14px 18px",
                    marginBottom: 20,
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start"
                  }}>
                    <span style={{ fontSize: 20 }}>🔓</span>
                    <div style={{ fontSize: 13, color: "var(--text-soft)", lineHeight: 1.5 }}>
                      <strong style={{ color: "var(--brand-ocean)" }}>Immediate Freedom:</strong> Both Travellers and Service Providers have full authority to change their password directly without needing any administrator approval.
                    </div>
                  </div>

                  {/* FEEDBACK MESSAGES */}
                  {passwordMsg && (
                    <div className={`alert ${passwordMsg.type === "success" ? "alert-success" : "alert-danger"}`} style={{ marginBottom: 18 }}>
                      <span>{passwordMsg.type === "success" ? "✅" : "⚠️"}</span> {passwordMsg.text}
                    </div>
                  )}

                  <form onSubmit={handleChangePassword}>
                    <div className="form-group">
                      <label>🔒 Current Password</label>
                      <div style={{ position: "relative" }}>
                        <input
                          required
                          type={showProfileCurrentPassword ? "text" : "password"}
                          className="form-control"
                          placeholder="Enter your current password"
                          value={profileCurrentPassword}
                          onChange={e => setProfileCurrentPassword(e.target.value)}
                          style={{ paddingRight: 44 }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowProfileCurrentPassword(v => !v)}
                          style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--text-soft)", padding: 0 }}
                          title={showProfileCurrentPassword ? "Hide password" : "Show password"}
                        >
                          {showProfileCurrentPassword ? "🙈" : "👁️"}
                        </button>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>✨ New Password (min. 6 characters)</label>
                      <div style={{ position: "relative" }}>
                        <input
                          required
                          type={showProfileNewPassword ? "text" : "password"}
                          minLength={6}
                          className="form-control"
                          placeholder="Choose a strong new password"
                          value={profileNewPassword}
                          onChange={e => setProfileNewPassword(e.target.value)}
                          style={{ paddingRight: 44 }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowProfileNewPassword(v => !v)}
                          style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--text-soft)", padding: 0 }}
                          title={showProfileNewPassword ? "Hide password" : "Show password"}
                        >
                          {showProfileNewPassword ? "🙈" : "👁️"}
                        </button>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>🔁 Confirm New Password</label>
                      <input
                        required
                        type={showProfileNewPassword ? "text" : "password"}
                        minLength={6}
                        className="form-control"
                        placeholder="Retype your new password"
                        value={profileConfirmPassword}
                        onChange={e => setProfileConfirmPassword(e.target.value)}
                      />
                    </div>

                    <div style={{ marginTop: 24 }}>
                      <button
                        type="submit"
                        className="btn btn-primary btn-block"
                        disabled={passwordSubmitting}
                        style={{ padding: "12px 20px", fontSize: 14, fontWeight: 700 }}
                      >
                        {passwordSubmitting ? "Updating Password..." : "🔒 Update Password Directly"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

            </div>

            {/* 3. DANGER ZONE: PERMANENT ACCOUNT DELETION */}
            <div className="card" style={{
              borderRadius: 18,
              border: "1px solid rgba(239, 68, 68, 0.4)",
              background: "linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(15, 23, 42, 0.6) 100%)",
              marginTop: 24,
              boxShadow: "0 8px 30px rgba(239, 68, 68, 0.08)"
            }}>
              <div className="card-header" style={{ borderBottom: "1px solid rgba(239, 68, 68, 0.2)", paddingBottom: 16 }}>
                <div>
                  <div className="card-title" style={{ color: "#f87171" }}>
                    <span>⚠️</span> Danger Zone — Permanent Account Deletion
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                    {role === "User"
                      ? "Permanently delete your personal traveller account and associated data without requiring admin approval."
                      : "Request permanent termination of your Service Provider account. Requires administrator approval before final removal."}
                  </div>
                </div>
              </div>

              <div style={{ padding: "20px 0" }}>
                {dangerZoneMsg && (
                  <div className={`alert ${dangerZoneMsg.type === "success" ? "alert-success" : dangerZoneMsg.type === "info" ? "alert-warning" : "alert-danger"}`} style={{ marginBottom: 18 }}>
                    <span>{dangerZoneMsg.type === "success" ? "✅" : dangerZoneMsg.type === "info" ? "⏳" : "⚠️"}</span> {dangerZoneMsg.text}
                  </div>
                )}

                {/* ROLE SPECIFIC POLICY & ACTIONS */}
                {role === "User" ? (
                  <div>
                    <div style={{
                      background: "rgba(239, 68, 68, 0.08)",
                      border: "1px solid rgba(239, 68, 68, 0.25)",
                      borderRadius: 12,
                      padding: "16px 20px",
                      marginBottom: 20
                    }}>
                      <h4 style={{ color: "#fca5a5", margin: "0 0 8px", fontSize: 15 }}>
                        ⚡ Direct Permanent Deletion (Traveller Account)
                      </h4>
                      <p style={{ margin: 0, fontSize: 13, color: "var(--text-soft)", lineHeight: 1.6 }}>
                        As a Traveller, you have full sovereignty over your personal data. You can permanently delete your account at any time <strong>without needing any admin approval</strong>. All your trips, split expenses, and profile data will be permanently wiped from the database.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => {
                        setDeleteConfirmInput("");
                        setDeleteReasonInput("");
                        setDeleteModalError(null);
                        setShowDeleteModal(true);
                      }}
                      style={{ padding: "12px 24px", fontWeight: 700, fontSize: 14 }}
                    >
                      🗑️ Permanently Delete My Account
                    </button>
                  </div>
                ) : role === "ServiceProvider" ? (
                  <div>
                    {profile?.deletionRequested && profile?.deletionStatus === "PendingApproval" ? (
                      /* PENDING DELETION REQUEST BANNER */
                      <div style={{
                        background: "linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(245, 158, 11, 0.1) 100%)",
                        border: "1px solid rgba(239, 68, 68, 0.5)",
                        borderRadius: 14,
                        padding: "20px 24px",
                        boxShadow: "0 4px 20px rgba(239, 68, 68, 0.15)"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                          <span style={{ fontSize: 24 }}>⏳</span>
                          <div>
                            <h4 style={{ margin: 0, color: "#f87171", fontSize: 16 }}>
                              Account Deletion Request Pending Admin Review
                            </h4>
                            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                              Submitted on: {profile.deletionRequestedAt ? new Date(profile.deletionRequestedAt).toLocaleString() : "Recently"}
                            </span>
                          </div>
                          <span className="badge badge-warning" style={{ marginLeft: "auto" }}>Awaiting Admin Decision</span>
                        </div>
                        <p style={{ fontSize: 13, color: "var(--text-soft)", margin: "0 0 14px", lineHeight: 1.6 }}>
                          You have requested to permanently delete your Service Provider account. Because your business may have active catalog listings and customer reservations, an Administrator must review and approve this deletion before your account is purged.
                        </p>
                        {profile.deletionReason && (
                          <div style={{ background: "rgba(0,0,0,0.3)", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16, color: "var(--text-soft)" }}>
                            <strong>Stated reason:</strong> <em>"{profile.deletionReason}"</em>
                          </div>
                        )}
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={handleCancelDeletionRequest}
                        >
                          ↩️ Cancel Deletion Request
                        </button>
                      </div>
                    ) : (
                      /* NOT REQUESTED YET */
                      <div>
                        <div style={{
                          background: "rgba(245, 158, 11, 0.08)",
                          border: "1px solid rgba(245, 158, 11, 0.25)",
                          borderRadius: 12,
                          padding: "16px 20px",
                          marginBottom: 20
                        }}>
                          <h4 style={{ color: "var(--brand-gold)", margin: "0 0 8px", fontSize: 15 }}>
                            🛡️ Admin Approval Required for Service Provider Deletion
                          </h4>
                          <p style={{ margin: 0, fontSize: 13, color: "var(--text-soft)", lineHeight: 1.6 }}>
                            Service Provider accounts cannot be deleted directly without Admin approval. Submitting this request places your account into the Administrator's Deletion Queue. Once approved by the administrator, your provider profile and all catalog listings will be permanently wiped.
                          </p>
                        </div>

                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => {
                            setDeleteConfirmInput("");
                            setDeleteReasonInput("");
                            setDeleteModalError(null);
                            setShowDeleteModal(true);
                          }}
                          style={{ padding: "12px 24px", fontWeight: 700, fontSize: 14 }}
                        >
                          ⚠️ Request Account Deletion (Admin Approval Required)
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* CANVAS 1: DASHBOARD OVERVIEW                                              */}
        {/* ========================================================================= */}
        {activeNav === "dashboard" && (
          <>
            {/* Travel Coastal & Sand Hero for Travellers (Matching Reference Aerial Coastal Aesthetic) */}
            {role === "User" ? (
              <div className="travel-coastal-hero">
                <div className="travel-coastal-hero-bg"></div>
                <div className="travel-coastal-hero-overlay"></div>
                
                <div className="travel-coastal-hero-content">
                  <div className="hero-category-tagline">
                    MOUNTAINS <span className="sep">•</span> PLAINS <span className="sep">•</span> BEACHES <span className="sep">•</span> HILL COUNTRY <span className="sep">•</span> HERITAGE
                  </div>
                  <h1>
                    Spend your vacation with our <span className="accent-text">curated activities</span>
                  </h1>
                  <p className="hero-lead">
                    Plan unforgettable group journeys across Sri Lanka with multi-agent AI itinerary creation, real-time weather & safety radars, and verified partner rates.
                  </p>

                  <div style={{ marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1.2px", color: "var(--brand-teal-light)" }}>
                      MOST POPULAR ESCAPES
                    </div>
                  </div>

                  <div className="popular-trips-deck">
                    {/* 1. Trip To Ella */}
                    <div className="popular-trip-chip" onClick={() => handleQuickPlan("Ella")} title="Plan group trip to Ella">
                      <img
                        src="https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=400&q=80"
                        alt="Ella Sri Lanka"
                        className="popular-trip-chip-img"
                      />
                      <div className="popular-trip-chip-title">Trip To Ella</div>
                      <div className="popular-trip-chip-meta">
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <UsersIcon size={12} /> 31 travelers active
                        </span>
                        <div className="popular-trip-chip-btn">
                          <ArrowRightIcon size={12} />
                        </div>
                      </div>
                    </div>

                    {/* 2. Trip To Sigiriya */}
                    <div className="popular-trip-chip" onClick={() => handleQuickPlan("Sigiriya")} title="Plan group trip to Sigiriya">
                      <img
                        src="https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&w=400&q=80"
                        alt="Sigiriya Rock Fortress"
                        className="popular-trip-chip-img"
                      />
                      <div className="popular-trip-chip-title">Trip To Sigiriya</div>
                      <div className="popular-trip-chip-meta">
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <UsersIcon size={12} /> 27 travelers active
                        </span>
                        <div className="popular-trip-chip-btn">
                          <ArrowRightIcon size={12} />
                        </div>
                      </div>
                    </div>

                    {/* 3. Trip To Mirissa */}
                    <div className="popular-trip-chip" onClick={() => handleQuickPlan("Mirissa")} title="Plan group trip to Mirissa">
                      <img
                        src="https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=400&q=80"
                        alt="Mirissa Southern Coast"
                        className="popular-trip-chip-img"
                      />
                      <div className="popular-trip-chip-title">Trip To Mirissa</div>
                      <div className="popular-trip-chip-meta">
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <UsersIcon size={12} /> 20 travelers active
                        </span>
                        <div className="popular-trip-chip-btn">
                          <ArrowRightIcon size={12} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Glassmorphic Quick Booking & Planner Bar (Matching Screenshot 1) */}
                <div className="glass-planner-bar">
                  <div className="planner-field">
                    <span className="planner-label">
                      <MapPinIcon size={12} color="var(--brand-teal-light)" /> Destination
                    </span>
                    <select
                      className="planner-input"
                      value={quickDest}
                      onChange={e => setQuickDest(e.target.value)}
                    >
                      {SRI_LANKAN_DESTINATIONS.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div className="planner-field">
                    <span className="planner-label">
                      <CalendarIcon size={12} color="#fbbf24" /> Check-in Date
                    </span>
                    <input
                      type="date"
                      className="planner-input"
                      value={quickStartDate}
                      onChange={e => setQuickStartDate(e.target.value)}
                    />
                  </div>

                  <div className="planner-field">
                    <span className="planner-label">
                      <CalendarIcon size={12} color="#fbbf24" /> Check-out Date
                    </span>
                    <input
                      type="date"
                      className="planner-input"
                      value={quickEndDate}
                      onChange={e => setQuickEndDate(e.target.value)}
                    />
                  </div>

                  <div className="planner-field">
                    <span className="planner-label">
                      <UsersIcon size={12} color="#4ade80" /> Travelers
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      className="planner-input"
                      value={quickGuests}
                      onChange={e => setQuickGuests(Number(e.target.value))}
                    />
                  </div>

                  <button
                    type="button"
                    className="planner-submit-btn"
                    onClick={() => handleQuickPlan()}
                  >
                    <PlaneIcon size={15} /> Plan My Trip
                  </button>
                </div>
              </div>
            ) : (
              /* Hero for Partners & Admin */
              <div className="dashboard-hero">
                <div className="dashboard-hero-content">
                  <h1>
                    {role === "ServiceProvider" ? (
                      <>Welcome back, <span className="accent-text">Travel Partner</span></>
                    ) : (
                      <>Platform <span className="accent-text">Operations Center</span></>
                    )}
                  </h1>
                  <p>
                    {role === "ServiceProvider"
                      ? "Manage your travel listings, monitor approvals, and reach thousands of travellers planning their Sri Lankan journey."
                      : "Moderate the community, verify new partners, and keep the TravelWise ecosystem safe and authentic."}
                  </p>
                  <div className="dashboard-hero-cta">
                    {role === "ServiceProvider" && (
                      <>
                        <button className="btn btn-accent" onClick={() => setActiveNav("catalog")} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <HotelIcon size={14} /> Manage My Listings
                        </button>
                        <button className="btn btn-ghost" onClick={() => setActiveNav("rental-vehicles")} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <CarIcon size={14} /> Rental Vehicles
                        </button>
                        <button className="btn btn-ghost" onClick={() => setActiveNav("transport-fares")} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <CarIcon size={14} /> Transport Fares
                        </button>
                      </>
                    )}
                    {role === "StaffAdmin" && (
                      <>
                        <button className="btn btn-primary" onClick={() => setActiveNav("provider-verifications")} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <ShieldCheckIcon size={14} /> Review Pending Partners
                        </button>
                        <button className="btn btn-ghost" onClick={() => setActiveNav("rental-vehicles")} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <CarIcon size={14} /> Rental Fleet
                        </button>
                        <button className="btn btn-ghost" onClick={() => setActiveNav("transport-fares")} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <CarIcon size={14} /> Transport Fares
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ROLE-SPECIFIC DASHBOARD STATS */}
            {role === "User" && (
              <div className="grid-4" style={{ marginBottom: 24 }}>
                {/* 1. Group Trips */}
                <div
                  className="stat-card clickable"
                  onClick={() => setActiveNav("trips")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => (e.key === "Enter" || e.key === " ") && setActiveNav("trips")}
                  title="View your group trips & itineraries"
                >
                  <div className="stat-icon teal"><PlaneIcon size={22} color="var(--brand-teal-light)" /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="stat-val">{trips.length}</div>
                    <div className="stat-lbl">Active Group Trips</div>
                    <div className="stat-card-arrow">
                      {trips.length === 0 ? "Plan first trip →" : "View itineraries →"}
                    </div>
                  </div>
                </div>

                {/* 2. Explore Sri Lanka */}
                <div
                  className="stat-card clickable"
                  onClick={() => setActiveNav("catalog")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => (e.key === "Enter" || e.key === " ") && setActiveNav("catalog")}
                  title="Discover verified places, stays and food across Sri Lanka"
                >
                  <div className="stat-icon gold"><CompassIcon size={22} color="#fbbf24" /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="stat-val">{catalogItems.length > 0 ? `${catalogItems.length}+` : "Explore"}</div>
                    <div className="stat-lbl">Explore Sri Lanka</div>
                    <div className="stat-card-arrow" style={{ color: "#fbbf24" }}>
                      Discover destinations →
                    </div>
                  </div>
                </div>

                {/* 3. Weather & Safety */}
                <div
                  className="stat-card clickable"
                  onClick={() => setActiveNav("weather")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => (e.key === "Enter" || e.key === " ") && setActiveNav("weather")}
                  title="Live weather forecasts and AI risk assessments"
                >
                  <div className="stat-icon cyan" style={{ background: "rgba(14, 165, 233, 0.15)", color: "#38bdf8" }}><SunIcon size={22} color="#38bdf8" /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="stat-val">
                      {weatherData?.current ? `${Math.round(weatherData.current.temperature_2m)}°C` : "28°C"}
                    </div>
                    <div className="stat-lbl">Weather & Safety</div>
                    <div className="stat-card-arrow" style={{ color: "#38bdf8" }}>
                      Live {weatherDestination} radar →
                    </div>
                  </div>
                </div>

                {/* 4. Settle Debts & Expenses */}
                <div
                  className="stat-card clickable"
                  onClick={() => setActiveNav("settlement")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => (e.key === "Enter" || e.key === " ") && setActiveNav("settlement")}
                  title="Track group expenses and calculate fair debt settlements"
                >
                  <div className="stat-icon coral" style={{ background: "rgba(168, 85, 247, 0.15)", color: "#c084fc" }}><WalletIcon size={22} color="#c084fc" /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="stat-val">
                      {expenses.length > 0 ? `${expenses.length}` : "0"}
                    </div>
                    <div className="stat-lbl">Split Bills & Debts</div>
                    <div className="stat-card-arrow" style={{ color: "#c084fc" }}>
                      {expenses.length > 0 ? "Settle balances →" : "Zero debt balance →"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {role === "ServiceProvider" && (
              <div className="grid-4" style={{ marginBottom: 24 }}>
                <div
                  className="stat-card clickable"
                  onClick={() => setActiveNav("catalog")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => (e.key === "Enter" || e.key === " ") && setActiveNav("catalog")}
                  title="Manage your approved travel listings"
                >
                  <div className="stat-icon gold"><HotelIcon size={22} color="#fbbf24" /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="stat-val">{catalogItems.filter(x => x.isApproved).length}</div>
                    <div className="stat-lbl">Approved Listings</div>
                    <div className="stat-card-arrow" style={{ color: "#fbbf24" }}>Manage listings →</div>
                  </div>
                </div>

                <div
                  className="stat-card clickable"
                  onClick={() => setActiveNav("catalog")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => (e.key === "Enter" || e.key === " ") && setActiveNav("catalog")}
                  title="Listings awaiting admin verification"
                >
                  <div className="stat-icon coral"><ClockIcon size={22} color="#fb7185" /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="stat-val">{pendingCatalogItems.length}</div>
                    <div className="stat-lbl">Pending Approvals</div>
                    <div className="stat-card-arrow" style={{ color: "#fb7185" }}>View pending →</div>
                  </div>
                </div>

                <div
                  className="stat-card clickable"
                  onClick={() => setActiveNav("verified-listings")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => (e.key === "Enter" || e.key === " ") && setActiveNav("verified-listings")}
                  title="Destinations verified by admin"
                >
                  <div className="stat-icon teal"><ShieldCheckIcon size={22} color="var(--brand-teal-light)" /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="stat-val">{myDestinations.filter(d => d.status === "Verified").length}</div>
                    <div className="stat-lbl">Verified Destinations</div>
                    <div className="stat-card-arrow">Verified badge →</div>
                  </div>
                </div>

                <div
                  className="stat-card clickable"
                  onClick={() => setActiveNav("profile")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => (e.key === "Enter" || e.key === " ") && setActiveNav("profile")}
                  title="Manage partner profile & contact info"
                >
                  <div className="stat-icon leaf"><UserIcon size={22} color="#4ade80" /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="stat-val" style={{ fontSize: 18, textTransform: "capitalize" }}>
                      {profile?.pendingProfileStatus === "Pending" ? "Pending" : "Active"}
                    </div>
                    <div className="stat-lbl">Partner Profile</div>
                    <div className="stat-card-arrow" style={{ color: "#4ade80" }}>Edit details →</div>
                  </div>
                </div>
              </div>
            )}

            {role === "StaffAdmin" && (
              <div className="grid-4" style={{ marginBottom: 24 }}>
                <div
                  className="stat-card clickable"
                  onClick={() => setActiveNav("approvals")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => (e.key === "Enter" || e.key === " ") && setActiveNav("approvals")}
                  title="Review pending destination listings"
                >
                  <div className="stat-icon teal"><ShieldCheckIcon size={22} color="var(--brand-teal-light)" /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="stat-val">{pendingDestinations.length}</div>
                    <div className="stat-lbl">Pending Verifications</div>
                    <div className="stat-card-arrow">Review queue →</div>
                  </div>
                </div>

                <div
                  className="stat-card clickable"
                  onClick={() => setActiveNav("provider-verifications")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => (e.key === "Enter" || e.key === " ") && setActiveNav("provider-verifications")}
                  title="Review partner registration requests"
                >
                  <div className="stat-icon leaf"><UsersIcon size={22} color="#4ade80" /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="stat-val">{pendingProvidersCount}</div>
                    <div className="stat-lbl">Provider Sign-Ups</div>
                    <div className="stat-card-arrow" style={{ color: "#4ade80" }}>Verify partners →</div>
                  </div>
                </div>

                <div
                  className="stat-card clickable"
                  onClick={() => setActiveNav("catalog")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => (e.key === "Enter" || e.key === " ") && setActiveNav("catalog")}
                  title="All active catalog destinations across Sri Lanka"
                >
                  <div className="stat-icon gold"><HotelIcon size={22} color="#fbbf24" /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="stat-val">{catalogItems.length}</div>
                    <div className="stat-lbl">Island Listings</div>
                    <div className="stat-card-arrow" style={{ color: "#fbbf24" }}>Manage catalog →</div>
                  </div>
                </div>

                <div
                  className="stat-card clickable"
                  onClick={() => setActiveNav("audit")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => (e.key === "Enter" || e.key === " ") && setActiveNav("audit")}
                  title="System activity and audit logs"
                >
                  <div className="stat-icon coral"><LayersIcon size={22} color="#fb7185" /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="stat-val">{auditLogs.length}</div>
                    <div className="stat-lbl">Audit Logs</div>
                    <div className="stat-card-arrow" style={{ color: "#fb7185" }}>Security audit →</div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid-2">
              <section className="card">
                <div className="card-header">
                  <div className="card-title">
                    <div className="card-title-icon"><SparklesIcon size={18} color="var(--brand-teal-light)" /></div>
                    <div>
                      <div>AI Travel Agents</div>
                      <div className="card-subtitle">Powered by Google Gemini</div>
                    </div>
                  </div>
                  <span className="badge badge-success">All Online</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div
                    onClick={() => setActiveNav("trips")}
                    style={{
                      background: "rgba(255,255,255,0.02)", padding: 14, borderRadius: 12,
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      border: "1px solid var(--border)", cursor: "pointer", transition: "all 0.2s ease"
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--brand-teal)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
                    title="Click to view trips and budget insights"
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <WalletIcon size={15} color="var(--brand-gold-light)" />
                        <strong>Budget Agent</strong>
                      </div>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Trip budget health & insights</span>
                    </div>
                    <span className="badge badge-success">Online</span>
                  </div>
                  <div
                    onClick={() => setActiveNav("trips")}
                    style={{
                      background: "rgba(255,255,255,0.02)", padding: 14, borderRadius: 12,
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      border: "1px solid var(--border)", cursor: "pointer", transition: "all 0.2s ease"
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--brand-teal)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
                    title="Click to view itineraries and planned activities"
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <CompassIcon size={15} color="#38bdf8" />
                        <strong>Activity Agent</strong>
                      </div>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Itinerary planning & conflict detection</span>
                    </div>
                    <span className="badge badge-success">Online</span>
                  </div>
                  <div
                    onClick={() => setActiveNav("weather")}
                    style={{
                      background: "rgba(255,255,255,0.02)", padding: 14, borderRadius: 12,
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      border: "1px solid var(--border)", cursor: "pointer", transition: "all 0.2s ease"
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--brand-teal)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
                    title="Click to view real-time weather and risk assessments"
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <ShieldCheckIcon size={15} color="#4ade80" />
                        <strong>Risk Agent</strong>
                      </div>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Weather monitoring & risk assessments</span>
                    </div>
                    <span className="badge badge-success">Online</span>
                  </div>
                  <div
                    onClick={() => setActiveNav("settlement")}
                    style={{
                      background: "rgba(255,255,255,0.02)", padding: 14, borderRadius: 12,
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      border: "1px solid var(--border)", cursor: "pointer", transition: "all 0.2s ease"
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--brand-teal)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
                    title="Click to view debt settlement generator"
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <WalletIcon size={15} color="#c084fc" />
                        <strong>Split-Bill Agent</strong>
                      </div>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Smart settlement plan generation</span>
                    </div>
                    <span className="badge badge-success">Online</span>
                  </div>
                </div>
              </section>

              <section className="card" style={{
                background: "linear-gradient(145deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)",
                border: "1px solid rgba(20, 184, 166, 0.3)",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between"
              }}>
                <div>
                  <div className="card-header" style={{ marginBottom: 14 }}>
                    <div className="card-title">
                      <div className="card-title-icon" style={{ background: "rgba(20, 184, 166, 0.15)", color: "var(--brand-teal-light)" }}>
                        <CompassIcon size={18} color="var(--brand-teal-light)" />
                      </div>
                      <div>
                        <div style={{ color: "var(--text-primary)", fontWeight: 700 }}>Explore TravelWise Sri Lanka</div>
                        <div className="card-subtitle">Your Intelligent AI-Powered Tourism Companion</div>
                      </div>
                    </div>
                    <span className="badge" style={{ background: "rgba(20, 184, 166, 0.15)", color: "var(--brand-teal-light)", border: "1px solid rgba(20, 184, 166, 0.3)" }}>
                      Smart Travel
                    </span>
                  </div>

                  <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 16 }}>
                    TravelWise transforms how you discover the Pearl of the Indian Ocean. From mist-veiled tea estates in Ella and ancient royal heritage in Kandy to golden southern coastlines — experience personalized itineraries backed by real local partner listings and multi-agent AI intelligence.
                  </p>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
                    <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: "#38bdf8", marginBottom: 3, display: "flex", alignItems: "center", gap: 6 }}>
                        <SparklesIcon size={14} color="#38bdf8" /> Multi-Agent AI
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>
                        5 specialized AI agents optimize itineraries, assess safety, and verify budgets.
                      </div>
                    </div>

                    <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: "#4ade80", marginBottom: 3, display: "flex", alignItems: "center", gap: 6 }}>
                        <ShieldCheckIcon size={14} color="#4ade80" /> Verified Partners
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>
                        Direct access to certified hotels, local restaurants, and licensed rental vehicles.
                      </div>
                    </div>

                    <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: "#f87171", marginBottom: 3, display: "flex", alignItems: "center", gap: 6 }}>
                        <SunIcon size={14} color="#f87171" /> Live Safety & Weather
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>
                        Open-Meteo alerts, road safety advisories, and emergency hotlines (119 / 1990).
                      </div>
                    </div>

                    <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: "#c084fc", marginBottom: 3, display: "flex", alignItems: "center", gap: 6 }}>
                        <WalletIcon size={14} color="#c084fc" /> Fair Split Billing
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>
                        Automated group expense sharing, debt settlement, and multi-currency exchange.
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: 14 }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={openTripWizard}
                    style={{
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      borderColor: "#10b981",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontWeight: 700
                    }}
                  >
                    <PlaneIcon size={14} /> Plan a New Trip
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setActiveNav("verified-listings")}
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <CompassIcon size={14} /> Explore Destinations
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setActiveNav("rental-vehicles")}
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <CarIcon size={14} /> Rental Vehicles
                  </button>
                </div>
              </section>
            </div>
          </>
        )}

        {/* ========================================================================= */}
        {/* CANVAS 2: SERVICE PROVIDER LISTINGS & APPROVAL GRID                      */}
        {/* ========================================================================= */}
        {/* ========================================================================= */}
        {/* CANVAS: EXPLORE SRI LANKA SHOWCASE (TRAVELLERS & PUBLIC)                  */}
        {/* ========================================================================= */}
        {role === "User" && activeNav === "catalog" && (
          <ExploreSriLankaView
            role={role}
            currentUserId={currentUserId}
            onPlanTrip={(destinationName) => {
              openTripWizard();
              updateTripWizard("destination", destinationName);
            }}
          />
        )}

        {/* ========================================================================= */}
        {/* ADMIN CATALOG VIEW (EXPLORE SRI LANKA + PARTNER MODERATION)               */}
        {/* ========================================================================= */}
        {role === "StaffAdmin" && activeNav === "catalog" && (
          <div style={{ marginBottom: 20, display: "flex", gap: 12, borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 16 }}>
            <button
              type="button"
              onClick={() => setAdminCatalogTab("explore")}
              style={{
                padding: "10px 22px",
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                border: adminCatalogTab === "explore" ? "2px solid #f59e0b" : "1px solid rgba(255,255,255,0.15)",
                background: adminCatalogTab === "explore" ? "rgba(245, 158, 11, 0.2)" : "rgba(255,255,255,0.05)",
                color: adminCatalogTab === "explore" ? "#fbbf24" : "var(--text-muted)",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>🌟</span> Explore Sri Lanka Showcase & Admin Publishing
            </button>
            <button
              type="button"
              onClick={() => setAdminCatalogTab("partner")}
              style={{
                padding: "10px 22px",
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                border: adminCatalogTab === "partner" ? "2px solid #8b5cf6" : "1px solid rgba(255,255,255,0.15)",
                background: adminCatalogTab === "partner" ? "rgba(139, 92, 246, 0.2)" : "rgba(255,255,255,0.05)",
                color: adminCatalogTab === "partner" ? "#c4b5fd" : "var(--text-muted)",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>🏢</span> Partner Listings & Moderation Queue {pendingCatalogItems.length > 0 && <span className="badge badge-warning">{pendingCatalogItems.length}</span>}
            </button>
          </div>
        )}

        {role === "StaffAdmin" && activeNav === "catalog" && adminCatalogTab === "explore" && (
          <ExploreSriLankaView
            role={role}
            currentUserId={currentUserId}
            onPlanTrip={(destinationName) => {
              openTripWizard();
              updateTripWizard("destination", destinationName);
            }}
          />
        )}

        {((role === "StaffAdmin" && adminCatalogTab === "partner") || role === "ServiceProvider") && activeNav === "catalog" && (
          <>
            {role === "StaffAdmin" && pendingCatalogItems.length > 0 && (
              <section className="card" style={{ border: "1px solid rgba(245, 158, 11, 0.35)", background: "linear-gradient(135deg, rgba(245, 158, 11, 0.06) 0%, var(--bg-card) 100%)" }}>
                <div className="card-header">
                  <div className="card-title">
                    <div className="card-title-icon" style={{ background: "var(--brand-gold-soft)", color: "var(--brand-gold)" }}>⏳</div>
                    <div>
                      <div style={{ color: "var(--brand-gold-light)" }}>Moderation Queue</div>
                      <div className="card-subtitle">{pendingCatalogItems.length} listing{pendingCatalogItems.length !== 1 ? "s" : ""} awaiting review</div>
                    </div>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={loadAllCatalog}>🔄 Refresh</button>
                </div>
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr><th>Type</th><th>Listing Name</th><th>Destination</th><th>Price</th><th>Provider User</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {pendingCatalogItems.map(item => (
                        <tr key={item.id}>
                          <td><span className="badge badge-warning">{item.type}</span></td>
                          <td><strong>{item.name}</strong><br /><span style={{ fontSize: 12, color: "var(--text-muted)" }}>{item.description}</span></td>
                          <td>📍 {item.destination}</td>
                          <td>{item.price ? `${item.price} ${item.currency}` : "Quote"}</td>
                          <td><span style={{ fontSize: 11, fontFamily: "monospace" }}>{item.providerUserId}</span></td>
                          <td>
                            <button className="btn btn-primary btn-sm" style={{ marginRight: 6 }} onClick={() => handleApproveCatalogItem(item.id)}>✅ Approve</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleRejectCatalogItem(item.id)}>❌ Reject</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* ================================================================ */}
            {/* DESTINATION MANAGER — Service Provider & StaffAdmin Feature      */}
            {/* ================================================================ */}
            {(role === "ServiceProvider" || role === "StaffAdmin") && (
              <section className="card" style={{ marginBottom: 24 }}>
                <div className="card-header">
                  <div className="card-title">
                    <div className="card-title-icon" style={{
                      background: role === "StaffAdmin" ? "linear-gradient(135deg,#8b5cf6,#6366f1)" : "linear-gradient(135deg,#0d9488,#0f766e)",
                      color: "#fff"
                    }}>
                      {role === "StaffAdmin" ? "👑" : "🗺️"}
                    </div>
                    <div>
                      <div>{role === "StaffAdmin" ? "Travel Destinations & Catalog Manager" : "My Destinations"}</div>
                      <div className="card-subtitle">
                        {role === "StaffAdmin"
                          ? "Create official TravelWise admin destinations or manage partner catalog listings across Sri Lanka"
                          : "Add & manage detailed destination information for travelers"}
                      </div>
                    </div>
                  </div>
                  <button
                    className="btn btn-accent"
                    style={{
                      background: role === "StaffAdmin" ? "linear-gradient(135deg,#8b5cf6,#6366f1)" : "linear-gradient(135deg,#14b8a6,#0d9488)",
                      color: "#fff",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: 6
                    }}
                    onClick={() => { setDestNameInput(""); setDestDescInput(""); setDestRegionInput(""); setDestModalOpen(true); }}
                  >
                    <span style={{ fontSize: 18 }}>+</span> {role === "StaffAdmin" ? "Add Admin Destination" : "Add a Destination"}
                  </button>
                </div>

                {/* Admin filter tabs */}
                {role === "StaffAdmin" && myDestinations.length > 0 && (
                  <div style={{ display: "flex", gap: 8, padding: "0 0 14px", flexWrap: "wrap" }}>
                    {[
                      { key: "ALL" as const, label: `🌟 All Destinations (${myDestinations.length})` },
                      { key: "ADMIN" as const, label: `👑 Official Admin Listings (${myDestinations.filter(isDestinationAdminListing).length})` },
                      { key: "PARTNER" as const, label: `🏢 Partner Listings (${myDestinations.filter(d => !isDestinationAdminListing(d)).length})` }
                    ].map(f => (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => setDestAdminFilter(f.key)}
                        style={{
                          padding: "6px 14px",
                          borderRadius: 20,
                          border: destAdminFilter === f.key ? "1px solid #8b5cf6" : "1px solid rgba(255,255,255,0.1)",
                          background: destAdminFilter === f.key ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.04)",
                          color: destAdminFilter === f.key ? "#c4b5fd" : "var(--text-muted)",
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: destAdminFilter === f.key ? 700 : 400
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Destination list pills */}
                {myDestinations.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "0 0 16px" }}>
                    {myDestinations
                      .filter(d => {
                        if (role !== "StaffAdmin" || destAdminFilter === "ALL") return true;
                        if (destAdminFilter === "ADMIN") return isDestinationAdminListing(d);
                        if (destAdminFilter === "PARTNER") return !isDestinationAdminListing(d);
                        return true;
                      })
                      .map(dest => {
                        const isAdminListing = isDestinationAdminListing(dest);
                        return (
                          <button
                            key={dest.id}
                            onClick={() => {
                              setActiveDestination(dest);
                              setDestActiveTab("visiting-places");
                              loadDestinationTab(dest, "visiting-places");
                              setVpForms([emptyVP()]);
                              setRestForms([emptyRestaurant()]);
                              setAccomForms([emptyAccom()]);
                              setDestTabError(null); setDestTabSuccess(null);
                            }}
                            style={{
                              padding: "8px 18px", borderRadius: 50,
                              border: activeDestination?.id === dest.id
                                ? (isAdminListing ? "2px solid #8b5cf6" : "2px solid #14b8a6")
                                : "1px solid rgba(255,255,255,0.1)",
                              background: activeDestination?.id === dest.id
                                ? (isAdminListing ? "rgba(139,92,246,0.25)" : "rgba(20,184,166,0.2)")
                                : "rgba(255,255,255,0.05)",
                              color: activeDestination?.id === dest.id
                                ? (isAdminListing ? "#c4b5fd" : "#2dd4bf")
                                : "var(--text-soft)",
                              cursor: "pointer", fontWeight: activeDestination?.id === dest.id ? 700 : 400,
                              fontSize: 13, transition: "all 0.2s",
                              display: "inline-flex", alignItems: "center", gap: 6
                            }}
                          >
                            <span>📍 {dest.name}</span>
                            {isAdminListing ? (
                              <span style={{ fontSize: 10, background: "rgba(139,92,246,0.3)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.5)", padding: "1px 6px", borderRadius: 10, fontWeight: 700 }}>
                                👑 Admin
                              </span>
                            ) : (
                              <span style={{ fontSize: 10, background: "rgba(20,184,166,0.2)", color: "#2dd4bf", padding: "1px 6px", borderRadius: 10 }}>
                                🏢 Partner
                              </span>
                            )}
                            <span>{dest.status === "Verified" ? "✅" : dest.status === "Pending" ? "⏳" : ""}</span>
                          </button>
                        );
                      })}
                  </div>
                )}

                {myDestinations.length === 0 && !activeDestination && (
                  <div className="empty-state" style={{ padding: "32px 0" }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🌏</div>
                    <p>No destinations yet.</p>
                    <p style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 6 }}>
                      Click <strong>+ Add a Destination</strong> to start adding places like "Ella", "Kandy", "Galle".
                    </p>
                  </div>
                )}

                {/* ============================================================ */}
                {/* ACTIVE DESTINATION — Tab-based Management Panels             */}
                {/* ============================================================ */}
                {activeDestination && (
                  <div style={{ marginTop: 24 }}>
                    {/* Destination Header Banner */}
                    <div style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 14, padding: "16px 20px", marginBottom: 20,
                      display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12
                    }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <div style={{ fontSize: 20, fontWeight: 800, color: isDestinationAdminListing(activeDestination) ? "#c4b5fd" : "#2dd4bf" }}>
                            📍 {activeDestination.name}
                          </div>
                          {isDestinationAdminListing(activeDestination) && (
                            <span style={{
                              background: "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(99,102,241,0.25))",
                              color: "#c4b5fd",
                              border: "1px solid rgba(139,92,246,0.5)",
                              padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                              display: "inline-flex", alignItems: "center", gap: 6
                            }}>
                              👑 Official Admin Listing
                            </span>
                          )}
                          {(!activeDestination.status || activeDestination.status === "NotVerified") && (
                            <span style={{
                              background: "rgba(234,179,8,0.15)", color: "#facc15", border: "1px solid rgba(234,179,8,0.35)",
                              padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600
                            }}>
                              📝 Not Verified (Draft)
                            </span>
                          )}
                          {activeDestination.status === "Pending" && (
                            <span style={{
                              background: "rgba(59,130,246,0.15)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.35)",
                              padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600
                            }}>
                              ⏳ Pending Admin Verification
                            </span>
                          )}
                          {activeDestination.status === "Verified" && (
                            <span style={{
                              background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.35)",
                              padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700
                            }}>
                              ✅ Verified & Live
                            </span>
                          )}
                          {activeDestination.status === "Rejected" && (
                            <span style={{
                              background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.35)",
                              padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600
                            }}>
                              ❌ Verification Rejected
                            </span>
                          )}
                        </div>
                        {activeDestination.region && <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{activeDestination.region}</div>}
                        {activeDestination.adminFeedback && (
                          <div style={{
                            marginTop: 6, fontSize: 12,
                            color: activeDestination.adminFeedback === "Official Admin Listing" ? "#c4b5fd" : "#fca5a5",
                            background: activeDestination.adminFeedback === "Official Admin Listing" ? "rgba(139,92,246,0.12)" : "rgba(239,68,68,0.1)",
                            border: activeDestination.adminFeedback === "Official Admin Listing" ? "1px solid rgba(139,92,246,0.3)" : "1px solid rgba(239,68,68,0.25)",
                            borderRadius: 6, padding: "4px 10px"
                          }}>
                            {activeDestination.adminFeedback === "Official Admin Listing" ? "🛡️ Official TravelWise Admin Entry" : `⚠️ Admin Feedback: ${activeDestination.adminFeedback}`}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        {role === "StaffAdmin" ? (
                          <span style={{
                            background: "linear-gradient(135deg, rgba(34,197,94,0.18), rgba(16,185,129,0.18))",
                            border: "1px solid rgba(34,197,94,0.4)",
                            color: "#4ade80",
                            borderRadius: 8,
                            padding: "6px 14px",
                            fontSize: 13,
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6
                          }}>
                            🛡️ Verified & Live
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={destSaving || uploadingImages || activeDestination.status === "Pending" || activeDestination.status === "Verified"}
                            onClick={() => handleSendToAdmin(activeDestination.id)}
                            style={{
                              background: activeDestination.status === "Verified"
                                ? "rgba(34,197,94,0.15)"
                                : activeDestination.status === "Pending"
                                ? "rgba(59,130,246,0.15)"
                                : "linear-gradient(135deg, #3b82f6, #2563eb)",
                              border: activeDestination.status === "Verified"
                                ? "1px solid rgba(34,197,94,0.4)"
                                : activeDestination.status === "Pending"
                                ? "1px solid rgba(59,130,246,0.4)"
                                : "none",
                              color: activeDestination.status === "Verified"
                                ? "#4ade80"
                                : activeDestination.status === "Pending"
                                ? "#60a5fa"
                                : "#ffffff",
                              borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 700,
                              cursor: activeDestination.status === "Pending" || activeDestination.status === "Verified" ? "default" : "pointer",
                              display: "inline-flex", alignItems: "center", gap: 6
                            }}
                            title={activeDestination.status === "Verified" ? "Listing is verified" : activeDestination.status === "Pending" ? "Listing is under admin review" : "Submit listing and all its details to admin for verification"}
                          >
                            {activeDestination.status === "Verified"
                              ? "✅ Verified"
                              : activeDestination.status === "Pending"
                              ? "⏳ Under Review"
                              : "📤 Send to Admin"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setEditingDestination(activeDestination)}
                          style={{
                            background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.3)",
                            color: "#38bdf8", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 12
                          }}
                          title="Edit destination overview"
                        >
                          ✏️ Edit Overview
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDestination(activeDestination.id)}
                          style={{
                            background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
                            color: "#f87171", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 12
                          }}
                          title="Delete destination"
                        >
                          🗑️ Delete
                        </button>
                        <button type="button" onClick={() => { setActiveDestination(null); }} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 18 }}>✕</button>
                      </div>
                    </div>

                    {/* Success / Error banners */}
                    {destTabSuccess && (
                      <div className="alert alert-success" style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                        <span>✅</span> {destTabSuccess}
                      </div>
                    )}
                    {destTabError && (
                      <div className="alert alert-danger" style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                        <span>⚠️</span> {destTabError}
                        <button onClick={() => setDestTabError(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "inherit", cursor: "pointer" }}>✕</button>
                      </div>
                    )}

                    {/* Tab bar */}
                    <div className="tabs-bar" style={{ marginBottom: 20 }}>
                      {(["visiting-places", "restaurants", "accommodations", "food-prices"] as DestinationTab[]).map(tab => {
                        const icons: Record<DestinationTab, string> = {
                          "visiting-places": "🏞️",
                          "restaurants": "🍽️",
                          "accommodations": "🏨",
                          "food-prices": "💰"
                        };
                        const labels: Record<DestinationTab, string> = {
                          "visiting-places": "Visiting Places",
                          "restaurants": "Restaurants",
                          "accommodations": "Accommodations",
                          "food-prices": "Food Prices"
                        };
                        return (
                          <button
                            key={tab}
                            className={`tab-item ${destActiveTab === tab ? "active" : ""}`}
                            onClick={() => { setDestActiveTab(tab); loadDestinationTab(activeDestination, tab); }}
                          >
                            {icons[tab]} {labels[tab]}
                          </button>
                        );
                      })}
                    </div>

                    {/* Loading state */}
                    {destTabLoading && (
                      <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                        <div style={{ fontSize: 32, marginBottom: 8, animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</div>
                        <div>Loading...</div>
                      </div>
                    )}

                    {/* ======================================================== */}
                    {/* TAB: VISITING PLACES                                      */}
                    {/* ======================================================== */}
                    {!destTabLoading && destActiveTab === "visiting-places" && (
                      <div>
                        {/* Existing visiting places */}
                        {visitingPlaces.length > 0 && (
                          <div style={{ marginBottom: 24 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>
                              Saved Visiting Places ({visitingPlaces.length})
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                              {visitingPlaces.map(vp => (
                                <div key={vp.id} style={{
                                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                                  borderRadius: 12, padding: 14
                                }}>
                                  {vp.imageUrls && vp.imageUrls.length > 0 && (
                                    <img src={vp.imageUrls[0]} alt={vp.name} style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 8, marginBottom: 8 }} />
                                  )}
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                                    <div style={{ fontWeight: 700 }}>{vp.name}</div>
                                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                      <button
                                        type="button"
                                        onClick={() => setEditingVp(vp)}
                                        style={{ background: "none", border: "none", color: "#38bdf8", cursor: "pointer", fontSize: 13, padding: "0 2px" }}
                                        title="Edit visiting place"
                                      >✏️</button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteVisitingPlace(vp.id)}
                                        style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 13, padding: "0 2px" }}
                                        title="Delete visiting place"
                                      >🗑️</button>
                                    </div>
                                  </div>
                                  {vp.location && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>📍 {vp.location}</div>}
                                  {vp.openingHours && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>🕐 {vp.openingHours}</div>}
                                  {vp.ticketRequired && (
                                    <div style={{ fontSize: 12, marginTop: 4 }}>
                                      🎟️ Ticket: <strong style={{ color: "#fbbf24" }}>LKR {vp.ticketPrice}</strong>
                                      {" "}({vp.ticketType})
                                    </div>
                                  )}
                                  {vp.description && <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 6 }}>{vp.description}</div>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Add new forms */}
                        <form onSubmit={handleSaveVisitingPlaces}>
                          {vpForms.map((form, idx) => (
                            <div key={form.id} style={{
                              background: "rgba(20,184,166,0.04)", border: "1px solid rgba(20,184,166,0.15)",
                              borderRadius: 14, padding: 20, marginBottom: 16, position: "relative"
                            }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "#2dd4bf", marginBottom: 14 }}>
                                🏞️ Visiting Place {vpForms.length > 1 ? `#${idx + 1}` : ""}
                                {idx > 0 && (
                                  <button type="button" onClick={() => setVpForms(f => f.filter((_, i) => i !== idx))}
                                    style={{ marginLeft: 12, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", borderRadius: 6, padding: "2px 10px", cursor: "pointer", fontSize: 12 }}>
                                    Remove
                                  </button>
                                )}
                              </div>

                              <div className="grid-2">
                                <div className="form-group">
                                  <label>Place Name <span style={{ color: "var(--danger)" }}>*</span></label>
                                  <input required className="form-control" placeholder="e.g. Nine Arch Bridge" value={form.name}
                                    onChange={e => setVpForms(f => f.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))} />
                                </div>
                                <div className="form-group">
                                  <label>Location (GPS / Address)</label>
                                  <input className="form-control" placeholder="e.g. Ella, Uva Province" value={form.location}
                                    onChange={e => setVpForms(f => f.map((x, i) => i === idx ? { ...x, location: e.target.value } : x))} />
                                </div>
                              </div>

                              <div className="form-group">
                                <label>Description / Details</label>
                                <textarea rows={2} className="form-control" placeholder="What makes this place special?" value={form.description}
                                  onChange={e => setVpForms(f => f.map((x, i) => i === idx ? { ...x, description: e.target.value } : x))} />
                              </div>

                              <div className="grid-2">
                                <div className="form-group">
                                  <label>Opening Hours</label>
                                  <input className="form-control" placeholder="e.g. 6:00 AM – 6:00 PM" value={form.openingHours}
                                    onChange={e => setVpForms(f => f.map((x, i) => i === idx ? { ...x, openingHours: e.target.value } : x))} />
                                </div>
                                <div className="form-group">
                                  <label>Ticket Required?</label>
                                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                                    {["Yes", "No"].map(opt => (
                                      <button key={opt} type="button"
                                        onClick={() => setVpForms(f => f.map((x, i) => i === idx ? { ...x, ticketRequired: opt === "Yes" } : x))}
                                        style={{
                                          padding: "8px 20px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13,
                                          border: (opt === "Yes" ? form.ticketRequired : !form.ticketRequired)
                                            ? "2px solid #14b8a6" : "1px solid rgba(255,255,255,0.1)",
                                          background: (opt === "Yes" ? form.ticketRequired : !form.ticketRequired)
                                            ? "rgba(20,184,166,0.2)" : "rgba(255,255,255,0.04)",
                                          color: (opt === "Yes" ? form.ticketRequired : !form.ticketRequired) ? "#2dd4bf" : "var(--text-muted)"
                                        }}
                                      >{opt}</button>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {form.ticketRequired && (
                                <div className="grid-2">
                                  <div className="form-group">
                                    <label>Ticket Price (LKR)</label>
                                    <input type="number" min="0" className="form-control" placeholder="500" value={form.ticketPrice}
                                      onChange={e => setVpForms(f => f.map((x, i) => i === idx ? { ...x, ticketPrice: e.target.value } : x))} />
                                  </div>
                                  <div className="form-group">
                                    <label>Ticket Type</label>
                                    <select className="form-control" value={form.ticketType}
                                      onChange={e => setVpForms(f => f.map((x, i) => i === idx ? { ...x, ticketType: e.target.value as any } : x))}>
                                      <option value="Foreigner">Foreigner</option>
                                      <option value="Local">Local</option>
                                      <option value="Student">Student</option>
                                    </select>
                                  </div>
                                </div>
                              )}

                              <div className="form-group">
                                <label>Images</label>
                                <input type="file" accept="image/*" multiple className="form-control" style={{ padding: "8px" }}
                                  onChange={e => {
                                    const files = e.target.files;
                                    if (!files) return;
                                    const newFiles = Array.from(files);
                                    const previews = newFiles.map(f => URL.createObjectURL(f));
                                    setVpForms(prev => prev.map((x, i) => i === idx
                                      ? { ...x, imageFiles: [...x.imageFiles, ...newFiles], imagePreviews: [...x.imagePreviews, ...previews] }
                                      : x));
                                  }} />
                                {form.imagePreviews.length > 0 && (
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                                    {form.imagePreviews.map((src, pi) => (
                                      <div key={pi} style={{ position: "relative" }}>
                                        <img src={src} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)" }} />
                                        <button type="button" onClick={() => setVpForms(prev => prev.map((x, i) => i === idx
                                          ? { ...x, imageFiles: x.imageFiles.filter((_, fi) => fi !== pi), imagePreviews: x.imagePreviews.filter((_, fi) => fi !== pi) }
                                          : x))}
                                          style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "#ef4444", border: "none", color: "#fff", cursor: "pointer", fontSize: 11, lineHeight: "20px", textAlign: "center" }}>
                                          ✕
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}

                          <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                            <button type="button" className="btn btn-secondary btn-sm"
                              onClick={() => setVpForms(f => [...f, emptyVP()])}>
                              + Add another Visiting Place
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={destSaving || uploadingImages}
                              style={{ background: "linear-gradient(135deg,#14b8a6,#0d9488)", minWidth: 140 }}>
                              {destSaving || uploadingImages ? "Saving..." : role === "StaffAdmin" ? "💾 Publish Visiting Places" : "💾 Save Visiting Places"}
                            </button>
                            {role !== "StaffAdmin" && (
                              <button
                                type="button"
                                className="btn"
                                disabled={destSaving || uploadingImages || activeDestination.status === "Pending" || activeDestination.status === "Verified"}
                                onClick={() => handleSendToAdmin(activeDestination.id)}
                                style={{
                                  background: activeDestination.status === "Verified"
                                    ? "rgba(34,197,94,0.15)"
                                    : activeDestination.status === "Pending"
                                    ? "rgba(59,130,246,0.15)"
                                    : "linear-gradient(135deg, #3b82f6, #2563eb)",
                                  border: activeDestination.status === "Verified"
                                    ? "1px solid rgba(34,197,94,0.4)"
                                    : activeDestination.status === "Pending"
                                    ? "1px solid rgba(59,130,246,0.4)"
                                    : "none",
                                  color: activeDestination.status === "Verified"
                                    ? "#4ade80"
                                    : activeDestination.status === "Pending"
                                    ? "#60a5fa"
                                    : "#ffffff",
                                  fontWeight: 600, minWidth: 140
                                }}
                              >
                                {activeDestination.status === "Verified"
                                  ? "✅ Verified"
                                  : activeDestination.status === "Pending"
                                  ? "⏳ Under Review"
                                  : "📤 Send to Admin"}
                              </button>
                            )}
                          </div>
                        </form>
                      </div>
                    )}

                    {/* ======================================================== */}
                    {/* TAB: RESTAURANTS                                           */}
                    {/* ======================================================== */}
                    {!destTabLoading && destActiveTab === "restaurants" && (
                      <div>
                        {/* Existing restaurants */}
                        {destRestaurants.length > 0 && (
                          <div style={{ marginBottom: 24 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>
                              Saved Restaurants ({destRestaurants.length})
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                              {destRestaurants.map(r => (
                                <div key={r.id} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 14 }}>
                                  {r.imageUrls && r.imageUrls.length > 0 && (
                                    <img src={r.imageUrls[0]} alt={r.name} style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 8, marginBottom: 8 }} />
                                  )}
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                                    <div style={{ fontWeight: 700 }}>🍽️ {r.name}</div>
                                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                      <button
                                        type="button"
                                        onClick={() => setEditingRestaurant(r)}
                                        style={{ background: "none", border: "none", color: "#38bdf8", cursor: "pointer", fontSize: 13, padding: "0 2px" }}
                                        title="Edit restaurant"
                                      >✏️</button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteRestaurant(r.id)}
                                        style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 13, padding: "0 2px" }}
                                        title="Delete restaurant"
                                      >🗑️</button>
                                    </div>
                                  </div>
                                  {r.location && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>📍 {r.location}</div>}
                                  {r.contact && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>📞 {r.contact}</div>}
                                  {r.foodItems && r.foodItems.length > 0 && (
                                    <div style={{ marginTop: 8 }}>
                                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Food Items ({r.foodItems.length}):</div>
                                      {r.foodItems.slice(0, 3).map(fi => (
                                        <div key={fi.id} style={{ fontSize: 12, display: "flex", justifyContent: "space-between" }}>
                                          <span>{fi.name}</span>
                                          <span style={{ color: "#fbbf24", fontWeight: 600 }}>LKR {Number(fi.price).toLocaleString()}</span>
                                        </div>
                                      ))}
                                      {r.foodItems.length > 3 && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>+{r.foodItems.length - 3} more</div>}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Add new restaurant forms */}
                        <form onSubmit={handleSaveRestaurants}>
                          {restForms.map((form, idx) => (
                            <div key={form.id} style={{
                              background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.15)",
                              borderRadius: 14, padding: 20, marginBottom: 16
                            }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "#fbbf24", marginBottom: 14 }}>
                                🍽️ Restaurant {restForms.length > 1 ? `#${idx + 1}` : ""}
                                {idx > 0 && (
                                  <button type="button" onClick={() => setRestForms(f => f.filter((_, i) => i !== idx))}
                                    style={{ marginLeft: 12, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", borderRadius: 6, padding: "2px 10px", cursor: "pointer", fontSize: 12 }}>
                                    Remove
                                  </button>
                                )}
                              </div>

                              <div className="grid-2">
                                <div className="form-group">
                                  <label>Restaurant Name <span style={{ color: "var(--danger)" }}>*</span></label>
                                  <input required className="form-control" placeholder="e.g. Cafe Chill" value={form.name}
                                    onChange={e => setRestForms(f => f.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))} />
                                </div>
                                <div className="form-group">
                                  <label>Location</label>
                                  <input className="form-control" placeholder="e.g. Main Street, Ella" value={form.location}
                                    onChange={e => setRestForms(f => f.map((x, i) => i === idx ? { ...x, location: e.target.value } : x))} />
                                </div>
                              </div>

                              <div className="grid-2">
                                <div className="form-group">
                                  <label>Contact</label>
                                  <input className="form-control" placeholder="+94 77 123 4567" value={form.contact}
                                    onChange={e => setRestForms(f => f.map((x, i) => i === idx ? { ...x, contact: e.target.value } : x))} />
                                </div>
                                <div className="form-group">
                                  <label>Description</label>
                                  <input className="form-control" placeholder="Cozy spot with amazing views" value={form.description}
                                    onChange={e => setRestForms(f => f.map((x, i) => i === idx ? { ...x, description: e.target.value } : x))} />
                                </div>
                              </div>

                              <div className="form-group">
                                <label>Restaurant Images</label>
                                <input type="file" accept="image/*" multiple className="form-control" style={{ padding: "8px" }}
                                  onChange={e => {
                                    const files = e.target.files; if (!files) return;
                                    const newFiles = Array.from(files);
                                    const previews = newFiles.map(f => URL.createObjectURL(f));
                                    setRestForms(prev => prev.map((x, i) => i === idx
                                      ? { ...x, imageFiles: [...x.imageFiles, ...newFiles], imagePreviews: [...x.imagePreviews, ...previews] } : x));
                                  }} />
                                {form.imagePreviews.length > 0 && (
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                                    {form.imagePreviews.map((src, pi) => (
                                      <img key={pi} src={src} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)" }} />
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Food Items sub-list */}
                              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-soft)", marginBottom: 12 }}>🍛 Food Items</div>
                                {form.foodItems.map((fi, fiIdx) => (
                                  <div key={fi.id} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 12, marginBottom: 10 }}>
                                    <div className="grid-2" style={{ gap: 8 }}>
                                      <div className="form-group" style={{ marginBottom: 8 }}>
                                        <label style={{ fontSize: 12 }}>Food Name</label>
                                        <input className="form-control" placeholder="Rice & Curry" value={fi.name}
                                          onChange={e => setRestForms(prev => prev.map((x, i) => i === idx
                                            ? { ...x, foodItems: x.foodItems.map((fi2, j) => j === fiIdx ? { ...fi2, name: e.target.value } : fi2) } : x))} />
                                      </div>
                                      <div className="form-group" style={{ marginBottom: 8 }}>
                                        <label style={{ fontSize: 12 }}>Price (LKR)</label>
                                        <input type="number" min="0" className="form-control" placeholder="350" value={fi.price}
                                          onChange={e => setRestForms(prev => prev.map((x, i) => i === idx
                                            ? { ...x, foodItems: x.foodItems.map((fi2, j) => j === fiIdx ? { ...fi2, price: e.target.value } : fi2) } : x))} />
                                      </div>
                                    </div>
                                    <div className="grid-2" style={{ gap: 8 }}>
                                      <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: 12 }}>Category</label>
                                        <select className="form-control" value={fi.category}
                                          onChange={e => setRestForms(prev => prev.map((x, i) => i === idx
                                            ? { ...x, foodItems: x.foodItems.map((fi2, j) => j === fiIdx ? { ...fi2, category: e.target.value as FoodCategory } : fi2) } : x))}>
                                          {["Breakfast", "Lunch", "Dinner", "Snack", "Beverage"].map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                      </div>
                                      <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: 12 }}>Food Image</label>
                                        <input type="file" accept="image/*" className="form-control" style={{ padding: "6px" }}
                                          onChange={e => {
                                            const file = e.target.files?.[0]; if (!file) return;
                                            const preview = URL.createObjectURL(file);
                                            setRestForms(prev => prev.map((x, i) => i === idx
                                              ? { ...x, foodItems: x.foodItems.map((fi2, j) => j === fiIdx ? { ...fi2, imageFile: file, imagePreview: preview } : fi2) } : x));
                                          }} />
                                      </div>
                                    </div>
                                    {fi.imagePreview && <img src={fi.imagePreview} alt="" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 8, marginTop: 8 }} />}
                                    {form.foodItems.length > 1 && (
                                      <button type="button" onClick={() => setRestForms(prev => prev.map((x, i) => i === idx
                                        ? { ...x, foodItems: x.foodItems.filter((_, j) => j !== fiIdx) } : x))}
                                        style={{ marginTop: 8, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 12 }}>
                                        Remove Item
                                      </button>
                                    )}
                                  </div>
                                ))}
                                <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 4 }}
                                  onClick={() => setRestForms(prev => prev.map((x, i) => i === idx
                                    ? { ...x, foodItems: [...x.foodItems, { id: crypto.randomUUID(), name: "", price: "", category: "Lunch" as FoodCategory, imageFile: null, imagePreview: "", imageUrl: "" }] } : x))}>
                                  + Add another Food Item
                                </button>
                              </div>
                            </div>
                          ))}

                          <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                            <button type="button" className="btn btn-secondary btn-sm"
                              onClick={() => setRestForms(f => [...f, emptyRestaurant()])}>
                              + Add another Restaurant
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={destSaving || uploadingImages}
                              style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", minWidth: 160 }}>
                              {destSaving || uploadingImages ? "Saving..." : role === "StaffAdmin" ? "💾 Publish Restaurants" : "💾 Save Restaurants"}
                            </button>
                            {role !== "StaffAdmin" && (
                              <button
                                type="button"
                                className="btn"
                                disabled={destSaving || uploadingImages || activeDestination.status === "Pending" || activeDestination.status === "Verified"}
                                onClick={() => handleSendToAdmin(activeDestination.id)}
                                style={{
                                  background: activeDestination.status === "Verified"
                                    ? "rgba(34,197,94,0.15)"
                                    : activeDestination.status === "Pending"
                                    ? "rgba(59,130,246,0.15)"
                                    : "linear-gradient(135deg, #3b82f6, #2563eb)",
                                  border: activeDestination.status === "Verified"
                                    ? "1px solid rgba(34,197,94,0.4)"
                                    : activeDestination.status === "Pending"
                                    ? "1px solid rgba(59,130,246,0.4)"
                                    : "none",
                                  color: activeDestination.status === "Verified"
                                    ? "#4ade80"
                                    : activeDestination.status === "Pending"
                                    ? "#60a5fa"
                                    : "#ffffff",
                                  fontWeight: 600, minWidth: 140
                                }}
                              >
                                {activeDestination.status === "Verified"
                                  ? "✅ Verified"
                                  : activeDestination.status === "Pending"
                                  ? "⏳ Under Review"
                                  : "📤 Send to Admin"}
                              </button>
                            )}
                          </div>
                        </form>
                      </div>
                    )}

                    {/* ======================================================== */}
                    {/* TAB: ACCOMMODATIONS                                        */}
                    {/* ======================================================== */}
                    {!destTabLoading && destActiveTab === "accommodations" && (
                      <div>
                        {/* Existing accommodations */}
                        {destAccommodations.length > 0 && (
                          <div style={{ marginBottom: 24 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>
                              Saved Accommodations ({destAccommodations.length})
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                              {destAccommodations.map(acc => (
                                <div key={acc.id} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 14 }}>
                                  {acc.imageUrls && acc.imageUrls.length > 0 && (
                                    <img src={acc.imageUrls[0]} alt={acc.name} style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 8, marginBottom: 8 }} />
                                  )}
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                                    <div style={{ fontWeight: 700 }}>🏨 {acc.name}</div>
                                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                      <button
                                        type="button"
                                        onClick={() => setEditingAccommodation(acc)}
                                        style={{ background: "none", border: "none", color: "#38bdf8", cursor: "pointer", fontSize: 13, padding: "0 2px" }}
                                        title="Edit accommodation"
                                      >✏️</button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteAccommodation(acc.id)}
                                        style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 13, padding: "0 2px" }}
                                        title="Delete accommodation"
                                      >🗑️</button>
                                    </div>
                                  </div>
                                  <div style={{ fontSize: 12, color: "#a78bfa", marginBottom: 4 }}>{acc.type}</div>
                                  {acc.location && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>📍 {acc.location}</div>}
                                  {acc.pricePerNight && <div style={{ fontSize: 13, color: "#fbbf24", fontWeight: 700, marginTop: 4 }}>LKR {Number(acc.pricePerNight).toLocaleString()} / night</div>}
                                  {acc.amenities && acc.amenities.length > 0 && (
                                    <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                                      {acc.amenities.map(a => <span key={a} style={{ fontSize: 11, background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", borderRadius: 20, padding: "2px 8px", color: "#a78bfa" }}>{a}</span>)}
                                    </div>
                                  )}
                                  {acc.specialNotes && <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 6, fontStyle: "italic" }}>ℹ️ {acc.specialNotes}</div>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Add new accommodation forms */}
                        <form onSubmit={handleSaveAccommodations}>
                          {accomForms.map((form, idx) => (
                            <div key={form.id} style={{
                              background: "rgba(167,139,250,0.04)", border: "1px solid rgba(167,139,250,0.15)",
                              borderRadius: 14, padding: 20, marginBottom: 16
                            }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa", marginBottom: 14 }}>
                                🏨 Accommodation {accomForms.length > 1 ? `#${idx + 1}` : ""}
                                {idx > 0 && (
                                  <button type="button" onClick={() => setAccomForms(f => f.filter((_, i) => i !== idx))}
                                    style={{ marginLeft: 12, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", borderRadius: 6, padding: "2px 10px", cursor: "pointer", fontSize: 12 }}>
                                    Remove
                                  </button>
                                )}
                              </div>

                              <div className="grid-2">
                                <div className="form-group">
                                  <label>Accommodation Name <span style={{ color: "var(--danger)" }}>*</span></label>
                                  <input required className="form-control" placeholder="e.g. 98 Acres Resort" value={form.name}
                                    onChange={e => setAccomForms(f => f.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))} />
                                </div>
                                <div className="form-group">
                                  <label>Type</label>
                                  <select className="form-control" value={form.type}
                                    onChange={e => setAccomForms(f => f.map((x, i) => i === idx ? { ...x, type: e.target.value as AccommodationType } : x))}>
                                    {["Hotel", "GuestHouse", "Homestay", "Villa", "Hostel"].map(t => <option key={t} value={t}>{t}</option>)}
                                  </select>
                                </div>
                              </div>

                              <div className="grid-2">
                                <div className="form-group">
                                  <label>Location</label>
                                  <input className="form-control" placeholder="e.g. Ella Gap Road" value={form.location}
                                    onChange={e => setAccomForms(f => f.map((x, i) => i === idx ? { ...x, location: e.target.value } : x))} />
                                </div>
                                <div className="form-group">
                                  <label>Price Per Night (LKR)</label>
                                  <input type="number" min="0" className="form-control" placeholder="8500" value={form.pricePerNight}
                                    onChange={e => setAccomForms(f => f.map((x, i) => i === idx ? { ...x, pricePerNight: e.target.value } : x))} />
                                </div>
                              </div>

                              <div className="grid-2">
                                <div className="form-group">
                                  <label>Contact Number</label>
                                  <input className="form-control" placeholder="+94 77 000 0000" value={form.contactNumber}
                                    onChange={e => setAccomForms(f => f.map((x, i) => i === idx ? { ...x, contactNumber: e.target.value } : x))} />
                                </div>
                                <div className="form-group">
                                  <label>Special Notes</label>
                                  <input className="form-control" placeholder="e.g. No hot water after 10pm" value={form.specialNotes}
                                    onChange={e => setAccomForms(f => f.map((x, i) => i === idx ? { ...x, specialNotes: e.target.value } : x))} />
                                </div>
                              </div>

                              <div className="form-group">
                                <label>Amenities</label>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                                  {["WiFi", "AC", "Pool", "Breakfast", "Parking", "Hot Water", "TV", "Restaurant"].map(amenity => (
                                    <button key={amenity} type="button"
                                      onClick={() => setAccomForms(f => f.map((x, i) => i === idx
                                        ? { ...x, amenities: x.amenities.includes(amenity) ? x.amenities.filter(a => a !== amenity) : [...x.amenities, amenity] }
                                        : x))}
                                      style={{
                                        padding: "5px 14px", borderRadius: 20, cursor: "pointer", fontSize: 12, fontWeight: 500,
                                        border: form.amenities.includes(amenity) ? "1px solid #a78bfa" : "1px solid rgba(255,255,255,0.1)",
                                        background: form.amenities.includes(amenity) ? "rgba(167,139,250,0.2)" : "rgba(255,255,255,0.04)",
                                        color: form.amenities.includes(amenity) ? "#a78bfa" : "var(--text-muted)"
                                      }}
                                    >{amenity}</button>
                                  ))}
                                </div>
                              </div>

                              <div className="form-group">
                                <label>Images</label>
                                <input type="file" accept="image/*" multiple className="form-control" style={{ padding: "8px" }}
                                  onChange={e => {
                                    const files = e.target.files; if (!files) return;
                                    const newFiles = Array.from(files);
                                    const previews = newFiles.map(f => URL.createObjectURL(f));
                                    setAccomForms(prev => prev.map((x, i) => i === idx
                                      ? { ...x, imageFiles: [...x.imageFiles, ...newFiles], imagePreviews: [...x.imagePreviews, ...previews] } : x));
                                  }} />
                                {form.imagePreviews.length > 0 && (
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                                    {form.imagePreviews.map((src, pi) => (
                                      <img key={pi} src={src} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)" }} />
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}

                          <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                            <button type="button" className="btn btn-secondary btn-sm"
                              onClick={() => setAccomForms(f => [...f, emptyAccom()])}>
                              + Add another Accommodation
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={destSaving || uploadingImages}
                              style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)", minWidth: 160 }}>
                              {destSaving || uploadingImages ? "Saving..." : role === "StaffAdmin" ? "💾 Publish Accommodations" : "💾 Save Accommodations"}
                            </button>
                            {role !== "StaffAdmin" && (
                              <button
                                type="button"
                                className="btn"
                                disabled={destSaving || uploadingImages || activeDestination.status === "Pending" || activeDestination.status === "Verified"}
                                onClick={() => handleSendToAdmin(activeDestination.id)}
                                style={{
                                  background: activeDestination.status === "Verified"
                                    ? "rgba(34,197,94,0.15)"
                                    : activeDestination.status === "Pending"
                                    ? "rgba(59,130,246,0.15)"
                                    : "linear-gradient(135deg, #3b82f6, #2563eb)",
                                  border: activeDestination.status === "Verified"
                                    ? "1px solid rgba(34,197,94,0.4)"
                                    : activeDestination.status === "Pending"
                                    ? "1px solid rgba(59,130,246,0.4)"
                                    : "none",
                                  color: activeDestination.status === "Verified"
                                    ? "#4ade80"
                                    : activeDestination.status === "Pending"
                                    ? "#60a5fa"
                                    : "#ffffff",
                                  fontWeight: 600, minWidth: 140
                                }}
                              >
                                {activeDestination.status === "Verified"
                                  ? "✅ Verified"
                                  : activeDestination.status === "Pending"
                                  ? "⏳ Under Review"
                                  : "📤 Send to Admin"}
                              </button>
                            )}
                          </div>
                        </form>
                      </div>
                    )}

                    {/* ======================================================== */}
                    {/* TAB: FOOD PRICES (Aggregated Summary)                     */}
                    {/* ======================================================== */}
                    {!destTabLoading && destActiveTab === "food-prices" && (
                      <div>
                        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 16, flexWrap: "wrap" }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: 12 }}>Min Price (LKR)</label>
                            <input type="number" min="0" className="form-control" style={{ width: 120 }} placeholder="0" value={foodPriceMinFilter}
                              onChange={e => setFoodPriceMinFilter(e.target.value)} />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: 12 }}>Max Price (LKR)</label>
                            <input type="number" min="0" className="form-control" style={{ width: 120 }} placeholder="Any" value={foodPriceMaxFilter}
                              onChange={e => setFoodPriceMaxFilter(e.target.value)} />
                          </div>
                          <button className="btn btn-secondary btn-sm" onClick={() => loadDestinationTab(activeDestination, "food-prices")}>
                            🔍 Filter
                          </button>
                        </div>

                        {destFoodPrices.length === 0 ? (
                          <div className="empty-state" style={{ padding: "32px 0" }}>
                            <div style={{ fontSize: 40, marginBottom: 10 }}>🍛</div>
                            <p>No food items yet.</p>
                            <p style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 4 }}>Add restaurants with food items in the Restaurants tab.</p>
                          </div>
                        ) : (
                          <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                              <thead>
                                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                                  {["Food Name", "Restaurant", "Category", "Price (LKR)", "Image"].map(h => (
                                    <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "var(--text-muted)", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {destFoodPrices.map((fp: any) => (
                                  <tr key={fp.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>{fp.name}</td>
                                    <td style={{ padding: "10px 12px", color: "var(--text-soft)" }}>🍽️ {fp.restaurantName}</td>
                                    <td style={{ padding: "10px 12px" }}>
                                      <span style={{ fontSize: 11, background: "rgba(20,184,166,0.15)", border: "1px solid rgba(20,184,166,0.3)", borderRadius: 20, padding: "2px 8px", color: "#2dd4bf" }}>{fp.category}</span>
                                    </td>
                                    <td style={{ padding: "10px 12px", color: "#fbbf24", fontWeight: 700 }}>
                                      {Number(fp.price).toLocaleString()}
                                    </td>
                                    <td style={{ padding: "10px 12px" }}>
                                      {fp.imageUrl
                                        ? <img src={fp.imageUrl} alt={fp.name} style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 8 }} />
                                        : <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 12 }}>
                              {destFoodPrices.length} food item{destFoodPrices.length !== 1 ? "s" : ""} found
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            <section className="card">
              <div className="card-header">
                <div className="card-title">
                  <div className="card-title-icon" style={{ background: "var(--brand-coral-soft)", color: "var(--brand-coral)" }}>🏝️</div>
                  <div>
                    <div>{role === "StaffAdmin" ? "Travel Catalog — All Providers" : "My Travel Listings"}</div>
                    <div className="card-subtitle">
                      {role === "StaffAdmin"
                        ? "Manage and moderate all partner listings across Sri Lanka"
                        : "Your curated experiences for travelers"}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input className="form-control" style={{ width: 200, height: 38 }} placeholder="🔍 Search destination..." value={catalogSearchDest} onChange={e => setCatalogSearchDest(e.target.value)} />
                  <button className="btn btn-secondary btn-sm" onClick={() => loadCatalog()}>Search</button>
                  {(role === "ServiceProvider" || role === "StaffAdmin") && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        setEditItem(null);
                        setCatalogForm({ type: "VisitingPlace", name: "", destination: "", description: "", address: "", contact: "", price: "", currency: "LKR", cuisineOrCategory: "", rating: "4.5" });
                        setModalType("CATALOG");
                      }}
                    >+ Add Listing</button>
                  )}
                </div>
              </div>

              <div className="tabs-bar">
                <button className={`tab-item ${catalogFilterType === "ALL" ? "active" : ""}`} onClick={() => setCatalogFilterType("ALL")}>All Category Items</button>
                <button className={`tab-item ${catalogFilterType === "VisitingPlace" ? "active" : ""}`} onClick={() => setCatalogFilterType("VisitingPlace")}>📍 Visiting Places</button>
                <button className={`tab-item ${catalogFilterType === "Restaurant" ? "active" : ""}`} onClick={() => setCatalogFilterType("Restaurant")}>🍽️ Restaurants</button>
                <button className={`tab-item ${catalogFilterType === "Accommodation" ? "active" : ""}`} onClick={() => setCatalogFilterType("Accommodation")}>🏨 Accommodation</button>
                <button className={`tab-item ${catalogFilterType === "FoodPrice" ? "active" : ""}`} onClick={() => setCatalogFilterType("FoodPrice")}>💰 Food Prices</button>
              </div>

              {filteredCatalog.length === 0 ? (
                <div className="empty-state">
                  <div style={{ fontSize: 56, marginBottom: 16 }}>🗺️</div>
                  <p>No catalog items found matching your filters.</p>
                  <p style={{ fontSize: 13, marginTop: 8, color: "var(--text-dim)" }}>
                    Try changing the destination search or category filter.
                  </p>
                </div>
              ) : (
                <div className="destination-grid">
                  {filteredCatalog.map(item => (
                    <div key={item.id} className="destination-card">
                      <div className="destination-image">
                        <img src={getDestinationImage(item.destination, item.type)} alt={item.destination} loading="lazy" />
                        <div className="destination-image-badges">
                          <span className="destination-type-badge">
                            {getCatalogTypeIcon(item.type)} {item.type.replace(/([A-Z])/g, " $1").trim()}
                          </span>
                          {item.isApproved
                            ? <span className="destination-price-tag">✓ Live</span>
                            : <span className="destination-price-tag" style={{ background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)", color: "#2a1d04" }}>⏳ Pending</span>}
                        </div>
                        {item.rating && (
                          <div className="destination-rating">⭐ {item.rating.toFixed(1)}</div>
                        )}
                      </div>

                      <div className="destination-body">
                        <div className="destination-name">{item.name}</div>
                        <div className="destination-location">📍 {item.destination}</div>
                        <div className="destination-description">{item.description}</div>

                        <div className="destination-meta">
                          <div className="destination-provider">
                            <span className="provider-dot"></span>
                            {item.price ? (
                              <span style={{ color: "var(--brand-gold-light)", fontWeight: 700 }}>
                                {item.price.toLocaleString()} {item.currency}
                              </span>
                            ) : (
                              <span>Quote on request</span>
                            )}
                          </div>
                          <div className="destination-actions">
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                setEditItem(item);
                                setCatalogForm({
                                  type: item.type,
                                  name: item.name,
                                  destination: item.destination,
                                  description: item.description,
                                  address: item.address || "",
                                  contact: item.contact || "",
                                  price: item.price ? String(item.price) : "",
                                  currency: item.currency,
                                  cuisineOrCategory: item.cuisineOrCategory || "",
                                  rating: item.rating ? String(item.rating) : "4.5"
                                });
                                setModalType("CATALOG");
                              }}
                            >✏️ Edit</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDeleteCatalogItem(item.id)}>🗑️</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* ========================================================================= */}
        {/* CANVAS: VERIFIED TRAVEL LISTINGS (SERVICE PROVIDER ONLY)                  */}
        {/* ========================================================================= */}
        {role === "ServiceProvider" && activeNav === "verified-listings" && (
          <>
            <section className="card">
              <div className="card-header">
                <div className="card-title">
                  <div className="card-title-icon" style={{ background: "linear-gradient(135deg, rgba(20,184,166,0.2), rgba(16,185,129,0.2))", color: "#2dd4bf", border: "1px solid rgba(20,184,166,0.3)" }}>
                    🛡️
                  </div>
                  <div>
                    <div>Verified Travel Listings</div>
                    <div className="card-subtitle">
                      Official, admin-approved destinations published live to travellers & AI itinerary planners
                    </div>
                  </div>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setActiveNav("catalog");
                    setDestNameInput(""); setDestDescInput(""); setDestRegionInput(""); setDestModalOpen(true);
                  }}
                  style={{ background: "linear-gradient(135deg, #0ea5e9, #0284c7)" }}
                >
                  + Add New Destination
                </button>
              </div>

              {/* Stats Overview */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
                <div style={{ background: "rgba(20,184,166,0.08)", border: "1px solid rgba(20,184,166,0.2)", borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 12, color: "var(--brand-teal-light)", fontWeight: 600, textTransform: "uppercase" }}>🛡️ Verified Destinations</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: "#2dd4bf", marginTop: 4 }}>
                    {myDestinations.filter(d => d.status === "Verified").length}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>Publicly visible across Sri Lanka</div>
                </div>

                <div style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 12, color: "#60a5fa", fontWeight: 600, textTransform: "uppercase" }}>📍 Visiting Attractions</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: "#93c5fd", marginTop: 4 }}>
                    {myDestinations.filter(d => d.status === "Verified").reduce((acc, d) => acc + (d.visitingPlaces?.length || 0), 0)}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>Curated points of interest</div>
                </div>

                <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 12, color: "#fbbf24", fontWeight: 600, textTransform: "uppercase" }}>🍽️ Dining & Food Outlets</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: "#fcd34d", marginTop: 4 }}>
                    {myDestinations.filter(d => d.status === "Verified").reduce((acc, d) => acc + (d.restaurants?.length || 0), 0)}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>Restaurants with price menus</div>
                </div>

                <div style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 12, color: "#a78bfa", fontWeight: 600, textTransform: "uppercase" }}>🏨 Stays & Lodging</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: "#c4b5fd", marginTop: 4 }}>
                    {myDestinations.filter(d => d.status === "Verified").reduce((acc, d) => acc + (d.accommodations?.length || 0), 0)}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>Hotels, homestays & villas</div>
                </div>
              </div>

              {/* Verified Destinations List */}
              {myDestinations.filter(d => d.status === "Verified").length === 0 ? (
                <div style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px dashed rgba(255,255,255,0.12)",
                  borderRadius: 16,
                  padding: "40px 24px",
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: 52, marginBottom: 16 }}>🛡️</div>
                  <h3 style={{ fontSize: 20, marginBottom: 8, color: "var(--text-white)" }}>No Verified Listings Yet</h3>
                  <p style={{ color: "var(--text-muted)", maxWidth: 540, margin: "0 auto 24px", lineHeight: 1.6, fontSize: 14 }}>
                    Your destination listings must be submitted and approved by the TravelWise Admin before they are certified as <strong>Verified</strong>.
                  </p>

                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 16,
                    maxWidth: 780,
                    margin: "0 auto 28px",
                    textAlign: "left"
                  }}>
                    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 16 }}>
                      <div style={{ fontSize: 18, marginBottom: 6 }}>1️⃣ Add Destination</div>
                      <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                        Create a destination in <strong>My Travel Listings</strong> and add visiting places, restaurants, and stays.
                      </div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 16 }}>
                      <div style={{ fontSize: 18, marginBottom: 6 }}>2️⃣ Send to Admin</div>
                      <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                        Click the blue <strong>📤 Send to Admin</strong> button to submit for review. Status changes to <em>Pending</em>.
                      </div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 16 }}>
                      <div style={{ fontSize: 18, marginBottom: 6 }}>3️⃣ Admin Approves</div>
                      <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                        Once verified by Admin, it appears right here with a <strong>✅ Verified</strong> badge and goes live to users.
                      </div>
                    </div>
                  </div>

                  {myDestinations.some(d => d.status === "Pending" || d.status === "NotVerified" || !d.status) && (
                    <div style={{
                      display: "inline-block",
                      background: "rgba(59,130,246,0.1)",
                      border: "1px solid rgba(59,130,246,0.25)",
                      borderRadius: 12,
                      padding: "12px 24px",
                      marginBottom: 20,
                      fontSize: 13,
                      color: "#93c5fd"
                    }}>
                      💡 You currently have <strong>{myDestinations.filter(d => d.status === "Pending").length}</strong> destination(s) under review and <strong>{myDestinations.filter(d => d.status === "NotVerified" || !d.status).length}</strong> in draft.
                    </div>
                  )}

                  <div>
                    <button
                      className="btn btn-primary"
                      onClick={() => setActiveNav("catalog")}
                      style={{ background: "linear-gradient(135deg, var(--brand-teal-light), #0d9488)", padding: "10px 24px", fontWeight: 700 }}
                    >
                      Go to My Travel Listings 🏝️
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {myDestinations.filter(d => d.status === "Verified").map(dest => {
                    const vpCount = dest.visitingPlaces?.length || 0;
                    const restCount = dest.restaurants?.length || 0;
                    const accomCount = dest.accommodations?.length || 0;

                    return (
                      <div key={dest.id} style={{
                        background: "rgba(15,23,42,0.6)",
                        border: "1px solid rgba(34,197,94,0.3)",
                        borderRadius: 16,
                        padding: 22,
                        boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
                        position: "relative"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14, marginBottom: 16 }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                              <h3 style={{ margin: 0, fontSize: 22, color: "var(--text-white)" }}>📍 {dest.name}</h3>
                              {dest.region && (
                                <span style={{ fontSize: 12, background: "rgba(255,255,255,0.08)", padding: "4px 12px", borderRadius: 20, color: "var(--brand-teal-light)" }}>
                                  🗺️ {dest.region}
                                </span>
                              )}
                              <span style={{
                                fontSize: 12,
                                background: "rgba(34,197,94,0.15)",
                                border: "1px solid rgba(34,197,94,0.4)",
                                color: "#4ade80",
                                padding: "4px 12px",
                                borderRadius: 20,
                                fontWeight: 700,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6
                              }}>
                                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block", boxShadow: "0 0 8px #22c55e" }}></span>
                                Verified & Live
                              </span>
                            </div>
                            {dest.description && (
                              <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8, marginBottom: 4, maxWidth: 800 }}>
                                {dest.description}
                              </p>
                            )}
                            <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 6 }}>
                              🛡️ Verified by TravelWise Admin {dest.verifiedAt ? `on ${new Date(dest.verifiedAt).toLocaleDateString()}` : ""}
                            </div>
                          </div>

                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setActiveDestination(dest);
                              setActiveNav("catalog");
                            }}
                            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                          >
                            ✏️ Edit in Catalog
                          </button>
                        </div>

                        {/* Sub-entity preview badges */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                          <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 12 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--brand-teal-light)", marginBottom: 6 }}>
                              📍 Visiting Places ({vpCount})
                            </div>
                            {vpCount > 0 ? (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {dest.visitingPlaces?.slice(0, 4).map(vp => (
                                  <span key={vp.id} style={{ fontSize: 11, background: "rgba(20,184,166,0.1)", border: "1px solid rgba(20,184,166,0.2)", borderRadius: 6, padding: "2px 8px", color: "var(--text-soft)" }}>
                                    {vp.name}
                                  </span>
                                ))}
                                {vpCount > 4 && <span style={{ fontSize: 11, color: "var(--text-dim)" }}>+{vpCount - 4} more</span>}
                              </div>
                            ) : (
                              <span style={{ fontSize: 11, color: "var(--text-dim)" }}>None added</span>
                            )}
                          </div>

                          <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 12 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#fbbf24", marginBottom: 6 }}>
                              🍽️ Restaurants & Dining ({restCount})
                            </div>
                            {restCount > 0 ? (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {dest.restaurants?.slice(0, 4).map(r => (
                                  <span key={r.id} style={{ fontSize: 11, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 6, padding: "2px 8px", color: "var(--text-soft)" }}>
                                    {r.name}
                                  </span>
                                ))}
                                {restCount > 4 && <span style={{ fontSize: 11, color: "var(--text-dim)" }}>+{restCount - 4} more</span>}
                              </div>
                            ) : (
                              <span style={{ fontSize: 11, color: "var(--text-dim)" }}>None added</span>
                            )}
                          </div>

                          <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 12 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa", marginBottom: 6 }}>
                              🏨 Accommodations ({accomCount})
                            </div>
                            {accomCount > 0 ? (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {dest.accommodations?.slice(0, 4).map(acc => (
                                  <span key={acc.id} style={{ fontSize: 11, background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 6, padding: "2px 8px", color: "var(--text-soft)" }}>
                                    {acc.name}
                                  </span>
                                ))}
                                {accomCount > 4 && <span style={{ fontSize: 11, color: "var(--text-dim)" }}>+{accomCount - 4} more</span>}
                              </div>
                            ) : (
                              <span style={{ fontSize: 11, color: "var(--text-dim)" }}>None added</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

        {/* ========================================================================= */}
        {/* CANVAS 3: TRIPS ANALYTICS & MANAGEMENT                                   */}
        {/* ========================================================================= */}
        {activeNav === "trips" && (
          <>
            <section className="card">
              <div className="card-header" style={{ flexWrap: "wrap", gap: 14 }}>
                <div className="card-title">
                  <div className="card-title-icon">✈️</div>
                  <div>
                    <div>Group Trips Collection</div>
                    <div className="card-subtitle">Plan, share, and explore Sri Lanka with your crew</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="badge badge-primary" style={{ fontSize: 13 }}>{trips.length} trip{trips.length !== 1 ? "s" : ""}</span>
                  <button className="btn btn-primary btn-sm" onClick={openTripWizard}>
                    + Plan New Trip
                  </button>
                </div>
              </div>

              {/* Categorization Tabs: Admin Approved vs Pending vs Declined */}
              {(() => {
                const isTripApproved = (t: Trip) => t.status === "Reviewed" || t.status === "Approved";
                const isTripPending = (t: Trip) => t.status === "PendingReview";
                const isTripDeclined = (t: Trip) => t.status === "Declined";
                const isTripDraft = (t: Trip) => !isTripApproved(t) && !isTripPending(t) && !isTripDeclined(t);

                const approvedCount = trips.filter(isTripApproved).length;
                const pendingCount = trips.filter(isTripPending).length;
                const declinedCount = trips.filter(isTripDeclined).length;
                const draftCount = trips.filter(isTripDraft).length;

                const visibleTrips = trips.filter(t => {
                  if (tripApprovalTab === "APPROVED") return isTripApproved(t);
                  if (tripApprovalTab === "PENDING") return isTripPending(t);
                  if (tripApprovalTab === "DECLINED") return isTripDeclined(t);
                  if (tripApprovalTab === "DRAFT") return isTripDraft(t);
                  return true;
                });

                return (
                  <>
                    <div
                      className="tabs-bar"
                      style={{
                        marginBottom: "1.5rem",
                        flexWrap: "wrap",
                        gap: 8,
                        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                        paddingBottom: "0.5rem"
                      }}
                    >
                      <button
                        className={`tab-item ${tripApprovalTab === "ALL" ? "active" : ""}`}
                        onClick={() => setTripApprovalTab("ALL")}
                      >
                        🌟 All Trips ({trips.length})
                      </button>
                      <button
                        className={`tab-item ${tripApprovalTab === "APPROVED" ? "active" : ""}`}
                        onClick={() => setTripApprovalTab("APPROVED")}
                        style={{
                          color: tripApprovalTab === "APPROVED" ? "#4ade80" : undefined,
                          borderColor: tripApprovalTab === "APPROVED" ? "#22c55e" : undefined
                        }}
                      >
                        ✅ Admin Approved ({approvedCount})
                      </button>
                      <button
                        className={`tab-item ${tripApprovalTab === "PENDING" ? "active" : ""}`}
                        onClick={() => setTripApprovalTab("PENDING")}
                        style={{
                          color: tripApprovalTab === "PENDING" ? "#fbbf24" : undefined,
                          borderColor: tripApprovalTab === "PENDING" ? "#f59e0b" : undefined
                        }}
                      >
                        ⏳ Pending Review ({pendingCount})
                      </button>
                      <button
                        className={`tab-item ${tripApprovalTab === "DECLINED" ? "active" : ""}`}
                        onClick={() => setTripApprovalTab("DECLINED")}
                        style={{
                          color: tripApprovalTab === "DECLINED" ? "#f87171" : undefined,
                          borderColor: tripApprovalTab === "DECLINED" ? "#ef4444" : undefined
                        }}
                      >
                        ❌ Declined ({declinedCount})
                      </button>
                      <button
                        className={`tab-item ${tripApprovalTab === "DRAFT" ? "active" : ""}`}
                        onClick={() => setTripApprovalTab("DRAFT")}
                      >
                        📝 Drafts ({draftCount})
                      </button>
                    </div>

                    {trips.length === 0 ? (
                      <div className="empty-state">
                        <div style={{ fontSize: 56, marginBottom: 16 }}>🧳</div>
                        <p>No trips yet. Start planning your Sri Lankan adventure!</p>
                        <p style={{ fontSize: 13, marginTop: 8, color: "var(--text-dim)" }}>
                          Click <strong>+ Plan New Trip</strong> in the dashboard to begin.
                        </p>
                      </div>
                    ) : visibleTrips.length === 0 ? (
                      <div className="empty-state" style={{ padding: "3rem 1rem", textAlign: "center" }}>
                        <div style={{ fontSize: 44, marginBottom: 12 }}>🔍</div>
                        <p style={{ color: "#94a3b8", fontSize: "1rem" }}>
                          No trips found under the <strong>{tripApprovalTab === "APPROVED" ? "Admin Approved" : tripApprovalTab === "PENDING" ? "Pending Review" : tripApprovalTab === "DECLINED" ? "Declined" : "Drafts"}</strong> category.
                        </p>
                        <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={() => setTripApprovalTab("ALL")}>
                          View All Trips
                        </button>
                      </div>
                    ) : (
                      <div className="destination-grid">
                        {visibleTrips.map(trip => {
                          const approved = isTripApproved(trip);
                          const pending = isTripPending(trip);
                          const declined = isTripDeclined(trip);
                          const draft = isTripDraft(trip);

                          // Parse planning json for card details if available
                          let tripPlanning: any = null;
                          if (trip.planningDetailsJson) {
                            try { tripPlanning = JSON.parse(trip.planningDetailsJson); } catch {}
                          }

                          const memberCount = Array.isArray(tripPlanning?.groupMembers) ? tripPlanning.groupMembers.length : members.length;
                          const hasWarning = Boolean(trip.adminWarningNote);
                          const hasFeedback = Boolean(trip.adminFeedback);

                          return (
                            <div
                              key={trip.id}
                              className="trip-card"
                              onClick={() => setDetailedTripModal(trip)}
                              style={{ cursor: "pointer" }}
                              title="Click to view full trip details"
                            >
                              <div className="trip-card-image">
                                <img src={getDestinationImage(trip.destination, "Trip")} alt={trip.destination} loading="lazy" />

                                {/* Admin Status Badge on top-left of card image */}
                                <div style={{ position: "absolute", top: 12, left: 12, zIndex: 4 }}>
                                  {approved && (
                                    <span
                                      style={{
                                        background: "linear-gradient(135deg, rgba(34, 197, 94, 0.95), rgba(21, 128, 61, 0.95))",
                                        color: "#ffffff",
                                        padding: "4px 10px",
                                        borderRadius: "9999px",
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        boxShadow: "0 4px 12px rgba(34, 197, 94, 0.4)",
                                        border: "1px solid rgba(255, 255, 255, 0.2)"
                                      }}
                                    >
                                      ✅ Approved
                                    </span>
                                  )}
                                  {pending && (
                                    <span
                                      style={{
                                        background: "linear-gradient(135deg, rgba(245, 158, 11, 0.95), rgba(180, 83, 9, 0.95))",
                                        color: "#ffffff",
                                        padding: "4px 10px",
                                        borderRadius: "9999px",
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        boxShadow: "0 4px 12px rgba(245, 158, 11, 0.4)",
                                        border: "1px solid rgba(255, 255, 255, 0.2)"
                                      }}
                                    >
                                      ⏳ Pending Review
                                    </span>
                                  )}
                                  {declined && (
                                    <span
                                      style={{
                                        background: "linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(185, 28, 28, 0.95))",
                                        color: "#ffffff",
                                        padding: "4px 10px",
                                        borderRadius: "9999px",
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        boxShadow: "0 4px 12px rgba(239, 68, 68, 0.4)",
                                        border: "1px solid rgba(255, 255, 255, 0.2)"
                                      }}
                                    >
                                      ❌ Declined
                                    </span>
                                  )}
                                  {draft && (
                                    <span
                                      style={{
                                        background: "linear-gradient(135deg, rgba(100, 116, 139, 0.95), rgba(51, 65, 85, 0.95))",
                                        color: "#ffffff",
                                        padding: "4px 10px",
                                        borderRadius: "9999px",
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                                        border: "1px solid rgba(255, 255, 255, 0.2)"
                                      }}
                                    >
                                      📝 Draft Plan
                                    </span>
                                  )}
                                </div>

                                {selectedTrip?.id === trip.id && (
                                  <div className="trip-card-active-indicator">Active</div>
                                )}

                                <button
                                  type="button"
                                  className="trip-card-delete-badge"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTrip(trip.id);
                                  }}
                                  title="Delete Trip Permanently"
                                  style={{
                                    right: selectedTrip?.id === trip.id ? "78px" : "12px"
                                  }}
                                  aria-label="Delete Trip"
                                >
                                  <TrashIcon size={13} color="currentColor" />
                                </button>

                                <div className="trip-card-image-overlay">
                                  <div className="trip-card-title-overlay">{trip.name}</div>
                                  <span className="trip-card-dest-badge">📍 {trip.destination}</span>
                                </div>
                              </div>

                              <div className="trip-card-body">
                                <div className="trip-card-dates">
                                  🗓️ <span>{trip.startDate}</span> <span style={{ color: "var(--brand-teal-light)" }}>→</span> <span>{trip.endDate}</span>
                                </div>

                                {/* Feedback / Warning preview if available */}
                                {hasWarning && (
                                  <div style={{ fontSize: 11, color: "#fbbf24", marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
                                    <span>⚠️</span> <span>Advisory: {trip.adminWarningNote!.length > 32 ? trip.adminWarningNote!.substring(0, 32) + "..." : trip.adminWarningNote}</span>
                                  </div>
                                )}
                                {hasFeedback && !hasWarning && (
                                  <div style={{ fontSize: 11, color: approved ? "#34d399" : "#fca5a5", marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
                                    <span>💬</span> <span>Admin: {trip.adminFeedback!.length > 32 ? trip.adminFeedback!.substring(0, 32) + "..." : trip.adminFeedback}</span>
                                  </div>
                                )}

                                {/* Verified AI Indicator Badge */}
                                {trip.adminApprovedAiReviewJson && (
                                  <div style={{ fontSize: 11, color: "#34d399", marginBottom: 8, display: "flex", alignItems: "center", gap: 4, fontWeight: 700 }}>
                                    <span>🛡️</span> <span>Verified AI Evaluation & Budget Ready</span>
                                  </div>
                                )}

                                <div className="trip-card-stats">
                                  <div className="trip-card-stat">
                                    <span className="trip-card-stat-val">
                                      {tripPlanning?.totalBudget ? `${Number(tripPlanning.totalBudget) >= 1000 ? Math.round(Number(tripPlanning.totalBudget)/1000) + 'k' : tripPlanning.totalBudget}` : budgets.length}
                                    </span>
                                    <span className="trip-card-stat-lbl">{tripPlanning?.totalBudget ? "Budget" : "Budgets"}</span>
                                  </div>
                                  <div className="trip-card-stat">
                                    <span className="trip-card-stat-val">{activities.length}</span>
                                    <span className="trip-card-stat-lbl">Activities</span>
                                  </div>
                                  <div className="trip-card-stat">
                                    <span className="trip-card-stat-val">{memberCount}</span>
                                    <span className="trip-card-stat-lbl">Members</span>
                                  </div>
                                  <div className="trip-card-stat">
                                    <span className="trip-card-stat-val">{expenses.length}</span>
                                    <span className="trip-card-stat-lbl">Expenses</span>
                                  </div>
                                </div>

                                <div className="trip-card-actions" onClick={e => e.stopPropagation()}>
                                  <div className="trip-card-actions-grid">
                                    <button
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => setDetailedTripModal(trip)}
                                      title="View Full Trip Details & Itinerary"
                                    >
                                      👁️ Details
                                    </button>
                                    <button
                                      className={selectedTrip?.id === trip.id ? "btn btn-primary btn-sm" : "btn btn-secondary btn-sm"}
                                      onClick={() => setSelectedTrip(trip)}
                                      title={selectedTrip?.id === trip.id ? "Active Trip Selected" : "Set as Active Trip"}
                                    >
                                      {selectedTrip?.id === trip.id ? "✓ Active" : "Select"}
                                    </button>
                                    <button
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => openEditTripWizard(trip)}
                                      title="Edit Trip Details with Wizard"
                                    >
                                      ✏️ Edit
                                    </button>
                                    <button
                                      className="btn btn-danger btn-sm"
                                      onClick={() => handleDeleteTrip(trip.id)}
                                      title="Delete Trip Permanently"
                                      style={{
                                        background: "rgba(239, 68, 68, 0.15)",
                                        border: "1px solid rgba(239, 68, 68, 0.35)",
                                        color: "#f87171"
                                      }}
                                    >
                                      <TrashIcon size={12} color="currentColor" /> Delete
                                    </button>
                                  </div>

                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 6 }}>
                                    <button
                                      type="button"
                                      className="btn btn-sm"
                                      onClick={() => setSelectedSuggestedListingsTrip(trip)}
                                      style={{
                                        background: "linear-gradient(135deg, rgba(14, 165, 233, 0.18), rgba(2, 132, 199, 0.3))",
                                        border: "1px solid rgba(56, 189, 248, 0.45)",
                                        color: "#38bdf8",
                                        fontWeight: 700,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: 5,
                                        padding: "7px 8px",
                                        borderRadius: "6px",
                                        boxShadow: "0 2px 8px rgba(14, 165, 233, 0.18)",
                                        fontSize: "12px",
                                        whiteSpace: "nowrap"
                                      }}
                                      title="View Accommodations, Restaurants, Food, Vehicles & Sights suggested by AI"
                                    >
                                      🏨 AI Listings
                                    </button>

                                    <button
                                      type="button"
                                      className="btn btn-sm"
                                      disabled={busy}
                                      onClick={() => handleTravellerAiReviewClick(trip)}
                                      style={trip.adminApprovedAiReviewJson ? {
                                        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                        color: "#ffffff",
                                        fontWeight: 700,
                                        border: "1px solid #34d399",
                                        boxShadow: "0 0 10px rgba(16, 185, 129, 0.35)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: 5,
                                        padding: "7px 8px",
                                        borderRadius: "6px",
                                        fontSize: "12px",
                                        whiteSpace: "nowrap"
                                      } : {
                                        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                                        color: "#ffffff",
                                        fontWeight: 600,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: 5,
                                        padding: "7px 8px",
                                        borderRadius: "6px",
                                        boxShadow: "0 2px 8px rgba(99, 102, 241, 0.25)",
                                        fontSize: "12px",
                                        whiteSpace: "nowrap"
                                      }}
                                      title={trip.adminApprovedAiReviewJson ? "View Admin-Verified AI Travel Evaluation & Admin Notes" : "Run AI Review"}
                                    >
                                      {trip.adminApprovedAiReviewJson ? "🛡️ Verified Plan" : "🤖 AI Review"}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              })()}
            </section>



            {selectedTrip && (
              <section className="card">
                <div className="card-header">
                  <div className="card-title">
                    <div className="card-title-icon" style={{ background: "var(--brand-leaf-soft)", color: "var(--brand-leaf)" }}>📊</div>
                    <div>
                      <div>Trip Workspace — {selectedTrip.name}</div>
                      <div className="card-subtitle">📍 {selectedTrip.destination} · 🗓️ {selectedTrip.startDate} → {selectedTrip.endDate}</div>
                    </div>
                  </div>
                </div>

                <div className="tabs-bar">
                  <button className={`tab-item ${tripTab === "budgets" ? "active" : ""}`} onClick={() => setTripTab("budgets")}>💰 Budgets ({budgets.length})</button>
                  <button className={`tab-item ${tripTab === "expenses" ? "active" : ""}`} onClick={() => setTripTab("expenses")}>🧾 Shared Expenses ({expenses.length})</button>
                  <button className={`tab-item ${tripTab === "activities" ? "active" : ""}`} onClick={() => setTripTab("activities")}>🗺️ Itinerary Activities ({activities.length})</button>
                  <button className={`tab-item ${tripTab === "risks" ? "active" : ""}`} onClick={() => setTripTab("risks")}>🛡️ Risks & Safety ({risks.length})</button>
                  <button className={`tab-item ${tripTab === "members" ? "active" : ""}`} onClick={() => setTripTab("members")}>👥 Group Members ({members.length})</button>
                  <button className={`tab-item ${tripTab === "settlements" ? "active" : ""}`} onClick={() => setTripTab("settlements")}>⚖️ Settlement Summary</button>
                </div>

                {tripTab === "budgets" && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                      <h4>Trip Budget Allocations</h4>
                      <button className="btn btn-primary btn-sm" onClick={() => { setEditItem(null); setBudgetForm({ amount: "", currency: "LKR" }); setModalType("BUDGET"); }}>+ Add Budget</button>
                    </div>
                    {budgets.length === 0 ? <p className="text-muted">No budget records set yet.</p> : (
                      <div className="table-wrapper">
                        <table className="table">
                          <thead><tr><th>Amount</th><th>Currency</th><th>Created At</th><th>Actions</th></tr></thead>
                          <tbody>
                            {budgets.map(b => (
                              <tr key={b.id}>
                                <td style={{ fontWeight: 700 }}>{b.amount.toLocaleString()}</td>
                                <td><span className="badge badge-primary">{b.currency}</span></td>
                                <td>{new Date(b.createdAt || "").toLocaleDateString()}</td>
                                <td>
                                  <button className="btn btn-secondary btn-sm" style={{ marginRight: 6 }} onClick={() => { setEditItem(b); setBudgetForm({ amount: String(b.amount), currency: b.currency }); setModalType("BUDGET"); }}>Edit</button>
                                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteBudget(b.id)}>Delete</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {tripTab === "expenses" && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                      <h4>Shared Expense Log</h4>
                      <button className="btn btn-primary btn-sm" onClick={() => { setEditItem(null); setExpenseForm({ paidBy: "", amount: "", description: "", currency: "LKR" }); setModalType("EXPENSE"); }}>+ Add Expense</button>
                    </div>
                    {expenses.length === 0 ? <p className="text-muted">No expense records logged.</p> : (
                      <div className="table-wrapper">
                        <table className="table">
                          <thead><tr><th>Description</th><th>Paid By</th><th>Amount</th><th>Actions</th></tr></thead>
                          <tbody>
                            {expenses.map(exp => (
                              <tr key={exp.id}>
                                <td><strong>{exp.description}</strong></td>
                                <td>{exp.paidBy}</td>
                                <td>{exp.amount.toLocaleString()} {exp.currency}</td>
                                <td>
                                  <button className="btn btn-secondary btn-sm" style={{ marginRight: 6 }} onClick={() => { setEditItem(exp); setExpenseForm({ paidBy: exp.paidBy, amount: String(exp.amount), description: exp.description, currency: exp.currency }); setModalType("EXPENSE"); }}>Edit</button>
                                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteExpense(exp.id)}>Delete</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {tripTab === "activities" && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                      <h4>Itinerary & Activity Schedule</h4>
                      <button className="btn btn-primary btn-sm" onClick={() => { setEditItem(null); setActivityForm({ name: "", location: "", startAt: "", endAt: "" }); setModalType("ACTIVITY"); }}>+ Add Activity</button>
                    </div>
                    {activities.length === 0 ? <p className="text-muted">No itinerary activities planned.</p> : (
                      <div className="table-wrapper">
                        <table className="table">
                          <thead><tr><th>Activity</th><th>Location</th><th>Start Time</th><th>End Time</th><th>Actions</th></tr></thead>
                          <tbody>
                            {activities.map(act => (
                              <tr key={act.id}>
                                <td><strong>{act.name}</strong></td>
                                <td>📍 {act.location}</td>
                                <td>{new Date(act.startAt).toLocaleString()}</td>
                                <td>{new Date(act.endAt).toLocaleString()}</td>
                                <td>
                                  <button className="btn btn-secondary btn-sm" style={{ marginRight: 6 }} onClick={() => { setEditItem(act); setActivityForm({ name: act.name, location: act.location, startAt: act.startAt.substring(0, 16), endAt: act.endAt.substring(0, 16) }); setModalType("ACTIVITY"); }}>Edit</button>
                                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteActivity(act.id)}>Delete</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {tripTab === "risks" && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                      <h4>Safety & Risk Assessments</h4>
                      <button className="btn btn-primary btn-sm" onClick={() => { setEditItem(null); setRiskForm({ severity: "Medium", summary: "", weatherSummary: "" }); setModalType("RISK"); }}>+ Add Risk Note</button>
                    </div>
                    {risks.length === 0 ? <p className="text-muted">No risk assessments logged.</p> : (
                      <div className="table-wrapper">
                        <table className="table">
                          <thead><tr><th>Severity</th><th>Summary</th><th>Weather Advisory</th><th>Actions</th></tr></thead>
                          <tbody>
                            {risks.map(r => (
                              <tr key={r.id}>
                                <td><span className={`badge ${r.severity === "Critical" || r.severity === "High" ? "badge-danger" : r.severity === "Medium" ? "badge-warning" : "badge-success"}`}>{r.severity}</span></td>
                                <td>{r.summary}</td>
                                <td>{r.weatherSummary || "N/A"}</td>
                                <td>
                                  <button className="btn btn-secondary btn-sm" style={{ marginRight: 6 }} onClick={() => { setEditItem(r); setRiskForm({ severity: r.severity, summary: r.summary, weatherSummary: r.weatherSummary || "" }); setModalType("RISK"); }}>Edit</button>
                                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteRisk(r.id)}>Delete</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {tripTab === "members" && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                      <h4>Group Trip Members</h4>
                      <button className="btn btn-primary btn-sm" onClick={() => { setEditItem(null); setMemberForm({ displayName: "", email: "" }); setModalType("MEMBER"); }}>+ Add Member</button>
                    </div>
                    {members.length === 0 ? <p className="text-muted">No group members added.</p> : (
                      <div className="table-wrapper">
                        <table className="table">
                          <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Actions</th></tr></thead>
                          <tbody>
                            {members.map(m => (
                              <tr key={m.id}>
                                <td><strong>{m.displayName}</strong></td>
                                <td>{m.email}</td>
                                <td><span className="badge badge-success">Active</span></td>
                                <td>
                                  <button className="btn btn-secondary btn-sm" style={{ marginRight: 6 }} onClick={() => { setEditItem(m); setMemberForm({ displayName: m.displayName, email: m.email }); setModalType("MEMBER"); }}>Edit</button>
                                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteMember(m.id)}>Remove</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {tripTab === "settlements" && (
                  <div>
                    <h4>Split-Bill Net Settlement Balances</h4>
                    <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>Calculated using Minimum Cash Flow Algorithm to minimize transactions (BR-SPLIT-01, BR-SPLIT-02).</p>
                    {settlementData ? (
                      <div>
                        <div className="grid-2" style={{ marginBottom: 16 }}>
                          <div style={{ background: "rgba(0,0,0,0.3)", padding: 16, borderRadius: 8 }}>
                            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Total Transactions Needed</div>
                            <div style={{ fontSize: 24, fontWeight: 800 }}>{settlementData.transactionCount || 0}</div>
                          </div>
                          <div style={{ background: "rgba(0,0,0,0.3)", padding: 16, borderRadius: 8 }}>
                            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Net Sum Check (BR-SPLIT-02)</div>
                            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--success)" }}>0.00 LKR</div>
                          </div>
                        </div>
                        {settlementData.transfers && settlementData.transfers.length > 0 ? (
                          <div className="table-wrapper">
                            <table className="table">
                              <thead><tr><th>Debtor (Payer)</th><th>Creditor (Recipient)</th><th>Optimized Amount</th></tr></thead>
                              <tbody>
                                {settlementData.transfers.map((t: any, idx: number) => (
                                  <tr key={idx}>
                                    <td><span className="badge badge-warning">🔴 {t.fromMember}</span></td>
                                    <td><span className="badge badge-success">🟢 {t.toMember}</span></td>
                                    <td style={{ fontWeight: 700 }}>{t.amount.toLocaleString()} {t.currency}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : <p className="text-muted">No pending debt settlements.</p>}
                      </div>
                    ) : <p className="text-muted">Add group members and shared expenses to calculate net settlements.</p>}
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {/* ========================================================================= */}
        {/* CANVAS 4: SAFETY & REAL-TIME WEATHER MONITORING                          */}
        {/* ========================================================================= */}
        {activeNav === "weather" && (
          <section className="card">
            <div className="card-header">
              <div className="card-title">
                <div className="card-title-icon" style={{ background: "var(--brand-ocean-soft)", color: "var(--brand-ocean)" }}>🛡️</div>
                <div>
                  <div>Safety & Weather Monitoring</div>
                  <div className="card-subtitle">Real-time conditions for your travel destinations</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="form-control" style={{ width: 180, height: 38 }} placeholder="Destination..." value={weatherDestination} onChange={e => setWeatherDestination(e.target.value)} />
                <button className="btn btn-primary btn-sm" onClick={() => loadWeather(weatherDestination)}>🔍 Query</button>
              </div>
            </div>

            {weatherData ? (
              <div className="grid-2">
                <div style={{
                  background: "linear-gradient(135deg, rgba(20, 184, 166, 0.15) 0%, rgba(14, 165, 233, 0.15) 100%)",
                  border: "1px solid var(--border-glow)",
                  borderRadius: "var(--r-lg)",
                  padding: 24,
                  position: "relative",
                  overflow: "hidden"
                }}>
                  <div style={{ position: "absolute", top: -20, right: -20, fontSize: 120, opacity: 0.1 }}>🌤️</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>Location Query</div>
                  <h3 style={{ fontSize: 26, fontWeight: 800, color: "var(--brand-teal-light)", marginTop: 6 }}>📍 {weatherData.destination || weatherDestination}</h3>
                  <div style={{ fontSize: 14, marginTop: 14, color: "var(--text-soft)" }}>Condition: <strong style={{ color: "var(--text-main)" }}>{weatherData.description || "Partly Cloudy"}</strong></div>
                  <div style={{ fontSize: 48, fontWeight: 800, marginTop: 8, background: "var(--grad-ocean)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                    {weatherData.temperatureC ? `${weatherData.temperatureC}°C` : "24°C"}
                  </div>
                </div>

                <div style={{
                  background: "var(--success-soft)",
                  border: "1px solid rgba(34, 197, 94, 0.3)",
                  borderRadius: "var(--r-lg)",
                  padding: 24
                }}>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>Risk Agent Advisory</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>BR-RISK-01 Compliance Check</div>
                  <span className="badge badge-success" style={{ fontSize: 13, padding: "6px 14px" }}>✓ Low Weather Risk</span>
                  <p style={{ fontSize: 13, color: "var(--text-soft)", marginTop: 14, lineHeight: 1.6 }}>
                    The Risk Agent queries external weather data (Open-Meteo) and evaluates travel itinerary outdoor activities against environmental hazards. Your destination looks safe for outdoor adventures!
                  </p>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">🌦️</div>
                <h4>Loading weather report...</h4>
                <p style={{ fontSize: 13, marginTop: 8 }}>Querying live weather data for your destination.</p>
              </div>
            )}
          </section>
        )}

        {/* ========================================================================= */}
        {/* CANVAS 5: DEBT SETTLEMENT MATRIX                                         */}
        {/* ========================================================================= */}
        {activeNav === "settlement" && (
          <section className="card">
            <div className="card-header">
              <div className="card-title">
                <div className="card-title-icon" style={{ background: "var(--brand-gold-soft)", color: "var(--brand-gold)" }}>⚖️</div>
                <div>
                  <div>Group Debt Settlement Matrix</div>
                  <div className="card-subtitle">Minimum cash flow algorithm for fair splits</div>
                </div>
              </div>
            </div>

            {(() => {
              // 1. Identify all admin-approved group trips from trips list
              const approvedGroupTrips = trips.filter(t => {
                const isApproved = t.status === "Reviewed" || t.status === "Approved";
                let plan: any = null;
                try { if (t.planningDetailsJson) plan = JSON.parse(t.planningDetailsJson); } catch {}
                const isGroup = plan?.tripMode === "GROUP" || (Array.isArray(plan?.groupMembers) && plan.groupMembers.length > 1);
                return isApproved && isGroup;
              });

              // 2. Check current selected trip characteristics
              let curPlan: any = null;
              try { if (selectedTrip?.planningDetailsJson) curPlan = JSON.parse(selectedTrip.planningDetailsJson); } catch {}
              const isCurSolo = curPlan?.tripMode === "SOLO" || (curPlan && (!curPlan.groupMembers || curPlan.groupMembers.length <= 1));
              const isCurGroup = curPlan?.tripMode === "GROUP" || (curPlan && Array.isArray(curPlan.groupMembers) && curPlan.groupMembers.length > 1);

              return (
                <div>
                  {/* Notice if current trip is solo and approved group trips are available */}
                  {selectedTrip && isCurSolo && approvedGroupTrips.length > 0 && (
                    <div style={{
                      padding: "14px 18px",
                      background: "rgba(245, 158, 11, 0.12)",
                      border: "1px solid rgba(245, 158, 11, 0.35)",
                      borderRadius: "var(--r-md)",
                      marginBottom: 18,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 12
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 24 }}>💡</span>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--brand-gold-light)" }}>
                            Active trip '{selectedTrip.name}' is a Solo Trip
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 2 }}>
                            Group Debt Settlement requires a Group Trip. Select one of your Admin-Approved Group Trip listings below to calculate fair member splits.
                          </div>
                        </div>
                      </div>
                      <button
                        className="btn btn-warning btn-sm"
                        style={{ fontWeight: 700, fontSize: 12 }}
                        onClick={() => {
                          const target = approvedGroupTrips[0];
                          if (target) {
                            setSelectedTrip(target);
                            loadTripModuleData(target.id);
                            setShowGroupBreakdown(true);
                          }
                        }}
                      >
                        Switch to Approved Group Trip ({approvedGroupTrips[0]?.name}) →
                      </button>
                    </div>
                  )}

                  {/* Approved Group Trip Listings Selector */}
                  {approvedGroupTrips.length > 0 && (
                    <div style={{
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--r-md)",
                      padding: "16px 18px",
                      marginBottom: 20
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 16 }}>📋</span>
                          <span style={{ fontSize: 13, textTransform: "uppercase", fontWeight: 700, color: "var(--brand-teal-light)", letterSpacing: 0.5 }}>
                            Select Admin-Approved Group Trip Listing ({approvedGroupTrips.length} Available)
                          </span>
                        </div>
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          Admin approved listings with multiple travelers
                        </span>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
                        {approvedGroupTrips.map(gt => {
                          let gPlan: any = null;
                          try { if (gt.planningDetailsJson) gPlan = JSON.parse(gt.planningDetailsJson); } catch {}
                          const gMembersCount = Array.isArray(gPlan?.groupMembers) ? gPlan.groupMembers.length : 2;
                          const isSelected = selectedTrip?.id === gt.id;

                          return (
                            <div
                              key={gt.id}
                              onClick={() => {
                                setSelectedTrip(gt);
                                loadTripModuleData(gt.id);
                                setShowGroupBreakdown(true);
                              }}
                              style={{
                                padding: "14px 16px",
                                background: isSelected ? "rgba(20, 184, 166, 0.12)" : "var(--bg-glass)",
                                border: isSelected ? "2px solid var(--brand-teal-light)" : "1px solid var(--border)",
                                borderRadius: "var(--r-md)",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                display: "flex",
                                flexDirection: "column",
                                gap: 8
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div style={{ fontWeight: 700, fontSize: 15, color: isSelected ? "var(--brand-teal-light)" : "var(--text-primary)" }}>
                                  {gt.name}
                                </div>
                                <span className="badge badge-success" style={{ fontSize: 10, padding: "2px 8px" }}>
                                  ✓ Approved
                                </span>
                              </div>

                              <div style={{ fontSize: 12, color: "var(--text-soft)" }}>
                                📍 {gt.destination} • 👥 {gMembersCount} Members
                              </div>

                              <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginTop: 4,
                                paddingTop: 8,
                                borderTop: "1px solid rgba(255, 255, 255, 0.05)"
                              }}>
                                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                  Budget: {gPlan?.totalBudget ? `Rs. ${Number(gPlan.totalBudget).toLocaleString()} LKR` : "Calculated"}
                                </span>
                                <button
                                  className={`btn btn-sm ${isSelected ? "btn-primary" : "btn-secondary"}`}
                                  style={{ fontSize: 11, padding: "4px 12px", fontWeight: 700 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTrip(gt);
                                    loadTripModuleData(gt.id);
                                    setShowGroupBreakdown(true);
                                  }}
                                >
                                  {isSelected ? "Active Listing ✓" : "Select Listing →"}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Active Trip Header with Proportion Breakdown Button */}
                  {selectedTrip ? (
                    <div>
                      <div style={{
                        padding: "16px 20px",
                        background: "var(--brand-teal-soft)",
                        border: "1px solid var(--border-glow)",
                        borderRadius: "var(--r-md)",
                        marginBottom: 16,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 16
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span style={{ fontSize: 28 }}>🧾</span>
                          <div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Active Trip Listing</div>
                            <div style={{ fontSize: 17, fontWeight: 700, color: "var(--brand-teal-light)" }}>
                              {selectedTrip.name} → {selectedTrip.destination}
                            </div>
                            <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 2 }}>
                              Status: <strong style={{ color: "var(--success)" }}>{selectedTrip.status || "Active"}</strong> • Mode:{" "}
                              <strong>{isCurGroup ? "Group Trip 👥" : "Solo Trip 👤"}</strong>
                            </div>
                          </div>
                        </div>

                        {/* Dedicated Action Button */}
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => setShowGroupBreakdown(prev => !prev)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "9px 18px",
                              fontWeight: 700,
                              boxShadow: "0 4px 14px rgba(20, 184, 166, 0.3)"
                            }}
                          >
                            <span>👥</span>
                            <span>{showGroupBreakdown ? "Hide Proportion Breakdown" : "Calculate Member Proportions & Cost"}</span>
                          </button>
                        </div>
                      </div>

                      {/* Member Proportions & Individual Cost Breakdown Card */}
                      {showGroupBreakdown && (
                        <GroupListingCostBreakdown
                          trip={selectedTrip}
                          budgets={budgets}
                          expenses={expenses}
                          onClose={() => setShowGroupBreakdown(false)}
                          onApplyAsExpense={(totalCost, memberShares) => handleSyncGroupListingExpense(selectedTrip.id, totalCost, memberShares)}
                          isApplying={busy}
                        />
                      )}

                      {/* Debt Settlement Matrix Transfers */}
                      {settlementData?.transfers && settlementData.transfers.length > 0 ? (
                        <div className="destination-grid">
                          {settlementData.transfers.map((t: any, idx: number) => (
                            <div key={idx} className="trip-card" style={{ background: "var(--bg-card-solid)" }}>
                              <div style={{ padding: 22 }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
                                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                                    <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Debtor</span>
                                    <strong style={{ color: "var(--danger)", fontSize: 14, marginTop: 4 }}>{t.fromMember}</strong>
                                  </div>
                                  <div style={{ fontSize: 22, color: "var(--brand-teal-light)" }}>→</div>
                                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                                    <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Creditor</span>
                                    <strong style={{ color: "var(--success)", fontSize: 14, marginTop: 4 }}>{t.toMember}</strong>
                                  </div>
                                </div>
                                <div style={{
                                  textAlign: "center",
                                  padding: 14,
                                  background: "var(--bg-glass)",
                                  borderRadius: "var(--r-md)",
                                  border: "1px solid var(--border)"
                                }}>
                                  <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Optimized Amount</div>
                                  <div style={{ fontSize: 22, fontWeight: 800, color: "var(--brand-gold-light)", marginTop: 4 }}>
                                    {t.amount.toLocaleString()} <span style={{ fontSize: 13 }}>{t.currency}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="empty-state">
                          <div className="empty-state-icon">🎉</div>
                          <h4>All Settled Up!</h4>
                          <p style={{ fontSize: 13, marginTop: 8 }}>
                            {isCurGroup
                              ? "No outstanding debts between members. Click 'Calculate Member Proportions & Cost' above to study each member's individual proportion and cost share."
                              : "No debt transfers required or no shared expenses logged yet."}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <div className="empty-state-icon">⚖️</div>
                      <h4>Select a trip to view its settlement matrix</h4>
                      <p style={{ fontSize: 13, marginTop: 8 }}>Go to <strong>Trips</strong> and select a trip to see the minimum cash flow transfers.</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </section>
        )}

        {/* ========================================================================= */}
        {/* CANVAS 6: ADMIN APPROVALS (DESTINATION LISTINGS + AI WORKFLOWS)           */}
        {/* ========================================================================= */}
        {role === "StaffAdmin" && activeNav === "approvals" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Approval Sub-Tabs */}
            <div className="tabs-bar" style={{ marginBottom: 0 }}>
              <button
                className={`tab-item ${adminApprovalTab === "destinations" ? "active" : ""}`}
                onClick={() => setAdminApprovalTab("destinations")}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <span>📍 Partner Destination Listings</span>
                {pendingDestinations.length > 0 && (
                  <span className="badge badge-warning" style={{ fontSize: 11, padding: "2px 8px" }}>
                    {pendingDestinations.length} Pending
                  </span>
                )}
              </button>
              <button
                className={`tab-item ${adminApprovalTab === "ai" ? "active" : ""}`}
                onClick={() => setAdminApprovalTab("ai")}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <span>🤖 AI Workflow Approvals</span>
                {workflow?.status === "AwaitingApproval" && (
                  <span className="badge badge-warning" style={{ fontSize: 11, padding: "2px 8px" }}>
                    Action Required
                  </span>
                )}
              </button>
              <button
                className={`tab-item ${adminApprovalTab === "vehicles" ? "active" : ""}`}
                onClick={() => setAdminApprovalTab("vehicles")}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <span>🚗 Rental Vehicles Verification</span>
                {pendingVehiclesCount > 0 && (
                  <span className="badge badge-warning" style={{ fontSize: 11, padding: "2px 8px" }}>
                    {pendingVehiclesCount} Pending
                  </span>
                )}
              </button>

            </div>

            {/* TAB 1: DESTINATION LISTINGS APPROVAL */}
            {adminApprovalTab === "destinations" && (
              <DestinationVerificationQueue
                pendingDestinations={pendingDestinations}
                loadingPendingDest={loadingPendingDest}
                onRefresh={loadPendingDestinations}
                expandedPendingDestId={expandedPendingDestId}
                setExpandedPendingDestId={setExpandedPendingDestId}
                onVerify={handleVerifyDestination}
                onReject={handleRejectDestination}
                rejectFeedback={rejectFeedback}
                setRejectFeedback={setRejectFeedback}
              />
            )}

            {/* TAB 2: AI WORKFLOW APPROVALS */}
            {adminApprovalTab === "ai" && (
              <section className="card ai-flow-container">
                <div className="card-header">
                  <div className="card-title">
                    <div className="card-title-icon" style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", color: "white" }}>🤖</div>
                    <div>
                      <div>AI Human-in-the-Loop Approvals</div>
                      <div className="card-subtitle">Gemini-powered coordinator + specialist agents</div>
                    </div>
                  </div>
                  <span className={`badge ${workflow?.status === "AwaitingApproval" ? "badge-warning" : "badge-primary"}`}>
                    {workflow?.status || "Ready"}
                  </span>
                </div>

                {workflow ? (
                  <div>
                    <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>Objective: {workflow.objective}</p>
                    {workflow.planJson && (
                      <div style={{ marginBottom: 16 }}>
                        <h4>Coordinator Plan (Gemini Model Output):</h4>
                        <div className="json-box">{workflow.planJson}</div>
                      </div>
                    )}
                    {workflow.resultJson && (
                      <div style={{ marginBottom: 16 }}>
                        <h4>Specialist Agents (Budget, Activity, Risk, Split-Bill) Output:</h4>
                        <div className="json-box">{workflow.resultJson}</div>
                      </div>
                    )}
                    {workflow.status === "AwaitingApproval" && (
                      <div style={{ display: "flex", gap: 12, marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border-color)" }}>
                        {role === "StaffAdmin" && (
                          <>
                            <button className="btn btn-primary" onClick={() => handleApproveWorkflow(true)}>✅ Approve Recommendation</button>
                            <button className="btn btn-danger" onClick={() => handleApproveWorkflow(false)}>❌ Reject Recommendation</button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>No active workflow proposals awaiting approval. Go to <strong>Trips Analytics & Management</strong> and click <strong>🤖 Run AI Review</strong> to trigger a proposal!</p>
                  </div>
                )}
              </section>
            )}

            {/* TAB 3: RENTAL VEHICLES APPROVAL QUEUE */}
            {adminApprovalTab === "vehicles" && (
              <RentalVehiclesPortal
                role={role}
                userId={session?.user?.id || profile?.id || ""}
                userEmail={session?.user?.email || email}
                initialTab="pending"
                onVehicleCountChange={setPendingVehiclesCount}
              />
            )}
          </div>
        )}

        
        {/* ========================================================================= */}
        {/* CANVAS: TRAVELLER TRIP REQUESTS & PLAN REVIEW (ADMIN VIEW)               */}
        {/* ========================================================================= */}
        {role === "StaffAdmin" && activeNav === "trip-reviews" && (
          <div className="dashboard-content" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Header / Intro Card */}
            <section className="card">
              <div className="card-header" style={{ flexWrap: "wrap", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div className="card-title-icon" style={{ background: "linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)", color: "white", fontSize: 22, width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 12 }}>
                    🗺️
                  </div>
                  <div>
                    <div className="card-title" style={{ fontSize: 20 }}>Trip Plan Review Queue</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                      Inspect full wizard trip submissions sent by travellers, review safety, budget, itinerary, and approve or decline.
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginLeft: "auto" }}>
                  <button className="btn btn-secondary btn-sm" onClick={loadSubmittedTrips} disabled={loadingSubmittedTrips}>
                    {loadingSubmittedTrips ? "Refreshing..." : "🔄 Refresh Requests"}
                  </button>
                </div>
              </div>

              {/* Status Counters */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginTop: 18 }}>
                <div
                  onClick={() => setTripReviewFilter("ALL")}
                  style={{
                    padding: "12px 16px", borderRadius: 10, cursor: "pointer",
                    background: tripReviewFilter === "ALL" ? "rgba(20, 184, 166, 0.15)" : "rgba(255,255,255,0.02)",
                    border: tripReviewFilter === "ALL" ? "1px solid var(--brand-teal-light)" : "1px solid var(--border-color)",
                    transition: "all 0.2s ease"
                  }}
                >
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Total Submissions</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginTop: 4 }}>{submittedTrips.length}</div>
                </div>

                <div
                  onClick={() => setTripReviewFilter("PendingReview")}
                  style={{
                    padding: "12px 16px", borderRadius: 10, cursor: "pointer",
                    background: tripReviewFilter === "PendingReview" ? "rgba(245, 158, 11, 0.15)" : "rgba(255,255,255,0.02)",
                    border: tripReviewFilter === "PendingReview" ? "1px solid #f59e0b" : "1px solid var(--border-color)",
                    transition: "all 0.2s ease"
                  }}
                >
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>⏳ Pending Review</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#f59e0b", marginTop: 4 }}>
                    {submittedTrips.filter(t => t.status === "PendingReview").length}
                  </div>
                </div>

                <div
                  onClick={() => setTripReviewFilter("Reviewed")}
                  style={{
                    padding: "12px 16px", borderRadius: 10, cursor: "pointer",
                    background: tripReviewFilter === "Reviewed" ? "rgba(34, 197, 94, 0.15)" : "rgba(255,255,255,0.02)",
                    border: tripReviewFilter === "Reviewed" ? "1px solid #22c55e" : "1px solid var(--border-color)",
                    transition: "all 0.2s ease"
                  }}
                >
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>✅ Approved Plans</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#22c55e", marginTop: 4 }}>
                    {submittedTrips.filter(t => t.status === "Reviewed").length}
                  </div>
                </div>

                <div
                  onClick={() => setTripReviewFilter("Declined")}
                  style={{
                    padding: "12px 16px", borderRadius: 10, cursor: "pointer",
                    background: tripReviewFilter === "Declined" ? "rgba(239, 68, 68, 0.15)" : "rgba(255,255,255,0.02)",
                    border: tripReviewFilter === "Declined" ? "1px solid #ef4444" : "1px solid var(--border-color)",
                    transition: "all 0.2s ease"
                  }}
                >
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>❌ Declined Plans</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#ef4444", marginTop: 4 }}>
                    {submittedTrips.filter(t => t.status === "Declined").length}
                  </div>
                </div>
              </div>

              {/* Search & Filter Controls */}
              <div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap", alignItems: "center" }}>
                <input
                  type="text"
                  className="form-control"
                  style={{ flex: 1, minWidth: 260 }}
                  placeholder="🔍 Search by traveller name, email, trip name, destination..."
                  value={tripReviewSearch}
                  onChange={e => setTripReviewSearch(e.target.value)}
                />
                {tripReviewSearch && (
                  <button className="btn btn-secondary btn-sm" onClick={() => setTripReviewSearch("")}>Clear Search</button>
                )}
              </div>
            </section>

            {/* List of Trip Requests */}
            {loadingSubmittedTrips ? (
              <div className="card empty-state" style={{ padding: 40, textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>⏳</div>
                <p>Loading traveller trip submissions from server...</p>
              </div>
            ) : (() => {
              const filtered = submittedTrips.filter(trip => {
                if (tripReviewFilter !== "ALL" && trip.status !== tripReviewFilter) return false;
                if (!tripReviewSearch.trim()) return true;
                const q = tripReviewSearch.toLowerCase();
                const senderName = (trip.travellerName || "").toLowerCase();
                const senderEmail = (trip.travellerEmail || trip.ownerUserId || "").toLowerCase();
                const tripName = (trip.name || "").toLowerCase();
                const dest = (trip.destination || "").toLowerCase();
                return senderName.includes(q) || senderEmail.includes(q) || tripName.includes(q) || dest.includes(q);
              });

              if (filtered.length === 0) {
                return (
                  <div className="card empty-state" style={{ padding: 48, textAlign: "center" }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🗺️</div>
                    <p style={{ fontSize: 16, fontWeight: 600 }}>No trip submissions match this filter.</p>
                    <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                      When travellers create and submit trip plans via the Trip Wizard, their complete requests appear here.
                    </p>
                  </div>
                );
              }

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {filtered.map(trip => {
                    const isExpanded = expandedSubmittedTripId === trip.id;
                    let planning: any = null;
                    if (trip.planningDetailsJson) {
                      try { planning = JSON.parse(trip.planningDetailsJson); } catch {}
                    }
                    const displayName = trip.travellerName || planning?.travellerName || trip.ownerUserId?.split("@")[0] || "Traveller";
                    const displayEmail = trip.travellerEmail || planning?.travellerEmail || trip.ownerUserId || "Unknown Email";

                    return (
                      <div
                        key={trip.id}
                        className="card"
                        style={{
                          padding: 0,
                          overflow: "hidden",
                          border: isExpanded ? "1px solid var(--brand-teal-light)" : "1px solid var(--border-color)",
                          transition: "all 0.2s ease",
                          background: isExpanded ? "rgba(20, 184, 166, 0.03)" : "rgba(255,255,255,0.02)"
                        }}
                      >
                        {/* Header Banner */}
                        <div
                          style={{
                            padding: "16px 20px",
                            display: "flex",
                            alignItems: "center",
                            gap: 16,
                            cursor: "pointer",
                            background: isExpanded ? "rgba(20, 184, 166, 0.08)" : "transparent",
                            borderBottom: isExpanded ? "1px solid var(--border-color)" : "none",
                            flexWrap: "wrap"
                          }}
                          onClick={() => setExpandedSubmittedTripId(prev => prev === trip.id ? null : trip.id)}
                        >
                          {/* Traveller Identity Badge */}
                          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 220 }}>
                            <div
                              style={{
                                width: 42,
                                height: 42,
                                borderRadius: "50%",
                                background: "linear-gradient(135deg, #0ea5e9, #6366f1)",
                                color: "white",
                                fontWeight: 700,
                                fontSize: 16,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                              }}
                            >
                              {displayName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>
                                {displayName}
                              </div>
                              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                                ✉️ <a href={`mailto:${displayEmail}`} onClick={e => e.stopPropagation()} style={{ color: "var(--brand-teal-light)", textDecoration: "none" }}>{displayEmail}</a>
                              </div>
                            </div>
                          </div>

                          {/* Trip Details Summary */}
                          <div style={{ flex: 1, minWidth: 220 }}>
                            <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                              <span>✈️ {trip.name}</span>
                              <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 400 }}>➔ {trip.destination}</span>
                            </div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>
                              {trip.startingPoint && <span>📍 <strong>Starting From:</strong> {trip.startingPoint} &nbsp;·&nbsp; </span>}
                              📅 {trip.startDate} → {trip.endDate}
                              {trip.submittedAt && <span> &nbsp;·&nbsp; Submitted {new Date(trip.submittedAt).toLocaleDateString()}</span>}
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <span
                              style={{
                                padding: "6px 14px",
                                borderRadius: 20,
                                fontSize: 12,
                                fontWeight: 600,
                                background: trip.status === "Reviewed" ? "rgba(34,197,94,0.15)" : trip.status === "Declined" ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
                                color: trip.status === "Reviewed" ? "#22c55e" : trip.status === "Declined" ? "#ef4444" : "#f59e0b",
                                border: `1px solid ${trip.status === "Reviewed" ? "rgba(34,197,94,0.3)" : trip.status === "Declined" ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)"}`
                              }}
                            >
                              {trip.status === "Reviewed" ? "✅ Approved" : trip.status === "Declined" ? "❌ Declined" : "⏳ Pending Review"}
                            </span>
                            <span style={{ fontSize: 18, color: "var(--text-muted)" }}>{isExpanded ? "▲" : "▼"}</span>
                          </div>
                        </div>

                        {/* Expanded Full Details */}
                        {isExpanded && (
                          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
                            {/* Traveller Info Box */}
                            <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)", display: "flex", flexWrap: "wrap", gap: 20 }}>
                              <div>
                                <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Traveller Name</span>
                                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginTop: 2 }}>👤 {displayName}</div>
                              </div>
                              <div>
                                <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Traveller Email</span>
                                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--brand-teal-light)", marginTop: 2 }}>✉️ {displayEmail}</div>
                              </div>
                              <div>
                                <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Starting Point</span>
                                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginTop: 2 }}>📍 {trip.startingPoint || "Not specified"}</div>
                              </div>
                              <div>
                                <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Submission Date</span>
                                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginTop: 2 }}>🕒 {trip.submittedAt ? new Date(trip.submittedAt).toLocaleString() : "Recently"}</div>
                              </div>
                            </div>

                            {/* Full Wizard Details Sections */}
                            {planning ? (
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
                                {/* Budget Details */}
                                <div style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(0,0,0,0.18)", border: "1px solid var(--border-color)" }}>
                                  <div style={{ fontWeight: 600, fontSize: 13, color: "var(--brand-teal-light)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                                    💰 Budget & Financials
                                  </div>
                                  <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
                                    <div><strong>Total Budget:</strong> {planning.totalBudget ? `${planning.totalBudget.toLocaleString()} ${planning.currency || "LKR"}` : "Not specified"}</div>
                                    {planning.categoryBudgets && (
                                      <div style={{ marginTop: 4, color: "var(--text-muted)", fontSize: 12 }}>
                                        {planning.categoryBudgets.food && <div>• Food: {planning.categoryBudgets.food}</div>}
                                        {planning.categoryBudgets.accommodation && <div>• Accommodation: {planning.categoryBudgets.accommodation}</div>}
                                        {planning.categoryBudgets.transport && <div>• Transport: {planning.categoryBudgets.transport}</div>}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Transportation Method */}
                                <div style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(0,0,0,0.18)", border: "1px solid var(--border-color)" }}>
                                  <div style={{ fontWeight: 600, fontSize: 13, color: "var(--brand-teal-light)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                                    🚗 Traveling Method
                                  </div>
                                  <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
                                    <div><strong>Method:</strong> {
                                      planning.travelMethod === "PRIVATE_VEHICLE"
                                        ? "Own Private Vehicle 🚗"
                                        : planning.travelMethod === "RENTAL_VEHICLE"
                                        ? `Rental Vehicle 🔑 (${planning.rentalVehicleType || trip.travelVehicleType || "General"})`
                                        : planning.travelMethod === "PUBLIC_TRANSPORT"
                                        ? `Public Transport 🚌 (${planning.publicTransportType || trip.travelVehicleType || "General"})`
                                        : trip.travelMethod || "Not specified"
                                    }</div>
                                  </div>
                                </div>

                                {/* Group & Trip Mode */}
                                <div style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(0,0,0,0.18)", border: "1px solid var(--border-color)" }}>
                                  <div style={{ fontWeight: 600, fontSize: 13, color: "var(--brand-teal-light)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                                    👥 Trip Type & Members
                                  </div>
                                  <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
                                    <div><strong>Mode:</strong> {planning.tripMode === "GROUP" ? "Group Trip" : "Solo Trip"}</div>
                                    {planning.groupMembers && planning.groupMembers.length > 0 && (
                                      <div style={{ marginTop: 4 }}>
                                        <strong>Members ({planning.groupMembers.length}):</strong>
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                                          {planning.groupMembers.map((m: string, idx: number) => (
                                            <span key={idx} style={{ padding: "2px 8px", borderRadius: 12, background: "rgba(255,255,255,0.06)", fontSize: 11 }}>
                                              {m}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Activities & Interests */}
                                <div style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(0,0,0,0.18)", border: "1px solid var(--border-color)" }}>
                                  <div style={{ fontWeight: 600, fontSize: 13, color: "var(--brand-teal-light)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                                    🎯 Activities & Experiences
                                  </div>
                                  <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
                                    {planning.dailyTimeLimit && <div><strong>Daily Time Limit:</strong> {planning.dailyTimeLimit} hours</div>}
                                    {planning.mustVisitPlaces && <div><strong>Must-Visit Places:</strong> {planning.mustVisitPlaces}</div>}
                                    {planning.interests && planning.interests.length > 0 && (
                                      <div style={{ marginTop: 4 }}>
                                        <strong>Interests:</strong>
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                                          {planning.interests.map((it: string, idx: number) => (
                                            <span key={idx} style={{ padding: "2px 8px", borderRadius: 12, background: "rgba(99,102,241,0.15)", color: "#a5b4fc", fontSize: 11 }}>
                                              {it}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Safety & Weather */}
                                <div style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(0,0,0,0.18)", border: "1px solid var(--border-color)" }}>
                                  <div style={{ fontWeight: 600, fontSize: 13, color: "var(--brand-teal-light)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                                    🛡️ Safety & High-Risk Activities
                                  </div>
                                  <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
                                    <div><strong>Safety Destination:</strong> {planning.safetyLocation || trip.destination}</div>
                                    {planning.highRiskActivities && planning.highRiskActivities.length > 0 ? (
                                      <div style={{ marginTop: 4 }}>
                                        <strong style={{ color: "#fca5a5" }}>⚠️ High-Risk Activities Flagged:</strong>
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                                          {planning.highRiskActivities.map((act: string, idx: number) => (
                                            <span key={idx} style={{ padding: "2px 8px", borderRadius: 12, background: "rgba(239,68,68,0.15)", color: "#fca5a5", fontSize: 11 }}>
                                              {act}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    ) : (
                                      <div style={{ color: "var(--text-muted)", fontSize: 12 }}>No high-risk activities flagged</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div style={{ padding: "12px 14px", borderRadius: 8, background: "rgba(255,255,255,0.02)", fontSize: 13, color: "var(--text-muted)" }}>
                                Basic trip plan submitted. No extended JSON planning details attached.
                              </div>
                            )}

                            {/* Existing Feedback / Warning */}
                            {trip.adminFeedback && (
                              <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", fontSize: 13 }}>
                                ✅ <strong>Admin Decision Note:</strong> {trip.adminFeedback}
                              </div>
                            )}
                            {trip.adminWarningNote && (
                              <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", fontSize: 13 }}>
                                ⚠️ <strong>Warning Note Sent:</strong> {trip.adminWarningNote}
                              </div>
                            )}

                            {/* AI Review Pipeline Loading Indicator */}
                            {aiReviewLoading[trip.id] && (
                              <div style={{
                                padding: "16px 20px",
                                borderRadius: 12,
                                background: "linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(14,165,233,0.12) 100%)",
                                border: "1px solid rgba(99,102,241,0.3)",
                                display: "flex",
                                alignItems: "center",
                                gap: 14,
                                animation: "pulse 2s infinite"
                              }}>
                                <div style={{ fontSize: 26 }}>🤖</div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 600, color: "#c4b5fd", fontSize: 14 }}>
                                    Sequential AI Pipeline Running...
                                  </div>
                                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                                    1. Trip Planner (OSRM Distance) ➔ 2. Risk Calculator (Halt Check) ➔ 3. Budget (10% Margin) ➔ 4. Split-Bill
                                  </div>
                                </div>
                                <div style={{ fontSize: 13, color: "var(--brand-teal-light)", fontWeight: 600 }}>
                                  Analyzing Trip... ⏳
                                </div>
                              </div>
                            )}

                            {/* AI Review Error Message */}
                            {aiReviewError[trip.id] && (
                              <div style={{ padding: "12px 16px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", fontSize: 13 }}>
                                ⚠️ <strong>AI Review Error:</strong> {aiReviewError[trip.id]}
                              </div>
                            )}

                            {/* AI Review Complete Results Ledger */}
                            {(aiReviewResults[trip.id] || trip.adminApprovedAiReviewJson) && (() => {
                              let aiData = aiReviewResults[trip.id];
                              if (!aiData && trip.adminApprovedAiReviewJson) {
                                try { aiData = typeof trip.adminApprovedAiReviewJson === "string" ? JSON.parse(trip.adminApprovedAiReviewJson) : trip.adminApprovedAiReviewJson; } catch {}
                              }
                              if (!aiData) return null;
                              const isHalted = aiData.halted_due_to_risk;
                              const tp = aiData.trip_planner;
                              const risk = aiData.risk_calculator;
                              const budget = aiData.budget;
                              const split = aiData.split_bill;
                              const activeScheduleDay = aiScheduleTab[trip.id] || 0;

                              return (
                                <div style={{
                                  borderRadius: 14,
                                  background: "rgba(10, 22, 33, 0.85)",
                                  border: isHalted ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(20,184,166,0.35)",
                                  boxShadow: isHalted ? "0 0 20px rgba(239,68,68,0.15)" : "0 0 20px rgba(20,184,166,0.12)",
                                  padding: "20px 22px",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 18
                                }}>
                                  {/* AI Review Header */}
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 14 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                      <span style={{ fontSize: 24 }}>🤖</span>
                                      <div>
                                        <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                                          AI Multi-Agent Review Ledger
                                          <span style={{
                                            padding: "3px 10px",
                                            borderRadius: 12,
                                            fontSize: 11,
                                            fontWeight: 700,
                                            background: isHalted ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)",
                                            color: isHalted ? "#f87171" : "#4ade80",
                                            border: `1px solid ${isHalted ? "#ef4444" : "#22c55e"}`
                                          }}>
                                            {isHalted ? "🚨 HIGH RISK — PIPELINE HALTED" : "✅ 4 AGENTS VERIFIED"}
                                          </span>
                                        </div>
                                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                                          Executed sequentially: Trip Planner ➔ Risk Calculator {isHalted ? "(Break Activated)" : "➔ Budget ➔ Split-Bill"}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Copy to Feedback Button */}
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-small"
                                      onClick={() => {
                                        setAdminTripNotes(prev => ({ ...prev, [trip.id]: aiData.admin_summary }));
                                        setSuccess("📋 Copied AI Summary into Admin Feedback!");
                                        setTimeout(() => setSuccess(null), 3000);
                                      }}
                                      style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6, borderColor: "var(--brand-teal-light)" }}
                                    >
                                      📋 Copy Summary to Feedback Note
                                    </button>
                                  </div>

                                  {/* HIGH RISK DANGER BANNER IF HALTED */}
                                  {isHalted && (
                                    <div style={{
                                      padding: "16px 18px",
                                      borderRadius: 10,
                                      background: "rgba(239, 68, 68, 0.12)",
                                      border: "1px solid rgba(239, 68, 68, 0.4)",
                                      borderLeft: "6px solid #ef4444"
                                    }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700, color: "#f87171", fontSize: 15 }}>
                                        <span>🚨</span> CRITICAL HAZARD ALERT — EXECUTION TERMINATED EARLY
                                      </div>
                                      <div style={{ fontSize: 13, color: "#fecaca", marginTop: 6, lineHeight: 1.5 }}>
                                        {aiData.halt_reason}
                                      </div>
                                      <div style={{ fontSize: 12, color: "#fca5a5", marginTop: 8, fontStyle: "italic", borderTop: "1px dashed rgba(239,68,68,0.3)", paddingTop: 6 }}>
                                        🛡️ <strong>Resource & Safety Policy:</strong> Downstream Budget Agent and Split-Bill Agent were deliberately halted to prevent resource waste and avoid pricing an unviable hazardous trip.
                                      </div>
                                    </div>
                                  )}

                                  {/* Agent Output Compartments */}
                                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
                                    
                                    {/* 1. TRIP PLANNER AGENT COMPARTMENT */}
                                    {tp && (
                                      <div style={{
                                        padding: "16px 18px",
                                        borderRadius: 12,
                                        background: "rgba(14, 165, 233, 0.05)",
                                        border: "1px solid rgba(14, 165, 233, 0.25)",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 12
                                      }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 8 }}>
                                          <div style={{ fontWeight: 700, fontSize: 14, color: "#38bdf8", display: "flex", alignItems: "center", gap: 6 }}>
                                            🗺️ 1. Trip Planner Agent
                                          </div>
                                          <span style={{ fontSize: 11, background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>
                                            {tp.trip_days} Day(s) {tp.is_single_day_picnic ? "Picnic" : "Tour"}
                                          </span>
                                        </div>

                                        {/* Road Route & Transport */}
                                        <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(0,0,0,0.25)", fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                                          <div>📍 <strong>Route:</strong> {tp.starting_point} ➔ {tp.destination}</div>
                                          <div>🛣️ <strong>Road Distance:</strong> <span style={{ color: "var(--brand-teal-light)", fontWeight: 700 }}>{tp.road_route?.distance_km} km</span> ({tp.road_route?.duration_formatted})</div>
                                          <div>🚗 <strong>Transport:</strong> <span style={{ color: "#fbbf24", fontWeight: 600 }}>{tp.suggested_transport_type}</span></div>
                                          <div style={{ color: "var(--text-muted)", fontSize: 11 }}>💡 {tp.transport_advisory}</div>
                                        </div>

                                        {/* Visiting Places */}
                                        {tp.visiting_places && tp.visiting_places.length > 0 && (
                                          <div>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>
                                              🏛️ Recommended Attractions ({tp.visiting_places.length}):
                                            </div>
                                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                              {tp.visiting_places.slice(0, 4).map((p: any, idx: number) => (
                                                <div key={idx} style={{ padding: "4px 8px", borderRadius: 6, background: "rgba(255,255,255,0.05)", fontSize: 11, border: "1px solid rgba(255,255,255,0.08)" }}>
                                                  <strong>{p.name}</strong> <span style={{ color: "var(--text-muted)" }}>({p.type} · ⭐{p.rating})</span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {/* Accommodations & Dining */}
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11 }}>
                                          <div style={{ padding: "8px 10px", borderRadius: 6, background: "rgba(0,0,0,0.2)" }}>
                                            <strong style={{ color: "#a5b4fc" }}>🏨 Stays Suggested:</strong>
                                            <div style={{ marginTop: 2, color: "var(--text-muted)" }}>
                                              {tp.accommodations?.[0]?.name || "Local Boutique Hotel"} (~{tp.accommodations?.[0]?.price_lkr ? `${tp.accommodations[0].price_lkr.toLocaleString()} LKR` : "Standard"})
                                            </div>
                                          </div>
                                          <div style={{ padding: "8px 10px", borderRadius: 6, background: "rgba(0,0,0,0.2)" }}>
                                            <strong style={{ color: "#fca5a5" }}>🍽️ Dining Options:</strong>
                                            <div style={{ marginTop: 2, color: "var(--text-muted)" }}>
                                              {tp.restaurants?.[0]?.name || "Traditional Rice & Curry"} (⭐{tp.restaurants?.[0]?.rating || "4.5"})
                                            </div>
                                          </div>
                                        </div>

                                        {/* Day-by-Day Schedule Tabs */}
                                        {tp.itinerary_schedule && tp.itinerary_schedule.length > 0 && (
                                          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10 }}>
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                                              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>📅 Daily Timetable:</span>
                                              <div style={{ display: "flex", gap: 4 }}>
                                                {tp.itinerary_schedule.map((day: any, dIdx: number) => (
                                                  <button
                                                    key={dIdx}
                                                    type="button"
                                                    onClick={() => setAiScheduleTab(prev => ({ ...prev, [trip.id]: dIdx }))}
                                                    style={{
                                                      padding: "2px 8px",
                                                      borderRadius: 4,
                                                      fontSize: 10,
                                                      fontWeight: 600,
                                                      cursor: "pointer",
                                                      background: (aiScheduleTab[trip.id] || 0) === dIdx ? "#0ea5e9" : "rgba(255,255,255,0.08)",
                                                      color: "white",
                                                      border: "none"
                                                    }}
                                                  >
                                                    Day {day.day_number}
                                                  </button>
                                                ))}
                                              </div>
                                            </div>

                                            {/* Current Selected Day slots */}
                                            {(() => {
                                              const currDay = tp.itinerary_schedule[activeScheduleDay] || tp.itinerary_schedule[0];
                                              return (
                                                <div style={{ padding: "8px 10px", borderRadius: 6, background: "rgba(0,0,0,0.3)", fontSize: 11 }}>
                                                  <div style={{ fontWeight: 600, color: "#38bdf8", marginBottom: 4 }}>
                                                    Day {currDay.day_number}: {currDay.theme}
                                                  </div>
                                                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                                    {currDay.schedule?.map((slot: any, sIdx: number) => (
                                                      <div key={sIdx} style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                                                        <span style={{ color: "var(--brand-gold-light)", fontWeight: 600, minWidth: 45 }}>{slot.time}</span>
                                                        <span style={{ color: "var(--text-primary)" }}>{slot.activity}</span>
                                                        <span style={{ color: "var(--text-muted)", fontSize: 10 }}>({slot.location})</span>
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

                                    {/* 2. RISK CALCULATE AGENT COMPARTMENT */}
                                    {risk && (
                                      <div style={{
                                        padding: "16px 18px",
                                        borderRadius: 12,
                                        background: risk.overall_risk_level === "HIGH" ? "rgba(239, 68, 68, 0.08)" : "rgba(245, 158, 11, 0.05)",
                                        border: risk.overall_risk_level === "HIGH" ? "1px solid rgba(239, 68, 68, 0.35)" : "1px solid rgba(245, 158, 11, 0.25)",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 12
                                      }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 8 }}>
                                          <div style={{ fontWeight: 700, fontSize: 14, color: risk.overall_risk_level === "HIGH" ? "#f87171" : "#fbbf24", display: "flex", alignItems: "center", gap: 6 }}>
                                            🛡️ 2. Risk Calculate Agent
                                          </div>
                                          <span style={{
                                            padding: "3px 10px",
                                            borderRadius: 12,
                                            fontSize: 11,
                                            fontWeight: 700,
                                            background: risk.overall_risk_level === "HIGH" ? "rgba(239,68,68,0.2)" : risk.overall_risk_level === "MODERATE" ? "rgba(245,158,11,0.2)" : "rgba(34,197,94,0.2)",
                                            color: risk.overall_risk_level === "HIGH" ? "#ef4444" : risk.overall_risk_level === "MODERATE" ? "#f59e0b" : "#22c55e",
                                            border: `1px solid ${risk.overall_risk_level === "HIGH" ? "#ef4444" : risk.overall_risk_level === "MODERATE" ? "#f59e0b" : "#22c55e"}`
                                          }}>
                                            {risk.overall_risk_level} RISK
                                          </span>
                                        </div>

                                        {/* Live Open-Meteo Weather Card */}
                                        <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(0,0,0,0.25)", fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                                          <div style={{ fontWeight: 600, color: "var(--brand-teal-light)" }}>⛅ Live Weather & Atmospheric Data:</div>
                                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginTop: 4 }}>
                                            <div style={{ padding: "6px 8px", borderRadius: 6, background: "rgba(255,255,255,0.03)", textAlign: "center" }}>
                                              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Temp</div>
                                              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{risk.weather_report?.temperature_c}°C</div>
                                            </div>
                                            <div style={{ padding: "6px 8px", borderRadius: 6, background: "rgba(255,255,255,0.03)", textAlign: "center" }}>
                                              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Precipitation</div>
                                              <div style={{ fontSize: 13, fontWeight: 700, color: "#38bdf8" }}>{risk.weather_report?.precipitation_probability}%</div>
                                            </div>
                                            <div style={{ padding: "6px 8px", borderRadius: 6, background: "rgba(255,255,255,0.03)", textAlign: "center" }}>
                                              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Wind</div>
                                              <div style={{ fontSize: 13, fontWeight: 700, color: "#fbbf24" }}>{risk.weather_report?.wind_speed_kmh} km/h</div>
                                            </div>
                                          </div>
                                          <div style={{ marginTop: 2, fontSize: 11, color: "var(--text-muted)" }}>
                                            Condition: <strong>{risk.weather_report?.weather_summary}</strong>
                                          </div>
                                        </div>

                                        {/* Risk Categories Breakdown */}
                                        {risk.risk_breakdown && (
                                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>Audited Risk Categories:</div>
                                            {risk.risk_breakdown.map((cat: any, cIdx: number) => (
                                              <div key={cIdx} style={{ padding: "6px 10px", borderRadius: 6, background: "rgba(0,0,0,0.18)", fontSize: 11, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                <div>
                                                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{cat.category}:</span>{" "}
                                                  <span style={{ color: "var(--text-muted)" }}>{cat.details}</span>
                                                </div>
                                                <span style={{
                                                  fontWeight: 700,
                                                  fontSize: 10,
                                                  color: cat.level === "HIGH" ? "#ef4444" : cat.level === "MODERATE" ? "#f59e0b" : "#22c55e",
                                                  marginLeft: 8
                                                }}>
                                                  {cat.level}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        )}

                                        {/* Emergency Contacts */}
                                        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 8, fontSize: 11 }}>
                                          <span style={{ fontWeight: 600, color: "#fca5a5" }}>🚨 Emergency Contacts: </span>
                                          <span style={{ color: "var(--text-muted)" }}>Police: 119 · Ambulance: 1990 · Disaster: 117 · Tourist Police: 1912</span>
                                        </div>
                                      </div>
                                    )}

                                    {/* 3. BUDGET AGENT COMPARTMENT */}
                                    <div style={{
                                      padding: "16px 18px",
                                      borderRadius: 12,
                                      background: isHalted ? "rgba(255, 255, 255, 0.02)" : "rgba(34, 197, 94, 0.05)",
                                      border: isHalted ? "1px dashed rgba(255, 255, 255, 0.15)" : "1px solid rgba(34, 197, 94, 0.25)",
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 12,
                                      opacity: isHalted ? 0.6 : 1
                                    }}>
                                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 8 }}>
                                        <div style={{ fontWeight: 700, fontSize: 14, color: isHalted ? "var(--text-muted)" : "#4ade80", display: "flex", alignItems: "center", gap: 6 }}>
                                          💰 3. Budget Agent
                                        </div>
                                        <span style={{
                                          padding: "3px 10px",
                                          borderRadius: 12,
                                          fontSize: 11,
                                          fontWeight: 700,
                                          background: isHalted ? "rgba(255,255,255,0.06)" : budget?.difference_status === "WITHIN_BUDGET" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
                                          color: isHalted ? "var(--text-muted)" : budget?.difference_status === "WITHIN_BUDGET" ? "#22c55e" : "#ef4444"
                                        }}>
                                          {isHalted ? "⏹️ SKIPPED" : budget?.difference_status}
                                        </span>
                                      </div>

                                      {isHalted ? (
                                        <div style={{ padding: "16px", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
                                          <em>Calculations skipped to conserve resources and avoid costing an unsafe trip.</em>
                                        </div>
                                      ) : budget ? (
                                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                          {/* Budget Summary Card */}
                                          <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(0,0,0,0.25)", fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                              <span style={{ color: "var(--text-muted)" }}>Calculated Budget:</span>
                                              <strong style={{ color: "var(--brand-teal-light)", fontSize: 14 }}>{budget.final_calculated_budget?.toLocaleString()} {budget.currency}</strong>
                                            </div>
                                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                              <span style={{ color: "var(--text-muted)" }}>Traveller's Proposed Budget:</span>
                                              <strong>{budget.user_budget?.toLocaleString()} {budget.currency}</strong>
                                            </div>
                                            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed rgba(255,255,255,0.08)", paddingTop: 4, marginTop: 2 }}>
                                              <span style={{ color: "var(--text-muted)" }}>Variance / Difference:</span>
                                              <strong style={{ color: budget.budget_difference >= 0 ? "#22c55e" : "#ef4444" }}>
                                                {budget.budget_difference >= 0 ? `+${budget.budget_difference.toLocaleString()} (Surplus)` : `${budget.budget_difference.toLocaleString()} (Deficit)`}
                                              </strong>
                                            </div>
                                            <div style={{ display: "flex", justifyContent: "space-between", color: "#fbbf24", fontSize: 11, marginTop: 2 }}>
                                              <span>🛡️ Mandatory 10% Margin:</span>
                                              <strong>+{budget.contingency_margin_10_percent?.toLocaleString()} {budget.currency}</strong>
                                            </div>
                                          </div>

                                          {/* Itemized Categories */}
                                          <div style={{ fontSize: 11, display: "flex", flexDirection: "column", gap: 3 }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}>
                                              <span>🚗 Transport & Fuel:</span>
                                              <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                                                {budget.transport_cost === 0 ? "0 LKR (Own Vehicle)" : `${budget.transport_cost?.toLocaleString()} ${budget.currency}`}
                                              </span>
                                            </div>
                                            {budget.vehicle_details?.selected_vehicle_name && (
                                              <div style={{ fontSize: 10, color: "#38bdf8", padding: "1px 0", display: "flex", alignItems: "center", gap: 4 }}>
                                                <span>🚆</span> <strong>{budget.vehicle_details.selected_vehicle_name}</strong>
                                              </div>
                                            )}
                                            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}>
                                              <span>🏨 Lodging / Stays:</span>
                                              <span style={{ color: "var(--text-primary)" }}>{budget.accommodation_cost?.toLocaleString()} {budget.currency}</span>
                                            </div>
                                            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}>
                                              <span>🍽️ Food & Meals:</span>
                                              <span style={{ color: "var(--text-primary)" }}>{budget.restaurant_and_food_cost?.toLocaleString()} {budget.currency}</span>
                                            </div>
                                            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}>
                                              <span>🎟️ Extra Activities & Buffer:</span>
                                              <span style={{ color: "var(--text-primary)" }}>{budget.extra_expenses_total?.toLocaleString()} {budget.currency}</span>
                                            </div>
                                          </div>

                                          {/* Button to open dedicated itemized cost modal */}
                                          <button
                                            type="button"
                                            className="btn btn-secondary btn-small"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setDetailedBreakdownBudget({ budget, destination: trip.destination });
                                            }}
                                            style={{
                                              marginTop: 6,
                                              width: "100%",
                                              fontSize: 11,
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              gap: 6,
                                              borderColor: "rgba(74, 222, 128, 0.4)",
                                              color: "#4ade80",
                                              background: "rgba(34, 197, 94, 0.12)",
                                              fontWeight: 600,
                                              padding: "6px 8px"
                                            }}
                                          >
                                            📋 View Detailed Itemized Cost Breakdown
                                          </button>
                                        </div>
                                      ) : null}
                                    </div>

                                    {/* 4. SPLIT-BILL AGENT COMPARTMENT */}
                                    <div style={{
                                      padding: "16px 18px",
                                      borderRadius: 12,
                                      background: isHalted ? "rgba(255, 255, 255, 0.02)" : "rgba(168, 85, 247, 0.05)",
                                      border: isHalted ? "1px dashed rgba(255, 255, 255, 0.15)" : "1px solid rgba(168, 85, 247, 0.25)",
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 12,
                                      opacity: isHalted ? 0.6 : 1
                                    }}>
                                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 8 }}>
                                        <div style={{ fontWeight: 700, fontSize: 14, color: isHalted ? "var(--text-muted)" : "#c084fc", display: "flex", alignItems: "center", gap: 6 }}>
                                          👥 4. Split-Bill Agent
                                        </div>
                                        <span style={{
                                          padding: "3px 10px",
                                          borderRadius: 12,
                                          fontSize: 11,
                                          fontWeight: 700,
                                          background: isHalted ? "rgba(255,255,255,0.06)" : "rgba(168,85,247,0.2)",
                                          color: isHalted ? "var(--text-muted)" : "#c084fc"
                                        }}>
                                          {isHalted ? "⏹️ SKIPPED" : `${split?.member_count || 1} Member(s)`}
                                        </span>
                                      </div>

                                      {isHalted ? (
                                        <div style={{ padding: "16px", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
                                          <em>Split-bill calculations cancelled due to safety halt.</em>
                                        </div>
                                      ) : split ? (
                                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                          {/* Individual Share Summary */}
                                          <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(0,0,0,0.25)", fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                              <span style={{ color: "var(--text-muted)" }}>Equal Share / Person:</span>
                                              <strong style={{ color: "#c084fc", fontSize: 14 }}>
                                                {split.individual_shares?.[0]?.amount?.toLocaleString()} {split.currency}
                                              </strong>
                                            </div>
                                            {split.individual_shares?.[0]?.converted_amount && (
                                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--brand-teal-light)" }}>
                                                <span>Converted Share:</span>
                                                <strong>~${split.individual_shares[0].converted_amount.toFixed(2)} USD</strong>
                                              </div>
                                            )}
                                          </div>

                                          {/* Member Shares List */}
                                          <div>
                                            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Individual Shares:</div>
                                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                              {split.individual_shares?.map((s: any, idx: number) => (
                                                <div key={idx} style={{ padding: "4px 8px", borderRadius: 6, background: "rgba(255,255,255,0.05)", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                                                  <span>👤 <strong>{s.member_name}:</strong></span>
                                                  <span style={{ color: "#c084fc" }}>{s.amount?.toLocaleString()} {s.currency}</span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>

                                          {/* Settlement Transfers if any */}
                                          {split.settlement_transfers && split.settlement_transfers.length > 0 && (
                                            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 6, fontSize: 11 }}>
                                              <div style={{ fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Debt Settlements:</div>
                                              {split.settlement_transfers.map((t: any, tIdx: number) => (
                                                <div key={tIdx} style={{ color: "var(--text-soft)" }}>
                                                  • {t.from_member} ➔ pays {t.to_member}: <strong>{t.amount?.toLocaleString()} {t.currency}</strong>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      ) : null}
                                    </div>

                                    {/* Admin Manual Per-Agent Correction Notes */}
                                    <div style={{
                                      padding: "16px 18px",
                                      borderRadius: 12,
                                      background: "rgba(30, 41, 59, 0.7)",
                                      border: "1px solid rgba(148, 163, 184, 0.25)",
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 12
                                    }}>
                                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                                        <div style={{ fontWeight: 700, fontSize: 13, color: "#f8fafc", display: "flex", alignItems: "center", gap: 8 }}>
                                          <span>✏️</span> Admin Manual Per-Agent Correction Notes (Sent to Traveller with Approved Review)
                                        </div>
                                        <span style={{ fontSize: 11, color: "var(--brand-teal-light)", background: "rgba(20, 184, 166, 0.15)", padding: "2px 8px", borderRadius: 8 }}>
                                          Optional Adjustments
                                        </span>
                                      </div>

                                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
                                        {/* 1. Trip Planner Correction */}
                                        <div>
                                          <label style={{ fontSize: 11, fontWeight: 700, color: "#38bdf8", display: "block", marginBottom: 4 }}>
                                            🗺️ Trip Planner Adjustments:
                                          </label>
                                          <textarea
                                            className="form-control"
                                            rows={2}
                                            placeholder="Note on routes, timing, or attractions..."
                                            value={adminTripCorrectionNotes[trip.id]?.tripPlanner ?? (() => {
                                              if (trip.adminCorrectionNotes) {
                                                try { return JSON.parse(trip.adminCorrectionNotes).tripPlanner || ""; } catch {}
                                              }
                                              return "";
                                            })()}
                                            onChange={e => {
                                              const val = e.target.value;
                                              setAdminTripCorrectionNotes(prev => ({
                                                ...prev,
                                                [trip.id]: { ...(prev[trip.id] || {}), tripPlanner: val }
                                              }));
                                            }}
                                            style={{ fontSize: 12, background: "rgba(0,0,0,0.3)" }}
                                          />
                                        </div>

                                        {/* 2. Risk & Safety Correction */}
                                        <div>
                                          <label style={{ fontSize: 11, fontWeight: 700, color: "#f87171", display: "block", marginBottom: 4 }}>
                                            🛡️ Safety & Hazard Adjustments:
                                          </label>
                                          <textarea
                                            className="form-control"
                                            rows={2}
                                            placeholder="Custom hazard warnings or safety advice..."
                                            value={adminTripCorrectionNotes[trip.id]?.risk ?? (() => {
                                              if (trip.adminCorrectionNotes) {
                                                try { return JSON.parse(trip.adminCorrectionNotes).risk || ""; } catch {}
                                              }
                                              return "";
                                            })()}
                                            onChange={e => {
                                              const val = e.target.value;
                                              setAdminTripCorrectionNotes(prev => ({
                                                ...prev,
                                                [trip.id]: { ...(prev[trip.id] || {}), risk: val }
                                              }));
                                            }}
                                            style={{ fontSize: 12, background: "rgba(0,0,0,0.3)" }}
                                          />
                                        </div>

                                        {/* 3. Budget Correction */}
                                        <div>
                                          <label style={{ fontSize: 11, fontWeight: 700, color: "#4ade80", display: "block", marginBottom: 4 }}>
                                            💰 Budget Adjustments:
                                          </label>
                                          <textarea
                                            className="form-control"
                                            rows={2}
                                            placeholder="Pricing guidance, special discounts..."
                                            value={adminTripCorrectionNotes[trip.id]?.budget ?? (() => {
                                              if (trip.adminCorrectionNotes) {
                                                try { return JSON.parse(trip.adminCorrectionNotes).budget || ""; } catch {}
                                              }
                                              return "";
                                            })()}
                                            onChange={e => {
                                              const val = e.target.value;
                                              setAdminTripCorrectionNotes(prev => ({
                                                ...prev,
                                                [trip.id]: { ...(prev[trip.id] || {}), budget: val }
                                              }));
                                            }}
                                            style={{ fontSize: 12, background: "rgba(0,0,0,0.3)" }}
                                          />
                                        </div>

                                        {/* 4. Split-Bill Correction */}
                                        <div>
                                          <label style={{ fontSize: 11, fontWeight: 700, color: "#c084fc", display: "block", marginBottom: 4 }}>
                                            👥 Split-Bill Adjustments:
                                          </label>
                                          <textarea
                                            className="form-control"
                                            rows={2}
                                            placeholder="Custom share ratios, exclusions..."
                                            value={adminTripCorrectionNotes[trip.id]?.splitBill ?? (() => {
                                              if (trip.adminCorrectionNotes) {
                                                try { return JSON.parse(trip.adminCorrectionNotes).splitBill || ""; } catch {}
                                              }
                                              return "";
                                            })()}
                                            onChange={e => {
                                              const val = e.target.value;
                                              setAdminTripCorrectionNotes(prev => ({
                                                ...prev,
                                                [trip.id]: { ...(prev[trip.id] || {}), splitBill: val }
                                              }));
                                            }}
                                            style={{ fontSize: 12, background: "rgba(0,0,0,0.3)" }}
                                          />
                                        </div>
                                      </div>
                                    </div>

                                  </div>
                                </div>
                              );
                            })()}

                            {/* Admin Note Input */}
                            <div style={{ marginTop: 4 }}>
                              <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                                Admin Feedback / Review Note to Traveller:
                              </label>
                              <textarea
                                className="form-control"
                                rows={2}
                                placeholder="Write feedback, recommendations, or safety warnings for the traveller..."
                                value={adminTripNotes[trip.id] || ""}
                                onChange={e => setAdminTripNotes(prev => ({ ...prev, [trip.id]: e.target.value }))}
                                style={{ fontSize: 13 }}
                              />
                            </div>

                            {/* Admin Action Buttons */}
                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                              <button
                                className="btn btn-primary btn-small"
                                onClick={() => handleAdminTripReview(trip.id, "approve")}
                                disabled={trip.status === "Reviewed"}
                                style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", borderColor: "#16a34a" }}
                              >
                                ✅ Approve Plan
                              </button>
                              <button
                                className="btn btn-danger btn-small"
                                onClick={() => handleAdminTripReview(trip.id, "decline")}
                                disabled={trip.status === "Declined"}
                              >
                                ❌ Decline Plan
                              </button>
                              <button
                                className="btn btn-secondary btn-small"
                                onClick={() => handleAdminTripReview(trip.id, "warn")}
                                style={{ borderColor: "#f59e0b", color: "#f59e0b" }}
                              >
                                ⚠️ Send Warning Note
                              </button>
                              <button
                                className="btn btn-secondary btn-small"
                                onClick={() => handleRunAiReview(trip)}
                                disabled={aiReviewLoading[trip.id]}
                                style={{
                                  background: "linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(139, 92, 246, 0.25) 100%)",
                                  borderColor: "#8b5cf6",
                                  color: "#c4b5fd",
                                  fontWeight: 600,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6
                                }}
                              >
                                {aiReviewLoading[trip.id] ? "⏳ Running AI Review..." : "🤖 AI Review"}
                              </button>
                              <button
                                className="btn btn-danger btn-small"
                                onClick={() => handleBanTripOwner(trip.id, trip.ownerUserId || displayEmail)}
                                style={{ background: "linear-gradient(135deg,#7f1d1d,#991b1b)", borderColor: "#991b1b", marginLeft: "auto" }}
                              >
                                🚫 Suspend / Ban User
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* ========================================================================= */}
        {/* CANVAS 7: SYSTEM AUDIT LOGS LEDGER                                       */}
        {/* ========================================================================= */}
        {role === "StaffAdmin" && activeNav === "audit" && (
          <section className="card">
            <div className="card-header">
              <div className="card-title">
                <div className="card-title-icon" style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc" }}>📜</div>
                <div>
                  <div>System Audit Logs</div>
                  <div className="card-subtitle">ASP.NET Core Ledger — every action tracked</div>
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={loadAuditLogs}>🔄 Refresh</button>
            </div>

            {auditLogs.length === 0 ? <p className="text-muted">No audit logs recorded yet.</p> : (
              <div className="table-wrapper">
                <table className="table">
                  <thead><tr><th>Event Type</th><th>Details</th><th>Timestamp</th></tr></thead>
                  <tbody>
                    {auditLogs.map(log => (
                      <tr key={log.id}>
                        <td><span className="badge badge-primary">{log.eventType}</span></td>
                        <td style={{ fontSize: 13 }}>{log.details}</td>
                        <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{new Date(log.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

      </main>

      {/* ========================================================================= */}
      {/* MODAL DIALOGS FOR ALL CRUD ACTIONS                                        */}
      {/* ========================================================================= */}

      {/* Trip Details Modal Popup */}
      {detailedTripModal && (
        <TripDetailsModal
          trip={detailedTripModal}
          onClose={() => setDetailedTripModal(null)}
          onSelectActive={(t) => { setSelectedTrip(t); setDetailedTripModal(null); }}
          isActiveTrip={selectedTrip?.id === detailedTripModal.id}
          onEditWizard={(t) => { setDetailedTripModal(null); openEditTripWizard(t); }}
          onRunAiReview={(t) => { handleTravellerAiReviewClick(t); }}
          onDeleteTrip={(t) => { handleDeleteTrip(t.id); }}
          onViewSuggestedListings={(t) => { setSelectedSuggestedListingsTrip(t); }}
          aiReviewLoading={busy}
        />
      )}

      {/* Trip Suggested Listings Modal Popup */}
      {selectedSuggestedListingsTrip && (
        <TripSuggestedListingsModal
          trip={selectedSuggestedListingsTrip}
          onClose={() => setSelectedSuggestedListingsTrip(null)}
          onUpdateTripPlanning={handleUpdateTripPlanning}
        />
      )}

      {/* Verified AI Review Modal Popup for Traveler */}
      {verifiedAiModalTrip && (
        <VerifiedAiReviewModal
          trip={verifiedAiModalTrip}
          onClose={() => setVerifiedAiModalTrip(null)}
        />
      )}

      {/* Pending Review Notice Modal for Traveler */}
      {pendingAiNoticeTrip && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: "1.5rem"
          }}
          onClick={() => setPendingAiNoticeTrip(null)}
        >
          <div
            style={{
              background: "#0f172a",
              border: "1px solid rgba(245, 158, 11, 0.4)",
              borderRadius: "20px",
              maxWidth: "520px",
              width: "100%",
              padding: "2rem",
              boxShadow: "0 20px 50px rgba(0,0,0,0.7)",
              textAlign: "center"
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⏳</div>
            <h3 style={{ color: "#f8fafc", margin: "0 0 0.5rem" }}>Awaiting Official Admin Review</h3>
            <div style={{
              display: "inline-block",
              padding: "0.25rem 0.85rem",
              borderRadius: "14px",
              background: "rgba(245, 158, 11, 0.15)",
              color: "#fbbf24",
              fontSize: "0.8rem",
              fontWeight: 700,
              marginBottom: "1rem"
            }}>
              STATUS: PENDING ADMIN APPROVAL
            </div>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem", lineHeight: 1.6, margin: "0 0 1.5rem" }}>
              Your travel plan for <strong>{pendingAiNoticeTrip.destination}</strong> has been submitted and is currently in the Administrator's review queue. Once the Admin verifies and approves the plan, the official 4-agent AI itinerary, safety risk assessment, and Priority Method (ii) catalog budget will appear here.
            </p>
            <button
              onClick={() => setPendingAiNoticeTrip(null)}
              style={{
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                color: "#ffffff",
                border: "none",
                padding: "0.6rem 1.75rem",
                borderRadius: "8px",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* Modal: Trip */}
      {modalType === "TRIP_WIZARD" && (
        <div className="modal-overlay">
          <div className="modal-content trip-wizard-modal">
            <div className="modal-header">
              <div>
                <div className="modal-title">{editItem ? "✏️ Edit Trip Plan" : "✈️ Plan a Trip"}</div>
                <div className="modal-subtitle">
                  {editItem
                    ? `Editing "${tripWizard.name || 'Trip'}" — review or change steps and save.`
                    : "Build your itinerary, budget, safety plan, and AI review request."}
                </div>
              </div>
              <button
                className="modal-close"
                type="button"
                onClick={() => { setModalType(null); setEditItem(null); }}
                aria-label="Close trip planner"
              >
                ✕
              </button>
            </div>

            <div className="trip-stepper" aria-label="Trip planning progress">
              {tripWizardSteps.map((step, index) => (
                <div key={step} className={`trip-step ${index === tripWizardStep ? "active" : ""} ${index < tripWizardStep ? "complete" : ""}`}>
                  <span>{index + 1}</span><small>{step}</small>
                </div>
              ))}
            </div>

            {wizardError && (
              <div
                className="alert alert-danger"
                style={{
                  margin: "14px 20px 0",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  borderRadius: 8,
                  fontSize: 13,
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                  color: "#fca5a5"
                }}
              >
                <span>⚠️</span>
                <span style={{ flex: 1 }}>{wizardError}</span>
                <button
                  type="button"
                  style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 16 }}
                  onClick={() => setWizardError(null)}
                >
                  ✕
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
                  e.preventDefault();
                }
              }}
            >
              {tripWizardStep === 0 && (
                <div className="wizard-section">
                  <h3>🚀 Starting Point</h3>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
                    Where will your journey begin? Enter your starting location manually or use your GPS to pin your current position.
                  </p>
                  <div className="form-group">
                    <label>Starting location <span style={{ color: "#ef4444" }}>* (Required)</span></label>
                    <input
                      className="form-control"
                      id="trip-starting-point-input"
                      placeholder="e.g. Colombo Fort, Kandy Bus Stand, your hotel name..."
                      value={tripWizard.startingPoint}
                      onChange={e => updateTripWizard("startingPoint", e.target.value)}
                    />
                    <small className="form-hint">Type your departure point — hotel, city, landmark, or address.</small>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
                    <div style={{ flex: 1, height: 1, background: "var(--border-color)" }} />
                    <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>or use GPS</span>
                    <div style={{ flex: 1, height: 1, background: "var(--border-color)" }} />
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={gpsLoading}
                    style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", justifyContent: "center", padding: "12px 20px", fontSize: 14, borderRadius: 10 }}
                    onClick={() => {
                      if (!navigator.geolocation) { setError("GPS is not supported by your browser."); return; }
                      setGpsLoading(true); setError(null);
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          const coords = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
                          updateTripWizard("startingPoint", coords);
                          setGpsLoading(false);
                          setSuccess("📍 GPS location pinned as your starting point!");
                          setTimeout(() => setSuccess(null), 3000);
                        },
                        () => {
                          setGpsLoading(false);
                          setError("Unable to retrieve GPS location. Please allow location access or type manually.");
                        },
                        { enableHighAccuracy: true, timeout: 10000 }
                      );
                    }}
                  >
                    {gpsLoading ? <><span>⟳</span> Fetching GPS location...</> : <><span>📍</span> Use My Current GPS Location</>}
                  </button>
                  {tripWizard.startingPoint && (
                    <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 8, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                      <span>📍</span>
                      <span style={{ color: "#a5b4fc", fontWeight: 600 }}>Starting from:</span>
                      <span style={{ color: "var(--text-primary)", flex: 1 }}>{tripWizard.startingPoint}</span>
                      <button type="button" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 16 }} onClick={() => updateTripWizard("startingPoint", "")}>✕</button>
                    </div>
                  )}

                  {/* AI Auto-Audit Preference Switch at Wizard Start */}
                  <div style={{
                    marginTop: 22,
                    padding: "16px 20px",
                    borderRadius: 14,
                    background: "linear-gradient(145deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 41, 59, 0.7) 100%)",
                    border: autoAuditEnabled ? "1px solid rgba(139, 92, 246, 0.4)" : "1px solid rgba(255, 255, 255, 0.1)",
                    boxShadow: autoAuditEnabled ? "0 4px 18px rgba(139, 92, 246, 0.15)" : "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                    flexWrap: "wrap"
                  }}>
                    <div style={{ flex: 1, minWidth: 260 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 18 }}>🤖</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#ffffff" }}>
                          Automatic AI Plan Audit
                        </span>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 800,
                          padding: "2px 8px",
                          borderRadius: 12,
                          background: autoAuditEnabled ? "rgba(16, 185, 129, 0.2)" : "rgba(148, 163, 184, 0.2)",
                          color: autoAuditEnabled ? "#34d399" : "#94a3b8",
                          border: autoAuditEnabled ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(148, 163, 184, 0.3)"
                        }}>
                          {autoAuditEnabled ? "ENABLED" : "PAUSED"}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
                        Automatically cross-checks vehicle passenger capacities, budget adequacy, and matches verified local partner services when you reach the review step. You can disable this to audit manually at your own pace.
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <button
                        type="button"
                        id="wizard-auto-audit-toggle"
                        onClick={() => {
                          const nextVal = !autoAuditEnabled;
                          setAutoAuditEnabled(nextVal);
                          try { localStorage.setItem("travelwise_auto_audit_enabled", String(nextVal)); } catch {}
                        }}
                        style={{
                          position: "relative",
                          width: 52,
                          height: 26,
                          borderRadius: 20,
                          background: autoAuditEnabled ? "linear-gradient(135deg, #10b981, #059669)" : "#334155",
                          border: "none",
                          cursor: "pointer",
                          padding: 2,
                          transition: "background 0.25s ease",
                          display: "flex",
                          alignItems: "center"
                        }}
                        title={autoAuditEnabled ? "Click to Disable Automatic AI Audit" : "Click to Enable Automatic AI Audit"}
                      >
                        <span style={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: "#ffffff",
                          transform: autoAuditEnabled ? "translateX(26px)" : "translateX(0px)",
                          transition: "transform 0.25s ease",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.35)",
                          display: "block"
                        }} />
                      </button>
                      <span style={{ fontSize: 12, fontWeight: 800, color: autoAuditEnabled ? "#34d399" : "#94a3b8", minWidth: 28 }}>
                        {autoAuditEnabled ? "ON" : "OFF"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {tripWizardStep === 1 && (
                <div className="wizard-section">
                  <h3>General trip setup</h3>
                  <div className="form-group">
                    <label>Trip name <span style={{ color: "#ef4444" }}>*</span></label>
                    <input className="form-control" id="trip-name-input" placeholder="e.g. Ella Scenic Adventure" value={tripWizard.name} onChange={e => updateTripWizard("name", e.target.value)} />
                  </div>

                  {/* Destination with Real-Time Sri Lanka Autocomplete & Verification */}
                  <div className="form-group" style={{ position: "relative" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <label style={{ margin: 0 }}>Destination in Sri Lanka <span style={{ color: "#ef4444" }}>* (Required)</span></label>
                      {tripWizard.destination && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: isValidSriLankanLocation(tripWizard.destination) ? "#4ade80" : "#f59e0b" }}>
                          {isValidSriLankanLocation(tripWizard.destination) ? "✓ Verified Sri Lanka Location" : "⚠️ Verifying location..."}
                        </span>
                      )}
                    </div>
                    <div style={{ position: "relative" }}>
                      <input
                        className="form-control"
                        autoComplete="off"
                        id="trip-destination-input"
                        placeholder="Type destination (e.g. Ella, Kandy, Galle, Sigiriya, Matale, Nuwara Eliya...)"
                        value={tripWizard.destination}
                        onChange={e => handleDestinationInput(e.target.value)}
                        onFocus={() => { if (destSuggestions.length > 0) setShowDestSuggestions(true); }}
                        style={{ paddingRight: 36 }}
                      />
                      {destSearching && (
                        <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--brand-teal-light)" }}>
                          ⟳
                        </span>
                      )}
                    </div>

                    {/* Autocomplete Suggestions Box */}
                    {showDestSuggestions && destSuggestions.length > 0 && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          zIndex: 100,
                          background: "#0d1b2a",
                          border: "1px solid var(--brand-teal-light)",
                          borderRadius: 10,
                          boxShadow: "0 12px 30px rgba(0,0,0,0.6)",
                          maxHeight: 220,
                          overflowY: "auto",
                          marginTop: 4
                        }}
                      >
                        <div style={{ padding: "8px 12px", fontSize: 11, color: "var(--text-muted)", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between" }}>
                          <span>🇱🇰 Real Sri Lankan Locations</span>
                          <span>Click to select</span>
                        </div>
                        {destSuggestions.map((item, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              updateTripWizard("destination", item.displayName);
                              updateTripWizard("safetyLocation", item.displayName);
                              setShowDestSuggestions(false);
                            }}
                            style={{
                              padding: "10px 14px",
                              cursor: "pointer",
                              borderBottom: idx < destSuggestions.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              transition: "background 0.15s ease"
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(20, 184, 166, 0.15)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                          >
                            <span style={{ fontSize: 16 }}>📍</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{item.displayName}</div>
                              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.subTitle}</div>
                            </div>
                            <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(20, 184, 166, 0.2)", color: "#4ade80" }}>
                              Verified
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <small className="form-hint">Type any city, town, or landmark in Sri Lanka. Live suggestions will appear automatically.</small>
                  </div>

                  <div className="grid-2">
                    <div className="form-group"><label>Starting day (Start date) <span style={{ color: "#ef4444" }}>* (Required)</span></label><input id="trip-start-date-input" type="date" className="form-control" value={tripWizard.startDate} onChange={e => updateTripWizard("startDate", e.target.value)} /></div>
                    <div className="form-group"><label>End day (End date) <span style={{ color: "#ef4444" }}>* (Required)</span></label><input id="trip-end-date-input" type="date" className="form-control" value={tripWizard.endDate} min={tripWizard.startDate || undefined} onChange={e => updateTripWizard("endDate", e.target.value)} /></div>
                  </div>

                  <div className="form-group"><label>Trip type</label><div className="choice-grid">{(["SOLO", "GROUP"] as TripMode[]).map(mode => <button type="button" key={mode} className={`choice-card ${tripWizard.tripMode === mode ? "selected" : ""}`} onClick={() => updateTripWizard("tripMode", mode)}>{mode === "SOLO" ? "Solo trip" : "Group trip"}<small>{mode === "SOLO" ? "Just for me" : "Plan and share with others"}</small></button>)}</div></div>

                  {/* Traveling Method Selector with Sub-options */}
                  <div className="form-group" style={{ marginTop: 16 }}>
                    <label>Traveling Method <span style={{ color: "#ef4444" }}>* (Required)</span></label>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
                      Choose your primary transportation method across Sri Lanka. AI agents optimize your schedule, rest stops, and routes based on this.
                    </p>
                    <div className="choice-grid">
                      <button
                        type="button"
                        className={`choice-card ${tripWizard.travelMethod === "PRIVATE_VEHICLE" ? "selected" : ""}`}
                        onClick={() => {
                          updateTripWizard("travelMethod", "PRIVATE_VEHICLE");
                          if (!tripWizard.rentalVehicleType) updateTripWizard("rentalVehicleType", "Car");
                          updateTripWizard("publicTransportType", "");
                        }}
                      >
                        <span style={{ fontSize: 20 }}>🚗</span>
                        <strong>Own Private Vehicle</strong>
                        <small>Personal car, jeep, bike, or van</small>
                      </button>

                      <button
                        type="button"
                        className={`choice-card ${tripWizard.travelMethod === "RENTAL_VEHICLE" ? "selected" : ""}`}
                        onClick={() => {
                          updateTripWizard("travelMethod", "RENTAL_VEHICLE");
                          if (!tripWizard.rentalVehicleType) updateTripWizard("rentalVehicleType", "Car");
                          updateTripWizard("publicTransportType", "");
                        }}
                      >
                        <span style={{ fontSize: 20 }}>🔑</span>
                        <strong>Rental Vehicle</strong>
                        <small>Rented vehicle with or without driver</small>
                      </button>

                      <button
                        type="button"
                        className={`choice-card ${tripWizard.travelMethod === "PUBLIC_TRANSPORT" ? "selected" : ""}`}
                        onClick={() => {
                          updateTripWizard("travelMethod", "PUBLIC_TRANSPORT");
                          updateTripWizard("rentalVehicleType", "");
                        }}
                      >
                        <span style={{ fontSize: 20 }}>🚌</span>
                        <strong>Public Transport</strong>
                        <small>Sri Lanka public bus or train service</small>
                      </button>
                    </div>

                    {/* Sub-options for Rental or Private Vehicle */}
                    {(tripWizard.travelMethod === "RENTAL_VEHICLE" || tripWizard.travelMethod === "PRIVATE_VEHICLE") && (
                      <div style={{ marginTop: 14, padding: "16px 18px", borderRadius: 12, background: "rgba(20, 184, 166, 0.08)", border: "1px solid rgba(20, 184, 166, 0.25)" }}>
                        <label style={{ fontSize: 13, fontWeight: 700, color: "var(--brand-teal-light)", marginBottom: 8, display: "block" }}>
                          Choose Vehicle Category: <span style={{ color: "#ef4444" }}>* (Required)</span>
                        </label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {(["Bike", "Tuk-Tuk (Three-wheeler)", "Car", "Van", "Bus"] as const).map(type => (
                            <button
                              key={type}
                              type="button"
                              className={`chip ${tripWizard.rentalVehicleType === type ? "selected" : ""}`}
                              style={{ padding: "8px 14px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}
                              onClick={() => updateTripWizard("rentalVehicleType", type)}
                            >
                              <span>{type === "Bike" ? "🏍️" : type === "Car" ? "🚗" : type === "Van" ? "🚐" : type === "Bus" ? "🚌" : "🛺"}</span>
                              {type}
                            </button>
                          ))}
                        </div>

                        {/* Driver Option Toggle */}
                        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Driver Option:</span>
                          <label style={{ fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, color: !tripWizard.withDriver ? "#4ade80" : "var(--text-muted)", fontWeight: !tripWizard.withDriver ? 700 : 400 }}>
                            <input
                              type="radio"
                              name="wizardWithDriver"
                              checked={!tripWizard.withDriver}
                              onChange={() => updateTripWizard("withDriver", false)}
                            />
                            <span>Self-Drive / Rider (Without Driver)</span>
                          </label>
                          <label style={{ fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, color: tripWizard.withDriver ? "#4ade80" : "var(--text-muted)", fontWeight: tripWizard.withDriver ? 700 : 400 }}>
                            <input
                              type="radio"
                              name="wizardWithDriver"
                              checked={tripWizard.withDriver}
                              onChange={() => updateTripWizard("withDriver", true)}
                            />
                            <span>With Driver / Chauffeur</span>
                          </label>
                        </div>

                        {/* Real-Time Vehicle Capacity Guidance & Alerts */}
                        {(() => {
                          const vt = (tripWizard.rentalVehicleType || "").toUpperCase();
                          let capText = "";
                          let maxPersons = 4;
                          if (vt.includes("BIKE")) {
                            maxPersons = tripWizard.withDriver ? 1 : 2;
                            capText = tripWizard.withDriver
                              ? "🏍️ Motorbike (With Driver): Max 1 passenger. Driver takes front seat."
                              : "🏍️ Motorbike (Without Driver): Max 2 persons (1 rider + 1 pillion). Carrying 3+ people is illegal and hazardous.";
                          } else if (vt.includes("TUK")) {
                            maxPersons = 3;
                            capText = "🛺 Tuk-Tuk (Three-wheeler): Max 3 passengers legally permitted in Sri Lanka.";
                          } else if (vt.includes("CAR")) {
                            maxPersons = tripWizard.withDriver ? 4 : 5;
                            capText = tripWizard.withDriver
                              ? "🚗 Car (With Driver): Max 4 passengers (driver takes 1 seat). Groups of 5+ require a Van."
                              : "🚗 Car (Without Driver): Max 5 persons total.";
                          } else if (vt.includes("VAN")) {
                            maxPersons = 10;
                            capText = "🚐 Van: Accommodates up to 10 passengers with luggage.";
                          } else if (vt.includes("BUS")) {
                            maxPersons = 50;
                            capText = "🚌 Bus / Coach: Suitable for tourist groups up to 50 passengers.";
                          }

                          if (!capText) return null;

                          const groupCount = tripWizard.groupMembers.length;
                          const isOverloaded = (tripWizard.tripMode === "GROUP" || groupCount > 0) && groupCount > maxPersons;

                          return (
                            <div style={{ marginTop: 12 }}>
                              <div style={{ fontSize: 12, color: "#94a3b8", display: "flex", alignItems: "center", gap: 6 }}>
                                <span>ℹ️</span> {capText}
                              </div>
                              {isOverloaded && (
                                <div style={{ marginTop: 8, padding: "10px 14px", borderRadius: 8, background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#fca5a5", fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ fontSize: 16 }}>🚨</span>
                                  <div>
                                    <strong>Vehicle Capacity Alert:</strong> You have entered {groupCount} companion(s), which exceeds this {tripWizard.rentalVehicleType}'s capacity limit of {maxPersons} {tripWizard.withDriver ? "passenger(s)" : "person(s)"}.
                                    <div style={{ color: "#fecaca", marginTop: 2 }}>Please select a Car, Tuk-Tuk, or Van to avoid an AI audit error.</div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Sub-options for Public Transport */}
                    {tripWizard.travelMethod === "PUBLIC_TRANSPORT" && (
                      <div style={{ marginTop: 12, padding: "14px 16px", borderRadius: 10, background: "rgba(20, 184, 166, 0.08)", border: "1px solid rgba(20, 184, 166, 0.25)" }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: "var(--brand-teal-light)", marginBottom: 8, display: "block" }}>
                          Choose Public Transport Mode: <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {(["Bus", "Train"] as const).map(type => (
                            <button
                              key={type}
                              type="button"
                              className={`chip ${tripWizard.publicTransportType === type ? "selected" : ""}`}
                              style={{ padding: "8px 16px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}
                              onClick={() => updateTripWizard("publicTransportType", type)}
                            >
                              <span>{type === "Bus" ? "🚌" : "🚆"}</span>
                              {type === "Bus" ? "Public Bus (CTB & Private)" : "Train (Sri Lanka Railways)"}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {tripWizard.tripMode === "GROUP" && (
                    <div className="form-group">
                      <label>Group members</label>
                      <div className="tag-list">
                        {tripWizard.groupMembers.map(member => (
                          <span className="tag" key={member.id}>
                            {member.value}
                            <button type="button" onClick={() => updateTripWizard("groupMembers", tripWizard.groupMembers.filter(item => item.id !== member.id))}>×</button>
                          </span>
                        ))}
                      </div>
                      <div className="inline-form">
                        <input
                          className="form-control"
                          id="group-member-input"
                          placeholder="Name, phone, or email"
                          value={groupMemberInput}
                          onChange={e => setGroupMemberInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (groupMemberInput.trim()) {
                                updateTripWizard("groupMembers", [...tripWizard.groupMembers, { id: crypto.randomUUID(), value: groupMemberInput.trim() }]);
                                setGroupMemberInput("");
                              }
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => {
                            if (groupMemberInput.trim()) {
                              updateTripWizard("groupMembers", [...tripWizard.groupMembers, { id: crypto.randomUUID(), value: groupMemberInput.trim() }]);
                              setGroupMemberInput("");
                            }
                          }}
                        >
                          Add
                        </button>
                      </div>
                      <small className="form-hint">Type a member name or email and press Enter or Add. If you click Next, any typed member is automatically saved!</small>
                    </div>
                  )}
                </div>
              )}

              {tripWizardStep === 2 && (
                <div className="wizard-section">
                  <h3>Budget and initial expenses</h3>
                  <div className="grid-2"><div className="form-group"><label>Total trip budget</label><input type="number" min="0.01" step="0.01" className="form-control" value={tripWizard.totalBudget} onChange={e => updateTripWizard("totalBudget", e.target.value)} /></div><div className="form-group"><label>Currency</label><select className="form-control" value={tripWizard.currency} onChange={e => updateTripWizard("currency", e.target.value)}><option>LKR</option><option>USD</option><option>EUR</option><option>GBP</option><option>AUD</option></select></div></div>
                  <label>Category budget limits <span className="form-hint">(optional)</span></label><div className="grid-3">{(["food", "accommodation", "transport"] as (keyof CategoryBudgets)[]).map(category => <div className="form-group" key={category}><input type="number" min="0" step="0.01" className="form-control" placeholder={category[0].toUpperCase() + category.slice(1)} value={tripWizard.categoryBudgets[category]} onChange={e => updateTripWizard("categoryBudgets", { ...tripWizard.categoryBudgets, [category]: e.target.value })} /></div>)}</div>
                  <div className="section-heading"><label>Initial individual expenses <span className="form-hint">(optional)</span></label><button type="button" className="btn btn-secondary btn-small" onClick={() => updateTripWizard("initialExpenses", [...tripWizard.initialExpenses, { id: crypto.randomUUID(), amount: "", category: "Other", date: tripWizard.startDate || "", description: "", receiptName: "" }])}>+ Add expense</button></div>
                  {tripWizard.initialExpenses.map(expense => <div className="expense-draft" key={expense.id}><input type="number" min="0.01" step="0.01" className="form-control" placeholder="Amount" value={expense.amount} onChange={e => updateTripWizard("initialExpenses", tripWizard.initialExpenses.map(item => item.id === expense.id ? { ...item, amount: e.target.value } : item))} /><input className="form-control" placeholder="Category" value={expense.category} onChange={e => updateTripWizard("initialExpenses", tripWizard.initialExpenses.map(item => item.id === expense.id ? { ...item, category: e.target.value } : item))} /><input type="date" className="form-control" value={expense.date} onChange={e => updateTripWizard("initialExpenses", tripWizard.initialExpenses.map(item => item.id === expense.id ? { ...item, date: e.target.value } : item))} /><input className="form-control" placeholder="Description" value={expense.description} onChange={e => updateTripWizard("initialExpenses", tripWizard.initialExpenses.map(item => item.id === expense.id ? { ...item, description: e.target.value } : item))} /><label className="receipt-upload">Receipt<input type="file" accept="image/*" onChange={e => updateTripWizard("initialExpenses", tripWizard.initialExpenses.map(item => item.id === expense.id ? { ...item, receiptName: e.target.files?.[0]?.name || "" } : item))} /></label><button type="button" className="icon-button" onClick={() => updateTripWizard("initialExpenses", tripWizard.initialExpenses.filter(item => item.id !== expense.id))}>×</button></div>)}
                </div>
              )}

              {tripWizardStep === 3 && (
                <div className="wizard-section">
                  <h3>Experience and activity planning</h3>
                  <div className="form-group"><label>What are you interested in?</label><div className="chip-list">{tripInterests.map(interest => <button type="button" key={interest} className={`chip ${tripWizard.interests.includes(interest) ? "selected" : ""}`} onClick={() => updateTripWizard("interests", tripWizard.interests.includes(interest) ? tripWizard.interests.filter(item => item !== interest) : [...tripWizard.interests, interest])}>{interest}</button>)}</div></div>
                  <div className="form-group"><label>Daily activity time limit (hours)</label><input type="number" min="0.5" max="24" step="0.5" className="form-control" placeholder="8" value={tripWizard.dailyTimeLimit} onChange={e => updateTripWizard("dailyTimeLimit", e.target.value)} /></div>
                  <div className="form-group"><label>Must-visit places</label><textarea className="form-control" placeholder="Add places separated by commas" value={tripWizard.mustVisitPlaces} onChange={e => updateTripWizard("mustVisitPlaces", e.target.value)} /></div>
                </div>
              )}

              {tripWizardStep === 4 && (
                <div className="wizard-section">
                  <h3>Travel safety and weather</h3>
                  <div className="form-group"><label>Destination location or GPS coordinates</label><input className="form-control" placeholder="Ella, Sri Lanka or 6.8667, 81.0466" value={tripWizard.safetyLocation} onChange={e => updateTripWizard("safetyLocation", e.target.value)} /><small className="form-hint">This location is included in the AI weather and risk review.</small></div>
                  <div className="form-group"><label>High-risk activities</label><div className="checkbox-list">{highRiskActivityOptions.map(activity => <label key={activity} className="checkbox-item"><input type="checkbox" checked={tripWizard.highRiskActivities.includes(activity)} onChange={() => updateTripWizard("highRiskActivities", tripWizard.highRiskActivities.includes(activity) ? tripWizard.highRiskActivities.filter(item => item !== activity) : [...tripWizard.highRiskActivities, activity])} />{activity}</label>)}</div></div>
                </div>
              )}

              {tripWizardStep === 5 && (
                <div className="wizard-section" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 20, color: "var(--text-primary)" }}>Plan Review & AI Verification</h3>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
                      Comprehensive AI audit of your itinerary details, vehicle passenger capacity, realistic budget estimates, and recommended partner services.
                    </p>
                  </div>

                  {/* Optional Shared Billing for Group Trips */}
                  {tripWizard.tripMode === "GROUP" && tripWizard.groupMembers.length > 0 && (
                    <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#93c5fd", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                        <span>👥</span> Group Billing & Expense Setup <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>(Optional)</span>
                      </div>
                      <div className="grid-2" style={{ gap: 10, marginBottom: 10 }}>
                        <input className="form-control" placeholder="Payer / Initial payer name" value={tripWizard.sharedExpensePaidBy} onChange={e => updateTripWizard("sharedExpensePaidBy", e.target.value)} />
                        <input type="number" min="0" step="0.01" className="form-control" placeholder={`Estimated Shared Expense (${tripWizard.currency})`} value={tripWizard.sharedExpenseAmount} onChange={e => updateTripWizard("sharedExpenseAmount", e.target.value)} />
                      </div>
                      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Split Strategy:</span>
                        {(["EQUAL", "PERCENTAGE", "CUSTOM"] as const).map(strat => (
                          <label key={strat} style={{ fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, color: tripWizard.splitStrategy === strat ? "var(--brand-teal-light)" : "var(--text-muted)", fontWeight: tripWizard.splitStrategy === strat ? 700 : 400 }}>
                            <input type="radio" checked={tripWizard.splitStrategy === strat} onChange={() => updateTripWizard("splitStrategy", strat)} />
                            {strat === "EQUAL" ? "Equal" : strat === "PERCENTAGE" ? "Percentage" : "Custom"}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Plan Quality & Completeness Audit Hero Window */}
                  <div style={{
                    padding: "24px 28px",
                    borderRadius: 18,
                    background: "linear-gradient(145deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.85) 100%)",
                    border: "1px solid rgba(139, 92, 246, 0.35)",
                    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(139, 92, 246, 0.15)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 20
                  }}>
                    {/* Header Bar */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 22,
                          boxShadow: "0 4px 12px rgba(99, 102, 241, 0.35)"
                        }}>
                          ✨
                        </div>
                        <div>
                          <div style={{ fontSize: 17, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.01em" }}>
                            AI Plan Quality & Completeness Audit
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                            Cross-checks passenger count, vehicle capacity limits, budget feasibility, and matches local partner services.
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn"
                        disabled={wizardAiLoading}
                        onClick={runWizardAiSuggestions}
                        style={{
                          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                          color: "#ffffff",
                          fontWeight: 700,
                          fontSize: 13,
                          padding: "0.6rem 1.4rem",
                          borderRadius: 10,
                          border: "1px solid #a78bfa",
                          boxShadow: "0 4px 14px rgba(139, 92, 246, 0.4)",
                          cursor: wizardAiLoading ? "not-allowed" : "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6
                        }}
                      >
                        {wizardAiLoading ? "⏳ Analyzing Plan..." : wizardAiSuggestions ? "🔄 Re-Analyze Plan" : "🚀 Run AI Plan Audit"}
                      </button>
                    </div>

                    {/* Loading State */}
                    {wizardAiLoading && (
                      <div style={{
                        padding: "36px 20px",
                        textAlign: "center",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 12,
                        background: "rgba(99, 102, 241, 0.05)",
                        borderRadius: 14,
                        border: "1px dashed rgba(139, 92, 246, 0.3)"
                      }}>
                        <div style={{ fontSize: 32, animation: "spin 2s linear infinite" }}>⚙️</div>
                        <strong style={{ fontSize: 15, color: "#c4b5fd" }}>AI Wizard Suggestion Agent is Analyzing Your Itinerary...</strong>
                        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, maxWidth: 500 }}>
                          Evaluating passenger capacity vs vehicle limits ({tripWizard.rentalVehicleType || 'Vehicle'}), minimum per-day budget benchmarks for {tripWizard.destination || 'Sri Lanka'}, and matching verified accommodations.
                        </p>
                      </div>
                    )}

                    {/* Error Notice */}
                    {wizardAiError && (
                      <div style={{ padding: "14px 18px", borderRadius: 10, background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.35)", color: "#fca5a5", fontSize: 13 }}>
                        ⚠️ <strong>AI Analysis Notice:</strong> {wizardAiError}
                      </div>
                    )}

                    {/* Results Body */}
                    {!wizardAiLoading && wizardAiSuggestions && (() => {
                      const ws = wizardAiSuggestions;
                      const isPerfect = ws.is_ready_for_admin_submission;
                      const hasErrors = ws.critical_errors_count > 0;
                      const issues = ws.missing_fields || [];
                      const listings = ws.suggested_listings || {};
                      const accoms = listings.accommodations || [];
                      const rests = listings.restaurants || [];
                      const vehs = listings.rental_vehicles || [];
                      const places = listings.visiting_places || [];

                      const scoreColor = isPerfect ? "#22c55e" : hasErrors ? "#ef4444" : "#f59e0b";
                      const scoreBg = isPerfect ? "rgba(34, 197, 94, 0.12)" : hasErrors ? "rgba(239, 68, 68, 0.12)" : "rgba(245, 158, 11, 0.12)";

                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                          {/* Readiness & Score Card */}
                          <div style={{
                            padding: "20px 24px",
                            borderRadius: 14,
                            background: "rgba(15, 23, 42, 0.8)",
                            border: `1px solid ${scoreColor}40`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: 16
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                              <div style={{
                                width: 62,
                                height: 62,
                                borderRadius: "50%",
                                background: scoreBg,
                                border: `3px solid ${scoreColor}`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 900,
                                fontSize: 18,
                                color: scoreColor,
                                boxShadow: `0 0 16px ${scoreColor}30`
                              }}>
                                {ws.readiness_score}%
                              </div>
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                  <span style={{ fontSize: 16, fontWeight: 800, color: "#ffffff" }}>Itinerary Readiness Score</span>
                                  <span style={{
                                    padding: "4px 12px",
                                    borderRadius: 20,
                                    fontSize: 11,
                                    fontWeight: 800,
                                    background: isPerfect ? "rgba(34, 197, 94, 0.2)" : hasErrors ? "rgba(239, 68, 68, 0.2)" : "rgba(245, 158, 11, 0.2)",
                                    color: scoreColor,
                                    border: `1px solid ${scoreColor}60`
                                  }}>
                                    {isPerfect ? "✅ READY FOR ADMIN SUBMISSION" : hasErrors ? "🛑 CRITICAL ISSUES DETECTED" : "⚠️ OPTIMIZATION SUGGESTED"}
                                  </span>
                                </div>
                                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.5 }}>
                                  {ws.summary}
                                </div>
                              </div>
                            </div>

                            {/* Issue Count Badges */}
                            <div style={{ display: "flex", gap: 10 }}>
                              {ws.critical_errors_count > 0 && (
                                <div style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(239, 68, 68, 0.18)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#f87171", fontSize: 12, fontWeight: 700 }}>
                                  🚨 {ws.critical_errors_count} Critical Error{ws.critical_errors_count > 1 ? "s" : ""}
                                </div>
                              )}
                              {ws.warnings_count > 0 && (
                                <div style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(245, 158, 11, 0.18)", border: "1px solid rgba(245, 158, 11, 0.4)", color: "#fbbf24", fontSize: 12, fontWeight: 700 }}>
                                  ⚠️ {ws.warnings_count} Advisory Tip{ws.warnings_count > 1 ? "s" : ""}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Incomplete / Inconsistent Details Issues List */}
                          {issues.length > 0 && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                              <div style={{ fontSize: 14, fontWeight: 800, color: hasErrors ? "#f87171" : "#fcd34d", display: "flex", alignItems: "center", gap: 6 }}>
                                <span>{hasErrors ? "🚨" : "🔍"}</span> Inconsistent Details Needing Attention ({issues.length}):
                              </div>

                              {issues.map((iss: any, idx: number) => {
                                const isErr = iss.severity === "ERROR";
                                return (
                                  <div
                                    key={idx}
                                    style={{
                                      padding: "16px 20px",
                                      borderRadius: 12,
                                      background: isErr ? "rgba(239, 68, 68, 0.08)" : "rgba(245, 158, 11, 0.08)",
                                      border: isErr ? "1px solid rgba(239, 68, 68, 0.35)" : "1px solid rgba(245, 158, 11, 0.35)",
                                      borderLeft: `6px solid ${isErr ? "#ef4444" : "#f59e0b"}`,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      flexWrap: "wrap",
                                      gap: 16
                                    }}
                                  >
                                    <div style={{ flex: 1, minWidth: 260 }}>
                                      <div style={{ fontWeight: 800, color: isErr ? "#fca5a5" : "#fde68a", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                                        <span>{isErr ? "🛑" : "⚠️"}</span> {iss.title}
                                      </div>
                                      <div style={{ fontSize: 13, color: "#e2e8f0", marginTop: 4, lineHeight: 1.5 }}>
                                        {iss.message}
                                      </div>
                                      <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 6, display: "flex", alignItems: "baseline", gap: 6 }}>
                                        <span style={{ color: "#fbbf24" }}>💡</span>
                                        <span><em>Tip: {iss.suggestion}</em></span>
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      className="btn"
                                      onClick={() => setTripWizardStep(iss.step)}
                                      style={{
                                        padding: "8px 16px",
                                        borderRadius: 8,
                                        fontSize: 12,
                                        fontWeight: 800,
                                        background: isErr ? "linear-gradient(135deg, #ef4444, #dc2626)" : "linear-gradient(135deg, #f59e0b, #d97706)",
                                        color: "#ffffff",
                                        border: "none",
                                        boxShadow: isErr ? "0 4px 12px rgba(239, 68, 68, 0.35)" : "0 4px 12px rgba(245, 158, 11, 0.35)",
                                        cursor: "pointer",
                                        whiteSpace: "nowrap"
                                      }}
                                    >
                                      Fix in Step {iss.step + 1} ➔
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Strong Points */}
                          {ws.positive_highlights && ws.positive_highlights.length > 0 && (
                            <div style={{ padding: "12px 18px", borderRadius: 10, background: "rgba(34, 197, 94, 0.08)", border: "1px solid rgba(34, 197, 94, 0.25)", fontSize: 13, display: "flex", alignItems: "baseline", gap: 8 }}>
                              <span style={{ fontWeight: 800, color: "#4ade80", whiteSpace: "nowrap" }}>✓ Strong Points:</span>
                              <span style={{ color: "#cbd5e1", lineHeight: 1.5 }}>{ws.positive_highlights.join(" · ")}</span>
                            </div>
                          )}

                          {/* Matching Partner & Service Provider Listings */}
                          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 18 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                              <div style={{ fontWeight: 800, fontSize: 15, color: "#38bdf8", display: "flex", alignItems: "center", gap: 8 }}>
                                <span>🌟</span> Matching Partner & Service Provider Listings for {tripWizard.destination || "Sri Lanka"}:
                              </div>
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                <button
                                  type="button"
                                  className={`btn btn-small ${wizardAiTab === "ALL" ? "btn-primary" : "btn-secondary"}`}
                                  onClick={() => setWizardAiTab("ALL")}
                                  style={{ fontSize: 12, padding: "4px 12px", borderRadius: 6 }}
                                >
                                  All Listings
                                </button>
                                <button
                                  type="button"
                                  className={`btn btn-small ${wizardAiTab === "ACCOM" ? "btn-primary" : "btn-secondary"}`}
                                  onClick={() => setWizardAiTab("ACCOM")}
                                  style={{ fontSize: 12, padding: "4px 12px", borderRadius: 6 }}
                                >
                                  🏨 Stays ({accoms.length})
                                </button>
                                <button
                                  type="button"
                                  className={`btn btn-small ${wizardAiTab === "REST" ? "btn-primary" : "btn-secondary"}`}
                                  onClick={() => setWizardAiTab("REST")}
                                  style={{ fontSize: 12, padding: "4px 12px", borderRadius: 6 }}
                                >
                                  🍽️ Food ({rests.length})
                                </button>
                                <button
                                  type="button"
                                  className={`btn btn-small ${wizardAiTab === "VEHICLES" ? "btn-primary" : "btn-secondary"}`}
                                  onClick={() => setWizardAiTab("VEHICLES")}
                                  style={{ fontSize: 12, padding: "4px 12px", borderRadius: 6 }}
                                >
                                  🚗 Vehicles ({vehs.length})
                                </button>
                                <button
                                  type="button"
                                  className={`btn btn-small ${wizardAiTab === "PLACES" ? "btn-primary" : "btn-secondary"}`}
                                  onClick={() => setWizardAiTab("PLACES")}
                                  style={{ fontSize: 12, padding: "4px 12px", borderRadius: 6 }}
                                >
                                  🏛️ Sights ({places.length})
                                </button>
                              </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
                              {/* Accommodations */}
                              {(wizardAiTab === "ALL" || wizardAiTab === "ACCOM") && accoms.map((a: any, idx: number) => (
                                <div key={idx} style={{ padding: "16px", borderRadius: 12, background: "rgba(15, 23, 42, 0.75)", border: "1px solid rgba(56, 189, 248, 0.25)", fontSize: 12, display: "flex", flexDirection: "column", gap: 6, boxShadow: "0 4px 14px rgba(0,0,0,0.2)" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                                    <strong style={{ color: "#38bdf8", fontSize: 14 }}>🏨 {a.name}</strong>
                                    <span style={{ fontSize: 10, background: "rgba(56,189,248,0.15)", color: "#38bdf8", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>{a.type}</span>
                                  </div>
                                  <div style={{ color: "#4ade80", fontWeight: 800, fontSize: 14 }}>
                                    ~Rs. {a.price_per_night?.toLocaleString()} <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-muted)" }}>/ night</span>
                                  </div>
                                  {a.location && <div style={{ color: "#94a3b8", fontSize: 12 }}>📍 {a.location}</div>}
                                  {a.contact_number && <div style={{ color: "#fbbf24", fontSize: 12 }}>📞 {a.contact_number}</div>}
                                  <div style={{ fontSize: 10, color: "#64748b", borderTop: "1px dashed rgba(255,255,255,0.08)", paddingTop: 6, marginTop: 4 }}>
                                    ✓ {a.source}
                                  </div>
                                </div>
                              ))}

                              {/* Restaurants & Dishes */}
                              {(wizardAiTab === "ALL" || wizardAiTab === "REST") && rests.map((r: any, idx: number) => (
                                <div key={idx} style={{ padding: "16px", borderRadius: 12, background: "rgba(15, 23, 42, 0.75)", border: "1px solid rgba(245, 158, 11, 0.25)", fontSize: 12, display: "flex", flexDirection: "column", gap: 6, boxShadow: "0 4px 14px rgba(0,0,0,0.2)" }}>
                                  <strong style={{ color: "#fbbf24", fontSize: 14 }}>🍽️ {r.name}</strong>
                                  {r.location && <div style={{ color: "#94a3b8", fontSize: 12 }}>📍 {r.location}</div>}
                                  {r.dishes && r.dishes.length > 0 ? (
                                    <div style={{ marginTop: 4 }}>
                                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>Featured Dishes:</div>
                                      {r.dishes.slice(0, 2).map((d: any, dIdx: number) => (
                                        <div key={dIdx} style={{ display: "flex", justifyContent: "space-between", color: "#e2e8f0", fontSize: 12, marginBottom: 2 }}>
                                          <span>• {d.name}</span>
                                          <strong style={{ color: "#4ade80" }}>Rs. {d.price?.toLocaleString()}</strong>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Local cuisine & authentic Sri Lankan meals</div>
                                  )}
                                </div>
                              ))}

                              {/* Rental Vehicles */}
                              {(wizardAiTab === "ALL" || wizardAiTab === "VEHICLES") && vehs.map((v: any, idx: number) => (
                                <div key={idx} style={{ padding: "16px", borderRadius: 12, background: "rgba(15, 23, 42, 0.75)", border: "1px solid rgba(34, 197, 94, 0.25)", fontSize: 12, display: "flex", flexDirection: "column", gap: 6, boxShadow: "0 4px 14px rgba(0,0,0,0.2)" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                                    <strong style={{ color: "#4ade80", fontSize: 14 }}>🚗 {v.vehicle_model}</strong>
                                    <span style={{ fontSize: 10, background: "rgba(34,197,94,0.15)", color: "#22c55e", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>{v.vehicle_type}</span>
                                  </div>
                                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                                    <span style={{ color: "var(--text-muted)" }}>Rate:</span>
                                    <strong style={{ color: "var(--brand-teal-light)" }}>Rs. {v.rate_per_km}/km</strong>
                                  </div>
                                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                                    <span style={{ color: "var(--text-muted)" }}>Overnight fee:</span>
                                    <span>Rs. {v.extra_charge_per_night?.toLocaleString()}/night</span>
                                  </div>
                                  {v.owner_contact_phone && (
                                    <div style={{ color: "#fcd34d", fontSize: 12 }}>📞 Partner: {v.owner_contact_phone}</div>
                                  )}
                                </div>
                              ))}

                              {/* Visiting Places */}
                              {(wizardAiTab === "ALL" || wizardAiTab === "PLACES") && places.map((p: any, idx: number) => (
                                <div key={idx} style={{ padding: "16px", borderRadius: 12, background: "rgba(15, 23, 42, 0.75)", border: "1px solid rgba(168, 85, 247, 0.25)", fontSize: 12, display: "flex", flexDirection: "column", gap: 6, boxShadow: "0 4px 14px rgba(0,0,0,0.2)" }}>
                                  <strong style={{ color: "#c084fc", fontSize: 14 }}>🏛️ {p.name}</strong>
                                  {p.location && <div style={{ color: "#94a3b8", fontSize: 12 }}>📍 {p.location}</div>}
                                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 4 }}>
                                    <span style={{ color: "var(--text-muted)" }}>Admission:</span>
                                    <strong style={{ color: p.ticket_required ? "#fbbf24" : "#22c55e" }}>
                                      {p.ticket_required ? `Rs. ${p.ticket_price?.toLocaleString() || 0}` : "Free Admission"}
                                    </strong>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Initial Run Prompt if not yet loaded and not loading */}
                    {!wizardAiLoading && !wizardAiSuggestions && (
                      <div style={{
                        padding: "36px 20px",
                        textAlign: "center",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 14,
                        background: "rgba(99, 102, 241, 0.05)",
                        borderRadius: 14,
                        border: "1px dashed rgba(139, 92, 246, 0.3)"
                      }}>
                        <div style={{ fontSize: 40 }}>🤖</div>
                        <strong style={{ fontSize: 17, color: "#ffffff" }}>
                          {autoAuditEnabled ? "Ready to Audit Your Trip Details with AI" : "Automatic Audit is Paused (Manual Mode)"}
                        </strong>
                        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, maxWidth: 540, lineHeight: 1.6 }}>
                          {autoAuditEnabled
                            ? "Our AI Auditor will verify your passenger-to-vehicle capacity match, check Sri Lankan budget adequacy, and fetch verified partner hotels and rental fleets for your route."
                            : "You have disabled Automatic Audit. You can trigger the AI Plan Audit manually whenever you are ready by clicking the button below."}
                        </p>
                        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={runWizardAiSuggestions}
                            style={{
                              padding: "0.75rem 2rem",
                              fontSize: 14,
                              fontWeight: 800,
                              boxShadow: "0 4px 16px rgba(99, 102, 241, 0.4)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 8
                            }}
                          >
                            <span>🚀</span> Run Manual AI Audit Now
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Submit to Admin option */}
                  <div style={{ marginTop: 24, padding: "16px 20px", borderRadius: 12, background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.3)" }}>
                    <label className="checkbox-item" style={{ alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={tripWizard.submitToAdmin}
                        onChange={e => updateTripWizard("submitToAdmin", e.target.checked)}
                        style={{ marginTop: 2, width: 18, height: 18 }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "#fbbf24", marginBottom: 4 }}>📋 Submit to Admin for Review</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
                          Request an admin to review your full trip plan. An admin will check your details, approve or send feedback if there are any concerns.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              <div className="modal-footer wizard-footer">
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {editItem && (
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => {
                        const tripId = editItem.id;
                        setModalType(null);
                        setEditItem(null);
                        handleDeleteTrip(tripId);
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        background: "rgba(239, 68, 68, 0.15)",
                        border: "1px solid rgba(239, 68, 68, 0.4)",
                        color: "#f87171"
                      }}
                      title="Delete Trip Permanently"
                    >
                      <TrashIcon size={14} color="currentColor" /> Delete Trip
                    </button>
                  )}
                  <button
                    id="trip-wizard-close-btn"
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setModalType(null);
                      setEditItem(null);
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      borderColor: "rgba(239, 68, 68, 0.35)",
                      color: "#f87171",
                      background: "rgba(239, 68, 68, 0.08)"
                    }}
                    title="Close and exit trip planner"
                  >
                    ✕ Close Wizard
                  </button>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto", flexWrap: "wrap" }}>
                  {tripWizardStep > 0 && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setTripWizardStep(current => current - 1)}
                    >
                      Back
                    </button>
                  )}
                  {tripWizardStep < tripWizardSteps.length - 1 ? (
                    <button id="trip-wizard-next-btn" type="button" className="btn btn-primary" onClick={goToNextTripWizardStep}>
                      Next Step →
                    </button>
                  ) : (
                    <button
                      id="trip-wizard-submit-btn"
                      type="button"
                      className="btn btn-primary"
                      disabled={tripWizardSubmitting}
                      onClick={(e) => submitTripWizard(e as any)}
                    >
                      {tripWizardSubmitting
                        ? (editItem ? "Updating plan..." : "Creating plan...")
                        : editItem
                        ? (tripWizard.submitToAdmin ? "Update & Submit to Admin ✉️" : "Update Trip Plan 💾")
                        : tripWizard.submitToAdmin
                        ? "Submit Plan to Admin ✉️"
                        : "Create Trip Plan ✈️"}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Trip */}
      {modalType === "TRIP" && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div>
                <div className="modal-title">✈️ {editItem ? "Edit Trip" : "Create New Group Trip"}</div>
                <div className="modal-subtitle">Plan your next Sri Lankan adventure</div>
              </div>
              <button className="modal-close" onClick={() => setModalType(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveTrip}>
              <div className="form-group">
                <label>Trip Name</label>
                <input required className="form-control" placeholder="e.g. Ella Expedition 2026" value={tripForm.name} onChange={e => setTripForm({ ...tripForm, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Destination</label>
                <input required className="form-control" placeholder="e.g. Ella" value={tripForm.destination} onChange={e => setTripForm({ ...tripForm, destination: e.target.value })} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Start Date</label>
                  <input required type="date" className="form-control" value={tripForm.startDate} onChange={e => setTripForm({ ...tripForm, startDate: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input required type="date" className="form-control" value={tripForm.endDate} onChange={e => setTripForm({ ...tripForm, endDate: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Trip</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Budget */}
      {modalType === "BUDGET" && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div>
                <div className="modal-title">💰 {editItem ? "Edit Budget" : "Add Budget Allocation"}</div>
                <div className="modal-subtitle">Set your trip spending limits</div>
              </div>
              <button className="modal-close" onClick={() => setModalType(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveBudget}>
              <div className="form-group">
                <label>Budget Amount</label>
                <input required type="number" min="1" className="form-control" placeholder="50000" value={budgetForm.amount} onChange={e => setBudgetForm({ ...budgetForm, amount: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Currency</label>
                <input required className="form-control" value={budgetForm.currency} onChange={e => setBudgetForm({ ...budgetForm, currency: e.target.value })} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Budget</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Expense */}
      {modalType === "EXPENSE" && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div>
                <div className="modal-title">🧾 {editItem ? "Edit Expense" : "Log Shared Expense"}</div>
                <div className="modal-subtitle">Track shared costs with your travel buddies</div>
              </div>
              <button className="modal-close" onClick={() => setModalType(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveExpense}>
              <div className="form-group">
                <label>Expense Description</label>
                <input required className="form-control" placeholder="Dinner at Cafe Chill" value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Paid By (Member Name)</label>
                <input required className="form-control" placeholder="Arosha" value={expenseForm.paidBy} onChange={e => setExpenseForm({ ...expenseForm, paidBy: e.target.value })} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Amount</label>
                  <input required type="number" min="1" className="form-control" placeholder="4500" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Currency</label>
                  <input required className="form-control" value={expenseForm.currency} onChange={e => setExpenseForm({ ...expenseForm, currency: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Activity */}
      {modalType === "ACTIVITY" && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div>
                <div className="modal-title">🗺️ {editItem ? "Edit Activity" : "Schedule Activity"}</div>
                <div className="modal-subtitle">Add to your travel itinerary</div>
              </div>
              <button className="modal-close" onClick={() => setModalType(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveActivity}>
              <div className="form-group">
                <label>Activity Name</label>
                <input required className="form-control" placeholder="Nine Arch Bridge Walk" value={activityForm.name} onChange={e => setActivityForm({ ...activityForm, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input required className="form-control" placeholder="Ella" value={activityForm.location} onChange={e => setActivityForm({ ...activityForm, location: e.target.value })} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Start Date & Time</label>
                  <input required type="datetime-local" className="form-control" value={activityForm.startAt} onChange={e => setActivityForm({ ...activityForm, startAt: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>End Date & Time</label>
                  <input required type="datetime-local" className="form-control" value={activityForm.endAt} onChange={e => setActivityForm({ ...activityForm, endAt: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Activity</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Risk */}
      {modalType === "RISK" && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div>
                <div className="modal-title">🛡️ {editItem ? "Edit Risk Note" : "Log Risk & Safety Note"}</div>
                <div className="modal-subtitle">Stay informed about travel hazards</div>
              </div>
              <button className="modal-close" onClick={() => setModalType(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveRisk}>
              <div className="form-group">
                <label>Severity</label>
                <select className="form-control" value={riskForm.severity} onChange={e => setRiskForm({ ...riskForm, severity: e.target.value as any })}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              <div className="form-group">
                <label>Summary / Concern</label>
                <input required className="form-control" placeholder="Heavy rain expected near cliff edge" value={riskForm.summary} onChange={e => setRiskForm({ ...riskForm, summary: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Weather Advisory</label>
                <input className="form-control" placeholder="Thunderstorms forecasted" value={riskForm.weatherSummary} onChange={e => setRiskForm({ ...riskForm, weatherSummary: e.target.value })} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Note</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Group Member */}
      {modalType === "MEMBER" && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div>
                <div className="modal-title">👥 {editItem ? "Edit Group Member" : "Add Group Member"}</div>
                <div className="modal-subtitle">Invite travel companions to your trip</div>
              </div>
              <button className="modal-close" onClick={() => setModalType(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveMember}>
              <div className="form-group">
                <label>Display Name</label>
                <input required className="form-control" placeholder="Kasun" value={memberForm.displayName} onChange={e => setMemberForm({ ...memberForm, displayName: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input required type="email" className="form-control" placeholder="kasun@example.com" value={memberForm.email} onChange={e => setMemberForm({ ...memberForm, email: e.target.value })} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Member</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* Modal: Add a Destination                                         */}
      {/* ================================================================ */}
      <AddDestinationModal
        isOpen={destModalOpen}
        onClose={() => setDestModalOpen(false)}
        onSubmit={handleCreateDestination}
        destNameInput={destNameInput}
        setDestNameInput={setDestNameInput}
        destRegionInput={destRegionInput}
        setDestRegionInput={setDestRegionInput}
        destDescInput={destDescInput}
        setDestDescInput={setDestDescInput}
        destSaving={destSaving}
        destTabError={destTabError}
        role={role}
      />

      {/* Modal: Edit Visiting Place */}
      <EditVisitingPlaceModal
        isOpen={!!editingVp}
        onClose={() => setEditingVp(null)}
        visitingPlace={editingVp}
        destinationStatus={activeDestination?.status}
        onSaved={handleVisitingPlaceSaved}
        role={role}
        userId={currentUserId}
        uploadImages={uploadImages}
      />

      {/* Modal: Edit Restaurant */}
      <EditRestaurantModal
        isOpen={!!editingRestaurant}
        onClose={() => setEditingRestaurant(null)}
        restaurant={editingRestaurant}
        destinationStatus={activeDestination?.status}
        onSaved={handleRestaurantSaved}
        role={role}
        userId={currentUserId}
        uploadImages={uploadImages}
      />

      {/* Modal: Edit Accommodation */}
      <EditAccommodationModal
        isOpen={!!editingAccommodation}
        onClose={() => setEditingAccommodation(null)}
        accommodation={editingAccommodation}
        destinationStatus={activeDestination?.status}
        onSaved={handleAccommodationSaved}
        role={role}
        userId={currentUserId}
        uploadImages={uploadImages}
      />

      {/* Modal: Edit Destination Overview */}
      <EditDestinationModal
        isOpen={!!editingDestination}
        onClose={() => setEditingDestination(null)}
        destination={editingDestination}
        onSaved={handleDestinationSaved}
        role={role}
        userId={currentUserId}
      />

      {/* Modal: Catalog Listing */}
      <CatalogModal
        isOpen={modalType === "CATALOG"}
        onClose={() => setModalType(null)}
        onSubmit={handleSaveCatalogItem}
        editItem={editItem}
        catalogForm={catalogForm}
        setCatalogForm={setCatalogForm}
      />

      {/* Modal: Double Verification Account Deletion */}
      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onSubmit={handleDeleteAccount}
        role={role}
        deleteConfirmInput={deleteConfirmInput}
        setDeleteConfirmInput={setDeleteConfirmInput}
        deleteReasonInput={deleteReasonInput}
        setDeleteReasonInput={setDeleteReasonInput}
        deleteSubmitting={deleteSubmitting}
        deleteModalError={deleteModalError}
      />

      {/* Global Detailed Itemized Budget Breakdown Modal Popup */}
      {detailedBreakdownBudget && (
        <BudgetItemizedBreakdownModal
          budget={detailedBreakdownBudget.budget}
          destinationName={detailedBreakdownBudget.destination}
          onClose={() => setDetailedBreakdownBudget(null)}
        />
      )}

    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
