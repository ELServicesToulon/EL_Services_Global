const { createClient } = require('@supabase/supabase-js');

// Config from V2_App/run_migrations.js
const SUPABASE_URL = 'https://37.59.124.82.sslip.io';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const sql = `
CREATE TABLE IF NOT EXISTS chat_messages (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz default now(),
    sender text,
    content text,
    session_id text
);
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access" ON chat_messages;
CREATE POLICY "Public Access" ON chat_messages FOR ALL USING (true) WITH CHECK (true);
`;

async function main() {
    console.log('Attemping to run SQL via RPC exec_sql...');
    // Clean SQL for single line execution just in case
    const { data, error } = await supabase.rpc('exec_sql', { sql: sql });
    
    if (error) {
        console.error('❌ RPC Failed:', error.message);
        console.log('Detailed Error:', error);
        
        console.log('\n--- MANUAL INTERVENTION REQUIRED ---');
        console.log('Please run the following SQL on your Supabase Database:');
        console.log(sql);
    } else {
        console.log('✅ Success! Table created via RPC.');
    }
}

main();
