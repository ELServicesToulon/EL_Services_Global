# ELS

## Modules séparés

- **Livraison** : le module livreur est désormais maintenu dans `livraison/` avec son propre projet Apps Script (`scriptId`: `1G7Ns69bqJ3stckj7UiquiWW6QOgZCmKMPhWh17fHau8v_MONSqbFWIDW`, `gcpProject`: `552451921728`).  
  - Pour déployer : `cd livraison && clasp push` (le `.clasp.json` local pointe déjà vers le bon projet).  
  - Le module reste compatible avec l'application principale grâce aux helpers d'inclusion automatiques.
