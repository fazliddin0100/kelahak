# Mezon agentini user kompyuteriga Windows xizmati sifatida o'rnatish.
# Administrator sifatida ishga tushiring (dist papkasi ichida):
#   powershell -ExecutionPolicy Bypass -File install.ps1
#   powershell -ExecutionPolicy Bypass -File install.ps1 -Origin https://192.168.100.12
param(
  [string]$Origin = '',
  [string]$InstallDir = (Join-Path $env:ProgramFiles 'MezonAgent')
)
$ErrorActionPreference = 'Stop'
$serviceName = 'MezonAgent'
$src = Split-Path -Parent $MyInvocation.MyCommand.Path

$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw 'Administrator sifatida ishga tushiring.'
}
if (-not (Test-Path (Join-Path $src 'MezonAgent.exe'))) {
  throw 'MezonAgent.exe topilmadi. Avval agent\build.ps1 bilan yig''ing va dist papkasidan ishga tushiring.'
}

# Eski xizmat bo'lsa to'xtatiladi (qurilma kaliti Windows omborida qoladi - o'zgarmaydi)
$existing = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if ($existing) {
  if ($existing.Status -ne 'Stopped') { Stop-Service $serviceName -Force; Start-Sleep -Seconds 2 }
}

New-Item -ItemType Directory -Force $InstallDir | Out-Null
Copy-Item (Join-Path $src 'MezonAgent.exe') $InstallDir -Force
$cfgDst = Join-Path $InstallDir 'appsettings.json'
if (-not (Test-Path $cfgDst)) { Copy-Item (Join-Path $src 'appsettings.json') $cfgDst }

if ($Origin) {
  $cfg = Get-Content $cfgDst -Raw | ConvertFrom-Json
  $cfg.Agent.AllowedOrigins = @($Origin.TrimEnd('/'))
  $cfg | ConvertTo-Json -Depth 10 | Set-Content $cfgDst -Encoding UTF8
}

# Papkaga faqat Administratorlar va SYSTEM yoza oladi (dasturni almashtirib bo'lmasin)
& icacls $InstallDir /inheritance:r /grant:r '*S-1-5-32-544:(OI)(CI)F' '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-545:(OI)(CI)RX' | Out-Null

$exe = '"' + (Join-Path $InstallDir 'MezonAgent.exe') + '"'
if (-not $existing) {
  & sc.exe create $serviceName binPath= $exe start= auto obj= LocalSystem DisplayName= 'Mezon E-IMZO agenti' | Out-Null
  & sc.exe description $serviceName 'Mezon: kompyuter belgilari (MAC, disk seriyasi) va qurilma kaliti bilan imzo' | Out-Null
  & sc.exe failure $serviceName reset= 86400 actions= restart/5000/restart/5000/restart/30000 | Out-Null
} else {
  & sc.exe config $serviceName binPath= $exe start= auto | Out-Null
}
Start-Service $serviceName
Start-Sleep -Seconds 3

$cfg = Get-Content $cfgDst -Raw | ConvertFrom-Json
$port = $cfg.Agent.Port
$allowed = $cfg.Agent.AllowedOrigins[0]
try {
  $info = Invoke-RestMethod -Uri "http://127.0.0.1:$port/v1/info" -Headers @{ Origin = $allowed } -TimeoutSec 10
  Write-Host ''
  Write-Host 'Mezon agenti o''rnatildi va ishlayapti.'
  Write-Host ("  Kompyuter:      {0}" -f $info.hostname)
  Write-Host ("  MAC:            {0}" -f $info.mac)
  Write-Host ("  Disk seriyasi:  {0}" -f $info.diskSerial)
  Write-Host ("  Qurilma kaliti: {0} (SHA-256 {1})" -f $(if ($info.hardwareKey) { 'TPM' } else { 'dasturiy' }), $info.publicKeySha256)
  Write-Host ("  Ruxsat etilgan sayt: {0}" -f $allowed)
} catch {
  Write-Warning "Xizmat ishga tushdi, lekin javob olinmadi: $($_.Exception.Message)"
  Write-Warning 'Windows jurnali (Event Viewer > Application, manba: MezonAgent) ni tekshiring.'
}
