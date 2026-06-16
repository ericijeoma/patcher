# Set the backend endpoint url
$WorkerUrl = "https://patcher.ericijeoma7767.workers.dev"

Write-Host "=== Hexis Dev Authenticator ===" -ForegroundColor Cyan
$choice = Read-Host "Do you want to (1) Register a new account or (2) Log in to an existing one? [Input 1 or 2]"

$email = Read-Host "Enter email address"
$password = Read-Host "Enter password"

if ($choice -eq "1") {
    $name = Read-Host "Enter your name"
    $body = @{
        email = $email
        password = $password
        name = $name
    } | ConvertTo-Json

    Write-Host "`nRegistering account on Cloudflare..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$WorkerUrl/api/auth/sign-up/email" `
          -Method Post `
          -Headers @{"Content-Type"="application/json"} `
          -Body $body
        
        $token = $response.session.token
        Write-Host "✅ Account created successfully!" -ForegroundColor Green
    } catch {
        Write-Host "❌ Registration failed." -ForegroundColor Red
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host $reader.ReadToEnd() -ForegroundColor DarkRed
        Exit
    }
} else {
    $body = @{
        email = $email
        password = $password
    } | ConvertTo-Json

    Write-Host "`nAuthenticating session..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$WorkerUrl/api/auth/sign-in/email" `
          -Method Post `
          -Headers @{"Content-Type"="application/json"} `
          -Body $body
        
        $token = $response.session.token
        Write-Host "✅ Login successful!" -ForegroundColor Green
    } catch {
        Write-Host "❌ Login failed." -ForegroundColor Red
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host $reader.ReadToEnd() -ForegroundColor DarkRed
        Exit
    }
}

# Bind the token directly to the PowerShell environment
if ($token) {
    $env:HEXIS_TOKEN = $token
    Write-Host "`n🎉 Success! Live session token has been securely set to `$env:HEXIS_TOKEN." -ForegroundColor Green
    Write-Host "You can now run your end-to-end static scans immediately using:" -ForegroundColor Gray
    Write-Host "pnpm dlx tsx scan.ts CWE15.exe`n" -ForegroundColor Cyan
} else {
    Write-Host "❌ No session token was returned by the auth server." -ForegroundColor Red
}
