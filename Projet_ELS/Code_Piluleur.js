/**
 * CODE_PILULEUR.JS
 * Module de gestion de l'assistant visuel pour la pharmacie.
 * Ajout de traces Resideur pour l'auto-apprentissage (surveiller / signalerAuPiluleur).
 */

// --- CONFIGURATION MODULE (adapter ou fusionner avec Config.js) ---
// Utilisation de Config global si disponible, sinon fallback securise.
var PILULEUR_CONFIG = {
  SHEET_LOGS_NAME: "Admin_Logs", // On utilise Admin_Logs pour tracer les actions
  DEFAULT_IMG: "https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png" // Placeholder
};

/**
 * Sert l'interface HTML de l'assistant Piluleur.
 * Appelee via doGet ou via une fonction d'inclusion dans le template principal.
 */
function openPiluleurInterface(imageId, imageUrl) {
  var template = HtmlService.createTemplateFromFile('Vue_Piluleur');

  // Passage des variables au template
  // Si pas d'image fournie, on met une image par defaut (ou celle du dernier scan)
  template.photoUrl = imageUrl || PILULEUR_CONFIG.DEFAULT_IMG;
  template.imageId = imageId || "ID_INCONNU_" + new Date().getTime();

  return template.evaluate()
    .setTitle('Assistant Piluleur ELS')
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Fonction appellee par le client (Vue_Piluleur.html) lors d'un clic.
 * Enregistre l'action, la position et l'anomalie.
 * @param {string} imageId - ID de la livraison ou de l'image scannee.
 * @param {string} actionType - 'valid', 'missing', 'broken'.
 * @param {number} x - Coordonnée X.
 * @param {number} y - Coordonnée Y.
 */
function enregistrerActionPiluleur(imageId, actionType, x, y) {
  try {
    // Validation des entrees
    if (!imageId || !actionType) throw new Error("Donnees incompletes.");

    // Recuperation de l'objet Config global pour l'ID Spreadsheet
    // Si Config n'est pas defini dans ce contexte, on lance une erreur explicite
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
      // Creation de secours si l'onglet n'existe pas (Securite)
      sheet = ss.insertSheet(PILULEUR_CONFIG.SHEET_LOGS_NAME);
      sheet.appendRow(["Timestamp", "Utilisateur", "Action", "Statut", "Details"]);
    }

    var userEmail = Session.getActiveUser().getEmail();
    var timestamp = new Date();

    // Formatage du detail pour le log
    var details = JSON.stringify({
      module: "PILULEUR",
      image_ref: imageId,
      coords: { x: x, y: y },
      anomalie: actionType
    });

    // Ecriture dans les logs (Format standard ELS : Timestamp, User, Action, Statut, Details)
    sheet.appendRow([
      timestamp,
      userEmail,
      "ANNOTATION_PILULEUR",
      actionType.toUpperCase(),
      details
    ]);

    // Trace silencieuse vers Resideur pour l'auto-apprentissage (ne bloque jamais).
    try {
      surveiller('enregistrerActionPiluleur');
      signalerAuPiluleur(details);
    } catch (_err) {}

    return "Succes : Annotation enregistree.";

  } catch (e) {
    console.error("Erreur enregistrerActionPiluleur : " + e.message);
    // On ne renvoie pas l'erreur stack trace complete au client pour securite
    throw new Error("Erreur lors de l'enregistrement : " + e.message);
  }
}

/**
 * Nouvelle fonction pour gerer les requetes du chatbot contextuel.
 * Exposee au client via google.script.run.
 * @param {object} request - L'objet contenant le message et le contexte.
 * @returns {object} Une reponse textuelle simple.
 */
function processChatRequest(request) {
  try {
    // Validation simple de la requete
    if (!request || !request.message || !request.context) {
      throw new Error("Requete invalide.");
    }

    var message = request.message;
    var context = request.context;
    var responseText = "";

    // Log de la requete pour le debogage
    Logger.log("Nouveau message Piluleur: [Contexte: " + context + "] Message: '" + message + "'");

    // Logique de reponse simulee basee sur le contexte
    switch (context) {
      case 'Reservation':
      case 'R\u00e9servation':
        responseText = "Le contexte 'Reservation' est bien recu. Dans cette section, vous pouvez planifier une nouvelle tournee ou modifier une reservation existante. Quelle est votre question precise ?";
        break;
      case 'Facturation':
        responseText = "Je vois que vous etes dans la section 'Facturation'. Vous pouvez ici consulter l'historique ou generer une nouvelle facture. Avez-vous besoin d'aide pour une action specifique ?";
        break;
      case 'Client':
        responseText = "Le contexte 'Client' a ete identifie. Cette interface vous permet de gerer les fiches de vos clients. Que souhaitez-vous faire ?";
        break;
      default:
        if (context && context.indexOf('Champ :') === 0) {
          responseText = "Je vois que vous cliquez sur le champ '" + context.substring(7) + "'. Je peux vous aider a comprendre a quoi il sert ou comment le remplir.";
        } else {
          responseText = "Je suis l'assistant ELS. Votre question dans le contexte '" + context + "' a bien ete recue. Pour l'instant, mes capacites sont en cours de developpement, mais je note votre demande.";
        }
        break;
    }

    // Trace silencieuse vers Resideur pour l'auto-apprentissage.
    try {
      surveiller('processChatRequest');
      signalerAuPiluleur(JSON.stringify({ context: context, message: message, responseText: responseText }));
    } catch (_err) {}

    // Simuler un petit delai pour le realisme
    Utilities.sleep(500);

    return { text: responseText };

  } catch (e) {
    console.error("Erreur dans processChatRequest: " + e.message);
    // Renvoyer une erreur claire au client
    throw new Error("L'assistant a rencontre un probleme. Veuillez reessayer plus tard.");
  }
}
