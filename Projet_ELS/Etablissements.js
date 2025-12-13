// =================================================================
//               BASE DES ETABLISSEMENTS DESSERVIS (SHEET)
// =================================================================
// Description: Provisionne l'onglet "Base_Etablissements" et y
//              synchronise les donnees connues (clients, demandes).
// =================================================================

/**
 * Retourne la liste canonique des en-tetes de la base etablissements.
 * @returns {string[]}
 */
function getEtablissementsHeaders_() {
  return [
    COLONNE_TYPE_ETAB,
    COLONNE_NOM_ETAB,
    COLONNE_ADRESSE_ETAB,
    COLONNE_CODE_POSTAL_ETAB,
    COLONNE_VILLE_ETAB,
    COLONNE_CONTACT_ETAB,
    COLONNE_TELEPHONE_ETAB,
    COLONNE_EMAIL_ETAB,
    COLONNE_SITE_WEB_ETAB,
    COLONNE_JOURS_ETAB,
    COLONNE_PLAGE_ETAB,
    COLONNE_SOURCE_ETAB,
    COLONNE_PHARMACIE_REFERENTE,
    COLONNE_STATUT_ETAB,
    COLONNE_DERNIERE_MAJ_ETAB,
    COLONNE_NOTE_ETAB,
    COLONNE_PLACE_ID_ETAB
  ];
}

/**
 * Normalise un type d'etablissement vers la valeur canonique.
 * @param {string} rawType
 * @returns {string}
 */
function normalizeEtablissementType_(rawType) {
  let value = String(rawType || '').trim().toLowerCase();
  if (value && typeof value.normalize === 'function') {
    value = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  if (!value) return '';
  if (value.indexOf('pharm') !== -1) return 'Pharmacie';
  if (value.indexOf('ehpad') !== -1) return 'EHPAD';
  if (value.indexOf('foyer') !== -1) return 'Foyer de Vie';
  if (value.indexOf('residence') !== -1 || value.indexOf('senior') !== -1) return 'Residence Senior';
  if (Array.isArray(ETABLISSEMENT_TYPES)) {
    const direct = ETABLISSEMENT_TYPES.find(function(t) { return t && t.toLowerCase() === value; });
    if (direct) return direct;
  }
  return '';
}

/**
 * Construit une cle stable pour de-dupliquer les etablissements.
 * @param {string} type
 * @param {string} nom
 * @param {string|number} codePostal
 * @returns {string}
 */
function buildEtablissementKey_(type, nom, codePostal) {
  const cp = normaliserCodePostal(codePostal);
  const nomNettoye = String(nom || '').trim().toLowerCase();
  const typeNorm = normalizeEtablissementType_(type);
  if (!cp || !nomNettoye || !typeNorm) {
    return '';
  }
  return [typeNorm.toLowerCase(), cp, nomNettoye].join('::');
}

/**
 * Cree la feuille si besoin et ajoute les en-tetes manquants.
 * Applique aussi les validations de base (types, codes postaux, checkbox actif).
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet=} ss
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function ensureEtablissementsSheet_(ss) {
  const headers = getEtablissementsHeaders_();
  const spreadsheet = ss || SpreadsheetApp.openById(getSecret('ID_FEUILLE_CALCUL'));
  let sheet = spreadsheet.getSheetByName(SHEET_ETABLISSEMENTS);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_ETABLISSEMENTS);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  } else {
    const firstRow = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length))
      .getValues()[0]
      .map(function(v) { return String(v || '').trim(); });
    const missing = headers.filter(function(h) { return firstRow.indexOf(h) === -1; });
    if (missing.length) {
      sheet.getRange(1, sheet.getLastColumn() + 1, 1, missing.length).setValues([missing]);
    }
    sheet.setFrozenRows(1);
  }
  applyEtablissementsValidations_(spreadsheet, sheet);
  return sheet;
}

/**
 * Applique les regles de validation (types et codes postaux desservis).
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 */
function applyEtablissementsValidations_(ss, sheet) {
  const headers = getEtablissementsHeaders_();
  const headerMap = {};
  headers.forEach(function(h, idx) { headerMap[h] = idx; });
  const maxRows = Math.max(1, sheet.getMaxRows() - 1);

  const typeValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(ETABLISSEMENT_TYPES, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, headerMap[COLONNE_TYPE_ETAB] + 1, maxRows, 1).setDataValidation(typeValidation);

  const statusValidation = SpreadsheetApp.newDataValidation()
    .requireCheckbox()
    .build();
  sheet.getRange(2, headerMap[COLONNE_STATUT_ETAB] + 1, maxRows, 1).setDataValidation(statusValidation);

  const codesSheet = ss.getSheetByName(SHEET_CODES_POSTAUX_RETRAIT);
  if (codesSheet) {
    const codesRange = codesSheet.getRange('A2:A');
    const cpValidation = SpreadsheetApp.newDataValidation()
      .requireValueInRange(codesRange, true)
      .setAllowInvalid(true)
      .build();
    sheet.getRange(2, headerMap[COLONNE_CODE_POSTAL_ETAB] + 1, maxRows, 1).setDataValidation(cpValidation);
  }

  // Validation dynamique pour la colonne Pharmacie Référente
  if (headerMap[COLONNE_PHARMACIE_REFERENTE] !== undefined) {
    const data = sheet.getDataRange().getValues();
    const idxType = headerMap[COLONNE_TYPE_ETAB];
    const idxNom = headerMap[COLONNE_NOM_ETAB];
    const pharmacies = [];

    // Récupérer la liste des pharmacies existantes
    for (let i = 1; i < data.length; i++) {
      if (normalizeEtablissementType_(data[i][idxType]) === 'Pharmacie') {
        const nom = String(data[i][idxNom] || '').trim();
        if (nom) pharmacies.push(nom);
      }
    }

    // Trier et dédoublonner
    const uniquePharmacies = [...new Set(pharmacies)].sort();

    if (uniquePharmacies.length > 0) {
      const phValidation = SpreadsheetApp.newDataValidation()
        .requireValueInList(uniquePharmacies, true)
        .setAllowInvalid(true) // Permettre de laisser vide ou saisie libre si nouvelle
        .build();
      sheet.getRange(2, headerMap[COLONNE_PHARMACIE_REFERENTE] + 1, maxRows, 1).setDataValidation(phValidation);
    }
  }
}

/**
 * Essaie d'extraire un code postal depuis une adresse libre.
 * @param {string} adresse
 * @returns {string}
 */
function extractCodePostalFromAddress_(adresse) {
  const match = String(adresse || '').match(/\b(\d{5})\b/);
  return match ? normaliserCodePostal(match[1]) : '';
}

/**
 * Nettoie l'adresse en supprimant le code postal.
 * @param {string} fullAddress
 * @param {string} postalCode
 * @returns {string}
 */
function cleanAddress_(fullAddress, postalCode) {
  if (!fullAddress) return '';
  let clean = String(fullAddress);
  if (postalCode) {
    const regex = new RegExp('\\b' + postalCode + '\\b', 'g');
    clean = clean.replace(regex, '');
  }
  return clean
    .replace(/\s+/g, ' ')
    .replace(/ ,/g, ',')
    .replace(/, \s*,/g, ',')
    .trim()
    .replace(/^,/, '')
    .replace(/,$/, '')
    .trim();
}

/**
 * Nettoie et valide un email.
 * @param {string} value
 * @returns {string}
 */
function normalizeEmailSafe_(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!email) return '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

/**
 * Construit un index des emails connus depuis Clients et Demandes.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @returns {{index:Map<string,{email:string,source:string}>,stats:{clients:number,demandes:number}}}
 */
function construireIndexEmailsConnus_(ss) {
  const index = new Map();
  let clientsCount = 0;
  let demandesCount = 0;

  try {
    const clientsSheet = ss.getSheetByName(SHEET_CLIENTS);
    if (clientsSheet && clientsSheet.getLastRow() > 1) {
      const idxClients = obtenirIndicesEnTetes(clientsSheet, ["Email", "Raison Sociale", COLONNE_CODE_POSTAL_CLIENT]);
      const dataClients = clientsSheet.getDataRange().getValues();
      for (let i = 1; i < dataClients.length; i++) {
        const row = dataClients[i];
        const email = normalizeEmailSafe_(row[idxClients["Email"]]);
        const nom = row[idxClients["Raison Sociale"]];
        const cp = row[idxClients[COLONNE_CODE_POSTAL_CLIENT]];
        const key = buildEtablissementKey_('Pharmacie', nom, cp);
        if (email && key && !index.has(key)) {
          index.set(key, { email: email, source: 'Clients' });
          clientsCount++;
        }
      }
    }
  } catch (errClients) {
    Logger.log('[construireIndexEmailsConnus_] Clients error: ' + errClients);
  }

  try {
    const demandesSheet = ss.getSheetByName(SHEET_DEMANDES_TOURNEE);
    if (demandesSheet && demandesSheet.getLastRow() > 1) {
      const idxDem = obtenirIndicesEnTetes(demandesSheet, ['etablissement_type', 'etablissement_nom', 'contact_email', 'adresse']);
      const dataDem = demandesSheet.getDataRange().getValues();
      for (let i = 1; i < dataDem.length; i++) {
        const row = dataDem[i];
        const type = normalizeEtablissementType_(row[idxDem['etablissement_type']]);
        const nom = row[idxDem['etablissement_nom']];
        const email = normalizeEmailSafe_(row[idxDem['contact_email']]);
        const cp = extractCodePostalFromAddress_(row[idxDem['adresse']]);
        const key = buildEtablissementKey_(type, nom, cp);
        if (email && key && !index.has(key)) {
          index.set(key, { email: email, source: 'Demandes' });
          demandesCount++;
        }
      }
    }
  } catch (errDem) {
    Logger.log('[construireIndexEmailsConnus_] Demandes error: ' + errDem);
  }

  return { index: index, stats: { clients: clientsCount, demandes: demandesCount } };
}

/**
 * Provisionne la base des etablissements desservis en important:
 * - les clients existants (type Pharmacie)
 * - les demandes de tournee (EHPAD / Residence / Foyer)
 * Seuls les codes postaux desservis sont retenus.
 * @param {{importClients?:boolean, importDemandes?:boolean}=} options
 * @returns {{ok:boolean, added:number, total:number, existing:number}}
 */
function provisionnerBaseEtablissements(options) {
  const opts = options || {};
  const ss = SpreadsheetApp.openById(getSecret('ID_FEUILLE_CALCUL'));
  const sheet = ensureEtablissementsSheet_(ss);
  const headers = getEtablissementsHeaders_();
  const indices = obtenirIndicesEnTetes(sheet, headers);

  const donneesExistantes = sheet.getDataRange().getValues();
  const clefs = new Set();
  for (let i = 1; i < donneesExistantes.length; i++) {
    const ligne = donneesExistantes[i];
    const cle = buildEtablissementKey_(ligne[indices[COLONNE_TYPE_ETAB]], ligne[indices[COLONNE_NOM_ETAB]], ligne[indices[COLONNE_CODE_POSTAL_ETAB]]);
    if (cle) {
      clefs.add(cle);
    }
  }

  const codesDesservis = new Set(obtenirCodesPostauxRetrait({ forceRefresh: true }) || []);
  const limiterAuxCodes = codesDesservis.size > 0;
  const lignesAAjouter = [];

  function enqueue(item) {
    const typeNorm = normalizeEtablissementType_(item.type);
    const nom = String(item.nom || '').trim();
    const code = normaliserCodePostal(item.codePostal);
    if (!typeNorm || !nom || !code) return;
    if (limiterAuxCodes && !codesDesservis.has(code)) return;
    const cle = buildEtablissementKey_(typeNorm, nom, code);
    if (!cle || clefs.has(cle)) return;
    clefs.add(cle);
    lignesAAjouter.push([
      typeNorm,
      nom,
      cleanAddress_(item.adresse, code),
      code,
      item.ville || '',
      item.contact || '',
      item.telephone || '',
      item.email || '',
      item.siteWeb || '',
      item.jours || '',
      item.plage || '',
      item.source || '',
      '', // COLONNE_PHARMACIE_REFERENTE
      true,
      new Date(),
      item.note || '',
      item.placeId || ''
    ]);
  }

  if (opts.importClients !== false) {
    const clientsSheet = ss.getSheetByName(SHEET_CLIENTS);
    if (clientsSheet && clientsSheet.getLastRow() > 1) {
      let idxClients = null;
      try {
        idxClients = obtenirIndicesEnTetes(clientsSheet, ["Email", "Raison Sociale", "Adresse", COLONNE_CODE_POSTAL_CLIENT, COLONNE_TELEPHONE_CLIENT]);
      } catch (errClients) {
        try {
          idxClients = obtenirIndicesEnTetes(clientsSheet, ["Email", "Raison Sociale", "Adresse", COLONNE_CODE_POSTAL_CLIENT]);
        } catch (_err2) {
          idxClients = null;
        }
      }
      if (idxClients) {
        const data = clientsSheet.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          enqueue({
            type: 'Pharmacie',
            nom: row[idxClients["Raison Sociale"]],
            adresse: row[idxClients["Adresse"]],
            codePostal: row[idxClients[COLONNE_CODE_POSTAL_CLIENT]],
            telephone: idxClients[COLONNE_TELEPHONE_CLIENT] !== undefined ? row[idxClients[COLONNE_TELEPHONE_CLIENT]] : '',
            email: row[idxClients["Email"]],
            source: 'Clients'
          });
        }
      }
    }
  }

  if (opts.importDemandes !== false) {
    const demandesSheet = ss.getSheetByName(SHEET_DEMANDES_TOURNEE);
    if (demandesSheet && demandesSheet.getLastRow() > 1) {
      let idxDem = null;
      try {
        idxDem = obtenirIndicesEnTetes(demandesSheet, ['etablissement_type', 'etablissement_nom', 'contact_email', 'contact_tel', 'adresse', 'jours_souhaites', 'plage_horaire', 'details']);
      } catch (errDem) {
        idxDem = null;
      }
      if (idxDem) {
        const dataDem = demandesSheet.getDataRange().getValues();
        for (let i = 1; i < dataDem.length; i++) {
          const row = dataDem[i];
          const type = normalizeEtablissementType_(row[idxDem['etablissement_type']]);
          const nom = row[idxDem['etablissement_nom']];
          const adresse = row[idxDem['adresse']];
          const code = extractCodePostalFromAddress_(adresse);
          const notePieces = [];
          if (idxDem['details'] !== undefined && row[idxDem['details']]) {
            notePieces.push(String(row[idxDem['details']]));
          }
          enqueue({
            type: type,
            nom: nom,
            adresse: adresse,
            codePostal: code,
            telephone: idxDem['contact_tel'] !== undefined ? row[idxDem['contact_tel']] : '',
            email: idxDem['contact_email'] !== undefined ? row[idxDem['contact_email']] : '',
            jours: idxDem['jours_souhaites'] !== undefined ? row[idxDem['jours_souhaites']] : '',
            plage: idxDem['plage_horaire'] !== undefined ? row[idxDem['plage_horaire']] : '',
            source: 'Demandes',
            note: notePieces.join('\n')
          });
        }
      }
    }
  }

  if (lignesAAjouter.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, lignesAAjouter.length, headers.length).setValues(lignesAAjouter);
  }
  applyEtablissementsValidations_(ss, sheet);

  let emailsUpdate = null;
  try {
    emailsUpdate = completerEmailsBaseEtablissements({ ss: ss, sheet: sheet, indices: indices });
  } catch (errEmails) {
    Logger.log('[provisionnerBaseEtablissements] Email sync failed: ' + errEmails);
  }

  const totalLignes = Math.max(0, sheet.getLastRow() - 1);
  return {
    ok: true,
    added: lignesAAjouter.length,
    total: totalLignes,
    existing: clefs.size,
    emailsUpdated: emailsUpdate && typeof emailsUpdate.updated === 'number' ? emailsUpdate.updated : 0
  };
}

/**
 * Complete les emails manquants dans Base_Etablissements depuis Clients/Demandes.
 * @param {{ss?:GoogleAppsScript.Spreadsheet.Spreadsheet,sheet?:GoogleAppsScript.Spreadsheet.Sheet,indices?:Object,emailIndex?:{index:Map,stats:Object}}=} options
 * @returns {{ok:boolean,updated:number,total:number,sourceEmails:{clients:number,demandes:number}}}
 */
function completerEmailsBaseEtablissements(options) {
  const opts = options || {};
  const ss = opts.ss || SpreadsheetApp.openById(getSecret('ID_FEUILLE_CALCUL'));
  const sheet = opts.sheet || ensureEtablissementsSheet_(ss);
  const headers = getEtablissementsHeaders_();
  const indices = opts.indices || obtenirIndicesEnTetes(sheet, headers);
  const emailIndexData = opts.emailIndex || construireIndexEmailsConnus_(ss);
  const emailIndex = emailIndexData.index || new Map();
  const stats = emailIndexData.stats || { clients: 0, demandes: 0 };

  const data = sheet.getDataRange().getValues();
  const idxType = indices[COLONNE_TYPE_ETAB];
  const idxNom = indices[COLONNE_NOM_ETAB];
  const idxCp = indices[COLONNE_CODE_POSTAL_ETAB];
  const idxEmail = indices[COLONNE_EMAIL_ETAB];
  const idxSource = indices[COLONNE_SOURCE_ETAB];
  const idxMaj = indices[COLONNE_DERNIERE_MAJ_ETAB];

  let updated = 0;
  const now = new Date();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (normalizeEmailSafe_(row[idxEmail])) {
      continue;
    }
    const key = buildEtablissementKey_(row[idxType], row[idxNom], row[idxCp]);
    const candidate = key ? emailIndex.get(key) : null;
    if (candidate && candidate.email) {
      const sheetRow = i + 1;
      sheet.getRange(sheetRow, idxEmail + 1).setValue(candidate.email);
      if (typeof idxSource === 'number' && !row[idxSource] && candidate.source) {
        sheet.getRange(sheetRow, idxSource + 1).setValue(candidate.source);
      }
      if (typeof idxMaj === 'number') {
        sheet.getRange(sheetRow, idxMaj + 1).setValue(now);
      }
      updated++;
    }
  }

  return { ok: true, updated: updated, total: Math.max(0, data.length - 1), sourceEmails: stats };
}

// =================================================================
//              IMPORT GOOGLE PLACES (fusion Service_GooglePlaces)
// =================================================================

const GOOGLE_PLACES_DETAILS_FIELDS = 'formatted_phone_number,website,url';

function googlePlacesGetApiKey_() {
  if (typeof Config !== 'undefined' && typeof Config.getMapsApiKey === 'function') {
    return Config.getMapsApiKey();
  }
  if (typeof getMapsApiKey === 'function') {
    return getMapsApiKey();
  }
  throw new Error('Maps_API_KEY manquant dans la configuration.');
}

function googlePlacesParseAddress_(formattedAddress) {
  const result = { cp: '', ville: '' };
  if (!formattedAddress) return result;
  const match = String(formattedAddress).match(/(\d{5})\s+([^,]+)/);
  if (match) {
    result.cp = match[1];
    result.ville = match[2].trim().replace(/, France$/, '').trim();
  }
  return result;
}

function googlePlacesFetchDetails_(placeId, apiKey) {
  if (!placeId) return {};
  try {
    const url = 'https://maps.googleapis.com/maps/api/place/details/json'
      + '?place_id=' + encodeURIComponent(placeId)
      + '&fields=' + encodeURIComponent(GOOGLE_PLACES_DETAILS_FIELDS)
      + '&language=fr'
      + '&key=' + apiKey;
    const resp = UrlFetchApp.fetch(url);
    const json = JSON.parse(resp.getContentText() || '{}');
    if (json.status === 'OK' && json.result) {
      return {
        phone: json.result.formatted_phone_number || '',
        website: json.result.website || '',
        url: json.result.url || ''
      };
    }
  } catch (e) {
    Logger.log('Erreur details API pour ' + placeId + ': ' + e);
  }
  return {};
}

function googlePlacesGetSheetContext_() {
  const ss = SpreadsheetApp.openById(getSecret('ID_FEUILLE_CALCUL'));
  const sheet = ensureEtablissementsSheet_(ss);
  const headers = getEtablissementsHeaders_();
  const indices = obtenirIndicesEnTetes(sheet, headers);
  return { ss: ss, sheet: sheet, headers: headers, indices: indices };
}

function googlePlacesImporterEtablissements_(query, typeEtablissement) {
  const apiKey = googlePlacesGetApiKey_();
  if (!apiKey) {
    throw new Error('Cle API Google Maps manquante.');
  }
  const typeFinal = typeEtablissement || 'Pharmacie';
  const { sheet, headers, indices } = googlePlacesGetSheetContext_();
  const codesDesservis = new Set(obtenirCodesPostauxRetrait({ forceRefresh: true }) || []);

  const existingKeys = new Set();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const cle = buildEtablissementKey_(row[indices[COLONNE_TYPE_ETAB]], row[indices[COLONNE_NOM_ETAB]], row[indices[COLONNE_CODE_POSTAL_ETAB]]);
    if (cle) {
      existingKeys.add(cle);
    }
  }

  const searchUrl = 'https://maps.googleapis.com/maps/api/place/textsearch/json'
    + '?query=' + encodeURIComponent(query)
    + '&region=fr'
    + '&language=fr'
    + '&key=' + apiKey;
  const response = UrlFetchApp.fetch(searchUrl);
  const json = JSON.parse(response.getContentText() || '{}');
  if (json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
    throw new Error('Erreur API Places : ' + json.status + ' - ' + (json.error_message || ''));
  }

  const results = Array.isArray(json.results) ? json.results : [];
  if (results.length === 0) {
    return '0 ajoutes.';
  }

  const newRows = [];
  const now = new Date();

  results.forEach(function(place) {
    const parsed = googlePlacesParseAddress_(place.formatted_address || '');
    const cp = normaliserCodePostal(parsed.cp);
    if (!cp) return;
    if (codesDesservis.size > 0 && !codesDesservis.has(cp)) return;

    const key = buildEtablissementKey_(typeFinal, place.name, cp);
    if (!key || existingKeys.has(key)) return;

    const details = place.place_id ? googlePlacesFetchDetails_(place.place_id, apiKey) : {};
    const row = new Array(headers.length).fill('');
    row[indices[COLONNE_TYPE_ETAB]] = typeFinal;
    row[indices[COLONNE_NOM_ETAB]] = place.name || '';
    row[indices[COLONNE_ADRESSE_ETAB]] = cleanAddress_(place.formatted_address, cp);
    row[indices[COLONNE_CODE_POSTAL_ETAB]] = cp;
    row[indices[COLONNE_VILLE_ETAB]] = parsed.ville || '';
    row[indices[COLONNE_TELEPHONE_ETAB]] = details.phone || '';
    row[indices[COLONNE_SITE_WEB_ETAB]] = details.website || '';
    row[indices[COLONNE_SOURCE_ETAB]] = 'GoogleAPI';
    row[indices[COLONNE_STATUT_ETAB]] = true;
    row[indices[COLONNE_DERNIERE_MAJ_ETAB]] = now;
    if (place.place_id) {
      row[indices[COLONNE_NOTE_ETAB]] = 'PlaceID: ' + place.place_id;
      row[indices[COLONNE_PLACE_ID_ETAB]] = place.place_id;
    }
    if (details.url) {
      const existingNote = row[indices[COLONNE_NOTE_ETAB]] || '';
      row[indices[COLONNE_NOTE_ETAB]] = (existingNote ? existingNote + ' | ' : '') + 'URL: ' + details.url;
    }

    newRows.push(row);
    existingKeys.add(key);
    if (place.place_id) {
      Utilities.sleep(150);
    }
  });

  if (newRows.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, headers.length).setValues(newRows);
  }
  return (newRows.length || 0) + ' ajoutes.';
}

/**
 * Importe des etablissements via Google Places (texte libre).
 * @param {string} query
 * @param {string} typeEtablissement
 * @returns {string}
 */
function importerEtablissements(query, typeEtablissement) {
  return googlePlacesImporterEtablissements_(query, typeEtablissement);
}

/**
 * Enrichit les lignes possedant un PlaceID (telephone, site web).
 * @returns {string}
 */
function enrichirDetails() {
  return enrichirDetailsBaseEtablissements_();
}

function enrichirDetailsBaseEtablissements_() {
  const apiKey = googlePlacesGetApiKey_();
  const { sheet, indices } = googlePlacesGetSheetContext_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 'Vide';

  const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  let updatedCount = 0;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const phone = String(row[indices[COLONNE_TELEPHONE_ETAB]] || '').trim();
    const site = String(row[indices[COLONNE_SITE_WEB_ETAB]] || '').trim();
    let placeId = String(row[indices[COLONNE_PLACE_ID_ETAB]] || '').trim();
    const note = String(row[indices[COLONNE_NOTE_ETAB]] || '');

    if (!placeId && note.indexOf('PlaceID:') > -1) {
      const match = note.match(/PlaceID:\s*([A-Za-z0-9_\-]+)/);
      if (match) placeId = match[1];
    }

    if (placeId && (!phone || !site)) {
      const details = googlePlacesFetchDetails_(placeId, apiKey);
      if (details.phone && !phone) {
        sheet.getRange(i + 2, indices[COLONNE_TELEPHONE_ETAB] + 1).setValue(details.phone);
        updatedCount++;
      }
      if (details.website && !site) {
        sheet.getRange(i + 2, indices[COLONNE_SITE_WEB_ETAB] + 1).setValue(details.website);
        updatedCount++;
      }
      Utilities.sleep(150);
    }
  }
  return updatedCount + ' fiches mises a jour.';
}

/**
 * Importe les etablissements pour une liste de codes postaux (ou depuis Codes_Postaux_Retrait si vide).
 * @param {Array<string|{codePostal:string,commune?:string}>} codes
 * @param {string} type
 * @param {{sleepMs?:number}=} options
 * @returns {string}
 */
function importerEtablissementsParCodesPostaux(codes, type, options) {
  const sleepMs = (options && options.sleepMs) || 250;
  const typeFinal = type || 'Pharmacie';
  let liste = [];

  if (!Array.isArray(codes) || codes.length === 0) {
    try {
      if (typeof obtenirCodesPostauxRetraitAvecCommunes === 'function') {
        liste = obtenirCodesPostauxRetraitAvecCommunes({ forceRefresh: true });
      } else if (typeof obtenirCodesPostauxRetrait === 'function') {
        liste = obtenirCodesPostauxRetrait({ forceRefresh: true }).map(function(cp) {
          return { codePostal: cp, commune: '' };
        });
      }
    } catch (_err) {}
  } else {
    liste = codes.map(function(entry) {
      if (entry && typeof entry === 'object') {
        return { codePostal: entry.codePostal || entry.cp || entry.code || '', commune: entry.commune || entry.ville || entry.libelle || '' };
      }
      return { codePostal: entry, commune: '' };
    });
  }

  if (!Array.isArray(liste) || liste.length === 0) {
    throw new Error('Aucun code postal fourni ou disponible dans Codes_Postaux_Retrait.');
  }

  let totalAjoutes = 0;
  let requetes = 0;

  liste.forEach(function(item) {
    const cp = String(item.codePostal || '').trim();
    if (!cp) return;
    const communePart = item.commune ? (' ' + String(item.commune).trim()) : '';
    const query = typeFinal + ' ' + cp + communePart;
    const res = importerEtablissements(query, typeFinal);
    const match = String(res || '').match(/(\d+)\s+ajoute/);
    if (match && match[1]) {
      totalAjoutes += Number(match[1]);
    }
    requetes++;
    if (sleepMs > 0) {
      Utilities.sleep(sleepMs);
    }
  });

  const rapport = totalAjoutes + ' ajoutes. (' + requetes + ' requetes)';
  Logger.log(rapport);
  return rapport;
}

/**
 * Importe les etablissements pour les types definis (Pharmacie, EHPAD, etc.) 
 * en se basant sur la liste de l'onglet Codes_Postaux_Retrait.
 * @returns {string}
 */
function importerTousLesTypesPourCodesPostauxRetrait() {
  const typesAImporter = ['Pharmacie', 'EHPAD', 'Residence Senior', 'Foyer de Vie'];
  let totalAjoutes = 0;
  let totalRequetes = 0;
  const rapports = [];

  typesAImporter.forEach(function(type) {
    Logger.log('Debut de l import pour le type : ' + type);
    const rapportPartiel = importerEtablissementsParCodesPostaux([], type);
    const matchAjoutes = String(rapportPartiel || '').match(/(\d+)\s+ajoute/);
    const matchRequetes = String(rapportPartiel || '').match(/\((\d+)\s+requete/);

    if (matchAjoutes && matchAjoutes[1]) {
      totalAjoutes += parseInt(matchAjoutes[1], 10);
    }
    if (matchRequetes && matchRequetes[1]) {
      totalRequetes += parseInt(matchRequetes[1], 10);
    }
    rapports.push(type + ': ' + rapportPartiel);
    Logger.log('Fin de l import pour le type : ' + type + '. Rapport: ' + rapportPartiel);
  });

  const rapportFinal = 'Importation terminee. Total ajoutes: ' + totalAjoutes + ' (' + totalRequetes + ' requetes au total).\n\nDetails:\n' + rapports.join('\n');
  Logger.log(rapportFinal);
  try {
    const ui = SpreadsheetApp.getUi();
    ui.alert('Rapport d importation', rapportFinal, ui.ButtonSet.OK);
  } catch (_errUi) {}

  return rapportFinal;
}
