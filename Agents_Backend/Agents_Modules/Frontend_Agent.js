/**
 * @file Frontend_Agent.js
 * @description Agent Spécialiste Frontend.
 * Rôle : Expert React, Vite, TailwindCSS.
 * Responsabilité : Analyser, créer et modifier des composants UI avec une esthétique "Premium".
 */

const Agent_Base = require('./Agent_Base');
const fs = require('fs');
const path = require('path');

class Frontend_Agent extends Agent_Base {
    constructor() {
        super('FRONTEND_AGENT');
        this.role = "React & UI/UX Specialist";
        this.basePath = path.join(__dirname, '../../V2_App/src');
    }

    /**
     * Analyse un composant ou une page spécifique
     * @param {string} relativePath - ex: 'components/BookingForm.jsx'
     */
    analyzeComponent(relativePath) {
        const fullPath = path.join(this.basePath, relativePath);
        if (!fs.existsSync(fullPath)) {
            return { error: `File not found: ${relativePath}` };
        }
        return fs.readFileSync(fullPath, 'utf8');
    }

    /**
     * Propose une refonte UI pour un composant donné
     * @param {string} componentName - Nom du fichier (ex: 'BookingForm.jsx')
     * @param {string} instructions - Directives de design (ex: "Ajouter un gradient")
     */
    async refactorUI(componentName, instructions) {
        this.log(`🎨 Refactoring UI requested for: ${componentName}`);
        
        const code = this.analyzeComponent(componentName);
        if (code.error) return code;

        const prompt = `
            Tu es l'Agent Frontend (Expert React/Tailwind).
            
            TACHE : Refactoriser le composant suivant selon les instructions.
            INSTRUCTIONS : "${instructions}"
            
            CODE ACTUEL :
            ${code.substring(0, 8000)}
            
            CONTRAINTES :
            - Garde TOUTE la logique métier existante (hooks, states, handlers).
            - Améliore uniquement le JSX et les classes Tailwind.
            - Utilise des classes utilitaires Tailwind standards.
            - Renvoie uniquement le code complet prêt à l'emploi.
        `;

        const newCode = await this.askGemini(prompt);
        
        // En mode Swarm, on ne modifie pas le fichier directement, on retourne le code
        // ou on utilise "proposeChange" si on veut être safe.
        // Ici on retourne pour que l'Orchestrateur décide.
        return { success: true, proposedCode: this.cleanCodeBlock(newCode) };
    }
}

module.exports = new Frontend_Agent();
