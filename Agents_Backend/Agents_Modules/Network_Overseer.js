/**
 * @file Network_Overseer.js
 * @description Agent responsable de la surveillance réseau et santé des applications.
 */

const axios = require('axios');

const MONITORING_TARGETS = [
    { name: 'Portail Client', type: 'gas', id: 'AKfycbwxyNfzBZKsV6CpWsN39AuB0Ja40mpdEmkAGf0Ml_1tOIMfJDE-nsu7ySXTcyaJuURb' },
    { name: 'App Livreur', type: 'gas', id: 'AKfycbyC1PWyq5xnYa3HaLtuRtahsnjpkiTryQxqy5jgYHrR6pDwLgAlkM3ecxjSAAgEOYWKGg' },
    { name: 'Mediconvoi Vitrine', type: 'web', url: 'https://mediconvoi.fr' },
    { name: 'Mediconvoi Core (API)', type: 'web', url: 'http://127.0.0.1:8000' },
    { name: 'Mediconvoi Core (Studio)', type: 'web', url: 'http://127.0.0.1:3000' }
];

async function runHealthCheck() {
    // console.log('[NETWORK] Ping des services...');
    let report = [];

    for (const target of MONITORING_TARGETS) {
        let url;
        if (target.type === 'gas') {
            url = `https://script.google.com/macros/s/${target.id}/exec`;
        } else {
            url = target.url;
        }

        try {
            const start = Date.now();
            const res = await axios.get(url, { validateStatus: false, timeout: 20000, maxRedirects: 5 });
            const duration = Date.now() - start;

            if (res.status >= 400) {
                // 403 for GAS (Google Auth) or 401 for Kong/Supabase (Unauthorized) means service is reachable
                if ((res.status === 403 && target.type === 'gas') || (res.status === 401 && target.name.includes('Core'))) {
                   // Service en ligne mais d'accès restreint
                } else {
                    report.push(`⚠️ ${target.name} : ERREUR ${res.status} (${duration}ms)`);
                }
            } else {
                // Check Security (HTTP vs HTTPS) for web targets
                if (target.type === 'web' && url.startsWith('http:')) {
                    report.push(`🔓 ${target.name} : AVERTISSEMENT SÉCURITÉ (HTTP non sécurisé)`);
                }
            }
        } catch (error) {
            report.push(`🔥 ${target.name} : DOWN (Timeout/Error: ${error.message})`);
        }
    }

    return report.length > 0 ? report.join('\n') : null;
}

module.exports = { runHealthCheck };
