using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelWise.Api.Common;
using TravelWise.Api.Data;
using TravelWise.Api.Models;

namespace TravelWise.Api.Controllers;

[ApiController, Route("api/rental-vehicles")]
public sealed class RentalVehiclesController(TravelWiseDbContext db, ILogger<RentalVehiclesController> logger) : ControllerBase
{
    private string CurrentUserId() => AuthHelper.GetCurrentUserId(HttpContext) ?? "unknown";
    private bool IsAdmin() => AuthHelper.IsAdmin(HttpContext);
    private string CurrentRole() => AuthHelper.GetCurrentRole(HttpContext);

    private static readonly HashSet<string> ValidVehicleTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "Bike", "Car", "Van", "Bus", "TukTuk", "ThreeWheeler"
    };

    private static string NormalizeVehicleType(string type)
    {
        var t = (type ?? "").Trim();
        if (t.Equals("ThreeWheeler", StringComparison.OrdinalIgnoreCase) || t.Equals("Three-Wheeler", StringComparison.OrdinalIgnoreCase))
            return "TukTuk";
        if (t.Equals("Motorbike", StringComparison.OrdinalIgnoreCase) || t.Equals("Motorcycle", StringComparison.OrdinalIgnoreCase))
            return "Bike";
        return char.ToUpper(t[0]) + t[1..].ToLower();
    }

    /// <summary>
    /// List rental vehicle listings with optional filters.
    /// Public/Travellers see only Approved listings.
    /// Service Providers see all Approved + their own Pending/Rejected listings.
    /// Staff Admins see all listings.
    /// </summary>
    [AllowAnonymous, HttpGet]
    public async Task<IActionResult> GetListings(
        [FromQuery] string? type,
        [FromQuery] string? location,
        [FromQuery] string? status,
        [FromQuery] bool? mine,
        CancellationToken ct)
    {
        var q = db.RentalVehicleListings.Where(x => x.IsActive);

        var role = CurrentRole();
        var userId = CurrentUserId();
        var isAdmin = IsAdmin();

        if (mine == true || (role.Equals("ServiceProvider", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(status) && status.Equals("Mine", StringComparison.OrdinalIgnoreCase)))
        {
            if (string.IsNullOrWhiteSpace(userId) || userId == "unknown")
            {
                return Ok(new List<RentalVehicleListing>());
            }
            var userEmail = AuthHelper.GetCurrentUserEmail(HttpContext);
            var account = await db.UserAccounts.FirstOrDefaultAsync(u =>
                u.Id.ToString() == userId || u.Email == userId || (!string.IsNullOrWhiteSpace(userEmail) && u.Email == userEmail), ct);
            var targetId = account?.Id.ToString() ?? userId;
            var targetEmail = account?.Email ?? userEmail;

            q = q.Where(x => x.ProviderUserId == targetId || (!string.IsNullOrWhiteSpace(targetEmail) && (x.ProviderUserId == targetEmail || x.ProviderEmail == targetEmail)));
        }
        else if (isAdmin)
        {
            if (!string.IsNullOrWhiteSpace(status) && !status.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                q = q.Where(x => x.Status == status);
            }
        }
        else if (role.Equals("ServiceProvider", StringComparison.OrdinalIgnoreCase))
        {
            // Provider sees Approved listings from everyone + their own Pending/Rejected listings
            if (!string.IsNullOrWhiteSpace(status) && !status.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                if (status.Equals("Approved", StringComparison.OrdinalIgnoreCase))
                {
                    q = q.Where(x => x.Status == "Approved");
                }
                else
                {
                    q = q.Where(x => x.Status == status && x.ProviderUserId == userId);
                }
            }
            else
            {
                q = q.Where(x => x.Status == "Approved" || x.ProviderUserId == userId);
            }
        }
        else
        {
            // Travellers / Public only see Approved vehicles
            q = q.Where(x => x.Status == "Approved");
        }

        if (!string.IsNullOrWhiteSpace(type) && !type.Equals("All", StringComparison.OrdinalIgnoreCase))
        {
            var normalizedType = NormalizeVehicleType(type);
            q = q.Where(x => x.VehicleType.ToLower() == normalizedType.ToLower() ||
                             (normalizedType == "TukTuk" && (x.VehicleType.ToLower() == "tuktuk" || x.VehicleType.ToLower() == "threewheeler")));
        }

        if (!string.IsNullOrWhiteSpace(location))
        {
            var loc = location.Trim().ToLower();
            q = q.Where(x => x.Location.ToLower().Contains(loc));
        }

        var list = await q.OrderByDescending(x => x.CreatedAt).ToListAsync(ct);
        return Ok(list);
    }

    /// <summary>
    /// Get a single rental vehicle listing by ID.
    /// </summary>
    [AllowAnonymous, HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var item = await db.RentalVehicleListings.FirstOrDefaultAsync(x => x.Id == id && x.IsActive, ct);
        if (item == null)
            return NotFound(new { error = "Rental vehicle listing not found." });

        var isAdmin = IsAdmin();
        var isOwner = item.ProviderUserId == CurrentUserId();

        if (item.Status != "Approved" && !isAdmin && !isOwner)
            return Forbid();

        return Ok(item);
    }

    /// <summary>
    /// Create a new Rental Vehicle Listing.
    /// Service Provider submission enters 'PendingReview' state awaiting admin verification.
    /// Admin submission is immediately 'Approved'.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRentalVehicleRequest req, CancellationToken ct)
    {
        var role = CurrentRole();
        var isAdmin = IsAdmin();
        var isProvider = role.Equals("ServiceProvider", StringComparison.OrdinalIgnoreCase);

        if (!isAdmin && !isProvider)
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Access Denied: Only registered Service Providers and Administrators can list rental vehicles." });

        // 1. Vehicle Type Validation
        if (string.IsNullOrWhiteSpace(req.VehicleType) || !ValidVehicleTypes.Contains(req.VehicleType.Trim()))
            return BadRequest(new { error = "Invalid vehicle type. Supported types: Bike, Car, Van, Bus, TukTuk (Three-Wheeler)." });

        // 2. Manufacturing Year Validation
        var currentYear = DateTime.UtcNow.Year;
        if (req.ManufacturingYear < 1985 || req.ManufacturingYear > currentYear + 1)
            return BadRequest(new { error = $"Manufacturing year must be between 1985 and {currentYear + 1}." });

        // 3. Mobile Number Validation
        if (string.IsNullOrWhiteSpace(req.OwnerContactPhone) || req.OwnerContactPhone.Trim().Length < 7)
            return BadRequest(new { error = "Valid owner's mobile contact number is required." });

        // 4. Rate per KM Validation
        if (req.RatePerKm <= 0)
            return BadRequest(new { error = "Rate per kilometer must be greater than 0 Rs." });

        // 5. Extra Charge per Night Validation
        if (req.ExtraChargePerNight < 0)
            return BadRequest(new { error = "Extra charge per 1 night cannot be negative." });

        var userId = CurrentUserId();
        var userEmail = AuthHelper.GetCurrentUserEmail(HttpContext) ?? "provider@travelwise.com";
        var normalizedType = NormalizeVehicleType(req.VehicleType);

        var listing = new RentalVehicleListing
        {
            VehicleType = normalizedType,
            VehicleModel = string.IsNullOrWhiteSpace(req.VehicleModel) ? $"{normalizedType} Rental" : req.VehicleModel.Trim(),
            ManufacturingYear = req.ManufacturingYear,
            OwnerContactPhone = req.OwnerContactPhone.Trim(),
            RatePerKm = Math.Round(req.RatePerKm, 2),
            ExtraChargePerNight = Math.Round(req.ExtraChargePerNight, 2),
            Location = string.IsNullOrWhiteSpace(req.Location) ? "Islandwide" : req.Location.Trim(),
            Description = req.Description?.Trim(),
            ImageUrl = req.ImageUrl?.Trim(),
            DriverIncluded = req.DriverIncluded ?? true,
            SeatingCapacity = req.SeatingCapacity is > 0 ? req.SeatingCapacity.Value : GetDefaultSeating(normalizedType),
            Status = isAdmin ? "Approved" : "PendingReview",
            ProviderUserId = userId,
            ProviderEmail = userEmail,
            ProviderName = userEmail.Split('@')[0],
            CreatedAt = DateTime.UtcNow,
            ReviewedAt = isAdmin ? DateTime.UtcNow : null,
            ReviewedByUserId = isAdmin ? userId : null,
            IsActive = true
        };

        db.RentalVehicleListings.Add(listing);
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Rental vehicle listing created. ID: {Id}, Type: {Type}, Status: {Status}, Provider: {User}",
            listing.Id, listing.VehicleType, listing.Status, userId);

        return CreatedAtAction(nameof(GetById), new { id = listing.Id }, listing);
    }

    /// <summary>
    /// Update an existing rental vehicle listing.
    /// If edited by a Service Provider, resets status to 'PendingReview' for Admin verification.
    /// </summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateRentalVehicleRequest req, CancellationToken ct)
    {
        var listing = await db.RentalVehicleListings.FirstOrDefaultAsync(x => x.Id == id && x.IsActive, ct);
        if (listing == null)
            return NotFound(new { error = "Rental vehicle listing not found." });

        var isAdmin = IsAdmin();
        var userId = CurrentUserId();

        if (!isAdmin && listing.ProviderUserId != userId)
            return Forbid();

        if (!string.IsNullOrWhiteSpace(req.VehicleType) && ValidVehicleTypes.Contains(req.VehicleType.Trim()))
            listing.VehicleType = NormalizeVehicleType(req.VehicleType);

        if (!string.IsNullOrWhiteSpace(req.VehicleModel))
            listing.VehicleModel = req.VehicleModel.Trim();

        if (req.ManufacturingYear.HasValue && req.ManufacturingYear.Value >= 1985 && req.ManufacturingYear.Value <= DateTime.UtcNow.Year + 1)
            listing.ManufacturingYear = req.ManufacturingYear.Value;

        if (!string.IsNullOrWhiteSpace(req.OwnerContactPhone))
            listing.OwnerContactPhone = req.OwnerContactPhone.Trim();

        if (req.RatePerKm.HasValue && req.RatePerKm.Value > 0)
            listing.RatePerKm = Math.Round(req.RatePerKm.Value, 2);

        if (req.ExtraChargePerNight.HasValue && req.ExtraChargePerNight.Value >= 0)
            listing.ExtraChargePerNight = Math.Round(req.ExtraChargePerNight.Value, 2);

        if (!string.IsNullOrWhiteSpace(req.Location))
            listing.Location = req.Location.Trim();

        if (req.Description != null)
            listing.Description = req.Description.Trim();

        if (req.ImageUrl != null)
            listing.ImageUrl = req.ImageUrl.Trim();

        if (req.DriverIncluded.HasValue)
            listing.DriverIncluded = req.DriverIncluded.Value;

        if (req.SeatingCapacity.HasValue && req.SeatingCapacity.Value > 0)
            listing.SeatingCapacity = req.SeatingCapacity.Value;

        listing.UpdatedAt = DateTime.UtcNow;

        // If provider edited an already approved or rejected listing, require re-verification
        if (!isAdmin)
        {
            listing.Status = "PendingReview";
            listing.AdminFeedback = null;
        }

        await db.SaveChangesAsync(ct);
        return Ok(listing);
    }

    /// <summary>
    /// Admin review: Approve or Reject a rental vehicle listing.
    /// </summary>
    [HttpPost("{id:guid}/review")]
    public async Task<IActionResult> Review(Guid id, [FromBody] ReviewRentalVehicleRequest req, CancellationToken ct)
    {
        if (!IsAdmin())
            return Forbid();

        var listing = await db.RentalVehicleListings.FirstOrDefaultAsync(x => x.Id == id && x.IsActive, ct);
        if (listing == null)
            return NotFound(new { error = "Rental vehicle listing not found." });

        var action = (req.Action ?? "approve").ToLowerInvariant().Trim();

        if (action == "approve")
        {
            listing.Status = "Approved";
            listing.AdminFeedback = req.Feedback?.Trim() ?? "Approved by Administrator";
            listing.ReviewedAt = DateTime.UtcNow;
            listing.ReviewedByUserId = CurrentUserId();
        }
        else if (action == "reject")
        {
            listing.Status = "Rejected";
            listing.AdminFeedback = string.IsNullOrWhiteSpace(req.Feedback)
                ? "Listing rejected. Please verify vehicle specifications, rate structure, and contact information."
                : req.Feedback.Trim();
            listing.ReviewedAt = DateTime.UtcNow;
            listing.ReviewedByUserId = CurrentUserId();
        }
        else
        {
            return BadRequest(new { error = "Invalid review action. Allowed actions: 'approve', 'reject'." });
        }

        listing.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Rental vehicle {Id} reviewed by Admin. New status: {Status}", listing.Id, listing.Status);
        return Ok(listing);
    }

    /// <summary>
    /// Admin queue: Get all pending rental vehicle listings awaiting verification.
    /// </summary>
    [HttpGet("admin/pending")]
    public async Task<IActionResult> GetPendingQueue(CancellationToken ct)
    {
        if (!IsAdmin())
            return Forbid();

        var pending = await db.RentalVehicleListings
            .Where(x => x.IsActive && x.Status == "PendingReview")
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(ct);

        return Ok(pending);
    }

    /// <summary>
    /// Soft delete a rental vehicle listing.
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var listing = await db.RentalVehicleListings.FirstOrDefaultAsync(x => x.Id == id && x.IsActive, ct);
        if (listing == null)
            return NotFound(new { error = "Rental vehicle listing not found." });

        var isAdmin = IsAdmin();
        if (!isAdmin && listing.ProviderUserId != CurrentUserId())
            return Forbid();

        listing.IsActive = false;
        listing.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        return NoContent();
    }

    /// <summary>
    /// Summary endpoint for AI Agents and budget estimators:
    /// Returns aggregated rates (average rate per KM, average extra charge per night) grouped by vehicle type.
    /// </summary>
    [AllowAnonymous, HttpGet("rates-summary")]
    public async Task<IActionResult> GetRatesSummary(CancellationToken ct)
    {
        var approvedVehicles = await db.RentalVehicleListings
            .Where(x => x.IsActive && x.Status == "Approved")
            .ToListAsync(ct);

        var grouped = approvedVehicles
            .GroupBy(x => x.VehicleType)
            .ToDictionary(
                g => g.Key,
                g => new
                {
                    Count = g.Count(),
                    AvgRatePerKm = Math.Round(g.Average(v => v.RatePerKm), 2),
                    MinRatePerKm = g.Min(v => v.RatePerKm),
                    MaxRatePerKm = g.Max(v => v.RatePerKm),
                    AvgExtraChargePerNight = Math.Round(g.Average(v => v.ExtraChargePerNight), 2),
                    MinExtraChargePerNight = g.Min(v => v.ExtraChargePerNight),
                    MaxExtraChargePerNight = g.Max(v => v.ExtraChargePerNight),
                    SampleVehicles = g.Take(3).Select(v => new
                    {
                        v.Id,
                        v.VehicleModel,
                        v.ManufacturingYear,
                        v.RatePerKm,
                        v.ExtraChargePerNight,
                        v.Location,
                        v.OwnerContactPhone
                    })
                }
            );

        return Ok(new
        {
            totalApprovedVehicles = approvedVehicles.Count,
            vehicleRates = grouped
        });
    }

    private static int GetDefaultSeating(string vehicleType) => vehicleType switch
    {
        "Bike" => 2,
        "TukTuk" => 3,
        "Car" => 4,
        "Van" => 8,
        "Bus" => 28,
        _ => 4
    };
}
