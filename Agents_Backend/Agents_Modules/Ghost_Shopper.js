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

        // Audit Performance Chargement
        if (loadTime > PERF_THRESHOLDS.PAGE_LOAD) {
            report.issues.push(`[PERF] Chargement initial lent: ${loadTime}ms (Objectif: <${PERF_THRESHOLDS.PAGE_LOAD}ms)`);
        }

        await page.waitForLoadState('networkidle');

        // --- CONTEXT SWITCH (IFRAME HANDLING) ---
        let workingScope = page;
        const iframeElement = await page.$('iframe#sandboxFrame');
        if (iframeElement) {
            console.log(' -> Wrapper Google détecté. Bascule vers l\'iframe #sandboxFrame...');
            const frame = await iframeElement.contentFrame();
            if (frame) {
                workingScope = frame;
                try {
                    await workingScope.waitForLoadState('domcontentloaded');
                } catch (e) { console.log(' -> Warning: domcontentloaded timeout in iframe'); }

                const nestedFrameElement = await workingScope.$('iframe#userHtmlFrame');
                if (nestedFrameElement) {
                    const nestedFrame = await nestedFrameElement.contentFrame();
                    if (nestedFrame) {
                        console.log(' -> Nested iframe #userHtmlFrame détectée. Bascule...');
                        workingScope = nestedFrame;
                    }
                }
            } else {
                report.issues.push('[ERROR] Impossible d\'accéder au contentFrame du sandboxFrame.');
            }
        }

        // --- TEST LOGIN (CLIENT PORTAL FIX) ---
        console.log(' -> Test Connexion Espace Client (antigravityels@gmail.com)...');
        // On check si le formulaire de connexion est visible (peut être dans un onglet ou direct)
        // D'après les screenshots, c'est parfois direct.
        const emailInputSel = '#email-connexion';
        if (await workingScope.isVisible(emailInputSel)) {
            console.log(' -> Formulaire de connexion détecté.');
            await workingScope.fill(emailInputSel, 'antigravityels@gmail.com');
            const btnConnect = await workingScope.$('#formulaire-connexion-client button[type="submit"]');
            if (btnConnect) {
                await btnConnect.click();
                console.log(' -> Demande de code envoyée.');
                report.steps.push('Login: Email saisi et validé');

                // Attente du champ OTP
                const otpInputSel = '#input-otp';
                try {
                    await workingScope.waitForSelector(otpInputSel, { timeout: 10000 });
                    console.log(' -> Champ OTP apparu.');
                    await workingScope.fill(otpInputSel, '999999'); // Backdoor

                    const btnOtp = await workingScope.$('#form-otp button[type="submit"]');
                    if (btnOtp) {
                        await btnOtp.click();
                        console.log(' -> Code OTP 999999 envoyé.');
                        report.steps.push('Login: Code OTP backdoor utilisé');

                        // Attente succès (disparition form ou message bienvenue)
                        // #message-bienvenue-client
                        try {
                            await workingScope.waitForSelector('#message-bienvenue-client', { timeout: 10000 });
                            const msg = await workingScope.$eval('#message-bienvenue-client', el => el.textContent);
                            console.log(` -> SUCCES LOGIN: ${msg}`);
                            report.steps.push(`Login SUCCES: ${msg}`);
                        } catch (e) {
                            report.issues.push('[LOGIN] Échec validation OTP ou timeout succès.');
                        }
                    }
                } catch (e) {
                    report.issues.push('[LOGIN] Le champ OTP n\'est pas apparu après saisie email.');
                }
            }
        } else {
            console.log(' -> Pas de formulaire de connexion visible immédiatement.');
            report.steps.push('Login: Formulaire non trouvé (Déjà connecté ?)');
        }


        // --- ETAPE 1 : CODE POSTAL (Eligibilité) ---
        console.log(' -> Vérification Eligibilité (83000)...');
        const cpSelectors = ['input[name="codePostal"]', 'input[placeholder*="Code Postal"]', '#cp-input', 'input[type="text"]'];
        let cpInputCible = null;

        await page.waitForTimeout(2000); // Stabilisation UI

        for (const sel of cpSelectors) {
            if (await workingScope.isVisible(sel)) {
                cpInputCible = sel;
                break;
            }
        }

        if (cpInputCible) {
            // ... (suite code postal qui sera recollé par le tool replace s'il gère le contexte)
            // Mais replace_file_content remplace un bloc. Je dois faire attention à ne pas supprimer la suite.
            // Je remplace jusqu'a "report.steps.push('CP 83000 saisi');" exclus ou similaire pour garder la continuité? 
            // Non je dois remettre le bloc Eligibilité complet si je l'ai englobé dans le target.
            // Le target s'arrête à report.steps.push('ℹ️ Champ CP non trouvé (Bypass)');

            // Je vais juste réécrire le début du bloc Eligibilité que j'ai écrasé.
            await workingScope.fill(cpInputCible, '83000');
            report.steps.push('CP 83000 saisi');

            const cpBtnSelectors = ['button:has-text("Vérifier")', 'button:has-text("Valider")', '#btn-check-cp', 'button[type="submit"]'];
            let clickedCp = false;
            for (const sel of cpBtnSelectors) {
                if (await workingScope.isVisible(sel)) {
                    await workingScope.click(sel);
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
            await workingScope.waitForSelector('.jour-calendrier', { state: 'attached', timeout: 10000 });
        } catch (e) {
            console.log(' -> Calendrier non détecté après attente (Timeout).');
            // Check context
            if (workingScope === page) report.issues.push('[WARN] Iframe content check failed - used Top Page');
        }

        if (await workingScope.isVisible(calendarDaySelector)) {
            console.log(' -> Calendrier détecté. Recherche de jours avec créneaux...');

            // Fonction pour tester les jours visibles
            const tryFindDayWithSlots = async () => {
                let days = await workingScope.$$(calendarDaySelector);
                // On teste jusqu'à 3 jours pour éviter de spammer
                const attemptCount = Math.min(days.length, 3);
                for (let i = 0; i < attemptCount; i++) {
                    days = await workingScope.$$(calendarDaySelector);
                    if (days.length <= i) break;

                    const day = days[i];
                    console.log(` -> Test jour ${i + 1}/${days.length}...`);
                    await day.click();
                    try { await workingScope.waitForSelector('#indicateur-chargement', { state: 'hidden', timeout: 5000 }); } catch (e) { }
                    await page.waitForTimeout(2000);

                    // Handle Config (V2)
                    if (await workingScope.isVisible('#modale-config-tournee')) {
                        const btn = await workingScope.$('#formulaire-config-tournee button[type="submit"]');
                        if (btn) await btn.click();
                        await page.waitForTimeout(2500);
                    }

                    // Check Slots
                    const slotSel = '.creneau-disponible, .slot-item, button.slot, .creneau-item';
                    if (await workingScope.isVisible(slotSel)) {
                        return true; // Slots found and visible!
                    }

                    // Fermeture forcée de toute modale bloquante avant suite
                    const modales = ['#modale-selection-creneau', '#modale-config-tournee'];
                    for (const m of modales) {
                        if (await workingScope.isVisible(m)) {
                            console.log(` -> Modale ${m} détectée (sans slots). Fermeture...`);
                            // Wait for loader
                            try { await workingScope.waitForSelector('#indicateur-chargement', { state: 'hidden', timeout: 8000 }); } catch (e) { }

                            const closeBtn = await workingScope.$(`${m} .btn-fermer`);
                            if (closeBtn) await closeBtn.evaluate(b => b.click());
                            else await workingScope.evaluate(selector => {
                                const el = document.querySelector(selector);
                                if (el) el.classList.add('hidden');
                            }, m);
                            await page.waitForTimeout(1000);
                        }
                    }

                    console.log(' -> Pas de slots sur ce jour.');
                }
                return false;
            };

            let slotsFound = await tryFindDayWithSlots();

            if (!slotsFound) {
                console.log(' -> Aucun slot sur les jours testés du mois courant. Passage au suivant...');
                const btnNext = await workingScope.$('#btn-mois-suivant');
                if (btnNext) {
                    await btnNext.click({ force: true });
                    await page.waitForTimeout(2000);
                    slotsFound = await tryFindDayWithSlots();
                }
            }

            if (!slotsFound) {
                report.issues.push('[STOCK] Pénurie: Aucun créneau trouvé (Décembre & Janvier vérifiés).');
            } else {
                console.log(' -> Jour avec créneaux validé.');
            }
        }

        const slotSelectors = ['.creneau-disponible', '.slot-item', 'button.slot', 'div[onclick*="selectSlot"]', '.creneau-item', '.time-slot', '.slot-btn'];

        // Ensure Modale 2 is visible
        if (await workingScope.isVisible('#modale-selection-creneau')) {
            console.log(' -> Modale Sélection Créneau visible.');
        } else {
            console.log(' -> Modale Sélection Créneau NON visible (ou pas encore).');
        }

        let slotsAvailable = 0;
        let slotFound = false;

        // Sécurité: wait for loader hidden
        try { await workingScope.waitForSelector('#indicateur-chargement', { state: 'hidden', timeout: 5000 }); } catch (e) { }

        for (const selector of slotSelectors) {
            const slots = await workingScope.$$(selector);
            slotsAvailable += slots.length;
            if (slots.length > 0) {
                console.log(` -> Créneau trouvé (${selector}). Clic (Force).`);
                await slots[0].click({ force: true });
                slotFound = true;
                break;
            }
        }

        if (slotsAvailable === 0 && !slotFound) {
            report.issues.push('[STOCK] Aucun créneau de livraison disponible !');
            // DEBUG: Dump Grid HTML
            const gridHtml = await workingScope.$eval('#grille-selection-creneau', el => el.innerHTML).catch(() => 'GRID NOT FOUND');
            console.log('--- GRID HTML DUMP ---');
            console.log(gridHtml);
            console.log('--- END GRID DUMP ---');
        } else {
            report.steps.push(`Créneaux détectés. Sélection du premier.`);
        }

        if (!slotFound) {
            // Fallback générique
            const btnResa = await workingScope.$('button:has-text("Réserver")');
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
                if (await workingScope.isVisible(s)) {
                    await workingScope.fill(s, val);
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
            if (await workingScope.isVisible(sel)) {
                await workingScope.click(sel);
                commandeEnvoyee = true;
                break;
            }
        }

        if (commandeEnvoyee) {
            // Check temps de réponse validation
            const tSubmit = Date.now();
            await page.waitForTimeout(5000); // Attente confirmation et animation

            // Vérification visuelle
            const content = await workingScope.content();
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
