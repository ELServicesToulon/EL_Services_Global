
const CloudflareAgent = require('./Agents_Modules/Cloudflare_Agent');
const { exec } = require('child_process');

async function whitelistSelf() {
    // 1. Get Public IP
    const publicIP = await new Promise((resolve) => {
        exec('curl -s ifconfig.me', (err, stdout) => {
            if (err) resolve(null);
            else resolve(stdout.trim());
        });
    });

    if (!publicIP) {
        console.error('Failed to get public IP');
        return;
    }

    console.log(`My Public IP is: ${publicIP}`);

    // 2. Whitelist on Cloudflare
    await CloudflareAgent.init();
    const res = await CloudflareAgent.whitelistIP(publicIP, 'Ghost Shopper Agent (VPS)');
    console.log('Whitelist Result:', res);
}

whitelistSelf();
