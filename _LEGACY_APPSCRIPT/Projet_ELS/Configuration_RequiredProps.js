/**
 * Propriétés Script requises (Script Properties)
 * Utilisées par getSecret(name) dans Utilitaires.gs et Configuration.gs.
 *
 * NOTE: Cette liste doit rester synchronisée avec celle de Setup_Checks.js
 */

/**
 * Test simple exécutable via `clasp run test_requiredProps`.
 * Retourne l'état et la liste des propriétés manquantes.
 */
function test_requiredProps() {
  // Référence vers REQUIRED_PROPS défini dans Setup_Checks.js
  // Si ce fichier est exécuté isolément, on redéfinit la liste pour éviter les erreurs.
  const requiredList = (typeof REQUIRED_PROPS !== 'undefined') ? REQUIRED_PROPS : [
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
    'SIRET',
    'ELS_SHARED_SECRET',
    'ID_DOSSIER_FACTURES',
    'ID_LOGO',
    'TRACE_SECRET'
  ];

  const sp = PropertiesService.getScriptProperties();
  const missing = requiredList.filter(k => {
    if (k === 'DOSSIER_PUBLIC_FOLDER_ID') {
      const v1 = sp.getProperty('DOSSIER_PUBLIC_FOLDER_ID');
      const v2 = sp.getProperty('DOCS_PUBLIC_FOLDER_ID');
      return (v1 === null || v1 === '') && (v2 === null || v2 === '');
    }
    const v = sp.getProperty(k);
    return v === null || v === '';
  });
  const ok = missing.length === 0;
  Logger.log(ok ? 'Toutes les propriétés requises sont définies.' : ('Propriétés manquantes: ' + missing.join(', ')));
  return { ok: ok, missing: missing };
}

/** Lève une erreur si des propriétés sont manquantes. */
function ensureRequiredProps() {
  const res = test_requiredProps();
  if (!res.ok) {
    throw new Error('Script Properties manquantes: ' + res.missing.join(', '));
  }
}

/**
 * Récupère une propriété ou lève une erreur si absente.
 * Wrapper léger autour de getSecret(name) pour compatibilité.
 * @param {string} k Nom de la propriété Script.
 * @returns {string}
 */
function getPropOrThrow_(k) {
  if (!k) throw new Error('Clé de propriété requise.');
  return getSecret(String(k));
}
