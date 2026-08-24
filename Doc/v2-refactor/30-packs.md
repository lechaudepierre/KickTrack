# 30 — Packs & ouverture

## Décisions validées ✅

1. **4 tiers de rareté** : `commun` / `rare` / `epique` / `legendaire`.
   La rareté pilote (a) la probabilité de tirage et (b) l'affichage (couleur/bordure/effet —
   sortir un légendaire doit être visuellement un événement).
2. **Doublons → convertis en monnaie.** Tomber sur un item déjà possédé crédite des pièces.
3. **Pity invisible** (anti-malchance en coulisses) : un compteur côté serveur garantit un
   item d'un tier élevé après X ouvertures sans. Aucun compteur affiché au joueur.
4. **Tirage côté serveur** (Cloud Function) — le client demande l'ouverture, le serveur tire,
   octroie via `grantItem` (cf. `20-socle-collection.md`) et renvoie le résultat.
   Le client ne connaît jamais les probabilités effectives ni l'état du pity.

## Mécanique de tirage

- Un **pack** est une définition au catalogue : nombre d'items, table de probabilités par
  tier, sous-ensemble du catalogue éligible (filtre par `source`/`type`/saison).
- Probabilités **indicatives** retenues comme point de départ (⚠️ à calibrer) :
  commun ~70% · rare ~22% · épique ~7% · légendaire ~1%.
  Principe directeur validé : le légendaire doit rester un *événement* (« on le screenshot »).
- Doublon : converti en monnaie, **taux proportionnel à la rareté** (un doublon légendaire
  rapporte beaucoup plus qu'un commun) — ⚠️ montants à calibrer.
- Pity : seuils ⚠️ à calibrer (ex. épique garanti sous N ouvertures). Compteur stocké côté
  serveur par joueur, remis à zéro quand le tier garanti sort naturellement.
- Toute ouverture est tracée au journal (cf. socle) : pack, items sortis, doublons convertis.

## Boucle économique (validée comme structure)

```
jouer/gagner → monnaie → ouvrir des packs → items (collection progresse)
                  ↑                              ou doublons
                  └──────── conversion ──────────────┘
```
Auto-entretenue : rien ne se perd. Les items exclusifs de prestige (saisons, events,
exploits) vivent EN DEHORS des packs (jamais tirables) — c'est ce qui leur donne leur valeur.

## UX d'ouverture

- L'animation d'ouverture est un moment clé (montée de suspense, révélation par rareté).
  À soigner lors de l'implémentation ; non spécifiée en détail ici.

## ⚠️ À calibrer (ne pas figer sans l'équipe — exposer en config)
- Probabilités exactes par tier.
- Taux de conversion des doublons par rareté.
- Seuils du pity.
- **Prix des packs vs rythme de gain de monnaie** : LE curseur d'équilibrage global.
  Décision actée : se calibre en observant les vrais joueurs, pas sur le papier →
  toutes ces valeurs doivent être modifiables sans redéploiement (config serveur).
