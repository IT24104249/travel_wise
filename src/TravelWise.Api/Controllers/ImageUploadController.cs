using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace TravelWise.Api.Controllers;

/// <summary>
/// Image upload endpoint using Supabase Storage.
/// 
/// HOW SUPABASE STORAGE WORKS:
/// 1. Files are uploaded via the Supabase Storage REST API using the anon/service key.
/// 2. We POST the raw binary to: https://{project}.supabase.co/storage/v1/object/{bucket}/{path}
/// 3. The returned URL is a public URL (if bucket is public) or a signed URL.
/// 
/// SETUP REQUIRED IN SUPABASE DASHBOARD:
/// - Go to Storage → Create bucket "travelwise-images" → Toggle "Public bucket" ON
/// - That's it! No other config needed.
/// </summary>
[ApiController, Route("api/upload")]
public sealed class ImageUploadController(IConfiguration config, IHttpClientFactory httpClientFactory, ILogger<ImageUploadController> logger)
    : ControllerBase
{
    private static readonly string[] AllowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
    private const long MaxFileSizeBytes = 10 * 1024 * 1024; // 10 MB

    [HttpPost]
    public async Task<IActionResult> Upload(IFormFile file, [FromQuery] string? folder, CancellationToken ct)
    {
        // Validation
        if (file is null || file.Length == 0)
            return BadRequest(new { error = "No file provided." });

        if (file.Length > MaxFileSizeBytes)
            return BadRequest(new { error = "File too large. Maximum size is 10 MB." });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(ext))
            return BadRequest(new { error = $"Invalid file type. Allowed: {string.Join(", ", AllowedExtensions)}" });

        // Supabase config
        var supabaseUrl = config["Supabase:Url"];
        var supabaseKey = config["Supabase:ServiceRoleKey"] ?? config["Supabase:AnonKey"];
        const string bucket = "travelwise-images";

        if (string.IsNullOrWhiteSpace(supabaseUrl) || string.IsNullOrWhiteSpace(supabaseKey))
        {
            logger.LogError("Supabase URL or Key not configured for image upload.");
            return StatusCode(500, new { error = "Image upload service not configured." });
        }

        // Build storage path: folder/timestamp-randomhex.ext
        var safeName = $"{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Guid.NewGuid():N}{ext}";
        var storagePath = string.IsNullOrWhiteSpace(folder)
            ? safeName
            : $"{folder.Trim('/')}/{safeName}";

        try
        {
            // Upload to Supabase Storage REST API
            var client = httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");
            client.DefaultRequestHeaders.Add("apikey", supabaseKey);

            using var content = new StreamContent(file.OpenReadStream());
            content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(file.ContentType ?? "application/octet-stream");

            var uploadUrl = $"{supabaseUrl.TrimEnd('/')}/storage/v1/object/{bucket}/{storagePath}";
            logger.LogInformation("Uploading image to Supabase Storage: {Url}", uploadUrl);

            var response = await client.PostAsync(uploadUrl, content, ct);
            var body = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("Supabase Storage upload failed: {Status} — {Body}", response.StatusCode, body);
                return StatusCode((int)response.StatusCode, new { error = $"Storage upload failed: {body}" });
            }

            // Build public URL
            var publicUrl = $"{supabaseUrl.TrimEnd('/')}/storage/v1/object/public/{bucket}/{storagePath}";

            logger.LogInformation("Image uploaded successfully. Public URL: {Url}", publicUrl);
            return Ok(new { url = publicUrl, path = storagePath, bucket });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Image upload failed.");
            return StatusCode(500, new { error = "Image upload failed. Please try again." });
        }
    }

    [HttpPost("multiple")]
    public async Task<IActionResult> UploadMultiple([FromForm] List<IFormFile> files, [FromQuery] string? folder, CancellationToken ct)
    {
        if (files is null || files.Count == 0)
            return BadRequest(new { error = "No files provided." });

        if (files.Count > 10)
            return BadRequest(new { error = "Maximum 10 files per upload." });

        var results = new List<object>();
        foreach (var file in files)
        {
            // Reuse single upload logic — post to same endpoint internally would be circular,
            // so we inline the logic here.
            if (file.Length > MaxFileSizeBytes) { results.Add(new { error = $"{file.FileName}: too large", url = (string?)null }); continue; }
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(ext)) { results.Add(new { error = $"{file.FileName}: invalid type", url = (string?)null }); continue; }

            var supabaseUrl = config["Supabase:Url"];
            var supabaseKey = config["Supabase:ServiceRoleKey"] ?? config["Supabase:AnonKey"];
            const string bucket = "travelwise-images";

            var safeName = $"{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Guid.NewGuid():N}{ext}";
            var storagePath = string.IsNullOrWhiteSpace(folder) ? safeName : $"{folder.Trim('/')}/{safeName}";

            try
            {
                var client = httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");
                client.DefaultRequestHeaders.Add("apikey", supabaseKey!);

                using var streamContent = new StreamContent(file.OpenReadStream());
                streamContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(file.ContentType ?? "application/octet-stream");

                var uploadUrl = $"{supabaseUrl!.TrimEnd('/')}/storage/v1/object/{bucket}/{storagePath}";
                var response = await client.PostAsync(uploadUrl, streamContent, ct);
                if (response.IsSuccessStatusCode)
                {
                    var publicUrl = $"{supabaseUrl.TrimEnd('/')}/storage/v1/object/public/{bucket}/{storagePath}";
                    results.Add(new { url = publicUrl, path = storagePath, error = (string?)null });
                }
                else
                {
                    var err = await response.Content.ReadAsStringAsync(ct);
                    results.Add(new { error = err, url = (string?)null });
                }
            }
            catch (Exception ex)
            {
                results.Add(new { error = ex.Message, url = (string?)null });
            }
        }
        return Ok(results);
    }
}
