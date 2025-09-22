# Use the official .NET 9 SDK image to build the app
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy csproj and restore dependencies
COPY ["Backend.csproj", "."]
RUN dotnet restore "Backend.csproj"

# Copy everything else and build
COPY . .
RUN dotnet build "Backend.csproj" -c Release -o /app/build

# Publish the app
FROM build AS publish
RUN dotnet publish "Backend.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Use the official .NET 9 runtime image
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

# Install SQLite
RUN apt-get update && apt-get install -y sqlite3 libsqlite3-dev && rm -rf /var/lib/apt/lists/*

# Create data directory
RUN mkdir -p /app/data && chmod 777 /app/data

# Copy published app
COPY --from=publish /app/publish .

# Create non-root user
RUN adduser --disabled-password --gecos '' appuser && chown -R appuser:appuser /app
USER appuser

# Expose ports
EXPOSE 5000 5001

# Set the entry point
ENTRYPOINT ["dotnet", "Backend.dll"]
