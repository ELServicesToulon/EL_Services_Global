// =================================================================
//                 CHAT PILULEUR (BACKEND UNIFIÉ)
// =================================================================

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

    // 1. Définition du Prompt Système (Ton Commercial & Logistique)
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

    // 2. Appel standardisé via Gemini_Core
    const aiText = callGeminiFlash(systemPrompt, userMessage, 0.3);

    // 3. Sauvegarde (Optionnel)
    // On ne loggue pas les erreurs techniques explicites renvoyées par le connecteur (commencent par "Erreur IA")
    if (!aiText.startsWith("Erreur IA")) {
       logChatToSheet(userMessage, aiText);
    }

    return { text: aiText };

  } catch (e) {
    Logger.log("Erreur processChatRequest: " + e.toString());
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
