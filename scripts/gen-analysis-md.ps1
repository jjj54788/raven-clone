$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot

Push-Location $repoRoot
try {
  node scripts/gen-analysis-md.mjs @args
} finally {
  Pop-Location
}

