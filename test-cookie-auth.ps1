# Test script for cookie-based authentication

Write-Host "Testing cookie-based authentication..."

# Step 1: Login and get cookie
Write-Host "`n1. Logging in to get authentication cookie..."
$loginResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body '{"email":"admin@50brains.com","password":"Admin123!"}' `
    -SessionVariable session

Write-Host "Login response status: $($loginResponse.StatusCode)"
Write-Host "Login response content: $($loginResponse.Content)"

# Check for Set-Cookie header
$setCookieHeader = $loginResponse.Headers['Set-Cookie']
if ($setCookieHeader) {
    Write-Host "Set-Cookie header found: $setCookieHeader"
} else {
    Write-Host "No Set-Cookie header found"
}

# Step 2: Test protected route using cookie
Write-Host "`n2. Testing protected user search endpoint with cookie..."
try {
    $searchResponse = Invoke-WebRequest -Uri "http://localhost:3000/search/users?roles=INFLUENCER" `
        -Method GET `
        -WebSession $session

    Write-Host "Search response status: $($searchResponse.StatusCode)"
    Write-Host "Search response content: $($searchResponse.Content)"
} catch {
    Write-Host "Search request failed: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $responseBody = $reader.ReadToEnd()
        Write-Host "Error response body: $responseBody"
    }
}

# Step 3: Test without cookie (should fail)
Write-Host "`n3. Testing protected endpoint without cookie (should fail)..."
try {
    $noAuthResponse = Invoke-WebRequest -Uri "http://localhost:3000/search/users?roles=INFLUENCER" `
        -Method GET

    Write-Host "No-auth response status: $($noAuthResponse.StatusCode)"
    Write-Host "No-auth response content: $($noAuthResponse.Content)"
} catch {
    Write-Host "No-auth request failed as expected: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $responseBody = $reader.ReadToEnd()
        Write-Host "Error response body: $responseBody"
    }
}

Write-Host "`n=== Cookie Authentication Test Complete ==="
