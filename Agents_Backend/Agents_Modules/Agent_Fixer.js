/**
 * @file Agent_Fixer.js
 * @description Agent intelligent qui analyse les logs des autres agents
 * et génère/exécute des corrections automatiques pour les problèmes détectés.
 * 
 * Version 2.0.0 : Hérite de Agent_Base pour utiliser Gemini IA.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const LogAggregator = require('./Log_Aggregator');
const Agent_Base = require('./Agent_Base');

// --- CONFIGURATION ---
const FIXES_LOG_FILE = path.join(__dirname, '..', 'fixes_applied.log');

// Patterns de problèmes connus et leurs solutions
const KNOWN_ISSUES = {
    'Executable doesn\'t exist': {
        agent: 'GHOST_SHOPPER',
        severity: 'critical',
        description: 'Playwright browser non installé',
        fix: { type: 'command', command: 'npx playwright install chromium', cwd: '/home/ubuntu/Documents/EL_Services_Global/Agents_Backend' }
    },
    'Element is not visible': {
        agent: 'GHOST_SHOPPER',
        severity: 'warning',
        description: 'Élément UI non visible',
        fix: { type: 'code_suggestion', suggestion: 'Ajouter waitForSelector avec timeout plus long' }
    },
    'Timeout 30000ms exceeded': {
        agent: 'GHOST_SHOPPER',
        severity: 'warning',
        description: 'Page trop lente à charger',
        fix: { type: 'code_suggestion', suggestion: 'Augmenter le timeout' }
    },
    'HTTP non sécurisé': {
        agent: 'NETWORK',
        severity: 'warning',
        description: 'Service accessible en HTTP',
        fix: { type: 'config_check', suggestion: 'Configurer certificat SSL' }
    },
    'ANOMALIES': {
        agent: 'CLIENT_EXPERT',
        severity: 'info',
        description: 'Anomalies parcours client',
        fix: { type: 'report', suggestion: 'Voir rapport détaillé' }
    }
};

class AgentFixer extends Agent_Base {
    constructor() {
        super('FIXER_AGENT');
        this.version = '2.0.0';
        this.fixesApplied = [];
    }

    /**
     * Analyse les logs récents et identifie les problèmes
     */
    analyzeRecentLogs(minutes = 60) {
        const recentLogs = LogAggregator.getRecentLogs(minutes);
        const issues = [];
        
        for (const log of recentLogs) {
            let matched = false;
            for (const [pattern, issueInfo] of Object.entries(KNOWN_ISSUES)) {
                if (log.message.includes(pattern)) {
                    if (pattern === 'HTTP non sécurisé' && (log.message.includes('Core') || log.message.includes('Studio'))) continue;

                    issues.push({
                        ...issueInfo,
                        timestamp: log.timestamp,
                        originalMessage: log.message,
                        pattern: pattern
                    });
                    matched = true;
                }
            }
            
            // Si pas de match connu et que c'est une ERREUR, on garde pour analyse IA
            if (!matched && (log.message.includes('Error') || log.message.includes('Exception') || log.message.includes('Fail'))) {
                issues.push({
                    agent: 'UNKNOWN',
                    severity: 'unknown',
                    description: 'Erreur inconnue',
                    originalMessage: log.message,
                    pattern: 'UNKNOWN_ERROR',
                    fix: { type: 'ai_analysis' }
                });
            }
        }
        
        return issues;
    }

    /**
     * Analyse une erreur inconnue avec Gemini
     */
    async analyzeUnknownIssue(issue) {
        this.log(`🧠 Analyse IA pour : ${issue.originalMessage}`);
        
        const prompt = `
            Tu es l'Agent Fixer Expert. Voici une erreur rencontrée dans les logs système :
            "${issue.originalMessage}"
            
            Analyse la cause probable et propose une solution technique concrète (commande bash ou modification de code).
            Réponds au format JSON : { "cause": "...", "fix_suggestion": "..." }
        `;
        
        try {
            const response = await this.askGemini(prompt);
            // On essaie de parser le JSON si possible, sinon on prend le texte brut
            let analysis = { cause: "Non déterminée", fix_suggestion: response };
            try {
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    analysis = JSON.parse(jsonMatch[0]);
                }
            } catch (e) { /* ignore */ }
            
            return analysis;
        } catch (e) {
            return { cause: "Erreur IA", fix_suggestion: "Consulter les logs manuellement." };
        }
    }

    groupIssuesByType(issues) {
        const grouped = {};
        for (const issue of issues) {
            const key = issue.pattern === 'UNKNOWN_ERROR' ? issue.originalMessage : issue.pattern;
            if (!grouped[key]) {
                grouped[key] = { ...issue, count: 0, lastOccurrence: null };
            }
            grouped[key].count++;
            grouped[key].lastOccurrence = issue.timestamp;
        }
        return Object.values(grouped);
    }

    executeCommand(command, cwd) {
        return new Promise((resolve, reject) => {
            exec(command, { cwd }, (error, stdout, stderr) => {
                if (error) reject({ error: error.message, stderr });
                else resolve({ stdout, stderr });
            });
        });
    }

    async applyFix(issue) {
        // ... (Logique applyFix similaire, adaptée pour classe)
        // Pour l'instant, on garde la logique simple
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
            if (fix.type === 'ai_analysis') {
                const analysis = await this.analyzeUnknownIssue(issue);
                result.success = true;
                result.action = 'ai_analyzed';
                result.details = `Cause: ${analysis.cause} | Fix: ${analysis.fix_suggestion}`;
            } else if (fix.type === 'command') {
                this.log(`🔧 Exécution: ${fix.command}`);
                const cmdResult = await this.executeCommand(fix.command, fix.cwd || process.cwd());
                result.success = true;
                result.action = 'command_executed';
                result.details = cmdResult.stdout.substring(0, 200);
            } else {
                result.success = true;
                result.action = 'suggestion_only';
                result.details = fix.suggestion;
            }
        } catch (e) {
            result.success = false;
            result.action = 'fix_failed';
            result.details = e.error || e.message;
        }
        
        this.fixesApplied.push(result);
        return result;
    }

    generateDiagnosticReport(issues, outputPath = null) {
        const timestamp = new Date().toISOString().split('T')[0];
        const reportPath = outputPath || path.join(__dirname, '..', `diagnostic_${timestamp}_v2.md`);
        
        let report = `# 🔧 Rapport Diagnostic Intelligent - ${new Date().toLocaleDateString('fr-FR')}\n\n`;
        // ... (Logique de rapport simplifiée)
        report += `Total problèmes : ${issues.length}\n`;
        issues.forEach(i => {
           report += `- [${i.severity}] ${i.description} (${i.count}x)\n`;
           if (i.pattern === 'UNKNOWN_ERROR') {
               report += `  > Erreur: ${i.originalMessage}\n`;
           }
        });

        fs.writeFileSync(reportPath, report, 'utf8');
        return { path: reportPath, count: issues.length };
    }

    /**
     * Cycle principal appelé par Sentinel
     */
    async runFixerCycle(autoFix = false) {
        this.log('🔍 Analyse intelligente des logs...');
        
        const issues = this.analyzeRecentLogs(60);
        const grouped = this.groupIssuesByType(issues);
        
        if (grouped.length === 0) {
            this.log('✅ Aucun problème détecté');
            return null;
        }
        
        this.log(`⚠️ ${grouped.length} problème(s) détecté(s)`);
        
        // Traitement des erreurs inconnues avec IA
        for (const issue of grouped) {
            if (issue.pattern === 'UNKNOWN_ERROR') {
                const analysis = await this.analyzeUnknownIssue(issue);
                issue.aiAnalysis = analysis;
                // On met à jour le fix pour le rapport
                issue.fix = { type: 'ai_suggestion', suggestion: analysis.fix_suggestion };
                this.log(`💡 Suggestion IA : ${analysis.fix_suggestion}`);
            }
        }

        const report = this.generateDiagnosticReport(grouped);
        
        if (autoFix) {
             const criticals = grouped.filter(i => i.severity === 'critical' && i.fix.type === 'command');
             for (const issue of criticals) {
                 await this.applyFix(issue);
             }
        }
        
        return `Diagnostic V2: ${grouped.length} problèmes identifiés. Voir ${report.path}`;
    }
}

// Instance unique exportée
module.exports = new AgentFixer();
