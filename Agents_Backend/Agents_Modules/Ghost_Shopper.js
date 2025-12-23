/**
 * @file Ghost_Shopper.js
 * @description AGENT HYBRIDE: GHOST SHOPPER + CLIENT EXPERT (Backend QA)
 * Combine la simulation de parcours utilisateur (Ghost Shopper) avec l'analyse technique pointue (Client Expert).
 * 
 * NOUVELLES CAPACITÉS :
 * 1. 🕵️‍♂️ Console Spy : Détecte les erreurs JavaScript invisibles à l'utilisateur.
 * 2. 🕸️ Network Sniffer : Repère les images manquantes (404) ou erreurs API (500).
 * 3. ⚡ Performance Audit : Mesure les temps de chargement réels.
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
    console.log('[CLIENT EXPERT] 🚀 Démarrage de la session QA + Parcours...');

    const browser = await chromium.launch({ headless: true }); // Mettre false pour voir le bot travailler
    const context = await browser.newContext({
        userManager: 'Antigravity QA Agent',
        viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();

    let report = {
        success: true,
        steps: [],
        issues: [], // Warnings, Performance, Console errors
        screenshotPath: null,
        error: null
    };

    // --- 🕵️‍♂️ SETUP DES SONDES (MONITORING) ---

    // 1. Sonde Console (JS Errors)
    page.on('console', msg => {
        if (msg.type() === 'error' || msg.type() === 'warning') {
            const text = msg.text();
            // Ignorer les warnings bénins de Google Scripts ou du navigateur
            if (text.includes('DevTools') || text.includes('third-party cookie')) return;

            report.issues.push(`[JS ${msg.type().toUpperCase()}] ${text}`);
            console.log(`⚠️ JS: ${text}`);
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
            // Ignorer les 403 sur certains trackers ou fonts parfois normale
            if (response.url().includes('favicon')) return;

            report.issues.push(`[NETWORK ${response.status()}] ${response.url()}`);
            console.log(`🛑 HTTP ${response.status()}: ${response.url()}`);
        }
    });

    try {
        const tStart = Date.now();

        // 1. Accès au Portail
        console.log(' -> Navigation vers le portail...');
        const targetUrl = 'https://script.google.com/macros/s/AKfycbwxyNfzBZKsV6CpWsN39AuB0Ja40mpdEmkAGf0Ml_1tOIMfJDE-nsu7ySXTcyaJuURb/exec';

        const navResponse = await page.goto(targetUrl, { timeout: 60000 });
        const loadTime = Date.now() - tStart;
        report.steps.push(`Navigation Initiale: ${navResponse.status()} en ${loadTime}ms`);

        // DEBUG: Dump HTML to analyze crash state
        const htmlContent = await page.content();
        console.log('--- HTML DUMP START ---');
        console.log(htmlContent);
        console.log('--- HTML DUMP END ---');

        // Audit Performance Chargement
        if (loadTime > PERF_THRESHOLDS.PAGE_LOAD) {
            report.issues.push(`[PERF] Chargement initial lent: ${loadTime}ms (Objectif: <${PERF_THRESHOLDS.PAGE_LOAD}ms)`);
        }

        await page.waitForLoadState('networkidle');

        // --- ETAPE 1 : CODE POSTAL (Eligibilité) ---
        console.log(' -> Vérification Eligibilité (83000)...');
        const cpSelectors = ['input[name="codePostal"]', 'input[placeholder*="Code Postal"]', '#cp-input', 'input[type="text"]'];
        let cpInputCible = null;

        await page.waitForTimeout(2000); // Stabilisation UI

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
            await page.waitForTimeout(3000); // Attente réponse AJAX
        } else {
            // Si pas de champ CP, on assume qu'on est peut-être déjà logué ou page différente
            report.steps.push('ℹ️ Champ CP non trouvé (Bypass)');
        }

        // --- ETAPE 2 : AUDIT DISPONIBILITÉ ---
        // L'Expert vérifie s'il y a des créneaux, non seulement pour réserver, mais pour signaler une "Pénurie"
        console.log(' -> Audit Créneaux...');

        // Support complet de l'interface Calendrier (V2)
        const calendarDaySelector = '.jour-calendrier:not(.desactive)';
        try {
            // Attendre explicitement que le calendrier soit rendu (max 10s) car le chargement initial est lent
            await page.waitForSelector('.jour-calendrier', { state: 'attached', timeout: 10000 });
        } catch (e) {
            console.log(' -> Calendrier non détecté après attente (Timeout).');
        }

        if (await page.isVisible(calendarDaySelector)) {
            console.log(' -> Calendrier détecté. Sélection d\'un jour disponible...');
            await page.waitForTimeout(1000); // 1s stabilite
            const days = await page.$$(calendarDaySelector);
            if (days.length > 0) {
                // Clique sur le premier jour dispo (souvent demain ou jour même)
                await days[0].click();
                console.log(' -> Jour sélectionné.');
                await page.waitForTimeout(2000); // Attente ouverture modale créneaux
            } else {
                report.issues.push('[STOCK] Calendrier affiché mais aucun jour sélectionnable !');
            }
        }

        const slotSelectors = ['.creneau-disponible', '.slot-item', 'button.slot', 'div[onclick*="selectSlot"]', '.creneau-item', '.time-slot'];
        await page.waitForSelector('body'); // Juste pour être sûr

        // Petite attente pour le rendu dynamique
        await page.waitForTimeout(2000);

        let slotsAvailable = 0;
        let slotFound = false;

        for (const selector of slotSelectors) {
            const slots = await page.$$(selector);
            slotsAvailable += slots.length;
            if (slots.length > 0) {
                // On clique sur le premier pour le parcours Ghost Shopper
                console.log(` -> Créneau trouvé (${selector}). Clic.`);
                await slots[0].click();
                slotFound = true;
                break;
            }
        }

        if (slotsAvailable === 0 && !slotFound) {
            report.issues.push('[STOCK] Aucun créneau de livraison disponible !');
        } else {
            report.steps.push(`Créneaux détectés. Sélection du premier.`);
        }

        if (!slotFound) {
            // Fallback générique
            const btnResa = await page.$('button:has-text("Réserver")');
            if (btnResa) await btnResa.click();
        }
        await page.waitForTimeout(2000);

        // --- ETAPE 3 : FORMULAIRE & UX ---
        console.log(' -> Validation UX Formulaire...');

        const formMap = {
            'email': 'antigravityels@gmail.com',
            'nom': 'Bot Expert',
            'prenom': 'QA Detect',
            'telephone': '0600000000',
            'adresse': '1 rue du Test Quality, 83000 Toulon'
        };

        let filledCount = 0;
        for (const [key, val] of Object.entries(formMap)) {
            const sels = [`input[name="${key}"]`, `input[id="${key}"]`, `input[placeholder*="${key}"]`];
            for (const s of sels) {
                if (await page.isVisible(s)) {
                    await page.fill(s, val);
                    filledCount++;
                    break;
                }
            }
        }
        report.steps.push(`Formulaire: ${filledCount}/5 champs identifiés et remplis`);

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
            // Check temps de réponse validation
            const tSubmit = Date.now();
            await page.waitForTimeout(5000); // Attente confirmation et animation

            // Vérification visuelle
            const content = await page.content();
            if (content.includes('Merci') || content.includes('reçue') || content.includes('Confirmé')) {
                report.steps.push('✅ Confirmation de commande reçue');
            } else {
                report.issues.push('[UX] Confirmation non explicite après clic (Pas de message "Merci")');
            }
        } else {
            report.steps.push('⚠️ Bouton Commander introuvable (Bloquant pour Ghost Shopper, mais Expert continue l\'audit)');
        }

        // --- CONCLUSION DU RAPPORT ---
        // S'il y a trop d'issues, on considère le test "Failed" pour attirer l'attention
        if (report.issues.length > 3) {
            report.success = false;
            report.error = "Trop d'anomalies détectées (" + report.issues.length + ")";
        }

        return await finishSession(report, page);

    } catch (error) {
        console.error(`[EXPERT ERROR] ${error.message}`);
        report.success = false;
        report.error = error.message;

        const screenshotDir = path.join(__dirname, '../../Backups/Screenshots');
        if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
        const errScreenPath = path.join(screenshotDir, `expert_crash_${Date.now()}.png`);
        await page.screenshot({ path: errScreenPath });
        report.screenshotPath = errScreenPath;

        return report;

    } finally {
        await browser.close();
    }
}

async function finishSession(report, page) {
    const screenshotDir = path.join(__dirname, '../../Backups/Screenshots');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

    // Nom explicite : Success ou Alert
    const statusTag = report.issues.length > 0 ? "WARN" : "OK";
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '');
    const screenPath = path.join(screenshotDir, `QA_${statusTag}_${timestamp}.png`);

    await page.screenshot({ path: screenPath });
    report.screenshotPath = screenPath;

    // Log résumé pour Sentinel (Terminal)
    if (report.issues.length > 0) {
        console.log('⚠️ ANOMALIES DÉTECTÉES :');
        report.issues.forEach(i => console.log(`   - ${i}`));
    }

    console.log('[CLIENT EXPERT] Audit terminé.');
    return report;
}

module.exports = { runGhostShopperCycle };
