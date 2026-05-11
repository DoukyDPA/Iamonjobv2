# Intégration France Travail — Guide de configuration

Ce document explique comment activer la recherche d'offres France Travail dans
IAMONJOB. Trois fichiers ont été ajoutés / modifiés :

- `services/france_travail.py` — client OAuth2 + recherche + détail (avec cache).
- `backend/routes/api/france_travail_api.py` — blueprint Flask `/api/jobs/...`.
- `app.py` — enregistrement du blueprint sous le préfixe `/api/jobs`.
- `frontend/src/components/FranceTravail/FranceTravailSearch.{js,css}` — UI.
- `frontend/src/pages/Dashboard.js` — nouvel onglet `Offres France Travail`.

---

## 1. Obtenir les credentials

1. Créer un compte développeur sur https://francetravail.io/.
2. Créer une application et demander l'accès à l'API **Offres d'emploi v2**.
3. Une fois l'application validée, France Travail fournit :
   - `client_id`
   - `client_secret`
   - Scope autorisé : `api_offresdemploiv2 o2dsoffre`

Le quota par défaut est d'environ **3 000 requêtes par jour**. Suffisant pour
un MVP, mais à surveiller si vous activez le scoring "batch" sur de grosses
listes.

## 2. Configuration des variables d'environnement

### Développement local

Créez un fichier `.env` à la racine du projet (à partir de `.env.example`) :

```env
FT_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FT_CLIENT_SECRET=yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
FT_SCOPE=api_offresdemploiv2 o2dsoffre
```

Le fichier `.env` est ignoré par Git.

### Production (Railway)

Dans la console Railway :

1. Ouvrir le service (`iamonjob-production`).
2. Onglet **Variables**.
3. Ajouter `FT_CLIENT_ID`, `FT_CLIENT_SECRET`, `FT_SCOPE`.
4. Redéployer le service (Railway le fait automatiquement).

## 3. Vérifier que ça marche

Une fois déployé, lancez ce ping (route publique sans auth) :

```bash
curl https://iamonjob-production.up.railway.app/api/jobs/health
```

Réponse attendue si tout est OK :

```json
{ "success": true, "configured": true, "token_prefix": "abc123…" }
```

Si vous obtenez `"configured": false`, le message d'erreur indique précisément
quelle variable est absente ou si l'OAuth2 échoue.

## 4. Endpoints exposés

Tous protégés par JWT (header `Authorization: Bearer <token>`) sauf
`/health`.

| Méthode | Endpoint | Rôle |
|---|---|---|
| GET | `/api/jobs/health` | Ping public (token FT chargé ?) |
| POST | `/api/jobs/search` | Recherche paginée (motsCles, commune, distance, typeContrat, publieeDepuis, range, sort). Retourne aussi un `quick_score` 0-100 par offre si le CV de l'utilisateur est chargé. |
| GET | `/api/jobs/{ft_id}` | Détail complet (cache backend 1 h) |
| POST | `/api/jobs/{ft_id}/match` | Matching IA approfondi (réutilise `matching_cv_offre`). Injecte l'offre FT dans la session utilisateur puis appelle le service IA standard. |

### Exemple : recherche

```bash
curl -X POST https://iamonjob-production.up.railway.app/api/jobs/search \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "motsCles": "développeur python",
    "commune": "75056",
    "distance": 25,
    "typeContrat": "CDI",
    "publieeDepuis": 7,
    "range": "0-19"
  }'
```

## 5. Score rapide vs matching IA

| | Score rapide | Matching IA |
|---|---|---|
| Vitesse | Instantané | 10-20 s (appel Claude) |
| Coût | 0 tokens | Tokens IA |
| Présent | Sur **chaque** carte de résultat | Sur demande (bouton "Tester ma compatibilité IA") |
| Logique | Overlap pondéré du vocabulaire CV ↔ offre | Service `matching_cv_offre` (analyse fine, recommandations) |

Le score rapide sert au tri initial et donne un repère gratuit à l'utilisateur.
Le matching IA reste la valeur ajoutée du produit pour les offres qui
intéressent vraiment l'utilisateur.

## 6. Personnaliser plus tard

Pistes pour les phases suivantes :

- Calculer 2-3 codes ROME automatiquement à partir du CV (prompt Claude
  léger) et les sauvegarder côté Supabase pour préfiltrer les recherches.
- Ajouter une table `user_saved_jobs` pour les favoris.
- Ajouter une table `job_applications` (pipeline : Sauvegardée / Envoyée /
  Entretien / Refusée / Acceptée).
- Brancher une recherche "Recommandées pour vous" en page d'accueil du
  dashboard (utilisation des codes ROME + préférences questionnaire).

## 7. En cas de pépin

| Symptôme | Cause probable | Solution |
|---|---|---|
| `/api/jobs/health` → 503 | Credentials FT absents | Vérifier `FT_CLIENT_ID` / `FT_CLIENT_SECRET` |
| `/api/jobs/search` → 502 | Quota dépassé ou API FT KO | Attendre, ou regarder le statut sur francetravail.io |
| Pas de score sur les cartes | CV utilisateur absent | Charger un CV dans l'onglet "Mes documents" |
| Matching IA renvoie une erreur | CV absent côté session | Idem |
