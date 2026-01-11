/**
 * @file Log_Aggregator.js
 * @description Agent qui collecte et affiche les logs de tous les autres agents en temps réel.
 * Exécution à la volée (immédiate) avec affichage formaté.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// --- CONFIGURATION ---
const LOG_FILE = path.join(__dirname, '..', 'rapport_anomalies.txt');
const AGENT_COLORS = {
    'ORCHESTRATOR': '\x1b[36m',  // Cyan
    'ARCHIVE': '\x1b[32m',        // Green
    'NETWORK': '\x1b[33m',        // Yellow
    'TESLA': '\x1b[35m',          // Magenta
    'GHOST_SHOPPER': '\x1b[31m',  // Red
    'MARKETING': '\x1b[34m',      // Blue
    'DRIVE': '\x1b[95m',          // Light Magenta
    'DEFAULT': '\x1b[37m'         // White
};
const RESET = '\x1b[0m';

// --- ÉTAT ---
let lastSize = 0;
let watcher = null;

// =========================================================
// LOG PARSING
// =========================================================

/**
 * Parse une ligne de log au format [timestamp] [AGENT] message
 */
function parseLogLine(line) {
    const match = line.match(/^\[([^\]]+)\]\s*\[([^\]]+)\]\s*(.*)$/);
    if (match) {
        return {
            timestamp: match[1],
            agent: match[2].trim(),
            message: match[3].trim()
        };
    }
    return null;
}

/**
 * Formate et colore une ligne de log pour l'affichage
 */
function formatLogLine(parsed) {
    if (!parsed) return null;
    
    const color = AGENT_COLORS[parsed.agent] || AGENT_COLORS.DEFAULT;
    const time = new Date(parsed.timestamp).toLocaleTimeString('fr-FR');
    
    return `${color}[${time}] [${parsed.agent.padEnd(12)}]${RESET} ${parsed.message}`;
}

// =========================================================
// REAL-TIME MONITORING
// =========================================================

/**
 * Lit les nouvelles lignes du fichier de log
 */
async function readNewLines() {
    if (!fs.existsSync(LOG_FILE)) {
        console.log('[LOG_AGG] Fichier de logs introuvable:', LOG_FILE);
        return [];
    }

    const stats = fs.statSync(LOG_FILE);
    if (stats.size <= lastSize) return [];

    return new Promise((resolve) => {
        const lines = [];
        const stream = fs.createReadStream(LOG_FILE, {
            start: lastSize,
            encoding: 'utf8'
        });

        const rl = readline.createInterface({ input: stream });
        
        rl.on('line', (line) => {
            if (line.trim()) lines.push(line);
        });

        rl.on('close', () => {
            lastSize = stats.size;
            resolve(lines);
        });
    });
}

/**
 * Affiche les logs instantanément
 */
async function displayNewLogs() {
    const newLines = await readNewLines();
    
    for (const line of newLines) {
        const parsed = parseLogLine(line);
        const formatted = formatLogLine(parsed);
        if (formatted) {
            console.log(formatted);
        }
    }

    return newLines.length;
}

/**
 * Démarre le monitoring en temps réel
 */
function startRealTimeMonitoring() {
    console.log('\n╔══════════════════════════════════════╗');
    console.log('║     LOG AGGREGATOR - MODE LIVE       ║');
    console.log('╚══════════════════════════════════════╝\n');

    if (!fs.existsSync(LOG_FILE)) {
        console.log('⚠️  Fichier de logs non trouvé. En attente...');
    }

    // Afficher les 20 dernières lignes au démarrage
    displayLastLines(20);

    // Surveiller les changements
    const checkInterval = setInterval(async () => {
        await displayNewLogs();
    }, 1000);

    // Écouter Ctrl+C pour arrêter proprement
    process.on('SIGINT', () => {
        console.log('\n\n👋 Arrêt du Log Aggregator...');
        clearInterval(checkInterval);
        process.exit(0);
    });

    return checkInterval;
}

/**
 * Affiche les N dernières lignes du fichier
 */
function displayLastLines(count = 20) {
    if (!fs.existsSync(LOG_FILE)) return;

    try {
        const content = fs.readFileSync(LOG_FILE, 'utf8');
        const lines = content.trim().split('\n').slice(-count);
        
        console.log(`📜 Dernières ${count} entrées:\n${'─'.repeat(50)}`);
        
        for (const line of lines) {
            const parsed = parseLogLine(line);
            const formatted = formatLogLine(parsed);
            if (formatted) console.log(formatted);
        }
        
        console.log('─'.repeat(50));
        console.log('📡 En attente de nouveaux logs... (Ctrl+C pour quitter)\n');
        
        // Mettre à jour lastSize pour ne pas réafficher
        lastSize = fs.statSync(LOG_FILE).size;
    } catch (e) {
        console.error('Erreur lecture:', e.message);
    }
}

// =========================================================
// QUERIES
// =========================================================

/**
 * Récupère les logs d'un agent spécifique
 */
function getLogsByAgent(agentName, limit = 50) {
    if (!fs.existsSync(LOG_FILE)) return [];

    const content = fs.readFileSync(LOG_FILE, 'utf8');
    const lines = content.trim().split('\n');
    
    return lines
        .map(parseLogLine)
        .filter(p => p && p.agent.toUpperCase() === agentName.toUpperCase())
        .slice(-limit);
}

/**
 * Récupère les logs des dernières N minutes
 */
function getRecentLogs(minutes = 30) {
    if (!fs.existsSync(LOG_FILE)) return [];

    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    const content = fs.readFileSync(LOG_FILE, 'utf8');
    const lines = content.trim().split('\n');
    
    return lines
        .map(parseLogLine)
        .filter(p => p && new Date(p.timestamp) >= cutoff);
}

/**
 * Compte les logs par agent
 */
function getLogStats() {
    if (!fs.existsSync(LOG_FILE)) return {};

    const content = fs.readFileSync(LOG_FILE, 'utf8');
    const lines = content.trim().split('\n');
    
    const stats = {};
    for (const line of lines) {
        const parsed = parseLogLine(line);
        if (parsed) {
            stats[parsed.agent] = (stats[parsed.agent] || 0) + 1;
        }
    }
    
    return stats;
}

/**
 * Génère un rapport résumé
 */
function generateSummary() {
    const stats = getLogStats();
    const recent = getRecentLogs(60);
    
    console.log('\n📊 RÉSUMÉ DES LOGS');
    console.log('═'.repeat(40));
    
    console.log('\n📈 Par agent (total):');
    for (const [agent, count] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
        const color = AGENT_COLORS[agent] || AGENT_COLORS.DEFAULT;
        console.log(`  ${color}${agent.padEnd(15)}${RESET} ${count} entrées`);
    }
    
    console.log(`\n⏱️  Dernière heure: ${recent.length} entrées`);
    console.log('═'.repeat(40));
    
    return { stats, recentCount: recent.length };
}

// =========================================================
// REPORT GENERATION
// =========================================================

/**
 * Génère un rapport consolidé de tous les agents dans un fichier
 */
function generateReport(outputPath = null) {
    const timestamp = new Date().toISOString().split('T')[0];
    const reportPath = outputPath || path.join(__dirname, '..', `rapport_agents_${timestamp}.md`);
    
    const stats = getLogStats();
    const recentLogs = getRecentLogs(1440); // Dernières 24h
    
    let report = `# Rapport des Agents - ${new Date().toLocaleDateString('fr-FR')}\n\n`;
    report += `Généré le: ${new Date().toLocaleString('fr-FR')}\n\n`;
    report += `---\n\n`;
    
    // Résumé global
    report += `## 📊 Résumé Global\n\n`;
    report += `| Agent | Total Logs | Dernières 24h |\n`;
    report += `|-------|------------|---------------|\n`;
    
    const agents = Object.keys(stats).sort((a, b) => stats[b] - stats[a]);
    for (const agent of agents) {
        const recent24h = recentLogs.filter(l => l.agent === agent).length;
        report += `| ${agent} | ${stats[agent]} | ${recent24h} |\n`;
    }
    
    report += `\n---\n\n`;
    
    // Détail par agent
    report += `## 📝 Détail par Agent\n\n`;
    
    for (const agent of agents) {
        const agentLogs = getLogsByAgent(agent, 20);
        if (agentLogs.length === 0) continue;
        
        report += `### ${agent}\n\n`;
        report += `\`\`\`\n`;
        for (const log of agentLogs) {
            const time = new Date(log.timestamp).toLocaleString('fr-FR');
            report += `[${time}] ${log.message}\n`;
        }
        report += `\`\`\`\n\n`;
    }
    
    // Sauvegarder
    fs.writeFileSync(reportPath, report, 'utf8');
    console.log(`📄 Rapport généré: ${reportPath}`);
    
    return reportPath;
}

/**
 * Génère un rapport JSON pour intégration
 */
function generateJsonReport() {
    const stats = getLogStats();
    const recentLogs = getRecentLogs(1440);
    
    const report = {
        generatedAt: new Date().toISOString(),
        summary: {
            totalLogs: Object.values(stats).reduce((a, b) => a + b, 0),
            last24h: recentLogs.length,
            byAgent: stats
        },
        agents: {}
    };
    
    for (const agent of Object.keys(stats)) {
        report.agents[agent] = {
            totalLogs: stats[agent],
            recentLogs: getLogsByAgent(agent, 10),
            last24h: recentLogs.filter(l => l.agent === agent).length
        };
    }
    
    return report;
}

// =========================================================
// EXPORTS
// =========================================================

module.exports = {
    startRealTimeMonitoring,
    displayNewLogs,
    displayLastLines,
    getLogsByAgent,
    getRecentLogs,
    getLogStats,
    generateSummary,
    generateReport,
    generateJsonReport,
    parseLogLine,
    formatLogLine
};

// Si exécuté directement, lancer le monitoring
if (require.main === module) {
    startRealTimeMonitoring();
}
