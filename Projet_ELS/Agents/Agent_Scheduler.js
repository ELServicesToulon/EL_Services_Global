/**
 * Agent Schéuleur (Scheduler Manager)
 * Gestionnaire intelligent des plannings agents.
 */

// Définitions des Stratégies
var STRATEGIES = {
    "ECO": {
        name: "Bootstrap Économe",
        icon: "🌱",
        desc: "Budget minimal. Lundi/Vendredi uniquement.",
        tasks: [
            { agent: "Client Mystère", function: "executerClientExpert", days: [ScriptApp.WeekDay.MONDAY, ScriptApp.WeekDay.WEDNESDAY, ScriptApp.WeekDay.FRIDAY], hour: 11 },
            { agent: "Sentinel", function: "runSentinelAudit", days: [ScriptApp.WeekDay.MONDAY], hour: 9 },
            { agent: "Billing", function: "runBillingAudit", days: [ScriptApp.WeekDay.FRIDAY], hour: 18 } // Fin de mois simulé par vendredi
        ]
    },
    "BALANCED": {
        name: "Opérations Équilibrées",
        icon: "⚖️",
        desc: "Standard Production. Check quotidien.",
        tasks: [
            { agent: "Client Mystère", function: "executerClientExpert", days: [ScriptApp.WeekDay.MONDAY, ScriptApp.WeekDay.TUESDAY, ScriptApp.WeekDay.WEDNESDAY, ScriptApp.WeekDay.THURSDAY, ScriptApp.WeekDay.FRIDAY], hour: 11 },
            { agent: "Client Mystère", function: "executerClientExpert", days: [ScriptApp.WeekDay.MONDAY, ScriptApp.WeekDay.TUESDAY, ScriptApp.WeekDay.WEDNESDAY, ScriptApp.WeekDay.THURSDAY, ScriptApp.WeekDay.FRIDAY], hour: 16 },
            { agent: "Sentinel", function: "runSentinelAudit", everyDay: true, hour: 0 },
            { agent: "Bolt", function: "runBoltAudit", days: [ScriptApp.WeekDay.MONDAY], hour: 8 },
            { agent: "Billing", function: "runBillingAudit", days: [ScriptApp.WeekDay.FRIDAY], hour: 19 },
            { agent: "Marketing", function: "runMarketingAudit", days: [ScriptApp.WeekDay.WEDNESDAY], hour: 10 },
            { agent: "Cloudflare", function: "runCloudflareAudit", days: [ScriptApp.WeekDay.MONDAY], hour: 9 },
            { agent: "Architecte", function: "runDailyBriefing", everyDay: true, hour: 8 }
        ]
    },
    "HIGH": {
        name: "High Availability",
        icon: "🚀",
        desc: "Proactif. Surveillance continue.",
        tasks: [
            { agent: "Client Mystère", function: "executerClientExpert", everyDay: true, hour: 7 },
            { agent: "Client Mystère", function: "executerClientExpert", everyDay: true, hour: 13 },
            { agent: "Sentinel", function: "runSentinelAudit", everyDay: true, hour: 12 },
            { agent: "Sentinel", function: "runSentinelAudit", everyDay: true, hour: 23 },
            { agent: "Billing", function: "runBillingAudit", everyDay: true, hour: 6 },
            { agent: "Bolt", function: "runBoltAudit", everyDay: true, hour: 5 },
            { agent: "Marketing", function: "runMarketingAudit", everyDay: true, hour: 9 },
            { agent: "Cloudflare", function: "runCloudflareAudit", everyDay: true, hour: 10 },
            { agent: "Architecte", function: "runDailyBriefing", everyDay: true, hour: 8 }
        ]
    }
};

/**
 * Applique une stratégie donnée : Nettoie tout et réinstalle les triggers.
 */
function applyStrategy(strategyKey) {
    try {
        const strat = STRATEGIES[strategyKey];
        if (!strat) return "Stratégie inconnue : " + strategyKey;

        // 1. Nettoyage TOTAL des triggers (sauf ceux système/critiques si on savait les filtrer, ici on nettoie tout ce qui est agent)
        // On filtre par nom de fonction connue
        const knownFunctions = ["executerClientExpert", "executerClientMystere", "runSentinelAudit", "runBoltAudit", "runBillingAudit", "runPaletteAudit", "runMechanicAudit", "runMarketingAudit", "runCloudflareAudit"];

        const triggers = ScriptApp.getProjectTriggers();
        let deletedCount = 0;
        triggers.forEach(t => {
            if (knownFunctions.includes(t.getHandlerFunction())) {
                ScriptApp.deleteTrigger(t);
                deletedCount++;
            }
        });

        // 2. Installation des nouveaux triggers
        let installedCount = 0;
        strat.tasks.forEach(task => {
            if (task.everyDay) {
                ScriptApp.newTrigger(task.function).timeBased().everyDays(1).atHour(task.hour).create();
                installedCount++;
            } else if (task.days) {
                // App Script ne permet pas "Every Monday AND Friday". Il faut un trigger par jour spécifique ou "Onday".
                // Workaround: OnScriptApp.newTrigger().timeBased().onWeekDay(x).atHour(y).create()
                task.days.forEach(day => {
                    ScriptApp.newTrigger(task.function).timeBased().onWeekDay(day).atHour(task.hour).create();
                    installedCount++;
                });
            }
        });

        // Enregistrement de la stratégie active (persistance légère)
        PropertiesService.getScriptProperties().setProperty("ACTIVE_STRATEGY", strategyKey);

        return `✅ Stratégie "${strat.name}" appliquée avec succès.\n🗑️ Triggers supprimés : ${deletedCount}\n🆕 Triggers créés : ${installedCount}`;

    } catch (e) {
        Logger.log("Erreur applyStrategy: " + e.toString());
        return "Erreur lors de l'application de la stratégie : " + e.toString();
    }
}

/**
 * Récupère la stratégie active pour l'UI
 */
function getActiveStrategyInfo() {
    const currentKey = PropertiesService.getScriptProperties().getProperty("ACTIVE_STRATEGY") || "AUCUNE";
    return currentKey;
}
