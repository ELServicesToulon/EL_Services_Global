/**
 * Sheet to Supabase Migration Script
 * 
 * Migrates data from Google Sheets to Supabase:
 * - Base_Etablissements → etablissements
 * - Clients → profiles  
 * - Facturation → bookings
 * 
 * Usage: node migrate_sheets_to_supabase.js
 * 
 * Required env vars:
 * - GOOGLE_SHEETS_API_KEY or service account credentials
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY (for bypassing RLS)
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const CONFIG = {
    SHEET_ID: '1AzWdQQ4UEq0Fvr_iTpDY5TiXn55ij30_okIxIG5p_OM',
    SUPABASE_URL: process.env.SUPABASE_URL || 'https://37.59.124.82.sslip.io',
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    
    // Sheet names
    SHEETS: {
        ETABLISSEMENTS: 'Base_Etablissements',
        CLIENTS: 'Clients',
        FACTURATION: 'Facturation'
    }
};

// Initialize Supabase with service role key (bypasses RLS)
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_KEY);

/**
 * Fetch sheet data via Google Sheets API (public or with API key)
 * For simplicity, using the public CSV export URL
 */
async function fetchSheetAsJSON(sheetName) {
    // Google Sheets public export URL
    const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
    
    try {
        const response = await fetch(url);
        const text = await response.text();
        
        // Google returns JSONP, extract the JSON part
        const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?$/);
        if (!jsonMatch) {
            console.error(`Failed to parse response for sheet: ${sheetName}`);
            return [];
        }
        
        const data = JSON.parse(jsonMatch[1]);
        const cols = data.table.cols.map(c => c.label);
        const rows = data.table.rows.map(r => {
            const obj = {};
            r.c.forEach((cell, i) => {
                obj[cols[i] || `col_${i}`] = cell?.v ?? null;
            });
            return obj;
        });
        
        console.log(`✓ Fetched ${rows.length} rows from ${sheetName}`);
        return rows;
    } catch (error) {
        console.error(`Error fetching ${sheetName}:`, error.message);
        return [];
    }
}

/**
 * Migrate Etablissements (PDL)
 * Sheet columns: Type, Nom, Adresse, Code Postal, Ville, Telephone, Email, etc.
 */
async function migrateEtablissements() {
    console.log('\n📦 Migrating Etablissements...');
    const rows = await fetchSheetAsJSON(CONFIG.SHEETS.ETABLISSEMENTS);
    
    if (rows.length === 0) {
        console.log('No etablissements to migrate');
        return;
    }
    
    const mapped = rows.map(r => ({
        type: r['Type'] || r['type'] || 'Autre',
        nom: r['Nom'] || r['nom'] || r['Établissement'] || '',
        adresse: r['Adresse'] || r['adresse'] || '',
        code_postal: String(r['Code Postal'] || r['CP'] || r['code_postal'] || '').padStart(5, '0'),
        ville: r['Ville'] || r['ville'] || '',
        telephone: r['Téléphone'] || r['telephone'] || r['Tel'] || '',
        email: r['Email'] || r['email'] || '',
        is_active: true
    })).filter(e => e.nom); // Only keep rows with a name
    
    console.log(`Inserting ${mapped.length} etablissements...`);
    
    const { data, error } = await supabase
        .from('etablissements')
        .upsert(mapped, { onConflict: 'nom,code_postal' })
        .select();
    
    if (error) {
        console.error('Error inserting etablissements:', error);
    } else {
        console.log(`✓ Inserted ${data?.length || 0} etablissements`);
    }
}

/**
 * Migrate Clients → profiles
 * Sheet columns: Email, Nom, Adresse, Telephone, SIRET, Code Postal, etc.
 */
async function migrateClients() {
    console.log('\n👥 Migrating Clients → profiles...');
    const rows = await fetchSheetAsJSON(CONFIG.SHEETS.CLIENTS);
    
    if (rows.length === 0) {
        console.log('No clients to migrate');
        return;
    }
    
    // Note: We can't create auth.users directly, but we can prepare profiles
    // Users will be created when they sign up, and we'll link via email
    const mapped = rows.map(r => ({
        email: r['Email'] || r['email'] || '',
        full_name: r['Nom'] || r['nom'] || r['Raison Sociale'] || '',
        phone: r['Téléphone'] || r['telephone'] || r['Tel'] || '',
        address: r['Adresse'] || r['adresse'] || '',
        postal_code: String(r['Code Postal'] || r['CP'] || '').padStart(5, '0'),
        siret: r['SIRET'] || r['siret'] || '',
        is_approved: true, // Legacy clients are pre-approved
        legacy_id: r['ID'] || null
    })).filter(c => c.email);
    
    console.log(`Preparing ${mapped.length} client profiles...`);
    
    // For now, we'll store in a temporary table or log for manual review
    // Real profiles need user_id from auth.users
    console.log('⚠️  Note: Profiles require auth.users. Clients will be created on first login.');
    console.log(`Sample clients to migrate:`, mapped.slice(0, 3));
}

/**
 * Migrate Facturation → bookings
 * Sheet columns: Date, Client, Heure, Statut, Prix, etc.
 */
async function migrateReservations() {
    console.log('\n📅 Migrating Facturation → bookings...');
    const rows = await fetchSheetAsJSON(CONFIG.SHEETS.FACTURATION);
    
    if (rows.length === 0) {
        console.log('No reservations to migrate');
        return;
    }
    
    const mapped = rows.map(r => {
        // Parse date - Google Sheets often returns dates as serial numbers
        let scheduledDate = null;
        if (r['Date']) {
            if (typeof r['Date'] === 'number') {
                // Excel serial date
                const excelEpoch = new Date(1899, 11, 30);
                scheduledDate = new Date(excelEpoch.getTime() + r['Date'] * 86400000);
            } else {
                scheduledDate = new Date(r['Date']);
            }
        }
        
        return {
            email: r['Email Client'] || r['email'] || r['Client'] || '',
            scheduled_date: scheduledDate?.toISOString().split('T')[0] || null,
            time_slot: r['Heure'] || r['Créneau'] || '',
            stops_count: parseInt(r['Arrêts'] || r['Stops'] || 1, 10),
            has_return: Boolean(r['Retour'] || r['retour']),
            is_urgent: Boolean(r['Urgent'] || r['urgent']),
            is_saturday: false, // Derive from date if needed
            price_estimated: parseFloat(r['Prix'] || r['Montant'] || 0),
            status: mapStatus(r['Statut'] || r['Status'] || 'completed'),
            notes: r['Note'] || r['Notes'] || '',
            created_at: new Date().toISOString()
        };
    }).filter(b => b.email && b.scheduled_date);
    
    console.log(`Inserting ${mapped.length} historical bookings...`);
    
    // Insert in batches of 100
    for (let i = 0; i < mapped.length; i += 100) {
        const batch = mapped.slice(i, i + 100);
        const { error } = await supabase.from('bookings').insert(batch);
        if (error) {
            console.error(`Error inserting batch ${i}:`, error);
        } else {
            console.log(`✓ Inserted batch ${i} to ${i + batch.length}`);
        }
    }
}

function mapStatus(legacyStatus) {
    const statusMap = {
        'Confirmé': 'confirmed',
        'En cours': 'in_progress',
        'Terminé': 'completed',
        'Annulé': 'cancelled',
        'En attente': 'pending'
    };
    return statusMap[legacyStatus] || 'completed';
}

/**
 * Main migration function
 */
async function main() {
    console.log('🚀 Starting Sheet to Supabase Migration');
    console.log(`   Sheet ID: ${CONFIG.SHEET_ID}`);
    console.log(`   Supabase: ${CONFIG.SUPABASE_URL}`);
    
    if (!CONFIG.SUPABASE_SERVICE_KEY) {
        console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required!');
        console.log('Set it via: export SUPABASE_SERVICE_ROLE_KEY="your-key"');
        process.exit(1);
    }
    
    try {
        await migrateEtablissements();
        await migrateClients();
        await migrateReservations();
        
        console.log('\n✅ Migration complete!');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

main();
