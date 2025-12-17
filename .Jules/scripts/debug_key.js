require('dotenv').config();

const key = process.env.GEMINI_API_KEY;
console.log("Loaded API Key Check:");
if (!key) {
    console.log("Key is NULL or UNDEFINED");
} else {
    console.log("Type:", typeof key);
    console.log("Length:", key.length);
    console.log("First 4 chars:", key.substring(0, 4));
    console.log("Last 4 chars:", key.substring(key.length - 4));
    console.log("Is trimmed?", key.trim() === key);
}
