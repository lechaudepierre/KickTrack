# 01 — Diagnostic de l'existant

État des lieux factuel, issu d'une analyse complète du code source (zip `src.zip`).
Tous les chiffres ci-dessous ont été mesurés, pas estimés.

## 1. Structure générale — globalement saine

- Découpage par feature correct : `components/{game,tournament,friends,venues,profile,common}`,
  `lib/firebase/`, `lib/utils/`, `types/`, `app/` (App Router).
- Le code n'est **pas** spaghetti. Le refactoring visé est réaliste et incrémental.

**Points positifs à préserver tels quels :**
- `updatePlayerStatsAfterGame` utilise `runTransaction` par joueur → écriture atomique.
- `endGame` a une garde d'idempotence (`status !== 'in_progress'` → erreur) contre le double-tap.
- Les leaderboards lisent l'ELO depuis le profil user (pas de ré-agrégation depuis les parties).
- `bannerUtils.ts` : map `id → config` — bon prototype du futur catalogue (cf. `20-socle-collection.md`).

## 2. Styles — deux design systems concurrents (chantier 1.1)

Mesures sur les `.module.css` :

| Mesure | Valeur |
|---|---|
| Couleurs hex écrites en dur | **471 occurrences** |
| `#333333` seul | 280 occurrences |
| Verts différents quasi-identiques | ≥5 : `#4CAF50`, `#2ECC71`, `#2E7D32`, `#1B5E20`, `#1B8A2A` |
| Définitions de boutons à la main | 28 |
| Définitions de "card" | 59 |
| Pilule arrondie | écrite `9999px`, `999px` ET via variable selon les fichiers |

- `styles/variables.css` existe et est correct, mais massivement contourné par les pages.
- `components/common/ui/Button.tsx` est en **Tailwind** avec une palette emerald/slate/teal
  étrangère au reste de l'app — utilisé dans seulement ~2 pages. C'est le 2e design system.

## 3. Fond terrain rayé — fragile (chantier 1.1)

- Le motif `repeating-linear-gradient(-45deg, #1B5E20 …200px, #2E7D32 …400px)` est défini
  **3 fois à l'identique dans `app/globals.css`** (≈ lignes 300, 312, 338) avec `!important`,
  et réapparaît dans d'autres fichiers.
- Utilise `background-attachment: fixed` + `height: 100vh` → bugs mobiles connus
  (fond qui saute/se coupe quand la barre d'URL apparaît/disparaît).
- Largeur de rayure absolue (200px) → grain incohérent selon la taille d'écran.

## 4. ELO / stats — bugs confirmés (chantier 1.2)

Localisation : `lib/firebase/games.ts`.

- 🐛 **Double bonus MVP** : le +3 du MVP est ajouté (a) dans l'objet d'affichage `allEloChanges`
  (`newElo + (isMVP ? 3 : 0)`) **et** (b) dans la transaction d'écriture (`newElo += 3`).
  L'affichage et le stockage peuvent diverger, ou le bonus être doublé.
- 🐛 **Deux définitions de MVP** : `computeMVP()` (sophistiqué : rôle attaque/défense,
  clean sheet 95, ratio de buts) utilisé pour les stats, ET `calculateGameResults()` qui
  recalcule un MVP « max de buts » utilisé ailleurs. Incohérences d'affichage garanties.
- 🐛 **`goalsConceded` doublé au niveau équipe** en 2v2 : chaque joueur d'une équipe se voit
  ajouter les mêmes buts encaissés → toute somme globale est faussée. (Acceptable comme stat
  perso, mais doit être documenté/assumé.)
- ⚠️ **`eloHistory` non borné** : un push par partie dans le document user → le doc grossit
  indéfiniment (coût Firestore, limite de taille de doc à terme).
- Commentaire trompeur `// Only apply Elo update if calculated (meaning it was 2v2)` :
  le 1v1 **fonctionne** (branche dédiée juste au-dessus). Commentaire à corriger, pas le code.
- Pollution historique possible des profils par d'anciennes parties avec invités (mineur).

Paramètres actuels du calcul (référence) : base 1000, K=64 si <10 parties sinon 32,
formule 2v2 = moyenne 50/50 entre proba d'équipe et proba perso vs moyenne adverse.

## 5. Règles de jeu — codées en dur (chantier 3.3, modes)

- `GoalType` figé dans `types/game.ts` : `'normal' | 'gamelle' | 'gamelle_rentrante' | 'ownGoal' | 'flash'`.
- Effets des buts (multiplicateur du but du milieu, −1 adverse de la gamelle…) = cascade de
  `if/else` dans `addGoal()`. Ajouter une règle = modifier le code + redéployer.
- Note : `removeLastGoal()` (undo) ne restaure pas parfaitement l'état du multiplicateur
  (admis dans un commentaire du code).

## 6. Données utilisateur — profil qui s'alourdit (chantier 2)

- `types/user.ts` : `bannerId`, amis, demandes d'amis, stats, `eloHistory`, `history` quotidien,
  préférences… tout sur le même document. Le cosmétique futur ne doit PAS s'y ajouter
  (cf. `20-socle-collection.md` : inventaire en sous-collection).
- Attribution de bannières en dur dans `bannerUtils.ts` (`CREATOR_USERNAMES`, `SPECIAL_BANNERS`
  par pseudo) — à migrer vers le catalogue.

## 7. Rangement du code (chantier 1.3)

- Fichiers trop gros à découper : `app/tournament/.../page.tsx` ≈ **1095 lignes**,
  `lib/firebase/tournaments.ts` ≈ **922 lignes**.
- Poser une convention d'accès Firestore (où vivent les lectures/écritures, nommage,
  gestion d'erreurs) avant la multiplication des accès par les nouvelles features.
- `getUserGames` et les leaderboards par venue rechargent toutes les parties et filtrent/trient
  côté client — acceptable à 100 users, à surveiller (noté, pas urgent).
