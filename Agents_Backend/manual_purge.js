const CloudflareAgent = require('./Agents_Modules/Cloudflare_Agent');

(async () => {
    console.log("🧹 Démarrage de la Purge Cloudflare Manuelle...");
    try {
        const result = await CloudflareAgent.purgeCache(true);
        console.log("Résultat:", JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("Erreur Purge:", e);
    }
})();
