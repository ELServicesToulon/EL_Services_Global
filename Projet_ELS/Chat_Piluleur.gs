// =================================================================
//                 CHAT PILULEUR (BACKEND UNIFIÉ)
// =================================================================

// Configuration stable pour la prod
const GEMINI_MODEL_ID = 'gemini-1.5-flash-002'; // Version stable "pinned"
const CHAT_SHEET_NAME = 'Chat_History'; // Assure-toi que cet onglet existe

/**
 * Affiche l'interface du Chat Piluleur (WebApp ou Iframe)
 */
function renderChatPiluleur() {
  return HtmlService.createTemplateFromFile('Chat_Piluleur_Interface')
    .evaluate()
    .setTitle('Assistant EL Services')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Point d'entrée principal appelé par le Front-end
 * @param {string} userMessage - Le message de l'utilisateur
 * @param {Array} history - Historique de la session locale (optionnel)
 */
function processChatRequest(data) {
  try {
    const userMessage = data.message;
    const context = data.context || 'Général';

    // 1. Récupération de la clé API
    const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    if (!apiKey) return { text: "Erreur : Clé API Gemini non configurée." };

    // 2. Définition du Prompt Système (Ton Commercial & Logistique)
    const systemPrompt = `
      Rôle : Tu es "EL-Assistant", l'IA logistique de EL Services à Toulon.
      Utilisateur : Un professionnel de santé (Infirmier, Pharmacien).
      Contexte actuel de l'utilisateur : ${context}.

      Tes Objectifs Prioritaires :
      1. Aider à la prise de créneaux de livraison.
      2. INCITATION (Upsell) : Si on parle de course simple, propose un arrêt supplémentaire.
      3. LOGISTIQUE INVERSE : Propose systématiquement le "Retour Pharmacie" (glacières, ordonnances) à la fin d'une demande.

      Règles :
      - Réponse courte (max 3 phrases).
      - Ton professionnel et serviable.
      - Si tu as besoin d'une date ou d'une heure, demande-la.
    `;

    // 3. Construction de l'appel API
    const payload = {
      "contents": [
        { "role": "user", "parts": [{ "text": systemPrompt }] }, // Injection du système comme premier message user (astuce v1beta)
        { "role": "model", "parts": [{ "text": "Bien reçu. Je suis prêt à optimiser la logistique." }] },
        { "role": "user", "parts": [{ "text": userMessage }] }
      ],
      "generationConfig": {
        "temperature": 0.3,
        "maxOutputTokens": 350
      }
    };

    // 4. Appel UrlFetch
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_ID}:generateContent?key=${apiKey}`;
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(response.getContentText());

    if (json.candidates && json.candidates.length > 0) {
      const aiText = json.candidates[0].content.parts[0].text;

      // (Optionnel) Sauvegarder dans le Spreadsheet ici via une fonction logChat()
      logChatToSheet(userMessage, aiText);

      return { text: aiText };
    } else {
      return { text: "Désolé, je rencontre une surcharge momentanée." };
    }

  } catch (e) {
    Logger.log("Erreur Gemini: " + e.toString());
    return { text: "Erreur technique : " + e.message };
  }
}

/**
 * Sauvegarde simple dans un onglet (remplace la complexité de Chat.js)
 */
function logChatToSheet(userMsg, botMsg) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(CHAT_SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(CHAT_SHEET_NAME);
      sheet.appendRow(['Date', 'User', 'Bot']);
    }
    sheet.appendRow([new Date(), userMsg, botMsg]);
  } catch(e) {
    // Fail silently pour ne pas bloquer le chat
  }
}
