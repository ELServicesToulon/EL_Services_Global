const fs = require('fs');
const path = require('path');
const MarketingAgent = require('./Agents_Modules/Marketing_Agent');

const TARGET_FILE = path.join(__dirname, '../V2_App/src/pages/PublicBooking.jsx');

async function run() {
    console.log("🎨 Marketing Agent : Redesigning PublicBooking.jsx...");
    
    if (!fs.existsSync(TARGET_FILE)) {
        console.error("Target file not found!");
        process.exit(1);
    }

    const content = fs.readFileSync(TARGET_FILE, 'utf8');
    
    try {
        const premiumCode = await MarketingAgent.redesignComponent(content, "Page d'Accueil de Réservation / Landing Page");
        
        // Safety check: Needs to contain 'export default' and 'import'
        if (premiumCode.includes('export default') && premiumCode.includes('import {')) {
            fs.writeFileSync(TARGET_FILE, premiumCode);
            console.log("✅ Redesign Applied to PublicBooking.jsx");
        } else {
            console.error("❌ Safety Check Failed: Generated code seems incomplete.");
            console.log(premiumCode.substring(0, 200));
        }

    } catch (e) {
        console.error("Error during redesign:", e);
    }
}

run();
