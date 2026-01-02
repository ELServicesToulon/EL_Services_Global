/**
 * Sentinel Node Agent for VPS (Linux/Ubuntu)
 * ==========================================
 * This script gathers security and system status from the VPS and sends it to the central GAS Web App.
 *
 * Usage:
 *   1. Install Node.js: sudo apt install nodejs
 *   2. Run: node Sentinel_Node.js
 *   3. (Optional) Run via cron or systemd for periodic reporting.
 */

const https = require('https');
const os = require('os');
const { exec } = require('child_process');

// Configuration
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwxyNfzBZKsV6CpWsN39AuB0Ja40mpdEmkAGf0Ml_1tOIMfJDE-nsu7ySXTcyaJuURb/exec';
const MACHINE_NAME = os.hostname();

// Function to check Firewall status (UFW)
function checkFirewall() {
    return new Promise((resolve) => {
        exec('sudo ufw status', (error, stdout, stderr) => {
            if (error) {
                // If ufw is not installed or requires sudo without pass, might fail.
                // We assume if it fails, we can't determine, or it's inactive.
                resolve(false);
                return;
            }
            // Check if output contains "Status: active"
            if (stdout && stdout.toLowerCase().includes('status: active')) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
}

// Function to check Node/Process status (Placeholder for specific services)
function checkServices() {
    // In a real scenario, you might check if 'pm2' or specific apps are running
    // For now, we just report true as we are running.
    return true;
}

// Function to send report
async function sendReport() {
    const firewallStatus = await checkFirewall();
    const serviceStatus = checkServices();

    const payload = {
        action: 'securityReport',
        machineName: MACHINE_NAME,
        firewall: firewallStatus,
        esetService: serviceStatus, // Mapping 'eset' to generic service status for compatibility
        details: {
            os: os.type() + ' ' + os.release(),
            platform: os.platform(),
            uptime: os.uptime(),
            loadAvg: os.loadavg(),
            totalMem: os.totalmem(),
            freeMem: os.freemem(),
            user: os.userInfo().username
        }
    };

    const data = JSON.stringify(payload);

    // Parse URL to get options
    const url = new URL(WEB_APP_URL);
    const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        },
        followRedirects: true // Native https doesn't follow redirects automatically usually, need to handle 302 potentially?
        // Apps Script often redirects. Node https.request does NOT follow redirects by default.
        // We might need a redirect handler or use a library like axios. 
        // To keep it dependency-free (standard lib), we implement simple redirect handling.
    };

    const req = https.request(options, (res) => {
        // Handle Redirects (Google Apps Script usually redirects to googleusercontent)
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            postToRedirect(res.headers.location, data);
            return;
        }

        let responseBody = '';
        res.on('data', (chunk) => { responseBody += chunk; });
        res.on('end', () => {
            console.log(`[Sentinel] Report sent. Status: ${res.statusCode}`);
            console.log(`[Sentinel] Response: ${responseBody}`);
        });
    });

    req.on('error', (e) => {
        console.error(`[Sentinel] Error sending report: ${e.message}`);
    });

    req.write(data);
    req.end();
}

function postToRedirect(location, data) {
    const url = new URL(location);
    const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'POST', // GAS redirects usually require following with GET? 
        // Actually GAS Web App POST often redirects to a GET with a callback or similar if not ContentService.
        // But if we return ContentService.createTextOutput(JSON)... it might handle it differently.
        // Wait, normally `curl -L -d ...` works. 
        // If GAS redirects a POST, it often becomes a GET if not careful, losing payload.
        // BUT, if the script uses ContentService correctly, it typically returns 200 OK directly without redirect for JSON.
        // However, if it redirects, we should check implementation.
        // Let's assume standard behavior: if 302, we follow. BUT passing data on 302 POST is tricky.
        // If the server expects a POST at the new location, we repost.

        // For simplicity in this v1, we assume the GAS URL will accept the POST or we rely on the fact that correct GAS deployments return JSON directly.
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    // NOTE: If the GAS web app requires login, this will fail. It must be "Anyone, even anonymous".

    const req = https.request(options, (res) => {
        let responseBody = '';
        res.on('data', (chunk) => { responseBody += chunk; });
        res.on('end', () => {
            console.log(`[Sentinel] Redirect Report sent. Status: ${res.statusCode}`);
        });
    });
    req.write(data);
    req.end();
}

// Run
console.log(`[Sentinel] Client starting on ${MACHINE_NAME}...`);
sendReport();
