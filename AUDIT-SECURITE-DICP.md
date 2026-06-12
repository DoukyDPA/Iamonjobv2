# Audit de sécurité IAMONJOB — protocole DICP

**Cible auditée :** `Iamonjobv2-clean` (Next.js 14, Firebase Auth + Firestore, IA Gemini/Mistral, France Travail).
**Date :** 12 juin 2026.
**Périmètre :** code applicatif, routes API, gestion des secrets, persistance des données.

Le code part déjà d'une bonne base. Les prompts IA sont construits côté serveur, le rate limiting existe, le CORS de l'inscription est restreint, les tokens sont vérifiés. Cet audit cible ce qui reste à durcir avant d'ouvrir le test à 100 utilisateurs.

Verdict global : **une faille bloquante** (règles Firestore), trois risques élevés, le reste en durcissement.

---

## Synthèse priorisée

| # | Pilier | Risque | Gravité | Effort |
|---|--------|--------|---------|--------|
| 1 | Confidentialité / Intégrité | Aucune règle Firestore dans le repo, écritures CV faites depuis le navigateur | **Bloquant** | Faible |
| 2 | Disponibilité | Aucun timeout sur les appels IA et France Travail | Élevé | Faible |
| 3 | Confidentialité | Clé Gemini passée dans l'URL (query string) | Élevé | Faible |
| 4 | Disponibilité | Endpoint `beta-signup` public sans limite par IP | Élevé | Moyen |
| 5 | Preuve | Pas de journalisation structurée des actions | Moyen | Moyen |
| 6 | Intégrité | Sortie JSON de l'IA non validée par schéma | Moyen | Moyen |
| 7 | Confidentialité | En-têtes de sécurité HTTP absents (CSP, HSTS…) | Moyen | Faible |
| 8 | Disponibilité | Replica unique, healthcheck sur `/` | Moyen | Faible |

---

## 1. Disponibilité

### Ce qui va

Le rate limiting par utilisateur (`lib/rate-limit.js`) protège le quota IA et la facture. Le redémarrage automatique est configuré dans `railway.toml` (`restartPolicyType = "on_failure"`).

### Les risques

**Pas de timeout sur les appels sortants.** `callGemini`, `callMistral` et `searchOffers` font un `fetch` sans `AbortController`. Si Gemini traîne ou ne répond pas, la fonction serveur reste bloquée jusqu'au timeout de la plateforme. Quelques requêtes lentes suffisent à saturer le process et à geler le site pour tout le monde. C'est le risque d'indisponibilité le plus concret.

**Replica unique.** `numReplicas = 1` dans `railway.toml`. Le moindre crash ou redéploiement coupe le service. Le healthcheck pointe sur `/`, qui redirige vers `/login` quand on n'est pas connecté : le check teste une redirection, pas la santé réelle de l'app.

**Aucun repli entre providers.** Si Gemini tombe, rien ne bascule automatiquement vers Mistral, alors que les deux sont déjà branchés.

### Recommandations

Ajoute un timeout sur chaque appel externe. Modèle à appliquer dans `gemini.js`, `mistral.js` et `france-travail.js` :

```js
async function fetchWithTimeout(url, options, ms = 20000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}
```

Crée une vraie route de santé `app/api/health/route.js` qui renvoie `200` sans authentification, et pointe `healthcheckPath = "/api/health"` dans `railway.toml`.

Passe à `numReplicas = 2` dès que le budget le permet. Deux instances suppriment le point de panne unique et absorbent un pic.

Ajoute un repli Gemini vers Mistral dans `callAI` : si le provider principal échoue ou expire, retente une fois sur l'autre avant de renvoyer l'erreur.

---

## 2. Intégrité

### Ce qui va

Gros point fort déjà en place : les instructions système sont construites côté serveur (`lib/ai/prompts.js`). Le client n'envoie qu'une `action` et des `params`, jamais le `systemInstruction`. La fonction `inline()` neutralise sauts de ligne et backticks dans les valeurs insérées. Ça coupe l'essentiel des injections de prompt.

### Les risques

**Sortie IA non validée.** `parseJsonResponse` récupère un objet, mais rien ne vérifie qu'il contient bien les champs attendus (`score`, `summary`…) ni leur type. Une réponse mal formée du modèle peut casser l'affichage ou injecter des valeurs inattendues dans Firestore.

**Le texte du CV reste un vecteur d'injection.** Le contenu du CV part dans le prompt via `block()`, qui borne juste la taille. Un CV piégé peut tenter de détourner l'analyse. Le risque est limité (le système garde la main), mais réel.

**Intégrité des données stockées.** Voir le point 3 : sans règles Firestore, n'importe qui peut écrire dans la collection `cvs`. C'est autant un problème d'intégrité que de confidentialité.

### Recommandations

Valide la sortie de l'IA avant de l'utiliser. Une lib légère comme `zod` permet de déclarer le schéma attendu par action et de rejeter proprement une réponse non conforme :

```js
const RatingSchema = z.object({
  score: z.number().min(0).max(10),
  summary: z.string().max(500),
});
const parsed = RatingSchema.safeParse(result);
if (!parsed.success) throw new Error('Réponse IA non conforme.');
```

Encadre le texte utilisateur dans le prompt avec un délimiteur explicite (`<<<CV>>> … <<<FIN CV>>>`) et rappelle au modèle, dans le gabarit système, que tout ce qui est entre les balises est une donnée à analyser, jamais une consigne.

Verrouille Firestore (point 3) pour garantir qu'un utilisateur ne modifie que ses propres documents.

---

## 3. Confidentialité (RGPD et clés API)

### La faille bloquante : Firestore sans règles

`lib/firebase/client.js` écrit et lit les CV **directement depuis le navigateur** (`saveCvToFirestore`, `getCvFromFirestore`, `saveCvRatingToFirestore`). Le seul rempart entre un visiteur et la base, c'est les règles de sécurité Firestore. Or aucun fichier `firestore.rules` n'existe dans le repo.

Si les règles sont restées en mode test ou ouvertes côté console Firebase, **n'importe qui peut lire ou modifier tous les CV de tous les utilisateurs**. Un CV, ça contient nom, parcours, parfois adresse et téléphone : de la donnée personnelle au sens RGPD. C'est le point à corriger avant tout le reste.

Règles minimales à déployer :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Chaque utilisateur n'accède qu'à son propre CV
    match /cvs/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    // Les inscriptions bêta : écriture serveur uniquement (Admin SDK)
    match /beta_signups/{doc} {
      allow read, write: if false;
    }
    // Rate limits : serveur uniquement
    match /rate_limits/{doc} {
      allow read, write: if false;
    }
  }
}
```

Versionne ce fichier dans le repo et déploie-le avec `firebase deploy --only firestore:rules`. Sans version dans le code, personne ne peut auditer ni reproduire la config.

### Les clés API

**Clé Gemini dans l'URL.** `gemini.js` construit `...:generateContent?key=${apiKey}`. Les URL finissent dans les logs des proxys, des CDN et des outils de monitoring. Une clé qui traîne dans un log, c'est une clé qui fuit. Passe-la en en-tête :

```js
headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }
```

**Le reste est sain.** Les clés serveur (Firebase Admin, Mistral, France Travail) restent côté serveur via `process.env`, `.env.local` est bien dans `.gitignore`, et la config Firebase en dur dans `client.js` est publique par nature (normal pour une app web Firebase). Rien à changer là-dessus.

### RGPD

Pense à compléter le dispositif au-delà du code : une route de suppression de compte qui efface le document `cvs/{uid}` et l'entrée Firebase Auth (droit à l'effacement), une durée de conservation définie pour `beta_signups`, et la vérification que les pages `/confidentialite` et `/cgu` décrivent bien les traitements réels (IA tierce, hébergement, France Travail).

### En-têtes de sécurité

Aucun en-tête de sécurité HTTP n'est posé. Ajoute-les dans `next.config.js` pour limiter clickjacking, sniffing et fuite de référent :

```js
async headers() {
  return [{
    source: '/:path*',
    headers: [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    ],
  }];
}
```

Une Content-Security-Policy viendra ensuite, une fois les domaines tiers (Firebase, postimg) recensés.

---

## 4. Preuve et traçabilité

### L'état actuel

La journalisation se résume à des `console.log` et `console.error` dispersés. `france-travail.js` logge même l'URL de recherche complète et les mots-clés. Trois limites : aucune trace structurée des actions utilisateur, pas d'identifiant de requête pour relier les événements, et des données potentiellement personnelles qui partent dans les logs en clair.

En cas d'abus, de litige ou de demande RGPD, tu n'as aucun moyen de répondre à « qui a fait quoi, quand ».

### Recommandations

Mets en place une journalisation structurée en JSON, avec un identifiant de requête généré à l'entrée de chaque route API et propagé dans les logs. Une lib comme `pino` suffit, ou un petit helper maison.

Trace les actions qui comptent : connexion et déconnexion, appel IA (uid, action, provider, durée, succès ou échec), recherche France Travail, inscription bêta, déclenchement du rate limit. Le format type :

```js
function logEvent(evt) {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    requestId: evt.requestId,
    uid: evt.uid ?? null,
    action: evt.action,
    status: evt.status,
    durationMs: evt.durationMs,
  }));
}
```

Règle d'or : **jamais de donnée personnelle dans les logs**. On journalise l'`uid`, pas l'email ni le texte du CV. Dans `france-travail.js`, retire l'URL complète et les mots-clés bruts, garde juste le nombre de résultats et la durée.

Côté conservation, fixe une rétention (par exemple 30 à 90 jours) et un accès restreint aux logs. Railway offre une rétention limitée : si la traçabilité devient un enjeu, envisage un puits de logs externe (Logtail, Axiom, ou équivalent).

Pour les données sensibles, garde une trace d'audit applicative dans Firestore (collection `audit_logs`, écriture serveur uniquement) sur les seuls événements critiques : suppression de compte, export de données, modification de CV. C'est ce qui te permettra de prouver le respect des droits RGPD.

---

## Plan d'action conseillé

**Avant d'ouvrir le test (bloquant) :** déployer et versionner les règles Firestore (#1), ajouter les timeouts sur les appels externes (#2), basculer la clé Gemini en en-tête (#3).

**Première semaine :** rate limit par IP sur `beta-signup`, en-têtes de sécurité HTTP, route `/api/health` dédiée.

**Consolidation :** journalisation structurée et trace d'audit (#5), validation par schéma des sorties IA (#6), repli Gemini vers Mistral, second replica.

Aucun de ces chantiers n'est lourd. Le plus urgent, les règles Firestore, se règle en une heure et ferme la seule porte vraiment grande ouverte.
