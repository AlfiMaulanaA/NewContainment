using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class cihuyss : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
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
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Email = table.Column<string>(type: "TEXT", maxLength: 255, nullable: false),
                    PhoneNumber = table.Column<string>(type: "TEXT", maxLength: 20, nullable: true),
                    PasswordHash = table.Column<string>(type: "TEXT", maxLength: 255, nullable: false),
                    Role = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 1),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
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
                        name: "FK_Maintenances_Containments_TargetId",
                        column: x => x.TargetId,
                        principalTable: "Containments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Maintenances_Devices_TargetId",
                        column: x => x.TargetId,
                        principalTable: "Devices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Maintenances_Racks_TargetId",
                        column: x => x.TargetId,
                        principalTable: "Racks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
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
                name: "IX_Maintenances_TargetId",
                table: "Maintenances",
                column: "TargetId");

            migrationBuilder.CreateIndex(
                name: "IX_Maintenances_UpdatedBy",
                table: "Maintenances",
                column: "UpdatedBy");

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
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ActivityReports");

            migrationBuilder.DropTable(
                name: "ContainmentControls");

            migrationBuilder.DropTable(
                name: "ContainmentStatuses");

            migrationBuilder.DropTable(
                name: "EmergencyReports");

            migrationBuilder.DropTable(
                name: "Maintenances");

            migrationBuilder.DropTable(
                name: "Devices");

            migrationBuilder.DropTable(
                name: "Racks");

            migrationBuilder.DropTable(
                name: "Containments");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
