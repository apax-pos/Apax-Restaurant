# Creates Frontend/illustrations-upload.zip for IIS deploy (legacy .webp + SVG fallbacks + web.config)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$src = Join-Path $root "dist\assets\illustrations"
if (-not (Test-Path $src)) {
  Push-Location $root
  npm run build
  Pop-Location
}
$staging = Join-Path $root "illustrations-staging"
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Path (Join-Path $staging "assets\illustrations") -Force | Out-Null
Copy-Item "$src\*" (Join-Path $staging "assets\illustrations") -Force
Copy-Item (Join-Path $root "dist\web.config") (Join-Path $staging "web.config") -Force
$zip = Join-Path $root "illustrations-upload.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path "$staging\*" -DestinationPath $zip -Force
Remove-Item $staging -Recurse -Force
Write-Host "Created: $zip"
Write-Host "Upload zip contents to your IIS site root (same folder as index.html)."
