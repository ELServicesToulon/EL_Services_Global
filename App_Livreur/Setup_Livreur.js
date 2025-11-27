/**
 * =================================================================
 * SETUP LIVREUR - CONFIGURATION INITIALE
 * =================================================================
 * Auteur: Jules (via Assistant)
 * Description: Ce script initialise les propriétés et la structure
 *              de la base de données (Google Sheet) pour l'app livreur.
 * À exécuter une seule fois depuis l'éditeur Apps Script.
 */

// =================================================================
// FONCTION PRINCIPALE DE SETUP
// =================================================================

/**
 * Exécute toutes les tâches de configuration nécessaires.
 * C'est la fonction à lancer manuellement depuis l'éditeur.
 */
function setupInitial() {
  setupProperties();
  creerFeuilleLivreurs();

  // Affiche un message de succès à la fin, avec un fallback pour les contextes non-UI.
  try {
    SpreadsheetApp.getUi().alert('Configuration de l\'application Livreur terminée avec succès !');
  } catch(e) {
    // Si l'UI n'est pas disponible (ex: exécution depuis un trigger), on log simplement.
    console.log('Configuration de l\'application Livreur terminée avec succès ! (UI non disponible)');
  }
}

// =================================================================
// 1. CONFIGURATION DES PROPRIÉTÉS DU SCRIPT
// =================================================================

/**
 * Enregistre les propriétés essentielles (IDs, clés API, etc.)
 * dans le PropertiesService du script pour un accès sécurisé.
 */
function setupProperties() {
  const properties = {
    // ID de la feuille de calcul principale
    "ID_FEUILLE_CALCUL": "1AzWdQQ4UEq0Fvr_iTpDY5TiXn55ij30_okIxIG5p_OM",

    // Informations sur l'entreprise (pourrait être utilisé plus tard)
    "NOM_ENTREPRISE": "EL Services",
    "EMAIL_ENTREPRISE": "elservicestoulon@gmail.com",
    "ADRESSE_ENTREPRISE": "255 B Avenue Marcel Castié, 83000 Toulon",
    "SIRET": "48091306000020",
    "RIB_ENTREPRISE": "FR76 4061 8804 7600 0403 5757 187",
    "BIC_ENTREPRISE": "BOUS FRPP XXX",

    // E-mail de l'administrateur pour les notifications
    "ADMIN_EMAIL": "elservicestoulon@gmail.com",

    // IDs de ressources Drive
    "ID_LOGO": "1p10Rb3QBn3tUUs2M5zNiQzPn1YxnoPIW",
    "ID_DOSSIER_FACTURES": "1IGMRLuYcBnGzjWS9StI6slZjnkz8fa84",
    "ID_DOSSIER_ARCHIVES": "1HLBar6IvpJgrG_lfyRSKwNwib6U__w9U",
    "ID_DOSSIER_TEMPORAIRE": "1Rel3nGZBfUnt36WuuJ_IJVRmskEAFN9Y",

    // Secrets et clés (à garder confidentiel)
    "GEMINI_API_KEY": "AIza...........secret", // Exemple, la vraie valeur est gardée en secret
    "ELS_SHARED_SECRET": "Boofi",
    "TRACE_SECRET": "ODE0ZTlkZTAtNGFmYy00NzkxLWEyMWEtZmIxOGEwOTUyZDkzMjUzYTU5ZjctNTQxOS00ZDFhLWFmMDYtNzgxZjUzYjZhOGExODM0Y2RlMWItNjMyZS00NTQwLTk4NjctMTQ2NTAxMmI0MTA3"

    // Note: D'autres propriétés comme ID_MODELE_FACTURE, etc. ont été omises
    // car elles semblent moins pertinentes pour l'app livreur seule.
    // On peut les rajouter au besoin.
  };

  PropertiesService.getScriptProperties().setProperties(properties, false); // `false` pour ne pas effacer les autres propriétés
  console.log('Les propriétés du script ont été enregistrées.');
}

// =================================================================
// 2. CRÉATION DE LA FEUILLE "LISTE LIVREURS"
// =================================================================

/**
 * Crée l'onglet "liste livreurs" dans la feuille de calcul
 * et le remplit avec la liste des personnages des Fous du Volant.
 */
function creerFeuilleLivreurs() {
  const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('ID_FEUILLE_CALCUL');
  if (!SPREADSHEET_ID) {
    throw new Error("L'ID de la feuille de calcul n'est pas défini. Exécutez d'abord setupProperties().");
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheetName = "liste livreurs";

  // 1. Vérifier si la feuille existe déjà
  let sheet = ss.getSheetByName(sheetName);
  if (sheet) {
    console.log(`La feuille "${sheetName}" existe déjà. Aucune action n'est requise.`);
    return; // On ne fait rien si elle existe
  }

  // 2. Si elle n'existe pas, la créer et la formater
  sheet = ss.insertSheet(sheetName);
  console.log(`La feuille "${sheetName}" a été créée.`);

  const headers = ["ID Livreur", "Nom Personnage", "Email"];
  sheet.appendRow(headers);
  sheet.getRange("A1:C1").setFontWeight("bold").setHorizontalAlignment("center");
  sheet.setFrozenRows(1); // Figer la ligne d'en-tête

  // 3. Préparer la liste des personnages
  const personnages = [
    "Satanas et Diabolo", "Pénélope Jolicœur", "Pierre de Beau-Fixe",
    "Les Frères Têtes-dures (Roc et Gravillon)", "Le Professeur Mabouloff",
    "Rufus la Rondelle et Saucisson le chien", "Sergent Grosse-Pomme et Soldat Petit-Pois",
    "Al Carbone et sa bande", "Pique et Colégram", "Max le Rouge"
  ];

  // 4. Remplir la feuille avec les données
  const data = personnages.map((nom, index) => {
    const id = `LIV-${101 + index}`; // Crée un ID unique, ex: LIV-101
    const email = `livreur${index + 1}@test.com`; // Crée un e-mail de test
    return [id, nom, email];
  });

  // 5. Insérer les données dans la feuille
  sheet.getRange(2, 1, data.length, data[0].length).setValues(data);
  sheet.autoResizeColumns(1, 3); // Ajuster la largeur des colonnes

  console.log(`La feuille "${sheetName}" a été remplie avec ${data.length} livreurs.`);
}
