function autoRepairConfig() {
  const ui = SpreadsheetApp.getUi();
  let log = "=== RAPPORT D'AUTO-RÉPARATION ===\n\n";
  let newConfigIDs = {};

  try {
    // 1. ANALYSE DU SPREADSHEET
    const ssId = "1AzWdQQ4UEq0Fvr_iTpDY5TiXn55ij30_okIxIG5p_OM"; // Ton ID valide
    const ss = SpreadsheetApp.openById(ssId);
    const sheet = ss.getSheetByName("Facturation");
    
    if (!sheet) throw new Error("Onglet 'Facturation' introuvable !");
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    log += "✅ En-têtes trouvés : " + headers.join(" | ") + "\n";

    // Recherche intelligente de la colonne Email
    const possibleNames = ["Email", "E-mail", "Mail", "Courriel", "Adresse Mail", "Email Client"];
    let foundEmail = headers.find(h => possibleNames.includes(h) || h.toLowerCase().includes("mail"));
    
    if (foundEmail) {
      log += "✅ Colonne Email identifiée : '" + foundEmail + "'\n";
      if (foundEmail !== "Email") {
        log += "⚠️ ATTENTION : Tu devras renommer cette colonne en 'Email' dans le Sheet pour que le script marche !\n";
      }
    } else {
      log += "❌ ERREUR : Aucune colonne ressemblant à un Email trouvée.\n";
    }

    // 2. CRÉATION DES DOSSIERS (Si besoin)
    log += "\n--- GÉNÉRATION DES DOSSIERS DRIVE ---\n";
    
    const root = DriveApp.getRootFolder();
    const parentName = "EL Services - Gestion";
    
    // Cherche ou crée le dossier parent
    const parents = root.getFoldersByName(parentName);
    let parentFolder = parents.hasNext() ? parents.next() : root.createFolder(parentName);
    newConfigIDs.FOLDER_ROOT = parentFolder.getId();
    
    // Sous-dossier Factures
    const invoicesName = "Factures Clients";
    const invFolders = parentFolder.getFoldersByName(invoicesName);
    let invoiceFolder = invFolders.hasNext() ? invFolders.next() : parentFolder.createFolder(invoicesName);
    newConfigIDs.FOLDER_INVOICES = invoiceFolder.getId();
    log += "✅ Dossier Factures : Prêt (" + invoiceFolder.getUrl() + ")\n";

    // Sous-dossier Archives (On utilise le même pour simplifier ou on en crée un autre)
    newConfigIDs.FOLDER_ARCHIVES = invoiceFolder.getId(); 

    // 3. AFFICHAGE DES NOUVEAUX IDS
    log += "\n--- COPIE CES IDs DANS CONFIG.GS ---\n";
    log += 'FOLDER_INVOICES: "' + newConfigIDs.FOLDER_INVOICES + '",\n';
    log += 'FOLDER_ARCHIVES: "' + newConfigIDs.FOLDER_ARCHIVES + '",\n';
    
    console.log(log);
    ui.alert("Réparation Terminée", log, ui.ButtonSet.OK);

  } catch (e) {
    console.error(e);
    ui.alert("Erreur", e.message, ui.ButtonSet.OK);
  }
}