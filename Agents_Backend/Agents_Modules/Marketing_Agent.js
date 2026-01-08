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
            Tu es un Expert en UI/UX et Marketing Visuel de classe mondiale (Apple/Airbnb level).
            Ton but : Transformer une interface fonctionnelle mais basique en une expérience **Premium, Moderne et Engageante**.

            Contexte : ${context}
            
            Code Actuel (React/Tailwind) :
            ${codeContent.substring(0, 5000)} // Truncate pour éviter surcharge

            Directives de Design :
            1. **Wow Factor** : Utilise des gradients subtils, des ombres douces (glassmorphism), de la typographie soignée.
            2. **Call-to-Action (CTA)** : Rends les boutons irrésistibles (effets hover, gradients).
            3. **Copywriting** : Améliore les textes pour être plus persuasifs et professionnels.
            4. **Structure** : Garde la logique fonctionnelle (hooks, states) INTACTE, mais refonds le JSX/CSS retourné.
            
            Renvoie UNIQUEMENT le code complet du composant redesigné.
            Assure-toi que TOUS les imports et la logique (handleSubmit, etc.) sont conservés.
            Ne supprime aucune fonctionnalité. Ajoute de la beauté.
        `;

        const response = await this.askGemini(prompt);
        return this.cleanCodeBlock(response);
    }

    cleanCodeBlock(text) {
        return text.replace(/```jsx/g, '').replace(/```javascript/g, '').replace(/```/g, '').trim();
    }
}

module.exports = new Marketing_Agent();
