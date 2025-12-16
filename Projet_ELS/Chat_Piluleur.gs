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
 * @param {object} data - Contient {message, context, history}
 */
function processChatRequest(data) {
  try {
    const userMessage = data.message;
    const context = data.context || 'Général';
    const history = data.history || []; // Tableau d'objets {role: 'user'|'model', text: '...'}

    // 1. Construction de l'historique conversationnel pour le prompt (Contexte glissant)
    // On garde les 10 derniers échanges pour avoir le contexte sans exploser les tokens
    const recentHistory = history.slice(-10).map(h => `${h.role === 'user' ? 'Utilisateur' : 'Assistant'} : ${h.text}`).join('\n');

    // 2. Définition du Prompt Système (Amélioré avec détection d'intention)
    const systemPrompt = `
      Rôle : Tu es "EL-Assistant", l'IA logistique de EL Services à Toulon.
      Ton but est d'assister les pharmaciens/infirmiers.
      
      Contexte actuel : ${context}.
      
       RÈGLES CRITIQUES :
       1. CONTEXTE : Tu DOIS prendre en compte l'historique de la conversation ci-dessous. Si l'utilisateur a déjà donné une date ou une heure, NE LA RE-DEMANDE PAS.
       2. ACTION : Dès que l'utilisateur exprime clairement une intention de commande/réservation (même incomplète) ou s'il donne des détails (date, heure, nombre de caisses), tu DOIS proposer d'ouvrir le formulaire.
       3. ANTI-REPETITION : Si l'historique montre que tu viens de proposer d'ouvrir le formulaire et que l'utilisateur répond "ok", "merci" ou confirme, NE RENVOIE PAS l'action d'ouverture. Contente-toi de demander si tout s'est bien passé ou s'il a besoin d'autre chose.
       4. FORMAT DE RÉPONSE :
          - Si tu as assez d'infos pour une réservation (ou si l'utilisateur le demande) ET que tu ne l'as pas fait au message précédent, ta réponse doit UNIQUEMENT contenir un objet JSON valide :
            {"action": "open_reservation_modal", "text": "J'ouvre le formulaire pour vous.", "prefill": {"date": "...", "time": "...", "details": "..."}}
          - Sinon, réponds simplement en texte pour demander les précisions manquantes.
      
      Historique de conversation :
      ${recentHistory}
      
      Dernier message utilisateur : "${userMessage}"
      
      Réponds maintenant (Texte simple OU JSON finissant par } ):
    `;

    // 3. Appel standardisé via Gemini_Core
    // On passe un prompt combiné car callGeminiFlash attend un userPrompt string.
    const fullResponse = callGeminiFlash(systemPrompt, `(Voir historique ci-dessus) Réponds à : ${userMessage}`, 0.4);
    
    // 4. Analyse de la réponse (JSON detection)
    let finalResponse = { text: fullResponse, action: null };
    
    // Tentative de parsing JSON si la réponse ressemble à un objet
    if (fullResponse.trim().startsWith('{') && fullResponse.trim().endsWith('}')) {
      try {
        const parsed = JSON.parse(fullResponse.trim());
        finalResponse.text = parsed.text || "Action en cours...";
        finalResponse.action = parsed.action;
        finalResponse.data = parsed.prefill;
      } catch (e) {
        // Fallback si le JSON est malformé, on garde le texte brut
        Logger.log("Failed to parse AI JSON: " + e.toString());
      }
    } else {
        // Nettoyage Markdown éventuel du JSON
        const jsonMatch = fullResponse.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch && jsonMatch[1]) {
             try {
                const parsed = JSON.parse(jsonMatch[1]);
                finalResponse.text = parsed.text || "Action en cours...";
                finalResponse.action = parsed.action;
                finalResponse.data = parsed.prefill;
             } catch(e) {}
        }
    }

    // 5. Sauvegarde
    if (!finalResponse.text.startsWith("Erreur IA")) {
       logChatToSheet(userMessage, finalResponse.text);
    }

    return finalResponse;

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
