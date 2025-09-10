using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddSensorDataIntervalConfig : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SensorDataIntervalConfigs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    SaveIntervalMinutes = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 15),
                    IsEnabled = table.Column<bool>(type: "INTEGER", nullable: false, defaultValue: true),
                    DeviceId = table.Column<int>(type: "INTEGER", nullable: true),
                    ContainmentId = table.Column<int>(type: "INTEGER", nullable: true),
                    IsGlobalConfiguration = table.Column<bool>(type: "INTEGER", nullable: false, defaultValue: false),
                    CreatedBy = table.Column<int>(type: "INTEGER", nullable: false),
                    UpdatedBy = table.Column<int>(type: "INTEGER", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SensorDataIntervalConfigs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SensorDataIntervalConfigs_Containments_ContainmentId",
                        column: x => x.ContainmentId,
                        principalTable: "Containments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SensorDataIntervalConfigs_Devices_DeviceId",
                        column: x => x.DeviceId,
                        principalTable: "Devices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SensorDataIntervalConfigs_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SensorDataIntervalConfigs_Users_UpdatedBy",
                        column: x => x.UpdatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SensorDataIntervalConfigs_ContainmentId",
                table: "SensorDataIntervalConfigs",
                column: "ContainmentId");

            migrationBuilder.CreateIndex(
                name: "IX_SensorDataIntervalConfigs_ContainmentId_IsActive",
                table: "SensorDataIntervalConfigs",
                columns: new[] { "ContainmentId", "IsActive" },
                unique: true,
                filter: "[ContainmentId] IS NOT NULL AND [IsActive] = 1");

            migrationBuilder.CreateIndex(
                name: "IX_SensorDataIntervalConfigs_CreatedBy",
                table: "SensorDataIntervalConfigs",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_SensorDataIntervalConfigs_DeviceId",
                table: "SensorDataIntervalConfigs",
                column: "DeviceId");

            migrationBuilder.CreateIndex(
                name: "IX_SensorDataIntervalConfigs_DeviceId_IsActive",
                table: "SensorDataIntervalConfigs",
                columns: new[] { "DeviceId", "IsActive" },
                unique: true,
                filter: "[DeviceId] IS NOT NULL AND [IsActive] = 1");

            migrationBuilder.CreateIndex(
                name: "IX_SensorDataIntervalConfigs_IsActive",
                table: "SensorDataIntervalConfigs",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_SensorDataIntervalConfigs_IsGlobalConfiguration",
                table: "SensorDataIntervalConfigs",
                column: "IsGlobalConfiguration");

            migrationBuilder.CreateIndex(
                name: "IX_SensorDataIntervalConfigs_IsGlobalConfiguration_IsActive",
                table: "SensorDataIntervalConfigs",
                columns: new[] { "IsGlobalConfiguration", "IsActive" },
                unique: true,
                filter: "[IsGlobalConfiguration] = 1 AND [IsActive] = 1");

            migrationBuilder.CreateIndex(
                name: "IX_SensorDataIntervalConfigs_SaveIntervalMinutes",
                table: "SensorDataIntervalConfigs",
                column: "SaveIntervalMinutes");

            migrationBuilder.CreateIndex(
                name: "IX_SensorDataIntervalConfigs_UpdatedBy",
                table: "SensorDataIntervalConfigs",
                column: "UpdatedBy");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SensorDataIntervalConfigs");
        }
    }
}
