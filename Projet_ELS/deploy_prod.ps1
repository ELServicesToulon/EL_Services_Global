# Deploy Prod Script
# Ce script automatise le déploiement sur l'URL de production fixe.
# ID de déploiement cible : AKfycbwxyNfzBZKsV6CpWsN39AuB0Ja40mpdEmkAGf0Ml_1tOIMfJDE-nsu7ySXTcyaJuURb

$DeploymentId = "AKfycbwxyNfzBZKsV6CpWsN39AuB0Ja40mpdEmkAGf0Ml_1tOIMfJDE-nsu7ySXTcyaJuURb"
Set-Location $PSScriptRoot

Write-Host "1. Envoi du code vers Google (Clasp Push)..."
clasp push --force

Write-Host "2. Création d'une nouvelle version..."
$versionOutput = clasp version "Mise à jour automatique"
Write-Host "Sortie version: $versionOutput"

# Extraction du numéro de version (Format: "Created version 123.")
if ($versionOutput -match "(\d+)") {
    $newVersion = $matches[1]
    Write-Host "-> Nouvelle version identifiée : $newVersion"
    
    Write-Host "3. Mise à jour du déploiement stable ($DeploymentId)..."
    clasp deploy -i $DeploymentId -V $newVersion --description "Production Update"
    
    Write-Host "SUCCESS: L'URL de production utilise maintenant la version $newVersion."
}
else {
    Write-Host "ERREUR: Impossible de récupérer le numéro de version."
}
