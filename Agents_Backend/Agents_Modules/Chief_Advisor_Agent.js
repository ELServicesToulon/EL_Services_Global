/**
 * @file Chief_Advisor_Agent.js
 * @description "Le Chef de Projet / Adjoint" - Agent central IA (Gemini).
 * Conseiller stratégique, analyseur de situation globale et bras droit de l'administrateur.
 */

const Agent_Base = require('./Agent_Base');
const fs = require('fs');
const path = require('path');

class ChiefAdvisorAgent extends Agent_Base {
    constructor() {
        super('CHIEF_ADVISOR');
        this.version = '2.0.0';
        this.context = `
            Tu es l'IA Centrale, le "Chef de Projet" et "Adjoint Direct" de l'administrateur (User).
            Tu as une vue d'ensemble sur tous les agents (Marketing, Sécurité, Drive, Chat, etc.).
            Ton rôle est de :
            1. Conseiller l'utilisateur sur la stratégie (Tech, Business, Orga).
            2. Synthétiser l'activité des autres agents.
            3. Proposer des améliorations proactives.
            4. Répondre aux questions complexes qui demandent une analyse transverse.
            
            Ton ton est : Professionnel, Stratège, Loyal, Direct et Proactif.
        `;
    }

    /**
     * Analyse l'état global du système (via les rapports disponibles)
     */
    async analyzeSytemHealth() {
        // Lecture des fichiers de logs/rapports générés par les autres agents
        const logsDir = path.join(__dirname, '..');
        const reportFiles = [
            'diagnostic_2026-01-08.md', // Exemple, idéalement dynamique
            'rapport_anomalies.txt',
            'fixes_applied.log'
        ];

        let systemContext = "Voici les derniers rapports système :\n";

        for (const file of reportFiles) {
            try {
                const filePath = path.join(logsDir, file);
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf8').substring(0, 2000); // Limit size
                    systemContext += `--- Fichier: ${file} ---\n${content}\n\n`;
                }
            } catch (e) {
                // Ignore missing files
            }
        }

        const prompt = `
            ${this.context}
            Analyse ces rapports techniques et fais-moi un résumé exécutif de la situation.
            Quels sont les points d'attention ? Que préconises-tu pour la suite ?
            
            ${systemContext}
        `;

        return await this.askGemini(prompt);
    }

    /**
     * Répond à une consultation directe de l'utilisateur
     */
    async consult(userQuery) {
        this.log(`🤔 Consultation reçue : "${userQuery}"`);
        
        const prompt = `
            ${this.context}
            L'administrateur te demande : "${userQuery}"
            
            Réponds en tant que Chef de Projet et Adjoint. Prends de la hauteur.
            Si la question est technique, donne la vision architecturale.
            Si la question est business, donne la vision stratégique.
        `;

        return await this.askGemini(prompt);
    }
}

module.exports = new ChiefAdvisorAgent();
