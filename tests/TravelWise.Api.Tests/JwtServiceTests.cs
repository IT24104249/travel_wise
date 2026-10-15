using System.IdentityModel.Tokens.Jwt;
using Microsoft.Extensions.Configuration;
using TravelWise.Api.Models;
using TravelWise.Api.Services;
using Xunit;

namespace TravelWise.Api.Tests;

public class JwtServiceTests
{
    private readonly IConfiguration _configuration;
    private readonly JwtService _jwtService;

    public JwtServiceTests()
    {
        var inMemorySettings = new Dictionary<string, string?>
        {
            ["Jwt:Key"] = "SuperSecretTestJwtKeyAtLeast32BytesLong123456!",
            ["Jwt:Issuer"] = "TravelWise.Api.Tests",
            ["Jwt:Audience"] = "TravelWise.Client.Tests",
            ["Jwt:ExpiryMinutes"] = "60"
        };
        _configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();
        _jwtService = new JwtService(_configuration);
    }

    [Fact]
    public void HashPassword_ProducesSaltedHash_AndVerifiesCorrectly()
    {
        const string password = "TestPassword@2026";
        var hash1 = _jwtService.HashPassword(password);
        var hash2 = _jwtService.HashPassword(password);

        // Different salts produce different hashes
        Assert.NotEqual(hash1, hash2);

        // Both verify correctly
        Assert.True(_jwtService.VerifyPassword(password, hash1));
        Assert.True(_jwtService.VerifyPassword(password, hash2));
    }

    [Fact]
    public void VerifyPassword_RejectsIncorrectPassword()
    {
        const string password = "CorrectPassword123";
        var hash = _jwtService.HashPassword(password);

        Assert.False(_jwtService.VerifyPassword("WrongPassword", hash));
    }

    [Fact]
    public void GenerateToken_ProducesValidJwtWithExpectedClaims()
    {
        var user = new UserAccount
        {
            Id = Guid.NewGuid(),
            Email = "alex.perera@travelwise.lk",
            DisplayName = "Alex Perera",
            Role = "Traveller"
        };

        var tokenString = _jwtService.GenerateToken(user);
        Assert.False(string.IsNullOrWhiteSpace(tokenString));

        var handler = new JwtSecurityTokenHandler();
        Assert.True(handler.CanReadToken(tokenString));

        var token = handler.ReadJwtToken(tokenString);
        Assert.Equal("TravelWise.Api.Tests", token.Issuer);
        Assert.Contains(token.Audiences, a => a == "TravelWise.Client.Tests");

        var subClaim = token.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Sub);
        Assert.NotNull(subClaim);
        Assert.Equal(user.Id.ToString(), subClaim.Value);

        var emailClaim = token.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Email);
        Assert.NotNull(emailClaim);
        Assert.Equal(user.Email, emailClaim.Value);
    }
}
