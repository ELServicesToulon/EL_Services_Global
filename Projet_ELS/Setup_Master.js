// =================================================================
//             SETUP MASTER : CREATION / COMPLETION DES FEUILLES
// =================================================================
// Ce module centralise la creation des onglets requis et l'ajout des
// en-tetes manquants. Aucune modification n'est faite sans confirmation
// utilisateur (dialog Apps Script).

/**
 * Retourne la liste canonique d'entetes pour l'onglet Facturation.
 * Reprend FACTURATION_HEADERS si disponible et ajoute les colonnes optionnelles.
 * @returns {string[]}
 */
function getFacturationHeadersMaster_() {
  const base = (typeof FACTURATION_HEADERS !== 'undefined' && Array.isArray(FACTURATION_HEADERS))
    ? FACTURATION_HEADERS.slice()
    : ['Date','Client (Raison S. Client)','Client (Email)','Type','Détails','Montant','Statut','Valider','N° Facture','Event ID','ID Réservation','Note Interne','Tournée Offerte Appliquée','Type Remise Appliquée','Valeur Remise Appliquée','Lien Note'];
  const optionnelles = ['Resident','ID PDF','Email à envoyer','ID Devis'];
  optionnelles.forEach(function(h) {
    if (base.indexOf(h) === -1) base.push(h);
  });
  return base;
}

/**
 * Registre des onglets requis et de leurs entetes attendus.
 */
const SHEETS_REQUIRED = (function() {
  return [
    {
      name: (typeof SHEET_FACTURATION !== 'undefined') ? SHEET_FACTURATION : 'Facturation',
      headers: getFacturationHeadersMaster_()
    },
    {
      name: (typeof SHEET_CLIENTS !== 'undefined') ? SHEET_CLIENTS : 'Clients',
      headers: ['Email','Raison Sociale','Adresse','SIRET','Type de Remise','Valeur Remise','Nombre Tournées Offertes','Resident','Client ID','Code Postal','Téléphone']
    },
    {
      name: (typeof SHEET_ETABLISSEMENTS !== 'undefined') ? SHEET_ETABLISSEMENTS : 'Base_Etablissements',
      headers: [COLONNE_TYPE_ETAB, COLONNE_NOM_ETAB, COLONNE_ADRESSE_ETAB, COLONNE_CODE_POSTAL_ETAB, COLONNE_VILLE_ETAB, COLONNE_CONTACT_ETAB, COLONNE_TELEPHONE_ETAB, COLONNE_EMAIL_ETAB, COLONNE_SITE_WEB_ETAB, COLONNE_JOURS_ETAB, COLONNE_PLAGE_ETAB, COLONNE_SOURCE_ETAB, COLONNE_STATUT_ETAB, COLONNE_DERNIERE_MAJ_ETAB, COLONNE_NOTE_ETAB, COLONNE_PLACE_ID_ETAB]
    },
    {
      name: (typeof SHEET_PARAMETRES !== 'undefined') ? SHEET_PARAMETRES : 'Paramètres',
      headers: ['Clé','Valeur']
    },
    {
      name: (typeof SHEET_LOGS !== 'undefined') ? SHEET_LOGS : 'Logs',
      headers: ['Timestamp','Reservation ID','Client Email','Résumé','Montant','Statut']
    },
    {
      name: (typeof SHEET_ADMIN_LOGS !== 'undefined') ? SHEET_ADMIN_LOGS : 'Admin_Logs',
      headers: ['Timestamp','Utilisateur','Action','Statut']
    }
  ];
})();

/**
 * Cree les onglets manquants et ajoute les entetes manquants apres confirmation.
 * Aucun changement n'est applique si l'utilisateur annule la confirmation.
 */
function setupSheetsMaster() {
  const ss = SpreadsheetApp.openById(getSecret('ID_FEUILLE_CALCUL'));
  const ui = SpreadsheetApp.getUi();
  const planned = [];

  SHEETS_REQUIRED.forEach(function(spec) {
    let sh = ss.getSheetByName(spec.name);
    if (!sh) {
      planned.push({ type: 'create', name: spec.name, headers: spec.headers.slice() });
      return;
    }
    const row1 = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), spec.headers.length))
      .getValues()[0]
      .map(function(v) { return String(v || '').trim(); });
    const missing = spec.headers.filter(function(h) { return row1.indexOf(h) === -1; });
    if (missing.length) {
      planned.push({ type: 'add', name: spec.name, missing: missing.slice(), startCol: row1.length + 1 });
    }
  });

  if (!planned.length) {
    ui.alert('Setup master', 'Rien à faire : tous les onglets/entêtes sont présents.', ui.ButtonSet.OK);
    return;
  }

  const summary = planned.map(function(p) {
    if (p.type === 'create') {
      return 'Créer "' + p.name + '" avec ' + p.headers.length + ' entêtes';
    }
    return 'Compléter "' + p.name + '" avec: ' + p.missing.join(', ');
  }).join('\n');

  const confirm = ui.alert('Confirmer les modifications ?', summary, ui.ButtonSet.OK_CANCEL);
  if (confirm !== ui.Button.OK) {
    ui.alert('Annulé. Aucun changement appliqué.', ui.ButtonSet.OK);
    return;
  }

  planned.forEach(function(p) {
    if (p.type === 'create') {
      const sh = ss.insertSheet(p.name);
      sh.getRange(1, 1, 1, p.headers.length).setValues([p.headers]);
    } else if (p.type === 'add') {
      const sh = ss.getSheetByName(p.name);
      if (sh) {
        sh.getRange(1, p.startCol, 1, p.missing.length).setValues([p.missing]);
      }
    }
  });

  ui.alert('Setup master', 'Terminé : ' + planned.length + ' action(s) appliquée(s).', ui.ButtonSet.OK);
}
