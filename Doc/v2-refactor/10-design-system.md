# 10 — Design system unifié (Phase 1.1)

## Décisions validées ✅

1. **Direction visuelle : « rétro arcade »**, ancrée sur l'identité existante (pas une refonte
   à 100%). Constantes de l'ADN : contour noir épais sur les éléments, coins bien arrondis,
   ombre portée franche « physique » sous les éléments cliquables, couleurs primaires saturées,
   **le jaune réservé à « premier / important »**. Le `submitButton` existant (translateY au
   survol + ombre) a déjà cet ADN : on systématise, on n'invente pas.
2. **Approche de styling unique : CSS Modules + tokens (variables CSS).**
   Le Tailwind résiduel est supprimé (le `Button` emerald/slate de `components/common/ui/`
   est remplacé, pas conservé).
3. **Le vert principal doit être plus foncé** que dans l'app actuelle.
4. **Le fond terrain rayé est conservé** (identité), mais fiabilisé — voir §Fond terrain.
5. **Les badges de classement existants sont conservés** — on les range dans le système
   (tokens + composant), on ne les redessine pas.
6. **Architecture en pyramide à 3 étages**, règle absolue :

```
Étage 3  PAGES        n'écrivent JAMAIS une couleur/taille en dur ; assemblent des composants
Étage 2  COMPOSANTS   Button, Card, … ; lisent UNIQUEMENT les tokens
Étage 1  TOKENS       variables.css = seule source de vérité (couleurs, espacements, arrondis…)
```

**Test de réussite du chantier** : changer le thème entier de l'app en éditant uniquement
l'étage 1. Si un changement de thème exige de toucher un fichier de page → échec.

## Travail à réaliser

### Étape A — Réécrire les tokens (`styles/variables.css`)

- Fusionner les ≥5 verts actuels (`#4CAF50`, `#2ECC71`, `#2E7D32`, `#1B5E20`, `#1B8A2A`)
  en **une échelle unique** de verts, globalement plus foncée que l'actuelle.
- Palette arcade : ajouter rouge / bleu / jaune saturés (le jaune = accent « important »),
  + neutres (le crème clair des surfaces).
- Tokens d'identité arcade dédiés, p. ex. :
  - `--border-arcade` (contour noir épais, ~3px solid quasi-noir)
  - `--shadow-arcade` (ombre franche décalée verticale, pas de blur)
  - échelle d'arrondis unifiée (`--radius-*`) — supprimer la coexistence `9999px`/`999px`
- Tokens du fond terrain : `--field-green-dark`, `--field-green-light`, largeur de rayure.
- Supprimer tout doublon/alias mort de l'actuel `variables.css`.

### Étape B — Librairie de composants (étage 2)

Recenser les motifs répétés (mesuré : 28 boutons, 59 cards faits main) et les remplacer par
~10 composants. Liste de départ validée comme esquisse :
`Button`, `Card`, `Input`, `Badge`, `RankBadge` (reprend les badges existants),
`LeaderboardRow`, `Modal` — ⚠️ +2-3 composants à identifier pendant le recensement.

Règles : chaque composant lit uniquement des tokens ; variantes par props (primaire /
secondaire / danger…) ; le `Button` remplace les 28 versions ET le Button Tailwind.

### Étape C — Migration des pages (étage 3)

- Page par page, remplacer le CSS fait-main par les composants et les valeurs en dur par
  les tokens. Mécanique, progressif, sans gel des features.
- ⚠️ Page pilote pour valider l'approche avant de dérouler : non tranchée
  (candidats évoqués : classement, profil, accueil). Demander avant de commencer.
- Cible mesurable : 0 couleur hex dans les `.module.css` hors `variables.css`
  (actuellement 471).

### Fond terrain rayé — règles de robustesse (validées ✅)

Cause des bugs actuels : 3 copies identiques + `!important` dans `globals.css`
(≈ lignes 300/312/338), `background-attachment: fixed`, `height: 100vh`, rayures de 200px fixes.

1. **Une seule définition**, construite à partir des tokens `--field-*`. Suppression de toutes
   les copies et des `!important`.
2. **Abandonner `background-attachment: fixed` + `100vh`.** Fond appliqué au conteneur de page
   qui s'étire avec le contenu, `min-height: 100dvh` (gère la barre d'URL mobile).
3. **Largeur de rayure cohérente** entre tailles d'écran (taille relative ou calibrée),
   pour un « grain » de terrain identique partout.

## Interdits

- Réintroduire Tailwind ou toute classe utilitaire.
- Écrire une couleur, un arrondi ou une ombre en dur dans un composant ou une page.
- Modifier l'apparence des badges de classement existants au-delà de leur tokenisation.
- Supprimer le fond terrain ou le remplacer par un fond uni.
