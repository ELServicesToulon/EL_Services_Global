/**
 * Script de Mise à Jour du Modèle de Facture - Neuromarketing & Design
 * 
 * Ce script modifie le document Google Doc défini comme modèle de facture
 * pour améliorer sa lisibilité, son esthétique et son impact psychologique (neuromarketing).
 */

function UPDATE_INVOICE_TEMPLATE() {
    // 1. Configuration
    const TEMPLATE_ID = '1dceBMePjZhpSALkt2_wVxRM-2DtK9LGjEXS0qMqnZRo';

    // 2. Ouvrir le document
    const doc = DocumentApp.openById(TEMPLATE_ID);
    const body = doc.getBody();

    // 3. Sauvegarde de sécurité (Copie)
    const driveFile = DriveApp.getFileById(TEMPLATE_ID);
    driveFile.makeCopy("BACKUP_Modele_Facture_" + new Date().toISOString());
    console.log("Sauvegarde effectuée.");

    // 4. Définition des Styles
    const STYLE_PRIMARY_COLOR = '#0B5394'; // Bleu confiance (Dark Cornflower Blue 1)
    const STYLE_ACCENT_COLOR = '#E06666';  // Rouge doux pour attirer l'attention (Red Berry)
    const STYLE_TEXT_COLOR = '#434343';    // Gris foncé (lisibilité)

    // --- A. En-tête (Confiance & Identité) ---
    // On cherche le nom de l'entreprise pour le mettre en valeur
    // Note: On suppose que le premier paragraphe est ou contient le nom
    const paragraphs = body.getParagraphs();

    if (paragraphs.length > 0) {
        // Supposons que les premières lignes sont l'en-tête
        // On met tout le texte en gris foncé par défaut pour la douceur
        body.editAsText().setForegroundColor(STYLE_TEXT_COLOR);
        body.editAsText().setFontFamily('Roboto'); // Moderne et clean (ou Arial)
    }

    // --- B. Titre FACTURE (Clarté) ---
    // On cherche le mot "FACTURE" et on le stylise
    const range = body.findText("FACTURE");
    if (range) {
        const startOffset = range.getStartOffset();
        const endOffset = range.getEndOffsetInclusive();
        const element = range.getElement();

        // Style: Grand, Gras, Bleu Confiance
        const text = element.asText();
        text.setFontSize(startOffset, endOffset, 24);
        text.setBold(startOffset, endOffset, true);
        text.setForegroundColor(startOffset, endOffset, STYLE_PRIMARY_COLOR);
    }

    // --- C. Message de Remerciement (Réciprocité) ---
    // On cherche "Merci de votre confiance" ou on l'ajoute s'il n'existe pas
    const thankYouRange = body.findText("Merci de votre confiance");
    if (thankYouRange) {
        const el = thankYouRange.getElement();
        el.asText().setItalic(true);
        el.asText().setForegroundColor('#666666');
        // Centrer si c'est un paragraphe entier
        if (el.getType() === DocumentApp.ElementType.TEXT) {
            const parent = el.getParent();
            if (parent.getType() === DocumentApp.ElementType.PARAGRAPH) {
                parent.asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER);
            }
        }
    }

    // --- D. Section "À Payer" (Focalisation) ---
    // C'est l'élément le plus important. Il doit "popper".
    // On cherche le pattern du total, souvent "Total à payer" ou proche
    const totalRange = body.findText("Total à payer");
    if (totalRange) {
        const el = totalRange.getElement();
        const parent = el.getParent(); // Probablement une cellule de tableau ou un paragraphe

        if (parent.getType() === DocumentApp.ElementType.PARAGRAPH) {
            parent.asParagraph().setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
        }

        // On assume que le montant est juste après ou dans la même zone.
        // Idéalement, on voudrait tout le bloc "Net à payer : X €"
        // On va mettre en valeur tout le paragraphe contenant "Total"
        const text = el.asText();
        text.setFontSize(14);
        text.setBold(true);
        text.setForegroundColor(STYLE_PRIMARY_COLOR);
    }

    // Recherche du placeholder de montant total pour le faire exploser (visuellement)
    // {{total_net}} ou similaire. Dans le doute, on cherche des champs communs.
    const placeholders = ["{{total_net}}", "{{montant_total}}", "{{net_a_payer}}", "{{total_remises_offertes}}"];

    placeholders.forEach(ph => {
        const found = body.findText(ph);
        if (found) {
            const el = found.getElement().asText();
            const start = found.getStartOffset();
            const end = found.getEndOffsetInclusive();

            el.setFontSize(start, end, 16);
            el.setBold(start, end, true);
            el.setForegroundColor(start, end, '#20124d'); // Violet foncé/Bleu nuit
            el.setBackgroundColor(start, end, '#fff2cc'); // Surlignage léger jaune (attire l'oeil)
        }
    });


    // --- E. Tableaux (Lisibilité) ---
    // Nettoyer les tableaux pour qu'ils respirent
    const tables = body.getTables();
    tables.forEach(table => {
        // En-tête de tableau
        const row0 = table.getRow(0);
        if (row0) {
            row0.setBackgroundColor('#f3f3f3'); // Gris très clair pour l'en-tête
            for (let c = 0; c < row0.getNumCells(); c++) {
                const cell = row0.getCell(c);
                cell.editAsText().setBold(true);
                cell.editAsText().setForegroundColor('#000000');
            }
        }
        // Bordures douces
        table.setBorderWidth(0.5).setBorderColor('#dddddd');
    });

    // --- F. Pied de page / IBAN (Action) ---
    // S'assurer que l'IBAN est lisible monospaced ou distinct
    const ibanRange = body.findText("IBAN");
    if (ibanRange) {
        const el = ibanRange.getElement().getParent(); // Paragraphe
        if (el.getType() === DocumentApp.ElementType.PARAGRAPH) {
            // Encadrer ou mettre un fond léger pour la zone de paiement
            // DocumentApp ne permet pas facilement de mettre un background à un paragraphe sans tableau
            // On met en gras les infos bancaires
            el.asParagraph().editAsText().setFontFamily('Consolas'); // Pour l'IBAN c'est mieux
        }
    }

    doc.saveAndClose();
    console.log("Mise à jour du modèle terminée avec succès.");
}
