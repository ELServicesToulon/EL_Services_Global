# App_Livreur - Guide de Déploiement

Ce dossier contient le code de l'Application Web pour les livreurs (Tesla/Mobile).

## ⚠️ Erreur "Unexpected end of JSON input"

Si vous rencontrez cette erreur lors de la commande `clasp push`, c'est que votre fichier `.clasp.json` est **vide** ou corrompu.

## Instructions d'installation

1.  **Créer un projet Apps Script** :
    -   Allez sur [script.google.com](https://script.google.com).
    -   Créez un nouveau projet nommé "App Livreur".
    -   Récupérez l'ID du script (Paramètres du projet > Identifiant du script).

2.  **Configurer `.clasp.json`** :
    -   Créez un fichier `.clasp.json` dans ce dossier (`App_Livreur/`).
    -   Copiez-y le contenu suivant (en remplaçant l'ID) :

```json
{
  "scriptId": "VOTRE_IDENTIFIANT_DE_SCRIPT_ICI",
  "rootDir": "./App_Livreur"
}
```

3.  **Configurer la connexion Google Sheets** :
    -   Dans votre projet Apps Script (en ligne), allez dans **Paramètres du projet** > **Propriétés du script**.
    -   Ajoutez une propriété :
        -   **Propriété** : `ID_FEUILLE_CALCUL`
        -   **Valeur** : L'ID de votre Google Sheet principal (celui contenant `Base_Etablissements`).

4.  **Déployer** :
    -   Ouvrez un terminal dans ce dossier.
    -   Lancez `clasp push`.
    -   Pour déployer en Web App : `clasp deploy`.

## Note sur l'architecture

Cette application est autonome. Le fichier `Backend_Handler.gs` contient la logique nécessaire pour communiquer avec le Google Sheet.
