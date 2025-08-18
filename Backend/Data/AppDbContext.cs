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
        public DbSet<ContainmentControl> ContainmentControls { get; set; }
        public DbSet<EmergencyReport> EmergencyReports { get; set; }
        public DbSet<MqttConfiguration> MqttConfigurations { get; set; }
        public DbSet<NetworkConfiguration> NetworkConfigurations { get; set; }
        public DbSet<CameraConfig> CameraConfigs { get; set; }
        public DbSet<DeviceSensorData> DeviceSensorData { get; set; }
        public DbSet<AccessLog> AccessLogs { get; set; }
        public DbSet<SensorConfiguration> SensorConfigurations { get; set; }
        public DbSet<ScanConfiguration> ScanConfigurations { get; set; }
        public DbSet<DeviceActivityStatus> DeviceActivityStatuses { get; set; }
        
        // Menu Management tables
        public DbSet<Role> Roles { get; set; }
        public DbSet<Permission> Permissions { get; set; }
        public DbSet<MenuGroup> MenuGroups { get; set; }
        public DbSet<MenuItem> MenuItems { get; set; }
        public DbSet<MenuPermission> MenuPermissions { get; set; }
        public DbSet<UserRoleAssignment> UserRoles { get; set; }
        public DbSet<RolePermission> RolePermissions { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
            {
                  base.OnModelCreating(modelBuilder);

                  modelBuilder.Entity<User>(entity =>
                  {
                        entity.HasKey(e => e.Id);
                        entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
                        entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
                        entity.Property(e => e.PhoneNumber).HasMaxLength(20);
                        entity.Property(e => e.Role).IsRequired().HasDefaultValue(Backend.Enums.UserRole.User).HasSentinel(Backend.Enums.UserRole.None);
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

                        // Navigation properties without foreign key constraints
                        // These will be populated manually in the service layer based on TargetType and TargetId
                        entity.Ignore(e => e.TargetDevice);
                        entity.Ignore(e => e.TargetRack);
                        entity.Ignore(e => e.TargetContainment);
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

                        // Foreign key relationship - One Containment to One Status
                        entity.HasOne(e => e.Containment)
                        .WithOne()  // One-to-One relationship instead of One-to-Many
                        .HasForeignKey<ContainmentStatus>(e => e.ContainmentId)
                        .OnDelete(DeleteBehavior.Cascade);

                        // Unique index to ensure one status per containment
                        entity.HasIndex(e => e.ContainmentId).IsUnique();
                        entity.HasIndex(e => e.MqttTimestamp);
                        entity.HasIndex(e => e.CreatedAt);
                  });

                  modelBuilder.Entity<ContainmentControl>(entity =>
                  {
                        entity.HasKey(e => e.Id);
                        entity.Property(e => e.ContainmentId).IsRequired();
                        entity.Property(e => e.Command).IsRequired().HasMaxLength(100);
                        entity.Property(e => e.Description).HasMaxLength(500);
                        entity.Property(e => e.ExecutedAt).IsRequired();
                        entity.Property(e => e.ExecutedBy).IsRequired();
                        entity.Property(e => e.Status).IsRequired().HasMaxLength(50).HasDefaultValue("Pending");
                        entity.Property(e => e.ErrorMessage).HasMaxLength(255);

                        // Foreign key relationships
                        entity.HasOne(e => e.Containment)
                        .WithMany()
                        .HasForeignKey(e => e.ContainmentId)
                        .OnDelete(DeleteBehavior.Restrict);

                        entity.HasOne(e => e.ExecutedByUser)
                        .WithMany()
                        .HasForeignKey(e => e.ExecutedBy)
                        .OnDelete(DeleteBehavior.Restrict);

                        // Indexes for performance
                        entity.HasIndex(e => e.ContainmentId);
                        entity.HasIndex(e => e.ExecutedAt);
                        entity.HasIndex(e => e.Status);
                  });

                  modelBuilder.Entity<EmergencyReport>(entity =>
                  {
                        entity.HasKey(e => e.Id);
                        entity.Property(e => e.EmergencyType).IsRequired().HasMaxLength(50);
                        entity.Property(e => e.Status).IsRequired();
                        entity.Property(e => e.StartTime).IsRequired();
                        entity.Property(e => e.EndTime);
                        entity.Property(e => e.Duration);
                        entity.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);
                        entity.Property(e => e.Notes).HasMaxLength(1000);
                        entity.Property(e => e.RawMqttPayload).HasMaxLength(2000);
                        entity.Property(e => e.CreatedAt).IsRequired();
                        entity.Property(e => e.UpdatedAt).IsRequired();

                        // Indexes for performance
                        entity.HasIndex(e => e.EmergencyType);
                        entity.HasIndex(e => e.StartTime);
                        entity.HasIndex(e => e.IsActive);
                        entity.HasIndex(e => new { e.EmergencyType, e.IsActive });
                  });

                  modelBuilder.Entity<MqttConfiguration>(entity =>
                  {
                        entity.HasKey(e => e.Id);
                        entity.Property(e => e.IsEnabled).IsRequired();
                        entity.Property(e => e.UseEnvironmentConfig).IsRequired();
                        entity.Property(e => e.BrokerHost).HasMaxLength(255);
                        entity.Property(e => e.BrokerPort);
                        entity.Property(e => e.Username).HasMaxLength(100);
                        entity.Property(e => e.Password).HasMaxLength(255);
                        entity.Property(e => e.ClientId).HasMaxLength(100);
                        entity.Property(e => e.UseSsl).IsRequired();
                        entity.Property(e => e.KeepAliveInterval).IsRequired();
                        entity.Property(e => e.ReconnectDelay).IsRequired();
                        entity.Property(e => e.TopicPrefix).HasMaxLength(1000);
                        entity.Property(e => e.Description).HasMaxLength(500);
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

                        // Indexes for performance
                        entity.HasIndex(e => e.IsActive);
                        entity.HasIndex(e => e.UseEnvironmentConfig);
                        entity.HasIndex(e => e.IsEnabled);
                  });

                  modelBuilder.Entity<NetworkConfiguration>(entity =>
                  {
                        entity.HasKey(e => e.Id);
                        entity.Property(e => e.InterfaceType).IsRequired();
                        entity.Property(e => e.ConfigMethod).IsRequired();
                        entity.Property(e => e.IpAddress).HasMaxLength(15);
                        entity.Property(e => e.SubnetMask).HasMaxLength(15);
                        entity.Property(e => e.Gateway).HasMaxLength(15);
                        entity.Property(e => e.PrimaryDns).HasMaxLength(15);
                        entity.Property(e => e.SecondaryDns).HasMaxLength(15);
                        entity.Property(e => e.Metric).HasMaxLength(6);
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

                        // Indexes for performance
                        entity.HasIndex(e => e.InterfaceType).IsUnique();
                        entity.HasIndex(e => e.IsActive);
                        entity.HasIndex(e => e.ConfigMethod);
                  });
                  modelBuilder.Entity<CameraConfig>(entity =>
                  {
                        entity.HasKey(e => e.Id);
                        entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
                        entity.Property(e => e.IpAddress).IsRequired().HasMaxLength(45);
                        entity.Property(e => e.Port).IsRequired();
                        entity.Property(e => e.ApiKey).IsRequired().HasMaxLength(100);
                        entity.Property(e => e.CreatedAt).IsRequired();
                        entity.Property(e => e.UpdatedAt).IsRequired();
                        entity.Property(e => e.IsActive).IsRequired();

                        // Indexes for performance
                        entity.HasIndex(e => e.Name);
                        entity.HasIndex(e => e.IpAddress);
                        entity.HasIndex(e => e.IsActive);
                  });

                  modelBuilder.Entity<DeviceSensorData>(entity =>
                  {
                        entity.HasKey(e => e.Id);
                        entity.Property(e => e.DeviceId).IsRequired();
                        entity.Property(e => e.RackId).IsRequired();
                        entity.Property(e => e.ContainmentId).IsRequired();
                        entity.Property(e => e.Topic).IsRequired().HasMaxLength(200);
                        entity.Property(e => e.Timestamp).IsRequired();
                        entity.Property(e => e.ReceivedAt).IsRequired();
                        entity.Property(e => e.RawPayload).IsRequired();

                        // Foreign key relationships
                        entity.HasOne(e => e.Device)
                        .WithMany()
                        .HasForeignKey(e => e.DeviceId)
                        .OnDelete(DeleteBehavior.Cascade);

                        entity.HasOne(e => e.Rack)
                        .WithMany()
                        .HasForeignKey(e => e.RackId)
                        .OnDelete(DeleteBehavior.Restrict);

                        entity.HasOne(e => e.Containment)
                        .WithMany()
                        .HasForeignKey(e => e.ContainmentId)
                        .OnDelete(DeleteBehavior.Restrict);

                        // Indexes for performance
                        entity.HasIndex(e => e.DeviceId);
                        entity.HasIndex(e => e.RackId);
                        entity.HasIndex(e => e.ContainmentId);
                        entity.HasIndex(e => e.Topic);
                        entity.HasIndex(e => e.Timestamp);
                        entity.HasIndex(e => e.ReceivedAt);
                        entity.HasIndex(e => new { e.DeviceId, e.Timestamp });
                        entity.HasIndex(e => new { e.ContainmentId, e.Timestamp });
                  });

                  modelBuilder.Entity<AccessLog>(entity =>
                  {
                        entity.HasKey(e => e.Id);
                        entity.Property(e => e.User).IsRequired().HasMaxLength(100);
                        entity.Property(e => e.Via).IsRequired();
                        entity.Property(e => e.Trigger).IsRequired().HasMaxLength(200);
                        entity.Property(e => e.Timestamp).IsRequired();
                        entity.Property(e => e.IsSuccess).IsRequired().HasDefaultValue(true);

                        // Add indexes for common queries
                        entity.HasIndex(e => e.Via);
                        entity.HasIndex(e => e.Timestamp);
                        entity.HasIndex(e => new { e.Via, e.Timestamp });
                        entity.HasIndex(e => e.User);
                  });

                  modelBuilder.Entity<SensorConfiguration>(entity =>
                  {
                        entity.HasKey(e => e.Id);
                        entity.Property(e => e.SensorNumber).IsRequired();
                        entity.Property(e => e.SensorName).IsRequired().HasMaxLength(100);
                        entity.Property(e => e.ModbusAddress).IsRequired();
                        entity.Property(e => e.ModbusPort).IsRequired().HasMaxLength(20);
                        entity.Property(e => e.SensorType).IsRequired().HasMaxLength(50);
                        entity.Property(e => e.Description).HasMaxLength(500);
                        entity.Property(e => e.IsEnabled).IsRequired().HasDefaultValue(true);
                        entity.Property(e => e.TemperatureOffset).HasDefaultValue(0);
                        entity.Property(e => e.HumidityOffset).HasDefaultValue(0);
                        entity.Property(e => e.CreatedAt).IsRequired();
                        entity.Property(e => e.UpdatedAt).IsRequired();
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

                        // Unique index for sensor number
                        entity.HasIndex(e => e.SensorNumber).IsUnique();
                        entity.HasIndex(e => e.SensorName);
                        entity.HasIndex(e => e.IsEnabled);
                        entity.HasIndex(e => e.CreatedAt);
                  });

                  modelBuilder.Entity<ScanConfiguration>(entity =>
                  {
                        entity.HasKey(e => e.Id);
                        entity.Property(e => e.MaxAddressToScan).IsRequired().HasDefaultValue(247);
                        entity.Property(e => e.SelectedPort).IsRequired().HasMaxLength(20).HasDefaultValue("COM3");
                        entity.Property(e => e.SelectedSensor).IsRequired().HasMaxLength(50).HasDefaultValue("XY_MD02");
                        entity.Property(e => e.ScanTimeoutMs).HasDefaultValue(1000);
                        entity.Property(e => e.ScanIntervalMs).HasDefaultValue(100);
                        entity.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);
                        entity.Property(e => e.CreatedAt).IsRequired();
                        entity.Property(e => e.UpdatedAt).IsRequired();
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

                        // Indexes for performance
                        entity.HasIndex(e => e.IsActive);
                        entity.HasIndex(e => e.CreatedAt);
                  });

                  // Menu Management entity configurations
                  modelBuilder.Entity<Role>(entity =>
                  {
                        entity.HasKey(e => e.Id);
                        entity.Property(e => e.Name).IsRequired().HasMaxLength(50);
                        entity.Property(e => e.DisplayName).IsRequired().HasMaxLength(100);
                        entity.Property(e => e.Description).HasMaxLength(200);
                        entity.Property(e => e.Level).IsRequired();
                        entity.Property(e => e.Color).HasMaxLength(50).HasDefaultValue("text-gray-600 bg-gray-100");
                        entity.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);
                        entity.Property(e => e.CreatedAt).IsRequired();
                        entity.Property(e => e.UpdatedAt);

                        entity.HasIndex(e => e.Name).IsUnique();
                        entity.HasIndex(e => e.Level);
                        entity.HasIndex(e => e.IsActive);
                  });

                  modelBuilder.Entity<Permission>(entity =>
                  {
                        entity.HasKey(e => e.Id);
                        entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
                        entity.Property(e => e.Description).HasMaxLength(200);
                        entity.Property(e => e.Category).HasMaxLength(50);
                        entity.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);
                        entity.Property(e => e.CreatedAt).IsRequired();

                        entity.HasIndex(e => e.Name).IsUnique();
                        entity.HasIndex(e => e.Category);
                        entity.HasIndex(e => e.IsActive);
                  });

                  modelBuilder.Entity<MenuGroup>(entity =>
                  {
                        entity.HasKey(e => e.Id);
                        entity.Property(e => e.Title).IsRequired().HasMaxLength(100);
                        entity.Property(e => e.Icon).HasMaxLength(50);
                        entity.Property(e => e.SortOrder).HasDefaultValue(0);
                        entity.Property(e => e.MinRoleLevel);
                        entity.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);
                        entity.Property(e => e.RequiresDeveloperMode).HasDefaultValue(false);
                        entity.Property(e => e.CreatedAt).IsRequired();
                        entity.Property(e => e.UpdatedAt);

                        entity.HasIndex(e => e.SortOrder);
                        entity.HasIndex(e => e.IsActive);
                        entity.HasIndex(e => e.RequiresDeveloperMode);
                  });

                  modelBuilder.Entity<MenuItem>(entity =>
                  {
                        entity.HasKey(e => e.Id);
                        entity.Property(e => e.Title).IsRequired().HasMaxLength(100);
                        entity.Property(e => e.Url).IsRequired().HasMaxLength(200);
                        entity.Property(e => e.Icon).HasMaxLength(50);
                        entity.Property(e => e.SortOrder).HasDefaultValue(0);
                        entity.Property(e => e.MinRoleLevel);
                        entity.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);
                        entity.Property(e => e.RequiresDeveloperMode).HasDefaultValue(false);
                        entity.Property(e => e.BadgeText).HasMaxLength(50);
                        entity.Property(e => e.BadgeVariant).HasMaxLength(20).HasDefaultValue("default");
                        entity.Property(e => e.CreatedAt).IsRequired();
                        entity.Property(e => e.UpdatedAt);
                        entity.Property(e => e.MenuGroupId).IsRequired();

                        // Foreign key relationship
                        entity.HasOne(e => e.MenuGroup)
                        .WithMany(mg => mg.MenuItems)
                        .HasForeignKey(e => e.MenuGroupId)
                        .OnDelete(DeleteBehavior.Cascade);

                        entity.HasIndex(e => e.Url);
                        entity.HasIndex(e => e.SortOrder);
                        entity.HasIndex(e => e.IsActive);
                        entity.HasIndex(e => e.RequiresDeveloperMode);
                        entity.HasIndex(e => e.MenuGroupId);
                  });

                  modelBuilder.Entity<MenuPermission>(entity =>
                  {
                        entity.HasKey(e => e.Id);
                        entity.Property(e => e.MenuItemId);
                        entity.Property(e => e.MenuGroupId);
                        entity.Property(e => e.RoleId);
                        entity.Property(e => e.PermissionId);
                        entity.Property(e => e.IsRequired).HasDefaultValue(true);
                        entity.Property(e => e.CreatedAt).IsRequired();

                        // Foreign key relationships
                        entity.HasOne(e => e.MenuItem)
                        .WithMany(mi => mi.MenuPermissions)
                        .HasForeignKey(e => e.MenuItemId)
                        .OnDelete(DeleteBehavior.Cascade);

                        entity.HasOne(e => e.MenuGroup)
                        .WithMany()
                        .HasForeignKey(e => e.MenuGroupId)
                        .OnDelete(DeleteBehavior.Cascade);

                        entity.HasOne(e => e.Role)
                        .WithMany(r => r.MenuPermissions)
                        .HasForeignKey(e => e.RoleId)
                        .OnDelete(DeleteBehavior.Cascade);

                        entity.HasOne(e => e.Permission)
                        .WithMany(p => p.MenuPermissions)
                        .HasForeignKey(e => e.PermissionId)
                        .OnDelete(DeleteBehavior.Cascade);
                  });

                  modelBuilder.Entity<UserRoleAssignment>(entity =>
                  {
                        entity.HasKey(e => e.Id);
                        entity.Property(e => e.UserId).IsRequired();
                        entity.Property(e => e.RoleId).IsRequired();
                        entity.Property(e => e.AssignedAt).IsRequired();
                        entity.Property(e => e.ExpiresAt);
                        entity.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);

                        // Foreign key relationships
                        entity.HasOne(e => e.User)
                        .WithMany()
                        .HasForeignKey(e => e.UserId)
                        .OnDelete(DeleteBehavior.Cascade);

                        entity.HasOne(e => e.Role)
                        .WithMany(r => r.UserRoles)
                        .HasForeignKey(e => e.RoleId)
                        .OnDelete(DeleteBehavior.Cascade);

                        // Unique constraint: one active role per user
                        entity.HasIndex(e => new { e.UserId, e.RoleId, e.IsActive }).IsUnique();
                        entity.HasIndex(e => e.UserId);
                        entity.HasIndex(e => e.IsActive);
                  });

                  modelBuilder.Entity<RolePermission>(entity =>
                  {
                        entity.HasKey(e => e.Id);
                        entity.Property(e => e.RoleId).IsRequired();
                        entity.Property(e => e.PermissionId).IsRequired();
                        entity.Property(e => e.AssignedAt).IsRequired();

                        // Foreign key relationships
                        entity.HasOne(e => e.Role)
                        .WithMany(r => r.RolePermissions)
                        .HasForeignKey(e => e.RoleId)
                        .OnDelete(DeleteBehavior.Cascade);

                        entity.HasOne(e => e.Permission)
                        .WithMany(p => p.RolePermissions)
                        .HasForeignKey(e => e.PermissionId)
                        .OnDelete(DeleteBehavior.Cascade);

                        // Unique constraint: one permission per role
                        entity.HasIndex(e => new { e.RoleId, e.PermissionId }).IsUnique();
                  });

                  // Note: Seed data will be created programmatically in Program.cs to ensure proper password hashing
            }
    }
}