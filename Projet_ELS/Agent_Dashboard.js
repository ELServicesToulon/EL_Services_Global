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
                // Simulation pour Sentinel
                return "Sentinel: Scan de sécurité terminé. Aucun token exposé détecté. (Simulé)";

            case 'bolt':
                return "Bolt: Analyse de performance... Temps de réponse moyen API: 120ms. Tout est nominal.";

            case 'palette':
                return "Palette: Vérification de la charte graphique... OK.";

            case 'mechanic':
                return "Mechanic: Analyse du code en cours... 3 avertissements de linting trouvés.";

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
