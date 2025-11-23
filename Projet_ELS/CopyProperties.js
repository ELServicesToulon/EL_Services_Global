/**
 * =================================================================
 *            UTILITAIRES DE COPIE DE PROPRIÉTÉS SCRIPT
 * =================================================================
 * Permet d'exporter et d'importer les propriétés Script entre projets.
 */

/**
 * Exporte toutes les propriétés Script du projet actuel.
 * Retourne un objet JSON que vous pouvez copier/coller.
 *
 * @returns {Object} Objet contenant toutes les propriétés Script.
 */
function exportScriptProperties() {
  const sp = PropertiesService.getScriptProperties();
  const allProps = sp.getProperties();

  Logger.log('=== EXPORT DES PROPRIÉTÉS SCRIPT ===');
  Logger.log(JSON.stringify(allProps, null, 2));
  Logger.log('=== FIN DE L\'EXPORT ===');

  return allProps;
}

/**
 * Importe des propriétés Script dans le projet actuel.
 * ATTENTION : Cela écrasera les propriétés existantes avec les mêmes noms.
 *
 * @param {Object} properties Objet contenant les paires clé-valeur à importer.
 * @param {boolean} overwrite Si true, écrase les propriétés existantes (défaut: true).
 * @returns {Object} Rapport d'importation avec les propriétés ajoutées, écrasées et ignorées.
 */
function importScriptProperties(properties, overwrite) {
  if (typeof overwrite === 'undefined') overwrite = true;

  const sp = PropertiesService.getScriptProperties();
  const existingProps = sp.getProperties();

  const rapport = {
    ajoutees: [],
    ecrasees: [],
    ignorees: []
  };

  for (const [key, value] of Object.entries(properties)) {
    if (existingProps.hasOwnProperty(key)) {
      if (overwrite) {
        sp.setProperty(key, value);
        rapport.ecrasees.push(key);
      } else {
        rapport.ignorees.push(key);
      }
    } else {
      sp.setProperty(key, value);
      rapport.ajoutees.push(key);
    }
  }

  Logger.log('=== RAPPORT D\'IMPORTATION ===');
  Logger.log('Propriétés ajoutées: ' + rapport.ajoutees.join(', '));
  Logger.log('Propriétés écrasées: ' + rapport.ecrasees.join(', '));
  Logger.log('Propriétés ignorées: ' + rapport.ignorees.join(', '));
  Logger.log('=== FIN DU RAPPORT ===');

  return rapport;
}

/**
 * Copie uniquement les propriétés spécifiées depuis un objet source.
 *
 * @param {Object} sourceProperties Objet source contenant toutes les propriétés.
 * @param {Array<string>} keys Liste des clés à copier.
 * @param {boolean} overwrite Si true, écrase les propriétés existantes (défaut: false).
 * @returns {Object} Rapport d'importation.
 */
function importSelectedProperties(sourceProperties, keys, overwrite) {
  if (!Array.isArray(keys)) {
    throw new Error('Le paramètre keys doit être un tableau de chaînes.');
  }

  const selectedProps = {};
  for (const key of keys) {
    if (sourceProperties.hasOwnProperty(key)) {
      selectedProps[key] = sourceProperties[key];
    } else {
      Logger.log('AVERTISSEMENT: La clé "' + key + '" n\'existe pas dans les propriétés source.');
    }
  }

  return importScriptProperties(selectedProps, overwrite);
}

/**
 * Liste toutes les propriétés Script actuellement définies.
 * UTILISEZ CETTE FONCTION EN PREMIER pour diagnostiquer les propriétés manquantes.
 * Cette fonction est "sûre" et ne provoque pas d'erreur même si des propriétés manquent.
 *
 * @returns {Object} Objet avec les propriétés existantes et manquantes.
 */
function diagnosticProperties() {
  const sp = PropertiesService.getScriptProperties();
  const existingProps = sp.getProperties();

  // Liste des propriétés requises
  const required = [
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

  const missing = required.filter(key => !existingProps.hasOwnProperty(key) || existingProps[key] === '');
  const present = required.filter(key => existingProps.hasOwnProperty(key) && existingProps[key] !== '');

  Logger.log('=== DIAGNOSTIC DES PROPRIÉTÉS SCRIPT ===');
  Logger.log('');
  Logger.log('📊 STATISTIQUES:');
  Logger.log('  Total propriétés définies: ' + Object.keys(existingProps).length);
  Logger.log('  Propriétés requises présentes: ' + present.length + '/' + required.length);
  Logger.log('  Propriétés manquantes: ' + missing.length);
  Logger.log('');

  if (present.length > 0) {
    Logger.log('✅ PROPRIÉTÉS PRÉSENTES (' + present.length + '):');
    present.forEach(function(key) {
      const val = existingProps[key];
      const preview = val.length > 30 ? val.substring(0, 30) + '...' : val;
      Logger.log('  • ' + key + ' = ' + preview);
    });
    Logger.log('');
  }

  if (missing.length > 0) {
    Logger.log('❌ PROPRIÉTÉS MANQUANTES (' + missing.length + '):');
    missing.forEach(function(key) {
      Logger.log('  • ' + key);
    });
    Logger.log('');
    Logger.log('💡 SOLUTION: Utilisez exportScriptProperties() dans le projet source,');
    Logger.log('   puis importScriptProperties() avec les valeurs manquantes.');
  } else {
    Logger.log('✓ Toutes les propriétés requises sont définies.');
  }

  Logger.log('');
  Logger.log('=== FIN DU DIAGNOSTIC ===');

  return {
    total: Object.keys(existingProps).length,
    present: present,
    missing: missing,
    allProperties: existingProps
  };
}

/**
 * Vérifie quelles propriétés requises manquent dans le projet actuel.
 * ATTENTION: Cette fonction peut échouer si Configuration.js est chargé
 * et que des propriétés manquent. Utilisez diagnosticProperties() à la place.
 *
 * @returns {Array<string>} Liste des propriétés manquantes.
 */
function checkMissingProperties() {
  const sp = PropertiesService.getScriptProperties();
  const existingProps = sp.getProperties();

  // Liste des propriétés requises (à adapter selon vos besoins)
  const required = [
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

  const missing = required.filter(key => !existingProps.hasOwnProperty(key) || existingProps[key] === '');

  if (missing.length > 0) {
    Logger.log('=== PROPRIÉTÉS MANQUANTES ===');
    Logger.log(missing.join('\n'));
    Logger.log('=== FIN DE LA LISTE ===');
  } else {
    Logger.log('✓ Toutes les propriétés requises sont définies.');
  }

  return missing;
}

/**
 * Compare les propriétés entre deux objets (projet source vs projet destination).
 *
 * @param {Object} sourceProps Propriétés du projet source.
 * @returns {Object} Rapport de comparaison.
 */
function compareProperties(sourceProps) {
  const sp = PropertiesService.getScriptProperties();
  const destProps = sp.getProperties();

  const rapport = {
    uniquementSource: [],
    uniquementDestination: [],
    communes: [],
    diffValeurs: []
  };

  // Propriétés uniquement dans la source
  for (const key of Object.keys(sourceProps)) {
    if (!destProps.hasOwnProperty(key)) {
      rapport.uniquementSource.push(key);
    } else {
      rapport.communes.push(key);
      if (sourceProps[key] !== destProps[key]) {
        rapport.diffValeurs.push({
          cle: key,
          valeurSource: sourceProps[key].substring(0, 50) + '...',
          valeurDest: destProps[key].substring(0, 50) + '...'
        });
      }
    }
  }

  // Propriétés uniquement dans la destination
  for (const key of Object.keys(destProps)) {
    if (!sourceProps.hasOwnProperty(key)) {
      rapport.uniquementDestination.push(key);
    }
  }

  Logger.log('=== RAPPORT DE COMPARAISON ===');
  Logger.log('Propriétés uniquement dans la source: ' + rapport.uniquementSource.join(', '));
  Logger.log('Propriétés uniquement dans la destination: ' + rapport.uniquementDestination.join(', '));
  Logger.log('Propriétés communes: ' + rapport.communes.length);
  Logger.log('Propriétés avec valeurs différentes: ' + rapport.diffValeurs.length);
  Logger.log('=== FIN DU RAPPORT ===');

  return rapport;
}

// =================================================================
//              FONCTION STANDALONE POUR DIAGNOSTIC RAPIDE
// =================================================================

/**
 * SI VOUS AVEZ L'ERREUR "Propriété manquante" au chargement :
 *
 * 1. Ouvrez l'éditeur Apps Script
 * 2. Créez un NOUVEAU fichier temporaire (Fichier > Nouveau > Fichier de script)
 * 3. Copiez-collez UNIQUEMENT cette fonction dans le nouveau fichier
 * 4. Exécutez-la
 * 5. Regardez les logs pour voir ce qui manque
 *
 * Cette fonction est complètement autonome et ne dépend d'aucun autre fichier.
 */
function DIAGNOSTIC_STANDALONE() {
  const sp = PropertiesService.getScriptProperties();
  const all = sp.getProperties();

  const required = [
    'NOM_ENTREPRISE', 'ADRESSE_ENTREPRISE', 'EMAIL_ENTREPRISE', 'ADMIN_EMAIL',
    'ID_FEUILLE_CALCUL', 'ID_CALENDRIER', 'ID_DOCUMENT_CGV', 'ID_MODELE_FACTURE',
    'ID_DOSSIER_ARCHIVES', 'ID_DOSSIER_TEMPORAIRE', 'SIRET', 'ELS_SHARED_SECRET',
    'ID_DOSSIER_FACTURES', 'ID_LOGO', 'TRACE_SECRET'
  ];

  const missing = [];
  const present = [];

  for (var i = 0; i < required.length; i++) {
    var key = required[i];
    if (all.hasOwnProperty(key) && all[key] !== '') {
      present.push(key + ' ✓');
    } else {
      missing.push(key + ' ❌');
    }
  }

  Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  Logger.log('📋 DIAGNOSTIC DES PROPRIÉTÉS');
  Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  Logger.log('Total: ' + Object.keys(all).length + ' propriétés');
  Logger.log('Requises présentes: ' + present.length + '/' + required.length);
  Logger.log('');

  if (present.length > 0) {
    Logger.log('✅ PRÉSENTES:');
    for (var i = 0; i < present.length; i++) {
      Logger.log('  ' + present[i]);
    }
    Logger.log('');
  }

  if (missing.length > 0) {
    Logger.log('❌ MANQUANTES:');
    for (var i = 0; i < missing.length; i++) {
      Logger.log('  ' + missing[i]);
    }
    Logger.log('');
    Logger.log('💡 Copiez ces propriétés depuis le projet source');
    Logger.log('   avec exportScriptProperties()');
  } else {
    Logger.log('✅ Toutes les propriétés requises sont OK!');
  }

  Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  return { present: present.length, missing: missing };
}

// =================================================================
//                    EXEMPLE D'UTILISATION
// =================================================================

/**
 * EXEMPLE : Comment copier les propriétés d'un projet à un autre
 *
 * ÉTAPE 1 - Dans le projet SOURCE :
 * 1. Ouvrir l'éditeur Apps Script du projet source
 * 2. Exécuter : exportScriptProperties()
 * 3. Copier la sortie JSON depuis les logs
 *
 * ÉTAPE 2 - Dans le projet DESTINATION :
 * 1. Ouvrir l'éditeur Apps Script du projet destination
 * 2. Coller le code suivant et exécuter :
 */
function exemple_importerDepuisAutreProjet() {
  // Coller ici l'objet JSON obtenu depuis exportScriptProperties()
  const propsSource = {
    "NOM_ENTREPRISE": "Ma Société",
    "EMAIL_ENTREPRISE": "contact@exemple.com",
    // ... autres propriétés ...
  };

  // Importer en écrasant les propriétés existantes (comportement par défaut)
  const rapport = importScriptProperties(propsSource);

  // OU : Importer sans écraser les propriétés existantes
  // const rapport = importScriptProperties(propsSource, false);

  return rapport;
}

/**
 * EXEMPLE : Copier uniquement certaines propriétés
 */
function exemple_importerProprietesSpecifiques() {
  const propsSource = {
    "NOM_ENTREPRISE": "Ma Société",
    "EMAIL_ENTREPRISE": "contact@exemple.com",
    "ADMIN_EMAIL": "admin@exemple.com"
  };

  // Copier uniquement NOM_ENTREPRISE et EMAIL_ENTREPRISE
  const rapport = importSelectedProperties(
    propsSource,
    ['NOM_ENTREPRISE', 'EMAIL_ENTREPRISE'],
    false  // ne pas écraser si existe déjà
  );

  return rapport;
}
