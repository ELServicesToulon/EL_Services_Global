const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, 'service_check_log.txt');

function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, logMessage);
    console.log(message);
}

function checkService(serviceName) {
    try {
        execSync(`systemctl is-active --quiet ${serviceName}`);
        log(`✅ Service [${serviceName}] is active.`);
        return true;
    } catch (e) {
        log(`❌ Service [${serviceName}] is NOT active.`);
        return false;
    }
}

function main() {
    log("=== STARTING SERVICE AGENT (Health Check) ===");
    
    const services = ['nginx', 'docker', 'ssh'];
    let allGood = true;

    for (const s of services) {
        if (!checkService(s)) allGood = false;
    }

    log(`Service check complete. Overall Status: ${allGood ? 'OK' : 'ISSUES FOUND'}`);
    return allGood;
}

if (require.main === module) {
    main();
}

module.exports = { main };
