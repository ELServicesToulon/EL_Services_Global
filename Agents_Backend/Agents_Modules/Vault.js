/**
 * @file Vault.js
 * @description Module de gestion centralisée des secrets et de la configuration.
 * Charge les variables d'environnement depuis le fichier .env et valide leur présence.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const path = require('path');
const fs = require('fs');

const SECRETS = {
    // Google Apps Script IDs
    GAS_PORTAIL_ID: { required: true, description: "ID du script GAS Portail Client" },
    GAS_LIVREUR_ID: { required: true, description: "ID du script GAS App Livreur" },

    // Configuration Sentinel
    SERVICE_ACCOUNT_KEY: { required: false, default: './keys/service-account.json', description: "Chemin vers la clé JSON Google Service Account" },
    WORKER_PASS: { required: false, default: 'password', description: "Mot de passe pour les workers distants" },
    
    // Configuration Email/SMTP (pour référence future)
    SMTP_HOST: { required: false, description: "Hébergeur SMTP" },
    SMTP_USER: { required: false, description: "Utilisateur SMTP" },
    SMTP_PASS: { required: false, description: "Mot de passe SMTP" },

    // VPS Configuration
    VPS_HOST: { required: false, description: "IP du VPS" },
    VPS_USER: { required: false, description: "Utilisateur VPS" },
    VPS_HOST: { required: false, description: "IP du VPS" },
    VPS_USER: { required: false, description: "Utilisateur VPS" },
    VPS_PASS: { required: false, description: "Mot de passe VPS" },

    // AI Configuration
    GEMINI_API_KEY: { required: false, description: "Clé API Gemini pour l'intelligence des agents" }
};

const Vault = {
    /**
     * Récupère une valeur secrète.
     * @param {string} key - La clé du secret (ex: 'GAS_PORTAIL_ID')
     * @returns {string} La valeur du secret
     * @throws {Error} Si le secret est requis mais manquant.
     */
    get: (key) => {
        const config = SECRETS[key];
        if (!config) {
            console.warn(`[VAULT] ⚠️ Clé inconnue demandée: ${key}`);
            return process.env[key];
        }

        const value = process.env[key] || config.default;

        if (config.required && !value) {
            throw new Error(`[VAULT] ❌ Secret MANQUANT: ${key} (${config.description}). Veuillez l'ajouter dans le fichier .env`);
        }

        return value;
    },

    /**
     * Récupère un chemin absolu vers un fichier secret.
     * @param {string} key - La clé du secret (ex: 'SERVICE_ACCOUNT_KEY')
     * @returns {string} Le chemin absolu résolu.
     */
    getPath: (key) => {
        const rawPath = Vault.get(key);
        if (!rawPath) return null;
        
        // Résoudre le chemin relatif par rapport à la racine du projet (Agents_Backend)
        const projectRoot = path.join(__dirname, '..');
        return path.resolve(projectRoot, rawPath);
    },

    /**
     * Vérifie la présence de tous les secrets requis.
     * @returns {boolean} True si tout est ok.
     */
    audit: () => {
        console.log('[VAULT] 🔐 Vérification du coffre-fort...');
        let allGood = true;
        for (const [key, config] of Object.entries(SECRETS)) {
            const value = process.env[key] || config.default;
            if (config.required && !value) {
                console.error(`[VAULT] ❌ Manquant: ${key}`);
                allGood = false;
            } else if (value) {
                // Masquer la valeur pour l'affichage
                const masked = value.length > 4 ? `${value.substring(0, 4)}...` : '****';
                // console.log(`[VAULT] ✅ ${key}: ${masked}`);
            }
        }
        return allGood;
    }
};

module.exports = Vault;
