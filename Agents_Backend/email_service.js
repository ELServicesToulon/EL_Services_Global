const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Path to Supabase env where SMTP creds are stored
const SUPABASE_ENV_PATH = '/home/ubuntu/supabase_docker/supabase/docker/.env';

function getSmtpConfig() {
    if (!fs.existsSync(SUPABASE_ENV_PATH)) {
        console.error("❌ Supabase .env file not found.");
        return null;
    }

    const envConfig = dotenv.parse(fs.readFileSync(SUPABASE_ENV_PATH));
    
    return {
        host: envConfig.SMTP_HOST,
        port: parseInt(envConfig.SMTP_PORT, 10),
        secure: parseInt(envConfig.SMTP_PORT, 10) === 465, // True for 465, false for 587
        auth: {
            user: envConfig.SMTP_USER,
            pass: envConfig.SMTP_PASS
        },
        from: envConfig.SMTP_SENDER_NAME ? `"${envConfig.SMTP_SENDER_NAME}" <${envConfig.SMTP_USER}>` : envConfig.SMTP_USER,
        to: 'contact@mediconvoi.fr' // Target from user request
    };
}

async function sendRecapEmail(subject, body) {
    const config = getSmtpConfig();
    if (!config || !config.auth.pass) {
        console.error("❌ SMTP Configuration missing or incomplete.");
        return false;
    }

    const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.auth
    });

    try {
        console.log(`📧 Sending email to ${config.to} via ${config.host}...`);
        const info = await transporter.sendMail({
            from: config.from,
            to: config.to,
            subject: subject,
            text: body
        });
        console.log("✅ Email sent: " + info.messageId);
        return true;
    } catch (error) {
        console.error("❌ Error sending email: " + error.message);
        return false;
    }
}

module.exports = { sendRecapEmail };
