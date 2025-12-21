// =================================================================
//                      LOGIQUE D'ADMINISTRATION
// =================================================================
// Description: Fonctions pour le panneau d'administration et les
//              menus (facturation, gestion des clients et courses).
// =================================================================

/**
 * Invalide la configuration mise en cache.
 * À utiliser après toute modification manuelle des paramètres.
 */
function invaliderCacheConfiguration() {
  CacheService.getScriptCache().remove('CONFIG_JSON');
}

/**
 * Autorisation chauffeur (webapp livraison) basee sur un code partage.
 * @param {string} authToken Code fourni par le chauffeur (ex: ELS_SHARED_SECRET).
 * @returns {boolean}
 */
function isLivreurAuthorized_(authToken) {
  try {
    const token = (authToken || '').toString().trim();
    if (!token) return false;
    const shared = getSecret('ELS_SHARED_SECRET');
    return Boolean(shared) && token === shared;
  } catch (err) {
    Logger.log('isLivreurAuthorized_ error: ' + err.toString());
    return false;
  }
}

/**
 * Calcule le chiffre d'affaires du mois en cours.
 * @return {number|null} Total du CA ou null si désactivé ou non autorisé.
 */
function calculerCAEnCours() {
  if (!CA_EN_COURS_ENABLED) return null;

  const userEmail = Session.getActiveUser().getEmail();
  if (!userEmail || userEmail.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return null;
  }

  const feuille = SpreadsheetApp.openById(getSecret('ID_FEUILLE_CALCUL')).getSheetByName(SHEET_FACTURATION);
  if (!feuille) return null;

  const indices = getFacturationHeaderIndices_(feuille, ["Date", "Montant"]).indices;
  const donnees = feuille.getDataRange().getValues();
  const aujourdHui = new Date();
  const moisActuel = aujourdHui.getMonth();
  const anneeActuelle = aujourdHui.getFullYear();
  let total = 0;

  for (let i = 1; i < donnees.length; i++) {
    const ligne = donnees[i];
    const dateCell = new Date(ligne[indices["Date"]]);
    if (!isNaN(dateCell) && dateCell.getMonth() === moisActuel && dateCell.getFullYear() === anneeActuelle) {
      total += parseFloat(ligne[indices["Montant"]]) || 0;
    }
  }

  return total;
}

/**
 * Génère un lien signé pour l'espace client (réservé à l'admin).
 * @param {string} emailClient
 * @param {number} [heuresValidite=168] Durée de validité en heures (défaut 7 jours).
 * @returns {{url:string, exp:number}} Lien et timestamp d'expiration (secondes epoch).
 */
function genererLienEspaceClient(emailClient, heuresValidite) {
  const userEmail = Session.getActiveUser().getEmail();
  if (!userEmail || userEmail.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    throw new Error('Accès non autorisé.');
  }
  if (!CLIENT_PORTAL_SIGNED_LINKS) {
    throw new Error('CLIENT_PORTAL_SIGNED_LINKS est désactivé.');
  }
  const ttl = (Number(heuresValidite) > 0 ? Number(heuresValidite) : 168) * 3600;
  return generateSignedClientLink(emailClient, ttl);
}

/**
 * Renvoie le lien de téléchargement d'une facture à partir de son identifiant PDF.
 * @param {string} idPdf Identifiant du fichier Drive de la facture.
 * @returns {{success:boolean,url?:string,numero?:string,clientEmail?:string,dateISO?:string,montant?:number,error?:string}}
 */
function obtenirLienFactureParIdAdmin(idPdf) {
  try {
    const userEmail = Session.getActiveUser().getEmail();
    if (!userEmail || userEmail.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      throw new Error('Accès non autorisé.');
    }
    const facture = rechercherFactureParId(idPdf);
    if (!facture) {
      throw new Error('Facture introuvable.');
    }
    return {
      success: true,
      url: facture.url,
      numero: facture.numero,
      clientEmail: facture.email,
      dateISO: facture.dateISO,
      montant: facture.montant,
      periode: facture.periode || ''
    };
  } catch (e) {
    Logger.log('Erreur dans obtenirLienFactureParIdAdmin: ' + e.stack);
    return { success: false, error: e.message };
  }
}

/**
 * Récupère TOUTES les réservations (passées, actuelles, futures) sans aucun filtre par date/email.
 * @returns {Object} Un objet avec le statut et la liste complète des réservations.
 */
function obtenirToutesReservationsAdmin(authToken) {
  try {
    const userEmail = Session.getActiveUser().getEmail();
    const isAdmin = userEmail && userEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const isLivreur = isLivreurAuthorized_(authToken);
    if (!isAdmin && !isLivreur) {
      return { success: false, error: "Accès non autorisé." };
    }

    const feuille = SpreadsheetApp.openById(getSecret('ID_FEUILLE_CALCUL')).getSheetByName(SHEET_FACTURATION);
    if (!feuille) throw new Error("La feuille 'Facturation' est introuvable.");

    const enTetesRequis = ["Date", "Client (Email)", "Event ID", "Détails", "Client (Raison S. Client)", "ID Réservation", "Montant", "Type Remise Appliquée", "Valeur Remise Appliquée", "Tournée Offerte Appliquée", "Statut", "Note Interne"];
    const indices = getFacturationHeaderIndices_(feuille, enTetesRequis).indices;

    const donnees = feuille.getDataRange().getValues();

    const reservations = donnees.slice(1).map(ligne => {
      try {
        // CORRECTION PRINCIPALE : On crée un objet Date complet dès le début
        const dateHeureSheet = new Date(ligne[indices["Date"]]);
        if (isNaN(dateHeureSheet.getTime())) return null; // Ignore les lignes avec une date invalide

        let dateDebutEvenement = dateHeureSheet; // On utilise la date complète du Sheet par défaut
        let dateFinEvenement;

        const eventId = String(ligne[indices["Event ID"]]).trim();

        // Optimisation Performance (Bolt): Ne pas appeler Calendar pour les vieux événements (> 30 jours)
        // On suppose que les données du Sheet sont figées pour l'historique.
        const dateLimiteSync = new Date();
        dateLimiteSync.setDate(dateLimiteSync.getDate() - 30);

        if (eventId && dateHeureSheet > dateLimiteSync) {
          try {
            const evenementRessource = Calendar.Events.get(getSecret('ID_CALENDRIER'), eventId);
            // On met à jour avec les infos du calendrier si elles existent, car elles sont plus précises
            dateDebutEvenement = new Date(evenementRessource.start.dateTime || evenementRessource.start.date);
            dateFinEvenement = new Date(evenementRessource.end.dateTime || evenementRessource.end.date);
          } catch (err) {
            Logger.log(`Avertissement: Événement Calendar ${eventId} introuvable pour la résa ${ligne[indices["ID Réservation"]]}. Utilisation de l'heure du Sheet.`);
          }
        }

        const details = String(ligne[indices["Détails"]]);
        const matchTotal = details.match(/(\d+)\s*arrêt\(s\)\s*total\(s\)/);
        const matchSup = matchTotal ? null : details.match(/(\d+)\s*arrêt\(s\)\s*sup/);
        const arrets = matchTotal
          ? Math.max(0, parseInt(matchTotal[1], 10) - 1)
          : matchSup
            ? parseInt(matchSup[1], 10)
            : 0;
        const retour = details.includes('retour: oui');

        if (!dateFinEvenement) {
          const dureeEstimee = DUREE_BASE + ((arrets + (retour ? 1 : 0)) * DUREE_ARRET_SUP);
          dateFinEvenement = new Date(dateDebutEvenement.getTime() + dureeEstimee * 60000);
        }

        const km = KM_BASE + ((arrets + (retour ? 1 : 0)) * KM_ARRET_SUP);

        let infoRemise = '';
        const typeRemiseAppliquee = String(ligne[indices["Type Remise Appliquée"]]).trim();
        const valeurRemiseAppliquee = parseFloat(ligne[indices["Valeur Remise Appliquée"]]) || 0;
        const tourneeOfferteAppliquee = ligne[indices["Tournée Offerte Appliquée"]] === true;
        const arretsOffertsAppliques = typeRemiseAppliquee === 'Arrets Offerts' ? valeurRemiseAppliquee : 0;

        if (tourneeOfferteAppliquee) {
          infoRemise = '(Offerte)';
        } else if (typeRemiseAppliquee === 'Pourcentage' && valeurRemiseAppliquee > 0) {
          infoRemise = `(-${valeurRemiseAppliquee}%)`;
        } else if (typeRemiseAppliquee === 'Montant Fixe' && valeurRemiseAppliquee > 0) {
          infoRemise = `(-${valeurRemiseAppliquee}?)`;
        } else if (typeRemiseAppliquee === 'Arrets Offerts' && valeurRemiseAppliquee > 0) {
          infoRemise = `(${valeurRemiseAppliquee} arrêt(s) offert(s))`;
        }

        return {
          id: ligne[indices["ID Réservation"]],
          eventId: eventId,
          start: dateDebutEvenement.toISOString(),
          end: dateFinEvenement.toISOString(),
          details: details,
          clientName: ligne[indices["Client (Raison S. Client)"]],
          clientEmail: ligne[indices["Client (Email)"]],
          amount: parseFloat(ligne[indices["Montant"]]) || 0,
          km: km,
          statut: ligne[indices["Statut"]],
          infoRemise: infoRemise,
          note: ligne[indices["Note Interne"]] || '',
          typeRemise: typeRemiseAppliquee,
          valeurRemise: valeurRemiseAppliquee,
          tourneeOfferte: tourneeOfferteAppliquee,
          arretsOfferts: arretsOffertsAppliques
        };
      } catch (e) {
        Logger.log(`Erreur de traitement d'une ligne de réservation admin : ${e.toString()} sur la ligne avec ID ${ligne[indices["ID Réservation"]]}`);
        return null;
      }
    }).filter(Boolean);

    reservations.sort((a, b) => new Date(b.start) - new Date(a.start));

    return { success: true, reservations: reservations };
  } catch (e) {
    Logger.log(`Erreur critique dans obtenirToutesReservationsAdmin: ${e.stack}`);
    return { success: false, error: e.message };
  }
}

/**
 * Récupère TOUTES les réservations pour une date donnée (pour l'Admin).
 * @param {string} dateFiltreString La date à rechercher au format "YYYY-MM-DD".
 * @returns {Object} Un objet avec le statut et la liste des réservations.
 */
function obtenirToutesReservationsPourDate(dateFiltreString, authToken) {
  try {
    const userEmail = Session.getActiveUser().getEmail();
    const isAdmin = userEmail && userEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const isLivreur = isLivreurAuthorized_(authToken);
    if (!isAdmin && !isLivreur) {
      return { success: false, error: "Accès non autorisé." };
    }

    const feuille = SpreadsheetApp.openById(getSecret('ID_FEUILLE_CALCUL')).getSheetByName(SHEET_FACTURATION);
    if (!feuille) throw new Error("La feuille 'Facturation' est introuvable.");

    const enTetesRequis = ["Date", "Client (Email)", "Event ID", "Détails", "Client (Raison S. Client)", "ID Réservation", "Montant", "Type Remise Appliquée", "Valeur Remise Appliquée", "Tournée Offerte Appliquée", "Statut", "Note Interne"];
    const indices = getFacturationHeaderIndices_(feuille, enTetesRequis).indices;

    const donnees = feuille.getDataRange().getValues();

    const tracesMap = {};
    try {
      const sheetTraces = SpreadsheetApp.openById(getSecret('ID_FEUILLE_CALCUL')).getSheetByName("TRACE_Livraisons");
      if (sheetTraces) {
        const dataTraces = sheetTraces.getDataRange().getValues();
        if (dataTraces.length > 1) {
          const headersT = dataTraces[0].map(h => String(h).toLowerCase().trim().replace(/ /g, '_'));
          // Try to find the tournee_id column with various names
          let idxTid = headersT.indexOf('tournee_id');
          if (idxTid === -1) idxTid = headersT.indexOf('id_tournee');
          if (idxTid === -1) idxTid = headersT.indexOf('id');

          if (idxTid !== -1) {
            const mapRowT = (row) => {
              const obj = {};
              headersT.forEach((h, k) => obj[h] = row[k]);
              return obj;
            };
            for (let i = 1; i < dataTraces.length; i++) {
              const row = dataTraces[i];
              const tid = String(row[idxTid]).trim();
              if (!tid) continue;
              if (!tracesMap[tid]) tracesMap[tid] = [];
              tracesMap[tid].push(mapRowT(row));
            }
          }
        }
      }
    } catch (e) {
      Logger.log('Erreur chargement traces global: ' + e);
    }

    const reservations = donnees.slice(1).map(ligne => {
      const dateCell = ligne[indices["Date"]];
      if (!dateCell) return null;
      const dateHeureSheet = new Date(dateCell);
      if (isNaN(dateHeureSheet.getTime())) return null;

      const dateLigneFormattee = Utilities.formatDate(dateHeureSheet, Session.getScriptTimeZone(), "yyyy-MM-dd");

      if (dateLigneFormattee !== dateFiltreString) {
        return null;
      }

      try {
        let dateDebutEvenement = dateHeureSheet;
        let dateFinEvenement;

        const eventId = String(ligne[indices["Event ID"]]).trim();
        if (eventId) {
          try {
            const evenementRessource = Calendar.Events.get(getSecret('ID_CALENDRIER'), eventId);
            dateDebutEvenement = new Date(evenementRessource.start.dateTime || evenementRessource.start.date);
            dateFinEvenement = new Date(evenementRessource.end.dateTime || evenementRessource.end.date);
          } catch (err) {
            Logger.log("Avertissement: Événement Calendar " + eventId + " introuvable.");
          }
        }

        const details = String(ligne[indices["Détails"]]);
        const matchTotal = details.match(/(\d+)\s*arrêt\(s\)\s*total\(s\)/);
        const matchSup = matchTotal ? null : details.match(/(\d+)\s*arrêt\(s\)\s*sup/);
        const arrets = matchTotal
          ? Math.max(0, parseInt(matchTotal[1], 10) - 1)
          : matchSup
            ? parseInt(matchSup[1], 10)
            : 0;
        const retour = details.includes('retour: oui');

        const listeArrets = eventId && tracesMap[eventId] ? tracesMap[eventId] : [];

        if (!dateFinEvenement) {
          const dureeEstimee = DUREE_BASE + ((arrets + (retour ? 1 : 0)) * DUREE_ARRET_SUP);
          dateFinEvenement = new Date(dateDebutEvenement.getTime() + dureeEstimee * 60000);
        }

        const km = KM_BASE + ((arrets + (retour ? 1 : 0)) * KM_ARRET_SUP);

        let infoRemise = '';
        const typeRemiseAppliquee = String(ligne[indices["Type Remise Appliquée"]]).trim();
        const valeurRemiseAppliquee = parseFloat(ligne[indices["Valeur Remise Appliquée"]]) || 0;
        const tourneeOfferteAppliquee = ligne[indices["Tournée Offerte Appliquée"]] === true;
        const arretsOffertsAppliques = typeRemiseAppliquee === 'Arrets Offerts' ? valeurRemiseAppliquee : 0;

        if (tourneeOfferteAppliquee) {
          infoRemise = '(Offerte)';
        } else if (typeRemiseAppliquee === 'Pourcentage' && valeurRemiseAppliquee > 0) {
          infoRemise = "(-" + valeurRemiseAppliquee + "%)";
        } else if (typeRemiseAppliquee === 'Montant Fixe' && valeurRemiseAppliquee > 0) {
          infoRemise = "(-" + valeurRemiseAppliquee + "€)";
        } else if (typeRemiseAppliquee === 'Arrets Offerts' && valeurRemiseAppliquee > 0) {
          infoRemise = "(" + valeurRemiseAppliquee + " arrêt(s) offert(s))";
        }

        return {
          id: ligne[indices["ID Réservation"]],
          eventId: eventId,
          start: dateDebutEvenement.toISOString(),
          end: dateFinEvenement.toISOString(),
          details: details,
          clientName: ligne[indices["Client (Raison S. Client)"]],
          clientEmail: ligne[indices["Client (Email)"]],
          amount: parseFloat(ligne[indices["Montant"]]) || 0,
          km: km,
          statut: ligne[indices["Statut"]],
          infoRemise: infoRemise,
          note: ligne[indices["Note Interne"]] || '',
          typeRemise: typeRemiseAppliquee,
          valeurRemise: valeurRemiseAppliquee,
          tourneeOfferte: tourneeOfferteAppliquee,
          arretsOfferts: arretsOffertsAppliques,
          stops: listeArrets
        };
      } catch (e) {
        Logger.log("Erreur processing reservation: " + e);
        return null;
      }
    }).filter(Boolean);

    reservations.sort((a, b) => new Date(a.start) - new Date(b.start));
    return { success: true, reservations: reservations };
  } catch (e) {
    Logger.log("Erreur critique: " + e.stack);
    return { success: false, error: e.message };
  }
}



function livreurMettreAJourStatutReservation(idReservation, statut, authToken) {
  try {
    const userEmail = Session.getActiveUser().getEmail();
    const isAdmin = userEmail && userEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const isLivreur = isLivreurAuthorized_(authToken);
    if (!isAdmin && !isLivreur) {
      return { success: false, error: "Accès non autorisé." };
    }

    const cleanId = String(idReservation || '').trim();
    const nouveauStatut = String(statut || '').trim();
    if (!cleanId || !nouveauStatut) {
      return { success: false, error: "Paramètres manquants." };
    }

    const statutsAutorises = ["Prévue", "En cours", "Livrée", "Annulée", "Incident"];
    if (statutsAutorises.indexOf(nouveauStatut) === -1) {
      return { success: false, error: "Statut non autorisé." };
    }

    const feuille = SpreadsheetApp.openById(getSecret('ID_FEUILLE_CALCUL')).getSheetByName(SHEET_FACTURATION);
    if (!feuille) throw new Error("La feuille 'Facturation' est introuvable.");

    const indices = getFacturationHeaderIndices_(feuille, ["ID Réservation", "Statut"]).indices;
    const rowCount = Math.max(0, feuille.getLastRow() - 1);
    if (rowCount <= 0) {
      return { success: false, error: "Aucune réservation." };
    }

    const data = feuille.getRange(2, 1, rowCount, feuille.getLastColumn()).getValues();

    for (let i = 0; i < data.length; i++) {
      const id = String(data[i][indices["ID Réservation"]] || "").trim();
      if (id === cleanId) {
        feuille.getRange(i + 2, indices["Statut"] + 1).setValue(nouveauStatut);
        return { success: true, statut: nouveauStatut };
      }
    }

    return { success: false, error: "Réservation introuvable." };
  } catch (e) {
    Logger.log("Erreur dans livreurMettreAJourStatutReservation: " + e.toString());
    return { success: false, error: e.message };
  }
}

// --- Le reste de vos fonctions (obtenirTousLesClients, creerReservationAdmin, etc.) reste ici ---
// --- Il est essentiel de conserver le reste du fichier tel quel. ---

/**
 * Récupère la liste complète des clients pour le formulaire d'ajout.
 * @returns {Array<Object>} La liste des clients.
 */
function obtenirTousLesClients() {
  try {
    const feuilleClients = SpreadsheetApp.openById(getSecret('ID_FEUILLE_CALCUL')).getSheetByName(SHEET_CLIENTS);
    if (!feuilleClients) return [];

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

    const indices = obtenirIndicesEnTetes(feuilleClients, ["Email", "Raison Sociale", "Adresse", COLONNE_TELEPHONE_CLIENT, "SIRET", COLONNE_CODE_POSTAL_CLIENT, COLONNE_TYPE_REMISE_CLIENT, COLONNE_VALEUR_REMISE_CLIENT, COLONNE_NB_TOURNEES_OFFERTES, COLONNE_RESIDENT_CLIENT, COLONNE_ID_CLIENT]);
    const donnees = feuilleClients.getDataRange().getValues();
    return donnees.slice(1).map(ligne => ({
      email: ligne[indices["Email"]],
      nom: ligne[indices["Raison Sociale"]] || '',
      adresse: ligne[indices["Adresse"]] || '',
      telephone: String(ligne[indices[COLONNE_TELEPHONE_CLIENT]] || '').trim(),
      siret: ligne[indices["SIRET"]] || '',
      codePostal: ligne[indices[COLONNE_CODE_POSTAL_CLIENT]] || '',
      typeRemise: ligne[indices[COLONNE_TYPE_REMISE_CLIENT]] || '',
      valeurRemise: ligne[indices[COLONNE_VALEUR_REMISE_CLIENT]] || 0,
      nbTourneesOffertes: ligne[indices[COLONNE_NB_TOURNEES_OFFERTES]] || 0,
      resident: ligne[indices[COLONNE_RESIDENT_CLIENT]] === true,
      clientId: ligne[indices[COLONNE_ID_CLIENT]] || ''
    }));
  } catch (e) {
    Logger.log("Erreur dans obtenirTousLesClients: " + e.toString());
    return [];
  }
}

/**
 * Crée une réservation depuis le panneau d'administration.
 * @param {Object} data Les données de la réservation à créer.
 * @returns {Object} Un résumé de l'opération.
 */
function creerReservationAdmin(data) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return { success: false, error: "Le système est occupé." };

  try {
    if (Session.getActiveUser().getEmail().toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return { success: false, error: "Accès non autorisé." };
    }

    if (!data.client || !data.client.nom || !data.date || !data.startTime) {
      throw new Error("Données de réservation incomplètes.");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emailClient = String(data.client.email || '').trim();
    if (!emailClient || !emailRegex.test(emailClient)) {
      throw new Error("Une adresse email client valide est requise pour créer l'accès utilisateur.");
    }
    data.client.email = emailClient;
    data.client.contactEmail = emailClient;
    data.client.nom = String(data.client.nom || '').trim();
    data.client.resident = data.client.resident === true;

    const creationClient = enregistrerOuMajClient(data.client);

    const clientPourCalcul = obtenirInfosClientParEmail(data.client.email);
    data.client.clientId = creationClient && creationClient.clientId || clientPourCalcul?.clientId || '';

    if (creationClient && creationClient.isNew) {
      try {
        envoyerIdentifiantAccesClient(data.client.email, data.client.nom, data.client.clientId);
      } catch (notifErr) {
        Logger.log(`Avertissement: impossible d'envoyer l'identifiant client à ${data.client.email}: ${notifErr}`);
      }
    }

    if (!data.startTime) {
      return { success: false, error: 'Veuillez sélectionner ou saisir un horaire.' };
    }

    const totalStops = data.totalStops || (data.additionalStops + 1);
    const residentModeRaw = String(data.residentMode || (data.client && data.client.residentMode) || '').toLowerCase();
    const residentMode = residentModeRaw === 'urgence' ? 'urgence' : 'standard';
    const estResident = data.client && data.client.resident === true && typeof FORFAIT_RESIDENT !== 'undefined';
    const residentPrixStandard = estResident ? Number(FORFAIT_RESIDENT?.STANDARD_PRICE) : 0;
    const residentPrixUrgence = estResident ? Number(FORFAIT_RESIDENT?.URGENCE_PRICE) : 0;
    const residentLabelStandard = estResident ? (FORFAIT_RESIDENT?.STANDARD_LABEL || 'Forfait résident') : '';
    const residentLabelUrgence = estResident ? (FORFAIT_RESIDENT?.URGENCE_LABEL || 'Forfait résident - Urgence <4h') : '';

    const [heure, minute] = data.startTime.split('h').map(Number);
    if (!Number.isFinite(heure) || !Number.isFinite(minute)) {
      throw new Error("Horaire invalide.");
    }

    const recurrenceInfo = data.recurrence || {};
    const recurrenceActive = recurrenceInfo.enabled === true;
    const skipSaturday = recurrenceInfo.skipSaturday !== false;
    const timezone = Session.getScriptTimeZone ? Session.getScriptTimeZone() : 'Europe/Paris';
    const parseDateFromISO = valeur => {
      if (!valeur) return null;
      const parts = String(valeur).split('-').map(Number);
      if (parts.length !== 3 || parts.some(isNaN)) return null;
      return new Date(parts[0], parts[1] - 1, parts[2]);
    };

    const dateDepart = parseDateFromISO(data.date);
    if (!dateDepart) {
      throw new Error("Date de départ invalide.");
    }

    const occurrenceDates = [];
    if (recurrenceActive) {
      const finStr = String(recurrenceInfo.endDate || '').trim();
      const dateFinRecurrence = parseDateFromISO(finStr);
      if (!dateFinRecurrence) {
        throw new Error("Date de fin de récurrence invalide.");
      }
      if (dateFinRecurrence.getTime() < dateDepart.getTime()) {
        throw new Error("La date de fin de récurrence doit être postérieure ou égale à la date de départ.");
      }
      const iter = new Date(dateDepart.getTime());
      while (iter.getTime() <= dateFinRecurrence.getTime()) {
        const day = iter.getDay();
        if (!(skipSaturday && day === 6)) {
          occurrenceDates.push({
            dateObj: new Date(iter.getTime()),
            dateStr: Utilities.formatDate(iter, timezone, 'yyyy-MM-dd')
          });
        }
        iter.setDate(iter.getDate() + 1);
      }
      if (!occurrenceDates.length) {
        throw new Error("Aucune occurrence à créer (toutes les dates tombent un samedi).");
      }
    } else {
      occurrenceDates.push({
        dateObj: new Date(dateDepart.getTime()),
        dateStr: Utilities.formatDate(dateDepart, timezone, 'yyyy-MM-dd')
      });
    }

    const residentBypass = data.client.resident === true && typeof RESIDENT_REPLAN_ALLOW_ANY_SLOT !== 'undefined' && RESIDENT_REPLAN_ALLOW_ANY_SLOT === true;
    const calendarId = getSecret('ID_CALENDRIER');
    const calendar = CalendarApp.getCalendarById(calendarId);
    if (!calendar) {
      throw new Error("Calendrier introuvable.");
    }

    const clientPricingState = clientPourCalcul ? {
      nbTourneesOffertes: Math.max(0, Number(clientPourCalcul.nbTourneesOffertes) || 0),
      typeRemise: clientPourCalcul.typeRemise,
      valeurRemise: Number(clientPourCalcul.valeurRemise) || 0
    } : null;

    const notifications = [];
    const reservationsCreees = [];

    occurrenceDates.forEach(occ => {
      const samedi = occ.dateObj.getDay() === 6;
      let urgent = data.forceUrgent === true;
      if (estResident && residentMode === 'urgence') {
        urgent = true;
      }

      const tarif = computeCoursePrice({
        totalStops: totalStops,
        retour: data.returnToPharmacy,
        urgent: urgent,
        samedi: samedi
      });
      if (!tarif || tarif.error) {
        throw new Error(tarif && tarif.error ? tarif.error : "Tarification indisponible.");
      }
      const nbSegments = tarif.nbSupp + (data.returnToPharmacy ? 1 : 0); // treat return as its own segment for time/km
      const duree = DUREE_BASE + (nbSegments * DUREE_ARRET_SUP);

      let prix = tarif.total;
      let libelleResident = '';
      if (estResident) {
        prix = residentMode === 'urgence' ? residentPrixUrgence : residentPrixStandard;
        libelleResident = residentMode === 'urgence' ? residentLabelUrgence : residentLabelStandard;
      }

      let tourneeOfferte = false;
      if (clientPricingState) {
        if (clientPricingState.nbTourneesOffertes > 0) {
          prix = 0;
          tourneeOfferte = true;
          clientPricingState.nbTourneesOffertes = Math.max(0, clientPricingState.nbTourneesOffertes - 1);
        } else if (clientPricingState.typeRemise === 'Pourcentage' && clientPricingState.valeurRemise > 0) {
          prix *= (1 - clientPricingState.valeurRemise / 100);
        } else if (clientPricingState.typeRemise === 'Montant Fixe' && clientPricingState.valeurRemise > 0) {
          prix = Math.max(0, prix - clientPricingState.valeurRemise);
        }
      }
      prix = Math.round(prix * 100) / 100;

      const creneauxDisponibles = obtenirCreneauxDisponiblesPourDate(occ.dateStr, duree);
      if (!Array.isArray(creneauxDisponibles) || creneauxDisponibles.length === 0) {
        if (!residentBypass) {
          throw new Error(`Aucun créneau disponible pour le ${formaterDatePersonnalise(occ.dateObj, 'EEEE d MMMM yyyy')}.`);
        }
      } else if (!creneauxDisponibles.includes(data.startTime)) {
        if (!residentBypass) {
          throw new Error(`Le créneau ${data.startTime} n'est plus disponible pour le ${formaterDatePersonnalise(occ.dateObj, 'EEEE d MMMM yyyy')}.`);
        }
      }

      const idReservation = 'RESA-' + Utilities.getUuid();
      const dateDebut = new Date(occ.dateObj.getFullYear(), occ.dateObj.getMonth(), occ.dateObj.getDate(), heure, minute);
      const dateFin = new Date(dateDebut.getTime() + duree * 60000);
      const typeCourse = samedi ? 'Samedi' : (urgent ? 'Urgent' : 'Normal');

      const titreEvenement = `Réservation ${NOM_ENTREPRISE} - ${data.client.nom}`;
      let descriptionEvenement = `Client: ${data.client.nom} (${data.client.email})\nType: ${typeCourse}\nID Réservation: ${idReservation}\nArrêts totaux: ${totalStops}, Retour: ${data.returnToPharmacy ? 'Oui' : 'Non'}\nTotal: ${prix.toFixed(2)} €\nNote: Ajouté par admin.`;
      if (data.client.resident === true) {
        descriptionEvenement += '\nResident: Oui';
        if (libelleResident) {
          descriptionEvenement += `\nForfait résident: ${libelleResident}`;
        }
      }

      const evenement = calendar.createEvent(titreEvenement, dateDebut, dateFin, { description: descriptionEvenement });
      if (!evenement) {
        throw new Error("La création de l'événement dans le calendrier a échoué.");
      }

      let detailsFacturation = formatCourseLabel_(duree, totalStops, data.returnToPharmacy);
      if (estResident) {
        const labelResident = libelleResident || 'Forfait résident';
        const resumeRetour = data.returnToPharmacy ? 'retour: oui' : 'retour: non';
        detailsFacturation = `${labelResident} (forfait résident, ${totalStops} arrêt(s), ${resumeRetour})`;
      }
      const noteInterne = estResident && libelleResident
        ? `Ajouté par admin | Forfait résident: ${libelleResident}`
        : 'Ajouté par admin';

      enregistrerReservationPourFacturation(
        dateDebut,
        data.client.nom,
        data.client.email,
        typeCourse,
        detailsFacturation,
        prix,
        evenement.getId(),
        idReservation,
        noteInterne,
        tourneeOfferte,
        clientPourCalcul ? clientPourCalcul.typeRemise : '',
        clientPourCalcul ? clientPourCalcul.valeurRemise : 0,
        data.client.resident === true
      );
      logActivity(idReservation, data.client.email, `Réservation manuelle par admin`, prix, "Succès");

      if (tourneeOfferte) {
        decrementerTourneesOffertesClient(data.client.email);
      }

      notifications.push({
        date: formaterDatePersonnalise(dateDebut, 'EEEE d MMMM yyyy'),
        time: data.startTime,
        price: prix
      });

      let infoRemise = '';
      if (tourneeOfferte) {
        infoRemise = '(Offerte)';
      } else if (clientPourCalcul && clientPourCalcul.typeRemise === 'Pourcentage' && clientPourCalcul.valeurRemise > 0) {
        infoRemise = '(-' + clientPourCalcul.valeurRemise + '%)';
      } else if (clientPourCalcul && clientPourCalcul.typeRemise === 'Montant Fixe' && clientPourCalcul.valeurRemise > 0) {
        infoRemise = '(-' + clientPourCalcul.valeurRemise + '€)';
      }

      reservationsCreees.push({
        id: idReservation,
        eventId: evenement.getId(),
        start: dateDebut.toISOString(),
        end: dateFin.toISOString(),
        details: detailsFacturation,
        clientName: data.client.nom,
        clientEmail: data.client.email,
        amount: prix,
        km: KM_BASE + (nbSegments * KM_ARRET_SUP),
        statut: '',
        infoRemise: infoRemise,
        typeRemise: clientPourCalcul ? clientPourCalcul.typeRemise : '',
        valeurRemise: clientPourCalcul ? clientPourCalcul.valeurRemise : 0,
        tourneeOfferte: tourneeOfferte,
        arretsOfferts: 0
      });
    });

    if (data.notifyClient && RESERVATION_CONFIRMATION_EMAILS_ENABLED && notifications.length > 0) {
      try {
        notifierClientConfirmation(data.client.email, data.client.nom, notifications);
      } catch (notifErr) {
        Logger.log(`Avertissement: impossible d'envoyer la confirmation de réservation: ${notifErr}`);
      }
    }

    return {
      success: true,
      reservation: reservationsCreees[0],
      reservations: reservationsCreees,
      totalCreated: reservationsCreees.length
    };

  } catch (e) {
    Logger.log(`Erreur dans creerReservationAdmin: ${e.stack}`);
    return { success: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Supprime une réservation.
 * @param {string} idReservation L'ID de la réservation à supprimer.
 * @returns {Object} Un résumé de l'opération.
 */
function supprimerReservation(idReservation) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return { success: false, error: "Le système est occupé." };

  try {
    if (Session.getActiveUser().getEmail().toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return { success: false, error: "Accès non autorisé." };
    }

    const feuilleFacturation = SpreadsheetApp.openById(getSecret('ID_FEUILLE_CALCUL')).getSheetByName(SHEET_FACTURATION);
    if (!feuilleFacturation) throw new Error("La feuille 'Facturation' est introuvable.");

    const indices = getFacturationHeaderIndices_(feuilleFacturation, ["ID Réservation", "Event ID", "Client (Email)", "Montant"]).indices;

    const donneesFacturation = feuilleFacturation.getDataRange().getValues();
    const indexLigneASupprimer = donneesFacturation.findIndex(row => String(row[indices["ID Réservation"]]).trim() === String(idReservation).trim());

    if (indexLigneASupprimer === -1) {
      return { success: false, error: "Réservation introuvable." };
    }

    const ligneASupprimer = donneesFacturation[indexLigneASupprimer];
    const eventId = String(ligneASupprimer[indices["Event ID"]]).trim();
    const emailClient = ligneASupprimer[indices["Client (Email)"]];
    const montant = ligneASupprimer[indices["Montant"]];

    try {
      CalendarApp.getCalendarById(getSecret('ID_CALENDRIER')).getEventById(eventId).deleteEvent();
    } catch (e) {
      Logger.log(`Impossible de supprimer l'événement Calendar ${eventId}: ${e.message}. Il a peut-être déjà été supprimé.`);
    }

    feuilleFacturation.deleteRow(indexLigneASupprimer + 1);
    logActivity(idReservation, emailClient, `Suppression de course`, montant, "Supprimée");

    return { success: true, message: "Course supprimée avec succès." };

  } catch (e) {
    Logger.log(`Erreur dans supprimerReservation: ${e.stack}`);
    return { success: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Applique ou supprime une remise sur une tournée existante.
 * @param {string} idReservation ID de la réservation à modifier.
 * @param {string} typeRemise Type de remise sélectionné (Aucune|Pourcentage|Montant Fixe|Tournées Offertes).
 * @param {number} valeurRemise Valeur numérique de la remise.
 * @param {number} nbTourneesOffertesClient Nombre de tournées offertes restantes côté client (indicatif).
 * @returns {{success:boolean, montant?:number, error?:string}}
 */
function appliquerRemiseSurTournee(idReservation, typeRemise, valeurRemise, nbTourneesOffertesClient) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return { success: false, error: "Le système est occupé." };

  try {
    if (Session.getActiveUser().getEmail().toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return { success: false, error: "Accès non autorisé." };
    }

    const feuille = SpreadsheetApp.openById(getSecret('ID_FEUILLE_CALCUL')).getSheetByName(SHEET_FACTURATION);
    if (!feuille) throw new Error("La feuille 'Facturation' est introuvable.");

    const indices = getFacturationHeaderIndices_(feuille, ["ID Réservation", "Type", "Détails", "Montant", "Client (Email)"]).indices;

    const donnees = feuille.getDataRange().getValues();
    const indexLigne = donnees.findIndex(row => String(row[indices["ID Réservation"]]).trim() === String(idReservation).trim());
    if (indexLigne === -1) return { success: false, error: "Réservation introuvable." };

    const ligne = donnees[indexLigne];
    const emailClient = String(ligne[indices["Client (Email)"]] || '').trim();
    const detailsCourse = String(ligne[indices["Détails"]] || '');
    const typeCourse = indices["Type"] !== undefined && indices["Type"] !== -1 ? String(ligne[indices["Type"]] || '').trim().toLowerCase() : 'normal';
    const eventId = indices["Event ID"] !== undefined && indices["Event ID"] !== -1 ? String(ligne[indices["Event ID"]] || '').trim() : '';
    const etaitTourneeOfferte = indices["Tournée Offerte Appliquée"] !== undefined && indices["Tournée Offerte Appliquée"] !== -1 ? ligne[indices["Tournée Offerte Appliquée"]] === true : false;
    const estResident = indices["Resident"] !== undefined && indices["Resident"] !== -1 ? ligne[indices["Resident"]] === true : false;

    const matchStops = detailsCourse.match(/(\d+)\s*arr/i);
    if (!matchStops) return { success: false, error: "Impossible de déterminer le nombre d'arrêts à partir des détails." };
    const totalStops = Math.max(1, parseInt(matchStops[1], 10));
    const retourPharmacie = /retour\s*:\s*oui/i.test(detailsCourse);
    const urgent = typeCourse === 'urgent';
    const samedi = typeCourse === 'samedi';

    let prixBase;
    if (estResident && typeof FORFAIT_RESIDENT !== 'undefined') {
      prixBase = urgent ? FORFAIT_RESIDENT.URGENCE_PRICE : FORFAIT_RESIDENT.STANDARD_PRICE;
    } else {
      const calcul = computeCoursePrice({ totalStops: totalStops, retour: retourPharmacie, urgent: urgent, samedi: samedi });
      if (calcul.error) {
        throw new Error(`Tarification indisponible (${calcul.error}).`);
      }
      prixBase = calcul.total;
    }

    if (!isFinite(prixBase)) {
      throw new Error("Prix de base indéterminé.");
    }

    const normaliserType = function (val) {
      const str = String(val || '').trim();
      const decompose = typeof str.normalize === 'function' ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : str;
      return decompose.toLowerCase();
    };

    const typeNormalise = normaliserType(typeRemise);
    let nouveauMontant = prixBase;
    let typeRemiseStockee = '';
    let valeurRemiseStockee = 0;
    let nouvelleTourneeOfferte = false;

    if (typeNormalise === 'tournees offertes') {
      if (!etaitTourneeOfferte) {
        const infosClient = emailClient ? obtenirInfosClientParEmail(emailClient) : null;
        const creditsDisponibles = Math.max(
          Number(nbTourneesOffertesClient) || 0,
          infosClient ? (Number(infosClient.nbTourneesOffertes) || 0) : 0
        );
        if (creditsDisponibles <= 0) {
          return { success: false, error: "Aucune tournée offerte disponible pour ce client." };
        }
      }
      nouveauMontant = 0;
      nouvelleTourneeOfferte = true;
      typeRemiseStockee = '';
      valeurRemiseStockee = 0;
    } else if (typeNormalise === 'pourcentage') {
      const pct = Number(valeurRemise);
      if (!isFinite(pct) || pct <= 0 || pct > 100) {
        return { success: false, error: "Veuillez entrer un pourcentage valide (0-100)." };
      }
      nouveauMontant = Math.max(0, prixBase * (1 - pct / 100));
      nouvelleTourneeOfferte = false;
      typeRemiseStockee = 'Pourcentage';
      valeurRemiseStockee = Math.round(pct * 100) / 100;
    } else if (typeNormalise === 'montant fixe') {
      const montantRemise = Number(valeurRemise);
      if (!isFinite(montantRemise) || montantRemise <= 0) {
        return { success: false, error: "Veuillez entrer un montant de remise valide." };
      }
      nouveauMontant = Math.max(0, prixBase - montantRemise);
      nouvelleTourneeOfferte = false;
      typeRemiseStockee = 'Montant Fixe';
      valeurRemiseStockee = Math.round(montantRemise * 100) / 100;
    } else if (typeNormalise === 'arrets offerts') {
      const arretsOfferts = Math.max(0, Math.floor(Number(valeurRemise)));
      const totalStopsFactures = Math.max(1, totalStops - arretsOfferts);
      const calcul = computeCoursePrice({ totalStops: totalStopsFactures, retour: retourPharmacie, urgent: urgent, samedi: samedi });
      if (!calcul || calcul.error) {
        throw new Error(calcul && calcul.error ? calcul.error : 'Tarification indisponible pour la remise arr�ts offerts.');
      }
      nouveauMontant = Math.min(prixBase, calcul.total);
      nouvelleTourneeOfferte = false;
      typeRemiseStockee = 'Arrets Offerts';
      valeurRemiseStockee = arretsOfferts;
    } else {
      nouveauMontant = prixBase;
      typeRemiseStockee = '';
      valeurRemiseStockee = 0;
      nouvelleTourneeOfferte = false;
    }

    nouveauMontant = Math.round(nouveauMontant * 100) / 100;

    feuille.getRange(indexLigne + 1, indices["Montant"] + 1).setValue(nouveauMontant);
    if (indices["Type Remise Appliquée"] !== undefined && indices["Type Remise Appliquée"] !== -1) {
      feuille.getRange(indexLigne + 1, indices["Type Remise Appliquée"] + 1).setValue(typeRemiseStockee);
    }
    if (indices["Valeur Remise Appliquée"] !== undefined && indices["Valeur Remise Appliquée"] !== -1) {
      feuille.getRange(indexLigne + 1, indices["Valeur Remise Appliquée"] + 1).setValue(valeurRemiseStockee);
    }
    if (indices["Tournée Offerte Appliquée"] !== undefined && indices["Tournée Offerte Appliquée"] !== -1) {
      feuille.getRange(indexLigne + 1, indices["Tournée Offerte Appliquée"] + 1).setValue(nouvelleTourneeOfferte);
    }

    if (nouvelleTourneeOfferte && !etaitTourneeOfferte && emailClient) {
      decrementerTourneesOffertesClient(emailClient);
    }

    if (eventId) {
      try {
        const calendarId = getSecret('ID_CALENDRIER');
        const ressourceEvenement = Calendar.Events.get(calendarId, eventId);
        if (ressourceEvenement) {
          const description = ressourceEvenement.description || '';
          const nouvelleDescription = description
            ? description.replace(/Total:\s*[^\n]+/i, `Total: ${nouveauMontant.toFixed(2)} EUR`)
            : `Total: ${nouveauMontant.toFixed(2)} EUR`;
          Calendar.Events.patch({ description: nouvelleDescription }, calendarId, eventId);
        }
      } catch (err) {
        Logger.log(`Impossible de mettre à jour l'événement ${eventId} pour la remise: ${err.message}`);
      }
    }

    const resume = nouvelleTourneeOfferte
      ? "Tournée convertie en tournée offerte"
      : (typeRemiseStockee
        ? `Remise ${typeRemiseStockee} appliquée (${valeurRemiseStockee})`
        : "Remise supprimée");
    logActivity(idReservation, emailClient, resume, nouveauMontant, "Succès");

    return { success: true, montant: nouveauMontant };
  } catch (e) {
    Logger.log(`Erreur dans appliquerRemiseSurTournee: ${e.stack}`);
    return { success: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Fonction principale pour générer les factures SANS les envoyer.
 */
function genererFactures() {
  const ui = SpreadsheetApp.getUi();
  try {
    validerConfiguration();
    logAdminAction("Génération Factures", "Démarrée");

    const ss = SpreadsheetApp.openById(getSecret('ID_FEUILLE_CALCUL'));
    const feuilleFacturation = ss.getSheetByName(SHEET_FACTURATION);
    const feuilleClients = ss.getSheetByName(SHEET_CLIENTS);
    const feuilleParams = ss.getSheetByName(SHEET_PARAMETRES);

    if (!feuilleFacturation || !feuilleClients || !feuilleParams) {
      throw new Error("Une des feuilles requises ('Facturation', 'Clients', 'Paramètres') est introuvable.");
    }

    const requiredFacturation = ['Date', 'Client (Email)', 'Valider', 'N° Facture', 'Montant', 'ID PDF', 'Détails', 'Note Interne', 'Lien Note'];
    const facturationHeaders = getFacturationHeaderIndices_(feuilleFacturation, requiredFacturation);
    const indicesFacturation = facturationHeaders.indices;
    const indicesRemise = {
      type: facturationHeaders.indices['Type Remise Appliquée'] !== undefined ? facturationHeaders.indices['Type Remise Appliquée'] : -1,
      valeur: facturationHeaders.indices['Valeur Remise Appliquée'] !== undefined ? facturationHeaders.indices['Valeur Remise Appliquée'] : -1,
      tourneeOfferte: facturationHeaders.indices['Tournée Offerte Appliquée'] !== undefined ? facturationHeaders.indices['Tournée Offerte Appliquée'] : -1
    };
    const indicesClients = obtenirIndicesEnTetes(feuilleClients, ["Email", "Raison Sociale", "Adresse"]);

    const clientsData = feuilleClients.getDataRange().getValues();
    const mapClients = new Map(clientsData.slice(1).map(row => [
      String(row[indicesClients["Email"]]).trim(),
      { nom: String(row[indicesClients["Raison Sociale"]]).trim() || 'N/A', adresse: String(row[indicesClients["Adresse"]]).trim() || 'N/A' }
    ]));

    const facturationData = feuilleFacturation.getDataRange().getValues();
    const facturesAGenerer = facturationData
      .map((row, index) => ({ data: row, indexLigne: index + 1 }))
      .slice(1)
      .filter(item => item.data[indicesFacturation['Valider']] === true && !item.data[indicesFacturation['N° Facture']]);

    if (facturesAGenerer.length === 0) {
      ui.alert("Aucune nouvelle ligne à facturer n'a été sélectionnée.");
      return;
    }

    const facturesParClient = facturesAGenerer.reduce((acc, item) => {
      const email = String(item.data[indicesFacturation['Client (Email)']]).trim();
      if (email) {
        if (!acc[email]) acc[email] = [];
        acc[email].push(item);
      }
      return acc;
    }, {});

    let prochainNumFacture = parseInt(feuilleParams.getRange("B1").getValue(), 10);
    const messagesErreurs = [];
    let compteurSucces = 0;

    for (const emailClient in facturesParClient) {
      try {
        const clientInfos = mapClients.get(emailClient);
        if (!clientInfos) throw new Error(`Client ${emailClient} non trouvé.`);

        const lignesFactureClient = facturesParClient[emailClient];
        const numFacture = `FACT-${new Date().getFullYear()}-${String(prochainNumFacture).padStart(4, '0')}`;
        const dateFacture = new Date();

        let totalMontant = 0;
        let totalRemises = 0;
        let totalAvantRemises = 0;
        let totalRemisesOffertes = 0;
        let nbRemisesOffertes = 0;
        const symboleEuro = String.fromCharCode(8364);
        const lignesBordereau = [];
        let dateMin = new Date(lignesFactureClient[0].data[indicesFacturation['Date']]);
        let dateMax = new Date(lignesFactureClient[0].data[indicesFacturation['Date']]);

        lignesFactureClient.forEach(item => {
          const ligneData = item.data;
          const montantLigne = parseFloat(ligneData[indicesFacturation['Montant']]) || 0;
          totalMontant += montantLigne;
          const dateCourse = new Date(ligneData[indicesFacturation['Date']]);
          if (dateCourse < dateMin) dateMin = dateCourse;
          if (dateCourse > dateMax) dateMax = dateCourse;

          const typeRemise = indicesRemise.type !== -1 ? String(ligneData[indicesRemise.type] || '').trim() : '';
          const valeurRemise = indicesRemise.valeur !== -1 ? parseFloat(ligneData[indicesRemise.valeur]) || 0 : 0;
          const tourneeOfferte = indicesRemise.tourneeOfferte !== -1 && ligneData[indicesRemise.tourneeOfferte] === true;

          let libelleRemise = '';
          let montantRemiseValeur = 0;
          let montantAvantRemise = montantLigne;

          if (tourneeOfferte) {
            libelleRemise = 'Offerte';
            montantRemiseValeur = montantAvantRemise; // tout le montant est offert
            nbRemisesOffertes += 1;
            totalRemisesOffertes += montantAvantRemise;
          } else if (typeRemise === 'Pourcentage' && valeurRemise > 0) {
            libelleRemise = `-${valeurRemise}%`;
            if (valeurRemise < 100) {
              montantAvantRemise = montantLigne / (1 - (valeurRemise / 100));
              montantRemiseValeur = Math.max(0, montantAvantRemise - montantLigne);
            }
          } else if (typeRemise === 'Montant Fixe' && valeurRemise > 0) {
            libelleRemise = `-${formatMontantEuro(valeurRemise)} ${symboleEuro}`;
            montantRemiseValeur = valeurRemise;
            montantAvantRemise = montantLigne + valeurRemise;
          }

          if (montantRemiseValeur > 0) {
            montantRemiseValeur = Math.round(montantRemiseValeur * 100) / 100;
          }
          if (montantAvantRemise > 0) {
            montantAvantRemise = Math.round(montantAvantRemise * 100) / 100;
          }

          totalRemises += montantRemiseValeur;
          totalAvantRemises += montantAvantRemise;

          const montantFormate = formatMontantEuro(montantLigne);
          const remiseMontantFormatee = montantRemiseValeur > 0 ? `${formatMontantEuro(montantRemiseValeur)} ${symboleEuro}` : '';

          lignesBordereau.push({
            date: formaterDatePersonnalise(dateCourse, 'dd/MM/yy'),
            heure: formaterDatePersonnalise(dateCourse, "HH'h'mm"),
            details: ligneData[indicesFacturation['Détails']] || '',
            note: ligneData[indicesFacturation['Note Interne']] || '',
            lienNote: ligneData[indicesFacturation['Lien Note']] || null,
            montantTexte: montantFormate,
            remiseTexte: libelleRemise,
            remiseMontantTexte: remiseMontantFormatee,
            estOfferte: tourneeOfferte && montantLigne === 0
          });
        });

        const tva = TVA_APPLICABLE ? totalMontant * TAUX_TVA : 0;
        const totalTTC = totalMontant + tva;
        if (totalAvantRemises === 0) {
          totalAvantRemises = totalMontant;
        }
        const dateEcheance = new Date(dateFacture.getTime() + (DELAI_PAIEMENT_JOURS * 24 * 60 * 60 * 1000));

        const dossierArchives = DriveApp.getFolderById(getSecret('ID_DOSSIER_ARCHIVES'));
        const dossierAnnee = obtenirOuCreerDossier(dossierArchives, dateFacture.getFullYear().toString());
        const dossierMois = obtenirOuCreerDossier(dossierAnnee, formaterDatePersonnalise(dateFacture, "MMMM yyyy"));

        const modeleFacture = DriveApp.getFileById(getSecret('ID_MODELE_FACTURE'));
        const copieFactureDoc = modeleFacture.makeCopy(`${numFacture} - ${clientInfos.nom}`, dossierMois);
        const doc = DocumentApp.openById(copieFactureDoc.getId());
        const corps = doc.getBody();

        const logoFallbackBlob = getLogoSvgBlob();
        if (!insererImageDepuisPlaceholder(corps, '{{logo}}', FACTURE_LOGO_FILE_ID, 160, logoFallbackBlob)) {
          corps.replaceText('{{logo}}', '');
        }

        corps.replaceText('{{nom_entreprise}}', NOM_ENTREPRISE);
        corps.replaceText('{{adresse_entreprise}}', ADRESSE_ENTREPRISE);
        corps.replaceText('{{siret}}', getSecret('SIRET'));
        corps.replaceText('{{email_entreprise}}', EMAIL_ENTREPRISE);
        corps.replaceText('{{client_nom}}', clientInfos.nom);
        corps.replaceText('{{client_adresse}}', clientInfos.adresse);
        corps.replaceText('{{numero_facture}}', numFacture);
        corps.replaceText('{{date_facture}}', formaterDatePersonnalise(dateFacture, 'dd/MM/yyyy'));
        corps.replaceText('{{periode_facturee}}', formatMoisFrancais(dateMin));
        corps.replaceText('{{date_debut_periode}}', formaterDatePersonnalise(dateMin, 'dd/MM/yyyy'));
        corps.replaceText('{{date_fin_periode}}', formaterDatePersonnalise(dateMax, 'dd/MM/yyyy'));
        corps.replaceText('{{total_du}}', formatMontantEuro(totalTTC));
        corps.replaceText('{{total_ht}}', formatMontantEuro(totalMontant));
        corps.replaceText('{{montant_tva}}', formatMontantEuro(tva));
        corps.replaceText('{{total_ttc}}', formatMontantEuro(totalTTC));
        const totalRemisesTexte = totalRemises > 0 ? `- ${formatMontantEuro(totalRemises)} ${symboleEuro}` : `0,00 ${symboleEuro}`;
        const totalAvantRemisesTexte = formatMontantEuro(totalAvantRemises);
        corps.replaceText('{{total_remises}}', totalRemisesTexte);
        corps.replaceText('{{total_avant_remises}}', totalAvantRemisesTexte);
        const totalRemisesOffertesTexte = totalRemisesOffertes > 0
          ? `${formatMontantEuro(totalRemisesOffertes)} ${symboleEuro} (${nbRemisesOffertes} offerte${nbRemisesOffertes > 1 ? 's' : ''})`
          : `0,00 ${symboleEuro} (${nbRemisesOffertes} offerte${nbRemisesOffertes > 1 ? 's' : ''})`;
        corps.replaceText('{{total_remises_offertes}}', totalRemisesOffertesTexte);
        corps.replaceText('{{nombre_courses}}', String(lignesBordereau.length));

        const lienTarifs = (() => {
          try {
            return getSecret('URL_TARIFS_PUBLIC');
          } catch (_err) {
            try {
              const docTarifs = getSecret('ID_DOCUMENT_TARIFS');
              return docTarifs ? `https://drive.google.com/file/d/${docTarifs}/view` : `Contactez ${EMAIL_ENTREPRISE}`;
            } catch (_err2) {
              return `Contactez ${EMAIL_ENTREPRISE}`;
            }
          }
        })();

        const lienCgv = (() => {
          try {
            const cgvId = getSecret('ID_DOCUMENT_CGV');
            return `https://drive.google.com/file/d/${cgvId}/view`;
          } catch (_err) {
            return `Contactez ${EMAIL_ENTREPRISE}`;
          }
        })();

        corps.replaceText('{{lien_tarifs}}', lienTarifs);
        corps.replaceText('{{lien_cgv}}', lienCgv);
        corps.replaceText('{{date_echeance}}', formaterDatePersonnalise(dateEcheance, 'dd/MM/yyyy'));
        corps.replaceText('{{rib_entreprise}}', getSecret('RIB_ENTREPRISE'));
        corps.replaceText('{{bic_entreprise}}', getSecret('BIC_ENTREPRISE'));
        corps.replaceText('{{delai_paiement}}', String(DELAI_PAIEMENT_JOURS));

        const detectionBordereau = trouverTableBordereau(corps);
        if (detectionBordereau) {
          const tableBordereau = detectionBordereau.table;
          const colonnesBordereau = detectionBordereau.columns;
          while (tableBordereau.getNumRows() > 1) {
            tableBordereau.removeRow(1);
          }

          const headerCellCount = tableBordereau.getRow(0).getNumCells();

          lignesBordereau.forEach(ligne => {
            const nouvelleLigne = tableBordereau.appendTableRow();
            while (nouvelleLigne.getNumCells() < headerCellCount) {
              nouvelleLigne.appendTableCell('');
            }

            const setCell = (key, valeur) => {
              if (colonnesBordereau[key] === undefined) return;
              nouvelleLigne.getCell(colonnesBordereau[key]).setText(valeur || '');
            };

            setCell('date', ligne.date);
            setCell('heure', ligne.heure);
            setCell('details', ligne.details);

            if (colonnesBordereau.notes !== undefined) {
              const celluleNote = nouvelleLigne.getCell(colonnesBordereau.notes);
              if (ligne.lienNote && ligne.lienNote.startsWith('http')) {
                const text = celluleNote.editAsText();
                text.setText('Voir la note');
                text.setLinkUrl(0, text.getText().length - 1, ligne.lienNote);
              } else {
                celluleNote.setText(ligne.note || '');
              }
            }

            if (colonnesBordereau.remise !== undefined) {
              const valeur = ligne.remiseTexte || '';
              nouvelleLigne.getCell(colonnesBordereau.remise).setText(valeur);
            }

            if (colonnesBordereau.montant !== undefined) {
              let valeurMontant = ligne.montantTexte ? `${ligne.montantTexte} ${symboleEuro}` : '';
              if (ligne.remiseMontantTexte) {
                const etiquette = ligne.remiseTexte ? `Remise ${ligne.remiseTexte}` : 'Remise';
                valeurMontant = `${valeurMontant} (${etiquette} : ${ligne.remiseMontantTexte})`;
              } else if (ligne.estOfferte) {
                valeurMontant = valeurMontant ? `${valeurMontant} (Offert)` : 'Offert';
              }
              nouvelleLigne.getCell(colonnesBordereau.montant).setText(valeurMontant.trim());
            }
          });
        } else {
          throw new Error("Aucun tableau de bordereau valide trouvé. Vérifiez les en-têtes.");
        }

        doc.saveAndClose();

        const blobPDF = copieFactureDoc.getAs(MimeType.PDF);
        const fichierPDF = dossierMois.createFile(blobPDF).setName(`${numFacture} - ${clientInfos.nom}.pdf`);

        lignesFactureClient.forEach(item => {
          feuilleFacturation.getRange(item.indexLigne, indicesFacturation['N° Facture'] + 1).setValue(numFacture);
          feuilleFacturation.getRange(item.indexLigne, indicesFacturation['Valider'] + 1).setValue(false);
          feuilleFacturation.getRange(item.indexLigne, indicesFacturation['ID PDF'] + 1).setValue(fichierPDF.getId());
        });

        DriveApp.getFileById(copieFactureDoc.getId()).setTrashed(true);
        prochainNumFacture++;
        compteurSucces++;

      } catch (err) {
        messagesErreurs.push(`Erreur pour ${emailClient}: ${err.message}`);
        Logger.log(`Erreur de facturation pour ${emailClient}: ${err.stack}`);
      }
    }

    feuilleParams.getRange("B1").setValue(prochainNumFacture);
    logAdminAction("Génération Factures", `Succès pour ${compteurSucces} client(s). Erreurs: ${messagesErreurs.length}`);

    const messageFinal = `${compteurSucces} facture(s) ont été générée(s) avec succès.\n\n` +
      `Prochaine étape :\n` +
      `1. Contrôlez les PDF dans le dossier Drive.\n` +
      `2. Cochez les cases dans la colonne "Email à envoyer".\n` +
      `3. Utilisez le menu "EL Services > Envoyer les factures contrôlées".\n\n` +
      `Erreurs: ${messagesErreurs.join('\n') || 'Aucune'}`;
    ui.alert("Génération terminée", messageFinal, ui.ButtonSet.OK);

  } catch (e) {
    Logger.log(`ERREUR FATALE dans genererFactures: ${e.stack}`);
    logAdminAction("Génération Factures", `Échec critique: ${e.message}`);
    ui.showModalDialog(HtmlService.createHtmlOutput(`<p>Une erreur critique est survenue:</p><pre>${e.message}</pre>`), "Erreur Critique");
  }
}

/**
 * Envoie par e-mail les factures marquées comme prêtes à être envoyées.
 * Utilise la feuille "Facturation" et les colonnes suivantes si présentes:
 *  - "Email à envoyer" (booléen), "Client (Email)", "N° Facture", "ID PDF", "Montant", "Statut", "Note Interne".
 * Si "Email à envoyer" n'existe pas, envoie pour les lignes ayant un N° Facture et un ID PDF non vides.
 */
function envoyerFacturesControlees() {
  const ui = SpreadsheetApp.getUi();
  try {
    const ss = SpreadsheetApp.openById(getSecret('ID_FEUILLE_CALCUL'));
    const feuille = ss.getSheetByName(SHEET_FACTURATION);
    if (!feuille) throw new Error("La feuille 'Facturation' est introuvable.");

    const headerInfo = getFacturationHeaderIndices_(feuille, ['Client (Email)', 'N° Facture', 'ID PDF']);
    const idx = headerInfo.indices;
    const idxAEnvoyer = idx['Email à envoyer'];
    const idxMontant = idx['Montant'];
    const idxStatut = idx['Statut'];
    const idxNote = idx['Note Interne'];



    const logoBlock = getLogoEmailBlockHtml();
    const data = feuille.getDataRange().getValues();
    let envoyees = 0;
    let erreurs = [];

    for (let r = 1; r < data.length; r++) {
      const row = data[r];
      const email = String(row[idx["Client (Email)"]] || '').trim();
      const numero = String(row[idx["N° Facture"]] || '').trim();
      const idPdf = String(row[idx["ID PDF"]] || '').trim();
      const flag = (typeof idxAEnvoyer === 'number' && idxAEnvoyer !== -1) ? row[idxAEnvoyer] === true : true;
      if (!email || !numero || !idPdf || !flag) continue;

      try {
        const fichier = DriveApp.getFileById(idPdf);
        const pdfBlob = fichier.getAs(MimeType.PDF).setName(`${numero}.pdf`);
        const montant = (typeof idxMontant === 'number' && idxMontant !== -1) ? parseFloat(row[idxMontant]) || 0 : null;
        const sujet = `[${NOM_ENTREPRISE}] Facture ${numero}`;
        const corps = [
          logoBlock,
          `<p>Bonjour,</p>`,
          `<p>Veuillez trouver ci-joint votre facture <strong>${numero}</strong>${montant !== null ? ` d'un montant de <strong>${montant.toFixed(2)} €</strong>` : ''}.</p>`,
          `<p>Merci pour votre confiance.<br/>${NOM_ENTREPRISE}</p>`
        ].filter(Boolean).join('');

        GmailApp.sendEmail(
          email,
          sujet,
          'Votre facture est jointe à ce message.',
          {
            htmlBody: corps,
            attachments: [pdfBlob],
            replyTo: EMAIL_ENTREPRISE
          }
        );

        if (typeof idxAEnvoyer === 'number' && idxAEnvoyer !== -1) feuille.getRange(r + 1, idxAEnvoyer + 1).setValue(false);
        if (typeof idxStatut === 'number' && idxStatut !== -1) feuille.getRange(r + 1, idxStatut + 1).setValue('Envoyée');
        envoyees++;
      } catch (e) {
        erreurs.push(`Ligne ${r + 1} (${numero}) : ${e.message}`);
      }
    }

    ui.alert('Envoi des factures', `${envoyees} e-mail(s) envoyé(s).${erreurs.length ? "\nErreurs:\n" + erreurs.join("\n") : ''}`, ui.ButtonSet.OK);
    logAdminAction('Envoi Factures', `Succès: ${envoyees}, Erreurs: ${erreurs.length}`);
  } catch (e) {
    Logger.log(`Erreur dans envoyerFacturesControlees: ${e.stack}`);
    try { logAdminAction('Envoi Factures', `Échec: ${e.message}`); } catch (_e) { /* ignore */ }
    SpreadsheetApp.getUi().alert('Erreur', e.message, ui.ButtonSet.OK);
  }
}

/**
 * Archive les factures du mois précédent en déplaçant les fichiers PDF
 * vers le dossier d'archives (ID_DOSSIER_ARCHIVES)/Année/"MMMM yyyy" et
 * met à jour le statut de la ligne.
 */
function archiverFacturesDuMois() {
  const ui = SpreadsheetApp.getUi();
  try {
    const maintenant = new Date();
    const debutMoisCourant = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
    const debutMoisPrecedent = new Date(maintenant.getFullYear(), maintenant.getMonth() - 1, 1);
    const finMoisPrecedent = new Date(debutMoisCourant.getTime() - 24 * 60 * 60 * 1000);

    const ss = SpreadsheetApp.openById(getSecret('ID_FEUILLE_CALCUL'));
    const feuille = ss.getSheetByName(SHEET_FACTURATION);
    if (!feuille) throw new Error("La feuille 'Facturation' est introuvable.");

    const idxMap = getFacturationHeaderIndices_(feuille, ['Date', 'N° Facture', 'ID PDF']).indices;
    const idxDate = idxMap['Date'];
    const idxNumero = idxMap['N° Facture'];
    const idxIdPdf = idxMap['ID PDF'];
    const idxStatut = idxMap['Statut'];

    const donnees = feuille.getDataRange().getValues();
    const dossierArchives = DriveApp.getFolderById(getSecret('ID_DOSSIER_ARCHIVES'));
    const dossierAnnee = obtenirOuCreerDossier(dossierArchives, debutMoisPrecedent.getFullYear().toString());
    const libMois = formaterDatePersonnalise(debutMoisPrecedent, "MMMM yyyy");
    const dossierMois = obtenirOuCreerDossier(dossierAnnee, libMois);

    let deplaces = 0, ignores = 0, erreurs = 0;
    for (let r = 1; r < donnees.length; r++) {
      const ligne = donnees[r];
      const valDate = ligne[idxDate];
      const numero = String(ligne[idxNumero] || '').trim();
      const idPdf = String(ligne[idxIdPdf] || '').trim();
      if (!(valDate instanceof Date)) continue;
      if (!numero || !idPdf) continue;
      if (valDate < debutMoisPrecedent || valDate > finMoisPrecedent) { ignores++; continue; }
      try {
        const fichier = DriveApp.getFileById(idPdf);
        // Si déjà dans le bon dossier, ignorer le déplacement
        let dejaBonDossier = false;
        const parents = fichier.getParents();
        while (parents.hasNext()) {
          const p = parents.next();
          if (p.getId() === dossierMois.getId()) { dejaBonDossier = true; break; }
        }
        if (!dejaBonDossier) {
          fichier.moveTo(dossierMois);
        }
        if (typeof idxStatut === 'number' && idxStatut !== -1) feuille.getRange(r + 1, idxStatut + 1).setValue('Archivée');
        deplaces++;
      } catch (e) {
        Logger.log('Erreur archivage facture ' + numero + ' : ' + e.message);
        erreurs++;
      }
    }

    const msg = `Archivage (${libMois}) terminé. Déplacés: ${deplaces}, ignorés: ${ignores}, erreurs: ${erreurs}.`;
    try { logAdminAction('Archivage factures mois précédent', msg); } catch (e) { /* ignore */ }
    ui.alert('Archivage des factures', msg, ui.ButtonSet.OK);
  } catch (e) {
    Logger.log('Erreur critique dans archiverFacturesDuMois: ' + e.stack);
    ui.alert('Erreur', e.message, ui.ButtonSet.OK);
  }
}
/**
 * Génère un devis PDF pour la sélection courante dans l’onglet Facturation.
 * - Regroupe les lignes sélectionnées par client et vérifie l’unicité.
 * - Construit un Google Docs minimal et exporte en PDF dans Archives/Devis.
 * - Affiche un lien d’ouverture du PDF.
 */
function genererDevisPdfDepuisSelection() {
  const ui = SpreadsheetApp.getUi();
  try {
    const ss = SpreadsheetApp.getActive();
    const sheet = ss.getActiveSheet();
    if (!sheet) throw new Error("Aucune feuille active.");
    const range = sheet.getActiveRange();
    if (!range) throw new Error("Aucune sélection. Sélectionnez des lignes dans '" + SHEET_FACTURATION + "'.");

    const values = sheet.getRange(range.getRow(), 1, range.getNumRows(), Math.max(1, sheet.getLastColumn())).getValues();
    const feuilleFacturation = SpreadsheetApp.openById(getSecret('ID_FEUILLE_CALCUL')).getSheetByName(SHEET_FACTURATION);
    const headerInfo = getFacturationHeaderIndices_(feuilleFacturation, ['Date', 'Client (Email)', 'Client (Raison S. Client)', 'Détails', 'Montant']);
    const indices = headerInfo.indices;
    const idxDate = indices['Date'];
    const idxEmail = indices['Client (Email)'];
    const idxNom = indices['Client (Raison S. Client)'];
    const idxDetails = indices['Détails'];
    const idxMontant = indices['Montant'];

    const emails = new Set(values.map(r => String(r[idxEmail] || '').trim()).filter(Boolean));
    if (emails.size === 0) {
      throw new Error("La sélection ne contient pas d'adresse e-mail client.");
    }
    if (emails.size > 1) {
      throw new Error("Veuillez sélectionner des lignes pour un seul client à la fois.");
    }
    const emailClient = Array.from(emails)[0];
    const nomClient = String(values[0][idxNom] || '').trim() || (obtenirInfosClientParEmail(emailClient)?.nom || 'Client');
    const infosClient = obtenirInfosClientParEmail(emailClient);

    const lignes = values.map(r => {
      const d = r[idxDate] instanceof Date ? r[idxDate] : new Date(r[idxDate]);
      const dateTxt = formaterDatePersonnalise(d, 'dd/MM/yyyy');
      const heureTxt = formaterDatePersonnalise(d, "HH'h'mm");
      const details = String(r[idxDetails] || '').trim();
      const montant = Number(r[idxMontant]) || 0;
      return { dateTxt, heureTxt, details, montant };
    });

    let total = 0;
    lignes.forEach(l => total += l.montant);

    const dossierArchives = DriveApp.getFolderById(getSecret('ID_DOSSIER_ARCHIVES'));
    const dossierDevis = obtenirOuCreerDossier(dossierArchives, 'Devis');
    const now = new Date();
    const libDate = formaterDatePersonnalise(now, 'yyyyMMdd');
    const doc = DocumentApp.create(`DEVIS - ${nomClient} - ${libDate}`);
    const body = doc.getBody();
    body.setAttributes({ FONT_FAMILY: 'Montserrat' });

    body.appendParagraph(NOM_ENTREPRISE).setHeading(DocumentApp.ParagraphHeading.HEADING2);
    body.appendParagraph(ADRESSE_ENTREPRISE);
    body.appendParagraph(EMAIL_ENTREPRISE).setSpacingAfter(14);

    body.appendParagraph('DEVIS').setHeading(DocumentApp.ParagraphHeading.HEADING1);
    body.appendParagraph(`Date: ${formaterDatePersonnalise(now, 'dd/MM/yyyy')}`);
    body.appendParagraph('Valable 30 jours, sous réserve de disponibilité.').setSpacingAfter(14);

    body.appendParagraph('Client').setHeading(DocumentApp.ParagraphHeading.HEADING3);
    body.appendParagraph(`${nomClient}`);
    if (infosClient && infosClient.adresse) body.appendParagraph(infosClient.adresse);
    body.appendParagraph(emailClient).setSpacingAfter(10);

    const table = body.appendTable();
    const headerRow = table.appendTableRow();
    ['Date', 'Heure', 'Prestation', 'Montant (€)'].forEach(t => headerRow.appendTableCell(t).setBold(true));
    // Détection avantage résident
    let colResident = -1;
    try { colResident = obtenirIndicesEnTetes(feuilleFacturation, ["Resident"])['Resident']; } catch (_e) { colResident = -1; }
    const structureNom = String(values[0][idxNom] || '').trim();
    const residentDetect = colResident !== -1 ? values.some(r => r[colResident] === true) : lignes.some(l => /forfait\s*r[ée]sident/i.test(l.details));
    const avantageMontant = residentDetect ? 5 : 0;
    let avantageAnnote = false;
    lignes.forEach(l => {
      const row = table.appendTableRow();
      row.appendTableCell(l.dateTxt);
      row.appendTableCell(l.heureTxt);
      row.appendTableCell(l.details);
      var cellText = Utilities.formatString('%.2f', l.montant) + ' €';
      if (residentDetect && !avantageAnnote && avantageMontant > 0) {
        const label = structureNom ? ('Avantage ' + structureNom) : 'Avantage résident';
        cellText += ' (' + label + ' : -' + Utilities.formatString('%.2f', avantageMontant) + ' €)';
        avantageAnnote = true;
      }
      row.appendTableCell(cellText);
    });
    if (avantageMontant > 0) {
      const adv = table.appendTableRow();
      adv.appendTableCell('');
      adv.appendTableCell('');
      adv.appendTableCell(structureNom ? ('Avantage: ' + structureNom) : 'Avantage résident');
      adv.appendTableCell('-' + Utilities.formatString('%.2f', avantageMontant) + ' €');
    }
    const totalRow = table.appendTableRow();
    totalRow.appendTableCell('Total').setBold(true);
    totalRow.appendTableCell('');
    totalRow.appendTableCell('');
    totalRow.appendTableCell(Utilities.formatString('%.2f', Math.max(0, total - avantageMontant)) + ' €').setBold(true);

    body.appendParagraph('\u00A0');
    body.appendParagraph("Pour confirmer: réservez via l'application ou contactez-nous.");

    doc.saveAndClose();
    const docFile = DriveApp.getFileById(doc.getId());
    dossierDevis.addFile(docFile);
    const pdfBlob = docFile.getAs(MimeType.PDF).setName(doc.getName() + '.pdf');
    const pdfFile = dossierDevis.createFile(pdfBlob);
    try { logAdminAction('Génération Devis PDF', `${nomClient} <${emailClient}> - ${pdfFile.getName()}`); } catch (_e) { /* ignore */ }

    // Ecrit l'ID du devis PDF dans la feuille Facturation (colonne "ID Devis").
    try {
      const lastColWrite = Math.max(1, feuilleFacturation.getLastColumn());
      const headerRowWrite = feuilleFacturation.getRange(1, 1, 1, lastColWrite).getValues()[0];
      const headerTrimmedWrite = headerRowWrite.map(h => String(h || '').trim());
      let idxIdDevis = headerTrimmedWrite.indexOf('ID Devis');
      if (idxIdDevis === -1) {
        feuilleFacturation.getRange(1, headerTrimmedWrite.length + 1).setValue('ID Devis');
        idxIdDevis = headerTrimmedWrite.length; // zero-based
      }
      const pdfId = pdfFile.getId();
      for (let i = 0; i < values.length; i++) {
        const rowIndex = range.getRow() + i;
        feuilleFacturation.getRange(rowIndex, idxIdDevis + 1).setValue(pdfId);
      }
    } catch (_errId) { /* noop */ }

    ui.alert('Devis généré', `Le devis a été créé:\n${pdfFile.getUrl()}`, ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('Erreur Génération Devis', e.message, ui.ButtonSet.OK);
  }
}





