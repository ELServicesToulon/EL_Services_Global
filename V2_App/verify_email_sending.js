
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

// Override with values from .env if present, otherwise use hardcoded fallback (which matches the .env I saw)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://37.59.124.82:8000';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

const TARGET_EMAIL = 'contact@mediconvoi.fr';

console.log("⚙️  Testing SMTP via Supabase Self-Hosted");
console.log(`   URL: ${supabaseUrl}`);
console.log(`   Email: ${TARGET_EMAIL}`);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEmail() {
    console.log("\n🚀 Initiating Magic Link (OTP) request...");

    // Test with signInWithOtp
    const { data, error } = await supabase.auth.signInWithOtp({
        email: TARGET_EMAIL,
        options: { shouldCreateUser: true }
    });

    if (error) {
        console.error("❌ Error sending email:", error.message);
    } else {
        console.log("✅ Request accepted by Supabase!");
        console.log("   Data:", data);
        console.log("   Please check inbox for " + TARGET_EMAIL);
    }
}

testEmail();
