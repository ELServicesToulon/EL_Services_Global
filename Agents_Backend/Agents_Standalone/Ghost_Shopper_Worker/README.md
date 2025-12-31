# Ghost Shopper Agent (Worker Standalone)

Ce dossier contient tout le nécessaire pour déployer l'agent "Ghost Shopper" sur son propre VPS (M ou S).

## 🚀 Installation sur VPS (Debian/Ubuntu)

### 1. Pré-requis VPS
*   Node.js 18+ installé
*   Dépendances Playwright (navigateurs) installées

```bash
# Installation rapide Nodejs
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Création dossier
sudo mkdir -p /opt/agents/ghost-shopper
sudo chown -R $USER:$USER /opt/agents/ghost-shopper
```

### 2. Copie des fichiers
Copiez le contenu de ce dossier dans `/opt/agents/ghost-shopper` sur le VPS.
(Via SCP, FileZilla, ou Git).

### 3. Installation Dépendances
```bash
cd /opt/agents/ghost-shopper
npm install
npx playwright install --with-deps chromium
```

### 4. Test Manuel
```bash
npm start
# Vérifiez que l'agent démarre et effectue un cycle.
```

### 5. Mise en Service (Daemon)
Utilisation du template Systemd fourni pour rendre l'agent robuste (redémarrage auto, limites RAM).

```bash
# 1. Copier le service
sudo cp heavy-agent@.service /etc/systemd/system/

# 2. Recharger Systemd
sudo systemctl daemon-reload

# 3. Activer et Démarrer l'agent
# "ghost-shopper" correspond au nom du dossier dans /opt/agents/
# et sera utilisé comme identifiant.
sudo systemctl enable --now heavy-agent@ghost-shopper

# 4. Vérifier les logs
journalctl -u heavy-agent@ghost-shopper -f
```

## 📊 Monitoring
L'agent logue dans la console (visible via `journalctl`) et capture des screenshots dans le dossier `./screenshots`.
En cas de crash, un screenshot est automatiquement généré.
