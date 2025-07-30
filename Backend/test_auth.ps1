# Test Authentication Script
Write-Host "=== Testing Authentication ==="

# Step 1: Login
Write-Host "1. Login to get JWT token..."
$loginResponse = Invoke-RestMethod -Uri 'http://localhost:5005/api/auth/login' -Method POST -ContentType 'application/json' -Body '{"email": "admin@example.com", "password": "password123"}'
$token = $loginResponse.token
Write-Host "✅ Login successful. Token received: $($token.Substring(0,50))..."

# Step 2: Test /api/auth/me (protected endpoint)
Write-Host "`n2. Testing /api/auth/me endpoint..."
try {
    $headers = @{ Authorization = "Bearer $token" }
    $meResponse = Invoke-RestMethod -Uri 'http://localhost:5005/api/auth/me' -Method GET -Headers $headers
    Write-Host "✅ /api/auth/me successful:"
    Write-Host "   User ID: $($meResponse.Id)"
    Write-Host "   Name: $($meResponse.Name)"
    Write-Host "   Email: $($meResponse.Email)"
    Write-Host "   Role: $($meResponse.Role)"
} catch {
    Write-Host "❌ /api/auth/me failed: $($_.Exception.Message)"
}

# Step 3: Test MQTT status endpoint
Write-Host "`n3. Testing /api/mqtt/status endpoint..."
try {
    $mqttResponse = Invoke-RestMethod -Uri 'http://localhost:5005/api/mqtt/status' -Method GET -Headers $headers
    Write-Host "✅ MQTT status successful:"
    Write-Host "   Status: $($mqttResponse.Status)"
    Write-Host "   Requested by: $($mqttResponse.RequestedBy.UserName)"
} catch {
    Write-Host "❌ MQTT status failed: $($_.Exception.Message)"
    Write-Host "   Response: $($_.Exception.Response)"
}

# Step 4: Test Users endpoint  
Write-Host "`n4. Testing /api/users endpoint..."
try {
    $usersResponse = Invoke-RestMethod -Uri 'http://localhost:5005/api/users' -Method GET -Headers $headers
    Write-Host "✅ Users endpoint successful. Found $($usersResponse.Count) users"
} catch {
    Write-Host "❌ Users endpoint failed: $($_.Exception.Message)"
}

Write-Host "`n=== Test Complete ==="