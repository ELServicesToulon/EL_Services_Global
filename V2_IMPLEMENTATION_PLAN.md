# Plan d'Implémentation V2 - EL Services

## 1. Architecture Technique
- **Frontend** : React (Vite) + Tailwind CSS (Design System).
- **Backend (BaaS)** : Supabase (PostgreSQL, Auth, Realtime).
- **Hosting** : Vercel (Recommandé) ou Netlify.
- **Emails** : Resend API.

## 2. Structure de Données (Schema SQL)

### Table `profiles` (Clients)
- `id` (UUID, li  auth.users)
- `email` (Text, Unique)
- `full_name` (Text)
- `phone` (Text)
- `address` (Text)
- `postal_code` (Text)
- `siret` (Text, Optionnel)
- `is_approved` (Boolean, Validation admin)

### Table `bookings` (Rservations)
- `id` (UUID)
- `user_id` (FK -> profiles)
- `scheduled_at` (Timestamp)
- `status` (Enum: pending, confirmed, in_progress, completed, cancelled)
- `stops_count` (Integer)
- `has_return` (Boolean)
- `is_urgent` (Boolean)
- `notes` (Text)
- `price_estimated` (Decimal)

### Table `audit_logs` (Traçabilité)
- `id` (UUID)
- `booking_id` (FK -> bookings)
- `action` (Text)
- `payload` (JSONB)
- `created_at` (Timestamp)

## 3. Roadmap

### Phase 1 : Initialisation (Aujourd'hui)
- [ ] Création du projet React/Vite (`V2_App`).
- [ ] Installation de Tailwind CSS.
- [ ] Configuration du client Supabase (`src/lib/supabase.js`).

### Phase 2 : Authentification
- [ ] Page de Login (Email + Magic Link pour rapidité comme V1).
- [ ] Page d'Inscription simplifiée.

### Phase 3 : Prise de Commande
- [ ] Formulaire de réservation intuitif (Date, Heure, Options).
- [ ] Calcul de prix immédiat (Frontend).

### Phase 4 : Dashboard Client
- [ ] Liste des commandes en cours.
- [ ] Statuts en temps réel.

### Phase 5 : Migration
- [ ] Script d'import des clients V1 vers V2 (Optionnel).
