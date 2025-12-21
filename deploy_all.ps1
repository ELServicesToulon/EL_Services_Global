# deploy_all.ps1
# Script de déploiement global pour tous les projets Apps Script.
# Remplace push_all.ps1 et combine la logique de deploy_prod/deploy_complete.

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# Configuration des projets et de leurs ID de déploiement de production
$projects = @{
    "Projet_ELS"  = "AKfycbwxyNfzBZKsV6CpWsN39AuB0Ja40mpdEmkAGf0Ml_1tOIMfJDE-nsu7ySXTcyaJuURb"
    "App_Livreur" = "AKfycbyC1PWyq5xnYa3HaLtuRtahsnjpkiTryQxqy5jgYHrR6pDwLgAlkM3ecxjSAAgEOYWKGg"
}

Write-Host "=== STARTING GLOBAL DEPLOYMENT ===" -ForegroundColor Cyan

# 1. Traitement de chaque projet
foreach ($projName in $projects.Keys) {
    if (Test-Path $projName) {
        Write-Host "`n--- Processing Project: $projName ---" -ForegroundColor Yellow
        Push-Location $projName

        try {
            # 0. VERSION STAMP
            $ts = Get-Date -Format "yyyy-MM-dd HH:mm"
            Set-Content -Path "BuildInfo.js" -Value "var BUILD_TIMESTAMP = 'Build $ts';"
            Write-Host "Generated BuildInfo.js ($ts)"

            # A. PUSH
            Write-Host "1. Clasp Push..."
            npx clasp push --force
            if ($LASTEXITCODE -ne 0) { throw "Clasp Push failed for $projName" }

            # B. VERSION
            Write-Host "2. Creating New Version..."
            $versionOutput = npx clasp version "Mise à jour automatique"
            if ($LASTEXITCODE -ne 0) { throw "Clasp Version failed for $projName" }
            Write-Host "Output: $versionOutput"

            # Extraction du numéro de version
            if ($versionOutput -match "(\d+)") {
                $newVersion = $matches[1]
                Write-Host "-> New Version: $newVersion"
                
                # C. DEPLOY (UPDATE PRODUCTION)
                $deployId = $projects[$projName]
                Write-Host "3. Updating Production Deployment ($deployId)..."
                npx clasp deploy -i $deployId -V $newVersion --description "Production Update"
                if ($LASTEXITCODE -ne 0) { throw "Clasp Deploy failed for $projName" }
                
                Write-Host "SUCCESS: $projName deployed to version $newVersion." -ForegroundColor Green
            }
            else {
                Write-Warning "Could not parse version number for $projName. Skipping deployment update."
            }

        }
        catch {
            Write-Error "Error processing $projName : $_"
            # On continue ou on arrête? "Stop" preference will stop script. 
            # Le user veut probablement que ça s'arrête si ça casse.
            exit 1
        }
        finally {
            Pop-Location
        }
    }
    else {
        Write-Warning "Project folder $projName not found!"
    }
}

# 2. Git Sync (Global)
Write-Host "`n=== STARTING GIT SYNC ===" -ForegroundColor Cyan
try {
    Write-Host "1. Git Add..."
    git add .
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
    Write-Host "2. Git Commit..."
    git commit -m "Global Deploy: $timestamp"
    
    # Check remote
    $remotes = git remote -v
    if ($remotes) {
        Write-Host "3. Git Push..."
        git push
        if ($LASTEXITCODE -ne 0) { throw "Git Push failed" }
        Write-Host "Git Push Successful." -ForegroundColor Green
    }
    else {
        Write-Warning "No remote repository configured. Changes committed locally only."
    }
}
catch {
    Write-Error "Git Sync failed: $_"
    exit 1
}

Write-Host "`n=== GLOBAL DEPLOYMENT COMPLETE ===" -ForegroundColor Green
