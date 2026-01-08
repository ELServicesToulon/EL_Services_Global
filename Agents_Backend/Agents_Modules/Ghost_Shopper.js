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
    PAGE_LOAD: 8000,    // Max 8sec pour charger la page (plus réaliste)
    API_RESPONSE: 2000  // Max 2sec pour une réponse serveur
};

/**
 * Attente intelligente de la disparition du loader
 */
async function waitForOverlay(page) {
    try {
        // On attend que l'indicateur de chargement soit masqué ou détaché
        await page.waitForSelector('#indicateur-chargement', { state: 'hidden', timeout: 10000 });
    } catch (e) {
        // On ignore le timeout si l'élément n'existait déjà pas
    }
}

async function runGhostShopperCycle() {
    console.log('[CLIENT EXPERT] 🚀 Démarrage de la session QA + Parcours V2...');

    const browser = await chromium.launch({ headless: true }); // Mettre false pour voir le bot travailler
    const context = await browser.newContext({
        userManager: 'Antigravity QA Agent',
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true // Au cas où certificats locaux/staging
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
    // 1. Sonde Console (JS Errors & Logs)
    page.on('console', msg => {
        const text = msg.text();
        // Still ignore React warnings
        if (text.includes('DevTools') || text.includes('third-party cookie') || text.includes('React Router')) return;

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
            // Ignorer les 403 sur certains trackers ou fonts
            if (response.url().includes('favicon')) return;
            // Ignorer les 401 si c'est Supabase (Auth required normal au début)
            if (response.status() === 401 && response.url().includes('supabase')) return;

            report.issues.push(`[NETWORK ${response.status()}] ${response.url()}`);
            console.log(`🛑 HTTP ${response.status()}: ${response.url()}`);
        }
    });

    try {
        const tStart = Date.now();

        // 1. Accès au Portail V2
        const targetUrl = 'https://mediconvoi.fr/test_chatbot.html';
        console.log(` -> Navigation vers ${targetUrl}...`);

        const navResponse = await page.goto(targetUrl, { timeout: 60000, waitUntil: 'domcontentloaded' });
        const loadTime = Date.now() - tStart;
        report.steps.push(`Navigation Initiale: ${navResponse.status()} en ${loadTime}ms`);

        // Audit Performance Chargement
        if (loadTime > PERF_THRESHOLDS.PAGE_LOAD) {
            report.issues.push(`[PERF] Chargement initial lent: ${loadTime}ms (Objectif: <${PERF_THRESHOLDS.PAGE_LOAD}ms)`);
        }

        await waitForOverlay(page);
        await page.waitForTimeout(1000); // UI stabilization

        // --- ETAPE 2 : LANDING - BUTTON COMMANDER ---
        console.log(' -> Recherche du bouton "Commander une course"...');
        // On cherche un bouton qui contient le texte ou le lien vers modal/booking
        // Dans Landing.jsx, c'est un bouton avec onClick qui ouvre la modal
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
            throw new Error("Bouton 'Commander une course' introuvable sur la Landing Page");
        }

        // --- ETAPE 3 : BOOKING MODAL ---
        console.log(' -> Interaction Modale Réservation...');
        
        // Attente de la modale
        await waitForOverlay(page);
        await page.waitForSelector('text=Configurer la tournée', { timeout: 10000 });
        report.steps.push('Modale: Configurer la tournée visible');

        // Bouton "Voir les créneaux"
        const btnVoirCreneaux = await page.getByText('Voir les créneaux');
        if (await btnVoirCreneaux.isVisible()) {
            await btnVoirCreneaux.click();
            await page.waitForTimeout(2000); // Load slots simulation
        }

        // Sélection d'un créneau (le premier disponible)
        await waitForOverlay(page);
        
        // Les slots sont des boutons avec border et texte heure (ex: "08:00")
        // On cherche un bouton qui n'est pas disabled
        const slotButtons = await page.$$('button:has-text(":")'); // Heuristique simple
        let slotSelected = false;

        for (const btn of slotButtons) {
            const isDisabled = await btn.isDisabled();
            const text = await btn.textContent();
            // On vérifie que c'est bien une heure (xx:xx)
            if (!isDisabled && text.includes(':')) {
                await btn.click();
                console.log(` -> Créneau sélectionné: ${text}`);
                report.steps.push(`Modale: Créneau ${text} sélectionné`);
                slotSelected = true;
                break;
            }
        }

        if (!slotSelected) {
            report.issues.push('[STOCK] Aucun créneau disponible dans la modale (ou pas de bouton détecté)');
            // On essaie de continuer si jamais un créneau était pré-sélectionné (peu probable)
        }

        // Confirmer (Bouton Vert) - Check for Debug Text to confirm version
        await page.waitForTimeout(1000);
        const btnConfirmer = await page.getByText('Confirmer pour'); // Partial match works
        // Verify full text to see if DEBUG is there
        const fullText = await btnConfirmer.textContent();
        console.log(` -> Bouton trouvé. Texte: "${fullText}"`);

        if (fullText.includes("DEBUG")) {
             console.log("✅ VERSION DEBUG ACTIVER (Code à jour)");
        } else {
             console.log("❌ ANCIENNE VERSION DETECTEE (Cache encore actif)");
        }
        
        if (await btnConfirmer.isVisible()) {
            await page.waitForTimeout(500); // Wait for animation
            await btnConfirmer.click({ force: true });
            console.log(' -> Clic Confirm effectué (Forced ID)');
            report.steps.push('Modale: Validation effectuée');
        } else if (slotSelected) {
            report.issues.push('[UX] Bouton de confirmation non apparu après sélection');
        }

        // --- ETAPE 4 : REDIRECT LOGIN ---
        console.log(' -> Vérification Redirection Login...');
        // Attente URL /login
        try {
            await page.waitForURL('**/login', { timeout: 15000 });
            report.steps.push('Navigation: Redirection vers /login réussie');
        } catch (e) {
            report.issues.push(`[NAV] Pas de redirection vers /login. URL actuelle: ${page.url()}`);
            // On tente de forcer si on est resté bloqué
            if (!page.url().includes('login')) await page.goto(targetUrl + '/login');
        }

        // --- ETAPE 5 : FORMULAIRE LOGIN ---
        console.log(' -> Test Login (QA User)...');
        await page.waitForSelector('input[type="email"]');
        
        // Remplir Email
        await page.fill('input[type="email"]', 'antigravityels@gmail.com');
        
        // Switch Password Mode ("Je préfère utiliser mon mot de passe")
        const btnSwitchPass = await page.getByText('utiliser mon mot de passe');
        if (await btnSwitchPass.isVisible()) {
            await btnSwitchPass.click();
            await page.waitForTimeout(500);
        }

        // Remplir Password
        await page.fill('input[type="password"]', 'test1234'); // Mot de passe bidon pour tester l'UI, ou vrai si connu
        
        // Submit
        const btnSubmitHost = await page.locator('button[type="submit"]');
        // On vérifie le texte pour être sûr
        const btnText = await btnSubmitHost.textContent();
        console.log(` -> Bouton Submit trouvé: "${btnText}"`);
        await btnSubmitHost.click();
        
        report.steps.push('Login: Formulaire soumis');

        // --- ETAPE 6 : DASHBOARD CHECK ---
        // On s'attend à une erreur (mauvais mdp) ou un succès (redirection dashboard)
        // Comme on n'a pas les creds de prod ici (hardcoded check), on va juste vérifier la réaction.
        // Si le message d'erreur apparait -> UI OK.
        // Si dashboard apparait -> Login OK.
        
        await page.waitForTimeout(3000);
        
        const errorMsg = await page.locator('.text-red-200').first(); // Classe d'erreur vue dans Login.jsx
        if (await errorMsg.isVisible()) {
            const errText = await errorMsg.textContent();
            console.log(` -> Login Réponse: Erreur UI détectée ("${errText}")`);
            report.steps.push(`Login: UI Erreur validée ("${errText}")`);
        } else if (page.url().includes('/dashboard')) {
            report.steps.push('Login: Accès Dashboard RÉUSSI');
        } else {
            report.issues.push('[LOGIN] Aucune réaction détectée (ni erreur, ni redirection)');
        }

        // --- ETAPE 7 : CHAOS MONKEY (EXPLORATION) ---
        console.log(' -> 🐒 Démarrage du Chaos Monkey (Click Partout)...');
        await exploreAndClick(page, report);

        // --- CONCLUSION DU RAPPORT ---
        // S'il y a trop d'issues, on considère le test "Failed" pour attirer l'attention
        if (report.issues.length > 5) { // Seuil augmenté pour Chaos Monkey
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

/**
 * Fonction Chaos Monkey : Clique sur tous les éléments interactifs visibles
 */
async function exploreAndClick(page, report) {
    try {
        // On récupère boutons et liens
        const interactibles = await page.$$('button, a, [role="button"]');
        console.log(` -> ${interactibles.length} éléments interactifs trouvés.`);
        
        let clicked = 0;
        // On clique sur un échantillon (max 10) pour ne pas y passer la nuit
        for (let i = 0; i < Math.min(interactibles.length, 15); i++) {
            try {
                // On revérifie la liste à chaque fois car le DOM peut changer
                // Mais pour simplifier ici on itère sur les handles (risque de stale element)
                const element = interactibles[i];
                if (await element.isVisible() && await element.isEnabled()) {
                    const text = (await element.textContent()).substring(0, 20).replace(/\n/g, '').trim();
                    console.log(`   -> Clic sur "${text || 'Element sans texte'}"...`);
                    
                    // On checke si ça navigue
                    await element.click({ timeout: 2000, noWaitAfter: true }); // Clic rapide
                    await page.waitForTimeout(500); // Petite pause
                    clicked++;
                }
            } catch (e) {
                // Stale element ou interception
                console.log('   -> Clic échoué (ignoré)');
            }
        }
        report.steps.push(`Chaos Monkey: ${clicked} clics effectués`);
    } catch (e) {
        report.issues.push(`[CHAOS] Erreur durant l'exploration: ${e.message}`);
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
