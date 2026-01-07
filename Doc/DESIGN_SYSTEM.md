# KickTrack - Nouveau Design System

## 🎨 Palette de Couleurs

### Couleurs Principales
```css
--pitch-navy: #0F172A      /* Fond principal - Bleu marine profond */
--pitch-blue: #1E293B      /* Cartes et surfaces */
--field-green: #10B981     /* Accent principal - Vert terrain */
--field-dark: #059669      /* Ombre des boutons verts */
--field-light: #34D399     /* Hover vert */
--line-white: #FFFFFF      /* Lignes et bordures */
```

### Couleurs d'Accent
```css
--accent-orange: #F97316   /* Erreurs, alertes */
--accent-yellow: #FBBF24   /* Trophées, en attente */
```

### Couleurs de Texte
```css
--text-primary: #FFFFFF    /* Texte principal */
--text-secondary: #94A3B8  /* Texte secondaire */
--border-color: #334155    /* Bordures neutres */
```

---

## 📐 Principes de Design

### 1. **Géométrie Franche**
- **Pas de border-radius** : Tous les éléments sont rectangulaires
- **Bordures épaisses** : 4px pour tous les éléments importants
- **Angles droits** : Design inspiré des lignes de terrain de football

### 2. **Typographie Bold**
- **Font** : Inter (Google Fonts)
- **Poids** : 700-900 (Bold à Black)
- **Style** : UPPERCASE pour les titres et boutons
- **Tracking** : Espacement large pour les petits textes

### 3. **Effet 3D sur Boutons**
- Ombre solide décalée de 2px (translate-y)
- Couleur d'ombre plus foncée que le bouton
- Animation au hover : -1px
- Animation au click : +1px

### 4. **Lignes de Terrain**
- Lignes blanches à 8% d'opacité
- Motifs géométriques en arrière-plan
- Diagonales et cercles inspirés des terrains de foot

---

## 🧩 Composants

### Bouton Principal
```tsx
<button className="group relative">
  <div className="absolute inset-0 bg-[#059669] translate-y-2" />
  <div className="relative bg-[#10B981] border-4 border-white text-[#0F172A] font-black text-lg py-4 px-8 transition-transform group-hover:-translate-y-1 group-active:translate-y-1">
    TEXTE DU BOUTON
  </div>
</button>
```

### Bouton Secondaire
```tsx
<button className="group relative">
  <div className="absolute inset-0 bg-[#1E293B] translate-y-2" />
  <div className="relative bg-[#0F172A] border-4 border-[#334155] text-white font-black py-4 px-8 transition-all group-hover:border-[#10B981] group-hover:-translate-y-1">
    TEXTE DU BOUTON
  </div>
</button>
```

### Carte
```tsx
<div className="bg-[#1E293B] border-4 border-[#334155] p-6 relative overflow-hidden">
  <div className="absolute top-0 left-0 w-full h-2 bg-[#10B981]" />
  {/* Contenu */}
</div>
```

### Input
```tsx
<input 
  className="w-full px-4 py-4 bg-[#0F172A] border-4 border-[#334155] text-white font-semibold placeholder-[#475569] focus:border-[#10B981] focus:outline-none transition-colors"
/>
```

---

## 🎯 Hiérarchie Visuelle

### Niveaux d'Importance
1. **Critique** : Vert (#10B981) + bordure blanche 4px
2. **Important** : Blanc + bordure grise 4px  
3. **Secondaire** : Gris (#94A3B8)
4. **Décoratif** : Lignes blanches 8% opacité

### Espacement
- **Petit** : 3-4px (gap entre éléments proches)
- **Moyen** : 6-8px (padding interne)
- **Grand** : 12px+ (margin entre sections)

---

## 🏟️ Décoration de Fond

### FieldBackground Component
Utilise des formes géométriques triangulaires avec gradient vert et des lignes de terrain subtiles.

### FieldLines Component
Lignes horizontales, verticales, diagonales et cercles inspirés des marquages de terrain de football.

---

## ✅ Checklist d'Implémentation

- [x] Système de couleurs défini
- [x] Composants de base créés
- [x] Page d'accueil redesignée
- [x] Dashboard redesigné
- [x] Login redesigné
- [x] Register redesigné
- [x] Pending Implementation redesigné
- [ ] Pages de jeu à redesigner
- [ ] Venues page à redesigner

---

## 🚀 Prochaines Étapes

1. Appliquer le design aux pages de jeu (`/game/new`, `/game/join`, `/game/[id]`)
2. Créer des composants réutilisables pour les stats
3. Ajouter des micro-animations
4. Optimiser pour mobile
5. Tester l'accessibilité (contraste, taille de texte)
