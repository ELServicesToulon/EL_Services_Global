/**
 * Agent Dashboard Backend Logic
 */

function apiRunAgent(agentId) {
    try {
        Logger.log("Agent Dashboard: Triggering " + agentId);
        saveAgentLastRun(agentId); // Mise à jour du timestamp


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
                // Note : On garde l'ID 'client_mystere' pour ne pas casser l'UI existante, 
                // mais on pointe vers la nouvelle logique 'Client Expert'.
                if (typeof executerClientExpert === 'function') {
                    return executerClientExpert();
                } else {
                    return "Erreur: Fonction executerClientExpert introuvable (Migration en cours ?).";
                }

            case 'marketing':
                return (typeof runMarketingAudit === 'function') ? runMarketingAudit() : "Fonction runMarketingAudit introuvable.";

            case 'cloudflare':
                return (typeof runCloudflareAudit === 'function') ? runCloudflareAudit() : "Fonction runCloudflareAudit introuvable.";

            case 'guardian':
                return (typeof runGuardianHealthCheck === 'function') ? runGuardianHealthCheck() : "Fonction runGuardianHealthCheck introuvable.";

            case 'client_expert':
                return (typeof executerClientExpert === 'function') ? executerClientExpert() : "Fonction executerClientExpert introuvable.";

            case 'scheduler_apply':
                // args doit contenir la clé de stratégie ex: "ECO"
                // Attention: apiRunAgent n'accepte qu'un arg simple dans ce pattern, 
                // on va devoir hacker ou modifier l'appelant. 
                // Pour simplifier, on suppose que agentId est composit ou on créée une fonction dédiée.
                // MAIS ici on est dans apiRunAgent.
                // Hack: agentId = "scheduler_apply:ECO"
                return "Utilisez la fonction dédiée apiApplyStrategy(key).";

            default:
                return "Agent inconnu : " + agentId;
        }
    } catch (e) {
        return "Erreur d'exécution : " + e.toString();
    }
}

function apiApplyStrategy(key) {
    if (typeof applyStrategy === 'function') {
        return applyStrategy(key);
    }
    return "Fonction applyStrategy introuvable.";
}

function apiGetStrategy() {
    if (typeof getActiveStrategyInfo === 'function') {
        return getActiveStrategyInfo();
    }
    return "N/A";
}

/**
 * Récupère l'état des agents (pour la persistance future)
 */
function apiGetAgentsStatus() {
    var props = PropertiesService.getScriptProperties().getProperties();
    var agents = ['sentinel', 'bolt', 'qualite', 'palette', 'mechanic', 'scribe', 'architect', 'billing', 'client_mystere', 'marketing'];
    var status = {};

    agents.forEach(function (id) {
        var key = 'LAST_RUN_' + id.toUpperCase();
        if (props[key]) {
            status[id] = {
                status: 'idle', // Pour l'instant on ne track pas le "running" state en temps réel
                lastRun: props[key]
            };
        } else {
            status[id] = { status: 'idle', lastRun: 'Jamais' };
        }
    });

    return status;
}

/**
 * Enregistre le run d'un agent
 * @param {string} agentId
 */
function saveAgentLastRun(agentId) {
    if (!agentId) return;
    var key = 'LAST_RUN_' + agentId.toUpperCase();
    var now = new Date();
    // Format français propre : JJ/MM HH:mm
    var timeString = Utilities.formatDate(now, Session.getScriptTimeZone(), "dd/MM HH:mm");
    PropertiesService.getScriptProperties().setProperty(key, timeString);
}

// ===================================
// MENU HANDLERS FOR AGENTS
// ===================================

/**
 * Ouvre la Sidebar des Agents
 */
function openAgentSidebar() {
    // Tentative de chargement avec le préfixe de dossier (structure standard Clasp)
    let template;
    try {
        template = HtmlService.createTemplateFromFile('Agents/Agent_Dashboard_Interface');
    } catch (e) {
        // Fallback si le fichier est à la racine (aplatissement)
        try {
            template = HtmlService.createTemplateFromFile('Agent_Dashboard_Interface');
        } catch (e2) {
            SpreadsheetApp.getUi().alert("Erreur: Template 'Agent_Dashboard_Interface' introuvable.");
            return;
        }
    }

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

function menuRunMarketing() {
    const result = apiRunAgent('marketing');
    // Affiche le rapport dans une modale car il est trop long pour un toast
    const html = HtmlService.createHtmlOutput('<pre style="white-space: pre-wrap; font-family: monospace;">' + result + '</pre>')
        .setWidth(600)
        .setHeight(600);
    SpreadsheetApp.getUi().showModalDialog(html, 'Rapport Agent Marketing');
}
