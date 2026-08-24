# 33 — Modes de jeu configurables

## Vision validée ✅

Un mode de jeu n'est pas codé en dur : c'est **un paquet de règles défini en données**,
que l'équipe peut créer/modifier facilement. Deux familles de règles, de nature différente :

| Famille | Ce qu'elle fait | Qui calcule |
|---|---|---|
| **Règles de score** | affectent score, multiplicateur, ELO (but normal +1, milieu ×2, gamelle −1…) | l'app les applique |
| **Règles sociales** | n'affectent PAS le score ; l'app détecte une condition et **affiche un message** (gage) | les joueurs au bar 🍺 |

## Périmètre V1 — décisions ✅

1. **V1 = règles sociales uniquement** (le « mode bibitif »). Le scoring reste en dur tel
   qu'il est dans `addGoal()` pour l'instant. Le moteur de règles de score configurable est
   une évolution ultérieure explicitement reportée — **concevoir la structure de données
   pour ne pas l'exclure** (une règle a un type d'effet ; V1 n'implémente que l'effet
   `message`).
2. **Définition des modes en fichier/données éditable à la main** (pas d'UI admin pour
   l'instant ; l'équipe de 3 édite la config directement). UI plus tard si besoin.
3. **Le mode normal reste le défaut spécial** (le moteur actuel, robuste, inchangé).
   Les autres modes sont des **variantes par-dessus** : mode normal + couche de règles
   sociales. Un mode se choisit au lancement de la partie.

## Structure d'une règle sociale

`{ déclencheur, message }` — l'app écoute les événements de la partie ; quand un déclencheur
matche, elle affiche le message (popup/notification in-game), rien d'autre.

**Vocabulaire de déclencheurs à implémenter** (extensible) :
- score atteint / écart atteint (ex. `6-0`)
- type de but marqué (`gamelle`, `gamelle_rentrante`, but du gardien, but du milieu, `flash`…
  — réutiliser les `GoalType`/`GoalPosition` existants)
- fin de partie (+ conditions : défaite sèche, score exact…)

**Exemples actés du mode bibitif** (formulations de l'équipe) :
- défaite 6-0 → « Le perdant paie une bière spéciale »
- gamelle encaissée → « Cul sec ! » (« tu affones »)
- but du gardien → tournée

## Garde-fous

- Les règles sociales ne touchent **jamais** score, stats ni ELO.
- Le moteur de score actuel (`addGoal`) n'est pas modifié en V1 — seule une couche
  d'« écoute d'événements » s'ajoute par-dessus.
- Une partie en mode variante reste une partie normale pour les stats/ELO
  (sauf interaction future avec events — non discuté).

## ⚠️ À décider plus tard
- Le moteur de règles de score configurables (V2) — y compris : le mode normal devient-il
  alors lui-même un paquet de règles ?
- Liste finale des déclencheurs ; format exact du fichier de config des modes.
- Les modes variantes comptent-ils différemment pour l'ELO ? (non discuté — défaut V1 :
  comme une partie normale.)
