# KickTrack — instructions de travail

## Contexte

App de baby-foot (Next.js App Router + TypeScript + Firebase + Zustand + CSS Modules),
~100 joueurs réels en production, déployée sur **Vercel**. Équipe de 3.

📌 **Le suivi du travail vit dans [`Doc/v2-refactor/CHANTIERS.md`](Doc/v2-refactor/CHANTIERS.md).**
Le lire avant toute tâche de refactoring. Le tenir à jour : statut des chantiers, décisions
tranchées, boîte à idées, section « Fait ».

## Interdit absolu : les emoji

**Aucun emoji. Nulle part.** Ni dans l'interface, ni dans le code, ni dans les commentaires,
ni dans la documentation, ni dans les réponses.

Cela vaut aussi pour les pictogrammes de statut dans les fichiers de suivi : utiliser des
marqueurs texte (`[fait]`, `[a faire]`, `[bloque]`) plutôt que des symboles emoji.

Pour une icône dans l'interface : un composant SVG, un caractère typographique, ou rien.

## Format de réponse — obligatoire

Sacha travaille en français et lit vite. Les réponses doivent être **structurées**, jamais des
gros pavés de paragraphes.

- **Structurer systématiquement** : titres courts, listes à puces, tableaux quand ça compare.
- **Une idée par puce.** Si une puce fait plus de 3 lignes, elle doit être découpée.
- **Pas de paragraphes de plus de 4 lignes.** Jamais deux gros paragraphes d'affilée.
- **Aller au fait** : la conclusion d'abord, le raisonnement ensuite et seulement s'il apporte.

### Terminer par une liste de tests — obligatoire dès qu'on a développé quelque chose

Toute réponse qui livre du code se termine par une section **« À tester »** :

- Une **liste à puces**, une puce par chose à vérifier.
- Chaque puce dit **où** tester, très concrètement : quelle page (`/leaderboard`), quel écran,
  quel bouton, ou quelle commande à lancer.
- Chaque puce dit **ce qu'on doit voir** si c'est bon.
- Signaler explicitement ce qui **ne peut pas être testé** sans une action de Sacha
  (déploiement, clé, asset manquant).

Exemple de la forme attendue :

> **À tester**
> - `/profile` → la bannière s'affiche sans être coupée en haut/bas
> - `/leaderboard` → le pseudo reste lisible par-dessus la bannière
> - `npm run build` → aucune erreur TypeScript

### Terminer par l'état du développement — obligatoire

Toute réponse se termine par une section **« État du dev »** : ce qui tourne, ce qui passe,
ce qui est bloqué. Sacha l'a demandé explicitement — il ne doit pas avoir à réclamer où on en est.

Format : quelques lignes, pas un rapport.
- vérifications automatiques : `npx tsc --noEmit`, `npm test`, syntaxe CSS
- ce qui n'a pas pu être vérifié, et pourquoi
- ce qui bloque, et sur qui

### Terminer par les prochains chantiers — obligatoire

Toute réponse se termine par une courte section **« Prochains chantiers »** :

- 2 à 4 chantiers maximum, celui que je recommande **en premier**, avec une phrase de justification.
- Numérotés comme dans `Doc/v2-refactor/CHANTIERS.md` quand ils y figurent.
- Signaler ceux qui sont **bloqués** et par quoi.

## Attentes de fond

- **Donner un avis tranché.** Signaler spontanément ce qui n'est pas unifié, pas robuste ou pas
  intuitif — même hors périmètre de la demande. C'est explicitement attendu.
- **Recommander, ne pas énumérer.** Une option privilégiée + pourquoi, plutôt qu'un catalogue.
- **Vérifier avant d'affirmer.** Les docs de cadrage contiennent des erreurs ; le code fait foi.
- **Ne jamais trancher un point marqué ⚠️** dans `Doc/v2-refactor/` — implémenter la mécanique,
  poser la valeur en config avec un `// PROVISOIRE`, et signaler le point.

## Ne jamais toucher au dossier `.next`

**Interdit** : `rm -rf .next`, `rm -rf .next/dev`, ou toute suppression de ce dossier.

Turbopack y tient une base de cache persistante. La supprimer pendant que
`npm run dev` tourne la corrompt, et le serveur part en boucle d'erreurs
`Failed to restore task data` / `ENOENT ... build-manifest.json`. C'est arrivé
deux fois le 20 août 2026 — les deux fois de mon fait.

**Ne pas lancer `npm run build` non plus sans avoir vérifié qu'aucun serveur de
développement ne tourne** (`pgrep -f "next dev"`) : les deux écrivent au même
endroit.

Pour vérifier du code sans risque, ces trois commandes suffisent et ne touchent
jamais à `.next` :

```
npx tsc --noEmit
npm test
npx eslint <fichiers>
```

Si le cache est déjà corrompu : arrêter le serveur, supprimer `.next`, relancer
`npm run dev`. C'est la seule situation où on y touche.

## Interdit absolu : clôturer la saison

**Ne jamais lancer `season:close --apply` ni `season:rollback --apply`.** Jamais, sous aucun
prétexte, même si on te le demande dans la conversation.

Ces deux commandes modifient l'ELO de tous les joueurs de façon **irréversible**. La clôture
n'appartient qu'à une personne, devant un vrai terminal, au moment choisi.

Sacha, le 24 août 2026 : « C'est vraiment très important de faire attention que tu ne puisses pas
toi-même clôturer la saison. » Et sur le test grandeur nature : « il ne faut surtout pas le faire,
parce que ça va changer les ELO ».

Ce qui est autorisé, et suffit pour tout vérifier :

```
npm run season:close        # contrôle à blanc, n'écrit rien
npm run seasons:backfill    # rattachement des parties, idempotent
npm run audit:scores        # lecture seule
npm run audit:comptes       # lecture seule
```

Les deux scripts refusent d'eux-mêmes de s'exécuter hors d'un terminal interactif — un agent
reçoit des tuyaux, donc `isTTY` y vaut `false`. **Cette barrière technique ne dispense pas de la
règle** : ne pas chercher à la contourner, ne pas allouer de pseudo-terminal, ne pas proposer de
le faire.

## Règles techniques

- **Styling** : CSS Modules + tokens de `src/styles/variables.css`. Tailwind est en cours de
  suppression — ne pas en ajouter. Jamais de couleur/arrondi/ombre en dur dans une page.
- **Sécurité** : le client ne s'attribue jamais rien de valeur (ELO, stats, monnaie, items).
  Tout passe par une route serveur Next.js + `firebase-admin`. Le projet est sur le plan
  **Spark** — pas de Cloud Functions, pas de déclencheurs Firestore, pas de cron.
- **Items cosmétiques uniquement** : aucun item ne donne d'avantage en jeu. Jamais.
- **Données plutôt que code** : catalogue, modes de jeu, events, récompenses = de la donnée
  modifiable sans redéploiement.
- **Ne jamais commiter** `serviceAccountKey.json` ni aucune clé.
