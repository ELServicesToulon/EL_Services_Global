/**
 * @file Ghost_Shopper/interactions.js
 * @description Module d'interactions (Chaos Monkey + interactions méthodiques)
 */

const { SCAN_CONFIG } = require('./config');

/**
 * Chaos Monkey : Clique sur des éléments interactifs aléatoires
 * @param {Page} page - Instance Playwright Page
 * @param {Object} report - Rapport à alimenter
 */
async function exploreAndClick(page, report) {
    try {
        const interactibles = await page.$$('button, a, [role="button"]');
        console.log(` -> ${interactibles.length} éléments interactifs trouvés.`);
        
        let clicked = 0;
        const maxClicks = Math.min(interactibles.length, SCAN_CONFIG.MAX_CHAOS_CLICKS);
        
        for (let i = 0; i < maxClicks; i++) {
            try {
                const element = interactibles[i];
                if (await element.isVisible() && await element.isEnabled()) {
                    const text = (await element.textContent())
                        .substring(0, 20)
                        .replace(/\n/g, '')
                        .trim();
                    
                    console.log(`   -> Clic sur "${text || 'Element sans texte'}"...`);
                    await element.click({ timeout: 2000, noWaitAfter: true });
                    await page.waitForTimeout(500);
                    clicked++;
                }
            } catch (e) {
                console.log('   -> Clic échoué (ignoré)');
            }
        }
        
        report.steps.push(`Chaos Monkey: ${clicked} clics effectués`);
    } catch (e) {
        report.issues.push(`[CHAOS] Erreur durant l'exploration: ${e.message}`);
    }
}

/**
 * Scan méthodique : Interagit intelligemment avec les éléments
 * @param {Page} page - Instance Playwright Page
 * @param {Object} report - Rapport à alimenter
 */
async function methodicalInteract(page) {
    const interactibles = await page.$$('button:not([disabled]), input:not([type="hidden"]), select');
    console.log(`   -> ${interactibles.length} éléments interactifs détectés.`);

    let interactions = 0;
    
    for (const el of interactibles) {
        if (interactions > SCAN_CONFIG.MAX_INTERACTIONS) break;

        try {
            const isVisible = await el.isVisible();
            if (!isVisible) continue;

            const text = (await el.textContent() || await el.inputValue() || 'Unknown').trim();
            const tag = await el.evaluate(e => e.tagName.toLowerCase());

            // Filtres de sécurité
            if (text.match(/supprimer|delete|logout|deconnexion|déconnexion/i)) {
                console.log(`   -> ⚠️ Element "${text}" ignoré (Sécurité)`);
                continue;
            }

            console.log(`   -> Test Action sur <${tag}>: "${text.substring(0, 20)}"...`);
            await el.hover();
            
            if (tag === 'input') {
                await el.fill('QA Test');
            } else if (text.match(/voir|détail|config|edit|modifier/i)) {
                await el.click({ timeout: 1000 });
                interactions++;
            }
        } catch (e) { 
            // Element détruit ou autre erreur
        }
    }
}

/**
 * Sélectionne un créneau disponible dans une modale
 * @param {Page} page - Instance Playwright Page
 * @param {Object} report - Rapport à alimenter
 * @returns {boolean} True si un créneau a été sélectionné
 */
async function selectAvailableSlot(page, report) {
    const slotButtons = await page.$$('button:has-text(":")');
    
    for (const btn of slotButtons) {
        const isDisabled = await btn.isDisabled();
        const text = await btn.textContent();
        
        if (!isDisabled && text.includes(':')) {
            await btn.click();
            console.log(` -> Créneau sélectionné: ${text}`);
            report.steps.push(`Modale: Créneau ${text} sélectionné`);
            return true;
        }
    }
    
    report.issues.push('[STOCK] Aucun créneau disponible dans la modale');
    return false;
}

module.exports = {
    exploreAndClick,
    methodicalInteract,
    selectAvailableSlot
};
