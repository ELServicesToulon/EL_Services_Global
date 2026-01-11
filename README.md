# EL Services Global

Solution complète de gestion logistique pour EL Services (Livraison, Pharmacie, EHPAD).
Ce projet intègre un backend Google Apps Script, une interface web pour les clients et une application mobile pour les livreurs.

## Architecture

Le projet est divisé en trois modules principaux :

*   **Projet_ELS** : Backend principal (Google Apps Script) et Back-office administratif. Gère la base de données (Sheets), la facturation, et sert les interfaces web.
*   **App_Livreur** : Web App autonome pour les chauffeurs (Mobile). Permet la gestion des tournées, le rapport de livraison et le suivi GPS.
*   **App_Resideur** : Portail client pour le suivi des passages et la gestion des demandes (EHPAD/Résidents).

## Installation

### Prérequis

*   Node.js (version LTS recommandée)
*   `clasp` (Google Apps Script CLI) : `npm install -g @google/clasp`
*   Compte Google avec accès aux scripts Apps Script correspondants.

### Configuration Locale

1.  Cloner le dépôt.
2.  Installer les dépendances :
    ```bash
    npm install
    ```
3.  Se connecter à Google :
    ```bash
    clasp login
    ```

### Déploiement

Chaque dossier (`Projet_ELS`, `App_Livreur`, `App_Resideur`) est un projet Apps Script indépendant.

1.  Se placer dans le dossier du projet :
    ```bash
    cd Projet_ELS
    ```
2.  Pousser les modifications :
    ```bash
    clasp push
    ```
3.  Initialiser la base de données (pour `Projet_ELS`) :
    *   Ouvrir l'éditeur de script.
    *   Exécuter la fonction `setupDatabase` dans `Setup_Database.js` (à créer/exécuter une seule fois).

## Structure des Données (Google Sheets)

La base de données repose sur un Google Sheet structuré avec les onglets suivants :

*   **Users** : Gestion des utilisateurs et rôles.
*   **Tournees** : Planification des tournées de livraison.
*   **Stops** : Points d'arrêt et détails des livraisons.
*   **Events** : Journal des événements opérationnels.
*   **CodesRef** / **CodesClean** : Référentiels des codes d'accès.
*   **AuditLog** : Traçabilité des actions sensibles.
*   **Metrics** : Indicateurs de performance.

## CI/CD

Le projet utilise GitHub Actions pour l'intégration continue :
*   Linting du code (ESLint).
*   Tests automatisés (Playwright).
*   Déploiement automatique via `clasp` sur la branche `main`.

## Infrastructure Backend (Sentinel & Agents)

Le système repose sur une architecture distribuée pour garantir la stabilité du monitoring critique.

*   **Documentation Stratégique** : Voir `Agents_Backend/INFRASTRUCTURE.md`
*   **Sentinel Core** : Hébergé sur VPS XS (Stable, Intouchable).
*   **Agents Lourds** : Hébergés sur VPS dédiés jetables (XS/S/M), gérés via templates Systemd standardisés.
