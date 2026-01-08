/**
 * @file Security_Agent.js
 * @description Agent de sécurité proactif.
 * Scanne le code pour détecter les secrets exposés, les déplace vers le Vault (.env)
 * et refactorise le code automatiquement.
 * 
 * Version 2.0.0 : Hérite de Agent_Base + Intégration Gemini.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Vault = require('./Vault');
const Agent_Base = require('./Agent_Base');

// --- CONFIGURATION ---
const ROOT_DIR = path.join(__dirname, '..');
const ENV_FILE = path.join(ROOT_DIR, '.env');
const BASELINE_FILE = path.join(__dirname, 'fim_baseline.json');

// Files to monitor for Integrity
const CRITICAL_FILES = [
    'Sentinel_Core.js',
    'Agents_Modules/Vault.js',
    'Agents_Modules/Security_Agent.js',
    'Agents_Modules/Network_Overseer.js',
    'Agents_Modules/Cloudflare_Agent.js'
];

const PATTERNS = [
    { type: 'GAS_ID', regex: /['"](AKfy[a-zA-Z0-9-_]{50,})['"]/g, highConfidence: true },
    { type: 'GOOGLE_API_KEY', regex: /['"](AIza[a-zA-Z0-9-_]{35})['"]/g, highConfidence: true },
    { type: 'GENERIC_SECRET', regex: /(?:const|let|var)\s+([A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD)[A-Z0-9_]*)\s*=\s*['"]([^'"]{8,})['"]/g, highConfidence: false }
];

const IGNORE_LIST = ['.git', 'node_modules', '.env', 'package-lock.json', 'Security_Agent.js', 'Vault.js', 'test_vault.js', 'fim_baseline.json'];

class SecurityAgent extends Agent_Base {
    constructor() {
        super('SECURITY_AGENT');
        this.version = '2.0.0';
    }

    getAllFiles(dirPath, arrayOfFiles) {
        const files = fs.readdirSync(dirPath);
        arrayOfFiles = arrayOfFiles || [];
        files.forEach(file => {
            if (IGNORE_LIST.includes(file)) return;
            const fullPath = path.join(dirPath, file);
            if (fs.statSync(fullPath).isDirectory()) {
                arrayOfFiles = this.getAllFiles(fullPath, arrayOfFiles);
            } else {
                if (file.endsWith('.js')) arrayOfFiles.push(fullPath);
            }
        });
        return arrayOfFiles;
    }

    computeHash(filePath) {
        try {
            const fileBuffer = fs.readFileSync(filePath);
            const hashSum = crypto.createHash('sha256');
            hashSum.update(fileBuffer);
            return hashSum.digest('hex');
        } catch (e) {
            return null;
        }
    }

    loadBaseline() {
        if (fs.existsSync(BASELINE_FILE)) {
            return JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
        }
        return {};
    }

    saveBaseline(data) {
        fs.writeFileSync(BASELINE_FILE, JSON.stringify(data, null, 2), 'utf8');
    }

    updateBaselineFile(filePath) {
        const relativePath = path.relative(ROOT_DIR, filePath);
        const hash = this.computeHash(filePath);
        if (hash) {
            const baseline = this.loadBaseline();
            baseline[relativePath] = hash;
            this.saveBaseline(baseline);
        }
    }

    checkIntegrity() {
        const baseline = this.loadBaseline();
        const logs = [];
        let updatedBaseline = false;
        const allFiles = this.getAllFiles(ROOT_DIR);

        for (const absPath of allFiles) {
            const relativePath = path.relative(ROOT_DIR, absPath);
            const currentHash = this.computeHash(absPath);

            if (!baseline[relativePath]) {
                logs.push(`🆕 Nouveau fichier ajouté à la surveillance : ${relativePath}`);
                baseline[relativePath] = currentHash;
                updatedBaseline = true;
            } else {
                if (baseline[relativePath] !== currentHash) {
                    logs.push(`🚨 ALERTE INTEGRITÉ : Le fichier ${relativePath} a été MODIFIÉ sans autorisation !`);
                }
            }
        }

        if (updatedBaseline) {
            this.saveBaseline(baseline);
        }
        return logs;
    }

    secureVaultFile() {
        try {
            if (process.platform !== 'win32') {
                fs.chmodSync(ENV_FILE, '600');
                return '🔒 Vault (.env) sécurisé (chmod 600)';
            }
            return '⚠️ Windows détecté: chmod ignoré';
        } catch (e) {
            return `❌ Erreur sécurisation Vault: ${e.message}`;
        }
    }

    addToVault(key, value) {
        let envContent = '';
        if (fs.existsSync(ENV_FILE)) {
            envContent = fs.readFileSync(ENV_FILE, 'utf8');
        }
        if (envContent.includes(value)) {
            const lines = envContent.split('\n');
            for (const line of lines) {
                if (line.includes(value) && !line.startsWith('#')) return line.split('=')[0].trim();
            }
        }
        const newEntry = `\n# Auto-detected by Security Agent\n${key}=${value}`;
        fs.appendFileSync(ENV_FILE, newEntry);
        this.log(`🛡️ Secret déplacé dans le Vault: ${key}`);
        return key;
    }

    async scanAndFixFile(filePath) {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;
        let logs = [];
        let vaultImported = content.includes("require('./Vault')") || content.includes("require('./Agents_Modules/Vault')");
        
        for (const pattern of PATTERNS) {
            let match;
            pattern.regex.lastIndex = 0;
            while ((match = pattern.regex.exec(content)) !== null) {
                const rawMatch = match[0];
                const secretValue = match.length > 2 ? match[2] : match[1];
                let keyName = pattern.type === 'GENERIC_SECRET' ? match[1] : null;

                if (!keyName) {
                    const shortHash = Math.random().toString(36).substring(7).toUpperCase();
                    keyName = `AUTO_${pattern.type}_${shortHash}`;
                }

                if (pattern.highConfidence || pattern.type === 'GENERIC_SECRET') {
                    const vaultKey = this.addToVault(keyName, secretValue);
                    let replacement;
                    if (pattern.type === 'GENERIC_SECRET') {
                        const varDeclaration = rawMatch.split('=')[0]; 
                        replacement = `${varDeclaration}= Vault.get('${vaultKey}')`;
                    } else {
                        replacement = `Vault.get('${vaultKey}')`;
                    }
                    logs.push(`🔍 Détecté (${pattern.type}) dans ${path.basename(filePath)} -> Migré vers ${vaultKey}`);
                    content = content.replace(rawMatch, replacement);
                    modified = true;
                }
            }
        }

        if (modified) {
            if (!vaultImported) {
                 const fileDir = path.dirname(filePath);
                 const vaultPath = path.join(ROOT_DIR, 'Agents_Modules', 'Vault');
                 let relativeVaultPath = path.relative(fileDir, vaultPath);
                 if (!relativeVaultPath.startsWith('.')) relativeVaultPath = './' + relativeVaultPath;
                 const importLine = `const Vault = require('${relativeVaultPath}');\n`;
                 content = importLine + content;
            }
            fs.writeFileSync(filePath, content, 'utf8');
            logs.push(`✅ Fichier mis à jour: ${path.basename(filePath)}`);
            this.updateBaselineFile(filePath);
        }
        return logs;
    }

    /**
     * Analyse un rapport de sécurité avec Gemini
     */
    async analyzeSecurityReport(logs) {
        if (logs.length === 0) return null;
        
        const prompt = `
            Tu es l'expert cybersécurité. Voici les logs du scanner de sécurité :
            ${logs.join('\n')}
            
            Y a-t-il des alertes critiques (intégrité, secrets) ? 
            Si oui, résume la situation et confirme que les actions automatiques (migrations Vault) sont pertinentes.
            Sois bref et pro.
        `;
        return await this.askGemini(prompt);
    }

    /**
     * Cycle principal
     */
    async runSecurityCycle() {
        this.log('👮 Début du scan de sécurité...');
        
        const secureMsg = this.secureVaultFile();
        this.log(secureMsg);

        const integrityLogs = this.checkIntegrity();
        const files = this.getAllFiles(ROOT_DIR);
        let report = [...integrityLogs];

        for (const file of files) {
            const logs = await this.scanAndFixFile(file);
            if (logs.length > 0) report.push(...logs);
        }

        if (report.length > 0) {
            // Analyse IA du rapport
            const aiAnalysis = await this.analyzeSecurityReport(report);
            if (aiAnalysis) {
                report.push(`\n🧠 Analyse IA : ${aiAnalysis}`);
            }
            return report.join('\n');
        } else {
            return null; // R.A.S
        }
    }
    
    // Alias pour compatibilité
    async scanAndShield() {
         return this.runSecurityCycle();
    }
}

module.exports = new SecurityAgent();
