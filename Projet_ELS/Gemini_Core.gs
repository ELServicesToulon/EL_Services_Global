/**
 * Core Gemini API Connector
 * Standardizes AI calls across the project using Gemini 1.5 Flash.
 */

/**
 * Calls Gemini 1.5 Flash API.
 * @param {string} systemInstruction - The system prompt/role definition.
 * @param {string} userPrompt - The user's input message.
 * @param {number} [temperature=0.3] - Creativity (0.0 to 1.0). Default 0.3.
 * @return {string} The AI generated text response.
 */
function callGeminiFlash(systemInstruction, userPrompt, temperature) {
  try {
    const GEMINI_API_KEY = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("Clé API Gemini non configurée (GEMINI_API_KEY).");
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-001:generateContent?key=${GEMINI_API_KEY}`;

    const payload = {
      "contents": [
        {
          "role": "user",
          "parts": [{ "text": userPrompt }]
        }
      ],
      "generationConfig": {
        "temperature": temperature !== undefined ? temperature : 0.3
      }
    };

    // Use the native systemInstruction field if provided
    if (systemInstruction) {
      payload.systemInstruction = {
        "parts": [{ "text": systemInstruction }]
      };
    }

    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(endpoint, options);
    const responseCode = response.getResponseCode();
    const json = JSON.parse(response.getContentText());

    if (responseCode !== 200) {
       const errorMsg = json.error ? json.error.message : response.getContentText();
       throw new Error(`Erreur API (${responseCode}): ${errorMsg}`);
    }

    if (json.candidates && json.candidates.length > 0 && json.candidates[0].content && json.candidates[0].content.parts) {
      return json.candidates[0].content.parts[0].text;
    } else {
      return "Désolé, l'IA n'a pas renvoyé de contenu.";
    }

  } catch (e) {
    Logger.log("Erreur callGeminiFlash: " + e.toString());
    return "Erreur IA : " + e.message;
  }
}
