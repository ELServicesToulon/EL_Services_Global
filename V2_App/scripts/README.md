# Sheet to Supabase Migration

## Prérequis

1. Exécutez d'abord les migrations SQL dans Supabase:
   - `supabase/migrations/001_create_bookings.sql`
   - `supabase/migrations/002_create_etablissements.sql`

2. Obtenez la clé service_role de Supabase (Dashboard → Settings → API)

## Exécution

```bash
cd V2_App

# Installer les dépendances si nécessaire
npm install @supabase/supabase-js

# Définir la clé service_role
export SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# Lancer la migration
node scripts/migrate_sheets_to_supabase.js
```

## Données migrées

| Source (Sheet)       | Destination (Supabase) |
|---------------------|------------------------|
| Base_Etablissements | etablissements         |
| Clients             | profiles (préparé)     |
| Facturation         | bookings               |

## Notes

- Les clients existants seront créés dans `profiles` à leur première connexion
- Les réservations historiques sont importées avec statut "completed"
- Le script utilise l'export CSV public du Sheet
