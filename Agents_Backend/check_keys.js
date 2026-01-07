require('dotenv').config();
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'FOUND' : 'NOT_FOUND');
if (process.env.GEMINI_API_KEY) console.log('Length:', process.env.GEMINI_API_KEY.length);
console.log('MY_DANGEROUS_KEY:', process.env.MY_DANGEROUS_KEY);
