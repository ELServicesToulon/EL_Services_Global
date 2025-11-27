/**
 * @fileoverview Module Assistant IA (Gemini) pour EL Services.
 * Gère les interactions intelligentes pour le back-office et le chat.
 * Version: 2.0 (Gemini 1.5 Flash / v1beta)
 */

// =================================================================
//                 INTEGRATION ASSISTANT GEMINI
// =================================================================

// Configuration du Modèle (Mise à jour v1beta / 1.5 Flash)
const GEMINI_API_VERSION = 'v1beta';
const CHAT_ASSISTANT_MODEL = 'gemini-1.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/${GEMINI_API_VERSION}/models/${CHAT_ASSISTANT_MODEL}:generateContent`;

// Configuration du comportement
const CHAT_ASSISTANT_HISTORY_LIMIT = 10;
const CHAT_ASSISTANT_SYSTEM_PROMPT = `
RÔLE: Tu es l'Assistant Virtuel de "EL Services" (Logistique Santé à Toulon).
CONTEXTE: Livraison de médicaments en EHPAD et Pharmacies.
RÈGLES:
- Réponses concises, professionnelles et directes.
- Pas de blabla inutile.
- Ne jamais inventer de données personnelles.
- Si incertain, proposer de contacter l'administrateur (Emmanuel).
`.trim();

const CHAT_ASSISTANT_DEFAULT_VISIBILITY = 'pharmacy';
const CHAT_ASSISTANT_DEFAULT_TEMPERATURE = 0.3;
const CHAT_ASSISTANT_MAX_RETRIES = 3;
const CHAT_ASSISTANT_BACKOFF_MS = 1000;
const CHAT_ASSISTANT_USAGE_PREFIX = 'assistant_tokens:';

// =================================================================
//                      FONCTIONS PRINCIPALES
// =================================================================

/**
 * Appelle l'API Gemini (v1beta) avec le contexte fourni.
 * @param {Array<{role:string, content:string}>} contextMessages - Historique de la conversation.
 * @param {string} userPrompt - La question actuelle de l'utilisateur.
 * @param {Object} [opts] - Options (retries, backoff).
 * @returns {{ok:boolean, reason?:string, message?:string, usage?:Object}}
 */
function callGemini(contextMessages, userPrompt, opts) {
  if (!isAssistantFeatureEnabled_()) {
    return { ok: false, reason: 'UNCONFIGURED' };
  }

  // 1. Préparation et nettoyage du prompt
  const promptChunk = sanitizeMultiline(userPrompt, 2000); // 1.5 Flash supporte plus de contexte
  const safePrompt = scrubChatMessage_(promptChunk);

  if (!safePrompt) {
    console.warn('[callGemini] Prompt vide après nettoyage.');
    return { ok: false, reason: 'EMPTY_MESSAGE' };
  }

  // 2. Récupération Clé API
  let apiKey = '';
  try {
    apiKey = getSecret('GEMINI_API_KEY');
    if (!apiKey) {
      // Fallback direct sur PropertiesService si getSecret échoue ou renvoie vide
      apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    }
  } catch (err) {
    console.error('[callGemini] Erreur récupération clé API', err);
    return { ok: false, reason: 'UNCONFIGURED' };
  }

  if (!apiKey) {
    console.error('[callGemini] Clé GEMINI_API_KEY introuvable.');
    return { ok: false, reason: 'UNCONFIGURED' };
  }

  // 3. Vérification du budget (Optionnel)
  const limit = Number(typeof CFG_ASSISTANT_MONTHLY_BUDGET_TOKENS !== 'undefined' ? CFG_ASSISTANT_MONTHLY_BUDGET_TOKENS : 0);
  const usageKey = getAssistantUsageKey_();
  const currentUsage = readAssistantUsage_(usageKey);
  if (limit > 0 && currentUsage >= limit) {
    return { ok: false, reason: 'BUDGET_EXCEEDED' };
  }

  // 4. Construction de l'historique (Format v1beta)
  const formattedContents = [];

  // Historique
  if (Array.isArray(contextMessages)) {
    for (let i = 0; i < contextMessages.length; i++) {
      const msg = contextMessages[i];
      if (!msg || !msg.content) continue;

      const role = String(msg.role || '').toLowerCase() === 'assistant' ? 'model' : 'user';
      const chunk = sanitizeMultiline(msg.content, 2000);
      const cleaned = scrubChatMessage_(chunk);

      if (cleaned) {
        formattedContents.push({
          role: role,
          parts: [{ text: cleaned }]
        });
      }
    }
  }

  // Message actuel
  formattedContents.push({
    role: 'user',
    parts: [{ text: safePrompt }]
  });

  // 5. Payload JSON pour Gemini 1.5 (v1beta)
  const requestBody = {
    contents: formattedContents,
    systemInstruction: {
      parts: [{ text: CHAT_ASSISTANT_SYSTEM_PROMPT }]
    },
    generationConfig: {
      temperature: CHAT_ASSISTANT_DEFAULT_TEMPERATURE,
      maxOutputTokens: 1000
    }
  };

  // 6. Exécution avec Retries
  const options = opts || {};
  const maxRetries = Math.max(1, Number(options.maxRetries) || CHAT_ASSISTANT_MAX_RETRIES);
  const backoffBase = Math.max(0, Number(options.backoffMs) || CHAT_ASSISTANT_BACKOFF_MS);

  let lastError = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const url = `${GEMINI_API_URL}?key=${apiKey}`;
      const response = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(requestBody),
        muteHttpExceptions: true
      });

      const responseCode = response.getResponseCode();
      const responseText = response.getContentText();

      // Succès
      if (responseCode === 200) {
        let parsed;
        try {
          parsed = JSON.parse(responseText);
        } catch (parseErr) {
          console.error('[callGemini] Erreur parsing JSON', parseErr);
          return { ok: false, reason: 'API_ERROR' };
        }

        // Extraction de la réponse
        const candidate = parsed.candidates && parsed.candidates[0];
        const contentPart = candidate && candidate.content && candidate.content.parts && candidate.content.parts[0];
        const rawMessage = contentPart ? contentPart.text : null;

        if (!rawMessage) {
          console.error('[callGemini] Réponse vide ou bloquée par la sécurité.', parsed);
          return { ok: false, reason: 'BLOCKED' };
        }

        const assistantText = scrubChatMessage_(sanitizeMultiline(rawMessage, 2000));

        // Mise à jour usage
        const usage = parsed.usageMetadata || {};
        const totalTokens = Number(usage.totalTokenCount) || 0;
        writeAssistantUsage_(usageKey, currentUsage + totalTokens);

        return {
          ok: true,
          message: assistantText,
          usage: usage
        };
      }

      // Gestion des erreurs HTTP
      if (responseCode === 429 || responseCode >= 500) {
        // Erreur temporaire -> Retry
        console.warn(`[callGemini] Retry ${attempt + 1}/${maxRetries} après erreur HTTP ${responseCode}`);
        lastError = `HTTP ${responseCode}`;
      } else {
        // Erreur fatale (400, 403, 404, etc.)
        console.error(`[callGemini] Erreur fatale HTTP ${responseCode}: ${responseText}`);
        return { ok: false, reason: 'API_ERROR', message: `Erreur API (${responseCode})` };
      }

    } catch (err) {
      console.error('[callGemini] Exception fetch', err);
      lastError = err.toString();
    }

    // Attente avant retry
    if (attempt < maxRetries - 1) {
      Utilities.sleep(backoffBase * Math.pow(2, attempt));
    }
  }

  return { ok: false, reason: 'API_ERROR', message: "L'assistant ne répond pas." };
}

/**
 * Point d'entrée pour le Menu Sheets : Répond à une question dans l'onglet Chat.
 * @param {number} row - L'index de la ligne contenant la question.
 * @returns {string} La réponse générée.
 */
function askAssistant(row) {
  try {
    const ss = getMainSpreadsheet();
    const chatSheet = getChatSheet(ss);
    const lastRow = chatSheet.getLastRow();

    // Validation de la ligne cible
    const targetRow = getAssistantTargetRow_(row, chatSheet, lastRow);
    if (targetRow < 2) {
      throw new Error("Impossible de trouver une question valide (Ligne trop haute).");
    }

    const rowValues = chatSheet.getRange(targetRow, 1, 1, 9).getValues()[0];
    const status = String(rowValues[7] || '').toLowerCase();

    if (status && status !== 'active') {
      throw new Error('La ligne sélectionnée est archivée ou inactive.');
    }

    const question = scrubChatMessage_(rowValues[5]);
    if (!question) {
      throw new Error('La ligne sélectionnée ne contient pas de question exploitable.');
    }

    if (!isAssistantFeatureEnabled_()) {
      throw new Error('La fonctionnalité Assistant est désactivée dans la configuration.');
    }

    // Reconstruction du Thread ID
    let threadId = sanitizeChatThreadId(rowValues[1] || '');
    if (!threadId) {
      // Tentative de déduction
      const authorRef = String(rowValues[3] || '');
      if (authorRef.startsWith('CLIENT_')) {
        threadId = 'THR_' + authorRef;
      } else {
        threadId = CHAT_THREAD_GLOBAL;
      }
    }
    const safeThread = sanitizeChatThreadId(threadId) || CHAT_THREAD_GLOBAL;

    // Contexte et Appel
    const contextMessages = buildAssistantContext_(chatSheet, targetRow, safeThread, CHAT_ASSISTANT_HISTORY_LIMIT);
    const aiResult = callGemini(contextMessages, question);

    if (!aiResult.ok) {
      throw new Error(`Assistant indisponible : ${aiResult.reason}`);
    }

    const assistantAnswer = aiResult.message || "Désolé, je n'ai pas pu générer de réponse.";
    const assistantSessionId = buildAssistantSessionId_(safeThread);

    // Publication de la réponse
    const payload = {
      authorType: 'assistant',
      authorPseudo: 'Gemini',
      message: assistantAnswer,
      visibleTo: CHAT_ASSISTANT_DEFAULT_VISIBILITY,
      threadId: safeThread,
      sessionId: assistantSessionId
    };

    const postResult = chatPostMessage(payload);
    if (!postResult.ok) {
      throw new Error(`Erreur sauvegarde réponse: ${postResult.reason}`);
    }

    return assistantAnswer;

  } catch (err) {
    console.error('[askAssistant] Erreur:', err);
    throw err;
  }
}

/**
 * Point d'entrée pour la WebApp : Chat en direct.
 * @param {{threadId?:string, question?:string, sessionId?:string, clientId?:string, clientEmail?:string, pharmacyCode?:string, skipUserPost?:boolean}} rawInput
 * @returns {Object} Résultat standardisé.
 */
function askAssistantOnThread(rawInput) {
  if (!isAssistantFeatureEnabled_()) {
    return { ok: false, reason: 'UNCONFIGURED' };
  }

  try {
    const input = rawInput || {};
    const skipUserPost = input.skipUserPost === true;

    // Nettoyage des entrées
    let safeThread = sanitizeChatThreadId(input.threadId || '');
    const safeSession = sanitizeScalar(input.sessionId || '', 64) || ('webapp:' + (safeThread || 'THREAD'));
    const baseQuestion = sanitizeMultiline(input.question, 1000);

    if (!baseQuestion) {
      return { ok: false, reason: 'EMPTY_MESSAGE' };
    }

    // Payload utilisateur
    const userPayload = {
      authorType: 'pharmacy',
      message: baseQuestion,
      threadId: safeThread,
      sessionId: safeSession,
      clientId: sanitizeScalar(input.clientId, 64),
      clientEmail: sanitizeEmail(input.clientEmail),
      pharmacyCode: sanitizePharmacyCode(input.pharmacyCode)
    };

    // Gestion du code pharmacie fallback
    if (!userPayload.clientId && !userPayload.clientEmail && !userPayload.pharmacyCode) {
      userPayload.pharmacyCode = sanitizePharmacyCode(computeAssistantFallbackCode_(safeSession));
    }

    let questionToAsk = baseQuestion;

    // Enregistrement du message utilisateur si nécessaire
    if (!skipUserPost) {
      const postResult = chatPostMessage(userPayload);
      if (!postResult.ok) {
        return { ok: false, reason: postResult.reason || 'ERROR_POSTING_USER' };
      }
      // On récupère le thread ID potentiellement créé/corrigé par chatPostMessage
      // Note: chatPostMessage ne retourne pas toujours le threadId, on assume qu'il respecte celui envoyé ou qu'on le retrouve.
      // Pour être sûr, si safeThread était vide, on devrait le résoudre avant.
      // Ici on simplifie : si safeThread était vide, on doit le deviner comme chatPostMessage l'a fait.
      if (!safeThread) {
         // Logique simplifiée de résolution identique à chatPostMessage pour retrouver le contexte
         safeThread = resolveChatThreadId_INTERNAL(userPayload);
      }
    } else if (!safeThread) {
      safeThread = resolveChatThreadId_INTERNAL(userPayload);
    }

    if (!safeThread) {
      // Fallback ultime
      safeThread = CHAT_THREAD_GLOBAL;
    }

    // Construction du contexte
    const contextMessages = buildAssistantThreadContext_(safeThread, CHAT_ASSISTANT_HISTORY_LIMIT);

    // Appel IA
    const aiResponse = callGemini(contextMessages, questionToAsk);

    if (!aiResponse.ok) {
      return { ok: false, reason: aiResponse.reason };
    }

    const assistantText = aiResponse.message || "Je n'ai pas de réponse.";

    // Enregistrement réponse Assistant
    const assistantPayload = {
      authorType: 'assistant',
      authorPseudo: 'Assistant',
      message: assistantText,
      visibleTo: CHAT_ASSISTANT_DEFAULT_VISIBILITY,
      threadId: safeThread,
      sessionId: buildAssistantSessionId_(safeThread)
    };

    const assistantPost = chatPostMessage(assistantPayload);
    if (!assistantPost.ok) {
      return { ok: false, reason: 'ERROR_POSTING_AI' };
    }

    // Retourne l'historique frais pour l'UI
    const history = buildAssistantHistorySnapshot_(safeThread, CHAT_ASSISTANT_HISTORY_LIMIT);

    return {
      ok: true,
      answer: assistantText,
      question: questionToAsk,
      threadId: safeThread,
      history: history,
      usage: aiResponse.usage || null
    };

  } catch (err) {
    console.error('[askAssistantOnThread] Exception:', err);
    return { ok: false, reason: 'EXCEPTION' };
  }
}

// =================================================================
//                      HELPER FUNCTIONS (INTERNES)
// =================================================================

/**
 * Résolution simple du Thread ID (copie locale de la logique de Chat.js pour éviter dépendance cyclique)
 */
function resolveChatThreadId_INTERNAL(payload) {
  if (payload.threadId && payload.threadId !== CHAT_THREAD_GLOBAL) return payload.threadId;
  // TODO: Idéalement, exposer une fonction publique dans Chat.js pour ça.
  // Pour l'instant, on renvoie une valeur par défaut safe si on ne peut pas deviner.
  return CHAT_THREAD_GLOBAL;
}

/**
 * Menu : Appeler l'assistant sur la ligne sélectionnée.
 */
function menuAskAssistant() {
  const ui = SpreadsheetApp.getUi();
  try {
    const activeSheet = SpreadsheetApp.getActiveSheet();
    if (!activeSheet || activeSheet.getSheetName() !== SHEET_CHAT) {
      ui.alert('Assistant Chat', "Veuillez sélectionner une ligne dans l'onglet '" + SHEET_CHAT + "'.", ui.ButtonSet.OK);
      return;
    }

    const activeRange = activeSheet.getActiveRange();
    if (!activeRange) {
      ui.alert('Assistant Chat', 'Aucune sélection.', ui.ButtonSet.OK);
      return;
    }

    const rowIndex = activeRange.getRow();
    const answer = askAssistant(rowIndex);

    ui.alert('Réponse Assistant', answer, ui.ButtonSet.OK);

  } catch (err) {
    ui.alert('Erreur Assistant', err.message, ui.ButtonSet.OK);
  }
}

// --- Fonctions de contexte (inchangées mais nettoyées) ---

function buildAssistantContext_(chatSheet, targetRow, threadId, limit) {
  const endRow = Math.max(2, targetRow - 1);
  if (endRow < 2) return [];

  // On remonte un peu plus loin pour trouver 'limit' messages valides
  const lookBack = limit * 3;
  const startRow = Math.max(2, endRow - lookBack);
  const rowCount = endRow - startRow + 1;

  const values = chatSheet.getRange(startRow, 1, rowCount, 8).getValues();
  const context = [];
  const safeThread = sanitizeChatThreadId(threadId);

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const currentThread = sanitizeChatThreadId(row[1]);

    // Filtrage strict par Thread
    if (safeThread && currentThread !== safeThread) continue;

    // Filtrage visibilité (on cache les discussions internes admin à l'IA contextuelle externe si besoin)
    // Ici on laisse 'pharmacy' et 'admin' si le thread est admin.

    const status = String(row[7] || '').toLowerCase();
    if (status !== 'active') continue;

    const msgContent = scrubChatMessage_(row[5]);
    if (!msgContent) continue;

    const authorType = String(row[2] || 'pharmacy').toLowerCase();
    const role = (authorType === 'assistant') ? 'assistant' : 'user';

    context.push({ role: role, content: msgContent });
  }

  return context.slice(-limit); // Garde les N derniers
}

function buildAssistantThreadContext_(threadId, limit) {
  // Version optimisée pour la WebApp qui n'a pas accès direct à la ligne sélectionnée
  // Utilise chatGetMessages si disponible, sinon lecture manuelle (ici lecture manuelle pour indépendance)
  const safeThread = sanitizeChatThreadId(threadId);
  if (!safeThread) return [];

  try {
    const ss = getMainSpreadsheet();
    const sheet = getChatSheet(ss);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];

    // Lecture des 50 dernières lignes pour trouver le contexte
    const startRow = Math.max(2, lastRow - 50);
    const rows = sheet.getRange(startRow, 1, lastRow - startRow + 1, 9).getValues();

    const context = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (sanitizeChatThreadId(row[1]) !== safeThread) continue;
      if (String(row[7]).toLowerCase() !== 'active') continue;

      const msg = scrubChatMessage_(row[5]);
      if (!msg) continue;

      const role = (String(row[2]).toLowerCase() === 'assistant') ? 'assistant' : 'user';
      context.push({ role: role, content: msg });
    }

    return context.slice(-limit);
  } catch (e) {
    console.warn('Erreur lecture contexte thread:', e);
    return [];
  }
}

function buildAssistantHistorySnapshot_(threadId, limit) {
  if (typeof chatGetMessagesForThread === 'function') {
    const res = chatGetMessagesForThread(threadId, { limit: limit });
    return res.messages || [];
  }
  // Fallback si la fonction n'est pas exposée dans Chat.js (rare)
  return [];
}

// --- Utilitaires divers ---

function computeAssistantFallbackCode_(sessionId) {
  const base = sanitizeScalar(sessionId || '', 32).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return (base + 'ELSCHAT').substring(0, 8);
}

function scrubChatMessage_(rawText) {
  const base = typeof sanitizeMultiline === 'function' ? sanitizeMultiline(rawText, 2000) : String(rawText).trim();
  if (!base) return '';
  // Anonymisation basique
  return base
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[EMAIL]')
    .replace(/\b0[67]\d{8}\b/g, '[MOBILE]')
    .trim();
}

function anonymizeAssistantPseudo_(pseudo, authorType) {
  return authorType === 'assistant' ? 'Assistant' : (pseudo || 'Utilisateur');
}

function getAssistantTargetRow_(inputRow, chatSheet, lastRow) {
  let r = Number(inputRow);
  if (isNaN(r) || r < 2 || r > lastRow) {
    // Tentative de récupération via la sélection active si l'appel vient du menu mais sans paramètre correct
    const active = SpreadsheetApp.getActiveRange();
    if (active && active.getSheet().getName() === chatSheet.getName()) {
      r = active.getRow();
    } else {
      r = lastRow; // Par défaut, dernière ligne
    }
  }
  return r;
}

function buildAssistantSessionId_(threadId) {
  return 'assistant:' + (threadId || 'global');
}

function getAssistantUsageKey_() {
  const now = new Date();
  return CHAT_ASSISTANT_USAGE_PREFIX + now.getUTCFullYear() + (now.getUTCMonth() + 1);
}

function readAssistantUsage_(key) {
  const val = PropertiesService.getScriptProperties().getProperty(key);
  return Number(val) || 0;
}

function writeAssistantUsage_(key, val) {
  PropertiesService.getScriptProperties().setProperty(key, String(Math.floor(val)));
}

function isAssistantFeatureEnabled_() {
  // Peut être surchargé ici
  return true;
}

// Pour compatibilité si getSecret n'est pas défini globalement
function getSecret(key) {
  return PropertiesService.getScriptProperties().getProperty(key) || '';
}
