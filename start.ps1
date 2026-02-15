# Raven AI Engine - One Click Start

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Raven AI Engine - One Click Start" -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Kill all processes on port 3000 and 3001
Write-Host "[1/6] Killing old processes..." -ForegroundColor Yellow
$ports = @(3000, 3001)
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    foreach ($conn in $connections) {
        $procId = $conn.OwningProcess
        if ($procId -and $procId -ne 0) {
            Write-Host "       Killing PID $procId on port $port"
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        }
    }
}
Start-Sleep -Seconds 2
Write-Host "       Done." -ForegroundColor Green
Write-Host ""

# Step 2: Pull latest code
Write-Host "[2/6] Pulling latest code..." -ForegroundColor Yellow
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ProjectRoot
git pull
Write-Host ""

# Step 3: Start PostgreSQL
Write-Host "[3/6] Starting PostgreSQL (Docker)..." -ForegroundColor Yellow
docker compose up -d
Write-Host ""

# Step 4: Wait for database to be ready
Write-Host "[4/6] Waiting for database to be ready..." -ForegroundColor Yellow
$maxRetries = 30
$retry = 0
$dbReady = $false
while ($retry -lt $maxRetries) {
    $retry++
    try {
        $result = docker exec raven-postgres pg_isready -U raven 2>&1
        if ($result -match "accepting connections") {
            $dbReady = $true
            break
        }
    } catch {}
    Write-Host "       Waiting... ($retry/$maxRetries)" -ForegroundColor Gray
    Start-Sleep -Seconds 1
}
if ($dbReady) {
    Write-Host "       Database is ready!" -ForegroundColor Green
} else {
    Write-Host "       WARNING: Database may not be ready yet, proceeding anyway..." -ForegroundColor Red
}
Write-Host ""

# Step 5: Start Backend
Write-Host "[5/6] Starting Backend (port 3001)..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList '/k', "cd /d $ProjectRoot\backend && pnpm install && pnpm prisma generate && pnpm prisma db push && pnpm start:dev" -WindowStyle Normal
Write-Host ""

# Step 6: Start Frontend
Write-Host "[6/6] Starting Frontend (port 3000)..." -ForegroundColor Yellow
Write-Host "       Waiting 10 seconds for backend to start..."
Start-Sleep -Seconds 10
Start-Process cmd -ArgumentList '/k', "cd /d $ProjectRoot\frontend && pnpm install && pnpm dev" -WindowStyle Normal
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "  All services starting!" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "  Backend:  http://localhost:3001" -ForegroundColor White
Write-Host "  Account:  admin@raven.local / admin123" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Opening browser in 8 seconds..."
Start-Sleep -Seconds 8
Start-Process "http://localhost:3000"