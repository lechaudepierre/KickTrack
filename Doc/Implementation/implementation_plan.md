# Plan d'Implémentation KickTrack - Application de Suivi de Babyfoot

## Vue d'Ensemble

KickTrack est une Progressive Web App (PWA) pour tracker et gérer des parties de babyfoot ("cliquet" en Belgique). L'application permet de créer des profils utilisateurs, valider des parties multi-joueurs, et suivre des statistiques détaillées par lieu.

## User Review Required

## Décisions Validées ✅

**Stack Technique:**

- **Frontend:** Next.js (React) avec App Router
- **Backend:** Firebase (Authentication + Firestore)
  - *Avantages:* Temps réel natif pour validation multi-joueurs et scores en direct, gratuit jusqu'à 50k lectures/jour, authentification intégrée, scaling automatique
- **Styling:** Tailwind CSS
- **Hébergement:** Vercel

**Nom de l'Application:** KickTrack

**Score de Victoire:** Configurable par partie

- Option 1: Premier à 6 buts
- Option 2: Premier à 11 buts

**Gestion des Parties Abandonnées:**

- Les parties annulées sont supprimées de la base de données
- Elles ne figurent pas dans les statistiques des joueurs

---

## Proposed Changes

### Phase 0: Configuration Initiale du Projet

#### [NEW] Setup Infrastructure

**Fichiers à créer:**

- Configuration Next.js avec TypeScript
- Configuration Firebase
- Configuration Tailwind CSS
- Configuration PWA

**Actions:**

1. **Initialiser le projet Next.js**

```bash
npx create-next-app@latest kicktrack --typescript --tailwind --app --no-src-dir
```

1. **Installer les dépendances essentielles**

```bash
npm install firebase
npm install @firebase/firestore
npm install @firebase/auth
npm install qrcode.react
npm install zustand  # State management
npm install react-qr-reader  # QR code scanning
npm install date-fns  # Date utilities
npm install @heroicons/react  # Icons
```

1. **Installer les dépendances PWA**

```bash
npm install next-pwa
```

1. **Structure de dossiers recommandée**

```
kicktrack/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (main)/
│   │   ├── dashboard/
│   │   ├── profile/
│   │   ├── venues/
│   │   ├── game/
│   │   │   ├── new/
│   │   │   ├── join/
│   │   │   └── [id]/
│   │   ├── leaderboard/
│   │   └── stats/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/          # Composants UI réutilisables
│   ├── game/        # Composants liés aux parties
│   ├── stats/       # Composants statistiques
│   └── layout/      # Layout components
├── lib/
│   ├── firebase/
│   │   ├── config.ts
│   │   ├── auth.ts
│   │   ├── firestore.ts
│   │   └── collections.ts
│   ├── hooks/       # Custom React hooks
│   ├── utils/       # Utility functions
│   └── stores/      # Zustand stores
├── types/
│   ├── user.ts
│   ├── game.ts
│   └── venue.ts
├── public/
│   ├── icons/
│   ├── manifest.json
│   └── sw.js
└── styles/
    └── globals.css
```

---

### Phase 1: Configuration Firebase

#### [NEW] [firebase/config.ts](file:///Users/pierrelechaude/Code/KickTrack/lib/firebase/config.ts)

Configuration initiale Firebase avec variables d'environnement.

**Contenu:**

```typescript
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
```

#### [NEW] [types/user.ts](file:///Users/pierrelechaude/Code/KickTrack/types/user.ts)

Types TypeScript pour les utilisateurs.

```typescript
export interface UserStats {
  totalGames: number;
  wins: number;
  losses: number;
  goalsScored: number;
  goalsConceded: number;
  winRate: number;
}

export interface User {
  userId: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  createdAt: Date;
  stats: UserStats;
  preferences?: {
    favoriteVenue?: string;
    notifications?: boolean;
  };
}
```

#### [NEW] [types/venue.ts](file:///Users/pierrelechaude/Code/KickTrack/types/venue.ts)

Types TypeScript pour les lieux.

#### [NEW] [types/game.ts](file:///Users/pierrelechaude/Code/KickTrack/types/game.ts)

Types TypeScript pour les parties.

---

### Phase 2: Authentification et Profils

#### [NEW] [app/(auth)/login/page.tsx](file:///Users/pierrelechaude/Code/KickTrack/app/(auth)/login/page.tsx)

Page de connexion avec:

- Formulaire simple (username/email + password)
- Option "Compte rapide" (username uniquement)
- Lien vers inscription
- Option "Jouer en invité"

#### [NEW] [app/(auth)/register/page.tsx](file:///Users/pierrelechaude/Code/KickTrack/app/(auth)/register/page.tsx)

Page d'inscription avec deux modes:

- **Mode rapide:** Username uniquement (création instantanée)
- **Mode complet:** Username + Email + Password (compte sécurisé)

#### [NEW] [lib/firebase/auth.ts](file:///Users/pierrelechaude/Code/KickTrack/lib/firebase/auth.ts)

Fonctions d'authentification:

```typescript
- registerQuick(username: string): Promise<User>
- registerComplete(username: string, email: string, password: string): Promise<User>
- login(identifier: string, password?: string): Promise<User>
- logout(): Promise<void>
- upgradeAccount(email: string, password: string): Promise<void>
```

#### [NEW] [components/ui/Button.tsx](file:///Users/pierrelechaude/Code/KickTrack/components/ui/Button.tsx)

Composant bouton réutilisable avec variants (primary, secondary, danger).

#### [NEW] [components/ui/Input.tsx](file:///Users/pierrelechaude/Code/KickTrack/components/ui/Input.tsx)

Composant input réutilisable avec validation.

#### [NEW] [app/(main)/dashboard/page.tsx](file:///Users/pierrelechaude/Code/KickTrack/app/(main)/dashboard/page.tsx)

Dashboard principal avec:

- Carte de profil (avatar, nom, stats principales)
- Actions rapides (Nouvelle Partie, Rejoindre, Stats, Classements)
- Fil d'actualité (parties récentes)

---

### Phase 3: Gestion des Lieux

#### [NEW] [app/(main)/venues/page.tsx](file:///Users/pierrelechaude/Code/KickTrack/app/(main)/venues/page.tsx)

Page liste des lieux avec:

- Liste paginée des lieux
- Recherche/filtre par nom et type
- Bouton "Ajouter un lieu"

#### [NEW] [app/(main)/venues/add/page.tsx](file:///Users/pierrelechaude/Code/KickTrack/app/(main)/venues/add/page.tsx)

Formulaire d'ajout de lieu:

- Nom (requis)
- Type (bar, domicile, club, autre)
- Adresse (optionnel)
- Nombre de tables (optionnel)
- Photo (optionnel)
- Vérification des doublons

#### [NEW] [app/(main)/venues/[id]/page.tsx](file:///Users/pierrelechaude/Code/KickTrack/app/(main)/venues/[id]/page.tsx)

Page détail d'un lieu:

- Informations du lieu
- Classement local (top 10)
- Statistiques du lieu
- Parties récentes
- Bouton "Jouer ici"

#### [NEW] [lib/firebase/firestore.ts](file:///Users/pierrelechaude/Code/KickTrack/lib/firebase/firestore.ts)

Fonctions Firestore pour les lieux:

```typescript
- createVenue(venue: VenueInput): Promise<Venue>
- getVenues(filters?: VenueFilters): Promise<Venue[]>
- getVenueById(id: string): Promise<Venue>
- checkVenueDuplicate(name: string, address?: string): Promise<boolean>
```

---

### Phase 4: Système de Validation Multi-joueurs

#### [NEW] [app/(main)/game/new/page.tsx](file:///Users/pierrelechaude/Code/KickTrack/app/(main)/game/new/page.tsx)

Flow de création de partie:

**Étape 1: Configuration**

- Sélection du format (1v1 / 2v2)
- Sélection du lieu
- Bouton "Générer le code"

**Étape 2: Validation**

- Affichage du QR code (grand, centré)
- Code PIN en gros caractères (ABC-123)
- Timer de 5 minutes
- Liste des joueurs avec statut (✓ validé, ⏳ en attente)
- Bouton "Commencer" (actif quand tous ont rejoint)
- Bouton "Annuler"

**Étape 3: Composition des équipes (si 2v2)**

- Interface de sélection des équipes
- Drag-and-drop ou sélection simple
- Confirmation des équipes

#### [NEW] [app/(main)/game/join/page.tsx](file:///Users/pierrelechaude/Code/KickTrack/app/(main)/game/join/page.tsx)

Interface pour rejoindre une partie:

- Option 1: Scan QR code (react-qr-reader)
- Option 2: Saisie manuelle du code PIN
- Sélection de son profil
- Bouton "Rejoindre"

#### [NEW] [lib/utils/code-generator.ts](file:///Users/pierrelechaude/Code/KickTrack/lib/utils/code-generator.ts)

Générateur de codes PIN:

```typescript
- generatePinCode(): string  // Génère ABC-123
- validatePinCode(code: string): boolean
- isExpired(createdAt: Date): boolean
```

#### [NEW] [components/game/QRCodeDisplay.tsx](file:///Users/pierrelechaude/Code/KickTrack/components/game/QRCodeDisplay.tsx)

Composant d'affichage du QR code avec:

- QR code généré dynamiquement
- Code PIN lisible
- Timer countdown

#### [NEW] [components/game/PlayerList.tsx](file:///Users/pierrelechaude/Code/KickTrack/components/game/PlayerList.tsx)

Liste des joueurs en attente avec indicateurs visuels.

#### [NEW] [lib/firebase/game-sessions.ts](file:///Users/pierrelechaude/Code/KickTrack/lib/firebase/game-sessions.ts)

Gestion des sessions de jeu:

```typescript
- createGameSession(initiatorId: string, venueId: string, format: string): Promise<GameSession>
- joinGameSession(sessionId: string, userId: string): Promise<void>
- getGameSession(code: string): Promise<GameSession>
- updateGameSession(sessionId: string, updates: Partial<GameSession>): Promise<void>
- startGame(sessionId: string, teams: Teams): Promise<Game>
```

**Base de données en temps réel:**

- Utiliser `onSnapshot` pour synchroniser les joueurs qui rejoignent
- Mise à jour en temps réel de la liste des joueurs

---

### Phase 5: Déroulement de la Partie

#### [NEW] [app/(main)/game/[id]/page.tsx](file:///Users/pierrelechaude/Code/KickTrack/app/(main)/game/[id]/page.tsx)

Interface de jeu en cours:

**Layout:**

```
┌─────────────────────────────────────┐
│ Header: Lieu + Timer                │
├─────────────────────────────────────┤
│  Équipe 1        vs       Équipe 2  │
│  Alice + Bob              Carl + Dan│
│                                      │
│      [  5  ]    -    [  3  ]        │
│                                      │
├─────────────────────────────────────┤
│  Dernier but: Alice (Attaque)       │
├─────────────────────────────────────┤
│   [+ But Équipe 1] [+ But Équipe 2] │
├─────────────────────────────────────┤
│  Timeline des buts (scrollable)     │
└─────────────────────────────────────┘
```

**Fonctionnalités:**

- Score en temps réel (synchronisé)
- Boutons d'ajout de but (grandes zones tactiles)
- Timeline des buts avec possibilité d'annuler
- Timer affichant la durée
- Menu (⋮) avec options:
  - Annuler le dernier but
  - Terminer la partie
  - Abandonner

#### [NEW] [components/game/AddGoalModal.tsx](file:///Users/pierrelechaude/Code/KickTrack/components/game/AddGoalModal.tsx)

Modal pour ajouter un but:

- "Qui a marqué ?" → Liste des joueurs de l'équipe
- "Position du but ?" → Défense / Attaque 1 / Attaque 2 / Attaque 3
- Boutons "Valider" et "Annuler"

#### [NEW] [components/game/GoalTimeline.tsx](file:///Users/pierrelechaude/Code/KickTrack/components/game/GoalTimeline.tsx)

Timeline des buts avec:

- Ordre chronologique
- Joueur, équipe, position
- Icône pour annuler (récent seulement)

#### [NEW] [components/game/GameTimer.tsx](file:///Users/pierrelechaude/Code/KickTrack/components/game/GameTimer.tsx)

Chronomètre de partie (mm:ss).

#### [NEW] [app/(main)/game/[id]/results/page.tsx](file:///Users/pierrelechaude/Code/KickTrack/app/(main)/game/[id]/results/page.tsx)

Écran de fin de partie:

- Score final (très visible)
- Animation de victoire
- MVP (joueur avec le plus de buts)
- Récapitulatif:
  - Durée totale
  - Buts par joueur
  - Buts par position
- Boutons:
  - "Revanche" (nouvelle partie, mêmes joueurs)
  - "Nouvelle Partie"
  - "Voir Statistiques"
  - "Retour Accueil"

#### [NEW] [lib/firebase/games.ts](file:///Users/pierrelechaude/Code/KickTrack/lib/firebase/games.ts)

Gestion des parties:

```typescript
- createGame(session: GameSession, teams: Teams): Promise<Game>
- addGoal(gameId: string, goal: Goal): Promise<void>
- removeLastGoal(gameId: string): Promise<void>
- endGame(gameId: string): Promise<GameResults>
- abandonGame(gameId: string): Promise<void>
- getGame(gameId: string): Promise<Game>
- subscribeToGame(gameId: string, callback: (game: Game) => void): Unsubscribe
```

#### [NEW] [lib/utils/stats-calculator.ts](file:///Users/pierrelechaude/Code/KickTrack/lib/utils/stats-calculator.ts)

Calcul des statistiques de fin de partie:

```typescript
- calculateGameStats(game: Game): GameStats
- determineMVP(game: Game): Player
- updatePlayerStats(userId: string, game: Game): Promise<void>
- updateVenueStats(venueId: string, game: Game): Promise<void>
```

---

### Phase 6: Statistiques et Classements

#### [NEW] [app/(main)/profile/page.tsx](file:///Users/pierrelechaude/Code/KickTrack/app/(main)/profile/page.tsx)

Page profil utilisateur:

**Sections:**

1. En-tête: Avatar, nom, date de création
2. Stats principales (cartes):
   - Parties jouées
   - Victoires / Défaites
   - Ratio W/L
   - Buts marqués / encaissés

3. Onglets:
   - **Vue d'ensemble:** Stats principales + graphiques
   - **Historique:** Liste des parties récentes
   - **Statistiques détaillées:** Buts par position, perf 1v1 vs 2v2, etc.
   - **Par lieu:** Performance par lieu

#### [NEW] [app/(main)/leaderboard/page.tsx](file:///Users/pierrelechaude/Code/KickTrack/app/(main)/leaderboard/page.tsx)

Page de classements:

**Onglets:**

- Classement global
- Par lieu
- Mensuel
- Entre amis (Phase 2)

**Filtres:**

- Par format (1v1 / 2v2 / tous)
- Par période (jour / semaine / mois / année / tout)

**Liste:**

- Position
- Avatar
- Nom
- Stats (victoires, ratio, buts)
- Indicateur de sa propre position

#### [NEW] [components/stats/StatCard.tsx](file:///Users/pierrelechaude/Code/KickTrack/components/stats/StatCard.tsx)

Carte de statistique réutilisable.

#### [NEW] [components/stats/Chart.tsx](file:///Users/pierrelechaude/Code/KickTrack/components/stats/Chart.tsx)

Composants de graphiques (utiliser `recharts` ou `chart.js`):

- Évolution du ratio de victoires
- Buts par période
- Performance par lieu

#### [NEW] [lib/firebase/stats.ts](file:///Users/pierrelechaude/Code/KickTrack/lib/firebase/stats.ts)

Requêtes pour les statistiques:

```typescript
- getUserStats(userId: string): Promise<UserStats>
- getUserGameHistory(userId: string, limit?: number): Promise<Game[]>
- getLeaderboard(type: LeaderboardType, filters?: Filters): Promise<LeaderboardEntry[]>
- getVenueStats(venueId: string): Promise<VenueStats>
- getVenueLeaderboard(venueId: string): Promise<LeaderboardEntry[]>
```

---

### Phase 7: Configuration PWA

#### [NEW] [public/manifest.json](file:///Users/pierrelechaude/Code/KickTrack/public/manifest.json)

Manifest PWA:

```json
{
  "name": "KickTrack - Suivi de Babyfoot",
  "short_name": "KickTrack",
  "description": "Tracker et gérer vos parties de babyfoot",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1e293b",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

#### [MODIFY] [next.config.js](file:///Users/pierrelechaude/Code/KickTrack/next.config.js)

Configuration de next-pwa:

```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
});

module.exports = withPWA({
  // ... autres configs Next.js
});
```

#### [NEW] [app/layout.tsx](file:///Users/pierrelechaude/Code/KickTrack/app/layout.tsx)

Layout principal avec:

- Métadonnées SEO
- Liens vers manifest et icônes
- Provider d'authentification
- Layout responsive

---

### Phase 8: Optimisations et Polish

#### [NEW] [components/layout/MobileNav.tsx](file:///Users/pierrelechaude/Code/KickTrack/components/layout/MobileNav.tsx)

Navigation mobile avec bottom tab bar.

#### [NEW] [components/ui/LoadingSpinner.tsx](file:///Users/pierrelechaude/Code/KickTrack/components/ui/LoadingSpinner.tsx)

Spinner de chargement.

#### [NEW] [components/ui/ErrorBoundary.tsx](file:///Users/pierrelechaude/Code/KickTrack/components/ui/ErrorBoundary.tsx)

Gestion des erreurs React.

#### [MODIFY] Ajout d'animations Tailwind

Utiliser les transitions et animations Tailwind pour:

- Transitions de page
- Hover states
- Modal entrances/exits
- Score updates

#### Optimisations des performances

1. **Lazy loading:**
   - Images avec `next/image`
   - Composants avec `dynamic` import

2. **Caching:**
   - Cache des données Firestore fréquentes
   - SWR ou React Query pour les requêtes

3. **Indexation Firestore:**
   - Index composites pour les requêtes complexes
   - Rules de sécurité Firestore

---

## Verification Plan

### Automated Tests

**Tests unitaires (Jest + React Testing Library):**

```bash
npm test
```

- Tests des fonctions utilitaires (code generator, stats calculator)
- Tests des hooks personnalisés
- Tests des composants UI isolés

**Tests d'intégration:**

- Flow complet de création de partie
- Flow de validation multi-joueurs
- Calcul des statistiques

**Commandes de vérification:**

```bash
npm run build  # Build production
npm run lint   # Linting
npm run type-check  # TypeScript vérification
```

### Manual Verification

**Tests fonctionnels manuels:**

1. **Authentification:**
   - Inscription rapide fonctionne
   - Inscription complète fonctionne
   - Connexion fonctionne
   - Upgrade de compte fonctionne

2. **Création de lieu:**
   - Ajout de lieu fonctionne
   - Détection de doublons fonctionne
   - Recherche de lieux fonctionne

3. **Validation multi-joueurs:**
   - Génération de code PIN
   - QR code fonctionne
   - Saisie manuelle du code fonctionne
   - Synchronisation temps réel des joueurs
   - Expiration du code après 5 min

4. **Partie:**
   - Ajout de buts fonctionne
   - Score synchronisé en temps réel
   - Timeline des buts correcte
   - Annulation du dernier but fonctionne
   - Fin de partie et calcul des stats

5. **Statistiques:**
   - Calcul correct des stats personnelles
   - Historique des parties correct
   - Classement global cohérent

6. **PWA:**
   - Installation sur écran d'accueil (iOS et Android)
   - Fonctionnement en mode standalone
   - Service worker actif

**Tests de performance:**

- Lighthouse score > 90
- Temps de chargement initial < 3s
- Responsive sur différentes tailles d'écran (mobile, tablet, desktop)

**Tests de sécurité:**

- Firestore Rules testées
- Validation des inputs côté serveur
- Protection contre injections

---

## Timeline Estimée

| Phase | Durée Estimée | Dépendances |
|-------|---------------|-------------|
| Phase 0: Setup | 1-2 jours | - |
| Phase 1: Firebase Config | 1 jour | Phase 0 |
| Phase 2: Authentification | 3-4 jours | Phase 1 |
| Phase 3: Gestion Lieux | 2-3 jours | Phase 2 |
| Phase 4: Validation Multi-joueurs | 4-5 jours | Phase 2, 3 |
| Phase 5: Déroulement Partie | 5-6 jours | Phase 4 |
| Phase 6: Statistiques | 4-5 jours | Phase 5 |
| Phase 7: PWA Config | 1-2 jours | Phase 0 |
| Phase 8: Optimisations | 3-4 jours | Toutes |

**Total MVP: 4-5 semaines**

---

## Prochaines Étapes Immédiates

1. ✅ Validation du plan d'implémentation
2. ⏳ Choix définitifs (stack, nom, règles de jeu)
3. ⏳ Création du projet Firebase
4. ⏳ Initialisation du repository Git
5. ⏳ Phase 0: Setup du projet Next.js
