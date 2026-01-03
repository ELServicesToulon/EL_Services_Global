const https = require('https');

const API_TOKEN = 'th7oKVB8MubnZW5-Z-lQJ229LL0hWqN8Ihq-XoNV';
const ZONE_NAME = 'pharmacie-livraison-ehpad.fr';
const TARGET_URL = 'https://script.google.com/macros/s/AKfycbwxyNfzBZKsV6CpWsN39AuB0Ja40mpdEmkAGf0Ml_1tOIMfJDE-nsu7ySXTcyaJuURb/exec';

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
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.success) resolve(json.result);
                    else reject(json.errors);
                } catch (e) { reject(e); }
            });
        });
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function main() {
    console.log(`🔍 Recherche de la Zone ID pour ${ZONE_NAME}...`);
    try {
        const zones = await cfRequest(`/zones?name=${ZONE_NAME}`);
        if (zones.length === 0) throw new Error("Zone introuvable");
        const zoneId = zones[0].id;
        console.log(`✅ Zone ID: ${zoneId}`);

        console.log("🛠 Création de la Page Rule de redirection...");

        // Création de la règle
        const rule = {
            targets: [
                {
                    target: "url",
                    constraint: {
                        operator: "matches",
                        value: `*${ZONE_NAME}/*` // Redirige tout le domaine
                    }
                }
            ],
            actions: [
                {
                    id: "forwarding_url",
                    value: {
                        url: TARGET_URL,
                        status_code: 301
                    }
                }
            ],
            priority: 1,
            status: "active"
        };

        const result = await cfRequest(`/zones/${zoneId}/pagerules`, 'POST', rule);
        console.log("✅ Règle créée avec succès !");
        console.log(`👉 ${ZONE_NAME} redirige maintenant vers Google Script.`);

    } catch (e) {
        console.error("❌ Erreur:", JSON.stringify(e, null, 2));
    }
}

main();
