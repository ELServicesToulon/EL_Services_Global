/**
 * @file Ghost_Shopper/standard_flow.js
 * @description Parcours standard de réservation (booking flow)
 */

const { TARGETS, PERF_THRESHOLDS, QA_CREDENTIALS } = require('./config');
const { waitForOverlay } = require('./session_utils');
const { exploreAndClick, selectAvailableSlot } = require('./interactions');

/**
 * Exécute le parcours standard de réservation
 * @param {Page} page - Instance Playwright Page
 * @param {Object} report - Rapport à alimenter
 * @param {number} tStart - Timestamp de démarrage
 */
async function runStandardShopper(page, report, tStart) {
    // 1. Accès au Portail V2
    const targetUrl = TARGETS.SITE_URL + '/?v=' + Date.now();
    console.log(` -> Navigation vers ${targetUrl}...`);

    const navResponse = await page.goto(targetUrl, { 
        timeout: 60000, 
        waitUntil: 'domcontentloaded' 
    });
    const loadTime = Date.now() - tStart;
    report.steps.push(`Navigation Initiale: ${navResponse.status()} en ${loadTime}ms`);

    // Audit Performance
    if (loadTime > PERF_THRESHOLDS.PAGE_LOAD) {
        report.issues.push(`[PERF] Chargement initial lent: ${loadTime}ms (Objectif: <${PERF_THRESHOLDS.PAGE_LOAD}ms)`);
    }

    await waitForOverlay(page);
    await page.waitForTimeout(1000);

    // 2. Landing - Bouton Commander
    console.log(' -> Recherche du bouton "Commander une course"...');
    const btnCommander = await page.getByText('Commander une course').first();
    
    try {
        await btnCommander.waitFor({ state: 'visible', timeout: 10000 });
    } catch (e) {
        console.log('Attente du bouton Commander échouée');
    }
    
    if (await btnCommander.isVisible()) {
        await btnCommander.click();
        report.steps.push('Action: Clic "Commander une course"');
        await page.waitForTimeout(1000);
    } else {
        const htmlContent = await page.content();
        console.log("DEBUG HTML DUMP:", htmlContent.substring(0, 500) + "...");
        report.issues.push(`[EXPERT ERROR] Bouton 'Commander une course' introuvable.`);
        throw new Error("Bouton 'Commander une course' introuvable sur la Landing Page");
    }

    // 3. Booking Modal
    console.log(' -> Interaction Modale Réservation...');
    await waitForOverlay(page);
    await page.waitForSelector('text=Configurer la tournée', { timeout: 10000 });
    report.steps.push('Modale: Configurer la tournée visible');

    // Bouton "Voir les créneaux"
    const btnVoirCreneaux = await page.getByText('Voir les créneaux');
    if (await btnVoirCreneaux.isVisible()) {
        await btnVoirCreneaux.click();
        await page.waitForTimeout(2000);
    }

    // Sélection créneau
    await waitForOverlay(page);
    const slotSelected = await selectAvailableSlot(page, report);

    // Confirmer
    await page.waitForTimeout(1000);
    const btnConfirmer = await page.getByText('Confirmer pour');
    
    if (await btnConfirmer.isVisible()) {
        const fullText = await btnConfirmer.textContent();
        console.log(` -> Bouton trouvé. Texte: "${fullText}"`);
        
        await page.waitForTimeout(500);
        await btnConfirmer.click({ force: true });
        console.log(' -> Clic Confirm effectué');
        report.steps.push('Modale: Validation effectuée');
    } else if (slotSelected) {
        report.issues.push('[UX] Bouton de confirmation non apparu après sélection');
    }

    // 4. Redirect Login
    console.log(' -> Vérification Redirection Login...');
    try {
        await page.waitForURL('**/login', { timeout: 15000 });
        report.steps.push('Navigation: Redirection vers /login réussie');
    } catch (e) {
        report.issues.push(`[NAV] Pas de redirection vers /login. URL actuelle: ${page.url()}`);
        if (!page.url().includes('login')) {
            await page.goto(TARGETS.LOGIN_URL);
        }
    }

    // 5. Formulaire Login
    console.log(' -> Test Login (QA User)...');
    await page.waitForSelector('input[type="email"]');
    await page.fill('input[type="email"]', QA_CREDENTIALS.email);
    
    const btnSwitchPass = await page.getByText('utiliser mon mot de passe');
    if (await btnSwitchPass.isVisible()) {
        await btnSwitchPass.click();
        await page.waitForTimeout(500);
    }

    await page.fill('input[type="password"]', QA_CREDENTIALS.password);
    
    const btnSubmit = await page.locator('button[type="submit"]');
    const btnText = await btnSubmit.textContent();
    console.log(` -> Bouton Submit trouvé: "${btnText}"`);
    await btnSubmit.click();
    
    report.steps.push('Login: Formulaire soumis');

    // 6. Dashboard Check
    await page.waitForTimeout(3000);
    
    const errorMsg = await page.locator('.text-red-200').first();
    if (await errorMsg.isVisible()) {
        const errText = await errorMsg.textContent();
        console.log(` -> Login Réponse: Erreur UI détectée ("${errText}")`);
        report.steps.push(`Login: UI Erreur validée ("${errText}")`);
    } else if (page.url().includes('/dashboard')) {
        report.steps.push('Login: Accès Dashboard RÉUSSI');
    } else {
        report.issues.push('[LOGIN] Aucune réaction détectée (ni erreur, ni redirection)');
    }
    
    // 7. Chaos Monkey
    console.log(' -> 🐒 Démarrage du Chaos Monkey...');
    await exploreAndClick(page, report);
}

module.exports = { runStandardShopper };
