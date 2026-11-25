# Mezon agentini o'chirish. Administrator sifatida:
#   powershell -ExecutionPolicy Bypass -File uninstall.ps1            (qurilma kaliti saqlanadi)
#   powershell -ExecutionPolicy Bypass -File uninstall.ps1 -RemoveKey (qurilma kaliti ham o'chadi -
#        keyin kompyuterni serverda qayta ro'yxatdan o'tkazish kerak bo'ladi)
param(
  [switch]$RemoveKey,
  [string]$InstallDir = (Join-Path $env:ProgramFiles 'MezonAgent'),
  [string]$KeyName = 'MezonAgentDeviceKey'
)
$ErrorActionPreference = 'Stop'
$serviceName = 'MezonAgent'

$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw 'Administrator sifatida ishga tushiring.'
}

$svc = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if ($svc) {
  if ($svc.Status -ne 'Stopped') { Stop-Service $serviceName -Force; Start-Sleep -Seconds 2 }
  & sc.exe delete $serviceName | Out-Null
}
if (Test-Path $InstallDir) { Remove-Item -Recurse -Force $InstallDir }

if ($RemoveKey) {
  Add-Type -AssemblyName System.Core
  foreach ($p in @('Microsoft Platform Crypto Provider', 'Microsoft Software Key Storage Provider')) {
    $provider = New-Object System.Security.Cryptography.CngProvider($p)
    $opt = [System.Security.Cryptography.CngKeyOpenOptions]::MachineKey
    try {
      if ([System.Security.Cryptography.CngKey]::Exists($KeyName, $provider, $opt)) {
        [System.Security.Cryptography.CngKey]::Open($KeyName, $provider, $opt).Delete()
        Write-Host "Qurilma kaliti o'chirildi ($p)"
      }
    } catch {
      Write-Warning "$p : $($_.Exception.Message)"
    }
  }
}
Write-Host 'Mezon agenti o''chirildi.'
