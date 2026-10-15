using TravelWise.Api.Models;

namespace TravelWise.Api.Contracts;

// ============================================================
// Destination Contracts
// ============================================================
public sealed record CreateDestinationRequest(
    string Name,
    string? Description = null,
    string? Region = null);

public sealed record UpdateDestinationRequest(
    string Name,
    string? Description = null,
    string? Region = null);

// ============================================================
// Visiting Place Contracts
// ============================================================
public sealed record CreateVisitingPlaceRequest(
    string Name,
    string? Description = null,
    string? Location = null,
    string? OpeningHours = null,
    bool TicketRequired = false,
    decimal? TicketPrice = null,
    TicketType TicketType = TicketType.None,
    List<string>? ImageUrls = null);

public sealed record UpdateVisitingPlaceRequest(
    string Name,
    string? Description = null,
    string? Location = null,
    string? OpeningHours = null,
    bool TicketRequired = false,
    decimal? TicketPrice = null,
    TicketType TicketType = TicketType.None,
    List<string>? ImageUrls = null,
    bool IsActive = true);

// ============================================================
// Restaurant Contracts
// ============================================================
public sealed record CreateRestaurantRequest(
    string Name,
    string? Location = null,
    string? Contact = null,
    string? Description = null,
    List<string>? ImageUrls = null);

public sealed record UpdateRestaurantRequest(
    string Name,
    string? Location = null,
    string? Contact = null,
    string? Description = null,
    List<string>? ImageUrls = null,
    bool IsActive = true);

// ============================================================
// Food Item Contracts
// ============================================================
public sealed record CreateFoodItemRequest(
    string Name,
    decimal Price,
    FoodCategory Category = FoodCategory.Lunch,
    string? ImageUrl = null);

public sealed record UpdateFoodItemRequest(
    string Name,
    decimal Price,
    FoodCategory Category = FoodCategory.Lunch,
    string? ImageUrl = null);

// ============================================================
// Accommodation Contracts
// ============================================================
public sealed record CreateAccommodationRequest(
    string Name,
    AccommodationType Type = AccommodationType.Hotel,
    string? Location = null,
    decimal? PricePerNight = null,
    string? SpecialNotes = null,
    List<string>? Amenities = null,
    List<string>? ImageUrls = null,
    string? ContactNumber = null);

public sealed record UpdateAccommodationRequest(
    string Name,
    AccommodationType Type = AccommodationType.Hotel,
    string? Location = null,
    decimal? PricePerNight = null,
    string? SpecialNotes = null,
    List<string>? Amenities = null,
    List<string>? ImageUrls = null,
    string? ContactNumber = null,
    bool IsActive = true);
