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
                // console.log("Debug Response:", data); // Uncomment for debug
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
    console.log("🔍 Scanning Cloudflare Zones...");
    try {
        const zones = await cfRequest(`/zones?account.id=${ACCOUNT_ID}&per_page=50`);
        console.log(`Found ${zones.length} zones.`);

        for (const zone of zones) {
            console.log(`\n------------------------------------------------`);
            console.log(`🌍 Domain: ${zone.name} (${zone.status})`);

            // Check existing A records
            const records = await cfRequest(`/zones/${zone.id}/dns_records?type=A&name=${zone.name}`);
            const wwwRecords = await cfRequest(`/zones/${zone.id}/dns_records?type=CNAME&name=www.${zone.name}`);

            let rootFixed = false;

            if (records.length === 0) {
                console.log(`   ❌ Root Record (@) missing. Creating...`);
                await createRecord(zone.id, 'A', '@', TARGET_IP);
                rootFixed = true;
            } else {
                const rec = records[0];
                if (rec.content !== TARGET_IP) {
                    console.log(`   ⚠️ Root points to ${rec.content}. Updating to ${TARGET_IP}...`);
                    await updateRecord(zone.id, rec.id, 'A', '@', TARGET_IP);
                    rootFixed = true;
                } else {
                    console.log(`   ✅ Root Record OK (${rec.content})`);
                }
            }

            // Check WWW
            if (wwwRecords.length === 0) {
                // Check if A record for www exists instead
                const wwwARecords = await cfRequest(`/zones/${zone.id}/dns_records?type=A&name=www.${zone.name}`);
                if (wwwARecords.length > 0) {
                    console.log(`   ℹ️ WWW is an A record. Updating to CNAME...`);
                    await deleteRecord(zone.id, wwwARecords[0].id); // Delete A to make room for CNAME or update A? CNAME is cleaner.
                    // Actually simpler to just update A if it exists, or switch to CNAME. Let's force CNAME standard.
                    await createRecord(zone.id, 'CNAME', 'www', zone.name);
                } else {
                    console.log(`   ❌ WWW Record missing. Creating...`);
                    await createRecord(zone.id, 'CNAME', 'www', zone.name);
                }
            } else {
                console.log(`   ✅ WWW Record OK`);
            }
        }

    } catch (e) {
        console.error("Error:", JSON.stringify(e, null, 2));
    }
}

async function createRecord(zoneId, type, name, content) {
    try {
        await cfRequest(`/zones/${zoneId}/dns_records`, 'POST', {
            type, name, content, proxied: true, ttl: 1
        });
        console.log(`      ✅ Created ${type} ${name} -> ${content}`);
    } catch (e) {
        console.error(`      ❌ Failed to create:`, e);
    }
}

async function updateRecord(zoneId, recId, type, name, content) {
    try {
        await cfRequest(`/zones/${zoneId}/dns_records/${recId}`, 'PUT', {
            type, name, content, proxied: true, ttl: 1
        });
        console.log(`      ✅ Updated ${type} ${name} -> ${content}`);
    } catch (e) {
        console.error(`      ❌ Failed to update:`, e);
    }
}

async function deleteRecord(zoneId, recId) {
    await cfRequest(`/zones/${zoneId}/dns_records/${recId}`, 'DELETE');
}

main();
