/**
 * @fileoverview Script d'analyse des deplacements Tesla (Tessie) et croisement avec les etablissements.
 */

/**
 * Helper to get the spreadsheet, falling back to ID if not bound.
 */
function getSpreadsheet_() {
    try {
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        if (ss) return ss;
    } catch (e) { }

    // Fallback ID from Projet_ELS/Configuration.js
    var ID_FEUILLE_CALCUL = '1AzWdQQ4UEq0Fvr_iTpDY5TiXn55ij30_okIxIG5p_OM';
    return SpreadsheetApp.openById(ID_FEUILLE_CALCUL);
}

/**
 * Lance l'extraction de l'historique complet et le croisement.
 */
function lancerAnalyseTessie() {
    var config = getConfigTesla_();
    if (!config.VIN || !config.TOKEN) {
        Logger.log("Configuration Tesla manquante.");
        return;
    }

    // 1. Récupération de l'historique des trajets
    var drives = fetchAllTessieDrives(config);
    Logger.log(drives.length + " trajets récupérés.");

    // 2. Chargement des établissements et leurs coordonnées
    var etablissements = loadEstablishmentsCoordinates();
    Logger.log(etablissements.length + " établissements chargés pour le croisement.");

    // 3. Analyse et croisement
    var analysis = [];
    drives.forEach(function (drive) {
        var startMatch = findNearestEstablishment(drive.start_latitude, drive.start_longitude, etablissements);
        var endMatch = findNearestEstablishment(drive.end_latitude, drive.end_longitude, etablissements);

        analysis.push({
            date: new Date(drive.start_date * 1000), // Tessie timestamps are often unix epoch
            durationMin: Math.round((drive.end_date - drive.start_date) / 60),
            distanceKm: Math.round(drive.distance * 1.60934), // Miles to Km
            start: {
                lat: drive.start_latitude,
                lng: drive.start_longitude,
                address: drive.start_address,
                matchName: startMatch ? startMatch.nom : null,
                matchDist: startMatch ? startMatch.distance : null,
                matchType: startMatch ? startMatch.type : null
            },
            end: {
                lat: drive.end_latitude,
                lng: drive.end_longitude,
                address: drive.end_address,
                matchName: endMatch ? endMatch.nom : null,
                matchDist: endMatch ? endMatch.distance : null,
                matchType: endMatch ? endMatch.type : null
            }
        });
    });

    // 4. Ecriture du rapport
    writeAnalysisReport(analysis);
}

/**
 * Récupère TOUS les trajets via l'API Tessie (pagination si nécessaire, ici simple get).
 */
function fetchAllTessieDrives(config) {
    // L'endpoint 'drives' de Tessie retourne les trajets.
    // URL: https://api.tessie.com/{vin}/drives?limit=1000 (exemple)
    // On va demander une limite elevee pour avoir l'historique.

    var url = 'https://api.tessie.com/' + config.VIN + '/drives?limit=500&format=json';
    var options = {
        method: 'get',
        headers: { 'Authorization': 'Bearer ' + config.TOKEN },
        muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() !== 200) {
        Logger.log("Erreur API Tessie: " + response.getContentText());
        return [];
    }

    var json = JSON.parse(response.getContentText());
    // Tessie retourne { results: [...] } ou directement un array selon la version.
    // Verifions la structure commune.
    return json.results || json || [];
}

/**
 * Charge les coordonnées des établissements depuis la feuille Base_Etablissements.
 */
function loadEstablishmentsCoordinates() {
    var ss = getSpreadsheet_();
    if (!ss) {
        Logger.log("Impossible d'ouvrir la feuille de calcul.");
        return [];
    }
    var sheet = ss.getSheetByName('Base_Etablissements'); // Nom défini dans Configuration.js
    if (!sheet) return [];

    var data = sheet.getDataRange().getValues();
    var headers = data[0];

    // Mapping colonnes
    var idxNom = headers.indexOf('Nom');
    var idxType = headers.indexOf('Type');
    var idxLat = headers.indexOf('Latitude');
    var idxLng = headers.indexOf('Longitude');

    if (idxLat === -1 || idxLng === -1) {
        Logger.log("Colonnes Latitude/Longitude introuvables dans Base_Etablissements.");
        return [];
    }

    var list = [];
    for (var i = 1; i < data.length; i++) {
        var lat = parseFloat(data[i][idxLat]);
        var lng = parseFloat(data[i][idxLng]);
        if (!isNaN(lat) && !isNaN(lng)) {
            list.push({
                nom: data[i][idxNom],
                type: data[i][idxType],
                lat: lat,
                lng: lng
            });
        }
    }
    return list;
}

/**
 * Trouve l'établissement le plus proche des coordonnées données.
 * Seuil de detection : 200 mètres (0.2 km).
 */
function findNearestEstablishment(lat, lng, list) {
    if (!lat || !lng) return null;

    var minDeviceId = null;
    var minDist = 999999;
    var match = null;

    for (var i = 0; i < list.length; i++) {
        var d = haversineDistance(lat, lng, list[i].lat, list[i].lng);
        if (d < minDist) {
            minDist = d;
            match = list[i];
        }
    }

    // Seuil de 200m pour considérer que c'est une visite valide
    if (minDist <= 0.2) {
        match.distance = Math.round(minDist * 1000); // en mètres
        return match;
    }

    return null;
}

/**
 * Formule de Haversine pour la distance en km.
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
    var R = 6371; // Rayon terre km
    var dLat = toRad(lat2 - lat1);
    var dLon = toRad(lon2 - lon1);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(deg) {
    return deg * (Math.PI / 180);
}

/**
 * Ecrit le rapport d'analyse dans un nouvel onglet.
 */
function writeAnalysisReport(analysis) {
    var ss = getSpreadsheet_();
    var sheetName = 'Analyse_Ref_Croisee';
    var sheet = ss.getSheetByName(sheetName);

    if (sheet) {
        sheet.clear();
    } else {
        sheet = ss.insertSheet(sheetName);
    }

    var headers = [
        'Date', 'Durée (min)', 'Distance (km)',
        'Départ (Lat,Lng)', 'Départ (Adresse)', 'Départ (Etablissement)', 'Dist. Détection (m)',
        'Arrivée (Lat,Lng)', 'Arrivée (Adresse)', 'Arrivée (Etablissement)', 'Dist. Détection (m)'
    ];

    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#e6e6e6');

    var rows = analysis.map(function (item) {
        return [
            item.date,
            item.durationMin,
            item.distanceKm,
            item.start.lat + ',' + item.start.lng,
            item.start.address,
            item.start.matchName || '-',
            item.start.matchDist || '-',
            item.end.lat + ',' + item.end.lng,
            item.end.address,
            item.end.matchName || '-',
            item.end.matchDist || '-'
        ];
    });

    if (rows.length > 0) {
        // Write in chunks to avoid limits if necessary, but 500 rows is fine.
        sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }

    // Formatage
    sheet.autoResizeColumns(1, headers.length);
}

/**
 * Helper: Config copy
 */
function getConfigTesla_() {
    var props = PropertiesService.getScriptProperties();
    return {
        VIN: props.getProperty('VIN_TESLA_JUNIPER_2025') || props.getProperty('TESLA_VIN'),
        TOKEN: props.getProperty('TOKEN_TESSIE') || props.getProperty('TESLA_TOKEN')
    };
}
