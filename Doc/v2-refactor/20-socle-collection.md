# 20 — Socle collection (Phase 2)

Plomberie commune à TOUTES les features fun (avatars, packs, saisons, events).
À construire avant toute feature de Phase 3.

## Décisions validées ✅

1. **Items 100% cosmétiques.** Aucun item ne donne jamais d'avantage en jeu.
2. **Catalogue dans Firestore** (pas en fichier de code) : ajouter/modifier un item se fait
   sans redéploiement.
3. **Économie hybride** : monnaie + packs comme boucle de base, PLUS des items exclusifs de
   prestige non-achetables (ex. skin « Champion saison 3 ») distribués uniquement par
   accomplissement.
4. **Sécurité serveur obligatoire** : tout crédit de monnaie et tout octroi d'item passe par
   une **Cloud Function**. Les règles Firestore doivent interdire au client d'écrire
   directement solde, inventaire et octrois. Non négociable.
5. **Le profil user reste léger** : le cosmétique ne s'ajoute pas au document `User`
   (déjà chargé — cf. diagnostic §6). Inventaire en sous-collection.

## Modèle de données (4 zones)

### Catalogue — collection partagée, lecture seule pour les clients
Une entrée par item :
```
item:
  id          identifiant stable (ex. "jersey_classic_v1")
  type        slot/famille : corps | maillot | short | pieds | chapeau | banner | …
  rarity      commun | rare | epique | legendaire        (cf. 30-packs.md)
  source      pack | saison | event | exploit | createur (provenance autorisée)
  asset       référence du visuel (modèle 3D / image)
  tintable    bool — accepte une teinte (cf. 21-avatar.md)
  meta        nom affiché, description, saison d'origine…
```
- Généralise `bannerUtils.ts` : le map `BANNERS`, `CREATOR_USERNAMES` et `SPECIAL_BANNERS`
  (attributions en dur par pseudo) migrent en données — une bannière devient un item de
  type `banner`, son attribution un octroi normal.

### Profil user (allégé)
- Conserve : identité, stats, amis, préférences.
- Ajoute uniquement : `equipped` = map `slot → { itemId, tint? }` (quelques IDs, léger —
  c'est ce qu'on lit pour afficher n'importe qui dans un classement).
- `bannerId` existant → migré vers `equipped.banner` (script de migration à prévoir).

### Inventaire — sous-collection du user
- `owned` : la liste des `itemId` possédés. Peut grossir sans alourdir le profil.
- Lecture par le propriétaire ; écriture uniquement par Cloud Function.

### Monnaie — solde + journal
- `balance` : nombre, sur un document dédié du user (ou champ protégé).
- **Journal de transactions** : chaque crédit/débit tracé (montant, raison, référence —
  partie, pack ouvert, doublon converti, récompense). Vérifiable et auditable ;
  base de l'anti-triche et du support (« j'avais 200 pièces »).

## L'opération centrale : `grantItem`

**Une seule Cloud Function d'octroi**, réutilisée par toutes les sources (pack, saison,
event, exploit, admin) :
- entrée : `userId`, `itemId`, `source` (+ référence de l'origine pour le journal)
- effets : ajoute à `owned` ; si déjà possédé → conversion en monnaie selon les règles de
  `30-packs.md` ; écrit la transaction au journal. Transactionnel et **idempotent**
  (un identifiant d'octroi unique empêche tout double-octroi en cas de retry).

C'est l'invariant d'architecture : les sources de Phase 3 n'ont AUCUNE logique
d'inventaire propre — elles appellent `grantItem` / `creditCurrency`, rien d'autre.

## ⚠️ À décider / calibrer
- Montants de gain de monnaie par partie / victoire / exploit (équilibrage global,
  cf. `30-packs.md` §économie).
- Détail des règles Firestore (à écrire au moment de l'implémentation, en respectant le
  principe « client read-only sur l'économie »).
