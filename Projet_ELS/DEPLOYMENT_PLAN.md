# Plan de Déploiement Sentinel sur VPS OVH

## 1. Pré-requis
- [x] Adresse IP/Hostname du VPS : `vps-7848861f.vps.ovh.net` (37.59.124.82)
- [x] Connectivité confirmée (Ping OK)
- [ ] Mot de passe SSH pour l'utilisateur `ubuntu` (À FOURNIR)

## 2. Installation de l'Agent Monitor (Linux)
Puisque le VPS est sous Ubuntu, nous allons créer un script équivalent à `Monitor_Security.ps1`, mais adapté pour Linux (Bash ou Node.js).

### Fonctionnalités de l'Agent Linux :
- Vérification du pare-feu (`ufw` status)
- Vérification des services essentiels (SSH, Fail2Ban, etc.)
- Envoi du rapport au serveur Sentinel (Google Apps Script) via `curl`

## 3. Automatisation
- Création d'une tâche planifiée (Crontab) ou d'un service Systemd pour exécuter l'agent toutes les heures.

## 4. Validation
- Vérifier que le rapport apparaît bien dans la console Sentinel (ou que le `console.log` du GAS le montre).
