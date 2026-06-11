# Iamonjob

Application web d'accompagnement à la reconversion professionnelle : analyse de CV, suggestions de métiers, simulation d'enquête métier, recherche d'offres France Travail, analyse de compatibilité CV/offre, lettre de motivation, préparation d'entretien et plan d'action 30 jours.

**Stack :** Next.js 14 (App Router) · React · Tailwind CSS · Supabase (auth) · API Gemini & Mistral · API France Travail · déploiement Railway.

---

## 1. Lancer en local

### Prérequis
- Node.js 18.17+
- Un compte Supabase (gratuit) : https://supabase.com
- Au moins une clé d'API IA : Gemini (https://aistudio.google.com/apikey) **ou** Mistral (https://console.mistral.ai/api-keys/)
- (Optionnel) Identifiants France Travail : https://francetravail.io

### Installation

```bash
git clone https://github.com/<votre-utilisateur>/iamonjob.git
cd iamonjob
npm install
cp .env.example .env.local
# Editez .env.local et remplissez les variables (voir section 2)
npm run dev
```

L'app démarre sur http://localhost:3000.

---

## 2. Variables d'environnement

Le fichier `.env.example` liste toutes les variables. Voici comment les remplir.

### Supabase (obligatoire — authentification)

1. Allez sur https://supabase.com et créez un projet (gratuit).
2. Une fois le projet créé, allez dans **Settings → API**.
3. Copiez :
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Configuration de l'authentification Supabase

Dans le dashboard Supabase :

**Authentication → Providers → Email :**
- Activez "Email"
- (Optionnel) Désactivez "Confirm email" pour les tests rapides

**Authentication → Providers → Google :** (optionnel)
- Activez Google
- Suivez le guide Supabase pour obtenir un Client ID / Secret Google

**Authentication → URL Configuration :**
- Site URL : `http://localhost:3000` (en dev) ou `https://votre-app.up.railway.app` (en prod)
- Redirect URLs : ajoutez `http://localhost:3000/auth/callback` et l'URL prod correspondante

### IA — au moins l'une des deux

- `GEMINI_API_KEY` : récupérée sur https://aistudio.google.com/apikey
- `MISTRAL_API_KEY` : récupérée sur https://console.mistral.ai/api-keys/

Si les deux sont configurées, un sélecteur apparaît dans l'app permettant à l'utilisateur de choisir.

### France Travail (optionnel)

Sans ces clés, la recherche d'offres renverra une erreur explicite. Pour les obtenir :

1. Compte développeur : https://francetravail.io
2. Créez une application
3. Demandez l'accès à l'API "Offres d'emploi v2"
4. Récupérez `FRANCE_TRAVAIL_CLIENT_ID` et `FRANCE_TRAVAIL_CLIENT_SECRET`

### NEXT_PUBLIC_SITE_URL

- En local : `http://localhost:3000`
- En prod : `https://votre-app.up.railway.app`

---

## 3. Déploiement sur Railway

### Étape A — Pousser le projet sur GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<votre-utilisateur>/iamonjob.git
git push -u origin main
```

### Étape B — Déployer sur Railway

1. Allez sur https://railway.app et connectez-vous avec GitHub.
2. **New Project → Deploy from GitHub repo → sélectionnez `iamonjob`.**
3. Railway détecte automatiquement Next.js et lance le build.
4. Pendant le build, allez dans **Variables** et ajoutez **toutes** les variables d'environnement de `.env.example` :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY` et/ou `MISTRAL_API_KEY`
   - `FRANCE_TRAVAIL_CLIENT_ID` et `FRANCE_TRAVAIL_CLIENT_SECRET` (si vous voulez la recherche d'offres)
   - `NEXT_PUBLIC_SITE_URL` (laissez vide pour le moment, on y revient)
5. Une fois le premier déploiement terminé, allez dans **Settings → Networking → Generate Domain**.
6. Railway génère une URL publique, par exemple `https://iamonjob-production.up.railway.app`.
7. **Retournez dans Variables** et mettez `NEXT_PUBLIC_SITE_URL` = cette URL.
8. **Retournez dans Supabase → Authentication → URL Configuration** et ajoutez :
   - Site URL : votre URL Railway
   - Redirect URL : `https://votre-url-railway/auth/callback`
9. Railway re-déploie automatiquement avec la nouvelle variable.

L'app est en ligne.

---

## 4. Structure du projet

```
iamonjob/
├── app/                            # Routes Next.js App Router
│   ├── api/
│   │   ├── ai/route.js             # Proxy IA (Gemini / Mistral)
│   │   └── france-travail/route.js # Proxy recherche d'offres
│   ├── auth/
│   │   ├── callback/route.js       # OAuth callback Supabase
│   │   └── signout/route.js        # Déconnexion
│   ├── login/page.jsx              # Page de connexion
│   ├── signup/page.jsx             # Page d'inscription
│   ├── layout.jsx                  # Layout racine
│   ├── globals.css                 # Tailwind + styles globaux
│   └── page.jsx                    # Page principale (protégée)
├── components/
│   ├── ui/index.jsx                # Button, Card, Badge, etc.
│   └── App.jsx                     # Composant principal de l'app
├── lib/
│   ├── ai/
│   │   ├── gemini.js               # Client Gemini
│   │   ├── mistral.js              # Client Mistral
│   │   └── index.js                # Abstraction unifiée
│   ├── supabase/
│   │   ├── client.js               # Client browser
│   │   ├── server.js               # Client server components
│   │   └── middleware.js           # Middleware d'auth
│   └── france-travail.js           # Client API France Travail
├── middleware.js                   # Middleware Next.js (auth)
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
├── jsconfig.json
├── package.json
├── railway.json                    # Config Railway
├── .env.example                    # Modèle des variables d'env
└── .gitignore
```

---

## 5. Sécurité

- **Aucune clé d'API IA n'est exposée côté navigateur.** Toutes les requêtes passent par `/api/ai`, qui exige un utilisateur Supabase authentifié.
- **France Travail** : idem, le `client_secret` ne quitte jamais le serveur.
- **Routes protégées** : toutes les pages sauf `/login`, `/signup` et `/auth/*` exigent une session valide (middleware Next.js).

---

## 6. Personnalisation

- **Changer les modèles IA** : éditez les constantes `GEMINI_MODEL` (`lib/ai/gemini.js`) et `MISTRAL_MODEL` (`lib/ai/mistral.js`).
- **Modifier les prompts** : tous les prompts du conseiller emploi sont dans `components/App.jsx`.
- **Ajouter Supabase Storage / une base de données** : la lib `lib/supabase/` est déjà prête à être étendue (historique CV, candidatures, etc.).

---

## 7. Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| "GEMINI_API_KEY non configurée" | Variable manquante | Ajoutez-la dans Railway → Variables ou `.env.local` |
| Boucle de redirection /login | Cookies non synchronisés | Vérifiez `NEXT_PUBLIC_SITE_URL` et l'URL configurée dans Supabase |
| "Authentification France Travail refusée" | Mauvaises clés ou app non validée | Vérifiez les identifiants et que l'app a bien l'accès "Offres d'emploi v2" |
| Build qui échoue sur Railway | Mauvaise version Node | Forcez Node 18+ via la variable `NIXPACKS_NODE_VERSION=20` |

---

## Licence

MIT — vous pouvez en faire ce que vous voulez.
