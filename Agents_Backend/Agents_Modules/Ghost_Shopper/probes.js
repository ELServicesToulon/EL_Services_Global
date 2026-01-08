/**
 * @file Ghost_Shopper/probes.js
 * @description Sondes de monitoring (console JS, network, crashes)
 */

/**
 * Configure les sondes de monitoring sur une page
 * @param {Page} page - Instance Playwright Page
 * @param {Object} report - Objet rapport à alimenter
 */
function setupProbes(page, report) {
    // 1. Sonde Console (JS Errors & Logs)
    page.on('console', msg => {
        const text = msg.text();
        
        // Ignorer les warnings non-critiques
        if (text.includes('DevTools') || 
            text.includes('third-party cookie') || 
            text.includes('React Router')) {
            return;
        }

        if (msg.type() === 'error' || msg.type() === 'warning') {
            report.issues.push(`[JS ${msg.type().toUpperCase()}] ${text}`);
            console.log(`⚠️ JS (${msg.type()}): ${text}`);
        } else {
            console.log(`ℹ️ JS (log): ${text}`);
        }
    });

    // 2. Sonde Crash Page (Uncaught Exceptions)
    page.on('pageerror', exception => {
        const msg = `[CRASH JS] ${exception.message}\nSTACK: ${exception.stack}`;
        report.issues.push(msg);
        console.error(`🔥 ${msg}`);
    });

    // 3. Sonde Réseau (404/500)
    page.on('response', response => {
        if (response.status() >= 400) {
            // Ignorer certains faux positifs
            if (response.url().includes('favicon')) return;
            if (response.status() === 401 && response.url().includes('supabase')) return;

            report.issues.push(`[NETWORK ${response.status()}] ${response.url()}`);
            console.log(`🛑 HTTP ${response.status()}: ${response.url()}`);
        }
    });

    console.log('[PROBES] 🔌 Sondes de monitoring activées');
}

/**
 * Injecte les scripts stealth anti-détection
 * @param {Page} page - Instance Playwright Page
 */
async function injectStealthScripts(page) {
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
        });
    });
    console.log('[STEALTH] 🥷 Scripts anti-détection injectés');
}

module.exports = {
    setupProbes,
    injectStealthScripts
};
