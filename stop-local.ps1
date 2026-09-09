$ErrorActionPreference = "Stop"
$workspace = $PSScriptRoot
$localState = Join-Path $workspace ".local"

foreach ($name in @("frontend", "backend")) {
    $pidFile = Join-Path $localState "$name.pid"
    if (-not (Test-Path -LiteralPath $pidFile)) {
        continue
    }

    $processId = [int](Get-Content -LiteralPath $pidFile -Raw)
    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if ($process) {
        Stop-Process -Id $processId -Force
    }
    Remove-Item -LiteralPath $pidFile -Force
}

$envFile = Join-Path $localState "local.env"
if (Test-Path -LiteralPath $envFile) {
    docker compose --env-file $envFile -f (Join-Path $workspace "compose.local.yml") stop
}

Write-Host "ChartCoach local services stopped. MongoDB data was preserved."
