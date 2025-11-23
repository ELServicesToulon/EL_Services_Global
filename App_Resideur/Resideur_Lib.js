/**
 * @file Resideur_Lib.gs
 * @description Bibliothèque autonome (Serveur) pour le monitoring d'applications Google Apps Script.
 * @author Gemini Code Assist
 * @version 1.0.0
 *
 * @architecture
 * 1. Reçoit des "pings" via la fonction publique `logEvent`.
 * 2. Stocke temporairement les données dans le CacheService (tampon/buffer).
 * 3. Utilise LockService pour gérer la concurrence et éviter l'écrasement des données.
 * 4. Une fonction déclenchée (`flushBufferToSheet`) vide périodiquement le tampon et écrit les données en masse dans un Google Sheet.
 */

// --- CONFIGURATION ---
/** @const {string} ID du Google Sheet où les logs seront stockés. */
const LOG_SPREADSHEET_ID = ''; // TODO: Remplacer par l'ID de votre Spreadsheet de logs.

/** @const {string} Nom de la feuille (onglet) qui contiendra les logs. */
const LOG_SHEET_NAME = 'DB_LOGS';

/** @const {string} Clé utilisée pour stocker le tampon dans le cache. */
const CACHE_KEY = 'resideur_log_buffer';

/**
 * [PRIVÉE] Sauvegarde un log dans le tampon (cache). Gère la concurrence.
 * @param {object} logEntry - L'objet de log à ajouter au tampon.
 */
function _saveToBuffer(logEntry) {
  const lock = LockService.getScriptLock();
  // Attendre jusqu'à 30 secondes pour obtenir le verrou.
  if (lock.tryLock(30000)) {
    try {
      const cache = CacheService.getScriptCache();
      const jsonBuffer = cache.get(CACHE_KEY);
      
      const buffer = jsonBuffer ? JSON.parse(jsonBuffer) : [];
      buffer.push(logEntry);
      
      // Stocker le tampon mis à jour (valide pour 6 heures, le maximum).
      cache.put(CACHE_KEY, JSON.stringify(buffer), 21600);
    } finally {
      lock.releaseLock();
    }
  } else {
    console.error('Resideur_Lib: Impossible d\'obtenir le verrou pour sauvegarder le log. Le log a été ignoré.');
  }
}

/**
 * [PUBLIQUE] Point d'entrée pour enregistrer un événement.
 * Conçue pour être appelée depuis un autre script utilisant cette bibliothèque.
 * @param {string} type - Le type de log (ex: 'FONCTION', 'PILULEUR', 'ERREUR').
 * @param {string} name - Le nom de la fonction ou de l'événement.
 * @param {string} user - L\'email de l\'utilisateur actif.
 * @param {string} details - Informations supplémentaires, message d\'erreur, etc.
 */
function logEvent(type, name, user, details) {
  if (!LOG_SPREADSHEET_ID) {
    console.error("Resideur_Lib: LOG_SPREADSHEET_ID n'est pas configuré. Le log est ignoré.");
    return;
  }

  const logEntry = {
    date: new Date().toISOString(),
    type: type,
    name: name,
    user: user,
    details: details,
  };
  
  _saveToBuffer(logEntry);
}

/**
 * [TRIGGER] Vide le tampon du cache et écrit toutes les données en une seule fois dans le Google Sheet.
 * À déclencher par un trigger temporel (ex: toutes les 30 minutes).
 */
function flushBufferToSheet() {
  if (!LOG_SPREADSHEET_ID) {
    console.log("Resideur_Lib (flush): LOG_SPREADSHEET_ID n'est pas configuré. Aucune action.");
    return;
  }
  
  const lock = LockService.getScriptLock();
   if (!lock.tryLock(30000)) {
    console.error('Resideur_Lib (flush): Conflit de verrou, flush reporté au prochain cycle.');
    return;
  }

  let buffer;
  try {
    const cache = CacheService.getScriptCache();
    const jsonBuffer = cache.get(CACHE_KEY);

    if (!jsonBuffer || jsonBuffer === '[]') {
      console.log('Resideur_Lib (flush): Tampon vide. Aucune action.');
      return;
    }
    buffer = JSON.parse(jsonBuffer);
    
    // Vider le tampon immédiatement pour ne pas perdre de logs en cas d'erreur plus tard.
    cache.remove(CACHE_KEY);

  } finally {
      lock.releaseLock();
  }
  
  if (!buffer || buffer.length === 0) return;

  try {
    const ss = SpreadsheetApp.openById(LOG_SPREADSHEET_ID);
    let sheet = ss.getSheetByName(LOG_SHEET_NAME);

    // Si la feuille n'existe pas, la créer avec les en-têtes.
    if (!sheet) {
      sheet = ss.insertSheet(LOG_SHEET_NAME);
      const headers = ['Date', 'Type', 'Nom', 'Utilisateur', 'Détails'];
      sheet.appendRow(headers);
      sheet.setFrozenRows(1);
    }
    
    // Transformer le tableau d'objets en tableau de tableaux (2D array).
    const values = buffer.map(log => [
      log.date,
      log.type,
      log.name,
      log.user,
      log.details,
    ]);

    // Écrire toutes les données en une seule opération.
    sheet.getRange(sheet.getLastRow() + 1, 1, values.length, values[0].length).setValues(values);
    console.log(`Resideur_Lib (flush): ${values.length} logs écrits avec succès dans le Sheet.`);

  } catch (e) {
    console.error(`Resideur_Lib (flush): Erreur lors de l'écriture dans le Sheet. ${e.toString()}`);
    // En cas d'erreur, on pourrait remettre les logs dans le cache, mais cela risque de créer des boucles.
    // Pour la simplicité, les logs sont perdus, mais l'erreur est enregistrée.
  }
}

/**
 * [IA DATA] Analyse le Google Sheet et retourne un rapport JSON.
 * @returns {object} Un objet contenant des analyses sur les logs.
 */
function getAnalysisReport() {
  if (!LOG_SPREADSHEET_ID) {
    return { error: "LOG_SPREADSHEET_ID non configuré." };
  }
  
  const ss = SpreadsheetApp.openById(LOG_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(LOG_SHEET_NAME);
  
  if (!sheet) {
    return { error: `La feuille '${LOG_SHEET_NAME}' est introuvable.` };
  }

  // Ignorer la ligne d'en-tête
  const data = sheet.getDataRange().getValues().slice(1);

  const functionCalls = data.filter(row => row[1] === 'FONCTION');
  const feedbacks = data.filter(row => row[1] === 'PILULEUR').map(row => ({ user: row[3], message: row[4], date: row[0] }));

  const counts = functionCalls.reduce((acc, row) => {
    const functionName = row[2];
    acc[functionName] = (acc[functionName] || 0) + 1;
    return acc;
  }, {});

  const top_functions = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  return {
    top_functions: top_functions,
    // Note: Il est impossible pour la bibliothèque de connaître les fonctions qui n'ont JAMAIS été appelées
    // car elle n'a pas connaissance du code source de l'application cliente.
    // Cette clé est donc laissée vide.
    dead_code: [], 
    feedbacks: feedbacks,
  };
}
