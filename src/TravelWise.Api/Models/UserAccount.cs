namespace TravelWise.Api.Models;

public sealed class UserAccount
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Role { get; set; } = "User";
    public string? ContactPhone { get; set; }
    public string? ServiceType { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }

    // Password Reset
    public string? PasswordResetToken { get; set; }
    public DateTime? PasswordResetTokenExpiry { get; set; }

    // Provider Profile Update Approval Workflow
    public string? PendingDisplayName { get; set; }
    public string? PendingContactPhone { get; set; }
    public string? PendingServiceType { get; set; }
    public string? PendingProfileStatus { get; set; } // null, "Pending", "Approved", "Rejected"
    public string? ProfileReviewNote { get; set; }
    public DateTime? ProfileUpdatedAt { get; set; }

    // Account Deletion Workflow
    public bool DeletionRequested { get; set; } = false;
    public DateTime? DeletionRequestedAt { get; set; }
    public string? DeletionReason { get; set; }
    public string? DeletionStatus { get; set; } // null, "PendingApproval", "Approved", "Rejected"
}
