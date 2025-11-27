/**
 * =================================================================
 * APP LIVREUR - CODE SERVER-SIDE OPTIMISÉ (App Shell)
 * =================================================================
 * Auteur: Emmanuel (via Assistant)
 * Description: Backend pour l'application mobile livreurs.
 * Optimisation: doGet ultra-rapide, chargement asynchrone des données.
 */

// =================================================================
// 1. ROUTAGE & AFFICHAGE (Rapide)
// =================================================================

/**
 * Point d'entrée de la Web App.
 * Renvoie uniquement le Shell HTML (coquille vide avec loader).
 * Aucune opération lourde ici.
 */

/**
 * ! FONCTION D'INITIALISATION - À SUPPRIMER OU COMMENTER EN PRODUCTION !
 * Exécute la configuration définie dans Setup_Livreur.js.
 * Pour l'exécuter, sélectionnez "runSetup" dans l'éditeur Apps Script et cliquez sur "Exécuter".
 */
function runSetup() {
  setupInitial();
}

function doGet(e) {
  // On charge le template principal
  const html = HtmlService.createTemplateFromFile('Livraison_Interface');

  // On peut passer quelques variables très légères si besoin,
  // mais l'essentiel sera chargé par getInitialData()
  return html.evaluate()
      .setTitle('ELS Livreur')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Fonction appelée par le client (window.onload) pour charger les données.
 * C'est ici que les opérations lourdes se font.
 */
function getInitialData(params) {
  const startT = new Date().getTime();
  console.log('getInitialData start');

  try {
    // 1. Identifier le livreur (obtient seulement l'ID via le paramètre sécurisé)
    const livreurSession = resolveLivreurFromRequest_(params);

    // 2. Récupérer les informations complètes du livreur (y compris l'email) via son ID
    const livreurInfo = getLivreurInfoById(livreurSession.id);
    if (!livreurInfo) {
      throw new Error(`Livreur avec ID "${livreurSession.id}" introuvable.`);
    }

    // 3. Récupérer les tournées assignées à ce livreur
    const toursResult = obtenirTournees({
      scope: 'day',
      livreurId: livreurInfo.id
    });

    // 4. Préparer la config client avec les bonnes informations
    const config = {
      env: 'PROD',
      version: '2.0.0',
      userEmail: livreurInfo.email, // Correction du bug : on utilise l'email récupéré
      serverTime: new Date().getTime()
    };

    console.log('getInitialData done in ' + (new Date().getTime() - startT) + 'ms');

    return {
      success: true,
      livreur: livreurInfo, // On renvoie les infos complètes
      toursData: toursResult,
      config: config
    };

  } catch (e) {
    console.error('Erreur getInitialData', e);
    return {
      success: false,
      error: e.message
    };
  }
}

// =================================================================
// 2. LOGIQUE MÉTIER (Connexion, Tournées, Notes, Statuts)
// =================================================================

/**
 * Vérifie si un email correspond à un livreur autorisé dans la feuille "liste livreurs".
 * @param {string} email L'email à vérifier, envoyé depuis le client.
 * @returns {object} Un objet avec {success: true, livreur: {...}} ou {success: false, error: "..."}.
 */
function verifierLivreur(email) {
  try {
    if (!email) {
      return { success: false, error: "L'email est manquant." };
    }

    const sheetName = "liste livreurs";
    const ss = getSpreadsheet_(); // Réutilise la fonction helper existante
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      console.error(`La feuille "${sheetName}" est introuvable. Veuillez exécuter la configuration (runSetup).`);
      return { success: false, error: "Erreur de configuration du serveur." };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data.shift() || []; // Extrait la ligne d'en-tête

    const emailColIndex = headers.indexOf("Email");
    const idColIndex = headers.indexOf("ID Livreur");
    const nomColIndex = headers.indexOf("Nom Personnage");

    if (emailColIndex === -1 || idColIndex === -1 || nomColIndex === -1) {
      console.error(`Les en-têtes ("ID Livreur", "Nom Personnage", "Email") sont incorrects dans la feuille "${sheetName}".`);
      return { success: false, error: "Erreur de configuration des données." };
    }

    const searchEmail = String(email).trim().toLowerCase();

    for (const row of data) {
      const rowEmail = String(row[emailColIndex]).trim().toLowerCase();
      if (rowEmail === searchEmail) {
        // Livreur trouvé !
        const livreurInfo = {
          id: row[idColIndex],
          nom: row[nomColIndex],
          email: rowEmail
        };
        console.log(`Connexion réussie pour le livreur: ${JSON.stringify(livreurInfo)}`);
        return { success: true, livreur: livreurInfo };
      }
    }

    // Si la boucle se termine sans trouver l'email
    console.warn(`Tentative de connexion échouée pour l'email non autorisé: ${email}`);
    const adminEmail = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL') || 'contact@example.com';
    return { success: false, error: "Email non autorisé.", adminEmail: adminEmail };

  } catch (e) {
    console.error('Erreur critique dans verifierLivreur:', e);
    return { success: false, error: "Une erreur inattendue est survenue." };
  }
}

/**
 * Récupère les informations d'un livreur en se basant sur son ID.
 * @param {string} livreurId L'ID unique du livreur.
 * @returns {object|null} Un objet contenant les infos du livreur, ou null s'il n'est pas trouvé.
 */
function getLivreurInfoById(livreurId) {
  try {
    const sheetName = "liste livreurs";
    const sheet = getSpreadsheet_().getSheetByName(sheetName);
    if (!sheet) return null;

    const data = sheet.getDataRange().getValues();
    const headers = data.shift() || [];

    const idColIndex = headers.indexOf("ID Livreur");
    if (idColIndex === -1) return null;

    const searchId = String(livreurId).trim();

    for (const row of data) {
      if (String(row[idColIndex]).trim() === searchId) {
        return {
          id: row[headers.indexOf("ID Livreur")],
          nom: row[headers.indexOf("Nom Personnage")],
          email: row[headers.indexOf("Email")]
        };
      }
    }
    return null; // Non trouvé

  } catch (e) {
    console.error(`Erreur dans getLivreurInfoById pour l'ID ${livreurId}:`, e);
    return null;
  }
}


const LIVRAISON_DATA = {
  PROP_SPREADSHEET_ID: 'SPREADSHEET_ID',
  PROP_TOURNEES: 'SHEET_TOURNEES',
  PROP_NOTES: 'SHEET_NOTES',
  DEFAULT_TOURNEES: 'Tournées',
  DEFAULT_NOTES: 'Notes_Livraison',
  TOURNEE_HEADERS: ['Date', 'ID', 'Heure', 'Client', 'Adresse', 'TotalStops', 'Statut', 'Livreur'],
  NOTES_HEADERS: ['Timestamp', 'Tournee ID', 'Texte', 'Latitude', 'Longitude', 'Precision', 'Adresse approx', 'Auteur'],
  STATUTS: ['a_venir', 'en_cours', 'termine', 'probleme']
};

/**
 * Récupère la liste des tournées
 */
function obtenirTournees(options) {
  try {
    const tz = Session.getScriptTimeZone();
    // Options par défaut
    const scope = (options && options.scope) || 'day';
    const livreurId = options && options.livreurId ? String(options.livreurId).trim() : '';

    // Accès Sheet
    const sheetInfo = getSheetWithHeaders_(getTourneeSheetName_(), LIVRAISON_DATA.TOURNEE_HEADERS);
    bootstrapTourneesIfEmpty_(sheetInfo.sheet, sheetInfo); // Données démo si vide

    const rawData = getDataRows_(sheetInfo.sheet, sheetInfo.headers.length);

    // Filtrage date
    const range = computeDateRange_(scope, new Date());
    const startKey = formatDateKey_(range.start, tz);
    const endKey = formatDateKey_(range.end, tz);

    const tourneeObjects = rawData
      .map((row, idx) => mapTourneeRow_(row, idx + 2, sheetInfo.sheet, tz, sheetInfo))
      .filter(t => t !== null)
      .filter(t => t.dateKey >= startKey && t.dateKey <= endKey)
      .filter(t => {
        // Filtre livreur si spécifié
        if (!livreurId) return true;
        if (!t.livreurId) return true; // Tournées orphelines visibles ? Ou non ? Disons oui pour l'instant.
        return t.livreurId.toLowerCase() === livreurId.toLowerCase();
      })
      .sort((a, b) => a.heure.localeCompare(b.heure));

    return {
      success: true,
      scope: scope,
      dateRange: { start: startKey, end: endKey },
      tournees: tourneeObjects
    };

  } catch (e) {
    console.error('obtenirTournees error', e);
    return { success: false, error: e.message, tournees: [] };
  }
}

/**
 * Met à jour le statut
 */
function mettreAJourStatutTournee(tourneeId, nouveauStatut, livreurId) {
  if (!tourneeId) throw new Error("ID Tournée manquant");

  // Verrou pour éviter les conflits d'écriture
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);

    const sheetInfo = getSheetWithHeaders_(getTourneeSheetName_(), LIVRAISON_DATA.TOURNEE_HEADERS);
    const data = sheetInfo.sheet.getDataRange().getValues();

    const idxId = getHeaderColIndex_(sheetInfo.headers, 'ID');
    const idxStatut = getHeaderColIndex_(sheetInfo.headers, 'Statut');

    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idxId]) === String(tourneeId)) {
        sheetInfo.sheet.getRange(i + 1, idxStatut + 1).setValue(nouveauStatut);
        found = true;
        break;
      }
    }

    if (!found) throw new Error("Tournée introuvable");
    return { success: true };

  } catch (e) {
    console.error(e);
    return { success: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Sauvegarde une note
 */
function sauvegarderNote(noteData) {
  if (!noteData.tourneeId || !noteData.texte) return { success: false, error: "Données incomplètes" };

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    const sheetInfo = getSheetWithHeaders_(getNotesSheetName_(), LIVRAISON_DATA.NOTES_HEADERS);

    const row = [
      noteData.timestamp || new Date().toISOString(),
      noteData.tourneeId,
      noteData.texte,
      noteData.latitude || '',
      noteData.longitude || '',
      noteData.precision || '',
      noteData.adresseApprox || '',
      noteData.livreurId || ''
    ];

    sheetInfo.sheet.appendRow(row);
    return { success: true };

  } catch (e) {
    return { success: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Récupère l'historique des notes
 */
function obtenirNotesTournee(params) {
  const tourneeId = params.tourneeId || params.id;
  if (!tourneeId) return { success: false, error: "ID manquant" };

  try {
    const sheetInfo = getSheetWithHeaders_(getNotesSheetName_(), LIVRAISON_DATA.NOTES_HEADERS);
    const data = sheetInfo.sheet.getDataRange().getValues();
    const headers = sheetInfo.headers;

    const idxTournee = getHeaderColIndex_(headers, 'Tournee ID');

    // Mapping simple
    const notes = [];
    // On commence à 1 pour sauter le header
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idxTournee]) === String(tourneeId)) {
        notes.push({
          timestamp: data[i][0],
          texte: data[i][2],
          auteur: data[i][7]
        });
      }
    }

    // Tri récent -> vieux
    notes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return { success: true, notes: notes };

  } catch (e) {
    return { success: false, error: e.message };
  }
}

// =================================================================
// 3. HELPERS & PERSISTANCE
// =================================================================

function resolveLivreurFromRequest_(params) {
  // La seule source fiable est maintenant le paramètre `livreur`
  // passé après une connexion réussie.
  if (params && params.livreur) {
    return {
      id: params.livreur,
      source: 'authenticated_login'
    };
  }

  // Si aucun ID n'est fourni, on ne peut pas identifier le livreur.
  // C'est une sécurité pour empêcher l'accès non authentifié.
  throw new Error("Impossible d'identifier le livreur. Session invalide.");
}

function getSpreadsheet_() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty(LIVRAISON_DATA.PROP_SPREADSHEET_ID);
  let ss;

  if (id) {
    try { ss = SpreadsheetApp.openById(id); } catch(e) { id = null; }
  }

  if (!ss) {
    ss = SpreadsheetApp.create('ELS Livreur DB');
    props.setProperty(LIVRAISON_DATA.PROP_SPREADSHEET_ID, ss.getId());
  }
  return ss;
}

function getTourneeSheetName_() {
  return PropertiesService.getScriptProperties().getProperty(LIVRAISON_DATA.PROP_TOURNEES) || LIVRAISON_DATA.DEFAULT_TOURNEES;
}

function getNotesSheetName_() {
  return PropertiesService.getScriptProperties().getProperty(LIVRAISON_DATA.PROP_NOTES) || LIVRAISON_DATA.DEFAULT_NOTES;
}

function getSheetWithHeaders_(name, headers) {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  }
  // Vérif headers rapido (optionnel mais bien)
  const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn() || 1).getValues()[0];
  if (currentHeaders.length < headers.length) {
    // On assume qu'il faut ajouter
    // Simplification: on ne gère pas la migration complexe ici pour la vitesse
  }
  return { sheet: sheet, headers: headers }; // On retourne les headers attendus pour mapping
}

function getHeaderColIndex_(headers, name) {
  const idx = headers.indexOf(name);
  return idx === -1 ? 0 : idx; // Fallback 0 attention
}

function getDataRows_(sheet, numCols) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, numCols).getValues();
}

function mapTourneeRow_(row, rowIndex, sheet, tz, headerInfo) {
  // Nécessite une correspondance précise des index.
  // Pour être robuste, on devrait utiliser headerInfo.headers
  // Ici on assume l'ordre de LIVRAISON_DATA.TOURNEE_HEADERS
  // ['Date', 'ID', 'Heure', 'Client', 'Adresse', 'TotalStops', 'Statut', 'Livreur']

  const dateVal = row[0];
  if (!dateVal) return null;

  return {
    id: String(row[1]),
    dateKey: formatDateKey_(parseDate_(dateVal), tz),
    heure: formatTime_(row[2]),
    client: row[3],
    adresse: row[4],
    totalStops: row[5],
    statut: row[6] || 'a_venir',
    livreurId: row[7]
  };
}

function parseDate_(val) {
  if (val instanceof Date) return val;
  return new Date(val);
}

function formatDateKey_(date, tz) {
  if (!date) return '';
  return Utilities.formatDate(date, tz, 'yyyy-MM-dd');
}

function formatTime_(val) {
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'HH:mm');
  }
  return String(val);
}

function computeDateRange_(scope, baseDate) {
  const start = new Date(baseDate);
  const end = new Date(baseDate);

  if (scope === 'week') {
    const day = start.getDay() || 7; // Dimanche = 7
    start.setDate(start.getDate() - day + 1); // Lundi
    end.setDate(end.getDate() + (7 - day)); // Dimanche
  }

  return { start: start, end: end };
}

function bootstrapTourneesIfEmpty_(sheet, info) {
  if (sheet.getLastRow() <= 1) {
    const today = new Date();
    const demoData = [
      [today, 'T-101', '08:30', 'Pharmacie Centrale', '10 Rue de la Paix', 5, 'a_venir', 'demo'],
      [today, 'T-102', '10:00', 'Hôpital Nord', 'Chemin des Bourrely', 12, 'a_venir', 'demo']
    ];
    sheet.getRange(2, 1, demoData.length, demoData[0].length).setValues(demoData);
  }
}
