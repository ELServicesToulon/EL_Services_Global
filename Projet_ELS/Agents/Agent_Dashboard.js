/**
 * Agent Dashboard Backend Logic
 */

function apiRunAgent(agentId) {
    try {
        Logger.log("Agent Dashboard: Triggering " + agentId);

        switch (agentId) {
            case 'qualite':
                if (typeof generateWeeklyQualityReport === 'function') {
                    // On exécute et on récupère le rapport
                    var rapport = generateWeeklyQualityReport();
                    if (rapport && rapport.startsWith("Erreur")) return rapport;
                    return "✅ Rapport généré :\n\n" + rapport;
                } else {
                    return "Erreur: Fonction generateWeeklyQualityReport introuvable.";
                }

            case 'sentinel':
                return (typeof runSentinelAudit === 'function') ? runSentinelAudit() : "Fonction runSentinelAudit introuvable.";

            case 'bolt':
                return (typeof runBoltAudit === 'function') ? runBoltAudit() : "Fonction runBoltAudit introuvable.";

            case 'palette':
                return (typeof runPaletteAudit === 'function') ? runPaletteAudit() : "Fonction runPaletteAudit introuvable.";

            case 'mechanic':
                return (typeof runMechanicAudit === 'function') ? runMechanicAudit() : "Fonction runMechanicAudit introuvable.";

            case 'scribe':
                return (typeof runScribeAudit === 'function') ? runScribeAudit() : "Fonction runScribeAudit introuvable.";

            case 'architect':
                return (typeof runArchitectAudit === 'function') ? runArchitectAudit() : "Fonction runArchitectAudit introuvable.";

            case 'billing':
                if (typeof runBillingAudit === 'function') {
                    return runBillingAudit();
                } else {
                    return "Erreur: Fonction runBillingAudit introuvable.";
                }

            case 'client_mystere':
                if (typeof executerClientMystere === 'function') {
                    return executerClientMystere();
                } else {
                    return "Erreur: Fonction executerClientMystere introuvable.";
                }

            default:
                return "Agent inconnu : " + agentId;
        }
    } catch (e) {
        return "Erreur d'exécution : " + e.toString();
    }
}

/**
 * Récupère l'état des agents (pour la persistance future)
 */
function apiGetAgentsStatus() {
    // TODO: Implémenter le stockage de l'état dans PropertiesService ou une feuille Sheet
    return {};
}

// ===================================
// MENU HANDLERS FOR AGENTS
// ===================================

/**
 * Ouvre la Sidebar des Agents
 */
function openAgentSidebar() {
    const template = HtmlService.createTemplateFromFile('Agent_Dashboard_Interface');
    // On adapte le template pour la sidebar (CSS minimaliste peut-être requis)
    const output = template.evaluate().setTitle('Tableau de Bord Agents');
    SpreadsheetApp.getUi().showSidebar(output);
}

/**
 * Lanceur wrapper pour le menu
 */
function menuRunQualite() {
    const result = apiRunAgent('qualite');
    SpreadsheetApp.getActive().toast(result, 'Agent Qualité', 10);
}

function menuRunSentinel() {
    const result = apiRunAgent('sentinel');
    SpreadsheetApp.getActive().toast(result, 'Agent Sentinel', 10);
}
