// =================================================================
//                 INTEGRATION ASSISTANT GEMINI
// =================================================================
// Fournit une fonction utilitaire pour appeler l'API Gemini et
// poster automatiquement la reponse dans l'onglet Chat.
// =================================================================

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';
// Liste ordonnée des modèles à tenter : du plus léger/rapide au plus performant
// 1. gemini-1.5-flash : Rapide, économique (modèle par défaut)
// 2. gemini-1.5-pro   : Plus performant, contexte plus large (si flash échoue)
// 3. gemini-pro       : Legacy fallback
const GEMINI_MODELS = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];

const CHAT_ASSISTANT_HISTORY_LIMIT = 10;
const CHAT_ASSISTANT_SYSTEM_PROMPT = 'Assistant pour pharmaciens en EHPAD; réponses concises; pas de données personnelles.';
const CHAT_ASSISTANT_DEFAULT_VISIBILITY = 'pharmacy';
const CHAT_ASSISTANT_DEFAULT_TEMPERATURE = 0.3;
const CHAT_ASSISTANT_MAX_RETRIES = 3;
const CHAT_ASSISTANT_BACKOFF_MS = 400;
const CHAT_ASSISTANT_USAGE_PREFIX = 'assistant_tokens:';

/**
 * Appelle l'API OpenAI en combinant le contexte et la question utilisateur.
 * @param {Array<{role:string, content:string}>} contextMessages
 * @param {string} userPrompt
 * @param {{fetchImpl?:Function, sleepImpl?:Function, maxRetries?:number, backoffMs?:number}} [opts]
 * @returns {{ok:boolean, reason?:string, message?:string, usage?:Object}}
 */
function callGemini(contextMessages, userPrompt, opts) {
  if (!isAssistantFeatureEnabled_()) {
    return { ok: false, reason: 'UNCONFIGURED' };
  }

  const promptChunk = sanitizeMultiline(userPrompt, 1200);
  const safePrompt = scrubChatMessage_(promptChunk);
  if (!safePrompt) {
    return { ok: false, reason: 'EMPTY_MESSAGE' };
  }

  let apiKey = '';
  try {
    apiKey = getSecret('GEMINI_API_KEY');
  } catch (err) {
    console.error('[callGemini] Missing GEMINI_API_KEY', err);
    return { ok: false, reason: 'UNCONFIGURED' };
  }
  if (!apiKey) {
    console.error('[callGemini] GEMINI_API_KEY empty');
    return { ok: false, reason: 'UNCONFIGURED' };
  }

  const limit = Number(typeof CFG_ASSISTANT_MONTHLY_BUDGET_TOKENS !== 'undefined' ? CFG_ASSISTANT_MONTHLY_BUDGET_TOKENS : 0);
  const usageKey = getAssistantUsageKey_();
  const currentUsage = readAssistantUsage_(usageKey);
  if (limit > 0 && currentUsage >= limit) {
    return { ok: false, reason: 'BUDGET_EXCEEDED' };
  }

  const formattedContext = [];
  if (Array.isArray(contextMessages)) {
    for (let i = Math.max(0, contextMessages.length - CHAT_ASSISTANT_HISTORY_LIMIT); i < contextMessages.length; i++) {
      const msg = contextMessages[i];
      if (!msg) { continue; }
      const role = String(msg.role || '').toLowerCase() === 'assistant' ? 'model' : 'user';
      const chunk = sanitizeMultiline(msg.content, 1000);
      const cleaned = scrubChatMessage_(chunk);
      if (!cleaned) { continue; }
      formattedContext.push({ role: role, parts: [{ text: cleaned }] });
    }
  }

  const contents = [
    { role: 'user', parts: [{ text: CHAT_ASSISTANT_SYSTEM_PROMPT }] },
    { role: 'model', parts: [{ text: "J'ai compris." }] }
  ]
    .concat(formattedContext)
    .concat([{ role: 'user', parts: [{ text: safePrompt }] }]);


  const requestBody = {
    contents: contents,
    generationConfig: {
      temperature: CHAT_ASSISTANT_DEFAULT_TEMPERATURE
    }
  };

  const options = opts || {};
  const fetchImpl = typeof options.fetchImpl === 'function' ? options.fetchImpl : function(url, params) { return UrlFetchApp.fetch(url, params); };
  const sleepImpl = typeof options.sleepImpl === 'function' ? options.sleepImpl : function(delay) { Utilities.sleep(delay); };
  const maxRetries = Math.max(1, Number(options.maxRetries) || CHAT_ASSISTANT_MAX_RETRIES);
  const backoffBase = Math.max(0, Number(options.backoffMs) || CHAT_ASSISTANT_BACKOFF_MS);

  let lastError = null;
  let successfulModel = null;

  // BOUCLE SUR LES MODELES (Flash -> Pro -> Legacy)
  for (const modelName of GEMINI_MODELS) {
    const apiUrl = GEMINI_BASE_URL + modelName + ':generateContent';
    let modelSuccess = false;

    // BOUCLE DE RETRIES (Réseau)
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = fetchImpl(apiUrl + '?key=' + apiKey, {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify(requestBody),
          muteHttpExceptions: true
        });
        const status = typeof response.getResponseCode === 'function' ? response.getResponseCode() : Number(response.status || 0);
        const body = typeof response.getContentText === 'function' ? response.getContentText() : String(response.body || '');

        if (status === 200) {
          let parsed;
          try { parsed = JSON.parse(body); } catch (parseErr) {
            console.error('[callGemini] JSON parse error on model ' + modelName, parseErr);
            // Si le JSON est invalide, on peut retenter ou passer au modèle suivant.
            // Ici on considère ça comme une erreur API grave pour ce modèle.
            lastError = parseErr;
            break; // Sortie de la boucle retry
          }
          const firstCandidate = parsed && parsed.candidates && parsed.candidates[0];
          const rawMessage = firstCandidate && firstCandidate.content && firstCandidate.content.parts && firstCandidate.content.parts[0] && firstCandidate.content.parts[0].text;
          const assistantText = scrubChatMessage_(sanitizeMultiline(rawMessage, 1200));

          if (!assistantText) {
            console.error('[callGemini] Empty message content on model ' + modelName);
             // Réponse vide mais 200 OK -> Probablement un filtrage de sécurité ou autre.
             // On passe au modèle suivant car le retry sur le même modèle donnera probablement la même chose.
             lastError = 'Empty Content';
             break;
          }

          const usage = parsed && parsed.usageMetadata ? parsed.usageMetadata : {};
          const totalTokens = Number(usage.totalTokenCount) || 0;
          const promptTokens = Number(usage.promptTokenCount) || 0;
          const completionTokens = Number(usage.candidatesTokenCount) || 0;

          const newUsage = currentUsage + totalTokens;
          writeAssistantUsage_(usageKey, newUsage);

          return {
            ok: true,
            message: assistantText,
            usedModel: modelName, // Info utile pour debug
            usage: {
              totalTokens: totalTokens,
              promptTokens: promptTokens,
              completionTokens: completionTokens,
              budget: { limit: limit, used: newUsage, remaining: limit > 0 ? Math.max(0, limit - newUsage) : null }
            }
          };
        }

        // Gestion des erreurs HTTP
        const shouldRetry = status === 429 || status >= 500;

        if (!shouldRetry) {
          // Erreur 4xx non-429 (ex: 400 Bad Request, 404 Model Not Found)
          console.warn('[callGemini] Model ' + modelName + ' HTTP ' + status + ' - ' + body);
          lastError = 'HTTP ' + status;
          // Inutile de retrier ce modèle, on break la boucle de retry pour passer au modèle suivant
          break;
        }

        // Si 429/500, on retente le meme modèle
        lastError = 'HTTP ' + status;

      } catch (err) {
        console.error('[callGemini] fetch error on model ' + modelName, err);
        lastError = err;
      }

      // Wait before retry
      if (attempt < maxRetries - 1 && backoffBase > 0) {
        try { const delay = backoffBase * Math.pow(2, attempt); sleepImpl(delay); } catch (_err) {}
      }
    } // Fin boucle Retries

    // Si on arrive ici, c'est que le modèle courant a échoué (tous retries épuisés ou erreur fatale)
    console.info('[callGemini] Model ' + modelName + ' failed. Switching to next model if available.');
  } // Fin boucle Models

  console.warn('[callGemini] All models exhausted', lastError);
  return { ok: false, reason: 'API_ERROR' };
}

/**
 * Recupere les derniers messages et poste la reponse de l'assistant.
 * @param {number} row Ligne cible (optionnelle).
 * @returns {string} Reponse envoyee.
 */
function askAssistant(row) {
  try {
    const ss = getMainSpreadsheet();
    const chatSheet = getChatSheet(ss);
    const lastRow = chatSheet.getLastRow();
    if (lastRow <= 1) {
      throw new Error('Aucun message disponible dans l\'onglet Chat.');
    }

    const targetRow = getAssistantTargetRow_(row, chatSheet, lastRow);
    const rowValues = chatSheet.getRange(targetRow, 1, 1, 9).getValues()[0];
    const status = String(rowValues[7] || '').toLowerCase();
    if (status && status !== 'active') {
      throw new Error('La ligne selectionnee est archivee.');
    }

    const question = scrubChatMessage_(rowValues[5]);
    if (!question) {
      throw new Error('La ligne selectionnee ne contient pas de question exploitable.');
    }

    if (!isAssistantFeatureEnabled_()) {
      throw new Error('Assistant désactivé.');
    }

    let threadId = sanitizeChatThreadId(rowValues[1] || '');
    if (!threadId) {
      const authorRef = String(rowValues[3] || '');
      if (authorRef.indexOf('CLIENT_') === 0) {
        threadId = buildChatThreadIdFromClient({ clientId: authorRef.replace('CLIENT_', '') }) || '';
      } else if (authorRef.indexOf('PHC_') === 0) {
        threadId = buildChatThreadIdFromCode(authorRef.replace('PHC_', '')) || '';
      }
    }
    let candidateThread = sanitizeChatThreadId(threadId || '');
    if (!candidateThread || (candidateThread.indexOf('THR_CLIENT_') !== 0 && candidateThread.indexOf('THR_PHC_') !== 0)) {
      // Fallback to global thread for admin assistant if no valid client/pharmacy thread
      candidateThread = CHAT_THREAD_GLOBAL;
    }
    const contextMessages = buildAssistantContext_(chatSheet, targetRow, candidateThread, CHAT_ASSISTANT_HISTORY_LIMIT);
    const aiResult = callGemini(contextMessages, question);
    if (!aiResult || aiResult.ok !== true) {
      const reason = aiResult && aiResult.reason ? aiResult.reason : 'API_ERROR';
      throw new Error('Assistant indisponible (' + reason + ').');
    }
    const assistantAnswer = sanitizeMultiline(aiResult.message, 1200) || 'Assistant indisponible.';
    const assistantSessionId = buildAssistantSessionId_(candidateThread);

    const payload = {
      authorType: 'assistant',
      authorPseudo: 'Gemini',
      message: assistantAnswer,
      visibleTo: CHAT_ASSISTANT_DEFAULT_VISIBILITY,
      threadId: candidateThread,
      sessionId: assistantSessionId
    };

    const result = chatPostMessage(payload);
    if (!result || !result.ok) {
      throw new Error('La reponse de l\'assistant n\'a pas pu etre enregistree (code: ' + (result && result.reason ? result.reason : 'inconnu') + ').');
    }

    return assistantAnswer;
  } catch (err) {
    Logger.log('[askAssistant] ' + err);
    throw err;
  }
}

/**
 * Fournit une réponse assistant pour un thread spécifique côté WebApp.
 * @param {{threadId?:string, question?:string, sessionId?:string, clientId?:string, clientEmail?:string, pharmacyCode?:string}} rawInput
 * @returns {{ok:boolean, reason?:string, answer?:string, question?:string, threadId?:string, history?:Array<Object>}}
 */
function askAssistantOnThread(rawInput) {
  if (!isAssistantFeatureEnabled_()) {
    return { ok: false, reason: 'UNCONFIGURED' };
  }

  try {
    const input = rawInput || {};
    const skipUserPost = input.skipUserPost === true;
    let safeThread = sanitizeChatThreadId(input.threadId || '');
    const safeSession = sanitizeScalar(input.sessionId || '', 64) || ('webapp:' + (safeThread || 'THREAD'));
    const baseQuestion = sanitizeMultiline(input.question, 1000);

    if (!baseQuestion) {
      return { ok: false, reason: 'EMPTY_MESSAGE' };
    }

    const payload = {
      authorType: 'pharmacy',
      message: baseQuestion,
      threadId: safeThread,
      sessionId: safeSession,
      clientId: sanitizeScalar(input.clientId, 64),
      clientEmail: sanitizeEmail(input.clientEmail),
      pharmacyCode: sanitizePharmacyCode(input.pharmacyCode)
    };

    if (!payload.clientId && !payload.clientEmail && !payload.pharmacyCode) {
      payload.pharmacyCode = sanitizePharmacyCode(computeAssistantFallbackCode_(safeSession));
    }

    let question = baseQuestion;

    if (!skipUserPost) {
      const postResult = chatPostMessage(payload);
      if (!postResult || !postResult.ok) {
        return postResult && postResult.reason ? postResult : { ok: false, reason: 'ERROR' };
      }
      question = sanitizeMultiline(postResult.message, 1000) || question;
      safeThread = sanitizeChatThreadId(postResult.threadId || safeThread) || safeThread;
    } else if (!safeThread) {
      safeThread = sanitizeChatThreadId(resolveChatThreadId(payload, null, payload.pharmacyCode));
    }

    if (!safeThread) {
      return { ok: false, reason: 'INVALID_THREAD' };
    }

    const contextMessages = buildAssistantThreadContext_(safeThread, CHAT_ASSISTANT_HISTORY_LIMIT);
    const aiResponse = callGemini(contextMessages, question);
    if (!aiResponse || aiResponse.ok !== true) {
      return aiResponse && aiResponse.reason ? aiResponse : { ok: false, reason: 'API_ERROR' };
    }
    const assistantText = sanitizeMultiline(aiResponse.message, 1200) || 'Assistant indisponible pour le moment.';

    const assistantPayload = {
      authorType: 'assistant',
      authorPseudo: 'Assistant',
      message: assistantText,
      visibleTo: CHAT_ASSISTANT_DEFAULT_VISIBILITY,
      threadId: safeThread,
      sessionId: buildAssistantSessionId_(safeThread)
    };

    const assistantPost = chatPostMessage(assistantPayload);
    if (!assistantPost || !assistantPost.ok) {
      return assistantPost && assistantPost.reason ? assistantPost : { ok: false, reason: 'ERROR' };
    }

    const history = buildAssistantHistorySnapshot_(safeThread, CHAT_ASSISTANT_HISTORY_LIMIT);

    return {
      ok: true,
      answer: assistantText,
      question: question,
      threadId: safeThread,
      history: history,
      usage: aiResponse.usage || null
    };
  } catch (err) {
    console.error('[askAssistantOnThread]', err);
    return { ok: false, reason: 'ERROR' };
  }
}

/**
 * Cree ou met a jour le menu permettant d'invoquer l'assistant.
 */
function menuAskAssistant() {
  const ui = SpreadsheetApp.getUi();
  try {
    const activeSheet = SpreadsheetApp.getActiveSheet();
    if (!activeSheet || activeSheet.getSheetName() !== SHEET_CHAT) {
      ui.alert('Assistant Chat', 'Selectionnez une ligne dans l\'onglet Chat avant d\'appeler l\'assistant.', ui.ButtonSet.OK);
      return;
    }
    const activeRange = activeSheet.getActiveRange();
    if (!activeRange) {
      ui.alert('Assistant Chat', 'Selectionnez une ligne contenant la question a poser.', ui.ButtonSet.OK);
      return;
    }
    const rowIndex = activeRange.getRow();
    const answer = askAssistant(rowIndex);
    ui.alert('Assistant Chat', 'Reponse envoyee dans le fil:\n\n' + answer, ui.ButtonSet.OK);
  } catch (err) {
    ui.alert('Assistant Chat', err.message || String(err), ui.ButtonSet.OK);
  }
}

/**
 * Construit la liste des 10 derniers messages (meme thread) pour fournir du contexte.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} chatSheet
 * @param {number} targetRow
 * @param {string} threadId
 * @param {number} limit
 * @returns {Array<{role:string, content:string}>}
 */
function buildAssistantContext_(chatSheet, targetRow, threadId, limit) {
  const endRow = Math.max(2, targetRow - 1);
  if (endRow < 2) {
    return [];
  }
  const startRow = Math.max(2, endRow - limit + 1);
  const rowCount = endRow - startRow + 1;
  if (rowCount <= 0) {
    return [];
  }

  const values = chatSheet.getRange(startRow, 1, rowCount, 8).getValues();
  const context = [];
  const safeThread = sanitizeChatThreadId(threadId || '');
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const currentThread = sanitizeChatThreadId(row[1] || '');
    if (safeThread && currentThread !== safeThread) {
      continue;
    }
    const visibility = String(row[6] || CHAT_ASSISTANT_DEFAULT_VISIBILITY).toLowerCase();
    if (visibility !== 'pharmacy') {
      continue; // On evite d\'exposer les fils internes admin.
    }
    const status = String(row[7] || '').toLowerCase();
    if (status && status !== 'active') {
      continue;
    }
    const sanitized = scrubChatMessage_(row[5]);
    if (!sanitized) {
      continue;
    }
    const authorType = String(row[2] || 'pharmacy').toLowerCase();
    const pseudo = anonymizeAssistantPseudo_(row[4], authorType);
    const role = authorType === 'assistant' ? 'assistant' : 'user';
    const label = pseudo ? '[' + pseudo + '] ' : '';
    context.push({
      role: role,
      content: label + sanitized
    });
  }

  if (context.length > limit) {
    return context.slice(context.length - limit);
  }
  return context;
}

/**
 * Construit le contexte assistant pour un thread donné (webapp).
 * @param {string} threadId
 * @param {number} limit
 * @returns {Array<{role:string, content:string}>}
 */
function buildAssistantThreadContext_(threadId, limit) {
  const safeThread = sanitizeChatThreadId(threadId || '');
  if (!safeThread) {
    return [];
  }
  const context = [];
  try {
    const ss = getMainSpreadsheet();
    const sheet = getChatSheet(ss);
    if (!sheet) {
      return context;
    }
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return context;
    }
    const values = sheet.getRange(2, 1, lastRow - 1, 9).getValues();
    for (let i = values.length - 1; i >= 0 && context.length < Number(limit || 10); i--) {
      const row = values[i];
      const currentThread = sanitizeChatThreadId(row[1] || '');
      if (currentThread !== safeThread) {
        continue;
      }
      const status = String(row[7] || '').toLowerCase();
      if (status && status !== 'active') {
        continue;
      }
      const visibility = String(row[6] || CHAT_ASSISTANT_DEFAULT_VISIBILITY).toLowerCase();
      if (visibility !== 'pharmacy') {
        continue;
      }
      const role = String(row[2] || 'pharmacy').toLowerCase() === 'assistant' ? 'assistant' : 'user';
      const message = sanitizeMultiline(row[5], 1000);
      if (!message) {
        continue;
      }
      context.unshift({ role: role, content: message });
    }
  } catch (err) {
    console.warn('[buildAssistantThreadContext_]', err);
  }
  const maxItems = Number(limit || 10);
  return context.length > maxItems ? context.slice(context.length - maxItems) : context;
}

/**
 * Retourne l'historique du thread pour affichage côté client.
 * @param {string} threadId
 * @param {number} limit
 * @returns {Array<Object>}
 */
function buildAssistantHistorySnapshot_(threadId, limit) {
  const safeThread = sanitizeChatThreadId(threadId || '');
  if (!safeThread) {
    return [];
  }
  try {
    const result = chatGetMessagesForThread(safeThread, { limit: Number(limit || 20) });
    const messages = Array.isArray(result && result.messages) ? result.messages : [];
    const maxItems = Number(limit || 20);
    return messages.length > maxItems ? messages.slice(messages.length - maxItems) : messages;
  } catch (err) {
    console.warn('[buildAssistantHistorySnapshot_]', err);
    return [];
  }
}

/**
 * Génère un code fallback pour les sessions anonymes de l'assistant.
 * @param {string} sessionId
 * @returns {string}
 */
function computeAssistantFallbackCode_(sessionId) {
  const base = sanitizeScalar(sessionId || '', 32).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const padded = (base + 'ELSCHAT').substring(0, 8);
  if (padded.length >= 4) {
    return padded;
  }
  return (padded + 'XXXX').substring(0, 4);
}

/**
 * Supprime les informations sensibles des messages pour respecter la confidentialite.
 * @param {string} rawText
 * @returns {string}
 */
function scrubChatMessage_(rawText) {
  const base = typeof sanitizeMultiline === 'function'
    ? sanitizeMultiline(rawText, 1200)
    : String(rawText || '').trim();
  if (!base) {
    return '';
  }
  const withoutEmails = base.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]');
  const withoutPhones = withoutEmails.replace(/\b\+?\d[\d\s.-]{6,}\b/g, '[numero]');
  const withoutFullNames = withoutPhones.replace(/\b[A-Z\u00C0-\u00D6\u00D8-\u00DE][a-z\u00E0-\u00F6\u00F8-\u00FF']+\s+[A-Z\u00C0-\u00D6\u00D8-\u00DE][a-z\u00E0-\u00F6\u00F8-\u00FF']+\b/g, '[nom]');
  return withoutFullNames.trim();
}

/**
 * Retourne un pseudo anonymise a partir du pseudo calcule ou du type d'auteur.
 * @param {string} pseudo
 * @param {string} authorType
 * @returns {string}
 */
function anonymizeAssistantPseudo_(pseudo, authorType) {
  const safePseudo = typeof sanitizeScalar === 'function'
    ? sanitizeScalar(pseudo || '', 48)
    : String(pseudo || '');
  const compact = safePseudo.replace(/[^A-Za-z0-9#\- ]/g, '').trim();
  if (compact) {
    return compact;
  }
  switch (authorType) {
    case 'admin': return 'Admin';
    case 'assistant': return 'Assistant';
    case 'client': return 'Client';
    default: return 'Pharmacie';
  }
}

/**
 * Determine la ligne a utiliser pour l'appel assistant.
 * @param {number} inputRow
 * @param {GoogleAppsScript.Spreadsheet.Sheet} chatSheet
 * @param {number} lastRow
 * @returns {number}
 */
function getAssistantTargetRow_(inputRow, chatSheet, lastRow) {
  let rowIndex = Number(inputRow) || 0;
  if (!rowIndex || rowIndex < 2 || rowIndex > lastRow) {
    try {
      const activeSheet = SpreadsheetApp.getActiveSheet();
      if (activeSheet && activeSheet.getSheetName() === chatSheet.getSheetName()) {
        const activeRange = activeSheet.getActiveRange();
        if (activeRange) {
          rowIndex = activeRange.getRow();
        }
      }
    } catch (_err) {
      rowIndex = 0;
    }
  }
  if (!rowIndex || rowIndex < 2 || rowIndex > lastRow) {
    rowIndex = lastRow;
  }
  return rowIndex;
}

/**
 * Genere un identifiant interne pour le rate limit du bot.
 * @param {string} threadId
 * @returns {string}
 */
function buildAssistantSessionId_(threadId) {
  const safeThread = sanitizeChatThreadId(threadId || '') || CHAT_THREAD_GLOBAL;
  return 'assistant:' + safeThread;
}

/**
 * Teste le respect du burst rate-limit pour les reponses assistant.
 * @returns {{ok:boolean}}
 */
function testAssistantRateLimitBurst() {
  const threadId = 'TEST_THREAD';
  const sessionId = buildAssistantSessionId_(threadId);
  const rateKey = buildChatRateKey(sessionId);
  const cacheKey = 'chat_rate:' + rateKey;
  const cache = CacheService.getScriptCache();
  cache.remove(cacheKey);
  try {
    PropertiesService.getScriptProperties().deleteProperty('chat_rate_last:' + rateKey);
  } catch (_err) {
    // Ignore les erreurs de nettoyage.
  }

  for (let i = 0; i < CHAT_RATE_LIMIT_BURST; i++) {
    if (!isChatRateAllowed(sessionId)) {
      throw new Error('Le burst est trop strict a l\'iteration ' + i + '.');
    }
  }

  if (isChatRateAllowed(sessionId)) {
    throw new Error('Le burst n\'est pas applique apres ' + CHAT_RATE_LIMIT_BURST + ' appels.');
  }

  return { ok: true };
}

/**
 * Retourne la clé de stockage du compteur de jetons mensuel.
 * @returns {string}
 */
function getAssistantUsageKey_() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return CHAT_ASSISTANT_USAGE_PREFIX + year + month;
}

/**
 * Lit le compteur de jetons assistant depuis les propriétés.
 * @param {string} key
 * @returns {number}
 */
function readAssistantUsage_(key) {
  try {
    const raw = PropertiesService.getScriptProperties().getProperty(key);
    return raw ? Number(raw) || 0 : 0;
  } catch (err) {
    console.warn('[callGemini] Unable to read usage', err);
    return 0;
  }
}

/**
 * Écrit le compteur de jetons assistant dans les propriétés.
 * @param {string} key
 * @param {number} value
 */
function writeAssistantUsage_(key, value) {
  try {
    const safeValue = Math.max(0, Math.floor(Number(value) || 0));
    PropertiesService.getScriptProperties().setProperty(key, String(safeValue));
  } catch (err) {
    console.warn('[callGemini] Unable to persist usage', err);
  }
}

/**
 * Indique si l'assistant est activé (flag de config ou override Script Properties).
 * @returns {boolean}
 */
function isAssistantFeatureEnabled_() {
  if (typeof CFG_ENABLE_ASSISTANT !== 'undefined' && CFG_ENABLE_ASSISTANT) {
    return true;
  }
  try {
    const override = PropertiesService.getScriptProperties().getProperty('CFG_ENABLE_ASSISTANT_OVERRIDE');
    return String(override || '').toLowerCase() === 'true';
  } catch (_err) {
    return false;
  }
}