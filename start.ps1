# Raven AI Engine - One Click Start

$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ArtifactDir = Join-Path $ProjectRoot '.codex'
$ProcessStatePath = Join-Path $ArtifactDir 'dev-processes.json'

function Remove-PathWithRetries {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [int]$Retries = 5,
        [int]$DelayMs = 500
    )

    for ($attempt = 1; $attempt -le $Retries; $attempt++) {
        try {
            if (Test-Path $Path) {
                Remove-Item -Path $Path -Recurse -Force -ErrorAction Stop
            }
            return $true
        } catch {
            if ($attempt -eq $Retries) {
                Write-Host "       WARNING: Failed to remove $Path ($($_.Exception.Message))" -ForegroundColor Red
                return $false
            }
            Start-Sleep -Milliseconds $DelayMs
        }
    }
}

function Wait-HttpOk {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Url,

        [int]$TimeoutSec = 60
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        try {
            $res = Invoke-WebRequest -UseBasicParsing -Uri $Url -Method Get -TimeoutSec 5
            if ($res.StatusCode -ge 200 -and $res.StatusCode -lt 400) {
                return $true
            }
        } catch {
            # keep waiting
        }
        Start-Sleep -Seconds 1
    }
    return $false
}

function Invoke-TaskKillTree {
    param(
        [Parameter(Mandatory = $true)]
        [int]$ProcessId
    )

    if (-not (Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue)) {
        return
    }

    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    try {
        & cmd.exe /c "taskkill /PID $ProcessId /T /F >nul 2>nul"
    } finally {
        $ErrorActionPreference = $prev
    }
}

function Stop-TrackedDevProcesses {
    $pids = New-Object System.Collections.Generic.List[int]
    $backendPath = (Join-Path $ProjectRoot 'backend').ToLowerInvariant()
    $frontendPath = (Join-Path $ProjectRoot 'frontend').ToLowerInvariant()

    # Preferred: stop by saved PID(s)
    if (Test-Path $ProcessStatePath) {
        try {
            $state = Get-Content $ProcessStatePath -Raw | ConvertFrom-Json
            if ($state.backend.pid) { [void]$pids.Add([int]$state.backend.pid) }
            if ($state.frontend.pid) { [void]$pids.Add([int]$state.frontend.pid) }
        } catch {
            Write-Host "       WARNING: Failed to read $ProcessStatePath, will remove it." -ForegroundColor Red
        } finally {
            Remove-Item $ProcessStatePath -Force -ErrorAction SilentlyContinue
        }
    }

    # Fallback: stop legacy cmd windows started by this script (before PID tracking existed)
    try {
        $cmdProcs = Get-CimInstance Win32_Process -Filter "Name = 'cmd.exe'" -ErrorAction SilentlyContinue

        foreach ($p in ($cmdProcs | Where-Object { $_.CommandLine })) {
            $cl = $p.CommandLine.ToLowerInvariant()

            $isBackend = $cl.Contains($backendPath) -and $cl.Contains('pnpm start:dev') -and $cl.Contains('pnpm prisma db push')
            $isFrontend = $cl.Contains($frontendPath) -and $cl.Contains('pnpm dev') -and $cl.Contains('pnpm install')

            if ($isBackend -or $isFrontend) {
                [void]$pids.Add([int]$p.ProcessId)
            }
        }
    } catch {
        # Best-effort only; never block startup on CIM failures
    }

    $uniquePids = $pids | Where-Object { $_ -gt 0 } | Select-Object -Unique
    if (-not $uniquePids -or $uniquePids.Count -eq 0) {
        Write-Host "       No previous dev processes found." -ForegroundColor Gray
        return
    }

    foreach ($processId in $uniquePids) {
        $p = Get-CimInstance Win32_Process -Filter "ProcessId = $processId" -ErrorAction SilentlyContinue
        if (-not $p) {
            Write-Host "       PID $processId already stopped." -ForegroundColor Gray
            continue
        }

        $procName = ([string]$p.Name).ToLowerInvariant()
        $cmdLine = ([string]$p.CommandLine).ToLowerInvariant()

        $allowedNames = @('cmd.exe', 'powershell.exe', 'pwsh.exe')
        $looksLikeDev = $cmdLine.Contains($backendPath) -or $cmdLine.Contains($frontendPath) -or $cmdLine.Contains('title raven backend') -or $cmdLine.Contains('title raven frontend')

        if (-not ($allowedNames -contains $procName) -or -not $looksLikeDev) {
            Write-Host "       Skipping PID $processId ($($p.Name)) - does not look like this repo's dev process." -ForegroundColor Gray
            continue
        }

        Write-Host "       Stopping PID $processId ($($p.Name))..."
        Invoke-TaskKillTree -ProcessId $processId
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Raven AI Engine - One Click Start" -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Close previously started windows (if any)
Write-Host "[1/7] Closing previously started dev windows..." -ForegroundColor Yellow
if (-not (Test-Path $ArtifactDir)) {
    New-Item -ItemType Directory -Path $ArtifactDir | Out-Null
}
Stop-TrackedDevProcesses
Write-Host "       Done." -ForegroundColor Green
Write-Host ""

# Step 2: Kill all processes on port 3000 and 3001
Write-Host "[2/7] Killing old processes on ports..." -ForegroundColor Yellow
$ports = @(3000, 3001)
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    $pidsOnPort = $connections | Select-Object -ExpandProperty OwningProcess -ErrorAction SilentlyContinue | Where-Object { $_ -and $_ -ne 0 } | Select-Object -Unique
    foreach ($processId in $pidsOnPort) {
        Write-Host "       Killing PID $processId on port $port (tree)"
        Invoke-TaskKillTree -ProcessId $processId
    }
}
Start-Sleep -Seconds 2
Write-Host "       Done." -ForegroundColor Green
Write-Host ""

# Step 3: Pull latest code
Write-Host "[3/7] Pulling latest code..." -ForegroundColor Yellow
Set-Location $ProjectRoot
git pull
Write-Host ""

# Step 4: Start PostgreSQL
Write-Host "[4/7] Starting PostgreSQL (Docker)..." -ForegroundColor Yellow
docker compose up -d
Write-Host ""

# Step 5: Wait for database to be ready
Write-Host "[5/7] Waiting for database to be ready..." -ForegroundColor Yellow
$maxRetries = 30
$retry = 0
$dbReady = $false
while ($retry -lt $maxRetries) {
    $retry++
    try {
        $result = docker exec raven-postgres pg_isready -U postgres 2>&1
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

# Step 6: Start Backend
Write-Host "[6/7] Starting Backend (port 3001)..." -ForegroundColor Yellow
$backendCmd = "title Raven Backend && cd /d `"$ProjectRoot\backend`" && pnpm install && pnpm prisma generate && pnpm prisma db push && pnpm start:dev"
$backendProc = Start-Process cmd -ArgumentList '/k', $backendCmd -WindowStyle Normal -PassThru
Write-Host ""

# Step 7: Start Frontend
Write-Host "[7/7] Starting Frontend (port 3000)..." -ForegroundColor Yellow
Write-Host "       Waiting for backend (port 3001) to start..."
$backendReady = $false
for ($i = 1; $i -le 60; $i++) {
    try {
        if (Test-NetConnection -ComputerName 127.0.0.1 -Port 3001 -InformationLevel Quiet -WarningAction SilentlyContinue) {
            $backendReady = $true
            break
        }
    } catch {}
    Start-Sleep -Seconds 1
}
if ($backendReady) {
    Write-Host "       Backend is listening." -ForegroundColor Green
} else {
    Write-Host "       WARNING: Backend not detected on port 3001 yet, starting frontend anyway..." -ForegroundColor Red
}

# Next.js dev occasionally breaks if stale/partial manifests exist in .next (Windows); clean before boot.
Write-Host "       Cleaning frontend .next cache..." -ForegroundColor Gray
[void](Remove-PathWithRetries -Path (Join-Path $ProjectRoot 'frontend\\.next') -Retries 5 -DelayMs 500)

$frontendCmd = "title Raven Frontend && cd /d `"$ProjectRoot\frontend`" && pnpm install && pnpm dev"
$frontendProc = Start-Process cmd -ArgumentList '/k', $frontendCmd -WindowStyle Normal -PassThru

@{
    repoRoot = $ProjectRoot
    backend  = @{ pid = $backendProc.Id; startedAt = (Get-Date).ToString('o') }
    frontend = @{ pid = $frontendProc.Id; startedAt = (Get-Date).ToString('o') }
} | ConvertTo-Json | Set-Content -Path $ProcessStatePath -Encoding UTF8
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "  All services starting!" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "  Backend:  http://localhost:3001" -ForegroundColor White
Write-Host "  Account:  admin@raven.local / admin123" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Opening browser when frontend responds..."
$frontendReady = Wait-HttpOk -Url 'http://localhost:3000' -TimeoutSec 60
if (-not $frontendReady) {
    Write-Host "       WARNING: Frontend not ready within 60s, opening browser anyway..." -ForegroundColor Red
}
Start-Process "http://localhost:3000"
