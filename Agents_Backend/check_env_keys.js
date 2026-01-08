const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    console.log("Keys in .env:", Object.keys(envConfig));
    if (envConfig.GEMINI_API_KEY) {
        console.log("GEMINI_API_KEY is present.");
    } else {
        console.log("GEMINI_API_KEY is MISSING.");
    }
} else {
    console.log(".env file NOT found at", envPath);
}
