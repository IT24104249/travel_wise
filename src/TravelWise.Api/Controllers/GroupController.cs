using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelWise.Api.Data;
using TravelWise.Api.Contracts;
using TravelWise.Api.Services;

namespace TravelWise.Api.Controllers;

[ApiController, Route("api/groups")]
public sealed class GroupController(TravelWiseService service, TravelWiseDbContext db) : ControllerBase
{
    [HttpGet("{tripId:guid}/members")]
    public async Task<IActionResult> GetMembers(Guid tripId, CancellationToken ct) => CanManageTrip(tripId) ? Ok(await service.GetMembersAsync(tripId, ct)) : Forbid();

    [HttpPost("members")]
    public async Task<IActionResult> AddMember(CreateMemberRequest request, CancellationToken ct)
    {
        if (!CanManageTrip(request.TripId)) return Forbid();

        try { return Created("", await service.AddMemberAsync(request, ct)); }
        catch (ArgumentException e) { return BadRequest(new { error = e.Message }); }
    }

    private bool IsAdmin() => TravelWise.Api.Common.AuthHelper.IsAdmin(HttpContext);

    [HttpPut("members/{id:guid}")]
    public async Task<IActionResult> UpdateMember(Guid id, UpdateMemberRequest request, CancellationToken ct)
    {
        var existing = await db.GroupMembers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        if (existing is null) return NotFound();
        if (!CanManageTrip(existing.TripId)) return Forbid();

        try
        {
            var updated = await service.UpdateMemberAsync(id, request, ct);
            return updated is not null ? Ok(updated) : NotFound();
        }
        catch (ArgumentException e) { return BadRequest(new { error = e.Message }); }
    }

    [HttpDelete("members/{id:guid}")]
    public async Task<IActionResult> DeleteMember(Guid id, CancellationToken ct)
    {
        var existing = await db.GroupMembers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        if (existing is null) return NotFound();
        if (!CanManageTrip(existing.TripId)) return Forbid();

        var deleted = await service.DeleteMemberAsync(id, ct);
        return deleted ? NoContent() : NotFound();
    }

    [HttpPost("expenses")]
    public async Task<IActionResult> AddExpense(CreateSharedExpenseSplitRequest request, CancellationToken ct)
    {
        if (!CanManageTrip(request.TripId)) return Forbid();

        try { return Created("", await service.AddSharedExpenseAsync(request, ct)); }
        catch (ArgumentException e) { return BadRequest(new { error = e.Message }); }
    }

    private string? CurrentUserId() => TravelWise.Api.Common.AuthHelper.GetCurrentUserId(HttpContext);
    private bool CanManageTrip(Guid tripId) => TravelWise.Api.Common.AuthHelper.CanManageTrip(HttpContext, db, tripId);
}
