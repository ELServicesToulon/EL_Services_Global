# 🚀 PLAN DE MIGRATION GLOBALE : ARCHITECTURE HYBRIDE 2026

**Objectif :** Indépendance technique, réduction des coûts, performance maximale.

| Composant | Source Actuelle | Destination Cible | Technologie |
| :--- | :--- | :--- | :--- |
| **Gestion DNS** | IONOS | **Cloudflare** | DNS Ultra-rapide / Sécurité DDoS |
| **Hébergement Web (Front)** | o2switch / Vercel | **o2switch** | PHP / HTML / Apache (Offre Unique) |
| **Cœur Intelligence (Back)** | Local / Google Scripts | **VPS OVH** | Node.js / Docker / Sentinel Agent |
| **Données (Base)** | Google Sheets / Supabase | **VPS OVH** | PostgreSQL (Dockerisé) |

---

## 📅 PHASE 1 : LA PRISE DE CONTRÔLE (DNS CLOUDFLARE)
*Cette étape est sans risque de coupure si faite dans l'ordre. Elle permet de piloter le trafic.*

### 1.1. Préparation Cloudflare
- [ ] Créer un compte gratuit sur [dash.cloudflare.com](https://dash.cloudflare.com/sign-up).
- [ ] Cliquer sur **"Add a Site"** et entrer `mediconvoi.fr`.
- [ ] Choisir le plan **Free**.
- [ ] **Important :** Cloudflare va scanner les DNS actuels. Vérifier que toutes les lignes (A, MX, CNAME) sont bien importées.

### 1.2. Bascule chez IONOS (Registrar actuel)
- [ ] Se connecter à l'espace client IONOS.
- [ ] Aller dans **Domaines** > Sélectionner le domaine > **Serveurs de noms (Nameservers)**.
- [ ] Remplacer les serveurs IONOS par vos serveurs Cloudflare dédiés :
  - **NS 1 :** `ollie.ns.cloudflare.com`
  - **NS 2 :** `darl.ns.cloudflare.com`
- [ ] Sauvegarder.
- [ ] *Attendre la propagation (1h à 24h).*
- [ ] **Vérification :** Quand Cloudflare affiche "Active", vous avez le contrôle total.

---

## 🚜 PHASE 2 : L'INFRASTRUCTURE CŒUR (VPS OVH)
*Préparation de la "Machine de Guerre" qui va héberger l'IA et les Données.*

### 2.1. Sécurisation du VPS
- [ ] Connexion SSH Root : `ssh ubuntu@vps-7848861f.vps.ovh.net` (ou IP).
- [ ] Mettre à jour : `sudo apt update && sudo apt upgrade -y`.
- [ ] Installer Docker :
  ```bash
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh
  ```

### 2.2. Base de Données (PostgreSQL)
- [ ] Créer un fichier `docker-compose.yml` pour la DB :
  ```yaml
  version: '3.8'
  services:
    db:
      image: postgres:15-alpine
      restart: always
      environment:
        POSTGRES_USER: admin_mediconvoi
        POSTGRES_PASSWORD: VOTRE_MOT_DE_PASSE_SECURISE
        POSTGRES_DB: mediconvoi_core
      ports:
        - "5432:5432"
      volumes:
        - ./pgdata:/var/lib/postgresql/data
  ```
- [ ] Lancer la base : `docker compose up -d`.
- [ ] Tester la connexion depuis votre PC (via DBeaver ou TablePlus).

### 2.3. Migration des Données
- [ ] Exporter "Google Sheets - Facturation" en CSV.
- [ ] Exporter "Google Sheets - Clients" en CSV.
- [ ] Créer les tables SQL correspondantes sur le VPS.
- [ ] Importer les données.

---

## 🌐 PHASE 3 : LE FRONTEND (O2SWITCH)
*Mise en ligne des sites vitrines.*

### 3.1. Pointage DNS (Via Cloudflare)
- [ ] Dans Cloudflare > DNS.
- [ ] Modifier l'enregistrement **A** (racine `@`) pour pointer vers l'IP de **o2switch** (celle de votre hébergement).
- [ ] Modifier l'enregistrement **CNAME** (`www`) pour pointer vers `@` ou l'IP o2switch.
- [ ] Activer le switch "Orange" (Proxy) pour bénéficier du SSL gratuit et du cache.

### 3.2. Déploiement Site
- [ ] Se connecter au FTP o2switch.
- [ ] Uploader les fichiers de `Mediconvoi_Vitrine` dans `public_html`.
- [ ] Vérifier que le site s'affiche bien en HTTPS.

---

## 🤖 PHASE 4 : DÉPLOIEMENT DES AGENTS (ANTIGRAVITY)
*Installation du "Cerveau" sur le VPS.*

### 4.1. Installation Node.js & Environnement
- [ ] Sur le VPS OVH, cloner votre repo ou uploader le dossier `Agents_Backend`.
- [ ] Installer les dépendances : `npm install`.
- [ ] Configurer le `.env` pour qu'il pointe vers la nouvelle Base de Données Locale (localhost).

### 4.2. Automatisation (PM2)
- [ ] Installer PM2 (Gestionnaire de processus) : `npm install -g pm2`.
- [ ] Lancer Sentinel : `pm2 start Sentinel_Core.js --name sentinel`.
- [ ] Configurer le lancement au démarrage : `pm2 startup && pm2 save`.

---

## 💰 PHASE 5 : OPTIMISATION FINANCIÈRE (TRANSFERT)
*À faire environ 30-60 jours avant le renouvellement IONOS.*

- [ ] Déverrouiller le domaine chez IONOS (Unlock).
- [ ] Demander le **Code EPP (Auth Code)** chez IONOS.
- [ ] Dans Cloudflare > **Domain Registration** > **Transfer Domains**.
- [ ] Entrer le code. Payer 1 an (au prix coûtant Cloudflare) pour valider le transfert.
- [ ] **Résultat :** Vous ne payez plus IONOS, vous payez moins cher chez Cloudflare.

---

## ✅ CHECKLIST DE VALIDATION
- [ ] Site Web accessible (HTTPS) ?
- [ ] Base de données accessible par les Agents ?
- [ ] Agents IA (Sentinel) tournent en fond sans planter ?
- [ ] Emails (Si gérés par o2switch/IONOS) fonctionnent toujours ? (Attention aux enregistrements MX dans Cloudflare).
