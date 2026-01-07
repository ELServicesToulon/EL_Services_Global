/**
 * =================================================================
 * MODULE LOGGING
 * =================================================================
 * Description: Fonctions de journalisation centralisées pour
 *              enregistrer l'activité de l'application.
 * =================================================================
 */

/**
 * Enregistre une activité dans la feuille de logs définie (SHEET_LOGS).
 * Format: [Timestamp, ID Réservation, Email Client, Description, Montant, Statut]
 *
 * @param {string} idReservation - L'identifiant de la réservation concernee (ou vide).
 * @param {string} emailClient - L'email du client (ou vide).
 * @param {string} description - Description de l'action ou de l'évènement.
 * @param {number|string} montant - Montant associé (si applicable).
 * @param {string} statut - Statut de l'opération (ex: "Succès", "Erreur", "Modification").
 */
function logActivity(idReservation, emailClient, description, montant, statut) {
  try {
    // Récupération de l'ID du classeur via les fonctions globales (Utilitaires/Configuration)
    // getSecret et SHEET_LOGS doivent être accessibles globalement.
    var spreadsheetId = getSecret('ID_FEUILLE_CALCUL');
    var ss = SpreadsheetApp.openById(spreadsheetId);

    var sheetName = (typeof SHEET_LOGS !== 'undefined') ? SHEET_LOGS : 'Logs';
    var sheet = ss.getSheetByName(sheetName);

    // Si la feuille n'existe pas, on tente de la créer
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      // En-tête par défaut
      sheet.appendRow(['Timestamp', 'ID Réservation', 'Email Client', 'Description', 'Montant', 'Statut']);
    }

    var timestamp = new Date();
    sheet.appendRow([timestamp, idReservation, emailClient, description, montant, statut]);

  } catch (e) {
    // Fallback console en cas d'erreur critique de logging (ex: quota, permissions)
    console.error("Erreur critique dans logActivity : " + e.toString());
    Logger.log("Erreur critique dans logActivity : " + e.toString());
  }
}

/**
 * Journalise une erreur technique dans les logs Apps Script et console.
 * @param {string} context - Contexte de l'erreur (ex: "sendEmail").
 * @param {Error|string} error - L'objet erreur ou le message.
 */
function logTechnicalError(context, error) {
  var msg = (error && error.message) ? error.message : String(error);
  var stack = (error && error.stack) ? error.stack : '';
  console.error("Erreur [" + context + "]: " + msg);
  Logger.log("Erreur [" + context + "]: " + msg + "\nStack: " + stack);
}

/**
 * Journalise une action spécifique de l'administrateur.
 * Alias spécialisé de logActivity.
 * @param {string} action - L'action effectuée (ex: "Génération Factures").
 * @param {string} details - Détails de l'action.
 */
function logAdminAction(action, details) {
  var userEmail = Session.getActiveUser().getEmail();
  logActivity("ADMIN", userEmail || "Admin", action, 0, details);
}
