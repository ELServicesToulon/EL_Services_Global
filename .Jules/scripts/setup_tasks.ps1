# Setup Local Agents Scheduling
# This script reads .Jules/schedule.yml and creates Windows Scheduled Tasks.
# It assumes 'node' is in the PATH and 'npm install' has been run.

$RepoPath = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$RunnerScript = "$RepoPath\.Jules\scripts\agent_runner.js"
$NodeExe = "node.exe" 

# Read Schedule
$scheduleContent = Get-Content "$RepoPath\.Jules\schedule.yml" -Raw
# Simple parsing (regex) since we don't want to rely on a YAML parser lib in PS
$regex = "(?ms)- Agent:\s*(\w+)\s*Schedule:\s*(\d{2}:\d{2})"
$agentMatches = [regex]::Matches($scheduleContent, $regex)

Write-Host "Found $($agentMatches.Count) agent schedules."

foreach ($match in $agentMatches) {
    $AgentName = $match.Groups[1].Value
    $Time = $match.Groups[2].Value
    $TaskName = "Jules_Agent_$AgentName"
    
    # We use 'cmd /c' to ensure env vars form .env work if we load them, but here we run node directly.
    # Node script loads .env itself.
    
    $Action = New-ScheduledTaskAction -Execute $NodeExe -Argument "$RunnerScript $AgentName" -WorkingDirectory $RepoPath
    $Trigger = New-ScheduledTaskTrigger -Daily -At $Time
    
    # Create Task
    Write-Host "Scheduling $AgentName at $Time..."
    Register-ScheduledTask -Action $Action -Trigger $Trigger -TaskName $TaskName -Description "Run Jules Agent $AgentName locally" -Force
}

# Ensure Adjoint is scheduled
$AdjointTaskName = "Jules_Agent_Adjoint"
if (-not ($agentMatches.Groups[1].Value -contains "Adjoint")) {
    Write-Host "Auto-scheduling 'Adjoint' (Daily check-in at 09:00)..."
    $Action = New-ScheduledTaskAction -Execute $NodeExe -Argument "$RunnerScript Adjoint" -WorkingDirectory $RepoPath
    $Trigger = New-ScheduledTaskTrigger -Daily -At "09:00"
    Register-ScheduledTask -Action $Action -Trigger $Trigger -TaskName $AdjointTaskName -Description "Run Jules Assistant (Adjoint)" -Force
}

# Schedule Disposable Agents (The "Swarm" for Dell)
Write-Host "Configuring Disposable Agents Swarm..."
for ($i = 1; $i -le 3; $i++) {
    $TaskName = "Jules_Disposable_Worker_$i"
    $Argument = "Agents_Backend/Agents_Modules/Disposable_Agent.js $i"
    
    # Stagger them slightly: Worker 1 at :15, Worker 2 at :30, Worker 3 at :45 past every hour
    $Minute = $i * 15
    
    $Action = New-ScheduledTaskAction -Execute $NodeExe -Argument $Argument -WorkingDirectory $RepoPath
    
    # Note: New-ScheduledTaskTrigger -At is usually for a specific time. 
    # For repetitive hourly tasks, complex logic is needed in PS or simpler just set multiple daily triggers.
    # Here we simplify: Run Daily at specific times for testing, user can adjust frequency.
    $Time = "10:$Minute" 
    
    $Trigger = New-ScheduledTaskTrigger -Daily -At $Time
    
    Write-Host "Scheduling $TaskName at $Time..."
    Register-ScheduledTask -Action $Action -Trigger $Trigger -TaskName $TaskName -Description "Disposable Worker Agent $i" -Force
}

# Schedule Auto-Sync (Every 30 minutes)
Write-Host "Configuring Auto-Sync from GitHub..."
$SyncTaskName = "Jules_AutoSync"
$SyncScript = "$RepoPath\.Jules\scripts\auto_sync.ps1"
$SyncAction = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File `"$SyncScript`"" -WorkingDirectory $RepoPath
$SyncTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 30)
Register-ScheduledTask -Action $SyncAction -Trigger $SyncTrigger -TaskName $SyncTaskName -Description "Auto-sync code from GitHub" -Force
Write-Host "✅ Auto-Sync scheduled every 30 minutes."

# Schedule Heartbeat (Every hour)
Write-Host "Configuring Dell Heartbeat..."
$HeartbeatTaskName = "Jules_Heartbeat"
$HeartbeatScript = "$RepoPath\.Jules\scripts\heartbeat.ps1"
$HeartbeatAction = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File `"$HeartbeatScript`"" -WorkingDirectory $RepoPath
$HeartbeatTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 1)
Register-ScheduledTask -Action $HeartbeatAction -Trigger $HeartbeatTrigger -TaskName $HeartbeatTaskName -Description "Send Dell status to VPS" -Force
Write-Host "✅ Heartbeat scheduled every hour."

Write-Host "All agents (including Disposable Swarm) scheduled successfully!"
