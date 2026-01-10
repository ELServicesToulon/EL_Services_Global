# Auto-Sync Script - Pulls latest code from GitHub
# Runs as a scheduled task to keep the Dell synchronized with the VPS

$RepoPath = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

Write-Host "🔄 Syncing EL_Services_Global from GitHub..."

Set-Location $RepoPath

try {
    git fetch origin
    git reset --hard origin/main
    Write-Host "✅ Sync Complete!"
} catch {
    Write-Host "❌ Sync Failed: $_"
}

# Keep window open briefly to show result
Start-Sleep -Seconds 3
