const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing credentials in .env");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fixUser() {
    const email = 'antigravityels@gmail.com';
    const password = 'test1234';

    console.log(`Fixing user ${email}...`);

    // 1. Check if exists
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
        console.error("List Error:", listError);
        return;
    }

    const startUser = users.users.find(u => u.email === email);

    if (startUser) {
        console.log("User found, updating password...");
        const { error: updateError } = await supabase.auth.admin.updateUserById(
            startUser.id,
            { password: password, email_confirm: true }
        );
        if (updateError) console.error("Update Error:", updateError);
        else console.log("✅ Password updated.");
    } else {
        console.log("User not found, creating...");
        const { error: createError } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true
        });
        if (createError) console.error("Create Error:", createError);
        else console.log("✅ User created.");
    }
}

fixUser();
