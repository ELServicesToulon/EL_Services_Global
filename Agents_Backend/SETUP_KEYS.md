# Configuration du Compte de Service Antigravity

Pour activer l'autonomie totale des agents, suivez ces étapes :

## 1. Création sur Google Cloud
1. Rendez-vous sur la [Console Google Cloud](https://console.cloud.google.com/).
2. Créez un **Nouveau Projet** (ex: `antigravity-backend`).
   - Ou sélectionnez le projet lié à votre Apps Script si vous le connaissez (`1hRea4x...`).
3. Allez dans **IAM et administration** > **Comptes de service**.
4. Cliquez sur **Créer un compte de service**.
   - Nom : `Antigravity Core`
   - ID : `antigravity-core`
5. Cliquez sur **Créer et continuer**.
6. Rôle : Choisissez **Basic** > **Éditeur** (pour commencer, on affinera plus tard).
7. Terminez la création.

## 2. Génération de la Clé
1. Cliquez sur le compte de service nouvellement créé (l'email).
2. Allez dans l'onglet **Clés**.
3. Cliquez sur **Ajouter une clé** > **Créer une nouvelle clé**.
4. Choisissez le format **JSON**.
5. Le fichier va se télécharger automatiquement.

## 3. Installation Locale
1. Renommez le fichier téléchargé en **`service-account.json`**.
2. Déplacez ce fichier dans le dossier :
   `c:\Users\ELS\EL_Services_Global\Agents_Backend\keys\`
3. C'est tout ! Le script `Sentinel_Core.js` détectera automatiquement cette clé.

## 4. Partage des Ressources
Pour que l'agent puisse voir vos fichiers, vous devez **partager** les fichiers (Sheet Dashboard, Dossiers Drive) avec l'adresse email du compte de service (ex: `antigravity-core@antigravity-backend.iam.gserviceaccount.com`).
- Ouvrez votre Google Sheet Dashboard.
- Cliquez sur "Partager".
- Collez l'email du bot.
- Donnez-lui les droits d'**Éditeur**.
