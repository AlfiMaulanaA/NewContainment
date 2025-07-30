using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Enums;

namespace Backend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Containment> Containments { get; set; }
        public DbSet<Rack> Racks { get; set; }
        public DbSet<Device> Devices { get; set; }
        public DbSet<Maintenance> Maintenances { get; set; }
        public DbSet<ActivityReport> ActivityReports { get; set; }
        public DbSet<ContainmentStatus> ContainmentStatuses { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
                entity.Property(e => e.PhoneNumber).HasMaxLength(20);
                entity.Property(e => e.Role).IsRequired().HasDefaultValue(UserRole.User);
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.Property(e => e.UpdatedAt).IsRequired();
                entity.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);
                
                entity.HasIndex(e => e.Email).IsUnique();
            });

            modelBuilder.Entity<Containment>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Type).IsRequired();
                entity.Property(e => e.Description).HasMaxLength(500);
                entity.Property(e => e.Location).IsRequired().HasMaxLength(255);
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.Property(e => e.UpdatedAt).IsRequired();
                entity.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);
                entity.Property(e => e.CreatedBy).IsRequired();

                // Foreign key relationships
                entity.HasOne(e => e.CreatedByUser)
                      .WithMany()
                      .HasForeignKey(e => e.CreatedBy)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.UpdatedByUser)
                      .WithMany()
                      .HasForeignKey(e => e.UpdatedBy)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<Rack>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
                entity.Property(e => e.ContainmentId).IsRequired();
                entity.Property(e => e.Description).HasMaxLength(500);
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.Property(e => e.UpdatedAt).IsRequired();
                entity.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);
                entity.Property(e => e.CreatedBy).IsRequired();

                // Foreign key relationships
                entity.HasOne(e => e.Containment)
                      .WithMany(c => c.Racks)
                      .HasForeignKey(e => e.ContainmentId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.CreatedByUser)
                      .WithMany()
                      .HasForeignKey(e => e.CreatedBy)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.UpdatedByUser)
                      .WithMany()
                      .HasForeignKey(e => e.UpdatedBy)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<Device>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Type).IsRequired().HasMaxLength(50);
                entity.Property(e => e.RackId).IsRequired();
                entity.Property(e => e.Description).HasMaxLength(500);
                entity.Property(e => e.SerialNumber).HasMaxLength(100);
                entity.Property(e => e.Status).HasMaxLength(50).HasDefaultValue("Active");
                entity.Property(e => e.Topic).HasMaxLength(100);
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.Property(e => e.UpdatedAt).IsRequired();
                entity.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);
                entity.Property(e => e.CreatedBy).IsRequired();

                // Foreign key relationships
                entity.HasOne(e => e.Rack)
                      .WithMany(r => r.Devices)
                      .HasForeignKey(e => e.RackId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.CreatedByUser)
                      .WithMany()
                      .HasForeignKey(e => e.CreatedBy)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.UpdatedByUser)
                      .WithMany()
                      .HasForeignKey(e => e.UpdatedBy)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<Maintenance>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Description).HasMaxLength(1000);
                entity.Property(e => e.StartTask).IsRequired();
                entity.Property(e => e.EndTask).IsRequired();
                entity.Property(e => e.AssignTo).IsRequired();
                entity.Property(e => e.TargetType).IsRequired();
                entity.Property(e => e.TargetId).IsRequired();
                entity.Property(e => e.Status).HasMaxLength(50).HasDefaultValue("Scheduled");
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.Property(e => e.UpdatedAt).IsRequired();
                entity.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);
                entity.Property(e => e.CreatedBy).IsRequired();

                // Foreign key relationships
                entity.HasOne(e => e.AssignedToUser)
                      .WithMany()
                      .HasForeignKey(e => e.AssignTo)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.CreatedByUser)
                      .WithMany()
                      .HasForeignKey(e => e.CreatedBy)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.UpdatedByUser)
                      .WithMany()
                      .HasForeignKey(e => e.UpdatedBy)
                      .OnDelete(DeleteBehavior.Restrict);

                // Polymorphic relationships (configured manually)
                entity.HasOne(e => e.TargetDevice)
                      .WithMany()
                      .HasForeignKey(e => e.TargetId)
                      .HasPrincipalKey(d => d.Id)
                      .OnDelete(DeleteBehavior.Restrict)
                      .IsRequired(false);

                entity.HasOne(e => e.TargetRack)
                      .WithMany()
                      .HasForeignKey(e => e.TargetId)
                      .HasPrincipalKey(r => r.Id)
                      .OnDelete(DeleteBehavior.Restrict)
                      .IsRequired(false);

                entity.HasOne(e => e.TargetContainment)
                      .WithMany()
                      .HasForeignKey(e => e.TargetId)
                      .HasPrincipalKey(c => c.Id)
                      .OnDelete(DeleteBehavior.Restrict)
                      .IsRequired(false);
            });

            modelBuilder.Entity<ActivityReport>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Description).IsRequired().HasMaxLength(1000);
                entity.Property(e => e.Timestamp).IsRequired();
                entity.Property(e => e.Status).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Trigger).IsRequired().HasMaxLength(100);
                entity.Property(e => e.AdditionalData).HasMaxLength(500);

                // Foreign key relationship
                entity.HasOne(e => e.User)
                      .WithMany()
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.SetNull)
                      .IsRequired(false);

                // Index for better query performance
                entity.HasIndex(e => e.Timestamp);
                entity.HasIndex(e => e.Status);
                entity.HasIndex(e => e.Trigger);
            });

            modelBuilder.Entity<ContainmentStatus>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.ContainmentId).IsRequired();
                entity.Property(e => e.MqttTimestamp).IsRequired();
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.Property(e => e.UpdatedAt).IsRequired();
                entity.Property(e => e.RawPayload).HasColumnType("TEXT");

                // Foreign key relationship
                entity.HasOne(e => e.Containment)
                      .WithMany()
                      .HasForeignKey(e => e.ContainmentId)
                      .OnDelete(DeleteBehavior.Cascade);

                // Index for better query performance
                entity.HasIndex(e => e.ContainmentId);
                entity.HasIndex(e => e.MqttTimestamp);
                entity.HasIndex(e => e.CreatedAt);
            });

            // Note: Seed data will be created programmatically in Program.cs to ensure proper password hashing
        }
    }
}