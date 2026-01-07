# 🔧 Rapport Diagnostic - 07/01/2026

Généré le: 07/01/2026 19:53:11

---

## 📊 Résumé

| Sévérité | Nombre |
|----------|--------|
| 🔴 Critique | 1 |
| 🟡 Warning | 3 |
| 🔵 Info | 0 |

---

## 🔴 Problèmes Critiques

### Playwright browser non installé

- **Agent**: GHOST_SHOPPER
- **Occurrences**: 9
- **Dernière**: 07/01/2026 12:13:10

**Solution:**
```bash
npx playwright install chromium
```

## 🟡 Avertissements

### Page trop lente à charger

- **Agent**: GHOST_SHOPPER
- **Occurrences**: 9

**Suggestion:** Augmenter le timeout ou optimiser la page cible

### Élément UI non visible - possible changement de page

- **Agent**: GHOST_SHOPPER
- **Occurrences**: 14

**Suggestion:** Ajouter waitForSelector avec timeout plus long ou vérifier le sélecteur CSS

### Service accessible en HTTP au lieu de HTTPS

- **Agent**: NETWORK
- **Occurrences**: 308

**Suggestion:** Configurer certificat SSL via Certbot sur le serveur

