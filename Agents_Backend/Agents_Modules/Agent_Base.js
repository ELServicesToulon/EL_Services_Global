/**
 * @file Agent_Base.js
 * @description Classe de base pour tous les agents.
 * Apporte des capacités d'auto-évaluation et de demande d'upgrade.
 */

const axios = require('axios');
const fs = require('fs');
const Vault = require('./Vault');
const SharedKnowledge = require('./Shared_Knowledge'); // COGNITIVE UPGRADE

class Agent_Base {

    constructor(name) {
        this.name = name || 'UNKNOWN_AGENT';
        this.version = '1.0.0';
        // Utilisation du Vault pour récupérer la clé de manière robuste
        try {
            this.geminiKey = Vault.get('GEMINI_API_KEY');
        } catch (e) {
            console.warn(`[${this.name}] ⚠️ GEMINI_API_KEY non trouvée via Vault.`);
            this.geminiKey = process.env.GEMINI_API_KEY;
        }
    }

    /**
     * Méthode générique pour loguer.
     * Peut être surchargée si l'agent a un logger spécifique.
     */
    log(message) {
        const timestamp = new Date().toISOString();
        console.log(`[${this.name}] ${message}`);
    }

    /**
     * Analyse une tâche pour voir si l'agent peut la gérer ou s'il doit évoluer.
     * @param {string} taskDescription - La description de la nouvelle tâche.
     * @returns {Promise<boolean>} - true si update nécessaire, false sinon.
     */
    async evaluateCapabilities(taskDescription) {
        this.log(`🔍 Évaluation des capacités pour : "${taskDescription}"`);
        
        const prompt = `
            Tu es l'agent ${this.name} (version ${this.version}).
            Ton rôle actuel est défini par ton code source (non fourni ici, mais suppose tes capacités standards).
            Une nouvelle tâche est demandée : "${taskDescription}".
            
            Estimes-tu avoir besoin d'une mise à jour de ton code ou d'un nouvel outil pour accomplir cette tâche parfaitement ?
            Réponds uniquement par OUI ou NON.
        `;

        try {
            const answer = await this.askGemini(prompt);
            if (answer && answer.trim().toUpperCase().includes('OUI')) {
                this.log('💡 Besoin de mise à jour détecté !');
                return true;
            }
            return false;
        } catch (e) {
            this.log(`Erreur évaluation: ${e.message}`);
            return false;
        }
    }

    /**
     * Propose une mise à jour de l'agent (Upgrade).
     * En pratique, cela génère une spec pour l'architecte ou le développeur.
     */
    async proposeUpgrade(taskDescription) {
        this.log('🚀 Génération d\'une proposition d\'upgrade...');
        
        const prompt = `
            Tu es l'agent ${this.name}. Propose les modifications concrètes à apporter à ton code pour gérer la tâche : "${taskDescription}".
            Focalise-toi sur les fonctionnalités manquantes.
        `;

        const proposal = await this.askGemini(prompt);
        
        // Sauvegarde de la proposition
        const proposalFile = `UPGRADE_${this.name}_${Date.now()}.md`;
        fs.writeFileSync(proposalFile, proposal);
        this.log(`📄 Proposition sauvegardée dans ${proposalFile}`);
        
        return proposal;
    }

    /**
     * Enregistre un succès dans la mémoire collective
     */
    async memorizeSuccess(task, strategyUsed) {
        SharedKnowledge.learnStrategy(task, strategyUsed);
        this.log(`🧠 Succès mémorisé pour "${task}"`);
    }

    /**
     * Wrapper pour Gemini (Similaire à Chat_Agent mais centralisé ici)
     */
    /**
     * Wrapper pour Gemini (Similaire à Chat_Agent mais centralisé ici)
     * @param {string} prompt - Le prompt
     * @param {object} [options] - Options (ex: { model: 'gemini-3-pro-preview' })
     */
    async askGemini(prompt, options = {}) {
        if (!this.geminiKey) {
            this.log('❌ Pas de clé GEMINI_API_KEY');
            return null;
        }

        const preferredModel = options.model || 'gemini-2.0-flash-exp';

        const performRequest = async (model) => {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.geminiKey}`;
            return axios.post(url, { contents: [{ parts: [{ text: prompt }] }] });
        };

        try {
            try {
                // Try preferred model (default 2.5-flash or overridden)
                const response = await performRequest(preferredModel);
                if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                    return response.data.candidates[0].content.parts[0].text;
                }
            } catch (e1) {
                // If the preferred model was NOT the fallback, try the fallback
                if (preferredModel !== 'gemini-2.0-flash-lite') {
                    // Fallback to stable lite
                    const response = await performRequest('gemini-2.0-flash-lite');
                    if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                        return response.data.candidates[0].content.parts[0].text;
                    }
                } else {
                     throw e1; // Already tried fallback
                }
            }
        } catch (e) {
            // GLOBAL ERROR TRAP FOR API KEY
            const errorMsg = e.message || '';
            const verboseError = e.response?.data?.error?.message || errorMsg;
            
            const isKeyError = verboseError.includes('403') || 
                               verboseError.toLowerCase().includes('api key') ||
                               verboseError.toLowerCase().includes('unregistered caller');

            if (isKeyError) {
                this.log('🚨🚨 CRITICAL SECURITY ALERT: GEMINI API KEY FAILURE 🚨🚨');
                this.log(`Details: ${verboseError}`);
                
                try {
                    fs.writeFileSync(
                        'SECURITY_ALERT_API_KEY.flag', 
                        `[${new Date().toISOString()}] Agent ${this.name} reported API Key failure: ${verboseError}`
                    );
                } catch (fsErr) {
                    console.error('Failed to write alert flag:', fsErr);
                }
            } else {
                this.log(`Gemini Error: ${verboseError}`);
            }
            return null;
        }
        return null;
    }
}

module.exports = Agent_Base;
