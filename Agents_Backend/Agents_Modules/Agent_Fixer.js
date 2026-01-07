/**
 * @file Agent_Fixer.js
 * @description Agent intelligent qui analyse les logs des autres agents
 * et génère/exécute des corrections automatiques pour les problèmes détectés.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const LogAggregator = require('./Log_Aggregator');

// --- CONFIGURATION ---
const FIXES_LOG_FILE = path.join(__dirname, '..', 'fixes_applied.log');

// Patterns de problèmes connus et leurs solutions
const KNOWN_ISSUES = {
    // GHOST_SHOPPER - Playwright manquant
    'Executable doesn\'t exist': {
        agent: 'GHOST_SHOPPER',
        severity: 'critical',
        description: 'Playwright browser non installé',
        fix: {
            type: 'command',
            command: 'npx playwright install chromium',
            cwd: '/home/ubuntu/Documents/EL_Services_Global/Agents_Backend'
        }
    },
    
    // GHOST_SHOPPER - Element not visible
    'Element is not visible': {
        agent: 'GHOST_SHOPPER',
        severity: 'warning',
        description: 'Élément UI non visible - possible changement de page',
        fix: {
            type: 'code_suggestion',
            file: 'Agents_Modules/Ghost_Shopper.js',
            suggestion: 'Ajouter waitForSelector avec timeout plus long ou vérifier le sélecteur CSS'
        }
    },
    
    // GHOST_SHOPPER - Timeout
    'Timeout 30000ms exceeded': {
        agent: 'GHOST_SHOPPER',
        severity: 'warning',
        description: 'Page trop lente à charger',
        fix: {
            type: 'code_suggestion',
            suggestion: 'Augmenter le timeout ou optimiser la page cible'
        }
    },
    
    // NETWORK - HTTP non sécurisé
    'HTTP non sécurisé': {
        agent: 'NETWORK',
        severity: 'warning',
        description: 'Service accessible en HTTP au lieu de HTTPS',
        fix: {
            type: 'config_check',
            suggestion: 'Configurer certificat SSL via Certbot sur le serveur'
        }
    },
    
    // CLIENT_EXPERT - Anomalies
    'ANOMALIES': {
        agent: 'CLIENT_EXPERT',
        severity: 'info',
        description: 'Anomalies détectées dans le parcours client',
        fix: {
            type: 'report',
            suggestion: 'Vérifier le rapport détaillé des anomalies'
        }
    }
};

// --- ÉTAT ---
let fixesApplied = [];

// =========================================================
// LOG ANALYSIS
// =========================================================

/**
 * Analyse les logs récents et identifie les problèmes
 */
function analyzeRecentLogs(minutes = 60) {
    const recentLogs = LogAggregator.getRecentLogs(minutes);
    const issues = [];
    
    for (const log of recentLogs) {
        for (const [pattern, issueInfo] of Object.entries(KNOWN_ISSUES)) {
            if (log.message.includes(pattern)) {
                // Ignore false positives for local services (Core/Studio)
                if (pattern === 'HTTP non sécurisé' && (log.message.includes('Core') || log.message.includes('Studio'))) {
                    continue;
                }

                issues.push({
                    ...issueInfo,
                    timestamp: log.timestamp,
                    originalMessage: log.message,
                    pattern: pattern
                });
            }
        }
    }
    
    return issues;
}

/**
 * Groupe les problèmes par type
 */
function groupIssuesByType(issues) {
    const grouped = {};
    
    for (const issue of issues) {
        const key = issue.pattern;
        if (!grouped[key]) {
            grouped[key] = {
                ...issue,
                count: 0,
                lastOccurrence: null
            };
        }
        grouped[key].count++;
        grouped[key].lastOccurrence = issue.timestamp;
    }
    
    return Object.values(grouped);
}

// =========================================================
// FIX EXECUTION
// =========================================================

/**
 * Exécute une commande shell
 */
function executeCommand(command, cwd) {
    return new Promise((resolve, reject) => {
        exec(command, { cwd }, (error, stdout, stderr) => {
            if (error) {
                reject({ error: error.message, stderr });
            } else {
                resolve({ stdout, stderr });
            }
        });
    });
}

/**
 * Applique un fix automatique si possible
 */
async function applyFix(issue) {
    const fix = issue.fix;
    const result = {
        issue: issue.description,
        pattern: issue.pattern,
        timestamp: new Date().toISOString(),
        success: false,
        action: null,
        details: null
    };
    
    try {
        switch (fix.type) {
            case 'command':
                console.log(`🔧 Exécution: ${fix.command}`);
                const cmdResult = await executeCommand(fix.command, fix.cwd || process.cwd());
                result.success = true;
                result.action = 'command_executed';
                result.details = cmdResult.stdout.substring(0, 500);
                break;
                
            case 'code_suggestion':
                result.success = true;
                result.action = 'suggestion_generated';
                result.details = fix.suggestion;
                break;
                
            case 'config_check':
                result.success = true;
                result.action = 'config_check_needed';
                result.details = fix.suggestion;
                break;
                
            case 'report':
                result.success = true;
                result.action = 'report_generated';
                result.details = fix.suggestion;
                break;
                
            default:
                result.action = 'unknown_fix_type';
                result.details = `Type de fix inconnu: ${fix.type}`;
        }
    } catch (e) {
        result.success = false;
        result.action = 'fix_failed';
        result.details = e.error || e.message;
    }
    
    fixesApplied.push(result);
    return result;
}

// =========================================================
// REPORT GENERATION
// =========================================================

/**
 * Génère un rapport de diagnostic avec solutions
 */
function generateDiagnosticReport(outputPath = null) {
    const timestamp = new Date().toISOString().split('T')[0];
    const reportPath = outputPath || path.join(__dirname, '..', `diagnostic_${timestamp}.md`);
    
    const issues = analyzeRecentLogs(1440); // 24h
    const grouped = groupIssuesByType(issues);
    
    let report = `# 🔧 Rapport Diagnostic - ${new Date().toLocaleDateString('fr-FR')}\n\n`;
    report += `Généré le: ${new Date().toLocaleString('fr-FR')}\n\n`;
    report += `---\n\n`;
    
    // Résumé
    const criticals = grouped.filter(i => i.severity === 'critical');
    const warnings = grouped.filter(i => i.severity === 'warning');
    const infos = grouped.filter(i => i.severity === 'info');
    
    report += `## 📊 Résumé\n\n`;
    report += `| Sévérité | Nombre |\n`;
    report += `|----------|--------|\n`;
    report += `| 🔴 Critique | ${criticals.length} |\n`;
    report += `| 🟡 Warning | ${warnings.length} |\n`;
    report += `| 🔵 Info | ${infos.length} |\n`;
    report += `\n---\n\n`;
    
    // Problèmes critiques avec solutions
    if (criticals.length > 0) {
        report += `## 🔴 Problèmes Critiques\n\n`;
        for (const issue of criticals) {
            report += `### ${issue.description}\n\n`;
            report += `- **Agent**: ${issue.agent}\n`;
            report += `- **Occurrences**: ${issue.count}\n`;
            report += `- **Dernière**: ${new Date(issue.lastOccurrence).toLocaleString('fr-FR')}\n\n`;
            report += `**Solution:**\n`;
            if (issue.fix.type === 'command') {
                report += `\`\`\`bash\n${issue.fix.command}\n\`\`\`\n\n`;
            } else {
                report += `${issue.fix.suggestion}\n\n`;
            }
        }
    }
    
    // Warnings avec suggestions
    if (warnings.length > 0) {
        report += `## 🟡 Avertissements\n\n`;
        for (const issue of warnings) {
            report += `### ${issue.description}\n\n`;
            report += `- **Agent**: ${issue.agent}\n`;
            report += `- **Occurrences**: ${issue.count}\n\n`;
            report += `**Suggestion:** ${issue.fix.suggestion}\n\n`;
        }
    }
    
    // Infos
    if (infos.length > 0) {
        report += `## 🔵 Informations\n\n`;
        for (const issue of infos) {
            report += `- **${issue.description}** (${issue.agent}): ${issue.count} occurrences\n`;
        }
    }
    
    // Sauvegarder
    fs.writeFileSync(reportPath, report, 'utf8');
    console.log(`📋 Diagnostic généré: ${reportPath}`);
    
    return { path: reportPath, criticals: criticals.length, warnings: warnings.length };
}

/**
 * Logs les fixes appliqués
 */
function logFixes() {
    if (fixesApplied.length === 0) return;
    
    const logContent = fixesApplied.map(f => 
        `[${f.timestamp}] ${f.success ? '✅' : '❌'} ${f.issue} - ${f.action}: ${f.details}`
    ).join('\n') + '\n';
    
    fs.appendFileSync(FIXES_LOG_FILE, logContent, 'utf8');
    console.log(`📝 ${fixesApplied.length} fixes loggés`);
}

// =========================================================
// MAIN CYCLE
// =========================================================

/**
 * Cycle principal d'analyse et correction
 */
async function runFixerCycle(autoFix = false) {
    console.log('[FIXER] 🔍 Analyse des logs...');
    
    const issues = analyzeRecentLogs(60);
    const grouped = groupIssuesByType(issues);
    
    if (grouped.length === 0) {
        console.log('[FIXER] ✅ Aucun problème détecté');
        return null;
    }
    
    console.log(`[FIXER] ⚠️ ${grouped.length} type(s) de problème(s) détecté(s)`);
    
    // Générer le rapport diagnostic
    const report = generateDiagnosticReport();
    
    // Auto-fix si activé (seulement les commandes sûres)
    if (autoFix) {
        const criticals = grouped.filter(i => i.severity === 'critical' && i.fix.type === 'command');
        for (const issue of criticals) {
            console.log(`[FIXER] 🔧 Tentative de fix: ${issue.description}`);
            const result = await applyFix(issue);
            console.log(`[FIXER] ${result.success ? '✅' : '❌'} ${result.action}`);
        }
        logFixes();
    }
    
    return `Diagnostic: ${report.criticals} critiques, ${report.warnings} warnings`;
}

// =========================================================
// EXPORTS
// =========================================================

module.exports = {
    runFixerCycle,
    analyzeRecentLogs,
    groupIssuesByType,
    applyFix,
    generateDiagnosticReport,
    KNOWN_ISSUES
};

// Exécution directe
if (require.main === module) {
    runFixerCycle(false).then(r => console.log('Result:', r));
}
