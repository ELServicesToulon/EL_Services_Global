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
const AgentConnector = require('./Agents_Modules/Agent_Connector');
const DriveManager = require('./Agents_Modules/Drive_Manager');
const AgentFixer = require('./Agents_Modules/Agent_Fixer');
const SecurityAgent = require('./Agents_Modules/Security_Agent');

// --- CONFIGURATION WORKER ---
// Si une IP est définie, Sentinel tentera de déléguer les tâches lourdes.
// Simulation locale : on peut mettre 'localhost' si un serveur SSH tourne, 
// ou laisser vide pour simuler le fallback ou le dispatch mock.
const WORKER_IP = process.env.WORKER_IP || null; // ex: '123.123.123.123'

// Simulation GhostShopper (Activé via Dispatch)
const GhostShopper = { name: 'GHOST_SHOPPER' };

// ... (Rest of imports)

// ... (Inside main function)

// --- 4. GHOST SHOPPER / CLIENT EXPERT (Mode Distribué) ---
if (GhostShopper) {
    console.log('👻 Ghost Shopper : Armé (Mode Distribué).');

    const runDistributedGhostShopper = async () => {
        console.log('👻 Ghost Shopper : Tentative de lancement...');

        try {
            let report = null;

            if (WORKER_IP) {
                // MODE REMOTE (SSH)
                await remoteLog('ORCHESTRATOR', `Dispatching GhostShopper to Worker ${WORKER_IP}...`);

                // Configurer le connecteur (Credentials à sécuriser en prod via .env)
                AgentConnector.configure(WORKER_IP, 'root', process.env.WORKER_PASS || 'password');

                // Exécuter le launcher sur le worker
                const output = await AgentConnector.executeCommand('node /root/sentinel/Worker_Launcher.js GHOST_SHOPPER');
                console.log('👻 [REMOTE] Output:', output);

                // Parser le résultat (on cherche la ligne RAPPORT_JSON)
                const match = output.match(/RAPPORT_JSON: ({.*})/);
                if (match) {
                    report = JSON.parse(match[1]);
                } else {
                    throw new Error("Worker output malformed (No JSON report found)");
                }

            } else {
                // MODE LOCAL / SIMULATION (Fallback)
                console.log('👻 [LOCAL] Pas de Worker IP. Lancement local (Simulation)...');
                // On appelle le Launcher localement via child_process pour simuler l'isolation
                const { exec } = require('child_process');
                const localCmd = `node ${path.join(__dirname, 'Worker_Launcher.js')} GHOST_SHOPPER`;

                const stdout = await new Promise((resolve, reject) => {
                    exec(localCmd, (error, stdout, stderr) => {
                        if (error) reject(error);
                        else resolve(stdout);
                    });
                });

                console.log('👻 [LOCAL] Output:', stdout.trim());
                const match = stdout.match(/RAPPORT_JSON: ({.*})/);
                if (match) report = JSON.parse(match[1]);
                else report = { success: false, error: "Local Exec output malformed" };
            }

            // Traitement du Rapport (Commun Local/Remote)
            if (report) {
                if (report.success) {
                    await remoteLog('GHOST_SHOPPER', `Succès Distribué. Etapes: ${report.steps.join(', ')}`);
                } else {
                    await remoteLog('GHOST_SHOPPER', `Echec Distribué: ${report.error}`);
                }
            }

        } catch (e) {
            console.error('👻 CRASH DISPATCH :', e.message);
            await remoteLog('GHOST_SHOPPER', `CRASH DISPATCH: ${e.message}`);
        }
    };

    // --- SCHEDULING INTELLIGENT (OFF-PEAK) ---
    // Ghost Shopper est lourd, on ne le lance qu'entre 1h et 5h du matin
    let lastGhostShopperRun = null;

    const checkAndRunGhostShopper = async () => {
        const now = new Date();
        const hour = now.getHours();
        const todayStr = now.toISOString().split('T')[0];

        // Vérification de la plage horaire (1h - 5h)
        if (hour >= 1 && hour < 5) {
            // Vérification si déjà lancé aujourd'hui
            if (lastGhostShopperRun !== todayStr) {
                console.log(`🌙 [OFF-PEAK] Fenêtre 1h-5h détectée. Lancement de Ghost Shopper...`);
                await runDistributedGhostShopper();
                lastGhostShopperRun = todayStr;
            }
        }
    };

    // Vérification toutes les 30 minutes
    setInterval(checkAndRunGhostShopper, 1800000); 

    // Premier check au démarrage (au cas où on redémarre la nuit)
    setTimeout(checkAndRunGhostShopper, 10000);
}
const TeslaMonitor = require('./Agents_Modules/Tesla_Monitor');
const AgentMarketing = require('./Agents_Modules/Agent_Marketing');

const Vault = require('./Agents_Modules/Vault');

// --- CONFIGURATION ---
const KEY_FILE_PATH = Vault.getPath('SERVICE_ACCOUNT_KEY');
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

    // (Ancien bloc GhostShopper remplacé par la version distribuée ci-dessus)

    // --- 5. MARKETING (Initial + 1h) ---
    if (AgentMarketing) {
        const initMarketing = await AgentMarketing.runCycle();
        if (initMarketing) await remoteLog('MARKETING', initMarketing);

        setInterval(async () => {
            const mktReport = await AgentMarketing.runCycle();
            if (mktReport) await remoteLog('MARKETING', mktReport);
        }, 3600000);
    }

    // --- 6. DRIVE MANAGER (Initial + 1h) ---
    if (DriveManager) {
        const initDrive = await DriveManager.runOrganizationCycle();
        if (initDrive) await remoteLog('DRIVE', initDrive);

        setInterval(async () => {
            const driveReport = await DriveManager.runOrganizationCycle();
            if (driveReport) await remoteLog('DRIVE', driveReport);
        }, 3600000);
    }

    // --- 7. AGENT FIXER (Initial + 2h) ---
    if (AgentFixer) {
        const initFixer = await AgentFixer.runFixerCycle(false);
        if (initFixer) await remoteLog('FIXER', initFixer);

        setInterval(async () => {
            const fixerReport = await AgentFixer.runFixerCycle(false);
            if (fixerReport) await remoteLog('FIXER', fixerReport);
        }, 7200000); // 2h
    }

    // --- 8. SECURITY AGENT (Initial + 4h) ---
    if (SecurityAgent) {
        // Premier scan rapide au démarrage
        const initSecurity = await SecurityAgent.runSecurityCycle();
        if (initSecurity) await remoteLog('SECURITY', initSecurity);

        setInterval(async () => {
            const securityReport = await SecurityAgent.runSecurityCycle();
            if (securityReport) await remoteLog('SECURITY', securityReport);
        }, 14400000); // 4h
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
