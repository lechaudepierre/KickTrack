# Kicker — Documentation de refactoring & évolution

> 👉 **Le suivi vit dans [`CHANTIERS.md`](CHANTIERS.md)** — statut de chaque chantier, décisions en
> attente, boîte à idées, et ce qui est déjà fait. Les docs numérotées ci-dessous décrivent le *quoi*
> et le *pourquoi* (elles sont figées) ; `CHANTIERS.md` décrit *où on en est* (il bouge en permanence).
> **Commencer par là.**

Dossier de référence pour l'implémentation. Toutes les décisions ici ont été validées
explicitement par l'équipe produit (les 3 créateurs de l'app) lors d'une session de cadrage.
**Ne pas contredire une décision marquée ✅. Ne pas inventer de réponse à un point marqué ⚠️ —
voir `99-points-a-decider.md` et demander.**

## L'app en bref

- **Stack** : Next.js (App Router) + TypeScript, Firebase (Auth + Firestore), Zustand, CSS Modules.
- **Taille** : ~110 fichiers, ~24k lignes. ~100 utilisateurs réels inscrits.
- **Domaine** : application de baby-foot ("kicker") entre amis — parties 1v1/2v2, buts détaillés
  (gamelle, but du milieu, etc.), classement ELO, tournois, lieux (bars), amis.
- **Objectif global** : unifier/professionnaliser le code existant, puis construire un système
  de personnalisation/collection (avatars de figurines, packs, saisons, events).

## Roadmap en 3 phases (ordre imposé par les dépendances)

### Phase 1 — Fondations (refactoring de l'existant)
| Chantier | Doc | Pourquoi d'abord |
|---|---|---|
| 1.1 Design system unifié | `10-design-system.md` | 471 couleurs en dur, 2 systèmes de style concurrents ; tout le visuel futur en dépend |
| 1.2 Fiabiliser ELO/classement | `11-classement-elo.md` | Bugs réels trouvés ; saisons et events s'appuient dessus |
| 1.3 Rangement du code | (section dans `01-diagnostic.md`) | Fichiers >900 lignes à découper, conventions Firestore à poser |

### Phase 2 — Socle collection (plomberie commune)
| Chantier | Doc |
|---|---|
| Catalogue d'items, inventaire, monnaie, sécurité serveur | `20-socle-collection.md` |
| Système d'avatar (slots de la figurine) | `21-avatar.md` |

Aucune feature de Phase 3 ne doit être commencée avant que le socle existe :
elles ne sont que des « clients » de ce socle.

### Phase 3 — Features (se branchent sur le socle, ordre libre)
| Feature | Doc |
|---|---|
| Packs & ouverture | `30-packs.md` |
| Saisons | `31-saisons.md` |
| Events par lieu | `32-events.md` |
| Modes de jeu (bibitif) | `33-modes-de-jeu.md` |

## Conventions de lecture des docs

- **✅ Décision validée** : tranchée par l'équipe, à implémenter telle quelle.
- **⚠️ À décider / à calibrer** : volontairement ouvert. Implémenter la *mécanique* en rendant
  la *valeur* configurable (constante nommée, champ de config), ne jamais choisir la valeur
  définitive soi-même. Liste consolidée dans `99-points-a-decider.md`.
- **🐛 Bug confirmé** : comportement défectueux vérifié dans le code source, avec localisation.

## Principes transverses (s'appliquent partout)

1. **Identité conservée** : le refactoring raffine l'existant, il ne le remplace pas.
   Fond terrain rayé, badges de classement, esprit visuel actuel : conservés et fiabilisés.
2. **Données pilotent, pas le code** : catalogue d'items, modes de jeu, events = de la donnée
   (Firestore ou fichier de config), modifiable sans redéploiement.
3. **Économie côté serveur** : tout ce qui crédite de la monnaie ou octroie un item passe par
   une Cloud Function. Le client ne s'auto-attribue jamais rien de valeur.
4. **Cosmétique pur** : aucun item ne donne d'avantage en jeu. Jamais.
5. **Pas de sur-ingénierie** : équipe de 3, app fun. Quand deux solutions existent, prendre la
   plus simple qui respecte les décisions (ex : déclenchement manuel des saisons, config de
   modes en fichier avant toute UI admin).
