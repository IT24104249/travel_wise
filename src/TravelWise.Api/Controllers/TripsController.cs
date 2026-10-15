using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using TravelWise.Api.Contracts;
using TravelWise.Api.Models;
using TravelWise.Api.Services;

namespace TravelWise.Api.Controllers;

[ApiController, Route("api/trips")]
public sealed class TripsController(TravelWiseService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var isAdmin = IsAdmin();
        var currentUserId = CurrentUserId();
        var currentUserEmail = CurrentUserEmail();

        if (!isAdmin && string.IsNullOrWhiteSpace(currentUserId) && string.IsNullOrWhiteSpace(currentUserEmail))
        {
            return Ok(new List<Trip>());
        }

        var trips = await service.GetTripsAsync(currentUserId, currentUserEmail, isAdmin, ct);
        return Ok(trips);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct) =>
        await service.GetTripByIdAsync(id, ct) is { } trip && CanManage(trip) ? Ok(trip) : NotFound();

    [HttpPost]
    public async Task<IActionResult> Post(CreateTripRequest request, CancellationToken ct)
    {
        if (!IsAuthenticated())
            return Unauthorized();

        try { return Created("", await service.CreateTripAsync(request, CurrentUserId()!, ct)); }
        catch (ArgumentException e) { return BadRequest(new { error = e.Message }); }
    }

    [HttpGet("approved-group-trips")]
    public async Task<IActionResult> GetApprovedGroupTrips(CancellationToken ct)
    {
        return Ok(await service.GetApprovedGroupTripsAsync(ct));
    }

    // ---- Admin Trip Review Queue ----

    [HttpGet("submitted")]
    public async Task<IActionResult> GetSubmitted(CancellationToken ct)
    {
        if (!IsAdmin()) return Forbid();
        return Ok(await service.GetSubmittedTripsAsync(ct));
    }

    [HttpPost("{id:guid}/review")]
    public async Task<IActionResult> Review(Guid id, AdminReviewTripRequest request, CancellationToken ct)
    {
        if (!IsAdmin()) return Forbid();
        try
        {
            var updated = await service.AdminReviewTripAsync(id, request, CurrentUserId()!, ct);
            return updated is not null ? Ok(updated) : NotFound();
        }
        catch (ArgumentException e) { return BadRequest(new { error = e.Message }); }
    }

    [HttpPost("{id:guid}/ban-user")]
    public async Task<IActionResult> BanUser(Guid id, CancellationToken ct)
    {
        if (!IsAdmin()) return Forbid();
        var trip = await service.GetTripByIdAsync(id, ct);
        if (trip is null) return NotFound();
        var req = new AdminReviewTripRequest("decline", "Account suspended by admin due to policy violation.");
        await service.AdminReviewTripAsync(id, req, CurrentUserId()!, ct);
        return Ok(new { message = $"User {trip.OwnerUserId} flagged for suspension. Trip {id} declined.", userId = trip.OwnerUserId });
    }

    // ---- Standard CRUD ----

    private bool IsAdmin() => TravelWise.Api.Common.AuthHelper.IsAdmin(HttpContext);
    private bool IsAuthenticated() => TravelWise.Api.Common.AuthHelper.IsAuthenticated(HttpContext);
    private string? CurrentUserId() => TravelWise.Api.Common.AuthHelper.GetCurrentUserId(HttpContext);
    private string? CurrentUserEmail() => TravelWise.Api.Common.AuthHelper.GetCurrentUserEmail(HttpContext);

    private bool CanManage(Trip trip)
    {
        if (IsAdmin()) return true;
        if (!IsAuthenticated()) return false;
        var uid = CurrentUserId();
        var email = CurrentUserEmail();
        return (!string.IsNullOrWhiteSpace(uid) && trip.OwnerUserId == uid) ||
               (!string.IsNullOrWhiteSpace(email) && (trip.OwnerUserId == email || trip.TravellerEmail == email));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Put(Guid id, UpdateTripRequest request, CancellationToken ct)
    {
        var trip = await service.GetTripByIdAsync(id, ct);
        if (trip is null) return NotFound();
        if (!CanManage(trip)) return Forbid();

        try
        {
            var updated = await service.UpdateTripAsync(id, request, ct);
            return updated is not null ? Ok(updated) : NotFound();
        }
        catch (ArgumentException e) { return BadRequest(new { error = e.Message }); }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var trip = await service.GetTripByIdAsync(id, ct);
        if (trip is null) return NotFound();
        if (!CanManage(trip)) return Forbid();

        var deleted = await service.DeleteTripAsync(id, ct);
        return deleted ? NoContent() : NotFound();
    }
}
