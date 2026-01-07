/**
 * API_Mobile_Handler.gs
 * Gestion des requêtes provenant de l'App Livreur (Tesla/Android)
 * Rôle : Servir les données établissements et enregistrer les rapports de livraison.
 */

var MobileAPI_Config = {
  // Remplacer par les IDs réels ou utiliser PropertiesService
  ID_SPREADSHEET_DATA: PropertiesService.getScriptProperties().getProperty("ID_FEUILLE_CALCUL"),
  NOM_ONGLET_ETABLISSEMENTS: "Base_Etablissements",
  NOM_ONGLET_TRACE: "TRACE_Livraisons",
  NOM_ONGLET_TOURNEES: "Tournees_Actives" // Suppose cet onglet pour l'instant
};

/**
 * Récupère la liste complète des établissements avec leurs coordonnées GPS
 * pour le cache local de l'application mobile.
 * @return {Object} {status: "success", data: Array}
 */
function api_getEtablissementsGPS() {
  try {
    var ss = SpreadsheetApp.openById(MobileAPI_Config.ID_SPREADSHEET_DATA);
    var sheet = ss.getSheetByName(MobileAPI_Config.NOM_ONGLET_ETABLISSEMENTS);

    if (!sheet) {
      throw new Error("Onglet 'Base_Etablissements' introuvable.");
    }

    // Récupération des données (suppose que la ligne 1 est l'en-tête)
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var establishments = [];

    // Mapping des colonnes (basé sur tes fichiers CSV)
    // On cherche les index dynamiquement pour plus de robustesse
    var idxNom = headers.indexOf("Nom");
    var idxLat = headers.indexOf("Latitude");
    var idxLng = headers.indexOf("Longitude");
    var idxId = headers.indexOf("PlaceID"); // Ou un ID unique interne

    if (idxLat === -1 || idxLng === -1) {
      throw new Error("Colonnes Latitude/Longitude manquantes dans la base.");
    }

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      // On ne prend que les lignes avec des coordonnées valides
      if (row[idxLat] && row[idxLng]) {
        establishments.push({
          id: row[idxId] || "UNK-" + i,
          nom: row[idxNom],
          lat: parseFloat(String(row[idxLat]).replace(',', '.')), // Gestion virgule/point
          lng: parseFloat(String(row[idxLng]).replace(',', '.'))
        });
      }
    }

    return {
      status: "success",
      count: establishments.length,
      data: establishments
    };

  } catch (e) {
    console.error("Erreur api_getEtablissementsGPS: " + e.toString());
    return {
      status: "error",
      message: e.toString()
    };
  }
}

/**
 * Enregistre un rapport de livraison (RAS ou Note)
 * @param {Object} reportData - {livreurId, etablissementId, statut, note, lat, lng, timestamp}
 */
function api_saveLivraisonReport(reportData) {
  try {
    if (!reportData) {
      console.error("api_saveLivraisonReport appelé sans données (reportData est undefined)");
      return { status: "error", message: "Paramètre reportData manquant" };
    }

    var ss = SpreadsheetApp.openById(MobileAPI_Config.ID_SPREADSHEET_DATA);
    var sheet = ss.getSheetByName(MobileAPI_Config.NOM_ONGLET_TRACE);

    if (!sheet) {
      // Création de l'onglet s'il n'existe pas (sécurité)
      sheet = ss.insertSheet(MobileAPI_Config.NOM_ONGLET_TRACE);
      sheet.appendRow(["Timestamp", "Livreur", "Etablissement", "Statut", "Note", "GPS_Lat", "GPS_Lng"]);
    }

    var timestamp = new Date();

    // Nettoyage des données entrantes
    var noteInput = (reportData.statut === "RAS") ? "RAS" : (reportData.note || "Aucune note");
    // Sentinel: Sanitize to prevent Formula Injection (CSV Injection)
    var noteFinale = sanitizeInputForSheets_(noteInput);
    var etablissementIdSafe = sanitizeInputForSheets_(reportData.etablissementId || "Inconnu");
    var livreurIdSafe = sanitizeInputForSheets_(reportData.livreurId || "Inconnu");
    var statutSafe = sanitizeInputForSheets_(reportData.statut || "Inconnu");

    sheet.appendRow([
      timestamp,
      livreurIdSafe,
      etablissementIdSafe,
      statutSafe, // "RAS" ou "ANOMALIE" ou "NOTE"
      noteFinale,
      reportData.lat,
      reportData.lng
    ]);

    return { status: "success", savedAt: timestamp };

  } catch (e) {
    console.error("Erreur api_saveLivraisonReport: " + e.toString());
    return { status: "error", message: e.toString() };
  }
}

// --- V2 ROUTES ---

/**
 * Récupère la tournée active pour un livreur donné (Email).
 * Simule une tournée si aucune n'est trouvée (Transition Phase).
 */
function api_getTournee(email) {
  // TODO: Connecter à la vraie feuille 'Tournees_Actives'
  // Pour l'instant, on renvoie une structure compatible V2 mockée mais servie par le serveur
  // Ce qui prouve que l'App V2 discute bien avec Apps Script.

  var dateDuJour = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  // Simulation intelligente : 
  // Si l'onglet 'Tournees_Actives' existe, on essaie de lire.
  // Sinon on renvoie du mock "Live".

  return {
    status: "success",
    data: {
      id: "tour_api_" + new Date().getTime(),
      courierName: email,
      date: dateDuJour,
      status: "in_progress",
      stops: [
        {
          id: "stop_api_1",
          type: "pickup",
          name: "Pharmacie (Source API)",
          address: "Depuis Google Sheets",
          timeWindow: "09:00 - 10:00",
          status: "pending",
          notes: "",
          contact: "Pharmacien",
          phone: "0100000000",
          packages: [{ id: "pkg_1", description: "Colis A" }]
        }
      ]
    }
  };
}


// --- V2 ROUTES IMPLEMENTATION ---

/**
 * Récupère les tournées du jour depuis l'onglet Facturation.
 * @param {string} email - Email du livreur (pour filtrer si affectation - optionnel pour l'instant).
 * @return {Object} Données compatibles App V2.
 */
function api_getTournee(email) {
  try {
    var dateDuJour = new Date();
    var dateString = Utilities.formatDate(dateDuJour, Session.getScriptTimeZone(), 'yyyy-MM-dd');

    var ss = SpreadsheetApp.openById(MobileAPI_Config.ID_SPREADSHEET_DATA);
    // On suppose que SHEET_FACTURATION est défini globalement ou dans Config
    var sheetName = typeof SHEET_FACTURATION !== 'undefined' ? SHEET_FACTURATION : "Facturation_Clients";
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) return { status: "error", message: "Onglet Facturation introuvable" };

    var data = sheet.getDataRange().getValues();
    var headers = data[0];

    // Mapping simple des colonnes
    function getIdx(name) { return headers.indexOf(name); }
    var idxDate = getIdx("Date");
    var idxClient = getIdx("Client (Raison S. Client)");
    var idxDetails = getIdx("Détails");
    var idxID = getIdx("ID Réservation");
    var idxStatut = getIdx("Statut");

    if (idxDate === -1 || idxID === -1) return { status: "error", message: "Colonnes manquantes dans Facturation" };

    // Filtrer les tournées du jour
    var tourneeTrouvee = null;

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowDate = row[idxDate];
      if (rowDate instanceof Date) {
        var rowDateStr = Utilities.formatDate(rowDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        // On cherche une tournée "en cours" ou "confirmée" pour aujourd'hui
        // Note: 'email' param pour filtrer ?? Pour l'instant on prend la première ou TOUTES ? A voir.
        // L'App V2 ne gère qu'une "Tour" active. On renvoie la première trouvée pour simplifier le POC.

        if (rowDateStr === dateString && (row[idxStatut] === "Confirmée" || row[idxStatut] === "En cours")) {
          tourneeTrouvee = row;
          break;
        }
      }
    }

    if (!tourneeTrouvee) {
      return { status: "empty", message: "Aucune tournée trouvée pour aujourd'hui.", data: null };
    }

    // Construction de la structure Tournée
    // On parse "Détails" (ex: "Tournée 3 arrêts + Retour")
    var detailsTxt = tourneeTrouvee[idxDetails] || "";
    var nbStops = 1;
    var match = detailsTxt.match(/(\d+)\s*arr[êe]ts?/i);
    if (match) nbStops = parseInt(match[1]);

    // Génération des arrêts génériques (puisque non détaillés dans le sheet)
    var stops = [];
    var clientNom = tourneeTrouvee[idxClient];

    // Stop 0: Départ (Facultatif ou implicite)

    // Stops intermédiaires
    for (var j = 1; j <= nbStops; j++) {
      stops.push({
        id: "stop_" + j,
        type: "pickup", // Par défaut
        name: "Arrêt " + j + " (" + clientNom + ")",
        address: "A définir", // Champ vide pour que le livreur remplisse
        timeWindow: "09:00 - 18:00",
        status: "pending",
        notes: "",
        contact: clientNom,
        phone: "",
        packages: []
      });
    }

    // Stop Retour (si mentionné)
    if (detailsTxt.toLowerCase().indexOf("retour") !== -1) {
      stops.push({
        id: "stop_retour",
        type: "dropoff",
        name: "Retour Pharmacie/Client",
        address: "Adresse Client Principal",
        timeWindow: "Fin de tournée",
        status: "pending",
        contact: clientNom,
        packages: []
      });
    }

    var tourData = {
      id: tourneeTrouvee[idxID],
      courierName: "Livreur", // Nom générique car pas dans le sheet
      date: dateString,
      status: "in_progress",
      stops: stops
    };

    return {
      status: "success",
      data: tourData
    };

  } catch (e) {
    return { status: "error", message: e.toString() };
  }
}

/**
 * Enregistre le lien du rapport dans l'onglet Facturation
 */
function api_saveLivraisonLink(reservationId, linkUrl) {
  try {
    var ss = SpreadsheetApp.openById(MobileAPI_Config.ID_SPREADSHEET_DATA);
    var sheetName = typeof SHEET_FACTURATION !== 'undefined' ? SHEET_FACTURATION : "Facturation_Clients";
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { status: "error", message: "Sheet not found" };

    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var idxID = headers.indexOf("ID Réservation");
    var idxLien = headers.indexOf("Lien Note"); // On utilise cette colonne existante

    if (idxLien === -1) {
      // Si colonne manquante, on essaie d'écrire en colonne Note ? Ou on échoue ?
      // On va supposer qu'elle existe (validé par l'analyse de FeuilleCalcul.js)
      return { status: "error", message: "Colonne 'Lien Note' introuvable." };
    }

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][idxID]) === String(reservationId)) {
        sheet.getRange(i + 1, idxLien + 1).setValue(linkUrl);
        return { status: "success" };
      }
    }
    return { status: "not_found", message: "ID Réservation non trouvé." };

  } catch (e) {
    return { status: "error", message: e.toString() };
  }
}

/**
 * Enregistre un rapport de livraison (RAS ou Note)
 * Supporte désormais l'écriture du LIE vers Facturation si 'reportLink' est fourni.
 */
function api_saveLivraisonReport(reportData) {
  try {
    if (!reportData) return { status: "error", message: "No data" };

    // 1. Sauvegarde dans TRACE (Historique détaillé)
    var traceRes = saveToTrace_(reportData);

    // 2. Si un lien est fourni (fin de tournée), on met à jour la Facturation
    if (reportData.reportLink && reportData.reservationId) {
      api_saveLivraisonLink(reportData.reservationId, reportData.reportLink);
    }

    return traceRes;

  } catch (e) {
    console.error("Erreur api_saveLivraisonReport: " + e.toString());
    return { status: "error", message: e.toString() };
  }
}

/**
 * Helper interne pour écrire dans l'onglet TRACE
 */
function saveToTrace_(reportData) {
  var ss = SpreadsheetApp.openById(MobileAPI_Config.ID_SPREADSHEET_DATA);
  var sheet = ss.getSheetByName(MobileAPI_Config.NOM_ONGLET_TRACE);

  if (!sheet) {
    sheet = ss.insertSheet(MobileAPI_Config.NOM_ONGLET_TRACE);
    sheet.appendRow(["Timestamp", "ID_Resa", "Livreur", "Etablissement", "Statut", "Note", "GPS_Lat", "GPS_Lng"]);
  }

  var timestamp = new Date();
  sheet.appendRow([
    timestamp,
    reportData.reservationId || "",
    reportData.livreurId || "",
    reportData.etablissementId || "",
    sanitizeInputForSheets_(reportData.statut),
    sanitizeInputForSheets_(reportData.note),
    reportData.lat,
    reportData.lng
  ]);

  return { status: "success", savedAt: timestamp };
}

/**
 * Nettoie une chaîne pour empêcher l'injection de formules dans Google Sheets.
 * @param {string} input La chaîne à nettoyer.
 * @return {string} La chaîne sécurisée.
 */
function sanitizeInputForSheets_(input) {
  if (!input) return "";
  var str = String(input);
  if (/^[=+\-@\t\r]/.test(str)) {
    return "'" + str;
  }
  return str;
}
