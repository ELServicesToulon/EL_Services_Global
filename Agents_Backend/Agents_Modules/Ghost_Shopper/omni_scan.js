/**
 * @file Ghost_Shopper/omni_scan.js
 * @description Mode Omni-Scan : Scan intégral du site
 */

const { TARGETS, SCAN_CONFIG, QA_CREDENTIALS } = require('./config');
const { waitForOverlay } = require('./session_utils');
const { methodicalInteract } = require('./interactions');

/**
 * Mode Omni-Scan : Scan intégral du site
 * @param {Page} page - Instance Playwright Page
 * @param {Object} report - Rapport à alimenter
 */
async function runOmniScanMode(page, report) {
    console.log('[OMNI SCAN] 🕵️‍♂️ Démarrage du scan intégral...');
    report.steps.push('Mode Omni-Scan Activé');

    // 1. Bypass Auth
    await omniBypassAuth(page, report);

    // 2. Crawler & Tester
    const visitedUrls = new Set();
    const queue = [TARGETS.DASHBOARD_URL, TARGETS.SITE_URL];
    let pagesScanned = 0;

    while (queue.length > 0 && pagesScanned < SCAN_CONFIG.MAX_PAGES) {
        const currentUrl = queue.shift();
        
        if (visitedUrls.has(currentUrl)) continue;
        visitedUrls.add(currentUrl);
        pagesScanned++;

        try {
            console.log(`\n[SCANNER] 📄 Analyse de: ${currentUrl} (${pagesScanned}/${SCAN_CONFIG.MAX_PAGES})`);
            
            const resp = await page.goto(currentUrl, { 
                waitUntil: 'domcontentloaded', 
                timeout: 30000 
            });
            
            if (resp.status() >= 400) {
                report.issues.push(`[SCAN ${resp.status()}] Impossible d'accéder à ${currentUrl}`);
                continue;
            }
            
            await waitForOverlay(page);
            await page.waitForTimeout(1000);

            report.steps.push(`Scan Page: ${currentUrl.split('/').pop() || 'home'}`);

            // A. Crawler : Analyse des liens
            const links = await page.$$eval('a[href]', anchors => anchors.map(a => a.href));
            for (const link of links) {
                if (link.startsWith('mailto:') || link.startsWith('tel:') || link.includes('#')) {
                    continue;
                }
                if (link.includes('mediconvoi.fr') && 
                    !link.includes('logout') && 
                    !visitedUrls.has(link)) {
                    queue.push(link);
                }
            }

            // B. Test des interactions
            await methodicalInteract(page, report);

        } catch (e) {
            console.error(`[SCAN ERROR] Erreur sur ${currentUrl}: ${e.message}`);
            report.issues.push(`[SCAN CRASH] ${currentUrl}: ${e.message}`);
        }
    }
    
    report.steps.push(`Fin Omni-Scan: ${pagesScanned} pages visitées.`);
}

/**
 * Bypass d'authentification rapide
 * @param {Page} page - Instance Playwright Page
 * @param {Object} report - Rapport à alimenter
 */
async function omniBypassAuth(page, report) {
    console.log(' -> [BYPASS] Tentative de connexion...');
    await page.goto(TARGETS.LOGIN_URL);
    
    try {
        await page.fill('input[type="email"]', QA_CREDENTIALS.email);
        
        const btnSwitchPass = await page.getByText('utiliser mon mot de passe');
        if (await btnSwitchPass.isVisible()) {
            await btnSwitchPass.click();
        }
        
        await page.fill('input[type="password"]', QA_CREDENTIALS.password);
        await page.click('button[type="submit"]');
        
        await page.waitForNavigation({ url: '**/dashboard', timeout: 15000 });
        console.log(' -> [BYPASS] Connexion réussie !');
        report.steps.push('Login Bypass: Succès');
    } catch (e) {
        console.log(' -> [BYPASS] Echec connexion (ou déjà connecté). On continue...');
    }
}

module.exports = { runOmniScanMode };
