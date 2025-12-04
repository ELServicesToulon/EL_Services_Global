/**
 * /Projet_ELS/Service_GooglePlaces.js
 * Service d'interaction avec Google Places API pour alimenter Base_Etablissements.
 * Version : 2.0 (corrigee et autonome)
 */

// Mapping des en-tetes de la feuille Base_Etablissements
var PLACES_HEADERS = [
  "Type",            // A
  "Nom",             // B
  "Adresse",         // C
  "Code Postal",     // D
  "Ville",           // E
  "Contact",         // F
  "Telephone",       // G
  "Email",           // H
  "Jours Souhaites", // I
  "Plage Horaire",   // J
  "Source",          // K
  "Actif",           // L
  "Derniere_MAJ",    // M
  "Notes",           // N
  "PlaceID"          // O
];

var GooglePlacesService = {

  /**
   * Recherche des etablissements et ajoute les lignes dedoublonnees.
   * @param {string} query Recherche textuelle (ex: "Pharmacie Sanary-sur-Mer")
   * @param {string} typeEtablissement Type d'etablissement (ex: "Pharmacie", "EHPAD")
   * @returns {string} Rapport court ("X ajoutes.")
   */
  importerEtablissements: function(query, typeEtablissement) {
    try {
      var apiKey = GooglePlacesService._getApiKey();
      if (!apiKey) {
        throw new Error("Cle API Google Maps manquante (Config.getMapsApiKey).");
      }

      var searchUrl = "https://maps.googleapis.com/maps/api/place/textsearch/json" +
                      "?query=" + encodeURIComponent(query) +
                      "&region=fr" +
                      "&language=fr" +
                      "&key=" + apiKey;

      var response = UrlFetchApp.fetch(searchUrl);
      var json = JSON.parse(response.getContentText() || "{}");

      if (json.status !== "OK" && json.status !== "ZERO_RESULTS") {
        throw new Error("Erreur API Places : " + json.status + " - " + (json.error_message || ""));
      }

      var results = Array.isArray(json.results) ? json.results : [];
      Logger.log(results.length + " resultats trouves pour : " + query);

      if (results.length === 0) return "0 trouves.";

      var sheet = this._ensureSheet();
      var headers = PLACES_HEADERS;

      // Mapping dynamique des colonnes (base 0)
      var colMap = this._getColumnMapping(sheet, headers);

      // Dedup: cle = nom + CP
      var existingKeys = new Set();
      var lastRow = sheet.getLastRow();

      if (lastRow > 1) {
        var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
        for (var i = 0; i < data.length; i++) {
          var rowName = data[i][colMap["Nom"]];
          var rowCP = data[i][colMap["Code Postal"]];
          if (rowName && rowCP) {
            var key = (String(rowName) + "_" + String(rowCP)).toLowerCase().replace(/\s/g, '');
            existingKeys.add(key);
          }
        }
      }

      var newRows = [];
      var now = new Date();
      var typeFinal = typeEtablissement || "Pharmacie";

      results.forEach(function(place) {
        var parsedAddress = GooglePlacesService._parseAddress(place.formatted_address || "");
        var uniqueKey = (String(place.name || "") + "_" + String(parsedAddress.cp || "")).toLowerCase().replace(/\s/g, "");

        Logger.log("Adresse formatee: " + place.formatted_address);
        Logger.log("Adresse analysee: CP=" + parsedAddress.cp + ", Ville=" + parsedAddress.ville);
        Logger.log("Cle unique: " + uniqueKey);
        Logger.log("Deja existant: " + existingKeys.has(uniqueKey));

        // Ignore si pas de CP ou deja present
        if (!parsedAddress.cp || existingKeys.has(uniqueKey)) return;

        var row = new Array(headers.length).fill("");

        row[colMap["Type"]] = typeFinal;
        row[colMap["Nom"]] = place.name || "";
        row[colMap["Adresse"]] = place.formatted_address || "";
        row[colMap["Code Postal"]] = parsedAddress.cp;
        row[colMap["Ville"]] = parsedAddress.ville || "";
        row[colMap["Source"]] = "GoogleAPI";
        row[colMap["Actif"]] = true;
        row[colMap["Derniere_MAJ"]] = now;
        row[colMap["Notes"]] = place.place_id ? ("PlaceID: " + place.place_id) : "";
        row[colMap["PlaceID"]] = place.place_id || "";

        newRows.push(row);
        existingKeys.add(uniqueKey);
      });

      if (newRows.length > 0) {
        sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, headers.length).setValues(newRows);
        Logger.log(newRows.length + " etablissements ajoutes.");
        return newRows.length + " ajoutes.";
      } else {
        Logger.log("Aucun nouvel etablissement.");
        return "0 ajoutes.";
      }

    } catch (e) {
      Logger.log("ERREUR Import Google Places : " + e.message);
      throw e;
    }
  },

  /**
   * Enrichit les lignes existantes qui ont un PlaceID mais pas de telephone.
   */
  enrichirDetailsManquants: function() {
    try {
      var apiKey = GooglePlacesService._getApiKey();
      if (!apiKey) throw new Error("Cle API manquante.");

      var sheet = this._ensureSheet();
      var headers = PLACES_HEADERS;
      var colMap = this._getColumnMapping(sheet, headers);

      var lastRow = sheet.getLastRow();
      if (lastRow < 2) return "Vide";

      var rangeData = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
      var data = rangeData.getValues();
      var updatedCount = 0;

      for (var i = 0; i < data.length; i++) {
        var phone = String(data[i][colMap["Telephone"]] || "").trim();
        var placeId = String(data[i][colMap["PlaceID"]] || "").trim();
        var notes = String(data[i][colMap["Notes"]] || "");

        // Fallback: chercher PlaceID dans les notes si colonne PlaceID vide
        if (!placeId && notes.indexOf("PlaceID:") > -1) {
          var match = notes.match(/PlaceID:\s*([A-Za-z0-9_\-]+)/);
          if (match) placeId = match[1];
        }

        // Si on a un PlaceID mais pas de telephone
        if (placeId && !phone) {
          try {
            var url = "https://maps.googleapis.com/maps/api/place/details/json" +
                      "?place_id=" + encodeURIComponent(placeId) +
                      "&fields=formatted_phone_number" +
                      "&language=fr" +
                      "&key=" + apiKey;

            var resp = UrlFetchApp.fetch(url);
            var json = JSON.parse(resp.getContentText() || "{}");

            if (json.status === "OK" && json.result && json.result.formatted_phone_number) {
              // i + 2 car tableau base 0 et row commence a 2
              sheet.getRange(i + 2, colMap["Telephone"] + 1).setValue(json.result.formatted_phone_number);
              updatedCount++;
            }
            // Pause courte pour le rate limiting
            Utilities.sleep(200);
          } catch (errApi) {
            Logger.log("Erreur detail API pour " + placeId);
          }
        }
      }

      Logger.log(updatedCount + " telephones mis a jour.");
      return updatedCount + " telephones mis a jour.";

    } catch (e) {
      Logger.log("Erreur Enrichissement : " + e.message);
      throw e;
    }
  },

  // --- PRIVATE HELPERS ---

  /** Assure l'existence de l'onglet et des entetes */
  _ensureSheet: function() {
    var ss = SpreadsheetApp.openById(GooglePlacesService._getSpreadsheetId());
    var sheetName = "Base_Etablissements";
    if (typeof Config !== "undefined" && Config.SHEETS && Config.SHEETS.ETABLISSEMENTS) {
      sheetName = Config.SHEETS.ETABLISSEMENTS;
    } else if (typeof SHEET_ETABLISSEMENTS !== "undefined") {
      sheetName = SHEET_ETABLISSEMENTS;
    }
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.getRange(1, 1, 1, PLACES_HEADERS.length).setValues([PLACES_HEADERS]);
      sheet.setFrozenRows(1);
    } else {
      // Verifie les entetes manquants
      var currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var missing = [];
      PLACES_HEADERS.forEach(function(h) {
        if (currentHeaders.indexOf(h) === -1) missing.push(h);
      });
      if (missing.length > 0) {
        sheet.getRange(1, sheet.getLastColumn() + 1, 1, missing.length).setValues([missing]);
      }
    }
    return sheet;
  },

  /** Retourne un objet map { "Nom": 1, "Adresse": 2 ... } (base 0) */
  _getColumnMapping: function(sheet, headersRef) {
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var map = {};
    headersRef.forEach(function(h) {
      var idx = headers.indexOf(h);
      if (idx > -1) map[h] = idx;
    });
    return map;
  },

  _getSpreadsheetId: function() {
    if (typeof Config !== "undefined" && typeof Config.getSpreadsheetId === "function") {
      return Config.getSpreadsheetId();
    }
    if (typeof Config !== "undefined" && Config.ID_FEUILLE_CALCUL) {
      return Config.ID_FEUILLE_CALCUL;
    }
    if (typeof getSecret === "function") {
      return getSecret("ID_FEUILLE_CALCUL");
    }
    throw new Error("ID_FEUILLE_CALCUL manquant.");
  },

  _getApiKey: function() {
    if (typeof Config !== "undefined" && typeof Config.getMapsApiKey === "function") {
      return Config.getMapsApiKey();
    }
    if (typeof getMapsApiKey === "function") {
      return getMapsApiKey();
    }
    throw new Error("Maps_API_KEY manquant dans la configuration.");
  },

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

// --- FONCTIONS GLOBALES EXPOSEES ---

function importerEtablissements(query, type) {
  return GooglePlacesService.importerEtablissements(query, type);
}

function enrichirDetailsManquants() {
  return GooglePlacesService.enrichirDetailsManquants();
}

// Aliases compatibilite legacy
function importerEtablissementsPlaces(query, type) {
  return GooglePlacesService.importerEtablissements(query, type);
}

function enrichirTelephonesPlaces() {
  return GooglePlacesService.enrichirDetailsManquants();
}

function test_GooglePlaces() {
  GooglePlacesService.importerEtablissements("Pharmacie 83000 Toulon", "Pharmacie");
}

/**
 * Importe les etablissements pour une liste de codes postaux (ou depuis Codes_Postaux_Retrait si vide).
 * @param {Array<string|{codePostal:string,commune?:string}>} codes Liste explicite; si vide, lit l'onglet Codes_Postaux_Retrait.
 * @param {string} type Type d'etablissement (ex: "Pharmacie").
 * @param {{sleepMs?:number}=} options Options (pause entre appels).
 * @returns {string} Rapport agregat (ex: "30 ajoutes. (3 requetes)")
 */
function importerEtablissementsParCodesPostaux(codes, type, options) {
  var sleepMs = (options && options.sleepMs) || 250;
  var typeFinal = type || "Pharmacie";
  var liste = [];

  // Si aucune liste fournie, on tente de lire Codes_Postaux_Retrait
  if (!Array.isArray(codes) || codes.length === 0) {
    try {
      if (typeof obtenirCodesPostauxRetraitAvecCommunes === "function") {
        liste = obtenirCodesPostauxRetraitAvecCommunes({ forceRefresh: true });
      } else if (typeof obtenirCodesPostauxRetrait === "function") {
        liste = obtenirCodesPostauxRetrait({ forceRefresh: true }).map(function(cp) {
          return { codePostal: cp, commune: "" };
        });
      }
    } catch (_err) {
      // On laissera le cas d'absence gerer plus bas
    }
  } else {
    liste = codes.map(function(entry) {
      if (entry && typeof entry === "object") {
        return { codePostal: entry.codePostal || entry.cp || entry.code || "", commune: entry.commune || entry.ville || entry.libelle || "" };
      }
      return { codePostal: entry, commune: "" };
    });
  }

  if (!Array.isArray(liste) || liste.length === 0) {
    throw new Error("Aucun code postal fourni ou disponible dans Codes_Postaux_Retrait.");
  }

  var totalAjoutes = 0;
  var requetes = 0;

  liste.forEach(function(item) {
    var cp = String(item.codePostal || "").trim();
    if (!cp) return;
    var communePart = item.commune ? (" " + String(item.commune).trim()) : "";
    var query = typeFinal + " " + cp + communePart;
    var res = GooglePlacesService.importerEtablissements(query, typeFinal);
    var match = String(res || "").match(/(\d+)\s+ajoute/);
    if (match && match[1]) {
      totalAjoutes += Number(match[1]);
    }
    requetes++;
    if (sleepMs > 0) {
      Utilities.sleep(sleepMs);
    }
  });

  var rapport = totalAjoutes + " ajoutes. (" + requetes + " requetes)";
  Logger.log(rapport);
  return rapport;
}
