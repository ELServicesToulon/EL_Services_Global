/**
 * CODE_PILULEUR.JS
 * Module de gestion de l'assistant visuel pour la pharmacie.
 */

// --- CONFIGURATION MODULE (À adapter ou fusionner avec Config.gs) ---
// Utilisation de Config global si disponible, sinon fallback sécurisé
var PILULEUR_CONFIG = {
  SHEET_LOGS_NAME: "Admin_Logs", // On utilise Admin_Logs pour tracer les actions
  DEFAULT_IMG: "https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png" // Placeholder
};

/**
 * Sert l'interface HTML de l'assistant Piluleur.
 * Appelé via doGet ou via une fonction d'inclusion dans le template principal.
 */
function openPiluleurInterface(imageId, imageUrl) {
  var template = HtmlService.createTemplateFromFile('Vue_Piluleur');

  // Passage des variables au template
  // Si pas d'image fournie, on met une image par défaut (ou celle du dernier scan)
  template.photoUrl = imageUrl || PILULEUR_CONFIG.DEFAULT_IMG;
  template.imageId = imageId || "ID_INCONNU_" + new Date().getTime();

  return template.evaluate()
    .setTitle('Assistant Piluleur ELS')
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Fonction appelée par le client (Vue_Piluleur.html) lors d'un clic.
 * Enregistre l'action, la position et l'anomalie.
 * * @param {string} imageId - L'ID de la livraison ou de l'image scannée.
 * @param {string} actionType - 'valid', 'missing', 'broken'.
 * @param {number} x - Coordonnée X.
 * @param {number} y - Coordonnée Y.
 */
function enregistrerActionPiluleur(imageId, actionType, x, y) {
  try {
    // Validation des entrées
    if (!imageId || !actionType) throw new Error("Données incomplètes.");

    // Récupération de l'objet Config global pour l'ID Spreadsheet
    // Si Config n'est pas défini dans ce contexte, on lance une erreur explicite
    var spreadsheetId = null;
    try {
        // Tentative 1: via le getter global
        if (typeof getSecret === 'function') {
            spreadsheetId = getSecret('ID_FEUILLE_CALCUL');
        }
        // Tentative 2: via constante globale
        if (!spreadsheetId && typeof ID_FEUILLE_CALCUL !== 'undefined') {
            spreadsheetId = ID_FEUILLE_CALCUL;
        }
        // Tentative 3: via objet Config (si existant)
        if (!spreadsheetId && typeof Config !== 'undefined' && Config.ID_FEUILLE_CALCUL) {
            spreadsheetId = Config.ID_FEUILLE_CALCUL;
        }
    } catch (e) {
        Logger.log("Erreur recuperation ID Spreadsheet: " + e.message);
    }

    if (!spreadsheetId) {
      throw new Error("Erreur Critique : ID_FEUILLE_CALCUL introuvable.");
    }

    var ss = SpreadsheetApp.openById(spreadsheetId);
    var sheet = ss.getSheetByName(PILULEUR_CONFIG.SHEET_LOGS_NAME);

    if (!sheet) {
      // Création de secours si l'onglet n'existe pas (Sécurité)
      sheet = ss.insertSheet(PILULEUR_CONFIG.SHEET_LOGS_NAME);
      sheet.appendRow(["Timestamp", "Utilisateur", "Action", "Statut", "Détails"]);
    }

    var userEmail = Session.getActiveUser().getEmail();
    var timestamp = new Date();

    // Formatage du détail pour le log
    var details = JSON.stringify({
      module: "PILULEUR",
      image_ref: imageId,
      coords: {x: x, y: y},
      anomalie: actionType
    });

    // Écriture dans les logs (Format standard ELS : Timestamp, User, Action, Statut, Détails)
    sheet.appendRow([
      timestamp,
      userEmail,
      "ANNOTATION_PILULEUR",
      actionType.toUpperCase(),
      details
    ]);

    return "Succès : Annotation enregistrée.";

  } catch (e) {
    console.error("Erreur enregistrerActionPiluleur : " + e.message);
    // On ne renvoie pas l'erreur stack trace complète au client pour sécurité
    throw new Error("Erreur lors de l'enregistrement : " + e.message);
  }
}
