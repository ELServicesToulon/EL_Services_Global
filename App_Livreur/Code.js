// =================================================================
//                    ELS LIVREUR - POINT D'ENTREE
// =================================================================
// Description: WebApp legere pour les livreurs ELS
// Optimisee pour rapidite et usage mobile
// =================================================================

/**
 * Charge un template HTML en essayant les chemins utilises dans le projet principal
 * comme dans le module autonome.
 * @param {string} filename Nom du fichier sans extension.
 * @returns {GoogleAppsScript.HTML.HtmlTemplate} Template HtmlService pret a etre evalue.
 */
function loadLivraisonTemplate_(filename) {
  const candidatePaths = [
    'livraison/' + filename,
    filename
  ];
  const failures = [];
  for (var i = 0; i < candidatePaths.length; i++) {
    const path = candidatePaths[i];
    try {
      return HtmlService.createTemplateFromFile(path);
    } catch (err) {
      failures.push(path + ': ' + err.message);
    }
  }
  throw new Error('Template Livraison introuvable (' + filename + '): ' + failures.join(' | '));
}

/**
 * Point d'entree pour la webapp.
 * Passe l'identifiant livreur au template (query param > user email si disponible).
 * @param {Object} e - Event parameter contenant les query params
 * @returns {HtmlOutput} Interface HTML
 */
function renderLivraisonInterface(e) {
  const template = loadLivraisonTemplate_('Livraison_Interface');
  const livreurInfo = resolveLivreurFromRequest_(e);

  // Config exposee au front
  template.appVersion = '1.0.0';
  template.appName = 'ELS Livreur';
  template.livreurId = livreurInfo.id;
  template.livreurSource = livreurInfo.source;

  return template.evaluate()
    .setTitle('ELS Livreur')
    .setFaviconUrl('https://img.icons8.com/fluency/48/000000/delivery.png')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    // HtmlService only accepts a handful of meta tags; extra ones are injected at runtime in the HTML.
    .addMetaTag('apple-mobile-web-app-capable', 'yes');
}

/**
 * Point d'entree WebApp autonome.
 * @param {Object} e Parametres de requete.
 * @returns {HtmlOutput}
 */
function doGet(e) {
  return renderLivraisonInterface(e || {});
}

/**
 * Include des fichiers HTML partiels pour le module Livraison.
 * @param {string} filename - Nom du fichier a inclure (sans chemin).
 * @returns {string} Contenu du fichier.
 */
function includeLivraison(filename) {
  return loadLivraisonTemplate_(filename)
    .evaluate()
    .getContent();
}

/**
 * Obtenir les proprietes de configuration pour le module Livraison.
 * @returns {Object} Configuration.
 */
function getLivraisonConfig() {
  try {
    const ss = getSpreadsheet_();
    return {
      success: true,
      spreadsheetId: ss.getId(),
      spreadsheetUrl: ss.getUrl(),
      sheetNameTournees: getTourneeSheetName_(),
      sheetNameNotes: getNotesSheetName_(),
      timezone: Session.getScriptTimeZone()
    };
  } catch (error) {
    console.error('getLivraisonConfig', error);
    return { success: false, error: error.message };
  }
}

// =================================================================
//                   Gestion des donnees livreur
// =================================================================

const LIVRAISON_DATA = {
  PROP_SPREADSHEET_ID: 'SPREADSHEET_ID',
  PROP_TOURNEES: 'SHEET_TOURNEES',
  PROP_NOTES: 'SHEET_NOTES',
  DEFAULT_TOURNEES: 'Tourn\u00e9es',
  DEFAULT_NOTES: 'Notes_Livraison',
  TOURNEE_HEADERS: ['Date', 'ID', 'Heure', 'Client', 'Adresse', 'TotalStops', 'Statut', 'Livreur'],
  NOTES_HEADERS: [
    'Timestamp',
    'Tournee ID',
    'Texte',
    'Latitude',
    'Longitude',
    'Precision',
    'Adresse approx',
    'Auteur'
  ],
  STATUTS: ['a_venir', 'en_cours', 'termine'],
  DATE_FORMAT: 'yyyy-MM-dd'
};

/**
 * Retourne les tournees selon la plage demandee (jour ou semaine).
 * @param {Object} options { scope: 'day'|'week', date?: string, livreurId?: string }
 */
function obtenirTournees(options) {
  try {
    const tz = Session.getScriptTimeZone();
    const safeOptions = normaliseTourneesOptions_(options);
    const sheetInfo = getSheetWithHeaders_(getTourneeSheetName_(), LIVRAISON_DATA.TOURNEE_HEADERS);
    bootstrapTourneesIfEmpty_(sheetInfo.sheet, sheetInfo);

    const startKey = formatDateKey_(safeOptions.startDate, tz);
    const endKey = formatDateKey_(safeOptions.endDate, tz);

    const tournees = getDataRows_(sheetInfo.sheet, sheetInfo.headers.length)
      .map(function(row, index) {
        return mapTourneeRow_(row, index + 2, sheetInfo.sheet, tz, sheetInfo);
      })
      .filter(function(tournee) {
        return tournee && isDateInRange_(tournee.dateKey, startKey, endKey);
      })
      .filter(function(tournee) {
        if (!safeOptions.livreurId) {
          return true;
        }
        if (!tournee.livreurId) {
          return true; // autoriser les tournees non affectees
        }
        return tournee.livreurId === safeOptions.livreurId;
      })
      .sort(function(a, b) {
        return a.heure.localeCompare(b.heure);
      })
      .map(function(tournee) {
        return {
          id: tournee.id,
          heure: tournee.heure,
          client: tournee.client,
          adresse: tournee.adresse,
          totalStops: tournee.totalStops,
          statut: tournee.statut,
          livreurId: tournee.livreurId
        };
      });

    return {
      success: true,
      scope: safeOptions.scope,
      dateRange: {
        start: startKey,
        end: endKey
      },
      livreurId: safeOptions.livreurId,
      tournees: tournees
    };
  } catch (error) {
    console.error('obtenirTournees', error);
    return { success: false, error: error.message };
  }
}

/**
 * Retourne uniquement les tournees du jour (compatibilite).
 * @param {Object} options optionnellement {livreurId}
 */
function obtenirTourneeDuJour(options) {
  return obtenirTournees(Object.assign({}, options || {}, { scope: 'day' }));
}

/**
 * Sauvegarde une note envoyee par l'interface.
 * @param {Object} noteData
 */
function sauvegarderNote(noteData) {
  validerNote_(noteData);

  const sheet = getSheetWithHeaders_(getNotesSheetName_(), LIVRAISON_DATA.NOTES_HEADERS).sheet;
  const maintenant = noteData.timestamp ? new Date(noteData.timestamp) : new Date();
  const auteur = resolveLivreurId_(noteData.livreurId);
  const row = [
    maintenant.toISOString(),
    noteData.tourneeId,
    noteData.texte,
    noteData.latitude || '',
    noteData.longitude || '',
    noteData.precision || '',
    noteData.adresseApprox || '',
    auteur
  ];

  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    sheet.appendRow(row);
  } finally {
    lock.releaseLock();
  }

  return { success: true };
}

/**
 * Historique des notes pour une tournee.
 * @param {string|Object} request Identifiant ou objet { tourneeId, livreurId }
 */
function obtenirNotesTournee(request) {
  var tourneeId = request;
  var livreurId = '';
  if (typeof request === 'object' && request !== null) {
    tourneeId = request.tourneeId || request.id;
    livreurId = resolveLivreurId_(request.livreurId);
  }

  if (!tourneeId) {
    throw new Error('Identifiant de tournee requis');
  }

  try {
    const sheet = getSheetWithHeaders_(getNotesSheetName_(), LIVRAISON_DATA.NOTES_HEADERS).sheet;
    const notes = getDataRows_(sheet, sheet.getLastColumn())
      .filter(function(row) {
        return String(row[1]) === String(tourneeId);
      })
      .map(function(row) {
        return {
          tourneeId: row[1],
          texte: row[2],
          latitude: row[3],
          longitude: row[4],
          precision: row[5],
          adresseApprox: row[6],
          auteur: row[7] || '',
          timestamp: row[0]
        };
      })
      .sort(function(a, b) {
        return a.timestamp < b.timestamp ? 1 : -1;
      });

    // Pas de filtrage strict sur livreurId (aligner avec les tournees)
    return { success: true, notes: notes, livreurId: livreurId };
  } catch (error) {
    console.error('obtenirNotesTournee', error);
    return { success: false, error: error.message, notes: [] };
  }
}

/**
 * Met a jour le statut d'une tournee.
 * @param {string} tourneeId
 * @param {string} nouveauStatut
 * @param {string} livreurId
 */
function mettreAJourStatutTournee(tourneeId, nouveauStatut, livreurId) {
  if (!tourneeId) {
    throw new Error('Identifiant de tournee manquant');
  }
  const statutNormalise = normaliseStatut_(nouveauStatut);
  const sheetInfo = getSheetWithHeaders_(getTourneeSheetName_(), LIVRAISON_DATA.TOURNEE_HEADERS);
  const sheet = sheetInfo.sheet;
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    throw new Error('Aucune tournee enregistree');
  }

  const idCol = getHeaderCol_(sheetInfo.index, 'ID', 2);
  const statutCol = getHeaderCol_(sheetInfo.index, 'Statut', 7);
  const livreurCol = getHeaderCol_(sheetInfo.index, 'Livreur', 8);
  const livreurFiltre = resolveLivreurId_(livreurId);
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    for (var row = 1; row < values.length; row++) {
      if (String(values[row][idCol - 1]) === String(tourneeId)) {
        var tourneeLivreur = values[row][livreurCol - 1];
        if (livreurFiltre && tourneeLivreur && tourneeLivreur !== livreurFiltre) {
          throw new Error('Tournee assignee a un autre livreur');
        }
        sheet.getRange(row + 1, statutCol).setValue(statutNormalise);
        return { success: true };
      }
    }
  } finally {
    lock.releaseLock();
  }

  throw new Error('Tournee introuvable');
}

// =================================================================
// Helpers de persistance
// =================================================================

function getSpreadsheet_() {
  const props = PropertiesService.getScriptProperties();
  let spreadsheetId = props.getProperty(LIVRAISON_DATA.PROP_SPREADSHEET_ID);
  let ss = null;

  if (spreadsheetId) {
    try {
      ss = SpreadsheetApp.openById(spreadsheetId);
    } catch (error) {
      console.warn('Impossible d\'ouvrir le classeur configure, creation d\'un nouveau.', error);
      spreadsheetId = '';
    }
  }

  if (!ss) {
    ss = SpreadsheetApp.create('ELS Livreur - Donnees');
    props.setProperty(LIVRAISON_DATA.PROP_SPREADSHEET_ID, ss.getId());
    props.setProperty(LIVRAISON_DATA.PROP_TOURNEES, LIVRAISON_DATA.DEFAULT_TOURNEES);
    props.setProperty(LIVRAISON_DATA.PROP_NOTES, LIVRAISON_DATA.DEFAULT_NOTES);
  }

  // S'assurer que les feuilles existent avec les en-tetes requis
  ensureSheetHeaders_(ss, getTourneeSheetName_(), LIVRAISON_DATA.TOURNEE_HEADERS);
  ensureSheetHeaders_(ss, getNotesSheetName_(), LIVRAISON_DATA.NOTES_HEADERS);
  return ss;
}

function getTourneeSheetName_() {
  const props = PropertiesService.getScriptProperties();
  let name = props.getProperty(LIVRAISON_DATA.PROP_TOURNEES);
  if (!name) {
    name = LIVRAISON_DATA.DEFAULT_TOURNEES;
    props.setProperty(LIVRAISON_DATA.PROP_TOURNEES, name);
  }
  return name;
}

function getNotesSheetName_() {
  const props = PropertiesService.getScriptProperties();
  let name = props.getProperty(LIVRAISON_DATA.PROP_NOTES);
  if (!name) {
    name = LIVRAISON_DATA.DEFAULT_NOTES;
    props.setProperty(LIVRAISON_DATA.PROP_NOTES, name);
  }
  return name;
}

function getSheetWithHeaders_(sheetName, requiredHeaders) {
  const ss = getSpreadsheet_();
  const info = ensureSheetHeaders_(ss, sheetName, requiredHeaders);
  if (!info.sheet) {
    throw new Error('Feuille introuvable: ' + sheetName);
  }
  return info;
}

function ensureSheetHeaders_(spreadsheet, sheetName, requiredHeaders) {
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  // Si feuille vide, injecter directement les en-tetes
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders]);
    return { sheet: sheet, headers: requiredHeaders.slice(), index: buildHeaderIndex_(requiredHeaders) };
  }

  const headerRange = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), requiredHeaders.length));
  const currentHeaders = headerRange.getValues()[0].map(function(h) {
    return h || '';
  });

  var changed = false;
  requiredHeaders.forEach(function(header) {
    if (currentHeaders.indexOf(header) === -1) {
      currentHeaders.push(header);
      changed = true;
    }
  });

  if (changed) {
    sheet.getRange(1, 1, 1, currentHeaders.length).setValues([currentHeaders]);
  }

  return { sheet: sheet, headers: currentHeaders, index: buildHeaderIndex_(currentHeaders) };
}

function buildHeaderIndex_(headers) {
  const index = {};
  headers.forEach(function(name, idx) {
    if (!name) {
      return;
    }
    const key = name.toString().trim();
    if (!index.hasOwnProperty(key)) {
      index[key] = idx;
    }
  });
  return index;
}

function getDataRows_(sheet, columnCount) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return [];
  }
  const columns = Math.max(1, columnCount || sheet.getLastColumn());
  const range = sheet.getRange(2, 1, lastRow - 1, columns);
  return range.getValues().filter(function(row) {
    return row.some(function(cell) {
      return cell !== '' && cell !== null;
    });
  });
}

function mapTourneeRow_(row, rowIndex, sheet, tz, headerInfo) {
  const headerIndex = headerInfo.index || {};
  const dateCol = getHeaderCol_(headerIndex, 'Date', 1);
  const idCol = getHeaderCol_(headerIndex, 'ID', 2);
  const heureCol = getHeaderCol_(headerIndex, 'Heure', 3);
  const clientCol = getHeaderCol_(headerIndex, 'Client', 4);
  const adresseCol = getHeaderCol_(headerIndex, 'Adresse', 5);
  const stopsCol = getHeaderCol_(headerIndex, 'TotalStops', 6);
  const statutCol = getHeaderCol_(headerIndex, 'Statut', 7);
  const livreurCol = getHeaderCol_(headerIndex, 'Livreur', 8);

  const date = parseDateValue_(row[dateCol - 1]);
  if (!date) {
    return null;
  }

  var id = row[idCol - 1];
  if (!id) {
    id = 'TR-' + Utilities.getUuid().slice(0, 8).toUpperCase();
    sheet.getRange(rowIndex, idCol).setValue(id);
  }

  return {
    id: String(id),
    dateKey: formatDateKey_(date, tz),
    heure: formatHeure_(row[heureCol - 1]),
    client: row[clientCol - 1] || 'Client',
    adresse: row[adresseCol - 1] || 'Adresse non renseignee',
    totalStops: Number(row[stopsCol - 1]) || 0,
    statut: normaliseStatut_(row[statutCol - 1]),
    livreurId: normaliseLivreurId_(row[livreurCol - 1])
  };
}

function getHeaderCol_(headerIndex, name, fallback) {
  if (headerIndex && headerIndex.hasOwnProperty(name)) {
    return headerIndex[name] + 1; // 1-based
  }
  return fallback;
}

function formatHeure_(value) {
  if (!value) {
    return '--:--';
  }
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'HH:mm');
  }
  return value.toString();
}

function parseDateValue_(value) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  const numeric = Number(value);
  if (!isNaN(numeric) && numeric > 0) {
    return new Date(numeric);
  }
  const direct = new Date(value);
  if (!isNaN(direct.getTime())) {
    return direct;
  }
  const parts = value.toString().split(/[\\/\\-]/);
  if (parts.length === 3) {
    const day = Number(parts[0]);
    const month = Number(parts[1]) - 1;
    const year = Number(parts[2]);
    const composed = new Date(year, month, day);
    if (!isNaN(composed.getTime())) {
      return composed;
    }
  }
  return null;
}

function formatDateKey_(date, tz) {
  return Utilities.formatDate(date, tz, LIVRAISON_DATA.DATE_FORMAT);
}

function normaliseStatut_(statut) {
  if (!statut) {
    return LIVRAISON_DATA.STATUTS[0];
  }
  const value = statut.toString().toLowerCase().trim();
  if (LIVRAISON_DATA.STATUTS.indexOf(value) === -1) {
    return LIVRAISON_DATA.STATUTS[0];
  }
  return value;
}

function normaliseLivreurId_(value) {
  if (!value) {
    return '';
  }
  return value.toString().trim();
}

function normaliseTourneesOptions_(options) {
  const scope = (options && options.scope === 'week') ? 'week' : 'day';
  const baseDate = options && options.date ? parseDateValue_(options.date) : null;
  const anchorDate = baseDate || new Date();
  const range = computeDateRange_(scope, anchorDate);

  return {
    scope: scope,
    startDate: range.start,
    endDate: range.end,
    livreurId: resolveLivreurId_(options && options.livreurId)
  };
}

function computeDateRange_(scope, baseDate) {
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(baseDate);
  end.setHours(23, 59, 59, 999);

  if (scope === 'week') {
    var day = start.getDay();
    // Convertir dimanche (0) -> 7 pour commencer lundi
    var diffToMonday = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diffToMonday);
    end.setTime(start.getTime());
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  }

  return { start: start, end: end };
}

function isDateInRange_(dateKey, startKey, endKey) {
  return dateKey >= startKey && dateKey <= endKey;
}

function resolveLivreurId_(provided) {
  const fromParam = normaliseLivreurId_(provided);
  if (fromParam) {
    return fromParam;
  }
  const activeUser = Session.getActiveUser();
  const email = activeUser ? activeUser.getEmail() : '';
  return normaliseLivreurId_(email);
}

function resolveLivreurFromRequest_(e) {
  var id = '';
  var source = 'inconnu';
  if (e && e.parameter) {
    var paramId = e.parameter.livreur || e.parameter.user || e.parameter.driver || e.parameter.email;
    paramId = normaliseLivreurId_(paramId);
    if (paramId) {
      id = paramId;
      source = 'query';
    }
  }
  if (!id) {
    const activeUser = Session.getActiveUser();
    const email = activeUser ? activeUser.getEmail() : '';
    if (email) {
      id = email;
      source = 'session';
    }
  }
  return { id: id, source: source };
}

function bootstrapTourneesIfEmpty_(sheet, headerInfo) {
  if (sheet.getLastRow() > 1) {
    return;
  }
  const today = new Date();
  const demoLivreur = 'demo.livreur@els';
  const rows = [
    [today, 'TR-001', '08:00', 'Pharmacie du Centre', '12 Rue Victor Hugo, Lyon', 8, 'a_venir', demoLivreur],
    [today, 'TR-002', '11:00', 'Clinique des Lilas', '5 Avenue de la Republique, Villeurbanne', 5, 'a_venir', demoLivreur],
    [today, 'TR-003', '15:00', 'Maison de Retraite Soleil', '24 Rue des Fleurs, Bron', 6, 'a_venir', demoLivreur]
  ];
  sheet.getRange(2, 1, rows.length, headerInfo.headers.length).setValues(rows);
  sheet.getRange(2, 1, rows.length).setNumberFormat('dd/MM/yyyy');
  const heureCol = getHeaderCol_(headerInfo.index, 'Heure', 3);
  sheet.getRange(2, heureCol, rows.length, 1).setNumberFormat('HH:mm');
}

function validerNote_(noteData) {
  if (!noteData || typeof noteData !== 'object') {
    throw new Error('Note invalide');
  }
  if (!noteData.tourneeId) {
    throw new Error('tourneeId manquant');
  }
  if (!noteData.texte) {
    throw new Error('Le texte de la note est obligatoire');
  }
}
