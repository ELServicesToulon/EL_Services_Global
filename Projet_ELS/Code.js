/**
 * POINT D'ENTRÉE PRINCIPAL - PROJET ELS
 * Gère les menus (UI) et le routage de l'application Web (doGet).
 * Dépendances : Config.gs
 */

// --- 1. INTERFACE UTILISATEUR (GOOGLE SHEET) ---

/**
 * Se déclenche à l'ouverture du Spreadsheet.
 * Crée le menu personnalisé "EL Services".
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  const menu = ui.createMenu('💊 EL Services');

  // Sous-menu Facturation
  menu.addSubMenu(ui.createMenu('Facturation')
      .addItem('📄 Générer les factures (PDF)', 'genererFactures') 
      .addItem('✉️ Envoyer les relances (A faire)', 'envoyerRelances') 
  );

  menu.addSeparator();

  // Sous-menu Administration
  menu.addSubMenu(ui.createMenu('Administration')
      .addItem('🔄 Mettre à jour les paramètres', 'updateParameters')
      .addItem('📂 Archiver les tournées', 'archiverTournees')
  );

  menu.addSeparator();
  
  // Outils Techniques
  menu.addItem('🛠️ Afficher la configuration', 'showConfigDebug');
  
  menu.addToUi();
}

/**
 * Fonction de debug pour vérifier que Config.gs est bien lu
 */
function showConfigDebug() {
  const ui = SpreadsheetApp.getUi();
  try {
    const info = "Version: " + Config.APP_INFO.VERSION + "\n" +
                 "Env: " + Config.APP_INFO.ENV + "\n" +
                 "Email Admin: " + Config.OWNER.EMAIL + "\n" +
                 "ID Factures: " + Config.getId("FOLDER_INVOICES");
    ui.alert("Configuration Chargée", info, ui.ButtonSet.OK);
  } catch (e) {
    ui.alert("Erreur Config", e.message, ui.ButtonSet.OK);
  }
}


// --- 2. INTERFACE WEB (WEB APP) ---

/**
 * Point d'entrée de l'application Web (URL Exec).
 * Route vers la bonne page HTML selon les paramètres.
 */
function doGet(e) {
  try {
    // Par défaut, on charge l'Index
    let page = 'Index'; 
    
    // Si un paramètre 'page' est passé dans l'URL (ex: ?page=Client_Espace)
    if (e && e.parameter && e.parameter.page) {
      page = e.parameter.page;
    }

    // Création du template HTML
    const template = HtmlService.createTemplateFromFile(page);
    
    // Injection des variables globales pour le HTML
    template.appName = Config.APP_INFO.NAME;
    template.appVersion = Config.APP_INFO.VERSION;

    // Rendu final
    return template.evaluate()
      .setTitle(Config.APP_INFO.NAME + " - " + page)
      .setSandboxMode(HtmlService.SandboxMode.IFRAME)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

  } catch (err) {
    return HtmlService.createHtmlOutput("<h3>Erreur de chargement : " + err.message + "</h3>");
  }
}


// --- 3. UTILITAIRES HTML (SERVER-SIDE INCLUDES) ---

/**
 * Permet d'inclure du HTML/CSS/JS dans une page HTML
 * Usage dans HTML : <?!= include('NomDuFichier'); ?>
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}


// --- 4. FONCTIONS PLACEHOLDERS (Pour éviter les erreurs de menu) ---

function envoyerRelances() { 
  SpreadsheetApp.getUi().alert("Fonctionnalité 'Relances' à venir."); 
}

function updateParameters() { 
  SpreadsheetApp.getUi().alert("Fonctionnalité 'Paramètres' à venir."); 
}

function archiverTournees() { 
  SpreadsheetApp.getUi().alert("Fonctionnalité 'Archivage' à venir."); 
}