# PowerShell script to create test events for CyberAgiesX

Write-Host "Creating test events..." -ForegroundColor Green

# Test Gmail Event 1
Write-Host "`n1. Creating test Gmail event (phishing attempt)..."
$body1 = @{
    from = "sender@example.com"
    to = "user@company.com"
    subject = "Urgent: Verify your account"
    body = "Please click here to verify your account immediately."
} | ConvertTo-Json

try {
    $response1 = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/test/gmail-event" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body1
    Write-Host "   ✅ Created event: $($response1.event_id)" -ForegroundColor Cyan
} catch {
    Write-Host "   ⚠️  Error: $_" -ForegroundColor Yellow
}

# Test Gmail Event 2
Write-Host "`n2. Creating test Gmail event (legitimate email)..."
$body2 = @{
    from = "billing@legitimate.com"
    to = "finance@company.com"
    subject = "Monthly invoice attached"
    body = "Please find your monthly invoice attached."
} | ConvertTo-Json

try {
    $response2 = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/test/gmail-event" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body2
    Write-Host "   ✅ Created event: $($response2.event_id)" -ForegroundColor Cyan
} catch {
    Write-Host "   ⚠️  Error: $_" -ForegroundColor Yellow
}

# Test Gmail Event 3
Write-Host "`n3. Creating test Gmail event (security alert)..."
$body3 = @{
    from = "admin@system.com"
    to = "manager@company.com"
    subject = "Security alert"
    body = "Unusual login detected from new location."
} | ConvertTo-Json

try {
    $response3 = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/test/gmail-event" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body3
    Write-Host "   ✅ Created event: $($response3.event_id)" -ForegroundColor Cyan
} catch {
    Write-Host "   ⚠️  Error: $_" -ForegroundColor Yellow
}

# Test Twilio Event 1
Write-Host "`n4. Creating test Twilio event (phone call)..."
$body4 = @{
    From = "+15551234567"
    To = "+15559876543"
} | ConvertTo-Json

try {
    $response4 = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/test/twilio-event" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body4
    Write-Host "   ✅ Created event: $($response4.event_id)" -ForegroundColor Cyan
} catch {
    Write-Host "   ⚠️  Error: $_" -ForegroundColor Yellow
}

# Test Twilio Event 2
Write-Host "`n5. Creating test Twilio event (phone call 2)..."
$body5 = @{
    From = "+15551111111"
    To = "+15559999999"
} | ConvertTo-Json

try {
    $response5 = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/test/twilio-event" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body5
    Write-Host "   ✅ Created event: $($response5.event_id)" -ForegroundColor Cyan
} catch {
    Write-Host "   ⚠️  Error: $_" -ForegroundColor Yellow
}

# Fetch events
Write-Host "`n6. Fetching created events..."
try {
    $events = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/events?limit=10"
    Write-Host "   ✅ Found $($events.events.Count) events" -ForegroundColor Green
    
    if ($events.events.Count -gt 0) {
        Write-Host "`n   Events:" -ForegroundColor Yellow
        foreach ($event in $events.events) {
            Write-Host "   - [$($event.source)] $($event.event_type): $($event.sender) → $($event.recipients -join ', ')" -ForegroundColor White
        }
    }
} catch {
    Write-Host "   ⚠️  Error fetching events: $_" -ForegroundColor Yellow
    Write-Host "   (Database might not be set up - this is okay, events are still created in-memory)" -ForegroundColor Gray
}

Write-Host "`n✅ Test setup complete!" -ForegroundColor Green
Write-Host "`nNow refresh your browser at http://localhost:3000/neuroshield_platform.html to see the events!" -ForegroundColor Cyan

