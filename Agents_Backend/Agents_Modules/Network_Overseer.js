/**
 * @file Network_Overseer.js
 * @description Agent responsable de la surveillance réseau et santé des applications.
 */

const axios = require('axios');

const MONITORING_TARGETS = [
    { name: 'Portail Client', type: 'gas', id: 'AKfycbyWUC3njn-hIU1pdgElOQX9FlXUclS3YC-Nat4Ujlw' },
    { name: 'App Livreur', type: 'gas', id: 'AKfycbyC1PWyq5xnYa3HaLtuRtahsnjpkiTryQxqy5jgYHrR6pDwLgAlkM3ecxjSAAgEOYWKGg' },
    { name: 'Mediconvoi Vitrine', type: 'web', url: 'https://mediconvoi.fr' },
    { name: 'Mediconvoi Core', type: 'web', url: 'http://vps-7848861f.vps.ovh.net' },
    { name: 'Mediconvoi Sentinelle', type: 'web', url: 'http://87.106.1.4' }
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
            const res = await axios.get(url, { validateStatus: false, timeout: 5000, maxRedirects: 5 });
            const duration = Date.now() - start;

            if (res.status >= 400) {
                if (res.status === 403 && target.type === 'gas') {
                    // 403 = Service en ligne mais accès restreint (Google Auth)
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
