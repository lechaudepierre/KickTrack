# 🚀 Déploiement KickTrack sur Vercel

## Prérequis

- ✅ Compte GitHub avec le repo KickTrack
- ✅ Compte Vercel (gratuit) : [vercel.com/signup](https://vercel.com/signup)

---

## 📋 Étapes de déploiement

### 1. Connecter GitHub à Vercel

1. Allez sur [vercel.com](https://vercel.com) et connectez-vous avec GitHub
2. Cliquez sur **"Add New Project"**
3. Sélectionnez le repo **KickTrack**

### 2. Configuration du projet

Vercel détecte automatiquement Next.js. Vérifiez ces paramètres :

| Paramètre | Valeur |
|-----------|--------|
| **Framework Preset** | Next.js |
| **Root Directory** | `kicktrack` |
| **Build Command** | `npm run build` |
| **Output Directory** | `.next` |

### 3. Variables d'environnement

⚠️ **IMPORTANT** : Copiez vos variables Firebase depuis `.env.local`

Cliquez sur **"Environment Variables"** et ajoutez :

```
NEXT_PUBLIC_FIREBASE_API_KEY=votre_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=votre_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=votre_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=votre_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=votre_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=votre_app_id
```

### 4. Déployer

Cliquez sur **"Deploy"** et attendez quelques secondes !

---

## 🌐 Après le déploiement

### URL de votre app

Votre app sera accessible à :

- `https://kicktrack-xxx.vercel.app` (URL auto-générée)
- Vous pouvez personnaliser le domaine dans les paramètres

### Configurer Firebase pour le nouveau domaine

1. Allez dans la [Console Firebase](https://console.firebase.google.com)
2. **Authentication** → **Settings** → **Authorized domains**
3. Ajoutez votre domaine Vercel (ex: `kicktrack-xxx.vercel.app`)

---

## 📱 Installer la PWA sur téléphone

### Sur iPhone (Safari)

1. Ouvrez l'URL de l'app dans Safari
2. Tapez sur l'icône de partage (carré avec flèche)
3. Sélectionnez **"Sur l'écran d'accueil"**

### Sur Android (Chrome)

1. Ouvrez l'URL de l'app dans Chrome
2. Tapez sur les 3 points → **"Ajouter à l'écran d'accueil"**

---

## 🔄 Mises à jour automatiques

Chaque `git push` sur la branche `main` déclenchera automatiquement un nouveau déploiement sur Vercel !

---

## 📊 Limites du plan gratuit Vercel

| Ressource | Limite gratuite |
|-----------|-----------------|
| Bande passante | 100 GB/mois |
| Builds | 6000 minutes/mois |
| Invocations serverless | 100K/mois |
| Team members | 1 (perso) |

Pour 10 utilisateurs max, vous êtes largement dans les limites ! 🎉
