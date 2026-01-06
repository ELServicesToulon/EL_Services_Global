# 🔧 Rapport Diagnostic - 07/01/2026

Généré le: 07/01/2026 00:34:26

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
- **Occurrences**: 4
- **Dernière**: 06/01/2026 21:36:08

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
- **Occurrences**: 3

**Suggestion:** Ajouter waitForSelector avec timeout plus long ou vérifier le sélecteur CSS

### Service accessible en HTTP au lieu de HTTPS

- **Agent**: NETWORK
- **Occurrences**: 29

**Suggestion:** Configurer certificat SSL via Certbot sur le serveur

