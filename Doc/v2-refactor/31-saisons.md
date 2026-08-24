# 31 — Saisons

## Décisions validées ✅

1. **Soft reset entre saisons** (pas de hard reset, pas de simple classement parallèle) :
   les ELO sont **rapprochés de la moyenne (1000)** sans être effacés. L'écart se resserre
   (saison rejouable par tous) mais la hiérarchie reste (pas de chaos en début de saison).
   Rôle systémique : le soft reset **éponge l'inflation** de l'ELO inflationniste
   (cf. `11-classement-elo.md`) — les deux décisions vont ensemble.
2. **Durée ≈ 4 mois, gérée manuellement** : pas de calendrier automatique. Clore une saison /
   en lancer une nouvelle = **action admin explicite**. Plus simple, et l'équipe garde le
   contrôle du rythme.
3. **L'ELO de la saison close est archivé** (pas perdu) : on conserve par joueur le rang/ELO
   final de chaque saison → alimente les titres et items de prestige
   (« Champion saison 3 » = item exclusif jamais tirable en pack).

## Clôture de saison — exigences d'intégrité (validées comme règles strictes)

Toute la clôture vit côté serveur (Cloud Function admin) et doit être :
- **Figée à un instant précis** : le classement est snapshotté au moment de la clôture ;
  les parties terminées après n'y entrent pas.
- **Transactionnelle et idempotente** : la distribution des récompenses doit pouvoir être
  rejouée après un crash sans jamais doubler un octroi (identifiants d'octroi uniques —
  même mécanique que `grantItem`, cf. socle). Chaque joueur reçoit sa récompense
  exactement une fois.
- Ordonnancement : 1) figer + archiver le classement → 2) distribuer les récompenses →
  3) appliquer le soft reset → 4) ouvrir la nouvelle saison.

## Récompenses

- La **mécanique** de distribution doit exister (par palier de classement — top 1 / top 3 /
  top N — et/ou par paliers de points type « passe »).
- ⚠️ **Le contenu et la forme exacte des récompenses ne sont PAS tranchés** (décision
  explicite de l'équipe : « on verra »). Implémenter la plomberie générique
  (une définition de saison référence sa table de récompenses en données) ; ne pas
  inventer la table.

## ⚠️ À calibrer
- Coefficient du soft reset (force du rapprochement vers 1000).
- Table des récompenses de chaque saison (contenu, paliers).
- Traitement des joueurs inactifs pendant une saison (reset quand même ? gel ?) — non discuté.
