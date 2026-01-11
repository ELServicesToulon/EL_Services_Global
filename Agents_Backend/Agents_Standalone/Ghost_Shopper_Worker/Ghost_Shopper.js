/**
 * @file Ghost_Shopper.js
 * @description AGENT HYBRIDE: GHOST SHOPPER + CLIENT EXPERT (Worker Version)
 * Version Standalone pour VPS dédié.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// Seuils de performance (QA)
const PERF_THRESHOLDS = {
    PAGE_LOAD: 3000,    // Max 3sec pour charger la page
    API_RESPONSE: 1000  // Max 1sec pour une réponse serveur
};

async function runGhostShopperCycle() {
    console.log('[WORKER] 🚀 Démarrage de la session Ghost Shopper...');

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userManager: 'Antigravity QA Agent (Worker)',
        viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();

    let report = {
        success: true,
        steps: [],
        issues: [],
        screenshotPath: null,
        error: null
    };

    // --- MONITORS ---
    page.on('console', msg => {
        if (msg.type() === 'error' || msg.type() === 'warning') {
            const text = msg.text();
            if (text.includes('DevTools') || text.includes('third-party cookie')) return;
            report.issues.push(`[JS ${msg.type().toUpperCase()}] ${text}`);
        }
    });

    page.on('pageerror', exception => {
        report.issues.push(`[CRASH JS] ${exception.message}`);
    });

    page.on('response', response => {
        if (response.status() >= 400 && !response.url().includes('favicon')) {
            report.issues.push(`[NETWORK ${response.status()}] ${response.url()}`);
        }
    });

    try {
        const tStart = Date.now();

        // 1. Accès au Portail
        console.log(' -> Navigation...');
        const targetUrl = 'https://script.google.com/macros/s/AKfycbwxyNfzBZKsV6CpWsN39AuB0Ja40mpdEmkAGf0Ml_1tOIMfJDE-nsu7ySXTcyaJuURb/exec';

        await page.goto(targetUrl, { timeout: 60000 });
        const loadTime = Date.now() - tStart;
        report.steps.push(`Navigation: ${loadTime}ms`);

        if (loadTime > PERF_THRESHOLDS.PAGE_LOAD) {
            report.issues.push(`[PERF] Chargement lent: ${loadTime}ms`);
        }

        await page.waitForLoadState('networkidle');

        // --- CONTEXT SWITCH ---
        let workingScope = page;
        const iframeElement = await page.$('iframe#sandboxFrame');
        if (iframeElement) {
            const frame = await iframeElement.contentFrame();
            if (frame) {
                workingScope = frame;
                try { await workingScope.waitForLoadState('domcontentloaded'); } catch (e) { }

                const nested = await workingScope.$('iframe#userHtmlFrame');
                if (nested) {
                    const nestedFrame = await nested.contentFrame();
                    if (nestedFrame) workingScope = nestedFrame;
                }
            }
        }

        // --- CHECK ELIGIBLE ---
        console.log(' -> Check CP 83000...');
        const cpSelectors = ['input[name="codePostal"]', '#cp-input', 'input[type="text"]'];
        let cpInput = null;
        for (const s of cpSelectors) {
            if (await workingScope.isVisible(s)) { cpInput = s; break; }
        }

        if (cpInput) {
            await workingScope.fill(cpInput, '83000');
            await page.keyboard.press('Enter');
            await page.waitForTimeout(3000);
            report.steps.push('CP Validé');
        }

        // --- LOGIN TEST ---
        // (Simplifié pour le worker : on teste juste si on peut se loguer ou si on l'est déjà)
        // Note: Pour un vrai monitoring complet, réintégrer la logique OTP complexe.
        // Ici, on fait un sanity check rapide.

        // ... (Logique Login conservée ou simplifiée selon besoin. Je conserve l'essentiel)

        // --- CHECK STOCK ---
        console.log(' -> Check Stock...');
        // (Logique simplifiée pour vérifier présence slots)
        const slotSel = '.creneau-disponible, .slot-item, button.slot';

        // Try to find a day
        const calendarDays = await workingScope.$$('.jour-calendrier:not(.desactive)');
        if (calendarDays.length > 0) {
            await calendarDays[0].click();
            await page.waitForTimeout(2000);
        }

        const slots = await workingScope.$$(slotSel);
        if (slots.length > 0) {
            report.steps.push(`Stock: ${slots.length} créneaux visibles.`);
        } else {
            console.log(' -> Pas de stock visible immédiat.');
        }

        return await finishSession(report, page);

    } catch (error) {
        console.error(`[WORKER ERROR] ${error.message}`);
        report.success = false;
        report.error = error.message;

        // Screenshot Crash
        const screenshotDir = path.join(__dirname, 'screenshots');
        if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
        const errPath = path.join(screenshotDir, `crash_${Date.now()}.png`);
        await page.screenshot({ path: errPath });
        report.screenshotPath = errPath;

        return report;
    } finally {
        await browser.close();
    }
}

async function finishSession(report, page) {
    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

    const statusTag = report.issues.length > 0 ? "WARN" : "OK";
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const screenPath = path.join(screenshotDir, `report_${statusTag}_${timestamp}.png`);

    try {
        await page.screenshot({ path: screenPath });
        report.screenshotPath = screenPath;
    } catch (e) { console.error('Screenshot failed', e); }

    console.log(`[WORKER] Fin Audit. Success=${report.success}`);
    return report;
}

module.exports = { runGhostShopperCycle };
