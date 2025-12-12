// =================================================================
//                      LOGIQUE GOOGLE SHEETS
// =================================================================
// Description: Fonctions pour interagir avec la base de données
//              Google Sheets (lecture et écriture).
// =================================================================

/**
 * Enregistre un nouveau client ou met à jour un client existant.
 * @param {Object} donneesClient Les données du client.
 */
function calculerIdentifiantClient(email) {
  const emailNorm = String(email || '').trim();
  if (!emailNorm) return '';
  try {
    if (typeof genererIdentifiantClient === 'function') {
      return genererIdentifiantClient(emailNorm);
    }
  } catch (err) {
    Logger.log(`Avertissement: génération d'identifiant via fallback pour ${emailNorm} (${err})`);
  }
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, emailNorm.toLowerCase());
  return construireIdentifiantCartoonDepuisDigest_(digest);
}

function enregistrerOuMajClient(donneesClient) {
  try {
    if (!donneesClient || !donneesClient.email) {
      return { isNew: false, clientId: '' };
    }
    const emailNormalise = String(donneesClient.email || '').trim();
    if (!emailNormalise) {
      return { isNew: false, clientId: '' };
    }
    donneesClient.email = emailNormalise;
    const telephoneNormalise = String(donneesClient.telephone || '').replace(/\s+/g, ' ').trim();
    donneesClient.telephone = telephoneNormalise;

    const feuilleClients = SpreadsheetApp.openById(getSecret('ID_FEUILLE_CALCUL')).getSheetByName(SHEET_CLIENTS);
    if (!feuilleClients) throw new Error("La feuille 'Clients' est introuvable.");

    const headerRow = feuilleClients.getRange(1, 1, 1, Math.max(1, feuilleClients.getLastColumn())).getValues()[0];
    const headerTrimmed = headerRow.map(function (h) { return String(h || '').trim(); });
    if (headerTrimmed.indexOf(COLONNE_RESIDENT_CLIENT) === -1) {
      feuilleClients.getRange(1, feuilleClients.getLastColumn() + 1).setValue(COLONNE_RESIDENT_CLIENT);
    }
    if (headerTrimmed.indexOf(COLONNE_ID_CLIENT) === -1) {
      feuilleClients.getRange(1, feuilleClients.getLastColumn() + 1).setValue(COLONNE_ID_CLIENT);
    }
    if (headerTrimmed.indexOf(COLONNE_CODE_POSTAL_CLIENT) === -1) {
      feuilleClients.getRange(1, feuilleClients.getLastColumn() + 1).setValue(COLONNE_CODE_POSTAL_CLIENT);
    }
    if (headerTrimmed.indexOf(COLONNE_TELEPHONE_CLIENT) === -1) {
      feuilleClients.getRange(1, feuilleClients.getLastColumn() + 1).setValue(COLONNE_TELEPHONE_CLIENT);
    }

    const enTetesRequis = ["Email", "Raison Sociale", "Adresse", COLONNE_TELEPHONE_CLIENT, "SIRET", COLONNE_CODE_POSTAL_CLIENT, COLONNE_TYPE_REMISE_CLIENT, COLONNE_VALEUR_REMISE_CLIENT, COLONNE_NB_TOURNEES_OFFERTES, COLONNE_RESIDENT_CLIENT, COLONNE_ID_CLIENT];
    const indices = obtenirIndicesEnTetes(feuilleClients, enTetesRequis);
    const donneesFeuille = feuilleClients.getDataRange().getValues();
    const indexLigneClient = donneesFeuille.findIndex(ligne => String(ligne[indices["Email"]]).toLowerCase() === emailNormalise.toLowerCase());

    if (indexLigneClient !== -1) { // Mise à jour
      const ligneAjour = donneesFeuille[indexLigneClient];
      const idExistant = String(ligneAjour[indices[COLONNE_ID_CLIENT]] || '').trim();
      const clientId = idExistant || calculerIdentifiantClient(emailNormalise);
      ligneAjour[indices["Email"]] = emailNormalise;
      ligneAjour[indices["Raison Sociale"]] = donneesClient.nom || '';
      ligneAjour[indices["Adresse"]] = donneesClient.adresse || '';
      ligneAjour[indices[COLONNE_TELEPHONE_CLIENT]] = donneesClient.telephone || '';
      ligneAjour[indices["SIRET"]] = donneesClient.siret || '';
      ligneAjour[indices[COLONNE_CODE_POSTAL_CLIENT]] = donneesClient.codePostal || '';
      ligneAjour[indices[COLONNE_TYPE_REMISE_CLIENT]] = donneesClient.typeRemise || '';
      ligneAjour[indices[COLONNE_VALEUR_REMISE_CLIENT]] = donneesClient.valeurRemise !== undefined ? donneesClient.valeurRemise : 0;
      ligneAjour[indices[COLONNE_NB_TOURNEES_OFFERTES]] = donneesClient.nbTourneesOffertes !== undefined ? donneesClient.nbTourneesOffertes : 0;
      ligneAjour[indices[COLONNE_RESIDENT_CLIENT]] = donneesClient.resident === true;
      ligneAjour[indices[COLONNE_ID_CLIENT]] = clientId;
      feuilleClients.getRange(indexLigneClient + 1, 1, 1, ligneAjour.length).setValues([ligneAjour]);
      donneesClient.clientId = clientId;
      return { isNew: false, clientId: clientId };
    } else { // Création
      const clientId = calculerIdentifiantClient(emailNormalise);
      const nouvelleLigne = new Array(feuilleClients.getLastColumn()).fill('');
      nouvelleLigne[indices["Email"]] = emailNormalise;
      nouvelleLigne[indices["Raison Sociale"]] = donneesClient.nom || '';
      nouvelleLigne[indices["Adresse"]] = donneesClient.adresse || '';
      nouvelleLigne[indices[COLONNE_TELEPHONE_CLIENT]] = donneesClient.telephone || '';
      nouvelleLigne[indices["SIRET"]] = donneesClient.siret || '';
      nouvelleLigne[indices[COLONNE_CODE_POSTAL_CLIENT]] = donneesClient.codePostal || '';
      nouvelleLigne[indices[COLONNE_TYPE_REMISE_CLIENT]] = donneesClient.typeRemise || '';
      nouvelleLigne[indices[COLONNE_VALEUR_REMISE_CLIENT]] = donneesClient.valeurRemise !== undefined ? donneesClient.valeurRemise : 0;
      nouvelleLigne[indices[COLONNE_NB_TOURNEES_OFFERTES]] = donneesClient.nbTourneesOffertes !== undefined ? donneesClient.nbTourneesOffertes : 0;
      nouvelleLigne[indices[COLONNE_RESIDENT_CLIENT]] = donneesClient.resident === true;
      nouvelleLigne[indices[COLONNE_ID_CLIENT]] = clientId;
      feuilleClients.appendRow(nouvelleLigne);
      donneesClient.clientId = clientId;
      return { isNew: true, clientId: clientId };
    }
  } catch (e) {
    Logger.log(`Erreur dans enregistrerOuMajClient : ${e.stack}`);
    return { isNew: false, clientId: '' };
  }
}

/**
 * Recherche les informations d'un client par son e-mail.
 * @param {string} email L'e-mail du client.
 * @returns {Object|null} Les informations du client ou null.
 */
function obtenirInfosClientParEmail(email) {
  try {
    const feuilleClients = SpreadsheetApp.openById(getSecret('ID_FEUILLE_CALCUL')).getSheetByName(SHEET_CLIENTS);
    if (!feuilleClients) return null;

    // OPTIMISATION: Une seule lecture de la feuille (DataRange) pour récupérer en-têtes ET données.
    // Cela évite 2 appels API supplémentaires (getRange pour header, et implicite dans obtenirIndicesEnTetes).
    const donnees = feuilleClients.getDataRange().getValues();
    if (!donnees || donnees.length === 0) return null;

    const headerRow = donnees[0];
    const headerTrimmed = headerRow.map(function (h) { return String(h || '').trim(); });

    // Vérification et ajout des colonnes manquantes (si nécessaire)
    // Note: Dans 99% des cas, ces colonnes existent, donc on économise les appels d'écriture/lecture.
    if (headerTrimmed.indexOf(COLONNE_RESIDENT_CLIENT) === -1) {
      feuilleClients.getRange(1, feuilleClients.getLastColumn() + 1).setValue(COLONNE_RESIDENT_CLIENT);
      headerRow.push(COLONNE_RESIDENT_CLIENT); // Mise à jour locale pour les indices
    }
    if (headerTrimmed.indexOf(COLONNE_ID_CLIENT) === -1) {
      feuilleClients.getRange(1, feuilleClients.getLastColumn() + 1).setValue(COLONNE_ID_CLIENT);
      headerRow.push(COLONNE_ID_CLIENT);
    }
    if (headerTrimmed.indexOf(COLONNE_CODE_POSTAL_CLIENT) === -1) {
      feuilleClients.getRange(1, feuilleClients.getLastColumn() + 1).setValue(COLONNE_CODE_POSTAL_CLIENT);
      headerRow.push(COLONNE_CODE_POSTAL_CLIENT);
    }
    if (headerTrimmed.indexOf(COLONNE_TELEPHONE_CLIENT) === -1) {
      feuilleClients.getRange(1, feuilleClients.getLastColumn() + 1).setValue(COLONNE_TELEPHONE_CLIENT);
      headerRow.push(COLONNE_TELEPHONE_CLIENT);
    }

    const enTetesRequis = ["Email", "Raison Sociale", "Adresse", COLONNE_TELEPHONE_CLIENT, "SIRET", COLONNE_CODE_POSTAL_CLIENT, COLONNE_TYPE_REMISE_CLIENT, COLONNE_VALEUR_REMISE_CLIENT, COLONNE_NB_TOURNEES_OFFERTES, COLONNE_RESIDENT_CLIENT, COLONNE_ID_CLIENT];
    
    // Calcul des indices localement pour éviter l'appel à obtenirIndicesEnTetes qui relit la feuille
    const indices = {};
    const enTetesManquants = enTetesRequis.filter(reqHeader => {
      const index = headerRow.findIndex(h => String(h).trim() === reqHeader);
      if (index !== -1) {
        indices[reqHeader] = index;
        return false;
      }
      return true;
    });

    if (enTetesManquants.length > 0) {
      // Si des en-têtes requis manquent (ex: Raison Sociale), on ne peut pas lire correctement.
      Logger.log(`Colonnes manquantes dans obtenirInfosClientParEmail: ${enTetesManquants.join(', ')}`);
      // Fallback ou erreur silencieuse pour éviter le crash dur si la structure est corrompue
    }

    const emailNorm = String(email || '').trim().toLowerCase();
    let ligneClient = null;
    let indexLigne = -1;
    for (let i = 1; i < donnees.length; i++) {
      if (String(donnees[i][indices["Email"]]).toLowerCase() === emailNorm) {
        ligneClient = donnees[i];
        indexLigne = i;
        break;
      }
    }

    if (ligneClient) {
      let clientId = String(ligneClient[indices[COLONNE_ID_CLIENT]] || '').trim();
      if (!clientId) {
        clientId = calculerIdentifiantClient(emailNorm);
        feuilleClients.getRange(indexLigne + 1, indices[COLONNE_ID_CLIENT] + 1).setValue(clientId);
        ligneClient[indices[COLONNE_ID_CLIENT]] = clientId;
      }
      return {
        email: ligneClient[indices["Email"]],
        nom: ligneClient[indices["Raison Sociale"]] || '',
        adresse: ligneClient[indices["Adresse"]] || '',
        telephone: String(ligneClient[indices[COLONNE_TELEPHONE_CLIENT]] || '').trim(),
        siret: ligneClient[indices["SIRET"]] || '',
        codePostal: ligneClient[indices[COLONNE_CODE_POSTAL_CLIENT]] || '',
        typeRemise: String(ligneClient[indices[COLONNE_TYPE_REMISE_CLIENT]]).trim() || '',
        valeurRemise: parseFloat(ligneClient[indices[COLONNE_VALEUR_REMISE_CLIENT]]) || 0,
        nbTourneesOffertes: parseInt(ligneClient[indices[COLONNE_NB_TOURNEES_OFFERTES]]) || 0,
        resident: ligneClient[indices[COLONNE_RESIDENT_CLIENT]] === true,
        clientId: clientId
      };
    }
    return null;
  } catch (e) {
    Logger.log(`Erreur dans obtenirInfosClientParEmail : ${e.stack}`);
    return null;
  }
}

/**
 * Retourne la liste des codes postaux autorisés pour le retrait.
 * @param {{forceRefresh?:boolean}=} options Permet de forcer l'actualisation du cache.
 * @returns {string[]} Tableau de codes postaux (5 chiffres).
 */
function obtenirCodesPostauxRetrait(options) {
  const forceRefresh = !!(options && options.forceRefresh);
  const cacheKeyCodes = 'ELS_CODES_POSTAUX_RETRAIT';
  const cache = CacheService.getScriptCache();
  if (!forceRefresh) {
    try {
      const cached = cache.get(cacheKeyCodes);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (_err) {
      // ignore cache parsing errors
    }
  }

  const { codes, details } = collectCodesPostauxRetrait_();
  const resultat = Array.from(codes.values()).sort();

  if (!forceRefresh && resultat.length > 0) {
    try {
      cache.put(cacheKeyCodes, JSON.stringify(resultat), 300);
      cache.put('ELS_CODES_POSTAUX_RETRAIT_DETAILS', JSON.stringify(details), 300);
    } catch (_cacheErr) {
      // ignore cache errors
    }
  }
  return resultat;
}

/**
 * Variante retournant aussi le nom de la commune (colonne Libellé/Commune/Ville).
 * @param {{forceRefresh?:boolean}=} options
 * @returns {{codePostal:string, commune:string}[]}
 */
function obtenirCodesPostauxRetraitAvecCommunes(options) {
  const forceRefresh = !!(options && options.forceRefresh);
  const cacheKey = 'ELS_CODES_POSTAUX_RETRAIT_DETAILS';
  const cache = CacheService.getScriptCache();
  if (!forceRefresh) {
    try {
      const cached = cache.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (_err) {
      // ignore cache parsing errors
    }
  }

  const { codes, details } = collectCodesPostauxRetrait_();
  const sortedDetails = details.sort(function(a, b) {
    const cmp = String(a.codePostal).localeCompare(String(b.codePostal));
    if (cmp !== 0) return cmp;
    return String(a.commune || '').localeCompare(String(b.commune || ''));
  });

  if (!forceRefresh && codes.size > 0) {
    try {
      cache.put('ELS_CODES_POSTAUX_RETRAIT', JSON.stringify(Array.from(codes.values()).sort()), 300);
      cache.put(cacheKey, JSON.stringify(sortedDetails), 300);
    } catch (_cacheErr) {
      // ignore cache errors
    }
  }
  return sortedDetails;
}

/**
 * Lecture unique de l'onglet Codes_Postaux_Retrait (codes + communes).
 * @returns {{codes:Set<string>, details:{codePostal:string, commune:string}[]}}
 */
function collectCodesPostauxRetrait_() {
  try {
    const feuille = SpreadsheetApp.openById(getSecret('ID_FEUILLE_CALCUL')).getSheetByName(SHEET_CODES_POSTAUX_RETRAIT);
    if (!feuille || feuille.getLastRow() <= 1 || feuille.getLastColumn() < 1) {
      return { codes: new Set(), details: [] };
    }
    const donnees = feuille.getDataRange().getValues();
    if (!donnees || donnees.length <= 1) {
      return { codes: new Set(), details: [] };
    }
    const enTete = donnees[0].map(function(valeur) { return String(valeur || '').trim(); });
    const indexCode = enTete.indexOf(COLONNE_CODE_POSTAL_CLIENT);
    if (indexCode === -1) {
      throw new Error('La colonne "Code Postal" est absente de la feuille des codes postaux.');
    }
    const normalizeHeader = function(label) {
      return String(label || '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
    };
    const headerNorm = enTete.map(normalizeHeader);
    const indexCommune = headerNorm.findIndex(function(nom) {
      return ['commune', 'ville', 'libelle', 'libelle commune'].indexOf(nom) !== -1;
    });
    const indexActif = enTete.findIndex(function(nom) { return nom && nom.toString().trim().toLowerCase() === 'actif'; });

    const codes = new Set();
    const detailsMap = new Map(); // codePostal -> commune

    for (let i = 1; i < donnees.length; i++) {
      const ligne = donnees[i];
      const codeNormalise = normaliserCodePostal(ligne[indexCode]);
      if (!codeNormalise) {
        continue;
      }
      if (indexActif !== -1) {
        const valeurActif = ligne[indexActif];
        const estActif = typeof valeurActif === 'boolean'
          ? valeurActif
          : !/^(\s*false\s*|\s*non\s*|\s*0\s*)$/i.test(String(valeurActif || '').trim());
        if (!estActif) {
          continue;
        }
      }
      codes.add(codeNormalise);
      if (indexCommune !== -1) {
        const commune = String(ligne[indexCommune] || '').trim();
        if (!detailsMap.has(codeNormalise) || (commune && !detailsMap.get(codeNormalise))) {
          detailsMap.set(codeNormalise, commune);
        }
      }
    }

    const details = Array.from(detailsMap.entries()).map(function(entry) {
      return { codePostal: entry[0], commune: entry[1] || '' };
    });
    return { codes: codes, details: details };
  } catch (e) {
    Logger.log(`Erreur dans collectCodesPostauxRetrait_ : ${e.stack}`);
    return { codes: new Set(), details: [] };
  }
}

/**
 * Indique si un code postal est autorisé pour accéder au service.
 * @param {string|number} codePostal Code postal fourni.
 * @returns {boolean} true si le code est autorisé.
 */
function codePostalAutorise(codePostal) {
  const normalise = normaliserCodePostal(codePostal);
  if (!normalise) {
    return false;
  }
  const codes = obtenirCodesPostauxRetrait();
  return codes.indexOf(normalise) !== -1;
}

/**
 * Décrémente le nombre de tournées offertes pour un client.
 * @param {string} emailClient L'e-mail du client.
 */
function decrementerTourneesOffertesClient(emailClient) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return;
  try {
    const feuilleClients = SpreadsheetApp.openById(getSecret('ID_FEUILLE_CALCUL')).getSheetByName(SHEET_CLIENTS);
    if (!feuilleClients) throw new Error("La feuille 'Clients' est introuvable.");

    const enTetesRequis = ["Email", COLONNE_NB_TOURNEES_OFFERTES];
    const indices = obtenirIndicesEnTetes(feuilleClients, enTetesRequis);
    
    const donneesFeuille = feuilleClients.getDataRange().getValues();
    const indexLigneClient = donneesFeuille.findIndex(ligne => String(ligne[indices["Email"]]).toLowerCase() === emailClient.toLowerCase());

    if (indexLigneClient !== -1) {
      let nbTournees = parseInt(donneesFeuille[indexLigneClient][indices[COLONNE_NB_TOURNEES_OFFERTES]]) || 0;
      if (nbTournees > 0) {
        feuilleClients.getRange(indexLigneClient + 1, indices[COLONNE_NB_TOURNEES_OFFERTES] + 1).setValue(nbTournees - 1);
      }
    }
  } catch (e) {
    Logger.log(`Erreur dans decrementerTourneesOffertesClient : ${e.stack}`);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Enregistre une réservation dans l'onglet "Facturation".
 * @param {Date} dateHeureDebut L'objet Date de début.
 * @param {string} nomClient Le nom du client.
 * @param {string} emailClient L'e-mail du client.
 * @param {string} type Le type de course.
 * @param {string} details Les détails de la course.
 * @param {number} montant Le montant.
 * @param {string} idEvenement L'ID de l'événement Calendar.
 * @param {string} idReservation L'ID unique de la réservation.
 * @param {string} note La note interne.
 * @param {boolean} tourneeOfferteAppliquee Si une tournée a été offerte.
 * @param {string} typeRemiseAppliquee Le type de remise appliqué.
 * @param {number} valeurRemiseAppliquee La valeur de la remise.
 * @param {boolean} estResident Indique si la course concerne un résident.
 */
function enregistrerReservationPourFacturation(dateHeureDebut, nomClient, emailClient, type, details, montant, idEvenement, idReservation, note, tourneeOfferteAppliquee = false, typeRemiseAppliquee = '', valeurRemiseAppliquee = 0, estResident = false) {
  try {
    const feuilleFacturation = SpreadsheetApp.openById(getSecret('ID_FEUILLE_CALCUL')).getSheetByName(SHEET_FACTURATION);
    if (!feuilleFacturation) throw new Error("La feuille 'Facturation' est introuvable.");

    const headerRow = feuilleFacturation.getRange(1, 1, 1, Math.max(1, feuilleFacturation.getLastColumn())).getValues()[0];
    const trimmedHeaders = headerRow.map(function (h) { return String(h || '').trim(); });
    if (trimmedHeaders.indexOf('Resident') === -1) {
      feuilleFacturation.getRange(1, trimmedHeaders.length + 1).setValue('Resident');
    }

    const requiredHeaders = (typeof FACTURATION_HEADERS !== 'undefined' && Array.isArray(FACTURATION_HEADERS))
      ? FACTURATION_HEADERS.concat(['Resident'])
      : ["Date", "Client (Raison S. Client)", "Client (Email)", "Type", "Détails", "Montant", "Statut", "Valider", "N° Facture", "Event ID", "ID Réservation", "Note Interne", "Tournée Offerte Appliquée", "Type Remise Appliquée", "Valeur Remise Appliquée", "Lien Note", "Resident"];
    const indices = getFacturationHeaderIndices_(feuilleFacturation, requiredHeaders).indices;

    const nouvelleLigne = new Array(feuilleFacturation.getLastColumn()).fill('');
    
    nouvelleLigne[indices["Date"]] = dateHeureDebut;
    nouvelleLigne[indices["Client (Raison S. Client)"]] = nomClient;
    nouvelleLigne[indices["Client (Email)"]] = emailClient;
    nouvelleLigne[indices["Type"]] = type;
    nouvelleLigne[indices["Détails"]] = details;
    nouvelleLigne[indices["Montant"]] = parseFloat(montant);
    nouvelleLigne[indices["Statut"]] = "Confirmée";
    nouvelleLigne[indices["Valider"]] = false;
    nouvelleLigne[indices["Event ID"]] = idEvenement;
    nouvelleLigne[indices["ID Réservation"]] = idReservation;
    nouvelleLigne[indices["Note Interne"]] = note || "";
    nouvelleLigne[indices["Tournée Offerte Appliquée"]] = tourneeOfferteAppliquee;
    nouvelleLigne[indices["Type Remise Appliquée"]] = typeRemiseAppliquee;
    nouvelleLigne[indices["Valeur Remise Appliquée"]] = valeurRemiseAppliquee;
    nouvelleLigne[indices["Lien Note"]] = "";
    nouvelleLigne[indices["Resident"]] = estResident === true;

    feuilleFacturation.appendRow(nouvelleLigne);
  } catch (e) {
    Logger.log(`ERREUR CRITIQUE dans enregistrerReservationPourFacturation: ${e.stack}`);
    notifyAdminWithThrottle('ERREUR_LOG_FACTURE', `[${NOM_ENTREPRISE}] Erreur Critique d'Enregistrement Facturation`, `Erreur: ${e.message}`);
    throw e;
  }
}

/**
 * Récupère les plages horaires bloquées pour une date.
 * @param {Date} date La date à vérifier.
 * @returns {Array<Object>} Une liste d'intervalles bloqués.
 */
function obtenirPlagesBloqueesPourDate(date) {
    try {
        const feuillePlagesBloquees = SpreadsheetApp.openById(getSecret('ID_FEUILLE_CALCUL')).getSheetByName(SHEET_PLAGES_BLOQUEES);
        if (!feuillePlagesBloquees) return [];

        const indices = obtenirIndicesEnTetes(feuillePlagesBloquees, ["Date", "Heure_Debut", "Heure_Fin"]);
        const valeurs = feuillePlagesBloquees.getDataRange().getValues();
        const dateString = formaterDateEnYYYYMMDD(date);
        const intervallesBloques = [];

        for (let i = 1; i < valeurs.length; i++) {
            const ligne = valeurs[i];
            const numeroLigne = i + 1;
            const dateLigne = ligne[indices["Date"]];
            
            if (dateLigne instanceof Date && formaterDateEnYYYYMMDD(dateLigne) === dateString) {
                const heureDebut = ligne[indices["Heure_Debut"]];
                const heureFin = ligne[indices["Heure_Fin"]];

                if (heureDebut instanceof Date && heureFin instanceof Date) {
                    const dateHeureDebut = new Date(date);
                    dateHeureDebut.setHours(heureDebut.getHours(), heureDebut.getMinutes(), 0, 0);
                    
                    const dateHeureFin = new Date(date);
                    dateHeureFin.setHours(heureFin.getHours(), heureFin.getMinutes(), 0, 0);
                    
                    if (!isNaN(dateHeureDebut.getTime()) && !isNaN(dateHeureFin.getTime())) {
                        intervallesBloques.push({ start: dateHeureDebut, end: dateHeureFin });
                    } else {
                        Logger.log(`AVERTISSEMENT: Donnée de temps invalide dans la feuille "Plages_Bloquees" à la ligne ${numeroLigne}. Heure début: "${heureDebut}", Heure fin: "${heureFin}". Cette plage est ignorée.`);
                    }
                }
            }
        }
        return intervallesBloques;
    } catch (e) {
        Logger.log(`Erreur lors de la lecture des plages bloquées : ${e.stack}`);
        return [];
    }
}

/**
 * Recherche un client par son e-mail et retourne ses informations.
 * @param {string} email L'e-mail du client à rechercher.
 * @returns {Object|null} L'objet client s'il est trouvé, sinon null.
 */
function rechercherClientParEmail(email) {
  return obtenirInfosClientParEmail(email);
}

