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
    async askGemini(prompt) {
        if (!this.geminiKey) {
            this.log('❌ Pas de clé GEMINI_API_KEY');
            return null;
        }
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${this.geminiKey}`;
            const response = await axios.post(url, {
                contents: [{ parts: [{ text: prompt }] }]
            });
            if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                return response.data.candidates[0].content.parts[0].text;
            }
            return null;
        } catch (e) {
            // Fallback
            try {
                const url2 = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.geminiKey}`;
                const response = await axios.post(url2, { contents: [{ parts: [{ text: prompt }] }] });
                return response.data.candidates[0].content.parts[0].text;
            } catch (e2) {
                this.log(`Gemini Error: ${e.message}`);
                return null;
            }
        }
    }
}

module.exports = Agent_Base;
