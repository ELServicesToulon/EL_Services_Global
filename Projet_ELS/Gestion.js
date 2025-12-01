// =================================================================
//                      LOGIQUE DE L'ESPACE CLIENT
// =================================================================
// Description: Fonctions qui alimentent l'Espace Client, permettant
//              de visualiser, modifier et déplacer ses réservations.
// =================================================================

/**
 * Valide si un client existe par son email et retourne ses infos de base.
 * @param {string} emailClient L'e-mail à vérifier.
 * @returns {Object} Un objet indiquant le succès et les informations du client si trouvé.
 */
function validerClientParEmail(emailClient, exp, sig) {
  try {
    const emailBrut = String(emailClient || '').trim();
    if (!emailBrut) {
      return { success: false, error: "Merci de renseigner une adresse e-mail." };
    }
    const email = assertClient(emailBrut, exp, sig);
    const cacheKey = `login_fail_${email}`;
    if (CLIENT_PORTAL_ATTEMPT_LIMIT_ENABLED) {
      const cache = CacheService.getScriptCache();
      const attempts = parseInt(cache.get(cacheKey) || '0', 10);
      if (attempts >= CLIENT_PORTAL_MAX_ATTEMPTS) {
        return { success: false, error: "Trop de tentatives, réessayez plus tard." };
      }
    }

    const reservations = obtenirReservationsPourClient(email);
    if (!reservations || reservations.length === 0) {
      if (CLIENT_PORTAL_ATTEMPT_LIMIT_ENABLED) {
        const cache = CacheService.getScriptCache();
        const attempts = parseInt(cache.get(cacheKey) || '0', 10) + 1;
        cache.put(cacheKey, String(attempts), 3600);
        logFailedLogin(email, 'N/A');
        if (attempts >= CLIENT_PORTAL_MAX_ATTEMPTS) {
          return { success: false, error: "Trop de tentatives, réessayez plus tard." };
        }
      }
      return { success: false, error: "Vous devez avoir au moins une réservation confirmée pour accéder à votre espace client." };
    }

    const infosClient = obtenirInfosClientParEmail(email);

    if (infosClient) {
      if (CLIENT_PORTAL_ATTEMPT_LIMIT_ENABLED) {
        CacheService.getScriptCache().remove(cacheKey);
      }
      return { success: true, client: { nom: infosClient.nom } };
    } else {
      // Fallback for clients with reservations but not in the client sheet
      return { success: true, client: { nom: email } };
    }
  } catch (e) {
    if (e && e.message === 'Email invalide.') {
      return { success: false, error: "Adresse e-mail invalide." };
    }
    Logger.log(`Erreur dans validerClientParEmail pour ${emailClient}: ${e.stack}`);
    return { success: false, error: e.message || "Une erreur serveur est survenue." };
  }
}

/**
 * Construit un identifiant thématique (dessins animés) à partir d'un digest.
 * @param {!Array<number>} digestBytes Tableau d'octets du digest.
 * @returns {string} Identifiant lisible.
 */
function construireIdentifiantCartoonDepuisDigest_(digestBytes) {
  const pool = Array.isArray(CLIENT_ID_CARTOON_NAMES) ? CLIENT_ID_CARTOON_NAMES : [];
  if (!pool.length) {
    return digestBytes.map(function (b) { return ("0" + (b & 0xff).toString(16)).slice(-2); }).join("");
  }
  const poolSize = pool.length;
  const bytes = digestBytes.map(function (byte) { return byte & 0xff; });
  if (!bytes.length) {
    return pool[0] + '000';
  }
  let seed = 0;
  for (let i = 0; i < bytes.length; i++) {
    seed = (seed * 257 + bytes[i]) >>> 0;
  }
  const baseName = pool[seed % poolSize];
  let suffixSeed = 0;
  for (let j = bytes.length - 1; j >= Math.max(0, bytes.length - 6); j--) {
    suffixSeed = (suffixSeed * 131 + bytes[j]) >>> 0;
  }
  const suffixValue = suffixSeed % 46656; // 36^3 possibilités
  const suffix = suffixValue.toString(36).toUpperCase().padStart(3, '0');
  return baseName + suffix;
}

/**
 * Génère un identifiant à partir de l'email.
 * @param {string} email Email du client.
 * @returns {string} Identifiant lisible.
 */
function genererIdentifiantClient(email) {
  const emailNorm = String(email || '').trim().toLowerCase();
  if (!emailNorm) return '';
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, emailNorm);
  return construireIdentifiantCartoonDepuisDigest_(digest);
}

/**
 * Retourne un lien direct (signé si possible) vers l'espace client.
 * @param {string} emailClient
 * @returns {{success:boolean,url?:string,error?:string}}
 */
function client_getPortalLink(emailClient) {
  try {
    const email = String(emailClient || '').trim().toLowerCase();
    if (!email) {
      return { success: false, error: 'EMAIL_REQUIRED' };
    }
    try {
      const lien = generateSignedClientLink(email);
      if (lien && lien.url) {
        return { success: true, url: lien.url, exp: lien.exp };
      }
    } catch (err) {
      Logger.log(`client_getPortalLink: fallback pour ${email}: ${err}`);
      // Fallback handled below.
    }
    const baseUrl = (typeof CLIENT_PORTAL_BASE_URL !== 'undefined' && CLIENT_PORTAL_BASE_URL)
      ? CLIENT_PORTAL_BASE_URL
      : (ScriptApp.getService().getUrl() || '');
    if (!baseUrl) {
      return { success: false, error: 'BASE_URL_UNAVAILABLE' };
    }
    const url = `${baseUrl}?page=gestion&email=${encodeURIComponent(email)}`;
    return { success: true, url: url };
  } catch (e) {
    Logger.log(`Erreur dans client_getPortalLink pour ${emailClient}: ${e.stack}`);
    return { success: false, error: e.message || 'INTERNAL_ERROR' };
  }
}

/**
 * Applique un petit rate limit pour l'envoi du lien espace client.
 * @param {string} emailNorm Email en minuscules.
 * @returns {{allowed:boolean, reason?:string}}
 */
function verifierQuotaLienEspaceClient_(emailNorm) {
  try {
    const rateSeconds = (typeof CLIENT_PORTAL_LINK_RATE_SECONDS !== 'undefined' && Number(CLIENT_PORTAL_LINK_RATE_SECONDS) > 0)
      ? Number(CLIENT_PORTAL_LINK_RATE_SECONDS)
      : 60;
    const burstLimit = (typeof CLIENT_PORTAL_LINK_BURST_LIMIT !== 'undefined' && Number(CLIENT_PORTAL_LINK_BURST_LIMIT) > 0)
      ? Number(CLIENT_PORTAL_LINK_BURST_LIMIT)
      : 3;
    const burstWindowSeconds = (typeof CLIENT_PORTAL_LINK_BURST_WINDOW_SECONDS !== 'undefined' && Number(CLIENT_PORTAL_LINK_BURST_WINDOW_SECONDS) > 0)
      ? Number(CLIENT_PORTAL_LINK_BURST_WINDOW_SECONDS)
      : 3600;

    const cache = CacheService.getScriptCache();
    const keyBase = Utilities.base64EncodeWebSafe(emailNorm);
    const rateKey = 'client_link_rate:' + keyBase;
    const burstKey = 'client_link_burst:' + keyBase;
    const now = Date.now();

    const rateDelayMs = rateSeconds * 1000;
    const lastTs = Number(cache.get(rateKey) || '0');
    if (lastTs && (now - lastTs) < rateDelayMs) {
      return { allowed: false, reason: 'RATE_LIMIT' };
    }

    let history = [];
    const cached = cache.get(burstKey);
    if (cached) {
      try {
        history = JSON.parse(cached);
      } catch (_err) {
        history = [];
      }
    }
    history = history.filter(function (ts) { return (now - Number(ts)) < (burstWindowSeconds * 1000); });
    if (history.length >= burstLimit) {
      return { allowed: false, reason: 'RATE_LIMIT' };
    }

    history.push(now);
    cache.put(rateKey, String(now), Math.min(21600, Math.ceil(rateDelayMs / 1000)));
    cache.put(burstKey, JSON.stringify(history), Math.min(21600, Math.ceil(burstWindowSeconds)));
    return { allowed: true };
  } catch (e) {
    Logger.log('Rate limit lien client indisponible: ' + e);
    return { allowed: true };
  }
}

/**
 * Envoie un lien direct vers l'espace client par e-mail.
 * @param {string} emailClient
 * @returns {{success:boolean,url?:string,exp?:number,error?:string}}
 */
function envoyerLienEspaceClient(emailClient) {
  try {
    if (typeof CLIENT_PORTAL_ENABLED !== 'undefined' && !CLIENT_PORTAL_ENABLED) {
      return { success: false, error: 'CLIENT_PORTAL_DISABLED' };
    }
    const email = String(emailClient || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      return { success: false, error: 'EMAIL_REQUIRED' };
    }
    if (!emailRegex.test(email)) {
      return { success: false, error: 'EMAIL_INVALID' };
    }

    const rateCheck = verifierQuotaLienEspaceClient_(email);
    if (rateCheck && rateCheck.allowed === false) {
      return { success: false, error: rateCheck.reason || 'RATE_LIMIT' };
    }

    const lien = client_getPortalLink(email);
    if (!lien || lien.success !== true || !lien.url) {
      return { success: false, error: lien && lien.error ? lien.error : 'LINK_UNAVAILABLE' };
    }

    const brand = (typeof NOM_ENTREPRISE !== 'undefined' && NOM_ENTREPRISE) ? NOM_ENTREPRISE : 'EL Services';
    const subjectRaw = "Votre lien d'acces a l'espace client - " + brand;
    const subject = (typeof encodeMailSubjectUtf8 === 'function')
      ? (encodeMailSubjectUtf8(subjectRaw) || subjectRaw)
      : subjectRaw;
    const expirationTexte = lien.exp ? new Date(lien.exp * 1000).toLocaleString('fr-FR') : '';
    const logoBlock = (typeof getLogoEmailBlockHtml === 'function') ? getLogoEmailBlockHtml() : '';
    const buttonHtml = '<a href="' + lien.url + '" style="display:inline-block;padding:12px 18px;background:#3498db;color:#fff;text-decoration:none;border-radius:999px" target="_blank" rel="noopener">Acceder a mon espace client</a>';
    const corpsHtml = [
      '<div style="font-family: Montserrat, Arial, sans-serif; color:#333; line-height:1.6;">',
      logoBlock,
      '<p>Bonjour,</p>',
      '<p>Voici votre lien securise pour acceder a votre espace client ' + brand + '.</p>',
      '<p style="margin:16px 0;">' + buttonHtml + '</p>',
      '<p style="word-break: break-all;">' + lien.url + '</p>',
      expirationTexte ? ('<p>Ce lien expire le ' + expirationTexte + '.</p>') : '',
      "<p>Si vous n'etes pas a l'origine de cette demande, ignorez ce message.</p>",
      '<p>Bien cordialement,<br>' + brand + '</p>',
      '</div>'
    ].filter(Boolean).join('');
    const corpsTexte = [
      'Bonjour,',
      '',
      'Voici votre lien pour acceder a votre espace client ' + brand + ' :',
      lien.url,
      expirationTexte ? ('Lien valable jusqu au ' + expirationTexte + '.') : '',
      '',
      "Si vous n'etes pas a l'origine de cette demande, ignorez ce message.",
      '',
      brand
    ].filter(Boolean).join('\n');

    const emailOptions = { htmlBody: corpsHtml };
    if (typeof EMAIL_ENTREPRISE !== 'undefined' && EMAIL_ENTREPRISE) {
      emailOptions.replyTo = EMAIL_ENTREPRISE;
    }

    GmailApp.sendEmail(
      email,
      subject,
      corpsTexte || ' ',
      emailOptions
    );

    return { success: true, url: lien.url, exp: lien.exp };
  } catch (e) {
    Logger.log('Erreur dans envoyerLienEspaceClient: ' + e.stack);
    return { success: false, error: e.message || 'INTERNAL_ERROR' };
  }
}

/**
 * Recherche un client via son identifiant opaque.
 * @param {string} identifiant Jeton opaque du client.
 * @returns {Object|null} Informations du client si trouvé.
 */
function rechercherClientParIdentifiant(identifiant) {
  try {
    if (typeof CLIENT_SESSION_OPAQUE_ID_ENABLED === 'undefined' || !CLIENT_SESSION_OPAQUE_ID_ENABLED) {
      return null;
    }
    if (!identifiant) return null;
    const feuilleClients = SpreadsheetApp.openById(getSecret('ID_FEUILLE_CALCUL')).getSheetByName(SHEET_CLIENTS);
    if (!feuilleClients) return null;
    const donnees = feuilleClients.getDataRange().getValues();
    const enTetes = donnees[0];
    const idxEmail = enTetes.indexOf('Email');
    const idxNom = enTetes.indexOf('Raison Sociale');
    const idxAdresse = enTetes.indexOf('Adresse');
    const idxSiret = enTetes.indexOf('SIRET');
    const idxTelephone = enTetes.indexOf(COLONNE_TELEPHONE_CLIENT);
    for (let i = 1; i < donnees.length; i++) {
      const email = String(donnees[i][idxEmail]).trim();
      if (genererIdentifiantClient(email) === identifiant) {
        return {
          email: email,
          nom: donnees[i][idxNom] || '',
          adresse: donnees[i][idxAdresse] || '',
          siret: donnees[i][idxSiret] || '',
          telephone: idxTelephone !== -1 ? String(donnees[i][idxTelephone] || '').trim() : ''
        };
      }
    }
    return null;
  } catch (e) {
    Logger.log(`Erreur dans rechercherClientParIdentifiant: ${e.stack}`);
    return null;
  }
}

/**
 * Récupère toutes les réservations futures pour un client donné.
 * @param {string} emailClient L'e-mail du client.
 * @returns {Object} Un objet contenant les réservations futures du client.
 */
function obtenirReservationsClient(emailClient, exp, sig) {
  try {
    const emailBrut = String(emailClient || '').trim();
    if (!emailBrut) {
      return { success: false, error: "Merci de renseigner une adresse email." };
    }
    let emailNorm;
    try {
      emailNorm = assertClient(emailBrut, exp, sig);
    } catch (validationError) {
      if (validationError && (validationError.message === 'Email invalide.' || validationError.message === 'Lien invalide.')) {
        return { success: false, error: validationError.message };
      }
      throw validationError;
    }
    const feuille = SpreadsheetApp.openById(getSecret('ID_FEUILLE_CALCUL')).getSheetByName(SHEET_FACTURATION);
    const indices = getFacturationHeaderIndices_(feuille, ["Date", "Client (Email)", "Event ID", "Détails", "Client (Raison S. Client)", "ID Réservation", "Montant"]).indices;
    
    const donnees = feuille.getDataRange().getValues();
    const maintenant = new Date();

    const reservations = donnees.slice(1).map(ligne => {
      try {
        if (String(ligne[indices["Client (Email)"]]).trim().toLowerCase() !== emailNorm) {
          return null;
        }
        
        const dateSheet = new Date(ligne[indices["Date"]]);
        if (isNaN(dateSheet.getTime()) || dateSheet < maintenant) {
          return null;
        }

        const eventId = String(ligne[indices["Event ID"]]).trim();
        let dateDebut = dateSheet;
        let dateFin;

        if (eventId) {
          try {
            const evenementRessource = Calendar.Events.get(getSecret('ID_CALENDRIER'), eventId);
            dateDebut = new Date(evenementRessource.start.dateTime || evenementRessource.start.date);
            dateFin = new Date(evenementRessource.end.dateTime || evenementRessource.end.date);
          } catch (err) {
            Logger.log(`Avertissement: L'événement Calendar (ID: ${eventId}) pour la réservation ${ligne[indices["ID Réservation"]]} est introuvable. La durée sera estimée.`);
          }
        }
        
        const details = String(ligne[indices["Détails"]]);
        const matchTotal = details.match(/(\d+)\s*arrêt\(s\)\s*total\(s\)/);
        const matchSup = details.match(/(\d+)\s*arrêt\(s\)\s*sup/);
        const totalStops = matchTotal ? parseInt(matchTotal[1], 10) : (matchSup ? parseInt(matchSup[1], 10) + 1 : 1);
        const retour = details.includes('retour: oui');
        const nbSupp = Math.max(0, totalStops - 1);

        if (!dateFin) {
            const totalArretsCalcules = nbSupp + (retour ? 1 : 0);
            const dureeEstimee = DUREE_BASE + (totalArretsCalcules * DUREE_ARRET_SUP);
            dateFin = new Date(dateDebut.getTime() + dureeEstimee * 60000);
        }

        const totalArretsCalculesPourKm = nbSupp + (retour ? 1 : 0);
        const km = KM_BASE + (totalArretsCalculesPourKm * KM_ARRET_SUP);

        return {
          id: ligne[indices["ID Réservation"]],
          eventId: eventId,
          start: dateDebut.toISOString(),
          end: dateFin.toISOString(),
          details: details,
          clientName: ligne[indices["Client (Raison S. Client)"]],
          amount: parseFloat(ligne[indices["Montant"]]) || 0,
          resident: (indices["Resident"] !== undefined && indices["Resident"] !== -1) ? (ligne[indices["Resident"]] === true) : false,
          km: km
        };

      } catch (e) { 
        Logger.log(`Erreur de traitement d'une ligne de réservation pour ${emailClient}: ${e.toString()}`);
        return null; 
      }
    }).filter(Boolean);
      
    return { success: true, reservations: reservations };
  } catch (e) {
    Logger.log(`Erreur critique dans obtenirReservationsClient pour ${emailClient}: ${e.stack}`);
    return { success: false, error: e && e.message ? e.message : "Une erreur est survenue." };
  }
}

/**
 * Calcule le chiffre d'affaires futur pour un client donné.
 * @param {string} emailClient L'e-mail du client.
 * @returns {number} Le total des montants à venir.
 */
function calculerCAEnCoursClient(emailClient, exp, sig) {
  try {
    if (!CA_EN_COURS_ENABLED) return 0;
    const emailBrut = String(emailClient || '').trim();
    if (!emailBrut) return 0;
    let email;
    try {
      email = assertClient(emailBrut, exp, sig);
    } catch (validationError) {
      if (validationError && (validationError.message === 'Email invalide.' || validationError.message === 'Lien invalide.')) {
        return 0;
      }
      throw validationError;
    }

    const feuille = SpreadsheetApp.openById(getSecret('ID_FEUILLE_CALCUL')).getSheetByName(SHEET_FACTURATION);
    if (!feuille) return 0;
    const indices = getFacturationHeaderIndices_(feuille, ['Date', 'Client (Email)', 'Montant']).indices;
    const lignes = feuille.getDataRange().getValues();
    const aujourdHui = new Date();
    let total = 0;

    lignes.slice(1).forEach(ligne => {
      const emailLigne = String(ligne[indices['Client (Email)']]).trim().toLowerCase();
      if (emailLigne !== email) return;
      const dateResa = new Date(ligne[indices['Date']]);
      if (isNaN(dateResa.getTime()) || dateResa < aujourdHui) return;
      total += parseFloat(ligne[indices['Montant']]) || 0;
    });

    return total;
  } catch (e) {
    Logger.log(`Erreur dans calculerCAEnCoursClient pour ${emailClient}: ${e.stack}`);
    return 0;
  }
}


/**
 * Recherche les métadonnées d'une facture via son identifiant de PDF Drive.
 * @param {string} idPdf Identifiant du fichier PDF dans Drive.
 * @returns {{numero:string,email:string,idPdf:string,url:string,dateISO:(string|null),montant:(number|null),periode:string,periodeStartISO:(string|null),periodeEndISO:(string|null),dueDateISO:(string|null)}|null}
 */
function rechercherFactureParId(idPdf) {
  const identifiant = String(idPdf || '').trim();
  if (!identifiant) return null;
  if (!/^[A-Za-z0-9_-]{10,}$/.test(identifiant)) {
    throw new Error('Identifiant PDF invalide.');
  }
  let fichier;
  try {
    fichier = DriveApp.getFileById(identifiant);
  } catch (err) {
    throw new Error('Fichier PDF introuvable ou inaccessible.');
  }
  const numero = extraireNumeroFactureDepuisNom_(fichier.getName());
  const metaParNumero = chargerMetadonneesFactures_();
  const meta = numero ? metaParNumero[numero] || null : null;
  const dateEmission = meta && meta.dateEmission instanceof Date
    ? meta.dateEmission
    : fichier.getDateCreated();
  const dateEmissionValide = dateEmission instanceof Date && !isNaN(dateEmission.getTime());
  const periodeDebutValide = meta && meta.periodeDebut instanceof Date && !isNaN(meta.periodeDebut.getTime());
  const periodeFinValide = meta && meta.periodeFin instanceof Date && !isNaN(meta.periodeFin.getTime());
  const echeanceValide = meta && meta.echeance instanceof Date && !isNaN(meta.echeance.getTime());
  return {
    numero: numero || '',
    email: meta ? meta.email : '',
    idPdf: identifiant,
    url: fichier.getUrl(),
    dateISO: dateEmissionValide ? dateEmission.toISOString() : null,
    montant: meta ? meta.montant : null,
    periode: meta ? meta.periode : '',
    periodeStartISO: periodeDebutValide ? meta.periodeDebut.toISOString() : null,
    periodeEndISO: periodeFinValide ? meta.periodeFin.toISOString() : null,
    dueDateISO: echeanceValide ? meta.echeance.toISOString() : null
  };
}

/**
 * Récupère les factures (générées) pour un client.
 * @param {string} emailClient L'e-mail du client.
 * @returns {Object} success + liste des factures { numero, dateISO, montant, url, idPdf, periode, periodeStartISO, periodeEndISO, dueDateISO }.
 */
function obtenirFacturesPourClient(emailClient, exp, sig) {
  try {
    const emailNorm = assertClient(emailClient, exp, sig);
    const metaParNumero = chargerMetadonneesFactures_();
    const fichiers = collecterFichiersFactures_();
    const facturesParNumero = Object.create(null);
    fichiers.forEach(fichier => {
      const meta = metaParNumero[fichier.numero];
      if (!meta || meta.email !== emailNorm) return;
      const emission = meta.dateEmission instanceof Date ? meta.dateEmission : fichier.dateEmission;
      const existante = facturesParNumero[fichier.numero];
      if (existante) {
        const courante = existante._dateEmissionRef || null;
        if (courante && emission && emission <= courante) return;
      }
      const emissionValide = emission instanceof Date && !isNaN(emission.getTime());
      const periodeDebutValide = meta.periodeDebut instanceof Date && !isNaN(meta.periodeDebut.getTime());
      const periodeFinValide = meta.periodeFin instanceof Date && !isNaN(meta.periodeFin.getTime());
      const echeanceValide = meta.echeance instanceof Date && !isNaN(meta.echeance.getTime());
      facturesParNumero[fichier.numero] = {
        numero: fichier.numero,
        dateISO: emissionValide ? emission.toISOString() : null,
        montant: meta.montant,
        periode: meta.periode || '',
        periodeStartISO: periodeDebutValide ? meta.periodeDebut.toISOString() : null,
        periodeEndISO: periodeFinValide ? meta.periodeFin.toISOString() : null,
        dueDateISO: echeanceValide ? meta.echeance.toISOString() : null,
        url: fichier.url,
        idPdf: fichier.id,
        _dateEmissionRef: emissionValide ? emission : null
      };
    });
    const factures = Object.keys(facturesParNumero).map(numero => {
      const item = facturesParNumero[numero];
      delete item._dateEmissionRef;
      return item;
    });
    factures.sort((a, b) => new Date(b.dateISO || 0) - new Date(a.dateISO || 0));
    return { success: true, factures: factures };
  } catch (e) {
    Logger.log('Erreur dans obtenirFacturesPourClient: ' + e.stack);
    return { success: false, error: e.message };
  }
}

/**
 * Renvoie le lien de téléchargement d'une facture pour un client donné.
 * @param {string} idPdf Identifiant du fichier PDF à récupérer.
 * @param {string} emailClient Email du client demandeur.
 */
function obtenirLienFactureParIdClient(idPdf, emailClient, exp, sig) {
  try {
    const emailNorm = assertClient(emailClient, exp, sig);
    const facture = rechercherFactureParId(idPdf);
    if (!facture) {
      throw new Error('Facture introuvable.');
    }
    if (facture.email && facture.email !== emailNorm) {
      throw new Error('Facture non associée à votre compte.');
    }
    return {
      success: true,
      url: facture.url,
      numero: facture.numero,
      dateISO: facture.dateISO,
      montant: facture.montant,
      periode: facture.periode || '',
      periodeStartISO: facture.periodeStartISO || null,
      periodeEndISO: facture.periodeEndISO || null,
      dueDateISO: facture.dueDateISO || null
    };
  } catch (e) {
    Logger.log('Erreur dans obtenirLienFactureParIdClient: ' + e.stack);
    return { success: false, error: e.message };
  }
}

function chargerMetadonneesFactures_() {
  const resultat = Object.create(null);
  const ss = SpreadsheetApp.openById(getSecret('ID_FEUILLE_CALCUL'));
  const feuilles = BILLING_MULTI_SHEET_ENABLED
    ? ss.getSheets().filter(f => f.getName().startsWith('Facturation'))
    : [ss.getSheetByName(SHEET_FACTURATION)];
  if (!feuilles.length || feuilles.some(f => !f)) {
    throw new Error("La feuille 'Facturation' est introuvable.");
  }
  feuilles.forEach(feuille => {
    if (!feuille) return;
    const headerInfo = getFacturationHeaderIndices_(feuille, ['Client (Email)', 'N° Facture']);
    const headers = headerInfo.header.map(h => String(h || '').trim());
    const headersNorm = headers.map(normaliserCleFacture_);
    const idxNumero = headerInfo.indices['N° Facture'];
    const idxEmail = headerInfo.indices['Client (Email)'];
    if (idxNumero === -1 || idxEmail === -1) return;
    const idxMontant = headerInfo.indices['Montant'] !== undefined ? headerInfo.indices['Montant'] : -1;
    const idxDateStd = headerInfo.indices['Date'] !== undefined ? headerInfo.indices['Date'] : -1;
    const idxDateEdition = trouverIndexEnteteFacture_(headersNorm, ['date facture', 'date facturation', 'date edition', 'date d edition', 'date emission', 'date d emission']);
    const idxPeriode = trouverIndexEnteteFacture_(headersNorm, ['periode facture', 'periode facturation', 'periode', 'periode de facturation']);
    const idxPeriodeDebut = trouverIndexEnteteFacture_(headersNorm, ['date debut periode', 'debut periode', 'date debut de periode']);
    const idxPeriodeFin = trouverIndexEnteteFacture_(headersNorm, ['date fin periode', 'fin periode', 'date fin de periode']);
    const idxEcheance = trouverIndexEnteteFacture_(headersNorm, ['echeance', 'date echeance', 'echéance']);
    const data = feuille.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const numero = String(row[idxNumero] || '').trim();
      const email = String(row[idxEmail] || '').trim().toLowerCase();
      if (!numero || !email) continue;
      let meta = resultat[numero];
      if (!meta) {
        meta = {
          numero: numero,
          email: email,
          montant: null,
          periode: '',
          dateEmission: null,
          periodeDebut: null,
          periodeFin: null,
          echeance: null
        };
        resultat[numero] = meta;
      } else if (!meta.email) {
        meta.email = email;
      }
      if (idxMontant !== -1) {
        const montantVal = parseFloat(row[idxMontant]);
        if (isFinite(montantVal)) {
          meta.montant = montantVal;
        }
      }
      if (idxPeriode !== -1) {
        const periodeBrut = String(row[idxPeriode] || '').trim();
        if (periodeBrut) {
          meta.periode = periodeBrut;
        }
      }
      if (idxPeriodeDebut !== -1) {
        const dateDebut = convertirEnDateFacture_(row[idxPeriodeDebut]);
        if (dateDebut) meta.periodeDebut = dateDebut;
      }
      if (idxPeriodeFin !== -1) {
        const dateFin = convertirEnDateFacture_(row[idxPeriodeFin]);
        if (dateFin) meta.periodeFin = dateFin;
      }
      if (idxEcheance !== -1) {
        const due = convertirEnDateFacture_(row[idxEcheance]);
        if (due) meta.echeance = due;
      }
      const rawDate = idxDateEdition !== -1 ? row[idxDateEdition] : (idxDateStd !== -1 ? row[idxDateStd] : null);
      const dateObj = convertirEnDateFacture_(rawDate);
      if (dateObj) {
        if (!meta.dateEmission || dateObj > meta.dateEmission) {
          meta.dateEmission = dateObj;
        }
      }
    }
  });
  return resultat;
}

function collecterFichiersFactures_() {
  const dossierId = getSecret('ID_DOSSIER_FACTURES');
  if (!dossierId) {
    throw new Error('Propriété Script manquante : ID_DOSSIER_FACTURES.');
  }
  let dossier;
  try {
    dossier = DriveApp.getFolderById(dossierId);
  } catch (err) {
    throw new Error("Le dossier de factures (ID_DOSSIER_FACTURES) est introuvable ou l'accès est refusé.");
  }
  const resultats = [];
  collecterFichiersFacturesRecursif_(dossier, resultats);
  return resultats;
}

function collecterFichiersFacturesRecursif_(dossier, accumulateur) {
  const fichiers = dossier.getFiles();
  while (fichiers.hasNext()) {
    const fichier = fichiers.next();
    const nom = fichier.getName();
    if (!/\.pdf$/i.test(nom)) continue;
    const numero = extraireNumeroFactureDepuisNom_(nom);
    if (!numero) continue;
    accumulateur.push({
      id: fichier.getId(),
      numero: numero,
      url: fichier.getUrl(),
      dateEmission: fichier.getDateCreated()
    });
  }
  const sousDossiers = dossier.getFolders();
  while (sousDossiers.hasNext()) {
    collecterFichiersFacturesRecursif_(sousDossiers.next(), accumulateur);
  }
}

function trouverFactureDriveParNumero_(numero) {
  if (!numero) return null;
  const fichiers = collecterFichiersFactures_();
  for (let i = 0; i < fichiers.length; i++) {
    if (fichiers[i].numero === numero) {
      return fichiers[i];
    }
  }
  return null;
}

function extraireNumeroFactureDepuisNom_(nomFichier) {
  if (!nomFichier) return '';
  const upper = String(nomFichier).toUpperCase();
  const match = upper.match(/(FACT)[-_ ]?(\d{4})[-_ ]?(\d+)/);
  if (!match) return '';
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function normaliserCleFacture_(valeur) {
  return String(valeur || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function trouverIndexEnteteFacture_(headersNorm, motifs) {
  for (const motif of motifs) {
    for (let i = 0; i < headersNorm.length; i++) {
      const valeur = headersNorm[i];
      if (valeur && valeur.indexOf(motif) !== -1) {
        return i;
      }
    }
  }
  return -1;
}

function convertirEnDateFacture_(valeur) {
  if (valeur instanceof Date) {
    return isNaN(valeur.getTime()) ? null : valeur;
  }
  if (valeur === null || valeur === '' || typeof valeur === 'undefined') {
    return null;
  }
  const tentative = new Date(valeur);
  return isNaN(tentative.getTime()) ? null : tentative;
}

/**
 * Envoie une facture spécifique au client par e-mail (pièce jointe PDF).
 * @param {string} emailClient L'e-mail de destination.
 * @param {string} numeroFacture Le numéro de facture à envoyer.
 */
function envoyerFactureClient(emailClient, numeroFacture, exp, sig) {
  try {
    const emailNorm = assertClient(emailClient, exp, sig);
    if (!numeroFacture) throw new Error('Paramètres manquants.');
    const ss = SpreadsheetApp.openById(getSecret('ID_FEUILLE_CALCUL'));
    const feuilles = BILLING_MULTI_SHEET_ENABLED
      ? ss.getSheets().filter(f => f.getName().startsWith('Facturation'))
      : [ss.getSheetByName(SHEET_FACTURATION)];
    if (!feuilles.length || feuilles.some(f => !f)) throw new Error("La feuille 'Facturation' est introuvable.");
    let row = null;
    let idx = null;
    for (const feuille of feuilles) {
      const headerInfo = getFacturationHeaderIndices_(feuille, ['Client (Email)', 'N° Facture']);
      idx = headerInfo.indices;
      const idxEmail = idx['Client (Email)'];
      const idxNumero = idx['N° Facture'];
      const rows = feuille.getDataRange().getValues().slice(1);
      row = rows.find(r => String(r[idxNumero]).trim() === String(numeroFacture).trim() && String(r[idxEmail]).trim().toLowerCase() === emailNorm);
      if (row) break;
    }
    if (!row) throw new Error('Facture introuvable pour ce client.');
    const idxPdf = idx['ID PDF'];
    const idxNumero = idx['N° Facture'];
    const idxMontant = idx['Montant'];
    let idPdf = (typeof idxPdf === 'number' && idxPdf !== -1) ? String(row[idxPdf] || '').trim() : '';
    let fichier;
    if (idPdf) {
      fichier = DriveApp.getFileById(idPdf);
    } else {
      const fichierDrive = trouverFactureDriveParNumero_(String(row[idxNumero]).trim());
      if (!fichierDrive) {
        throw new Error('Aucun fichier PDF associé à cette facture.');
      }
      idPdf = fichierDrive.id;
      fichier = DriveApp.getFileById(fichierDrive.id);
    }
    const montant = (typeof idxMontant === 'number' && idxMontant !== -1) ? (parseFloat(row[idxMontant]) || null) : null;
    const numeroLigne = String(row[idxNumero]).trim();
    const pdfBlob = fichier.getAs(MimeType.PDF).setName(`${numeroLigne}.pdf`);
    const sujet = `[${NOM_ENTREPRISE}] Facture ${numeroLigne}`;
    const logoBlock = getLogoEmailBlockHtml();
    const corps = [
      logoBlock,
      `<p>Veuillez trouver ci-joint votre facture <strong>${numeroLigne}</strong>${montant !== null ? ` d'un montant de <strong>${montant.toFixed(2)} €</strong>` : ''}.</p>`,
      `<p>Cordiales salutations,<br>${NOM_ENTREPRISE}</p>`
    ].filter(Boolean).join('');
    GmailApp.sendEmail(
      emailNorm,
      sujet,
      'Votre facture est jointe à ce message.',
      {
        htmlBody: corps,
        attachments: [pdfBlob],
        replyTo: EMAIL_ENTREPRISE
      }
    );
  return { success: true };
  } catch (e) {
    Logger.log('Erreur dans envoyerFactureClient: ' + e.stack);
    return { success: false, error: e.message };
  }
}

/**
 * Met à jour les détails (nombre d'arrêts, prix, durée) d'une réservation existante.
 * @param {string} idReservation L'ID unique de la réservation à modifier.
 * @param {number} totalStops Le nouveau nombre d'arrêt(s) total(s).
 * @returns {Object} Un résumé de l'opération.
 */
function mettreAJourDetailsReservation(idReservation, totalStops, emailClient, exp, sig, options) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return { success: false, error: "Le système est occupé, veuillez réessayer." };

  try {
    const normaliserTypeRemise = function (val) {
      const str = String(val || '').trim();
      if (!str) return '';
      const decompose = typeof str.normalize === 'function' ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : str;
      const lower = decompose.toLowerCase();
      if (lower.indexOf('pourcentage') !== -1) return 'Pourcentage';
      if (lower.indexOf('montant') !== -1) return 'Montant Fixe';
      if (lower.indexOf('tournee') !== -1) return 'Tournee Offerte';
      if (lower.indexOf('arret') !== -1) return 'Arrets Offerts';
      return '';
    };

    const opts = (options && typeof options === 'object') ? options : {};
    const champsRemiseRenseignes = ('typeRemise' in opts) || ('remiseType' in opts) || ('valeurRemise' in opts) || ('arretsOfferts' in opts) || ('tourneeOfferte' in opts);
    const typeRemiseOption = normaliserTypeRemise(opts.typeRemise || opts.remiseType || '');
    const valeurRemiseOption = (opts.valeurRemise !== undefined) ? Number(opts.valeurRemise) : null;
    const arretsOffertsOption = (opts.arretsOfferts !== undefined) ? Math.max(0, Math.floor(Number(opts.arretsOfferts) || 0)) : null;
    const tourneeOfferteOption = opts.tourneeOfferte === true ? true : (opts.tourneeOfferte === false ? false : null);
    const noteOption = opts.note !== undefined ? String(opts.note || '').trim() : null;

    const emailNorm = emailClient ? assertClient(emailClient, exp, sig) : null;
    const idNorm = assertReservationId(idReservation);
    const feuille = SpreadsheetApp.openById(getSecret('ID_FEUILLE_CALCUL')).getSheetByName(SHEET_FACTURATION);
    const headerInfo = getFacturationHeaderIndices_(feuille, [
      "ID Réservation",
      "Détails",
      "Montant",
      "Client (Email)",
      "Type Remise Appliquée",
      "Valeur Remise Appliquée",
      "Tournée Offerte Appliquée",
      "Note Interne",
      "Type",
      "Resident"
    ]);
    const indices = headerInfo.indices;
    const idxEvent = indices["Event ID"];
    const idxDate = indices["Date"];
    const idxType = indices["Type"];
    const idxResident = indices["Resident"];

    const donnees = feuille.getDataRange().getValues();
    const indexLigne = donnees.findIndex(row => String(row[indices["ID Réservation"]]).trim() === idNorm);
    if (indexLigne === -1) return { success: false, error: "Réservation introuvable." };

    const ligneDonnees = donnees[indexLigne];
    const idEvenement = typeof idxEvent === 'number' && idxEvent !== -1 ? String(ligneDonnees[idxEvent]).trim() : '';
    const detailsAnciens = String(ligneDonnees[indices["Détails"]]);
    const emailFeuille = String(ligneDonnees[indices["Client (Email)"]]).trim().toLowerCase();
    if (emailNorm && emailFeuille !== emailNorm) return { success: false, error: "Accès non autorisé." };

    let ressourceEvenement = null;
    const idxDateFallback = indices["Date"];
    let dateDebutOriginale = (typeof idxDate === 'number' && idxDate !== -1)
      ? new Date(ligneDonnees[idxDate])
      : (typeof idxDateFallback === 'number' ? new Date(ligneDonnees[idxDateFallback]) : new Date());

    try {
      if (idEvenement) {
        ressourceEvenement = Calendar.Events.get(getSecret('ID_CALENDRIER'), idEvenement);
        dateDebutOriginale = new Date(ressourceEvenement.start.dateTime);
      }
    } catch (e) {
      Logger.log(`Événement ${idEvenement} introuvable pour modification. Seule la feuille de calcul sera mise à jour.`);
      ressourceEvenement = null;
    }
    
    const typeCourse = typeof idxType === 'number' && idxType !== -1 ? String(ligneDonnees[idxType] || '').trim().toLowerCase() : '';
    const estUrgent = typeCourse === 'urgent';
    const estSamedi = typeCourse === 'samedi' || dateDebutOriginale.getDay() === 6;
    const estResident = typeof idxResident === 'number' && idxResident !== -1 ? ligneDonnees[idxResident] === true : false;
    const retourPharmacie = detailsAnciens.includes('retour: oui');
    const totalStopsInt = Math.max(1, Number(totalStops) || 1);

    const typeRemiseActuel = normaliserTypeRemise((indices["Type Remise Appliqu�e"] !== undefined && indices["Type Remise Appliqu�e"] !== -1) ? ligneDonnees[indices["Type Remise Appliqu�e"]] : '');
    const valeurRemiseActuelle = (indices["Valeur Remise Appliqu�e"] !== undefined && indices["Valeur Remise Appliqu�e"] !== -1) ? Number(ligneDonnees[indices["Valeur Remise Appliqu�e"]]) || 0 : 0;
    const tourneeOfferteActuelle = (indices["Tournée Offerte Appliqu�e"] !== undefined && indices["Tournée Offerte Appliqu�e"] !== -1) ? ligneDonnees[indices["Tournée Offerte Appliqu�e"]] === true : false;
    const noteActuelle = (indices["Note Interne"] !== undefined && indices["Note Interne"] !== -1) ? String(ligneDonnees[indices["Note Interne"]] || '').trim() : '';
    const noteFinale = noteOption !== null ? noteOption : noteActuelle;
    const noteModifiee = noteOption !== null && noteOption !== noteActuelle;

    let typeRemiseFinal = typeRemiseActuel;
    let valeurRemiseFinal = valeurRemiseActuelle;
    let tourneeOfferteFinal = tourneeOfferteActuelle;
    if (tourneeOfferteOption !== null) {
      tourneeOfferteFinal = tourneeOfferteOption;
    }
    if (champsRemiseRenseignes) {
      if (typeRemiseOption === 'Tournee Offerte' || tourneeOfferteOption === true) {
        tourneeOfferteFinal = true;
        typeRemiseFinal = '';
        valeurRemiseFinal = 0;
      } else if (typeRemiseOption === 'Arrets Offerts') {
        tourneeOfferteFinal = false;
        typeRemiseFinal = 'Arrets Offerts';
        valeurRemiseFinal = arretsOffertsOption !== null ? arretsOffertsOption : Math.max(0, Math.floor(valeurRemiseOption || 0));
      } else if (typeRemiseOption === 'Pourcentage') {
        tourneeOfferteFinal = false;
        typeRemiseFinal = 'Pourcentage';
        valeurRemiseFinal = Math.max(0, Math.min(100, valeurRemiseOption || 0));
      } else if (typeRemiseOption === 'Montant Fixe') {
        tourneeOfferteFinal = false;
        typeRemiseFinal = 'Montant Fixe';
        valeurRemiseFinal = Math.max(0, valeurRemiseOption || 0);
      } else {
        tourneeOfferteFinal = false;
        typeRemiseFinal = '';
        valeurRemiseFinal = 0;
      }
    }

    const arretsOfferts = typeRemiseFinal === 'Arrets Offerts' ? Math.max(0, Math.min(valeurRemiseFinal, Math.max(0, totalStopsInt - 1))) : 0;
    const totalStopsFactures = typeRemiseFinal === 'Arrets Offerts' ? Math.max(1, totalStopsInt - arretsOfferts) : totalStopsInt;

    let prixBase;
    if (estResident && typeof FORFAIT_RESIDENT !== 'undefined') {
      prixBase = estUrgent ? FORFAIT_RESIDENT.URGENCE_PRICE : FORFAIT_RESIDENT.STANDARD_PRICE;
    } else {
      const calcul = computeCoursePrice({ totalStops: totalStopsInt, retour: retourPharmacie, urgent: estUrgent, samedi: estSamedi });
      if (!calcul || calcul.error) {
        return { success: false, error: calcul && calcul.error ? calcul.error : 'Tarification indisponible.' };
      }
      prixBase = calcul.total;
    }

    let nouveauPrix = prixBase;
    if (tourneeOfferteFinal) {
      nouveauPrix = 0;
    } else if (typeRemiseFinal === 'Pourcentage' && valeurRemiseFinal > 0) {
      nouveauPrix = Math.max(0, prixBase * (1 - valeurRemiseFinal / 100));
    } else if (typeRemiseFinal === 'Montant Fixe' && valeurRemiseFinal > 0) {
      nouveauPrix = Math.max(0, prixBase - valeurRemiseFinal);
    } else if (typeRemiseFinal === 'Arrets Offerts' && arretsOfferts > 0) {
      const calcul = computeCoursePrice({ totalStops: totalStopsFactures, retour: retourPharmacie, urgent: estUrgent, samedi: estSamedi });
      if (calcul && !calcul.error) {
        nouveauPrix = Math.min(prixBase, calcul.total);
      }
      valeurRemiseFinal = arretsOfferts;
    }
    nouveauPrix = Math.round(nouveauPrix * 100) / 100;

    const nbSupp = Math.max(0, totalStopsInt - 1);
    const nouvelleDuree = DUREE_BASE + ((nbSupp + (retourPharmacie ? 1 : 0)) * DUREE_ARRET_SUP);
    const nouveauxDetails = formatCourseLabel_(nouvelleDuree, totalStopsInt, retourPharmacie);
    // Si l'événement existe, on le met à jour
    if (ressourceEvenement) {
      const nouvelleDateFin = new Date(dateDebutOriginale.getTime() + nouvelleDuree * 60000);
      const descriptionCourante = typeof ressourceEvenement.description === 'string' ? ressourceEvenement.description : '';
      const ressourceMaj = {
        end: { dateTime: nouvelleDateFin.toISOString() },
        description: descriptionCourante
          .replace(/Total:.*€/, `Total: ${nouveauPrix.toFixed(2)} €`)
          .replace(/Arrêts (?:suppl|totaux):.*\n/, `Arrêts totaux: ${totalStopsInt}, Retour: ${retourPharmacie ? 'Oui' : 'Non'}\n`)
      };
      Calendar.Events.patch(ressourceMaj, getSecret('ID_CALENDRIER'), idEvenement);
    }

    // On met TOUJOURS à jour la feuille de calcul
    feuille.getRange(indexLigne + 1, indices["Détails"] + 1).setValue(nouveauxDetails);
    feuille.getRange(indexLigne + 1, indices["Montant"] + 1).setValue(nouveauPrix);
    if (indices["Type Remise Appliqu\u00e9e"] !== undefined && indices["Type Remise Appliqu\u00e9e"] !== -1) {
      feuille.getRange(indexLigne + 1, indices["Type Remise Appliqu\u00e9e"] + 1).setValue(typeRemiseFinal);
    }
    if (indices["Valeur Remise Appliqu\u00e9e"] !== undefined && indices["Valeur Remise Appliqu\u00e9e"] !== -1) {
      feuille.getRange(indexLigne + 1, indices["Valeur Remise Appliqu\u00e9e"] + 1).setValue(valeurRemiseFinal);
    }
    if (indices["Tourn\u00e9e Offerte Appliqu\u00e9e"] !== undefined && indices["Tourn\u00e9e Offerte Appliqu\u00e9e"] !== -1) {
      feuille.getRange(indexLigne + 1, indices["Tourn\u00e9e Offerte Appliqu\u00e9e"] + 1).setValue(tourneeOfferteFinal);
    }
    if (indices["Note Interne"] !== undefined && indices["Note Interne"] !== -1) {
      feuille.getRange(indexLigne + 1, indices["Note Interne"] + 1).setValue(noteFinale);
    }

    const resumeParts = [`${totalStopsInt} arrêts totaux`];
    if (tourneeOfferteFinal) {
      resumeParts.push("Tournée offerte");
    } else if (typeRemiseFinal === "Pourcentage" && valeurRemiseFinal > 0) {
      resumeParts.push(`Remise ${valeurRemiseFinal}%`);
    } else if (typeRemiseFinal === "Montant Fixe" && valeurRemiseFinal > 0) {
      resumeParts.push(`Remise ${valeurRemiseFinal}`);
    } else if (typeRemiseFinal === "Arrets Offerts" && valeurRemiseFinal > 0) {
      resumeParts.push(`${valeurRemiseFinal} arrêt(s) offert(s)`);
    }
    if (noteModifiee) { resumeParts.push('Note mise à jour'); }

    logActivity(idNorm, emailNorm || emailFeuille, `Modification: ${resumeParts.join(" | ")}.`, nouveauPrix, "Modification");
    return { success: true };

  } catch (e) {
    Logger.log(`Erreur dans mettreAJourDetailsReservation: ${e.stack}`);
    return { success: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Déplace une réservation à une nouvelle date/heure.
 * @param {string} idReservation L'ID de la réservation à déplacer.
 * @param {string} nouvelleDate La nouvelle date.
 * @param {string} nouvelleHeure La nouvelle heure.
 * @returns {Object} Un résumé de l'opération.
 */
function replanifierReservation(idReservation, nouvelleDate, nouvelleHeure, emailClient, exp, sig) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return { success: false, error: "Le systeme est occupe." };

  try {
    const emailNorm = emailClient ? assertClient(emailClient, exp, sig) : null;
    const idNorm = assertReservationId(idReservation);
    const feuille = SpreadsheetApp.openById(getSecret('ID_FEUILLE_CALCUL')).getSheetByName(SHEET_FACTURATION);
    const indices = getFacturationHeaderIndices_(feuille, ["ID Réservation", "Event ID", "Client (Email)", "Date", "Montant", "Détails"]).indices;
    if (!nouvelleHeure) {
      return { success: false, error: "Merci d'indiquer un horaire valide." };
    }

    const donnees = feuille.getDataRange().getValues();
    const indexLigne = donnees.findIndex(function (row) {
      return String(row[indices["ID Réservation"]]).trim() === idNorm;
    });
    if (indexLigne === -1) return { success: false, error: "Reservation introuvable." };

    const ligneDonnees = donnees[indexLigne];
    const estResident = indices["Resident"] !== undefined && indices["Resident"] !== -1 ? ligneDonnees[indices["Resident"]] === true : false;
    const idEvenementAncien = String(ligneDonnees[indices["Event ID"]]).trim();
    const emailFeuille = String(ligneDonnees[indices["Client (Email)"]]).trim().toLowerCase();
    if (emailNorm && emailFeuille !== emailNorm) return { success: false, error: "Acces non autorise." };
    const details = String(ligneDonnees[indices["Détails"]]);

    const matchTotal = details.match(/(\d+)\s*arrêt\(s\)\s*total\(s\)/);
    const matchSup = matchTotal ? null : details.match(/(\d+)\s*arrêt\(s\)\s*sup/);
    const arrets = matchTotal
      ? Math.max(0, parseInt(matchTotal[1], 10) - 1)
      : matchSup
        ? parseInt(matchSup[1], 10)
        : 0;
    const retour = details.includes('retour: oui');
    const dureeCalculee = DUREE_BASE + ((arrets + (retour ? 1 : 0)) * DUREE_ARRET_SUP);

    const creneauxDisponibles = obtenirCreneauxDisponiblesPourDate(nouvelleDate, dureeCalculee, idEvenementAncien);
    const residentBypass = estResident && typeof RESIDENT_REPLAN_ALLOW_ANY_SLOT !== 'undefined' && RESIDENT_REPLAN_ALLOW_ANY_SLOT === true;
    if (!Array.isArray(creneauxDisponibles) || creneauxDisponibles.length === 0) {
      if (!residentBypass) {
        return { success: false, error: "Aucun créneau disponible pour la plage demandée." };
      }
    } else if (creneauxDisponibles.indexOf(nouvelleHeure) === -1) {
      if (!residentBypass) {
        return { success: false, error: "Ce créneau n'est plus disponible." };
      }
    }

    const [annee, mois, jour] = nouvelleDate.split('-').map(Number);
    const [heure, minute] = nouvelleHeure.split('h').map(Number);
    const nouvelleDateDebut = new Date(annee, mois - 1, jour, heure, minute);
    const nouvelleDateFin = new Date(nouvelleDateDebut.getTime() + dureeCalculee * 60000);
    const totalStops = Math.max(1, arrets + 1);
    const infosTournee = calculerInfosTourneeBase(totalStops, retour, nouvelleDate, nouvelleHeure);

    const tourneeOfferte = indices["Tournée Offerte Appliquée"] !== undefined && indices["Tournée Offerte Appliquée"] !== -1
      ? ligneDonnees[indices["Tournée Offerte Appliquée"]] === true
      : false;
    const typeRemise = indices["Type Remise Appliquée"] !== undefined && indices["Type Remise Appliquée"] !== -1
      ? String(ligneDonnees[indices["Type Remise Appliquée"]] || '').trim()
      : '';
    const valeurRemise = indices["Valeur Remise Appliquée"] !== undefined && indices["Valeur Remise Appliquée"] !== -1
      ? Number(ligneDonnees[indices["Valeur Remise Appliquée"]]) || 0
      : 0;

    let nouveauMontant = infosTournee.prix;
    let nouveauType = infosTournee.typeCourse;
    const nouveauDetails = infosTournee.details;
    const arretsOfferts = typeRemise === 'Arrets Offerts' ? Math.max(0, Math.min(valeurRemise, totalStops - 1)) : 0;

    if (estResident && typeof FORFAIT_RESIDENT !== 'undefined') {
      nouveauMontant = nouveauType === 'Urgent'
        ? FORFAIT_RESIDENT.URGENCE_PRICE
        : FORFAIT_RESIDENT.STANDARD_PRICE;
    }

    if (tourneeOfferte) {
      nouveauMontant = 0;
    } else if (typeRemise === 'Pourcentage' && valeurRemise > 0) {
      nouveauMontant = Math.max(0, nouveauMontant * (1 - valeurRemise / 100));
    } else if (typeRemise === 'Montant Fixe' && valeurRemise > 0) {
      nouveauMontant = Math.max(0, nouveauMontant - valeurRemise);
    } else if (typeRemise === 'Arrets Offerts' && arretsOfferts > 0) {
      const factures = Math.max(1, totalStops - arretsOfferts);
      const urgent = nouveauType === 'Urgent';
      const samedi = nouveauType === 'Samedi';
      const calcul = computeCoursePrice({ totalStops: factures, retour: retour, urgent: urgent, samedi: samedi });
      if (calcul && !calcul.error) {
        nouveauMontant = Math.min(nouveauMontant, calcul.total);
      }
    }

    const clientInfos = obtenirInfosClientParEmail(emailNorm || emailFeuille) || {};
    const nomClient = clientInfos.nom || (emailNorm || emailFeuille);
    const titreEvenement = `Réservation ${NOM_ENTREPRISE} - ${nomClient}`;
    const descriptionEvenement = [
      `Client: ${nomClient} (${emailNorm || emailFeuille})`,
      `ID Réservation: ${idNorm}`,
      `Détails: ${nouveauDetails}`,
      `Total: ${Number(nouveauMontant).toFixed(2)} €`,
      'Note: Déplacé par admin.'
    ].join('\n');
    const nouvelEvenement = CalendarApp.getCalendarById(getSecret('ID_CALENDRIER')).createEvent(
      titreEvenement,
      nouvelleDateDebut,
      nouvelleDateFin,
      { description: descriptionEvenement }
    );

    if (!nouvelEvenement) {
      throw new Error("La création du nouvel événement dans le calendrier a échoué.");
    }

    try {
      if (idEvenementAncien) Calendar.Events.remove(getSecret('ID_CALENDRIER'), idEvenementAncien);
    } catch (e) {
      Logger.log(`L'ancien événement ${idEvenementAncien} n'a pas pu être supprimé (il n'existait probablement plus).`);
    }

    feuille.getRange(indexLigne + 1, indices["Date"] + 1).setValue(nouvelleDateDebut);
    feuille.getRange(indexLigne + 1, indices["Event ID"] + 1).setValue(nouvelEvenement.getId());
    if (indices["Montant"] !== undefined && indices["Montant"] !== -1) {
      feuille.getRange(indexLigne + 1, indices["Montant"] + 1).setValue(nouveauMontant);
    }
    if (indices["Détails"] !== undefined && indices["Détails"] !== -1) {
      feuille.getRange(indexLigne + 1, indices["Détails"] + 1).setValue(nouveauDetails);
    }
    if (indices["Type"] !== undefined && indices["Type"] !== -1) {
      feuille.getRange(indexLigne + 1, indices["Type"] + 1).setValue(nouveauType);
    }

    logActivity(idNorm, emailNorm || emailFeuille, `Déplacement au ${nouvelleDate} à ${nouvelleHeure}.`, nouveauMontant, "Modification");
    return { success: true };

  } catch (e) {
    Logger.log(`Erreur dans replanifierReservation: ${e.stack}`);
    return { success: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

