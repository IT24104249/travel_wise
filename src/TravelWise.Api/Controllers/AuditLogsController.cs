using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using TravelWise.Api.Data;

namespace TravelWise.Api.Controllers;

[ApiController, Route("api/auditlogs")]
public sealed class AuditLogsController(TravelWiseDbContext db) : ControllerBase
{
    [Authorize(Policy = "StaffAdmin")]
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] int limit = 50, CancellationToken ct = default) =>
        Ok(await db.AuditLogs.AsNoTracking().OrderByDescending(x => x.CreatedAt).Take(limit).ToListAsync(ct));
}
