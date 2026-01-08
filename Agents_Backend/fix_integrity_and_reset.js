
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const CloudflareAgent = require('./Agents_Modules/Cloudflare_Agent');

async function fixIntegrityAndReset() {
    console.log("🛠️ Starting System Recovery...");

    // 1. Reset Integrity Baseline
    const baselinePath = path.join(__dirname, 'Agents_Modules', 'fim_baseline.json');
    if (fs.existsSync(baselinePath)) {
        console.log("🗑️ Deleting compromised integrity baseline...");
        fs.unlinkSync(baselinePath);
        console.log("✅ Baseline deleted. Sentinel will regenerate it on next run.");
    } else {
        console.log("ℹ️ No baseline found (Clean state).");
    }

    // 2. Reset Cloudflare Security Level
    console.log("🛡️ Resetting Cloudflare Security Level...");
    await CloudflareAgent.init();
    await CloudflareAgent.setSecurityLevel('medium');
    console.log("✅ Cloudflare Security Level set to 'medium'.");

    // 3. Restart Sentinel
    console.log("🔄 Restarting Sentinel process...");
    exec('pm2 restart sentinel', (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ Error restarting Sentinel: ${error.message}`);
            return;
        }
        console.log(`✅ Sentinel Restarted:\n${stdout}`);
    });
}

fixIntegrityAndReset().catch(console.error);
