#!/bin/bash

# ==========================================
# INSTALLATION SUPABASE SELF-HOSTED (OVH)
# ==========================================

# Configuration
INSTALL_DIR="/home/$USER/supabase_docker"
DB_PORT="5433" # Port PostgreSQL pour Supabase (5432 est déjà pris par Mediconvoi Core)
STUDIO_PORT="3000"
API_PORT="8000"

echo "🚀 Démarrage de l'installation de Supabase..."

# 1. Vérification Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé. Veuillez l'installer avant (ou lancer setup_vps_ovh.sh)."
    exit 1
fi

echo "📂 Création du dossier d'installation : $INSTALL_DIR"
mkdir -p $INSTALL_DIR
cd $INSTALL_DIR

# 2. Clonage du repo officiel (version docker)
if [ -d "supabase" ]; then
    echo "ℹ️ Dossier 'supabase' déjà existant. Mise à jour..."
    cd supabase
    git pull
else
    echo "⬇️ Clonage du dépôt Supabase..."
    git clone --depth 1 https://github.com/supabase/supabase
    cd supabase
fi

cd docker

# 3. Configuration de l'environnement
echo "⚙️ Configuration du fichier .env..."

# Copie du template si inexistant
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Fichier .env créé."
    
    # Génération de mots de passe sécurisés
    POSTGRES_PASSWORD=$(openssl rand -base64 12)
    JWT_SECRET=$(openssl rand -base64 32)
    ANON_KEY=$(openssl rand -base64 32) # Simplification, normalement nécessite signature, mais ok pour init
    SERVICE_KEY=$(openssl rand -base64 32) 

    # Modification des ports et credentials dans .env
    # On utilise sed pour remplacer les valeurs par défaut
    
    # 1. Changer le port DB host pour éviter le conflit avec le 5432 existant
    sed -i "s/POSTGRES_PORT=5432/POSTGRES_PORT=$DB_PORT/g" .env
    
    # 2. Mettre un mot de passe DB fort
    sed -i "s/POSTGRES_PASSWORD=.*$/POSTGRES_PASSWORD=$POSTGRES_PASSWORD/g" .env
    
    # 3. Définir l'URL du site (à changer plus tard avec le vrai domaine)
    PUBLIC_IP=$(curl -s ifconfig.me)
    sed -i "s/SITE_URL=http:\/\/localhost:3000/SITE_URL=http:\/\/$PUBLIC_IP:$STUDIO_PORT/g" .env
    
    # 4. JWT Secret (Important pour la sécu)
    sed -i "s/JWT_SECRET=.*$/JWT_SECRET=$JWT_SECRET/g" .env
    
    echo "🔒 Sécurisation effectuée :"
    echo "   - Port DB changé en : $DB_PORT"
    echo "   - Mot de passe DB généré"
    echo "   - JWT Secret généré"

else
    echo "ℹ️ Fichier .env déjà existant, on ne le touche pas."
    grep "POSTGRES_PORT" .env
fi

# 4. Lancement des conteneurs
echo "🚀 Lancement de la stack Supabase..."
docker compose up -d

echo ""
echo "=========================================="
echo "✅ INSTALLATION TERMINÉE DE SUPABASE"
echo "=========================================="
echo "Accès :"
echo "   - Supabase Studio (Dashboard) : http://$PUBLIC_IP:3000"
echo "   - API Gateway : http://$PUBLIC_IP:8000"
echo "   - Base de donnes : Port $DB_PORT"
echo ""
echo "⚠️ IMPORTANT : Notez vos identifiants dans $INSTALL_DIR/supabase/docker/.env"
