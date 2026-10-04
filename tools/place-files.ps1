<#
.SYNOPSIS
  Range les fichiers de la boîte "inbox" dans les bons dossiers du site selon rules.json,
  puis (optionnel) fait git commit + push.

.EXAMPLE
  .\place-files.ps1              # simulation : affiche ce qui serait fait
  .\place-files.ps1 -Apply       # déplace réellement les fichiers
  .\place-files.ps1 -Apply -Push # déplace, puis commit + push sur GitHub
#>
param(
  [switch]$Apply,
  [switch]$Push,
  [string]$Message = "",
  [string]$Inbox = ""
)

$ErrorActionPreference = "Stop"
$siteRoot = Split-Path -Parent $PSScriptRoot
if (-not $Inbox) { $Inbox = Join-Path (Split-Path -Parent $siteRoot) "ToolBOX-inbox" }
$rulesFile = Join-Path $PSScriptRoot "rules.json"
$rules = (Get-Content $rulesFile -Raw -Encoding UTF8 | ConvertFrom-Json).rules

if (-not (Test-Path $Inbox)) {
  New-Item -ItemType Directory -Path $Inbox | Out-Null
  Write-Host "Dossier inbox créé : $Inbox" -ForegroundColor Yellow
  Write-Host "Dépose-y tes nouveaux fichiers puis relance le script."
  return
}

$files = Get-ChildItem -Path $Inbox -File -Recurse
if (-not $files) { Write-Host "Inbox vide : $Inbox"; return }

$backupDir = Join-Path (Split-Path -Parent $siteRoot) ("ToolBOX-backup\" + (Get-Date -Format "yyyyMMdd-HHmmss"))
$placed = @(); $unknown = @()

foreach ($f in $files) {
  $rule = $rules | Where-Object { $f.Name -like $_.match } | Select-Object -First 1
  if (-not $rule) { $unknown += $f.Name; continue }

  $destDir = if ($rule.dest -eq ".") { $siteRoot } else { Join-Path $siteRoot $rule.dest }
  $destFile = Join-Path $destDir $f.Name
  $exists = Test-Path $destFile
  $label = if ($exists) { "REMPLACE" } else { "NOUVEAU " }
  Write-Host ("{0} {1} -> {2}" -f $label, $f.Name, $rule.dest)

  if ($Apply) {
    if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir | Out-Null }
    if ($exists) {
      New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
      Copy-Item $destFile (Join-Path $backupDir ($rule.dest.Replace("\", "_").Replace(".", "root") + "__" + $f.Name))
    }
    Move-Item $f.FullName $destFile -Force
  }
  $placed += $f.Name
}

if ($unknown) {
  Write-Host "`nSans règle (laissés dans l'inbox, ajoute une règle dans rules.json) :" -ForegroundColor Yellow
  $unknown | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
}

if (-not $Apply) {
  Write-Host "`nSIMULATION - rien n'a été déplacé. Relance avec -Apply pour exécuter." -ForegroundColor Cyan
  return
}
Write-Host "`n$($placed.Count) fichier(s) placé(s)." -ForegroundColor Green
if (Test-Path $backupDir) { Write-Host "Anciennes versions sauvegardées dans : $backupDir" }

if ($Push) {
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw "Git n'est pas installé. Installe-le depuis https://git-scm.com puis relance." }
  Push-Location $siteRoot
  try {
    if (-not (Test-Path ".git")) { throw "Ce dossier n'est pas encore un dépôt git (voir README-bot.md, étape 2)." }
    git add -A
    git diff --cached --quiet
    if ($LASTEXITCODE -eq 0) { Write-Host "Aucun changement à commit."; return }
    if (-not $Message) { $Message = "Ajout/mise a jour : " + ($placed -join ", ") }
    git commit -m $Message
    git push
    Write-Host "Push terminé." -ForegroundColor Green
  } finally { Pop-Location }
}
