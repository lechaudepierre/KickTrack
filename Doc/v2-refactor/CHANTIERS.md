# CHANTIERS — tableau de bord vivant

> **C'est LE fichier de suivi.** Les autres docs du dossier (`00` -> `99`) décrivent le *quoi* et
> le *pourquoi* — ils sont figés. Ce fichier-ci décrit le *où on en est*, et il bouge en permanence.
>
> **Comment l'utiliser :**
> - Une idée qui passe -> section [Boîte à idées](#boîte-à-idées) tout en bas, même mal formulée.
> - Un chantier démarre -> statut `[en cours]`. Il finit -> statut `[fait]` + date + une ligne dans [Fait](#fait).
> - Une question qui bloque -> section [Décisions en attente](#décisions-en-attente).
> - Un truc à faire hors-code (design, assets, Firebase) -> section [À toi de jouer](#à-toi-de-jouer).
>
> **Légende statut :** `[a faire]` · `[en cours]` · `[fait]` · `[bloque]` (voir décisions)

**Dernière mise à jour :** 20 août 2026 — *blocs 0 et 1 quasi bouclés, socle collection en place*
**Objectif court terme :** clôturer la **saison 0** et lancer la **saison 1** en septembre 2026,
avec des récompenses distribuées selon le grade atteint.

---

## RAPPEL — action bloquante chez vous

**`FIREBASE_SERVICE_ACCOUNT` doit être ajoutée aux variables d'environnement Vercel.**
Sacha n'a pas les accès Vercel ; c'est son collègue qui les a.

- Vercel -> le projet -> Settings -> Environment Variables
- Nom : `FIREBASE_SERVICE_ACCOUNT`
- Valeur : le contenu JSON **complet** de `serviceAccountKey.json`, sur une seule ligne
- Puis redéployer

Tant que ce n'est pas fait, le chantier 0.2 reste bloqué — et **c'est le seul trou de sécurité
encore ouvert sur les 147 comptes réels** : aujourd'hui, n'importe quel joueur peut écrire l'ELO
de n'importe qui depuis la console de son navigateur.

---

## Où on en est

**Livré à ce jour : 49 chantiers.** Les blocs 0, 1 et 2 sont fonctionnellement terminés.

| Bloc | Sujet | Avancement | Reste |
|---|---|---|---|
| **0** | Infra & sécurité serveur | 6 / 7 | 0.2 (attend le déploiement Vercel), 0.5 |
| **1** | Fiabilisation ELO & stats | 4 / 6 | 1.4 [bloque], 1.6 [bloque] |
| **2** | Socle collection & personnalisation | 10 / 11 | 2.8 — attend tes assets |
| **3** | Saisons | 0 / 8 | tout |
| **4** | Monnaie & packs | 0 / 5 | tout |
| **5** | Design system | **5 / 5** | terminé |
| **6** | Avatar 2D | 0 / 4 | tout |
| **7** | Modes de jeu | 4 / 4 | [fait] terminé |
| **8** | Events par lieu | 0 | dernier de la liste |
| **9** | Dette technique | 1 / 9 | 8 chantiers indépendants |

---

## La route vers le drop V2

**Le drop est la DERNIÈRE action de tout ce projet**, pas une étape intermédiaire.
Tant qu'on n'y est pas, les 144 autres joueurs restent en V1 et ne voient rien changer.

```
node scripts/set-feature.mjs v2 everyone --apply     ← à ne lancer qu'à la toute fin
```

### Deux vitesses, et il ne faut pas les confondre

| | Ce que c'est | Quand ça sort |
|---|---|---|
| **Corrections** | race ELO, MVP unifié, faille de sécurité, bugs | **immédiatement, pour tout le monde.** Laisser un bug en place « jusqu'au drop » n'aurait aucun sens |
| **Nouveautés** | collection, personnalisation, saisons, modes de jeu | **ensemble, au drop.** Derrière le drapeau `v2` |

### Ce qui doit être fini avant de basculer

| | Chantier | Bloc | État |
|---|---|---|---|
| 1 | **Refermer la faille ELO** — déployer la route serveur puis basculer `clientMayWriteStats` | 0.2 | [a faire] |
| 2 | **Connexion Google + écran de pseudo** — répare aussi les 2 comptes fantômes | 0.7 | [fait] |
| 3 | **Design system** — bloc 5 complet | 5.1 -> 5.5 | [fait] |
| 4 | **Modes de jeu / bibitif** | 7.1 -> 7.4 | [fait] |
| 5 | **Relecture des règles bibitives par l'équipe** — voir ci-dessous | — | [a faire] |
| 6 | **Le catalogue rempli** — bannières, éventuellement titres | 2.8 | [a faire] Sacha |
| 7 | **Recette complète en `admins`** — vous trois jouez en V2 plusieurs soirées réelles | — | [a faire] |
| 8 | **`v2 everyone`** | — | [a faire] **le drop** |

**Les saisons (bloc 3) ne sont PAS dans cette liste.** Décision de Sacha le 20/08 : on les retarde
au maximum, on s'en occupera une fois la V2 stable et livrée.

Facultatifs au drop, ajoutables après sans rien casser : avatar 2D (bloc 6), monnaie et packs
(bloc 4), events (bloc 8), dette technique (bloc 9).

### ATTENTION — relecture obligatoire avant le drop

Les règles du mode bibitif sont une **première proposition**, écrite à partir des exemples du
doc 33. Le contenu des gages, leur formulation et la liste elle-même **doivent être relus et
validés par les 3 créateurs** avant d'ouvrir la V2.

Points explicitement laissés ouverts, marqués dans le fichier :
- **But depuis le gardien** : j'ai fait boire l'équipe qui ENCAISSE, par cohérence avec toutes les
  autres règles. Si vous préférez sanctionner le buteur, c'est `target: 'scorer'`.
- **But contre son camp** : aucun gage. À décider.
- **But avec une bande** : figure dans la fiche mais **n'est pas détectable** — il n'existe aucun
  type de but correspondant dans le moteur. Se joue à l'honneur.

Tout se modifie dans un seul fichier : [`src/lib/gamemodes/modes.ts`](../../src/lib/gamemodes/modes.ts).
- `rules` = ce que l'app détecte et affiche pendant la partie
- `explained` = ce que le joueur lit dans la fiche du mode

### Le prochain pas concret

| | Quoi | Qui |
|---|---|---|
| -> | Relire les règles bibitives dans `modes.ts` et dire ce qui reste ou saute | **Sacha** |
| -> | Designer une bannière, n'importe laquelle, et la déposer dans `public/banners/` | **Sacha** |
| -> | Connexion Google + écran de pseudo (0.7) | moi |

Une fois qu'une bannière vit de bout en bout, **le même chemin marche pour tout item** :
titres, animations, pièces d'avatar. C'est ce cycle qu'on valide une fois.

---

## Plan de la suite — direction artistique et refontes

Établi le 20 août 2026, à la demande de Sacha : « pensez un peu out of the box, si jamais il faut
vraiment penser à redesigner quelque chose ».

### Constat qui motive ce plan

Le design system est en place (0 couleur en dur, composants, tokens). **Mais un système propre ne
rend pas une app attirante.** Trois manques de fond, qu'aucune migration de CSS ne corrige :

1. **Rien ne célèbre.** Gagner, monter de grade, battre son record : ces moments passent inaperçus.
   C'est le plus gros écart avec un vrai jeu.
2. **Le profil est un déversoir de données, pas un profil.** 2363 lignes, **11 sections empilées**
   avec un traitement strictement identique. On fait défiler sans fin et rien ne ressort.
3. **Aucune notion de progression.** Un joueur ne sait jamais ce qui le sépare du grade suivant.
   Les paliers existent dans `rankUtils.ts` ; ils ne sont affichés nulle part.

### ATTENTION — je ne vois pas ce que je produis

Je vérifie la structure, les tokens, les types et les tests. **Je ne vois pas le rendu.**
Chaque étape ci-dessous se termine donc par une vérification visuelle de Sacha, explicitement
listée. Tant qu'elle n'est pas faite, l'étape n'est pas finie.

Alternative proposée, à trancher : installer un navigateur sans interface (Playwright) pour que je
prenne des captures des pages clés et vérifie moi-même. Coût : ~300 Mo de dépendances de dev.
Bénéfice : je cesse de livrer des mises en page à l'aveugle — trois allers-retours sur la pilule de
mode auraient été évités.

---

### Étape 1 — Les moments de célébration [fait] — *21 août 2026*

Le meilleur rapport effet/effort du projet. **Toute la plomberie existe déjà** : `lottie-react` est
installé et utilisé, `soundManager` est un simple map clé -> fichier. Il ne manque que les
déclencheurs.

| Moment | Avant | Maintenant |
|---|---|---|
| Victoire / défaite | animation Lottie | conservée telle quelle |
| Montée de grade | une pastille « PROMOTION » discrète | annonce en jaune + animation qui **remplace** celle de victoire |
| Record d'ELO battu | rien | annonce majeure |
| Série de victoires | rien | annoncée à partir de 3 (seuil `STREAK_THRESHOLD`, PROVISOIRE) |
| MVP | rien sur cet écran | mention discrète |

[fait] **[`lib/game/celebrations.ts`](../../src/lib/game/celebrations.ts)** — module pur, 13 tests.
Trois niveaux d'emphase (majeur / notable / discret) qui dictent l'ordre : sur un écran,
**l'ordre est la hiérarchie**.

[fait] **Une seule animation plein écran, jamais deux.** Une partie qui cumule montée de grade
et record en déclencherait deux superposées — `pickAnimation()` n'en retient qu'une. Un test
le vérifie explicitement. Même règle pour le son.

[fait] **Déduplication trouvée en chemin** : la page de résultats avait sa **propre table
d'ordre des rangs** pour détecter une promotion — exactement le calcul du nouveau module, écrit
deux fois. Supprimée.

[fait] **Le serveur signale ce qu'il est seul à savoir.** Le record (`isRecord`) et la série
(`winStreak`) sont écrits sur la partie au moment de la clôture : le pic d'avant est écrasé dès
que les stats sont écrites, et recharger tout l'historique d'un joueur pour un compteur de série
serait absurde. Marqués sur la partie, ils restent consultables des mois plus tard.

[fait] **Une rétrogradation est annoncée sans être fêtée** : ni jaune, ni animation, ni son.
La découvrir plus tard par hasard serait pire que de la dire.

[a faire] **Vérification visuelle de Sacha** : jouer une partie qui fait franchir un palier, et une
qui bat un record. Tant qu'elle n'est pas faite, l'étape n'est pas close.

---

### Étape 2 — Refonte du profil [fait] — *21 août 2026*

**C'est une refonte, pas une migration.** Le problème n'est pas le CSS, c'est l'organisation.

Structure actuelle : bannière, badges, filtres, courbe d'ELO, gamelles, buts flash, rôles,
métriques détaillées, podium des coéquipiers, face-à-face, dernières parties. **Onze blocs de même
poids visuel, à la suite.**

[fait] **Barre de progression vers le grade suivant**
([`ProfileIdentity.tsx`](../../src/components/profile/ProfileIdentity.tsx)).
`getRankProgress()` ajouté à `rankUtils` avec **7 tests** : points restants, avancement dans le
palier, gestion du sommet. Les paliers existaient depuis toujours et n'étaient affichés nulle part.
- Placée SOUS la bannière et non dedans : la bannière est une image de fond arbitraire, une barre
  par-dessus serait illisible sur la moitié des visuels.
- Au sommet (GrandMaster I), la barre est **pleine et passe en accent** plutôt que de rester
  éternellement vide. Une barre qui ne se remplit jamais décourage.

[fait] **Onglets Statistiques / Historique / Adversaires**
([`ProfileTabs.tsx`](../../src/components/profile/ProfileTabs.tsx)). Les onze sections empilées
sont regroupées en trois vues. **Aucune donnée retirée** — on cesse simplement de tout imposer
d'un coup. L'onglet actif s'enfonce, même grammaire que les onglets du classement.

[fait] **`ProfileContent` découpé : 929 -> 640 lignes**, réparties en composants dédiés.
`ProfileStatsTab`, `ProfilePlayersTab`, `ProfileHistoryTab`, `EloChart`, `profileHelpers`.
Traite une bonne partie du chantier 9.3.
- BUG: **`EloChart` était défini À L'INTÉRIEUR de `ProfileContent`**, donc recréé à chaque rendu :
  React le voyait comme un composant différent à chaque fois et remontait tout son sous-arbre.
  Sorti dans son fichier, il est stable.
- Les fonctions d'affichage (`formatDate`, `getGameResult`, `getOpponentNames`…) étaient des
  fermetures sur `profileUser`, donc inutilisables ailleurs. Sorties dans `profileHelpers.ts`,
  elles prennent l'identifiant en paramètre.
- Le filtrage de la recherche face-à-face est descendu dans l'onglet qui l'utilise.

[fait] **La grille reste à quatre chiffres** (décision de Sacha), mais le vocabulaire est unifié :
« Winrate » sur le profil et « Ratio » sur le tableau de bord désignaient la même chose.
**« Ratio » partout.**

[fait] **Ordre et nommage des onglets** : Statistiques, **Avec & Contre**, Historique.
« Avec & Contre » et non « Adversaires » : l'onglet contient le podium des COÉQUIPIERS autant que
le face-à-face. Le nommer par la moitié de son contenu aurait caché l'autre.

[a faire] **Vérification visuelle de Sacha** : le profil doit tenir en un écran avant de faire
défiler, et la barre doit être juste (à 1049, il reste 1 point avant Diamant).

---

### Étape 3 — La progression, partout [fait] — *21 août 2026*

[fait] La barre est désormais sur **l'écran de résultats** en plus du profil. C'est là qu'elle
compte le plus : juste après une partie, on se demande « il me reste combien ? », et c'est cette
réponse qui fait relancer une partie plutôt que refermer l'app.

[fait] Le composant a quitté `components/profile` pour **`components/common/ui`** : il n'est plus
propre au profil, il fait partie de la librairie (`RankProgressBar`).

[a faire] **Vérification visuelle de Sacha** : la barre doit être juste. Un joueur à 1049 est à
1 point de Diamant.

---

### Étape 4 — Sortir Tailwind (5.4) [fait] — *21 août 2026*

**Tailwind est entièrement retiré du projet.** Il n'en reste aucune trace : ni import, ni classe,
ni plugin PostCSS, ni dépendance.

| Étape | Volume |
|---|---|
| Tailles d'icônes converties en props `width`/`height` | **66** |
| Attributs `className` convertis en styles avec tokens | **79** |
| Classes résiduelles retirées | ~70 |
| `@reference` retirés des modules CSS | **10 fichiers** |
| Dépendances désinstallées | `tailwindcss`, `@tailwindcss/postcss` |

[fait] `FieldDecorations` (le marquage du terrain) était écrit **entièrement en classes utilitaires**.
Migré vers un module CSS : lignes, diagonales, rond central, arcs de coin.

[fait] `animate-spin` remplacé par une classe `.spinner-ring` unique dans `common.css`, au lieu
d'une utilitaire répétée.

[fait] **Deux blocs de code mort trouvés en chemin**, tous deux écrits en Tailwind pur et jamais
appelés : `getTeamColors` dans `GameBoard` (une table de 7 couleurs d'équipe) et `venueTypeColors`
dans la page des lieux. Supprimés.

ATTENTION: **`npm run build` n'a pas pu être lancé** — le serveur de développement de Sacha tourne,
et les deux écrivent dans `.next`. Le typecheck et les 80 tests passent. Le rechargement à chaud
du serveur montrera immédiatement si quelque chose casse.

[a faire] **Vérification visuelle de Sacha** : aucune page ne doit bouger. Si quelque chose change,
c'est un bug. Regarder en priorité `/venues`, `/admin/seed` et le décor de terrain.

---

### Ordre des chantiers, revu le 21 août 2026

Décidé par Sacha, **réécrit le 23 août 2026**. Remplace tous les ordres précédents.

| | Chantier | Pourquoi ici |
|---|---|---|
| **1** | **La saison** — clôturer la saison 0, ouvrir la saison 1 | l'échéance de septembre commande tout |
| **2** | **Sécurité** — fermer l'écriture des stats, durcir les règles | une partie fabriquée fausse un classement qu'on aura figé |
| **3** | **Dette technique** — bloc 9 | une vingtaine de points, tous indépendants |
| **4** | **Packs** — ce qui reste | **sans monnaie** |
| — | *Système de partage entre joueurs* | optionnel, plus tard |
| — | *Avatar 2D — bloc 6* | optionnel, à la toute fin |

### ⚠️ Le bloc 4 rétrécit beaucoup — décision de Sacha, 23/08

> « Je n'ai pas besoin de monnaie. Il faut juste un affichage des doublons, c'est tout. »

**Abandonnés** : la monnaie (solde + journal), la conversion doublon -> monnaie, le pity timer.
Ils reposaient tous sur une économie qu'on ne veut pas.

**Déjà fait** : l'affichage des doublons — le « x2 » à côté du nom, livré le 21/08. Les exemplaires
s'empilent depuis, ce qui garde la porte ouverte pour un système de PARTAGE entre joueurs, qui
remplacerait la monnaie comme destination des doublons.

Il ne reste donc du bloc 4 que la **distribution automatique des packs**, déjà livrée : un pack
toutes les 10 parties qualifiantes.

### Revue du parcours de lancement [fait] — *21 août 2026*

Six pages passées en revue : `/game/new`, `/game/join`, `/tournament/new`, `/tournament/join`,
`/friends`, `/venues`.

**Ce que l'audit a trouvé :**

| Constat | Portée |
|---|---|
| Deux pages n'utilisaient pas `PageHeader` | `/game/new`, `/venues` |
| Le libellé de champ (« Stade », « Format de jeu ») écrit en style inline, à l'identique | **8 endroits** |
| Boutons d'action encore en `<button>` avec styles inline et couleurs en dur | 5 |
| Couleurs hex en dur dans le TSX | ~25 |

**Corrections :**

[fait] `PageHeader` sur les six pages. Sur `/game/new`, le retour a un comportement propre —
il annule la session en cours — donc il est posé en **action** plutôt qu'en retour standard,
pour ne pas perdre ce comportement.

[fait] `.fieldLabel` et `.fieldHint` ajoutés à `content-page.module.css`. Le libellé de champ
était écrit à l'identique en style inline dans 8 endroits : autant d'occasions de diverger.

[fait] Les 5 derniers boutons d'action migrés vers `<Button>`, dont ceux de création de tournoi
et de lancement de match, qui avaient leur propre jaune et leur propre bordure en dur.

[fait] **Plus aucune couleur hex dans le TSX**, sauf trois cas justifiés et commentés sur place :
- `themeColor` dans `layout.tsx` — méta-donnée PWA lue par le système d'exploitation, une
  variable CSS n'y serait pas résolue ;
- `TEAM_AVATAR_GRADIENTS` et `TEAM_GRADIENTS` — couleurs **décoratives** servant à distinguer les
  équipes entre elles. Elles ne participent pas à la palette d'interface, donc n'ont pas à
  s'y accorder. Sorties du JSX et regroupées en tête de fichier.

**Deuxième passe, après retours de Sacha (21/08) :**

[fait] **La flèche de retour reprend sa position standard.** Je l'avais posée en action à droite
sur `/game/new` pour préserver son comportement propre (annuler la session). C'était le mauvais
arbitrage : une page ne doit jamais déplacer sa flèche parce que son comportement diffère.
`PageHeader` accepte désormais `onBack` — comportement propre, position et taille identiques
partout.

[fait] **Échelle resserrée.** Sacha : « tout est beaucoup trop grand, ça n'a aucun sens ».
- `Button` recalibré : `md` passe de `var(--spacing-sm) var(--spacing-lg)` à `10px var(--spacing-lg)`
  avec une hauteur plancher de 40 px, et descend d'un cran dans l'échelle typographique.
- Les cartes de choix (format, mode de tournoi) occupaient un tiers de l'écran pour porter deux
  mots : rembourrage divisé par deux.
- En-tête de page : bouton et hauteur à 40 px, titre en `--text-xl`.
- Actions du tableau de bord : rembourrage et icônes réduits.

[fait] **Le choix du score de victoire retiré des tournois.** Sacha : « c'est plus du tout le
système qu'on a fait, on finit le match ». Exact — la partie se termine quand l'hôte le décide,
il n'y a plus de score cible. Les deux endroits qui l'AFFICHAIENT (« Premier à 6 buts ») disaient
donc quelque chose de faux ; corrigés. La valeur reste écrite en base pour ne pas invalider la
structure des tournois déjà enregistrés.

[fait] **Les boutons vert foncé passent en crème.** Onglets de `/friends`, boutons « + Ami » et
« + Stade » du tableau de bord. La couleur ne signalait rien et les rendait difficiles à
distinguer du fond terrain. L'onglet actif s'enfonce désormais, comme au classement et sur le
profil.

[fait] **« 10 amis » était en gris sombre** sur le fond terrain, donc illisible. Le titre de
section de `/friends` passe en blanc.

**Troisième passe, après retours de Sacha (21/08) :**

[fait] BUG: **Cinq icônes avaient perdu leur taille** lors du retrait de Tailwind. Un SVG sans
dimension remplit son conteneur : d'où les cartes de choix géantes sur `/tournament/new`, et le
sélecteur de stade qui occupait la moitié de l'écran. Cause précise : ma passe de nettoyage avait
retiré `className="h-8 w-8 mx-auto mb-2"` sans poser de `width`/`height` en remplacement, parce
que ces classes étaient mélangées à des utilitaires de mise en page.
[fait] Un `className` en **template literal** portait encore `w-5 h-5` — ma conversion ne traitait
que les chaînes littérales. Corrigé, et le motif est désormais couvert.

[fait] **Le bouton central de la navigation passe au vert principal.** Il utilisait `--green-600`,
qui est un ton de SURFACE, pas une couleur d'action : sur le fond terrain, le bouton disparaissait
presque. Même correction appliquée aux 5 autres sélecteurs d'action qui faisaient la même
confusion (`.submitButton`, `.successButton`, `.filterPillActive`, `.optionActive`).
Les avatars et barres décoratives gardent le ton de surface : c'est le bon pour eux.

**Quatrième passe (21/08) :**

[fait] BUG: **Les icônes du tournoi étaient toujours géantes** après ma correction précédente :
le retrait des classes Tailwind avait laissé **deux espaces** entre le nom du composant et
l'attribut suivant, et mon remplacement cherchait un espace unique. Corrigé avec une expression
tolérante, puis vérifié sur tout le projet — **aucune icône sans dimension ne subsiste**.
Les doubles espaces laissés par la migration ont été nettoyés dans 44 fichiers.

[fait] BUG: **Le bouton central de navigation restait enfoncé après un tap.** Sacha :
« quand je clique dessus, après il reste appuyé ».
Deux causes cumulées :
1. Sur un écran tactile, **`:hover` reste actif après un tap** jusqu'au tap suivant. Les 61 règles
   de survol qui déplacent un élément ou changent son ombre sont désormais derrière
   `@media (hover: hover)` — elles ne s'appliquent qu'aux appareils qui pointent vraiment.
2. Huit règles `:active` **soulevaient** l'élément au lieu de l'enfoncer, avec le même décalage que
   `:hover` : l'appui prolongeait l'effet de survol au lieu de le contredire. Un appui enfonce
   désormais, et l'ombre disparaît sous l'élément.

[fait] BUG: **Une transformation automatique a cassé un fichier CSS.** Mon expression régulière
pour isoler les règles `:hover` ne capturait que **la dernière ligne** d'un sélecteur multi-ligne :

```
.primaryAction:hover,          <- laissé orphelin
.secondaryAction:hover,        <- laissé orphelin
@media (hover: hover) {
    .tournamentAction:hover { ... }
```

Un seul fichier était touché sur 25, mais il faisait échouer la compilation. Réparé, et j'ai ajouté
une vérification systématique de la syntaxe CSS (équilibre des accolades, sélecteurs orphelins
avant un `@media`, `@media` vides) que je passe désormais après toute transformation automatique.

**Leçon** : une transformation par expression régulière sur du CSS doit être vérifiée sur
l'ENSEMBLE des fichiers, pas seulement sur celui qui a motivé le changement.

[a faire] **Vérification visuelle de Sacha** sur les six pages.

### Revue de la page classement [fait] — *21 août 2026*

**Première passe : cohérence.** Typographie ramenée sur l'échelle (14 tailles en `rem`), couleurs
en tokens, podium dont le `max-height: 150px` rognait les noms longs et la couronne du premier,
état de focus ajouté à la recherche (elle n'en avait aucun), filtres regroupés avant la recherche.

ATTENTION: Sacha, à juste titre : « j'ai l'impression que rien a changé ». **Il avait raison** —
c'était une passe de cohérence, pas une refonte. Deuxième passe :

[fait] BUG: **Le podium et la liste montraient les trois mêmes joueurs.** Le podium affichait le
top 3, puis la liste redémarrait au rang 1 juste en dessous. La liste commence désormais au 4e
quand le podium est visible.

[fait] BUG: **La couleur du texte sur bannière était décidée par une liste de trois pseudos en
dur** (`CREATORS = ['Astroboy', ...]`) — même défaut que l'attribution de bannières corrigée au
chantier 2.5. Elle est maintenant déduite de la bannière réellement affichée : n'importe quel
joueur qui en équipe une obtient le bon contraste.

**Troisième passe — la vraie refonte, sur retours de Sacha :**

[fait] **Le podium reste ET la liste montre tout le monde.** J'avais retiré le top 3 de la liste
pour éviter le doublon ; Sacha préfère les deux. Ils ont chacun leur rôle : le podium met en
avant, la liste fait référence.

[fait] **Toutes les lignes ont exactement la même hauteur** (`min-height: 60px`). Sans elle, la
hauteur suivait le contenu : une ligne avec bannière, une avec un pseudo long, une avec un
indicateur d'évolution ne faisaient pas la même taille, et la liste ondulait. Une liste se lit à
sa régularité.

[fait] **Évolution hebdomadaire au classement**
([`lib/game/ranking.ts`](../../src/lib/game/ranking.ts), 12 tests).
Flèche verte avec le nombre de places gagnées, rouge pour les places perdues, `=` si rien n'a
bougé, `NEW` pour un joueur qui n'était pas classé.
**Aucune donnée nouvelle n'a été nécessaire** : `stats.history` conserve depuis toujours l'ELO de
fin de journée. On reconstitue le classement d'il y a une semaine en triant sur l'ELO d'alors.
Fonctionne rétroactivement sur les 147 comptes — même méthode que pour le pic d'ELO.
ATTENTION: un joueur sans historique à la date de coupe est marqué « nouveau », pas « stable ».
Dire qu'il n'a pas bougé serait faux.

[fait] **Rappel de ta position en tête.** Quand on est 47e sur 141, il faut faire défiler pour se
trouver — or c'est l'information qu'on vient chercher en premier.

[fait] **Le vide à gauche des bannières est comblé** : la colonne de rang est élargie et porte
désormais le numéro ET l'évolution. C'est justement le tiers gauche qu'on demande de laisser
calme dans le brief de design des bannières.

[a faire] **La colonne « V »** compte les victoires de TOUS LES TEMPS. Sacha la veut sur la saison
en cours — à faire avec le chantier 3.8 (filtre par saison), qui pose le même problème : rien sur
une partie ne dit encore à quelle saison elle appartient.

### Étape 5 — Refermer la faille ELO (0.2)

[bloque] Attend `FIREBASE_SERVICE_ACCOUNT` dans les variables Vercel. **Seul point de la liste qui
concerne les 147 joueurs aujourd'hui**, et non au drop.

---

### Étape 6 — Durcir les règles Firestore (0.5)

Activer les deux interrupteurs différés (`adminOnlyAnnouncements`, `blockUserSelfDelete`), une fois
l'étape 5 vérifiée en production.

---

### Étape 7 — Recette puis drop

Vous trois jouez en V2 plusieurs soirées réelles, puis `v2 everyone`.

---

## Tous les chantiers, à plat

`[fait]` fait - `[en cours]` en cours - `[a faire]` à faire - `[bloque]` bloqué

### Bloc 0 — Infra & sécurité serveur
| | Chantier | État | Qui |
|---|---|---|---|
| 0.1 | Config Firebase versionnée | [fait] | moi |
| 0.2 | Fermer l'écriture des stats par le client | [fait] 23/08 | moi — attend que la route soit en prod |
| 0.3 | Couche serveur (routes + `firebase-admin`) | [fait] | moi |
| 0.4 | Fin de partie côté serveur | [fait] | moi |
| 0.5 | Durcir les règles au maximum | [fait] 23/08 | moi |
| 0.6 | Supprimer l'auth anonyme | [fait] | moi |
| 0.7 | Connexion Google + écran de pseudo | [fait] | moi |

### Bloc 1 — Fiabilisation ELO & stats
| | Chantier | État | Qui |
|---|---|---|---|
| 1.1 | Race condition sur l'ELO | [fait] | moi |
| 1.2 | MVP : une seule définition (il y en avait 3) | [fait] | moi |
| 1.3 | Bonus MVP écrit une seule fois | [fait] | moi |
| 1.4 | Borner l'historique du profil | [fait] | **D7 tranché le 22/08** |
| 1.5 | Module de calcul pur + 25 tests | [fait] | moi |
| 1.6 | Refonte de la formule 2v2 | [bloque] | **décision D10** |

### Bloc 2 — Socle collection & personnalisation
| | Chantier | État | Qui |
|---|---|---|---|
| 2.1 | Catalogue Firestore (8 items en prod) | [fait] | moi |
| 2.2 | Inventaire en sous-collection | [fait] | moi |
| 2.3 | `equipped` porté jusqu'aux classements | [fait] | moi |
| 2.4 | `grantItem` idempotent | [fait] | moi |
| 2.5 | Migration `bannerUtils` -> données | [fait] | moi — appliqué en prod |
| 2.6 | Équipement + route validée serveur | [fait] | moi |
| 2.7 | Format de bannière unifié (4:1 partout) | [fait] | moi |
| 2.8 | Alléger les assets bannières | [a faire] | **Sacha** — re-export WebP |
| 2.13 | Catalogue déclaratif + `npm run catalog:sync` | [fait] | moi |
| 2.9 | Réversibilité des octrois | [fait] | moi |
| 2.10 | Registre de types + page `/collection` | [fait] | moi |
| 2.11 | Type `title` + filtre possédés/tout | [fait] | moi |
| 2.12 | Drapeaux de fonctionnalité (le « drop ») | [fait] | moi |

### Bloc 3 — Saisons

> **Repoussé volontairement (décision de Sacha, 20/08).** « Le but, ça va être de retarder ça au
> max. Une fois qu'on aura une V2 stable, on se posera sur : ok, une saison, qu'est-ce qu'elle
> fait. » Les chantiers ci-dessous restent valables, mais rien ne commence avant que la V2 soit
> stable et livrée. *(rien commencé)*
| | Chantier | État | Qui |
|---|---|---|---|
| 3.1 | Modèle de données + archive | [a faire] | moi |
| 3.2 | Clôture (fige -> distribue -> reset) | [a faire] | moi |
| 3.3 | Soft reset | [a faire] | moi — coefficient = **D5** |
| 3.4 | Table de récompenses par grade | [a faire] | moi — attend les bannières |
| 3.5 | Historique de saison sur le profil | [a faire] | moi |
| 3.6 | Outil admin de clôture + confirmation forte | [a faire] | moi |
| 3.7 | Marche arrière de clôture | [a faire] | moi — plomberie déjà faite (2.9) |
| 3.8 | Filtre par saison sur tout le profil | [a faire] | moi — dépend de 3.1 |

### Bloc 4 — Monnaie & packs *(après septembre)*
| | Chantier | État |
|---|---|---|
| 4.1 | Monnaie : solde + journal | [a faire] |
| 4.2 | Définition de pack au catalogue | [a faire] |
| 4.3 | Tirage serveur + pity invisible | [a faire] |
| 4.4 | Doublons -> monnaie | [a faire] |
| 4.5 | Animation d'ouverture | [a faire] |

### Bloc 5 — Design system *(en fond, continu)*
| | Chantier | État | Qui |
|---|---|---|---|
| 5.1 | Réécrire les tokens | [fait] | palette **PROVISOIRE**, D12 ouverte |
| 5.2 | Librairie de composants | [fait] | Button, Card, Input, Badge |
| 5.3 | Migration page par page | [fait] | **0 couleur en dur** (471 au départ) |
| 5.4 | Sortir Tailwind | [fait] | aucune trace restante |
| 5.5 | Fiabiliser le fond terrain | [fait] | une seule définition, rayures relatives |

### Bloc 6 — Avatar 2D *(slots déjà déclarés, affichés « Bientôt »)*
| | Chantier | État | Qui |
|---|---|---|---|
| 6.1 | Les 5 slots au catalogue | [a faire] | moi |
| 6.2 | Rendu par calques + teinte CSS | [a faire] | moi + **Sacha** (assets) |
| 6.3 | Avatar par défaut à l'inscription | [a faire] | moi |
| 6.4 | Équipement validé serveur | [fait] | déjà couvert par 2.6 |

### Bloc 7 — Modes de jeu / bibitif
| | Chantier | État |
|---|---|---|
| 7.1 | Sélection du mode au lancement | [fait] |
| 7.2 | Mode visible avant d'accepter | [fait] |
| 7.3 | Moteur de règles sociales | [fait] |
| 7.4 | Config des modes en fichier | [fait] |

### Bloc 8 — Events par lieu
Rien commencé, volontairement le dernier.

### Bloc 9 — Dette technique *(indépendants, à prendre quand ça arrange)*
| | Chantier | État | Poids |
|---|---|---|---|
| 9.1 | Score stocké deux fois | [fait] | dérivé des équipes |
| 9.2 | `startTime` / `startedAt` en doublon | [fait] | + 9 conversions de date unifiées |
| 9.3 | Découper les fichiers > 850 lignes | [a faire] | plus que 2 fichiers concernés |
| 9.4 | Undo imparfait du multiplicateur | [fait] | l'état se rejoue depuis les buts |
| 9.5 | Agrégations côté client | [a faire] | à surveiller |
| 9.6 | Fichiers parasites à la racine | [fait] | `src.zip` ignoré, log sorti de l'index |
| 9.7 | `goalsConceded` doublé en 2v2 | [a faire] | à documenter |
| 9.8 | 2 comptes fantômes (inscriptions ratées) | [fait] | résolu par 0.7 |
| 9.9 | Erreur en fin de partie sans lieu | [fait] | — |
| 9.10 | Page de match fragile aux ajouts de contenu | [en cours] | 1re passe faite, reste les dimensions figées |
| 9.11 | Le mode de jeu n'existe pas dans les tournois | [fait] | + 3 bugs de tournoi trouvés au passage |
| 9.12 | Pic d'ELO absent des comptes antérieurs | [fait] | reconstitué depuis `eloHistory` |
| 9.13 | Unités de fenêtre dans un conteneur pivoté | [en cours] | flash corrigé, vue spectateur à voir |
| 9.15 | Classes de bouton jamais définies | [fait] | 12 usages, 0 définition |
| 9.16 | Le fond terrain défilait avec le contenu | [fait] | calque fixe derrière |
| 9.17 | Lignes de terrain rendues visibles par erreur | [fait] | elles ne rendaient rien depuis toujours |
| 9.18 | Halo clair autour des boutons | [fait] | fond par défaut du `<button>` |
| 9.19 | Décor de terrain limité à un écran | [fait] | passé en `fixed` |
| 9.20 | Textes noirs sur fond vert (page équipes) | [fait] | |
| 9.21 | Deux systèmes de boutons en parallèle | [fait] | 46 usages migrés, classes supprimées |
| 9.22 | `targetScore` devenu vestigial | [fait] | plus écrit ; les 2 champs restent typés en hérité |
| 9.23 | Google supprime le mot de passe | [fait] | message « ce compte utilise Google » + vérification d'adresse, sans blocage |
| 9.24 | La bannière décidait de la hauteur des lignes | [fait] | ratio du profil appliqué partout |
| 9.25 | Titre du profil dépareillé | [fait] | aligné sur `PageHeader` |
| 9.26 | Bouton central figé en position enfoncée | [fait] | l'état actif ne se signale plus par un déplacement |
| 9.28 | Fond translucide qui remplace au lieu de superposer | [fait] | 3 endroits |
| 9.29 | Image de bannière arrêtée avant le bord | [fait] | `background-origin` |
| 9.30 | « Vide à gauche » : barre d'accent + raccourci `background` | [fait] | ligne « moi » identique aux autres, garde-fou `check:banner` |

---

## Bloc 0 — Infra & sécurité serveur

**Pourquoi en premier :** rien de l'économie ni des saisons ne peut exister sans code serveur, et
il n'y en a aucun aujourd'hui. En prime, ça bouche une faille active.

### 0.1 [fait] Versionner la configuration Firebase — *20 août 2026*
`firebase.json`, `firestore.rules`, `storage.rules`, `firestore.indexes.json` créés à la racine.
Les règles couvrent les 8 collections réelles (`users`, `games`, `game_sessions`, `tournaments`,
`venues`, `announcements`, `feedbacks` + les collections à venir `catalog`/`seasons`), avec
fermeture par défaut sur tout le reste.
[fait] **Les règles de production ont été rapatriées** (fournies par Sacha le 20/08) et servent de base.
Chaque écart est marqué `[DURCI]` dans le fichier et justifié par une vérification dans le code :

| Écart | Prod | Nouveau | Vérification |
|---|---|---|---|
| `users` delete | le joueur peut supprimer son doc | fermé | aucune fonctionnalité de suppression de compte n'existe ; un doc supprimé casserait classements et historiques |
| `announcements` write | **tout connecté** (commentaire : « contrôle côté app » = aucun contrôle réel) | admins par email | l'app filtrait déjà par email, la règle applique la même chose |
| `storage` | non versionné | tout fermé | Cloud Storage n'est utilisé nulle part dans le code |

- **Non durci volontairement** : `games`, `tournaments`, `game_sessions`, `venues` restent en
  `read, write: if isSignedIn()` comme en prod. Les restreindre demande d'auditer d'abord
  `tournaments.ts` (un organisateur écrit des parties où il ne joue pas) -> renvoyé au chantier 0.5.
- L'interrupteur `clientMayWriteStats()` vaut `true` : **comportement de la prod strictement préservé**.

### 0.2 [a faire] Fermer l'écriture cross-user sur `users/*`
BUG: **Faille active.** [`games.ts:333`](../../src/lib/firebase/games.ts#L333) fait
`transaction.update(playerRef, { stats })` sur le document d'un **autre** joueur, depuis le
navigateur. Pour que ça fonctionne, les règles autorisent forcément n'importe qui à écrire les
stats de n'importe qui — donc à s'attribuer l'ELO qu'il veut depuis la console du navigateur.
- **Fini quand :** `clientMayWriteStats()` passe à `false` dans `firestore.rules` et que la fin de
  partie fonctionne toujours (donc **après 0.4**, jamais avant).
- ATTENTION: **La faille est plus large que « écriture croisée »** : la règle de prod autorise un joueur à
  écrire **n'importe quel champ sur son propre document** — donc son propre `stats.elo`, sans même
  passer par le doc d'autrui. Se mettre 5000 d'ELO ne demande aucune astuce.
- **Le seul vrai verrou est de retirer `stats` au client**, ce qui impose 0.4 d'abord.

### 0.3 [fait] Couche serveur — *20 août 2026* — Route Handlers Next.js + `firebase-admin`
[fait] **Décision D1 tranchée : on reste sur Spark, donc pas de Cloud Functions.** Ce n'est pas un
renoncement à la sécurité serveur : l'app est déployée **sur Vercel**, on a donc déjà du code
serveur de confiance. On remplace « Cloud Function » par **Route Handler Next.js + `firebase-admin`**
partout dans les docs `20`/`30`/`31`/`32`.

La frontière de confiance est **identique** : le SDK admin utilise un compte de service, contourne
les règles Firestore, et le client ne peut rien forger. C'est même plus simple — même langage,
même dépôt, même déploiement, pas de projet séparé.

- `src/app/api/*/route.ts`, `firebase-admin` en dépendance, clé de service en variable
  d'environnement Vercel ([fait] `serviceAccountKey.json` déjà ajouté au `.gitignore`).
- [fait] [`src/lib/firebase/admin.ts`](../../src/lib/firebase/admin.ts) : singleton du SDK admin,
  `getAdminDb()`, `getAdminAuth()`, et `requireCallerUid()` qui vérifie le jeton `Bearer` de chaque
  requête. Marqué `import 'server-only'` — toute tentative de l'importer côté client casse le build.
- [fait] Identifiants : variable `FIREBASE_SERVICE_ACCOUNT` (Vercel) avec repli sur
  `serviceAccountKey.json` en local.

**Ce qu'on perd réellement, et comment on s'en passe :**
| Fonctionnalité Cloud Functions | Impact | Contournement |
|---|---|---|
| Déclencheurs Firestore (`onWrite`) | aucun | Tout part d'un appel client explicite, jamais d'une écriture observée |
| Fonctions planifiées (cron) | aucun | La clôture de saison est **manuelle par décision** (doc `31`) ; le code tournant des events se **dérive** de l'heure au moment de la lecture, il n'a pas besoin de cron |
| Déclencheur `onUserCreate` | ATTENTION: réel | L'avatar par défaut (6.3) ne peut plus être octroyé automatiquement à la création. Si le client meurt en cours d'inscription, le compte n'a pas d'avatar -> prévoir un appel **idempotent** « garantir l'avatar par défaut » au chargement de l'app |

### 0.4 [fait] Migrer la fin de partie côté serveur — *20 août 2026*
[fait] [`POST /api/games/[id]/end`](../../src/app/api/games/[id]/end/route.ts) : vérifie le jeton,
contrôle que l'appelant est un joueur ou l'hôte, calcule, écrit les stats de tous les joueurs
avec le SDK admin, puis met à jour la partie.
[fait] [`endGame()`](../../src/lib/firebase/games.ts) côté client ne calcule plus rien — il appelle
la route avec son jeton d'identité. **Plus une seule écriture de `stats` depuis le navigateur.**
- [fait] **Idempotence renforcée** : une partie déjà terminée renvoie son résultat au lieu de lever une
  erreur. Sur une route HTTP, un double-tap ou un renvoi réseau est normal — échouer afficherait
  une erreur alors que tout s'est bien passé.
- [a faire] **Reste à faire** : déployer sur Vercel avec `FIREBASE_SERVICE_ACCOUNT`, vérifier une vraie fin
  de partie en production, PUIS seulement basculer 0.2.
- NOTE: C'est le point d'entrée où se branchera le crédit de monnaie du bloc 4.

### 0.5 [a faire] Tirer les règles Firestore au maximum
Sans Cloud Functions, les règles portent une part plus lourde de la sécurité — et elles en sont
capables : elles peuvent lire d'autres documents (`get()`/`exists()`) pour valider une écriture.
- Inventaire, monnaie, journal, catalogue : **lecture seule client**, écriture admin uniquement.
- `equipped` : écriture client autorisée **mais** validée par règle — l'item doit exister dans
  l'inventaire du joueur et être du bon type. Pas besoin de serveur pour ça.

### 0.6 [fait] Supprimer l'authentification anonyme — *20 août 2026*
`registerQuick()` créait un compte via `signInAnonymously()` : un compte authentifié obtenu en une
requête, sans email ni mot de passe. Tant que ce provider est actif, `isSignedIn()` ne protège
quasiment rien dans les règles.
- [fait] Vérifié : **`registerQuick()` n'était appelé nulle part** — du code mort. Supprimé, avec
  l'import `signInAnonymously` et le type `AccountType` (mort lui aussi). `npx tsc --noEmit` passe.
- [fait] Provider *Anonyme* désactivé en console par Sacha.
- [fait] **Audit effectué** ([`scripts/audit-auth.mjs`](../../scripts/audit-auth.mjs)) : **4 comptes
  anonymes** existent, tous créés le 7 janvier 2026, **aucun n'a de document Firestore ni de partie
  jouée**, aucun n'est jamais revenu. Suppression sans risque — rien ne les référence.

### 0.7 [fait] Connexion Google — *20 août 2026*
Demandé par Sacha. Ajout du provider Google **en complément** de l'email/mot de passe, jamais en
remplacement — l'audit montre que 34 joueurs n'ont pas d'adresse Google.

**État réel du parc** (147 comptes, audit du 20/08/2026) :

| Population | Nombre | Effet de la connexion Google |
|---|---|---|
| Mot de passe + adresse Google | **109** (74 %) | peuvent l'utiliser, **à relier** au compte existant |
| Mot de passe + autre adresse | **34** (23 %) | ne peuvent pas — gardent l'email/mot de passe |
| Anonymes | 4 | sans données, à supprimer (0.6) |
| Emails partagés par 2 comptes | **0** | aucun doublon préexistant à démêler |

**Le point qui décide de tout — à vérifier AVANT d'implémenter :**
Firebase Console -> Authentication -> Settings -> *User account linking*.
- Si **« une seule adresse par compte »** (le réglage par défaut) : une connexion Google sur un
  email déjà utilisé lève `auth/account-exists-with-different-credential`. On enchaîne alors sur
  `linkWithCredential` -> **le même UID est conservé**, donc stats, ELO, amis et historique intacts.
- Si **« plusieurs comptes par adresse »** : Firebase crée un **second UID** -> compte dupliqué,
  stats coupées en deux. [bloque] Il faut impérativement le réglage par défaut.

**Travail à faire :**
- `GoogleAuthProvider` + `signInWithPopup` dans `lib/firebase/auth.ts`, bouton sur `/` et `/register`.
- Parcours de liaison : si l'email a déjà un compte mot de passe -> demander le mot de passe une
  dernière fois -> `linkWithCredential`. Le joueur ne perd rien et n'a plus jamais à le ressaisir.
- [fait] **Décision : un écran « choisis ton pseudo », pas de pseudo attribué d'office.** Une connexion
  Google ne fournit pas de pseudo, or `createUserDocument` en exige un et `usernameLowercase` doit
  rester unique.
  **Pourquoi pas l'attribution automatique**, alors que le renommage existe déjà
  ([`updateUsername`](../../src/lib/firebase/auth.ts), exposé dans le profil) :
  1. le pseudo **est** l'identité dans cette app — il apparaît au classement dès la première partie.
     Un « Joueur4821 » visible par les 140 autres, c'est un mauvais départ ;
  2. générer un pseudo *unique* impose de gérer les collisions — ce n'est pas plus simple à écrire ;
  3. renommer est encore fragile ici : les bannières sont attribuées **par pseudo**
     (chantier 2.5), donc se renommer fait perdre sa bannière. Encourager le renommage aggrave ce bug.
  **Un seul écran, trois problèmes réglés** : nouveau compte Google, réparation des 2 comptes
  fantômes (chantier 9.8), et tout futur compte sans document. Règle : tout utilisateur authentifié
  sans document Firestore y est redirigé.
- ATTENTION: À vérifier à l'implémentation : la *Protection contre l'énumération des emails* (activée par
  défaut sur les projets récents) modifie le comportement de `fetchSignInMethodsForEmail`. Se baser
  sur le code d'erreur du `signInWithPopup`, pas sur une détection préalable.

---

## Bloc 1 — Fiabilisation ELO & stats

**Pourquoi avant les saisons :** le soft reset va réécrire l'ELO de tous les profils et l'archiver
définitivement. Si la donnée est fausse au moment du snapshot, elle est fausse pour toujours.

### 1.1 [fait] Corriger la race condition sur l'ELO — *20 août 2026*
BUG: **Bug réel, non documenté dans le diagnostic d'origine.** Les ELO sont lus **hors** transaction
([`games.ts:163`](../../src/lib/firebase/games.ts#L163)) puis réécrits en **valeur absolue** dedans.
Le `runTransaction` protège les compteurs (relus à l'intérieur) mais pas l'ELO : deux parties du
même joueur terminées en parallèle -> la seconde écrase la première.
- [fait] **Corrigé** : le module de calcul ne renvoie plus que des **deltas**, et la transaction écrit
  `eloReluDansLaTransaction + eloChange`. Plus aucune valeur absolue calculée hors transaction.

### 1.2 [fait] MVP : une seule définition — *20 août 2026*
`computeMVP()` ([`games.ts:90`](../../src/lib/firebase/games.ts#L90), sophistiqué : rôle, clean sheet)
devient LA définition. `calculateGameResults()` ([`games.ts:652`](../../src/lib/firebase/games.ts#L652))
recalculait un MVP « max de buts » concurrent -> **supprimée**.
- ATTENTION: **Il y en avait une troisième, non repérée au diagnostic** : la page de résultats
  ([`results/page.tsx`](../../src/app/game/[id]/results/page.tsx)) calculait son propre MVP
  (`sortedStats[0]`, tri par buts). Elle pouvait donc afficher un joueur différent de celui qui
  avait réellement touché le bonus d'ELO. Elle lit désormais `game.mvpId`.
- BUG: **Corrigé au passage** : le badge MVP était conditionné à `totalGoals > 0`, donc **invisible
  pour un défenseur MVP par clean sheet** — soit précisément le cas que `computeMVP()` valorise le plus.

### 1.3 [fait] Le bonus MVP +3 écrit une seule fois — *20 août 2026*
ATTENTION: **Correction du diagnostic :** ce n'est **pas** un double bonus. [`games.ts:254`](../../src/lib/firebase/games.ts#L254)
(affichage) et [`games.ts:296`](../../src/lib/firebase/games.ts#L296) (écriture) appliquent chacun
+3 une seule fois sur leur propre valeur — aujourd'hui ils concordent. Le problème est la
duplication : ils divergeront à la prochaine édition. Priorité basse, mais à faire pendant qu'on est dans le fichier.

### 1.4 [a faire] Borner l'historique du profil
Deux champs grossissent sans limite à chaque partie, pas un seul : `stats.eloHistory` (un push par
partie) **et** `stats.history` (une entrée par jour joué). Le document user gonfle indéfiniment.
- ATTENTION: Solution à trancher (plafond N dernières entrées vs sous-collection) — voir décisions.
- NOTE: À faire **avant** le bloc 3 : les saisons vont ajouter encore de l'historique par-dessus.

### 1.5 [fait] Extraire le calcul ELO en module pur + tests — *20 août 2026*
Aucun test n'existe dans le projet (pas de Vitest, pas de script `test`). Le doc `11` exige des
tests unitaires avant toute refonte de formule.
- [fait] [`src/lib/game/scoring.ts`](../../src/lib/game/scoring.ts) : module pur, zéro accès Firebase,
  partagé par la route serveur et le client. Constantes de calibrage nommées et exportées.
- [fait] Philosophie **ELO inflationniste assumé** documentée en tête de module, avec l'avertissement
  de ne pas la « corriger ».
- [fait] **Vitest installé** (`npm test`) + [`scoring.test.ts`](../../src/lib/game/scoring.test.ts) :
  **25 tests** couvrant les scénarios nommés du doc 11 — K-factor, probabilités, 1v1, équipes
  équilibrées, joueur en placement, MVP défensif par clean sheet, invités, 1v1 vs 2v2.
- [fait] **Deux tests caractérisent volontairement des comportements plutôt que de les valider :**
  - le **« portage »** (D10) : un joueur faible porté gagne plus que son partenaire fort. Le jour
    où la formule sera revue, ces tests échoueront — **c'est le signal attendu, pas une régression.**
  - l'**inflation** : la somme des variations d'une partie vaut exactement `MVP_ELO_BONUS`.
    Documenté pour qu'aucun contributeur ne la prenne pour un bug.
- NOTE: Le filet est maintenant en place : la refonte de la formule 2v2 (1.6) peut démarrer dès que
  l'équipe aura tranché D10.

### 1.6 [bloque] Refonte de la formule 2v2
**Bloqué** — 4 leviers non tranchés (`99-points-a-decider.md`). Ne pas commencer.
NOTE: Mon avis : **à ne surtout pas faire avant septembre.** Changer la formule pendant qu'on clôture
une saison, c'est mélanger deux variables. À traiter début saison 1, jamais en cours de route.

---

## Bloc 2 — Socle collection

Version minimale pour septembre : **catalogue + inventaire + `equipped` + `grantItem`**.
Pas de monnaie, pas de packs à ce stade (bloc 4).

### 2.1 [fait] Catalogue Firestore — *20 août 2026*
[fait] Peuplé en production (8 items) par [`scripts/seed-catalog.mjs`](../../scripts/seed-catalog.mjs) :
les 2 bannières existantes + les 6 récompenses de la saison 0 (Pionnier + 5 grades).
[fait] Cache client [`catalogClient.ts`](../../src/lib/collection/catalogClient.ts) : chargé une fois
par session via `useSyncExternalStore`, accès **synchrone** ensuite — sinon chaque ligne de
classement déclencherait sa propre lecture Firestore.
[fait] Modèle typé dans [`types/collection.ts`](../../src/types/collection.ts).

Collection partagée, lecture seule client. Schéma : `id`, `type`, `rarity`, `source`, `asset`,
`tintable`, `meta` (voir `20-socle-collection.md`).
Premier type d'item peuplé : `banner`.

### 2.2 [fait] Inventaire en sous-collection — *20 août 2026*
[fait] `users/{uid}/inventory/{itemId}` + `users/{uid}/grants/{grantId}`. Écriture serveur uniquement,
verrouillée dans `firestore.rules`. Le profil user n'a pas grossi.

### 2.3 [fait] `equipped` sur le profil — *20 août 2026*
[fait] **Porté jusqu'aux classements** : `LeaderboardEntry` transporte `equipped`, et les 4 points
d'entrée (global, par lieu, amis avec et sans filtre de lieu) le peuplent. Sans ça, une bannière
gagnée resterait invisible précisément là où elle compte le plus.

Map `slot -> { itemId, tint? }`. Quelques IDs, léger — c'est ce qu'on lit pour afficher n'importe
qui dans un classement.

### 2.4 [fait] `grantItem` — transactionnel et idempotent — *20 août 2026*
[fait] [`src/lib/collection/grant.ts`](../../src/lib/collection/grant.ts). `grantId` déterministe
(`source:sourceRef:itemId`) -> rejouer un octroi après un crash est un no-op constaté, jamais un
doublon. La clôture de saison (3.2) en dépend directement.
ATTENTION: Refuse d'octroyer un item absent du catalogue — sinon l'inventaire se remplirait d'items
inaffichables.

**L'invariant d'architecture.** Toutes les sources (saison, event, exploit, pack, admin) passent
par elle et n'ont aucune logique d'inventaire propre. Un identifiant d'octroi unique empêche tout
double-octroi en cas de retry.

### 2.5 [en cours] Migrer `bannerUtils` en données — *script prêt, pas appliqué*
[fait] [`scripts/migrate-banners.mjs`](../../scripts/migrate-banners.mjs), **simulation par défaut**.
[fait] Simulation exécutée : **4 octrois** à faire (3 créateurs + `Matricule13`), **0 profil à migrer** —
ce qui confirme que `bannerId` n'avait jamais été écrit nulle part.
[a faire] **Attend le feu vert** : première écriture sur des documents utilisateur réels.
   `node scripts/migrate-banners.mjs --apply`

BUG: Aujourd'hui l'attribution se fait **par pseudo en dur** ([`bannerUtils.ts:26`](../../src/lib/utils/bannerUtils.ts#L26)) :
`CREATOR_USERNAMES` et `SPECIAL_BANNERS`. Conséquence non voulue : **un créateur qui change de
pseudo perd sa bannière.**
- Chaque bannière devient un item du catalogue, chaque attribution un `grantItem` normal.
- Script de migration : `user.bannerId` -> `equipped.banner`, octrois rétroactifs aux 3 créateurs et à `Matricule13`.

### 2.6 [fait] UI d'équipement de bannière — *20 août 2026*
[fait] [`BannerPicker.tsx`](../../src/components/profile/BannerPicker.tsx) dans la modale d'édition du
profil + route [`POST /api/inventory/equip`](../../src/app/api/inventory/equip/route.ts) qui vérifie
que l'item existe, qu'il est du bon type, **qu'il est réellement possédé**, et que la teinte ne
s'applique qu'à un slot tintable.
NOTE: Un asset manquant est détecté **au chargement de l'image**, pas deviné depuis l'extension : le
jour où le fichier est déposé, il s'affiche sans toucher au code.

BUG: **`bannerId` n'est écrit nulle part dans le code** — j'ai vérifié, il n'y a que des lectures.
Il n'existe aucune interface pour équiper une bannière : c'est 100% figé par pseudo.
- Sélecteur dans le profil, limité aux items possédés. Validation serveur (item dans `owned`, bon type).
- **Sans ce chantier, les récompenses de septembre seraient invisibles.**

### 2.7 [fait] Unifier le format de bannière — *20 août 2026*
[fait] **UN SEUL RATIO PARTOUT (4:1)** — profil, classement, liste de joueurs, collection.
Le ratio est un token unique, `--banner-aspect-ratio` dans
[`variables.css`](../../src/styles/variables.css). Le changer là doit suffire.
- Avant : le profil affichait en 4:1 et les listes en 5:1 -> **la même image était rognée
  différemment selon l'écran**. Signalé par Sacha comme « surtout pas possible ».
- [fait] Conséquence heureuse : **la zone sûre disparaît**. Le fichier source et tous les conteneurs
  partagent le même ratio, donc l'image s'affiche toujours en entier. Plus de marge de 40 px à
  sacrifier — le brief de design en est simplifié d'autant.
- ATTENTION: Effet visuel à valider : les lignes de classement portant une bannière passent de 5:1 à 4:1,
  soit **environ 22 px plus hautes** sur un écran de 480 px.

[fait] Format unique documenté en tête de [`bannerUtils.ts`](../../src/lib/utils/bannerUtils.ts), les
deux ratios exportés en constantes, zone sûre expliquée.
[fait] `aspectRatio` **supprimé** — configuration morte qui annonçait un ratio qu'aucun asset ne respectait.
[fait] `resolveBannerId` corrigé : la bannière **équipée** l'emporte sur l'attribution par pseudo. Sans
ça, un créateur n'aurait jamais pu équiper autre chose que sa bannière de créateur.

BUG: Trois incohérences empilées :
- [`ProfileBanner.module.css`](../../src/components/common/ProfileBanner.module.css) affiche en **4:1**,
  [`PlayerBanner.module.css`](../../src/components/common/PlayerBanner.module.css) en **5:1** -> la même
  image est croppée différemment selon l'écran.
- Les 4 assets existants sont en 2.13:1, 2.96:1, 2.95:1 et 5:1. **Aucun n'est au ratio annoncé.**
- Le champ `aspectRatio` du catalogue de bannières **n'est lu nulle part** — c'est de la config morte.
- Le commentaire du fichier annonce « affichées en entier, jamais croppées » alors que les deux CSS utilisent `object-fit: cover`.
- **Fini quand :** un format unique documenté (voir [À toi de jouer](#à-toi-de-jouer)), `aspectRatio`
  supprimé ou réellement utilisé, et les deux composants d'accord sur la zone montrée.

### 2.9 [fait] Réversibilité des octrois — *20 août 2026*
Demandé par Sacha : pouvoir **tester une clôture de saison sur les vraies données et revenir en
arrière dix minutes plus tard**. Sans marche arrière, une opération irréversible sur 141 comptes
est intestable — et une opération jamais testée est une opération qui casse le jour J.

[fait] `revokeGrant(userId, grantId)` et `revokeBySourceRef(sourceRef)` dans
[`grant.ts`](../../src/lib/collection/grant.ts).
- Chaque octroi porte le `sourceRef` de son opération (ex. `season_0_close`) -> on retrouve
  exactement ce qui a été distribué, et rien d'autre.
- ATTENTION: **La subtilité qui rend ça correct** : `GrantRecord.duplicate` mémorise si le joueur possédait
  déjà l'item avant l'octroi. Révoquer un octroi « doublon » ne retire **pas** l'item — le joueur
  l'avait avant, il n'y est pour rien.
- Un item retiré est aussi **déséquipé**, sinon le joueur afficherait un cosmétique qu'il ne
  possède plus.
- [fait] 8 tests sur la logique de décision ([`grant.test.ts`](../../src/lib/collection/grant.test.ts)),
  dont un qui documente le piège des packs : deux ouvertures **doivent** porter un `sourceRef`
  distinct, sinon la seconde est vue comme un rejeu et ignorée.

### 2.10 [fait] Système de personnalisation générique + page Collection — *20 août 2026*
Demandé par Sacha : « il faut créer le système de perso entier et ensuite me dire ok maintenant on
va remplir le catalogue de bannières » + « un endroit où je peux voir tout le catalogue des items ».

[fait] **Registre de types** [`itemTypes.ts`](../../src/lib/collection/itemTypes.ts) — le point
d'extension du système. Chaque type déclare son libellé, s'il fait partie de la figurine, s'il est
optionnel, s'il est tintable, comment le prévisualiser, et s'il est **déjà exploitable**.
> **Ajouter un collectable = ajouter une valeur au type + une entrée au registre. C'est tout.**
> Aucun `if (type === 'banner')` n'existe ailleurs dans le code.

[fait] **Rareté** [`rarity.ts`](../../src/lib/collection/rarity.ts) — couleurs et libellés des 4 tiers.
Le légendaire est en jaune, conformément au doc 10 (« le jaune réservé à premier / important »).

[fait] **Page [`/collection`](../../src/app/collection/page.tsx)** : tout le catalogue, groupé par type,
avec compteur de progression. Les items **non possédés sont visibles mais désaturés** — voir ce
qu'il reste à débloquer est ce qui donne envie de jouer. Équipement d'un clic.
- Les 5 slots de figurine sont **déjà déclarés** et affichés « Bientôt » : le jour où l'avatar 2D
  arrive, il apparaît tout seul.
- Un type non disponible n'est pas équipable — équiper un maillot invisible n'aurait aucun sens.

[fait] **`BannerPicker` supprimé** au profit de la page Collection. Deux interfaces pour équiper le même
item, c'était deux comportements à maintenir en accord. Le profil renvoie vers `/collection`.

### 2.11 [fait] Type `title` + filtre de collection — *20 août 2026*
[fait] **Titres ajoutés comme type d'item.** Sacha les voyait comme un cas à part ; ils sont
structurellement identiques à une bannière (octroyé, possédé, équipé). En faire un cas spécial
aurait signifié un **second système d'inventaire** en parallèle. Coût réel de l'ajout :
une valeur dans `ItemType`, un champ `meta.text`, une entrée de registre, un style de
prévisualisation. **Le registre a tenu sa promesse.**
[fait] **Filtre « Tout le catalogue » / « Ma collection »** sur `/collection`, avec compteur.
[fait] Message explicite si le catalogue est inaccessible, pointant vers le déploiement des règles —
c'était un écran vide et muet, impossible à diagnostiquer.

### 2.12 [fait] Drapeaux de fonctionnalité — le « drop » — *20 août 2026*
Demandé par Sacha : « j'aimerais bien le faire comme étant un drop d'une nouvelle saison. Ce qu'ils
ont actuellement, c'est la V1. Moi je pourrais tester la V2 avec mon compte admin. Et à un moment on
fera le switch. »

[fait] [`src/lib/features.ts`](../../src/lib/features.ts). Chaque fonctionnalité a une **audience** :

| Audience | Qui voit |
|---|---|
| `off` | personne — tout le monde reste sur la V1 |
| `admins` | les 3 créateurs seulement. Test en vrai, sur les vraies données |
| `everyone` | le drop. La V2 devient la V1 |

- [fait] Réglage dans Firestore (`config/features`), **pas dans le code** : faire le drop change un mot
  dans un document, **sans redéploiement**.
- [fait] **Repli asymétrique** : document illisible, absent, réseau coupé -> tout vaut `off`. Un incident
  ne peut jamais exposer une nouveauté par accident, il ramène juste tout le monde au connu.
- [fait] Ce qui est masqué tant que `off` : la page `/collection` (redirection), le lien « Personnaliser »
  du profil, et la lecture de `equipped` dans le profil et les classements. Un joueur en V1 voit
  **exactement** ce qu'il voyait hier.
- [fait] **Un seul drapeau, `v2`, un seul drop.** Toutes les nouveautés visibles sortent ensemble.
- ATTENTION: **Les corrections ne passent PAS par le drapeau** (race ELO, MVP, sécurité, bugs) : ce ne sont
  pas des fonctionnalités, elles s'appliquent à tout le monde immédiatement.
- [fait] [`scripts/set-feature.mjs`](../../scripts/set-feature.mjs) — l'interrupteur.
  `node scripts/set-feature.mjs v2 everyone --apply`
- [fait] **État actuel : `admins`.** Sacha, Robin et Pierre voient la V2. Les 144 autres, non.

### 2.13 [fait] Catalogue déclaratif — *20 août 2026*
Demandé par Sacha : « une fois que je te dis ok, j'ai genre dix bannières, tu peux les mettre
facilement. On ne va pas attendre que je design chaque truc pour continuer le développement. »

[fait] [`scripts/catalog.data.mjs`](../../scripts/catalog.data.mjs) — le catalogue est **un fichier
versionné dans git**, avec des fabriques `banner()` et `title()` pour que chaque entrée tienne en
quelques lignes.
[fait] `npm run catalog:sync` réconcilie Firestore avec ce fichier. **Ajouter dix bannières = dix
entrées + une commande.** Pas de redéploiement.
- Valide avant d'écrire : type, rareté, source, champs obligatoires. Refuse tout en bloc si une
  entrée est invalide, plutôt que d'écrire à moitié.
- **Avertit** (sans bloquer) quand un asset déclaré n'est pas encore sur le disque — c'est le cas
  normal entre le moment où on crée l'entrée et celui où le fichier arrive.
- [bloque] **Ne supprime jamais du catalogue un item déjà possédé par un joueur.** Il deviendrait
  inaffichable dans son inventaire. Le script le signale et le conserve.
- Comparaison canonique (clés triées) : relancer deux fois de suite ne produit aucune écriture.

### 2.14 [fait] Navigation à quatre onglets + fiche d'item — *21 août 2026*

**La barre de navigation passe à quatre destinations**
`Classement | Collection | (+) lancer une partie | Profil`

La page `/collection` existait depuis le 20 août mais n'était atteignable que par un bouton enfoui
dans le profil — autant dire qu'elle n'existait pas. L'onglet **n'apparaît que si la V2 est livrée**
au joueur : la page renvoie vers `/profile` sinon, et un onglet qui rebondit est pire que pas
d'onglet.

**Tranché par Sacha (21/08)** : le bouton d'action est en **deuxième position**, pas au centre.
Il tombe à 37,5 % de la largeur — à portée de pouce, et devant les deux onglets de consultation.
La question du centrage exact ne se pose donc plus.

**Reste orpheline** : la page `/amis` n'est atteignable que depuis le profil, exactement le défaut
qu'on vient de corriger pour la collection. À reprendre le jour où on touchera de nouveau à la barre.

**Fiche d'item — « comment l'obtenir »**

Demande de Sacha du 20 août, jusqu'ici non tenue. Avant : une carte verrouillée était un bouton
**désactivé qui ne disait rien**. Voir ce qu'on n'a pas sans savoir quoi faire pour l'avoir, c'est
de la frustration, pas de la motivation.

- `src/lib/collection/obtention.ts` (+ 13 tests) : `meta.description` du catalogue d'abord —
  c'est de la **donnée**, modifiable sans redéploiement — puis une phrase déduite de la provenance.
- `needsWrittenExplanation()` repère les items dont l'explication manque vraiment : un exploit ou un
  event sans description est **inexploitable** pour le joueur, alors qu'un item de pack se passe très
  bien de la phrase générique.
- `ItemDetailSheet` : feuille ancrée en bas sur téléphone (le pouce atteint le bas, pas le milieu),
  boîte centrée au-delà de 560 px. Fermeture par Échap, par la croix ou par le fond.
- **Un seul geste** : le clic sur une carte ouvre toujours la fiche, possédée ou non. Équiper se
  fait depuis la fiche. Avant, le clic équipait directement et ne faisait rien sur un item
  verrouillé — deux comportements pour un même geste.

**Filtres par type** (demande de Sacha, 21/08) : une rangée de pastilles qui défile —
`Tout · Bannières 2/6 · Titres 0/3 …` — avec le compte possédé sur total. Elle ne propose que des
types **réellement présents au catalogue**, et ne s'affiche pas s'il n'y en a qu'un : un seul
onglet à côté de « Tout » ne filtrerait rien. Rangée défilante et non repliée sur deux lignes,
parce que le nombre de types va grandir et qu'une barre de filtres qui pousse le catalogue hors de
l'écran devient un obstacle.

**Corrigé au passage** : un type sans aucun item au catalogue ne s'affiche plus. La page montrait
cinq sections « Aucun item pour l'instant » (corps, maillot, short, chaussures, chapeau) qui
noyaient les deux vraies. Le badge « Bientôt » reste pour les types qui ont des items mais ne sont
pas encore rendus dans le jeu — eux, il y a de quoi montrer.

**Reste à écrire** : les descriptions des items à provenance particulière, dans le catalogue.
C'est de la donnée, pas du code — `npm run catalog:sync` après édition de `scripts/catalog.data.mjs`.

### 2.15 [fait] Quatre bannières livrées + balayage des emoji — *21 août 2026*

**Les bannières de Sacha** — `dragon`, `hero-planet`, `lake`, `pc`, toutes **exactement 1800 × 400**,
en WebP, entre 47 et 74 Ko. Le brief est respecté à la lettre.

`CreatorV1/V2/V3.png` ont été supprimés du dépôt. Le catalogue et le repli statique de
`bannerUtils` pointaient encore dessus : **la bannière Créateur était cassée** pour ses trois
propriétaires (lechauvepierre, Astroboy, PIGEON ou BAGARRE).

**Ce qui a été fait**
- `creator` repointé sur `hero-planet.webp`. **L'identifiant ne bouge pas** : trois joueurs ont
  déjà l'item en inventaire, changer l'id le leur retirerait. Sacha (= Astroboy) est du lot, donc
  hero-planet s'affiche sur son profil sans octroi supplémentaire.
- `dragon`, `pc`, `lake` ajoutés au catalogue et **synchronisés en production**
  (`node scripts/sync-catalog.mjs --apply` — 3 créations, 1 mise à jour).
- Repli statique de `bannerUtils` réaligné.

**Couleur du pseudo : mesurée, pas devinée.** Luminosité moyenne du tiers gauche, puis application
du voile de 30 % de l'app : dragon 91 → 64, hero-planet 62 → 43, lake 145 → 101, pc 104 → 73
(sur 255). Les quatre restent nettement sous le seuil de lisibilité : **blanc partout**.

⚠️ **PROVISOIRE** — rareté et provenance de `dragon`, `pc` et `lake` posées par défaut
(légendaire / épique / rare, toutes en `pack`). Sacha doit trancher. C'est de la **donnée** :
corriger `scripts/catalog.data.mjs` puis relancer la synchronisation, aucun redéploiement.

**Balayage des emoji** — la règle de `CLAUDE.md` est absolue et **15 fichiers l'enfreignaient** :
`[ok]` / `[echec]` / `[interdit]` / `[actif]` remplacent les pastilles dans les sorties de scripts,
et les emoji décoratifs des commentaires sont retirés. Aucun n'était affiché dans l'interface —
tous en commentaire ou en sortie de console. **`⚠` reste** : c'est le marqueur de point non tranché,
utilisé par `CLAUDE.md` lui-même.

**Dette antérieure repérée, non corrigée** : `statsCalculator.ts` porte 4 `any` et un `let` qui
devrait être `const` (lignes 104, 132, 133, 190, 266). Présent avant ce chantier — matière au bloc 9.

### 4.0 [conception] Packs — décisions du 21 août 2026

> Ce bloc fait foi. Les chantiers 4.1 à 4.5 plus bas datent du cadrage initial et
> sont amendés ici : la monnaie est reportée, le pity disparaît, les doublons s'empilent.

**Décision de Sacha : pas de monnaie pour l'instant.** Le pack EST la récompense, il se gagne en
jouant. Ça simplifie beaucoup et ça ne ferme aucune porte.

#### D'où viennent les packs — corrigé par Sacha le 21/08
**Pas de tirage au sort : un pack toutes les 10 parties jouées.** Lisible, prévisible, et ça
supprime d'un coup le besoin d'un filet de garantie.

**La bonne implémentation n'est pas un compteur qu'on incrémente**, c'est une DÉRIVATION :

```
packsDus    = floor(stats.totalGames / PARTIES_PAR_PACK)
packsAOctroyer = packsDus - user.packsGranted
```

Calculé dans `POST /api/games/[id]/end`, qui existe déjà, tourne côté serveur et exactement une
fois par partie. Aucun cron, aucune Cloud Function.

Pourquoi la dérivation plutôt que l'incrément : elle est **idempotente par construction** et elle
**se répare toute seule**. Une partie manquée, une route rejouée, un correctif de stats — le compte
se remet d'aplomb tout seul. Un compteur incrémenté, lui, dérive et ne se rattrape jamais.

⚠️ **PROVISOIRE — à trancher : le rétroactif.** Il y a **2 382 parties déjà jouées**. Appliquer la
règle à l'historique distribuerait **238 packs d'un coup**, dont 25 pour le plus gros joueur. Trois
options : tout donner (cadeau de lancement, mais la collection se vide le premier jour), partir de
zéro (`packsGranted = floor(totalGames / 10)` posé à l'activation), ou plafonner. Valeur en config.

#### Les doublons — corrigé par Sacha le 21/08
**Un doublon s'empile, il n'est pas évité.** « Au pire il ouvre le pack, c'est un item qu'il a déjà,
bah tant pis […] on peut en avoir plusieurs, comme ça peut-être qu'on mettra un système d'échange
après. »

C'est plus malin que ma proposition : le doublon devient **de la matière à échanger** au lieu d'un
déchet, et ça ne demande **aucune monnaie**. Le tirage reste simple — on pioche dans tout le pack,
sans tenir compte de ce qui est déjà possédé.

[fait] `quantity` sur `users/{uid}/inventory/{itemId}`, avec `readQuantity()`, `grantAddedACopy()`
et `afterRemovingOneCopy()` — trois fonctions pures, 12 tests. La révocation **dépile** au lieu de
supprimer, et ne retire le document qu'au dernier exemplaire. Les 4 documents antérieurs au 21/08
n'ont pas le champ : ils valent un exemplaire, jamais zéro. La pastille « x3 » n'apparaît qu'à
partir du doublon.

#### L'animation
Trois temps : le pack se charge, rupture, révélation. La couleur de charge est celle de la
**meilleure rareté possible du pack**, pas celle tirée — sinon on vend la mèche avant l'ouverture.
Le légendaire casse la règle et passe plein écran, même principe que pour les bannières.
**Sautable au premier tap.** C'est la vingtième ouverture qui décide, pas la première.
`lottie-react` et le `soundManager` sont déjà en place : le coût n'est pas technique, c'est
**produire les fichiers Lottie**.

#### ⚠️ Conséquence de sécurité, à ne pas manquer
`games` est aujourd'hui `allow read, write: if isSignedIn()` : n'importe quel joueur connecté peut
fabriquer une partie. Aujourd'hui ça ne rapporte que de l'ELO, déjà écrit côté serveur. **Le jour
où terminer une partie fait tomber des packs, cette faille devient farmable.** Le chantier 0.5
(durcir les règles de `games`) passe de « dette » à **prérequis des packs**.

### 4.6 [fait] Voie d'acquisition par item + onglet Packs + animation — *21 août 2026*

**La voie d'acquisition est de la DONNÉE, portée par chaque item** (`obtention` sur `CatalogItem`) :

```
obtention: { pack: true }                                          -> tirable
obtention: { pack: false }                                         -> prestige, hors d'atteinte
obtention: { pack: false, season: { id, grade: 'or' } }            -> à la clôture, au grade Or
obtention: { pack: false, season: { id, participation: true } }    -> à tout participant
```

`pack: false` est le défaut. **On n'ouvre jamais une porte par omission** : un item de prestige
distribué par erreur dans un pack ne se rattrape pas. Le repli des items catalogués avant le 21/08
ne rend tirable que ceux dont la provenance est explicitement `pack`.

`lib/collection/packPool.ts` (+ **24 tests**) : `readObtention`, `isPackEligible`, `buildPackPool`,
`weightOf`, `drawFromPool` (aléa **injecté**, donc reproductible et prêt pour le serveur),
`rarityOdds`, `seasonGradeAwards`, `seasonParticipationAwards`.

Le POIDS ne dépend que de la rareté — une seule table (`POIDS_PAR_RARETE`), pas un réglage par item
à maintenir à cent entrées. ⚠️ PROVISOIRE, à calibrer sur de vrais joueurs.

**Chances actuelles** avec les 7 bannières tirables : commun 57,1 % · rare 35,7 % · épique 5,7 % ·
légendaire 1,4 %.

**Catalogue peuplé** — 16 items, tous 1800 x 400. Les cinq bannières de grade de la saison 0 sont
en place et rattachées :

| Fichier | Grade |
|---|---|
| `s0-silver` | Argent |
| `s0-gold` | Or |
| `s0-diamond` | Diamant |
| `s0-emerald` | **Master** |
| `s0-grand-master` | Grand Master |

`emerald` n'est pas un nom de palier, mais c'est la seule affectation possible : cinq fichiers,
cinq grades, et les quatre autres sont sans ambiguïté. Confirmé par Sacha le 21/08 (« emerald,
ce n'était pas diamant »). **Seul `pionnier-s0.webp` manque encore.**

**Couleur du pseudo : blanc sur les quatorze bannières**, mesuré tiers gauche puis voile de 30 %.
Deux sont à surveiller si le voile venait à baisser : `s0-silver` (135) et `distortion` (123),
contre un seuil de bascule à 140.

**Cadenas, et le gris REVIENT.** J'avais retiré la désaturation en pensant qu'un item en couleur
donnerait plus envie. Sacha a tranché l'inverse le 21/08, pour une raison que je n'avais pas
anticipée : **sans le gris, il n'avait pas compris que les cartes étaient cliquables.** Le contraste
entre débloqué et verrouillé est ce qui signale qu'il se passe quelque chose au clic. La couleur
reste pleine dans la FICHE, où elle a toute la place.

**Leçon** : j'ai jugé sur l'esthétique d'une carte isolée, pas sur ce que la grille COMMUNIQUE.
Une différence visuelle forte porte souvent une information d'usage, pas seulement du style.

**Onglet Packs** dans la collection. Il affiche le nombre de packs (zéro), la règle, et les chances
par rareté. Il existe **avant** les packs pour deux raisons : Sacha y teste les animations, et le
jour où ils tombent il n'y a plus de navigation à retoucher.

**Test d'animation — réservé aux 3 admins.** Cinq boutons : tirage réel, ou forcer chaque rareté.
Rien n'est octroyé, l'animation seule est jouée.

**L'animation** (`PackOpening.tsx`) — trois temps : charge (le halo grandit, c'est lui qui fait
monter la tension, la secousse seule reste plate), rupture, révélation. La couleur de charge est
celle de la **meilleure rareté possible**, jamais celle tirée — sinon on vend la mèche. Le
légendaire **casse la règle** et déborde en rayons plein écran.
**Sautable au premier tap** : c'est la vingtième ouverture qui décide.
`prefers-reduced-motion` respecté. Le composant **ne tire rien** : il reçoit l'item déjà décidé,
parce que le tirage appartiendra au serveur.

### 9.32 [fait] Le chronomètre était illisible — *22 août 2026*

Capture de Sacha à l'appui : `01:38` en **blanc sur le tableau de score CRÈME**, et « ne compte pas
au classement » cassé en trois lignes fantômes.

**Cause** : j'ai utilisé `--color-text-primary` (blanc) et `rgba(255,255,255,…)` en croyant que le
bloc était posé sur le fond terrain. Il est posé sur `--color-surface`, qui est crème.

- Couleurs reprises sur les tokens de fond clair
- Chrono à **2,2 rem** — c'est un mode chrono, le temps est l'information principale de l'écran,
  pas une décoration à côté du score
- `min-width: 5.5rem` sur la colonne, sinon « 06:00 » se comprime
- « Hors classement », sur **une seule ligne**

**Animation de bonus ajoutée** : « +30 s » monte et s'efface à chaque but. Sans elle, on voit le
chronomètre REMONTER sans comprendre pourquoi — c'est exactement ce que Sacha a constaté.
Réalisée **sans aucun état** : l'élément porte `key={goalCount}`, donc chaque but le remonte et
rejoue l'animation. Un `useState` dans un effet aurait provoqué des rendus en cascade, que React 19
refuse à juste titre. Un repère pris au montage évite de rejouer le bonus après un rafraîchissement.

### 9.33 [fait] Lenteurs : `getUserGames` ignorait sa limite — *22 août 2026*

Sacha : « parfois c'est un peu lent partout dans l'application ». Mesuré plutôt que supposé.

```
getUserGames(userId, limitCount)
  -> where('playerIds','array-contains',userId)   // AUCUNE limite
  -> getDocs()                                    // tout télécharger
  -> .slice(0, limitCount)                        // couper APRÈS
```

Le paramètre ne servait à rien côté réseau. Mesures de production :

| | |
|---|---|
| Documents `games` | **980**, 3,2 Ko en moyenne |
| Téléchargé à l'ouverture d'un profil | jusqu'à **892 Ko** |
| Profil de Sacha | **804 Ko** |
| Appel de `ProfileContent` | `getUserGames(uid, 200)` |
| Appel de la page de résultats | `getUserGames(hostId, 50)` |

Le commentaire d'origine disait « sans orderBy pour éviter un index composite ». **L'index évité
coûtait 890 Ko à chaque ouverture de profil.**

[fait] Requête avec `orderBy('startedAt','desc')` + `limit()`, **et un repli** sur l'ancien chemin
si l'index n'existe pas encore (`failed-precondition`). Aucune fenêtre de casse pendant la
construction de l'index, qui prend plusieurs minutes.

**L'index est en place et READY** (vérifié le 22/08 via l'API). Le chemin rapide est actif, le
repli ne sert plus. Le compte de service ne peut toujours pas CRÉER d'index, mais il peut les lire.

**Gains réels, mesurés sur les quatre plus gros joueurs :**

| Page | Avant | Après |
|---|---|---|
| Résultats de partie (`50`) | 805 Ko | **314 Ko** (−61 %) |
| Profil (`200`) | 805 Ko | 718 Ko (−11 %) |

La marge de sécurité est passée de `limitCount × 2 + 10` à `limitCount + 30` : `status` étant
désormais filtré côté serveur, il ne reste que les parties avec invités à écarter ici.

⚠️ **Le profil reste lourd, et c'est inhérent** : il demande **200 parties** parce que les badges
se calculent sur tout l'historique. Passer à 100 le ferait tomber à **482 Ko** (−33 %), et tous les
seuils de badges (20, 25, 30 parties) resteraient satisfaits — mais les statistiques porteraient
alors sur les 100 dernières parties au lieu de la carrière entière. **C'est un changement de SENS,
pas d'optimisation : à Sacha de trancher.**

#### Autre poste mesuré, non corrigé
`/leaderboard` lit **les 141 documents users, soit 225 Ko**, parce que `eloHistory` (jusqu'à 192
entrées) et `stats.history` (jusqu'à 80 jours) vivent DANS le document. Firestore ne sait pas
projeter des champs : on ne peut pas demander « juste le pseudo et l'ELO ».

C'est exactement le point ⚠️ D7 / chantier 1.4. **Chiffré le 22/08**, ce qui manquait pour décider :

| Dans les 141 profils | Poids | Part |
|---|---|---|
| `eloHistory` | **101 Ko** | **43 %** |
| `history` (un point par jour) | 60 Ko | 26 % |
| Tout le reste | 72 Ko | 31 % |
| **Total** | **234 Ko** | |

**Plafonner à 50 entrées ne rapporte que 12 %** (234 -> 205 Ko) : la plupart des joueurs ont déjà
moins de 50 entrées, seuls quatre gros joueurs dépassent. Le plafond soigne l'exception, pas la
règle.

**Sortir `eloHistory` en sous-collection rapporte 43 %** (234 -> 133 Ko), parce que le classement
n'en a AUCUN besoin : il lui faut un ELO et un pseudo. `history` (quotidien), lui, doit rester —
c'est lui qui alimente les flèches d'évolution hebdomadaire.

**Ma recommandation : la sous-collection.** `peakElo` est déjà un champ à part, donc plus rien
d'essentiel ne dépend du tableau. Reste à vérifier ce que la page de profil en fait avant de
bouger.

### 9.34 [fait] Débordements du tableau de score + place au classement — *22 août 2026*

**Le tableau débordait et coupait son contenu.** `.centerInfo` était en `flex-shrink: 0` avec un
bouton « FINIR LE MATCH » qui revenait à la ligne : la rangée dépassait la largeur du tableau, et
`overflow: hidden` rognait ce qui sortait — scores compris.

- Le bouton reste sur **une seule ligne** (`nowrap`), et prend toute la largeur de sa colonne
- La colonne centrale s'ajuste à son contenu, avec un **plafond à 48 %** pour ne jamais avaler les scores
- Les pseudos d'équipe se coupent proprement (`ellipsis`) au lieu de pousser la colonne
- Sous 380 px, le bouton réduit sa taille plutôt que de revenir à la ligne
- `overflow: hidden` ajouté sur les colonnes d'équipe : dernier rempart

**Place au classement sur le profil** — `1215 Elo – Master III – #21`.

`getPlayerRank` utilise **`getCountFromServer`** : la place est « combien de joueurs ont un meilleur
ELO, plus un », et la réponse tient dans un entier calculé côté Firestore. L'alternative — charger
le classement pour y chercher sa ligne — coûterait **225 Ko** pour afficher « #21 ».

Les deux filtres reprennent exactement la définition du classement, sinon les **27 comptes à zéro
partie** décaleraient toutes les places.

⚠️ **Demande un index composite** sur `users` : `stats.elo` + `stats.totalGames`. Décrit dans
`firestore.indexes.json`. Tant qu'il n'existe pas, **la place ne s'affiche pas du tout** — mieux
vaut ne rien montrer qu'un rang faux.

### 9.35 [audit] Tous les appels Firestore passés en revue — *22 août 2026*

Balayage de chaque `getDocs` / `onSnapshot` / `getCountFromServer` du dépôt : **33 appels**.

**Corrigé** : `getUserGames` (voir 9.33).

**Le poste lourd qui reste — classement filtré par stade.** `getVenueLeaderboard` et
`getFriendsLeaderboard` (avec un stade) lisent **toutes les parties terminées du stade** pour
agréger les statistiques, parce qu'il n'existe aucune stat par stade sur le profil joueur.

Ce n'est pas un oubli de `limit()` : l'agrégation a réellement besoin de toutes les parties. Le
corriger demande de **stocker des stats par stade sur l'utilisateur**, donc un changement de modèle
de données — hors périmètre aujourd'hui, mais à garder en tête si un stade devient dominant.

**Le reste est sain** : lectures de documents uniques, listes bornées par nature (inventaire,
packs, catalogue, amis), ou requêtes déjà limitées.

### 9.36 [fait] Classement par stade : 1 055 Ko -> 0 — *22 août 2026*

Idée de Sacha : « c'est un peu con, on peut juste enregistrer le nombre de parties jouées à ce
stade ». Exactement.

L'ancienne version relisait **toutes les parties terminées du stade** pour les additionner à
l'affichage. Mesuré en production : **1 055 Ko** pour le stade le plus fréquenté (310 parties),
**à chaque ouverture**.

- `lib/game/venueStats.ts` (+ **13 tests**) : la règle d'accumulation, pure
- La fin de partie tient `stats.venues[venueId] = { games, wins, goalsScored }`
- `getVenueLeaderboard` lit désormais **la même requête que le classement général** — la page n'a
  plus qu'un seul jeu de données à charger, quel que soit le filtre
- `npm run venues:backfill --apply` reconstitue l'historique : **92 profils** mis à jour à partir de
  556 parties retenues. Rejouable sans risque, le calcul remplace la carte au lieu de l'incrémenter

**Coût de la solution : 7,8 Ko au total, soit 86 octets par joueur.** Sept stades, la carte reste
minuscule.

### 9.37 [fait] Deux textes illisibles et un bouton cassé — *22 août 2026*

**Le bouton « FINIR LE MATCH » sortait de son propre cadre.** `width: 100%` lui donnait la largeur
de la colonne — plafonnée à 48 % — pendant que son texte en `nowrap` la dépassait. Il se dimensionne
maintenant sur SON CONTENU (`width: max-content`), et c'est la colonne qui s'adapte : les colonnes
d'équipe, en `flex: 1 1 0`, cèdent la place.

**« Êtes-vous sûr de vouloir revenir en arrière ? » était en blanc sur crème.** `.modalBody` ne
posait aucune couleur : le texte héritait du blanc de la page, qui est sur fond terrain.

**C'est le même défaut que le chronomètre la veille.** Règle à retenir : **tout bloc clair posé sur
une page sombre doit reposer sa couleur de texte.** L'héritage joue contre nous à chaque fois.

### 9.38 [fait] Un titre ne pouvait pas être équipé — *22 août 2026*

« Type d'item inconnu : title » au moment d'équiper. La route `POST /api/inventory/equip` portait
une liste de types **écrite en dur** qui avait oublié `title` :

```ts
const VALID_TYPES = ['corps', 'maillot', 'short', 'pieds', 'chapeau', 'banner'];
```

**C'est exactement ce que le registre `ITEM_TYPES` existe pour éviter.** Son en-tête promet
qu'ajouter un type de collectable ne demande QU'UNE entrée de registre. Une liste recopiée ailleurs
annule la promesse, et l'oubli ne se voit qu'à l'usage — ici, un item qu'on peut gagner, voir et
posséder, mais pas porter.

[fait] `VALID_TYPES` et `REMOVABLE_TYPES` sont **dérivés du registre**. Un nouveau type devient
équipable sans qu'on touche à ce fichier.

**Leçon** : chaque fois qu'une liste de types apparaît quelque part, c'est une copie du registre
qui finira par diverger. Il faut la dériver, pas la maintenir.

### 9.39 [fait] Deux finitions sur les titres — *22 août 2026*

- **La fiche affichait le titre en blanc sur crème.** La vignette de la carte a un fond SOMBRE, la
  fiche un fond CLAIR : la même règle de couleur ne pouvait pas valoir pour les deux. Encore le
  même défaut que le chronomètre et la fenêtre de confirmation — un bloc clair sur une page sombre.
- **Champion et Podium expliquent leur attribution**, et la phrase est **dérivée de la règle**
  (`rankRange`), pas recopiée à la main. Si les bornes changent, la phrase suit. Une description
  écrite en dur finit toujours par mentir.

### 1.4 [fait] D7 — `eloHistory` supprimé, pas déplacé — *22 août 2026*

**Résultat : les 141 profils passent de 234 Ko à 133 Ko (−43 %).** C'est ce que le classement
télécharge à chaque ouverture.

#### La solution n'est pas celle que j'avais proposée
J'avais recommandé une sous-collection. En cherchant **qui lit vraiment** ce tableau, il s'avère
que personne n'en a besoin :

| Ce qu'on croyait en dépendre | La réalité |
|---|---|
| Le graphique d'ELO du profil | recalculé **depuis les parties** (`statsCalculator`) |
| Les flèches d'évolution du classement | lisent `stats.history`, le point quotidien, qui reste |
| Le pic d'ELO | **une seule valeur**, qui tient dans un champ |

Une sous-collection aurait donc créé une structure à maintenir pour une donnée que rien ne lit.
**On la supprime.**

#### Le piège, et comment il a été évité
**140 profils sur 141 n'avaient AUCUN champ `peakElo`** : le tableau en était la seule source.
Supprimer d'abord aurait effacé le pic de presque tout le monde.

D'où **deux phases séparées** dans `scripts/migrate-elo-history.mjs`, et un garde-fou : la phase de
purge REFUSE de s'exécuter tant qu'un seul profil a un pic non sauvé.

1. `--phase peak --apply` -> 140 pics reconstitués et écrits
2. `--phase purge --apply` -> 113 tableaux supprimés, 101 Ko libérés

Vérifié après coup : **0 profil sans `peakElo`, 0 profil portant encore un `eloHistory`**.

#### Côté code
`LadderStats` ne porte plus d'historique, `applyGameToLadder` n'en écrit plus, et la route de fin
de partie calcule le pic précédent à partir du seul champ `peakElo`.

`resolvePeakElo` garde son repli défensif sur le tableau : inutile aujourd'hui, gratuit, et il
protégerait un profil qui aurait échappé à la purge.

### 9.40 [essai] Les bannières pendant le match — *22 août 2026*

Sacha voulait essayer malgré mon avis réservé. En cherchant où les poser, son idée s'est révélée
meilleure que ce que j'avais compris : **les boutons de but sont PAR JOUEUR**, pas par équipe. La
bannière de quelqu'un sur son propre bouton, ça a du sens.

**Posées sur l'écran de choix du buteur**, et là seulement. C'est le compromis qui lève mon
objection : à cet instant on CHOISIT, on ne tape pas dans l'urgence. Les boutons de position et de
type de but, eux, restent unis — c'est là qu'un mauvais appui coûte un but.

**Zéro requête supplémentaire.** La page chargeait déjà le document de chaque joueur pour son ELO
et jetait tout le reste ; on garde `equipped` et `bannerId` au passage.

Trois précautions, parce qu'un bouton mal lu pendant un match coûte cher : le voile de la bannière
garde le pseudo lisible sur n'importe quelle image, le contenu passe au-dessus, et
`background-origin: border-box` évite que l'image s'arrête avant le contour (défaut déjà corrigé
sur `PlayerBanner` le 21/08).

**Deux poses ratées avant la bonne, et les captures de Sacha les ont tranchées :**

1. *Sur les boutons de l'écran « qui a marqué ? »* — en **1v1 cet écran n'apparaît jamais**, le code
   saute le choix du buteur quand une équipe n'a qu'un joueur. Invisible dans le cas le plus courant.
2. *En bandes fines sous le score* — **rognées par le tableau de score**, qui a une hauteur
   contrainte en paysage et un `overflow: hidden`. Illisibles, et elles débordaient.

**La bonne pose : les gros boutons de but.** Ils sont **par joueur** en 1v1 comme en 2v2, toujours
visibles, et assez grands. C'était l'idée d'origine de Sacha — j'avais mal compris qu'ils étaient
déjà individuels.

**La couleur d'équipe reste dominante** : le voile n'est pas noir mais teinté de la couleur de
l'équipe (`color-mix`). Pendant un match, on doit savoir **pour qui on marque** avant de savoir qui
est sur la photo. C'est la seule raison pour laquelle ce bouton peut porter une image sans devenir
dangereux.

**Réversible en une classe CSS** si le rendu ne convainc pas.

### 5.6 [fait] `PlayerRow` — la ligne de joueur devient un vrai composant — *22 août 2026*

Sacha : « pourquoi le lobby n'utilise pas exactement le même composant que dans le classement ? »
**Réponse honnête : parce qu'il n'y en avait pas.**

`PlayerBanner` ne donnait que la FORME — la boîte, le ratio, le fond. Ce qu'on met dedans était
réécrit à la main dans chaque écran, et chacun oubliait quelque chose : l'ELO ici, le titre là, le
grade ailleurs. C'est exactement pour ça que le même défaut est réapparu trois fois en deux jours.

`PlayerRow` porte désormais le CONTENU : avatar du grade, pseudo, titre, ELO, **et la place au
classement**. Un écran qui l'utilise ne peut plus rien oublier.

**CINQ écrans unifiés** : préparation des équipes, liste d'attente, choix du buteur, les gros
boutons de but pendant le match, et l'écran de fin de match. Une seule variante, `size="large"`,
qui grossit le pseudo en match — on y lit de loin et de travers.

Sur l'écran de résultats, la carte se scinde en deux blocs : **la bannière porte l'identité, un
bloc crème porte les chiffres.** Les mélanger reviendrait à remettre des statistiques sur une
image — le défaut qu'on passe notre temps à corriger.

#### Le grade était encore faux en match, et pour une raison bête
La page passait **deux objets distincts** — un pour l'ELO, un pour les cosmétiques — et celui des
cosmétiques ne portait pas l'ELO. Tout le monde s'affichait donc au même grade.

Deux sources pour la même chose finissent toujours par diverger. `GameBoard` utilise désormais
`usePlayerProfiles`, exactement comme le lobby : **il n'y en a plus qu'une**, et la page ne charge
plus rien elle-même.

**Le format est respecté d'office**, en 1v1 comme en 2v2 : le ratio vient de `PlayerBanner`, plus
personne ne le recopie. Le bouton de but n'est plus qu'une enveloppe sans forme propre.

**Plus de voile teinté sur la bannière.** Sacha trouvait le fond bleu « bizarre » — il salit
l'image sans rien apprendre. C'est le CONTOUR, épais, qui dit l'équipe. Et `background-color` sur
la carte couvre le cas sans bannière : avec une bannière, `.wrap.hasBanner` l'emporte et laisse
passer l'image. Un seul jeu de règles pour les deux cas.

**Les grades sous le score sont retirés** : ils faisaient doublon avec les cartes, et le tableau de
score est l'endroit le plus contraint de l'écran.

#### Le garde-fou a failli disparaître sans bruit
`npm run check:banner` ne connaissait que `<PlayerBanner`. En passant par `PlayerRow`, le contrôle
serait tombé de 4 pages à 3 **sans qu'aucun test n'échoue** — une indirection suffit à faire
disparaître un garde-fou. Il couvre maintenant les deux, et vérifie **6 pages**.

### 9.42 [fait] Un `@media` vide cassait l'analyse CSS — *22 août 2026*
En supprimant des règles mortes par expression régulière, j'ai laissé un bloc `@media` sans contenu.
Next refuse de compiler un sélecteur vide. **Troisième fois** que le nettoyage automatique de CSS
me joue ce tour : le contrôle de validité CSS le rattrape à chaque fois, il fait maintenant partie
du passage obligé après toute suppression de règles.

### 9.41 [fait] Le lobby n'affichait ni le bon grade ni la bonne bannière — *22 août 2026*

**Deux composants, pas un.** J'ai d'abord corrigé `PlayerList` (la liste d'attente d'une session),
alors que l'écran de Sacha était `TeamSetup` (« Préparation des équipes »). Sa capture l'a montré :
mes corrections étaient réelles mais posées à côté. **Les deux sont corrigés.**

`TeamSetup` était le pire des deux : il passait encore par `bannerUtils`, l'**ancien chemin
statique** — attribution de bannière par pseudo, sans catalogue, sans `equipped`.

Trois défauts, identiques dans les deux composants :

| Symptôme signalé | Cause |
|---|---|
| « ce n'est pas les bons grades » | `<RankAvatar size="md" />` **sans `elo`** : tout le monde au même grade |
| « ce n'est pas ma bannière exacte » | `<PlayerBanner username={…} />` **sans `bannerId` ni `equipped`** : l'ancienne attribution par pseudo au lieu de la bannière équipée |
| « ce n'est pas le bon format » | les places LIBRES avaient leur propre rembourrage et arrondi, plus petits que les places occupées |

**Une seule cause de fond pour les deux premiers** : une partie ne stocke que l'identité des
joueurs (`userId`, `username`). L'ELO, la bannière et le titre vivent sur leur profil, et personne
n'allait les chercher.

[fait] `usePlayerProfiles` — un accès partagé qui charge le strict nécessaire pour AFFICHER une
liste de joueurs. Trois écrans ont ce besoin ; chacun l'avait résolu à sa façon, ou pas du tout. Un
seul point d'entrée évite qu'un quatrième écran oublie l'ELO à son tour.

Le lobby affiche désormais la même chose que le classement : bannière équipée, grade réel, pseudo,
**titre**, et ELO.

### 9.43 [fait] Une media query ne voit JAMAIS un conteneur pivoté — *23 août 2026*

**Le piège qui a coûté le plus de temps de tout le projet.** Une dizaine d'allers-retours avec
Sacha, dont plusieurs où il constatait « rien n'a changé » alors que le code était bon et servi.

Le mode « rotation forcée » tourne le CONTENU à 90° avec `transform: rotate(90deg)`, mais le
téléphone reste tenu **droit** : la fenêtre fait toujours 390 × 844.

Conséquence, contre-intuitive mais absolue :

| Ce qu'on croit mesurer | Ce qui est réellement mesuré |
|---|---|
| `@media (max-height: 500px)` | la **fenêtre**, 844 px -> ne s'applique jamais |
| `@media (orientation: landscape)` | l'orientation de l'**appareil**, portrait -> jamais |
| `100vh` / `100dvh` à l'intérieur | la hauteur de l'**écran**, pas celle du conteneur |

Une transformation CSS ne change **rien** à ce que voient les media queries ni les unités
d'écran. Elles décrivent la fenêtre, jamais un élément.

**Ce qui marche dans un conteneur transformé**
- les **pourcentages**, qui se mesurent sur le parent ;
- les **container queries** (`cqw`, `cqh`), qui se mesurent sur un ancêtre désigné ;
- les **classes**, posées par le composant qui connaît son mode.

[fait] `ChronoBar.module.css` n'a plus aucune media query : ce composant ne sert que dans l'écran
de match, qui est toujours en paysage. Ses règles valent donc toujours.

⚠️ **Restent cinq media queries de hauteur dans `GameBoard.module.css`** (lignes 91, 97, 1197,
1664, 1668). Elles ne portent que des écarts et des marges, donc leur inefficacité en rotation
forcée est sans conséquence visible — mais elles sont trompeuses et devraient disparaître.

**Leçon générale** : dans cette application, tout ce qui dépend de la fenêtre est faux dès qu'on
entre dans l'écran de match. Il faut raisonner en proportions du conteneur, jamais en dimensions
d'écran.

### 7.12 [fait] Tournois hors ELO, packs pour les modes chrono — *23 août 2026*

Deux décisions de Sacha, le même jour.

#### Un match de tournoi ne compte plus pour l'ELO
Les affiches y sont **imposées par le tirage**, pas choisies : on peut tomber sur le meilleur
joueur au premier tour. Faire peser ça sur le classement général pénaliserait la participation —
exactement ce qu'un tournoi cherche à encourager.

Les **packs tombent normalement** : la partie a bien été jouée.

#### Chrono et Blitz rapportent des packs
Et le **seuil de six buts ne s'y applique pas** : une partie au chronomètre se termine souvent à
3-2, exiger six buts les priverait presque toujours de récompense.

C'est la **durée** qui protège du farm dans ces modes : on ne finit pas un blitz de deux minutes en
moins de deux minutes. Le seuil de buts reste en vigueur pour les modes sans chronomètre, où rien
n'empêche d'enchaîner des 1-0.

#### La matrice, à jour

| | Classement | Packs | Statistiques |
|---|---|---|---|
| Normal | Général | oui | oui |
| **Bibitif** | — | **non** | **non** |
| **Chrono** | — | **oui** | non |
| **Blitz** | Blitz | **oui** | oui |
| *Tournoi (tout mode)* | **aucun** | oui | oui |

**Le bibitif reste le seul mode qui ne compte nulle part.** C'est verrouillé par un test.

⚠️ J'ai aligné le **Chrono** sur le Blitz de ma propre initiative : Sacha n'a mentionné que le
Blitz, mais un chrono de six minutes est strictement moins « farmable » qu'un blitz de deux.
L'exclure alors que le Blitz est inclus aurait été incohérent. Un mot suffit à revenir dessus.

### 0.5 [fait] Les règles sur `games` durcies — *23 août 2026*

`games` était `allow read, write: if isSignedIn()` : n'importe quel joueur connecté pouvait écrire
n'importe quoi sur n'importe quelle partie, y compris `eloChanges`.

#### On ne restreint pas QUI écrit, mais QUOI
C'est ce qui permet de fermer la faille sans casser les tournois. Un organisateur écrit
légitimement des parties auxquelles il ne joue pas ; vérifier ça dans une règle demanderait de
remonter au document de tournoi à **chaque écriture**, ce qui ferait exploser le quota de `get()`.

Les champs interdits au client sont ceux que **seul le serveur calcule** :
`eloChanges`, `packsEarned`, `mvpId`, `winner`, `endedAt`, `duration`.

Et `status: 'completed'` est refusé : une partie ne se termine que par la route serveur, qui seule
calcule l'ELO, le MVP et les packs. `abandoned` reste écrivable par le client.

`delete` passe à `false` : une partie terminée est une pièce du classement.

#### Ce que ça ferme
S'attribuer de l'ELO en écrivant `eloChanges` à la main, ou se donner des packs via `packsEarned`.
Combiné à 0.2, **le client ne peut plus toucher à rien de ce qui a de la valeur**.

#### ⚠️ Une page cesse de fonctionner : `/admin/seed`
Elle crée de fausses parties `completed` avec des `winner`, `duration` et `eloChanges` inventés —
exactement ce qu'on vient d'interdire. C'était le seul code client concerné, vérifié champ par champ.

Si des données de test redeviennent nécessaires, il faudra un script admin passant par
`firebase-admin`, comme tous les autres outils du dossier `scripts/`.

### 0.2 [fait] La faille ELO est fermée — *23 août 2026*

`clientMayWriteStats()` est passé à `false`, **déployé et vérifié en service**.

#### Ce qui était ouvert, sur 141 comptes réels
1. n'importe quel joueur connecté pouvait écrire `stats` sur le document de **n'importe qui** ;
2. il pouvait donc s'attribuer l'ELO de son choix depuis la console du navigateur, en trois lignes.

C'était le statu quo de la production depuis le début, pas une régression.

#### Les trois conditions réunies avant de fermer
| | |
|---|---|
| Tout le calcul de fin de partie côté serveur | fait le 20/08 — `POST /api/games/:id/end` passe par `firebase-admin` et ignore ces règles |
| Aucun code client n'écrivant `stats` | **audité le 23/08** : les seules écritures client sur `users` sont le pseudo, l'email, les amis, les stades favoris et les annonces lues |
| La route serveur active en production | **confirmé par Sacha** : une partie terminée met bien l'ELO à jour |

La troisième condition était la seule que je ne pouvais pas vérifier moi-même : les deux serveurs
écrivent dans la même base, impossible de distinguer une partie terminée depuis la production d'une
partie terminée depuis le poste de Sacha.

#### Retour en arrière
Repasser le drapeau à `true`, puis `node scripts/deploy-rules.mjs --apply`. La fin de partie
continuerait de fonctionner — c'est la faille qui se rouvrirait.

**Il reste 0.5** : durcir les règles sur `games`, où n'importe quel joueur connecté peut encore
fabriquer une partie. Sans conséquence tant que rien n'en dépend, mais les packs tombent désormais
à la fin des parties.

### 9.31 [fait] `server-only` remontait jusqu'à un composant client — *21 août 2026*

`readQuantity` avait été posé dans `lib/collection/grant.ts`, qui importe `server-only` parce qu'il
touche `firebase-admin`. La page Collection — composant client — l'a importé pour afficher « x3 »,
et la compilation est tombée.

**Ce qui rend ce défaut vicieux** : ni `tsc --noEmit` ni `npm test` ne le voient. Seuls le build
Next et la compilation à chaud le signalent.

[fait] Les règles d'exemplaires vivent dans `lib/collection/quantity.ts`, sans dépendance serveur.
`grant.ts` les ré-exporte pour que le code serveur garde un point d'entrée unique.

[fait] **Garde-fou** `npm run check:server` : parcourt le graphe d'imports depuis chaque composant
`'use client'` et échoue si l'un atteint un module `server-only`, même indirectement. Il affiche
le chemin complet. Vérifié en réintroduisant volontairement la fuite.

**Règle générale** : ce qui est de la LOGIQUE va hors des modules `server-only`, seul l'ACCÈS y
reste. C'est aussi ce qui rend la logique testable sans Firebase.

### 4.7 [fait] Distribution et ouverture des packs — *21 août 2026*

**Un pack toutes les 10 parties**, sans tirage au sort.

#### La dérivation, pas l'incrément
`lib/collection/packEarning.ts` (+ **20 tests**). On ne compte pas « +1 tous les 10 matchs », on
DÉDUIT le dû du total de parties et on octroie la différence. Idempotent par construction, et ça
se répare tout seul : une partie manquée, une route rejouée, un recalcul de stats — le compte se
remet d'aplomb au match suivant.

**Un repère (`packsBaseline`) était indispensable.** Un test l'a révélé : sans lui, on déduisait le
dû du total ABSOLU, donc un joueur à 259 parties touchait un pack à la partie suivante quand un
joueur à 250 devait en attendre dix. Le repère met tout le monde sur la même ligne de départ.

**La question du rétroactif ne se pose plus.** Les packs se comptent sur `stats.packGames`, un
compteur NEUF qui vaut zéro pour tout le monde. L'historique n'entre pas dans le calcul, sans
qu'aucun réglage soit nécessaire.

#### Protection contre le farm (Sacha, 21/08)
Une partie ne compte pour les packs que si **le gagnant a atteint 6 buts** et qu'**aucun invité**
n'y participe. Enchaîner des 1-0 en dix secondes, ou jouer contre des invités inventés, ne
rapporte rien.

`gameCountsForPacks` — pur, 6 tests. Seuil en constante ⚠️ PROVISOIRE.

**`packGames` est un compteur SÉPARÉ de `totalGames`.** Une partie non qualifiante compte toujours
dans les statistiques et dans l'ELO : elle ne rapporte simplement pas de pack. Mélanger les deux
fausserait le profil du joueur pour une raison qui ne le regarde pas.

C'est **plus efficace et bien moins risqué que de durcir les règles Firestore** : ça ne casse aucun
usage légitime, et ça ne demande aucun audit de `lib/firebase/tournaments.ts`.

#### L'ouverture
`POST /api/packs/open`. L'identité vient du JETON, jamais du corps de la requête : on ne peut
ouvrir que ses propres packs.

**Le tirage est écrit sur le document du pack AVANT tout le reste.** Rafraîchir en pleine animation
retombe sur le même item — impossible de relancer jusqu'au légendaire.

L'octroi se fait après la transaction (`grantItem` a la sienne) et **on le rejoue même sur un pack
déjà ouvert** : si le processus tombait entre les deux, le joueur récupère son item à la tentative
suivante au lieu de le perdre.

#### Règles Firestore, déployées
`users/{uid}/packs` : lecture par le propriétaire, **écriture interdite**. Un client qui pourrait
créer un pack s'en donnerait autant qu'il veut ; un client qui pourrait effacer `openedAt`
relancerait le tirage.

#### Ce que le joueur voit
- **Fin de partie** : un bouton « Pack débloqué » en tête de la page de résultats, avant les gages
  et les stats — c'est la seule chose de cette page sur laquelle il peut AGIR tout de suite.
  Écrit sur la PARTIE (`game.packsEarned`), donc toujours là après un rafraîchissement.
- **Pastille sur l'onglet Collection** de la barre de navigation, alimentée par `packsUnopened` sur
  le profil, déjà suivi en temps réel par le store. **Aucune lecture supplémentaire**, et elle
  disparaît d'elle-même.
- **Pastille sur l'onglet Packs** dans la collection : une fois entré, il faut encore savoir dans
  quel onglet ça se passe.
- **Exemplaires multiples** : le « x2 » se lit **à côté du nom** et non en coin de vignette — c'est
  une propriété de l'item, pas une annotation sur l'image.
- **Onglet Packs** : un bouton par pack, puis l'animation avec l'item réellement tiré.

#### Outil de test
`npm run pack:grant <pseudo> --apply [--nombre N]` — passe par le même chemin que la fin de partie,
donc rien qui puisse diverger du vrai comportement. **3 packs octroyés à Astroboy** pour vérifier
la boucle sans jouer trente parties.

### 7.10 [fait] Modes chrono — *22 août 2026*

Deux modes demandés par Sacha. Ils **changent la nature du moteur** : jusqu'ici un mode ne touchait
ni au score, ni à la fin de partie, ni à l'ELO. C'est le point important de ce chantier.

#### Ce que les deux modes font

| | Chrono | Chrono Blitz |
|---|---|---|
| Temps de départ | **6 min** | 2 min |
| Par but marqué | **+30 s** | +20 s |
| À zéro | celui qui mène gagne | celui qui mène gagne |
| À zéro, égalité | **but en or** (pas de limite) | **+20 s**, et on recommence |
| Compte pour l'ELO | non | non |
| Donne des packs | non | non |

#### Réponse à ta question sur l'unification : oui, c'est déjà le cas
`MODES` est un simple tableau consommé par **sept** fichiers, dont `/game/new` ET `/tournament/new`.
Ajouter un mode au tableau le fait apparaître partout, y compris en tournoi, sans toucher à une
seule page. C'est le point d'extension prévu depuis le bloc 7.

#### Le vrai obstacle : aujourd'hui, RIEN ne termine une partie tout seul

État actuel, vérifié dans le code :
- `GameTimer` compte **vers le haut** et n'est que **décoratif** — rien n'en dépend ;
- la fin de partie est **manuelle** (`confirmEndGame` dans `app/game/[id]/page.tsx`), et l'app
  **refuse l'égalité** ;
- `GameMode` ne porte que des règles **sociales**, avec un garde-fou explicite dans `types.ts` :
  « une partie en mode variante reste une partie NORMALE pour les stats et l'ELO ».

Ce chantier **lève délibérément ce garde-fou**. Il faut le faire dans les données, pas dans du
code conditionnel, sinon chaque nouveau mode deviendra un `if` de plus.

#### Étape 1 — la configuration de temps devient de la DONNÉE

Sur `GameMode`, deux champs optionnels :

```
timing?: {
  baseSeconds: number;        // 480 | 120
  bonusPerGoal: number;       // 10 | 20
  tieBreak: 'golden-goal' | 'extra-time';
  extraSeconds?: number;      // 20, pour 'extra-time'
}
ranked: boolean;              // la partie compte-t-elle au classement ?
```

Un troisième mode chrono se réglera en cinq lignes de données.

#### Étape 2 — un module pur `chrono.ts`, testé

```
remainingSeconds(nowMs, { startedAt, goalCount, extraGranted }, timing): number
isOver(...)          -> le chrono est à zéro
outcomeAtZero(score) -> 'winner' | 'golden-goal' | 'extra-time'
```

**Aucune horloge locale n'est de confiance.** Le temps restant se DÉDUIT de données que tous les
appareils partagent : `startedAt`, le nombre de buts, le temps additionnel déjà accordé. Deux
téléphones autour de la même table affichent alors la même chose, à la seconde près, sans qu'ils
aient à se parler.

#### Étape 3 — qui termine la partie ?

L'**hôte** déclenche la fin quand le chrono atteint zéro ; les autres ne font qu'afficher. Filet de
sécurité : si l'hôte a quitté, n'importe quel participant peut le faire au bout de quelques
secondes. C'est sans danger parce que `POST /api/games/:id/end` est **déjà idempotent** : deux
appels concurrents renvoient le même résultat sans rien recalculer (vérifié).

#### Étape 4 — l'ELO et les packs

`computeGameEloChanges` renvoie des changements vides quand `mode.ranked === false`, exactement
comme il le fait déjà pour les parties avec invités. Un seul point d'entrée, une seule règle.

#### Étape 5 — l'affichage

`GameTimer` apprend à compter à rebours quand le mode a un `timing`. Trois choses à montrer, et
elles comptent autant que la mécanique :
- le temps restant, en évidence ;
- **le bonus au moment où il tombe** (« +10 s ») — sinon le joueur voit le chrono remonter sans
  comprendre pourquoi ;
- **la mention « ne compte pas au classement »**, visible pendant la partie et pas seulement dans
  la fiche du mode. Personne ne lit la fiche avant de jouer.

Le passage sous les 30 secondes et la prolongation méritent un traitement visuel : c'est là que se
joue l'intérêt du mode.

#### Les cinq points, tranchés par Sacha le 21/08

| Question | Réponse |
|---|---|
| Bibitif compte-t-il au classement ? | **Non.** Il devient non classé, comme les modes chrono |
| Bonus par but en prolongation ? | **Non.** Il ne s'applique plus une fois la prolongation entamée |
| Les parties chrono donnent-elles des packs ? | **Non.** Seuls les modes classés en donnent |
| Une pause ? | **Oui**, à faire |
| Seuil des 6 buts en chrono | Sans objet, puisque le chrono ne donne pas de packs |

**Conséquence à ne pas manquer** : bibitif comptait pour l'ELO jusqu'ici. Le déclassement vaut pour
l'AVENIR — on ne réécrit pas l'historique, ce serait retirer de l'ELO à des joueurs pour des
parties qu'ils ont jouées sous une autre règle. `Normal` reste le seul mode classé.

**La règle devient simple et tient en une phrase** : *un mode classé donne de l'ELO et des packs ;
un mode non classé ne donne ni l'un ni l'autre.* Un seul drapeau `ranked` pilote les deux.

#### Idée en réflexion : séparer « Normal » et « Classé » (Sacha, 21/08)
> « J'hésite même à faire un mode normal et un mode classé, et que ce soit que le mode classé qui
> compte pour le classement, mais je ne suis pas sûr. »

**Mon avis : non, pas maintenant.** La base est petite — 141 joueurs, 2 382 parties au total.
Aujourd'hui tout le monde est sur la même échelle et les ELO sont comparables. Scinder en deux
files déplacerait la majorité du volume vers « Normal », qui ne compterait plus : le classement se
viderait au moment précis où on lance la saison 1.

Ça devient une bonne idée **quand le volume le permet** — quand une soirée produit assez de parties
classées pour qu'un classement reste vivant sans elles. À reprendre après la saison 1, avec les
chiffres réels sous les yeux.

#### Ce qui a été livré le 22/08

| Fichier | Rôle |
|---|---|
| `lib/gamemodes/types.ts` | `ModeTiming` + `ranked` sur `GameMode` |
| `lib/gamemodes/modes.ts` | `CHRONO_MODE`, `BLITZ_MODE` — **entièrement en données** |
| `lib/gamemodes/chrono.ts` | calcul pur, **31 tests** |
| `lib/firebase/chrono.ts` | écritures d'état, toutes transactionnelles |
| `components/game/ChronoBar.tsx` | compte à rebours, coup de sifflet, pause |
| `api/games/[id]/end/route.ts` | déclassement ELO et packs |

**Le temps restant est DÉDUIT, jamais décompté.** Plusieurs téléphones regardent la même partie
autour de la table ; si chacun décomptait de son côté, un appareil mis en veille dériverait. La
formule s'applique à des données partagées — coup d'envoi, nombre de buts, prolongations, temps de
pause — donc deux écrans affichent la même seconde sans avoir à se parler. C'est aussi ce qui rend
l'état retrouvable après un rafraîchissement.

**Les écritures sont transactionnelles ET vérifient l'état de départ.** Trois téléphones voient
zéro en même temps : sans le contrôle `expectedPeriods`, chacun accorderait sa prolongation et le
match durerait trois fois trop longtemps.

**C'est l'hôte qui siffle**, les autres regardent. Filet : si l'hôte a quitté la table, un
participant prend le relais au bout de 4 secondes — un match ne doit pas rester bloqué parce que
celui qui l'a lancé est parti aux toilettes.

**Le MVP reste calculé même en mode non classé** : c'est une lecture de la partie, pas une
récompense. Un joueur qui domine un blitz mérite qu'on le voie.

**« Ne compte pas au classement » est affiché PENDANT la partie**, pas seulement dans la fiche du
mode. Personne ne lit la fiche avant de jouer, et l'apprendre après coup est le meilleur moyen de
gâcher un match.

#### [décidé, à faire plus tard] Le Blitz aura son propre classement (Sacha, 22/08)

> « C'est classé, c'est juste tout un autre leaderboard. Le vrai classement qui compte, c'est celui
> du mode normal, il faut dire ça. Le Blitz compte en ELO, mais pas forcément en récompenses ni en
> parties jouées. C'est juste les notions de classement. »

**Décidé sur le principe, pas à faire tout de suite.**

| | Normal | Blitz |
|---|---|---|
| ELO | oui, **le classement de référence** | oui, échelle séparée |
| Packs et récompenses | oui | **non** |
| Compté dans « parties jouées » | oui | **non** |
| Grades et bannières de saison | oui | **non** (sinon il faut doubler les bannières) |

Le Blitz n'apporte donc **que** de l'ELO, sur sa propre échelle. C'est le découpage le plus sobre :
rien d'autre du système ne bouge, et on ne double ni les récompenses ni les statistiques.

**« Le vrai classement qui compte, c'est le mode normal » doit être ÉCRIT dans l'interface**, pas
seulement su. Sans ça, deux classements côte à côte se valent visuellement, et personne ne sait
lequel regarder.

**Pourquoi c'est sans danger, contrairement à l'idée « Normal vs Classé »** : celle-là DÉPLAÇAIT du
volume et aurait vidé le classement principal. Celle-ci en AJOUTE — Normal garde ses 2 382 parties,
le Blitz démarre à zéro à côté.

**Le point de conception à ne pas rater** : ne pas ajouter un champ `blitzElo` à côté de `elo`. Au
troisième classement, trois champs et trois historiques à tenir en accord partout. Il faut une
notion générique :

```
mode.ladder = 'normal' | 'blitz' | null      // null = non classé
stats.ladders = { normal: { elo, peakElo, eloHistory }, blitz: { … } }
```

**L'interface, précisée par Sacha le 22/08**
- **Classement** : deux onglets, Normal et Blitz. Rien de plus.
- **Profil** : la carte principale porte `1215 Elo – Master III – #21`. Le Blitz a **sa propre
  carte, à part entière**, avec la même ligne pour son échelle.
- La place (`#21`) est **déjà livrée** pour le classement normal (voir 9.34) : le jour où le Blitz
  arrive, `getPlayerRank` prendra un identifiant de classement en paramètre et rien d'autre ne bouge.

**À faire après la saison 1** : la migration touche 141 comptes, ce n'est pas à lancer à trois
semaines de l'échéance.

#### Découpage proposé
| Étape | Contenu | Dépend de |
|---|---|---|
| 7.10a | `timing` + `ranked` sur `GameMode`, les deux modes en données | — |
| 7.10b | `chrono.ts` pur + tests | 7.10a |
| 7.10c | Compte à rebours et bonus dans `GameTimer` | 7.10b |
| 7.10d | Fin automatique par l'hôte, prolongation, but en or | 7.10c |
| 7.10e | Déclassement ELO et packs (bibitif inclus) | 7.10a |
| 7.10f | Mise en pause | 7.10b |

7.10a et 7.10b n'ont **aucun risque de régression** : rien ne les consomme tant que 7.10c n'existe
pas. C'est par là qu'il faut commencer.

### 7.11 [fait] Classement Blitz — *22 août 2026*

**Le Blitz apporte de l'ELO, et rien d'autre.** Pas de packs, pas de « parties jouées », pas de
grades ni de bannières de saison — donc aucun asset supplémentaire à produire.

#### Trois drapeaux sur un mode, et pas un seul

| | `ladder` | `rewards` | `countsInStats` |
|---|---|---|---|
| **Normal** | `normal` | **oui** | oui |
| Bibitif | — | non | **non** |
| Chrono | — | non | **non** |
| **Blitz** | **`blitz`** | non | **oui** |

**Tranché par Sacha le 22/08.** Bibitif et Chrono ne comptent **nulle part** : ni classement, ni
pack, ni statistiques. Ce sont des formats libres, ils ne doivent déformer les chiffres de personne.

Le **Blitz est le seul mode qui entre dans les statistiques sans rapporter de pack** : il a une
échelle, donc ses parties comptent — mais deux minutes de jeu ne doivent pas devenir le moyen le
plus rapide d'en farmer.

Seul le mode **Normal** rapporte des packs.

Les trois drapeaux sont donc tous nécessaires, et la matrice est verrouillée par des tests.

Le déclassement du bibitif ne vaut que pour l'AVENIR : les parties déjà jouées restent comptées.
Les décompter reviendrait à retirer des victoires à des gens pour des matchs joués sous une autre
règle.

**Idée notée** : distinguer plus tard les victoires en Blitz des victoires normales dans les
statistiques (Sacha, 22/08). Pas urgent — l'échelle d'ELO fait déjà la séparation.

#### AUCUNE migration, et c'est le point important

J'avais écrit le script de migration, puis je l'ai **supprimé avant de le lancer**.

Il recopiait `eloHistory` dans `stats.ladders.normal`. Or `eloHistory` monte à **192 entrées** sur
les gros joueurs, et le classement lit **141 profils d'un coup** : la migration aurait doublé le
poids des profils, juste après le travail fait pour les alléger.

**Le classement principal EST le jeu de champs historiques** (`stats.elo`, `peakElo`, `totalGames`,
`wins`, `eloHistory`). `stats.ladders` ne contient que les classements SECONDAIRES.

Conséquences : rien à migrer, aucune fenêtre de bascule, aucune source de vérité en double, et
`RankAvatar` / `getRankInfo` / le profil / la page de résultats continuent de fonctionner sans une
ligne de changement.

#### Un effet de bord heureux sur les requêtes
Le rang sur une échelle secondaire ne demande **qu'une seule inégalité** : Firestore exclut d'office
les documents où le champ est absent, donc les joueurs qui n'ont jamais touché au Blitz sortent du
comptage tout seuls. **Aucun index composite à créer**, contrairement au classement général.

#### Livré
- `lib/game/ladders.ts` (+ **22 tests**) : registre, lecture, application d'un résultat, chemins de
  requête. Un troisième classement = cinq lignes de données.
- La fin de partie écrit dans la bonne échelle, et n'entre plus dans les statistiques pour le Blitz.
- `getGlobalLeaderboard(ladder)` et `getPlayerRank(elo, ladder)`.
- **Classement : deux onglets.** Le filtre par stade et le filtre « Amis » disparaissent hors du
  classement de référence : les compteurs correspondants ne sont tenus que globalement, et proposer
  des filtres qui ne s'appuient sur rien serait mentir sur la donnée.
- **La description du classement affiché est ÉCRITE sous les onglets.** Deux onglets côte à côte se
  valent visuellement — sans cette phrase, personne ne sait lequel compte.
- **Profil : une carte Blitz à part entière**, `1150 Elo – Or II – #3`, volontairement plus discrète
  que la carte principale. Elle n'apparaît que si le joueur a joué en Blitz (décision de Sacha).

### 2.16 [fait] Bannières de cercle, disponibles pour tout le monde — *22 août 2026*

Cinq bannières livrées par Sacha, toutes en 1800 x 400 : Cercle Polytechnique, Cercle des Sciences,
**Cercle de Droit**, Cercle de Médecine, Cercle Solvay. Pseudo blanc partout, mesuré.

**`source: 'defaut'` — possédées SANS octroi.** C'est le point de conception qui compte : les
distribuer réellement aurait écrit cinq documents d'inventaire pour chacun des **141 comptes**,
plus cinq de plus à chaque inscription — pour un droit que personne ne peut perdre ni gagner.

Un item de base n'est pas une récompense, c'est une **propriété du catalogue**. `isDefaultItem`
répond à la question partout : la page Collection les compte comme possédés, et la route
d'équipement les accepte sans document d'inventaire.

La règle vient du CATALOGUE, donc du serveur : un client ne peut pas s'en réclamer pour équiper
autre chose.

Ils ne sortent **jamais d'un pack** — un tirage qui donne ce que tout le monde a déjà n'a aucune
valeur. Verrouillé par un test.

### 2.17 [fait] Treize titres, et « Fondateur » remplace « Créateur » — *22 août 2026*

**Un titre ne coûte aucun asset.** C'est le contenu le moins cher à produire, et il double la
récompense de fin de saison sans qu'on dessine quoi que ce soit.

| Titre | Attribution |
|---|---|
| Argent-S0 · Or-S0 · Diamant-S0 · Master-S0 · Grand Master-S0 | automatique à la clôture, selon le meilleur grade |
| Champion Saison 0 | ⚠️ règle non tranchée |
| **Fondateur** | octroi manuel, les trois fondateurs |
| Flasheur · Gamelleur · Folklorique · Bleu.x.e · Chose Enhaurme · Boulet | **packs** |

**La règle générale du catalogue, posée par Sacha le 22/08, tient en trois cas et il n'y a rien
d'autre :**
1. récompense de **saison**, attribuée automatiquement à la clôture ;
2. octroi **manuel**, décidé par Sacha ;
3. tout le reste se gagne dans les **packs**.

J'avais rattaché « Flasheur » et « Gamelleur » aux badges de profil du même nom. **Erreur de
lecture** : le badge se mérite par une statistique calculée, le titre se tire dans un pack. Deux
objets distincts qui partagent un mot — et c'est très bien ainsi, ça donne envie de sortir le titre
quand on a déjà le badge.

**Plus aucun item sans explication** : `needsWrittenExplanation` ne signale plus rien.

**Pool de packs : 15 items** (9 bannières, 6 titres) — commun 57,3 % · rare 29,8 % · épique 11,5 % ·
légendaire 1,4 %. Les titres **doublent presque le contenu tirable** sans qu'un seul asset ait été
produit.

**« Créateur » devient « Fondateur »** partout où un joueur peut le lire : la bannière, le titre,
l'étiquette de provenance des fiches, le libellé du classement. Les commentaires internes et
l'outillage admin gardent l'ancien mot, il ne s'affiche nulle part.

**Catalogue : 35 items.**

### 2.18 [fait] Les titres s'affichent enfin, et les récompenses se cumulent — *22 août 2026*

#### Un titre équipé ne s'affichait NULLE PART
On pouvait gagner un titre, l'équiper, et ne jamais le voir. `PlayerTitle` le pose désormais sous
le pseudo, au classement comme sur le profil.

**Aucune couleur de rareté.** Sacha, 22/08 : « il ne faut pas leur mettre des couleurs, c'est juste
un texte qui se met en dessous du pseudo ». Le titre prend `--banner-text-color`, la variable que
`PlayerBanner` pose déjà — donc la couleur de la bannière sur laquelle il s'affiche. Le colorer
selon sa rareté l'aurait rendu illisible sur la moitié des visuels.

La même règle vaut dans la collection : l'aperçu d'un titre n'est plus teinté, ni sur la carte, ni
dans la fiche, ni dans l'animation d'ouverture.

#### Les grades se cumulent vers le bas
`seasonAwardsFor` (+ **12 tests**). Finir Master donne Argent, Or, Diamant **et** Master — jamais
Grand Master.

C'est la bonne façon de le faire : sans ça, atteindre un palier ferait **perdre** la récompense du
précédent, et un joueur qui progresse verrait sa collection rétrécir.

#### Récompenses de PLACE, distinctes des grades
`rankRange` sur `obtention.season` : `[1, 1]` pour le champion, `[2, 3]` pour le podium. Une place
n'est pas un palier d'ELO — on peut finir premier sans être Grand Master, et l'inverse.

- **Champion Saison 0** -> première place
- **Podium Saison 0** -> deuxième et troisième

`champion_s0` n'avait aucune règle d'attribution : il traînait dans la section « Titres » au lieu de
la section « Saison 0 », ce qui expliquait que Sacha n'y voyait que lui.

#### Deux défauts trouvés en chemin
- Le titre de Fondateur n'était octroyé à personne. `npm run item:grant` créé pour les octrois
  manuels, avec la sémantique EXACTE de `grantItem` (même `grantId`, même journal, même empilement)
  pour qu'un octroi manuel ne se distingue en rien d'un automatique. **Les trois fondateurs l'ont.**
- **Trois comptes n'avaient pas de `usernameLowercase`**, dont deux fondateurs. Conséquence :
  `checkUsernameAvailable` ne les voyait pas, et **n'importe qui pouvait réserver leur pseudo**.
  Réparé en production.

**Catalogue : 36 items**, plus aucun sans explication.

### 3.10 [plan] CLÔTURE ET OUVERTURE D'UNE SAISON — plan détaillé du 22 août 2026

> Ce bloc est le **mode d'emploi** d'un changement de saison. Il doit rester lisible et modifiable
> par Sacha seul : chaque valeur discutable est une donnée, jamais une ligne de code.

#### Le principe qui gouverne tout : une saison est une DONNÉE

```
seasons/{seasonId}
  id, label            « season_0 », « Saison 0 »
  startedAt, endedAt
  status               'active' | 'closing' | 'closed'
  placementGames       ⚠️ 3 — parties avant d'être classé
  eloReset             ⚠️ règle de remise à zéro (voir plus bas)
  closedBy, closedAt   traçabilité
```

Ouvrir une saison, c'est **écrire un document**. Pas déployer. C'est la seule façon d'en lancer une
un soir de septembre sans avoir besoin de moi.

---

#### ÉTAPE 1 — Geler le classement (avant tout le reste)

Passer la saison en `status: 'closing'`. Les parties continuent d'être jouables et comptées, mais
le classement de référence est **figé** : c'est celui qui décide des récompenses.

**Pourquoi geler d'abord** : sans ça, une partie jouée pendant la distribution changerait le
classement au milieu, et deux joueurs pourraient recevoir la même récompense de « premier ».

Le script écrit un **instantané** dans `seasons/{id}/standings/{userId}` : place finale, ELO final,
grade final, parties jouées. C'est cet instantané qui fait foi ensuite, et il reste consultable —
un joueur pourra revoir son classement de saison 0 dans deux ans.

#### ÉTAPE 2 — Distribuer les récompenses

`seasonAwardsFor` **existe déjà et est testé** (12 tests). Il donne, pour un joueur :

| Ce qu'il a fait | Ce qu'il reçoit |
|---|---|
| A joué au moins une partie | Pionnier |
| A atteint le grade X | les bannières ET titres de X **et de tous les grades en dessous** |
| Fini 1er | Champion Saison 0 |
| Fini 2e ou 3e | Podium Saison 0 |

Le grade retenu est le **meilleur atteint**, pas celui de fin — `peakElo` le donne déjà.

L'octroi passe par `grantItem`, **idempotent** : `sourceRef: 'season_0_close'`. Relancer le script
ne double rien. Et `revokeBySourceRef('season_0_close')` **annule tout** si on s'est trompé.

⚠️ **À vérifier avant** : les cinq bannières de grade et les cinq titres existent au catalogue. Un
`grantItem` sur un identifiant absent lève — c'est voulu, mais ça arrête le script au milieu. Le
script fait donc une **passe de contrôle à blanc** avant d'écrire quoi que ce soit.

#### ÉTAPE 3 — Archiver la saison de chaque joueur

`users/{uid}/seasons/{seasonId}` : grade max, ELO final, place, parties, récompenses reçues.

Le chemin **existe déjà dans les règles** (lecture publique, écriture serveur). C'est ce qui
alimentera « Saison 0 : Diamant, 12e » sur un profil, et le filtre de statistiques par saison que
Sacha a demandé le 21/08 (chantier 3.8).

#### ÉTAPE 4 — La remise à zéro de l'ELO

⚠️ **LE POINT LE PLUS SENSIBLE.** Trois options, et je recommande la troisième.

| Option | Effet | Problème |
|---|---|---|
| Tout le monde à 1000 | table rase | six mois de progression effacés, et les forts remontent en deux soirées en écrasant tout le monde |
| Ne rien remettre | continuité | la saison 2 n'a aucun enjeu : le classement est déjà fait |
| **Compression vers la moyenne** | `nouvel ELO = 1000 + (ancien − 1000) × k` | — |

**Avec `k = 0.5`** : un joueur à 1350 repart à 1175, un joueur à 850 repart à 925. L'ordre est
conservé, les écarts sont divisés par deux. Tout le monde peut redevenir premier, personne ne
repart de zéro.

`k` est une **donnée de la saison** (`eloReset: { mode: 'compress', k: 0.5 }`), donc modifiable
sans redéploiement. Les autres modes restent possibles : `{ mode: 'reset' }`, `{ mode: 'keep' }`.

#### ÉTAPE 5 — Les parties de placement

**La réponse à « comment tu joues tes trois premières parties ? »**

Pendant ses `placementGames` premières parties de la saison, un joueur :
- **joue normalement**, rien ne change à l'écran de match ;
- **n'apparaît pas au classement** — comme un joueur qui n'a jamais joué en Blitz aujourd'hui, le
  mécanisme existe déjà (`appearsInLadder` regarde le nombre de parties) ;
- **voit son ELO bouger plus fort** : un facteur K doublé sur ces parties, pour que le placement
  trouve vite son niveau ;
- **voit « Placement : 2 / 3 »** à la place de son rang, sur son profil et dans le lobby.

Aucune donnée nouvelle : le compteur de parties de la saison suffit. Et les trois parties se jouent
contre n'importe qui — inutile de les apparier entre eux, la base est trop petite.

#### ÉTAPE 6 — L'annonce

Le système d'annonces **existe** (`/admin/announcements`, publication en Markdown, compteur de
non-lues). Il n'y a rien à construire, seulement à écrire. Une annonce par sujet plutôt qu'un pavé :

1. **« La saison 0 est terminée »** — le podium, les récompenses reçues, où les voir
2. **« La saison 1 commence »** — la remise à zéro expliquée, les parties de placement
3. **« Nouveautés »** — collection, packs, titres, modes Chrono et Blitz, classement Blitz

⚠️ Le point à ne pas rater : **expliquer la remise à zéro AVANT qu'elle arrive**. Un joueur qui
retrouve son ELO baissé sans prévenir croit à un bug, et il a raison de le croire.

---

#### L'ordre d'exécution, et il n'est pas négociable

```
1. contrôle à blanc          rien n'est écrit, tout est vérifié
2. annonce « saison bientôt finie »
3. gel du classement         status: closing
4. instantané des classements
5. distribution              idempotente, réversible
6. archivage par joueur
7. remise à zéro de l'ELO    ⚠️ après la distribution, jamais avant
8. ouverture de la saison 1  status: closed sur l'ancienne
9. annonces
```

**L'étape 7 après la 5**, sinon on distribue les récompenses d'un classement déjà remis à zéro.

#### Ce qu'il reste à construire

| Chantier | Contenu | Existe déjà ? |
|---|---|---|
| 3.10a | Type `Season` + document, règles | règles OK |
| 3.10b | Instantané des classements | — |
| 3.10c | Script de clôture, à blanc puis `--apply` | `seasonAwardsFor` OK, `grantItem` OK |
| 3.10d | Archive par joueur | chemin OK |
| 3.10e | Remise à zéro paramétrable + tests | — |
| 3.10f | Parties de placement (compteur, K doublé, affichage) | `appearsInLadder` OK |
| 3.10g | Les trois annonces | outil OK, texte à écrire |

**3.10e et 3.10f sont les seuls morceaux vraiment nouveaux.** Tout le reste s'appuie sur ce qui a
été construit ces trois derniers jours.

#### ⚠️ Ce que je ne tranche pas
1. **`k` de compression** — 0,5 est une proposition, pas une décision.
2. **Nombre de parties de placement** — 3 est le chiffre de Sacha, à confirmer une fois vu.
3. **Le podium récompense-t-il le classement de fin ou le meilleur grade atteint ?** J'ai écrit
   « place finale » ; c'est cohérent avec `rankRange`, mais ça pénalise qui a mal fini.
4. **Le Blitz a-t-il ses propres récompenses de saison ?** Aujourd'hui non — ça doublerait les
   assets à produire.

### 3.10 [fait] La clôture de saison — *23 août 2026*

**Un seul fichier décrit tout** : `scripts/season.config.mjs`. Saison qui se termine, saison qui
commence, réglage de l'ELO, parties de placement, qui reçoit quoi, et la phrase de confirmation.
Le script n'y ajoute rien — il lit, vérifie, affiche, puis écrit.

Pour la saison suivante : dupliquer le fichier, changer trois lignes. **Aucun code à toucher.**

#### La confirmation
`npm run season:close` tourne **à blanc** et n'écrit rien. Avec `--apply`, le script demande de
taper `CLOTURER-SAISON-0` — la phrase contient l'identifiant de la saison, donc on ne peut ni se
tromper de saison, ni relancer la même deux fois par distraction.

#### L'ordre des étapes, non négociable
1. valider la configuration contre le catalogue — **refuse de démarrer** si un item manque ;
2. figer le classement dans `seasons/{id}/standings` ;
3. distribuer, avec un `sourceRef` commun ;
4. archiver la saison sur chaque profil ;
5. **seulement ensuite**, comprimer l'ELO et remettre les compteurs à zéro.

Comprimer avant de distribuer récompenserait un classement déjà effacé. Refuser de démarrer plutôt
que s'arrêter au milieu : une clôture interrompue laisse la moitié des joueurs récompensés.

#### La marche arrière
`npm run season:revoke season_0_close --apply` annule toute la distribution — le `sourceRef` commun
retrouve exactement ce qui a été donné.

⚠️ **La compression d'ELO n'est PAS réversible.** L'ancienne valeur reste consultable dans
l'instantané du classement, mais sa restauration serait manuelle. C'est pour ça que le contrôle à
blanc affiche l'avant et l'après de chaque joueur.

#### Résultat du contrôle à blanc, sur la production du 23/08
- **114 joueurs classés**, 677 octrois
- Premier : Lionel messi, 1469 ELO -> **1235**
- Dernier : Théo, 793 -> **897**

| Meilleur grade atteint | Joueurs |
|---|---|
| Or | 75 |
| Diamant | 27 |
| Master | 11 |
| Grand Master | 1 |

⚠️ **Personne n'a « Argent » comme meilleur grade** : l'ELO de départ est 1000, qui est déjà Or III.
La bannière et le titre Argent seront donc distribués à tout le monde par le cumul, sans que
personne ne les ait vraiment atteints. À trancher : les retirer de la table, ou les assumer comme
récompense de participation.

#### Modules purs livrés
| | Tests |
|---|---|
| `seasonReset.ts` — compression de l'ELO | 19 |
| `placement.ts` — parties de placement | 19 |
| `seasonClosure.ts` — qui reçoit quoi | 28 |

Et le compteur `stats.seasonGames` est en place dans la fin de partie : seules les parties
**classées** comptent, puisque c'est le classement qu'il s'agit d'établir.

### 4.8 [a faire] Clôture de saison : bannière du meilleur grade
« Tout le monde aura sa bannière relative au rang maximum qu'il a eu. »
La table grade -> item existe déjà (`seasonGradeAwards`). Manquent : le grade maximum atteint
mémorisé par saison, et le script de clôture. Dépend du bloc 3 (saisons).

### 4.10 [fait] Les récompenses de saison ont leur propre catégorie — *21 août 2026*

Sacha, 21/08 : « tout ce qui est de saison, ils n'ont pas vraiment de rareté, tu peux les mettre
dans leur propre catégorie, comme ça on voit un peu mieux ».

Il a raison sur les deux points, et le second est le plus important : **une récompense de saison
n'a pas de rareté au sens du tirage.** Personne ne « tire » un Grand Master, on l'atteint. Écrire
« Légendaire » dessus suggère une chance là où il n'y en a aucune — la pastille disparaît donc dans
ces sections, ainsi que l'étiquette de provenance, que le titre de section porte déjà.

`lib/collection/sections.ts` (+ **12 tests**) construit le découpage :
- les types d'abord, dans leur ordre déclaré, **hors** récompenses de saison ;
- les saisons ensuite, de la plus récente à la plus ancienne. On ouvre la page sur ce qu'on peut
  obtenir maintenant, pas sur le palmarès de l'an dernier ;
- dans une saison, l'ordre suit la **progression** (participation, Argent, Or, Diamant, Master,
  Grand Master) et non la rareté : c'est une échelle, elle doit se lire comme telle.

La barre de filtres porte désormais sur les **sections**, pas seulement sur les types — une saison
est une section à part entière, il faut pouvoir la choisir aussi.

**Catalogue à 18 items, plus aucun asset manquant.** Trois bannières ajoutées : `pionner`
(participation saison 0), `singe`, `stars`. Le fichier livré s'appelle « pionner » sans le second i : on suit le nom réel plutôt que
de renommer un asset déjà déposé. Pool de pack à 9 items — commun 48,6 %, rare 40,5 %,
épique 9,7 %, légendaire 1,2 %.

### 4.11 [fait] Retours de Sacha sur le catalogue — *21 août 2026*

| Point | Correction |
|---|---|
| Cartes verrouillées trop discrètes | retour au gris : c'est lui qui signale qu'on peut cliquer |
| « KickTrack » dans la description Créateur | **KickTracker**, dans le catalogue et dans le repli générique |
| Vélo TDF sans explication | « Conçue spécialement pour Germimoche », rareté passée à **commun** |
| Emballage | rareté passée à **épique** |
| Bouton « Voir sa collection » | déplacé **sous** les pastilles de badge, avec de l'air autour |

Le bouton était coincé entre la barre de progression et les badges : deux blocs qui DÉCRIVENT le
joueur. Un bouton au milieu se lit comme une étiquette de plus. Sous les badges, il redevient ce
qu'il est — une sortie vers ailleurs.

Chances du pack après recalibrage : commun 51,3 % · rare 32,1 % · épique 15,4 % · légendaire 1,3 %.

### 4.9 [fait] Voir la collection d'un autre joueur — *21 août 2026*

**Règle Firestore élargie et DÉPLOYÉE** : `users/{uid}/inventory` passe de `isSelf` à `isSignedIn`.
Le contenu se limite à des identifiants cosmétiques et un nombre d'exemplaires — aucun secret.
`seasons` était déjà ouvert de la même façon. **L'écriture reste interdite au client.**

`/collection?joueur=<uid>` — la page bascule en lecture seule : titre « Collection de X », flèche
de retour vers son profil, pas d'onglet Packs (ses packs ne regardent que lui), pas d'équipement,
et `equipped` montre ce que **lui** porte. Entrée depuis le profil, **juste sous la bannière** :
c'est elle qui donne l'envie — « il a quoi d'autre ? » se demande en la voyant, pas au bas d'une
page de statistiques.

[fait] `npm run rules:deploy` **ne dépend plus de la CLI Firebase**, qui exigeait une session
interactive. `scripts/deploy-rules.mjs` passe par l'API REST avec la clé de service : il compile
d'abord (une erreur de syntaxe est rejetée là, avant toute mise en service), puis fait pointer la
release. Simulation par défaut, `--apply` pour écrire.

**Bloqueur identifié** : `firestore.rules` pose `match /inventory/{itemId} { allow read: if isSelf(userId) }`.
On ne peut pas lire l'inventaire d'autrui. Il faut passer à `isSignedIn()` — le contenu n'est qu'une
liste d'identifiants cosmétiques, aucun secret, et `seasons` est déjà ouvert de la même façon.

La page `/collection` est **déjà générique**. Il lui manque un mode lecture seule : pas de bouton
équiper, et l'opposition « possédé par lui / pas possédé » au lieu de « possédé par moi ».
Entrée depuis le profil d'un joueur.

### 2.8 [a faire] Alléger les assets bannières
12 Mo pour 4 bannières. `CreatorV1.png` = 5,7 Mo, `CreatorV3.png` = 5,2 Mo, pour un affichage à
~400px de large. Sur mobile en 4G c'est brutal. `VéloTDF.png` (73 Ko) montre le bon ordre de grandeur.
- `CreatorV1` et `CreatorV2` ne sont **référencés nulle part** -> assets morts, à supprimer.
- Passage en WebP, cible < 150 Ko par bannière.

---

## Bloc 3 — Saisons

**Cadrage acté :** la période écoulée devient rétroactivement la **saison 0**. Septembre = on la
clôture *et* on ouvre la saison 1. Il y a donc bien une distribution de récompenses dès maintenant.

### 3.1 [a faire] Modèle de données des saisons
Aucune notion de saison n'existe dans le code (zéro occurrence, vérifié).
- Définition de saison : `id`, `nom`, `debut`, `fin`, `statut`, référence de sa table de récompenses.
- **Historique par joueur et par saison** — c'est ce qui porte les récompenses au grade :
  - `peakElo` : **l'ELO maximum atteint pendant la saison** (source de vérité du grade)
  - `finalElo` : l'ELO à la clôture
  - `rank` : la position au classement final
  - `gradeAtPeak` : le grade correspondant au pic, **figé au moment de la clôture**
- NOTE: **Pourquoi stocker les deux (`peakElo` ET `gradeAtPeak`)** : le grade est aujourd'hui *dérivé*
  de l'ELO par [`rankUtils.ts`](../../src/lib/utils/rankUtils.ts). Si vous ajustez un jour les seuils
  (ex. Diamant à 1080 au lieu de 1050), tous les grades historiques se décaleraient rétroactivement
  et « j'étais Master saison 0 » deviendrait faux. On fige donc le libellé, tout en gardant l'ELO brut.
- [fait] **D3 tranchée — saison 0 : on catégorise l'ELO final avec la règle existante.**
  Le `peakElo` de la saison 0 n'est pas reconstituable (`eloHistory` a des trous), mais ce n'est
  pas grave : [`getRankInfo()`](../../src/lib/utils/rankUtils.ts) est déjà LA règle qui transforme
  un ELO en grade. On l'applique à l'ELO final de chacun, et on a les paliers de récompense.
  Aucune donnée nouvelle à reconstituer.
- À partir de la **saison 1**, `peakElo` est suivi en direct (mis à jour à chaque fin de partie
  côté serveur, chantier 0.4) — le « grade maximum atteint » devient exact pour de bon.

### 3.2 [a faire] Clôture de saison — script admin local, ordre strict et idempotent
Ordonnancement imposé par `31-saisons.md`, à respecter à la lettre :
1. **Figer + archiver** le classement (snapshot à un instant précis ; les parties terminées après n'entrent pas)
2. **Distribuer** les récompenses (via `grantItem`, identifiants d'octroi uniques)
3. **Appliquer** le soft reset
4. **Ouvrir** la nouvelle saison

Rejouable après un crash sans jamais doubler un octroi. Chaque joueur reçoit sa récompense exactement une fois.

NOTE: **Pourquoi un script local et pas une route HTTP** : la clôture parcourt 100+ comptes en une
passe, ce qui dépasse le cadre d'une fonction serverless à durée limitée. Et c'est de toute façon
une **action admin manuelle** par décision (doc `31`) — un script lancé depuis ta machine avec le
compte de service est exactement le bon outil. Même code `grantItem`, contexte d'exécution différent.
Le dossier [`scripts/`](../../scripts/) accueille déjà ce genre d'outil.

### 3.3 [a faire] Soft reset
Rapprochement des ELO vers 1000, sans effacement : l'écart se resserre, la hiérarchie reste.
C'est la contrepartie obligatoire de l'ELO inflationniste.
- ATTENTION: Coefficient à calibrer, traitement des inactifs à trancher — voir décisions.
- L'ancien score n'est pas perdu : il vit dans l'archive de 3.1.

### 3.4 [a faire] Table de récompenses par grade
Mécanique générique : une saison référence une table en données. Deux axes possibles :
- **Palier de classement** : top 1 / top 3 / top 10
- **Grade atteint** : une récompense par palier de grade franchi (Argent -> Or -> Diamant -> Master -> GrandMaster)
[fait] **D6 tranchée — une bannière par grade**, pas par sous-palier :

| Palier | Condition (ELO final de la saison 0) | Récompense |
|---|---|---|
| Argent | < 900 | bannière Argent |
| Or | 900 – 1049 | bannière Or |
| Diamant | 1050 – 1199 | bannière Diamant |
| Master | 1200 – 1349 | bannière Master |
| GrandMaster | ≥ 1350 | bannière GrandMaster |
| Participation | avoir joué ≥ 1 partie comptabilisée | bannière **Pionnier saison 0** |

- Les seuils viennent directement de [`rankUtils.ts`](../../src/lib/utils/rankUtils.ts) — **aucun
  seuil n'est réécrit ici**, la table lit la règle existante. Si les seuils bougent un jour,
  la distribution suit toute seule.
- Un joueur reçoit **sa bannière de grade + Pionnier**, donc jusqu'à 2 items.
- ATTENTION: Reste ouvert : faut-il un item distinct pour le **top 1** (« Champion saison 0 ») ?
  Non tranché, et non bloquant — ça s'ajoute au catalogue sans redéploiement.

### 3.8 [a faire] Filtre par saison sur tout le profil
Idée de Sacha (21/08) : « dans les stats il faudra un filtre par saison qui montre les stats,
genre ça impacte tout le profil en fonction de la saison ».

Le profil a déjà un filtre de lieu et un filtre de format (1v1 / 2v2 / tous) qui reconfigurent
l'ensemble des sections. **Le filtre de saison est le même mécanisme, avec une dimension de plus** :
les statistiques avancées sont recalculées depuis les parties filtrées.

Ce qui manque aujourd'hui : rien sur une partie ne dit à quelle saison elle appartient. Deux
options, à trancher au moment du chantier 3.1 :
- borner par dates, en comparant `startedAt` à la fenêtre de la saison — aucune donnée à ajouter,
  mais un calcul à chaque filtrage ;
- écrire un `seasonId` sur chaque partie à sa clôture — plus direct, mais inutilisable pour les
  967 parties déjà enregistrées sans reprise.

ATTENTION: dépend de 3.1 (modèle de données des saisons). À ne pas commencer avant.

### 3.5 [a faire] Affichage : historique de saison sur le profil
« Saison 0 — Master II, 7ᵉ » sur le profil. C'est la contrepartie visible du reset : le joueur
perd son ELO mais garde une trace permanente. Sans ça, le reset est vécu comme une punition sèche.

### 3.7 [a faire] Marche arrière de clôture — **exigence explicite de Sacha**
« J'aimerais bien juste tester la mise en saison et dans les dix minutes revenir en arrière. »

La plomberie existe (chantier 2.9). Reste à l'assembler :
- Avant de muter quoi que ce soit, **archiver l'ELO d'avant reset de chaque joueur** — c'est ce qui
  rend le soft reset annulable, pas seulement les récompenses.
- `rollback-season.mjs` : `revokeBySourceRef(<id de clôture>)` + restauration des ELO depuis
  l'archive + réouverture de la saison.
- ATTENTION: Fenêtre de sécurité à définir : une annulation reste sûre tant qu'aucune partie n'a été jouée
  après la clôture. Passé ce point, restaurer les ELO écraserait des parties légitimes. Le script
  doit **détecter et refuser** ce cas plutôt que de l'écraser.

### 3.6 [a faire] Outil admin de clôture
Déclenchement manuel (décision `31-saisons.md` : pas de calendrier automatique).
- [fait] **Confirmation forte exigée** (Sacha : « il ne faut pas le faire sans faire exprès ») : le
  script doit demander de retaper l'identifiant de la saison, pas un simple `y/n`.
- NOTE: **Prévoir un mode simulation** (« voilà qui recevrait quoi ») avant le déclenchement réel.
  On ne joue pas une clôture non-idempotente en aveugle sur 100 comptes réels.

---

## Bloc 4 — Monnaie & packs

À faire **après** septembre. Le contenu des packs, ce sont les bannières du bloc 2 — donc du
contenu réel existe déjà quand on arrive ici.

### 4.1 [reporte] Monnaie : solde + journal de transactions

> **Reporté par Sacha le 21/08** : « pas besoin de monnaie tout de suite ». Le pack se gagne
> en jouant et le doublon s'échangera. Rien dans le socle ne s'y oppose le jour où elle arrivera.
Chaque crédit/débit tracé (montant, raison, référence). Base de l'anti-triche et du support.
Crédit uniquement côté serveur, branché sur la fin de partie (0.4). Jamais par le client.

### 4.2 [a faire] Définition de pack au catalogue
Nombre d'items, table de probabilités par tier, sous-ensemble éligible.

### 4.3 [a faire] Tirage serveur
Le client ne connaît jamais les probabilités effectives.

> **Le pity disparaît** (21/08) : un pack toutes les 10 parties est déjà déterministe,
> il n'y a plus de malchance à compenser. Voir 4.0.

### 4.4 [abandonne] Doublons -> monnaie

> **Remplacé le 21/08** par l'empilement : `quantity` sur le document d'inventaire, en vue d'un
> système d'échange entre joueurs. Déjà implémenté, voir 4.0.
Taux proportionnel à la rareté.

### 4.5 [a faire] Animation d'ouverture
Moment clé de l'expérience. Sortir un légendaire doit être un événement.

> ATTENTION: **Toutes les valeurs de ce bloc** (probabilités, prix, taux de conversion, seuils de pity)
> se calibrent en observant les vrais joueurs -> **config serveur obligatoire**, modifiable sans redéploiement.

---

## Bloc 5 — Design system

Avance **en fond, en continu** — ne bloque personne, n'est bloqué par personne.

### 5.1 [fait] Réécrire les tokens (`variables.css`) — *20 août 2026*
Fusionner les ≥5 verts en une échelle unique, plus foncée. Palette arcade (rouge/bleu/jaune saturés,
**jaune = important**). Tokens d'identité : `--border-arcade`, `--shadow-arcade`, échelle d'arrondis unifiée.

### 5.2 [fait] Librairie de composants — *20 août 2026*
[fait] `Button` (5 variantes, 3 tailles), `Card` (4 variantes, 4 rembourrages), `Input`
(libellé, erreur, indication, révélation du mot de passe), `Badge` (5 variantes).
Tous lisent **uniquement des tokens** : aucune couleur, aucun arrondi, aucune ombre en dur.
[fait] L'ancien `Button` en Tailwind (palette emerald/slate étrangère à l'app) est **remplacé**,
pas conservé — même API, donc les deux pages qui l'utilisaient continuent de fonctionner.
[a faire] `RankBadge`, `LeaderboardRow`, `Modal` : à extraire pendant la migration des pages (5.3).

### 5.3 [fait] Migration page par page — *20 août 2026*
Cible : **0 couleur hex** dans les `.module.css` hors `variables.css` (471 aujourd'hui, revérifié).
- ATTENTION: Page pilote à choisir — voir décisions.

### 5.4 [a faire] Sortir Tailwind
ATTENTION: **Plus lourd que le doc ne le dit.** Le doc `10` parle de « ~2 pages » ; en réalité
`@import "tailwindcss"` est dans [`globals.css:2`](../../src/app/globals.css#L2) et des classes
utilitaires sont dans **12 fichiers**, dont `GameBoard.tsx` et `ProfileContent.tsx`.

### 5.5 [fait] Fiabiliser le fond terrain — *20 août 2026*
[fait] **Une seule définition dans tout le projet**, portée par le token `--field-gradient`.
Les trois copies signalées au diagnostic n'avaient pas disparu : elles avaient migré dans
`game-page.module.css`. Elles lisent désormais le token.
[fait] `background-attachment: fixed` supprimé — c'était lui qui faisait sauter le fond sur mobile
quand la barre d'URL apparaît.
[fait] Largeur de rayure **relative** (`14vmax`) : à 200px fixes, le grain du terrain n'avait rien
à voir entre un téléphone et un écran large.
[fait] `.phone-container` passe de `height: 100vh` à `min-height: 100dvh`.

Ancienne note : les 3 copies dans `globals.css` avaient déjà été nettoyées
— `globals.css` fait 48 lignes avec une seule définition.
Restent : `background-attachment: fixed` et les rayures de 200px fixes -> à remplacer par une
définition issue des tokens `--field-*`, `min-height: 100dvh`, largeur de rayure cohérente entre écrans.

---

## Bloc 6 — Avatar 2D

**Décision actée : 2D d'abord, modèle de données prévu pour la 3D.**
Le doc `21` pose lui-même l'invariant : les données (5 itemIds + teintes) sont indépendantes du
moteur de rendu. On implémente donc le modèle **exactement** comme spécifié, et on rend en 2D.
Si la 3D arrive un jour : **zéro migration de données**.

### 6.1 [a faire] Les 5 slots au catalogue
`corps`, `maillot`, `short`, `pieds`, `chapeau` (seul optionnel). Tintables : corps, maillot, short.

### 6.2 [a faire] Rendu par calques + teinte CSS
Images empilées dans un ordre fixe. La teinte se fait en `mask-image` + `background-color` : une
même forme de maillot en PNG donne N couleurs **sans N assets**. C'est ce qui rend la combinatoire
promise (10 formes × 10 teintes = 100 looks) atteignable avec une poignée de fichiers.

### 6.3 [a faire] Avatar par défaut à l'inscription
Octroyé + équipé côté serveur à la création du compte : garantit qu'aucun compte n'a d'avatar « nu ».
ATTENTION: Sans déclencheur `onUserCreate` (voir 0.3), l'octroi doit être **idempotent** et revérifié au
chargement de l'app, au cas où l'inscription serait interrompue.

### 6.4 [a faire] Équipement validé serveur
L'item doit être dans `owned` et du bon type. Le chapeau est le seul déséquipable sans remplacement.

---

## Bloc 7 — Modes de jeu / bibitif

**V1 = règles sociales uniquement.** Le moteur de score n'est pas touché.
Meilleur ratio valeur/effort du projet — candidat idéal si tu veux un truc fun livrable en
parallèle pendant que le socle se construit.

### 7.1 [fait] Sélection du mode au lancement — *20 août 2026*
[fait] Le code est déjà prêt : [`game/new/page.tsx`](../../src/app/game/new/page.tsx) a un
`step: 'config'` (format + lieu) où le sélecteur se pose naturellement.
`modeId` sur `GameSession` -> recopié sur `Game`.

### 7.2 [fait] Le mode visible avant d'accepter — *20 août 2026*
NOTE: Les joueurs qui rejoignent par code PIN doivent **voir le mode avant de valider**. S'inscrire
sans savoir qu'on joue en bibitif, c'est déloyal. Deux lignes dans `PlayerList`.

### 7.3 [fait] Moteur de règles sociales — *20 août 2026*
`{ déclencheur, message }`. L'app écoute les événements de partie, affiche un message, **rien d'autre** :
jamais de contact avec score, stats ou ELO.
Déclencheurs : score/écart atteint, type de but (réutiliser les `GoalType`/`GoalPosition` existants), fin de partie.

### 7.4 [fait] Config des modes en fichier — *20 août 2026*
Pas d'UI admin en V1. Structure prévue pour accueillir un jour un effet autre que `message`.

---

## Bloc 8 — Events par lieu — dernier

Le plus complexe (code tournant serveur, dispositif d'affichage physique sur place non tranché)
pour l'audience la plus étroite. Ne rien commencer avant que les blocs 0-4 soient solides.

---

## Bloc 9 — Dette technique diverse

### 9.1 [fait] Le score n'a plus qu'une source — *23 août 2026*
Le score vivait à deux endroits : `teams[i].score`, lu par le SERVEUR pour désigner le vainqueur,
calculer le MVP et déclencher les règles de mode ; et `game.score`, lu par l'INTERFACE.

Les deux étaient reconstruits à la main, avec leur propre expression ternaire, dans **trois
fonctions différentes** : ajout de but, annulation, forfait.

Tant que les trois sont justes, rien ne se voit. Le jour où une quatrième apparaît — ou qu'une des
trois change sans l'autre — l'interface et le serveur ne sont plus d'accord sur qui a gagné. **Et
ça ne lève aucune erreur** : le match se termine simplement sur le mauvais résultat.

[fait] `game.score` est désormais **dérivé** de `teams`, par `lib/game/score.ts` et par lui seul
(10 tests). Il n'existe plus de chemin qui puisse mettre l'un à jour sans l'autre.

**Audit de la production** : 1 020 parties vérifiées, **0 divergence**. Le défaut était latent, pas
encore réalisé — c'est le bon moment pour le fermer.

Le forfait avait la formulation la plus fragile : il recopiait `game.score` pour l'équipe perdante,
donc il aurait propagé une divergence existante au lieu de la corriger.

### 9.2 [fait] `startTime` / `startedAt` — et neuf conversions de date — *23 août 2026*

Le doublon était le symptôme visible ; le vrai problème était en dessous.

**Une même date arrive sous TROIS formes** selon d'où elle vient : un `Timestamp` Firestore quand
elle sort d'une lecture directe, une `Date` quand elle vient d'un cache, une chaîne ISO quand elle
a transité par une réponse d'API.

Chaque endroit qui lisait une date avait donc **sa propre conversion — neuf au total**, toutes
légèrement différentes, dont plusieurs avec un `as any`. Certaines ne géraient qu'une des trois
formes et renvoyaient `NaN` sur les autres, **silencieusement**.

Un `NaN` dans une date ne lève rien : il se propage dans les tris, les durées et les comparaisons,
et produit un résultat faux sans erreur.

[fait] `lib/game/dates.ts` (16 tests) : `toMillis`, `toDate`, `gameStartMs`. Les neuf conversions
inline ont disparu, y compris trois `as any`. Un test vérifie qu'**aucune entrée ne peut produire
un NaN**, quelle qu'elle soit.

**Sur le doublon lui-même** : les 1 020 parties de production portent les deux champs, cohérents.
On ne supprime pas `startTime` — il faudrait migrer 1 020 documents pour ne rien gagner. Mais
**toute lecture passe par `gameStartMs()`**, qui sait lequel lire : plus personne n'a à choisir, et
c'est ce choix arbitraire qui m'avait fait perdre du temps sur le chronomètre.

### 9.3 [a faire] Découper les gros fichiers
Relevé le 23/08, après les chantiers 9.1, 9.2 et 9.4 :
- `app/tournament/[id]/page.tsx` — **1 087 lignes**
- `lib/firebase/tournaments.ts` — **935 lignes**
- ~~`lib/firebase/games.ts`~~ — 582 lignes, repassé sous le seuil (les routes serveur en
  ont vidé le calcul, le moteur de buts en a sorti les règles)
- ~~`components/profile/ProfileContent.tsx`~~ — 701 lignes, repassé sous le seuil

Il ne reste donc que **deux** fichiers concernés, et le plus gros est une page.

### 9.4 [fait] L'annulation d'un but ne soustrait plus, elle rejoue — *23 août 2026*

**Le défaut.** `removeLastGoal()` annulait un but en soustrayant ses points et en
restaurant le multiplicateur depuis `previousMultiplier`. Le code l'admettait
lui-même : « doesn't perfectly restore multiplier state ».

Deux calculs séparés — l'ajout et le retrait — devaient rester d'accord pour
toujours, sans que rien ne le vérifie. Ils ne l'étaient pas.

**La correction.** On ne soustrait plus. L'état d'une partie — les deux scores
ET le multiplicateur — est **rejoué** depuis la liste des buts, qui fait seule
foi. Ajouter, c'est rejouer la liste plus un ; annuler, c'est rejouer la liste
moins un. L'annulation redevient exacte par construction.

C'est le chantier 9.1 appliqué un cran plus bas : dériver plutôt qu'entretenir.

- `lib/game/goalEngine.ts` — module pur, aucun accès Firestore
- `lib/game/goalEngine.test.ts` — **63 tests**, dont 32 en aller-retour : pour
  chaque type de but et chaque état de départ, ajouter puis annuler doit rendre
  l'état exact d'avant.

**Un score négatif est NORMAL.** Une gamelle encaissée à 0 met bien l'équipe à
-1 : c'est la règle du jeu. J'avais posé un plancher à zéro en croyant corriger
un bug — c'était moi le bug. Retiré. Neuf parties de production portent un score
négatif, et elles ont raison.

Corollaire, mis en test explicite : l'annulation retire **le dernier but, et lui
seul**. Deux gamelles encaissées d'affilée font 0, -1, -2 ; annuler ramène à -1,
pas à 0.

**Ce que l'audit de production a révélé** (`npm run audit:scores`, 23/08) :

| | |
|---|---|
| Parties examinées | 1 020 |
| Forfaits exclus (aucun but, score symbolique) | 209 |
| Écart entre le score stocké et le rejeu | **3** sur 811 |
| dont le vainqueur serait différent | 2 |

Trois parties seulement, toutes avec un score stocké **supérieur** à ce que
leurs buts produisent — la signature de l'ancienne soustraction.

Deux surprises au passage :
- **19 buts portent leur position dans le champ `type`** (`type: 'attack'`) — une
  version ancienne de l'application. Le moteur leur rend le point qu'ils
  valaient à l'époque, sinon ces parties-là rejoueraient à 0-0.
- Les **forfaits** n'ont aucun but : leur score est symbolique, écrit par
  `forfeitGame`. Le rejeu ne s'y applique pas, l'audit les exclut.

**Décision prise (Sacha, 23/08) : on ne corrige pas les parties déjà
enregistrées.** Leur ELO a été distribué sur le résultat de l'époque. Trois
parties sur mille, dont deux au vainqueur discutable — ça ne vaut pas de
réécrire l'historique. `audit:scores` reste là pour surveiller que le compteur
ne remonte pas.

### 9.5 [a faire] Agrégations client-side
`getUserGames` et les classements par lieu/amis rechargent **toutes** les parties et filtrent côté
client. Acceptable à 100 joueurs. ATTENTION: Mais les classements **par saison** vont ajouter un filtre
temporel par-dessus — à surveiller au bloc 3.

### 9.6 [fait] Fichiers parasites à la racine — *23 août 2026*
- `src.zip` : 308 Ko, non suivis et non ignorés — une archive de travail à un doigt d'être
  commitée par un `git add -A`. Ajouté au `.gitignore`. Le fichier reste sur le disque :
  c'est à Sacha de le supprimer s'il n'en veut plus.
- `firebase-debug.log` : 86 Ko de log **déjà commité**. Sorti de l'index, il n'est plus
  dans le dépôt. Il était déjà au `.gitignore`, il ne reviendra pas.

### 9.9 [fait] BUG: Erreur en fin de partie sans lieu — *20 août 2026*
`endGame` appelait `updateVenueStats(game.venueId)` avec `venueId: 'none'` quand aucun lieu n'était
choisi. Vérifié en base : **`venues/none` n'existe pas**, et **5 parties portent cette valeur**.
`updateDoc` sur un document inexistant échoue -> l'erreur remontait au joueur **alors que la partie
était correctement enregistrée et les stats écrites**.
- [fait] La route serveur saute la mise à jour quand `venueId` vaut `none`, et ne fait jamais échouer
  la clôture sur une erreur de stats de lieu (les données importantes sont déjà écrites).

### 9.8 [a faire] BUG: Deux inscriptions ratées ont laissé des comptes fantômes
`cyrcyr007.cl@gmail.com` et `tanguy.laurent@ulb.be` (18 février 2026) ont un compte
d'authentification **mais aucun document Firestore**. Ils peuvent se connecter et n'ont pas de profil :
l'app leur est inutilisable.
- **Cause** : [`registerComplete`](../../src/lib/firebase/auth.ts) crée le compte Auth **avant** de
  vérifier la disponibilité du pseudo et d'écrire le document. Si quoi que ce soit échoue entre les
  deux, le compte Auth reste orphelin.
- **À corriger** : rendre l'inscription atomique, ou ajouter une réparation au chargement
  (compte Auth sans document -> renvoyer vers l'écran de choix de pseudo). La seconde option
  résout aussi le cas Google du chantier 0.7 — même écran, même code.
- **Ces 2 joueurs sont récupérables** : il suffit de leur créer leur document.

### 9.10 [en cours] La page de match casse dès qu'on y ajoute quoi que ce soit
Signalé par Sacha : ajouter le badge de mode a décalé la mise en page et coupé le bouton
« Terminer ». Corrigé au cas par cas (positionnement absolu), mais la cause est structurelle.

[`game-page.module.css`](../../src/app/game/[id]/game-page.module.css) impose des dimensions fixes
en mode paysage forcé (`width: 86vh`, `height: 100vw`, `overflow: hidden`, une quinzaine de
`!important`). Tout contenu ajouté au flux repousse le reste hors de la zone visible, sans aucun
signal.

Sacha : « normalement tout doit être intelligent en fonction des bonnes tailles, ne jamais avoir
des soucis comme ça ».

- [fait] **Première passe (20/08)** : `.container` occupe la hauteur disponible, `min-height: 0`
  autorise la compression des enfants flex, et le débordement **défile au lieu d'être rogné**.
  L'espacement se resserre sous 560 px puis 420 px de hauteur avant d'en arriver là.
  La carte de score ne se comprime pas ; c'est la zone de commandes qui absorbe.
  **Conséquence : on ne peut plus perdre un bouton.** Au pire, on fait défiler.
- [a faire] Le reste des dimensions figées (`width: 86vh`, `height: 100vw`, une quinzaine de
  `!important`) tient toujours. À reprendre avec le bloc 5.

**Leçon retenue, notée ici volontairement** : la première correction posait la pilule en
positionnement absolu pour « ne rien décaler ». Elle recouvrait le chrono. Sortir un élément du
flux ne l'intègre pas, ça le superpose. La bonne réponse est que la mise en page absorbe.

### 9.11 [fait] Le mode de jeu dans les tournois — *20 août 2026*
Vérifié : `lib/firebase/tournaments.ts` ne connaît pas `modeId`. Un tournoi ne peut donc pas se
jouer en bibitif, alors que c'est exactement le contexte où ça a du sens — plusieurs matchs
d'affilée, au bar, entre les mêmes personnes.

[fait] `modeId` sur la définition de tournoi, choisi une fois à la création et recopié sur chaque
match. Des règles qui changeraient d'un match à l'autre n'auraient aucun sens. Le moteur de règles
n'a pas bougé d'une ligne — c'était l'intérêt de le séparer.

**Trois bugs trouvés en révisant le système de tournoi :**
1. BUG: **Les parties de tournoi s'affichaient toutes en gris.** Le repli de couleur écrivait un
   objet `{ primary, secondary }` là où `Team.color` attend `'red' | 'blue' | …`. GameBoard fait
   `styles[team.color]` pour choisir son thème : la clé n'existait pas, retour au gris neutre.
2. BUG: **L'objet de partie n'était pas typé** (`const game = {}` sans annotation), donc TypeScript
   ne vérifiait rien. C'est ce qui a laissé passer le point 1. Typé désormais, ce qui a immédiatement
   révélé deux champs absents des types : `Team.name` et `Game.gameType`.
3. ATTENTION: `gameType` (le score cible) est **écrit mais lu nulle part**, et les parties libres ne
   l'écrivent pas du tout. La fin de partie est déclenchée manuellement dans les deux cas. Champ
   conservé pour ne pas invalider les tournois enregistrés, à unifier ou supprimer.

### 9.12 [fait] Le pic d'ELO reconstitué depuis l'historique — *20 août 2026*
Idée de Sacha : « est-ce qu'on n'a pas juste un historique de l'ELO ? Et dans l'historique, prendre
le plus haut. » Exactement — `stats.eloHistory` existe depuis toujours, une entrée par partie.
Aucune migration n'était nécessaire.

[fait] `resolvePeakElo()` prend le maximum de trois sources : `peakElo` (exact, depuis le 20/08),
le maximum d'`eloHistory` (reconstitué), et l'ELO courant (un record peut être en cours). 5 tests.
ATTENTION: `eloHistory` a des trous — parties avec invités, parties abandonnées. Le pic reconstitué
est un **plancher**, pas une valeur certifiée. Suffisant pour un affichage de fierté ; insuffisant
pour attribuer une récompense de saison.

### 9.12-ancien [obsolete] Le pic d'ELO n'existe pas pour les comptes antérieurs
`peakElo` n'est alimenté que depuis le 20/08. Les 147 comptes existants n'en ont pas, et le profil
n'affiche donc rien pour eux tant qu'ils n'ont pas battu leur record actuel.
Un script de reconstitution best-effort depuis `eloHistory` est possible, avec ses trous — à
décider en même temps que D3.

### 9.13 [en cours] Unités de fenêtre dans un conteneur pivoté
BUG: **Corrigé pour l'animation du but flash** (signalé par Sacha : l'éclair apparaissait en bas à
gauche, coupé).

Cause propre à cette app : la page de match applique `transform: rotate(90deg)` sur un conteneur
parent. En CSS, **tout ancêtre porteur d'un `transform` devient le bloc conteneur des descendants
en `position: fixed`** — ils cessent d'être calés sur la fenêtre. Et ce conteneur a ses dimensions
inversées (`width: 86vh; height: 100vw`), donc `100vw` × `100vh` désigne une zone qui n'a plus
rien à voir avec l'écran.

[fait] `flashOverlay`, `EloChangeDisplay` et `GageToast` utilisent désormais `inset: 0` et des
pourcentages. Règle notée dans le CSS : **ne jamais utiliser `100vw`/`100vh` sur une superposition
de cette app.**

[a faire] `.viewerMode` (vue spectateur) utilise encore `calc(100vh - 100px)` et `100vh`. Même
cause probable, mais je ne peux pas vérifier le rendu de cette vue — à traiter avec le reste
du chantier 9.10.

### 9.14 [a faire] Seuil du badge MVP relevé — *fait le 21 août 2026*
Sacha : « 20 % de tes parties, c'est beaucoup trop. » Exact : en 2v2, un joueur sur deux est MVP
une partie sur deux, donc à 20 % le badge tombait presque au hasard. Passé à **30 %**, dans le
calcul (`statsCalculator`) comme dans le texte affiché (`badgeConfig`).

### 9.15 [fait] Classes de bouton jamais définies — *21 août 2026*
BUG: Signalé par Sacha : « le bouton pour lancer une partie a un fond blanc bizarre au-delà du
bouton ».

Cause : `.btn-primary-shadow` et `.btn-primary-content` sont utilisées dans **12 endroits du
markup** et n'étaient **définies nulle part** dans le CSS. Idem pour `.btn-secondary-*`.
Résultat : `.btn-primary` s'affichait en bloc beige pleine largeur, avec le div d'ombre vide qui
prenait une ligne de hauteur — d'où le débord.

[fait] Les trois classes sont définies de façon cohérente : conteneur transparent, couche d'ombre
décalée, face visible. Le bouton s'enfonce à l'appui, comme le reste de l'app.

### 9.16 [fait] Le fond terrain défilait avec le contenu — *21 août 2026*
BUG: Conséquence du chantier 5.5. En retirant `background-attachment: fixed` (qui causait de vrais
bugs mobiles), le motif s'est mis à défiler avec la page.

[fait] Le motif est porté par un **pseudo-élément `body::before` en `position: fixed`** derrière
tout le contenu. Terrain immobile, sans le bug mobile de `background-attachment`.

### 9.17 [fait] Lignes de terrain rendues visibles par erreur — *21 août 2026*
Signalé par Sacha : « tu as changé les lignes du terrain, c'était mieux avant ».

Il avait raison, et pour une raison que je n'avais pas vue : les lignes droites et diagonales
s'appuyaient sur une classe `.field-line` qui **n'a jamais existé dans le CSS**. Elles ne rendaient
donc rien depuis toujours. En les migrant hors de Tailwind, je les ai rendues visibles pour la
première fois.

[fait] Lignes droites et diagonales retirées. Le rond central et les arcs de coin, eux, étaient
réellement affichés (classes Tailwind valides) : ils restent.
[fait] Confirmé par Sacha après coup : « je préfère voir que le centre, c'est mieux comme ça ».

### 9.21 [fait] Deux systèmes de boutons en parallèle — *21 août 2026*
Sacha, sur le bouton « Tableau de bord » : « il y a un problème d'unification, il faut juste
récupérer l'unification ». Il avait raison, et la cause était plus profonde que l'apparence.

Le projet avait **deux systèmes de boutons** :
- le composant `<Button>` de `components/common/ui`, construit au chantier 5.2 ;
- un trio de classes globales `.btn-primary` / `-shadow` / `-content`, **46 usages**.

Deux systèmes pour la même chose, ce sont deux comportements à maintenir en accord. Ils ne
l'étaient pas :
- `-shadow` et `-content` étaient utilisées dans 12 endroits **sans jamais avoir été définies** ;
- un `<button>` qui les enveloppait laissait passer son fond par défaut — le halo clair ;
- certains endroits imbriquaient `.btn-secondary` DANS `.btn-secondary`, doublant bordure et ombre ;
- l'icône et le texte n'avaient ni alignement ni espacement communs.

[fait] **Les 46 usages sont migrés vers `<Button>`**, et les classes globales sont **supprimées de
`common.css`**. Un commentaire à leur place explique pourquoi ne pas les réintroduire.
[fait] Corrigé au passage : un `<Button>` était imbriqué dans un `<Link>` — un `<button>` dans un
`<a>` est du HTML invalide. Remplacé par un lien stylé.

### 9.18 [fait] Halo clair autour des boutons — *21 août 2026*
BUG: Signalé par Sacha sur « Lancer le match » et « Tableau de bord ».

Deux causes distinctes :
1. Un `<button>` enveloppant un `.btn-primary` **garde le fond et la bordure par défaut du
   navigateur** s'il ne les réinitialise pas. Certaines pages le faisaient en style inline,
   d'autres non — d'où un halo clair autour du bouton. Corrigé globalement par une règle
   `button:has(> .btn-primary)` : chaque page n'a plus à y penser.
2. Le bouton « Tableau de bord » portait `className="btn-secondary"` sur le `<button>` **ET**
   sur un `<div>` imbriqué à l'intérieur. Double bordure, double ombre.

### 9.19 [fait] Le décor de terrain s'arrêtait au bout d'un écran — *21 août 2026*
BUG: Signalé par Sacha : « le fond, il tient que dans une taille d'écran, s'il y a du scroll les
lignes disparaissent ».

`FieldBackground` était en `position: absolute` dans le conteneur de défilement : il ne couvrait
que le cadre visible, pas la hauteur du contenu. Passé en `position: fixed`, comme le motif de
terrain — le décor reste derrière le contenu quelle que soit la longueur de la page.

### 9.20 [fait] Textes noirs sur fond vert, page des équipes — *21 août 2026*
Le titre et le sous-titre de la préparation des équipes se posent directement sur le fond terrain,
pas sur une carte : ils étaient en noir sur vert foncé. Passés en blanc avec contre-ombre, comme
les titres de page.

### 9.22 [a faire] `targetScore` est devenu vestigial
Le score cible d'un tournoi n'est plus demandé à la création (retiré le 21/08) et n'était déjà lu
nulle part par le moteur de jeu : une partie se termine quand l'hôte le décide.

La valeur `6` continue d'être écrite pour ne pas invalider la structure des tournois enregistrés.
À supprimer proprement du type `Tournament` et de `createTournament` lors d'un passage sur la
dette technique — en même temps que `Game.gameType`, qui a exactement le même statut.

### 9.23 [fait] Se connecter avec Google supprime le mot de passe

> Réglé le 21 août 2026. Correctif complet plus bas, section « 9.23 [fait] Vérification d'adresse email ».
ATTENTION: **Comportement de Firebase, pas un bug de l'app — mais il surprend, et il nous a
surpris.** Sacha, le 21/08 : « j'essaie de me reconnecter avec mon compte et il me met mot de
passe incorrect ».

Vérifié sur son compte : il ne porte plus que le fournisseur `google.com`. **Le mot de passe a
disparu.** Les données sont intactes — même UID, Astroboy, 218 parties, 1203 d'ELO.

**Pourquoi** : quand on rattache un fournisseur qui VÉRIFIE l'adresse (Google) à un compte dont
l'adresse n'avait **jamais été vérifiée**, Firebase supprime l'identifiant mot de passe. C'est une
protection contre le vol de compte : une adresse non vérifiée aurait pu être revendiquée par
quelqu'un d'autre.

**Ampleur mesurée sur le parc :**

| | |
|---|---|
| Comptes avec mot de passe | 142 |
| dont adresse **vérifiée** | **2** |
| dont adresse non vérifiée **et** Google | **106** — exposés au même scénario |

L'app **n'a jamais envoyé d'email de vérification** (`sendEmailVerification` n'apparaît nulle part).

ATTENTION: **« Mot de passe oublié » NE FONCTIONNE PAS dans ce cas.** Firebase ne peut pas
réinitialiser un mot de passe qui n'existe plus, et avec la protection contre l'énumération
d'adresses il échoue **en silence** : aucun email, aucun message d'erreur. Le bouton de la console
Firebase échoue pour la même raison. C'est ce qui a bloqué Sacha pendant une heure.

**La seule récupération** : réattacher un fournisseur `password` avec le SDK admin
(`auth.updateUser(uid, { password })`), puis générer un lien de réinitialisation. L'UID ne change
pas, aucune donnée n'est touchée. Fait pour le compte de Sacha le 21/08.

ATTENTION: **Cela veut dire qu'un joueur bloqué ne peut PAS se débloquer seul.** C'est ce qui rend
la vérification d'email à l'inscription non négociable avant le drop : sans elle, 106 joueurs
peuvent se retrouver dehors sans aucun recours de leur côté.

[fait] **Avertissement ajouté avant la liaison** : l'écran dit désormais explicitement que le mot
de passe actuel ne fonctionnera plus, et rappelle comment en redéfinir un.

[fait] **Message explicite à la connexion.** Idée de Sacha : « on mettrait pas un message en mode
adresse mail connue, connectez-vous par Google ». Exactement ce qui lui a manqué.
Route [`POST /api/auth/methods`](../../src/app/api/auth/methods/route.ts) : quand une connexion par
mot de passe échoue, le serveur dit si ce compte n'a plus que Google, et l'écran affiche
« Ce compte se connecte avec Google » au lieu de « Mot de passe incorrect ».
ATTENTION: La route ne révèle JAMAIS si une adresse existe — inconnue et connue-en-mot-de-passe
renvoient la même réponse. Sinon elle deviendrait un outil pour tester qui est inscrit.

[a faire] **Envoyer un email de vérification à l'inscription.** C'est la vraie parade : une adresse
vérifiée n'est jamais dépossédée de son mot de passe. À faire avant d'ouvrir la V2 aux 144 autres
joueurs — sinon 106 d'entre eux perdront leur mot de passe sans comprendre pourquoi.

### 9.24 [fait] La bannière décidait de la hauteur des lignes — *21 août 2026*
BUG: Signalé par Sacha : « tous ceux qui n'ont pas de bannière n'ont pas la même hauteur, ça me
dérange, il faut vraiment un élément unifié ».

`PlayerBanner` n'imposait un `aspect-ratio` **que lorsqu'une bannière était présente**. Une ligne
avec bannière faisait environ 108 px, une ligne sans en faisait 60. Dans une même liste, les
hauteurs alternaient selon que le joueur possédait ou non un cosmétique — une inégalité de
présentation créée par un objet purement décoratif.

ATTENTION: **Deux tentatives ratées avant de trouver la cause.** J'ai d'abord cru à un problème de
hauteur, puis de ratio. Ce n'était ni l'un ni l'autre : **le ratio était déjà identique**.
Ce qui différait, c'était la BOÎTE autour. `.profileHeader` ajoutait `padding`, `border` et
`border-radius` ; `.listItem` avait un rembourrage horizontal seulement, pas d'arrondi, et vivait
dans un conteneur qui portait lui-même le contour. Même ratio, boîtes différentes, rendus
différents — pour un composant censé être unique.

[fait] **Toute la forme est désormais définie dans `PlayerBanner`, une seule fois** : ratio, fond,
contour, arrondi, rembourrage. Les pages appelantes ne décrivent plus que leur **disposition
interne** — grille ou flex, colonnes, espacement entre enfants. Jamais la forme.
Vérifié : `.listItem`, `.profileHeader` et `.playerItem` ne contiennent plus **aucune** règle de
forme.

[fait] Le conteneur de liste du classement n'a plus ni fond ni contour : chaque ligne porte les
siens, exactement comme l'en-tête de profil. Il ne fait qu'espacer les lignes.

[fait] **Le ratio du profil fait référence, et s'applique partout.** Sacha : « prends le format,
largeur, hauteur, ratio exact que j'ai dans le profil, et mets ça comme référence pour le
classement et le lobby ».
`PlayerBanner` applique désormais `--banner-aspect-ratio` (4:1) à **toutes** les lignes, avec ou
sans bannière. Classement, lancement de partie, en-tête de profil : exactement la même forme.
[fait] **Il n'existe plus de hauteur de ligne séparée.** J'avais d'abord introduit un token
`--player-row-height` de 60 px — ce qui créait une DEUXIÈME référence, différente de celle du
profil. Supprimé : la hauteur découle du ratio, et d'une seule source.
[fait] Une ligne sans bannière reçoit un fond de surface neutre au lieu de rester transparente :
les deux cas deviennent comparables.

ATTENTION: piège rencontré — la classe de `PlayerBanner` est posée sur **le même élément** que
celle de la page appelante (`.listItem`, `.playerItem`). Y fixer `display` serait entré en conflit
avec leur grille ou leur flex, et le gagnant aurait dépendu de l'ordre des feuilles de style.
Le composant ne pose donc que ce qui lui appartient : hauteur, fond, rognage.

### 9.25 [fait] Le titre du profil dépareillait — *21 août 2026*
`ProfileContent` et `/profile` définissaient chacun leur propre `.title`, plus petit et sans
contre-ombre. Le titre « Tableau de Bord » ne ressemblait donc pas aux titres des autres pages.
Aligné sur le traitement de `PageHeader`.

### 9.26 [fait] Le bouton central de navigation semblait bloqué enfoncé — *21 août 2026*
BUG: J'avais signalé l'état actif par un enfoncement, en reprenant la grammaire des onglets.
Mais un bouton d'ACTION figé en position basse donne l'impression d'être resté appuyé — c'est
exactement ce que Sacha a constaté, deux fois.
L'état actif se signale désormais par un vert plus profond et un anneau, sans déplacement.
**Un déplacement permanent ne peut pas servir à indiquer un état** : il est indiscernable d'un
appui qui n'est pas retombé.

### 9.27 [fait] Habillage unifié des lignes de joueur — *21 août 2026*
Suite de 9.24, après quatre allers-retours. Corrections finales sur retours de Sacha :

[fait] **Ratio 4:1 -> 4,5:1** (`9 / 2`). À 4:1, une ligne de classement dépassait 100 px et la
liste devenait interminable. Le format source passe à **1800 × 400** ; aucune bannière n'ayant
encore été produite, le changement n'invalide rien. Le brief de design est à jour.
[fait] **Colonne de rang en largeur `auto`** au lieu d'une valeur fixe : la largeur fixe réservait
plus de place qu'il n'en fallait et laissait un vide entre le rang et l'avatar.
[fait] **Lignes collées** : leurs contours se chevauchent de 3 px pour ne former qu'un seul trait,
au lieu d'un double liseré. Chaque ligne garde sa boîte, identique à celle du profil.
[fait] **Le survol assombrit au lieu d'éclaircir.** Il délavait la ligne beige jusqu'à
l'illisibilité. Sur une ligne à bannière, c'est le VOILE qui s'approfondit — une couleur de fond
n'y serait pas visible, l'image la recouvre.
ATTENTION: le survol utilise `background-color` et non le raccourci `background`, qui
réinitialiserait l'image de fond des lignes à bannière.

### 9.28 [fait] Une couleur de fond REMPLACE, elle ne se superpose pas — *21 août 2026*
BUG: La même erreur, commise à trois endroits, et je l'avais introduite moi-même en croyant
« poser un voile » :

```css
background: rgba(45, 133, 49, 0.12);   /* remplace le crème opaque */
```

Une couleur de fond translucide posée sur une surface **remplace** sa couleur, elle ne s'y ajoute
pas. La ligne perdait son crème et laissait voir le fond terrain à travers — ce que Sacha
décrivait par « le fond devient invisible ». Il ne s'agissait même pas du survol, mais de la
ligne du joueur connecté, qui était dans cet état en permanence.

[fait] Teinte opaque `--tint-primary` pour la ligne du joueur connecté.
[fait] Survol d'une ligne sans bannière : `--color-surface-sunken`, opaque.
[fait] Survol d'une ligne avec bannière : c'est le voile qui s'approfondit, une couleur de fond
n'y serait pas visible.
[fait] La règle de survol en double dans le classement est supprimée : `PlayerBanner` s'en charge
pour toutes les listes.

**Pour superposer, il faut un calque** (`::before`, `box-shadow` interne), pas une couleur de
fond translucide.

### 9.29 [fait] L'image de bannière s'arrêtait avant le bord — *21 août 2026*
BUG: Signalé trois fois par Sacha : « il y a un espace vide à gauche de l'image dans le
classement ». Je cherchais du côté des dimensions ; la cause était ailleurs.

Par défaut, une image de fond est positionnée et dimensionnée par rapport à la **boîte de
rembourrage**, pas à la boîte de bordure. `PlayerBanner` ayant 16 px de rembourrage, l'image
s'arrêtait 16 px avant le bord sur tout le pourtour — visible surtout à gauche, où le rang se
pose par-dessus.

[fait] `background-origin: border-box` : l'image couvre désormais toute la boîte.

### 9.30 [fait] Le « vide à gauche » : le raccourci `background` annulait le cadrage — *21 août 2026*
Signalé **quatre fois** par Sacha. Mes trois premiers diagnostics étaient faux, dont un la veille où
j'ai conclu à tort que le CSS était correct et que le vide venait de l'image.

**La cause réelle**, dans `leaderboard/page.module.css` :

```css
.currentUserItem { background: var(--tint-primary); }   /* RACCOURCI */
```

Le raccourci `background` ne change pas seulement la couleur : il **remet à zéro toutes les autres
propriétés de fond non citées**, dont `background-origin`. Le correctif `border-box` posé la veille
(9.29) était donc annulé sur cette ligne. L'image se repliait dans la boîte de rembourrage et
laissait 16 px de vert pâle tout autour — à gauche surtout, là où le rang se pose.

**Pourquoi je ne l'ai pas trouvé plus tôt** : `.currentUserItem` ne s'applique qu'à **une seule
ligne du classement**, la sienne. Je raisonnais sur les autres lignes, où tout était correct.
Le profil ne porte pas cette classe — d'où « je ne le vois pas dans le profil », l'indice qu'il
m'a donné dès le départ et que j'ai mal exploité.

**Correctif final** : la barre d'accent verte de 4 px à gauche était ce que Sacha lisait comme un
« trou ». Sa ligne ne se distingue plus que par un **contour doré** (`.listItem.myItem`,
`border-color: var(--medal-gold)`) — rien qui touche au fond, donc rien qui puisse à nouveau
annuler le cadrage de l'image. Les numéros de rang restent en `--text-xl`.

**Règle qui en découle, valable partout** : pour distinguer une ligne à bannière, on ne touche
qu'au **contour**, jamais au fond.

**Ce qui a été fait**
- `.wrap.hasBanner` (deux classes) dans `PlayerBanner.module.css` : la règle l'emporte désormais
  sur toute classe unique de page, quel que soit l'ordre des feuilles de style — qui n'est pas
  garanti entre modules CSS.
- `.currentUserItem` passe à `background-color` détaillé.
- Balayage des trois pages consommatrices : c'était le seul cas.
- **Garde-fou** `npm run check:banner` — échoue si une classe passée à `<PlayerBanner>` utilise le
  raccourci `background`. Vérifié en réintroduisant volontairement le défaut.

**Leçon** : deux fausses pistes vérifiées (le calcul de `cover`, l'alpha du PNG mesuré à 255 partout)
avant de lire simplement le CSS de la page appelante. Quand un défaut ne touche qu'un élément d'une
liste, la première question est **ce que cet élément a de particulier** — ici, une classe de plus.

### 9.23 [fait] Vérification d'adresse email — *21 août 2026*

**Sans blocage** : un joueur non vérifié garde l'accès complet. Le but n'est pas de filtrer, c'est
d'empêcher la suppression silencieuse du mot de passe (voir l'audit ci-dessous).

| Pièce | Fichier |
|---|---|
| Règle de ciblage, pure et testée (16 tests) | `src/lib/auth/emailVerification.ts` |
| Envoi à l'inscription + renvoi + relecture de l'état | `src/lib/firebase/auth.ts` |
| Bandeau | `src/components/common/EmailVerificationBanner.tsx` |
| Monté sur | `src/app/dashboard/page.tsx` |

**Ciblage** — le bandeau ne s'affiche que si les trois conditions sont réunies : le compte a une
adresse, elle n'est pas vérifiée, et il possède un identifiant mot de passe. Un compte créé avec
Google a son adresse vérifiée d'office et n'a aucun mot de passe à perdre : on ne le sollicite pas.

**Report** — « Plus tard » écarte le bandeau 7 jours, par compte, dans le stockage local.

**Retour de la boîte mail** — `emailVerified` est figé dans le jeton local et reste faux après le
clic sur le lien. Au retour sur l'onglet (`focus`), on appelle `reload()` puis on regénère le jeton :
le bandeau disparaît tout seul.

**Deux pièges React 19 rencontrés, tous deux signalés par ESLint**
- `Date.now()` pendant le rendu rend le composant non idempotent → l'instant est figé une fois via
  un initialiseur paresseux de `useState`.
- `setState` synchrone dans un effet provoque des rendus en cascade → la lecture du stockage local
  passe par `useSyncExternalStore`, qui est fait pour ça et gère l'instantané serveur.
  L'événement `storage` ne se déclenchant que dans les autres onglets, on tient notre propre liste
  d'abonnés pour que « Plus tard » agisse immédiatement.

**À faire par Sacha** : vérifier dans la console Firebase (Authentication → Templates → Validation
de l'adresse e-mail) que le modèle est **en français** et que le nom d'expéditeur est correct.
C'est le seul point que je ne peux pas régler depuis le code.

### Audit d'authentification — *21 août 2026* (chiffres réels, `node scripts/audit-auth.mjs`)

| | comptes |
|---|---|
| Total Auth | **147** |
| Avec mot de passe | 143 |
| — dont adresse **vérifiée** | **3** |
| — dont adresse **non vérifiée** | **140** |
| Avec Google | 1 |
| Anonymes (0 partie, aucun doc) | 4 |
| Adresse **non-Google** | **34** |

Domaines non-Google : hotmail.com (12), icloud.com (4), yahoo.com (3), ulb.be (2), outlook.\* (3),
hotmail.fr/.be (2), yahoo.fr, mail.be, mail.com, cerclepolytechnique.be, duluins.be, vandamme.info,
glibert.io, example.com.

**Décision : vérification d'email. On ne force PAS Google.**

- Forcer Google enfermerait dehors **34 personnes (24 %)**, définitivement, sans recours possible
  sur le plan Spark. Six semaines avant la saison 1, c'est non.
- La vérification d'email n'est pas une case à cocher de sécurité, c'est **le correctif de la cause** :
  Firebase ne supprime que les mots de passe dont l'adresse n'est **pas vérifiée**. Adresse vérifiée
  = les deux méthodes coexistent définitivement, et le défaut disparaît de lui-même.
- **Sans blocage** : un non-vérifié garde l'accès complet. Un mur d'inscription six semaines avant
  la saison 1, avec ~100 joueurs réels, c'est du support pour rien.

À nettoyer au passage : 4 comptes anonymes (0 partie), 6 comptes Auth sans document Firestore,
1 adresse `example.com`.

### 9.7 [fait] `goalsConceded` doublé en 2v2 — documenté — *23 août 2026*
Chaque joueur d'une équipe reçoit les mêmes buts encaissés. C'est **voulu** : « les buts encaissés
pendant que je jouais » a un sens pour un joueur, et c'est ce qu'affiche son profil.

La conséquence est maintenant écrite noir sur blanc dans la route de fin de partie : **toute somme
de `goalsConceded` sur plusieurs joueurs compte les buts de 2v2 deux fois.** Un total « buts
encaissés cette saison » calculé ainsi serait faux, sans qu'aucune erreur ne le signale. Pour un
vrai total, il faut repartir des parties.

---

## Décisions en attente
> Règle : ne jamais trancher ces points sans l'équipe. Implémenter la mécanique avec la valeur en
> config, poser un `// PROVISOIRE` clairement marqué.

### [fait] Tranchées
| # | Question | Décision |
|---|---|---|
| D1 | Plan Firebase / Cloud Functions | **Spark, on n'y touche pas.** La couche serveur passe par des Route Handlers Next.js sur Vercel + `firebase-admin` (voir 0.3). Zéro coût, frontière de confiance identique |
| D3 | `peakElo` de la saison 0 non reconstituable | **On applique `getRankInfo()` à l'ELO final** pour catégoriser. La règle ELO->grade existe déjà, elle suffit. `peakElo` exact à partir de la saison 1 |
| D2 | Durée d'une saison | **≈ 4 mois**, comme le doc `31`. Mais la durée n'est **pas** un déclencheur : la clôture est une **action admin manuelle**, jamais un calendrier |
| D4 | Le soft reset touche-t-il les inactifs ? | **Question retirée** — elle demandait si un joueur qui n'a pas joué de la saison voit quand même son ELO tiré vers 1000. Réponse retenue : oui, tout le monde, sans exception. Plus simple à expliquer, et un joueur inactif qui revient retrouve un écart rattrapable |
| D6 | Nombre de bannières de récompense | **5 — une par grade** : Argent, Or, Diamant, Master, GrandMaster. Pas de sous-paliers (I/II/III). Plus la bannière « Pionnier » pour tous les actifs = **6 assets au total** |

### [urgent] Encore bloquant pour septembre
| # | Question | Bloque | Avis |
|---|---|---|---|
| D5 | **Coefficient du soft reset** | 3.3 | À calibrer ensemble sur les vraies données une fois 3.1 en place |

### Non bloquant
| # | Question | Bloque |
|---|---|---|
| ~~D7~~ | ~~Bornage de l'historique~~ **TRANCHÉ 22/08 : supprimé, pas déplacé** | 1.4 |
| D8 | Page pilote du design system (classement / profil / accueil) | 5.3 |
| D9 | Éradiquer Tailwind vraiment, ou le tolérer hors `.module.css` pendant la migration ? | 5.4 |
| D10 | Formule 2v2 : pondération équipe/individu, partenaire fort, marge de score, rôle des buts | 1.6 |
| D11 | Palette de teintes avatar : libres, débloquables, ou liste fermée ? | 6.2 |
| D12 | Valeurs hex de la palette arcade | 5.1 |
| D13 | Probabilités, prix, pity, conversion des doublons | Bloc 4 |
| D14 | Période de rotation du code event + dispositif d'affichage sur place | Bloc 8 |

---

## À toi de jouer
Ce que je ne peux pas faire à ta place, par ordre d'urgence.

### 1. [urgent] Designer les 6 bannières
 **[Brief visuel complet ->](https://claude.ai/code/artifact/9b8eed30-b8e2-4a9d-9ba4-b196c5b15546)**
Réglages Affinity, schéma des zones à l'échelle, ce que l'app dessine par-dessus, export, checklist.

Résumé ci-dessous.

ATTENTION: **Le format est passé de 1600 × 400 à 1800 × 400 le 21/08** (ratio 4:1 -> 4,5:1).

> **Le brief complet pour Affinity est [`Doc/v2-refactor/brief-bannieres.html`](brief-bannieres.html).**
> Réglages du document, zone calme, ce que l'app dessine par-dessus, export WebP, les six fichiers
> attendus. À ouvrir dans un navigateur (double-clic sur le fichier).
> Il vivait dans un dossier temporaire de session jusqu'au 21/08 — il aurait disparu.
À 4:1, une ligne de classement dépassait 100 px de haut et la liste devenait interminable.
Aucune bannière n'ayant encore été produite, le changement n'invalide rien.

**Réglages du document Affinity Designer :**

| Réglage | Valeur |
|---|---|
| Taille du document | **1800 × 400 px** (ratio 4,5:1) |
| DPI | 72 (c'est du web, pas d'impression) |
| Espace colorimétrique | **RVB/8** — surtout pas CMJN |
| Export | **WebP**, qualité 80 — cible **< 150 Ko** par fichier |

**Les deux zones à respecter** — poser deux repères horizontaux à **y = 40** et **y = 360** :

- **Zone sûre : la bande centrale 1600 × 320.** Tout ce qui compte (texte, logo, sujet) doit y tenir.
  Les 40 px du haut et du bas sont **rognés** dans les listes de joueurs (recadrage 5:1). Le décor
  peut déborder dedans, rien d'important.
- **Tiers gauche visuellement calme** (les 500 px de gauche environ) : le pseudo et le grade
  s'affichent **par-dessus** la bannière dans les listes. Pas de détail fin ni de texte à gauche,
  sinon c'est illisible.

**Les 6 fichiers attendus :**

| Fichier | Pour qui |
|---|---|
| `pionnier-s0.webp` | tous les joueurs actifs de la saison 0 |
| `grade-argent.webp` | ELO final < 900 |
| `grade-or.webp` | 900 – 1049 |
| `grade-diamant.webp` | 1050 – 1199 |
| `grade-master.webp` | 1200 – 1349 |
| `grade-grandmaster.webp` | ≥ 1350 |

À déposer dans `public/banners/`.

NOTE: **Deux conseils de cohérence** (tu voulais que ce soit unifié) :
- Les 5 bannières de grade doivent être **la même composition déclinée en couleur/matière**, pas
  5 designs différents. On doit lire la progression Argent -> GrandMaster d'un coup d'œil.
- Réutilise les icônes de grade existantes (`public/icons/ranks/`) comme élément commun — ça
  raccroche visuellement les bannières aux badges déjà affichés dans l'app.

NOTE: **Tu peux aussi n'en faire que 2 pour commencer** (Pionnier + une seule de grade) : le catalogue
étant en base, ajouter les autres ensuite ne demande **aucun redéploiement**. Ça permet de tester
toute la chaîne d'octroi avant de finir le design.

### 2. [a suivre] Re-exporter les bannières existantes
`CreatorV3.png` fait 5,2 Mo pour un affichage à ~400 px de large. Même format que ci-dessus.
(`CreatorV1` et `CreatorV2` ne sont utilisés nulle part — je les supprime.)

### 3bis. [a suivre] Trancher l'ordre : personnalisation ou saisons d'abord ?
Voir la [Boîte à idées](#-boîte-à-idées) — la question de l'ordre est ouverte et change plusieurs
semaines de travail. D5 (coefficient du soft reset) se calibrera ensemble sur les vraies données.

### [fait] Déjà réglé le 20/08 — plus rien à faire de ton côté
- **Règles Firestore déployées** en production, en version strictement additive (les trois
  durcissements sont derrière des interrupteurs à `false`). Aucune permission retirée aux joueurs.
- **Migration des bannières appliquée** : les 3 créateurs et `Matricule13` possèdent leur bannière.
- **V2 ouverte aux admins uniquement** (`v2 = admins`). Les 144 autres ne voient aucun changement.

BUG: Les règles de production ne connaissent ni `catalog` ni `users/{id}/inventory`. Firestore refuse
donc la lecture, et `/collection` s'affiche vide. C'est la cause du « je ne vois aucun item ».

```
npx firebase login          # une seule fois
npm run rules:deploy
```

ATTENTION: Vérifie que `clientMayWriteStats()` vaut toujours `true` dans `firestore.rules` avant de déployer
(chantier 0.2) : le passer à `false` avant que la route serveur soit en production casserait la fin
de partie pour tout le monde.

### 5. [urgent] Désactiver le provider « Anonyme »
Firebase Console -> Authentication -> Sign-in method -> **Anonyme** -> désactiver.
Regarde aussi l'onglet *Users* : s'il existe des comptes anonymes, dis-le moi avant qu'on décide
quoi en faire (leurs parties comptent dans les stats des autres joueurs).

### 6. [a suivre] Récupérer la clé de compte de service
Firebase Console -> Paramètres du projet -> Comptes de service -> Générer une nouvelle clé privée.
À poser en `serviceAccountKey.json` à la racine (désormais ignoré par git) **et** en variable
d'environnement sur Vercel. Nécessaire dès le chantier 0.3.

---

## Fait

*(rien pour l'instant — chaque chantier terminé atterrit ici avec sa date et une ligne de résumé)*

| Date | Chantier | Résumé |
|---|---|---|
| 20 août 2026 | **0.1** Config Firebase versionnée | `firebase.json` + `firestore.rules` (184 l., 8 collections) + `storage.rules` + `firestore.indexes.json`. Interrupteur `clientMayWriteStats()` prêt pour 0.2 |
| 20 août 2026 | *(hors chantier)* Clé de service protégée | `serviceAccountKey.json` et `*-firebase-adminsdk-*.json` ajoutés au `.gitignore` — le script `recalculate-all-stats.ts` l'attendait à la racine sans protection |
| 20 août 2026 | **0.3 + 0.4** Fin de partie côté serveur | `admin.ts` (SDK + vérification de jeton), route `POST /api/games/[id]/end`, `endGame()` client réduit à un appel réseau. Plus aucune écriture de `stats` depuis le navigateur |
| 20 août 2026 | **1.1 + 1.2 + 1.3** Correctifs ELO | Race condition (deltas au lieu de valeurs absolues), **3** définitions du MVP unifiées en une, bonus +3 écrit une seule fois |
| 20 août 2026 | **1.5** (partiel) Module de calcul pur | `src/lib/game/scoring.ts` — 268 l., zéro accès Firebase, partagé serveur/client. Tests restants |
| 20 août 2026 | **Bloc 7** Modes de jeu / bibitif | Moteur de règles sociales pur, config en fichier, sélecteur + fiche de règles, mode visible avant de rejoindre et pendant le match, gages en direct et en fin de partie. 15 tests |
| 20 août 2026 | **0.7** Connexion Google + écran de pseudo | `signInWithGoogle`, liaison au compte existant sans perdre l'UID, écran `/welcome` qui sert aussi à réparer un compte sans profil. Résout 9.8 |
| 21 août 2026 | **9.24** Hauteur de ligne unifiée | Une bannière ne change plus que le fond d'une ligne, jamais sa taille. Token `--player-row-height` partagé par le classement, le lancement de partie et la liste d'amis |
| 21 août 2026 | *(refonte)* Classement | Évolution hebdomadaire reconstituée depuis l'historique d'ELO (12 tests), rappel de position en tête, hauteur de ligne uniforme, colonne de rang élargie |
| 21 août 2026 | *(revue)* Page classement | Podium et liste montraient les 3 mêmes joueurs ; couleur du texte décidée par 3 pseudos en dur |
| 21 août 2026 | **9.23** Message « ce compte utilise Google » | Route serveur qui ne révèle jamais l'existence d'une adresse. Compte de Sacha rétabli avec les deux méthodes |
| 21 août 2026 | *(revue, 4e passe)* Survol collant sur mobile | 61 règles `:hover` placées derrière `@media (hover: hover)`, 9 états `:active` qui soulevaient au lieu d'enfoncer. Icônes du tournoi enfin dimensionnées |
| 21 août 2026 | *(revue, 3e passe)* Icônes sans dimension | 5 icônes avaient perdu leur taille au retrait de Tailwind — un SVG sans dimension remplit son conteneur, d'où les cartes géantes du tournoi. Bouton central de navigation passé au vert principal |
| 21 août 2026 | *(revue, 2e passe)* Retours de Sacha | Flèche de retour repositionnée via `onBack`, échelle resserrée (boutons, cartes de choix, en-têtes), score de victoire retiré des tournois, boutons vert foncé en crème, titre de section lisible |
| 21 août 2026 | *(revue)* Parcours de lancement | 6 pages : `PageHeader` partout, libellé de champ unifié (8 copies inline), 5 derniers boutons migrés, plus aucune couleur en dur dans le TSX |
| 21 août 2026 | **9.21** Deux systèmes de boutons unifiés | 46 usages migrés vers `<Button>`, classes globales supprimées de `common.css` |
| 21 août 2026 | *(correctifs)* Trois bugs signalés par Sacha | Classes de bouton jamais définies (12 usages), fond terrain qui défilait, lignes de terrain rendues visibles par erreur. Plus lisibilité du score et largeur de la carte de rang sur l'écran de résultats |
| 21 août 2026 | **5.4** Tailwind entièrement retiré | 66 icônes, 79 attributs, 10 `@reference`, 2 dépendances. `FieldDecorations` migré en module CSS. Deux blocs de code mort en Tailwind pur supprimés. **Le bloc 5 est terminé** |
| 21 août 2026 | *(étape 3)* Progression sur l'écran de résultats | `RankProgressBar` promu dans la librairie partagée : il n'est plus propre au profil |
| 21 août 2026 | *(étape 2)* Profil découpé | 929 -> 640 lignes. `EloChart` sorti de son composant parent (il était recréé à chaque rendu), helpers extraits, un fichier par onglet |
| 21 août 2026 | **9.14** Badge MVP à 30 % | À 20 %, en 2v2, le badge tombait presque au hasard |
| 21 août 2026 | *(étape 2)* Profil — progression et onglets | `getRankProgress` + 7 tests, barre vers le grade suivant, onze sections regroupées en trois onglets |
| 21 août 2026 | **9.13** Superpositions dans un conteneur pivoté | L'éclair du but flash apparaissait en bas à gauche, coupé : un ancêtre `transform` redéfinit le bloc conteneur des éléments `fixed`, et ce conteneur a ses dimensions inversées |
| 21 août 2026 | *(étape 1)* Célébrations de fin de partie | Module pur + 13 tests. Montée de grade, record, série. Une seule animation et un seul son à la fois. Table d'ordre des rangs dupliquée supprimée de la page de résultats |
| 20 août 2026 | **5.3** Migration terminée | **0 couleur en dur** dans tout le projet (471 au départ), alias de compatibilité supprimés, 43 fichiers migrés. Tableau de bord unifié et hiérarchisé |
| 20 août 2026 | **5.3** PageHeader unifié | Un composant d'en-tête pour toute l'app, **12 pages migrées**. Il existait 17 définitions de `.title` différentes — le titre du classement et celui du tableau de bord n'avaient ni la même taille ni le même traitement |
| 20 août 2026 | **9.11** Mode de jeu dans les tournois | + 3 bugs trouvés en révisant le système : couleurs d'équipe malformées (tournois affichés en gris), objet de partie non typé, champ `gameType` mort |
| 20 août 2026 | **9.12** Pic d'ELO reconstitué | Depuis `eloHistory`, sans migration. Fonctionne pour les 147 comptes antérieurs |
| 20 août 2026 | **5.3** (pilote) Classement migré | Onglets, médailles, lignes de liste : zéro couleur en dur. Titres unifiés, salutation du tableau de bord rendue lisible, pic d'ELO affiché sur le profil |
| 20 août 2026 | *(5.1)* Vert éclairci d'un cran | La première échelle tirait trop vers le noir |
| 20 août 2026 | **5.1 + 5.2 + 5.5** Design system | Tokens réécrits (échelle de verts unique, palette arcade, identité `--border-arcade`/`--shadow-arcade`), librairie Button/Card/Input/Badge lisant uniquement des tokens, fond terrain unifié en un seul token. Hex dans les `.module.css` : 471 -> 398 |
| 20 août 2026 | *(correctif 7.1 ter)* Pilule de mode | Sur sa propre ligne au-dessus de la carte de score. Les deux tentatives précédentes échouaient parce que la carte porte des dégradés absolus, donc un `overflow: hidden` obligatoire |
| 20 août 2026 | **9.10** (1re passe) Mise en page du match | La colonne absorbe la hauteur et défile au lieu de rogner. La pilule de mode est revenue dans le flux : en absolu, elle recouvrait le chrono |
| 20 août 2026 | *(correctif 0.7)* Bouton Google invisible au login | `useFeature` résout `admins` via l'email du joueur connecté — impossible avant connexion. Ajout de `useFeaturePreAuth`, et `config/features` passe en lecture publique (trois mots de config, aucune donnée personnelle) |
| 20 août 2026 | *(7.3)* Gages flash et contre son camp | Demi-affond pour les deux. Le CSC est le seul gage du mode qui vise celui qui marque |
| 20 août 2026 | *(correctif 7.1)* Le mode était perdu en partie invité | `handleStartGame` créait la session sans `modeId` : une partie avec invités repartait toujours en Normal, même Bibitif sélectionné. C'était la cause du « je ne vois rien » |
| 20 août 2026 | *(7.3)* Règles bibitives selon la spec de Sacha | Gorgée par but encaissé, demi-affond sur gamelle, affond sur gamelle rentrante, demi-affond sur but du gardien, 6-0. Priorité déclarative `supersedes` pour qu'une action ne produise jamais deux gages |
| 20 août 2026 | *(correctifs 7.3)* Trois bugs signalés par Sacha | Les règles de fin n'étaient jamais évaluées, le 6-0 n'existait pas, et rien n'indiquait le mode en cours de partie |
| 20 août 2026 | *(style)* Suppression de tous les emoji | Interface, code, documentation. Règle ajoutée à `CLAUDE.md` |
| 20 août 2026 | **2.13** Catalogue déclaratif | `catalog.data.mjs` + `npm run catalog:sync`, validant et idempotent. Ajouter un item = une entrée + une commande |
| 20 août 2026 | **2.12** Drapeaux de fonctionnalité | Système de « drop » par audience (`off`/`admins`/`everyone`), réglé en base sans redéploiement. Repli sur V1 en cas de panne |
| 20 août 2026 | *(prod)* Règles déployées + V2 aux admins | Déploiement additif via l'API Firebase Rules, migration des bannières appliquée, `v2 = admins` |
| 20 août 2026 | **2.11** Type `title` + filtre | Titres traités comme items à part entière. Filtre possédés/tout sur `/collection` |
| 20 août 2026 | *(outillage)* `firebase-tools` | `npm run rules:deploy` — les règles versionnées peuvent enfin partir en production |
| 20 août 2026 | **2.10** Personnalisation générique | Registre de types, rareté, page `/collection` montrant tout le catalogue (possédé + verrouillé). Ajouter un collectable = une entrée de config |
| 20 août 2026 | **2.9** Réversibilité des octrois | `revokeGrant` + `revokeBySourceRef`, 8 tests. Permet de tester une clôture de saison sur les vraies données et de l'annuler |
| 20 août 2026 | **Bloc 2** Socle collection | Catalogue Firestore (8 items, peuplé), inventaire + octrois en sous-collections, `equipped` porté jusqu'aux classements, `grantItem` idempotent, UI d'équipement, format de bannière unifié |
| 20 août 2026 | **1.5** Tests du calcul ELO | Vitest + 25 tests. Deux d'entre eux figent le défaut de « portage » et l'inflation pour qu'un futur changement de formule soit visible |
| 20 août 2026 | **9.9** Erreur en fin de partie sans lieu | `venues/none` n'existe pas -> l'erreur remontait au joueur alors que tout était enregistré |
| 20 août 2026 | *(environnement)* Build réparé | `@next/swc-darwin-arm64` était installé **sans son binaire natif** -> `npm run build` échouait avant même mes changements |
| 20 août 2026 | *(outillage)* `scripts/audit-auth.mjs` | Audit du parc de comptes par provider — a révélé 4 comptes anonymes vides, 2 inscriptions ratées, et la répartition Google/non-Google |
| 20 août 2026 | **0.6** Auth anonyme supprimée | `registerQuick()` + `signInAnonymously` + `AccountType` retirés (code mort, aucun appelant). Reste à désactiver le provider en console |
| 20 août 2026 | *(hors chantier)* `CLAUDE.md` | Instructions de travail : format de réponse structuré, section « À tester » obligatoire, règles techniques du projet |

---

## Boîte à idées
> Tout ce qui passe par la tête. Pas besoin que ce soit propre ou décidé — on trie plus tard.

- **Mode simulation pour la clôture de saison** (-> formalisé en 3.6) : voir qui recevrait quoi avant de déclencher.
- **Notification de fin de saison** : les joueurs devraient apprendre leur récompense autrement qu'en
  ouvrant l'app par hasard. Le centre de notifications existe déjà.
- **Récap de fin de saison** façon « Wrapped » : ton pic d'ELO, ton nombre de MVP, ton meilleur
  coéquipier. Toutes les données existent déjà dans les stats — c'est presque uniquement de l'affichage.
- **Bannières animées** pour les raretés hautes ? (à évaluer : coût en poids et en perfs)
- ** Animations de but et sons collectionnables — beaucoup moins cher qu'il n'y paraît.**
  Vérifié le 20/08 : `lottie-react` est **déjà installé et utilisé**
  ([`GameBoard.tsx:353`](../../src/components/game/GameBoard.tsx) joue `LIGHTNING.json` sur un but
  flash, [`EloChangeDisplay.tsx`](../../src/components/game/EloChangeDisplay.tsx) joue
  `fireworks.json` en fin de partie). Le [`soundManager`](../../src/lib/soundManager.ts) est un
  simple map `clé -> fichier`.
  **Le pipeline de lecture existe déjà et il est générique** : rendre l'animation et le son
  pilotés par le catalogue, c'est remplacer une constante par une lecture de `equipped`.
  La partie coûteuse n'est pas technique — c'est **produire les animations Lottie**.
- **Barre de navigation à quatre onglets** (idée de Sacha, 21/08) : lancement d'une partie,
  classement, catalogue et gestion des items, profil. La barre actuelle n'en a que trois et le
  bouton central est le lancement — la place du catalogue reste à trouver.
- **Voir le catalogue d'un autre joueur depuis son profil** (idée de Sacha, 21/08) : ce qu'il
  possède, à lui seul. Donne envie de collectionner ce qu'on voit chez les autres.
  La page `/collection` est déjà générique, il lui manque un mode « profil d'un tiers » en
  lecture seule.
- **Expliquer comment s'obtient un item** : pour tout item à provenance particulière (exploit,
  saison, event), la fiche doit dire comment on l'a eu, ou comment l'obtenir. Le champ
  `meta.description` existe déjà au catalogue et n'est presque pas utilisé.
- **Titre affiché à côté du pseudo** (« Champion S0 ») — un second slot cosmétique très bon marché
  en assets, contrairement aux bannières. Peut-être le meilleur contenu de pack après les bannières.

