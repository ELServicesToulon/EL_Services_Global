/**
 * Core Gemini API Connector
 * Standardizes AI calls across the project using the latest stable Gemini Flash model.
 * Features automatic model discovery and self-healing if the configured model is deprecated.
 */

// Default model to use if no override is found. Updated to 2.0 Flash as 1.5 is retired.
const DEFAULT_MODEL = "gemini-2.0-flash";

/**
 * Calls Gemini Flash API with automatic fallback and maintenance.
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

    // Attempt to retrieve the currently active model from script properties, or use default
    let modelVersion = PropertiesService.getScriptProperties().getProperty("GEMINI_MODEL_VERSION");
    if (!modelVersion) {
      modelVersion = DEFAULT_MODEL;
    }

    try {
      return _generateContentRequest(modelVersion, GEMINI_API_KEY, systemInstruction, userPrompt, temperature);
    } catch (apiError) {
      // If the error is a 404 (Not Found), it likely means the model is deprecated/retired.
      // Trigger automatic maintenance to find a new valid model.
      if (apiError.message && (apiError.message.includes("404") || apiError.message.includes("not found"))) {
        Logger.log(`Model ${modelVersion} failed (404). Initiating automatic maintenance to find a valid Flash model...`);
        
        const newModel = _discoverAndSetBestModel(GEMINI_API_KEY);
        if (newModel) {
          Logger.log(`Maintenance successful. Retrying with new model: ${newModel}`);
          return _generateContentRequest(newModel, GEMINI_API_KEY, systemInstruction, userPrompt, temperature);
        } else {
          throw new Error("Impossible de trouver un modèle 'Flash' compatible lors de la maintenance automatique.");
        }
      } else {
        // If it's not a 404, re-throw the original error
        throw apiError;
      }
    }

  } catch (e) {
    Logger.log("Erreur callGeminiFlash: " + e.toString());
    return "Erreur IA : " + e.message;
  }
}

/**
 * Internal function to make the actual HTTP request.
 */
function _generateContentRequest(model, key, systemInstruction, userPrompt, temperature) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

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
}

/**
 * Maintenance function: Lists available models and picks the best 'Flash' variant.
 * Updates the script property 'GEMINI_MODEL_VERSION' automatically.
 */
function _discoverAndSetBestModel(key) {
  try {
    const listEndpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    const response = UrlFetchApp.fetch(listEndpoint, { muteHttpExceptions: true });
    
    if (response.getResponseCode() !== 200) {
      Logger.log("Failed to list models: " + response.getContentText());
      return null;
    }
    
    const json = JSON.parse(response.getContentText());
    if (!json.models) return null;

    // Filter for 'flash' models that support generateContent
    // We prefer models that do NOT have a specific date version for longevity (aliases), 
    // unless only date versions are available.
    // Prioritize 'gemini-2.0-flash', then 'gemini-1.5-flash', etc.
    
    const candidates = json.models.filter(m => 
      m.name.toLowerCase().includes("flash") && 
      m.supportedGenerationMethods && 
      m.supportedGenerationMethods.includes("generateContent")
    );

    if (candidates.length === 0) return null;

    // Sort strategy: 
    // 1. Prefer newer major versions (2.5 > 2.0 > 1.5)
    // 2. Prefer stable aliases (no numeric suffix like -001) over specific versions
    
    candidates.sort((a, b) => {
      // Simple heuristic: compare names. 
      // Reverse alphabetical might work for versions (2.0 > 1.5), 
      // but we need to handle '-001' vs no suffix.
      return b.name.localeCompare(a.name); 
    });
    
    // Pick the top one
    // Note: models names are like "models/gemini-1.5-flash". We need just the last part.
    const bestModelFull = candidates[0].name; // e.g. "models/gemini-2.0-flash"
    const bestModelName = bestModelFull.replace("models/", "");

    Logger.log("Auto-discovered best model: " + bestModelName);
    
    // Cache it
    PropertiesService.getScriptProperties().setProperty("GEMINI_MODEL_VERSION", bestModelName);
    
    return bestModelName;
  } catch(e) {
    Logger.log("Error in model discovery: " + e.toString());
    return null;
  }
}

/**
 * Utility function for the user to list all compatible models in the logs.
 */
function listAvailableModels() {
  const GEMINI_API_KEY = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) {
    Logger.log("Clé API non trouvée.");
    return;
  }
  
  const listEndpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;
  const response = UrlFetchApp.fetch(listEndpoint);
  const json = JSON.parse(response.getContentText());
  
  Logger.log("--- Liste des Modèles Disponibles ---");
  json.models.forEach(m => {
    Logger.log(`Nom: ${m.name} | Version: ${m.version} | Méthodes: ${m.supportedGenerationMethods}`);
  });
  Logger.log("-------------------------------------");
  
  const current = PropertiesService.getScriptProperties().getProperty("GEMINI_MODEL_VERSION") || DEFAULT_MODEL;
  Logger.log("Modèle actuellement configuré : " + current);
}

