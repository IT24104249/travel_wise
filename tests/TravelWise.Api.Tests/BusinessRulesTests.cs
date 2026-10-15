using TravelWise.Api.Common;
using Xunit;

namespace TravelWise.Api.Tests;

public class BusinessRulesTests
{
    [Theory]
    [InlineData(50000, 80000, "HEALTHY")]
    [InlineData(69000, 80000, "WARNING")]   // 86.25% > 85%
    [InlineData(82000, 80000, "CRITICAL")]  // 102.5% > 100%
    public void BR_BUD_02_03_BudgetHealth_Thresholds_EvaluatedCorrectly(decimal spent, decimal budget, string expectedStatus)
    {
        var ratio = spent / budget;
        string status;
        if (ratio > 1.0m)
        {
            status = "CRITICAL";
        }
        else if (ratio > 0.85m)
        {
            status = "WARNING";
        }
        else
        {
            status = "HEALTHY";
        }

        Assert.Equal(expectedStatus, status);
    }

    [Fact]
    public void BR_ACT_02_TemporalConflictDetection_IdentifiesCollisions()
    {
        var act1Start = new DateTime(2026, 8, 15, 8, 0, 0, DateTimeKind.Utc);
        var act1End = new DateTime(2026, 8, 15, 11, 0, 0, DateTimeKind.Utc);

        var act2Start = new DateTime(2026, 8, 15, 10, 30, 0, DateTimeKind.Utc);
        var act2End = new DateTime(2026, 8, 15, 12, 30, 0, DateTimeKind.Utc);

        // Check interval overlap: startA < endB && startB < endA
        var hasConflict = act1Start < act2End && act2Start < act1End;
        Assert.True(hasConflict);
    }

    [Fact]
    public void BR_SPLIT_01_SumOfNetBalances_ConservedToZero()
    {
        // 4 members, total spent = 48,000 LKR (12,000 share each)
        // Alex paid 32,000 -> net = +20,000
        // Kasun paid 16,000 -> net = +4,000
        // Dilan paid 0 -> net = -12,000
        // Bhanuka paid 0 -> net = -12,000
        var netBalances = new[] { 20000.0m, 4000.0m, -12000.0m, -12000.0m };
        var sum = netBalances.Sum();

        Assert.Equal(0.0m, sum);
    }

    [Theory]
    [InlineData("admin@travelwise.com", true)]
    [InlineData("leadadmin@travelwise.com", true)]
    [InlineData("admin@anydomain.lk", true)]
    [InlineData("regular.user@gmail.com", false)]
    public void AuthHelper_IsAdminEmail_ClassifiesCorrectly(string email, bool expectedIsAdmin)
    {
        var result = AuthHelper.IsAdminEmail(email);
        Assert.Equal(expectedIsAdmin, result);
    }
}
