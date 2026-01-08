/**
 * @file Ghost_Shopper/config.js
 * @description Configuration et constantes pour Ghost Shopper
 */

// Seuils de performance (QA)
const PERF_THRESHOLDS = {
    PAGE_LOAD: 8000,    // Max 8sec pour charger la page
    API_RESPONSE: 2000  // Max 2sec pour une réponse serveur
};

// Configuration du browser context
const BROWSER_CONFIG = {
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    permissions: ['geolocation'],
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'fr-FR'
};

// URLs cibles
const TARGETS = {
    SITE_URL: 'https://mediconvoi.fr',
    LOGIN_URL: 'https://mediconvoi.fr/login',
    DASHBOARD_URL: 'https://mediconvoi.fr/dashboard'
};

// Configuration du scan
const SCAN_CONFIG = {
    MAX_PAGES: 30,           // Limite de pages pour Omni-Scan
    MAX_INTERACTIONS: 5,     // Interactions par page
    MAX_CHAOS_CLICKS: 15,    // Clics Chaos Monkey
    ISSUES_THRESHOLD: 5      // Seuil d'issues pour échec
};

// Credentials QA (à migrer vers Vault)
const QA_CREDENTIALS = {
    email: 'antigravityels@gmail.com',
    password: 'test1234'  // TODO: Utiliser Vault.get('QA_PASSWORD')
};

module.exports = {
    PERF_THRESHOLDS,
    BROWSER_CONFIG,
    TARGETS,
    SCAN_CONFIG,
    QA_CREDENTIALS
};
