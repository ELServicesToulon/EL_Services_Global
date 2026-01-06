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

**Propositions Immédiates (Agent)**:
1.  **Centraliser la Documentation**: Utiliser ce `DEV_JOURNAL.md` à chaque fin de session.
2.  **Vérifier l'État SMTP**: La configuration SMTP OVH pour Supabase a-t-elle fonctionné ? Si non, c'est la priorité.
3.  **App Script "Livreur"**: Vérifier si le fix "Accès non autorisé" a tenu.

**Fichiers Clés**:
- `deploy_all.ps1`: Script de déploiement global.
- `BuildInfo.js` : Traceur de version.

---

### 2026-01-06 - Nouvelle Session
**Objectif**: Création du bouton de lancement rapide et vérification SMTP
**Actions**:
- [ ] (À remplir par l'agent/dev)
**Décisions**:
- ...
**Prochaines Étapes**:
- ...

---
