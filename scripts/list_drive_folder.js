const { google } = require('googleapis');
const path = require('path');

// Configuration
const SERVICE_ACCOUNT_KEY = path.join(__dirname, '../Agents_Backend/keys/service-account.json');
const FOLDER_ID = '144qdIbP-njNmy-m6F425s6WxRjntN4yb';

async function listDriveFolder() {
    try {
        // Authentification avec le compte de service
        const auth = new google.auth.GoogleAuth({
            keyFile: SERVICE_ACCOUNT_KEY,
            scopes: ['https://www.googleapis.com/auth/drive.readonly']
        });

        const drive = google.drive({ version: 'v3', auth });

        console.log('🔍 Accès au dossier Google Drive...');
        console.log(`📁 Folder ID: ${FOLDER_ID}`);
        console.log('-----------------------------------\n');

        // Lister les fichiers dans le dossier
        const response = await drive.files.list({
            q: `'${FOLDER_ID}' in parents`,
            fields: 'files(id, name, mimeType, size, modifiedTime, webViewLink)',
            orderBy: 'name'
        });

        const files = response.data.files;

        if (files.length === 0) {
            console.log('📭 Aucun fichier trouvé dans ce dossier.');
            console.log('\n⚠️  Note: Assurez-vous que le dossier est partagé avec:');
            console.log('   antigravity-core-to-drive@gestion-els.iam.gserviceaccount.com');
            return;
        }

        console.log(`📊 ${files.length} élément(s) trouvé(s):\n`);

        files.forEach((file, index) => {
            const icon = file.mimeType === 'application/vnd.google-apps.folder' ? '📁' : '📄';
            const size = file.size ? `(${formatBytes(file.size)})` : '';
            console.log(`${index + 1}. ${icon} ${file.name} ${size}`);
            console.log(`   Type: ${file.mimeType}`);
            console.log(`   ID: ${file.id}`);
            if (file.webViewLink) {
                console.log(`   Link: ${file.webViewLink}`);
            }
            console.log('');
        });

        return files;

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        if (error.code === 404) {
            console.log('\n⚠️  Dossier non trouvé ou non partagé avec le compte de service.');
            console.log('   Partagez le dossier avec: antigravity-core-to-drive@gestion-els.iam.gserviceaccount.com');
        }
        throw error;
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

listDriveFolder();
