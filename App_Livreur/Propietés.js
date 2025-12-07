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
 * @param {boolean} overwrite Si true, écrase les propriétés existantes (défaut: false).
 * @returns {Object} Rapport d'importation avec les propriétés ajoutées, écrasées et ignorées.
 */
function importScriptProperties(properties, overwrite) {
  if (typeof overwrite === 'undefined') overwrite = false;

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
 * Vérifie quelles propriétés requises manquent dans le projet actuel.
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
    'ELS_SHARED_SECRET'
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
  "NOM_ENTREPRISE": "EL Services",
  
};

  // Importer sans écraser les propriétés existantes
  const rapport = importScriptProperties(propsSource, false);

  // OU : Importer en écrasant les propriétés existantes
  // const rapport = importScriptProperties(propsSource, true);

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
