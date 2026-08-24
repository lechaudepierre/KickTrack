# 32 — Events par lieu

## Concept validé ✅

Un event = un **mini-classement borné dans le temps et l'espace**, créé et préparé à
l'avance **par les admins** (l'équipe) : un lieu (tel bar), une fenêtre (ex. une semaine),
un classement propre, des récompenses. À la fin : figer → distribuer → archiver
(même plomberie d'intégrité que les saisons, cf. `31-saisons.md`).

## Preuve de présence — le cœur du système ✅

**Décision : code tournant.** Un code renouvelé régulièrement (ordre de grandeur évoqué :
toutes les 10–15 min, ⚠️ à calibrer), affiché physiquement sur place (écran / affichage au
comptoir). Partager le code à distance devient impraticable (il faudrait un relais en continu).

- **Génération côté serveur** : le serveur sait quel code est valide à quel instant pour
  chaque event (dérivation temporelle) ; l'affichage sur place montre le code courant.
  C'est la pièce technique à spécifier en premier lors de l'implémentation.
- **Le code est exigé au moment de CHAQUE partie comptée** (décision explicite — pas une
  validation de session unique). Empêche le scénario « j'entre le code à 18h, je rentre
  chez moi et je continue à scorer ».
- Géolocalisation : **pas obligatoire au lancement** (friction, permissions, imprécision
  intérieure). Ajout possible plus tard en *complément* du code si triche constatée.
- Code statique simple : rejeté comme seule barrière (photo partagée = contournement trivial).

## Triple validation serveur (toutes côté Cloud Function)

Une partie ne compte pour l'event que si **les trois** sont vraies :
1. **Code tournant valide** à l'instant de la partie ;
2. **Dans la fenêtre temporelle** de l'event ;
3. **Vraie partie** : vrais joueurs inscrits (pas d'invités), vrais buts, structure de
   match normale — barrière naturelle déjà présente : on ne « farme » pas seul.

Sinon : la partie se joue normalement mais ne rapporte rien à l'event.
Le client ne peut jamais marquer lui-même une partie comme « validée event ».

## Classement & ELO

- Le classement event est **séparé** : il n'agrège que les parties validées de l'event.
- **Impact sur l'ELO global : configurable par event à la création** (décision ✅) —
  un event « fun » peut être isolé, un event « sérieux » peut compter pour le classement
  général. Champ de la définition d'event.

## Définition d'un event (données, créées via interface/outillage admin)

```
event:
  id, nom, venueId
  fenetre: { debut, fin }
  affecteEloGlobal: bool          (configurable par event)
  recompenses: table (paliers)    ⚠️ contenu à définir par event
  parametresCode: { periodeRotation, … }
```

## ⚠️ À calibrer / décider
- Période de rotation du code ; mécanisme d'affichage sur place (écran dédié ? app admin
  du barman ? impression ?).
- Métrique du classement event (victoires ? points event ? mini-ELO ?) — non discuté en détail.
- Tables de récompenses par event.
