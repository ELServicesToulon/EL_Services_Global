/**
 * @file Sentinel_Core.js
 * @description ORCHESTRATEUR PRINCIPAL ANTIGRAVITY
 * Coordonne les agents spécialisés (Modules) et assure la liaison avec le Dashboard Google.
 */

require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// --- MODULES ---
const ArchiveKeeper = require('./Agents_Modules/Archive_Keeper');
const NetworkOverseer = require('./Agents_Modules/Network_Overseer');
const GhostShopper = require('./Agents_Modules/Ghost_Shopper');
const TeslaMonitor = require('./Agents_Modules/Tesla_Monitor');

// --- CONFIGURATION ---
const KEY_FILE_PATH = path.join(__dirname, 'keys', 'service-account.json');
const SHEET_NAME_TARGET = 'Projet_ELS_Journal_Agents';
const SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
];

// --- ETAT GLOBAL ---
let googleSheets = null;
let googleDrive = null;
let logSheetId = null;

// =========================================================
// GOOGLE INTERFACE
// =========================================================

async function initGoogleConnection() {
    if (!fs.existsSync(KEY_FILE_PATH)) {
        console.error('❌ Clé Service Account introuvable !');
        return false;
    }
    const auth = new google.auth.GoogleAuth({ keyFile: KEY_FILE_PATH, scopes: SCOPES });
    const client = await auth.getClient();
    googleSheets = google.sheets({ version: 'v4', auth: client });
    googleDrive = google.drive({ version: 'v3', auth: client });
    console.log(`📡 Connecté : ${client.credentials.client_email}`);
    return true;
}

async function findOrInitJournal() {
    try {
        const res = await googleDrive.files.list({
            q: `name = '${SHEET_NAME_TARGET}' and mimeType = 'application/vnd.google-apps.spreadsheet'`,
            fields: 'files(id, name)'
        });
        if (res.data.files.length > 0) {
            logSheetId = res.data.files[0].id;
        } else {
            console.log('📝 Création du Journal Google Sheet...');
            const file = await googleDrive.files.create({
                resource: { name: SHEET_NAME_TARGET, mimeType: 'application/vnd.google-apps.spreadsheet' },
                fields: 'id'
            });
            logSheetId = file.data.id;
        }
        return logSheetId;
    } catch (e) {
        console.warn('⚠️ Mode Hors-Ligne (Google Drive inaccessible)');
        return null; // Pas grave, on loguera en local
    }
}

async function remoteLog(agentName, message) {
    const timestamp = new Date().toISOString();
    console.log(`[${agentName}] ${message}`);

    if (logSheetId && googleSheets) {
        try {
            await googleSheets.spreadsheets.values.append({
                spreadsheetId: logSheetId,
                range: 'A:C',
                valueInputOption: 'USER_ENTERED',
                resource: { values: [[timestamp, agentName, message]] }
            });
        } catch (e) { /* Fail silently remote */ }
    }
}

// =========================================================
// ORCHESTRATION LOOP
// =========================================================

async function main() {
    console.clear();
    console.log('╔══════════════════════════════════════╗');
    console.log('║     ANTIGRAVITY - SENTINEL CORE      ║');
    console.log('╚══════════════════════════════════════╝');

    if (await initGoogleConnection()) {
        await findOrInitJournal();
        await remoteLog('ORCHESTRATOR', 'Démarrage du système local.');
    }

    console.log('🚀 Lancement des cycles initiaux...');

    // 1. ARCHIVAGE (Initial + 5 min)
    const initBackup = await ArchiveKeeper.runBackupCycle();
    if (initBackup) console.log(initBackup);

    setInterval(async () => {
        const backupReport = await ArchiveKeeper.runBackupCycle();
        if (backupReport) await remoteLog('ARCHIVE', backupReport);
    }, 300000);

    // 2. NETWORK HEALTH (Initial + 10 min)
    const initHealth = await NetworkOverseer.runHealthCheck();
    if (initHealth) console.log(initHealth);
    else console.log('[NETWORK] Tous les systèmes répondent.');

    setInterval(async () => {
        const healthReport = await NetworkOverseer.runHealthCheck();
        if (healthReport) await remoteLog('NETWORK', healthReport);
    }, 600000);

    // 3. TESSIE / TESLA (Initial + 5 min)
    const initTesla = await TeslaMonitor.runTeslaAudit();
    if (initTesla) console.log(`[TESLA] ${initTesla}`);

    setInterval(async () => {
        const report = await TeslaMonitor.runTeslaAudit();
        if (report && report.includes('ALERTE')) {
            console.error(report);
            await remoteLog('TESLA', report);
        } else if (report && !report.includes('non trouvée')) {
            // Log de routine si besoin, sinon silencieux
        }
    }, 300000);

    // 4. GHOST SHOPPER (Différé + 4h)
    // On le lance une fois au démarrage après 5 secondes
    console.log('👻 Ghost Shopper : Armé et prêt.');

    setTimeout(async () => {
        console.log('👻 Ghost Shopper : Lancement de l\'infiltration...');
        try {
            const report = await GhostShopper.runGhostShopperCycle();
            if (!report.success) {
                console.error('👻 ECHEC :', report.error);
                await remoteLog('GHOST_SHOPPER', `ERREUR: ${report.error}`);
            } else {
                console.log('👻 SUCCES :', report.steps.join(' -> '));
                if (report.screenshotPath) console.log(`📸 Preuve capturée : ${report.screenshotPath}`);
                await remoteLog('GHOST_SHOPPER', `Parcours OK. ${report.steps.join(' -> ')}`);
            }
        } catch (e) {
            console.error('👻 CRASH :', e.message);
        }
    }, 5000);

    setInterval(async () => {
        const report = await GhostShopper.runGhostShopperCycle();
        if (!report.success) await remoteLog('GHOST_SHOPPER', `ERREUR: ${report.error}`);
        else await remoteLog('GHOST_SHOPPER', `Parcours OK.`);
    }, 14400000);


    console.log('\n⏳ En attente...');

    // Heartbeat visuel
    setInterval(() => {
        process.stdout.write(`\r[${new Date().toLocaleTimeString()}] Active. Mem: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
    }, 60000);
}

main().catch(console.error);
