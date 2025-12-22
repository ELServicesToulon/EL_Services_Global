/**
 * @file Archive_Keeper.js
 * @description Agent responsable de l'archivage et des sauvegardes locales.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SOURCE_DIR = path.resolve(__dirname, '../../Projet_ELS');
const BACKUP_ROOT = path.resolve(__dirname, '../../Backups');

// Stockage mémoire des hashs
let fileHashes = {};

function getFileHash(filePath) {
    try {
        const fileBuffer = fs.readFileSync(filePath);
        return crypto.createHash('md5').update(fileBuffer).digest('hex');
    } catch (e) { return null; }
}

async function runBackupCycle() {
    // console.log('[ARCHIVE] Scan en cours...');
    if (!fs.existsSync(BACKUP_ROOT)) fs.mkdirSync(BACKUP_ROOT, { recursive: true });

    const today = new Date().toISOString().split('T')[0];
    const dailyBackupDir = path.join(BACKUP_ROOT, today);
    if (!fs.existsSync(dailyBackupDir)) fs.mkdirSync(dailyBackupDir, { recursive: true });

    let filesToScan = [];

    function scanDir(dir) {
        try {
            const items = fs.readdirSync(dir, { withFileTypes: true });
            for (const item of items) {
                const fullPath = path.join(dir, item.name);
                if (item.isDirectory() && !['.git', 'node_modules', '.vscode'].includes(item.name)) {
                    scanDir(fullPath);
                } else if (item.isFile() && /\.(js|html|json|css)$/.test(item.name)) {
                    filesToScan.push(fullPath);
                }
            }
        } catch (e) {
            // Ignorer les erreurs d'accès
        }
    }

    scanDir(SOURCE_DIR);

    let modifiedCount = 0;
    for (const filePath of filesToScan) {
        const currentHash = getFileHash(filePath);
        const relativePath = path.relative(SOURCE_DIR, filePath);

        if (!fileHashes[relativePath] || fileHashes[relativePath] !== currentHash) {
            fileHashes[relativePath] = currentHash;

            const destPath = path.join(dailyBackupDir, relativePath);
            const destDir = path.dirname(destPath);
            if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

            let finalDestPath = destPath;
            if (fs.existsSync(destPath)) {
                if (getFileHash(destPath) === currentHash) continue;
                const timeSuffix = new Date().toISOString().replace(/:/g, '-').split('T')[1].split('.')[0];
                finalDestPath = destPath.replace(/(\.[^.]+)$/, `_${timeSuffix}$1`);
            }

            fs.copyFileSync(filePath, finalDestPath);
            console.log(`[ARCHIVE] + ${path.basename(finalDestPath)}`);
            modifiedCount++;
        }
    }

    return modifiedCount > 0 ? `Backup : ${modifiedCount} fichiers sécurisés.` : null;
}

module.exports = { runBackupCycle };
