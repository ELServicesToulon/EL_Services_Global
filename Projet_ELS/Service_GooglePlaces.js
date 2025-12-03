// =================================================================
//                        SERVICE GOOGLE PLACES
// =================================================================
// Description: Alimentation de l'onglet Base_Etablissements via
//              l'API Google Places (Text Search + Details).
// =================================================================

var GooglePlacesService = (function() {
  /**
   * Colonnes attendues dans la base etablissements.
   * @returns {string[]}
   */
  function getHeaders_() {
    return [
      COLONNE_TYPE_ETAB,
      COLONNE_NOM_ETAB,
      COLONNE_ADRESSE_ETAB,
      COLONNE_CODE_POSTAL_ETAB,
      COLONNE_VILLE_ETAB,
      COLONNE_CONTACT_ETAB,
      COLONNE_TELEPHONE_ETAB,
      COLONNE_EMAIL_ETAB,
      COLONNE_JOURS_ETAB,
      COLONNE_PLAGE_ETAB,
      COLONNE_SOURCE_ETAB,
      COLONNE_STATUT_ETAB,
      COLONNE_DERNIERE_MAJ_ETAB,
      COLONNE_NOTE_ETAB,
      'PlaceID'
    ];
  }

  /**
   * Ouvre la feuille Base_Etablissements et s'assure de la presence des en-tetes.
   * @returns {{sheet: GoogleAppsScript.Spreadsheet.Sheet, indices: Object}}
   */
  function openSheet_() {
    const headers = getHeaders_();
    const ss = SpreadsheetApp.openById(getSecret('ID_FEUILLE_CALCUL'));
    const sheet = typeof ensureEtablissementsSheet_ === 'function'
      ? ensureEtablissementsSheet_(ss)
      : (function() {
          let sh = ss.getSheetByName(SHEET_ETABLISSEMENTS);
          if (!sh) {
            sh = ss.insertSheet(SHEET_ETABLISSEMENTS);
            sh.getRange(1, 1, 1, headers.length).setValues([headers]);
            sh.setFrozenRows(1);
          } else {
            const row1 = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), headers.length))
              .getValues()[0]
              .map(function(v){ return String(v || '').trim(); });
            const missing = headers.filter(function(h){ return row1.indexOf(h) === -1; });
            if (missing.length) {
              sh.getRange(1, sh.getLastColumn() + 1, 1, missing.length).setValues([missing]);
            }
          }
          return sh;
        })();
    const indices = obtenirIndicesEnTetes(sheet, headers);
    return { sheet: sheet, indices: indices, headers: headers };
  }

  /**
   * Parse une adresse formatee pour extraire code postal et ville.
   * @param {string} formatted
   * @returns {{codePostal:string, ville:string}}
   */
  function parseAdresse_(formatted) {
    const res = { codePostal: '', ville: '' };
    if (!formatted) return res;
    const parts = String(formatted).split(',');
    // Cherche un segment contenant le code postal
    for (let i = parts.length - 1; i >= 0; i--) {
      const segment = parts[i].trim();
      const match = segment.match(/\b(\d{5})\b\s*(.+)?/);
      if (match) {
        res.codePostal = normaliserCodePostal(match[1]);
        if (match[2]) {
          res.ville = match[2].replace(/France/i, '').trim();
        }
        break;
      }
    }
    // Si ville vide, tenter l'avant-dernier segment
    if (!res.ville && parts.length >= 2) {
      res.ville = parts[parts.length - 2].replace(/France/i, '').trim();
    }
    return res;
  }

  /**
   * Construit la cle de deduplication Nom+CP.
   */
  function makeKey_(nom, codePostal) {
    const cp = normaliserCodePostal(codePostal);
    const name = String(nom || '').trim().toLowerCase();
    return cp && name ? name + '::' + cp : '';
  }

  /**
   * Appel API Text Search.
   */
  function callTextSearch_(query, apiKey) {
    const url = 'https://maps.googleapis.com/maps/api/place/textsearch/json?query=' +
      encodeURIComponent(query) +
      '&key=' + encodeURIComponent(apiKey) +
      '&language=fr';
    const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const status = resp.getResponseCode();
    if (status !== 200) {
      throw new Error('TextSearch HTTP ' + status + ' : ' + resp.getContentText());
    }
    const body = JSON.parse(resp.getContentText() || '{}');
    if (body.status && body.status !== 'OK') {
      throw new Error('TextSearch status ' + body.status + ' : ' + (body.error_message || ''));
    }
    return Array.isArray(body.results) ? body.results : [];
  }

  /**
   * Appel API Details (telephone uniquement).
   */
  function callDetailsPhone_(placeId, apiKey) {
    const url = 'https://maps.googleapis.com/maps/api/place/details/json?placeid=' +
      encodeURIComponent(placeId) +
      '&fields=formatted_phone_number' +
      '&language=fr' +
      '&key=' + encodeURIComponent(apiKey);
    const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (resp.getResponseCode() !== 200) {
      throw new Error('Details HTTP ' + resp.getResponseCode());
    }
    const body = JSON.parse(resp.getContentText() || '{}');
    if (body.status && body.status !== 'OK') {
      throw new Error('Details status ' + body.status + ' : ' + (body.error_message || ''));
    }
    return body.result && body.result.formatted_phone_number ? String(body.result.formatted_phone_number) : '';
  }

  /**
   * Ajoute les etablissements trouves si non existants (Nom+CP).
   */
  function importerEtablissements(query, type) {
    try {
      const cleanedQuery = String(query || '').trim();
      if (!cleanedQuery) {
        return { ok: false, reason: 'MISSING_QUERY' };
      }
      const typeNorm = normalizeEtablissementType_(type) || type || '';
      const apiKey = getMapsApiKey();
      const searchQuery = typeNorm ? (cleanedQuery + ' ' + typeNorm) : cleanedQuery;
      const results = callTextSearch_(searchQuery, apiKey);
      const opened = openSheet_();
      const sheet = opened.sheet;
      const indices = opened.indices;

      const data = sheet.getDataRange().getValues();
      const existing = new Set();
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const k = makeKey_(row[indices[COLONNE_NOM_ETAB]], row[indices[COLONNE_CODE_POSTAL_ETAB]]);
        if (k) existing.add(k);
      }

      const rowsToAppend = [];
      results.forEach(function(r) {
        const nom = r && r.name ? String(r.name).trim() : '';
        const adresse = r && r.formatted_address ? String(r.formatted_address).trim() : '';
        if (!nom || !adresse) return;
        const parsed = parseAdresse_(adresse);
        if (!parsed.codePostal) return;
        const key = makeKey_(nom, parsed.codePostal);
        if (existing.has(key)) return;

        rowsToAppend.push([
          typeNorm || 'Pharmacie',
          nom,
          adresse,
          parsed.codePostal,
          parsed.ville || '',
          '',
          '',
          '',
          '',
          '',
          'Google Places',
          true,
          new Date(),
          '',
          r.place_id || ''
        ]);
        existing.add(key);
      });

      if (rowsToAppend.length) {
        sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, getHeaders_().length)
          .setValues(rowsToAppend);
      }
      return { ok: true, added: rowsToAppend.length, totalResults: results.length };
    } catch (err) {
      Logger.log('[GooglePlacesService.importerEtablissements] ' + err);
      return { ok: false, reason: err && err.message ? err.message : String(err) };
    }
  }

  /**
   * Parcourt la base pour completer les telephones via Place Details.
   */
  function enrichirDetailsManquants() {
    try {
      const apiKey = getMapsApiKey();
      const opened = openSheet_();
      const sheet = opened.sheet;
      const indices = opened.indices;
      const data = sheet.getDataRange().getValues();
      let updated = 0;

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const tel = String(row[indices[COLONNE_TELEPHONE_ETAB]] || '').trim();
        const placeId = String(row[indices['PlaceID']] || '').trim();
        if (tel || !placeId) continue;
        try {
          const phone = callDetailsPhone_(placeId, apiKey);
          if (phone) {
            sheet.getRange(i + 1, indices[COLONNE_TELEPHONE_ETAB] + 1).setValue(phone);
            updated++;
          }
        } catch (detailsErr) {
          Logger.log('[GooglePlacesService.enrichirDetailsManquants] Ligne ' + (i+1) + ' : ' + detailsErr);
        }
      }

      return { ok: true, updated: updated };
    } catch (err) {
      Logger.log('[GooglePlacesService.enrichirDetailsManquants] ' + err);
      return { ok: false, reason: err && err.message ? err.message : String(err) };
    }
  }

  return {
    importerEtablissements: importerEtablissements,
    enrichirDetailsManquants: enrichirDetailsManquants
  };
})();

/**
 * Point d'entree Apps Script : importe des etablissements via Google Places.
 * @param {string} query
 * @param {string} type
 * @returns {Object}
 */
function importerEtablissementsPlaces(query, type) {
  return GooglePlacesService.importerEtablissements(query, type);
}

/**
 * Point d'entree Apps Script : enrichit les telephones manquants depuis Place Details.
 * @returns {Object}
 */
function enrichirTelephonesPlaces() {
  return GooglePlacesService.enrichirDetailsManquants();
}

// Alias simples (noms courts) pour compatibilite ou appels manuels depuis l'editeur.
function importerEtablissements(query, type) {
  return GooglePlacesService.importerEtablissements(query, type);
}

function enrichirDetailsManquants() {
  return GooglePlacesService.enrichirDetailsManquants();
}
