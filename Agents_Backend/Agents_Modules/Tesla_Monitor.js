/**
 * @file Tesla_Monitor.js
 * @description Surveille la flotte Tesla en utilisant la configuration existante du projet.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Chemin vers la config Apps Script (Source de vérité)
const CONFIG_FILE_PATH = path.resolve(__dirname, '../../Projet_ELS/Configuration.js');
const HISTORY_FILE = path.join(__dirname, '../../Backups/tesla_history.json');

function extractTeslaConfig() {
    try {
        const content = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');

        // Extraction Regex sauvage (car le fichier est du JS Apps Script, pas du JSON pur)
        // On cherche un bloc : TESLA: { ... }
        // Ou des lignes TOKEN: '...'

        const tokenMatch = content.match(/TOKEN:\s*['"]([^'"]+)['"]/);
        const vinMatch = content.match(/VIN:\s*['"]([^'"]+)['"]/);

        if (tokenMatch && vinMatch) {
            return {
                token: tokenMatch[1],
                vin: vinMatch[1]
            };
        }
    } catch (e) {
        console.error("Erreur lecture config Tesla :", e.message);
    }
    return null;
}

async function runTeslaAudit() {
    const config = extractTeslaConfig();
    if (!config || !config.token || config.token.includes('TON_TOKEN')) {
        return "⚠️ Config Tesla non trouvée ou placeholder détecté.";
    }

    // Endpoint Tessie
    const url = `https://api.tessie.com/${config.vin}/state`;

    try {
        const res = await axios.get(url, {
            headers: { 'Authorization': `Bearer ${config.token}` }
        });

        if (res.status === 200) {
            const data = res.data;
            const bat = data.charge_state.battery_level;
            const range = data.charge_state.battery_range;
            const state = data.state; // online, asleep
            const speed = data.drive_state.speed || 0;
            const lat = data.drive_state.latitude;
            const lon = data.drive_state.longitude;

            // Log local de précision
            const logEntry = {
                ts: new Date().toISOString(),
                bat, range, state, speed, lat, lon
            };

            // Append to history file
            let history = [];
            if (fs.existsSync(HISTORY_FILE)) {
                try { history = JSON.parse(fs.readFileSync(HISTORY_FILE)); } catch (e) { }
            }
            history.push(logEntry);
            // On garde les 1000 derniers points pour ne pas exploser
            if (history.length > 1000) history = history.slice(-1000);
            fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));

            // Rapport humain
            let icon = bat > 50 ? "🔋" : "🪫";
            if (state === 'charging') icon = "⚡";

            let statusText = `${icon} Tesla: ${bat}% (${state})`;
            if (speed > 0) statusText += ` 🚀 ${speed} km/h`;

            // Alerte si critique
            if (bat < 20 && state !== 'charging') {
                return `🛑 ALERTE: Batterie Tesla Critique (${bat}%) ! Brancher immédiatement.`;
            }

            return statusText; // Info simple pour le log
        }
    } catch (e) {
        return `❌ Erreur API Tessie: ${e.message}`;
    }
}

module.exports = { runTeslaAudit };
