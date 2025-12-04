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
  "Site Web",        // I
  "Jours Souhaites", // J
  "Plage Horaire",   // K
  "Source",          // L
  "Actif",           // M
  "Derniere_MAJ",    // N
  "Notes",           // O
  "PlaceID"          // P
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

        // Ignore si pas de CP ou deja present
        if (!parsedAddress.cp || existingKeys.has(uniqueKey)) return;

        var row = new Array(headers.length).fill("");

        row[colMap["Type"]] = typeFinal;
        row[colMap["Nom"]] = place.name || "";
        row[colMap["Adresse"]] = place.formatted_address || "";
        row[colMap["Code Postal"]] = parsedAddress.cp ? Number(parsedAddress.cp) : "";
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
  enrichirDetails: function() {
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
        var website = String(data[i][colMap["Site Web"]] || "").trim();
        var placeId = String(data[i][colMap["PlaceID"]] || "").trim();
        var notes = String(data[i][colMap["Notes"]] || "");

        // Fallback: chercher PlaceID dans les notes si colonne PlaceID vide
        if (!placeId && notes.indexOf("PlaceID:") > -1) {
          var match = notes.match(/PlaceID:\s*([A-Za-z0-9_\-]+)/);
          if (match) placeId = match[1];
        }

        // Si on a un PlaceID mais pas de telephone ou de site web
        if (placeId && (!phone || !website)) {
          try {
            var url = "https://maps.googleapis.com/maps/api/place/details/json" +
                      "?place_id=" + encodeURIComponent(placeId) +
                      "&fields=formatted_phone_number,website" +
                      "&language=fr" +
                      "&key=" + apiKey;

            var resp = UrlFetchApp.fetch(url);
            var json = JSON.parse(resp.getContentText() || "{}");

            if (json.status === "OK" && json.result) {
              var result = json.result;
              var updated = false;
              if (result.formatted_phone_number && !phone) {
                sheet.getRange(i + 2, colMap["Telephone"] + 1).setValue(result.formatted_phone_number);
                updated = true;
              }
              if (result.website && !website) {
                sheet.getRange(i + 2, colMap["Site Web"] + 1).setValue(result.website);
                updated = true;
              }
              if (updated) {
                updatedCount++;
              }
            }
            // Pause courte pour le rate limiting
            Utilities.sleep(200);
          } catch (errApi) {
            Logger.log("Erreur detail API pour " + placeId);
          }
        }
      }

      Logger.log(updatedCount + " fiches mises a jour (telephone/site web).");
      return updatedCount + " fiches mises a jour.";

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
    
    // Regex pour capturer un CP a 5 chiffres et la ville qui le suit.
    // Ex: ", 83110 Sanary-sur-Mer"
    var match = String(formattedAddress).match(/(\d{5})\s+([^,]+)/);
    
    if (match) {
      result.cp = match[1];
      result.ville = match[2].trim().replace(/, France$/, '').trim();
    }
    
    return result;
  }
};

// --- FONCTIONS GLOBALES EXPOSEES ---

function importerEtablissements(query, type) {
  return GooglePlacesService.importerEtablissements(query, type);
}

function enrichirDetails() {
  return GooglePlacesService.enrichirDetails();
}

// Aliases compatibilite legacy
function importerEtablissementsPlaces(query, type) {
  return GooglePlacesService.importerEtablissements(query, type);
}

function enrichirDetailsPlaces() {
  return GooglePlacesService.enrichirDetails();
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

/**
 * Importe les etablissements pour les types definis (Pharmacie, EHPAD, etc.) 
 * en se basant sur la liste de l'onglet Codes_Postaux_Retrait.
 * @returns {string} Rapport d'importation.
 */
function importerTousLesTypesPourCodesPostauxRetrait() {
  const typesAImporter = ["Pharmacie", "EHPAD", "Residence Senior", "Foyer de Vie"];
  let totalAjoutes = 0;
  let totalRequetes = 0;
  let rapports = [];

  try {
    typesAImporter.forEach(function(type) {
      Logger.log("Debut de l'import pour le type : " + type);
      // Appelle la fonction existante sans liste de codes postaux pour utiliser l'onglet.
      // Le 'type' est passe pour la requete Google Places.
      var rapportPartiel = importerEtablissementsParCodesPostaux([], type);
      
      var matchAjoutes = String(rapportPartiel || "").match(/(\d+)\s+ajoute/);
      var matchRequetes = String(rapportPartiel || "").match(/\((\d+)\s+requete/);

      if (matchAjoutes && matchAjoutes[1]) {
        totalAjoutes += parseInt(matchAjoutes[1], 10);
      }
      if (matchRequetes && matchRequetes[1]) {
        totalRequetes += parseInt(matchRequetes[1], 10);
      }
      rapports.push(type + ": " + rapportPartiel);
      Logger.log("Fin de l'import pour le type : " + type + ". Rapport: " + rapportPartiel);
    });

    const rapportFinal = "Importation terminee. Total ajoutes: " + totalAjoutes + " (" + totalRequetes + " requetes au total).\n\nDetails:\n" + rapports.join("\n");
    Logger.log(rapportFinal);
    
    // Afficher le rapport a l'utilisateur
    var ui = SpreadsheetApp.getUi();
    ui.alert("Rapport d'importation", rapportFinal, ui.ButtonSet.OK);

    return rapportFinal;

  } catch (e) {
    Logger.log("Erreur majeure durant l'importation par type : " + e.message);
    SpreadsheetApp.getUi().alert("Erreur d'importation", e.message, SpreadsheetApp.getUi().ButtonSet.OK);
    throw e;
  }
}
