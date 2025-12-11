// =================================================================
//                      FONCTIONS UTILITAIRES
// =================================================================
// Description: Fonctions d'aide génériques, partagées et 
//              réutilisables dans toute l'application.
// =================================================================

// --- FONCTIONS DE FORMATAGE DE DATE (EXISTANTES) ---

/**
 * Convertit un objet Date en chaîne de caractères au format YYYY-MM-DD.
 * @param {Date} date L'objet Date à convertir.
 * @returns {string} La date formatée ou une chaîne vide si l'entrée est invalide.
 */
function formaterDateEnYYYYMMDD(date) {
  if (!(date instanceof Date) || isNaN(date)) {
    Logger.log(`Erreur dans formaterDateEnYYYYMMDD: l'argument n'est pas une Date valide.`);
    return '';
  }
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

/**
 * Convertit un objet Date en chaîne de caractères au format HHhMM.
 * @param {Date} date L'objet Date à convertir.
 * @returns {string} L'heure formatée ou une chaîne vide si l'entrée est invalide.
 */
function formaterDateEnHHMM(date) {
  if (!(date instanceof Date) || isNaN(date)) {
    Logger.log(`Erreur dans formaterDateEnHHMM: l'argument n'est pas une Date valide.`);
    return '';
  }
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "HH'h'mm");
}

/**
 * Formate une date selon un format et un fuseau horaire personnalisés.
 * @param {Date} date L'objet Date à formater.
 * @param {string} format Le format de sortie (ex: "dd/MM/yyyy HH:mm").
 * @param {string} [fuseauHoraire="Europe/Paris"] Le fuseau horaire à utiliser.
 * @returns {string} La date formatée ou une chaîne vide en cas d'erreur.
 */
function formaterDatePersonnalise(date, format, fuseauHoraire = "Europe/Paris") {
  if (!(date instanceof Date) || isNaN(date)) {
    Logger.log(`Erreur dans formaterDatePersonnalise: l'argument n'est pas une Date valide.`);
    return '';
  }
  try {
    return Utilities.formatDate(date, fuseauHoraire, format);
  } catch (e) {
    Logger.log(`Erreur de formatage dans formaterDatePersonnalise: ${e.message}`);
    return '';
  }
}

/**
 * Retourne le mois en toutes lettres au format français (ex: "aout 2025").
 * @param {Date} date
 * @returns {string}
 */
function formatMoisFrancais(date) {
  if (!(date instanceof Date) || isNaN(date)) {
    return '';
  }
  const mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  return `${mois[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Formate un montant en euros avec la convention française.
 * @param {number|string} valeur
 * @returns {string}
 */
function formatMontantEuro(valeur) {
  const nombre = Number(valeur);
  if (!isFinite(nombre)) {
    return '';
  }
  return nombre.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Normalise un code postal français saisi en entrée.
 * @param {string|number} code Valeur saisie par l'utilisateur.
 * @returns {string} Code postal sur 5 chiffres ou chaîne vide si invalide.
 */
function normaliserCodePostal(code) {
  if (code === null || code === undefined) {
    return '';
  }
  const brut = String(code).trim().toUpperCase();
  if (!brut) {
    return '';
  }
  const digits = brut.replace(/[^\d]/g, '');
  if (digits.length !== 5) {
    return '';
  }
  return digits;
}

/**
 * Remplace un placeholder par une image Drive (logo) dans un document Google Docs.
 * @param {GoogleAppsScript.Document.Body} corps
 * @param {string} placeholder Texte à remplacer (ex: {{logo}})
 * @param {string|null} fileId ID du fichier Drive
 * @param {number} [largeurMax] Largeur maximale en pixels
 * @returns {boolean} true si une image a été insérée
 */
function insererImageDepuisPlaceholder(corps, placeholder, fileId, largeurMax, fallbackBlob) {
  try {
    let blob = null;
    if (fileId) {
      blob = DriveApp.getFileById(fileId).getBlob();
    } else if (fallbackBlob) {
      blob = fallbackBlob;
    }
    if (!blob) return false;

    if (blob.getContentType() === 'image/svg+xml') {
      try {
        blob = blob.getAs(MimeType.PNG);
      } catch (e) {
        Logger.log('Impossible de convertir le SVG du logo en PNG: ' + e.message);
      }
    }

    let range = corps.findText(placeholder);
    let insere = false;
    while (range) {
      const elementTexte = range.getElement();
      if (!elementTexte) break;
      const paragraphe = elementTexte.getParent().asParagraph();
      paragraphe.clear();
      const image = paragraphe.insertInlineImage(0, blob);
      if (largeurMax && image.getWidth() > largeurMax) {
        const ratio = image.getHeight() / image.getWidth();
        image.setWidth(largeurMax);
        image.setHeight(Math.round(largeurMax * ratio));
      }
      insere = true;
      range = corps.findText(placeholder);
    }
    return insere;
  } catch (e) {
    Logger.log(`Impossible d'insérer l'image pour ${placeholder}: ${e.message}`);
    return false;
  }
}

/**
 * Récupère le logo depuis Drive (secret ID_LOGO) et le retourne sous forme de blob.
 * @returns {GoogleAppsScript.Base.Blob|null}
 */
function getLogoSvgBlob() {
  const blob = getLogoBlob();
  if (blob) return blob;
  // Fallback legacy: tente de récupérer un éventuel SVG statique dans Logo.html
  try {
    let svg = loadInlineSvgFromFile('Logo');
    if (!svg) {
      svg = loadInlineSvgFromFile('Logo_Fallback_SVG');
    }
    if (!svg) return null;
    return Utilities.newBlob(svg, 'image/svg+xml', 'logo.svg');
  } catch (e) {
    Logger.log('Impossible de récupérer un logo statique: ' + e.message);
    return null;
  }
}

function loadInlineSvgFromFile(filename) {
  try {
    const template = HtmlService.createTemplateFromFile(filename);
    const content = template.getCode();
    if (!content) return '';
    const match = content.match(/<svg[\s\S]*?<\/svg>/i);
    return match ? match[0] : '';
  } catch (e) {
    return '';
  }
}

/**
 * Récupère le logo principal sous forme de blob depuis Drive.
 * @returns {GoogleAppsScript.Base.Blob|null}
 */
function getLogoBlob() {
  try {
    const fileId = getSecret('ID_LOGO');
    if (!fileId) return null;
    const file = DriveApp.getFileById(fileId);
    if (!file) return null;
    return file.getBlob();
  } catch (e) {
    Logger.log('Impossible de récupérer le logo Drive: ' + e.message);
    return null;
  }
}

/**
 * Retourne une data URL (PNG si possible) du logo pour une utilisation dans des e-mails HTML.
 * @returns {string} Data URL ou chaîne vide en cas d'erreur.
 */
function getLogoDataUrl() {
  try {
    const driveLogo = blobToDataUrl(getLogoBlob());
    if (driveLogo) {
      return driveLogo;
    }

    const bundledLogo = getBundledLogoDataUrl();
    if (bundledLogo) {
      return bundledLogo;
    }

    return blobToDataUrl(getLogoSvgBlob());
  } catch (e) {
    Logger.log('Impossible de générer la data URL du logo: ' + e.message);
    return '';
  }
}

/**
 * Convertit un blob d'image en data URL.
 * @param {GoogleAppsScript.Base.Blob} blob
 * @returns {string}
 */
function blobToDataUrl(blob) {
  if (!blob) {
    return '';
  }
  try {
    let safeBlob = blob;
    if (safeBlob.getContentType() === 'image/svg+xml') {
      try {
        safeBlob = safeBlob.getAs(MimeType.PNG);
      } catch (conversionError) {
        Logger.log('Logo: conversion SVG -> PNG échouée, utilisation du SVG brut. ' + conversionError.message);
      }
    }
    const bytes = safeBlob.getBytes();
    if (!bytes || !bytes.length) {
      return '';
    }
    const contentType = safeBlob.getContentType() || 'image/png';
    const base64 = Utilities.base64Encode(bytes);
    return 'data:' + contentType + ';base64,' + base64;
  } catch (error) {
    Logger.log('Impossible de convertir le blob du logo en data URL: ' + error.message);
    return '';
  }
}

/**
 * Charge la data URL du logo 3D embarqué dans le dépôt.
 * @returns {string}
 */
function getBundledLogoDataUrl() {
  try {
    const output = HtmlService.createHtmlOutputFromFile('Logo3D_b64');
    if (!output) {
      return '';
    }
    const content = (output.getContent() || '').trim();
    if (!content) {
      return '';
    }
    const match = content.match(/data:image\/[a-z0-9.+-]+;base64,[^'"<>\s]+/i);
    if (match && match[0]) {
      return match[0];
    }
    return content
      .replace(/<\?!=?\s*['"]?/, '')
      .replace(/['"]?\s*\?>/, '')
      .replace(/\s+/g, '');
  } catch (e) {
    Logger.log('Impossible de charger la data URL du logo embarqué: ' + e.message);
    return '';
  }
}

/**
 * Retourne une URL publique (Google Drive) pour le logo.
 * @returns {string}
 */
function getLogoPublicUrl() {
  let url = '';
  try {
    const fileId = getSecret('ID_LOGO');
    if (fileId) {
      url = 'https://drive.google.com/uc?export=view&id=' + encodeURIComponent(fileId);
    }
  } catch (e) {
    Logger.log('Impossible de récupérer l’ID_LOGO: ' + e.message);
  }
  if (!url && typeof BRANDING_LOGO_PUBLIC_URL === 'string' && BRANDING_LOGO_PUBLIC_URL) {
    url = BRANDING_LOGO_PUBLIC_URL;
  }
  if (!url && typeof BRANDING !== 'undefined' && BRANDING && typeof BRANDING.LOGO_URL === 'string' && BRANDING.LOGO_URL) {
    url = BRANDING.LOGO_URL;
  }
  return url || '';
}

/**
 * Construit un bloc HTML prêt à être injecté dans un e-mail avec le logo de l'entreprise.
 * @returns {string} HTML contenant le logo ou chaîne vide.
 */
function getLogoEmailBlockHtml() {
  try {
    const dataUrl = getLogoDataUrl();
    if (!dataUrl) return '';
    const altText = 'Logo ' + (typeof NOM_ENTREPRISE !== 'undefined' ? NOM_ENTREPRISE : 'EL Services');
    return '<div style="text-align:center;margin:0 0 24px;">' +
      '<img src="' + dataUrl + '" alt="' + altText + '" style="max-width:160px;width:100%;height:auto;display:inline-block;" />' +
      '</div>';
  } catch (e) {
    Logger.log('Impossible de générer le bloc e-mail du logo: ' + e.message);
    return '';
  }
}

/**
 * Encode un sujet d'e-mail en UTF-8 conformément à RFC 2047.
 * @param {string} subjectText Texte brut du sujet.
 * @returns {string} Sujet encodé ou chaîne vide.
 */
function encodeMailSubjectUtf8(subjectText) {
  const raw = subjectText || '';
  if (!raw) {
    return '';
  }
  const bytes = Utilities.newBlob(raw, 'text/plain').getBytes();
  return '=?UTF-8?B?' + Utilities.base64Encode(bytes) + '?=';
}


// --- NOUVELLES FONCTIONS UTILITAIRES AJOUTÉES ---

/**
 * Convertit un montant en euros vers des centimes (entier).
 * @param {number|string} n Montant en euros.
 * @returns {number} Montant en centimes.
 */
function toCents(n) {
  return Math.round(Number(n) * 100);
}

/**
 * Convertit un montant en centimes vers une chaîne en euros.
 * @param {number} c Montant en centimes.
 * @returns {string} Montant formaté en euros avec 2 décimales.
 */
function fromCents(c) {
  return (c / 100).toFixed(2);
}

/**
 * Génère un numéro de facture séquentiel unique par année.
 * Format: AAAA-0001.
 * @returns {string} Numéro de facture.
 */
function nextInvoiceNumber() {
  const lock = LockService.getScriptLock();
  lock.tryLock(5000);
  try {
    const props = PropertiesService.getScriptProperties();
    const year = new Date().getFullYear();
    const key = `INV_SEQ_${year}`;
    const cur = Number(props.getProperty(key) || '0') + 1;
    props.setProperty(key, String(cur));
    return `${year}-${String(cur).padStart(4, '0')}`;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Valide les en-têtes d'une feuille et retourne leurs indices de colonne.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} feuille La feuille à vérifier.
 * @param {Array<string>} enTetesRequis La liste des en-têtes requis.
 * @returns {Object} Un objet mappant les noms d'en-tête à leurs indices.
 */
function obtenirIndicesEnTetes(feuille, enTetesRequis) {
  if (!feuille) throw new Error("La feuille fournie à obtenirIndicesEnTetes est nulle.");
  if (feuille.getLastRow() < 1) throw new Error(`La feuille "${feuille.getName()}" est vide.`);
  const enTete = feuille.getRange(1, 1, 1, feuille.getLastColumn()).getValues()[0];
  const indices = {};
  const enTetesManquants = enTetesRequis.filter(reqHeader => {
    const index = enTete.findIndex(h => String(h).trim() === reqHeader);
    if (index !== -1) {
      indices[reqHeader] = index;
      return false;
    }
    return true;
  });
  if (enTetesManquants.length > 0) {
    throw new Error(`Colonne(s) manquante(s) dans "${feuille.getName()}": ${enTetesManquants.join(', ')}`);
  }
  return indices;
}

// -----------------------------------------------------------------
//           Mapping centralisé des en-têtes de "Facturation"
// -----------------------------------------------------------------
// Canonique: on reprend FACTURATION_HEADERS si disponible, sinon un fallback identique.
const FACTURATION_HEADERS_CANONICAL = (typeof FACTURATION_HEADERS !== 'undefined' && Array.isArray(FACTURATION_HEADERS))
  ? FACTURATION_HEADERS
  : ['Date','Client (Raison S. Client)','Client (Email)','Type','Détails','Montant','Statut','Valider','N° Facture','Event ID','ID Réservation','Note Interne','Tournée Offerte Appliquée','Type Remise Appliquée','Valeur Remise Appliquée','Lien Note'];
const FACTURATION_HEADERS_OPTIONAL = ['ID PDF', 'Email à envoyer', 'Resident', 'ID Devis'];
const FACTURATION_HEADER_ALIASES = {
  'Date': ['date prestation', 'date course'],
  'Client (Raison S. Client)': ['client', 'client nom', 'raison sociale', 'raison sociale client', 'client (nom)'],
  'Client (Email)': ['email', 'e-mail', 'mail', 'courriel', 'email client', 'client email', 'adresse mail'],
  'Type': ['type course', 'categorie'],
  'Détails': ['details', 'detail', 'description', 'prestation', 'course'],
  'Montant': ['total', 'prix', 'amount', 'montant ttc', 'montant ht'],
  'Statut': ['status', 'etat'],
  'Valider': ['a valider', 'à valider', 'validation', 'a envoyer', 'à envoyer'],
  'N° Facture': ['numero facture', 'num facture', 'no facture', 'n facture', 'facture numero', 'facture #'],
  'Event ID': ['id event', 'id evenement', 'id événement', 'calendar id'],
  'ID Réservation': ['id reservation', 'reservation id', 'resa id'],
  'Note Interne': ['note interne', 'notes', 'note', 'commentaire'],
  'Tournée Offerte Appliquée': ['tournee offerte appliquee', 'tournee offerte', 'course offerte'],
  'Type Remise Appliquée': ['type remise appliquee', 'type remise', 'remise type'],
  'Valeur Remise Appliquée': ['valeur remise appliquee', 'valeur remise', 'remise valeur', 'remise montant'],
  'Lien Note': ['lien note', 'note lien', 'url note'],
  'ID PDF': ['id pdf', 'pdf id', 'pdf'],
  'Email à envoyer': ['email a envoyer', 'email envoyer', 'a envoyer email'],
  'Resident': ['resident', 'résident', 'residente'],
  'ID Devis': ['id devis', 'devis id']
};

function normalizeHeaderValue_(value) {
  return String(value || '')
    .replace(/\u00A0/g, ' ')
    .replace(/[°º]/g, 'o')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function buildFacturationHeaderIndex_(headers) {
  const normalizedHeaders = headers.map(normalizeHeaderValue_);
  const allCanon = Array.from(new Set([].concat(FACTURATION_HEADERS_CANONICAL, FACTURATION_HEADERS_OPTIONAL)));
  const indexMap = {};
  const resolvedNames = {};

  allCanon.forEach(function(name) {
    const target = normalizeHeaderValue_(name);
    const aliases = (FACTURATION_HEADER_ALIASES[name] || []).map(normalizeHeaderValue_);
    const idx = normalizedHeaders.findIndex(function(h) {
      if (!h) return false;
      if (h === target) return true;
      return aliases.indexOf(h) !== -1;
    });
    if (idx !== -1) {
      indexMap[name] = idx;
      resolvedNames[name] = headers[idx];
    }
  });

  return { indexMap: indexMap, resolvedNames: resolvedNames, normalizedHeaders: normalizedHeaders };
}

/**
 * Retourne les indices des en-têtes de l'onglet Facturation en s'alignant sur le Sheet.
 * Accepte des alias fréquents (ex: "Email" au lieu de "Client (Email)") sans toucher au Sheet.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {string[]=} requiredHeaders Liste personnalisée d'en-têtes à rendre obligatoires.
 * @returns {{header: *, indices: Object, resolved: Object}}
 */
function getFacturationHeaderIndices_(sheet, requiredHeaders) {
  if (!sheet) throw new Error("Feuille 'Facturation' introuvable.");
  const header = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
  const { indexMap, resolvedNames } = buildFacturationHeaderIndex_(header);
  const required = (requiredHeaders && requiredHeaders.length) ? requiredHeaders : FACTURATION_HEADERS_CANONICAL;
  const missing = required.filter(function(name) { return typeof indexMap[name] === 'undefined'; });
  if (missing.length) {
    throw new Error(`Colonnes manquantes dans "${sheet.getName()}": ${missing.join(', ')}`);
  }
  return { header: header, indices: indexMap, resolved: resolvedNames };
}

/**
 * Obtient un dossier par son nom dans un dossier parent, ou le crée s'il n'existe pas.
 * @param {GoogleAppsScript.Drive.Folder} dossierParent Le dossier parent.
 * @param {string} nomDossier Le nom du dossier à trouver ou créer.
 * @returns {GoogleAppsScript.Drive.Folder} Le dossier trouvé ou créé.
 */
function obtenirOuCreerDossier(dossierParent, nomDossier) {
  if (!dossierParent) {
    throw new Error('Dossier parent absent dans obtenirOuCreerDossier pour "' + nomDossier + '".');
  }
  const getFoldersByName = dossierParent.getFoldersByName;
  if (typeof getFoldersByName !== 'function') {
    throw new Error('Objet parent invalide (pas de getFoldersByName) pour "' + nomDossier + '".');
  }
  const dossiers = getFoldersByName.call(dossierParent, nomDossier);
  if (dossiers.hasNext()) {
    return dossiers.next();
  }
  return dossierParent.createFolder(nomDossier);
}

/**
 * Trouve le tableau du bordereau dans un document Google Docs.
 * @param {GoogleAppsScript.Document.Body} corps Le corps du document Google Docs.
 * @returns {GoogleAppsScript.Document.Table|null} Le tableau trouvé ou null.
 */
function trouverTableBordereau(corps) {
  // Autorise des variations (accents, casse, synonymes) et retourne aussi la correspondance de colonnes.
  const expected = {
    date: ["date"],
    heure: ["heure", "horaire"],
    details: ["details de la course", "details", "detail", "description", "prestation"],
    notes: ["notes", "note", "commentaire", "remarque", "observations"],
    remise: ["remise", "reductions", "discount", "offerte"],
    montant: ["montant ht", "montant", "montant ttc", "total ht", "total ttc", "total"]
  };
  const required = ['date', 'heure', 'details', 'montant'];

  const normalize = s => String(s || "")
    .replace(/\u00A0/g, " ")
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/\s+/g, ' ');

  const tables = corps.getTables();
  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    if (table.getNumRows() === 0) continue;
    const headerRow = table.getRow(0);

    const columns = {};
    for (let col = 0; col < headerRow.getNumCells(); col++) {
      const text = normalize(headerRow.getCell(col).getText());
      Object.keys(expected).forEach(key => {
        if (columns[key] !== undefined) return;
        if (expected[key].some(token => text.includes(token))) {
          columns[key] = col;
        }
      });
    }

    const ok = required.every(key => columns[key] !== undefined);
    if (ok) {
      return { table: table, columns: columns };
    }
  }
  return null;
}

/**
 * Test helper: journalise les en-têtes trouvés dans le modèle de facture.
 * Exécuter via `npx clasp run test_logHeadersModeleFacture`.
 */
function test_logHeadersModeleFacture() {
  const fileId = getSecret('ID_MODELE_FACTURE');
  const doc = DocumentApp.openById(fileId);
  const corps = doc.getBody();
  const tables = corps.getTables();
  const headers = [];
  for (let i = 0; i < tables.length; i++) {
    const t = tables[i];
    if (t.getNumRows() === 0) continue;
    const r0 = t.getRow(0);
    const cols = [];
    for (let c = 0; c < r0.getNumCells(); c++) {
      cols.push(r0.getCell(c).getText());
    }
    headers.push(cols.join(' | '));
  }
  Logger.log('Tables dans le modèle:');
  headers.forEach((h, idx) => Logger.log(`#${idx + 1}: ${h}`));
  const res = trouverTableBordereau(corps);
  if (res) {
    Logger.log(`Table bordereau détectée: colonnes ${JSON.stringify(res.columns)}`);
  } else {
    Logger.log('Aucun tableau de bordereau détecté par la fonction.');
  }
  return headers;
}

/**
 * Journalise une tentative de connexion échouée dans SHEET_LOGS.
 * @param {string} email Adresse e-mail du client.
 * @param {string} ip Adresse IP source.
 */
function logFailedLogin(email, ip) {
  try {
    const ss = SpreadsheetApp.openById(getSecret('ID_FEUILLE_CALCUL'));
    let feuilleLog = ss.getSheetByName(SHEET_LOGS);
    if (!feuilleLog) {
      feuilleLog = ss.insertSheet('Logs');
      feuilleLog.appendRow(['Timestamp', 'Reservation ID', 'Client Email', 'Résumé', 'Montant', 'Statut']);
    }
    feuilleLog.appendRow([new Date(), '', email, `Connexion échouée (IP: ${ip || 'N/A'})`, '', 'Échec']);
  } catch (e) {
    Logger.log(`Impossible de journaliser l'échec de connexion : ${e.toString()}`);
  }
}

// --- FONCTIONS PARTAGÉES DÉPLACÉES DE Code.gs ---

/**
 * Journalise la requête entrante.
 * @param {Object} e L'objet d'événement de la requête.
 */
function logRequest(e) {
  const dateIso = new Date().toISOString();
  const route = e && e.parameter && e.parameter.page ? e.parameter.page : '';
  const ua = e && e.headers ? e.headers['User-Agent'] : '';
  Logger.log(`[Request] ${dateIso} route=${route} ua=${ua}`);
}

/**
 * Permet d'inclure des fichiers (CSS, JS) dans les templates HTML.
 * @param {string} nomFichier Le nom du fichier à inclure.
 * @returns {string} Le contenu du fichier.
 */
function include(nomFichier) {
  const label = (typeof nomFichier === 'string') ? nomFichier.trim() : '';
  if (!label) {
    console.error('Fichier inclus introuvable: ' + String(nomFichier) + ' (nom invalide)\nStack: ' + (new Error().stack || ''));
    return '';
  }
  try {
    return HtmlService.createTemplateFromFile(label).evaluate().getContent();
  } catch (e) {
    console.error('Fichier inclus introuvable: ' + label + ' (' + e.message + ')\nStack: ' + (e && e.stack ? e.stack : ''));
    return '';
  }
}

// Thèmes désactivés: pas de thème utilisateur

/**
 * Récupère un secret depuis les Script Properties.
 * @param {string} name Nom de la propriété.
 * @returns {string} Valeur du secret.
 * @throws {Error} Si la propriété est absente.
 */
function getSecret(name) {
  const sp = PropertiesService.getScriptProperties();
  let value = sp.getProperty(name);
  if (value === null || value === '') {
    if (name === 'DOSSIER_PUBLIC_FOLDER_ID') {
      value = sp.getProperty('DOCS_PUBLIC_FOLDER_ID');
    } else if (name === 'DOCS_PUBLIC_FOLDER_ID') {
      value = sp.getProperty('DOSSIER_PUBLIC_FOLDER_ID');
    }
  }
  if (value === null || value === '') {
    throw new Error(`Propriété manquante: ${name}`);
  }
  return normalizeSecretValue_(name, value);
}

/**
 * Normalise les valeurs de Script Properties susceptibles de contenir une URL.
 * Permet de supporter les liens de partage Drive/Docs/Calendar plutôt que l'ID brut.
 * @param {string} name Nom de la propriété.
 * @param {string} raw Valeur récupérée.
 * @returns {string} Valeur normalisée.
 */
function normalizeSecretValue_(name, raw) {
  if (typeof raw !== 'string') {
    return raw;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return trimmed;
  }

  // Extraction de l'ID depuis une URL de partage si nécessaire.
  let candidate = trimmed;
  if (/^https?:\/\//i.test(trimmed)) {
    const extracted = extractIdFromUrl_(trimmed);
    if (extracted) {
      candidate = extracted;
    }
  }

  if (name === 'ID_CALENDRIER') {
    return normalizeCalendarId_(candidate);
  }
  return candidate;
}

/**
 * Extrait un identifiant Google depuis une URL.
 * Gère Drive (folders/file), Docs, Sheets ainsi que les paramètres ?id= / ?cid=.
 * @param {string} url URL potentielle.
 * @returns {string|null} Identifiant détecté ou null.
 */
function extractIdFromUrl_(url) {
  const patterns = [
    /\/d\/([a-zA-Z0-9_-]+)/i,
    /\/folders\/([a-zA-Z0-9_-]+)/i,
    /[?&]id=([a-zA-Z0-9_-]+)/i,
    /[?&]cid=([^&]+)/i,
    /[?&]src=([^&]+)/i
  ];
  for (var i = 0; i < patterns.length; i++) {
    var match = patterns[i].exec(url);
    if (match && match[1]) {
      var value = match[1];
      try {
        value = decodeURIComponent(value);
      } catch (e) {
        // ignore decode errors and return raw match
      }
      return value;
    }
  }
  return null;
}

/**
 * Normalise un identifiant de calendrier (gère les URL encodées et mailto:).
 * @param {string} rawId Identifiant tel que saisi.
 * @returns {string} Identifiant utilisable par CalendarApp.
 */
function normalizeCalendarId_(rawId) {
  if (!rawId) {
    return rawId;
  }
  var id = rawId;
  if (/^https?:\/\//i.test(id)) {
    var fromUrl = extractIdFromUrl_(id);
    if (fromUrl) {
      id = fromUrl;
    }
  }
  id = id.replace(/^mailto:/i, '');
  try {
    id = decodeURIComponent(id);
  } catch (e) {
    // ignore decode errors, keep original value
  }
  return id.trim();
}

/**
 * Enregistre un secret dans les Script Properties.
 * @param {string} name Nom de la propriété.
 * @param {string} value Valeur à stocker.
 */
function setSecret(name, value) {
  PropertiesService.getScriptProperties().setProperty(name, value);
}

/**
 * Vérifie un lien signé pour l'espace client.
 * Le lien doit contenir email, exp (timestamp secondes) et sig (Base64 HMAC-SHA256 de "email|exp").
 * @param {string} email
 * @param {string|number} expSeconds
 * @param {string} sigBase64
 * @returns {boolean}
 */
function verifySignedLink(email, expSeconds, sigBase64) {
  try {
    if (!email || !expSeconds || !sigBase64) return false;
    const exp = Number(expSeconds);
    if (!isFinite(exp)) return false;
    const nowSec = Math.floor(Date.now() / 1000);
    const ttl = (typeof CLIENT_PORTAL_LINK_TTL_HOURS !== 'undefined' ? Number(CLIENT_PORTAL_LINK_TTL_HOURS) : 24) * 3600;
    if (exp < nowSec || exp - nowSec > ttl) return false;
    const secret = getSecret('ELS_SHARED_SECRET');
    if (!secret) return false;
    const data = `${String(email).trim().toLowerCase()}|${exp}`;
    const rawSig = Utilities.computeHmacSha256Signature(data, secret);
    const expected = Utilities.base64Encode(rawSig);
    const expectedWeb = Utilities.base64EncodeWebSafe(rawSig);
    return sigBase64 === expected || sigBase64 === expectedWeb;
  } catch (e) {
    return false;
  }
}

/**
 * Génère un lien signé pour l'Espace Client.
 * Sig = Base64(HMAC-SHA256("email|exp", ELS_SHARED_SECRET)) (web-safe)
 * @param {string} email Adresse e-mail du client.
 * @param {number} [ttlSeconds=86400] Durée de validité en secondes (défaut 24h).
 * @returns {{url:string, exp:number}} URL complète + timestamp d'expiration.
 */
function generateSignedClientLink(email, ttlSeconds) {
  if (!email) throw new Error('Email requis');
  const ttl = (Number(ttlSeconds) > 0 ? Number(ttlSeconds) : (typeof CLIENT_PORTAL_LINK_TTL_HOURS !== 'undefined' ? Number(CLIENT_PORTAL_LINK_TTL_HOURS) : 24) * 3600);
  const exp = Math.floor(Date.now() / 1000) + ttl;
  const secret = getSecret('ELS_SHARED_SECRET');
  if (!secret) throw new Error('Secret manquant: ELS_SHARED_SECRET');
  const data = `${String(email).trim().toLowerCase()}|${exp}`;
  const sig = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(data, secret));
  let baseUrl = (typeof CLIENT_PORTAL_BASE_URL !== 'undefined' && CLIENT_PORTAL_BASE_URL)
    ? CLIENT_PORTAL_BASE_URL
    : (ScriptApp.getService().getUrl() || '');

  // Si aucune URL n'est trouvée (contexte trigger/console), on utilise un placeholder
  // plutôt que de planter, ce qui permet au reste du code (envoi d'email) de fonctionner.
  if (!baseUrl) {
    Logger.log('AVERTISSEMENT: URL de service indisponible. Utilisation d\'une URL placeholder.');
    baseUrl = 'https://script.google.com/macros/s/PLEASE_CONFIGURE_CLIENT_PORTAL_BASE_URL/exec';
  }

  const url = `${baseUrl}?page=gestion&email=${encodeURIComponent(email)}&exp=${exp}&sig=${encodeURIComponent(sig)}`;
  return { url: url, exp: exp };
}

/**
 * Envoie un email de manière sécurisée avec gestion d'erreurs et fallback.
 * Remplace les appels directs à GmailApp.sendEmail pour éviter les échecs silencieux.
 * @param {string} recipient Email du destinataire
 * @param {string} subject Sujet de l'email
 * @param {string} body Corps texte de l'email
 * @param {Object} options Options (htmlBody, replyTo, attachments, etc.)
 * @returns {boolean} true si envoyé avec succès, false sinon.
 */
function safeSendEmail(recipient, subject, body, options) {
  try {
    if (!recipient) {
      Logger.log('safeSendEmail: destinataire manquant.');
      return false;
    }

    // --- MODIFICATION: BCC Admin sur tous les emails sortants ---
    try {
      // Récupération sécurisée de l'email admin pour copie cachée
      // On utilise PropertiesService directement pour éviter les dépendances circulaires ou Config manquant
      var adminEmail = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL');
      if (adminEmail && adminEmail.indexOf('@') > 0) {
        // Normalisation
        adminEmail = adminEmail.trim();

        // On évite de s'auto-envoyer un mail si l'admin est le destinataire principal
        // ou s'il est déjà en CC/BCC (simple check de string)
        var recipientStr = String(recipient || '').toLowerCase();

        // Si l'admin n'est pas le destinataire principal
        if (recipientStr.indexOf(adminEmail.toLowerCase()) === -1) {
          options = options || {};

          // Gestion du BCC existant
          if (options.bcc) {
            // Si l'admin n'est pas déjà dans le BCC
            if (options.bcc.toLowerCase().indexOf(adminEmail.toLowerCase()) === -1) {
              options.bcc = options.bcc + ',' + adminEmail;
            }
          } else {
            options.bcc = adminEmail;
          }
        }
      }
    } catch (errBcc) {
      Logger.log('Erreur lors de l\'ajout du BCC Admin: ' + errBcc.toString());
      // On continue l'envoi même si le BCC échoue
    }
    // ------------------------------------------------------------

    // Tentative principale avec GmailApp
    GmailApp.sendEmail(recipient, subject, body, options);
    Logger.log(`Email envoyé avec succès à ${recipient} (via GmailApp).`);
    return true;
  } catch (e) {
    Logger.log(`ERREUR lors de l'envoi GmailApp à ${recipient}: ${e.toString()}`);

    // Tentative de fallback avec MailApp (parfois les scopes ou quotas diffèrent)
    try {
      Logger.log('Tentative de fallback via MailApp...');
      const mailOptions = {
        to: recipient,
        subject: subject,
        body: body
      };
      if (options) {
        if (options.htmlBody) mailOptions.htmlBody = options.htmlBody;
        if (options.replyTo) mailOptions.replyTo = options.replyTo;
        if (options.name) mailOptions.name = options.name;
        if (options.attachments) mailOptions.attachments = options.attachments;
        if (options.cc) mailOptions.cc = options.cc;
        if (options.bcc) mailOptions.bcc = options.bcc;
      }
      MailApp.sendEmail(mailOptions);
      Logger.log(`Email envoyé avec succès à ${recipient} (via MailApp fallback).`);
      return true;
    } catch (e2) {
      Logger.log(`ECHEC FINAL d'envoi d'email à ${recipient}: ${e2.toString()}`);
      return false;
    }
  }
}

/**
 * Retourne l'ensemble des drapeaux de configuration exposés au client.
 * @returns {Object} Drapeaux issus de Configuration.gs.
 */
function getConfiguration() {
  return Object.assign({}, FLAGS);
}

/**
 * Vérifie le lien signé et normalise l'email.
 * @param {string} email
 * @param {string|number} exp
 * @param {string} sig
 * @returns {string} Email normalisé.
 * @throws {Error} Si le lien ou l'email est invalide.
 */
function assertClient(email, exp, sig) {
  const emailNorm = String(email || '').trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailNorm)) throw new Error('Email invalide.');
  if (typeof CLIENT_PORTAL_SIGNED_LINKS !== 'undefined' && CLIENT_PORTAL_SIGNED_LINKS) {
    if (!verifySignedLink(emailNorm, exp, sig)) throw new Error('Lien invalide.');
  }
  return emailNorm;
}

/**
 * Valide et normalise un identifiant de réservation.
 * @param {string|number} id
 * @returns {string} Identifiant normalisé.
 * @throws {Error} Si l'identifiant est vide.
 */
function assertReservationId(id) {
  const norm = String(id || '').trim();
  if (!norm) throw new Error('ID réservation invalide.');
  return norm;
}
