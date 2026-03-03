# Gewu AI - One Click Start

$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ArtifactDir = Join-Path $ProjectRoot '.codex'
$ProcessStatePath = Join-Path $ArtifactDir 'dev-processes.json'

# -- Helpers ------------------------------------------------------------------

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
    $backendPath  = (Join-Path $ProjectRoot 'backend').ToLowerInvariant()
    $frontendPath = (Join-Path $ProjectRoot 'frontend').ToLowerInvariant()

    if (Test-Path $ProcessStatePath) {
        try {
            $state = Get-Content $ProcessStatePath -Raw | ConvertFrom-Json
            if ($state.backend.pid)  { [void]$pids.Add([int]$state.backend.pid) }
            if ($state.frontend.pid) { [void]$pids.Add([int]$state.frontend.pid) }
        } catch {
            Write-Host "       WARNING: Failed to read $ProcessStatePath, will remove it." -ForegroundColor Red
        } finally {
            Remove-Item $ProcessStatePath -Force -ErrorAction SilentlyContinue
        }
    }

    # Fallback: find cmd windows launched by this script
    try {
        $cmdProcs = Get-CimInstance Win32_Process -Filter "Name = 'cmd.exe'" -ErrorAction SilentlyContinue
        foreach ($p in ($cmdProcs | Where-Object { $_.CommandLine })) {
            $cl = $p.CommandLine.ToLowerInvariant()
            $isBackend  = $cl.Contains($backendPath)  -and ($cl.Contains('pnpm start:dev') -or $cl.Contains('pnpm prisma'))
            $isFrontend = $cl.Contains($frontendPath) -and $cl.Contains('pnpm dev')
            if ($isBackend -or $isFrontend) { [void]$pids.Add([int]$p.ProcessId) }
        }
    } catch { }

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
        $cmdLine  = ([string]$p.CommandLine).ToLowerInvariant()
        $allowed  = @('cmd.exe', 'powershell.exe', 'pwsh.exe')
        $looksLikeDev = ($cmdLine.Contains($backendPath) -or $cmdLine.Contains($frontendPath) -or $cmdLine.Contains('title gewu backend') -or $cmdLine.Contains('title gewu frontend'))
        if (-not ($allowed -contains $procName) -or -not $looksLikeDev) {
            Write-Host "       Skipping PID $processId ($($p.Name)) - not a dev process." -ForegroundColor Gray
            continue
        }
        Write-Host "       Stopping PID $processId ($($p.Name))..."
        Invoke-TaskKillTree -ProcessId $processId
    }
}

# Returns "pnpm install && " only when node_modules is missing or pnpm-lock.yaml is newer
function Get-InstallCmdPrefix {
    param([string]$Dir)
    $nm   = Join-Path $Dir 'node_modules'
    $meta = Join-Path $nm '.modules.yaml'
    $lock = Join-Path $Dir 'pnpm-lock.yaml'
    if (-not (Test-Path $nm) -or -not (Test-Path $meta) -or -not (Test-Path $lock)) {
        return "pnpm install && "
    }
    if ((Get-Item $lock).LastWriteTime -gt (Get-Item $meta).LastWriteTime) {
        return "pnpm install && "
    }
    return ""
}

# Always regenerate Prisma client to avoid stale types after schema/migration changes.
# Timestamp-based checks are unreliable on Windows/git (checkout does not preserve mtime).
function Get-PrismaGenerateCmdPrefix {
    return "pnpm prisma generate && "
}

# -- Main ---------------------------------------------------------------------

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Gewu AI - One Click Start" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# [1/7] Close previously started windows
Write-Host "[1/7] Closing previously started dev windows..." -ForegroundColor Yellow
if (-not (Test-Path $ArtifactDir)) { New-Item -ItemType Directory -Path $ArtifactDir | Out-Null }
Stop-TrackedDevProcesses
Write-Host "       Done." -ForegroundColor Green
Write-Host ""

# [2/7] Kill old processes on ports 3000 / 3001
Write-Host "[2/7] Killing old processes on ports 3000/3001..." -ForegroundColor Yellow
foreach ($port in @(3000, 3001)) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    $portPids = $conns | Select-Object -ExpandProperty OwningProcess -ErrorAction SilentlyContinue `
                       | Where-Object { $_ -and $_ -ne 0 } | Select-Object -Unique
    foreach ($processId in $portPids) {
        Write-Host "       Killing PID $processId on port $port (tree)"
        Invoke-TaskKillTree -ProcessId $processId
    }
}
Start-Sleep -Seconds 2
Write-Host "       Done." -ForegroundColor Green
Write-Host ""

# [3/7] Pull latest code - skipped if working tree has uncommitted changes
Write-Host "[3/7] Pulling latest code..." -ForegroundColor Yellow
Set-Location $ProjectRoot
$ErrorActionPreference = 'Continue'
$dirtyFiles = & git status --porcelain 2>&1
$ErrorActionPreference = 'Stop'
if ($dirtyFiles) {
    Write-Host "       Skipped: working tree has uncommitted changes." -ForegroundColor Yellow
    Write-Host "       Commit or stash your changes first to pull latest." -ForegroundColor Gray
} else {
    git pull
}
Write-Host ""

# [4/7] Start PostgreSQL
Write-Host "[4/7] Starting PostgreSQL (Docker)..." -ForegroundColor Yellow

# Check Docker is actually running before trying compose
$dockerRunning = $false
try {
    $dockerInfo = & docker info 2>&1
    if ($LASTEXITCODE -eq 0) { $dockerRunning = $true }
} catch { }

if (-not $dockerRunning) {
    Write-Host "       ERROR: Docker does not appear to be running." -ForegroundColor Red
    Write-Host "       Please start Docker Desktop and try again." -ForegroundColor Yellow
    pause
    exit 1
}

& docker compose up -d
Write-Host ""

# [5/7] Wait for database
Write-Host "[5/7] Waiting for database to be ready..." -ForegroundColor Yellow
$dbReady = $false
for ($retry = 1; $retry -le 60; $retry++) {
    try {
        $result = & docker exec gewu-postgres pg_isready -U postgres 2>&1
        if ($result -match "accepting connections") { $dbReady = $true; break }
    } catch { }
    Write-Host "       Waiting... ($retry/60)" -ForegroundColor Gray
    Start-Sleep -Seconds 1
}
if ($dbReady) {
    Write-Host "       Database is ready!" -ForegroundColor Green
} else {
    Write-Host "       ERROR: Database did not become ready after 60s." -ForegroundColor Red
    Write-Host "       Check: docker ps, docker logs gewu-postgres" -ForegroundColor Yellow
    pause
    exit 1
}
Write-Host ""

# [6/7] Start Backend  (install + generate + migrate run HERE so we can retry)
Write-Host "[6/7] Starting Backend (port 3001)..." -ForegroundColor Yellow

# Ensure backend/.env exists
$backendEnv = Join-Path $ProjectRoot 'backend\.env'
if (-not (Test-Path $backendEnv)) {
    $backendEnvExample = Join-Path $ProjectRoot 'backend\.env.example'
    if (Test-Path $backendEnvExample) {
        Write-Host "       backend/.env not found - copying from .env.example..." -ForegroundColor Yellow
        Copy-Item $backendEnvExample $backendEnv
        Write-Host "       Edit backend/.env and fill in API keys before using AI features." -ForegroundColor Gray
    } else {
        Write-Host "       ERROR: backend/.env not found and .env.example is also missing!" -ForegroundColor Red
        exit 1
    }
}

$backendDir = Join-Path $ProjectRoot 'backend'

# pnpm install (if needed)
$needsInstall = (Get-InstallCmdPrefix $backendDir) -ne ""
if ($needsInstall) {
    Write-Host "       Running pnpm install (lockfile changed or node_modules missing)..." -ForegroundColor Gray
    Push-Location $backendDir
    & pnpm install
    Pop-Location
}

# prisma generate — always run to keep client in sync with schema/migrations
Write-Host "       Running prisma generate..." -ForegroundColor Gray
Push-Location $backendDir
& pnpm prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "       ERROR: prisma generate failed." -ForegroundColor Red
    Pop-Location
    pause
    exit 1
}
Pop-Location

# prisma migrate deploy (with retry)
Write-Host "       Applying database migrations..." -ForegroundColor Gray
$migrated = $false
for ($attempt = 1; $attempt -le 5; $attempt++) {
    Push-Location $backendDir
    & pnpm prisma migrate deploy
    $exitCode = $LASTEXITCODE
    Pop-Location
    if ($exitCode -eq 0) { $migrated = $true; break }
    Write-Host "       Migration attempt $attempt/5 failed (exit $exitCode). Retrying in 5s..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
}
if (-not $migrated) {
    Write-Host "       ERROR: Database migrations failed after 5 attempts." -ForegroundColor Red
    Write-Host "       Check backend/.env DATABASE_URL and run: docker logs gewu-postgres" -ForegroundColor Yellow
    pause
    exit 1
}
Write-Host "       Migrations applied." -ForegroundColor Green

# prisma seed — upsert default admin (idempotent, safe to run every time)
Write-Host "       Seeding default admin user..." -ForegroundColor Gray
Push-Location $backendDir
& pnpm prisma:seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "       WARNING: Seed failed (non-fatal, continuing)." -ForegroundColor Yellow
}
Pop-Location

# Launch backend window (install/migrate done above; start:dev also re-runs prisma generate as safeguard)
$backendCmd = 'title Gewu Backend && cd /d "' + $backendDir + '" && pnpm start:dev'
$backendProc = Start-Process cmd -ArgumentList '/k', $backendCmd -WindowStyle Normal -PassThru
Write-Host ""

# [7/7] Start Frontend
Write-Host "[7/7] Starting Frontend (port 3000)..." -ForegroundColor Yellow
Write-Host "       Waiting for backend health check (http://localhost:3001/health)..."
$backendReady = Wait-HttpOk -Url 'http://localhost:3001/health' -TimeoutSec 90
if ($backendReady) {
    Write-Host "       Backend is ready." -ForegroundColor Green
} else {
    Write-Host "       WARNING: Backend health check timed out, starting frontend anyway..." -ForegroundColor Red
}

Write-Host "       Cleaning frontend .next cache..." -ForegroundColor Gray
[void](Remove-PathWithRetries -Path (Join-Path $ProjectRoot 'frontend\.next') -Retries 5 -DelayMs 500)

$frontendInstall = Get-InstallCmdPrefix (Join-Path $ProjectRoot 'frontend')
if ($frontendInstall) { Write-Host "       pnpm install needed (lockfile changed or node_modules missing)." -ForegroundColor Gray }
else                  { Write-Host "       pnpm install skipped (node_modules up-to-date)." -ForegroundColor Gray }

$frontendCmd = 'title Gewu Frontend && cd /d "' + $ProjectRoot + '\frontend" && ' + $frontendInstall + 'pnpm dev'
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
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Opening browser when frontend responds..."
$frontendReady = Wait-HttpOk -Url 'http://localhost:3000' -TimeoutSec 60
if (-not $frontendReady) {
    Write-Host "       WARNING: Frontend not ready within 60s, opening browser anyway..." -ForegroundColor Red
}
Start-Process "http://localhost:3000"
