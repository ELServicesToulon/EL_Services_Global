/**
 * @file Ghost_Shopper.js
 * @description Agent Client Mystère Avancé. Utilise un vrai navigateur (Chromium headless)
 * pour simuler des parcours utilisateurs complexes.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runGhostShopperCycle(config) {
    console.log('[GHOST SHOPPER] Démarrage de la simulation...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    let report = {
        success: true,
        steps: [],
        screenshotPath: null,
        error: null
    };

    try {
        // 1. Accès au Portail
        console.log(' -> Navigation vers le portail...');
        const targetUrl = 'https://script.google.com/macros/s/AKfycbwxyNfzBZKsV6CpWsN39AuB0Ja40mpdEmkAGf0Ml_1tOIMfJDE-nsu7ySXTcyaJuURb/exec';

        const response = await page.goto(targetUrl, { timeout: 60000 });
        report.steps.push(`Navigation Initiale: ${response.status()}`);
        await page.waitForLoadState('networkidle');

        // --- ETAPE 1 : CODE POSTAL (Eligibilité) ---
        console.log(' -> Vérification Eligibilité (83000)...');
        const cpSelectors = ['input[name="codePostal"]', 'input[placeholder*="Code Postal"]', '#cp-input', 'input[type="text"]'];
        let cpInputCible = null;

        await page.waitForTimeout(5000);

        for (const sel of cpSelectors) {
            if (await page.isVisible(sel)) {
                cpInputCible = sel;
                break;
            }
        }

        if (cpInputCible) {
            await page.fill(cpInputCible, '83000');
            report.steps.push('CP 83000 saisi');

            const cpBtnSelectors = ['button:has-text("Vérifier")', 'button:has-text("Valider")', '#btn-check-cp', 'button[type="submit"]'];
            let clickedCp = false;
            for (const sel of cpBtnSelectors) {
                if (await page.isVisible(sel)) {
                    await page.click(sel);
                    clickedCp = true;
                    break;
                }
            }
            if (!clickedCp) await page.keyboard.press('Enter');
            report.steps.push('Validation CP effectuée');
            await page.waitForTimeout(5000);
        } else {
            report.steps.push('ℹ️ Champ CP non trouvé (Déjà passé ou page différente ?)');
        }

        // --- ETAPE 2 : RESERVATION (Créneaux) ---
        console.log(' -> Tentative de Réservation...');

        const slotSelectors = ['.creneau-disponible', '.slot-item', 'button.slot', 'div[onclick*="selectSlot"]'];
        let slotFound = false;

        // Essai de trouver un créneau
        for (const selector of slotSelectors) {
            const slots = await page.$$(selector);
            if (slots.length > 0) {
                await slots[0].click();
                slotFound = true;
                report.steps.push('Créneau sélectionné');
                break;
            }
        }

        if (!slotFound) {
            report.steps.push('⚠️ Aucun créneau explicite détecté. Tentative générique...');
            const btnResa = await page.$('button:has-text("Réserver")');
            if (btnResa) {
                await btnResa.click();
                report.steps.push('Clic bouton Réserver générique');
            }
        }
        await page.waitForTimeout(2000);

        // --- ETAPE 3 : FORMULAIRE COMMANDE ---
        console.log(' -> Remplissage Formulaire Client...');

        // Remplissage simple des champs standards
        const formMap = {
            'email': 'antigravityels@gmail.com',
            'nom': 'Bot Antigravity',
            'prenom': 'Test',
            'telephone': '0600000000',
            'adresse': '1 rue du Test, 83000 Toulon'
        };

        for (const [key, val] of Object.entries(formMap)) {
            const sels = [`input[name="${key}"]`, `input[id="${key}"]`, `input[placeholder*="${key}"]`];
            for (const s of sels) {
                if (await page.isVisible(s)) {
                    await page.fill(s, val);
                    break;
                }
            }
        }
        report.steps.push('Formulaire rempli');

        // Validation Commande
        const validerCmdSelectors = ['button:has-text("Commander")', 'button:has-text("Confirmer")', '#btn-submit-order'];
        let commandeEnvoyee = false;
        for (const sel of validerCmdSelectors) {
            if (await page.isVisible(sel)) {
                await page.click(sel);
                commandeEnvoyee = true;
                break;
            }
        }

        if (commandeEnvoyee) {
            report.steps.push('Commande soumise !');
            await page.waitForTimeout(10000);

            const content = await page.content();
            if (content.includes('Merci') || content.includes('reçue') || content.includes('Confirmé')) {
                report.steps.push('✅ SUCCÈS : Page de confirmation atteinte');
            } else {
                report.steps.push('❓ Pas de confirmation explicite détectée');
            }
        } else {
            report.steps.push('⚠️ Bouton Commander non trouvé');
        }

        // --- FINALISATION ---
        return await finishSuccess(report, page);

    } catch (error) {
        console.error(`[GHOST ERROR] ${error.message}`);
        report.success = false;
        report.error = error.message;

        const screenshotDir = path.join(__dirname, '../../Backups/Screenshots');
        if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
        const errScreenPath = path.join(screenshotDir, `ghost_error_${Date.now()}.png`);
        await page.screenshot({ path: errScreenPath });
        report.screenshotPath = errScreenPath;

        return report;

    } finally {
        await browser.close();
    }
}

async function finishSuccess(report, page) {
    const screenshotDir = path.join(__dirname, '../../Backups/Screenshots');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '');
    const screenPath = path.join(screenshotDir, `ghost_login_${timestamp}.png`);

    await page.screenshot({ path: screenPath });
    report.screenshotPath = screenPath;
    report.steps.push('Preuve visuelle enregistrée.');

    console.log('[GHOST SHOPPER] Test terminé avec succès.');
    return report;
}

module.exports = { runGhostShopperCycle };
