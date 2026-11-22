<#
  Mezon: o'zgarishlarni BITTA buyruq bilan saytga chiqarish.
    1) o'zgargan fayllarni commit qiladi (.claude papkasi bundan mustasno)
    2) deploy qiladi (zaxira -> yig'ish -> migratsiya -> nginx -> tekshiruv)
    3) GitHub'ga push qiladi

  Ishlatish (loyiha papkasida):
    npm run ship -- "nima o'zgardi"
  yoki:
    powershell -ExecutionPolicy Bypass -File scripts\ship.ps1 "nima o'zgardi"

  Xabar yozilmasa: "Kichik o'zgarish (sana)" bo'ladi.
  Deploy xato bersa, push qilinmaydi va eski versiya ishlashda davom etadi.
#>
param(
  [Parameter(Position = 0)]
  [string]$Message = '',
  [switch]$NoPush
)

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)

function Step($text) { Write-Host "`n==> $text" -ForegroundColor Cyan }

# 1) Commit
Step "O'zgarishlar saqlanmoqda (commit)"
& git add -A -- . ':!.claude'
$staged = & git diff --cached --name-only
if ($staged) {
  if (-not $Message.Trim()) { $Message = "Kichik o'zgarish ($(Get-Date -Format 'yyyy-MM-dd HH:mm'))" }
  Write-Host ($staged -join "`n")
  & git commit -q -m $Message
  if ($LASTEXITCODE -ne 0) { throw "Commit bo'lmadi." }
  Write-Host "Commit: $(& git log --oneline -1)" -ForegroundColor Green
} else {
  Write-Host "Yangi o'zgarish yo'q - faqat deploy qilinadi." -ForegroundColor Yellow
}

# 2) Deploy (xato bo'lsa skript shu yerda to'xtaydi)
& powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'deploy.ps1')
if ($LASTEXITCODE -ne 0) { throw "Deploy xato berdi - push qilinmadi. Yuqoridagi xabarni ko'ring." }

# 3) Push
if (-not $NoPush) {
  Step "GitHub'ga yuborilmoqda (push)"
  & git push
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Push bo'lmadi (internet?). Sayt yangilangan; keyinroq 'git push' qiling." -ForegroundColor Yellow
  }
}

Write-Host "`nHammasi tayyor. Brauzerda Ctrl + F5 bosing." -ForegroundColor Green
