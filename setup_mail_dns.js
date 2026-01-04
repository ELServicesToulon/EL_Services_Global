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

            // 1. Ensure 'mail' A record exists and is NOT proxied (Grey Cloud)
            // Actually, for o2switch, using mx.o2switch.net is preferred over mail.domain.com usually
            // But let's stick to the o2switch standard recommendations:
            // MX: m.o2switch.net (priority 10) OR mx.o2switch.net

            // Standard o2switch MX setup:
            const targetMX = "mx.o2switch.net";

            // 2. Ensure MX record exists pointing to mx.o2switch.net
            const mxRecords = await cfRequest(`/zones/${zone.id}/dns_records?type=MX&name=${zone.name}`);

            // Filter our target
            const validMx = mxRecords.find(r => r.content === targetMX);

            if (!validMx) {
                console.log(`   ❌ MX Record for o2switch missing. Creating...`);
                // Remove other MX records to be clean? Maybe risky if they use Google Suite.
                // Let's just add it with priority 10
                await createRecord(zone.id, 'MX', '@', targetMX, false, 10);
            } else {
                console.log(`   ✅ MX Record OK (${validMx.content})`);
            }

            // 3. SPF Record (Basic)
            // v=spf1 include:mx.o2switch.net ~all
            const txtRecords = await cfRequest(`/zones/${zone.id}/dns_records?type=TXT&name=${zone.name}`);
            const spfRecord = txtRecords.find(r => r.content.includes('v=spf1'));

            const expectedSpfPart = "include:mx.o2switch.net";

            if (!spfRecord) {
                console.log(`   ❌ SPF Record missing. Creating default o2switch SPF...`);
                await createRecord(zone.id, 'TXT', '@', "v=spf1 include:mx.o2switch.net ~all", false);
            } else {
                if (!spfRecord.content.includes(expectedSpfPart)) {
                    console.log(`   ⚠️ SPF Record exists but missing o2switch include: ${spfRecord.content}`);
                    // We can append it
                    let newContent = spfRecord.content.replace("~all", "").replace("-all", "").trim();
                    if (!newContent.endsWith("include:mx.o2switch.net")) {
                        newContent += " include:mx.o2switch.net ~all";
                        await updateRecord(zone.id, spfRecord.id, 'TXT', '@', newContent, false);
                    }
                } else {
                    console.log(`   ✅ SPF Record OK`);
                }
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
