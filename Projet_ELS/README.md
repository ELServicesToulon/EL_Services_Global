# ELS

## Modules

- **Tesla Livraison** : l'ancien module livraison a ete retire au profit d'une variante basee sur l'interface Tesla (`Tesla_Livraison_*` + `Tesla.js`).  
  - Acces via `?page=livraison` ou `?page=tesla-livraison`.  
  - Pas de sous-projet `livraison/` separe : la page est servie par le projet principal (Apps Script ELS ID `1hRea4xVBO3hoNjqV2tD9mnAENr6UhEJ9of7BlbrJuRygMUHkNmbiX93q`).
  - La page `?page=livraison` inclut un panneau chauffeur (courses du jour + statuts) protégé par le code `ELS_SHARED_SECRET`.
