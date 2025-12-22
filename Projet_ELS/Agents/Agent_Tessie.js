/**
 * Agent Tessie (Fleet Manager)
 * ============================
 * Rôle : Gestionnaire de la flotte Tesla via API Tessie.
 * Capacités :
 * - Monitoring : Surveille l'état (Batterie, Localisation) du véhicule.
 * - History : Analyse les trajets et la consommation.
 * - Security : Alerte en cas de niveau batterie critique.
 */

/**
 * Lance l'audit de la flotte Tesla.
 * @return {string} Rapport d'audit.
 */
function runTessieAudit() {
    saveAgentLastRun('tessie');
    var report = [];
    report.push("🚗 **Rapport Flotte Tesla (Via Tessie)**");

    // 1. Chargement Configuration
    var config = (typeof Config !== 'undefined' && Config.TESLA) ? Config.TESLA : null;
    if (!config) {
        report.push("⚠️ Configuration TESLA manquante dans Config.js");
        return report.join("\n");
    }

    var token = config.TOKEN;
    var vin = config.VIN;

    if (!token || token.includes("TON_TOKEN")) {
        report.push("❌ Token API Tessie non configuré.");
        return report.join("\n");
    }

    // 2. Interrogation API (Simulation si pas de token valide ou accès direct)
    // Endpoint: https://api.tessie.com/{vin}/state
    try {
        var options = {
            method: 'get',
            headers: { 'Authorization': 'Bearer ' + token },
            muteHttpExceptions: true
        };

        // Note: L'appel réel nécessite que le VIN soit valide.
        // Si VIN placeholder, on skip l'appel.
        if (vin && !vin.includes("TON_VIN")) {
            var url = "https://api.tessie.com/" + vin + "/state";
            var response = UrlFetchApp.fetch(url, options);

            if (response.getResponseCode() === 200) {
                var json = JSON.parse(response.getContentText());
                var chargeState = json.charge_state;
                var driveState = json.drive_state;

                var batteryLevel = chargeState.battery_level;
                var range = chargeState.battery_range;
                var state = json.state; // online, asleep...

                var icon = batteryLevel > 50 ? "🔋" : "🪫";
                report.push(`${icon} **État Véhicule** : ${state.toUpperCase()}`);
                report.push(`   - Batterie : ${batteryLevel}% (${range} km est.)`);
                report.push(`   - Charge : ${chargeState.charging_state}`);

                // Alerte Batterie
                if (batteryLevel < config.SEUIL_ALERTE) {
                    report.push(`   🛑 **ALERTE**: Batterie faible (< ${config.SEUIL_ALERTE}%) !`);
                    // Ici on pourrait déclencher une notif via Agent_Scribe ou Mail
                }

                // Localisation
                if (driveState) {
                    report.push(`   - Position : ${driveState.latitude}, ${driveState.longitude}`);
                    report.push(`   - Vitesse : ${driveState.speed || 0} km/h`);
                }

            } else {
                report.push("⚠️ API Tessie inaccessible ou Erreur (Code " + response.getResponseCode() + ")");
                report.push("   Message: " + response.getContentText());
            }
        } else {
            report.push("ℹ️ VIN non configuré ou placeholder détecté. Monitoring suspendu.");
        }

    } catch (e) {
        report.push("❌ Erreur connexion Tessie : " + e.toString());
    }

    // Archivage
    if (typeof logAgentReport === 'function') {
        logAgentReport('tessie', report.join("\n"));
    }

    return report.join("\n");
}

/**
 * Récupère l'historique des trajets (Drives).
 * Utile pour l'analyse des tournées.
 */
function getTessieDrives(limit) {
    // Implémentation future pour croisement avec GPS établissements
    return "Non implémenté : getTessieDrives";
}
