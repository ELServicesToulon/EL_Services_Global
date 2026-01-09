# Setup Local Agents Scheduling
# This script reads .Jules/schedule.yml and creates Windows Scheduled Tasks.
# It assumes 'node' is in the PATH and 'npm install' has been run.

$RepoPath = "c:\Users\ELServices\EL_Services_Global"
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


Write-Host "All agents scheduled successfully!"
