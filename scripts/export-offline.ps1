param(
  [string]$OutputDirectory = '.\offline-export'
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath '.env.production.local')) {
  throw 'Create .env.production.local from .env.example before exporting offline images.'
}

$outputPath = [System.IO.Path]::GetFullPath($OutputDirectory)
if (Test-Path -LiteralPath $outputPath) {
  throw "Output directory already exists: $outputPath"
}

$composeArgs = @(
  '--env-file', '.env.production.local',
  '-f', 'docker-compose.prod.yml'
)

& docker compose @composeArgs pull postgres pgbouncer redis
if ($LASTEXITCODE -ne 0) { throw 'Pulling runtime base images failed.' }

& docker compose @composeArgs build app migrate backup
if ($LASTEXITCODE -ne 0) { throw 'Building application, migration, or backup images failed.' }

New-Item -ItemType Directory -Path $outputPath | Out-Null
$imageArchive = Join-Path $outputPath 'mezon-docker-images.tar'
$images = @(
  'mezon/app:offline',
  'mezon/migrator:offline',
  'mezon/backup:offline',
  'postgres:16-alpine',
  'edoburu/pgbouncer:1.22.1-p0',
  'redis:7-alpine'
)

& docker image save --output $imageArchive @images
if ($LASTEXITCODE -ne 0) { throw 'Saving Docker images failed.' }

Copy-Item -LiteralPath 'docker-compose.prod.yml' -Destination $outputPath
Copy-Item -LiteralPath '.env.example' -Destination $outputPath
Copy-Item -LiteralPath 'docs/offline-deployment.md' -Destination $outputPath

Write-Output "Offline Docker bundle created at $outputPath"
Write-Output 'Transfer secret files and encrypted Restic backups separately using secure removable media.'
