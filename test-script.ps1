Write-Host "Testing PowerShell script..." -ForegroundColor Green

# Test password prompt
$PASSWORD = Read-Host "Enter test password" -AsSecureString
$PLAIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($PASSWORD))

Write-Host "Password length: $($PLAIN_PASSWORD.Length)" -ForegroundColor Yellow
Write-Host "Script works correctly!" -ForegroundColor Green