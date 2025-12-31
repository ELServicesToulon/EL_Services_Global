/**
 * @file index.js
 * @description Point d'entrée du Worker Ghost Shopper
 */

const { runGhostShopperCycle } = require('./Ghost_Shopper');

// Configuration
const INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 Heures
const RUN_ON_START = true;

async function main() {
    console.log('╔══════════════════════════════════════╗');
    console.log('║   WORKER: GHOST SHOPPER STANDALONE   ║');
    console.log('╚══════════════════════════════════════╝');

    if (RUN_ON_START) {
        await executeJob();
    }

    // Boucle infinie
    setInterval(async () => {
        await executeJob();
    }, INTERVAL_MS);

    // Keep alive log
    setInterval(() => {
        const mem = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
        process.stdout.write(`\r[${new Date().toLocaleTimeString()}] Worker Idle. Mem: ${mem}MB`);
    }, 60000);
}

async function executeJob() {
    console.log(`\n\n--- DÉBUT JOB : ${new Date().toLocaleString()} ---`);
    try {
        const report = await runGhostShopperCycle();
        console.log('--- RAPPORT ---');
        console.log(JSON.stringify(report, null, 2));

        // TODO: Ici, on pourrait envoyer ce JSON à un endpoint Sentinel (Webhook)
        // Pour l'instant on log juste localement.

    } catch (e) {
        console.error('CRITIQUE JOB FAILED:', e);
    }
    console.log(`--- FIN JOB : ${new Date().toLocaleString()} ---\n`);
}

// Gestion Arrêt Propre
process.on('SIGINT', () => {
    console.log('\n🛑 Arrêt Worker demandé.');
    process.exit(0);
});

main();
