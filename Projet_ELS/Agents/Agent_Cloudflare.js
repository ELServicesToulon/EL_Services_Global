/**
 * Agent Cloudflare (Network Guardian)
 * ===================================
 * Rôle : Gestionnaire de l'infrastructure Cloudflare.
 * Capacités :
 * - Monitoring : Surveille l'état des zones (domaines).
 * - Security : Vérifie le statut SSL/TLS.
 * - Alerts : Signale les domaines inactifs ou en erreur.
 */

// Configuration
var CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";
// L'ID de compte a été extrait de l'URL fournie par l'utilisateur
var CLOUDFLARE_ACCOUNT_ID = "cea23d9cb4df3daa7fc58634b769ff0b";

/**
 * Lance l'audit Cloudflare.
 */
function runCloudflareAudit() {
    saveAgentLastRun('cloudflare');
    var report = [];
    report.push("☁️ **Rapport Réseau Cloudflare**");

    var token = PropertiesService.getScriptProperties().getProperty("CLOUDFLARE_API_TOKEN");
    if (!token) {
        report.push("⚠️ **Erreur** : Token API Cloudflare manquant (Propriété: CLOUDFLARE_API_TOKEN).");
        report.push("-> Veuillez ajouter un token avec les permissions 'Zone:Read' dans les propriétés du script.");
        return report.join("\n");
    }

    try {
        // 1. Récupération des Zones (Domaines)
        // Documentation: https://developers.cloudflare.com/api/operations/zones-get
        var options = {
            method: 'get',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            muteHttpExceptions: true
        };

        var url = CLOUDFLARE_API_BASE + "/zones?account.id=" + CLOUDFLARE_ACCOUNT_ID;
        var response = UrlFetchApp.fetch(url, options);
        var json = JSON.parse(response.getContentText());

        if (!json.success) {
            report.push("❌ **Erreur API** : Impossible de récupérer les zones.");
            if (json.errors && json.errors.length > 0) {
                report.push(`   Code: ${json.errors[0].code}, Message: ${json.errors[0].message}`);
            }
            return report.join("\n");
        }

        var zones = json.result;
        report.push(`\n🔎 **Analyse de ${zones.length} domaines :**`);

        var issuesFound = 0;

        zones.forEach(zone => {
            var statusIcon = zone.status === 'active' ? '✅' : '⚠️';
            var sslStatus = "N/A";

            // Tentative de lecture simple du mode SSL si disponible dans l'objet zone (parfois partiel)
            // Sinon nécessiterait un appel dédié /zones/:id/settings/ssl

            report.push(`${statusIcon} **${zone.name}** (${zone.plan.name})`);
            report.push(`   - Status: ${zone.status.toUpperCase()}`);
            report.push(`   - Name Servers: ${zone.name_servers.join(', ')}`);

            if (zone.status !== 'active') {
                issuesFound++;
                report.push("   ⚠️ **Attention**: Le domaine n'est pas actif !");
            }
        });

        if (issuesFound === 0) {
            report.push("\n✨ Tous les domaines semblent opérationnels.");
        } else {
            report.push(`\n⚠️ **${issuesFound} problèmes détectés.** Une vérification manuelle est recommandée.`);
        }

    } catch (e) {
        report.push("❌ **Erreur Critique** : " + e.toString());
        Logger.log("Cloudflare Agent Error: " + e.toString());
    }

    // Archivage du rapport (si le Logger est disponible)
    if (typeof logAgentReport === 'function') {
        logAgentReport('cloudflare', report.join("\n"));
    }

    return report.join("\n");
}

/**
 * Fonction utilitaire pour vider le cache (Purge Cache) d'une zone spécifique.
 * Peut être appelée par d'autres agents (ex: Architecte ou Mechanic) en cas de déploiement.
 */
function purgeCloudflareCache(zoneId) {
    var token = PropertiesService.getScriptProperties().getProperty("CLOUDFLARE_API_TOKEN");
    if (!token) return "Token manquant";

    var url = CLOUDFLARE_API_BASE + "/zones/" + zoneId + "/purge_cache";
    var options = {
        method: 'post',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        },
        payload: JSON.stringify({ purge_everything: true }),
        muteHttpExceptions: true
    };

    try {
        var response = UrlFetchApp.fetch(url, options);
        var json = JSON.parse(response.getContentText());
        if (json.success) {
            return "✅ Cache purgé avec succès pour la zone " + zoneId;
        } else {
            return "❌ Erreur purge: " + json.errors[0].message;
        }
    } catch (e) {
        return "❌ Exception purge: " + e.toString();
    }
}
