/**
 * @file Ghost_Shopper/index.js
 * @description AGENT HYBRIDE: GHOST SHOPPER + CLIENT EXPERT (Backend QA)
 * Point d'entrée principal - Orchestre les différents modules.
 * 
 * CAPACITÉS :
 * 1. 🕵️‍♂️ Console Spy : Détecte les erreurs JavaScript invisibles
 * 2. 🕸️ Network Sniffer : Repère les 404/500
 * 3. ⚡ Performance Audit : Mesure les temps de chargement
 * 4. 🐒 Chaos Monkey : Clique aléatoirement pour trouver des bugs
 * 5. 🔍 Omni-Scan : Scan intégral de toutes les pages
 */

const BrowserServer = require('../Browser_Server');
const { BROWSER_CONFIG, SCAN_CONFIG } = require('./config');
const { setupProbes, injectStealthScripts } = require('./probes');
const { createEmptyReport, finishSession, captureErrorScreenshot } = require('./session_utils');
const { runStandardShopper } = require('./standard_flow');
const { runOmniScanMode } = require('./omni_scan');

/**
 * Exécute un cycle complet de Ghost Shopper
 * @returns {Promise<Object>} Rapport de session
 */
async function runGhostShopperCycle() {
    console.log('[CLIENT EXPERT] 🚀 Démarrage de la session QA + Parcours V2...');

    // Connect to persistent browser (27% faster than launch)
    const browser = await BrowserServer.connect();

    const context = await browser.newContext({
        userManager: 'Antigravity QA Agent',
        ...BROWSER_CONFIG
    });
    const page = await context.newPage();
    
    // Setup
    await injectStealthScripts(page);
    
    const MODE = process.env.GHOST_MODE || 'STANDARD';
    const report = createEmptyReport();

    // Setup monitoring probes
    setupProbes(page, report);

    try {
        const tStart = Date.now();

        if (MODE === 'OMNI_SCAN') {
            await runOmniScanMode(page, report);
        } else {
            await runStandardShopper(page, report, tStart);
        }

        // Conclusion
        if (report.issues.length > SCAN_CONFIG.ISSUES_THRESHOLD) {
            report.success = false;
            report.error = `Trop d'anomalies détectées (${report.issues.length})`;
        }

        return await finishSession(report, page);

    } catch (error) {
        console.error(`[EXPERT ERROR] ${error.message}`);
        report.success = false;
        report.error = error.message;
        report.screenshotPath = await captureErrorScreenshot(page);
        
        return report;

    } finally {
        await context.close();
    }
}

module.exports = { runGhostShopperCycle };
