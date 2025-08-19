using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class Views : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AccessLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    User = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Via = table.Column<int>(type: "INTEGER", nullable: false),
                    Trigger = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Timestamp = table.Column<DateTime>(type: "TEXT", nullable: false),
                    AdditionalData = table.Column<string>(type: "TEXT", nullable: true),
                    Description = table.Column<string>(type: "TEXT", nullable: true),
                    IsSuccess = table.Column<bool>(type: "INTEGER", nullable: false, defaultValue: true),
                    IpAddress = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AccessLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CameraConfigs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    IpAddress = table.Column<string>(type: "TEXT", maxLength: 45, nullable: false),
                    Port = table.Column<int>(type: "INTEGER", nullable: false),
                    ApiKey = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Group = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CameraConfigs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "EmergencyReports",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    EmergencyType = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    Status = table.Column<bool>(type: "INTEGER", nullable: false),
                    StartTime = table.Column<DateTime>(type: "TEXT", nullable: false),
                    EndTime = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Duration = table.Column<TimeSpan>(type: "TEXT", nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false, defaultValue: true),
                    Notes = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                    RawMqttPayload = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmergencyReports", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MenuGroups",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Title = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Icon = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 0),
                    MinRoleLevel = table.Column<int>(type: "INTEGER", nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false, defaultValue: true),
                    RequiresDeveloperMode = table.Column<bool>(type: "INTEGER", nullable: false, defaultValue: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MenuGroups", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Permissions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Category = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Permissions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Roles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    DisplayName = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Level = table.Column<int>(type: "INTEGER", nullable: false),
                    Color = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false, defaultValue: "text-gray-600 bg-gray-100"),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Roles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MenuItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Title = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Url = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Icon = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 0),
                    MinRoleLevel = table.Column<int>(type: "INTEGER", nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false, defaultValue: true),
                    RequiresDeveloperMode = table.Column<bool>(type: "INTEGER", nullable: false, defaultValue: false),
                    BadgeText = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    BadgeVariant = table.Column<string>(type: "TEXT", maxLength: 20, nullable: true, defaultValue: "default"),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    MenuGroupId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MenuItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MenuItems_MenuGroups_MenuGroupId",
                        column: x => x.MenuGroupId,
                        principalTable: "MenuGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RolePermissions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    RoleId = table.Column<int>(type: "INTEGER", nullable: false),
                    PermissionId = table.Column<int>(type: "INTEGER", nullable: false),
                    AssignedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RolePermissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RolePermissions_Permissions_PermissionId",
                        column: x => x.PermissionId,
                        principalTable: "Permissions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RolePermissions_Roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "Roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Email = table.Column<string>(type: "TEXT", maxLength: 255, nullable: false),
                    PhoneNumber = table.Column<string>(type: "TEXT", maxLength: 20, nullable: true),
                    PhotoPath = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    PasswordHash = table.Column<string>(type: "TEXT", maxLength: 255, nullable: false),
                    Role = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 1),
                    RoleId = table.Column<int>(type: "INTEGER", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Users_Roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "Roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "MenuPermissions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    MenuItemId = table.Column<int>(type: "INTEGER", nullable: true),
                    MenuGroupId = table.Column<int>(type: "INTEGER", nullable: true),
                    RoleId = table.Column<int>(type: "INTEGER", nullable: true),
                    PermissionId = table.Column<int>(type: "INTEGER", nullable: true),
                    IsRequired = table.Column<bool>(type: "INTEGER", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MenuPermissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MenuPermissions_MenuGroups_MenuGroupId",
                        column: x => x.MenuGroupId,
                        principalTable: "MenuGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MenuPermissions_MenuItems_MenuItemId",
                        column: x => x.MenuItemId,
                        principalTable: "MenuItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MenuPermissions_Permissions_PermissionId",
                        column: x => x.PermissionId,
                        principalTable: "Permissions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MenuPermissions_Roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "Roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ActivityReports",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Description = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: false),
                    Timestamp = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Status = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    Trigger = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    AdditionalData = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    UserId = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ActivityReports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ActivityReports_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "Containments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Type = table.Column<int>(type: "INTEGER", nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    Location = table.Column<string>(type: "TEXT", maxLength: 255, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false, defaultValue: true),
                    CreatedBy = table.Column<int>(type: "INTEGER", nullable: false),
                    UpdatedBy = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Containments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Containments_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Containments_Users_UpdatedBy",
                        column: x => x.UpdatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Maintenances",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                    StartTask = table.Column<DateTime>(type: "TEXT", nullable: false),
                    EndTask = table.Column<DateTime>(type: "TEXT", nullable: false),
                    AssignTo = table.Column<int>(type: "INTEGER", nullable: false),
                    TargetType = table.Column<int>(type: "INTEGER", nullable: false),
                    TargetId = table.Column<int>(type: "INTEGER", nullable: false),
                    Status = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false, defaultValue: "Scheduled"),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false, defaultValue: true),
                    CreatedBy = table.Column<int>(type: "INTEGER", nullable: false),
                    UpdatedBy = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Maintenances", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Maintenances_Users_AssignTo",
                        column: x => x.AssignTo,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Maintenances_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Maintenances_Users_UpdatedBy",
                        column: x => x.UpdatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MqttConfigurations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    IsEnabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    UseEnvironmentConfig = table.Column<bool>(type: "INTEGER", nullable: false),
                    BrokerHost = table.Column<string>(type: "TEXT", maxLength: 255, nullable: true),
                    BrokerPort = table.Column<int>(type: "INTEGER", nullable: true),
                    Username = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    Password = table.Column<string>(type: "TEXT", maxLength: 255, nullable: true),
                    ClientId = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    UseSsl = table.Column<bool>(type: "INTEGER", nullable: false),
                    KeepAliveInterval = table.Column<int>(type: "INTEGER", nullable: false),
                    ReconnectDelay = table.Column<int>(type: "INTEGER", nullable: false),
                    TopicPrefix = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                    Description = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false, defaultValue: true),
                    CreatedBy = table.Column<int>(type: "INTEGER", nullable: false),
                    UpdatedBy = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MqttConfigurations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MqttConfigurations_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MqttConfigurations_Users_UpdatedBy",
                        column: x => x.UpdatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NetworkConfigurations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    InterfaceType = table.Column<int>(type: "INTEGER", nullable: false),
                    ConfigMethod = table.Column<int>(type: "INTEGER", nullable: false),
                    IpAddress = table.Column<string>(type: "TEXT", maxLength: 15, nullable: true),
                    SubnetMask = table.Column<string>(type: "TEXT", maxLength: 15, nullable: true),
                    Gateway = table.Column<string>(type: "TEXT", maxLength: 15, nullable: true),
                    PrimaryDns = table.Column<string>(type: "TEXT", maxLength: 15, nullable: true),
                    SecondaryDns = table.Column<string>(type: "TEXT", maxLength: 15, nullable: true),
                    Metric = table.Column<string>(type: "TEXT", maxLength: 6, nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedBy = table.Column<int>(type: "INTEGER", nullable: false),
                    UpdatedBy = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NetworkConfigurations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NetworkConfigurations_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NetworkConfigurations_Users_UpdatedBy",
                        column: x => x.UpdatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ScanConfigurations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    MaxAddressToScan = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 247),
                    SelectedPort = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false, defaultValue: "COM3"),
                    SelectedSensor = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false, defaultValue: "XY_MD02"),
                    ScanTimeoutMs = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 1000),
                    ScanIntervalMs = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 100),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedBy = table.Column<int>(type: "INTEGER", nullable: false),
                    UpdatedBy = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ScanConfigurations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ScanConfigurations_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ScanConfigurations_Users_UpdatedBy",
                        column: x => x.UpdatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SensorConfigurations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    SensorNumber = table.Column<int>(type: "INTEGER", nullable: false),
                    SensorName = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    ModbusAddress = table.Column<int>(type: "INTEGER", nullable: false),
                    ModbusPort = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    SensorType = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    IsEnabled = table.Column<bool>(type: "INTEGER", nullable: false, defaultValue: true),
                    TemperatureOffset = table.Column<decimal>(type: "TEXT", nullable: false, defaultValue: 0m),
                    HumidityOffset = table.Column<decimal>(type: "TEXT", nullable: false, defaultValue: 0m),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedBy = table.Column<int>(type: "INTEGER", nullable: false),
                    UpdatedBy = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SensorConfigurations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SensorConfigurations_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SensorConfigurations_Users_UpdatedBy",
                        column: x => x.UpdatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "UserRoles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    UserId = table.Column<int>(type: "INTEGER", nullable: false),
                    RoleId = table.Column<int>(type: "INTEGER", nullable: false),
                    AssignedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserRoles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserRoles_Roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "Roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserRoles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ContainmentControls",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ContainmentId = table.Column<int>(type: "INTEGER", nullable: false),
                    Command = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    ExecutedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ExecutedBy = table.Column<int>(type: "INTEGER", nullable: false),
                    Status = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false, defaultValue: "Pending"),
                    ErrorMessage = table.Column<string>(type: "TEXT", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContainmentControls", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ContainmentControls_Containments_ContainmentId",
                        column: x => x.ContainmentId,
                        principalTable: "Containments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ContainmentControls_Users_ExecutedBy",
                        column: x => x.ExecutedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ContainmentStatuses",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ContainmentId = table.Column<int>(type: "INTEGER", nullable: false),
                    LightingStatus = table.Column<bool>(type: "INTEGER", nullable: false),
                    EmergencyStatus = table.Column<bool>(type: "INTEGER", nullable: false),
                    SmokeDetectorStatus = table.Column<bool>(type: "INTEGER", nullable: false),
                    FssStatus = table.Column<bool>(type: "INTEGER", nullable: false),
                    EmergencyButtonState = table.Column<bool>(type: "INTEGER", nullable: false),
                    SelenoidStatus = table.Column<bool>(type: "INTEGER", nullable: false),
                    LimitSwitchFrontDoorStatus = table.Column<bool>(type: "INTEGER", nullable: false),
                    LimitSwitchBackDoorStatus = table.Column<bool>(type: "INTEGER", nullable: false),
                    OpenFrontDoorStatus = table.Column<bool>(type: "INTEGER", nullable: false),
                    OpenBackDoorStatus = table.Column<bool>(type: "INTEGER", nullable: false),
                    EmergencyTemp = table.Column<bool>(type: "INTEGER", nullable: false),
                    MqttTimestamp = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    RawPayload = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContainmentStatuses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ContainmentStatuses_Containments_ContainmentId",
                        column: x => x.ContainmentId,
                        principalTable: "Containments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Racks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    ContainmentId = table.Column<int>(type: "INTEGER", nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    CapacityU = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false, defaultValue: true),
                    CreatedBy = table.Column<int>(type: "INTEGER", nullable: false),
                    UpdatedBy = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Racks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Racks_Containments_ContainmentId",
                        column: x => x.ContainmentId,
                        principalTable: "Containments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Racks_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Racks_Users_UpdatedBy",
                        column: x => x.UpdatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Devices",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Type = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    RackId = table.Column<int>(type: "INTEGER", nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    SerialNumber = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    Status = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true, defaultValue: "Active"),
                    Topic = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    SensorType = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    UCapacity = table.Column<int>(type: "INTEGER", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false, defaultValue: true),
                    CreatedBy = table.Column<int>(type: "INTEGER", nullable: false),
                    UpdatedBy = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Devices", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Devices_Racks_RackId",
                        column: x => x.RackId,
                        principalTable: "Racks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Devices_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Devices_Users_UpdatedBy",
                        column: x => x.UpdatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "DeviceActivityStatuses",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    DeviceId = table.Column<int>(type: "INTEGER", nullable: false),
                    Topic = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    Status = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    LastSeen = table.Column<DateTime>(type: "TEXT", nullable: false),
                    LastStatusChange = table.Column<DateTime>(type: "TEXT", nullable: false),
                    LastMessage = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    ConsecutiveFailures = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeviceActivityStatuses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DeviceActivityStatuses_Devices_DeviceId",
                        column: x => x.DeviceId,
                        principalTable: "Devices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DeviceSensorData",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    DeviceId = table.Column<int>(type: "INTEGER", nullable: false),
                    RackId = table.Column<int>(type: "INTEGER", nullable: false),
                    ContainmentId = table.Column<int>(type: "INTEGER", nullable: false),
                    Topic = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Timestamp = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ReceivedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    RawPayload = table.Column<string>(type: "TEXT", nullable: false),
                    SensorType = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeviceSensorData", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DeviceSensorData_Containments_ContainmentId",
                        column: x => x.ContainmentId,
                        principalTable: "Containments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DeviceSensorData_Devices_DeviceId",
                        column: x => x.DeviceId,
                        principalTable: "Devices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DeviceSensorData_Racks_RackId",
                        column: x => x.RackId,
                        principalTable: "Racks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AccessLogs_Timestamp",
                table: "AccessLogs",
                column: "Timestamp");

            migrationBuilder.CreateIndex(
                name: "IX_AccessLogs_User",
                table: "AccessLogs",
                column: "User");

            migrationBuilder.CreateIndex(
                name: "IX_AccessLogs_Via",
                table: "AccessLogs",
                column: "Via");

            migrationBuilder.CreateIndex(
                name: "IX_AccessLogs_Via_Timestamp",
                table: "AccessLogs",
                columns: new[] { "Via", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_ActivityReports_Status",
                table: "ActivityReports",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_ActivityReports_Timestamp",
                table: "ActivityReports",
                column: "Timestamp");

            migrationBuilder.CreateIndex(
                name: "IX_ActivityReports_Trigger",
                table: "ActivityReports",
                column: "Trigger");

            migrationBuilder.CreateIndex(
                name: "IX_ActivityReports_UserId",
                table: "ActivityReports",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_CameraConfigs_IpAddress",
                table: "CameraConfigs",
                column: "IpAddress");

            migrationBuilder.CreateIndex(
                name: "IX_CameraConfigs_IsActive",
                table: "CameraConfigs",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_CameraConfigs_Name",
                table: "CameraConfigs",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_ContainmentControls_ContainmentId",
                table: "ContainmentControls",
                column: "ContainmentId");

            migrationBuilder.CreateIndex(
                name: "IX_ContainmentControls_ExecutedAt",
                table: "ContainmentControls",
                column: "ExecutedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ContainmentControls_ExecutedBy",
                table: "ContainmentControls",
                column: "ExecutedBy");

            migrationBuilder.CreateIndex(
                name: "IX_ContainmentControls_Status",
                table: "ContainmentControls",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Containments_CreatedBy",
                table: "Containments",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_Containments_UpdatedBy",
                table: "Containments",
                column: "UpdatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_ContainmentStatuses_ContainmentId",
                table: "ContainmentStatuses",
                column: "ContainmentId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ContainmentStatuses_CreatedAt",
                table: "ContainmentStatuses",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ContainmentStatuses_MqttTimestamp",
                table: "ContainmentStatuses",
                column: "MqttTimestamp");

            migrationBuilder.CreateIndex(
                name: "IX_DeviceActivityStatuses_DeviceId",
                table: "DeviceActivityStatuses",
                column: "DeviceId");

            migrationBuilder.CreateIndex(
                name: "IX_Devices_CreatedBy",
                table: "Devices",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_Devices_RackId",
                table: "Devices",
                column: "RackId");

            migrationBuilder.CreateIndex(
                name: "IX_Devices_UpdatedBy",
                table: "Devices",
                column: "UpdatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_DeviceSensorData_ContainmentId",
                table: "DeviceSensorData",
                column: "ContainmentId");

            migrationBuilder.CreateIndex(
                name: "IX_DeviceSensorData_ContainmentId_Timestamp",
                table: "DeviceSensorData",
                columns: new[] { "ContainmentId", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_DeviceSensorData_DeviceId",
                table: "DeviceSensorData",
                column: "DeviceId");

            migrationBuilder.CreateIndex(
                name: "IX_DeviceSensorData_DeviceId_Timestamp",
                table: "DeviceSensorData",
                columns: new[] { "DeviceId", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_DeviceSensorData_RackId",
                table: "DeviceSensorData",
                column: "RackId");

            migrationBuilder.CreateIndex(
                name: "IX_DeviceSensorData_ReceivedAt",
                table: "DeviceSensorData",
                column: "ReceivedAt");

            migrationBuilder.CreateIndex(
                name: "IX_DeviceSensorData_Timestamp",
                table: "DeviceSensorData",
                column: "Timestamp");

            migrationBuilder.CreateIndex(
                name: "IX_DeviceSensorData_Topic",
                table: "DeviceSensorData",
                column: "Topic");

            migrationBuilder.CreateIndex(
                name: "IX_EmergencyReports_EmergencyType",
                table: "EmergencyReports",
                column: "EmergencyType");

            migrationBuilder.CreateIndex(
                name: "IX_EmergencyReports_EmergencyType_IsActive",
                table: "EmergencyReports",
                columns: new[] { "EmergencyType", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_EmergencyReports_IsActive",
                table: "EmergencyReports",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_EmergencyReports_StartTime",
                table: "EmergencyReports",
                column: "StartTime");

            migrationBuilder.CreateIndex(
                name: "IX_Maintenances_AssignTo",
                table: "Maintenances",
                column: "AssignTo");

            migrationBuilder.CreateIndex(
                name: "IX_Maintenances_CreatedBy",
                table: "Maintenances",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_Maintenances_UpdatedBy",
                table: "Maintenances",
                column: "UpdatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_MenuGroups_IsActive",
                table: "MenuGroups",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_MenuGroups_RequiresDeveloperMode",
                table: "MenuGroups",
                column: "RequiresDeveloperMode");

            migrationBuilder.CreateIndex(
                name: "IX_MenuGroups_SortOrder",
                table: "MenuGroups",
                column: "SortOrder");

            migrationBuilder.CreateIndex(
                name: "IX_MenuItems_IsActive",
                table: "MenuItems",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_MenuItems_MenuGroupId",
                table: "MenuItems",
                column: "MenuGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_MenuItems_RequiresDeveloperMode",
                table: "MenuItems",
                column: "RequiresDeveloperMode");

            migrationBuilder.CreateIndex(
                name: "IX_MenuItems_SortOrder",
                table: "MenuItems",
                column: "SortOrder");

            migrationBuilder.CreateIndex(
                name: "IX_MenuItems_Url",
                table: "MenuItems",
                column: "Url");

            migrationBuilder.CreateIndex(
                name: "IX_MenuPermissions_MenuGroupId",
                table: "MenuPermissions",
                column: "MenuGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_MenuPermissions_MenuItemId",
                table: "MenuPermissions",
                column: "MenuItemId");

            migrationBuilder.CreateIndex(
                name: "IX_MenuPermissions_PermissionId",
                table: "MenuPermissions",
                column: "PermissionId");

            migrationBuilder.CreateIndex(
                name: "IX_MenuPermissions_RoleId",
                table: "MenuPermissions",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "IX_MqttConfigurations_CreatedBy",
                table: "MqttConfigurations",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_MqttConfigurations_IsActive",
                table: "MqttConfigurations",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_MqttConfigurations_IsEnabled",
                table: "MqttConfigurations",
                column: "IsEnabled");

            migrationBuilder.CreateIndex(
                name: "IX_MqttConfigurations_UpdatedBy",
                table: "MqttConfigurations",
                column: "UpdatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_MqttConfigurations_UseEnvironmentConfig",
                table: "MqttConfigurations",
                column: "UseEnvironmentConfig");

            migrationBuilder.CreateIndex(
                name: "IX_NetworkConfigurations_ConfigMethod",
                table: "NetworkConfigurations",
                column: "ConfigMethod");

            migrationBuilder.CreateIndex(
                name: "IX_NetworkConfigurations_CreatedBy",
                table: "NetworkConfigurations",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_NetworkConfigurations_InterfaceType",
                table: "NetworkConfigurations",
                column: "InterfaceType",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NetworkConfigurations_IsActive",
                table: "NetworkConfigurations",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_NetworkConfigurations_UpdatedBy",
                table: "NetworkConfigurations",
                column: "UpdatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_Permissions_Category",
                table: "Permissions",
                column: "Category");

            migrationBuilder.CreateIndex(
                name: "IX_Permissions_IsActive",
                table: "Permissions",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_Permissions_Name",
                table: "Permissions",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Racks_ContainmentId",
                table: "Racks",
                column: "ContainmentId");

            migrationBuilder.CreateIndex(
                name: "IX_Racks_CreatedBy",
                table: "Racks",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_Racks_UpdatedBy",
                table: "Racks",
                column: "UpdatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_RolePermissions_PermissionId",
                table: "RolePermissions",
                column: "PermissionId");

            migrationBuilder.CreateIndex(
                name: "IX_RolePermissions_RoleId_PermissionId",
                table: "RolePermissions",
                columns: new[] { "RoleId", "PermissionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Roles_IsActive",
                table: "Roles",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_Roles_Level",
                table: "Roles",
                column: "Level");

            migrationBuilder.CreateIndex(
                name: "IX_Roles_Name",
                table: "Roles",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ScanConfigurations_CreatedAt",
                table: "ScanConfigurations",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ScanConfigurations_CreatedBy",
                table: "ScanConfigurations",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_ScanConfigurations_IsActive",
                table: "ScanConfigurations",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_ScanConfigurations_UpdatedBy",
                table: "ScanConfigurations",
                column: "UpdatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_SensorConfigurations_CreatedAt",
                table: "SensorConfigurations",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_SensorConfigurations_CreatedBy",
                table: "SensorConfigurations",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_SensorConfigurations_IsEnabled",
                table: "SensorConfigurations",
                column: "IsEnabled");

            migrationBuilder.CreateIndex(
                name: "IX_SensorConfigurations_SensorName",
                table: "SensorConfigurations",
                column: "SensorName");

            migrationBuilder.CreateIndex(
                name: "IX_SensorConfigurations_SensorNumber",
                table: "SensorConfigurations",
                column: "SensorNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SensorConfigurations_UpdatedBy",
                table: "SensorConfigurations",
                column: "UpdatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_UserRoles_IsActive",
                table: "UserRoles",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_UserRoles_RoleId",
                table: "UserRoles",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "IX_UserRoles_UserId",
                table: "UserRoles",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserRoles_UserId_RoleId_IsActive",
                table: "UserRoles",
                columns: new[] { "UserId", "RoleId", "IsActive" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_RoleId",
                table: "Users",
                column: "RoleId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AccessLogs");

            migrationBuilder.DropTable(
                name: "ActivityReports");

            migrationBuilder.DropTable(
                name: "CameraConfigs");

            migrationBuilder.DropTable(
                name: "ContainmentControls");

            migrationBuilder.DropTable(
                name: "ContainmentStatuses");

            migrationBuilder.DropTable(
                name: "DeviceActivityStatuses");

            migrationBuilder.DropTable(
                name: "DeviceSensorData");

            migrationBuilder.DropTable(
                name: "EmergencyReports");

            migrationBuilder.DropTable(
                name: "Maintenances");

            migrationBuilder.DropTable(
                name: "MenuPermissions");

            migrationBuilder.DropTable(
                name: "MqttConfigurations");

            migrationBuilder.DropTable(
                name: "NetworkConfigurations");

            migrationBuilder.DropTable(
                name: "RolePermissions");

            migrationBuilder.DropTable(
                name: "ScanConfigurations");

            migrationBuilder.DropTable(
                name: "SensorConfigurations");

            migrationBuilder.DropTable(
                name: "UserRoles");

            migrationBuilder.DropTable(
                name: "Devices");

            migrationBuilder.DropTable(
                name: "MenuItems");

            migrationBuilder.DropTable(
                name: "Permissions");

            migrationBuilder.DropTable(
                name: "Racks");

            migrationBuilder.DropTable(
                name: "MenuGroups");

            migrationBuilder.DropTable(
                name: "Containments");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "Roles");
        }
    }
}
