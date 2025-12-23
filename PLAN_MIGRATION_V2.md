# Plan de Migration: App Livreur V2 (PWA)

## 1. Vision et Objectifs
Transformer la "Web App" Google Apps Script actuelle en une **Progressive Web App (PWA)** professionnelle, rapide et esthétique.
- **Expérience Utilisateur** : Interface fluide, "App-like", animations soignées.
- **Fiabilité** : Mode hors-ligne (Offline-first) pour les zones blanches.
- **Evolutivité** : Architecture moderne (React) prête pour migrer vers une vraie base de données (Supabase/Firebase).

## 2. Architecture Technique
- **Frontend** : React 18, Vite (Build tool), TailwindCSS (Styling).
- **Icons** : Lucide React (pour un look moderne).
- **Navigation** : React Router v6.
- **State Management** : Zustand (léger et performant) ou React Context.
- **Données (Phase de Transition)** : 
  - Utilisation de Google Sheets comme "Headless CMS" via l'API Apps Script existante (`doGet`/`post`).
  - Abstraction des services pour faciliter le switch vers Supabase plus tard.

## 3. Charte Graphique (Design System)
- **Palette** :
  - Primaire : Bleu profond / Indigo (Professionnel & Confiance).
  - Secondaire : Vert Émeraude (Action positive / Validation).
  - Accent : Orange/Ambre (Alertes).
  - Arrière-plans : Gris très clair (Clean look) ou Dark Mode profond.
- **Typographie** : Inter ou Outfit (Google Fonts).

## 4. Étapes de Mise en Œuvre
### Étape 1 : Initialisation & Fondations (Immédiat)
- [ ] Création du projet Vite + React.
- [ ] Installation de TailwindCSS & Configuration du Design System.
- [ ] Mise en place de l'environnement de développement.

### Étape 2 : Composants Core & UI
- [ ] Création des composants UI de base (Card, Button, Badge, Input).
- [ ] Layout principal (Header, Bottom Navigation pour mobile).
- [ ] Pages : 
  - `Login` (Code d'accès).
  - `TourneeList` (Liste des livraisons du jour).
  - `LivraisonDetail` (Vue détaillée d'un stop).

### Étape 3 : Logique Métier & Connexion Données
- [ ] Service `ApiService` pour mocker les appels dans un premier temps.
- [ ] Intégration des données réelles (Users -> Tournées -> Stops).

### Étape 4 : PWA & Offline
- [ ] Configuration du Service Worker (Vite PWA Plugin).
- [ ] Mise en cache des données de la tournée.

---
**Statut** : Démarrage de l'Étape 1.
