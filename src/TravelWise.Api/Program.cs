using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using TravelWise.Api.Common;
using TravelWise.Api.Data;
using TravelWise.Api.Services;

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
});

// Register JWT Service
builder.Services.AddScoped<IJwtService, JwtService>();

// Register Email Service (Gmail SMTP via MailKit)
builder.Services.AddScoped<IEmailService, EmailService>();

// Configure Native ASP.NET Core JWT Bearer Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? "TravelWise_Secret_Key_For_Jwt_Auth_SE3090_Assignment1_AtLeast32BytesLong!";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "TravelWise.Api";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "TravelWise.Client";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero,
        NameClaimType = "email",
        RoleClaimType = "role"
    };
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("ProviderOrAdmin", policy => policy.RequireAssertion(context =>
        AuthHelper.HasApplicationRole(context, "ServiceProvider", "StaffAdmin", "Admin")));
    options.AddPolicy("StaffAdmin", policy => policy.RequireAssertion(context =>
        AuthHelper.HasApplicationRole(context, "StaffAdmin", "Admin")));
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "TravelWise.Api", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer {token}'",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddHealthChecks().AddDbContextCheck<TravelWiseDbContext>("supabase-database");
builder.Services.AddHttpClient<AiWorkflowClient>();
builder.Services.AddHttpClient();
builder.Services.AddDbContext<TravelWiseDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Supabase")));
builder.Services.AddScoped<TravelWiseService>();
builder.Services.AddCors(options => options.AddPolicy("clients", policy =>
    policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

// Apply all pending EF Core migrations on startup (creates tables if missing)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<TravelWiseDbContext>();
    try
    {
        await db.Database.MigrateAsync();
        await db.Database.ExecuteSqlRawAsync(@"
            ALTER TABLE ""UserAccounts"" ADD COLUMN IF NOT EXISTS ""PasswordResetToken"" text;
            ALTER TABLE ""UserAccounts"" ADD COLUMN IF NOT EXISTS ""PasswordResetTokenExpiry"" timestamp with time zone;
            ALTER TABLE ""UserAccounts"" ADD COLUMN IF NOT EXISTS ""PendingDisplayName"" text;
            ALTER TABLE ""UserAccounts"" ADD COLUMN IF NOT EXISTS ""PendingContactPhone"" text;
            ALTER TABLE ""UserAccounts"" ADD COLUMN IF NOT EXISTS ""PendingServiceType"" text;
            ALTER TABLE ""UserAccounts"" ADD COLUMN IF NOT EXISTS ""PendingProfileStatus"" text;
            ALTER TABLE ""UserAccounts"" ADD COLUMN IF NOT EXISTS ""ProfileReviewNote"" text;
            ALTER TABLE ""UserAccounts"" ADD COLUMN IF NOT EXISTS ""ProfileUpdatedAt"" timestamp with time zone;
            ALTER TABLE ""UserAccounts"" ADD COLUMN IF NOT EXISTS ""DeletionRequested"" boolean DEFAULT false;
            ALTER TABLE ""UserAccounts"" ADD COLUMN IF NOT EXISTS ""DeletionRequestedAt"" timestamp with time zone;
            ALTER TABLE ""UserAccounts"" ADD COLUMN IF NOT EXISTS ""DeletionReason"" text;
            ALTER TABLE ""UserAccounts"" ADD COLUMN IF NOT EXISTS ""DeletionStatus"" text;

            ALTER TABLE ""Trips"" ADD COLUMN IF NOT EXISTS ""StartingPoint"" text;
            ALTER TABLE ""Trips"" ADD COLUMN IF NOT EXISTS ""TravellerName"" text;
            ALTER TABLE ""Trips"" ADD COLUMN IF NOT EXISTS ""TravellerEmail"" text;
            ALTER TABLE ""Trips"" ADD COLUMN IF NOT EXISTS ""TravelMethod"" text;
            ALTER TABLE ""Trips"" ADD COLUMN IF NOT EXISTS ""TravelVehicleType"" text;
            ALTER TABLE ""Trips"" ADD COLUMN IF NOT EXISTS ""Status"" text DEFAULT 'Active';
            ALTER TABLE ""Trips"" ADD COLUMN IF NOT EXISTS ""SubmittedToAdmin"" boolean DEFAULT false;
            ALTER TABLE ""Trips"" ADD COLUMN IF NOT EXISTS ""SubmittedAt"" timestamp with time zone;
            ALTER TABLE ""Trips"" ADD COLUMN IF NOT EXISTS ""AdminFeedback"" text;
            ALTER TABLE ""Trips"" ADD COLUMN IF NOT EXISTS ""AdminWarningNote"" text;
            ALTER TABLE ""Trips"" ADD COLUMN IF NOT EXISTS ""PlanningDetailsJson"" text;
            ALTER TABLE ""Trips"" ADD COLUMN IF NOT EXISTS ""AdminApprovedAiReviewJson"" text;
            ALTER TABLE ""Trips"" ADD COLUMN IF NOT EXISTS ""AdminCorrectionNotes"" text;
        ");

        // Destination Feature — auto-create tables if not yet migrated via dotnet ef
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS ""Destinations"" (
                ""Id""          uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                ""Name""        varchar(200) NOT NULL,
                ""Description"" text,
                ""Region""      text,
                ""CreatedBy""   text         NOT NULL DEFAULT '',
                ""CreatedAt""   timestamptz  NOT NULL DEFAULT now(),
                ""UpdatedAt""   timestamptz  NOT NULL DEFAULT now(),
                ""IsActive""    boolean      NOT NULL DEFAULT true
            );
            CREATE INDEX IF NOT EXISTS ""IX_Destinations_Name_CreatedBy"" ON ""Destinations"" (""Name"", ""CreatedBy"");
            ALTER TABLE ""Destinations"" ADD COLUMN IF NOT EXISTS ""Status"" text NOT NULL DEFAULT 'NotVerified';
            ALTER TABLE ""Destinations"" ADD COLUMN IF NOT EXISTS ""VerifiedAt"" timestamptz;
            ALTER TABLE ""Destinations"" ADD COLUMN IF NOT EXISTS ""VerifiedBy"" text;
            ALTER TABLE ""Destinations"" ADD COLUMN IF NOT EXISTS ""AdminFeedback"" text;
            CREATE INDEX IF NOT EXISTS ""IX_Destinations_Status"" ON ""Destinations"" (""Status"");

            CREATE TABLE IF NOT EXISTS ""VisitingPlaces"" (
                ""Id""             uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                ""DestinationId""  uuid        NOT NULL REFERENCES ""Destinations""(""Id"") ON DELETE CASCADE,
                ""Name""           text        NOT NULL DEFAULT '',
                ""Description""    text,
                ""Location""       text,
                ""OpeningHours""   text,
                ""TicketRequired"" boolean     NOT NULL DEFAULT false,
                ""TicketPrice""    numeric(18,2),
                ""TicketType""     text        NOT NULL DEFAULT 'None',
                ""ImageUrls""      text,
                ""CreatedBy""      text        NOT NULL DEFAULT '',
                ""CreatedAt""      timestamptz NOT NULL DEFAULT now(),
                ""UpdatedAt""      timestamptz NOT NULL DEFAULT now(),
                ""IsActive""       boolean     NOT NULL DEFAULT true
            );
            CREATE INDEX IF NOT EXISTS ""IX_VisitingPlaces_DestinationId"" ON ""VisitingPlaces"" (""DestinationId"");

            CREATE TABLE IF NOT EXISTS ""Restaurants"" (
                ""Id""            uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                ""DestinationId"" uuid        NOT NULL REFERENCES ""Destinations""(""Id"") ON DELETE CASCADE,
                ""Name""          text        NOT NULL DEFAULT '',
                ""Location""      text,
                ""Contact""       text,
                ""Description""   text,
                ""ImageUrls""     text,
                ""CreatedBy""     text        NOT NULL DEFAULT '',
                ""CreatedAt""     timestamptz NOT NULL DEFAULT now(),
                ""UpdatedAt""     timestamptz NOT NULL DEFAULT now(),
                ""IsActive""      boolean     NOT NULL DEFAULT true
            );
            CREATE INDEX IF NOT EXISTS ""IX_Restaurants_DestinationId"" ON ""Restaurants"" (""DestinationId"");

            CREATE TABLE IF NOT EXISTS ""FoodItems"" (
                ""Id""           uuid          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                ""RestaurantId"" uuid          NOT NULL REFERENCES ""Restaurants""(""Id"") ON DELETE CASCADE,
                ""Name""         text          NOT NULL DEFAULT '',
                ""Price""        numeric(18,2) NOT NULL DEFAULT 0,
                ""Category""     text          NOT NULL DEFAULT 'Lunch',
                ""ImageUrl""     text,
                ""CreatedBy""    text          NOT NULL DEFAULT '',
                ""CreatedAt""    timestamptz   NOT NULL DEFAULT now(),
                ""UpdatedAt""    timestamptz   NOT NULL DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS ""IX_FoodItems_RestaurantId"" ON ""FoodItems"" (""RestaurantId"");

            CREATE TABLE IF NOT EXISTS ""Accommodations"" (
                ""Id""             uuid          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                ""DestinationId""  uuid          NOT NULL REFERENCES ""Destinations""(""Id"") ON DELETE CASCADE,
                ""Name""           text          NOT NULL DEFAULT '',
                ""Type""           text          NOT NULL DEFAULT 'Hotel',
                ""Location""       text,
                ""PricePerNight""  numeric(18,2),
                ""SpecialNotes""   text,
                ""Amenities""      text,
                ""ImageUrls""      text,
                ""ContactNumber""  text,
                ""CreatedBy""      text          NOT NULL DEFAULT '',
                ""CreatedAt""      timestamptz   NOT NULL DEFAULT now(),
                ""UpdatedAt""      timestamptz   NOT NULL DEFAULT now(),
                ""IsActive""       boolean       NOT NULL DEFAULT true
            );
            CREATE INDEX IF NOT EXISTS ""IX_Accommodations_DestinationId"" ON ""Accommodations"" (""DestinationId"");

            CREATE TABLE IF NOT EXISTS ""TransportFareFiles"" (
                ""Id""                 uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                ""Category""           varchar(50)  NOT NULL,
                ""FileName""           varchar(255) NOT NULL,
                ""StorageBucket""      varchar(100) NOT NULL,
                ""StoragePath""        varchar(500) NOT NULL,
                ""FileSizeBytes""      bigint       NOT NULL DEFAULT 0,
                ""UploadedByUserId""   varchar(200) NOT NULL DEFAULT '',
                ""UploadedByRole""     varchar(50)  NOT NULL DEFAULT 'ServiceProvider',
                ""Status""             varchar(50)  NOT NULL DEFAULT 'PendingApproval',
                ""CreatedAt""          timestamptz  NOT NULL DEFAULT now(),
                ""ReviewedAt""         timestamptz,
                ""ReviewedByUserId""   varchar(200),
                ""AdminNotes""         text,
                ""PublicUrl""          text,
                ""IsActive""           boolean      NOT NULL DEFAULT true,
                ""ParsedRowCount""     int          NOT NULL DEFAULT 0,
                ""SamplePreviewJson""  text
            );
            CREATE INDEX IF NOT EXISTS ""IX_TransportFareFiles_Category_Status"" ON ""TransportFareFiles"" (""Category"", ""Status"");

            CREATE TABLE IF NOT EXISTS ""RentalVehicleListings"" (
                ""Id""                  uuid          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                ""VehicleType""         varchar(50)   NOT NULL DEFAULT 'Car',
                ""VehicleModel""        varchar(160)  NOT NULL DEFAULT '',
                ""ManufacturingYear""   int           NOT NULL DEFAULT 2020,
                ""OwnerContactPhone""   varchar(50)   NOT NULL DEFAULT '',
                ""RatePerKm""           numeric(18,2) NOT NULL DEFAULT 0.0,
                ""ExtraChargePerNight"" numeric(18,2) NOT NULL DEFAULT 0.0,
                ""Location""            varchar(100)  NOT NULL DEFAULT 'Colombo',
                ""Description""         text,
                ""ImageUrl""            text,
                ""DriverIncluded""      boolean       NOT NULL DEFAULT true,
                ""SeatingCapacity""     int           NOT NULL DEFAULT 4,
                ""Status""              varchar(50)   NOT NULL DEFAULT 'PendingReview',
                ""AdminFeedback""       text,
                ""ProviderUserId""      varchar(200)  NOT NULL DEFAULT '',
                ""ProviderEmail""       varchar(200),
                ""ProviderName""        varchar(200),
                ""CreatedAt""           timestamptz   NOT NULL DEFAULT now(),
                ""UpdatedAt""           timestamptz,
                ""ReviewedAt""          timestamptz,
                ""ReviewedByUserId""    varchar(200),
                ""IsActive""            boolean       NOT NULL DEFAULT true
            );
            CREATE INDEX IF NOT EXISTS ""IX_RentalVehicleListings_Type_Status"" ON ""RentalVehicleListings"" (""VehicleType"", ""Status"");
            CREATE INDEX IF NOT EXISTS ""IX_RentalVehicleListings_ProviderUserId"" ON ""RentalVehicleListings"" (""ProviderUserId"");
        ");

        app.Logger.LogInformation("Database migrations applied successfully.");
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "Database migration failed on startup. Check connection string and migration state.");
    }
}

app.UseSwagger();
app.UseSwaggerUI();
app.UseCors("clients");
app.UseAuthentication();
app.UseAuthorization();
app.MapHealthChecks("/health");
app.MapGet("/", () => Results.Ok(new
{
    service = "TravelWise.Api",
    status = "ok",
    auth = "ASP.NET Core Identity & JWT Bearer",
    health = "/health",
    swagger = "/swagger"
}));
app.MapControllers();
app.Run();
