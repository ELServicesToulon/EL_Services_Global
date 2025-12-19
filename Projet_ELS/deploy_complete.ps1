# Deploy Complete Workflow
# 1. Vérifie la qualité (Lint/Test) - Optionnel, commenté pour l'instant
# 2. Déploie sur Google Apps Script (via deploy_prod.ps1)
# 3. Synchronise avec GitHub

$ErrorActionPreference = "Stop"

Write-Host "=== STARTING COMPLETE DEPLOYMENT FLOW ===" -ForegroundColor Cyan

# Étape 1: (Optionnel) Linting
# Write-Host "1. Checking Code Quality..."
# npm run lint
# if ($LASTEXITCODE -ne 0) { Write-Error "Linting failed. Fix errors before deploying."; exit 1 }

# Étape 2: Déploiement Apps Script
Write-Host "2. Deploying to Apps Script (Prod)..." -ForegroundColor Yellow
./deploy_prod.ps1

# Étape 3: GitHub Sync
Write-Host "3. Syncing with GitHub..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
git add .
git commit -m "Auto-deploy: $timestamp"

# Check if we have remote configured (Optional check, allows first run)
$remotes = git remote -v
if ($remotes) {
    Write-Host "Pushing to GitHub..."
    git push
} else {
    Write-Host "WARNING: No remote repository configured. Changes committed locally only." -ForegroundColor Red
}

Write-Host "=== DEPLOYMENT COMPLETE ===" -ForegroundColor Green
