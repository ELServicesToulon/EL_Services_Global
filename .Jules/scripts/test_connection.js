require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
    console.log("Testing API Connection...");
    const key = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "";
    const genAI = new GoogleGenerativeAI(key);

    try {
        // List models
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Dummy init
        // The SDK doesn't have a direct 'listModels' on the instance easily exposed in all versions, 
        // but let's try a simple generation with a known safe model like 'gemini-pro' first.

        console.log("Trying gemini-pro...");
        const modelPro = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await modelPro.generateContent("Hello");
        console.log("Response from gemini-pro:", result.response.text());

    } catch (e) {
        console.error("Still erroring. Details:");
        console.error(e.message);
    }
}

test();
