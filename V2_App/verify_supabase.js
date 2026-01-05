
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hppkmqmalkfbhexggovp.supabase.co'
const supabaseKey = 'sb_publishable_2EdRSJ8sJXmhy7EqoDhaBA_rKHeP8oH'

console.log('Testing connection to:', supabaseUrl);
console.log('Using Key:', supabaseKey);

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
    try {
        const { data, error } = await supabase.from('test_table').select('*').limit(1);

        // Even if test_table doesn't exist, a 404 or specific error is better than Auth error.
        // However, usually we check auth.

        if (error) {
            console.error('Error encountered:', error);

            if (error.code === 'PGRST301' || error.message.includes('JWT')) {
                console.error('CRITICAL: API Key seems invalid (JWT verification failed).');
            }
        } else {
            console.log('Connection successful!');
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

testConnection();
