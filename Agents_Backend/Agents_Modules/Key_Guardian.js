/**
 * @file Key_Guardian.js
 * @description Agent chargé de la validation des clés API critiques.
 * S'assure que le Vault contient des clés actives et alerte en cas de problème.
 */

const Agent_Base = require('./Agent_Base');
const Vault = require('./Vault');
const axios = require('axios');

class Key_Guardian extends Agent_Base {
    constructor() {
        super('KEY_GUARDIAN');
    }

    async runGuardianCycle() {
        this.log('🛡️ Cycle de vérification des clés...');
        const report = [];

        // 1. Check GEMINI_API_KEY
        try {
            this.log('Testing GEMINI_API_KEY...');
            const key = Vault.get('GEMINI_API_KEY');
            if (key) {
                // Simple test call with a tiny prompt
                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${key}`;
                await axios.post(url, { contents: [{ parts: [{ text: "Hello" }] }] });
                report.push('✅ GEMINI_API_KEY: Valide');
            } else {
                report.push('❌ GEMINI_API_KEY: Manquante');
            }
        } catch (e) {
            report.push(`❌ GEMINI_API_KEY: Erreur (${e.response ? e.response.status : e.message})`);
        }

        // 2. Check GOOGLE_MAPS_API_KEY (Geocoding test)
        try {
            const mapKey = Vault.get('GOOGLE_MAPS_API_KEY');
            if (mapKey) {
                const url = `https://maps.googleapis.com/maps/api/geocode/json?address=Paris&key=${mapKey}`;
                const res = await axios.get(url);
                if (res.data.status === 'OK') {
                    report.push('✅ GOOGLE_MAPS_API_KEY: Valide');
                } else {
                    report.push(`⚠️ GOOGLE_MAPS_API_KEY: Invalide (Status: ${res.data.status})`);
                }
            }
        } catch (e) {
            // Ignorer si pas configurée, c'est moins critique pour le backend pur
            // report.push(`ℹ️ Maps API check failed: ${e.message}`);
        }

        // 3. Check Cloudflare
        try {
            const cfToken = Vault.get('CLOUDFLARE_API_TOKEN');
            if (cfToken) {
                const res = await axios.get('https://api.cloudflare.com/client/v4/user/tokens/verify', {
                    headers: { 'Authorization': `Bearer ${cfToken}` }
                });
                if (res.data.success) {
                    report.push('✅ CLOUDFLARE_API_TOKEN: Valide');
                } else {
                    report.push('❌ CLOUDFLARE_API_TOKEN: Invalide');
                }
            }
        } catch (e) { /* Ignore */ }

        const finalReport = report.join('\n');
        this.log('\n' + finalReport);
        return finalReport;
    }
}

module.exports = new Key_Guardian();
