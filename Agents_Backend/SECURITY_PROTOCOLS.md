# 🛡️ Protocoles de Sécurité & Configuration Hébergement

Ce document référence les politiques de sécurité actives sur l'hébergement (o2switch / Tiger Protect) et les règles à suivre par les agents (Network Overseer).

## 1. Configuration Tiger Protect (WAF)

| Fonctionnalité | État | Justification |
| :--- | :--- | :--- |
| **Sécurité par défaut** | ✅ **ACTIVÉ** | Protection de base indispensable (SQLi, XSS). |
| **Contrôle Navigateur** | ⚠️ **DÉSACTIVÉ** | **Risque de blocage** pour les agents API (`Network_Overseer`). Activer uniquement si IPs whitelisted. |
| **Bloquer fichiers dev** | ✅ **ACTIVÉ** | Empêche l'accès public aux `.env`, `.git`, etc. |
| **Mode "Je suis attaqué"**| ⛔ **DÉSACTIVÉ** | Trop agressif (CAPTCHA), bloque les agents. |
| **Robots SEO** | ✅ **ACTIVÉ** | Économie de ressources. |
| **Robots Malveillants** | ✅ **ACTIVÉ** | Filtrage IP basique. |
| **Faux Google Bot** | ✅ **ACTIVÉ** | Usurpation courante bloquée. |
| **Sans User-Agent** | ✅ **ACTIVÉ** | **Requis :** Les agents DOIVENT envoyer un User-Agent (voir section 3). |
| **Sortie Tor** | ✅ **ACTIVÉ** | Aucun usage légitime prévu depuis Tor. |
| **Mauvaise Réputation** | ✅ **ACTIVÉ** | Filtrage blacklists IP. |

## 2. ModSecurity (Pare-feu applicatif)

*   **État** : ✅ **ACTIVÉ**
*   **Note** : Si les agents reçoivent des erreurs `403 Forbidden` ou `406 Not Acceptable` lors de requêtes POST (envoi de JSON), vérifier les logs ModSecurity.

## 3. Conformité des Agents

Pour passer les filtres ci-dessus, tous les agents (Network Overseer, Ghost Shopper, Scripts de maintenance) doivent respecter ces règles :

### Identification (User-Agent)
Les requêtes HTTP ne doivent jamais être anonymes.
*   **Header Requis** : `User-Agent: Mediconvoi-Sentinel/1.0` (ou version supérieure)
*   **Implémentation** : Déjà appliqué dans `Network_Overseer.js`.

### Alertes SSL (HTTP vs HTTPS)
*   **Services Externes** : Doivent impérativement être en HTTPS.
*   **Services Internes (Localhost/VPS)** : Peuvent rester en HTTP (Core Studio/API sur 127.0.0.1).
    *   *Note* : Le rapport de diagnostic filtre automatiquement ces fausses alertes pour le localhost.

## 4. Maintenance
En cas de blocage d'un agent par le pare-feu :
1.  Vérifier l'IP du VPS.
2.  Whitelister l'IP dans l'interface cPanel / Tiger Protect si nécessaire.
3.  Ne JAMAIS désactiver la "Sécurité par défaut" globalement.
