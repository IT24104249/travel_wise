using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelWise.Api.Contracts;
using TravelWise.Api.Data;
using TravelWise.Api.Models;
using TravelWise.Api.Services;

namespace TravelWise.Api.Controllers;

[ApiController, Route("api/catalog")]
public sealed class CatalogController(TravelWiseDbContext db, TravelWiseService service) : ControllerBase
{
    private string GetCurrentUserId() => TravelWise.Api.Common.AuthHelper.GetCurrentUserId(HttpContext) ?? "provider-user";
    private string GetCurrentRole() => TravelWise.Api.Common.AuthHelper.GetCurrentRole(HttpContext);
    private bool IsAdmin() => TravelWise.Api.Common.AuthHelper.IsAdmin(HttpContext);

    [AllowAnonymous, HttpGet]
    public async Task<IActionResult> Search([FromQuery] string? destination, [FromQuery] CatalogItemType? type, [FromQuery] string? category, CancellationToken ct)
    {
        var query = db.TravelCatalogItems.Where(x => x.IsActive && x.IsApproved);
        if (!string.IsNullOrWhiteSpace(destination))
        {
            var destLower = destination.Trim().ToLower();
            query = query.Where(x => x.Destination.ToLower().Contains(destLower));
        }
        if (type is not null) query = query.Where(x => x.Type == type);
        if (!string.IsNullOrWhiteSpace(category))
        {
            var catLower = category.Trim().ToLower();
            query = query.Where(x => x.CuisineOrCategory != null && x.CuisineOrCategory.ToLower().Contains(catLower));
        }
        return Ok(await query.OrderByDescending(x => x.Rating).ThenBy(x => x.Name).ToListAsync(ct));
    }

    [AllowAnonymous, HttpGet("all")]
    public async Task<IActionResult> GetAll([FromQuery] bool includeInactive = false, CancellationToken ct = default)
    {
        var query = db.TravelCatalogItems.AsQueryable();
        if (!includeInactive) query = query.Where(x => x.IsActive);
        return Ok(await query.OrderByDescending(x => x.CreatedAt).ToListAsync(ct));
    }

    [AllowAnonymous, HttpGet("mine")]
    public async Task<IActionResult> Mine([FromQuery] string? providerId, CancellationToken ct = default)
    {
        var isAdmin = IsAdmin();
        var uid = GetCurrentUserId();
        var email = TravelWise.Api.Common.AuthHelper.GetCurrentUserEmail(HttpContext);

        if (isAdmin && !string.IsNullOrWhiteSpace(providerId))
        {
            return Ok(await db.TravelCatalogItems.Where(x => x.ProviderUserId == providerId && x.IsActive).OrderByDescending(x => x.CreatedAt).ToListAsync(ct));
        }

        if (string.IsNullOrWhiteSpace(uid) || uid == "provider-user")
        {
            return Ok(new List<TravelCatalogItem>());
        }

        var account = await db.UserAccounts.FirstOrDefaultAsync(u =>
            u.Id.ToString() == uid || u.Email == uid || (!string.IsNullOrWhiteSpace(email) && u.Email == email), ct);
        var targetId = account?.Id.ToString() ?? uid;
        var targetEmail = account?.Email ?? email;

        return Ok(await db.TravelCatalogItems
            .Where(x => x.IsActive && (x.ProviderUserId == targetId || (!string.IsNullOrWhiteSpace(targetEmail) && x.ProviderUserId == targetEmail)))
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(ct));
    }

    [AllowAnonymous, HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var item = await service.GetCatalogItemAsync(id, ct);
        return item is not null ? Ok(item) : NotFound();
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateCatalogItemRequest request, CancellationToken ct)
    {
        var role = GetCurrentRole();
        var isAdmin = IsAdmin();
        if (!isAdmin && !role.Equals("ServiceProvider", StringComparison.OrdinalIgnoreCase))
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Access Denied: Only Service Providers and System Administrators can create catalog listings." });

        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Destination))
            return BadRequest(new { error = "Name and destination are required." });
        if (request.Price is < 0 || request.Rating is < 0 or > 5)
            return BadRequest(new { error = "Price cannot be negative and rating must be between 0 and 5." });

        var item = new TravelCatalogItem
        {
            Type = request.Type,
            Name = request.Name.Trim(),
            Destination = request.Destination.Trim(),
            Description = request.Description.Trim(),
            Address = request.Address?.Trim(),
            Contact = request.Contact?.Trim(),
            Price = request.Price,
            Currency = string.IsNullOrWhiteSpace(request.Currency) ? "LKR" : request.Currency.Trim().ToUpperInvariant(),
            CuisineOrCategory = request.CuisineOrCategory?.Trim(),
            Rating = request.Rating ?? 4.5m,
            ProviderUserId = GetCurrentUserId(),
            IsApproved = isAdmin || request.Type == CatalogItemType.VisitingPlace
        };
        db.TravelCatalogItems.Add(item);
        await db.SaveChangesAsync(ct);
        return Created($"/api/catalog/{item.Id}", item);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Put(Guid id, UpdateCatalogItemRequest request, CancellationToken ct)
    {
        var existing = await db.TravelCatalogItems.FindAsync([id], ct);
        if (existing is null) return NotFound();

        if (!IsAdmin() && existing.ProviderUserId != GetCurrentUserId())
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Access Denied: You can only edit your own catalog listings." });
        }

        try
        {
            var updated = await service.UpdateCatalogItemAsync(id, request, ct);
            return updated is not null ? Ok(updated) : NotFound();
        }
        catch (ArgumentException e) { return BadRequest(new { error = e.Message }); }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var existing = await db.TravelCatalogItems.FindAsync([id], ct);
        if (existing is null) return NotFound();

        if (!IsAdmin() && existing.ProviderUserId != GetCurrentUserId())
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Access Denied: You can only delete your own catalog listings." });
        }

        var deleted = await service.DeleteCatalogItemAsync(id, ct);
        return deleted ? NoContent() : NotFound();
    }

    [HttpPost("{id:guid}/approve")]
    public async Task<IActionResult> Approve(Guid id, CancellationToken ct)
    {
        if (!IsAdmin())
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Access Denied: Only System Administrators can approve catalog records." });
        }

        var item = await db.TravelCatalogItems.FindAsync([id], ct);
        if (item is null) return NotFound();
        item.IsApproved = true;
        item.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Ok(item);
    }

    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> Reject(Guid id, CancellationToken ct)
    {
        if (!IsAdmin())
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Access Denied: Only System Administrators can reject catalog records." });
        }

        var item = await db.TravelCatalogItems.FindAsync([id], ct);
        if (item is null) return NotFound();
        item.IsApproved = false;
        item.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Ok(item);
    }
}
