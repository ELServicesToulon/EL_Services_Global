const fs = require('fs');
const path = require('path');

const journalPath = path.join(__dirname, 'DEV_JOURNAL.md');
let content = fs.readFileSync(journalPath, 'utf8');

// Remove empty auto-boot sessions (heuristic: "Démarrage automatique" and empty Actions)
const lines = content.split('\n');
const cleanedLines = [];
let skip = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('Démarrage automatique du système (Boot)')) {
        // Check if next lines are empty actions
        // Looking ahead a few lines
        let isEmpty = true;
        for (let j = 1; j < 10 && i + j < lines.length; j++) {
            if (lines[i+j].includes('- [ ] (À remplir')) {
                 // It's a template
            } else if (lines[i+j].includes('### ') || lines[i+j].includes('---')) {
                break;
            } else if (lines[i+j].trim().length > 0 && !lines[i+j].includes('**')) {
                // Found content? 
                // Actually the template has "**" everywhere. 
                // If the actions list is just the default check, it's empty.
            }
        }
        
        // Simpler approach: Just remove all "Nouvelle Session" with "Boot" objective for today/recent that are empty
        // But for safety, I will just append my new exhaustive session at the end.
        // Actually, cleaning up the file is better for "exhaustive and clean" update.
    }
}

// Better strategy: Append the real session.
const date = new Date().toISOString().split('T')[0];
const newSession = `
### ${date} - Intégration Chatbot & Déploiement Total

**Objectif**: Mise en place d'un assistant IA sur le portail V2 et sécurisation du serveur.

**Actions Réalisées**:
- [x] **Chatbot Front (V2_App)** : Création composant \`Chatbot.jsx\` avec logo, connecté à Supabase (Realtime).
- [x] **Chatbot Back (Agents_Backend)** : Création module \`Chat_Agent.js\`. Gestion des requêtes utilisateurs via Gemini API.
- [x] **Intégration Ghost Shopper** : Le Chatbot peut déclencher un audit site ("Ghost Shopper") sur demande.
- [x] **Correction Serveur** : Fix crash \`Sentinel_Core.js\` (doublon variable) et ajout Monitoring Mémoire (Peak tracking).
- [x] **Déploiement Total** :
    - Build Vite V2 -> Upload FTP (\`public_html\`).
    - Backend VPS -> Update Code & Redémarrage PM2.
    - Git Sync -> Push Master.

**Décisions Techniques**:
- Utilisation de Supabase pour le pont Frontend <-> Backend (Table \`chat_messages\`).
- Ajout d'un moniteur de mémoire interne dans Sentinel pour prévenir les OOM.

**État Actuel**:
- Site V2 : En ligne avec Chatbot opérationnel.
- Backend : Stable (Sentinel v2.0).
- Monitoring : Actif.

**Prochaines Étapes**:
- Surveiller les logs via \`pm2 logs sentinel\`.
- Tester le chatbot en conditions réelles avec des utilisateurs.

---
`;

fs.appendFileSync(journalPath, newSession);
console.log('Journal Updated.');
