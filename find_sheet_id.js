const { google } = require('googleapis');
const fs = require('fs');

const CREDENTIALS_PATH = './credentials.json';

async function findSheet() {
    const auth = new google.auth.GoogleAuth({
        keyFile: CREDENTIALS_PATH,
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    const drive = google.drive({ version: 'v3', auth });

    console.log("🔍 Recherche du fichier 'Gestion ELS'...");

    try {
        const res = await drive.files.list({
            q: "name = 'Gestion ELS' and mimeType = 'application/vnd.google-apps.spreadsheet'",
            fields: 'files(id, name)',
        });

        if (res.data.files.length > 0) {
            console.log("✅ Trouvé !");
            res.data.files.forEach(file => {
                console.log(`ID: ${file.id} | Nom: ${file.name}`);
            });
        } else {
            console.log("⚠️ Aucun fichier trouvé avec ce nom. Vérifiez le partage avec le robot.");
        }
    } catch (e) {
        console.error("❌ Erreur API:", e.message);
    }
}

findSheet();
