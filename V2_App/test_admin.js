import { createClient } from '@supabase/supabase-js'

console.log('Initializing Supabase Client...');

import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = 'https://hppkmqmalkfbhexggovp.supabase.co'
// Try to get the key from process.env, fallback to the one in the file if the user adds it there
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseKey) {
    console.error('Error: SUPABASE_SERVICE_KEY or VITE_SUPABASE_ANON_KEY is missing in .env')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testAdminAccess() {
    console.log('Testing Admin Access...')
    console.log('Using Key (last 5 chars):', supabaseKey.slice(-5))

    // 1. Try to list users (requires admin/service_role)
    const { data: users, error: userError } = await supabase.auth.admin.listUsers()

    if (userError) {
        console.log('❌ List Users Failed:', userError.message)
    } else {
        console.log('✅ List Users Success! Found', users.users.length, 'users.')
        const me = users.users.find(u => u.email === 'antigravityels@gmail.com')
        if (me) {
            console.log('   User antigravityels@gmail.com found. ID:', me.id)

            // 2. Generate Magic Link
            const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
                type: 'magiclink',
                email: 'antigravityels@gmail.com'
            })

            if (linkError) {
                console.log('❌ Generate Link Failed:', linkError.message)
            } else {
                console.log('✅ Magic Link Generated:', linkData)
            }
        } else {
            console.log('   User antigravityels@gmail.com NOT found.')
        }
    }
}

testAdminAccess()
