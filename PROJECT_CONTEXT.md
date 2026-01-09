# PROJECT CONTEXT & INSTRUCTIONS

> **CE FICHIER EST LA "MÉMOIRE VIVE" DU PROJET.**
> Il doit être consulté par l'agent (AI) au début de chaque session complexe pour comprendre l'architecture, les outils et les procédures spécifiques à ce projet.

## 1. INSTRUCTIONS DE PROMPT (MÉMOIRE AGENT)

**Rôle & Responsabilités :**
Tu es l'Architecte Principal du système Mediconvoi / EL Services Global. Tu dois toujours prioriser la stabilité des services (Sentinel, Supabase, App V2) avant d'ajouter de nouvelles fonctionnalités.

**Contexte Technique Impératif :**
- **OS**: Ubuntu Linux.
- **Backend Orchestration**: `Sentinel_Core.js` (Node.js) est le cœur du système. Il tourne via PM2.
- **Frontend**: Vite/React (`V2_App`), déployé sur o2switch via FTP.
- **Maintenance**: Toujours vérifier `/home/ubuntu/maintenance.sh` et `/home/ubuntu/menu_principal.sh`.
- **Compte Google Cloud/Gemini**: `elservicestoulon@gmail.com` (Propriétaire).
- **Architecture Agent**: Transition vers un modèle "Swarm" (Adjoint + Agents Spécialisés).

**Règles d'Intervention :**
1.  **Vérification PM2/Docker** : Avant de supposer qu'un service est cassé, vérifier `pm2 status` et `docker ps`.
2.  **Logs** : La vérité est dans `Agents_Backend/rapport_anomalies.txt` ou les logs PM2 (`pm2 logs Sentinel_Core`).
3.  **Emails** : Le port SMTP est critique (souvent 587 ou 465). Utiliser `verify_email_sending.js` pour valider.
4.  **Modification de Port** : Si tu changes un port (ex: SMTP), mets à jour le `.env` de Sentinel ET celui de l'App V2 si nécessaire.

---

## 2. ARCHITECTURE DU PROJET

### A. Structure des Dossiers Clés
```
/home/ubuntu/Documents/EL_Services_Global/
├── Agents_Backend/          # Cerveau du système (Sentinel)
│   ├── Sentinel_Core.js     # Orchestrateur principal
│   ├── Agents_Modules/      # Sous-agents (Network, Archive, etc.)
│   └── rapport_anomalies.txt # Logs persistants
├── V2_App/                  # Frontend React/Vite
│   ├── src/                 # Code source React
│   ├── dist/                # Build de production
│   └── verify_email_sending.js # Script de test email
├── .agent/                  # Mémoire de l'agent AI
└── PROJECT_CONTEXT.md       # Ce fichier
```

### B. scripts Système (Root)
- `/home/ubuntu/menu_principal.sh` : Interface interactive pour lancer/maintenir le système. Remplace le "boot prompt".
- `/home/ubuntu/maintenance.sh` : Script bash qui fait les updates (apt, npm), check Docker, backup DB, et relance PM2.

---

## 3. PROCEDURES OPÉRATIONNELLES (SOP)

### Maintenance & Restart
Pour redémarrer proprement tout le système sans tout casser :
1.  Lancer `sudo /home/ubuntu/maintenance.sh`
2.  Si échec, vérifier les logs : `/home/ubuntu/maintenance.log`

### Debugging Sentinel (Backend)
1.  Aller dans le dossier : `cd /home/ubuntu/Documents/EL_Services_Global/Agents_Backend`
2.  Vérifier l'état : `pm2 status Sentinel_Core`
3.  Voir les logs : `pm2 logs Sentinel_Core --lines 50`
4.  Relancer : `pm2 restart Sentinel_Core`

### Debugging Email (Supabase/Node)
1.  Vérifier la config Docker Supabase : `cd /home/ubuntu/supabase_docker/supabase/docker && cat .env`
2.  Tester l'envoi : `cd /home/ubuntu/Documents/EL_Services_Global/V2_App && node verify_email_sending.js`
3.  Si erreur timeout/refus : Vérifier pare-feu ou port SMTP (OVH: souvent ssl0.ovh.net port 465 ou 587).

### Déploiement Frontend (V2)
Le déploiement se fait via FTP sur o2switch.
Script : `/home/ubuntu/Documents/EL_Services_Global/App_Livreur/deploy_ftp_node.js` (ou variante dans V2_App).

---

## 4. CHECKLIST AUTOMATIQUE (AGENTS)
*À lire par l'agent au début d'une tâche.*

- [ ] Suis-je dans le bon dossier ? (Souvent `Agents_Backend` ou `V2_App`)
- [ ] Le serveur Supabase (Docker) est-il UP ? (`docker ps | grep supabase-auth`)
- [ ] Sentinel est-il en ligne ? (`pm2 list`)
- [ ] Ai-je vérifié `rapport_anomalies.txt` pour les dernières erreurs ?
