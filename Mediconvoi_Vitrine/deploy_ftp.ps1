
# Script de déploiement FTP pour Mediconvoi Vitrine
# Compatible Windows (PowerShell) et Linux (PowerShell Core)

$ftpHost = "ftp://truchat.o2switch.net" # Host corrigé
$ftpUser = "yuda1395"
$ftpHostClean = "truchat.o2switch.net"

# NOTE: Le mot de passe ne devrait idéalement pas être hardcodé, mais pour compatibilité avec l'existant :
$ftpPass = "ha45-3GNJ-4JN!" 

$remotePath = "/public_html" # Racine du site principal
$localPath = $PSScriptRoot # Le dossier courant où se trouve le script

Write-Host "=== DÉPLOIEMENT MEDICONVOI VITRINE ===" -ForegroundColor Cyan
Write-Host "Source: $localPath"
Write-Host "Destination: $ftpHostClean$remotePath"

# Vérification de curl
if (-not (Get-Command "curl" -ErrorAction SilentlyContinue)) {
    Write-Error "Curl n'est pas installé ou trouvé dans le PATH."
    exit 1
}

# Fonction d'upload simple
function Upload-File ($filePath, $remoteFilePath) {
    Write-Host "Uploading $(Split-Path $filePath -Leaf)..." -NoNewline
    
    # Construction de la commande curl
    # Note: --ftp-create-dirs assure que les sous-dossiers existent
    # --ssl-reqd force le SSL pour la sécurité
    # -T est le fichier source
    
    $output = curl -T "$filePath" --user "$($ftpUser):$($ftpPass)" "ftp://$($ftpHostClean)$($remoteFilePath)" --ftp-create-dirs --ssl-reqd --insecure 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host " [OK]" -ForegroundColor Green
    }
    else {
        Write-Host " [ERREUR]" -ForegroundColor Red
        Write-Host $output
    }
}

# 1. Upload des fichiers racine
$rootFiles = Get-ChildItem -Path $localPath -File | Where-Object { $_.Name -ne "deploy_ftp.ps1" -and $_.Name -notlike ".*" }
foreach ($file in $rootFiles) {
    Upload-File $file.FullName "$remotePath/$($file.Name)"
}

# 2. Upload des images/assets (s'il y en a dans un sous-dossier)
# Actuellement tout est à la racine, mais si on crée un dossier 'assets' :
if (Test-Path "$localPath/assets") {
    $assets = Get-ChildItem -Path "$localPath/assets" -File
    foreach ($file in $assets) {
        Upload-File $file.FullName "$remotePath/assets/$($file.Name)"
    }
}

Write-Host "`nDéploiement terminé. Vérifiez sur https://mediconvoi.fr" -ForegroundColor Cyan
