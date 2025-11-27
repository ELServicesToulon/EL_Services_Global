/**
 * @file assistant.js
 * @description Module de communication avec l'API Google Gemini pour l'assistant IA d'EL Services.
 * @version 2.0.0
 * @lead_developer_commentaires Ce refactoring complet vise à corriger l'erreur 404 en utilisant un modèle et un endpoint valides,
 * tout en simplifiant la logique et en renforçant la gestion des erreurs. La structure a été
 * clarifiée autour d'une fonction unique 'askAssistant' pour une meilleure maintenabilité.
 */

/**
 * @const {string} SYSTEM_PROMPT - Le prompt système définissant le rôle et le comportement de l'assistant IA.
 */
const SYSTEM_PROMPT = `Tu es un assistant IA spécialisé dans la logistique pour l'entreprise EL Services, basée à Toulon, France.
Ton unique rôle est de fournir des réponses précises, concises et factuelles concernant les tournées de livraison, la gestion des stocks de matériel médical, et la planification des interventions pour les officines et EHPAD partenaires.
Ne dévie jamais de ce rôle. Ne fournis aucune information personnelle, opinion, ou donnée non pertinente à la logistique d'EL Services.
Adresse-toi à l'utilisateur de manière professionnelle et directe. Tes réponses doivent être structurées et faciles à lire.`;

/**
 * @const {string} GEMINI_MODEL - Le modèle Gemini à utiliser.
 */
const GEMINI_MODEL = 'gemini-1.5-flash';

/**
 * @const {string} API_ENDPOINT - L'URL de l'API Gemini pour le modèle spécifié.
 */
const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * Interroge l'assistant IA Gemini avec une question et un contexte de conversation.
 *
 * @param {string} query La question posée par l'utilisateur.
 * @param {Array<{role: string, content: string}>} [context] Un tableau d'objets représentant l'historique de la conversation. Chaque objet doit avoir une propriété 'role' ('user' ou 'assistant') et 'content'.
 * @returns {string} La réponse texte de l'assistant.
 * @throws {Error} Si la clé API est manquante, si la requête échoue, ou si la réponse de l'API est malformée.
 */
function askAssistant(query, context) {
  if (!query || typeof query !== 'string' || query.trim() === '') {
    throw new Error("La requête ('query') ne peut pas être vide.");
  }

  let apiKey;
  try {
    apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error("La clé API 'GEMINI_API_KEY' n'est pas configurée dans les Script Properties.");
    }
  } catch (e) {
    Logger.log(`[askAssistant] Erreur lors de la récupération de la clé API : ${e.message}`);
    throw new Error(`Impossible de récupérer la clé API. Détails : ${e.message}`);
  }

  const history = (context || [])
    .filter(msg => msg && msg.role && msg.content)
    .map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{
        text: msg.content
      }],
    }));

  const contents = [
    ...history, {
      role: 'user',
      parts: [{
        text: query
      }],
    },
  ];

  const requestBody = {
    contents: contents,
    systemInstruction: {
      role: 'system',
      parts: [{
        text: SYSTEM_PROMPT
      }],
    },
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2048,
    },
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(requestBody),
    muteHttpExceptions: true,
  };

  try {
    const fullUrl = `${API_ENDPOINT}?key=${apiKey}`;
    const response = UrlFetchApp.fetch(fullUrl, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    if (responseCode === 200) {
      const data = JSON.parse(responseBody);
      if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
        return data.candidates[0].content.parts[0].text;
      } else {
        Logger.log(`[askAssistant] Réponse API valide mais contenu inattendu : ${responseBody}`);
        throw new Error("La réponse de l'assistant est vide ou malformée.");
      }
    } else {
      Logger.log(`[askAssistant] Erreur HTTP ${responseCode}: ${responseBody}`);
      throw new Error(`L'API Gemini a retourné une erreur (HTTP ${responseCode}). Consultez les logs pour plus de détails.`);
    }
  } catch (e) {
    Logger.log(`[askAssistant] Exception lors de l'appel à UrlFetchApp : ${e.message} - Stack: ${e.stack}`);
    throw new Error(`Échec de la communication avec l'API Gemini. Détails : ${e.message}`);
  }
}