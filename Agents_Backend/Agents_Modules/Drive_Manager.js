/**
 * @file Drive_Manager.js
 * @description Agent de gestion du dossier Google Drive "Gestion ELS"
 * Organise les fichiers, synchronise avec Supabase et archive les emails.
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// --- CONFIGURATION ---
const KEY_FILE_PATH = path.join(__dirname, '..', 'keys', 'service-account.json');
const ROOT_FOLDER_ID = process.env.GESTION_ELS_FOLDER_ID || '1HLBar6IvpJgrG_lfyRSKwNwib6U__w9U';

const SCOPES = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/spreadsheets'
];

// Structure des dossiers à créer
const FOLDER_STRUCTURE = {
    months: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
             'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
    subfolders: ['Factures', 'Réservations', 'Emails', 'Documents']
};

// --- ETAT ---
let driveClient = null;
let folderCache = new Map();

// =========================================================
// INITIALIZATION
// =========================================================

async function initDriveClient() {
    if (driveClient) return driveClient;

    if (!fs.existsSync(KEY_FILE_PATH)) {
        console.error('[DRIVE] ❌ Clé Service Account introuvable!');
        return null;
    }

    try {
        const auth = new google.auth.GoogleAuth({ keyFile: KEY_FILE_PATH, scopes: SCOPES });
        const client = await auth.getClient();
        driveClient = google.drive({ version: 'v3', auth: client });
        console.log('[DRIVE] 📁 Client initialisé.');
        return driveClient;
    } catch (e) {
        console.error('[DRIVE] ❌ Erreur init:', e.message);
        return null;
    }
}

// =========================================================
// FOLDER MANAGEMENT
// =========================================================

/**
 * Cherche un dossier par nom dans un parent donné
 */
async function findFolder(name, parentId) {
    const cacheKey = `${parentId}/${name}`;
    if (folderCache.has(cacheKey)) return folderCache.get(cacheKey);

    const drive = await initDriveClient();
    if (!drive) return null;

    try {
        const res = await drive.files.list({
            q: `name = '${name}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id, name)',
            spaces: 'drive'
        });

        if (res.data.files && res.data.files.length > 0) {
            const folderId = res.data.files[0].id;
            folderCache.set(cacheKey, folderId);
            return folderId;
        }
        return null;
    } catch (e) {
        console.error(`[DRIVE] Erreur recherche dossier ${name}:`, e.message);
        return null;
    }
}

/**
 * Crée un dossier s'il n'existe pas
 */
async function ensureFolder(name, parentId) {
    let folderId = await findFolder(name, parentId);
    if (folderId) return folderId;

    const drive = await initDriveClient();
    if (!drive) return null;

    try {
        const res = await drive.files.create({
            resource: {
                name: name,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [parentId]
            },
            fields: 'id'
        });
        console.log(`[DRIVE] 📁 Dossier créé: ${name}`);
        const newId = res.data.id;
        folderCache.set(`${parentId}/${name}`, newId);
        return newId;
    } catch (e) {
        console.error(`[DRIVE] Erreur création dossier ${name}:`, e.message);
        return null;
    }
}

/**
 * Assure la structure complète des dossiers
 */
async function ensureFolderStructure() {
    const drive = await initDriveClient();
    if (!drive) return { success: false, error: 'Drive non disponible' };

    const currentYear = new Date().getFullYear().toString();
    const currentMonth = FOLDER_STRUCTURE.months[new Date().getMonth()];
    const stats = { created: 0, existing: 0 };

    try {
        // 1. Dossier année
        const yearFolderId = await ensureFolder(currentYear, ROOT_FOLDER_ID);
        if (!yearFolderId) throw new Error(`Impossible de créer dossier ${currentYear}`);

        // 2. Dossier mois courant
        const monthFolderId = await ensureFolder(currentMonth, yearFolderId);
        if (!monthFolderId) throw new Error(`Impossible de créer dossier ${currentMonth}`);

        // 3. Sous-dossiers du mois
        for (const subfolder of FOLDER_STRUCTURE.subfolders) {
            const existing = await findFolder(subfolder, monthFolderId);
            if (existing) {
                stats.existing++;
            } else {
                await ensureFolder(subfolder, monthFolderId);
                stats.created++;
            }
        }

        // 4. Dossiers fixes
        await ensureFolder('Clients', ROOT_FOLDER_ID);
        await ensureFolder('Modèles', ROOT_FOLDER_ID);
        await ensureFolder('Archives', ROOT_FOLDER_ID);

        return { success: true, year: currentYear, month: currentMonth, ...stats };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// =========================================================
// FILE OPERATIONS
// =========================================================

/**
 * Liste les fichiers dans un dossier
 */
async function listFiles(folderId, options = {}) {
    const drive = await initDriveClient();
    if (!drive) return [];

    try {
        const query = [`'${folderId}' in parents`, 'trashed = false'];
        if (options.mimeType) query.push(`mimeType = '${options.mimeType}'`);

        const res = await drive.files.list({
            q: query.join(' and '),
            fields: 'files(id, name, mimeType, createdTime, modifiedTime, size)',
            orderBy: 'modifiedTime desc',
            pageSize: options.limit || 100
        });

        return res.data.files || [];
    } catch (e) {
        console.error('[DRIVE] Erreur listage:', e.message);
        return [];
    }
}

/**
 * Déplace un fichier vers un autre dossier
 */
async function moveFile(fileId, newParentId, currentParentId) {
    const drive = await initDriveClient();
    if (!drive) return false;

    try {
        await drive.files.update({
            fileId: fileId,
            addParents: newParentId,
            removeParents: currentParentId,
            fields: 'id, parents'
        });
        return true;
    } catch (e) {
        console.error('[DRIVE] Erreur déplacement:', e.message);
        return false;
    }
}

/**
 * Upload un fichier
 */
async function uploadFile(name, content, mimeType, folderId) {
    const drive = await initDriveClient();
    if (!drive) return null;

    try {
        const res = await drive.files.create({
            resource: {
                name: name,
                parents: [folderId]
            },
            media: {
                mimeType: mimeType,
                body: content
            },
            fields: 'id, name, webViewLink'
        });
        return res.data;
    } catch (e) {
        console.error('[DRIVE] Erreur upload:', e.message);
        return null;
    }
}

// =========================================================
// ARCHIVING
// =========================================================

/**
 * Archive les fichiers anciens (> 30 jours) vers le dossier Archives
 */
async function archiveOldFiles() {
    const drive = await initDriveClient();
    if (!drive) return { success: false, error: 'Drive non disponible' };

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString();

    let archivedCount = 0;

    try {
        // Trouver le dossier Archives
        const archivesFolderId = await ensureFolder('Archives', ROOT_FOLDER_ID);
        if (!archivesFolderId) throw new Error('Dossier Archives introuvable');

        // Scanner les fichiers anciens dans la racine
        const res = await drive.files.list({
            q: `'${ROOT_FOLDER_ID}' in parents and modifiedTime < '${cutoffDate}' and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id, name, parents)',
            pageSize: 50
        });

        for (const file of (res.data.files || [])) {
            const moved = await moveFile(file.id, archivesFolderId, ROOT_FOLDER_ID);
            if (moved) {
                console.log(`[DRIVE] 📦 Archivé: ${file.name}`);
                archivedCount++;
            }
        }

        return { success: true, archived: archivedCount };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// =========================================================
// SYNC WITH SUPABASE
// =========================================================

/**
 * Synchronise les nouvelles données depuis Supabase
 */
async function syncFromSupabase() {
    // Note: Nécessite SUPABASE_URL et SUPABASE_SERVICE_KEY en .env
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return { success: false, error: 'Configuration Supabase manquante' };
    }

    try {
        // Fetch des nouvelles factures (dernières 24h)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const response = await fetch(`${supabaseUrl}/rest/v1/invoices?created_at=gte.${yesterday.toISOString()}&select=*`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });

        if (!response.ok) {
            throw new Error(`Supabase API error: ${response.status}`);
        }

        const invoices = await response.json();
        let syncedCount = 0;

        // Pour chaque facture, créer un résumé dans Drive
        for (const invoice of invoices) {
            // TODO: Implémenter la création de document pour chaque facture
            syncedCount++;
        }

        return { success: true, invoices: invoices.length, synced: syncedCount };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// =========================================================
// MAIN CYCLE
// =========================================================

/**
 * Cycle principal d'organisation
 */
async function runOrganizationCycle() {
    console.log('[DRIVE] 🔄 Cycle d\'organisation...');

    const results = {
        structure: null,
        archive: null,
        sync: null,
        timestamp: new Date().toISOString()
    };

    // 1. Assurer la structure des dossiers
    results.structure = await ensureFolderStructure();
    if (results.structure.success) {
        console.log(`[DRIVE] ✅ Structure OK (${results.structure.year}/${results.structure.month})`);
    }

    // 2. Archiver les vieux fichiers
    results.archive = await archiveOldFiles();
    if (results.archive.success && results.archive.archived > 0) {
        console.log(`[DRIVE] 📦 ${results.archive.archived} fichier(s) archivé(s)`);
    }

    // 3. Sync Supabase (si configuré)
    if (process.env.SUPABASE_URL) {
        results.sync = await syncFromSupabase();
    }

    // Générer le rapport
    const report = [];
    if (results.structure.success) {
        report.push(`Structure: ${results.structure.month} ${results.structure.year}`);
    }
    if (results.archive.archived > 0) {
        report.push(`Archivés: ${results.archive.archived}`);
    }
    if (results.sync?.invoices > 0) {
        report.push(`Sync: ${results.sync.invoices} factures`);
    }

    return report.length > 0 ? report.join(' | ') : null;
}

// =========================================================
// EXPORTS
// =========================================================

module.exports = {
    runOrganizationCycle,
    ensureFolderStructure,
    archiveOldFiles,
    syncFromSupabase,
    listFiles,
    moveFile,
    uploadFile,
    findFolder,
    ensureFolder
};
