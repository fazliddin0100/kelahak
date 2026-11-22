<#
  Mezon: Docker stack'ni bitta buyruq bilan yangilash yoki ishga tushirish.

  Ishlatish (loyiha papkasida, PowerShell):
    powershell -ExecutionPolicy Bypass -File scripts\deploy.ps1            # kodni yig'ib, yangilash
    powershell -ExecutionPolicy Bypass -File scripts\deploy.ps1 -NoBuild   # faqat ishga tushirish/tekshirish

  Nima qiladi:
    1. Docker ishlamasa - eskirgan socket papkasini chetga surib, Docker Desktop'ni ishga tushiradi
       va dvigatel tayyor bo'lishini kutadi.
    2. Yangi image'larni yig'adi. Bu paytda eski versiya ishlashda davom etadi;
       yig'ish xato bersa, hech narsa o'zgarmaydi.
    3. Stack'ni yangilaydi: backup-init (zaxira) -> migrate (migratsiyalar) -> app -> nginx.
    4. Sayt javob berishini tekshiradi va holatni ko'rsatadi.
#>
param(
  [switch]$NoBuild,
  [string]$Url = 'https://127.0.0.1/sign-in'
)

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)

$compose = @('compose', '-f', 'docker-compose.prod.yml', '--env-file', '.env.production.local')
$dockerDesktop = Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\Docker Desktop.exe'
if (-not (Test-Path $dockerDesktop)) { $dockerDesktop = 'C:\Program Files\Docker\Docker\Docker Desktop.exe' }

function Step($text) { Write-Host "`n==> $text" -ForegroundColor Cyan }

# Bir vaqtda faqat bitta deploy: ikkinchi nusxa birinchisi tugashini kutadi
# (ikki deploy bir konteynerni birga yangilasa "container name is already in use" xatosi chiqadi)
$mutex = New-Object System.Threading.Mutex($false, 'Global\MezonDeploy')
if (-not $mutex.WaitOne(0)) {
  Write-Host 'Boshqa deploy ishlayapti - u tugashini kutyapman...' -ForegroundColor Yellow
  if (-not $mutex.WaitOne([TimeSpan]::FromMinutes(20))) {
    throw "Oldingi deploy 20 daqiqada tugamadi. Boshqa terminallarni tekshiring."
  }
}

# Yarim yo'lda to'xtagan yangilashdan qolgan vaqtinchalik konteynerlar (masalan: aa2ea8b39570_mysayt-app-prod)
function Remove-StaleContainers {
  $names = & docker ps -a --format '{{.Names}}' | Where-Object { $_ -match '^[0-9a-f]{12}_mysayt-' }
  foreach ($n in $names) {
    Write-Host "Qolib ketgan vaqtinchalik konteyner olib tashlanmoqda: $n" -ForegroundColor Yellow
    & docker rm -f $n | Out-Null
  }
}

try {

function Test-DockerReady {
  $job = Start-Job { docker info --format '{{.ServerVersion}}' 2>$null }
  if (Wait-Job $job -Timeout 8) { $out = Receive-Job $job } else { $out = $null }
  Remove-Job $job -Force
  return [bool]$out
}

# 1) Docker
Step 'Docker tekshirilmoqda'
if (-not (Test-DockerReady)) {
  $running = Get-Process -Name 'Docker Desktop' -ErrorAction SilentlyContinue
  if (-not $running) {
    # Noto'g'ri o'chishdan keyin qoladigan socket Docker'ni ishga tushirmay qo'yadi
    $secrets = Join-Path $env:LOCALAPPDATA 'docker-secrets-engine'
    if (Test-Path $secrets) {
      Rename-Item $secrets ("docker-secrets-engine.old-" + (Get-Date -Format 'yyyyMMddHHmmss'))
      Write-Host "Eskirgan socket papkasi chetga surildi."
    }
    Write-Host 'Docker Desktop ishga tushirilmoqda...'
    Start-Process $dockerDesktop
  }
  $deadline = (Get-Date).AddMinutes(4)
  while (-not (Test-DockerReady)) {
    if ((Get-Date) -gt $deadline) {
      throw "Docker 4 daqiqada tayyor bo'lmadi. Docker Desktop oynasini tekshiring ('Reset to factory defaults' ni BOSMANG)."
    }
    Start-Sleep -Seconds 5
  }
}
Write-Host 'Docker tayyor.' -ForegroundColor Green

# 2) Yig'ish (eski versiya ishlab turadi)
if (-not $NoBuild) {
  Step "Image'lar yig'ilmoqda (bir necha daqiqa)"
  & docker @compose build
  if ($LASTEXITCODE -ne 0) { throw "Yig'ish xato berdi - ishlab turgan versiya o'zgarmadi." }
}

# 3) Yangilash: zaxira -> migratsiya -> ilova
Step 'Stack yangilanmoqda (avval zaxira, keyin migratsiya)'
Remove-StaleContainers
& docker @compose up -d --remove-orphans
if ($LASTEXITCODE -ne 0) {
  # Bir marta qayta urinish: qolib ketgan konteynerni tozalab
  Write-Host 'Birinchi urinish muvaffaqiyatsiz - tozalab qayta urinilmoqda...' -ForegroundColor Yellow
  Start-Sleep -Seconds 3
  Remove-StaleContainers
  & docker @compose up -d --remove-orphans
}
if ($LASTEXITCODE -ne 0) {
  & docker @compose ps
  throw "Stack ko'tarilmadi. Loglar: docker compose -f docker-compose.prod.yml logs migrate app"
}

# Yangi ilova konteyneri boshqa IP olishi mumkin - nginx eski manzilni eslab qoladi (502).
# Qayta yuklash (reload) ulanishlarni uzmaydi va manzillarni yangidan aniqlaydi.
Step "nginx qayta yuklanmoqda (yangi ilova manzili)"
& docker @compose exec -T nginx nginx -s reload
if ($LASTEXITCODE -ne 0) {
  Write-Host 'nginx reload bo''lmadi - qayta ishga tushirilmoqda...' -ForegroundColor Yellow
  & docker @compose restart nginx
}

# 4) Tekshiruv
Step 'Sayt tekshirilmoqda'
$ok = $false
for ($i = 0; $i -lt 24 -and -not $ok; $i++) {
  $code = & curl.exe -sk -o NUL -w '%{http_code}' --max-time 10 $Url
  if ($code -eq '200') { $ok = $true } else { Start-Sleep -Seconds 5 }
}
& docker @compose ps --format 'table {{.Name}}\t{{.Status}}'
if ($ok) {
  Write-Host "`nTayyor: $Url javob bermoqda." -ForegroundColor Green
} else {
  throw "Sayt javob bermadi ($Url). Loglar: docker compose -f docker-compose.prod.yml logs --tail 50 app nginx"
}

} finally {
  $mutex.ReleaseMutex()
  $mutex.Dispose()
}
