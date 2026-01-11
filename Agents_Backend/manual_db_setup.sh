#!/bin/bash
# Script manuel pour créer la table chat_messages sur le VPS via Docker
# À exécuter sur la machine qui a un accès SSH au VPS

VPS_HOST="37.59.124.82"
VPS_USER="ubuntu"

echo "Connexion au VPS $VPS_HOST..."

ssh $VPS_USER@$VPS_HOST << 'EOF'
    echo "Exécution de la commande SQL dans le conteneur supabase-db..."
    docker exec -i supabase-db psql -U postgres -d postgres -c "
      CREATE TABLE IF NOT EXISTS chat_messages (
          id uuid primary key default gen_random_uuid(),
          created_at timestamptz default now(),
          sender text,
          content text,
          session_id text
      );
      ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS \"Public Access\" ON chat_messages;
      CREATE POLICY \"Public Access\" ON chat_messages FOR ALL USING (true) WITH CHECK (true);
    "
    echo "Terminé."
EOF
