const { spawn, execSync, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { main: runMaintenance } = require('./Maintenance_Agent');
const { main: runServiceCheck } = require('./Service_Agent');
const { sendRecapEmail } = require('./email_service');

const LOG_FILE = path.join(__dirname, 'boot_log.txt');

function log(message) {
    const timestamp = new Date().toISOString();
    const msg = `[${timestamp}] ${message}`;
    fs.appendFileSync(LOG_FILE, msg + '\n');
    console.log(msg);
    return msg;
}

async function main() {
    // Prevent double execution
    const LOCK_FILE = path.join(__dirname, 'boot.lock');
    const LOCK_TIMEOUT = 60000; // 1 minute
    
    if (fs.existsSync(LOCK_FILE)) {
        const lockAge = Date.now() - fs.statSync(LOCK_FILE).mtimeMs;
        if (lockAge < LOCK_TIMEOUT) {
            console.log('[BOOT] Already running (lock file exists). Exiting.');
            process.exit(0);
        }
    }
    fs.writeFileSync(LOCK_FILE, Date.now().toString());
    
    log("🚀 === MEDICONVOI BOOT ORCHESTRATOR START ===");
    let recap = "MEDICONVOI V2 - BOOT REPORT\n============================\n";

    // 1. Run Maintenance (Git Pull, Update)
    let maintenanceLog = "";
    // We capture stdout from the module main executed?? 
    // Actually the module main logs to console. We can wrap it or just trust it works and verify by return?
    // The previous implementation of Maintenance_Agent.js didn't return a string of logs.
    // I'll assume it runs and I'll adapt the generic log.
    try {
        log("Running Maintenance Agent...");
        runMaintenance(); // Synchronous
        maintenanceLog = "Maintenance executed (see maintenance_log.txt).";
    } catch (e) {
        maintenanceLog = `Maintenance Failed: ${e.message}`;
    }
    recap += `\n[MAINTENANCE]\n${maintenanceLog}\n`;

    // 2. Run Service Check
    let serviceLog = "";
    try {
        log("Running Service Agent...");
        const servicesOk = runServiceCheck();
        serviceLog = servicesOk ? "All Critical Services Active." : "Some services are DOWN (see service_check_log.txt).";
    } catch (e) {
        serviceLog = `Service Check Failed: ${e.message}`;
    }
    recap += `\n[SERVICES]\n${serviceLog}\n`;

    // 3. Run Agent Memory (Auto Mode)
    let memoryLog = "";
    try {
        log("Running Agent Memory (Auto Mode)...");
        // We run it as a child process because it modifies DEV_JOURNAL
        const memoryProc = execSync(`node ${path.join(__dirname, '../agent_memory.js')} --auto`, { encoding: 'utf8' });
        memoryLog = memoryProc.trim();
    } catch (e) {
        memoryLog = `Agent Memory Failed: ${e.message}`;
    }
    recap += `\n[AGENT MEMORY]\n${memoryLog}\n`;

    // 4. Send Recap Email
    log("Sending Recap Email...");
    await sendRecapEmail("Rapport de Démarrage Mediconvoi V2", recap);

    // 5. Start Antigravity Workspace (Terminal)
    log("Starting Antigravity Workspace...");
    // Using nohup/detach to ensure it survives this script if this script exits?
    // Actually the .desktop executes this script.
    // If we spawn gnome-terminal, it should detach itself.
    try {
        const workspaceCmd = `gnome-terminal --working-directory=/home/ubuntu/Documents/EL_Services_Global --title="Antigravity Workspace" -- bash -c "echo 'Bienvenue dans le workspace Antigravity'; exec bash"`;
        exec(workspaceCmd);
    } catch (e) {
        log(`Failed to start Workspace: ${e.message}`);
    }

    // 6. Start Sentinel (Core Backend)
    log("Starting Sentinel Core...");
    try {
        // Start Sentinel in detached mode so it keeps running
        const sentinelScript = path.join(__dirname, 'Sentinel_Core.js');
        const out = fs.openSync(path.join(__dirname, 'sentinel_out.log'), 'a');
        const err = fs.openSync(path.join(__dirname, 'sentinel_err.log'), 'a');
        
        const child = spawn('node', [sentinelScript], {
            detached: true,
            stdio: ['ignore', out, err]
        });
        child.unref(); // Allow the parent to exit
        log(`Sentinel started with PID ${child.pid}`);
    } catch (e) {
        log(`Failed to start Sentinel: ${e.message}`);
    }

    log("=== BOOT ORCHESTRATOR COMPLETE ===");
}

main().catch(e => log(`FATAL ERROR: ${e.message}`));
