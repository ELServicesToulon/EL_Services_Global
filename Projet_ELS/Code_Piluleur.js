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

    var rawMessage = request.message;
    var rawContext = request.context;

    // Assainissement basique pour eviter les injections ou messages vides
    var message = (typeof sanitizeMultiline === 'function')
      ? sanitizeMultiline(rawMessage, 800)
      : String(rawMessage || '').trim();
    var context = (typeof sanitizeMultiline === 'function')
      ? sanitizeMultiline(rawContext, 120)
      : String(rawContext || '').trim();

    if (!message) {
      throw new Error("Message vide.");
    }

    var responseText = "";

    // Log de la requete pour le debogage
    Logger.log("Nouveau message Piluleur: [Contexte: " + context + "] Message: '" + message + "'");

    // Reponse par defaut si l'IA n'est pas disponible
    var fallbackResponse;
    switch (context) {
      case 'Reservation':
      case 'R\u00e9servation':
        fallbackResponse = "Le contexte 'Reservation' est bien recu. Dans cette section, vous pouvez planifier une nouvelle tournee ou modifier une reservation existante. Quelle est votre question precise ?";
        break;
      case 'Facturation':
        fallbackResponse = "Je vois que vous etes dans la section 'Facturation'. Vous pouvez ici consulter l'historique ou generer une nouvelle facture. Avez-vous besoin d'aide pour une action specifique ?";
        break;
      case 'Client':
        fallbackResponse = "Le contexte 'Client' a ete identifie. Cette interface vous permet de gerer les fiches de vos clients. Que souhaitez-vous faire ?";
        break;
      default:
        if (context && context.indexOf('Champ :') === 0) {
          fallbackResponse = "Je vois que vous cliquez sur le champ '" + context.substring(7) + "'. Je peux vous aider a comprendre a quoi il sert ou comment le remplir.";
        } else {
          fallbackResponse = "Je suis l'assistant ELS. Votre question dans le contexte '" + context + "' a bien ete recue. Pour l'instant, mes capacites sont en cours de developpement, mais je note votre demande.";
        }
        break;
    }

    // Tentative d'appel Gemini pour une reponse contextuelle
    var aiResult = null;
    try {
      var contextMessages = [];
      // On ne pousse pas le contexte ici comme message 'assistant' car cela briserait l'alternance User/Model attendue par Gemini.
      // Le contexte est deja inclus dans le prompt utilisateur ci-dessous.

      var prompt = [
        `Tu es l'assistant virtuel intelligent d'EL Services (ELS), intégré à l'application "Le Piluleur".`,
        `Ton rôle est d'assister les utilisateurs, souvent des professionnels ou des clients logistiques, dans la gestion de leurs réservations.`,
        ``,
        `CONTEXTE VISUEL DE L'UTILISATEUR :`,
        `L'utilisateur a sous les yeux un calendrier sous forme de grille.`,
        `- Chaque jour est représenté par une "pilule" (forme de gélule).`,
        `- Les pilules bleues indiquent des jours sélectionnés ou actifs.`,
        `- Les pilules grises indiquent des jours inactifs, passés ou non disponibles.`,
        `- À droite se trouve le "Panier de réservation" récapitulatif.`,
        ``,
        `TES OBJECTIFS PRINCIPAUX :`,
        `1. **Aide à la Réservation** : Guider l'utilisateur pour sélectionner des jours. Explique qu'il suffit de cliquer sur une pilule pour l'ajouter au panier.`,
        `2. **Arrêts Supplémentaires** : Si l'utilisateur mentionne des "arrêts", "détours" ou "livraisons extra", explique comment les ajouter aux créneaux existants via l'interface (simulée).`,
        `3. **Support Technique** : Répondre aux questions sur le fonctionnement du panier, la validation de la commande, ou la connexion au compte.`,
        ``,
        `RÈGLES DE CONVERSATION :`,
        `- Ton ton doit être professionnel, courtois, et concis.`,
        `- Tu parles français.`,
        `- Si l'utilisateur est bloqué, propose-lui de "cliquer sur une zone de l'écran" pour que tu puisses contextualiser (phrase type de l'interface).`,
        `- Ne jamais inventer de fausses données de facturation. Réfère-toi toujours au "Panier".`,
        ``,
        `Contexte UI Actuel : ` + context,
        `Question Utilisateur : ` + message
      ].join("\n");
      aiResult = callGemini(contextMessages, prompt);
    } catch (aiErr) {
      Logger.log("processChatRequest - erreur appel Gemini : " + aiErr);
    }

    if (aiResult && aiResult.ok === true && aiResult.message) {
      responseText = aiResult.message;
    } else {
      // Fallback statique si Gemini indisponible
      var reason = aiResult && aiResult.reason ? aiResult.reason : "API_ERROR";
      Logger.log("processChatRequest - fallback assistant (raison: " + reason + ")");
      responseText = fallbackResponse;
    }

    // Trace silencieuse vers Resideur pour l'auto-apprentissage.
    try {
      surveiller('processChatRequest');
      signalerAuPiluleur(JSON.stringify({ context: context, message: message, responseText: responseText }));
    } catch (_err) {}

    // Simuler un petit delai pour le realisme
    Utilities.sleep(500);

    return {
      text: responseText,
      source: aiResult && aiResult.ok === true ? 'gemini' : 'fallback',
      reason: aiResult && aiResult.reason ? aiResult.reason : null
    };

  } catch (e) {
    console.error("Erreur dans processChatRequest: " + e.message);
    // Renvoyer une erreur claire au client
    throw new Error("L'assistant a rencontre un probleme. Veuillez reessayer plus tard.");
  }
}
