/**
 * @file Risk_Mitigator.js
 * @description Agent de Gestion des Risques (Proactif).
 * Analyse les données contextuelles (Météo, Trafic, Cyber-menaces) pour anticiper les problèmes.
 * Proposé par Agency_Architect (Evolution Autonome).
 */

const Agent_Base = require('./Agent_Base');
const SharedKnowledge = require('./Shared_Knowledge');
const axios = require('axios'); // Upgraded for Live Data


class Risk_Mitigator extends Agent_Base {
    constructor() {
        super('RISK_MITIGATOR');
        this.version = '1.0.0';
        this.riskRefreshRate = 4 * 60 * 60 * 1000; // 4 heures
    }

    /**
     * Cycle principal d'analyse des risques
     */


    async runRiskAnalysisCycle() {
        this.log('🛡️ Démarrage de l\'analyse des risques (LIVE DATA)...');
        
        let weatherData = "Non disponible";
        try {
            // Récupération Météo Toulon (Format JSON)
            const response = await axios.get('https://wttr.in/Toulon?format=4');
            weatherData = response.data.trim(); // ex: "Toulon: ☀️ +15°C ↙24km/h"
        } catch (e) {
            this.log(`⚠️ Météo API Error: ${e.message}`);
        }

        const contextData = {
            timestamp: new Date().toISOString(),
            weather_real: weatherData,
            traffic_simulated: "Normal (Flux API à venir)", // Prochaine étape: Google Routes API
            cyber_threat_level: "Modéré"
        };

        // 2. Analyse IA
        const analysis = await this.analyzeContext(contextData);

        if (analysis) {
            this.log(`📊 Résultat Analyse : ${analysis.riskLevel}`);
            
            // 3. Mémorisation si stratégie trouvée
            if (analysis.recommendedAction) {
                // On enregistre cette recommandation dans le cerveau collectif
                SharedKnowledge.learnStrategy("Risk_Mitigation", `${analysis.riskLevel}: ${analysis.recommendedAction}`);
                this.log(`🧠 Stratégie mémorisée : ${analysis.recommendedAction}`);
            }

            return `[RISK] Niveau: ${analysis.riskLevel} | Action: ${analysis.recommendedAction}`;
        }

        return null;
    }

    async analyzeContext(data) {
        const prompt = `
            Tu es le Risk Mitigator d'EL Services Global.
            Analyse les données suivantes et détermine le niveau de risque pour la flotte de livraison.
            
            Données : ${JSON.stringify(data)}
            
            Réponds en JSON :
            {
                "riskLevel": "FAIBLE|MOYEN|ELEVÉ",
                "reason": "Explication courte",
                "recommendedAction": "Action concrète pour l'équipe"
            }
        `;

        try {
            const response = await this.askGemini(prompt);
            const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanJson);
        } catch (e) {
            this.log(`Erreur Gemini Risk: ${e.message}`);
            return null;
        }
    }
}

module.exports = new Risk_Mitigator();
