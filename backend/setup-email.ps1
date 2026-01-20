# Email Setup Script for CyberAgiesX
# This script helps you create the .env file with Gmail credentials

Write-Host "========================================"
Write-Host "  CyberAgiesX Email Setup" -ForegroundColor Cyan
Write-Host "========================================"
Write-Host ""

$email = Read-Host "Enter your Gmail address (e.g., yourname@gmail.com)"
$appPassword = Read-Host "Enter your Gmail App Password (16 characters, no spaces)"

if ($email -and $appPassword) {
    # Remove spaces from app password
    $appPassword = $appPassword -replace '\s', ''
    
    $envContent = @"
# CyberAgiesX Email Configuration
# Generated automatically

# Gmail App Password Configuration
GMAIL_USER=$email
GMAIL_APP_PASSWORD=$appPassword

# Server Configuration
PORT=3000
WS_PORT=3001
NODE_ENV=development
"@
    
    $envPath = Join-Path $PSScriptRoot ".env"
    $envContent | Out-File -FilePath $envPath -Encoding utf8 -NoNewline
    
    Write-Host ""
    Write-Host "✅ .env file created successfully!" -ForegroundColor Green
    Write-Host "📁 Location: $envPath" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: Restart your server for changes to take effect!" -ForegroundColor Yellow
    Write-Host "   1. Stop the server (Ctrl+C)"
    Write-Host "   2. Run: node server.js"
    Write-Host ""
} else {
    Write-Host "❌ Setup cancelled" -ForegroundColor Red
}

