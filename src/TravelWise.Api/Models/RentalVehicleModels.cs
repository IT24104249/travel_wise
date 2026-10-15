namespace TravelWise.Api.Models;

public sealed class RentalVehicleListing
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string VehicleType { get; set; } = "Car"; // "Bike", "Car", "Van", "Bus", "TukTuk"
    public string VehicleModel { get; set; } = string.Empty; // e.g., "Toyota KDH", "Honda Vezel", "Bajaj RE"
    public int ManufacturingYear { get; set; } = DateTime.UtcNow.Year;
    public string OwnerContactPhone { get; set; } = string.Empty; // Owner's mobile number
    public decimal RatePerKm { get; set; } // Rate per 1 KM in LKR (Rs.)
    public decimal ExtraChargePerNight { get; set; } // Extra charge per 1 night stay in LKR (Rs.)
    public string Location { get; set; } = "Colombo"; // Base operating location / district
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public bool DriverIncluded { get; set; } = true;
    public int SeatingCapacity { get; set; } = 4;
    public string Status { get; set; } = "PendingReview"; // "PendingReview", "Approved", "Rejected"
    public string? AdminFeedback { get; set; }
    public string ProviderUserId { get; set; } = string.Empty;
    public string? ProviderEmail { get; set; }
    public string? ProviderName { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewedByUserId { get; set; }
    public bool IsActive { get; set; } = true;
}

public sealed class CreateRentalVehicleRequest
{
    public string VehicleType { get; set; } = "Car";
    public string VehicleModel { get; set; } = string.Empty;
    public int ManufacturingYear { get; set; }
    public string OwnerContactPhone { get; set; } = string.Empty;
    public decimal RatePerKm { get; set; }
    public decimal ExtraChargePerNight { get; set; }
    public string? Location { get; set; }
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public bool? DriverIncluded { get; set; }
    public int? SeatingCapacity { get; set; }
}

public sealed class UpdateRentalVehicleRequest
{
    public string? VehicleType { get; set; }
    public string? VehicleModel { get; set; }
    public int? ManufacturingYear { get; set; }
    public string? OwnerContactPhone { get; set; }
    public decimal? RatePerKm { get; set; }
    public decimal? ExtraChargePerNight { get; set; }
    public string? Location { get; set; }
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public bool? DriverIncluded { get; set; }
    public int? SeatingCapacity { get; set; }
}

public sealed class ReviewRentalVehicleRequest
{
    public string Action { get; set; } = "approve"; // "approve" or "reject"
    public string? Feedback { get; set; }
}
