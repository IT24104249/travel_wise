export type Role = "User" | "ServiceProvider" | "StaffAdmin";

export function getAuthenticatedRole(session: any): Role {
  if (!session) return "User";
  const user = session.user || session;
  const role = String(user?.app_metadata?.role || user?.user_metadata?.role || user?.role || session?.role || "").trim();
  const email = String(user?.email || session?.email || "").toLowerCase();

  if (
    role.toLowerCase().includes("admin") ||
    role === "StaffAdmin" ||
    role === "Admin" ||
    role === "Administrator" ||
    role === "SuperAdmin" ||
    role === "SystemAdmin" ||
    user?.app_metadata?.is_super_admin ||
    user?.user_metadata?.is_super_admin ||
    email.includes("admin") ||
    email === "admin@travelwise.com" ||
    email === "leadadmin@travelwise.com" ||
    email === "admin@travelwise.lk"
  ) {
    return "StaffAdmin";
  }

  if (role.toLowerCase() === "serviceprovider" || role.toLowerCase() === "provider") {
    return "ServiceProvider";
  }

  return "User";
}

export interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  startingPoint?: string;
  ownerUserId?: string;
  travellerName?: string;
  travellerEmail?: string;
  travelMethod?: string;
  travelVehicleType?: string;
  status?: string;
  submittedToAdmin?: boolean;
  submittedAt?: string;
  adminFeedback?: string;
  adminWarningNote?: string;
  planningDetailsJson?: string;
  adminApprovedAiReviewJson?: string;
  adminCorrectionNotes?: string;
  createdAt?: string;
}

export interface Budget {
  id: string;
  tripId: string;
  amount: number;
  currency: string;
  createdAt?: string;
}

export interface SharedExpense {
  id: string;
  tripId: string;
  paidBy: string;
  amount: number;
  currency: string;
  description: string;
  createdAt?: string;
}

export interface Activity {
  id: string;
  tripId: string;
  name: string;
  location: string;
  startAt: string;
  endAt: string;
  createdAt?: string;
}

export interface RiskAssessment {
  id: string;
  tripId: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  summary: string;
  weatherSummary?: string;
  assessedAt?: string;
}

export interface GroupMember {
  id: string;
  tripId: string;
  displayName: string;
  email: string;
  isActive: boolean;
}

export type CatalogItemType = "VisitingPlace" | "Restaurant" | "Accommodation" | "FoodPrice";

export interface CatalogItem {
  id: string;
  type: CatalogItemType;
  name: string;
  destination: string;
  description: string;
  address?: string;
  contact?: string;
  price?: number;
  currency: string;
  cuisineOrCategory?: string;
  rating?: number;
  providerUserId: string;
  isApproved: boolean;
  isActive: boolean;
  createdAt?: string;
}

// --- Destination Feature Interfaces ---
export interface Destination {
  id: string;
  name: string;
  description?: string;
  region?: string;
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
  isActive: boolean;
  status?: "NotVerified" | "Pending" | "Verified" | "Rejected";
  verifiedAt?: string;
  verifiedBy?: string;
  adminFeedback?: string;
  visitingPlaces?: VisitingPlace[];
  restaurants?: Restaurant[];
  accommodations?: Accommodation[];
}

export interface VisitingPlace {
  id: string;
  destinationId: string;
  name: string;
  description?: string;
  location?: string;
  openingHours?: string;
  ticketRequired: boolean;
  ticketPrice?: number;
  ticketType: 'None' | 'Foreigner' | 'Local' | 'Student';
  imageUrls?: string[];
  createdAt?: string;
}

export interface Restaurant {
  id: string;
  destinationId: string;
  name: string;
  location?: string;
  contact?: string;
  description?: string;
  imageUrls?: string[];
  foodItems?: FoodItem[];
  createdAt?: string;
}

export type FoodCategory = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Beverage';

export interface FoodItem {
  id: string;
  restaurantId: string;
  name: string;
  price: number;
  category: FoodCategory;
  imageUrl?: string;
  createdAt?: string;
}

export type AccommodationType = 'Hotel' | 'GuestHouse' | 'Homestay' | 'Villa' | 'Hostel';

export interface Accommodation {
  id: string;
  destinationId: string;
  name: string;
  type: AccommodationType;
  location?: string;
  pricePerNight?: number;
  specialNotes?: string;
  amenities?: string[];
  imageUrls?: string[];
  contactNumber?: string;
  createdAt?: string;
}

export type DestinationTab = 'visiting-places' | 'restaurants' | 'accommodations' | 'food-prices';

export interface ProviderApplication {
  id: string;
  email: string;
  businessName: string;
  contactPhone?: string;
  serviceType?: string;
  status: "Pending" | "Approved" | "Rejected";
  adminNote?: string;
  createdAt: string;
}

export interface UserProfile {
  id?: string;
  email: string;
  displayName: string;
  role: Role;
  contactPhone?: string;
  serviceType?: string;
  createdAt?: string;
  lastLoginAt?: string;
  pendingDisplayName?: string;
  pendingContactPhone?: string;
  pendingServiceType?: string;
  pendingProfileStatus?: "Pending" | "Approved" | "Rejected" | null;
  profileReviewNote?: string;
  profileUpdatedAt?: string;
  deletionRequested?: boolean;
  deletionRequestedAt?: string;
  deletionReason?: string;
  deletionStatus?: string | null;
}

export interface ProviderProfileRequest {
  id: string;
  email: string;
  currentDisplayName: string;
  currentContactPhone?: string;
  currentServiceType?: string;
  requestedDisplayName?: string;
  requestedContactPhone?: string;
  requestedServiceType?: string;
  requestedAt?: string;
  status: string;
}

export interface ProviderDeletionRequest {
  id: string;
  email: string;
  displayName: string;
  contactPhone?: string;
  serviceType?: string;
  requestedAt?: string;
  reason?: string;
  status: string;
}

export interface Workflow {
  id: string;
  tripId: string;
  objective: string;
  status: string;
  planJson?: string;
  resultJson?: string;
  createdAt?: string;
}

export interface AuditLog {
  id: string;
  workflowId: string;
  eventType: string;
  details: string;
  createdAt: string;
}

export type TripMode = "SOLO" | "GROUP";
export type SplitStrategy = "EQUAL" | "PERCENTAGE" | "CUSTOM";

export interface GroupMemberDraft {
  id: string;
  value: string;
}

export interface InitialExpenseDraft {
  id: string;
  amount: string;
  category: string;
  date: string;
  description: string;
  receiptName: string;
}

export interface CategoryBudgets {
  food: string;
  accommodation: string;
  transport: string;
}

export type TravelMethod = "PRIVATE_VEHICLE" | "RENTAL_VEHICLE" | "PUBLIC_TRANSPORT" | "";
export type RentalVehicleType = "Bike" | "Car" | "Van" | "Bus" | "Tuk-Tuk (Three-wheeler)" | "";
export type PublicTransportType = "Bus" | "Train" | "";

export interface TripWizardState {
  startingPoint: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  tripMode: TripMode | "";
  travelMethod: TravelMethod;
  rentalVehicleType: RentalVehicleType;
  publicTransportType: PublicTransportType;
  withDriver: boolean;
  groupMembers: GroupMemberDraft[];
  totalBudget: string;
  currency: string;
  categoryBudgets: CategoryBudgets;
  initialExpenses: InitialExpenseDraft[];
  interests: string[];
  dailyTimeLimit: string;
  mustVisitPlaces: string;
  safetyLocation: string;
  highRiskActivities: string[];
  sharedExpensePaidBy: string;
  sharedExpenseAmount: string;
  sharedExpenseDescription: string;
  splitStrategy: SplitStrategy;
  splitAllocations: Record<string, string>;
  multiCurrencyConversion: boolean;
  submitToAdmin: boolean;
}

export const initialTripWizardState: TripWizardState = {
  startingPoint: "",
  name: "",
  destination: "",
  startDate: "",
  endDate: "",
  tripMode: "",
  travelMethod: "",
  rentalVehicleType: "",
  publicTransportType: "",
  withDriver: false,
  groupMembers: [],
  totalBudget: "",
  currency: "LKR",
  categoryBudgets: { food: "", accommodation: "", transport: "" },
  initialExpenses: [],
  interests: [],
  dailyTimeLimit: "",
  mustVisitPlaces: "",
  safetyLocation: "",
  highRiskActivities: [],
  sharedExpensePaidBy: "",
  sharedExpenseAmount: "",
  sharedExpenseDescription: "",
  splitStrategy: "EQUAL",
  splitAllocations: {},
  multiCurrencyConversion: false,
  submitToAdmin: true,
};

export const tripWizardSteps = [
  "Starting Point",
  "Trip setup",
  "Budget",
  "Activities",
  "Safety",
  "Review & AI Audit",
];

export const tripInterests = ["Hiking", "Nature", "Culture", "Nightlife", "Historical", "Foodie"];
export const highRiskActivityOptions = ["Hiking", "Water Sports", "Extreme Sports"];

export const HERO_IMAGE_URL = "/images/sigiriya-golden.jpg";

export const SRI_LANKAN_DESTINATIONS = [
  "Sigiriya", "Ella", "Mirissa", "Galle", "Kandy", "Nuwara Eliya",
  "Yala", "Trincomalee", "Anuradhapura", "Polonnaruwa", "Arugam Bay", "Colombo"
];

export type TransportCategory = "Railway" | "Bus";
export type FareFileStatus = "PendingApproval" | "Approved" | "Rejected";

export interface TransportFareFile {
  id: string;
  category: TransportCategory;
  fileName: string;
  originalFileName?: string;
  storageBucket: string;
  storagePath: string;
  fileSizeBytes: number;
  uploadedByUserId: string;
  uploadedByRole: string;
  uploaderRole?: string;
  uploaderName?: string;
  status: FareFileStatus;
  adminNotes?: string;
  statusNote?: string;
  reviewedByUserId?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt?: string;
  publicUrl?: string;
  isActive?: boolean;
  parsedRowCount?: number;
  rowCount?: number;
  samplePreviewJson?: string;
  sampleRowsJson?: string;
}

export type RentalVehicleCategory = "Bike" | "Car" | "Van" | "Bus" | "TukTuk";

export interface RentalVehicleListing {
  id: string;
  vehicleType: string;
  vehicleModel: string;
  manufacturingYear: number;
  ownerContactPhone: string;
  ratePerKm: number;
  extraChargePerNight: number;
  location: string;
  description?: string;
  imageUrl?: string;
  driverIncluded: boolean;
  seatingCapacity: number;
  status: "PendingReview" | "Approved" | "Rejected";
  adminFeedback?: string;
  providerUserId: string;
  providerEmail?: string;
  providerName?: string;
  createdAt: string;
  updatedAt?: string;
  reviewedAt?: string;
  reviewedByUserId?: string;
  isActive: boolean;
}

export interface CreateRentalVehicleDraft {
  vehicleType: string;
  vehicleModel: string;
  manufacturingYear: string;
  ownerContactPhone: string;
  ratePerKm: string;
  extraChargePerNight: string;
  location: string;
  description: string;
  imageUrl: string;
  driverIncluded: boolean;
  seatingCapacity: string;
}
