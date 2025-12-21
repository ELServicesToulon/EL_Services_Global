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

            // Inspection Sécurité Approfondie (SSL & HTTPS Redirect)
            var sslDetails = getZoneSSLDetails(zone.id, token);
            var httpsStatus = sslDetails.always_use_https === 'on' ? '🔒 HTTPS Redirection' : '🔓 NO HTTPS Redirection';
            var sslMode = sslDetails.ssl_mode; // off, flexible, full, strict

            // Inspection Zaraz (Third Party Tools)
            var zarazStatus = getZarazStatus(zone.id, token);
            var zarazIcon = zarazStatus.enabled ? "⚡" : "⚪";

            report.push(`${statusIcon} **${zone.name}** (${zone.plan.name})`);
            report.push(`   - Status: ${zone.status.toUpperCase()}`);
            report.push(`   - SSL: ${sslMode.toUpperCase()} | ${httpsStatus}`);
            report.push(`   - Zaraz: ${zarazIcon} ${zarazStatus.enabled ? "Actif" : "Inactif"}`);
            if (zarazStatus.enabled && zarazStatus.toolsCount > 0) {
                report.push(`     -> Tools: ${zarazStatus.toolsNames.join(", ")}`);
            }
            report.push(`   - Name Servers: ${zone.name_servers.join(', ')}`);

            if (zone.status !== 'active') {
                issuesFound++;
                report.push("   ⚠️ **Attention**: Le domaine n'est pas actif !");
            }

            // Alerte spécifique HTTPS
            if (zone.status === 'active' && sslDetails.always_use_https !== 'on') {
                issuesFound++;
                report.push(`   🛑 **CRITIQUE**: La redirection HTTPS n'est PAS active pour ${zone.name}. Le site est accessible en HTTP !`);
            }
        });

        if (issuesFound === 0) {
            report.push("\n✨ Tous les domaines semblent opérationnels.");
        } else {
            report.push(`\n⚠️ **${issuesFound} problèmes détectés.** Une vérification manuelle est recommandée.`);
        }

        // 2. Vérification Workers & Pages
        var workersReport = checkWorkersAndPages(token);
        if (workersReport) {
            report.push("\n⚡ **Workers & Pages**");
            report.push(workersReport);
        }

        // 3. Browser Rendering & Subscriptions
        var browserReport = checkBrowserRendering(token);
        if (browserReport) {
            report.push("\n🖥️ **Browser Rendering & Add-ons**");
            report.push(browserReport);
        }

    } catch (e) {
        report.push("❌ **Erreur Critique** : " + e.toString());
        Logger.log("Cloudflare Agent Error: " + e.toString());
    }

    // Archivage du rapport (si le Logger est disponible)
    if (typeof logAgentReport === 'function') {
        logAgentReport('cloudflare', report.join("\n"));
    }

    // Affichage dans la console pour le debug immédiat
    Logger.log(report.join("\n"));

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

/**
 * Récupère les détails SSL pour une zone donnée.
 */
function getZoneSSLDetails(zoneId, token) {
    var headers = {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
    };
    var options = { method: 'get', headers: headers, muteHttpExceptions: true };

    var result = { ssl_mode: 'Unknown', always_use_https: 'off' };

    try {
        // 1. Check Always Use HTTPS
        // Doc: https://developers.cloudflare.com/api/operations/zone-settings-get-always-use-https-setting
        var respHttps = UrlFetchApp.fetch(CLOUDFLARE_API_BASE + "/zones/" + zoneId + "/settings/always_use_https", options);
        var jsonHttps = JSON.parse(respHttps.getContentText());
        if (jsonHttps.success) result.always_use_https = jsonHttps.result.value;

        // 2. Check SSL Setting
        // Doc: https://developers.cloudflare.com/api/operations/zone-settings-get-ssl-setting
        var respSSL = UrlFetchApp.fetch(CLOUDFLARE_API_BASE + "/zones/" + zoneId + "/settings/ssl", options);
        var jsonSSL = JSON.parse(respSSL.getContentText());
        if (jsonSSL.success) result.ssl_mode = jsonSSL.result.value;

    } catch (e) {
        Logger.log("Error fetching SSL for zone " + zoneId + ": " + e);
    }
    return result;
}

/**
 * Récupère le statut de Zaraz pour une zone.
 */
function getZarazStatus(zoneId, token) {
    var headers = {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
    };
    var options = { method: 'get', headers: headers, muteHttpExceptions: true };

    var result = { enabled: false, toolsCount: 0, toolsNames: [] };

    try {
        // Doc: https://developers.cloudflare.com/api/operations/zaraz-configuration-get-configuration
        var url = CLOUDFLARE_API_BASE + "/zones/" + zoneId + "/zaraz/config";
        var response = UrlFetchApp.fetch(url, options);

        if (response.getResponseCode() === 200) {
            var json = JSON.parse(response.getContentText());
            if (json.result) {
                result.enabled = json.result.zaraz_id ? true : false; // Detection basique, ou check 'debugKey' existence
                // Zaraz est souvent "enabled" par défaut si configuré.
                // On regarde les outils configurés
                if (json.result.tools) {
                    var tools = json.result.tools;
                    var names = Object.keys(tools).filter(k => tools[k].enabled !== false); // Exclude disabled if flag exists
                    result.toolsCount = names.length;
                    result.toolsNames = names;
                    if (result.toolsCount > 0) result.enabled = true;
                }
            }
        }
    } catch (e) {
        Logger.log("Error Zaraz check: " + e);
    }
    return result;
}

/**
 * Vérifie les Workers et Pages Projects.
 */
function checkWorkersAndPages(token) {
    var headers = {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
    };
    var options = { method: 'get', headers: headers, muteHttpExceptions: true };
    var output = [];

    try {
        // 1. Workers Scripts
        // https://developers.cloudflare.com/api/operations/worker-script-list-workers
        var urlWorkers = CLOUDFLARE_API_BASE + "/accounts/" + CLOUDFLARE_ACCOUNT_ID + "/workers/scripts";
        var respWorkers = UrlFetchApp.fetch(urlWorkers, options);
        var jsonWorkers = JSON.parse(respWorkers.getContentText());

        if (jsonWorkers.success) {
            var scripts = jsonWorkers.result;
            if (scripts && scripts.length > 0) {
                output.push(`🔹 **${scripts.length} Workers actifs** :`);
                scripts.forEach(s => {
                    output.push(`   - **${s.id}** (Dernière modif: ${s.modified_on.split('T')[0]})`);
                });
            } else {
                output.push("🔹 Aucun Worker script détecté.");
            }
        }

        // 2. Pages Projects
        // https://developers.cloudflare.com/api/operations/pages-project-list-projects
        var urlPages = CLOUDFLARE_API_BASE + "/accounts/" + CLOUDFLARE_ACCOUNT_ID + "/pages/projects";
        var respPages = UrlFetchApp.fetch(urlPages, options);
        var jsonPages = JSON.parse(respPages.getContentText());

        if (jsonPages.success) {
            var projects = jsonPages.result;
            if (projects && projects.length > 0) {
                output.push(`\n📄 **${projects.length} Pages Projects** :`);
                projects.forEach(p => {
                    var url = p.subdomain; // Souvent le subdomain pages.dev
                    output.push(`   - **${p.name}** (Branch: ${p.production_branch})`);
                    output.push(`     🔗 https://${url}`);
                });
            }
        }

    } catch (e) {
        output.push("❌ Erreur Workers/Pages: " + e.toString());
    }

    return output.join("\n");
}

/**
 * Vérifie l'état de "Browser Rendering" via les souscriptions/addons.
 */
function checkBrowserRendering(token) {
    var headers = {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
    };
    var options = { method: 'get', headers: headers, muteHttpExceptions: true };
    var output = [];

    try {
        // Nous vérifions les souscriptions pour voir si l'addon est actif
        // Endpoint: accounts/:id/subscriptions
        var url = CLOUDFLARE_API_BASE + "/accounts/" + CLOUDFLARE_ACCOUNT_ID + "/subscriptions";
        var response = UrlFetchApp.fetch(url, options);
        var json = JSON.parse(response.getContentText());

        if (json.success) {
            var subs = json.result;
            var browserFound = false;

            subs.forEach(sub => {
                // On cherche des composants liés au Browser Rendering
                if (sub.component_values) {
                    sub.component_values.forEach(comp => {
                        if (comp.name && (comp.name.toLowerCase().includes("browser") || comp.name.toLowerCase().includes("rendering"))) {
                            browserFound = true;
                            output.push(`✅ **${comp.name}** : ${sub.state} (Price: ${sub.price} ${sub.currency})`);
                        }
                    });
                }
                // Parfois le nom de la souscription elle-même
                if (sub.rate_plan && sub.rate_plan.public_name && sub.rate_plan.public_name.toLowerCase().includes("browser")) {
                    browserFound = true;
                    output.push(`✅ **${sub.rate_plan.public_name}** : ${sub.state}`);
                }
            });

            if (!browserFound) {
                output.push("ℹ️ Aucun abonnement 'Browser Rendering' détecté.");
            }
        } else {
            output.push("⚠️ Impossible de lire les souscriptions.");
        }

    } catch (e) {
        output.push("❌ Erreur Browser Rendering Check: " + e.toString());
    }

    return output.join("\n");
}
