const { google } = require('googleapis');
const { Client } = require('pg');
const fs = require('fs');

// --- CONFIGURATION ---
const SPREADSHEET_ID = "1AzWdQQ4UEq0Fvr_iTpDY5TiXn55ij30_okIxIG5p_OM";
const SHEET_NAME = "Facturation";
const PG_CONNECTION_STRING = "postgres://admin_mediconvoi:CHANGE_ME_SECURELY@127.0.0.1:5432/mediconvoi_db";
const CREDENTIALS_PATH = './credentials.json';

async function main() {
    console.log("🚀 Démarrage de la migration Sheet -> PostgreSQL...");

    if (!fs.existsSync(CREDENTIALS_PATH)) {
        console.error("❌ ERREUR: Fichier credentials.json manquant !");
        return;
    }
    const auth = new google.auth.GoogleAuth({
        keyFile: CREDENTIALS_PATH,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    console.log("📥 Lecture du Google Sheet...");
    let rows;
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: SHEET_NAME + "!A:Z", // SANS template literal pour eviter les bugs
        });
        rows = response.data.values;
    } catch (e) {
        console.error("❌ Erreur lecture Sheet:", e.message);
        return;
    }

    if (!rows || rows.length === 0) {
        console.log('⚠️ Aucune donnée trouvée.');
        return;
    }

    const client = new Client({ connectionString: PG_CONNECTION_STRING });
    try {
        await client.connect();
        console.log("✅ Connecté à PostgreSQL.");

        const headers = rows[0];
        // Nettoyage des noms de colonnes : minuscules, underscores, pas de caracteres speciaux
        const columns = headers.map(h => {
            if (!h) return "col_inconnue";
            return h.toLowerCase().trim()
                .replace(/[^a-z0-9]/g, '_')
                .replace(/_+/g, '_'); // Eviter double underscore
        });

        console.log("🛠 Création de la table 'livraisons_archive'...");

        // Creation de la requete manuellement
        let colsDef = columns.map(c => c + " TEXT").join(', ');
        const createTableQuery = "CREATE TABLE IF NOT EXISTS livraisons_archive (id SERIAL PRIMARY KEY, imported_at TIMESTAMP DEFAULT NOW(), " + colsDef + ");";

        await client.query(createTableQuery);

        console.log("📦 Import de " + (rows.length - 1) + " lignes...");

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            // Si la ligne est vide, on saute
            if (!row || row.length === 0) continue;

            const values = row.map(v => v === undefined ? null : v);
            while (values.length < columns.length) values.push(null);

            // Construction des placeholders $1, $2, ...
            const placeholders = columns.map((_, idx) => "$" + (idx + 1)).join(', ');
            const colNames = columns.join(', ');

            const insertQuery = "INSERT INTO livraisons_archive (" + colNames + ") VALUES (" + placeholders + ")";

            await client.query(insertQuery, values);
            if (i % 100 === 0) process.stdout.write('.');
        }

        console.log("\n✅ Migration terminée avec succès !");

    } catch (e) {
        console.error("❌ Erreur SQL:", e);
    } finally {
        await client.end();
    }
}

main();
