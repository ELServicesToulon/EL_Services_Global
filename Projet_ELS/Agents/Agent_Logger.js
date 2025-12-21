/**
 * Agent Logger (Centralisation des logs)
 * ======================================
 * Assure que les rapports des agents exécutés automatiquement (via Scheduler)
 * ne sont pas perdus, mais archivés dans un Google Sheet "JOURNAL_AGENTS".
 */

/**
 * Enregistre le rapport d'un agent dans le journal.
 * @param {string} agentId - Identifiant de l'agent (ex: 'bolt', 'sentinel').
 * @param {string} reportContent - Le contenu texte/markdown du rapport.
 */
function logAgentReport(agentId, reportContent) {
    try {
        // 1. Récupération / Création de la Spreadsheet de logs
        var logSheetId = PropertiesService.getScriptProperties().getProperty("ID_JOURNAL_AGENTS");
        var ss;

        if (logSheetId) {
            try {
                ss = SpreadsheetApp.openById(logSheetId);
            } catch (e) {
                Logger.log("Spreadsheet Journal introuvable avec l'ID stocké. Création d'une nouvelle.");
            }
        }

        if (!ss) {
            // Si pas d'ID ou ID invalide, on utilise la feuille de calcul active ou on en cherche une
            // Pour être sûr, on va chercher ou créer un onglet dans le Spreadsheet principal si config
            // Sinon on crée un SS dédié (plus propre pour les logs infinis)
            ss = SpreadsheetApp.create("Projet_ELS_Journal_Agents");
            logSheetId = ss.getId();
            PropertiesService.getScriptProperties().setProperty("ID_JOURNAL_AGENTS", logSheetId);

            // Partage avec l'admin si possible (optionnel)
            // ss.addEditor("admin@example.com"); 
            Logger.log("Nouveau Journal Agents créé : " + ss.getUrl());
        }

        var sheetName = "Journal_2025"; // Rotation annuelle simple
        var sheet = ss.getSheetByName(sheetName);
        if (!sheet) {
            sheet = ss.insertSheet(sheetName);
            sheet.appendRow(["Timestamp", "Agent", "Contenu_Rapport"]);
            sheet.setColumnWidth(1, 150);
            sheet.setColumnWidth(3, 500);
            sheet.getRange("A1:C1").setFontWeight("bold");
        }

        // 2. Écriture du log
        var timestamp = new Date();
        // On tronque le rapport s'il est trop long pour une cellule (50k chars limit)
        var safeContent = (reportContent || "").substring(0, 49000);

        sheet.appendRow([timestamp, agentId, safeContent]);

        // Log console pour debug immédiat
        console.log(`[Journal] ${agentId} archivé.`);

    } catch (e) {
        console.error("Erreur Critical Agent Logger: " + e.toString());
    }
}
