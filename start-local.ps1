$ErrorActionPreference = "Stop"
$workspace = $PSScriptRoot
$localState = Join-Path $workspace ".local"
$envFile = Join-Path $localState "local.env"
$nextBinary = Join-Path $workspace "frontend\node_modules\.bin\next.cmd"

New-Item -ItemType Directory -Force -Path $localState | Out-Null

if (-not (Test-Path -LiteralPath $nextBinary)) {
    throw "Frontend dependencies are missing. Run 'npm ci' from the frontend directory first."
}

if (-not (Test-Path -LiteralPath $envFile)) {
    $mongoPassword = -join ((1..48) | ForEach-Object { "0123456789abcdef"[(Get-Random -Maximum 16)] })
    $jwtSecret = -join ((1..64) | ForEach-Object { "0123456789abcdef"[(Get-Random -Maximum 16)] })
    [IO.File]::WriteAllLines(
        $envFile,
        @(
            "CHARTCOACH_MONGO_USERNAME=chartcoach",
            "CHARTCOACH_MONGO_PASSWORD=$mongoPassword",
            "CHARTCOACH_JWT_SECRET=$jwtSecret"
        )
    )
}

$localEnvironment = @{}
foreach ($line in Get-Content -LiteralPath $envFile) {
    if (-not $line -or $line.StartsWith("#")) { continue }
    $key, $value = $line.Split("=", 2)
    $localEnvironment[$key] = $value
}

docker info --format "{{.ServerVersion}}" | Out-Null
docker compose --env-file $envFile -f (Join-Path $workspace "compose.local.yml") up -d --wait mongo

$databaseUrl = "mongodb://$($localEnvironment.CHARTCOACH_MONGO_USERNAME):$($localEnvironment.CHARTCOACH_MONGO_PASSWORD)@127.0.0.1:27018/?authSource=admin"

$backendEnvironment = @{
    DATABASE_URL = $databaseUrl
    DATABASE_NAME = "chartcoach-local"
    JWT_SECRET_KEY = $localEnvironment.CHARTCOACH_JWT_SECRET
    FRONTEND_ORIGIN = "http://127.0.0.1:3000"
    COOKIE_SECURE = "false"
}
$backendProcess = Start-Process python -WorkingDirectory (Join-Path $workspace "backend") `
    -WindowStyle Hidden -PassThru -Environment $backendEnvironment `
    -RedirectStandardOutput (Join-Path $localState "backend.out.log") `
    -RedirectStandardError (Join-Path $localState "backend.err.log") `
    -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"
$frontendProcess = Start-Process npm.cmd -WorkingDirectory (Join-Path $workspace "frontend") `
    -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput (Join-Path $localState "frontend.out.log") `
    -RedirectStandardError (Join-Path $localState "frontend.err.log") `
    -ArgumentList "run", "dev", "--", "--hostname", "127.0.0.1", "--port", "3000"
[IO.File]::WriteAllText((Join-Path $localState "backend.pid"), "$($backendProcess.Id)")
[IO.File]::WriteAllText((Join-Path $localState "frontend.pid"), "$($frontendProcess.Id)")
Write-Host "ChartCoach is starting at http://127.0.0.1:3000"
Write-Host "MongoDB data persists in the chartcoach-local-mongo-data Docker volume."
Write-Host "Logs and generated local credentials live in $localState and are ignored by Git."
