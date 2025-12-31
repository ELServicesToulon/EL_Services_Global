# STRATÉGIE INFRASTRUCTURE - ANTIGRAVITY

## 🚨 Règle d'Or
> **Service Résident = Serveur Dédié | Agent Lourd = Serveur Jetable**

---

## 1. Architecture Cible

### 🛡️ Le Sentinel (Intouchable)
- **Serveur** : VPS XS
- **Rôle** : Orchestration légère, Monitoring, Webhooks, Watchdogs.
- **Règle** : Aucun agent "lourd" (Puppeteer, Playwright, Traitement volumineux) ne doit tourner ici.
- **Stabilité** : Doit viser 100% d'uptime.

### 🏋️ Les Agents Lourds (Travailleurs)
- **Serveur** : VPS dédié (XS, S ou M selon besoin)
- **Rôle** : Tâches consommatrices (Scraping, Simulation navigateur, Traitement image/vidéo).
- **Cycle de vie** : Jetable. Peut être redémarré, éteint ou détruit sans affecter le Sentinel.
- **Exemples** : Ghost Shopper, Scrapers concurrents, Générateurs de rapports PDF.

---

## 2. Grille de Décision (Sizing)

Cette grille permet de choisir le type de serveur (chez IONOS ou équivalent) pour un nouvel agent.

| Type d'Agent | Description | Serveur Recommandé | RAM Typique | CPU Typique | Rétention |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Micro-Service** | Webhook simple, API relai, Ping, Sentinel Core | **VPS XS** (1 Go RAM) | < 500Mo | < 10% | Long Terme |
| **Navig. Léger** | Puppeteer simple, check rapide, sans head | **VPS S** (2-4 Go RAM) | 1-2 Go | Burst | Moyen / Long |
| **Navig. Lourd** | Playwright, Scenarios complexes, Screenshots, Vidéo | **VPS M** (8-16 Go RAM) | 4-8 Go | Soutenu | Court / Moyen |
| **Batch / Data** | Traitement de logs massifs, conversion fichiers | **VPS M/L** | > 8 Go | 100% | Ephemère (Job) |
| **Expérimental** | Test de nouveau code instable | **VPS XS** (Jetable) | OOM Risk | Unpredictable | Ephemère |

**Note** : Si un agent "Navig. Léger" plante plus d'une fois par semaine par manque de RAM -> Passer en VPS M ou l'isoler strictement.

---

## 3. Configuration & Limites (Systemd)

Pour garantir qu'un agent ne "tue" pas son serveur (même dédié), nous appliquons des limites strictes via Systemd.

### Template : `heavy-agent@.service`
Utiliser le template fourni dans `templates/heavy-agent@.service`.

**Commandes Clés :**
```bash
# Exemple pour un agent nommé 'ghost-shopper' utilisateur 'antigravity'
# Limite RAM : 4G, CPU : 80%

# 1. Copier le template
sudo cp templates/heavy-agent@.service /etc/systemd/system/

# 2. Configurer les overrides si nécessaire (par défaut dans le fichier unit, ou via drop-in)
# systemctl edit heavy-agent@ghost-shopper

# 3. Activer
sudo systemctl enable --now heavy-agent@ghost-shopper
```

### Paramètres de Sécurité (Cgroups)
- `MemoryMax=80%` : L'agent est tué s'il consomme plus de 80% de la RAM totale (laisse 20% pour l'OS/SSH).
- `CPUQuota=90%` : L'agent ne peut pas geler totalement le CPU.
- `Restart=on-failure` : Redémarrage automatique propre.
- `RestartSec=30s` : Délai de temporisation pour éviter les boucles rapides.

---

## 4. Workflows

### Déployer un nouvel Agent Lourd
1. Provisionner un VPS (selon Grille).
2. Installer Node/Docker.
3. Cloner le repo / Copier les sources de l'agent seul.
4. Setup Systemd avec les limites.
5. Vérifier monitoring.

### Sentinel -> Agent Lourd
Le Sentinel ne lance plus le code de l'agent. Il envoie un "Signal" (HTTP/SSH) au VPS dédié pour demander l'exécution.
