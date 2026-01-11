/**
 * @file Ghost_Shopper.js
 * @description DEPRECATED - Ce fichier redirige vers le module refactoré.
 * Le code a été découpé en modules plus petits dans le dossier Ghost_Shopper/
 * 
 * Structure du nouveau module :
 * - Ghost_Shopper/index.js        : Orchestrateur principal
 * - Ghost_Shopper/config.js       : Configuration et constantes
 * - Ghost_Shopper/probes.js       : Sondes de monitoring
 * - Ghost_Shopper/session_utils.js: Utilitaires de session
 * - Ghost_Shopper/standard_flow.js: Parcours de réservation
 * - Ghost_Shopper/omni_scan.js    : Scan intégral du site
 * - Ghost_Shopper/interactions.js : Chaos Monkey et interactions
 * 
 * @see ./Ghost_Shopper/index.js
 */

// Re-export depuis le nouveau module
const { runGhostShopperCycle } = require('./Ghost_Shopper/index');

module.exports = { runGhostShopperCycle };
