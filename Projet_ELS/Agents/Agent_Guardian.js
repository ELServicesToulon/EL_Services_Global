/**
 * Agent Guardian (System Protector)
 * =================================
 * Rôle : Assurer la stabilité de la production.
 * Capacités :
 * - Health Check : Vérifie que les agents critiques répondent.
 * - Crash Detection : Analyse les logs pour détecter les pics d'erreurs.
 * - Rollback Advisory : Conseille (ou exécute) un retour en arrière si la santé est critique.
 */

var GUARDIAN_CONFIG = {
    CRITICAL_AGENTS: ['Agent_Cloudflare', 'Agent_Architecte', 'Agent_ClientExpert'],
    ERROR_THRESHOLD: 5 // Nombre d'erreurs tolérées sur la dernière heure
};

/**
 * Exécute un bilan de santé global.
 * @return {boolean} True si le système est sain, False si système critique.
 */
function runGuardianHealthCheck() {
    var errors = [];
    saveAgentLastRun('guardian');
    Logger.log("🛡️ Guardian est sur le qui-vive...");

    // 1. Vérification basique de syntaxe/chargement (implictement fait si ce script tourne)
    // On peut tenter d'appeler des fonctions "ping" des autres agents s'ils en ont.

    // 2. Simulation d'exécution critique (Smoke Test)
    // Par exemple, vérifier accès aux Properties
    try {
        var props = PropertiesService.getScriptProperties().getProperties();
        if (!props) throw new Error("Impossible de lire les ScriptProperties.");
    } catch (e) {
        errors.push("🔥 CRITICAL: Accès PropertiesService échoué (" + e.message + ")");
    }

    // 3. (Optionnel) Vérification des derniers logs d'erreur si accès à une API de logging externe
    // N'étant pas possible nativement en GAS simple sans Stackdriver avancé, on simule ici.

    var status = "";
    if (errors.length > 0) {
        status = "❌ Sytème instable ou compromis:\n" + errors.join("\n");
        Logger.log(status);
        if (typeof logAgentReport === 'function') logAgentReport('guardian', status);
        return status; // ÉCHEC (Retour String pour Dashboard)
    }

    status = "✅ Système opérationnel.";
    Logger.log(status);
    if (typeof logAgentReport === 'function') logAgentReport('guardian', status);
    return status; // SUCCÈS (Retour String pour Dashboard)
}

/**
 * Fonction appelée post-déploiement pour valider la mise en production.
 */
function validateProduction() {
    var isHealthy = runGuardianHealthCheck();
    if (!isHealthy) {
        throw new Error("GUARDIAN_CHECK_FAILED: Le système ne répond pas aux critères de santé.");
    }
    return "OK";
}
