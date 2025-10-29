# Compression Performance Test
Write-Host "🧪 Testing compression effectiveness..." -ForegroundColor Green

# Test compressed endpoint
Write-Host "`n📊 Testing WITH compression:" -ForegroundColor Yellow
$compressed = Invoke-WebRequest -Uri "http://localhost:4005/test/large-response" -Headers @{
    "Accept-Encoding" = "gzip"
} -UseBasicParsing

Write-Host "   Response Size: $($compressed.Content.Length) bytes"
Write-Host "   Headers: $($compressed.Headers['X-Data-Size']) original"
Write-Host "   Compression: $($compressed.Headers['X-Compression'])"
Write-Host "   Response Time: $($compressed.Headers['X-Response-Time'])"

# Test uncompressed endpoint for comparison
Write-Host "`n📊 Testing WITHOUT compression:" -ForegroundColor Yellow
$uncompressed = Invoke-WebRequest -Uri "http://localhost:4005/test/no-compression" -UseBasicParsing

Write-Host "   Response Size: $($uncompressed.Content.Length) bytes"

# Calculate compression ratio
$originalSize = [int]($compressed.Headers['X-Data-Size'] -replace ' bytes', '')
$compressedSize = $compressed.Content.Length
$compressionRatio = [math]::Round((1 - ($compressedSize / $originalSize)) * 100, 1)

Write-Host "`n🎯 Compression Results:" -ForegroundColor Green
Write-Host "   Original Size: $originalSize bytes"
Write-Host "   Compressed Size: $compressedSize bytes"
Write-Host "   Compression Ratio: $compressionRatio% reduction"

if ($compressionRatio -ge 60) {
    Write-Host "   ✅ Excellent compression! Target 60-80% achieved." -ForegroundColor Green
} elseif ($compressionRatio -ge 40) {
    Write-Host "   ⚠️  Good compression, but could be better." -ForegroundColor Yellow
} else {
    Write-Host "   ❌ Poor compression ratio." -ForegroundColor Red
}

# Test metrics endpoint
Write-Host "`n📋 Optimization Details:" -ForegroundColor Cyan
$metrics = Invoke-RestMethod -Uri "http://localhost:4005/test/metrics"
$metrics.expected_improvements | ConvertTo-Json -Depth 3