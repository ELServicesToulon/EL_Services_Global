/**
 * @file Marketing_Agent.js
 * @description Agent Expert en Marketing Visuel & UI/UX.
 * Responsable de l'esthétique "Premium", du Copywriting et de l'expérience utilisateur.
 * Utilise Gemini pour générer du code React/Tailwind de haute qualité.
 */

const Agent_Base = require('./Agent_Base');

class Marketing_Agent extends Agent_Base {
    constructor() {
        super('MARKETING_AGENT');
        this.role = "Creative Director & UI/UX Expert";
    }

    /**
     * Analyse et Redesigne un composant React pour le rendre "Premium"
     * @param {string} codeContent - Le code actuel
     * @param {string} context - Le contexte (ex: "Page de Réservation Publique")
     */
    async redesignComponent(codeContent, context) {
        this.log(`🎨 Analyse visuelle en cours pour : ${context}...`);

        const prompt = `
            Tu es un Visionnaire du Design "Nouvelle Génération" (Gen Z, Cyberpunk-Light, Awwwards Winner).
            Ton but : Remplacer l'interface corporate ennuyeuse par une expérience **New Gen, Disruptive et Hypnotique**.

            Contexte : ${context}
            
            Code Actuel (React/Tailwind) :
            ${codeContent.substring(0, 5000)}

            Directives "New Gen" :
            1. **Aesthetic** : Dark Mode par défaut (bg-slate-900), Gradients "Aurora" (flous colorés en arrière-plan), Bento Grid Layouts.
            2. **Typography** : TITRES ENORMES (text-6xl+), graisses contrastées, polices sans-serif géométriques.
            3. **Interactions** : Tout doit bouger (Framer Motion). Effets de survol "Glow".
            4. **Tone** : Minimaliste mais impactant. Évite le blabla corporate.
            5. **Composants** : Utilise des cartes translucides (backdrop-blur-xl), des bordures fines (border-white/10).
            
            Renvoie UNIQUEMENT le code complet du composant redesigné.
            Assure-toi que TOUS les imports et la logique (handleSubmit, etc.) sont conservés.
            Ne supprime aucune fonctionnalité. Rends-le FUTURISTE.
        `;

        const response = await this.askGemini(prompt);
        return this.cleanCodeBlock(response);
    }

    cleanCodeBlock(text) {
        return text.replace(/```jsx/g, '').replace(/```javascript/g, '').replace(/```/g, '').trim();
    }
}

module.exports = new Marketing_Agent();
