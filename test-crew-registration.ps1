# PowerShell script to test CREW registration with all fields

$testData = @{
    email = "test.sarah.photographer@example.com"
    password = "CrewPass123!"
    firstName = "TestSarah"
    lastName = "Johnson"
    phone = "9876543210"
    location = "Pune, India"
    roles = "CREW"
    bio = "Professional photographer and videographer specializing in lifestyle and commercial content"
    website = "https://sarahjohnson.portfolio.com"
    instagramHandle = "sarah_captures"
    crewSkills = @("photography", "videography", "photo editing", "drone operation", "lighting setup")
    experienceLevel = "advanced"
    equipmentOwned = @("Canon EOS R5", "DJI Mini 3 Pro Drone", "Professional Lighting Kit", "Audio Recording Equipment", "Editing Workstation")
    portfolioUrl = "https://sarahjohnson.portfolio.com"
    hourlyRate = 3000
    availability = "freelance"
    workStyle = "hybrid"
    specializations = @("product photography", "lifestyle shoots", "social media content", "commercial videos", "event coverage")
} | ConvertTo-Json -Depth 3

Write-Host "Testing CREW registration with all fields..."
Write-Host "Request Body:"
Write-Host $testData

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register" -Method POST -Body $testData -ContentType "application/json"
    Write-Host "Success! Registration response:"
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Error occurred:"
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body:"
        Write-Host $responseBody
    }
}
