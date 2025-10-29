# Multi-stage Docker build for NewContainment Backend (.NET 9)
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy csproj file and restore as distinct layers
COPY ["Backend/Backend.csproj", "Backend/"]
RUN dotnet restore "Backend/Backend.csproj"

# Copy everything else and build
COPY ["Backend/", "Backend/"]
WORKDIR "/src/Backend"
RUN dotnet build "Backend.csproj" -c Release -o /app/build

# Publish the application
FROM build AS publish
RUN dotnet publish "Backend.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime image
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

# Install runtime dependencies for SQLite and other native libraries
RUN apt-get update && apt-get install -y \
    libc6-dev \
    libgdiplus \
    libx11-dev \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd --gid 1001 appuser && \
    useradd --uid 1001 --gid 1001 --shell /bin/bash --create-home appuser

# Set environment variables for ASP.NET Core
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:5000;https://+:5001
ENV DOTNET_RUNNING_IN_CONTAINER=true
ENV DOTNET_USE_POLLING_FILE_WATCHER=true

# Create directories for data and logs
RUN mkdir -p /app/data /app/logs /app/wwwroot && \
    chown -R appuser:appuser /app

# Copy published application
COPY --from=publish --chown=appuser:appuser /app/publish .

# Copy pre-built database if exists (for production seeding)
COPY --from=publish --chown=appuser:appuser /src/Backend/app.db* ./data/
COPY --from=publish --chown=appuser:appuser /src/Backend/wwwroot ./wwwroot/

# Switch to non-root user
USER appuser

# Expose ports
EXPOSE 5000 5001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Run the application
ENTRYPOINT ["dotnet", "Backend.dll"]
