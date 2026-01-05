
# Script de déploiement FTP pour Mediconvoi
# Utilise curl (présent sur Windows 10/11)

$ftpHost = "trychat.o2switch.net" # Correction du host si besoin, user a dit "truchat.o2switch.net"
$ftpHost = "ftp://truchat.o2switch.net"
$ftpUser = "yuda1395"
$ftpPass = "ha45-3GNJ-4JN!"
$remotePath = "/public_html" # Racine du site principal medcargo.fr

$localDist = "c:\Users\ELS\EL_Services_Global\V2_App\dist"

Write-Host "Début du déploiement FTP vers $remotePath..." -ForegroundColor Cyan

# 1. Upload index.html
Write-Host "Uploading index.html..."
curl.exe -T "$localDist\index.html" --user "$($ftpUser):$($ftpPass)" "$ftpHost$remotePath/index.html" --ftp-create-dirs --ssl-reqd 2>$null
if ($LASTEXITCODE -eq 0) { Write-Host "OK: index.html" -ForegroundColor Green } else { Write-Error "Echec upload index.html" }

# 2. Upload vite.svg
Write-Host "Uploading vite.svg..."
curl.exe -T "$localDist\vite.svg" --user "$($ftpUser):$($ftpPass)" "$ftpHost$remotePath/vite.svg" --ssl-reqd 2>$null

# 3. Create assets folder and Upload assets
$assets = Get-ChildItem "$localDist\assets\*"
foreach ($file in $assets) {
    Write-Host "Uploading asset: $($file.Name)..."
    # Note: curl crée les dossiers automatiquement avec --ftp-create-dirs si besoin, mais on cible le chemin complet
    curl.exe -T "$file.FullName" --user "$($ftpUser):$($ftpPass)" "$ftpHost$remotePath/assets/$($file.Name)" --ftp-create-dirs --ssl-reqd 2>$null
    
    if ($LASTEXITCODE -eq 0) { 
        Write-Host "OK: $($file.Name)" -ForegroundColor Green 
    }
    else { 
        Write-Warning "Echec upload $($file.Name). Retrying without SSL..."
        # Fallback sans SSL explicite si le serveur ou le client curl a du mal avec les certs auto-signés parfois.
        curl.exe -T "$file.FullName" --user "$($ftpUser):$($ftpPass)" "$ftpHost$remotePath/assets/$($file.Name)" --ftp-create-dirs --insecure
    }
}

Write-Host "Déploiement terminé !" -ForegroundColor Green
