$ErrorActionPreference = "Stop"
$workspace = $PSScriptRoot

$backendCommand = @"
`$env:DATABASE_URL='mongomock://local'
`$env:DATABASE_NAME='chartcoach-local'
`$env:JWT_SECRET_KEY='local-development-secret-change-me'
`$env:FRONTEND_ORIGIN='http://127.0.0.1:3000'
`$env:COOKIE_SECURE='false'
Set-Location -LiteralPath '$workspace\backend'
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
"@

$frontendCommand = @"
Set-Location -LiteralPath '$workspace\frontend'
npm run dev -- --hostname 127.0.0.1 --port 3000
"@

Start-Process powershell -WindowStyle Hidden -ArgumentList "-NoProfile", "-Command", $backendCommand
Start-Process powershell -WindowStyle Hidden -ArgumentList "-NoProfile", "-Command", $frontendCommand
Write-Host "ChartCoach is starting at http://127.0.0.1:3000"
Write-Host "The local database is in memory; accounts reset when the backend stops."
