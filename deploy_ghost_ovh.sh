#!/bin/bash

# ==========================================
# DEPLOYMENT SCRIPT: GHOST SHOPPER -> OVH
# ==========================================

REMOTE_USER="ubuntu"
REMOTE_HOST="37.59.124.82"
REMOTE_DIR="/home/ubuntu/ghost_shopper"
LOCAL_SOURCE="/home/ubuntu/Documents/EL_Services_Global/Agents_Backend/Agents_Standalone/Ghost_Shopper_Worker/"

echo "📦 Packaging Ghost Shopper files..."

# 1. Création du dossier distant
echo "➡️  Creating remote directory..."
sshpass -p '1970-Manolo-145' ssh -o StrictHostKeyChecking=no $REMOTE_USER@$REMOTE_HOST "mkdir -p $REMOTE_DIR"

# 2. Copie des fichiers
echo "➡️  Copying files..."
# On copie tout le contenu du dossier Worker
sshpass -p '1970-Manolo-145' scp -o StrictHostKeyChecking=no -r $LOCAL_SOURCE/* $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/

# 3. Build & Run Docker
echo "➡️  Building and starting Docker container on Remote..."
sshpass -p '1970-Manolo-145' ssh -o StrictHostKeyChecking=no $REMOTE_USER@$REMOTE_HOST "cd $REMOTE_DIR && docker compose up -d --build"

echo "✅ Deployment Complete!"
echo "   Monitor logs with: ssh $REMOTE_USER@$REMOTE_HOST 'cd $REMOTE_DIR && docker compose logs -f'"
