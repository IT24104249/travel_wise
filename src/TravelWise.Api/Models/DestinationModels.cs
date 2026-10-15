using System.Text.Json.Serialization;

namespace TravelWise.Api.Models;

// ============================================================
// Destination — Top-level entity for a Sri Lankan destination
// ============================================================
public sealed class Destination
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;          // e.g. "Ella"
    public string? Description { get; set; }
    public string? Region { get; set; }                        // e.g. "Uva Province"
    public string CreatedBy { get; set; } = string.Empty;     // provider user id
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;

    // Verification Workflow
    public string Status { get; set; } = "NotVerified"; // "NotVerified", "Pending", "Verified", "Rejected"
    public DateTime? VerifiedAt { get; set; }
    public string? VerifiedBy { get; set; }
    public string? AdminFeedback { get; set; }

    // Navigation
    public List<VisitingPlace> VisitingPlaces { get; set; } = [];
    public List<Restaurant> Restaurants { get; set; } = [];
    public List<Accommodation> Accommodations { get; set; } = [];
}

// ============================================================
// VisitingPlace
// ============================================================
public enum TicketType { None, Foreigner, Local, Student }

public sealed class VisitingPlace
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DestinationId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Location { get; set; }
    public string? OpeningHours { get; set; }
    public bool TicketRequired { get; set; } = false;
    public decimal? TicketPrice { get; set; }
    public TicketType TicketType { get; set; } = TicketType.None;
    public string? ImageUrls { get; set; }           // JSON array of URLs
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;

    // Navigation
    [JsonIgnore]
    public Destination? Destination { get; set; }
}

// ============================================================
// Restaurant
// ============================================================
public sealed class Restaurant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DestinationId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Location { get; set; }
    public string? Contact { get; set; }
    public string? Description { get; set; }
    public string? ImageUrls { get; set; }           // JSON array of URLs
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;

    // Navigation
    [JsonIgnore]
    public Destination? Destination { get; set; }
    public List<FoodItem> FoodItems { get; set; } = [];
}

// ============================================================
// FoodItem — belongs to a Restaurant
// ============================================================
public enum FoodCategory { Breakfast, Lunch, Dinner, Snack, Beverage }

public sealed class FoodItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RestaurantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public FoodCategory Category { get; set; } = FoodCategory.Lunch;
    public string? ImageUrl { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [JsonIgnore]
    public Restaurant? Restaurant { get; set; }
}

// ============================================================
// Accommodation
// ============================================================
public enum AccommodationType { Hotel, GuestHouse, Homestay, Villa, Hostel }

public sealed class Accommodation
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DestinationId { get; set; }
    public string Name { get; set; } = string.Empty;
    public AccommodationType Type { get; set; } = AccommodationType.Hotel;
    public string? Location { get; set; }
    public decimal? PricePerNight { get; set; }
    public string? SpecialNotes { get; set; }
    public string? Amenities { get; set; }           // JSON array: ["WiFi","AC","Pool","Breakfast"]
    public string? ImageUrls { get; set; }           // JSON array of URLs
    public string? ContactNumber { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;

    // Navigation
    [JsonIgnore]
    public Destination? Destination { get; set; }
}
