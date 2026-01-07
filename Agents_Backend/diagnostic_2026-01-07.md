# 🔧 Rapport Diagnostic - 07/01/2026

Généré le: 07/01/2026 07:00:13

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
- **Occurrences**: 6
- **Dernière**: 07/01/2026 04:59:34

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
- **Occurrences**: 7

**Suggestion:** Ajouter waitForSelector avec timeout plus long ou vérifier le sélecteur CSS

### Service accessible en HTTP au lieu de HTTPS

- **Agent**: NETWORK
- **Occurrences**: 102

**Suggestion:** Configurer certificat SSL via Certbot sur le serveur

