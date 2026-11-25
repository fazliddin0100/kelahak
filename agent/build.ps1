# Mezon agentini yig'ish (dasturchi kompyuterida, .NET 8 SDK kerak).
# Natija: agent\dist\  (MezonAgent.exe, appsettings.json, install.ps1, uninstall.ps1)
#   powershell -ExecutionPolicy Bypass -File agent\build.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$project = Join-Path $root 'MezonAgent\MezonAgent.csproj'
$dist = Join-Path $root 'dist'

if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
  throw '.NET 8 SDK topilmadi. https://dotnet.microsoft.com/download/dotnet/8.0 dan o''rnating.'
}

if (Test-Path $dist) { Remove-Item -Recurse -Force $dist }
& dotnet publish $project -c Release -o $dist
if ($LASTEXITCODE -ne 0) { throw "dotnet publish xato bilan tugadi ($LASTEXITCODE)" }

Copy-Item (Join-Path $root 'install.ps1') $dist
Copy-Item (Join-Path $root 'uninstall.ps1') $dist
Get-ChildItem $dist -Filter '*.pdb' | Remove-Item -Force

Write-Host ''
Write-Host "Tayyor: $dist"
Get-ChildItem $dist | Select-Object Name, Length | Format-Table -AutoSize
