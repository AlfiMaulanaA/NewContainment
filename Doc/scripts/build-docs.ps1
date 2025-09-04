# IoT Containment System - Documentation Build Script (PowerShell)
# This script automates the complete documentation build process

param(
    [string]$Environment = "development",
    [switch]$Serve = $false,
    [switch]$OpenBrowser = $false,
    [switch]$Watch = $false,
    [switch]$Clean = $false,
    [int]$Port = 8080
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  IoT Containment - Documentation Builder   " -ForegroundColor Cyan  
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Set locations
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$DocDir = Split-Path -Parent $ScriptDir
$GeneratorDir = Join-Path $DocDir "generator"
$OutputDir = Join-Path $DocDir "output"

Write-Host "📁 Working Directory: $DocDir" -ForegroundColor Green
Write-Host "🔧 Generator Directory: $GeneratorDir" -ForegroundColor Green
Write-Host "📄 Output Directory: $OutputDir" -ForegroundColor Green
Write-Host ""

# Function to check if Node.js is installed
function Test-NodeJS {
    try {
        $nodeVersion = node --version 2>$null
        if ($nodeVersion) {
            Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
            return $true
        }
    }
    catch {
        Write-Host "❌ Node.js not found" -ForegroundColor Red
        Write-Host "📥 Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
        return $false
    }
}

# Function to install dependencies
function Install-Dependencies {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Blue
    
    Set-Location $GeneratorDir
    
    if (!(Test-Path "node_modules")) {
        Write-Host "Installing npm packages..." -ForegroundColor Yellow
        npm install
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "Dependencies already installed" -ForegroundColor Green
    }
}

# Function to clean output directory
function Clear-Output {
    if ($Clean -or (Test-Path $OutputDir)) {
        Write-Host "🧹 Cleaning output directory..." -ForegroundColor Yellow
        Remove-Item $OutputDir -Recurse -Force -ErrorAction SilentlyContinue
        New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    }
}

# Function to generate documentation
function Build-Documentation {
    Write-Host "🚀 Generating documentation..." -ForegroundColor Blue
    
    Set-Location $GeneratorDir
    
    # Set environment variable
    $env:NODE_ENV = $Environment
    
    # Run the generator
    npm run generate
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Documentation generation failed!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Documentation generated successfully!" -ForegroundColor Green
}

# Function to serve documentation
function Start-Server {
    Write-Host "🌐 Starting documentation server..." -ForegroundColor Blue
    
    Set-Location $GeneratorDir
    
    if ($Watch) {
        Write-Host "👀 Starting in watch mode..." -ForegroundColor Yellow
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run watch" -WindowStyle Normal
        Start-Sleep 2
    }
    
    # Start the server
    if ($OpenBrowser) {
        Start-Process "http://localhost:$Port"
    }
    
    Write-Host "📚 Documentation server starting on port $Port" -ForegroundColor Green
    Write-Host "🔗 URL: http://localhost:$Port" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
    
    # Start the server (this will block)
    $env:PORT = $Port
    npm run serve
}

# Function to show build summary
function Show-Summary {
    $outputFiles = Get-ChildItem $OutputDir -Recurse -File | Measure-Object
    $outputSize = (Get-ChildItem $OutputDir -Recurse -File | Measure-Object -Property Length -Sum).Sum
    $outputSizeKB = [math]::Round($outputSize / 1KB, 2)
    
    Write-Host ""
    Write-Host "📋 Build Summary:" -ForegroundColor Cyan
    Write-Host "  📁 Output Directory: $OutputDir" -ForegroundColor White
    Write-Host "  📄 Files Generated: $($outputFiles.Count)" -ForegroundColor White
    Write-Host "  💾 Total Size: $outputSizeKB KB" -ForegroundColor White
    Write-Host "  🌐 Environment: $Environment" -ForegroundColor White
    Write-Host ""
    
    Write-Host "📂 Generated Files:" -ForegroundColor Green
    Get-ChildItem $OutputDir -File | ForEach-Object {
        $size = [math]::Round($_.Length / 1KB, 1)
        Write-Host "   • $($_.Name) ($size KB)" -ForegroundColor Gray
    }
    Write-Host ""
}

# Main execution flow
try {
    # Check prerequisites
    if (!(Test-NodeJS)) {
        exit 1
    }
    
    # Clean if requested
    Clear-Output
    
    # Install dependencies
    Install-Dependencies
    
    # Generate documentation
    Build-Documentation
    
    # Show summary
    Show-Summary
    
    # Start server if requested
    if ($Serve) {
        Start-Server
    } else {
        Write-Host "✨ Documentation build completed!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "  • Run with -Serve to start the documentation server" -ForegroundColor White
        Write-Host "  • Run with -Watch to enable auto-regeneration" -ForegroundColor White
        Write-Host "  • Check the output directory: $OutputDir" -ForegroundColor White
    }
    
} catch {
    Write-Host "❌ Build failed with error:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Examples:
# .\build-docs.ps1                          # Basic build
# .\build-docs.ps1 -Serve                   # Build and serve
# .\build-docs.ps1 -Serve -OpenBrowser      # Build, serve, and open browser
# .\build-docs.ps1 -Watch -Serve            # Build, serve, and watch for changes
# .\build-docs.ps1 -Clean                   # Clean and build
# .\build-docs.ps1 -Environment production  # Build for production