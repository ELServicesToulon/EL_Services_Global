# Dell Heartbeat - Reports status to VPS Dashboard
# Runs every hour and sends system information

$RepoPath = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$VpsUrl = "https://api.mediconvoi.fr/api/heartbeat"  # Adjust to your actual VPS dashboard URL

# Gather System Info
$Hostname = $env:COMPUTERNAME
$Username = $env:USERNAME
$Uptime = (Get-CimInstance Win32_OperatingSystem).LastBootUpTime
$DiskFree = [math]::Round((Get-PSDrive C).Free / 1GB, 2)
$Memory = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 2)

# Check if agents ran recently
$LastSync = (Get-Item "$RepoPath\.git\FETCH_HEAD" -ErrorAction SilentlyContinue).LastWriteTime

# Check for ESET blocking events
$EsetBlocked = @()
try {
    $esetLogs = Get-WinEvent -LogName "Application" -MaxEvents 50 -ErrorAction SilentlyContinue | 
        Where-Object { $_.ProviderName -like "*ESET*" -and $_.Message -like "*block*" }
    if ($esetLogs) {
        $EsetBlocked = $esetLogs | Select-Object -First 3 | ForEach-Object { $_.Message.Substring(0, [Math]::Min(100, $_.Message.Length)) }
    }
} catch {
    # No ESET logs or access denied - that's OK
}

# Check if node.exe is accessible
$NodeOK = $null -ne (Get-Command node.exe -ErrorAction SilentlyContinue)

$Payload = @{
    hostname = $Hostname
    user = $Username
    uptime = $Uptime
    disk_free_gb = $DiskFree
    memory_gb = $Memory
    last_sync = $LastSync
    node_accessible = $NodeOK
    eset_blocked = $EsetBlocked
    timestamp = (Get-Date -Format "o")
} | ConvertTo-Json

Write-Host "📡 Sending heartbeat to VPS..."

try {
    Invoke-RestMethod -Uri $VpsUrl -Method Post -Body $Payload -ContentType "application/json"
    Write-Host "✅ Heartbeat sent successfully!"
} catch {
    Write-Host "⚠️ Could not reach VPS. Saving locally..."
    # Fallback: Save to file for git sync
    $Payload | Out-File "$RepoPath\.Jules\reports\dell_heartbeat.json" -Force
}
