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
if (builder.Environment.IsDevelopment())
{
    builder.Logging.AddConsole();
    builder.Logging.AddDebug();
}
else
{
    builder.Logging.AddConsole();
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
builder.Services.AddScoped<Backend.Services.IActivityReportService, Backend.Services.ActivityReportService>();
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
builder.Services.AddScoped<Backend.Services.IDeviceActivityService, Backend.Services.DeviceActivityService>();
builder.Services.AddSingleton<Backend.Services.IpScannerService>();
builder.Services.AddScoped<Backend.Services.IAccessLogService, Backend.Services.AccessLogService>();
builder.Services.AddScoped<Backend.Services.IMaintenanceNotificationService, Backend.Services.MaintenanceNotificationService>();
builder.Services.AddHttpClient<Backend.Services.IWhatsAppService, Backend.Services.WhatsAppService>();

// Add Role Mapping and Migration Services
builder.Services.AddScoped<Backend.Services.IRoleMappingService, Backend.Services.RoleMappingService>();
builder.Services.AddScoped<Backend.Services.IRoleMigrationService, Backend.Services.RoleMigrationService>();

builder.Services.AddHttpClient();

// Add background services
builder.Services.AddHostedService<Backend.Services.BackupHostedService>();
builder.Services.AddHostedService<Backend.Services.DeviceActivityHostedService>();
builder.Services.AddHostedService<Backend.Services.MaintenanceReminderHostedService>();
builder.Services.AddHostedService<Backend.Services.DeviceStatusMonitoringHostedService>();

// Add MQTT hosted service only if MQTT is enabled
var enableMqtt = bool.Parse(Environment.GetEnvironmentVariable("MQTT_ENABLE") ?? builder.Configuration["Mqtt:EnableMqtt"] ?? "true");
if (enableMqtt)
{
    builder.Services.AddHostedService<Backend.Services.ContainmentMqttHostedService>();
    builder.Services.AddHostedService<Backend.Services.MqttDeviceSubscriptionService>();
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
            Console.WriteLine($"JWT Authentication failed: {context.Exception.Message}");
            return Task.CompletedTask;
        },
        OnTokenValidated = context =>
        {
            Console.WriteLine($"JWT Token validated for user: {context.Principal?.Identity?.Name}");
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

    logger.LogInformation("Migrating database...");
    await context.Database.MigrateAsync(); // Selalu migrasi
    
    // Ensure all pending changes are applied
    await context.SaveChangesAsync();

    // Initialize default roles after migration is complete
    logger.LogInformation("Initializing role mapping system...");
    await roleMappingService.InitializeDefaultRolesAsync();
    
    // Migrate existing users to new role system
    logger.LogInformation("Checking and migrating existing users to new role system...");
    var unmigratedCount = await roleMigrationService.GetUnmigratedUsersCountAsync();
    if (unmigratedCount > 0)
    {
        logger.LogInformation("Found {Count} users that need migration to new role system", unmigratedCount);
        await roleMigrationService.MigrateExistingUsersToNewRoleSystemAsync();
    }
    else
    {
        logger.LogInformation("All users are already using the new role system");
    }

    // Enable/disable seed data dengan env variable
    var enableSeed = Environment.GetEnvironmentVariable("ENABLE_SEED_DATA") ?? "true";
    if (enableSeed.ToLower() == "true")
    {
        logger.LogInformation("Seeding initial data...");
        await Backend.Data.SeedData.InitializeAsync(context, authService, scopedLogger);
        
        logger.LogInformation("Seeding menu management data...");
        await Backend.Data.MenuSeedData.SeedMenuDataAsync(context);
        await Backend.Data.MenuSeedData.AssignUserRolesAsync(context);
        
        logger.LogInformation("Seeding dynamic menu data...");
        await Backend.Data.DynamicMenuSeedData.SeedDynamicMenuAsync(context);
        
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

app.UseHttpsRedirection();

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

app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();


// Log server startup information
var urls = builder.WebHost.GetSetting("urls") ?? app.Urls.FirstOrDefault() ?? "http://localhost:5000";
logger.LogInformation("Server starting on: {Urls}", urls);
logger.LogInformation("=== Server Ready ===");

app.Run();
