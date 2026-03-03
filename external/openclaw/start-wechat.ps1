# OpenClaw WeChat Bot — One Click Start
# Usage: .\start-wechat.ps1
#
# Required env vars (put in .env or system environment):
#   WECHAT_API_KEY       — your WeChat Proxy API key (wc_live_xxx)
#   WECHAT_PROXY_URL     — proxy service URL
#   OPENAI_API_KEY       — OpenAI API key (sk-proj-xxx)
#
# Optional:
#   WECHAT_WEBHOOK_HOST  — your server public IP / domain (for cloud deploy)
#   WECHAT_WEBHOOK_PORT  — webhook port (default: 18790)
#   WECHAT_DEVICE_TYPE   — "ipad" or "mac" (default: ipad)
#   OPENCLAW_LLM_MODEL   — OpenAI model (default: gpt-4o-mini)
#   OPENCLAW_LLM_BASE_URL— custom OpenAI-compatible base URL (optional)
#   Gewu_BRIDGE_URL     — Gewu backend URL (default: http://localhost:3001)
#   Gewu_BRIDGE_KEY     — must match OPENCLAW_BRIDGE_KEY in backend/.env

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  OpenClaw WeChat Bot — Setup & Start    " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# ── [1/6] Check OpenClaw CLI ───────────────────────────────────────────────
Write-Host "[1/6] Checking OpenClaw CLI..." -ForegroundColor Yellow
$openclawInstalled = $false
try {
    $ver = & openclaw --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        $openclawInstalled = $true
        Write-Host "       OpenClaw found: $ver" -ForegroundColor Green
    }
} catch { }

if (-not $openclawInstalled) {
    Write-Host "       OpenClaw CLI not found." -ForegroundColor Red
    Write-Host ""
    Write-Host "  Install it with:" -ForegroundColor White
    Write-Host "    npm install -g openclaw" -ForegroundColor Cyan
    Write-Host "  or:" -ForegroundColor White
    Write-Host "    pnpm add -g openclaw" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Then rerun this script." -ForegroundColor Gray
    pause
    exit 1
}
Write-Host ""

# ── [2/6] Install plugin dependencies ─────────────────────────────────────
Write-Host "[2/6] Installing plugin dependencies..." -ForegroundColor Yellow
$nm = Join-Path $ScriptDir "node_modules"
if (-not (Test-Path $nm)) {
    Push-Location $ScriptDir
    try {
        & pnpm install
        if ($LASTEXITCODE -ne 0) { throw "pnpm install failed" }
    } finally {
        Pop-Location
    }
    Write-Host "       Dependencies installed." -ForegroundColor Green
} else {
    Write-Host "       node_modules already present, skipping." -ForegroundColor Gray
}
Write-Host ""

# ── [3/6] Load .env ────────────────────────────────────────────────────────
Write-Host "[3/6] Loading environment..." -ForegroundColor Yellow
$envFile = Join-Path $ScriptDir ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
        if ($_ -match '^([^=]+)=(.*)$') {
            $k = $Matches[1].Trim()
            $v = $Matches[2].Trim().Trim('"')
            if (-not [System.Environment]::GetEnvironmentVariable($k)) {
                [System.Environment]::SetEnvironmentVariable($k, $v, 'Process')
            }
        }
    }
    Write-Host "       Loaded .env" -ForegroundColor Green
} else {
    Write-Host "       No .env file found — reading from system environment." -ForegroundColor Gray
    Write-Host "       (Tip: copy .env.example to .env and fill in values)" -ForegroundColor Gray
}
Write-Host ""

# ── Read all vars ──────────────────────────────────────────────────────────
$wechatApiKey    = $env:WECHAT_API_KEY
$wechatProxyUrl  = $env:WECHAT_PROXY_URL
$webhookHost     = $env:WECHAT_WEBHOOK_HOST
$webhookPort     = if ($env:WECHAT_WEBHOOK_PORT) { $env:WECHAT_WEBHOOK_PORT } else { "18790" }
$deviceType      = if ($env:WECHAT_DEVICE_TYPE)  { $env:WECHAT_DEVICE_TYPE  } else { "ipad" }
$openAiKey       = $env:OPENAI_API_KEY
$llmModel        = if ($env:OPENCLAW_LLM_MODEL)   { $env:OPENCLAW_LLM_MODEL  } else { "gpt-4o-mini" }
$llmBaseUrl      = $env:OPENCLAW_LLM_BASE_URL
$ravenBridgeUrl  = if ($env:Gewu_BRIDGE_URL)     { $env:Gewu_BRIDGE_URL    } else { "http://localhost:3001" }
$ravenBridgeKey  = $env:Gewu_BRIDGE_KEY

# Validate required vars
if (-not $wechatApiKey) {
    Write-Host "ERROR: WECHAT_API_KEY is not set." -ForegroundColor Red
    Write-Host "       Add it to .env or set as a system environment variable." -ForegroundColor Yellow
    pause; exit 1
}
if (-not $wechatProxyUrl) {
    Write-Host "ERROR: WECHAT_PROXY_URL is not set." -ForegroundColor Red
    pause; exit 1
}
if (-not $openAiKey) {
    Write-Host "ERROR: OPENAI_API_KEY is not set." -ForegroundColor Red
    Write-Host "       Add it to .env or set as a system environment variable." -ForegroundColor Yellow
    pause; exit 1
}

# ── [4/6] Configure WeChat channel ────────────────────────────────────────
Write-Host "[4/6] Configuring WeChat channel..." -ForegroundColor Yellow

& openclaw config set channels.wechat.apiKey     $wechatApiKey
& openclaw config set channels.wechat.proxyUrl   $wechatProxyUrl
& openclaw config set channels.wechat.enabled    "true"
& openclaw config set channels.wechat.deviceType $deviceType

if ($webhookHost) {
    & openclaw config set channels.wechat.webhookHost $webhookHost
    & openclaw config set channels.wechat.webhookPort $webhookPort
    Write-Host "       Webhook: http://${webhookHost}:${webhookPort}/webhook/wechat" -ForegroundColor Gray
} else {
    Write-Host "       WARNING: WECHAT_WEBHOOK_HOST not set — bot can only receive messages locally." -ForegroundColor Yellow
    Write-Host "       For cloud deployment set WECHAT_WEBHOOK_HOST to your server's public IP." -ForegroundColor Gray
}

# Ensure WeChat plugin is installed
$ErrorActionPreference = 'Continue'
$pluginList = & openclaw plugins list 2>&1
if ($LASTEXITCODE -ne 0 -or -not ($pluginList | Select-String "wechat")) {
    Write-Host "       Installing @canghe/openclaw-wechat plugin..." -ForegroundColor Gray
    & openclaw plugins install @canghe/openclaw-wechat 2>&1
}
$ErrorActionPreference = 'Stop'

# Configure Gewu Bridge (optional)
if ($ravenBridgeKey) {
    & openclaw config set tools.ravenBridge.url $ravenBridgeUrl
    & openclaw config set tools.ravenBridge.key $ravenBridgeKey
    Write-Host "       Gewu Bridge: $ravenBridgeUrl" -ForegroundColor Gray
} else {
    Write-Host "       Gewu Bridge: not configured (Gewu_BRIDGE_KEY not set)" -ForegroundColor Gray
}

Write-Host "       WeChat channel configured." -ForegroundColor Green
Write-Host ""

# ── [5/6] Configure OpenAI LLM ────────────────────────────────────────────
Write-Host "[5/6] Configuring LLM (OpenAI)..." -ForegroundColor Yellow

& openclaw config set llm.provider "openai"
& openclaw config set llm.apiKey   $openAiKey
& openclaw config set llm.model    $llmModel

if ($llmBaseUrl) {
    & openclaw config set llm.baseUrl $llmBaseUrl
    Write-Host "       LLM: OpenAI-compatible at $llmBaseUrl, model=$llmModel" -ForegroundColor Gray
} else {
    Write-Host "       LLM: OpenAI api.openai.com, model=$llmModel" -ForegroundColor Gray
}

Write-Host "       LLM configured." -ForegroundColor Green
Write-Host ""

# ── Summary ────────────────────────────────────────────────────────────────
Write-Host "  Configuration summary:" -ForegroundColor White
Write-Host "  ┌─────────────────────────────────────────────────────┐" -ForegroundColor DarkGray
Write-Host "  │  WeChat proxy  : $wechatProxyUrl" -ForegroundColor Gray
Write-Host "  │  Device type   : $deviceType" -ForegroundColor Gray
Write-Host "  │  LLM provider  : OpenAI ($llmModel)" -ForegroundColor Gray
if ($webhookHost) {
    Write-Host "  │  Webhook       : http://${webhookHost}:${webhookPort}/webhook/wechat" -ForegroundColor Gray
}
if ($ravenBridgeKey) {
    Write-Host "  │  Gewu bridge  : $ravenBridgeUrl  [active]" -ForegroundColor Gray
}
Write-Host "  └─────────────────────────────────────────────────────┘" -ForegroundColor DarkGray
Write-Host ""

# ── [6/6] Start Gateway ───────────────────────────────────────────────────
Write-Host "[6/6] Starting OpenClaw WeChat gateway..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  On first login a QR code URL will appear." -ForegroundColor White
Write-Host "  Open the URL in your browser and scan with WeChat." -ForegroundColor White
Write-Host ""
Write-Host "  Press Ctrl+C to stop." -ForegroundColor Gray
Write-Host ""

& openclaw gateway start
