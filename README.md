# Iamonjob

Application web d'accompagnement à la reconversion professionnelle : analyse de CV, suggestions de métiers, simulation d'enquête métier, recherche d'offres France Travail, analyse de compatibilité CV/offre, lettre de motivation, préparation d'entretien et plan d'action 30 jours.

**Stack :** Next.js 14 (App Router) · React · Tailwind CSS · Firebase Auth · Firestore · API Gemini & Mistral · API France Travail · déploiement Railway.

---

## 1. Lancer en local

### Prérequis
- Node.js 18.17+
- Un projet Firebase (gratuit) : https://console.firebase.google.com (Authentication + Firestore)
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

### Firebase (obligatoire — authentification et données)

1. Allez sur https://console.firebase.google.com et créez un projet (gratuit).
2. **Authentication → Sign-in method** : activez le fournisseur « E-mail/Mot de passe ».
3. **Firestore Database** : créez la base (mode production).
4. **Paramètres du projet → Général → Vos applications** : ajoutez une application Web, puis reportez les valeurs de `firebaseConfig` dans les six variables `NEXT_PUBLIC_FIREBASE_*`.
5. **Paramètres du projet → Comptes de service → Générer une nouvelle clé privée** : dans le JSON téléchargé, copiez `project_id`, `client_email` et `private_key` vers `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL` et `FIREBASE_ADMIN_PRIVATE_KEY`.

### Comptes conseillers

Un compte devient conseiller si son email figure dans `CONSEILLER_EMAILS`, ou
si son domaine figure dans `CONSEILLER_DOMAINS` (listes séparées par des
virgules, voir `.env.example`).

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
   - les six variables `NEXT_PUBLIC_FIREBASE_*`
   - `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`
   - `GEMINI_API_KEY` et/ou `MISTRAL_API_KEY`
   - `FRANCE_TRAVAIL_CLIENT_ID` et `FRANCE_TRAVAIL_CLIENT_SECRET` (si vous voulez la recherche d'offres)
   - `NEXT_PUBLIC_SITE_URL` (laissez vide pour le moment, on y revient)
5. Une fois le premier déploiement terminé, allez dans **Settings → Networking → Generate Domain**.
6. Railway génère une URL publique, par exemple `https://iamonjob-production.up.railway.app`.
7. **Retournez dans Variables** et mettez `NEXT_PUBLIC_SITE_URL` = cette URL.
8. **Retournez dans Firebase → Authentication → Settings → Domaines autorisés** et ajoutez votre domaine Railway (`votre-app.up.railway.app`).
9. Railway re-déploie automatiquement avec la nouvelle variable.

L'app est en ligne.

---

## 4. Structure du projet

```
Iamonjobv2-clean/
├── app/                            # Routes Next.js App Router
│   ├── api/                        # Routes serveur
│   │   ├── ai/                     # Proxy IA (Gemini / Mistral) + suivi des tokens
│   │   ├── france-travail/         # Agrégateur d'offres (FT + Adzuna + Jooble)
│   │   ├── rome/  salary/  labonneboite/
│   │   ├── campaign/  candidature/  contact-resolver/   # Candidatures spontanées
│   │   ├── conseiller/  avis/  activation/  account/
│   │   ├── cv-assistant/  ocr/  beta-signup/
│   │   └── admin/  auth/  health/
│   ├── login/  signup/  acces/  activer/     # Entrées bénéficiaire
│   ├── conseiller/                 # Espace conseiller (tableau de bord, connexion)
│   ├── campagne/  candidature/  cv/          # Parcours candidatures spontanées
│   ├── cgu/  confidentialite/  mentions-legales/  accessibilite/
│   ├── layout.jsx                  # Layout racine
│   ├── globals.css                 # Tailwind + styles globaux
│   └── page.jsx                    # Page principale (protégée)
├── components/
│   ├── App.jsx                     # Composant principal du parcours
│   ├── ui/  layout/  account/      # Design system, chrome, écrans de compte
│   └── CampaignLauncher.jsx, AvisConseiller.jsx, MonConseiller.jsx, …
├── lib/
│   ├── ai/
│   │   ├── gemini.js               # Client Gemini
│   │   ├── mistral.js              # Client Mistral
│   │   ├── index.js                # Abstraction unifiée
│   │   ├── prompts.js              # Tous les prompts du conseiller emploi
│   │   └── validate.js
│   ├── firebase/
│   │   ├── client.js               # SDK côté navigateur (auth)
│   │   ├── admin.js                # Admin SDK (vérification des jetons, Firestore)
│   │   └── auth-errors.js
│   ├── france-travail.js           # Offres, ROMEO 2.0, fiches ROME, La Bonne Boîte
│   ├── offers.js                   # Agrégation + dédup multi-sources
│   ├── beneficiaires.js, campaign.js, candidature.js, avis.js, usage.js, …
│   └── rate-limit.js, purge-inactive.js, consent.js, mailer.js
├── firestore.rules                 # Règles de sécurité Firestore
├── firestore.indexes.json
├── middleware.js                   # Protection des routes (cookie de session)
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
├── jsconfig.json
├── package.json
├── railway.toml                    # Config Railway
├── .env.example                    # Modèle des variables d'env
└── .gitignore
```

---

## 5. Sécurité

- **Aucune clé d'API IA n'est exposée côté navigateur.** Toutes les requêtes passent par `/api/ai`, qui exige un utilisateur Firebase authentifié (jeton vérifié côté serveur par `lib/firebase/admin.js`).
- **France Travail** : idem, le `client_secret` ne quitte jamais le serveur.
- **Routes protégées** : `middleware.js` redirige vers `/login` toute route hors liste publique (`/login`, `/signup`, `/acces`, `/activer`, `/conseiller/connexion`, pages légales, routes de santé et d'activation) tant que le cookie `__session` est absent.
- **Données** : les accès Firestore côté client sont bornés par `firestore.rules`. Voir aussi `AUDIT-SECURITE-DICP.md` et `RGPD-RETENTION.md`.

---

## 6. Personnalisation

- **Changer les modèles IA** : éditez les constantes `GEMINI_MODEL` (`lib/ai/gemini.js`) et `MISTRAL_MODEL` (`lib/ai/mistral.js`).
- **Modifier les prompts** : tous les prompts du conseiller emploi sont dans `lib/ai/prompts.js`.
- **Ajuster les sources d'offres** : l'agrégateur et ses filtres de pertinence sont dans `lib/offers.js`.

---

## 7. Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| "GEMINI_API_KEY non configurée" | Variable manquante | Ajoutez-la dans Railway → Variables ou `.env.local` |
| Boucle de redirection /login | Cookie `__session` absent ou domaine non autorisé | Vérifiez `NEXT_PUBLIC_SITE_URL` et les domaines autorisés dans Firebase → Authentication → Settings |
| "Authentification France Travail refusée" | Mauvaises clés ou app non validée | Vérifiez les identifiants et que l'app a bien l'accès "Offres d'emploi v2" |
| Build qui échoue sur Railway | Mauvaise version Node | Forcez Node 18+ via la variable `NIXPACKS_NODE_VERSION=20` |

---

## Licence

MIT — vous pouvez en faire ce que vous voulez.
