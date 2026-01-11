#!/bin/bash
# Script de sécurisation de base pour serveur Ubuntu (OVH)
# Usage: sudo ./secure_server.sh
# ----------------------------------------------------------------------

# 1. Mise à jour du système
echo "=== 1. Mise à jour du système ==="
apt-get update && apt-get upgrade -y
apt-get install -y ufw fail2ban curl git unzip

# 2. Configuration du Pare-feu (UFW)
echo "=== 2. Configuration Firewall (UFW) ==="
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh         # Port 22
ufw allow http        # Port 80
ufw allow https       # Port 443
# Décommenter si n8n est utilisé sur ce port
# ufw allow 5678/tcp 
ufw --force enable
echo "Firewall activé."

# 3. Configuration Fail2Ban (Protection Brute-force SSH)
echo "=== 3. Configuration Fail2Ban ==="
cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
# On s'assure que sshd est activé
sed -i 's/^\[sshd\]$/\[sshd\]\nenabled = true/' /etc/fail2ban/jail.local
systemctl restart fail2ban
echo "Fail2Ban activé."

# 4. Message de bienvenue (Banner)
echo "Serveur sécurisé par Antigravity" > /etc/motd

echo "=== SÉCURISATION TERMINÉE ==="
echo "Prochaines étapes recommandées :"
echo "1. Créer un utilisateur non-root et désactiver le login root SSH."
echo "2. Installer Docker si nécessaire pour n8n."
echo "3. Configurer un domaine et SSL (Let's Encrypt)."
