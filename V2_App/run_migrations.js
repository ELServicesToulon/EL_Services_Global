/**
 * Execute SQL migrations via Supabase REST API
 * Uses service_role key to bypass RLS
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = 'https://37.59.124.82.sslip.io'
// Service role key from Supabase dashboard
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function runMigration(sqlFile) {
    const sql = fs.readFileSync(sqlFile, 'utf8')
    console.log(`\n📄 Running: ${path.basename(sqlFile)}`)
    
    // Split by semicolons to run statements individually
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))
    
    for (const statement of statements) {
        try {
            const { data, error } = await supabase.rpc('exec_sql', { sql: statement + ';' })
            if (error) {
                // If exec_sql doesn't exist, we need direct DB access
                console.log(`  ⚠️  Cannot execute via RPC: ${error.message.substring(0, 50)}...`)
            }
        } catch (e) {
            console.log(`  ⚠️  ${e.message.substring(0, 50)}...`)
        }
    }
    console.log(`  ✓ Processed ${statements.length} statements`)
}

async function main() {
    console.log('🚀 Supabase Migration Runner')
    console.log(`   URL: ${SUPABASE_URL}`)
    
    const migrationsDir = path.join(__dirname, 'supabase', 'migrations')
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()
    
    console.log(`\nFound ${files.length} migration files:`)
    files.forEach(f => console.log(`  - ${f}`))
    
    console.log('\n⚠️  NOTE: Direct SQL execution requires database access.')
    console.log('   For self-hosted Supabase, run these commands on the VPS:\n')
    
    for (const file of files) {
        const sqlFile = path.join(migrationsDir, file)
        const sql = fs.readFileSync(sqlFile, 'utf8')
        console.log(`\n--- ${file} ---`)
        console.log('docker exec -i supabase-db psql -U postgres -d postgres << EOF')
        console.log(sql)
        console.log('EOF')
    }
    
    console.log('\n\n✅ Copy the commands above and run them on your VPS.')
}

main()
