/**
 * @file Agency_Architect.js
 * @description "L'Aiguilleur Orchestrateur".
 * Analyse l'état global du projet et propose de nouveaux agents pour optimiser le workflow.
 */

const Agent_Base = require('./Agent_Base');
const fs = require('fs');
const path = require('path');

class Agency_Architect extends Agent_Base {
    constructor() {
        super('AGENCY_ARCHITECT');
        this.projectMapPath = path.join(__dirname, '../PROJECT_MAP.json');
    }

    /**
     * Cycle principal de l'Architecte.
     */
    async runArchitectCycle() {
        this.log('🏗️  Démarrage du cycle d\'architecture...');

        // 1. Lire la map du projet (si elle existe)
        let projectContext = "Projet EL Services Global.";
        if (fs.existsSync(this.projectMapPath)) {
            const data = fs.readFileSync(this.projectMapPath, 'utf8');
            projectContext = `Structure du projet : ${data.slice(0, 2000)}... (tronqué)`;
        }

        // 2. Analyser pour de nouvelles opportunités
        const prompt = `
            Tu es l'Architecte Principal d'une flotte d'agents IA pour le projet EL Services (Logistique/Transport).
            
            Contexte Technique :
            ${projectContext}
            
            Ta mission : Identifier une opportunité pour un NOUVEL agent qui pourrait optimiser le projet de manière exponentielle.
            Focalise-toi sur l'automatisation, la sécurité, le revenu, ou la fiabilité.
            
            Réponds au format JSON uniquement :
            {
                "newAgentName": "Nom_De_L_Agent",
                "purpose": "Description courte",
                "justification": "Pourquoi c'est exponentiel",
                "coreFunctions": ["func1", "func2"]
            }
            Si rien ne semble pertinent, renvoie null.
        `;

        try {
            const rawResponse = await this.askGemini(prompt, { model: 'gemini-3-pro-preview' });
            const cleanJson = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            const proposal = JSON.parse(cleanJson);

            if (proposal) {
                this.log(`💡 Proposition d'agent : ${proposal.newAgentName}`);
                
                // Sauvegarder la proposition
                const proposalText = `
# 💡 Proposition de Nouvel Agent
**Nom** : ${proposal.newAgentName}
**But** : ${proposal.purpose}
**Justification** : ${proposal.justification}
**Fonctions Clés** :
${proposal.coreFunctions.map(f => `- ${f}`).join('\n')}

*Généré par Agency_Architect le ${new Date().toLocaleString()}*
                `;

                const filename = `PROPOSAL_${proposal.newAgentName}_${Date.now()}.md`;
                fs.writeFileSync(path.join(__dirname, '..', filename), proposalText);
                this.log(`📄 Proposition écrite : ${filename}`);
                
                return `Nouvel agent proposé : ${proposal.newAgentName}`;
            } else {
                this.log('RAS : Pas de nouvel agent nécessaire pour le moment.');
                return null;
            }

        } catch (e) {
            this.log(`Erreur Architecte : ${e.message}`);
            return null;
        }
    }
}

module.exports = new Agency_Architect();
