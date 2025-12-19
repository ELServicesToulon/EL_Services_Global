/**
 * @fileoverview Script d'audit et d'enrichissement de la base établissements.
 * Permet de rechercher et d'ajouter les informations manquantes (Site Web, Email, Lat/Lng)
 * en utilisant Google Maps Geocoder et l'assistant Gemini.
 */

// Indices de colonnes (base 0) - à adapter selon la structure réelle si nécessaire
// Basé sur Configuration.js :
// COLONNE_NOM_ETAB = 'Nom'
// COLONNE_ADRESSE_ETAB = 'Adresse'
// COLONNE_EMAIL_ETAB = 'Email'

/**
 * Fonction principale à lancer manuellement pour auditer et enrichir la base.
 */
function auditBaseEtablissement() {
  var ui = SpreadsheetApp.getUi();
  var confirm = ui.alert(
    'Audit Base Etablissements',
    'Ce script va scanner la base et tenter de compléter les adresses emails, sites web et coordonnées GPS manquantes via Google Maps et Gemini AI.\n\nContinuer ?',
    ui.ButtonSet.YES_NO
  );

  if (confirm !== ui.Button.YES) return;

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    ui.alert('Script déjà en cours d\'exécution.');
    return;
  }

  try {
    var result = processAudit_();
    ui.alert('Audit terminé.\n\n' + result.processed + ' lignes traitées.\n' + result.updated + ' mises à jour effectuées.');
  } catch (e) {
    console.error('Erreur Audit:', e);
    ui.alert('Erreur: ' + e.message);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Logique interne de l'audit.
 */
function processAudit_() {
  // 1. Ouvrir la feuille
  var ssId = Config.getSpreadsheetId();
  if (!ssId) throw new Error("ID Spreadsheet non configuré.");

  var ss = SpreadsheetApp.openById(ssId);
  var sheetName = Config.SHEETS.ETABLISSEMENTS || 'Base_Etablissements';
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    // Tentative de fallback ou création si inexistant (prudence, on throw pour l'instant)
    throw new Error("Onglet '" + sheetName + "' introuvable.");
  }

  // 2. Analyser les en-têtes
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var map = mapHeaders_(headers);

  // Vérifier et ajouter les colonnes manquantes si besoin
  var newHeaders = [];
  if (map.site === -1) {
    newHeaders.push("Site Web");
    map.site = headers.length + newHeaders.length - 1;
  }
  if (map.lat === -1) {
    newHeaders.push("Latitude");
    map.lat = headers.length + newHeaders.length - 1;
  }
  if (map.lng === -1) {
    newHeaders.push("Longitude");
    map.lng = headers.length + newHeaders.length - 1;
  }

  if (newHeaders.length > 0) {
    sheet.getRange(1, headers.length + 1, 1, newHeaders.length).setValues([newHeaders]);
    // Re-lire les headers complets
    headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  }

  // 3. Lire les données
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { processed: 0, updated: 0 }; // Pas de données

  var dataRange = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
  var data = dataRange.getValues();
  var updatesCount = 0;
  var rowsToUpdate = []; // Stockera {row: index, col: index, val: value}

  // 4. Itérer
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var nom = (map.nom > -1) ? row[map.nom] : "";
    var adresse = (map.adresse > -1) ? row[map.adresse] : "";
    var cp = (map.cp > -1) ? row[map.cp] : "";
    var ville = (map.ville > -1) ? row[map.ville] : "";

    // Concaténer l'adresse complète pour la recherche
    var fullAddress = [adresse, cp, ville].filter(Boolean).join(", ");

    if (!nom) continue; // Nom obligatoire

    var needsUpdate = false;

    // A. Géocodage (Lat/Lng)
    var currentLat = (map.lat > -1) ? row[map.lat] : "";
    var currentLng = (map.lng > -1) ? row[map.lng] : "";

    if (fullAddress && (!currentLat || !currentLng)) {
      Utilities.sleep(200); // Rate limit simple pour Maps
      try {
        var geo = Maps.newGeocoder().setRegion('fr').geocode(fullAddress);
        if (geo.status === 'OK' && geo.results.length > 0) {
          var loc = geo.results[0].geometry.location;
          row[map.lat] = loc.lat;
          row[map.lng] = loc.lng;
          needsUpdate = true;
          console.log("Géocodage OK pour: " + nom);
        }
      } catch (e) {
        console.warn("Erreur Géocodage pour " + nom, e);
      }
    }

    // B. Enrichissement Gemini (Email / Site Web)
    var currentEmail = (map.email > -1) ? row[map.email] : "";
    var currentSite = (map.site > -1) ? row[map.site] : "";

    if ((!currentEmail || !currentSite) && fullAddress) {
      // Construction du prompt
      var missingFields = [];
      if (!currentEmail) missingFields.push("l'adresse email officielle (contact)");
      if (!currentSite) missingFields.push("l'URL du site web officiel");

      if (missingFields.length > 0) {
        var prompt = "Tu es un assistant administratif précis. Trouve " + missingFields.join(" et ") +
                     " pour l'établissement suivant : " + nom + " situé à " + fullAddress +
                     ". Réponds uniquement au format JSON strictement valide sans markdown : {\"email\": \"...\", \"site\": \"...\"}. " +
                     "Si tu ne trouves pas, mets null. Pas de texte avant ou après.";

        try {
          // On utilise callGemini directement car askAssistant est prévu pour le Chat
          // On passe un contexte vide car c'est une requête one-shot
          var aiResponse = callGemini([], prompt);

          if (aiResponse.ok && aiResponse.message) {
            var jsonStr = aiResponse.message.replace(/```json/g, '').replace(/```/g, '').trim();
            var result = JSON.parse(jsonStr);

            if (result.email && !currentEmail && map.email > -1) {
               row[map.email] = result.email;
               needsUpdate = true;
            }
            if (result.site && !currentSite && map.site > -1) {
               row[map.site] = result.site;
               needsUpdate = true;
            }
            console.log("Enrichissement AI OK pour: " + nom);
          }
        } catch (e) {
          console.warn("Erreur AI pour " + nom, e);
        }
      }
    }

    if (needsUpdate) {
      updatesCount++;
      // On met à jour le tableau en mémoire, on écriera tout à la fin
    }
  }

  // 5. Sauvegarder les changements
  if (updatesCount > 0) {
    dataRange.setValues(data);
  }

  return { processed: data.length, updated: updatesCount };
}

/**
 * Mappe les noms de colonnes vers les index.
 */
function mapHeaders_(headers) {
  var map = {
    nom: -1,
    adresse: -1,
    cp: -1,
    ville: -1,
    email: -1,
    site: -1,
    lat: -1,
    lng: -1
  };

  for (var i = 0; i < headers.length; i++) {
    var h = String(headers[i]).toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // enlever accents

    if (h.includes("nom") || h === "etablissement") map.nom = i;
    else if (h === "adresse" || h.includes("rue")) map.adresse = i;
    else if (h.includes("code postal") || h === "cp") map.cp = i;
    else if (h === "ville" || h === "commune") map.ville = i;
    else if (h.includes("email") || h.includes("mail") || h.includes("courriel")) map.email = i;
    else if (h.includes("site") || h.includes("web") || h.includes("url")) map.site = i;
    else if (h.includes("lat")) map.lat = i;
    else if (h.includes("long") || h.includes("lng")) map.lng = i;
  }
  return map;
}
