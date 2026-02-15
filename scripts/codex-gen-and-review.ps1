param(
  [Parameter(Mandatory = $true, Position = 0, ValueFromRemainingArguments = $true)]
  [string[]]$Prompt
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$fullPrompt = ($Prompt -join ' ').Trim()

if ([string]::IsNullOrWhiteSpace($fullPrompt)) {
  Write-Error "Prompt is empty. Usage: scripts/codex-gen-and-review.ps1 <your prompt...>"
  exit 1
}

Write-Host ""
Write-Host "=== Codex: exec (code generation) ===" -ForegroundColor Cyan
codex exec -C $repoRoot $fullPrompt

Write-Host ""
Write-Host "=== Codex: review (auto) ===" -ForegroundColor Cyan

$artifactDir = Join-Path $repoRoot ".codex"
if (-not (Test-Path $artifactDir)) {
  New-Item -ItemType Directory -Path $artifactDir | Out-Null
}
$reviewOutFile = Join-Path $artifactDir "review.md"

$reviewPrompt = @"
Use `$repo-review-commit to review the current uncommitted changes in this repo.

Hard rules:
- Do NOT modify files.
- Output only the default template sections from `$repo-review-commit.
- Keep 'Public summary (safe to post)' concise and de-identified (no internal endpoints/table names/model IDs/prompts/secrets).
"@

codex review --uncommitted $reviewPrompt | Tee-Object -FilePath $reviewOutFile
