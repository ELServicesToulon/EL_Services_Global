# 🏗️ ARCHITECTURE & DÉPLOIEMENT EL SERVICES (2026)

Dernière mise à jour : 03/01/2026 - Migration Hybride Complète

---

## 1. INFRASTRUCTURE

| Composant | Fournisseur | Rôle | Accès / IP |
| :--- | :--- | :--- | :--- |
| **DNS / CDN** | **Cloudflare** | Gestion domaines, SSL, Protection DDoS | `dash.cloudflare.com` |
| **Site Web (Front)** | **o2switch** | Sites PHP (Presta/WP/Html) | `109.234.166.100` |
| **Intelligence (Back)** | **OVH VPS** | API Node.js, Sentinel IA, Base de Données | `37.59.124.82` |
| **Base de Données** | **PostgreSQL** | Données Clients/Livreurs (Docker sur VPS) | `37.59.124.82:5432` |

---

## 2. LISTE DES DOMAINES (Gérés par Cloudflare)

Tous les domaines ci-dessous utilisent les Nameservers : `ollie.ns.cloudflare.com` & `darl.ns.cloudflare.com`.

| Domaine | Cible Actuelle | Usage |
| :--- | :--- | :--- |
| `mediconvoi.fr` | o2switch | Site Principal |
| `elsangel.fr` | o2switch | Vitrine |
| `medcargo.fr` | o2switch | Logistique |
| `mediconvoi.com` | o2switch | Alias |
| `mediconvoi.info` | o2switch | Alias |
| `mediconvoi.store` | o2switch | Alias |
| `pharmacie-livra...com` | o2switch | Alias |
| `pharmacie-livra...online` | o2switch | Alias |
| `pharmacie-livra...store` | o2switch | Alias |
| `pharmacie-livra...fr` | **Google Script** | App Legacy / Workflow spécifique |

---

## 3. ACCÈS SERVEUR (VPS OVH)

*   **SSH :**
    *   IP : `37.59.124.82`
    *   User : `ubuntu`
    *   Pass : `******* (Voir deploy_vps.js)`
    *   Commande : `ssh ubuntu@37.59.124.82`

*   **Base de Données (PostgreSQL) :**
    *   Host : `localhost` (depuis le VPS) ou IP publique (si port ouvert)
    *   Port : `5432`
    *   User : `admin_mediconvoi`
    *   DB : `mediconvoi_db`
    *   Pass : `CHANGE_ME_SECURELY` (à changer en prod !)

*   **Administration Docker (Portainer) :**
    *   URL : `http://37.59.124.82:9000`
    *   Permet de voir les conteneurs et les logs via le navigateur.

---

## 4. PROCÉDURES COURANTES

### Mettre à jour l'Intelligence Artificielle (Sentinel)
```bash
# Depuis votre PC local
node deploy_vps.js
```

### Migrer de nouvelles données Google Sheet -> Base de Données
```bash
# Depuis votre PC local
node deploy_migration.js
```

### Ajouter un nouveau domaine
1.  Aller sur Cloudflare > Add Site.
2.  Changer les NS chez le registrar (IONOS/o2switch) vers `ollie` et `darl`.
3.  Attendre la propagation.
4.  Lancer `node fix_cloudflare_dns.js` (local) pour auto-configurer l'IP.

---

## 5. PROCHAINES ÉTAPES (TODO)
- [ ] Connecter l'App Mobile V2 à l'API du VPS (au lieu du Google Sheet).
- [ ] Configurer un backup automatique de la base PostgreSQL (via script cron).
- [ ] Sécuriser Portainer (HTTPS) via un Reverse Proxy (Nginx/Traefik).
