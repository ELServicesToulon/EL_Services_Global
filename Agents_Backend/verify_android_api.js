const axios = require('axios');

async function testApi() {
    try {
        console.log("Testing POST /api/chat...");
        const response = await axios.post('http://localhost:3333/api/chat', {
            prompt: 'Test de connexion Android'
        });
        
        console.log("Status:", response.status);
        console.log("Data:", response.data);
        
        if (response.data.success && response.data.response) {
            console.log("✅ API Verification SUCCESS");
        } else {
            console.error("❌ API Verification FAILED: Invalid response format");
            process.exit(1);
        }
    } catch (error) {
        console.error("❌ API Verification FAILED:", error.message);
        if (error.response) {
            console.error("Response Data:", error.response.data);
        }
        process.exit(1);
    }
}

testApi();
