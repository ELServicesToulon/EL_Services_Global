const Watchdog = require('./Agents_Modules/Watchdog_Agent');

async function test() {
    console.log("🚀 Testing Watchdog Agent...");
    
    // Test simple navigation
    try {
        console.log("1. Testing Deep Research on Example.com...");
        const result = await Watchdog.deepResearch('https://example.com', 'What is this domain for?');
        
        console.log("✅ Result:", JSON.stringify(result, null, 2));

        console.log("\n2. Testing Auto-PR Generation...");
        const prResult = await Watchdog.proposeChange(
            'src/config/rates.js', 
            'Mise à jour tarifaire suite au JO n°123', 
            'const BARIATRIC_RATE = 150.00; // Updated by Watchdog'
        );
        console.log("✅ Auto-PR Result:", prResult);

    } catch (e) {
        console.error("❌ Test Failed:", e);
    }
}

test();
