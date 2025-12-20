$ErrorActionPreference = "Stop"

$dirs = @("Projet_ELS", "App_Livreur")

foreach ($dir in $dirs) {
    Write-Host "Pushing project in $dir..."
    Push-Location $dir
    try {
        npx clasp push
    }
    catch {
        Write-Error "Failed to push $dir. Ensure you are logged in (npx clasp login) and the project is valid."
        exit 1
    }
    finally {
        Pop-Location
    }
    Write-Host "Successfully pushed $dir"
}

Write-Host "All projects pushed successfully."
