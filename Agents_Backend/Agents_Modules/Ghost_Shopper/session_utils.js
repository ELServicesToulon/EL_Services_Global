/**
 * @file Ghost_Shopper/session_utils.js
 * @description Utilitaires de session (loader wait, screenshots, finish)
 */

const path = require('path');
const fs = require('fs');

/**
 * Attente intelligente de la disparition du loader
 * @param {Page} page - Instance Playwright Page
 */
async function waitForOverlay(page) {
    try {
        await page.waitForSelector('#indicateur-chargement', { state: 'hidden', timeout: 10000 });
    } catch (e) {
        // Ignorer si l'élément n'existait déjà pas
    }
}

/**
 * Crée un rapport de session et prend un screenshot final
 * @param {Object} report - Rapport de session
 * @param {Page} page - Instance Playwright Page
 * @returns {Object} Rapport finalisé
 */
async function finishSession(report, page) {
    const screenshotDir = path.join(__dirname, '../../../Backups/Screenshots');
    if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const statusTag = report.issues.length > 0 ? "WARN" : "OK";
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '');
    const screenPath = path.join(screenshotDir, `QA_${statusTag}_${timestamp}.png`);

    await page.screenshot({ path: screenPath });
    report.screenshotPath = screenPath;

    if (report.issues.length > 0) {
        console.log('⚠️ ANOMALIES DÉTECTÉES :');
        report.issues.forEach(i => console.log(`   - ${i}`));
    }

    console.log('[CLIENT EXPERT] Audit terminé.');
    return report;
}

/**
 * Capture un screenshot d'erreur
 * @param {Page} page - Instance Playwright Page
 * @param {string} prefix - Préfixe du nom de fichier
 * @returns {string} Chemin du screenshot
 */
async function captureErrorScreenshot(page, prefix = 'expert_crash') {
    const screenshotDir = path.join(__dirname, '../../../Backups/Screenshots');
    if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    const screenPath = path.join(screenshotDir, `${prefix}_${Date.now()}.png`);
    await page.screenshot({ path: screenPath });
    return screenPath;
}

/**
 * Crée un rapport vide
 * @returns {Object} Structure de rapport initiale
 */
function createEmptyReport() {
    return {
        success: true,
        steps: [],
        issues: [],
        screenshotPath: null,
        error: null
    };
}

module.exports = {
    waitForOverlay,
    finishSession,
    captureErrorScreenshot,
    createEmptyReport
};
