/**
 * @file Security_Agent.js
 * @description Agent de sécurité proactif.
 * Scanne le code pour détecter les secrets exposés, les déplace vers le Vault (.env)
 * et refactorise le code automatiquement.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const Vault = require('./Vault');

// --- CONFIGURATION ---
const ROOT_DIR = path.join(__dirname, '..');
const ENV_FILE = path.join(ROOT_DIR, '.env');

// Patterns de secrets à détecter
// Format: { name: 'TYPE', regex: /.../, highConfidence: true/false }
const PATTERNS = [
    // Google Apps Scripts IDs (souvent AKfy...)
    { 
        type: 'GAS_ID', 
        regex: /['"](AKfy[a-zA-Z0-9-_]{50,})['"]/g, 
        highConfidence: true 
    },
    // Google API Keys (Alza...)
    { 
        type: 'GOOGLE_API_KEY', 
        regex: /['"](AIza[a-zA-Z0-9-_]{35})['"]/g, 
        highConfidence: true 
    },
    // Pattern générique de variable "SECRET" ou "KEY" ou "TOKEN"
    // Capture: 1=VarName, 2=Value
    {
        type: 'GENERIC_SECRET',
        regex: /(?:const|let|var)\s+([A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD)[A-Z0-9_]*)\s*=\s*['"]([^'"]{8,})['"]/g,
        highConfidence: false // Nécessite prudence
    }
];

// Fichiers/Dossiers à ignorer
const IGNORE_LIST = [
    '.git', 'node_modules', '.env', 'package-lock.json', 'Security_Agent.js', 'Vault.js', 'test_vault.js'
];

/**
 * Lit récursivement les fichiers .js
 */
function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function(file) {
        if (IGNORE_LIST.includes(file)) return;
        
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
        } else {
            if (file.endsWith('.js')) {
                arrayOfFiles.push(fullPath);
            }
        }
    });

    return arrayOfFiles;
}

/**
 * Sécurise le fichier .env (chmod 600)
 */
function secureVaultFile() {
    try {
        if (process.platform !== 'win32') {
            fs.chmodSync(ENV_FILE, '600');
            return '🔒 Vault (.env) sécurisé (chmod 600)';
        }
        return '⚠️ Windows détecté: chmod ignoré (Vérifiez les ACL)';
    } catch (e) {
        return `❌ Erreur sécurisation Vault: ${e.message}`;
    }
}

/**
 * Ajoute une clé au Vault (.env) si elle n'existe pas déjà
 */
function addToVault(key, value) {
    let envContent = '';
    if (fs.existsSync(ENV_FILE)) {
        envContent = fs.readFileSync(ENV_FILE, 'utf8');
    }

    // Vérifier si la valeur existe déjà (peu importe la clé)
    if (envContent.includes(value)) {
        // On essaie de retrouver la clé existante pour cette valeur
        const lines = envContent.split('\n');
        for (const line of lines) {
            if (line.includes(value) && !line.startsWith('#')) {
                return line.split('=')[0].trim(); // Retourne la clé existante
            }
        }
    }

    // Si nouvelle clé
    const newEntry = `\n# Auto-detected by Security Agent\n${key}=${value}`;
    fs.appendFileSync(ENV_FILE, newEntry);
    console.log(`[SECURITY] 🛡️ Secret déplacé dans le Vault: ${key}`);
    return key;
}

/**
 * Scanne et corrige un fichier
 */
async function scanAndFixFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let logs = [];

    // On vérifie d'abord si Vault est importé (simplification: on l'ajoute si on modifie)
    let vaultImported = content.includes("require('./Vault')") || content.includes("require('./Agents_Modules/Vault')");
    
    // Pour chaque pattern
    for (const pattern of PATTERNS) {
        let match;
        // Reset regex index
        pattern.regex.lastIndex = 0;

        while ((match = pattern.regex.exec(content)) !== null) {
            const rawMatch = match[0];
            const secretValue = match.length > 2 ? match[2] : match[1]; // Dépend du regex capture group
            
            // Si c'est un GENERIC_SECRET, le nom de la variable est match[1]
            let keyName = pattern.type === 'GENERIC_SECRET' ? match[1] : null;

            if (!keyName) {
                // Générer un nom pour GAS/API Keys
                const shortHash = Math.random().toString(36).substring(7).toUpperCase();
                keyName = `AUTO_${pattern.type}_${shortHash}`;
            }

            if (pattern.highConfidence || pattern.type === 'GENERIC_SECRET') {
                // 1. Ajouter au Vault
                const vaultKey = addToVault(keyName, secretValue);

                // 2. Préparer le remplacement
                // Si GENERIC: const KEY = "val" -> const KEY = Vault.get('KEY')
                // Si STRING ONLY: "val" -> Vault.get('KEY')

                let replacement;
                if (pattern.type === 'GENERIC_SECRET') {
                    // On remplace toute la partie valeur: "SECRET" par Vault.get('SECRET')
                    // Le match regex global attrape tout: const KEY = "VAL"
                    // On doit reconstruire: const KEY = Vault.get('KEY')
                    // Mais le replace string simple est risqué avec regex global.
                    // On va faire un replace sur le full match
                    const varDeclaration = rawMatch.split('=')[0]; // "const KEY "
                    replacement = `${varDeclaration}= Vault.get('${vaultKey}')`;
                } else {
                    replacement = `Vault.get('${vaultKey}')`;
                }

                logs.push(`🔍 Détecté (${pattern.type}) dans ${path.basename(filePath)} -> Migré vers ${vaultKey}`);
                
                // Remplacement dans le contenu (attention aux occurrences multiples identiques)
                // Ici on remplace le text brut du match par le nouveau code
                if (pattern.type === 'GENERIC_SECRET') {
                    content = content.replace(rawMatch, replacement);
                } else {
                    // Pour les strings nues, il faut remplacer 'valeur' par Vault.get(...) sans les quotes autour du Vault.get
                    // Le regex capture les quotes: 'valeur'
                    content = content.replace(rawMatch, replacement);
                }
                
                modified = true;
            }
        }
    }

    if (modified) {
        // Ajouter l'import Vault si nécessaire
        if (!vaultImported) {
             // Essayer de trouver le bon chemin relatif vers Vault.js
             // filePath est ex: /.../Agents_Backend/Sentinel_Core.js -> ./Agents_Modules/Vault
             // ou /.../Agents_Backend/Agents_Modules/Truc.js -> ./Vault
             
             const fileDir = path.dirname(filePath);
             const vaultPath = path.join(ROOT_DIR, 'Agents_Modules', 'Vault');
             let relativeVaultPath = path.relative(fileDir, vaultPath);
             if (!relativeVaultPath.startsWith('.')) relativeVaultPath = './' + relativeVaultPath;
             
             const importLine = `const Vault = require('${relativeVaultPath}');\n`;
             content = importLine + content;
        }

        fs.writeFileSync(filePath, content, 'utf8');
        logs.push(`✅ Fichier mis à jour: ${path.basename(filePath)}`);
    }

    return logs;
}

/**
 * Cycle principal
 */
async function runSecurityCycle() {
    console.log('[SECURITY] 👮 Début du scan de sécurité...');
    
    // 1. Sécuriser le Vault
    const secureMsg = secureVaultFile();
    console.log(`[SECURITY] ${secureMsg}`);

    // 2. Scanner les fichiers
    const files = getAllFiles(ROOT_DIR);
    let report = [];

    for (const file of files) {
        const logs = await scanAndFixFile(file);
        if (logs.length > 0) report.push(...logs);
    }

    if (report.length > 0) {
        return report.join('\n');
    } else {
        return null; // "R.A.S"
    }
}

module.exports = { runSecurityCycle };

// Exécution directe
if (require.main === module) {
    runSecurityCycle().then(r => {
        if (r) console.log(r);
        else console.log('[SECURITY] Tout est sûr. R.A.S.');
    });
}
