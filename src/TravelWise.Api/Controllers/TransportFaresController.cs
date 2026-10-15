using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelWise.Api.Common;
using TravelWise.Api.Data;
using TravelWise.Api.Models;

namespace TravelWise.Api.Controllers;

[ApiController, Route("api/transport-fares")]
public sealed class TransportFaresController(
    TravelWiseDbContext db,
    IConfiguration config,
    IHttpClientFactory httpClientFactory,
    ILogger<TransportFaresController> logger) : ControllerBase
{
    private const long MaxCsvSizeBytes = 15 * 1024 * 1024; // 15 MB

    private string CurrentUserId() => AuthHelper.GetCurrentUserId(HttpContext) ?? "unknown";
    private bool IsAdmin() => AuthHelper.IsAdmin(HttpContext);
    private string CurrentRole() => AuthHelper.GetCurrentRole(HttpContext);

    /// <summary>
    /// List all CSV fare files with optional filters by category and status.
    /// </summary>
    [AllowAnonymous, HttpGet]
    public async Task<IActionResult> GetFiles(
        [FromQuery] string? category,
        [FromQuery] string? status,
        CancellationToken ct)
    {
        var q = db.TransportFareFiles.Where(x => x.IsActive);

        if (!string.IsNullOrWhiteSpace(category))
        {
            var cat = category.Trim();
            q = q.Where(x => EF.Functions.ILike(x.Category, cat));
        }

        var userRole = CurrentRole();
        var userId = CurrentUserId();
        var isAdmin = IsAdmin();

        if (isAdmin)
        {
            // Admin can see everything or filter by status
            if (!string.IsNullOrWhiteSpace(status) && !status.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                q = q.Where(x => x.Status == status);
            }
        }
        else if (userRole.Equals("ServiceProvider", StringComparison.OrdinalIgnoreCase))
        {
            // Provider sees all Approved files + their own Pending or Rejected files
            if (!string.IsNullOrWhiteSpace(status) && !status.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                if (status.Equals("Approved", StringComparison.OrdinalIgnoreCase))
                {
                    q = q.Where(x => x.Status == "Approved");
                }
                else
                {
                    q = q.Where(x => x.Status == status && x.UploadedByUserId == userId);
                }
            }
            else
            {
                q = q.Where(x => x.Status == "Approved" || x.UploadedByUserId == userId);
            }
        }
        else
        {
            // Public / Traveller only sees Approved files
            q = q.Where(x => x.Status == "Approved");
        }

        var files = await q.OrderByDescending(x => x.CreatedAt).ToListAsync(ct);
        return Ok(files);
    }

    /// <summary>
    /// Upload a CSV file for Railway or Bus fares.
    /// StaffAdmin uploads go directly to active bucket path and are Auto-Approved.
    /// ServiceProvider uploads go to pending bucket path and require Admin Approval.
    /// </summary>
    [HttpPost("upload")]
    [RequestSizeLimit(15 * 1024 * 1024)]
    public async Task<IActionResult> Upload(
        [FromForm] IFormFile file,
        [FromForm] string category,
        [FromForm] string? notes,
        CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { error = "A CSV file is required." });

        if (file.Length > MaxCsvSizeBytes)
            return BadRequest(new { error = "File size exceeds 15 MB limit." });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext != ".csv")
            return BadRequest(new { error = "Only .csv files are supported for transport fare datasets." });

        var cleanCategory = category?.Trim();
        if (!string.Equals(cleanCategory, "Railway", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(cleanCategory, "Bus", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { error = "Category must be either 'Railway' or 'Bus'." });
        }
        cleanCategory = char.ToUpperInvariant(cleanCategory![0]) + cleanCategory[1..].ToLowerInvariant();

        var bucket = cleanCategory == "Railway" ? "railway-fares" : "bus-fares";
        var isAdmin = IsAdmin();
        var userRole = isAdmin ? "StaffAdmin" : (CurrentRole().Equals("ServiceProvider", StringComparison.OrdinalIgnoreCase) ? "ServiceProvider" : "StaffAdmin");
        var userId = CurrentUserId();

        // 1. Parse CSV stream to count rows & get a small sample preview
        int rowCount = 0;
        var sampleRows = new List<string[]>();
        string[]? headers = null;

        try
        {
            using var reader = new StreamReader(file.OpenReadStream());
            string? line;
            while ((line = await reader.ReadLineAsync(ct)) != null)
            {
                if (string.IsNullOrWhiteSpace(line)) continue;
                var cols = line.Split(',').Select(c => c.Trim('"', ' ', '\r', '\n')).ToArray();
                if (headers == null)
                {
                    headers = cols;
                }
                else
                {
                    rowCount++;
                    if (sampleRows.Count < 5)
                    {
                        sampleRows.Add(cols);
                    }
                }
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to parse CSV preview for {File}", file.FileName);
        }

        var samplePreviewJson = JsonSerializer.Serialize(new
        {
            headers = headers ?? Array.Empty<string>(),
            rows = sampleRows,
            totalRows = rowCount
        });

        // 2. Storage path & status
        var status = isAdmin ? "Approved" : "PendingApproval";
        var folder = isAdmin ? "active" : "pending";
        var safeFileName = Path.GetFileNameWithoutExtension(file.FileName).Replace(" ", "_");
        var storagePath = $"{folder}/{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}_{Guid.NewGuid():N}_{safeFileName}.csv";

        // 3. Upload to Supabase Storage
        var supabaseUrl = config["Supabase:Url"];
        var supabaseKey = config["Supabase:ServiceRoleKey"] ?? config["Supabase:AnonKey"];

        if (string.IsNullOrWhiteSpace(supabaseUrl) || string.IsNullOrWhiteSpace(supabaseKey))
            return StatusCode(500, new { error = "Supabase Storage credentials not configured." });

        try
        {
            var client = httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");
            client.DefaultRequestHeaders.Add("apikey", supabaseKey);

            using var content = new StreamContent(file.OpenReadStream());
            content.Headers.ContentType = new MediaTypeHeaderValue("text/csv");

            var uploadUrl = $"{supabaseUrl.TrimEnd('/')}/storage/v1/object/{bucket}/{storagePath}";
            logger.LogInformation("Uploading transport fare CSV to Supabase: {Url} (Role: {Role})", uploadUrl, userRole);

            var response = await client.PostAsync(uploadUrl, content, ct);
            var body = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                logger.LogError("Supabase upload failed: {Status} — {Body}", response.StatusCode, body);
                return StatusCode((int)response.StatusCode, new { error = $"Storage upload failed: {body}" });
            }

            var publicUrl = $"{supabaseUrl.TrimEnd('/')}/storage/v1/object/public/{bucket}/{storagePath}";

            var fareFile = new TransportFareFile
            {
                Category = cleanCategory,
                FileName = file.FileName,
                StorageBucket = bucket,
                StoragePath = storagePath,
                FileSizeBytes = file.Length,
                UploadedByUserId = userId,
                UploadedByRole = userRole,
                Status = status,
                CreatedAt = DateTime.UtcNow,
                ReviewedAt = isAdmin ? DateTime.UtcNow : null,
                ReviewedByUserId = isAdmin ? userId : null,
                AdminNotes = notes,
                PublicUrl = publicUrl,
                IsActive = true,
                ParsedRowCount = rowCount,
                SamplePreviewJson = samplePreviewJson
            };

            db.TransportFareFiles.Add(fareFile);
            await db.SaveChangesAsync(ct);

            return Ok(fareFile);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Transport fare CSV upload failed.");
            return StatusCode(500, new { error = "Upload failed. Please try again." });
        }
    }

    /// <summary>
    /// Admin verifies and approves a pending fare CSV file submitted by a Service Provider.
    /// Moves the object from 'pending/' to 'active/' in the Supabase bucket.
    /// </summary>
    [HttpPost("{id:guid}/approve")]
    public async Task<IActionResult> Approve(Guid id, [FromBody] FareReviewRequest? req, CancellationToken ct)
    {
        if (!IsAdmin())
            return Forbid();

        var fareFile = await db.TransportFareFiles.FirstOrDefaultAsync(x => x.Id == id && x.IsActive, ct);
        if (fareFile == null)
            return NotFound(new { error = "Transport fare record not found." });

        if (fareFile.Status == "Approved")
            return Ok(fareFile);

        var supabaseUrl = config["Supabase:Url"];
        var supabaseKey = config["Supabase:ServiceRoleKey"] ?? config["Supabase:AnonKey"];

        if (!string.IsNullOrWhiteSpace(supabaseUrl) && !string.IsNullOrWhiteSpace(supabaseKey) && fareFile.StoragePath.StartsWith("pending/"))
        {
            try
            {
                var client = httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");
                client.DefaultRequestHeaders.Add("apikey", supabaseKey);

                var newPath = $"active/{fareFile.StoragePath["pending/".Length..]}";
                var moveUrl = $"{supabaseUrl.TrimEnd('/')}/storage/v1/object/move";
                var moveContent = new StringContent(JsonSerializer.Serialize(new
                {
                    bucketId = fareFile.StorageBucket,
                    sourceKey = fareFile.StoragePath,
                    destinationKey = newPath
                }), System.Text.Encoding.UTF8, "application/json");

                var moveResp = await client.PostAsync(moveUrl, moveContent, ct);
                if (moveResp.IsSuccessStatusCode)
                {
                    fareFile.StoragePath = newPath;
                    fareFile.PublicUrl = $"{supabaseUrl.TrimEnd('/')}/storage/v1/object/public/{fareFile.StorageBucket}/{newPath}";
                }
                else
                {
                    logger.LogWarning("Supabase move failed with {Status}, keeping current storage path", moveResp.StatusCode);
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Error moving Supabase storage object on approval");
            }
        }

        fareFile.Status = "Approved";
        fareFile.ReviewedAt = DateTime.UtcNow;
        fareFile.ReviewedByUserId = CurrentUserId();
        if (!string.IsNullOrWhiteSpace(req?.Notes))
            fareFile.AdminNotes = req.Notes;

        await db.SaveChangesAsync(ct);
        return Ok(fareFile);
    }

    /// <summary>
    /// Admin declines / rejects a pending fare CSV.
    /// </summary>
    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> Reject(Guid id, [FromBody] FareReviewRequest? req, CancellationToken ct)
    {
        if (!IsAdmin())
            return Forbid();

        var fareFile = await db.TransportFareFiles.FirstOrDefaultAsync(x => x.Id == id && x.IsActive, ct);
        if (fareFile == null)
            return NotFound(new { error = "Transport fare record not found." });

        fareFile.Status = "Rejected";
        fareFile.ReviewedAt = DateTime.UtcNow;
        fareFile.ReviewedByUserId = CurrentUserId();
        fareFile.AdminNotes = req?.Notes ?? "Rejected by System Administrator.";

        await db.SaveChangesAsync(ct);
        return Ok(fareFile);
    }

    /// <summary>
    /// Delete a fare CSV file. Removes it from Supabase Storage and database.
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var fareFile = await db.TransportFareFiles.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (fareFile == null)
            return NotFound(new { error = "Transport fare record not found." });

        var isAdmin = IsAdmin();
        var currentUserId = CurrentUserId();
        if (!isAdmin && fareFile.UploadedByUserId != currentUserId)
            return Forbid();

        // 1. Delete from Supabase Storage
        var supabaseUrl = config["Supabase:Url"];
        var supabaseKey = config["Supabase:ServiceRoleKey"] ?? config["Supabase:AnonKey"];

        if (!string.IsNullOrWhiteSpace(supabaseUrl) && !string.IsNullOrWhiteSpace(supabaseKey))
        {
            try
            {
                var client = httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");
                client.DefaultRequestHeaders.Add("apikey", supabaseKey);

                var deleteUrl = $"{supabaseUrl.TrimEnd('/')}/storage/v1/object/{fareFile.StorageBucket}";
                var delRequest = new HttpRequestMessage(HttpMethod.Delete, deleteUrl)
                {
                    Content = new StringContent(JsonSerializer.Serialize(new
                    {
                        prefixes = new[] { fareFile.StoragePath }
                    }), System.Text.Encoding.UTF8, "application/json")
                };

                await client.SendAsync(delRequest, ct);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to delete storage file {Path}", fareFile.StoragePath);
            }
        }

        // 2. Remove from DB
        db.TransportFareFiles.Remove(fareFile);
        await db.SaveChangesAsync(ct);

        return NoContent();
    }

    /// <summary>
    /// Summary of active fare files for AI agents and system health overview.
    /// </summary>
    [AllowAnonymous, HttpGet("summary")]
    public async Task<IActionResult> GetSummary(CancellationToken ct)
    {
        var railwayApproved = await db.TransportFareFiles.CountAsync(x => x.Category == "Railway" && x.Status == "Approved" && x.IsActive, ct);
        var busApproved = await db.TransportFareFiles.CountAsync(x => x.Category == "Bus" && x.Status == "Approved" && x.IsActive, ct);
        var pendingReview = await db.TransportFareFiles.CountAsync(x => x.Status == "PendingApproval" && x.IsActive, ct);

        var latestRailway = await db.TransportFareFiles
            .Where(x => x.Category == "Railway" && x.Status == "Approved" && x.IsActive)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync(ct);

        var latestBus = await db.TransportFareFiles
            .Where(x => x.Category == "Bus" && x.Status == "Approved" && x.IsActive)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync(ct);

        return Ok(new
        {
            railwayApprovedCount = railwayApproved,
            busApprovedCount = busApproved,
            pendingReviewCount = pendingReview,
            latestRailwayFile = latestRailway,
            latestBusFile = latestBus,
            buckets = new[] { "railway-fares", "bus-fares" }
        });
    }
}
