# Projet Application Babyfoot (Cliquet) - Brief Complet d'Implémentation

## 1. Vue d'Ensemble du Projet

### Contexte

Application web pour tracker et gérer les parties de babyfoot en Belgique, utilisable dans les bars et à domicile. Le babyfoot est appelé "cliquet" en Belgique.

### Objectif Principal

Créer une Progressive Web App (PWA) accessible depuis n'importe quel navigateur mobile, permettant de gérer des parties de babyfoot avec un système de profils utilisateurs, validation multi-joueurs, et suivi statistique par lieu.

### Public Cible

- Joueurs de babyfoot occasionnels et réguliers
- Bars et établissements avec tables de babyfoot
- Communauté de joueurs en Belgique

---

## 2. Architecture Technique

### Type d'Application

**Progressive Web App (PWA)**

- Accessible via navigateur web (pas d'app store)
- Installable sur l'écran d'accueil
- Fonctionne sur iOS et Android
- Mises à jour automatiques

### Stack Technologique Recommandée (Gratuit/Low-Cost)

#### Frontend

- **Framework:** React ou Vue.js
- **UI Library:** Tailwind CSS ou Material-UI
- **State Management:** Context API / Zustand / Pinia
- **PWA Features:** Workbox pour le service worker

#### Backend

- **Option 1 (Recommandée):** Firebase
  - Authentication
  - Firestore (base de données temps réel)
  - Hosting
  - Plan gratuit généreux (50k lectures/jour, 20k écritures/jour)
  
- **Option 2:** Supabase
  - Alternative open-source à Firebase
  - PostgreSQL en backend
  - Authentication incluse
  - Plan gratuit disponible

#### Hébergement

- **Vercel** ou **Netlify** (gratuit pour projets personnels)
- Déploiement automatique depuis GitHub

### Architecture de l'Application

```
┌─────────────────────────────────────┐
│     N'importe quel téléphone        │
│  (accède à l'app via navigateur)    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│        Web App (Frontend)           │
│  - Interface utilisateur            │
│  - Gestion des parties              │
│  - Validation multi-joueurs         │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│     Backend (Firebase/Supabase)     │
│  - Base de données                  │
│  - Authentication                   │
│  - Synchronisation temps réel       │
└─────────────────────────────────────┘
```

---

## 3. Fonctionnalités Détaillées

### 3.1 Gestion des Utilisateurs

#### Création de Profil

**Données du profil:**

- Pseudo/nom d'utilisateur (unique)
- Email (optionnel, pour récupération de compte)
- Avatar (optionnel, upload ou sélection parmi des icônes)
- Date de création
- Statistiques personnelles (calculées automatiquement)

**Méthodes d'authentification:**

- Création rapide avec pseudo uniquement (pour faciliter l'onboarding dans les bars)
- Option email/mot de passe pour sécuriser le compte
- Possibilité d'upgrade un compte "rapide" vers un compte sécurisé

#### Connexion

- Connexion simple via pseudo ou email
- Option "Rester connecté" sur l'appareil
- Possibilité de jouer en mode "invité" (stats non sauvegardées)

### 3.2 Gestion des Lieux

#### Fonctionnalités

**Base de données de lieux:**

- Liste des bars/établissements
- Domiciles privés (avec protection de vie privée)
- Chaque lieu a un identifiant unique

**Informations par lieu:**

- Nom de l'établissement
- Adresse (optionnelle)
- Type (Bar, Domicile, Club, Autre)
- Nombre de tables de babyfoot
- Photo du lieu (optionnelle)
- Statistiques du lieu (nombre de parties, joueurs actifs)

**Ajout d'un nouveau lieu:**

- N'importe quel utilisateur peut ajouter un lieu
- Formulaire simple avec vérification pour éviter les doublons
- Système de modération (flag pour lieux inappropriés)

**Sélection du lieu:**

- Au moment de créer une partie
- Liste déroulante avec recherche
- Suggestion du dernier lieu utilisé
- Option "Autre" pour parties occasionnelles

### 3.3 Création et Validation d'une Partie

#### Flow Complet

**Étape 1: Initiation de la partie (par 1 joueur)**

1. Un joueur ouvre l'app sur son téléphone
2. Clique sur "Nouvelle Partie"
3. Sélectionne le format:
   - 1v1 (2 joueurs)
   - 2v2 (4 joueurs en équipes)
4. Sélectionne le lieu où se déroule la partie
5. Sélectionne son propre profil
6. L'app génère un code unique pour cette partie

**Étape 2: Validation multi-joueurs**

```
┌──────────────────────────────────────┐
│   Joueur 1 (lance la partie)        │
│   → Génère code: ABC-123             │
│   → Affiche QR code + code PIN       │
└──────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│   Autres joueurs (2-4 personnes)    │
│   → Scannent QR ou entrent ABC-123   │
│   → Sélectionnent leur profil        │
│   → Confirment leur participation    │
└──────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│   Tous validés → Partie commence     │
└──────────────────────────────────────┘
```

**Code de validation:**

- Code PIN à 6 caractères (ex: ABC-123)
- QR code généré dynamiquement
- Valable 5 minutes
- Expire si la partie n'est pas complétée

**Affichage côté initiateur:**

- Liste des joueurs qui ont rejoint
- Indication visuelle (✓ validé, ⏳ en attente)
- Possibilité d'annuler et recommencer
- Bouton "Commencer" actif uniquement quand tous ont rejoint

**Affichage côté rejoignant:**

- Écran "Rejoindre une partie"
- Scan QR code ou saisie manuelle du code
- Sélection de son profil (ou création rapide)
- Confirmation

#### Format 2v2 - Composition des équipes

- Après validation, sélection des équipes:
  - Équipe 1: Joueur A + Joueur B
  - Équipe 2: Joueur C + Joueur D
- Interface de drag-and-drop ou sélection simple
- Confirmation des équipes avant de commencer

### 3.4 Déroulement de la Partie

#### Interface de Jeu

**Affichage principal:**

```
┌─────────────────────────────────────┐
│           [Lieu: Bar XYZ]           │
├─────────────────────────────────────┤
│  Équipe 1        vs       Équipe 2  │
│  Alice + Bob              Carl + Dan│
│                                      │
│      [  5  ]    -    [  3  ]        │
│                                      │
├─────────────────────────────────────┤
│  Dernier but: Alice (Attaque)       │
│  Durée: 12:34                       │
├─────────────────────────────────────┤
│   [+ But Équipe 1] [+ But Équipe 2] │
└─────────────────────────────────────┘
```

**Ajout d'un but:**

1. Clic sur "+ But Équipe X"
2. Modal/popup pour détails:
   - Quel joueur a marqué (sélection)
   - Position du but:
     - Défense
     - Attaque - Joueur 1
     - Attaque - Joueur 2  
     - Attaque - Joueur 3
3. Validation
4. Score mis à jour en temps réel

**Fonctionnalités pendant la partie:**

- Affichage du temps écoulé
- Historique des buts (timeline)
- Possibilité d'annuler le dernier but (en cas d'erreur)
- Bouton "Terminer la partie"
- Bouton "Abandonner" (avec confirmation)

#### Fin de la Partie

**Conditions de fin:**

- Atteinte du score défini (ex: premier à 10)
- Fin manuelle (bouton "Terminer")

**Écran de fin:**

- Affichage du score final
- Durée totale de la partie
- MVP (joueur avec le plus de buts)
- Récapitulatif détaillé:
  - Buts par joueur
  - Buts par position (défense vs attaque)
  - Statistiques
- Boutons:
  - "Revanche" (nouvelle partie avec mêmes joueurs)
  - "Nouvelle partie"
  - "Voir les statistiques"
  - "Retour à l'accueil"

**Enregistrement:**

- Sauvegarde automatique dans la base de données
- Mise à jour des profils des joueurs
- Mise à jour des statistiques du lieu
- Synchronisation instantanée

### 3.5 Statistiques et Classements

#### Statistiques Personnelles (profil joueur)

**Statistiques globales:**

- Nombre de parties jouées
- Victoires / Défaites / Ratio
- Buts marqués / Buts encaissés
- Moyenne de buts par partie
- Plus longue série de victoires
- Temps de jeu total

**Statistiques détaillées:**

- Buts par position (défense vs attaque)
- Performance en 1v1 vs 2v2
- Performance par lieu
- Adversaires les plus fréquents
- Partenaires favoris (en 2v2)
- Graphiques d'évolution dans le temps

**Classement ELO (optionnel pour phase 2):**

- Score ELO calculé automatiquement
- Classement général
- Classement par lieu

#### Statistiques par Lieu

**Tableau de bord du lieu:**

- Nombre total de parties jouées
- Joueurs les plus actifs
- Classement local (top 10)
- Parties en cours
- Statistiques par jour/semaine/mois
- Graphiques de fréquentation

**Page dédiée à chaque lieu:**

- Informations du lieu
- Leaderboard local
- Historique des parties récentes
- Statistiques comparatives avec d'autres lieux

#### Classements Globaux

**Types de classements:**

1. Classement général (tous joueurs)
2. Classement par région/ville
3. Classement par lieu
4. Classement mensuel
5. Classement entre amis (groupe personnalisé)

**Filtres:**

- Par période (jour/semaine/mois/année/tout)
- Par format (1v1 / 2v2 / tous)
- Par lieu

---

## 4. Structure de la Base de Données

### Collections/Tables Principales

#### Users (Utilisateurs)

```javascript
{
  userId: "unique_id",
  username: "alice_92",
  email: "alice@email.com", // optionnel
  avatarUrl: "url_or_icon_id",
  createdAt: timestamp,
  stats: {
    totalGames: 145,
    wins: 89,
    losses: 56,
    goalsScored: 523,
    goalsConceded: 412,
    winRate: 0.614,
    // ... autres stats
  },
  preferences: {
    favoriteVenue: "venue_id",
    notifications: true
  }
}
```

#### Venues (Lieux)

```javascript
{
  venueId: "unique_id",
  name: "Bar Le Cliquet",
  type: "bar", // bar, home, club, other
  address: "Rue Example 123, Brussels",
  location: { // optionnel
    lat: 50.8503,
    lng: 4.3517
  },
  photoUrl: "url",
  tablesCount: 2,
  createdBy: "user_id",
  createdAt: timestamp,
  stats: {
    totalGames: 1234,
    activeUsers: 67
  }
}
```

#### Games (Parties)

```javascript
{
  gameId: "unique_id",
  venueId: "venue_id",
  format: "2v2", // "1v1" ou "2v2"
  status: "completed", // pending, in_progress, completed, abandoned
  
  // Joueurs et équipes
  team1: {
    playerIds: ["user_id_1", "user_id_2"],
    score: 10,
    players: [
      { userId: "user_id_1", username: "alice" },
      { userId: "user_id_2", username: "bob" }
    ]
  },
  team2: {
    playerIds: ["user_id_3", "user_id_4"],
    score: 7,
    players: [
      { userId: "user_id_3", username: "carl" },
      { userId: "user_id_4", username: "dan" }
    ]
  },
  
  // Détails de la partie
  winner: "team1",
  goals: [
    {
      goalId: "goal_1",
      timestamp: timestamp,
      teamId: "team1",
      scorerId: "user_id_1",
      position: "attack_2", // defense, attack_1, attack_2, attack_3
      score: { team1: 1, team2: 0 }
    },
    // ... autres buts
  ],
  
  // Métadonnées
  createdAt: timestamp,
  startedAt: timestamp,
  completedAt: timestamp,
  duration: 754, // secondes
  createdBy: "user_id_1", // qui a lancé la partie
  validatedBy: ["user_id_1", "user_id_2", "user_id_3", "user_id_4"]
}
```

#### Game Sessions (Sessions de validation)

```javascript
{
  sessionId: "unique_id",
  code: "ABC123", // code PIN
  qrCode: "data_url", // QR code généré
  initiatorId: "user_id",
  venueId: "venue_id",
  format: "2v2",
  status: "waiting", // waiting, ready, expired, started
  playersJoined: [
    { userId: "user_id_1", joinedAt: timestamp },
    { userId: "user_id_2", joinedAt: timestamp }
  ],
  requiredPlayers: 4,
  createdAt: timestamp,
  expiresAt: timestamp
}
```

---

## 5. User Flow et Wireframes

### 5.1 Flow Principal

```
[Accueil]
   │
   ├─→ [Se connecter] → [Dashboard]
   │                        │
   │                        ├─→ [Profil] → [Statistiques]
   │                        │
   │                        ├─→ [Classements]
   │                        │
   │                        └─→ [Nouvelle Partie]
   │                               │
   │                               ├─→ Sélection format (1v1/2v2)
   │                               ├─→ Sélection lieu
   │                               ├─→ Génération code
   │                               └─→ [Attente validation]
   │                                      │
   └─→ [Rejoindre Partie] ────────────────┘
          (scan QR / code PIN)            │
                                          │
                                          ▼
                                   [Tous validés]
                                          │
                                          ▼
                                  [Partie en cours]
                                          │
                                          ├─→ Ajout buts
                                          ├─→ Suivi score
                                          └─→ Fin partie
                                                 │
                                                 ▼
                                          [Résultats]
                                                 │
                                                 ├─→ Revanche
                                                 ├─→ Nouvelle partie
                                                 └─→ Retour accueil
```

### 5.2 Écrans Principaux à Implémenter

#### Écran 1: Accueil/Landing

- Logo de l'application
- Slogan/Description courte
- Bouton "Connexion"
- Bouton "Créer un compte"
- Lien "Jouer en invité"

#### Écran 2: Connexion/Inscription

- Formulaire simple (username + password optionnel)
- Option "Compte rapide" (juste username)
- Option "Compte sécurisé" (username + email + password)

#### Écran 3: Dashboard

- Carte de profil (avatar, nom, stats principales)
- Actions rapides:
  - Nouvelle Partie (gros bouton CTA)
  - Rejoindre une Partie
  - Mes Statistiques
  - Classements
  - Lieux
- Fil d'actualité (parties récentes, achievements)

#### Écran 4: Nouvelle Partie - Étape 1

- Sélection format (1v1 / 2v2) avec icônes visuelles
- Sélection lieu (dropdown avec recherche)
- Bouton "Ajouter un nouveau lieu"
- Bouton "Suivant"

#### Écran 5: Nouvelle Partie - Validation

- QR code large au centre
- Code PIN en gros caractères
- Timer (compte à rebours 5 min)
- Liste des joueurs:
  - Initiateur (✓ validé)
  - Joueur 2 (⏳ en attente)
  - Joueur 3 (⏳ en attente)
  - Joueur 4 (⏳ en attente)
- Bouton "Annuler"
- Bouton "Commencer" (actif quand tous validés)

#### Écran 6: Rejoindre une Partie

- Bouton "Scanner QR Code" (caméra)
- OU
- Input "Entrer le code" (ABC-123)
- Liste des parties en attente à proximité (optionnel phase 2)

#### Écran 7: Partie en Cours

- Header: Lieu + temps écoulé
- Score principal (gros chiffres)
- Noms des joueurs/équipes
- Indicateur du dernier but
- Bouton "+ But Équipe 1" (grande zone cliquable)
- Bouton "+ But Équipe 2" (grande zone cliquable)
- Timeline des buts (scrollable)
- Menu (⋮):
  - Annuler dernier but
  - Terminer la partie
  - Abandonner

#### Écran 8: Ajouter un But (Modal)

- "Qui a marqué ?"
  - Liste des joueurs de l'équipe
- "Position du but ?"
  - Défense
  - Attaque - Joueur 1
  - Attaque - Joueur 2
  - Attaque - Joueur 3
- Bouton "Valider"
- Bouton "Annuler"

#### Écran 9: Fin de Partie

- Score final (très visible)
- Équipe gagnante (célébration visuelle)
- MVP du match
- Statistiques:
  - Durée
  - Buts par joueur
  - Buts par position
- Boutons d'action:
  - "Revanche"
  - "Nouvelle Partie"
  - "Voir Statistiques Complètes"
  - "Retour Accueil"

#### Écran 10: Profil/Statistiques

- Avatar et nom
- Stats principales (cartes):
  - Parties jouées
  - Victoires
  - Ratio victoires/défaites
  - Buts marqués
- Onglets:
  - Vue d'ensemble
  - Historique des parties
  - Statistiques détaillées
  - Graphiques
- Graphiques:
  - Évolution du ratio de victoires
  - Buts par période
  - Performance par lieu

#### Écran 11: Classements

- Onglets:
  - Global
  - Par Lieu
  - Mensuel
  - Entre Amis
- Filtres (format, période)
- Liste classée:
  - Position
  - Avatar
  - Nom
  - Stats (victoires, ratio)
- Indicateur de sa propre position

#### Écran 12: Lieux

- Liste des lieux:
  - Nom
  - Type (icône)
  - Nombre de parties
  - Bouton "Voir"
- Recherche/filtre
- Bouton "Ajouter un lieu"

#### Écran 13: Détail d'un Lieu

- Photo du lieu
- Nom et adresse
- Statistiques du lieu
- Classement local (top 10)
- Parties récentes
- Bouton "Jouer ici"

---

## 6. Fonctionnalités Futures (Phase 2)

### 6.1 Techniques de Buts Avancées

- Tracking détaillé des techniques:
  - Tir droit
  - Tir en piqué
  - Tir snake
  - Tir pull/push
  - Tir en cloche
  - Contre
- Statistiques par technique
- Badges/achievements pour techniques spéciales

### 6.2 Système de Tournois

- Création de tournois
- Formats: simple élimination, double élimination, round-robin
- Brackets interactifs
- Gestion des inscriptions
- Classements de tournoi

### 6.3 Social et Communauté

- Système d'amis
- Groupes/teams
- Chat intégré
- Défis entre joueurs
- Partage de résultats sur réseaux sociaux

### 6.4 Gamification Avancée

- Système de niveaux et XP
- Badges et achievements
- Défis quotidiens/hebdomadaires
- Récompenses et unlockables
- Skins/thèmes personnalisables

### 6.5 Analyse Avancée

- Heatmaps des zones de but
- Analyse des patterns de jeu
- Suggestions d'amélioration
- Comparaison avec d'autres joueurs
- Prédictions de résultats

### 6.6 Intégrations

- Partenariats avec bars
- Système de réservation de tables
- Programme de fidélité
- Notifications push
- Calendrier d'événements

---

## 7. Plan d'Implémentation par Phases

### Phase 0: Setup et Infrastructure (Semaine 1)

- [ ] Configuration du projet (React/Vue)
- [ ] Setup Firebase/Supabase
- [ ] Configuration du routing
- [ ] Setup Tailwind CSS
- [ ] Configuration PWA (manifest, service worker)
- [ ] Setup Git et déploiement Vercel/Netlify

### Phase 1: MVP - Fonctionnalités Essentielles (Semaines 2-4)

**Sprint 1: Authentification et Profils**

- [ ] Page d'accueil
- [ ] Système de connexion/inscription
- [ ] Création de profil (simple)
- [ ] Dashboard de base

**Sprint 2: Gestion des Lieux**

- [ ] Base de données des lieux
- [ ] Ajout d'un lieu
- [ ] Sélection de lieu
- [ ] Page liste des lieux

**Sprint 3: Création et Validation de Partie**

- [ ] Interface "Nouvelle Partie"
- [ ] Sélection format (1v1/2v2)
- [ ] Génération code PIN
- [ ] Génération QR code
- [ ] Interface "Rejoindre Partie"
- [ ] Scan QR code
- [ ] Validation multi-joueurs
- [ ] Composition des équipes (2v2)

**Sprint 4: Déroulement de la Partie**

- [ ] Interface partie en cours
- [ ] Ajout de buts (simple)
- [ ] Score en temps réel
- [ ] Tracking position des buts (défense/attaque)
- [ ] Fin de partie
- [ ] Écran résultats

**Sprint 5: Statistiques de Base**

- [ ] Calcul stats personnelles
- [ ] Page profil avec stats
- [ ] Historique des parties
- [ ] Stats par lieu
- [ ] Classement global simple

### Phase 2: Améliorations et Optimisations (Semaines 5-6)

- [ ] Design responsive perfectionné
- [ ] Animations et transitions
- [ ] Gestion des erreurs améliorée
- [ ] Optimisation performances
- [ ] Tests utilisateurs
- [ ] Corrections de bugs

### Phase 3: Fonctionnalités Avancées (Semaines 7-8)

- [ ] Système ELO
- [ ] Graphiques statistiques
- [ ] Filtres avancés
- [ ] Recherche de joueurs
- [ ] Notifications
- [ ] Mode offline

### Phase 4+: Futures Fonctionnalités

- Voir section "Fonctionnalités Futures (Phase 2)"
- Priorisation selon feedback utilisateurs

---

## 8. Considérations Techniques Importantes

### 8.1 Performance

- Optimisation des requêtes database (indexes)
- Lazy loading des images
- Pagination des historiques
- Cache local pour données fréquentes
- Service worker pour mode offline partiel

### 8.2 Sécurité

- Validation côté serveur (Firebase rules / Supabase RLS)
- Rate limiting sur actions critiques
- Validation des codes de partie (expiration)
- Protection contre les bots
- Sanitization des inputs utilisateur

### 8.3 Scalabilité

- Architecture modulaire
- Code réutilisable (composants)
- Séparation des concerns
- Database bien structurée
- Monitoring des performances

### 8.4 UX/UI

- Design mobile-first
- Interface intuitive (minimum de clics)
- Feedback visuel immédiat
- Messages d'erreur clairs
- Loading states
- Animations fluides mais non invasives

### 8.5 Accessibilité

- Contraste suffisant
- Taille de texte lisible
- Zones de touch suffisantes (44x44px minimum)
- Support clavier (pour desktop)
- Labels ARIA pour screen readers

---

## 9. Métriques de Succès

### Métriques Produit

- Nombre d'utilisateurs actifs
- Nombre de parties jouées par jour/semaine
- Taux de rétention (D1, D7, D30)
- Temps moyen par session
- Nombre de lieux ajoutés
- Taux de conversion invité → compte enregistré

### Métriques Techniques

- Temps de chargement initial (<3s)
- Performance (Lighthouse score >90)
- Taux d'erreur (<1%)
- Uptime (>99.5%)

### Métriques UX

- Taux de complétion des parties
- Temps moyen pour créer/rejoindre une partie
- Taux d'utilisation du QR code vs code PIN
- Feedback utilisateurs (NPS)

---

## 10. Ressources et Outils Nécessaires

### Développement

- IDE: VS Code
- Version control: Git + GitHub
- Package manager: npm ou yarn
- Design: Figma (optionnel pour mockups)

### Services Externes

- Firebase ou Supabase (gratuit pour démarrer)
- Vercel ou Netlify (gratuit)
- QR Code Generator Library: `qrcode.react` ou `qr-code-styling`

### Documentation

- React/Vue.js docs
- Firebase/Supabase docs
- Tailwind CSS docs
- PWA docs (Google)

---

## 11. Questions Ouvertes et Décisions à Prendre

### Design

- [ ] Charte graphique / couleurs principales
- [ ] Logo de l'application
- [ ] Nom final de l'app (Cliquet Tracker? FoosStats? autre?)
- [ ] Icônes pour les avatars par défaut

### Gameplay

- [ ] Score pour gagner une partie (10? 12? configurable?)
- [ ] Système de points (ELO, ranking simple, autre?)
- [ ] Gestion des parties abandonnées (impact sur stats?)

### Technique

- [ ] Firebase vs Supabase (recommandation: Firebase pour simplicité)
- [ ] React vs Vue.js (recommandation: React pour écosystème)
- [ ] Hébergement images (Firebase Storage vs Cloudinary)

### Business (Long terme)

- [ ] Monétisation éventuelle?
- [ ] Partenariats avec des bars?
- [ ] Extension internationale?

---

## 12. Prochaines Étapes Immédiates

1. **Validation du brief** avec toute l'équipe
2. **Choix de la stack technique** définitive
3. **Création des mockups** de base (Figma optionnel)
4. **Setup du projet** et infrastructure
5. **Démarrage du Sprint 1** (Authentification et Profils)

---

## 13. Ressources pour Claude Opus

### Prompts Suggérés pour Démarrer

**Pour le setup initial:**

```
"Aide-moi à créer la structure de base d'une PWA React avec Firebase. 
J'ai besoin de:
- Configuration Firebase (Auth + Firestore)
- Structure de dossiers optimale
- Routing avec React Router
- Setup Tailwind CSS
- Configuration PWA avec manifest et service worker"
```

**Pour l'authentification:**

```
"Crée un système d'authentification Firebase avec:
- Inscription rapide (username uniquement)
- Inscription complète (username + email + password)
- Connexion
- Gestion de session
- Profil utilisateur de base"
```

**Pour la validation multi-joueurs:**

```
"Implémente le système de validation multi-joueurs avec:
- Génération de code PIN unique (6 caractères)
- Génération de QR code
- Interface d'attente montrant qui a rejoint
- Scan QR code ou saisie manuelle
- Expiration du code après 5 minutes
- Validation quand tous les joueurs ont rejoint"
```

### Documentation de Référence

- Firebase Auth: <https://firebase.google.com/docs/auth>
- Firestore: <https://firebase.google.com/docs/firestore>
- React Router: <https://reactro>
