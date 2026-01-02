/**
 * @file Network_Overseer.js
 * @description Agent responsable de la surveillance réseau et santé des applications.
 */

const axios = require('axios');

const TARGET_APPS = [
    { name: 'Portail Client', id: 'AKfycbwxyNfzBZKsV6CpWsN39AuB0Ja40mpdEmkAGf0Ml_1tOIMfJDE-nsu7ySXTcyaJuURb' },
    { name: 'App Livreur', id: 'AKfycbyC1PWyq5xnYa3HaLtuRtahsnjpkiTryQxqy5jgYHrR6pDwLgAlkM3ecxjSAAgEOYWKGg' }
];

async function runHealthCheck() {
    // console.log('[NETWORK] Ping des services...');
    let report = [];

    for (const app of TARGET_APPS) {
        const url = `https://script.google.com/macros/s/${app.id}/exec`;
        try {
            const start = Date.now();
            const res = await axios.get(url, { validateStatus: false, maxRedirects: 5 });
            const duration = Date.now() - start;

            if (res.status >= 400) {
                if (res.status === 403) {
                    // 403 = Service en ligne mais accès restreint (Google Auth)
                    // On considère cela comme "UP" pour le monitoring local
                    // console.log(`[OK] ${app.name} (Protected/403)`);
                } else {
                    report.push(`⚠️ ${app.name} : ERREUR ${res.status} (${duration}ms)`);
                }
            } else {
                // Tout va bien, on ne spamme pas le rapport sauf si demandé
                // console.log(`[OK] ${app.name} (${duration}ms)`);
            }
        } catch (error) {
            report.push(`🔥 ${app.name} : DOWN (${error.message})`);
        }
    }

    return report.length > 0 ? report.join('\n') : null;
}

module.exports = { runHealthCheck };
