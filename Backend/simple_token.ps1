Write-Host "Getting JWT Token..."

$response = Invoke-RestMethod -Uri 'http://localhost:5005/api/auth/login' -Method POST -ContentType 'application/json' -Body '{"email": "admin@example.com", "password": "password123"}'

$token = $response.token

Write-Host "TOKEN FOR SWAGGER:"
Write-Host "Bearer $token"
Write-Host ""
Write-Host "Copy the line above and paste it in Swagger Authorize dialog"