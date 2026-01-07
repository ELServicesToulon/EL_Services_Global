
const { createClient } = require('@supabase/supabase-js');

// Configuration Check
// API URL from .env (API_EXTERNAL_URL)
const SUPABASE_URL = 'https://37.59.124.82.sslip.io';
// SERVICE_ROLE_KEY from .env (Line 9)
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q';

const TARGET_EMAIL = 'contact@mediconvoi.fr';

async function fixAdmin() {
    console.log(`🔌 Connecting to Supabase at ${SUPABASE_URL}...`);
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    console.log(`🔍 Searching for user: ${TARGET_EMAIL}`);

    // 1. Check Auth User (Admin API)
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
        console.error('❌ Error listing users:', authError);
        return;
    }

    const user = users.find(u => u.email === TARGET_EMAIL);

    if (!user) {
        console.error(`❌ User ${TARGET_EMAIL} NOT FOUND in Auth Database.`);
        console.log('list of users found:', users.map(u => u.email));
        return;
    }

    console.log(`✅ User found in Auth: ${user.id} (${user.email})`);

    // 2. Check Profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (profileError) {
        console.error('❌ Error fetching profile:', profileError);
    } else {
        console.log(`ℹ️ Current Profile:`, profile);
    }

    // 3. Upsert Profile to Admin
    console.log('🛠 Upserting profile (Admin=true)...');
    
    const profileData = {
        id: user.id,
        email: user.email,
        is_admin: true,
        updated_at: new Date()
    };

    const { error: upsertError } = await supabase
        .from('profiles')
        .upsert(profileData);

    if (upsertError) {
        console.error('❌ Upsert Failed:', upsertError);
    } else {
        console.log('✅ SUCCESS: Profile created/updated with Admin privileges.');
    }
}

fixAdmin();
