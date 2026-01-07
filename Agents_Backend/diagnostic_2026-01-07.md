# 🔧 Rapport Diagnostic - 07/01/2026

Généré le: 07/01/2026 09:40:47

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
- **Occurrences**: 8
- **Dernière**: 07/01/2026 08:13:15

**Solution:**
```bash
npx playwright install chromium
```

## 🟡 Avertissements

### Page trop lente à charger

- **Agent**: GHOST_SHOPPER
- **Occurrences**: 3

**Suggestion:** Augmenter le timeout ou optimiser la page cible

### Élément UI non visible - possible changement de page

- **Agent**: GHOST_SHOPPER
- **Occurrences**: 11

**Suggestion:** Ajouter waitForSelector avec timeout plus long ou vérifier le sélecteur CSS

### Service accessible en HTTP au lieu de HTTPS

- **Agent**: NETWORK
- **Occurrences**: 138

**Suggestion:** Configurer certificat SSL via Certbot sur le serveur

