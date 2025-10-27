using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text.Json.Serialization;
using System.Text;
using DotNetEnv;

// Load environment variables from .env file
Env.Load();

var builder = WebApplication.CreateBuilder(args);

// Configure Logging
builder.Logging.ClearProviders();

// Set minimum log levels to reduce verbosity
builder.Logging.SetMinimumLevel(LogLevel.Information);

// Configure console logging with specific category filters
builder.Logging.AddConsole(options =>
{
    options.FormatterName = "simple";
}).AddSimpleConsole(options =>
{
    options.TimestampFormat = "yyyy-MM-dd HH:mm:ss ";
});

// Reduce verbosity for specific categories
builder.Logging.AddFilter("Microsoft.AspNetCore.Authentication", LogLevel.Warning);
builder.Logging.AddFilter("Microsoft.AspNetCore.Authorization", LogLevel.Warning);
builder.Logging.AddFilter("Microsoft.AspNetCore.Diagnostics", LogLevel.Warning);
builder.Logging.AddFilter("Microsoft.AspNetCore.Hosting", LogLevel.Warning);
builder.Logging.AddFilter("Microsoft.AspNetCore.Mvc", LogLevel.Warning);
builder.Logging.AddFilter("Microsoft.AspNetCore.Routing", LogLevel.Warning);
builder.Logging.AddFilter("Microsoft.EntityFrameworkCore", LogLevel.Warning);

// Keep detailed logging for our application
builder.Logging.AddFilter("Backend", LogLevel.Information);
builder.Logging.AddFilter("Backend.Services.ContainmentMqttHostedService", LogLevel.Information);
builder.Logging.AddFilter("Backend.Services.MqttService", LogLevel.Information);
builder.Logging.AddFilter("Backend.Services.MqttConfigurationService", LogLevel.Information);
builder.Logging.AddFilter("Backend.Services.SensorDataIntervalService", LogLevel.Warning);

// Add debug logging in development
if (builder.Environment.IsDevelopment())
{
    builder.Logging.AddDebug();
    builder.Logging.AddFilter("Backend", LogLevel.Debug);
}

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.WriteIndented = true;
    });

// Add memory cache for system info caching
builder.Services.AddMemoryCache();

// Add CORS for testing
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", builder =>
    {
        builder.AllowAnyOrigin()
               .AllowAnyMethod()
               .AllowAnyHeader();
    });
});

// Add Entity Framework
builder.Services.AddDbContext<Backend.Data.AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection") ?? "Data Source=app.db"));

// Add services
builder.Services.AddScoped<Backend.Services.IUserService, Backend.Services.UserService>();
builder.Services.AddScoped<Backend.Services.IAuthService, Backend.Services.AuthService>();
builder.Services.AddScoped<Backend.Services.IJwtService, Backend.Services.JwtService>();
builder.Services.AddScoped<Backend.Services.IContainmentService, Backend.Services.ContainmentService>();
builder.Services.AddScoped<Backend.Services.IRackService, Backend.Services.RackService>();
builder.Services.AddScoped<Backend.Services.IDeviceService, Backend.Services.DeviceService>();
builder.Services.AddScoped<Backend.Services.IDeviceStatusMonitoringService, Backend.Services.DeviceStatusMonitoringService>();
builder.Services.AddScoped<Backend.Services.IMaintenanceService, Backend.Services.MaintenanceService>();
builder.Services.AddScoped<Backend.Services.IBackupService, Backend.Services.BackupService>();
builder.Services.AddScoped<Backend.Services.IContainmentStatusService, Backend.Services.ContainmentStatusService>();
builder.Services.AddScoped<Backend.Services.IContainmentControlService, Backend.Services.ContainmentControlService>();
builder.Services.AddScoped<Backend.Services.IEmergencyReportService, Backend.Services.EmergencyReportService>();
builder.Services.AddScoped<Backend.Services.IMqttConfigurationService, Backend.Services.MqttConfigurationService>();
builder.Services.AddScoped<Backend.Services.INetworkConfigurationService, Backend.Services.NetworkConfigurationService>();
builder.Services.AddScoped<Backend.Services.IFileService, Backend.Services.FileService>();
builder.Services.AddSingleton<Backend.Services.IMqttService, Backend.Services.MqttService>();
builder.Services.AddScoped<Backend.Services.ISystemInfoService, Backend.Services.SystemInfoService>();
builder.Services.AddScoped<Backend.Services.ICameraConfigsService, Backend.Services.CameraConfigService>();
builder.Services.AddScoped<Backend.Services.IDeviceSensorDataService, Backend.Services.DeviceSensorDataService>();
builder.Services.AddScoped<Backend.Services.ISensorDataIntervalService, Backend.Services.SensorDataIntervalService>();
builder.Services.AddScoped<Backend.Services.ISystemManagementService, Backend.Services.SystemManagementService>();
builder.Services.AddScoped<Backend.Services.IDeviceActivityService, Backend.Services.DeviceActivityService>();
builder.Services.AddSingleton<Backend.Services.IpScannerService>();
builder.Services.AddScoped<Backend.Services.IAccessLogService, Backend.Services.AccessLogService>();
builder.Services.AddScoped<Backend.Services.IMaintenanceNotificationService, Backend.Services.MaintenanceNotificationService>();
builder.Services.AddHttpClient<Backend.Services.IWhatsAppService, Backend.Services.WhatsAppService>();
builder.Services.AddScoped<Backend.Services.ICapacityService, Backend.Services.CapacityService>();
builder.Services.AddSingleton<Backend.Services.IMqttConfigurationChangeNotificationService, Backend.Services.MqttConfigurationChangeNotificationService>();

// Palm Recognition Device Service
builder.Services.AddScoped<Backend.Services.IPalmRecognitionDeviceService, Backend.Services.PalmRecognitionDeviceService>();

// Add Role Mapping and Migration Services
builder.Services.AddScoped<Backend.Services.IRoleMappingService, Backend.Services.RoleMappingService>();
builder.Services.AddScoped<Backend.Services.IRoleMigrationService, Backend.Services.RoleMigrationService>();

builder.Services.AddHttpClient();

// Add background services
builder.Services.AddHostedService<Backend.Services.BackupHostedService>();
builder.Services.AddHostedService<Backend.Services.DeviceActivityHostedService>();
builder.Services.AddHostedService<Backend.Services.MaintenanceReminderHostedService>();
builder.Services.AddHostedService<Backend.Services.DeviceStatusMonitoringHostedService>();
builder.Services.AddHostedService<Backend.Services.ContainmentDataRetrievalHostedService>();

// Add MQTT hosted service only if MQTT is enabled
var enableMqtt = bool.Parse(Environment.GetEnvironmentVariable("MQTT_ENABLE") ?? "true");
if (enableMqtt)
{
    // TODO: Temporarily disable MqttDeviceSubscriptionService to avoid competition
    // builder.Services.AddHostedService<Backend.Services.MqttDeviceSubscriptionService>();

    builder.Services.AddHostedService<Backend.Services.ContainmentMqttHostedService>();
}

// Add JWT Authentication
var jwtSettings = builder.Configuration.GetSection("Jwt");
var secretKey = Environment.GetEnvironmentVariable("JWT_SECRET_KEY") ?? jwtSettings["SecretKey"] ?? "your-very-secret-key-that-is-at-least-256-bits-long-for-jwt-security";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(secretKey)),
        ValidateIssuer = true,
        ValidIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER") ?? jwtSettings["Issuer"],
        ValidateAudience = true,
        ValidAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? jwtSettings["Audience"],
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };

    options.Events = new Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerEvents
    {
        OnAuthenticationFailed = context =>
        {
            // Use proper logging instead of Console.WriteLine
            var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
            logger.LogWarning("JWT Authentication failed: {Message}", context.Exception.Message);
            return Task.CompletedTask;
        },
        OnTokenValidated = context =>
        {
            // Reduce verbosity - only log at Debug level or if explicitly enabled
            var enableJwtVerboseLogging = Environment.GetEnvironmentVariable("ENABLE_JWT_VERBOSE_LOGGING")?.ToLower() == "true";
            if (enableJwtVerboseLogging)
            {
                var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
                logger.LogDebug("JWT Token validated for user: {UserName}", context.Principal?.Identity?.Name);
            }
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();


// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "Backend API",
        Version = "v1",
        Description = "IoT Management System API with JWT Authentication"
    });

    // Add JWT Authentication to Swagger
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer' [space] and then your token in the text input below.",
        Name = "Authorization",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT"
    });

    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// Get logger for startup information
var logger = app.Services.GetRequiredService<ILogger<Program>>();
var environment = app.Environment.EnvironmentName;
var version = System.Reflection.Assembly.GetExecutingAssembly().GetName().Version;

logger.LogInformation("=== IoT Containment Management System ===");
logger.LogInformation("Version: {Version}", version);
logger.LogInformation("Environment: {Environment}", environment);
logger.LogInformation("Startup Time: {StartupTime}", DateTime.UtcNow);

// Auto migrate database and seed data
// ...existing code...
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<Backend.Data.AppDbContext>();
    var authService = scope.ServiceProvider.GetRequiredService<Backend.Services.IAuthService>();
    var roleMappingService = scope.ServiceProvider.GetRequiredService<Backend.Services.IRoleMappingService>();
    var roleMigrationService = scope.ServiceProvider.GetRequiredService<Backend.Services.IRoleMigrationService>();
    var scopedLogger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    logger.LogInformation("Creating database...");
    try
    {
        await context.Database.EnsureCreatedAsync(); // Create tables for SQLite without migrations
        logger.LogInformation("Database creation completed successfully");

        // Ensure all pending changes are applied
        await context.SaveChangesAsync();
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Database creation failed");
        throw;
    }

    // Initialize default roles after migration is complete
    // Temporarily disabled role services initialization to allow app to start
    logger.LogInformation("Skipping role mapping system initialization for now...");

    // Enable/disable seed data dengan env variable
    var enableSeed = Environment.GetEnvironmentVariable("ENABLE_SEED_DATA") ?? "true";
    if (enableSeed.ToLower() == "true")
    {
        // Optional: Clean up duplicate data from legacy seed files
        var enableCleanup = bool.Parse(Environment.GetEnvironmentVariable("ENABLE_SEED_CLEANUP") ?? "false");
        if (enableCleanup)
        {
            logger.LogInformation("Cleaning up legacy seed data...");
            await Backend.Data.SeedMigrationHelper.CleanupDuplicateDataAsync(context, scopedLogger);
        }

        // Use optimized seed data that consolidates all seeding operations
        var seedConfig = new Dictionary<string, bool>
        {
            {"AccessLog", bool.Parse(Environment.GetEnvironmentVariable("SEED_ACCESS_LOG") ?? "false")},
            {"DeviceSensorData", bool.Parse(Environment.GetEnvironmentVariable("SEED_SENSOR_DATA") ?? "true")}
        };

        logger.LogInformation("Starting optimized database seeding...");
        await Backend.Data.OptimizedSeedData.InitializeAsync(context, authService, scopedLogger, seedConfig);
        
        // Initialize sensor interval configuration based on environment
        logger.LogInformation("Initializing sensor interval configuration...");
        var intervalService = scope.ServiceProvider.GetRequiredService<Backend.Services.ISensorDataIntervalService>();
        var adminUser = await context.Users.FirstOrDefaultAsync(u => u.Role == Backend.Enums.UserRole.Admin);
        if (adminUser != null)
        {
            await intervalService.InitializeDefaultConfigurationAsync(adminUser.Id);
        }
        else
        {
            logger.LogWarning("No admin user found for sensor interval configuration initialization");
        }

        // Optional: Validate seed data integrity
        var enableValidation = bool.Parse(Environment.GetEnvironmentVariable("ENABLE_SEED_VALIDATION") ?? "false");
        if (enableValidation)
        {
            logger.LogInformation("Validating seed data integrity...");
            var issues = await Backend.Data.SeedMigrationHelper.ValidateSeedDataAsync(context, scopedLogger);
            if (issues.Any())
            {
                logger.LogWarning($"Found {issues.Count} data integrity issues: {string.Join("; ", issues)}");
            }
            else
            {
                logger.LogInformation("Seed data integrity validation passed");
            }
        }

        logger.LogInformation("Database seeding completed");
    }
    else
    {
        logger.LogInformation("Database seeding skipped (ENABLE_SEED_DATA=false)");
    }
}
// ...existing code...

// Configure the HTTP request pipeline.
app.UseSwagger();
app.UseSwaggerUI();

// CORS should come BEFORE HTTPS redirection and static files
app.UseCors("AllowAll");

// Disable HTTPS redirection for HTTP-only operation
// app.UseHttpsRedirection();

// Enable static files for photo uploads
app.UseStaticFiles();

// Serve uploads directory
var uploadsPath = Path.Combine(app.Environment.WebRootPath ?? app.Environment.ContentRootPath, "uploads");
if (!Directory.Exists(uploadsPath))
{
    Directory.CreateDirectory(uploadsPath);
    Directory.CreateDirectory(Path.Combine(uploadsPath, "users"));
}

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadsPath),
    RequestPath = "/uploads"
});

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();


// Log server startup information
var urls = builder.WebHost.GetSetting("urls") ?? app.Urls.FirstOrDefault() ?? "http://localhost:5000";
logger.LogInformation("Server starting on: {Urls}", urls);
logger.LogInformation("=== Server Ready ===");

app.Run();
