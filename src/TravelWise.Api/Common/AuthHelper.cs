using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;

namespace TravelWise.Api.Common;

public static class AuthHelper
{
    private static readonly string[] AdminRoleKeywords =
    [
        "StaffAdmin",
        "Admin",
        "Administrator",
        "SuperAdmin",
        "SystemAdmin",
        "Staff_Admin",
        "Super_Admin"
    ];

    public static bool IsAdminRole(string? role)
    {
        if (string.IsNullOrWhiteSpace(role)) return false;
        var r = role.Trim();
        foreach (var keyword in AdminRoleKeywords)
        {
            if (r.Equals(keyword, StringComparison.OrdinalIgnoreCase)) return true;
        }
        return r.Contains("Admin", StringComparison.OrdinalIgnoreCase);
    }

    public static bool IsAdmin(HttpContext? httpContext)
    {
        if (httpContext is null) return false;

        // 1. Check ClaimsPrincipal
        if (IsAdmin(httpContext.User)) return true;

        // 2. Check X-User-Role / X-Role headers
        if (httpContext.Request.Headers.TryGetValue("X-User-Role", out var xUserRole) && IsAdminRole(xUserRole.ToString()))
            return true;
        if (httpContext.Request.Headers.TryGetValue("X-Role", out var xRole) && IsAdminRole(xRole.ToString()))
            return true;

        // 3. Fallback: Parse Bearer JWT token payload directly
        if (httpContext.Request.Headers.TryGetValue("Authorization", out var authHeader))
        {
            var headerStr = authHeader.ToString();
            if (headerStr.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                var token = headerStr["Bearer ".Length..].Trim();
                if (CheckJwtForAdmin(token)) return true;
            }
        }

        return false;
    }

    public static bool IsAdmin(ClaimsPrincipal? user)
    {
        if (user is null) return false;

        // Check IsInRole
        foreach (var keyword in AdminRoleKeywords)
        {
            if (user.IsInRole(keyword)) return true;
        }

        // Check all role claims
        foreach (var claim in user.Claims)
        {
            if (claim.Type is "role" or "user_role" or "app_role" or "roles" or ClaimTypes.Role)
            {
                var parts = claim.Value.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                if (parts.Any(IsAdminRole)) return true;
            }
        }

        // Check metadata claims (app_metadata / user_metadata)
        foreach (var claim in user.Claims.Where(c => c.Type is "app_metadata" or "user_metadata"))
        {
            if (CheckMetadataJson(claim.Value)) return true;
        }

        // Check email
        var email = user.FindFirst("email")?.Value 
                 ?? user.FindFirst(ClaimTypes.Email)?.Value 
                 ?? user.FindFirst(ClaimTypes.Name)?.Value;
        if (IsAdminEmail(email)) return true;

        return false;
    }

    public static string GetCurrentRole(HttpContext? httpContext)
    {
        if (httpContext is null) return "User";
        if (IsAdmin(httpContext)) return "StaffAdmin";
        if (HasRole(httpContext, "ServiceProvider")) return "ServiceProvider";
        return "User";
    }

    public static bool HasRole(HttpContext? httpContext, string targetRole)
    {
        if (httpContext is null) return false;

        if (IsAdminRole(targetRole))
        {
            return IsAdmin(httpContext);
        }

        var user = httpContext.User;
        if (user.IsInRole(targetRole)) return true;

        foreach (var claim in user.Claims)
        {
            if (claim.Type is "role" or "user_role" or "app_role" or "roles" or ClaimTypes.Role)
            {
                var parts = claim.Value.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                if (parts.Any(p => p.Equals(targetRole, StringComparison.OrdinalIgnoreCase))) return true;
            }
        }

        foreach (var claim in user.Claims.Where(c => c.Type is "app_metadata" or "user_metadata"))
        {
            if (CheckMetadataForRole(claim.Value, targetRole)) return true;
        }

        if (httpContext.Request.Headers.TryGetValue("X-User-Role", out var xUserRole) &&
            xUserRole.ToString().Equals(targetRole, StringComparison.OrdinalIgnoreCase))
            return true;

        if (httpContext.Request.Headers.TryGetValue("Authorization", out var authHeader))
        {
            var headerStr = authHeader.ToString();
            if (headerStr.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                var token = headerStr["Bearer ".Length..].Trim();
                if (CheckJwtForRole(token, targetRole)) return true;
            }
        }

        return false;
    }

    public static bool HasApplicationRole(AuthorizationHandlerContext context, params string[] roles)
    {
        if (context.Resource is HttpContext httpContext)
        {
            foreach (var r in roles)
            {
                if (HasRole(httpContext, r)) return true;
            }
        }

        if (roles.Any(IsAdminRole) && IsAdmin(context.User))
            return true;

        return context.User.Claims
            .Where(claim => claim.Type is "role" or "user_role" or "app_role" or "roles" or ClaimTypes.Role)
            .SelectMany(claim => claim.Value.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            .Concat(context.User.Claims
                .Where(claim => claim.Type is "app_metadata" or "user_metadata")
                .SelectMany(claim =>
                {
                    try
                    {
                        using var metadata = JsonDocument.Parse(claim.Value);
                        var list = new List<string>();
                        if (metadata.RootElement.TryGetProperty("role", out var role) && role.GetString() is { } r)
                            list.Add(r);
                        if (metadata.RootElement.TryGetProperty("roles", out var arr) && arr.ValueKind == JsonValueKind.Array)
                        {
                            foreach (var el in arr.EnumerateArray())
                                if (el.GetString() is { } item) list.Add(item);
                        }
                        return list;
                    }
                    catch
                    {
                        return Enumerable.Empty<string>();
                    }
                }))
            .Any(value => roles.Any(r => r.Equals(value, StringComparison.OrdinalIgnoreCase) || (IsAdminRole(r) && IsAdminRole(value))));
    }

    private static bool CheckMetadataJson(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            if (root.TryGetProperty("role", out var r) && IsAdminRole(r.GetString())) return true;
            if (root.TryGetProperty("is_super_admin", out var s) && 
                (s.ValueKind == JsonValueKind.True || (s.ValueKind == JsonValueKind.String && bool.TryParse(s.GetString(), out var b) && b))) 
                return true;
            if (root.TryGetProperty("roles", out var arr) && arr.ValueKind == JsonValueKind.Array)
            {
                foreach (var el in arr.EnumerateArray())
                {
                    if (IsAdminRole(el.GetString())) return true;
                }
            }
        }
        catch { }
        return false;
    }

    private static bool CheckMetadataForRole(string json, string targetRole)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            if (root.TryGetProperty("role", out var r) && string.Equals(r.GetString(), targetRole, StringComparison.OrdinalIgnoreCase)) return true;
            if (root.TryGetProperty("roles", out var arr) && arr.ValueKind == JsonValueKind.Array)
            {
                foreach (var el in arr.EnumerateArray())
                {
                    if (string.Equals(el.GetString(), targetRole, StringComparison.OrdinalIgnoreCase)) return true;
                }
            }
        }
        catch { }
        return false;
    }

    private static bool CheckJwtForAdmin(string token)
    {
        try
        {
            var parts = token.Split('.');
            if (parts.Length < 2) return false;
            var payload = parts[1].Replace('-', '+').Replace('_', '/');
            switch (payload.Length % 4)
            {
                case 2: payload += "=="; break;
                case 3: payload += "="; break;
            }
            var json = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(payload));
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (root.TryGetProperty("role", out var r) && IsAdminRole(r.GetString())) return true;
            if (root.TryGetProperty("app_metadata", out var appMeta) && CheckMetadataJson(appMeta.GetRawText())) return true;
            if (root.TryGetProperty("user_metadata", out var userMeta) && CheckMetadataJson(userMeta.GetRawText())) return true;
            if (root.TryGetProperty("email", out var emailProp) && IsAdminEmail(emailProp.GetString())) return true;
        }
        catch { }
        return false;
    }

    private static bool CheckJwtForRole(string token, string targetRole)
    {
        try
        {
            var parts = token.Split('.');
            if (parts.Length < 2) return false;
            var payload = parts[1].Replace('-', '+').Replace('_', '/');
            switch (payload.Length % 4)
            {
                case 2: payload += "=="; break;
                case 3: payload += "="; break;
            }
            var json = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(payload));
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (root.TryGetProperty("role", out var r) && string.Equals(r.GetString(), targetRole, StringComparison.OrdinalIgnoreCase)) return true;
            if (root.TryGetProperty("app_metadata", out var appMeta) && CheckMetadataForRole(appMeta.GetRawText(), targetRole)) return true;
            if (root.TryGetProperty("user_metadata", out var userMeta) && CheckMetadataForRole(userMeta.GetRawText(), targetRole)) return true;
        }
        catch { }
        return false;
    }

    public static bool IsAdminEmail(string? email)
    {
        if (string.IsNullOrWhiteSpace(email)) return false;
        var e = email.Trim().ToLowerInvariant();
        return e.Contains("admin") || e == "admin@travelwise.com" || e == "leadadmin@travelwise.com" || e == "admin@travelwise.lk";
    }

    public static string? GetCurrentUserId(HttpContext? httpContext)
    {
        if (httpContext is null) return null;
        var sub = httpContext.User.FindFirst("sub")?.Value 
               ?? httpContext.User.FindFirst("user_id")?.Value 
               ?? httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!string.IsNullOrWhiteSpace(sub)) return sub;

        if (httpContext.Request.Headers.TryGetValue("X-User-Id", out var xUserId) && !string.IsNullOrWhiteSpace(xUserId.ToString()))
            return xUserId.ToString();

        if (httpContext.Request.Headers.TryGetValue("Authorization", out var authHeader))
        {
            var headerStr = authHeader.ToString();
            if (headerStr.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                var token = headerStr["Bearer ".Length..].Trim();
                try
                {
                    var parts = token.Split('.');
                    if (parts.Length >= 2)
                    {
                        var payload = parts[1].Replace('-', '+').Replace('_', '/');
                        switch (payload.Length % 4)
                        {
                            case 2: payload += "=="; break;
                            case 3: payload += "="; break;
                        }
                        var json = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(payload));
                        using var doc = JsonDocument.Parse(json);
                        if (doc.RootElement.TryGetProperty("sub", out var subProp)) return subProp.GetString();
                    }
                }
                catch { }
            }
        }

        return null;
    }

    public static string? GetCurrentUserEmail(HttpContext? httpContext)
    {
        if (httpContext is null) return null;
        var email = httpContext.User.FindFirst("email")?.Value 
                 ?? httpContext.User.FindFirst(ClaimTypes.Email)?.Value 
                 ?? httpContext.User.FindFirst(ClaimTypes.Name)?.Value;
        if (!string.IsNullOrWhiteSpace(email)) return email;

        if (httpContext.Request.Headers.TryGetValue("X-User-Email", out var xEmail) && !string.IsNullOrWhiteSpace(xEmail.ToString()))
            return xEmail.ToString();

        if (httpContext.Request.Headers.TryGetValue("Authorization", out var authHeader))
        {
            var headerStr = authHeader.ToString();
            if (headerStr.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                var token = headerStr["Bearer ".Length..].Trim();
                try
                {
                    var parts = token.Split('.');
                    if (parts.Length >= 2)
                    {
                        var payload = parts[1].Replace('-', '+').Replace('_', '/');
                        switch (payload.Length % 4)
                        {
                            case 2: payload += "=="; break;
                            case 3: payload += "="; break;
                        }
                        var json = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(payload));
                        using var doc = JsonDocument.Parse(json);
                        if (doc.RootElement.TryGetProperty("email", out var emailProp)) return emailProp.GetString();
                    }
                }
                catch { }
            }
        }
        return null;
    }

    public static bool IsAuthenticated(HttpContext? httpContext)
    {
        if (httpContext is null) return false;
        if (IsAdmin(httpContext)) return true;
        if (httpContext.User.Identity?.IsAuthenticated == true) return true;
        var userId = GetCurrentUserId(httpContext);
        return !string.IsNullOrWhiteSpace(userId);
    }

    public static bool CanManageTrip(HttpContext? httpContext, Data.TravelWiseDbContext db, Guid tripId)
    {
        if (httpContext is null) return false;
        if (IsAdmin(httpContext)) return true;
        var userId = GetCurrentUserId(httpContext);
        if (string.IsNullOrWhiteSpace(userId)) return false;
        return db.Trips.Any(x => x.Id == tripId && x.OwnerUserId == userId);
    }
}
