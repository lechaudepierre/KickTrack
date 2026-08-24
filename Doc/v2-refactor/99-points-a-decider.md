# 99 — Points à décider / à calibrer (liste consolidée)

Règle pour l'assistant de code : **ne jamais trancher un point de cette liste de sa propre
initiative.** Implémenter la mécanique avec la valeur en configuration (constante nommée,
champ de config serveur), poser une valeur provisoire clairement marquée `// PROVISOIRE`,
et signaler le point.

## Design system (`10`)
- [ ] Page pilote de la migration (candidats : classement, profil, accueil).
- [ ] Liste finale des composants (base validée : Button, Card, Input, Badge, RankBadge,
      LeaderboardRow, Modal — +2-3 à identifier au recensement).
- [ ] Valeurs hex définitives de la palette arcade (contrainte : vert plus foncé, jaune =
      important, ancrage sur l'existant).

## ELO (`11`)
- [ ] Formule 2v2 : pondération équipe/individu, effet du partenaire fort, marge de score,
      rôle des buts. **À trancher avec l'équipe avant d'implémenter.**
- [ ] Conserver K=64/32 et base 1000, ou ajuster.
- [ ] Solution de bornage d'`eloHistory` (plafond vs sous-collection).

## Socle (`20`)
- [ ] Montants de gain de monnaie (partie, victoire, exploits).
- [ ] Détail des règles de sécurité Firestore.

## Avatar (`21`)
- [ ] Palette de teintes (libres / débloquables / liste fermée).
- [ ] Contenu du set d'avatar par défaut.
- [ ] Pipeline d'assets 3D.

## Packs (`30`)
- [ ] Probabilités par tier (départ indicatif : 70/22/7/1).
- [ ] Taux de conversion des doublons par rareté.
- [ ] Seuils du pity.
- [ ] Prix des packs (équilibré en observant les joueurs réels → config serveur obligatoire).

## Saisons (`31`)
- [ ] Coefficient du soft reset.
- [ ] Contenu/forme des récompenses (classement et/ou paliers — explicitement « on verra »).
- [ ] Traitement des inactifs au reset.

## Events (`32`)
- [ ] Période de rotation du code + dispositif d'affichage sur place.
- [ ] Métrique du classement event.
- [ ] Tables de récompenses.

## Modes (`33`)
- [ ] Format exact du fichier de config des modes ; liste finale des déclencheurs.
- [ ] (V2, reporté) Moteur de règles de score configurables.
- [ ] Interaction modes variantes × ELO / events.
