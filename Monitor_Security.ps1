
# Security Monitor Agent for Antigravity/Sentinel
# Checks Windows Firewall and ESET status and sends report to GAS Web App.

$WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyWUC3njn-hIU1pdgElOQX9FlXUclS3YC-Nat4Ujlw/exec"
$MACHINE_NAME = $env:COMPUTERNAME

function Get-FirewallStatus {
    $profiles = Get-NetFirewallProfile
    $active = $profiles | Where-Object { $_.Enabled -eq $True }
    if ($active) { return $true }
    return $false
}

function Get-EsetServiceStatus {
    $service = Get-Service -Name "ekrn" -ErrorAction SilentlyContinue
    if ($service -and $service.Status -eq 'Running') { return $true }
    return $false
}

$firewallStatus = Get-FirewallStatus
$esetStatus = Get-EsetServiceStatus

Write-Host "Machine: $MACHINE_NAME"
Write-Host "Firewall Enabled: $firewallStatus"
Write-Host "ESET Service Running: $esetStatus"

$payload = @{
    action      = "securityReport"
    machineName = $MACHINE_NAME
    firewall    = $firewallStatus
    esetService = $esetStatus
    details     = @{
        os   = (Get-CimInstance Win32_OperatingSystem).Caption
        user = $env:USERNAME
    }
}

$jsonPayload = $payload | ConvertTo-Json



try {
    $response = Invoke-RestMethod -Uri $WEB_APP_URL -Method Post -Body $jsonPayload -ContentType "application/json"
    Write-Host "Report sent successfully: $($response.status)"
}
catch {
    Write-Error "Failed to send report: $_"
}
