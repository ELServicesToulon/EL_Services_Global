const axiosModule = require('../../Agents_Backend/node_modules/axios');
const axios = axiosModule.default || axiosModule;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../Agents_Backend/.env') });

async function testGemini3() {
    console.log("⚡ Testing gemini-3-pro-preview connectivity...");
    const key = process.env.GEMINI_API_KEY;
    
    if (!key) {
        console.error("❌ NO KEY FOUND");
        return;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${key}`;
    
    try {
        const response = await axios.post(url, {
            contents: [{ parts: [{ text: "Hello Gemini 3. Are you ready?" }] }]
        });
        
        console.log("✅ Response received:");
        console.log(response.data.candidates[0].content.parts[0].text);
        
    } catch (e) {
        console.error("❌ Failed:");
        if (e.response) {
            console.error(`Status: ${e.response.status}`);
            console.error(JSON.stringify(e.response.data, null, 2));
        } else {
            console.error(e.message);
        }
    }
}

testGemini3();
