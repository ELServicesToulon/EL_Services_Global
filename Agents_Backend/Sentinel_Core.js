/**
 * @file Sentinel_Core.js
 * @description ORCHESTRATEUR PRINCIPAL ANTIGRAVITY (Backend Node.js)
 * Coordonne les agents spécialisés (Modules) et assure la liaison avec le Dashboard Google.
 * Version : 2.0 (Intégration Marketing + Client Expert Local + Logs Fichiers)
 */

require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// --- MODULES ---
const ArchiveKeeper = require('./Agents_Modules/Archive_Keeper');
const NetworkOverseer = require('./Agents_Modules/Network_Overseer');
const GhostShopper = require('./Agents_Modules/Ghost_Shopper'); // aka Client Expert Backend
const TeslaMonitor = require('./Agents_Modules/Tesla_Monitor');
const AgentMarketing = require('./Agents_Modules/Agent_Marketing');

// --- CONFIGURATION ---
const KEY_FILE_PATH = path.join(__dirname, 'keys', 'service-account.json');
const SHEET_NAME_TARGET = 'Projet_ELS_Journal_Agents';
const LOG_FILE_LOCAL = path.join(__dirname, 'rapport_anomalies.txt');

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
        console.error('❌ Clé Service Account introuvable (Sentinel Mode Local Uniquement) !');
        return false;
    }
    try {
        const auth = new google.auth.GoogleAuth({ keyFile: KEY_FILE_PATH, scopes: SCOPES });
        const client = await auth.getClient();
        googleSheets = google.sheets({ version: 'v4', auth: client });
        googleDrive = google.drive({ version: 'v3', auth: client });
        console.log(`📡 Connecté : ${client.credentials.client_email}`);
        return true;
    } catch (e) {
        console.error('❌ Erreur Connexion Google :', e.message);
        return false;
    }
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
        return null;
    }
}

async function remoteLog(agentName, message) {
    const timestamp = new Date().toISOString();
    const cleanMsg = typeof message === 'string' ? message : JSON.stringify(message);

    // 1. Log Terminal
    console.log(`[${agentName}] ${cleanMsg}`);

    // 2. Log Local File (Backup)
    try {
        const logLine = `[${timestamp}] [${agentName}] ${cleanMsg}\n`;
        fs.appendFileSync(LOG_FILE_LOCAL, logLine);
    } catch (e) { /* Ignore */ }

    // 3. Log Google (Si dispo)
    if (logSheetId && googleSheets) {
        try {
            await googleSheets.spreadsheets.values.append({
                spreadsheetId: logSheetId,
                range: 'A:C',
                valueInputOption: 'USER_ENTERED',
                resource: { values: [[timestamp, agentName, cleanMsg]] }
            });
        } catch (e) { /* Fail silently */ }
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

    // Init Connexions
    const connected = await initGoogleConnection();
    if (connected) {
        await findOrInitJournal();
        await remoteLog('ORCHESTRATOR', 'Démarrage du système (v2.0).');
    } else {
        console.log('⚠️ SENTINEL en mode HORS-LIGNE (Pas de sync Google).');
    }

    console.log('🚀 Lancement des cycles initiaux...');

    // --- 1. ARCHIVAGE (Initial + 5 min) ---
    if (ArchiveKeeper) {
        const initBackup = await ArchiveKeeper.runBackupCycle();
        if (initBackup) console.log(initBackup);

        setInterval(async () => {
            const backupReport = await ArchiveKeeper.runBackupCycle();
            if (backupReport) await remoteLog('ARCHIVE', backupReport);
        }, 300000);
    }

    // --- 2. NETWORK HEALTH (Initial + 10 min) ---
    if (NetworkOverseer) {
        const initHealth = await NetworkOverseer.runHealthCheck();
        if (initHealth) console.log(initHealth);
        else console.log('[NETWORK] Tous les systèmes répondent.');

        setInterval(async () => {
            const healthReport = await NetworkOverseer.runHealthCheck();
            if (healthReport) await remoteLog('NETWORK', healthReport);
        }, 600000);
    }

    // --- 3. TESSIE / TESLA (Initial + 5 min) ---
    if (TeslaMonitor) {
        const initTesla = await TeslaMonitor.runTeslaAudit();
        if (initTesla) console.log(`[TESLA] ${initTesla}`);

        setInterval(async () => {
            const report = await TeslaMonitor.runTeslaAudit();
            if (report && report.includes('ALERTE')) {
                console.error(report);
                await remoteLog('TESLA', report);
            }
        }, 300000);
    }

    // --- 4. GHOST SHOPPER / CLIENT EXPERT (Différé + 4h) ---
    if (GhostShopper) {
        console.log('👻 Ghost Shopper : Armé et prêt.');

        // Lancement différé (5s) après boot
        setTimeout(async () => {
            console.log('👻 Ghost Shopper : Lancement de l\'infiltration...');
            try {
                const report = await GhostShopper.runGhostShopperCycle();

                // Rapport Anomalies (partie Expert)
                if (report.issues && report.issues.length > 0) {
                    const issueMsg = `⚠️ ${report.issues.length} ANOMALIES:\n` + report.issues.map(i => `   - ${i}`).join('\n');
                    await remoteLog('CLIENT_EXPERT', issueMsg);
                }

                // Rapport Global
                if (!report.success) {
                    console.error('👻 ECHEC :', report.error);
                    await remoteLog('GHOST_SHOPPER', `ERREUR CRITIQUE: ${report.error}`);
                } else {
                    console.log('👻 SUCCES :', report.steps.join(' -> '));
                    if (report.screenshotPath) console.log(`📸 Preuve capturée : ${report.screenshotPath}`);
                    await remoteLog('GHOST_SHOPPER', `Parcours OK. ${report.steps.length} étapes validées.`);
                }
            } catch (e) {
                console.error('👻 CRASH :', e.message);
                await remoteLog('GHOST_SHOPPER', `CRASH EXECUTION: ${e.message}`);
            }
        }, 5000);

        // Puis toutes les 4h
        setInterval(async () => {
            const report = await GhostShopper.runGhostShopperCycle();
            if (report.issues && report.issues.length > 0) {
                await remoteLog('CLIENT_EXPERT', `⚠️ ${report.issues.length} ANOMALIES AUTOMATISÉES.`);
            }
            if (!report.success) await remoteLog('GHOST_SHOPPER', `ERREUR: ${report.error}`);
            else await remoteLog('GHOST_SHOPPER', `Parcours OK.`);
        }, 14400000);
    }

    // --- 5. MARKETING (Initial + 1h) ---
    if (AgentMarketing) {
        const initMarketing = await AgentMarketing.runCycle();
        if (initMarketing) await remoteLog('MARKETING', initMarketing);

        setInterval(async () => {
            const mktReport = await AgentMarketing.runCycle();
            if (mktReport) await remoteLog('MARKETING', mktReport);
        }, 3600000);
    }

    console.log('\n⏳ En attente... (Ctrl+C pour arrêter)');

    // Heartbeat visuel
    setInterval(() => {
        process.stdout.write(`\r[${new Date().toLocaleTimeString()}] Active. Mem: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
    }, 60000);
}

main().catch(error => {
    console.error("🔥 CRASH SENTINEL UTMOST LEVEL:", error);
});
