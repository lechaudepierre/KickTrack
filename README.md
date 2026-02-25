# KickTrack

A foosball (babyfoot) game tracking platform where players can record matches, compete in tournaments, track statistics, and climb the leaderboard.

Built as a Progressive Web App — installable on mobile and desktop.

## Features

**Game Tracking**
- Create and join 1v1 or 2v2 matches with a simple PIN code
- Real-time scoreboard with detailed goal tracking (normal, gamelle, own goals, flash goals)
- Goal position tracking (attack, defense, goalkeeper, midfield)
- Configurable match settings (6 or 11 points)

**Rankings & Statistics**
- Elo rating system with dynamic K-factor for fair matchmaking
- Per-player stats: wins, losses, win rate, goals scored/conceded
- Daily stats tracking and full game history
- Global leaderboard

**Tournaments**
- Round Robin and Bracket formats (1v1 and 2v2)
- Live bracket visualization and standings
- PIN-based access for easy joining

**Social**
- Friend system with requests and friend lists
- Player profiles with customizable banners
- Notification center for invites and updates

**Venues**
- Create and manage foosball venues (bar, home, club)
- Venue statistics and player activity tracking

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Backend | Firebase (Auth, Firestore, Cloud Storage) |
| State | Zustand |
| PWA | next-pwa |
| Analytics | Vercel Analytics & Speed Insights |

## Getting Started

### Prerequisites

- Node.js 18+
- A Firebase project with Authentication, Firestore, and Storage enabled

### Installation

```bash
git clone https://github.com/your-username/KickTrack.git
cd KickTrack
npm install
```

### Environment Variables

Create a `.env.local` file at the root with your Firebase config:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
  app/          → Pages (dashboard, game, tournament, profile, venues, ...)
  components/   → Reusable UI components (game board, team setup, nav, ...)
  lib/
    firebase/   → Auth, Firestore, game sessions, tournaments, friends
    stores/     → Zustand auth store
    utils/      → Helpers and sound manager
  types/        → TypeScript interfaces (User, Game, Tournament, Venue)
  styles/       → Global CSS
```
