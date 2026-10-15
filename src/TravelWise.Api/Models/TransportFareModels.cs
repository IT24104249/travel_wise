namespace TravelWise.Api.Models;

public sealed class TransportFareFile
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Category { get; set; } = string.Empty; // "Railway" or "Bus"
    public string FileName { get; set; } = string.Empty;
    public string StorageBucket { get; set; } = string.Empty; // "railway-fares" or "bus-fares"
    public string StoragePath { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string UploadedByUserId { get; set; } = string.Empty;
    public string UploadedByRole { get; set; } = "ServiceProvider"; // "ServiceProvider" or "StaffAdmin"
    public string Status { get; set; } = "PendingApproval"; // "PendingApproval", "Approved", "Rejected"
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewedByUserId { get; set; }
    public string? AdminNotes { get; set; }
    public string? PublicUrl { get; set; }
    public bool IsActive { get; set; } = true;
    public int ParsedRowCount { get; set; }
    public string? SamplePreviewJson { get; set; }
}

public sealed class FareReviewRequest
{
    public string Action { get; set; } = "approve"; // "approve" or "reject"
    public string? Notes { get; set; }
}
