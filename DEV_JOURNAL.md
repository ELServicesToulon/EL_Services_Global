
# Journal de Bord - Développement Mediconvoi

Ce fichier sert de mémoire persistante pour le projet. Il permet à l'agent (et au développeur) de reprendre le travail exactement là où il s'est arrêté, en gardant trace du contexte, des décisions et des codes modifiés.

## Format d'une entrée

```markdown
### [Date] - [Titre de la Session]
**Objectif**: ...
**Contexte**: ...
**Actions**:
- [x] Action 1
- [ ] Action 2
**Décisions Techniques**:
- Pourquoi tel choix...
**Blocages / Questions**:
- ...
**Prochaines Étapes (Propositions)**:
- ...
```

---

## Historique Récent

### 2026-01-06 - Initialisation de l'Agent Mémoire & Reprise de contrôle

**Objectif**: Mettre en place un système pour historiser les conversations, les codes et assurer une continuité de développement sans perte de contexte.

**Contexte**:
- Le projet est vaste (`EL_Services_Global`, `Mediconvoi`, `Ghost_Shopper`).
- Plusieurs tâches ont été effectuées récemment (Config Supabase SMTP OVH, Fix clavier Ubuntu, Fix App Script Livreur).
- Besoin d'un "Cerveau" central pour ne pas se perdre.

**État Actuel du Projet (Synthèse)**:
1.  **Déploiement**: Géré par `deploy_all.ps1` (PowerShell) qui pousse vers Google Apps Script (Clasp) et git.
2.  **App V2**: Semble être la version majeure en cours, avec une logique déplacée vers `../Mediconvoi_V2` (à vérifier).
3.  **Supabase**: Problèmes récents d'envoi d'email (SMTP) et de configuration. Tentative de passage via OVH.
4.  **Infra**: Serveur OVH/O2Switch.
5.  **Outils**: Création d'un bouton bureau "Agent Mémoire" pour lancer le journal.

**Propositions Immédiates (Agent)**:
1.  **Centraliser la Documentation**: Utiliser ce `DEV_JOURNAL.md` à chaque fin de session.
2.  **Vérifier l'État SMTP**: La configuration SMTP OVH pour Supabase a-t-elle fonctionné ? Si non, c'est la priorité.
3.  **App Script "Livreur"**: Vérifier si le fix "Accès non autorisé" a tenu.

**Fichiers Clés**:
- `deploy_all.ps1`: Script de déploiement global.
- `BuildInfo.js` : Traceur de version.

---

### 2026-01-06 - Debug SMTP Supabase & Configuration Agent

**Objectif**: Création du bouton de lancement rapide et vérification/réparation SMTP.

**Actions**:
- [x] Création du script `agent_memory.js` et ajout au `package.json`.
- [x] Création du bouton Desktop `Agent_Memoire.desktop`.
- [x] Diagnostic SMTP Supabase :
    - Test initial : OK de l'API mais réception email KO sur port 465.
    - Connexion VPS : Vérification credentials (`1970-Manolo-145`).
    - Modification Config : Passage du port 465 (SSL) au port 587 (TLS/StartTLS) sur le VPS.
    - Test `swaks` : **SUCCÈS TECHNIQUE** (Authentification réussie, Mail accepté par OVH).
    
**Décisions Techniques**:
- Le port 465 pose souvent problème avec les clients Go (Supabase Auth). Passage au 587 (standard submission) validé.
- L'adresse d'envoi est `contact@mediconvoi-app.fr` (domaine OVH) mais le reply est sur `mediconvoi-app.fr`.
- SPF `mediconvoi-app.fr` vérifié : contient `v=spf1 include:mx.ovh.com -all`. C'est correct pour un envoi via OVH.

**Prochaines Étapes**:
- Vérifier si les emails arrivent (ne tombent pas en spam).
- Si Spam : configurer DKIM sur OVH pour `mediconvoi-app.fr`.
- Valider le flux complet (Inscription User -> Email reçu).

---
