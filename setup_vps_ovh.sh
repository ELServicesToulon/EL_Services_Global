#!/bin/bash

# ==========================================
# SCRIPT D'INITIALISATION VPS OVH (Mediconvoi Core)
# ==========================================

echo "🚀 Démarrage de l'installation..."

# 1. Mise à jour du système
echo "📦 Mise à jour des paquets..."
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y curl wget git htop ufw fail2ban

# 2. Installation de Docker & Docker Compose
echo "🐳 Installation de Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "✅ Docker installé."
else
    echo "ℹ️ Docker est déjà installé."
fi

# 3. Configuration du Pare-feu (UFW)
echo "🛡️ Configuration du Pare-feu..."
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw allow 9000/tcp # Portainer (Interface Gestion)
# sudo ufw allow 5432/tcp # PostgreSQL (Décommenter si accès distant nécessaire, sinon localhost)
sudo ufw --force enable
echo "✅ Pare-feu activé."

# 4. Préparation Dossier Projet
echo "📂 Création de l'architecture..."
PROJECT_DIR="/home/$USER/mediconvoi_core"
mkdir -p $PROJECT_DIR/pgdata

# 5. Création du docker-compose.yml (Base de Données + Outils)
echo "📝 Configuration des Services..."
cat <<EOF > $PROJECT_DIR/docker-compose.yml
version: '3.8'

services:
  # --- BASE DE DONNÉES ---
  db:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_USER: admin_mediconvoi
      POSTGRES_PASSWORD: CHANGE_ME_SECURELY
      POSTGRES_DB: mediconvoi_db
    ports:
      - "5432:5432"
    volumes:
      - ./pgdata:/var/lib/postgresql/data

  # --- INTERFACE GESTION DOCKER ---
  portainer:
    image: portainer/portainer-ce:latest
    restart: always
    ports:
      - "9000:9000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data

volumes:
  portainer_data:
EOF

# 6. Lancement
echo "🚀 Lancement des conteneurs..."
cd $PROJECT_DIR
sudo docker compose up -d

echo "=========================================="
echo "✅ INSTALLATION TERMINÉE !"
echo "=========================================="
echo "👉 Vous pouvez accéder à Portainer ici : http://VOTRE_IP_VPS:9000"
echo "👉 Base de données prête sur le port 5432"
