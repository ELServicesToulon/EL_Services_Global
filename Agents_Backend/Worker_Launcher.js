/**
 * @file Worker_Launcher.js
 * @description Script d'entrée pour les Workers distants.
 * Reçoit le nom de l'agent en argument et déclenche son cycle.
 * Usage: node Worker_Launcher.js Ghost_Shopper
 */

const path = require('path');

// Mappage des Agents disponibles sur le Worker
const AGENT_MAP = {
    // Adapter les chemins selon la structure déployée sur le worker
    'GHOST_SHOPPER': './Agents_Standalone/Ghost_Shopper_Worker/index.js', // Hypothétique
    // Pour l'instant, on mappe vers le GhostShopper mocké ou le module local si présent
    'MARKETING': './Agents_Modules/Agent_Marketing.js'
};

async function main() {
    const agentName = process.argv[2];

    if (!agentName) {
        console.error("❌ ERREUR: Aucun nom d'agent fourni.");
        process.exit(1);
    }

    console.log(`👷 [WORKER] Démarrage de la tâche : ${agentName}`);

    // Ici, on pourrait faire un require dynamique, 
    // mais pour la démo et la stabilité, on peut simuler l'action ou charger un fichier spécifique.

    // Simulation simple pour valider le connecteur
    if (agentName === 'PING') {
        console.log("PONG from Worker!");
        return;
    }

    // Cas spécial pour Ghost Shopper (Réel)
    if (agentName === 'GHOST_SHOPPER') {
        console.log("👻 [WORKER] Ghost Shopper : Lancement de l'agent réel...");
        try {
            const { runGhostShopperCycle } = require('./Agents_Modules/Ghost_Shopper');
            const report = await runGhostShopperCycle();
            console.log(`RAPPORT_JSON: ${JSON.stringify(report)}`);
        } catch (e) {
            console.error("🔥 [WORKER] Erreur execution Ghost Shopper:", e);
            console.log(`RAPPORT_JSON: ${JSON.stringify({ success: false, error: e.message, steps: [] })}`);
        }
        return;
    }

    console.log(`⚠️ Agent ${agentName} non reconnu ou non configuré sur ce worker.`);
}

main().catch(err => {
    console.error("🔥 [WORKER] CRASH:", err);
    process.exit(1);
});
