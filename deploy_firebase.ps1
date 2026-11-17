<#
  Court Life frontend -> Firebase Hosting (same Google Cloud project as the backend).

  Usage (from I:\cort_ui_frontend):
      powershell -ExecutionPolicy Bypass -File .\deploy_firebase.ps1 -ProjectId courtlife-prod-515016 -ApiUrl https://courtlife-api-xxxxx.a.run.app
  First time only: run  firebase login  (opens the browser) before this script.
  Your site will be at https://<ProjectId>.web.app
#>
param(
    [Parameter(Mandatory = $true)][string]$ProjectId,
    [Parameter(Mandatory = $true)][string]$ApiUrl
)
$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

# Call the .cmd shims directly: on Windows "npm"/"firebase" resolve to .ps1 wrappers that lose arguments
function Check($what) {
    if ($LASTEXITCODE -ne 0) { throw "$what failed (exit $LASTEXITCODE)" }
}

Write-Host "==> Installing packages" -ForegroundColor Cyan
& npm.cmd install --no-audit --no-fund
Check "npm install"

Write-Host "==> Building with VITE_API_URL=$ApiUrl" -ForegroundColor Cyan
$env:VITE_API_URL = $ApiUrl.TrimEnd("/")
& npm.cmd run build
Check "npm run build"
Remove-Item Env:VITE_API_URL

if (-not (Get-Command firebase.cmd -ErrorAction SilentlyContinue)) {
    Write-Host "==> Installing Firebase CLI" -ForegroundColor Cyan
    & npm.cmd install -g firebase-tools
    Check "installing firebase-tools"
}

Write-Host "==> Linking Firebase to project $ProjectId (an 'already exists' message here is fine)" -ForegroundColor Cyan
$ErrorActionPreference = "Continue"
& firebase.cmd projects:addfirebase $ProjectId
$ErrorActionPreference = "Stop"

Write-Host "==> Deploying to Firebase Hosting" -ForegroundColor Cyan
& firebase.cmd deploy --only hosting --project $ProjectId --non-interactive
Check "firebase deploy"

Write-Host "`nDONE. Open https://$ProjectId.web.app" -ForegroundColor Green
