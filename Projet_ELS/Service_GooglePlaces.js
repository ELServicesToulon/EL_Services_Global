/**
 * Service Google Places - Alimente l'onglet Base_Etablissements.
 * Colonnes cibles (ordre logique) :
 * Type, Nom, Adresse, Code Postal, Ville, Contact, Telephone, Email,
 * Jours Souhaites, Plage Horaire, Source, Actif, Derniere_MAJ, Notes, PlaceID (optionnel).
 */

// En-tetes canoniques (PlaceID est maintenu en colonne optionnelle pour l'enrichissement)
function getPlacesHeaders_() {
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
 * Ouvre/prepare la feuille Base_Etablissements et retourne {sheet, indices, headers}.
 */
function getEtablissementsContext_() {
  const headers = getPlacesHeaders_();
  const ss = SpreadsheetApp.openById(getSecret('ID_FEUILLE_CALCUL'));
  const sheet = (typeof ensureEtablissementsSheet_ === 'function')
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
            .map(function(v) { return String(v || '').trim(); });
          const missing = headers.filter(function(h) { return row1.indexOf(h) === -1; });
          if (missing.length) {
            sh.getRange(1, sh.getLastColumn() + 1, 1, missing.length).setValues([missing]);
          }
          sh.setFrozenRows(1);
        }
        return sh;
      })();
  const indices = obtenirIndicesEnTetes(sheet, headers);
  return { sheet: sheet, indices: indices, headers: headers };
}

var GooglePlacesService = {

  /**
   * Point d'entrée principal : Cherche et ajoute des établissements.
   * @param {string} query - ex: "Pharmacie Sanary-sur-Mer"
   * @param {string} typeEtablissement - ex: "Pharmacie", "EHPAD"
   * @returns {string} Rapport court ("X ajoutes.")
   */
  importerEtablissements: function(query, typeEtablissement) {
    try {
      var apiKey = getMapsApiKey();
      if (!apiKey) {
        throw new Error("Clé API Google Maps (Maps_API_KEY) manquante dans les propriétés du script.");
      }

      var searchUrl = "https://maps.googleapis.com/maps/api/place/textsearch/json" +
                      "?query=" + encodeURIComponent(query) +
                      "&region=fr" +
                      "&language=fr" +
                      "&key=" + apiKey;

      var response = UrlFetchApp.fetch(searchUrl);
      var json = JSON.parse(response.getContentText() || "{}");

      if (json.status !== "OK") {
        throw new Error("Erreur API Places : " + json.status + " - " + (json.error_message || ""));
      }

      var results = Array.isArray(json.results) ? json.results : [];
      Logger.log(results.length + " résultats trouvés pour : " + query);

      // Contexte feuille + indices
      var ctx = getEtablissementsContext_();
      var sheet = ctx.sheet;
      var idx = ctx.indices;

      // Dedup: clé = nom + CP
      var existingKeys = new Set();
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        var rowName = data[i][idx[COLONNE_NOM_ETAB]];
        var rowCP = data[i][idx[COLONNE_CODE_POSTAL_ETAB]];
        var key = (String(rowName || '') + "_" + String(rowCP || '')).toLowerCase().replace(/\s/g, '');
        existingKeys.add(key);
      }

      var newRows = [];
      var now = new Date();
      var typeFinal = normalizeEtablissementType_(typeEtablissement) || typeEtablissement || 'Pharmacie';

      results.forEach(function(place) {
        var parsedAddress = GooglePlacesService._parseAddress(place.formatted_address || '');
        var uniqueKey = (String(place.name || '') + "_" + String(parsedAddress.cp || '')).toLowerCase().replace(/\s/g, '');
        if (!parsedAddress.cp || existingKeys.has(uniqueKey)) return;

        var row = new Array(ctx.headers.length).fill('');
        row[idx[COLONNE_TYPE_ETAB]] = typeFinal;
        row[idx[COLONNE_NOM_ETAB]] = place.name || '';
        row[idx[COLONNE_ADRESSE_ETAB]] = place.formatted_address || '';
        row[idx[COLONNE_CODE_POSTAL_ETAB]] = parsedAddress.cp;
        row[idx[COLONNE_VILLE_ETAB]] = parsedAddress.ville || '';
        row[idx[COLONNE_CONTACT_ETAB]] = '';
        row[idx[COLONNE_TELEPHONE_ETAB]] = '';
        row[idx[COLONNE_EMAIL_ETAB]] = '';
        row[idx[COLONNE_JOURS_ETAB]] = '';
        row[idx[COLONNE_PLAGE_ETAB]] = '';
        row[idx[COLONNE_SOURCE_ETAB]] = 'GoogleAPI';
        row[idx[COLONNE_STATUT_ETAB]] = true;
        row[idx[COLONNE_DERNIERE_MAJ_ETAB]] = now;
        row[idx[COLONNE_NOTE_ETAB]] = place.place_id ? ("PlaceID: " + place.place_id) : '';
        if (idx['PlaceID'] !== undefined && place.place_id) {
          row[idx['PlaceID']] = place.place_id;
        }
        newRows.push(row);
        existingKeys.add(uniqueKey);
      });

      if (newRows.length > 0) {
        sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, ctx.headers.length).setValues(newRows);
        Logger.log(newRows.length + " établissements ajoutés.");
        return newRows.length + " ajoutés.";
      } else {
        Logger.log("Aucun nouvel établissement (doublons détectés ou aucun résultat).");
        return "0 ajoutés.";
      }

    } catch (e) {
      Logger.log("ERREUR Import Google Places : " + e.message);
      throw e;
    }
  },

  /**
   * Enrichit les lignes existantes qui ont un PlaceID mais pas de téléphone.
   */
  enrichirDetailsManquants: function() {
    try {
      var apiKey = getMapsApiKey();
      if (!apiKey) {
        throw new Error("Clé API Google Maps (Maps_API_KEY) manquante dans les propriétés du script.");
      }
      var ctx = getEtablissementsContext_();
      var sheet = ctx.sheet;
      var idx = ctx.indices;
      var data = sheet.getDataRange().getValues();
      var updated = 0;

      for (var i = 1; i < data.length; i++) {
        var phone = String(data[i][idx[COLONNE_TELEPHONE_ETAB]] || '').trim();
        var placeId = '';

        if (idx['PlaceID'] !== undefined) {
          placeId = String(data[i][idx['PlaceID']] || '').trim();
        }
        if (!placeId) {
          var notes = String(data[i][idx[COLONNE_NOTE_ETAB]] || '');
          var match = notes.match(/PlaceID:\s*([A-Za-z0-9_\-]+)/);
          placeId = match && match[1] ? match[1] : '';
        }

        if (phone || !placeId) continue;

        try {
          var url = "https://maps.googleapis.com/maps/api/place/details/json" +
                    "?place_id=" + encodeURIComponent(placeId) +
                    "&fields=formatted_phone_number" +
                    "&language=fr" +
                    "&key=" + apiKey;

          var resp = UrlFetchApp.fetch(url);
          var json = JSON.parse(resp.getContentText() || "{}");

          if (json.status === "OK" && json.result && json.result.formatted_phone_number) {
            var newPhone = json.result.formatted_phone_number;
            sheet.getRange(i + 1, idx[COLONNE_TELEPHONE_ETAB] + 1).setValue(newPhone);
            updated++;
          }
        } catch (errApi) {
          Logger.log("Erreur détail pour " + placeId + " : " + errApi);
        }

        Utilities.sleep(200); // evite de depasser les quotas
      }

      Logger.log(updated + " téléphones mis à jour.");
      return updated + " téléphones mis à jour.";

    } catch (e) {
      Logger.log("Erreur Enrichissement : " + e.message);
      throw e;
    }
  },

  /**
   * Utilitaire pour extraire CP et Ville d'une adresse formatee Google.
   * Ex: "255 Av. Marcel Castie, 83000 Toulon, France"
   */
  _parseAddress: function(formattedAddress) {
    var result = { cp: "", ville: "" };
    if (!formattedAddress) return result;

    var match = String(formattedAddress).match(/(\d{5})\s+(.+?),/);
    if (match && match.length >= 3) {
      result.cp = match[1];
      result.ville = match[2].trim();
    } else {
      var parts = String(formattedAddress).split(",");
      if (parts.length >= 2) {
         var cityPart = parts[parts.length - 2].trim();
         var cpMatch = cityPart.match(/\d{5}/);
         if (cpMatch) {
           result.cp = cpMatch[0];
           result.ville = cityPart.replace(cpMatch[0], "").trim();
         }
      }
    }
    return result;
  }
};

// Fonctions de test manuelles
function testImportPharmacies() {
  GooglePlacesService.importerEtablissements("Pharmacie 83000 Toulon", "Pharmacie");
}

function testEnrichissement() {
  GooglePlacesService.enrichirDetailsManquants();
}

// Points d'entree globaux (compat)
function importerEtablissementsPlaces(query, type) {
  return GooglePlacesService.importerEtablissements(query, type);
}

function enrichirTelephonesPlaces() {
  return GooglePlacesService.enrichirDetailsManquants();
}

function importerEtablissements(query, type) {
  return GooglePlacesService.importerEtablissements(query, type);
}

function enrichirDetailsManquants() {
  return GooglePlacesService.enrichirDetailsManquants();
}
