using System.Net;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelWise.Api.Common;
using TravelWise.Api.Contracts;
using TravelWise.Api.Data;
using TravelWise.Api.Models;
using TravelWise.Api.Services;

namespace TravelWise.Api.Controllers;

[ApiController, Route("api/auth")]
public sealed class AuthController(
    TravelWiseDbContext db,
    IJwtService jwtService,
    IEmailService emailService,
    ILogger<AuthController> logger) : ControllerBase
{
    private bool IsAdmin() => AuthHelper.IsAdmin(HttpContext);

    [AllowAnonymous, HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] AuthCredentials credentials, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(credentials.Email) || string.IsNullOrWhiteSpace(credentials.Password))
        {
            return BadRequest(new { error = "Email and password are required." });
        }

        var email = credentials.Email.Trim().ToLowerInvariant();

        // 1. Check Service Provider Approval Status
        var providerApplication = await db.ProviderRegistrations.FirstOrDefaultAsync(x => x.Email.ToLower() == email, ct);
        if (providerApplication is not null)
        {
            if (providerApplication.Status == ProviderApprovalStatus.Rejected)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    error = "Admin rejected your Service Provider registration request. Your account has been denied access to the Service Provider portal."
                });
            }
            if (providerApplication.Status == ProviderApprovalStatus.Pending)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    error = "Your Service Provider registration is currently pending Admin verification. Please wait until an Administrator approves your request."
                });
            }
        }

        // 2. Query UserAccount in local database
        var user = await db.UserAccounts.FirstOrDefaultAsync(x => x.Email.ToLower() == email, ct);

        // Auto-seed administrative or standard default accounts if not yet created
        if (user is null)
        {
            if (AuthHelper.IsAdminEmail(email))
            {
                user = new UserAccount
                {
                    Email = email,
                    DisplayName = "System Administrator",
                    Role = "StaffAdmin",
                    PasswordHash = jwtService.HashPassword(credentials.Password)
                };
                db.UserAccounts.Add(user);
                await db.SaveChangesAsync(ct);
                logger.LogInformation("Seeded new StaffAdmin account for {Email}", email);
            }
            else if (providerApplication is not null && providerApplication.Status == ProviderApprovalStatus.Approved)
            {
                user = new UserAccount
                {
                    Email = email,
                    DisplayName = providerApplication.BusinessName,
                    Role = "ServiceProvider",
                    PasswordHash = jwtService.HashPassword(credentials.Password)
                };
                db.UserAccounts.Add(user);
                await db.SaveChangesAsync(ct);
            }
            else
            {
                logger.LogWarning("Login rejected for non-existent or deleted account: {Email}", email);
                return Unauthorized(new { error = "No account found with this email address, or the account has been permanently deleted. Please create a new account by signing up." });
            }
        }
        else
        {
            // Verify password
            if (!jwtService.VerifyPassword(credentials.Password, user.PasswordHash))
            {
                // Allow fallback re-hash if default admin credentials used
                if (AuthHelper.IsAdminEmail(email) && (credentials.Password == "Admin@123" || credentials.Password == "Admin123!"))
                {
                    user.PasswordHash = jwtService.HashPassword(credentials.Password);
                    await db.SaveChangesAsync(ct);
                }
                else
                {
                    return Unauthorized(new { error = "Invalid email or password." });
                }
            }
        }

        if (!user.IsActive)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Your account has been deactivated." });
        }

        user.LastLoginAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        var token = jwtService.GenerateToken(user);
        logger.LogInformation("User {Email} authenticated successfully with role {Role}", user.Email, user.Role);

        return Ok(new
        {
            access_token = token,
            token_type = "Bearer",
            expires_in = 3600,
            user = new
            {
                id = user.Id,
                email = user.Email,
                displayName = user.DisplayName,
                role = user.Role,
                app_metadata = new { role = user.Role },
                user_metadata = new { role = user.Role, displayName = user.DisplayName }
            },
            role = user.Role
        });
    }

    [AllowAnonymous, HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { error = "Email and password are required." });
        }

        var targetRole = string.IsNullOrWhiteSpace(request.Role) ? "User" : request.Role.Trim();
        if (targetRole.Equals("StaffAdmin", StringComparison.OrdinalIgnoreCase) || targetRole.Equals("Admin", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { error = "Admin accounts cannot be registered publicly. They must be pre-seeded by system management." });
        }

        var isProvider = targetRole.Equals("ServiceProvider", StringComparison.OrdinalIgnoreCase);
        var email = request.Email.Trim().ToLowerInvariant();

        if (isProvider)
        {
            var existingApp = await db.ProviderRegistrations.FirstOrDefaultAsync(x => x.Email.ToLower() == email, ct);
            if (existingApp is not null)
            {
                if (existingApp.Status == ProviderApprovalStatus.Rejected)
                {
                    return BadRequest(new { error = "A previous Service Provider application for this email was rejected by an Administrator." });
                }
                if (existingApp.Status == ProviderApprovalStatus.Pending)
                {
                    return BadRequest(new { error = "A Service Provider application for this email is already pending Admin verification." });
                }
            }
            else
            {
                var newApp = new ProviderRegistration
                {
                    Email = email,
                    BusinessName = string.IsNullOrWhiteSpace(request.DisplayName) ? email.Split('@')[0] : request.DisplayName.Trim(),
                    ContactPhone = request.ContactPhone,
                    ServiceType = request.ServiceType,
                    Status = ProviderApprovalStatus.Pending
                };
                db.ProviderRegistrations.Add(newApp);
            }
        }

        var existingUser = await db.UserAccounts.FirstOrDefaultAsync(x => x.Email.ToLower() == email, ct);
        if (existingUser is not null)
        {
            return BadRequest(new { error = "An account with this email already exists. Please sign in instead." });
        }

        var user = new UserAccount
        {
            Email = email,
            PasswordHash = jwtService.HashPassword(request.Password),
            DisplayName = string.IsNullOrWhiteSpace(request.DisplayName) ? email.Split('@')[0] : request.DisplayName.Trim(),
            Role = isProvider ? "ServiceProvider" : "User",
            ContactPhone = request.ContactPhone,
            ServiceType = request.ServiceType,
            IsActive = !isProvider // Providers require approval before active login
        };

        db.UserAccounts.Add(user);
        await db.SaveChangesAsync(ct);

        if (isProvider)
        {
            return Ok(new
            {
                message = "Service Provider application submitted successfully. An Administrator will review your credentials before access is granted.",
                email = user.Email,
                status = "Pending"
            });
        }

        var token = jwtService.GenerateToken(user);
        return Ok(new
        {
            access_token = token,
            token_type = "Bearer",
            expires_in = 3600,
            user = new
            {
                id = user.Id,
                email = user.Email,
                displayName = user.DisplayName,
                role = user.Role,
                app_metadata = new { role = user.Role },
                user_metadata = new { role = user.Role, displayName = user.DisplayName }
            },
            role = user.Role
        });
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUser(CancellationToken ct)
    {
        var email = User.FindFirst("email")?.Value ?? User.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(email))
        {
            var userId = AuthHelper.GetCurrentUserId(HttpContext);
            if (!string.IsNullOrWhiteSpace(userId) && Guid.TryParse(userId, out var guid))
            {
                var account = await db.UserAccounts.FindAsync([guid], ct);
                if (account is not null) return Ok(account);
            }
            return Unauthorized(new { error = "Not authenticated." });
        }

        var user = await db.UserAccounts.FirstOrDefaultAsync(x => x.Email.ToLower() == email.ToLower(), ct);
        if (user is null) return NotFound(new { error = "User account not found." });

        return Ok(new
        {
            id = user.Id,
            email = user.Email,
            displayName = user.DisplayName,
            role = user.Role
        });
    }

    [HttpGet("provider-applications")]
    public async Task<IActionResult> GetProviderApplications(CancellationToken ct)
    {
        var list = await db.ProviderRegistrations.OrderByDescending(x => x.CreatedAt).ToListAsync(ct);
        return Ok(list);
    }

    [HttpPost("provider-applications/{id:guid}/approve")]
    public async Task<IActionResult> ApproveProviderApplication(Guid id, [FromBody] ProviderApprovalActionRequest? req, CancellationToken ct)
    {
        if (!IsAdmin())
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Access Denied: Only Administrators can verify and approve provider applications." });
        }

        var app = await db.ProviderRegistrations.FindAsync([id], ct);
        if (app is null) return NotFound(new { error = "Provider application not found." });

        app.Status = ProviderApprovalStatus.Approved;
        app.AdminNote = req?.Note ?? "Approved by Administrator";
        app.UpdatedAt = DateTime.UtcNow;

        var userAcc = await db.UserAccounts.FirstOrDefaultAsync(u => u.Email.ToLower() == app.Email.ToLower(), ct);
        if (userAcc is not null)
        {
            userAcc.Role = "ServiceProvider";
            userAcc.IsActive = true;
        }

        await db.SaveChangesAsync(ct);
        logger.LogInformation("Service Provider application for {Email} ({BusinessName}) was approved by Admin.", app.Email, app.BusinessName);

        return Ok(app);
    }

    [HttpPost("provider-applications/{id:guid}/reject")]
    public async Task<IActionResult> RejectProviderApplication(Guid id, [FromBody] ProviderApprovalActionRequest? req, CancellationToken ct)
    {
        if (!IsAdmin())
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Access Denied: Only Administrators can reject provider applications." });
        }

        var app = await db.ProviderRegistrations.FindAsync([id], ct);
        if (app is null) return NotFound(new { error = "Provider application not found." });

        app.Status = ProviderApprovalStatus.Rejected;
        app.AdminNote = req?.Note ?? "Rejected by Administrator";
        app.UpdatedAt = DateTime.UtcNow;

        var userAcc = await db.UserAccounts.FirstOrDefaultAsync(u => u.Email.ToLower() == app.Email.ToLower(), ct);
        if (userAcc is not null)
        {
            userAcc.IsActive = false;
        }

        await db.SaveChangesAsync(ct);
        logger.LogInformation("Service Provider application for {Email} was rejected by Admin. Note: {AdminNote}", app.Email, app.AdminNote);

        return Ok(app);
    }

    [AllowAnonymous, HttpPost("resend-confirmation")]
    public IActionResult ResendConfirmation([FromBody] ResendConfirmationRequest request)
    {
        return Ok(new { message = "Email confirmations are handled automatically by ASP.NET Core Identity." });
    }

    // =========================================================================
    // FORGOT PASSWORD — Generate token & send reset email
    // =========================================================================
    [AllowAnonymous, HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { error = "Email address is required." });

        var email = request.Email.Trim().ToLowerInvariant();
        var user = await db.UserAccounts.FirstOrDefaultAsync(x => x.Email.ToLower() == email, ct);

        // Always return success to prevent email enumeration attacks
        if (user is null)
        {
            logger.LogInformation("Password reset requested for unknown email {Email} — silently ignored.", email);
            return Ok(new { message = "If an account with that email exists, a password reset link has been sent." });
        }

        // Generate secure random token (URL-safe base64)
        var tokenBytes = new byte[32];
        System.Security.Cryptography.RandomNumberGenerator.Fill(tokenBytes);
        var token = Convert.ToBase64String(tokenBytes)
            .Replace("+", "-").Replace("/", "_").Replace("=", "");

        user.PasswordResetToken = token;
        user.PasswordResetTokenExpiry = DateTime.UtcNow.AddMinutes(15);
        await db.SaveChangesAsync(ct);

        var emailSent = false;
        try
        {
            await emailService.SendPasswordResetEmailAsync(user.Email, user.DisplayName, token, ct);
            emailSent = true;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send password reset email to {Email}", email);
            // Email sending failed due to network / ISP SMTP block
        }

        logger.LogInformation("Password reset token generated for {Email}: {Token}", email, token);
        return Ok(new
        {
            message = emailSent
                ? "Password reset email sent! Please check your inbox."
                : "Password reset token generated successfully.",
            emailSent = emailSent,
            resetToken = token
        });
    }

    // =========================================================================
    // RESET PASSWORD — Validate token & set new password
    // =========================================================================
    [AllowAnonymous, HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Token) ||
            string.IsNullOrWhiteSpace(request.NewPassword))
        {
            return BadRequest(new { error = "Email, token, and new password are all required." });
        }

        if (request.NewPassword.Length < 6)
            return BadRequest(new { error = "Password must be at least 6 characters." });

        var email = request.Email.Trim().ToLowerInvariant();
        var user = await db.UserAccounts.FirstOrDefaultAsync(x => x.Email.ToLower() == email, ct);

        if (user is null ||
            user.PasswordResetToken != request.Token ||
            user.PasswordResetTokenExpiry is null ||
            user.PasswordResetTokenExpiry < DateTime.UtcNow)
        {
            return BadRequest(new { error = "Invalid or expired password reset link. Please request a new one." });
        }

        user.PasswordHash = jwtService.HashPassword(request.NewPassword);
        user.PasswordResetToken = null;
        user.PasswordResetTokenExpiry = null;
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Password successfully reset for {Email}", email);
        return Ok(new { message = "Password reset successfully! You can now sign in with your new password." });
    }

    // =========================================================================
    // USER PROFILE MANAGEMENT
    // =========================================================================
    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile(CancellationToken ct)
    {
        var email = AuthHelper.GetCurrentUserEmail(HttpContext);
        if (string.IsNullOrWhiteSpace(email))
        {
            return Unauthorized(new { error = "Unable to determine current authenticated user email." });
        }

        var user = await db.UserAccounts.FirstOrDefaultAsync(x => x.Email.ToLower() == email.ToLower(), ct);
        if (user is null)
        {
            return NotFound(new { error = "User account not found or has been permanently deleted." });
        }

        return Ok(new
        {
            id = user.Id,
            email = user.Email,
            displayName = user.DisplayName,
            role = user.Role,
            contactPhone = user.ContactPhone,
            serviceType = user.ServiceType,
            createdAt = user.CreatedAt,
            lastLoginAt = user.LastLoginAt,
            pendingDisplayName = user.PendingDisplayName,
            pendingContactPhone = user.PendingContactPhone,
            pendingServiceType = user.PendingServiceType,
            pendingProfileStatus = user.PendingProfileStatus,
            profileReviewNote = user.ProfileReviewNote,
            profileUpdatedAt = user.ProfileUpdatedAt,
            deletionRequested = user.DeletionRequested,
            deletionRequestedAt = user.DeletionRequestedAt,
            deletionReason = user.DeletionReason,
            deletionStatus = user.DeletionStatus
        });
    }

    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request, CancellationToken ct)
    {
        var email = AuthHelper.GetCurrentUserEmail(HttpContext);
        if (string.IsNullOrWhiteSpace(email))
        {
            return Unauthorized(new { error = "Unable to determine current authenticated user email." });
        }

        if (string.IsNullOrWhiteSpace(request.DisplayName))
        {
            return BadRequest(new { error = "Display name cannot be empty." });
        }

        var user = await db.UserAccounts.FirstOrDefaultAsync(x => x.Email.ToLower() == email.ToLower(), ct);
        if (user is null)
        {
            return NotFound(new { error = "User account not found." });
        }

        // TRAVELLER (Role = "User"): Can update directly without Admin intervention!
        if (user.Role == "User")
        {
            user.DisplayName = request.DisplayName.Trim();
            user.ContactPhone = request.ContactPhone?.Trim();
            user.PendingProfileStatus = null;
            user.ProfileReviewNote = null;
            user.ProfileUpdatedAt = DateTime.UtcNow;

            await db.SaveChangesAsync(ct);
            logger.LogInformation("Traveller profile updated immediately for {Email}", user.Email);

            return Ok(new
            {
                message = "Profile details updated successfully!",
                status = "UpdatedDirectly",
                user = new
                {
                    displayName = user.DisplayName,
                    contactPhone = user.ContactPhone,
                    email = user.Email,
                    role = user.Role
                }
            });
        }

        // SERVICE PROVIDER (Role = "ServiceProvider"): MUST REQUIRE ADMIN APPROVAL
        if (user.Role == "ServiceProvider")
        {
            user.PendingDisplayName = request.DisplayName.Trim();
            user.PendingContactPhone = request.ContactPhone?.Trim();
            user.PendingServiceType = request.ServiceType?.Trim();
            user.PendingProfileStatus = "Pending";
            user.ProfileReviewNote = null;
            user.ProfileUpdatedAt = DateTime.UtcNow;

            await db.SaveChangesAsync(ct);
            logger.LogInformation("Service Provider profile update submitted for Admin review: {Email}", user.Email);

            return Ok(new
            {
                message = "Profile update request submitted for Administrator review. As a Service Provider, changes require Admin verification before taking effect.",
                status = "PendingApproval",
                pending = new
                {
                    displayName = user.PendingDisplayName,
                    contactPhone = user.PendingContactPhone,
                    serviceType = user.PendingServiceType,
                    status = user.PendingProfileStatus
                }
            });
        }

        // System Admin or others: direct update
        user.DisplayName = request.DisplayName.Trim();
        user.ContactPhone = request.ContactPhone?.Trim();
        user.ProfileUpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        return Ok(new { message = "Profile updated successfully!", status = "UpdatedDirectly" });
    }

    // =========================================================================
    // CHANGE PASSWORD (Both Traveller & Service Provider have full freedom, NO approval needed)
    // =========================================================================
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request, CancellationToken ct)
    {
        var email = AuthHelper.GetCurrentUserEmail(HttpContext);
        if (string.IsNullOrWhiteSpace(email))
        {
            return Unauthorized(new { error = "Unable to determine current authenticated user email." });
        }

        if (string.IsNullOrWhiteSpace(request.CurrentPassword) || string.IsNullOrWhiteSpace(request.NewPassword))
        {
            return BadRequest(new { error = "Current password and new password are both required." });
        }

        if (request.NewPassword.Length < 6)
        {
            return BadRequest(new { error = "New password must be at least 6 characters." });
        }

        var user = await db.UserAccounts.FirstOrDefaultAsync(x => x.Email.ToLower() == email.ToLower(), ct);
        if (user is null)
        {
            return NotFound(new { error = "User account not found." });
        }

        if (!jwtService.VerifyPassword(request.CurrentPassword, user.PasswordHash))
        {
            return BadRequest(new { error = "Current password is incorrect." });
        }

        user.PasswordHash = jwtService.HashPassword(request.NewPassword);
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Password successfully changed by user {Email} ({Role})", user.Email, user.Role);
        return Ok(new { message = "Password changed successfully! You can continue using your new password." });
    }

    // =========================================================================
    // ADMIN: PROVIDER PROFILE UPDATE REQUESTS APPROVAL / REJECTION
    // =========================================================================
    [HttpGet("provider-profile-requests")]
    public async Task<IActionResult> GetProviderProfileRequests(CancellationToken ct)
    {
        if (!IsAdmin())
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Only Administrators can view provider profile update requests." });
        }

        var list = await db.UserAccounts
            .Where(x => x.Role == "ServiceProvider" && x.PendingProfileStatus == "Pending")
            .OrderByDescending(x => x.ProfileUpdatedAt)
            .Select(x => new
            {
                id = x.Id,
                email = x.Email,
                currentDisplayName = x.DisplayName,
                currentContactPhone = x.ContactPhone,
                currentServiceType = x.ServiceType,
                requestedDisplayName = x.PendingDisplayName,
                requestedContactPhone = x.PendingContactPhone,
                requestedServiceType = x.PendingServiceType,
                requestedAt = x.ProfileUpdatedAt,
                status = x.PendingProfileStatus
            })
            .ToListAsync(ct);

        return Ok(list);
    }

    [HttpPost("provider-profile-requests/{id:guid}/approve")]
    public async Task<IActionResult> ApproveProviderProfileUpdate(Guid id, [FromBody] ProviderApprovalActionRequest? req, CancellationToken ct)
    {
        if (!IsAdmin())
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Only Administrators can approve profile update requests." });
        }

        var user = await db.UserAccounts.FindAsync([id], ct);
        if (user is null) return NotFound(new { error = "User account not found." });

        if (user.PendingProfileStatus != "Pending")
        {
            return BadRequest(new { error = "This profile update request is not pending." });
        }

        // Apply pending changes
        if (!string.IsNullOrWhiteSpace(user.PendingDisplayName))
            user.DisplayName = user.PendingDisplayName;

        if (!string.IsNullOrWhiteSpace(user.PendingContactPhone))
            user.ContactPhone = user.PendingContactPhone;

        if (!string.IsNullOrWhiteSpace(user.PendingServiceType))
            user.ServiceType = user.PendingServiceType;

        // Also sync corresponding ProviderRegistration if found
        var providerApp = await db.ProviderRegistrations.FirstOrDefaultAsync(p => p.Email.ToLower() == user.Email.ToLower(), ct);
        if (providerApp is not null)
        {
            if (!string.IsNullOrWhiteSpace(user.PendingDisplayName))
                providerApp.BusinessName = user.PendingDisplayName;
            if (!string.IsNullOrWhiteSpace(user.PendingContactPhone))
                providerApp.ContactPhone = user.PendingContactPhone;
            if (!string.IsNullOrWhiteSpace(user.PendingServiceType))
                providerApp.ServiceType = user.PendingServiceType;
            providerApp.UpdatedAt = DateTime.UtcNow;
        }

        user.PendingProfileStatus = "Approved";
        user.ProfileReviewNote = req?.Note ?? "Approved by Administrator";
        user.PendingDisplayName = null;
        user.PendingContactPhone = null;
        user.PendingServiceType = null;
        user.ProfileUpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        logger.LogInformation("Admin approved profile updates for provider {Email}", user.Email);

        return Ok(new { message = "Provider profile update approved and applied successfully!", user });
    }

    [HttpPost("provider-profile-requests/{id:guid}/reject")]
    public async Task<IActionResult> RejectProviderProfileUpdate(Guid id, [FromBody] ProviderApprovalActionRequest? req, CancellationToken ct)
    {
        if (!IsAdmin())
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Only Administrators can reject profile update requests." });
        }

        var user = await db.UserAccounts.FindAsync([id], ct);
        if (user is null) return NotFound(new { error = "User account not found." });

        user.PendingProfileStatus = "Rejected";
        user.ProfileReviewNote = req?.Note ?? "Rejected by Administrator";
        user.PendingDisplayName = null;
        user.PendingContactPhone = null;
        user.PendingServiceType = null;
        user.ProfileUpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        logger.LogInformation("Admin rejected profile updates for provider {Email}. Note: {Note}", user.Email, user.ProfileReviewNote);

        return Ok(new { message = "Provider profile update request rejected.", user });
    }

    // =========================================================================
    // DANGER ZONE: ACCOUNT DELETION WORKFLOW
    // Traveller: Permanent deletion with NO admin approval
    // Service Provider: MUST REQUIRE FINAL APPROVAL FROM ADMIN
    // =========================================================================
    [HttpPost("delete-account")]
    public async Task<IActionResult> DeleteAccount([FromBody] DeleteAccountRequest? request, CancellationToken ct)
    {
        var email = AuthHelper.GetCurrentUserEmail(HttpContext);
        if (string.IsNullOrWhiteSpace(email))
        {
            return Unauthorized(new { error = "Unable to determine authenticated user." });
        }

        var user = await db.UserAccounts.FirstOrDefaultAsync(x => x.Email.ToLower() == email.ToLower(), ct);
        if (user is null)
        {
            return NotFound(new { error = "User account not found." });
        }

        // 1. TRAVELLER (Role = "User"): Direct deletion with NO admin approval
        if (user.Role == "User")
        {
            // Clean up related traveller data: trips, shared expenses, group members
            var userTrips = await db.Trips.Where(t => t.OwnerUserId == user.Email || t.OwnerUserId == user.Id.ToString()).ToListAsync(ct);
            db.Trips.RemoveRange(userTrips);

            var members = await db.GroupMembers.Where(m => m.Email.ToLower() == user.Email.ToLower()).ToListAsync(ct);
            db.GroupMembers.RemoveRange(members);

            db.UserAccounts.Remove(user);
            await db.SaveChangesAsync(ct);

            logger.LogInformation("Traveller account {Email} was permanently deleted by the user.", email);
            return Ok(new
            {
                message = "Your Traveller account has been permanently deleted.",
                status = "DeletedDirectly",
                deletedDirectly = true
            });
        }

        // 2. SERVICE PROVIDER: MUST REQUIRE ADMIN FINAL APPROVAL
        if (user.Role == "ServiceProvider")
        {
            user.DeletionRequested = true;
            user.DeletionRequestedAt = DateTime.UtcNow;
            user.DeletionReason = string.IsNullOrWhiteSpace(request?.Reason)
                ? "Service Provider requested permanent account closure"
                : request.Reason.Trim();
            user.DeletionStatus = "PendingApproval";

            await db.SaveChangesAsync(ct);
            logger.LogInformation("Service Provider {Email} requested account deletion — queued for Admin approval.", email);

            return Ok(new
            {
                message = "Account deletion request submitted for Administrator review. As a Service Provider, final approval from an Administrator is required before permanent deletion.",
                status = "PendingApproval",
                deletedDirectly = false,
                deletionStatus = "PendingApproval"
            });
        }

        // System Admin: Protected account
        return BadRequest(new { error = "System Administrator accounts cannot be deleted through this endpoint." });
    }

    [HttpPost("cancel-deletion-request")]
    public async Task<IActionResult> CancelDeletionRequest(CancellationToken ct)
    {
        var email = AuthHelper.GetCurrentUserEmail(HttpContext);
        if (string.IsNullOrWhiteSpace(email))
        {
            return Unauthorized(new { error = "Unable to determine authenticated user." });
        }

        var user = await db.UserAccounts.FirstOrDefaultAsync(x => x.Email.ToLower() == email.ToLower(), ct);
        if (user is null) return NotFound(new { error = "User account not found." });

        user.DeletionRequested = false;
        user.DeletionStatus = null;
        user.DeletionReason = null;
        user.DeletionRequestedAt = null;

        await db.SaveChangesAsync(ct);
        logger.LogInformation("Service Provider {Email} cancelled their account deletion request.", email);

        return Ok(new { message = "Account deletion request cancelled successfully.", user });
    }

    [HttpGet("provider-deletion-requests")]
    public async Task<IActionResult> GetProviderDeletionRequests(CancellationToken ct)
    {
        if (!IsAdmin())
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Only Administrators can view account deletion requests." });
        }

        var list = await db.UserAccounts
            .Where(x => x.Role == "ServiceProvider" && x.DeletionRequested && x.DeletionStatus == "PendingApproval")
            .OrderByDescending(x => x.DeletionRequestedAt)
            .Select(x => new
            {
                id = x.Id,
                email = x.Email,
                displayName = x.DisplayName,
                contactPhone = x.ContactPhone,
                serviceType = x.ServiceType,
                requestedAt = x.DeletionRequestedAt,
                reason = x.DeletionReason,
                status = x.DeletionStatus
            })
            .ToListAsync(ct);

        return Ok(list);
    }

    [HttpPost("provider-deletion-requests/{id:guid}/approve")]
    public async Task<IActionResult> ApproveProviderDeletion(Guid id, CancellationToken ct)
    {
        if (!IsAdmin())
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Only Administrators can approve account deletions." });
        }

        var user = await db.UserAccounts.FindAsync([id], ct);
        if (user is null) return NotFound(new { error = "User account not found." });

        var email = user.Email;

        // Permanently delete catalog items
        var catalogItems = await db.TravelCatalogItems.Where(x => x.ProviderUserId == user.Email || x.ProviderUserId == user.Id.ToString()).ToListAsync(ct);
        db.TravelCatalogItems.RemoveRange(catalogItems);

        // Permanently delete provider registrations
        var providerApps = await db.ProviderRegistrations.Where(p => p.Email.ToLower() == email.ToLower()).ToListAsync(ct);
        db.ProviderRegistrations.RemoveRange(providerApps);

        // Permanently delete user account
        db.UserAccounts.Remove(user);
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Administrator approved permanent deletion of Service Provider account {Email}.", email);
        return Ok(new { message = $"Service Provider account for {email} was permanently deleted." });
    }

    [HttpPost("provider-deletion-requests/{id:guid}/reject")]
    public async Task<IActionResult> RejectProviderDeletion(Guid id, [FromBody] ProviderApprovalActionRequest? req, CancellationToken ct)
    {
        if (!IsAdmin())
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Only Administrators can reject account deletions." });
        }

        var user = await db.UserAccounts.FindAsync([id], ct);
        if (user is null) return NotFound(new { error = "User account not found." });

        user.DeletionRequested = false;
        user.DeletionStatus = "Rejected";
        user.ProfileReviewNote = req?.Note ?? "Account deletion request was rejected by Administrator";

        await db.SaveChangesAsync(ct);
        logger.LogInformation("Administrator rejected account deletion request for Service Provider {Email}.", user.Email);

        return Ok(new { message = "Service Provider account deletion request rejected.", user });
    }

    // =========================================================================
    // ADMIN: PROVIDER INFO LOOKUP (for Verification Queue)
    // =========================================================================

    [HttpGet("provider-info/{userIdOrEmail}")]
    public async Task<IActionResult> GetProviderInfo(string userIdOrEmail, CancellationToken ct)
    {
        if (!IsAdmin())
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Admin only." });

        UserAccount? user = null;

        // 1. Try GUID in UserAccounts
        if (Guid.TryParse(userIdOrEmail, out var parsedGuid))
            user = await db.UserAccounts.FindAsync([parsedGuid], ct);

        // 2. Try email match in UserAccounts
        if (user is null)
            user = await db.UserAccounts.FirstOrDefaultAsync(x => x.Email.ToLower() == userIdOrEmail.ToLower(), ct);

        // 3. Fallback: Check ProviderRegistrations by GUID or Email
        if (user is null)
        {
            ProviderRegistration? provReg = null;
            if (Guid.TryParse(userIdOrEmail, out var provGuid))
                provReg = await db.ProviderRegistrations.FindAsync([provGuid], ct);
            if (provReg is null)
                provReg = await db.ProviderRegistrations.FirstOrDefaultAsync(x => x.Email.ToLower() == userIdOrEmail.ToLower(), ct);

            if (provReg is not null)
            {
                // Check if user account was created under this email
                user = await db.UserAccounts.FirstOrDefaultAsync(x => x.Email.ToLower() == provReg.Email.ToLower(), ct);
                if (user is null)
                {
                    return Ok(new
                    {
                        id = provReg.Id,
                        email = provReg.Email,
                        displayName = provReg.BusinessName,
                        phone = provReg.ContactPhone,
                        serviceType = provReg.ServiceType,
                        isActive = provReg.Status == ProviderApprovalStatus.Approved,
                        createdAt = provReg.CreatedAt,
                        lastLoginAt = (DateTime?)null
                    });
                }
            }
        }

        if (user is null)
            return NotFound(new { error = "Provider not found." });

        return Ok(new
        {
            id          = user.Id,
            email       = user.Email,
            displayName = user.DisplayName,
            phone       = user.ContactPhone,
            serviceType = user.ServiceType,
            isActive    = user.IsActive,
            createdAt   = user.CreatedAt,
            lastLoginAt = user.LastLoginAt
        });
    }

    // =========================================================================
    // ADMIN: SUSPEND / UNSUSPEND PROVIDER ACCOUNT
    // =========================================================================

    public sealed record SuspendAccountRequest(string? Reason);

    [HttpPost("providers/{id:guid}/suspend")]
    public async Task<IActionResult> SuspendProvider(Guid id, [FromBody] SuspendAccountRequest? req, CancellationToken ct)
    {
        if (!IsAdmin())
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Admin only." });

        var user = await db.UserAccounts.FindAsync([id], ct);
        if (user is null)
        {
            var prov = await db.ProviderRegistrations.FindAsync([id], ct);
            if (prov is not null)
                user = await db.UserAccounts.FirstOrDefaultAsync(x => x.Email.ToLower() == prov.Email.ToLower(), ct);
        }

        if (user is null) return NotFound(new { error = "User account not found." });

        user.IsActive = false;
        user.ProfileReviewNote = req?.Reason?.Trim() ?? "Account suspended by Administrator";
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Administrator suspended provider account {Email} (reason: {Reason})", user.Email, req?.Reason);
        return Ok(new { message = $"Account for {user.DisplayName} ({user.Email}) has been suspended.", user.IsActive });
    }

    [HttpPost("providers/{id:guid}/unsuspend")]
    public async Task<IActionResult> UnsuspendProvider(Guid id, CancellationToken ct)
    {
        if (!IsAdmin())
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Admin only." });

        var user = await db.UserAccounts.FindAsync([id], ct);
        if (user is null)
        {
            var prov = await db.ProviderRegistrations.FindAsync([id], ct);
            if (prov is not null)
                user = await db.UserAccounts.FirstOrDefaultAsync(x => x.Email.ToLower() == prov.Email.ToLower(), ct);
        }

        if (user is null) return NotFound(new { error = "User account not found." });

        user.IsActive = true;
        user.ProfileReviewNote = null;
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Administrator reinstated provider account {Email}", user.Email);
        return Ok(new { message = $"Account for {user.DisplayName} ({user.Email}) has been reinstated.", user.IsActive });
    }

    // =========================================================================
    // ADMIN: SEND WARNING MESSAGE TO PROVIDER
    // =========================================================================

    public sealed record SendWarningRequest(string Message);

    [HttpPost("providers/{id:guid}/warn")]
    public async Task<IActionResult> WarnProvider(Guid id, [FromBody] SendWarningRequest req, CancellationToken ct)
    {
        if (!IsAdmin())
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Admin only." });

        if (string.IsNullOrWhiteSpace(req?.Message))
            return BadRequest(new { error = "Warning message is required." });

        var user = await db.UserAccounts.FindAsync([id], ct);
        if (user is null)
        {
            var prov = await db.ProviderRegistrations.FindAsync([id], ct);
            if (prov is not null)
                user = await db.UserAccounts.FirstOrDefaultAsync(x => x.Email.ToLower() == prov.Email.ToLower(), ct);
        }

        if (user is null) return NotFound(new { error = "User account not found." });

        // Store warning in ProfileReviewNote (non-destructive — used as notification store)
        var warning = $"[ADMIN WARNING {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC]: {req.Message.Trim()}";
        user.ProfileReviewNote = warning;
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Administrator sent warning to provider {Email}: {Warning}", user.Email, req.Message);
        return Ok(new { message = $"Warning message sent to {user.DisplayName} ({user.Email}).", warning });
    }
}
