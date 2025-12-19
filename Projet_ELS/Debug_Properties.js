/**
 * =================================================================
 *           AUDIT ET DIAGNOSTIC DES PROPRIÉTÉS SCRIPT
 * =================================================================
 * Ce fichier contient les outils pour vérifier la cohérence des
 * propriétés Script (Secrets) utilisées dans l'application.
 */

/**
 * Liste exhaustive des propriétés détectées dans le code source.
 * Classées par criticité.
 */
const KNOWN_PROPERTIES = {
  // Propriétés critiques : L'application plante probablement sans elles.
  CORE: [
    'NOM_ENTREPRISE',
    'ADRESSE_ENTREPRISE',
    'EMAIL_ENTREPRISE',
    'ADMIN_EMAIL',
    'ID_FEUILLE_CALCUL',
    'ID_CALENDRIER',
    'ID_DOCUMENT_CGV',
    'ID_MODELE_FACTURE',
    'ID_DOSSIER_ARCHIVES',
    'ID_DOSSIER_TEMPORAIRE',
    'ID_DOSSIER_FACTURES', // Unifié depuis ID_FACTURES_DRIVE
    'SIRET',
    'ELS_SHARED_SECRET'
  ],

  // Propriétés fonctionnelles importantes : Utilisées par des modules spécifiques.
  IMPORTANT: [
    'ID_LOGO',                 // Utilitaires.js (branding)
    'ID_LOGO_FACTURE',         // Configuration.js (optionnel, fallback sur ID_LOGO)
    'TRACE_SECRET',            // auditProject.js (sécurité logs)
    'OPENAI_API_KEY',          // assistant.js (si utilisé)
    'TELEPHONE_ENTREPRISE',    // Reservation.js
    'SUPPORT_PHONE'            // Reservation.js (fallback)
  ],

  // Propriétés bancaires / Facturation détaillée
  BILLING: [
    'RIB_ENTREPRISE',
    'BIC_ENTREPRISE',
    'URL_TARIFS_PUBLIC',
    'ID_DOCUMENT_TARIFS'
  ],

  // Propriétés techniques / Fallbacks
  TECHNICAL: [
    'DOSSIER_PUBLIC_FOLDER_ID',
    'DOCS_PUBLIC_FOLDER_ID',
    'ANNEES_RETENTION_FACTURES',
    'MOIS_RETENTION_LOGS'
  ]
};

/**
 * Vérifie la présence des propriétés Script et génère un rapport détaillé.
 * @returns {Object} Le rapport de diagnostic.
 */
function auditUsedProperties() {
  const sp = PropertiesService.getScriptProperties();
  const definedProps = sp.getProperties();
  const report = {
    missing: [],
    defined: [],
    optional_missing: [],
    stats: {
      total_defined: Object.keys(definedProps).length,
      core_ok: 0,
      core_total: KNOWN_PROPERTIES.CORE.length
    }
  };

  // Vérification des propriétés CORE
  KNOWN_PROPERTIES.CORE.forEach(key => {
    if (!definedProps[key] || definedProps[key].trim() === '') {
      report.missing.push(key);
    } else {
      report.stats.core_ok++;
      report.defined.push(key);
    }
  });

  // Vérification des autres groupes (juste pour info)
  const otherGroups = ['IMPORTANT', 'BILLING', 'TECHNICAL'];
  otherGroups.forEach(group => {
    KNOWN_PROPERTIES[group].forEach(key => {
      if (!definedProps[key] || definedProps[key].trim() === '') {
        report.optional_missing.push(`${group}:${key}`);
      } else {
        report.defined.push(key);
      }
    });
  });

  // Affichage du rapport dans les logs
  Logger.log('=== AUDIT DES PROPRIÉTÉS SCRIPT ===');
  Logger.log(`CRITIQUE: ${report.stats.core_ok} / ${report.stats.core_total} définies.`);

  if (report.missing.length > 0) {
    Logger.log('❌ PROPRIÉTÉS CRITIQUES MANQUANTES :');
    report.missing.forEach(k => Logger.log(`  - ${k}`));
  } else {
    Logger.log('✅ Toutes les propriétés critiques sont définies.');
  }

  if (report.optional_missing.length > 0) {
    Logger.log('⚠️ Propriétés secondaires absentes :');
    report.optional_missing.forEach(k => Logger.log(`  - ${k}`));
  }

  return report;
}

/**
 * Fonction de test simple pour validation rapide via Clasp.
 */
function test_auditProperties() {
  const res = auditUsedProperties();
  if (res.missing.length > 0) {
    throw new Error('Propriétés critiques manquantes: ' + res.missing.join(', '));
  }
  Logger.log('Audit passé avec succès.');
}
