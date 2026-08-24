# 21 — Avatar : la figurine de kicker

## Concept validé ✅

L'avatar est une **figurine de baby-foot** — le bonhomme sur la tige. PAS un footballeur
humain : corps d'un bloc, **pas de bras**, anatomie de figurine. C'est l'identité visuelle
distinctive de l'app.

## Slots — décision figée ✅

**5 slots fixes, ni plus ni moins :**

| Slot | Peut être vide | Teinte personnalisable |
|---|---|---|
| `corps` | non | **oui** |
| `maillot` | non | **oui** |
| `short` | non | **oui** |
| `pieds` | non | non (couleur de l'item) |
| `chapeau` | **oui** (seul slot optionnel) | non (couleur de l'item) |

- Un seul item par slot. Ordre d'empilement/assemblage fixe.
- **Teinte = couche séparée de l'item** : un item de maillot est une *forme* ; la couleur
  s'applique par-dessus (combinatoire : 10 formes × 10 teintes = 100 looks avec peu d'assets).
  Seuls corps/maillot/short l'acceptent (`tintable` au catalogue).
- **Avatar par défaut gratuit octroyé à l'inscription** : garantit mécaniquement que les
  4 slots obligatoires sont toujours remplis dès la création du compte (pas d'avatar « nu »).
  Implémentation : un set d'items par défaut octroyés + équipés par la Cloud Function de
  création de compte.

## Données

- Stocké sur le profil : `equipped = { corps, maillot, short, pieds, chapeau? }`,
  chaque entrée = `{ itemId, tint? }` (teinte uniquement sur les slots tintables).
- L'inventaire (slots possédés) et l'octroi suivent `20-socle-collection.md`.
- Équiper/déséquiper : action du client autorisée MAIS validée (l'item doit être dans
  `owned`, du bon type ; le chapeau est le seul déséquipable sans remplacement).

## Rendu — décision ✅ : vraie 3D visée

- Cible : rendu 3D temps réel (type Three.js) de la figurine, les items du catalogue
  référencent des assets 3D, la teinte = couleur de matériau.
- **Invariant d'architecture (capital)** : les données (5 itemIds + teintes) sont
  **indépendantes du moteur de rendu**. Le moteur est une couche interchangeable :
  les mêmes données peuvent être rendues en pseudo-3D (calques d'images empilées) si la
  3D pose des problèmes de perfs/poids, **sans toucher catalogue, inventaire ni equipped**.
  Ne jamais coupler une donnée d'item à une spécificité du moteur.
- Vigilances 3D actées lors du cadrage : poids de chargement, perfs mobiles, production
  des assets. Une figurine de baby-foot = formes simples, ce qui rend la 3D plus
  atteignable que des humains, mais le risque reste réel — d'où l'invariant ci-dessus.

## ⚠️ À décider / calibrer
- Palette de teintes disponibles (libres ? débloquables ? liste fermée ?).
- Contenu exact du set d'avatar par défaut.
- Pipeline d'assets 3D (format, outillage) — au moment de l'implémentation du rendu.
