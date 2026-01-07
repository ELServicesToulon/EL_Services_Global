const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Configuration
const CONFIG = {
    SHEET_ID: '1AzWdQQ4UEq0Fvr_iTpDY5TiXn55ij30_okIxIG5p_OM',
    SUPABASE_URL: process.env.SUPABASE_URL || 'https://37.59.124.82.sslip.io',
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    KEY_FILE_PATH: '/home/ubuntu/Documents/EL_Services_Global/Agents_Backend/keys/service-account.json',
    
    // Sheet names
    SHEETS: {
        ETABLISSEMENTS: 'Base_Etablissements',
        CLIENTS: 'Clients',
        FACTURATION: 'Facturation'
    }
};

// Initialize Supabase
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_KEY);

/**
 * Fetch sheet data via Google Sheets API (Authenticated)
 */
async function fetchSheetData(sheetName) {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: CONFIG.KEY_FILE_PATH,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: CONFIG.SHEET_ID,
            range: sheetName, // Fetches the whole sheet usually
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            console.log(`No data found in ${sheetName}.`);
            return [];
        }

        // Convert array of arrays to array of objects
        const headers = rows[0];
        const data = rows.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = row[index];
            });
            return obj;
        });

        console.log(`✓ Fetched ${data.length} rows from ${sheetName}`);
        return data;

    } catch (error) {
        console.error(`Error fetching ${sheetName}:`, error.message);
        return [];
    }
}

/**
 * Validates and formats date string to YYYY-MM-DD
 * Handles format DD/MM/YYYY commonly found in French sheets
 */
function parseDate(dateStr) {
    if (!dateStr) return null;
    
    // If already YYYY-MM-DD
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
    
    // If DD/MM/YYYY or DD/MM/YYYY HH:mm:ss
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        // parts[0] = Day, parts[1] = Month, parts[2] = Year (possibly with time)
        const year = parts[2].split(' ')[0]; // Strip time if present
        return `${year}-${parts[1]}-${parts[0]}`; 
    }
    
    // Try standard date parse
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
    }
    
    // Explicitly handle "YYYY HH:mm:ss-MM-DD" if it occurs (seems very specific bug)
    // Or just log it
    console.log(`Debug Date Parse Failed: '${dateStr}'`);
    return null;
}

/**
 * Migrate Etablissements
 */
async function migrateEtablissements() {
    console.log('\n📦 Migrating Etablissements...');
    const rows = await fetchSheetData(CONFIG.SHEETS.ETABLISSEMENTS);
    
    if (rows.length === 0) return;
    
    const mapped = rows.map(r => ({
        type: r['Type'] || 'Autre',
        nom: r['Nom'] || '',
        adresse: r['Adresse'] || '',
        code_postal: String(r['Code Postal'] || '').padStart(5, '0'),
        ville: r['Ville'] || '',
        telephone: r['Telephone'] || r['Téléphone'] || '',
        email: r['Email'] || '',
        is_active: r['Actif'] === 'TRUE' || r['Actif'] === 'True' || true 
    })).filter(e => e.nom);

    // Deduplicate based on nom + code_postal
    const uniqueMapped = [];
    const seen = new Set();
    for (const e of mapped) {
        const key = `${e.nom}|${e.code_postal}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueMapped.push(e);
        }
    }
    
    console.log(`Inserting ${uniqueMapped.length} unique etablissements...`);
    
    const { error } = await supabase
        .from('etablissements')
        .upsert(uniqueMapped, { onConflict: 'nom,code_postal' });
    
    if (error) console.error('Error:', error);
    else console.log('✓ Success');
}

/**
 * Migrate Clients -> users/profiles (Partial)
 * We cannot create Auth Users easily without Admin API (Service Key allows it but we need email/pass).
 * Here we populate a 'legacy_clients' table or just 'bookings' directly with emails.
 * Actually, 'bookings' link to 'user_id'. This is tricky.
 * 
 * STRATEGY:
 * We will Create "Ghost Users" in auth.users if possible, or just skip linking for now.
 * Better: We assume these are valid emails. We will create profiles in public.profiles if the table allows it.
 * 
 * Update: The schema likely has 'profiles' or 'users' (public) triggered by auth.users.
 * We will TRY to create auth users with a default password if they don't exist.
 */
async function migrateClients() {
    console.log('\n👥 Migrating Clients...');
    const rows = await fetchSheetData(CONFIG.SHEETS.CLIENTS);
    if (rows.length === 0) return;

    // For every client, we try to create an auth user
    for (const r of rows) {
        const email = r['Email'];
        if (!email) continue;

        // Check if exists
        // const { data: existing } = await supabase.auth.admin.listUsers(); // Too slow
        // Just try create
        const { data, error } = await supabase.auth.admin.createUser({
            email: email,
            password: 'Password123!', // TEMPORARY DEFAULT
            email_confirm: true,
            user_metadata: {
                full_name: r['Nom'] || r['Raison Sociale'],
                phone: r['Téléphone'],
                siret: r['SIRET'],
                address: r['Adresse'],
                postal_code: r['Code Postal']
            }
        });

        if (error) {
            // Likely "User already registered"
            // console.log(`   Client ${email} exists or failed: ${error.message}`);
        } else {
            console.log(`   + Created user: ${email}`);
        }
    }
    console.log('✓ Clients sync attempt complete');
}

/**
 * Migrate Reservations
 */
async function migrateReservations() {
    console.log('\n📅 Migrating Reservations (Facturation)...');
    const rows = await fetchSheetData(CONFIG.SHEETS.FACTURATION);
    if (rows.length === 0) return;

    // We need map email -> user_id
    // This is expensive. We'll cache users.
    const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (error) {
        console.error("Failed to list users:", error);
        return;
    }
    console.log(`Debug: Found ${users?.length} users in Auth.`);
    
    // Log sample user and row for matching
    if (users.length > 0) console.log(`Sample User Email: ${users[0].email}`);
    if (rows.length > 0) console.log(`Sample Row keys: ${Object.keys(rows[0]).join(', ')}`);
    if (rows.length > 0) console.log(`Sample Row Email: ${rows[0]['Email Client'] || rows[0]['Email']}`);

    const emailToId = {};
    users.forEach(u => emailToId[u.email] = u.id);

    const mapped = rows.map(r => {
        const email = r['Email Client'] || r['Email'] || r['Client (Email)'];
        const userId = emailToId[email];
        
        const date = parseDate(r['Date']);
        if (!date || !userId) return null;

        return {
            user_id: userId, // CRITICAL
            email: email,    // REQUIRED
            scheduled_date: date,
            time_slot: r['Heure'] || '08:00',
            stops_count: parseInt(r['Arrêts'] || 1),
            price_estimated: parseFloat((r['Prix'] || '0').replace('€','').replace(',','.')) || 0,
            status: 'completed', // Historic data
            notes: r['Note'] || '',
            created_at: new Date().toISOString()
        };
    }).filter(b => b);

    console.log(`Inserting ${mapped.length} valid bookings...`);

    // Batch insert
    for (let i = 0; i < mapped.length; i += 100) {
        const batch = mapped.slice(i, i + 100);
        const { error } = await supabase.from('bookings').insert(batch);
        if (error) console.error(`Batch ${i} error:`, error.message);
        else console.log(`✓ Batch ${i} inserted`);
    }
}

async function main() {
    console.log("Using Authenticated Migration...");
    if (!CONFIG.SUPABASE_SERVICE_KEY) {
        console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
        process.exit(1);
    }

    await migrateEtablissements();
    await migrateClients(); // This creates Auth Users!
    await migrateReservations();
    console.log("Done.");
}

main();
