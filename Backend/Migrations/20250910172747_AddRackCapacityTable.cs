using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddRackCapacityTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RackCapacities",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    RackId = table.Column<int>(type: "INTEGER", nullable: false),
                    TotalCapacityU = table.Column<int>(type: "INTEGER", nullable: false),
                    UsedCapacityU = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 0),
                    PowerCapacityW = table.Column<int>(type: "INTEGER", nullable: true),
                    UsedPowerW = table.Column<int>(type: "INTEGER", nullable: true),
                    WeightCapacityKg = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    UsedWeightKg = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RackCapacities", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RackCapacities_Racks_RackId",
                        column: x => x.RackId,
                        principalTable: "Racks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RackCapacities_RackId",
                table: "RackCapacities",
                column: "RackId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RackCapacities");
        }
    }
}
