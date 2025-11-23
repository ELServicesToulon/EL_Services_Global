/**
 * MODULE FACTURATION
 * Gère la génération des PDF et l'envoi par email.
 * Dépendances : Config.gs
 */

function genererFactures() {
  const ui = SpreadsheetApp.getUi();
  console.log("--- DÉBUT GÉNÉRATION FACTURES ---");

  try {
    // 1. Connexion aux données via Config
    const ss = SpreadsheetApp.openById(Config.getId("DB_SPREADSHEET"));
    const facturationSheet = ss.getSheetByName("Facturation");
    const clientsSheet = ss.getSheetByName("Clients");
    const paramsSheet = ss.getSheetByName("Paramètres");

    if (!facturationSheet || !clientsSheet || !paramsSheet) {
      throw new Error("Onglets 'Facturation', 'Clients' ou 'Paramètres' introuvables.");
    }

    // 2. Lecture des données
    const facturationData = facturationSheet.getDataRange().getValues();
    const clientsData = clientsSheet.getDataRange().getValues();
    
    // Mapping des colonnes (Plus robuste que des index en dur)
    const header = facturationData[0];
    const col = header.reduce((acc, name, i) => ({...acc, [name]: i}), {});
    
    // Création d'une Map Client pour accès rapide
    const clientsMap = new Map(clientsData.slice(1).map(r => [r[0], { name: r[1], address: r[2] }]));

    // 3. Filtrage des lignes à facturer (Cochées 'Valider' et sans N° Facture)
    const facturesAGenerer = facturationData.slice(1)
      .map((row, i) => ({ data: row, rowIndex: i + 2 })) // +2 car on saute header (1) et index commence à 0
      .filter(item => item.data[col['Valider']] === true && !item.data[col['N° Facture']]);

    if (facturesAGenerer.length === 0) {
      ui.alert("Aucune ligne validée à facturer.");
      return;
    }

    // 4. Regroupement par Client (Email)
    const facturesParClient = {};
    facturesAGenerer.forEach(item => {
      const email = item.data[col['Email']];
      if (!facturesParClient[email]) facturesParClient[email] = [];
      facturesParClient[email].push(item);
    });

    // 5. Traitement
    let prochainNum = paramsSheet.getRange("A2").getValue();
    let successCount = 0;
    let errors = [];

    for (const email in facturesParClient) {
      try {
        // Infos client
        const items = facturesParClient[email];
        // Si client pas dans la base, on prend le nom de la ligne de facturation
        const clientInfo = clientsMap.get(email) || { 
          name: items[0].data[col['Client (Raison S. Client)']], 
          address: 'Adresse non trouvée' 
        };

        // Génération ID Facture (Ex: FACT-2025-0123)
        const numFacture = "FACT-" + new Date().getFullYear() + "-" + String(prochainNum).padStart(4, '0');
        const dateFacture = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy');

        // Calculs
        let totalHT = 0;
        items.forEach(it => totalHT += parseFloat(it.data[col['Montant']] || 0));
        
        const tva = Config.BUSINESS.TVA_APPLICABLE ? totalHT * Config.BUSINESS.TVA_RATE : 0;
        const totalTTC = totalHT + tva;

        // Création du Doc depuis le Template
        const folder = getOrCreateArchiveFolder();
        const templateId = Config.getId("TEMPLATE_INVOICE");
        const docCopy = DriveApp.getFileById(templateId).makeCopy(numFacture + " - " + clientInfo.name, folder);
        const doc = DocumentApp.openById(docCopy.getId());
        const body = doc.getBody();

        // Remplacement des variables
        body.replaceText('{{numero_facture}}', numFacture);
        body.replaceText('{{date_facture}}', dateFacture);
        body.replaceText('{{client_nom}}', clientInfo.name);
        body.replaceText('{{client_adresse}}', clientInfo.address);
        body.replaceText('{{total_ht}}', totalHT.toFixed(2));
        body.replaceText('{{tva_amount}}', tva.toFixed(2));
        body.replaceText('{{total_ttc}}', totalTTC.toFixed(2));
        body.replaceText('{{rib}}', Config.OWNER.RIB);
        // Note: CGV pourrait être dans Config aussi, mais bon pour l'instant on laisse ou on met un placeholder

        // QR Code SEPA (Appel fonction externe si elle existe, sinon commenter)
        // insertQrCode(body, totalTTC, numFacture); 

        doc.saveAndClose();

        // Conversion PDF et Envoi
        const pdf = docCopy.getAs(MimeType.PDF).setName(numFacture + ".pdf");
        sendInvoiceEmail(email, clientInfo.name, pdf, numFacture);

        // Mise à jour du Sheet (N° Facture + Décocher Valider)
        items.forEach(it => {
          facturationSheet.getRange(it.rowIndex, col['N° Facture'] + 1).setValue(numFacture);
          facturationSheet.getRange(it.rowIndex, col['Valider'] + 1).setValue(false);
        });

        prochainNum++;
        successCount++;

      } catch (err) {
        console.error("Erreur client " + email, err);
        errors.push(email + ": " + err.message);
      }
    }

    // Mise à jour compteur global
    paramsSheet.getRange("A2").setValue(prochainNum);

    // Rapport final
    let msg = successCount + " facture(s) générée(s).";
    if (errors.length > 0) msg += "\n\nErreurs :\n" + errors.join("\n");
    ui.alert(msg);

  } catch (e) {
    console.error("CRITICAL ERROR", e);
    ui.alert("Erreur Critique : " + e.message);
  }
}

/**
 * Envoie l'email au client
 */
function sendInvoiceEmail(email, name, pdf, ref) {
  const subject = "Votre facture " + ref + " - " + Config.OWNER.COMPANY;
  const htmlBody = `
    <p>Bonjour ${name},</p>
    <p>Veuillez trouver ci-jointe votre facture <strong>${ref}</strong>.</p>
    <p>Cordialement,<br>L'équipe ${Config.OWNER.COMPANY}</p>
  `;
  
  MailApp.sendEmail({
    to: email,
    subject: subject,
    htmlBody: htmlBody,
    attachments: [pdf]
  });
}

/**
 * Gestion dossier Archive (Année/Mois)
 */
function getOrCreateArchiveFolder() {
  const rootArchive = DriveApp.getFolderById(Config.getId("FOLDER_ARCHIVES"));
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = ("0" + (now.getMonth() + 1)).slice(-2);

  let yearFolder = rootArchive.getFoldersByName(year);
  let targetYear = yearFolder.hasNext() ? yearFolder.next() : rootArchive.createFolder(year);

  let monthFolder = targetYear.getFoldersByName(month);
  return monthFolder.hasNext() ? monthFolder.next() : targetYear.createFolder(month);
}