using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelWise.Api.Common;
using TravelWise.Api.Contracts;
using TravelWise.Api.Data;
using TravelWise.Api.Models;

namespace TravelWise.Api.Controllers;

/// <summary>
/// Full CRUD for Destinations and their sub-entities:
/// VisitingPlaces, Restaurants, FoodItems, Accommodations.
/// Only ServiceProviders and Admins can create/edit/delete.
/// Public read is allowed for AI-agent consumption.
/// </summary>
[ApiController, Route("api/destinations")]
public sealed class DestinationsController(TravelWiseDbContext db) : ControllerBase
{
    private string UserId() => AuthHelper.GetCurrentUserId(HttpContext) ?? "unknown";
    private bool IsAdmin() => AuthHelper.IsAdmin(HttpContext);
    private string Role() => AuthHelper.GetCurrentRole(HttpContext);

    private bool CanWrite() =>
        IsAdmin() || Role().Equals("ServiceProvider", StringComparison.OrdinalIgnoreCase);

    // =========================================================================
    // Destinations CRUD
    // =========================================================================

    [AllowAnonymous, HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] string? status, [FromQuery] bool? verifiedOnly, CancellationToken ct)
    {
        var q = db.Destinations.Where(x => x.IsActive);

        // If public (non-admin, non-provider) or verifiedOnly requested, only return Verified
        if (verifiedOnly == true || (!CanWrite() && string.IsNullOrWhiteSpace(status)))
        {
            q = q.Where(x => x.Status == "Verified");
        }
        else if (!string.IsNullOrWhiteSpace(status))
        {
            q = q.Where(x => x.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(x => x.Name.ToLower().Contains(search.ToLower().Trim()));

        var list = await q.OrderBy(x => x.Name).ToListAsync(ct);
        return Ok(list);
    }

    [AllowAnonymous, HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var dest = await db.Destinations
            .Include(x => x.VisitingPlaces.Where(vp => vp.IsActive))
            .Include(x => x.Restaurants.Where(r => r.IsActive))
                .ThenInclude(r => r.FoodItems)
            .Include(x => x.Accommodations.Where(a => a.IsActive))
            .FirstOrDefaultAsync(x => x.Id == id && x.IsActive, ct);

        return dest is null ? NotFound() : Ok(dest);
    }

    [HttpGet("mine")]
    public async Task<IActionResult> Mine([FromQuery] string? status, [FromQuery] string? filter, CancellationToken ct)
    {
        var uid = UserId();
        var q = db.Destinations.Where(x => x.IsActive);

        if (IsAdmin())
        {
            if (filter == "admin")
            {
                q = q.Where(x => x.CreatedBy == uid || x.AdminFeedback == "Official Admin Listing");
            }
            else if (filter == "partner")
            {
                q = q.Where(x => x.CreatedBy != uid && x.AdminFeedback != "Official Admin Listing");
            }
            // default: all active destinations for Admin (shared administrative space)
        }
        else
        {
            if (string.IsNullOrWhiteSpace(uid) || uid == "unknown")
            {
                return Ok(new List<Destination>());
            }

            var email = AuthHelper.GetCurrentUserEmail(HttpContext);
            var account = await db.UserAccounts.FirstOrDefaultAsync(u =>
                u.Id.ToString() == uid || u.Email == uid || (!string.IsNullOrWhiteSpace(email) && u.Email == email), ct);
            var targetId = account?.Id.ToString() ?? uid;
            var targetEmail = account?.Email ?? email;

            q = q.Where(x => x.CreatedBy == targetId || (!string.IsNullOrWhiteSpace(targetEmail) && x.CreatedBy == targetEmail));
        }

        if (!string.IsNullOrWhiteSpace(status))
            q = q.Where(x => x.Status == status);

        var list = await q
            .Include(x => x.VisitingPlaces.Where(vp => vp.IsActive))
            .Include(x => x.Restaurants.Where(r => r.IsActive))
                .ThenInclude(r => r.FoodItems)
            .Include(x => x.Accommodations.Where(a => a.IsActive))
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(ct);
        return Ok(list);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateDestinationRequest req, CancellationToken ct)
    {
        if (!CanWrite())
            return Forbid();
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { error = "Destination name is required." });

        var isAdmin = IsAdmin();
        var dest = new Destination
        {
            Name = req.Name.Trim(),
            Description = req.Description?.Trim(),
            Region = req.Region?.Trim(),
            CreatedBy = UserId(),
            Status = isAdmin ? "Verified" : "NotVerified",
            VerifiedAt = isAdmin ? DateTime.UtcNow : null,
            VerifiedBy = isAdmin ? "System Administrator" : null,
            AdminFeedback = isAdmin ? "Official Admin Listing" : null
        };
        db.Destinations.Add(dest);
        await db.SaveChangesAsync(ct);
        return Created($"/api/destinations/{dest.Id}", dest);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateDestinationRequest req, CancellationToken ct)
    {
        var dest = await db.Destinations.FindAsync([id], ct);
        if (dest is null) return NotFound();
        if (!IsAdmin() && dest.CreatedBy != UserId()) return Forbid();

        dest.Name = req.Name.Trim();
        dest.Description = req.Description?.Trim();
        dest.Region = req.Region?.Trim();
        if (dest.Status == "Verified" && !IsAdmin())
        {
            dest.Status = "Pending";
        }
        dest.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Ok(dest);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var dest = await db.Destinations.FindAsync([id], ct);
        if (dest is null) return NotFound();
        if (!IsAdmin() && dest.CreatedBy != UserId()) return Forbid();

        dest.IsActive = false;
        dest.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // =========================================================================
    // Destination Verification Workflow
    // =========================================================================

    [HttpPost("{id:guid}/submit-for-verification")]
    public async Task<IActionResult> SubmitForVerification(Guid id, CancellationToken ct)
    {
        if (!CanWrite()) return Forbid();
        var dest = await db.Destinations.FindAsync([id], ct);
        if (dest is null) return NotFound();
        if (!IsAdmin() && dest.CreatedBy != UserId()) return Forbid();

        dest.Status = "Pending";
        dest.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Ok(dest);
    }

    [HttpGet("admin/pending")]
    public async Task<IActionResult> GetPendingForAdmin(CancellationToken ct)
    {
        if (!IsAdmin()) return Forbid();
        var list = await db.Destinations
            .Include(x => x.VisitingPlaces.Where(vp => vp.IsActive))
            .Include(x => x.Restaurants.Where(r => r.IsActive))
                .ThenInclude(r => r.FoodItems)
            .Include(x => x.Accommodations.Where(a => a.IsActive))
            .Where(x => x.IsActive && x.Status == "Pending")
            .OrderByDescending(x => x.UpdatedAt)
            .ToListAsync(ct);
        return Ok(list);
    }

    [HttpPost("{id:guid}/verify")]
    public async Task<IActionResult> Verify(Guid id, CancellationToken ct)
    {
        if (!IsAdmin()) return Forbid();
        var dest = await db.Destinations.FindAsync([id], ct);
        if (dest is null) return NotFound();

        dest.Status = "Verified";
        dest.VerifiedAt = DateTime.UtcNow;
        dest.VerifiedBy = UserId();
        dest.AdminFeedback = null;
        dest.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Ok(dest);
    }

    public sealed record RejectDestinationRequest(string? Feedback);

    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> Reject(Guid id, [FromBody] RejectDestinationRequest? req, CancellationToken ct)
    {
        if (!IsAdmin()) return Forbid();
        var dest = await db.Destinations.FindAsync([id], ct);
        if (dest is null) return NotFound();

        dest.Status = "Rejected";
        dest.AdminFeedback = req?.Feedback?.Trim();
        dest.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Ok(dest);
    }

    // =========================================================================
    // Visiting Places
    // =========================================================================

    [AllowAnonymous, HttpGet("{destId:guid}/visiting-places")]
    public async Task<IActionResult> GetVisitingPlaces(Guid destId, CancellationToken ct)
    {
        var items = await db.VisitingPlaces
            .Where(x => x.DestinationId == destId && x.IsActive)
            .OrderBy(x => x.Name).ToListAsync(ct);
        return Ok(items);
    }

    [HttpPost("{destId:guid}/visiting-places")]
    public async Task<IActionResult> AddVisitingPlace(Guid destId, CreateVisitingPlaceRequest req, CancellationToken ct)
    {
        if (!CanWrite()) return Forbid();
        var dest = await db.Destinations.FindAsync([destId], ct);
        if (dest is null) return NotFound(new { error = "Destination not found." });
        if (!IsAdmin() && dest.CreatedBy != UserId()) return Forbid();

        var vp = new VisitingPlace
        {
            DestinationId = destId,
            Name = req.Name.Trim(),
            Description = req.Description?.Trim(),
            Location = req.Location?.Trim(),
            OpeningHours = req.OpeningHours?.Trim(),
            TicketRequired = req.TicketRequired,
            TicketPrice = req.TicketPrice,
            TicketType = req.TicketType,
            ImageUrls = req.ImageUrls is { Count: > 0 } ? JsonSerializer.Serialize(req.ImageUrls) : null,
            CreatedBy = UserId()
        };
        db.VisitingPlaces.Add(vp);
        await db.SaveChangesAsync(ct);
        return Created($"/api/destinations/{destId}/visiting-places", vp);
    }

    [HttpPut("visiting-places/{id:guid}")]
    public async Task<IActionResult> UpdateVisitingPlace(Guid id, UpdateVisitingPlaceRequest req, CancellationToken ct)
    {
        var vp = await db.VisitingPlaces.FindAsync([id], ct);
        if (vp is null) return NotFound();
        if (!IsAdmin() && vp.CreatedBy != UserId()) return Forbid();

        vp.Name = req.Name.Trim();
        vp.Description = req.Description?.Trim();
        vp.Location = req.Location?.Trim();
        vp.OpeningHours = req.OpeningHours?.Trim();
        vp.TicketRequired = req.TicketRequired;
        vp.TicketPrice = req.TicketPrice;
        vp.TicketType = req.TicketType;
        vp.ImageUrls = req.ImageUrls is { Count: > 0 } ? JsonSerializer.Serialize(req.ImageUrls) : vp.ImageUrls;
        vp.IsActive = req.IsActive;
        vp.UpdatedAt = DateTime.UtcNow;

        var dest = await db.Destinations.FindAsync([vp.DestinationId], ct);
        if (dest != null && dest.Status == "Verified" && !IsAdmin())
        {
            dest.Status = "Pending";
            dest.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(ct);
        return Ok(vp);
    }

    [HttpDelete("visiting-places/{id:guid}")]
    public async Task<IActionResult> DeleteVisitingPlace(Guid id, CancellationToken ct)
    {
        var vp = await db.VisitingPlaces.FindAsync([id], ct);
        if (vp is null) return NotFound();
        if (!IsAdmin() && vp.CreatedBy != UserId()) return Forbid();
        vp.IsActive = false; vp.UpdatedAt = DateTime.UtcNow;

        var dest = await db.Destinations.FindAsync([vp.DestinationId], ct);
        if (dest != null && dest.Status == "Verified" && !IsAdmin())
        {
            dest.Status = "Pending";
            dest.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // =========================================================================
    // Restaurants
    // =========================================================================

    [AllowAnonymous, HttpGet("{destId:guid}/restaurants")]
    public async Task<IActionResult> GetRestaurants(Guid destId, CancellationToken ct)
    {
        var items = await db.Restaurants
            .Include(r => r.FoodItems)
            .Where(x => x.DestinationId == destId && x.IsActive)
            .OrderBy(x => x.Name).ToListAsync(ct);
        return Ok(items);
    }

    [HttpPost("{destId:guid}/restaurants")]
    public async Task<IActionResult> AddRestaurant(Guid destId, CreateRestaurantRequest req, CancellationToken ct)
    {
        if (!CanWrite()) return Forbid();
        var dest = await db.Destinations.FindAsync([destId], ct);
        if (dest is null) return NotFound(new { error = "Destination not found." });
        if (!IsAdmin() && dest.CreatedBy != UserId()) return Forbid();

        var r = new Restaurant
        {
            DestinationId = destId,
            Name = req.Name.Trim(),
            Location = req.Location?.Trim(),
            Contact = req.Contact?.Trim(),
            Description = req.Description?.Trim(),
            ImageUrls = req.ImageUrls is { Count: > 0 } ? JsonSerializer.Serialize(req.ImageUrls) : null,
            CreatedBy = UserId()
        };
        db.Restaurants.Add(r);
        await db.SaveChangesAsync(ct);
        return Created($"/api/destinations/{destId}/restaurants", r);
    }

    [HttpPut("restaurants/{id:guid}")]
    public async Task<IActionResult> UpdateRestaurant(Guid id, UpdateRestaurantRequest req, CancellationToken ct)
    {
        var r = await db.Restaurants.FindAsync([id], ct);
        if (r is null) return NotFound();
        if (!IsAdmin() && r.CreatedBy != UserId()) return Forbid();

        r.Name = req.Name.Trim();
        r.Location = req.Location?.Trim();
        r.Contact = req.Contact?.Trim();
        r.Description = req.Description?.Trim();
        r.ImageUrls = req.ImageUrls is { Count: > 0 } ? JsonSerializer.Serialize(req.ImageUrls) : r.ImageUrls;
        r.IsActive = req.IsActive;
        r.UpdatedAt = DateTime.UtcNow;

        var dest = await db.Destinations.FindAsync([r.DestinationId], ct);
        if (dest != null && dest.Status == "Verified" && !IsAdmin())
        {
            dest.Status = "Pending";
            dest.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(ct);
        return Ok(r);
    }

    [HttpDelete("restaurants/{id:guid}")]
    public async Task<IActionResult> DeleteRestaurant(Guid id, CancellationToken ct)
    {
        var r = await db.Restaurants.FindAsync([id], ct);
        if (r is null) return NotFound();
        if (!IsAdmin() && r.CreatedBy != UserId()) return Forbid();
        r.IsActive = false; r.UpdatedAt = DateTime.UtcNow;

        var dest = await db.Destinations.FindAsync([r.DestinationId], ct);
        if (dest != null && dest.Status == "Verified" && !IsAdmin())
        {
            dest.Status = "Pending";
            dest.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // =========================================================================
    // Food Items
    // =========================================================================

    [AllowAnonymous, HttpGet("restaurants/{restaurantId:guid}/food-items")]
    public async Task<IActionResult> GetFoodItems(Guid restaurantId, CancellationToken ct)
    {
        var items = await db.FoodItems
            .Where(x => x.RestaurantId == restaurantId)
            .OrderBy(x => x.Category).ThenBy(x => x.Name).ToListAsync(ct);
        return Ok(items);
    }

    [HttpPost("restaurants/{restaurantId:guid}/food-items")]
    public async Task<IActionResult> AddFoodItem(Guid restaurantId, CreateFoodItemRequest req, CancellationToken ct)
    {
        if (!CanWrite()) return Forbid();
        var rest = await db.Restaurants.FindAsync([restaurantId], ct);
        if (rest is null) return NotFound(new { error = "Restaurant not found." });
        if (!IsAdmin() && rest.CreatedBy != UserId()) return Forbid();

        if (req.Price < 0) return BadRequest(new { error = "Price cannot be negative." });

        var fi = new FoodItem
        {
            RestaurantId = restaurantId,
            Name = req.Name.Trim(),
            Price = req.Price,
            Category = req.Category,
            ImageUrl = req.ImageUrl?.Trim(),
            CreatedBy = UserId()
        };
        db.FoodItems.Add(fi);
        await db.SaveChangesAsync(ct);
        return Created($"/api/destinations/restaurants/{restaurantId}/food-items", fi);
    }

    [HttpPut("food-items/{id:guid}")]
    public async Task<IActionResult> UpdateFoodItem(Guid id, UpdateFoodItemRequest req, CancellationToken ct)
    {
        var fi = await db.FoodItems.FindAsync([id], ct);
        if (fi is null) return NotFound();
        if (!IsAdmin() && fi.CreatedBy != UserId()) return Forbid();

        fi.Name = req.Name.Trim();
        fi.Price = req.Price;
        fi.Category = req.Category;
        fi.ImageUrl = req.ImageUrl?.Trim();
        fi.UpdatedAt = DateTime.UtcNow;

        var rest = await db.Restaurants.FindAsync([fi.RestaurantId], ct);
        if (rest != null)
        {
            var dest = await db.Destinations.FindAsync([rest.DestinationId], ct);
            if (dest != null && dest.Status == "Verified" && !IsAdmin())
            {
                dest.Status = "Pending";
                dest.UpdatedAt = DateTime.UtcNow;
            }
        }

        await db.SaveChangesAsync(ct);
        return Ok(fi);
    }

    [HttpDelete("food-items/{id:guid}")]
    public async Task<IActionResult> DeleteFoodItem(Guid id, CancellationToken ct)
    {
        var fi = await db.FoodItems.FindAsync([id], ct);
        if (fi is null) return NotFound();
        if (!IsAdmin() && fi.CreatedBy != UserId()) return Forbid();

        var rest = await db.Restaurants.FindAsync([fi.RestaurantId], ct);
        if (rest != null)
        {
            var dest = await db.Destinations.FindAsync([rest.DestinationId], ct);
            if (dest != null && dest.Status == "Verified" && !IsAdmin())
            {
                dest.Status = "Pending";
                dest.UpdatedAt = DateTime.UtcNow;
            }
        }

        db.FoodItems.Remove(fi);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // =========================================================================
    // Accommodations
    // =========================================================================

    [AllowAnonymous, HttpGet("{destId:guid}/accommodations")]
    public async Task<IActionResult> GetAccommodations(Guid destId, CancellationToken ct)
    {
        var items = await db.Accommodations
            .Where(x => x.DestinationId == destId && x.IsActive)
            .OrderBy(x => x.Name).ToListAsync(ct);
        return Ok(items);
    }

    [HttpPost("{destId:guid}/accommodations")]
    public async Task<IActionResult> AddAccommodation(Guid destId, CreateAccommodationRequest req, CancellationToken ct)
    {
        if (!CanWrite()) return Forbid();
        var dest = await db.Destinations.FindAsync([destId], ct);
        if (dest is null) return NotFound(new { error = "Destination not found." });
        if (!IsAdmin() && dest.CreatedBy != UserId()) return Forbid();

        if (req.PricePerNight is < 0) return BadRequest(new { error = "Price per night cannot be negative." });

        var acc = new Accommodation
        {
            DestinationId = destId,
            Name = req.Name.Trim(),
            Type = req.Type,
            Location = req.Location?.Trim(),
            PricePerNight = req.PricePerNight,
            SpecialNotes = req.SpecialNotes?.Trim(),
            Amenities = req.Amenities is { Count: > 0 } ? JsonSerializer.Serialize(req.Amenities) : null,
            ImageUrls = req.ImageUrls is { Count: > 0 } ? JsonSerializer.Serialize(req.ImageUrls) : null,
            ContactNumber = req.ContactNumber?.Trim(),
            CreatedBy = UserId()
        };
        db.Accommodations.Add(acc);
        await db.SaveChangesAsync(ct);
        return Created($"/api/destinations/{destId}/accommodations", acc);
    }

    [HttpPut("accommodations/{id:guid}")]
    public async Task<IActionResult> UpdateAccommodation(Guid id, UpdateAccommodationRequest req, CancellationToken ct)
    {
        var acc = await db.Accommodations.FindAsync([id], ct);
        if (acc is null) return NotFound();
        if (!IsAdmin() && acc.CreatedBy != UserId()) return Forbid();

        acc.Name = req.Name.Trim();
        acc.Type = req.Type;
        acc.Location = req.Location?.Trim();
        acc.PricePerNight = req.PricePerNight;
        acc.SpecialNotes = req.SpecialNotes?.Trim();
        acc.Amenities = req.Amenities is { Count: > 0 } ? JsonSerializer.Serialize(req.Amenities) : acc.Amenities;
        acc.ImageUrls = req.ImageUrls is { Count: > 0 } ? JsonSerializer.Serialize(req.ImageUrls) : acc.ImageUrls;
        acc.ContactNumber = req.ContactNumber?.Trim();
        acc.IsActive = req.IsActive;
        acc.UpdatedAt = DateTime.UtcNow;

        var dest = await db.Destinations.FindAsync([acc.DestinationId], ct);
        if (dest != null && dest.Status == "Verified" && !IsAdmin())
        {
            dest.Status = "Pending";
            dest.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(ct);
        return Ok(acc);
    }

    [HttpDelete("accommodations/{id:guid}")]
    public async Task<IActionResult> DeleteAccommodation(Guid id, CancellationToken ct)
    {
        var acc = await db.Accommodations.FindAsync([id], ct);
        if (acc is null) return NotFound();
        if (!IsAdmin() && acc.CreatedBy != UserId()) return Forbid();
        acc.IsActive = false; acc.UpdatedAt = DateTime.UtcNow;

        var dest = await db.Destinations.FindAsync([acc.DestinationId], ct);
        if (dest != null && dest.Status == "Verified" && !IsAdmin())
        {
            dest.Status = "Pending";
            dest.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // =========================================================================
    // Food Prices View — Aggregated food items across all restaurants in a dest
    // =========================================================================

    [AllowAnonymous, HttpGet("{destId:guid}/food-prices")]
    public async Task<IActionResult> GetFoodPrices(
        Guid destId,
        [FromQuery] decimal? minPrice,
        [FromQuery] decimal? maxPrice,
        CancellationToken ct)
    {
        var q = db.FoodItems
            .Include(f => f.Restaurant)
            .Where(f => f.Restaurant != null && f.Restaurant.DestinationId == destId && f.Restaurant.IsActive);

        if (minPrice.HasValue) q = q.Where(f => f.Price >= minPrice.Value);
        if (maxPrice.HasValue) q = q.Where(f => f.Price <= maxPrice.Value);

        var items = await q
            .OrderBy(f => f.Category)
            .ThenBy(f => f.Price)
            .Select(f => new
            {
                f.Id,
                f.Name,
                f.Price,
                f.Category,
                f.ImageUrl,
                RestaurantName = f.Restaurant!.Name,
                RestaurantId = f.Restaurant.Id
            })
            .ToListAsync(ct);

        return Ok(items);
    }

    // =========================================================================
    // Pricing Lookup for AI Agent (Method ii - Local Provider Listings Data)
    // =========================================================================

    [AllowAnonymous, HttpGet("pricing-lookup")]
    public async Task<IActionResult> GetPricingLookup([FromQuery] string destination, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(destination))
            return BadRequest(new { error = "Destination query parameter is required." });

        var destTerm = destination.Trim().ToLowerInvariant();

        // 1. Find matching destination by Name or Region
        var matchedDest = await db.Destinations
            .Include(d => d.VisitingPlaces.Where(vp => vp.IsActive))
            .Include(d => d.Restaurants.Where(r => r.IsActive))
                .ThenInclude(r => r.FoodItems)
            .Include(d => d.Accommodations.Where(a => a.IsActive))
            .Where(d => d.IsActive && (EF.Functions.ILike(d.Name, $"%{destTerm}%") || (d.Region != null && EF.Functions.ILike(d.Region, $"%{destTerm}%"))))
            .OrderByDescending(d => d.Status == "Verified")
            .ThenByDescending(d => d.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (matchedDest is null)
        {
            return Ok(new
            {
                destination,
                found = false,
                hasAccommodationData = false,
                hasFoodData = false,
                hasTicketData = false
            });
        }

        // 2. Also query TravelCatalogItems for this destination
        var catalogItems = await db.TravelCatalogItems
            .Where(x => x.IsActive && EF.Functions.ILike(x.Destination, $"%{destTerm}%"))
            .ToListAsync(ct);

        // 3. Compute Accommodation rates (combining Destinations Accommodations and Catalog items)
        var accPrices = new List<decimal>();
        var accSamples = new List<object>();

        if (matchedDest != null)
        {
            foreach (var a in matchedDest.Accommodations.Where(x => x.PricePerNight.HasValue && x.PricePerNight.Value > 0))
            {
                accPrices.Add(a.PricePerNight!.Value);
                if (accSamples.Count < 3)
                    accSamples.Add(new { a.Name, PricePerNight = a.PricePerNight!.Value, Type = a.Type.ToString() });
            }
        }

        foreach (var c in catalogItems.Where(x => x.Type == CatalogItemType.Accommodation && x.Price.HasValue && x.Price.Value > 0))
        {
            accPrices.Add(c.Price!.Value);
            if (accSamples.Count < 3)
                accSamples.Add(new { c.Name, PricePerNight = c.Price!.Value, Type = "Catalog Stay" });
        }

        decimal? avgAccommodationPrice = accPrices.Count > 0
            ? Math.Round(accPrices.Average(), 2)
            : null;

        // 4. Compute Food prices (dishes across restaurants in destination + catalog dining)
        var foodPrices = new List<decimal>();
        var restaurantSamples = new List<object>();

        if (matchedDest != null)
        {
            foreach (var r in matchedDest.Restaurants)
            {
                if (restaurantSamples.Count < 3)
                    restaurantSamples.Add(new { r.Name, DishesCount = r.FoodItems.Count });
                foreach (var f in r.FoodItems.Where(x => x.Price > 0))
                {
                    foodPrices.Add(f.Price);
                }
            }
        }

        foreach (var c in catalogItems.Where(x => x.Type == CatalogItemType.Restaurant && x.Price.HasValue && x.Price.Value > 0))
        {
            foodPrices.Add(c.Price!.Value);
            if (restaurantSamples.Count < 3)
                restaurantSamples.Add(new { c.Name, DishesCount = 1 });
        }

        decimal? avgFoodItemPrice = foodPrices.Count > 0
            ? Math.Round(foodPrices.Average(), 2)
            : null;

        decimal? avgDailyFoodPerPerson = avgFoodItemPrice.HasValue
            ? Math.Round(avgFoodItemPrice.Value * 3m, 2)
            : null;

        // 5. Compute Visiting Places tickets (monuments, heritage, botanical gardens)
        var ticketPrices = new List<decimal>();
        var ticketSamples = new List<object>();

        if (matchedDest != null)
        {
            foreach (var vp in matchedDest.VisitingPlaces.Where(x => x.TicketRequired && x.TicketPrice.HasValue && x.TicketPrice.Value > 0))
            {
                ticketPrices.Add(vp.TicketPrice!.Value);
                if (ticketSamples.Count < 3)
                    ticketSamples.Add(new { vp.Name, TicketPrice = vp.TicketPrice!.Value });
            }
        }

        foreach (var c in catalogItems.Where(x => x.Type == CatalogItemType.VisitingPlace && x.Price.HasValue && x.Price.Value > 0))
        {
            ticketPrices.Add(c.Price!.Value);
            if (ticketSamples.Count < 3)
                ticketSamples.Add(new { c.Name, TicketPrice = c.Price!.Value });
        }

        decimal totalTicketPrices = ticketPrices.Sum();

        bool found = matchedDest != null || catalogItems.Count > 0;
        string destName = matchedDest?.Name ?? (catalogItems.Count > 0 ? catalogItems[0].Destination : destination);

        return Ok(new
        {
            destination,
            matchedDestinationName = destName,
            destinationId = matchedDest?.Id,
            destinationStatus = matchedDest?.Status ?? (catalogItems.Count > 0 ? "VerifiedCatalog" : "None"),
            found,
            // Accommodations
            hasAccommodationData = accPrices.Count > 0,
            accommodationsCount = accPrices.Count,
            avgPricePerNight = avgAccommodationPrice,
            minPricePerNight = accPrices.Count > 0 ? accPrices.Min() : (decimal?)null,
            maxPricePerNight = accPrices.Count > 0 ? accPrices.Max() : (decimal?)null,
            sampleAccommodations = accSamples,
            // Food
            hasFoodData = foodPrices.Count > 0,
            foodItemsCount = foodPrices.Count,
            avgFoodItemPrice,
            avgDailyFoodPerPerson,
            sampleRestaurants = restaurantSamples,
            // Tickets
            hasTicketData = ticketPrices.Count > 0,
            ticketPlacesCount = ticketPrices.Count,
            totalTicketPrices,
            sampleTicketPlaces = ticketSamples
        });
    }

    /// <summary>
    /// Returns service provider & admin published listings (Accommodations, Restaurants/Food, Rental Vehicles, Visiting Places)
    /// matching a traveler's wizard inputs (destination, vehicleType).
    /// </summary>
    [AllowAnonymous, HttpGet("matching-listings")]
    public async Task<IActionResult> GetMatchingListings(
        [FromQuery] string? destination,
        [FromQuery] string? vehicleType,
        CancellationToken ct)
    {
        var destQuery = (destination ?? "").Trim().ToLower();

        // 1. Find matching Destination entity
        Destination? matchedDest = null;
        if (!string.IsNullOrWhiteSpace(destQuery))
        {
            matchedDest = await db.Destinations
                .Include(x => x.VisitingPlaces.Where(vp => vp.IsActive))
                .Include(x => x.Restaurants.Where(r => r.IsActive))
                    .ThenInclude(r => r.FoodItems)
                .Include(x => x.Accommodations.Where(a => a.IsActive))
                .FirstOrDefaultAsync(x => x.IsActive && (x.Name.ToLower() == destQuery || x.Name.ToLower().Contains(destQuery) || destQuery.Contains(x.Name.ToLower())), ct);
        }

        // 2. Find matching Catalog items for destination
        var catalogItems = new List<TravelCatalogItem>();
        if (!string.IsNullOrWhiteSpace(destQuery))
        {
            catalogItems = await db.TravelCatalogItems
                .Where(x => x.IsApproved && (x.Destination.ToLower() == destQuery || x.Destination.ToLower().Contains(destQuery) || destQuery.Contains(x.Destination.ToLower())))
                .ToListAsync(ct);
        }

        // 3. Collect Accommodations
        var accommodations = new List<object>();
        if (matchedDest != null)
        {
            foreach (var a in matchedDest.Accommodations)
            {
                accommodations.Add(new
                {
                    id = a.Id,
                    name = a.Name,
                    type = a.Type.ToString(),
                    pricePerNight = a.PricePerNight ?? 0m,
                    location = a.Location,
                    contactNumber = a.ContactNumber,
                    specialNotes = a.SpecialNotes,
                    amenities = a.Amenities,
                    imageUrls = a.ImageUrls,
                    source = "Verified Destination Accommodation"
                });
            }
        }
        foreach (var c in catalogItems.Where(x => x.Type == CatalogItemType.Accommodation))
        {
            accommodations.Add(new
            {
                id = c.Id,
                name = c.Name,
                type = "Hotel",
                pricePerNight = c.Price ?? 0m,
                location = c.Address,
                contactNumber = "",
                specialNotes = c.Description,
                amenities = "",
                imageUrls = "",
                source = "Service Provider Published Catalog"
            });
        }

        // 4. Collect Restaurants & Food
        var restaurants = new List<object>();
        if (matchedDest != null)
        {
            foreach (var r in matchedDest.Restaurants)
            {
                var dishes = r.FoodItems.Select(f => new
                {
                    id = f.Id,
                    name = f.Name,
                    price = f.Price,
                    category = f.Category.ToString(),
                    imageUrl = f.ImageUrl
                }).ToList();

                restaurants.Add(new
                {
                    id = r.Id,
                    name = r.Name,
                    location = r.Location,
                    contact = r.Contact,
                    description = r.Description,
                    imageUrls = r.ImageUrls,
                    dishes,
                    source = "Verified Destination Restaurant"
                });
            }
        }
        foreach (var c in catalogItems.Where(x => x.Type == CatalogItemType.Restaurant))
        {
            restaurants.Add(new
            {
                id = c.Id,
                name = c.Name,
                location = c.Address,
                contact = "",
                description = c.Description,
                imageUrls = "",
                dishes = new List<object>(),
                source = "Service Provider Published Catalog"
            });
        }

        // 5. Collect Rental Vehicles
        var vehicleQuery = db.RentalVehicleListings.Where(x => x.IsActive && x.Status == "Approved");
        var normVehType = (vehicleType ?? "").Trim().ToLower();
        var rentalVehiclesList = await vehicleQuery.ToListAsync(ct);

        if (!string.IsNullOrWhiteSpace(normVehType))
        {
            rentalVehiclesList = rentalVehiclesList
                .OrderByDescending(v => v.VehicleType.ToLower().Contains(normVehType) || normVehType.Contains(v.VehicleType.ToLower()))
                .ThenBy(v => v.RatePerKm)
                .ToList();
        }
        else
        {
            rentalVehiclesList = rentalVehiclesList.OrderBy(v => v.RatePerKm).ToList();
        }

        var rentalVehicles = rentalVehiclesList.Take(6).Select(v => new
        {
            id = v.Id,
            vehicleType = v.VehicleType,
            vehicleModel = v.VehicleModel,
            manufacturingYear = v.ManufacturingYear,
            ownerContactPhone = v.OwnerContactPhone,
            ratePerKm = v.RatePerKm,
            extraChargePerNight = v.ExtraChargePerNight,
            location = v.Location,
            seatingCapacity = v.SeatingCapacity,
            driverIncluded = v.DriverIncluded,
            providerName = v.ProviderName ?? "Verified Fleet Partner",
            source = "Service Provider Rental Vehicle"
        }).ToList();

        // 6. Collect Visiting Places
        var visitingPlaces = new List<object>();
        if (matchedDest != null)
        {
            foreach (var vp in matchedDest.VisitingPlaces)
            {
                visitingPlaces.Add(new
                {
                    id = vp.Id,
                    name = vp.Name,
                    description = vp.Description,
                    location = vp.Location,
                    openingHours = vp.OpeningHours,
                    ticketRequired = vp.TicketRequired,
                    ticketPrice = vp.TicketPrice,
                    ticketType = vp.TicketType.ToString(),
                    imageUrls = vp.ImageUrls,
                    source = "Verified Destination Attraction"
                });
            }
        }
        foreach (var c in catalogItems.Where(x => x.Type == CatalogItemType.VisitingPlace))
        {
            visitingPlaces.Add(new
            {
                id = c.Id,
                name = c.Name,
                description = c.Description,
                location = c.Address,
                openingHours = "Daytime",
                ticketRequired = c.Price.HasValue && c.Price > 0,
                ticketPrice = c.Price,
                ticketType = "Standard",
                imageUrls = "",
                source = "Service Provider Published Catalog"
            });
        }

        return Ok(new
        {
            destination = matchedDest?.Name ?? destination,
            matched = matchedDest != null || catalogItems.Count > 0,
            accommodations,
            restaurants,
            rentalVehicles,
            visitingPlaces
        });
    }
}

