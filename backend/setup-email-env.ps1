# Quick Email Setup Script
# This will create the .env file for you

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  CyberAgiesX Email Setup" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Step 1: Getting your Gmail App Password" -ForegroundColor Yellow
Write-Host "  - Open: https://myaccount.google.com/apppasswords" -ForegroundColor White
Write-Host "  - If needed, enable 2-Step Verification first" -ForegroundColor White
Write-Host "  - Generate App Password for 'Mail' app" -ForegroundColor White
Write-Host "  - Copy the 16-character password`n" -ForegroundColor White

$email = "reshmasandhiya517@gmail.com"
Write-Host "Your email: $email" -ForegroundColor Green

$appPassword = Read-Host "`nEnter your Gmail App Password (16 characters, remove spaces)"

if ($appPassword) {
    # Remove spaces from app password
    $appPassword = $appPassword -replace '\s', ''
    
    $envContent = @"
# CyberAgiesX Email Configuration
GMAIL_USER=$email
GMAIL_APP_PASSWORD=$appPassword

# Server Configuration
PORT=3000
WS_PORT=3001
NODE_ENV=development
"@
    
    $envPath = Join-Path $PSScriptRoot ".env"
    $envContent | Out-File -FilePath $envPath -Encoding utf8
    
    Write-Host "`n✅ .env file created successfully!" -ForegroundColor Green
    Write-Host "📁 Location: $envPath" -ForegroundColor Yellow
    Write-Host "`n⚠️  IMPORTANT: Restart your server now!" -ForegroundColor Yellow
    Write-Host "   1. Stop the server (Ctrl+C in the terminal)" -ForegroundColor White
    Write-Host "   2. Start it: cd backend; node server.js" -ForegroundColor White
    Write-Host "   3. Look for: ✅ Email service initialized with Gmail" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "`n❌ Setup cancelled. You can manually create backend\.env file" -ForegroundColor Red
}

