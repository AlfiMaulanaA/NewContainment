# Get Full JWT Token Script
Write-Host "Getting JWT Token..."

try {
    $response = Invoke-RestMethod -Uri 'http://localhost:5005/api/auth/login' -Method POST -ContentType 'application/json' -Body '{"email": "admin@example.com", "password": "password123"}'
    
    $token = $response.token
    
    Write-Host "✅ Login successful!"
    Write-Host ""
    Write-Host "=== COPY THIS TOKEN FOR SWAGGER ==="
    Write-Host "Bearer $token"
    Write-Host "=================================="
    Write-Host ""
    Write-Host "Steps for Swagger UI:"
    Write-Host "1. Open http://localhost:5005/swagger"
    Write-Host "2. Click 'Authorize' button (🔒)"
    Write-Host "3. Paste the 'Bearer ...' text above"
    Write-Host "4. Click Authorize then Close"
    Write-Host "5. Now you can test MQTT endpoints!"
    
    # Test the token immediately
    Write-Host ""
    Write-Host "Testing token..."
    $headers = @{ Authorization = "Bearer $token" }
    
    try {
        $mqttResponse = Invoke-RestMethod -Uri "http://localhost:5005/api/mqtt/status" -Method GET -Headers $headers
        Write-Host "✅ Token works! MQTT Status: $($mqttResponse.Status)"
    } catch {
        Write-Host "❌ Token test failed: $($_.Exception.Message)"
    }
    
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)"
}