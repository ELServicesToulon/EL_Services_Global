const https = require('https');

const API_TOKEN = 'th7oKVB8MubnZW5-Z-lQJ229LL0hWqN8Ihq-XoNV';
const ACCOUNT_ID = 'cea23d9cb4df3daa7fc58634b769ff0b';
const TARGET_IP = '109.234.166.100'; // o2switch

async function cfRequest(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.cloudflare.com',
            path: `/client/v4${path}`,
            method: method,
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.success) resolve(json.result);
                    else {
                        console.log("Debug Error Payload:", JSON.stringify(json, null, 2));
                        reject(json.errors);
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function main() {
    console.log("🔍 Scanning Cloudflare Zones for Email Configuration...");
    try {
        const zones = await cfRequest(`/zones?account.id=${ACCOUNT_ID}&per_page=50`);
        console.log(`Found ${zones.length} zones.`);

        for (const zone of zones) {
            console.log(`\n------------------------------------------------`);
            console.log(`🌍 Domain: ${zone.name} (${zone.status})`);

            // We only really care about mediconvoi.fr for now, but good to check all
            if (zone.name !== 'mediconvoi.fr') {
                console.log("Skipping (only targeting mediconvoi.fr for safety)");
                continue;
            }

            // 1. Ensure 'mail' A record exists and is NOT proxied (Grey Cloud)
            const mailRecords = await cfRequest(`/zones/${zone.id}/dns_records?type=A&name=mail.${zone.name}`);

            if (mailRecords.length === 0) {
                console.log(`   ❌ 'mail' A Record missing. Creating...`);
                await createRecord(zone.id, 'A', 'mail', TARGET_IP, false); // false = not proxied
            } else {
                const rec = mailRecords[0];
                if (rec.content !== TARGET_IP || rec.proxied === true) {
                    console.log(`   ⚠️ 'mail' record invalid (IP: ${rec.content}, Proxy: ${rec.proxied}). Updating...`);
                    await updateRecord(zone.id, rec.id, 'A', 'mail', TARGET_IP, false);
                } else {
                    console.log(`   ✅ 'mail' A Record OK (Not Proxied)`);
                }
            }

            // 2. Ensure MX record exists pointing to mail.<domain>
            const mxRecords = await cfRequest(`/zones/${zone.id}/dns_records?type=MX&name=${zone.name}`);
            const expectedMxVal = `mail.${zone.name}`;

            if (mxRecords.length === 0) {
                console.log(`   ❌ MX Record missing. Creating...`);
                await createRecord(zone.id, 'MX', '@', expectedMxVal, false, 0); // priority 0
            } else {
                // Check if our expected MX exists
                const validMx = mxRecords.find(r => r.content === expectedMxVal);
                if (!validMx) {
                    console.log(`   ⚠️ MX Record points to ${mxRecords[0].content}. Adding correct MX...`);
                    // We might want to delete others, but adding the correct one is safer first step.
                    // Actually, let's delete invalid ones if they are clearly wrong (e.g. generic placeholders)
                    // For now, just create if not found.
                    await createRecord(zone.id, 'MX', '@', expectedMxVal, false, 0);
                } else {
                    console.log(`   ✅ MX Record OK (${validMx.content})`);
                }
            }

            // 3. SPF Record (Basic)
            // v=spf1 a mx ip4:109.234.166.100 ~all
            const txtRecords = await cfRequest(`/zones/${zone.id}/dns_records?type=TXT&name=${zone.name}`);
            const spfRecord = txtRecords.find(r => r.content.includes('v=spf1'));

            const expectedSpf = "v=spf1 a mx ip4:109.234.166.100 ~all";

            if (!spfRecord) {
                console.log(`   ❌ SPF Record missing. Creating...`);
                await createRecord(zone.id, 'TXT', '@', expectedSpf, false);
            } else {
                console.log(`   ℹ️ SPF Record exists: ${spfRecord.content}`);
                // Don't overwrite existing SPF blindly as it might have other services
            }

        }

    } catch (e) {
        console.error("Error:", JSON.stringify(e, null, 2));
    }
}

async function createRecord(zoneId, type, name, content, proxied = true, priority = 10) {
    try {
        const payload = {
            type, name, content, proxied, ttl: 1 // Auto TTL
        };
        if (type === 'MX') payload.priority = priority;

        await cfRequest(`/zones/${zoneId}/dns_records`, 'POST', payload);
        console.log(`      ✅ Created ${type} ${name} -> ${content}`);
    } catch (e) {
        console.error(`      ❌ Failed to create:`, e);
    }
}

async function updateRecord(zoneId, recId, type, name, content, proxied = true) {
    try {
        await cfRequest(`/zones/${zoneId}/dns_records/${recId}`, 'PUT', {
            type, name, content, proxied, ttl: 1
        });
        console.log(`      ✅ Updated ${type} ${name} -> ${content}`);
    } catch (e) {
        console.error(`      ❌ Failed to update:`, e);
    }
}

main();
