# 11 — Classement & ELO (Phase 1.2)

## Philosophie validée ✅ : ELO inflationniste assumé

- Le système **crée des points** (bonus d'exploit type MVP, récompense d'activité) : la somme
  d'ELO de la population monte avec le temps. C'est **voulu** — ça récompense l'activité et
  les exploits, esprit de l'app.
- Contrepartie obligatoire : le **soft reset saisonnier** éponge l'inflation
  (cf. `31-saisons.md`). Inflation sans reset = anciens imbattables par ancienneté → interdit.
- Cette philosophie doit être **documentée dans le code** (commentaire de tête du module ELO)
  pour qu'aucun futur contributeur ne « corrige » l'inflation en croyant à un bug.

## Bugs à corriger 🐛 (localisés dans `lib/firebase/games.ts`, détail : `01-diagnostic.md`)

1. **Double bonus MVP** : appliquer le +3 **une seule fois**, dans la transaction d'écriture,
   et construire l'objet d'affichage `eloChanges` à partir des valeurs réellement écrites.
   Affichage et stockage doivent être identiques par construction.
2. **MVP unique** : `computeMVP()` (rôle attaque/défense, clean sheet) devient LA définition.
   Supprimer le calcul concurrent « max de buts » de `calculateGameResults()` — celui-ci doit
   consommer le MVP déjà calculé/stocké (`mvpId` sur la partie).
3. **`eloHistory` borné** : ne plus pousser indéfiniment dans le document user.
   Solution au choix de l'implémentation : plafonner (N dernières entrées) et/ou déplacer
   l'historique complet en sous-collection. Le profil ne doit plus grossir à chaque partie.
4. **`goalsConceded`** : conserver comme stat individuelle si voulu, mais documenter qu'au
   niveau équipe c'est compté 2× en 2v2 ; toute agrégation globale doit en tenir compte.
5. Corriger le commentaire trompeur « Only apply Elo if 2v2 » (le 1v1 fonctionne).
6. Nettoyage : vérifier que parties avec invités / abandonnées ne touchent jamais les stats
   (le filtre existe, le consolider et le tester).

## Refonte de la formule 2v2 ✅ (décision : repenser proprement, pas seulement patcher)

**Défaut identifié de la formule actuelle** (moyenne 50/50 proba équipe / proba perso vs
moyenne adverse) : un joueur faible porté par un partenaire fort gagne presque autant que
s'il avait gagné seul (sa proba perso basse gonfle son gain). Le système récompense le
« portage ». Dans une app où l'on tourne les équipes, c'est l'effet inverse de celui voulu.

⚠️ **Leviers à trancher avec l'équipe avant d'implémenter** (ne pas choisir seul) :
- Pondération équipe vs individu (l'actuel 50/50 est remis en cause).
- Un partenaire fort doit-il réduire les gains (équipe favorite) ?
- La marge de score (10-0 vs 10-9) doit-elle moduler le gain ?
- Les buts marqués / le rôle entrent-ils dans l'ELO, ou seulement victoire + bonus MVP ?

**Exigences d'implémentation quelle que soit la formule retenue :**
- Calcul pur et isolé (fonction sans effet de bord) + **tests unitaires** sur des scénarios
  nommés (équipes équilibrées, déséquilibrées, marge, nouveau joueur en placement…).
- Conserver : base 1000, K-factor 64 (<10 parties) puis 32 — sauf décision contraire.
- Atomicité conservée (`runTransaction`), idempotence de `endGame` conservée.

## Périmètre des classements (référence)

- Classement global : tri ELO depuis les profils (conservé).
- Classements par lieu et entre amis : agrégation des parties (conservé, perfs à surveiller).
- Les classements **event** sont séparés (cf. `32-events.md`) ; impact ELO global configurable
  par event.
