namespace TravelWise.Api.Contracts;

public sealed record AuthCredentials(string Email, string Password);

public sealed record RegisterRequest(
    string Email,
    string Password,
    string Role = "User",
    string? DisplayName = null,
    string? ContactPhone = null,
    string? ServiceType = null);

public sealed record ProviderApprovalActionRequest(string? Note = null);

public sealed record AuthSession(
    string AccessToken,
    string? RefreshToken,
    int? ExpiresIn,
    string? TokenType,
    object? User);

public sealed record ResendConfirmationRequest(string Email);

// Password Reset
public sealed record ForgotPasswordRequest(string Email);
public sealed record ResetPasswordRequest(string Email, string Token, string NewPassword);

// Profile & Password Management
public sealed record UpdateProfileRequest(string DisplayName, string? ContactPhone, string? ServiceType);
public sealed record ChangePasswordRequest(string CurrentPassword, string NewPassword);
public sealed record DeleteAccountRequest(string? Reason = null, string? ConfirmPassword = null);


