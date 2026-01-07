# KickTrack - Documentation Technique

## Résumé du Projet

KickTrack est une Progressive Web App (PWA) de suivi de parties de babyfoot (foosball), développée avec Next.js 16, TypeScript, Firebase et Tailwind CSS.

---

## Stack Technique

| Technologie | Version | Usage |
|-------------|---------|-------|
| Next.js | 16.1.1 | Framework React avec App Router |
| TypeScript | 5.x | Typage statique |
| Tailwind CSS | 4.x | Styling utilitaire |
| Firebase Auth | 11.x | Authentification (Email, Anonyme) |
| Firestore | 11.x | Base de données temps réel |
| Zustand | 5.x | State management |
| QRCode.react | 4.x | Génération de QR codes |
| Heroicons | 2.x | Icônes UI |

---

## Structure du Projet

```
kicktrack/
├── app/                          # Pages Next.js (App Router)
│   ├── (auth)/                   # Pages d'authentification
│   │   ├── login/page.tsx        # Connexion
│   │   └── register/page.tsx     # Inscription
│   ├── (main)/                   # Pages principales (protégées)
│   │   ├── dashboard/page.tsx    # Tableau de bord
│   │   ├── game/
│   │   │   ├── new/page.tsx      # Créer une partie
│   │   │   ├── join/page.tsx     # Rejoindre une partie
│   │   │   └── [id]/
│   │   │       ├── page.tsx      # Partie en cours
│   │   │       └── results/page.tsx  # Résultats
│   │   └── venues/page.tsx       # Liste des lieux
│   ├── layout.tsx                # Layout racine avec métadonnées PWA
│   └── page.tsx                  # Landing page
│
├── components/
│   ├── ui/                       # Composants réutilisables
│   │   ├── Button.tsx            # Bouton avec variants
│   │   └── Input.tsx             # Champ de saisie
│   └── game/                     # Composants spécifiques au jeu
│       ├── QRCodeDisplay.tsx     # Affichage QR + PIN + timer
│       ├── PlayerList.tsx        # Liste des joueurs connectés
│       ├── GameTimer.tsx         # Chronomètre de partie
│       ├── GoalTimeline.tsx      # Historique des buts
│       └── AddGoalModal.tsx      # Modal pour ajouter un but
│
├── lib/
│   ├── firebase/
│   │   ├── config.ts             # Configuration Firebase (SSR-safe)
│   │   ├── auth.ts               # Fonctions d'authentification
│   │   ├── firestore.ts          # CRUD venues
│   │   ├── game-sessions.ts      # Gestion des sessions de jeu
│   │   └── games.ts              # Gestion des parties
│   ├── stores/
│   │   └── authStore.ts          # Store Zustand pour l'auth
│   └── utils/
│       └── code-generator.ts     # Génération de codes PIN
│
├── types/                        # Définitions TypeScript
│   ├── user.ts                   # User, UserStats
│   ├── venue.ts                  # Venue, VenueType
│   ├── game.ts                   # Game, Goal, GameSession
│   └── index.ts                  # Exports
│
└── public/
    ├── manifest.json             # Configuration PWA
    └── icons/                    # Icônes PWA (72-512px)
```

---

## Fonctionnalités Implémentées

### 🔐 Authentification

- **Inscription rapide** : Compte anonyme avec pseudo uniquement
- **Inscription complète** : Email + mot de passe + pseudo
- **Connexion classique** : Email + mot de passe
- **Upgrade de compte** : Lier un compte anonyme à un email

### 🎮 Système de Parties

- **Formats** : 1v1 ou 2v2
- **Scores** : Configurable (6 ou 11 buts)
- **Code PIN** : Format ABC-123 pour rejoindre
- **QR Code** : Généré automatiquement pour scan rapide
- **Temps réel** : Synchronisation multi-joueurs via Firestore

### ⚽ Déroulement de Partie

- Score en temps réel
- Ajout de buts avec position (Défense, Attaque 1/2/3)
- Timeline des buts avec fonction "Annuler"
- Chronomètre intégré
- Écran de résultats avec MVP et statistiques

### 📍 Gestion des Lieux

- Types : Bar, Domicile, Club, Autre
- Recherche et filtres
- Statistiques par lieu

---

## Configuration Firebase

### Variables d'Environnement

Fichier `.env.local` à la racine de `kicktrack/` :

```env
NEXT_PUBLIC_FIREBASE_API_KEY=votre_clé
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=projet.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=projet-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=projet.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXX
```

### Méthodes d'Authentification Requises

Dans Firebase Console → Authentication → Sign-in method :

- ✅ Email/Mot de passe
- ✅ Anonyme

### Règles Firestore

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /venues/{venueId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    match /game_sessions/{sessionId} {
      allow read, write: if request.auth != null;
    }
    
    match /games/{gameId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## Commandes

```bash
# Installation des dépendances
cd kicktrack
npm install

# Développement
npm run dev

# Build production
npm run build

# Lancement production
npm start
```

---

## Routes de l'Application

| Route | Description | Auth |
|-------|-------------|------|
| `/` | Landing page | Non |
| `/login` | Connexion | Non |
| `/register` | Inscription | Non |
| `/dashboard` | Tableau de bord | Oui |
| `/game/new` | Créer une partie | Oui |
| `/game/join` | Rejoindre une partie | Oui |
| `/game/[id]` | Partie en cours | Oui |
| `/game/[id]/results` | Résultats | Oui |
| `/venues` | Liste des lieux | Oui |

---

## Design

- **Thème** : Dark mode avec accents émeraude/teal
- **Style** : Glassmorphism avec backdrop blur
- **Responsive** : Mobile-first, max-width 512px pour les pages principales
- **Animations** : Transitions CSS smooth, loading spinners

---

## Prochaines Étapes

- [ ] Page profil avec statistiques détaillées
- [ ] Leaderboard global et par lieu
- [ ] Scanner QR avec caméra
- [ ] Notifications push
- [ ] Mode hors-ligne (Service Worker)
- [ ] Tests unitaires et E2E
