require('dotenv').config();
const axios = require('axios');

const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
// Global API Key support (alternative)
const EMAIL = process.env.CLOUDFLARE_EMAIL;
const API_KEY = process.env.CLOUDFLARE_API_KEY;

async function purgeCache() {
    console.log("--- Cloudflare Cache Purge Tool ---");

    // ZONE_ID check moved to auto-detection logic below

    const headers = {
        'Content-Type': 'application/json',
    };

    if (API_TOKEN) {
        headers['Authorization'] = `Bearer ${API_TOKEN}`;
    } else if (EMAIL && API_KEY) {
        headers['X-Auth-Email'] = EMAIL;
        headers['X-Auth-Key'] = API_KEY;
    } else {
         console.error("❌ Erreur: Identifiants Cloudflare manquants.");
         console.error("Il faut soit CLOUDFLARE_API_TOKEN, soit CLOUDFLARE_EMAIL + CLOUDFLARE_API_KEY.");
         process.exit(1);
    }

    if (!ZONE_ID) {
        console.log("⚠️ ZONE_ID manquant. Tentative de récupération automatique via Token...");
        try {
            const zonesResp = await axios.get('https://api.cloudflare.com/client/v4/zones?name=mediconvoi.fr', { headers });
            if (zonesResp.data.success && zonesResp.data.result.length > 0) {
                const fetchedId = zonesResp.data.result[0].id;
                console.log(`✅ Zone ID trouvé: ${fetchedId}`);
                // Proceed with this ID
                await executePurge(fetchedId, headers);
                return;
            } else {
                 console.error("❌ Impossible de trouver la Zone ID pour 'mediconvoi.fr'. Vérifiez les droits du token.");
                 process.exit(1);
            }
        } catch (e) {
            console.error("❌ Erreur lors de la récupération de la Zone ID:", e.message);
            process.exit(1);
        }
    } else {
        await executePurge(ZONE_ID, headers);
    }
}

async function executePurge(zoneId, headers) {
    try {
        console.log(`🧹 Tentative de purge COMPLETE pour la Zone ID: ${zoneId}...`);
        
        const response = await axios.post(
            `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
            { purge_everything: true },
            { headers }
        );

        if (response.data.success) {
            console.log("✅ SUCCÈS : Cache purgé !");
            console.log("Détails:", JSON.stringify(response.data.result, null, 2));
        } else {
            console.error("⚠️ Échec de la purge:", JSON.stringify(response.data.errors, null, 2));
            process.exit(1);
        }
    } catch (error) {
        console.error("❌ Erreur Réseau / API :");
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Data:`, JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
        process.exit(1);
    }
}

// purgeCache(); // Removed automatic call, wait for signal or use simple execution
purgeCache();
