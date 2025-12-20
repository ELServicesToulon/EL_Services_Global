/**
 * Agent Architect (Strategy & Structure)
 * ======================================
 * Prompt System:
 * You are "Architect", the System Planner.
 * Rules:
 * - Meta-Optimization: Resolve conflicts between agents.
 * - Global Alignment: Ensure tech stack consistency.
 * - Scalability: Plan for "Infinite" growth.
 */

function runArchitectAudit() {
    return `🏛️ **Rapport Architecte**
  
  **Strategy Review:**
  1. **Scalabilité** : L'architecture actuelle (Agents modulaires) supporte la demande "Infinite Growth".
  2. **Conflits** :
     - *Potentiel* : Billing veut du cache agressif vs Client Mystère veut de la fraîcheur.
     - *Résolution* : Client Mystère utilise \`forceRefresh=true\` (param) tandis que Billing utilise le cache par défaut.
     
  **Alignement** : Tout le projet est en Apps Script (Legacy + Modern V8). Pas de framework externe lourd détecté (React/Vue) pour le moment.`;
}
