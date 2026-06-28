# Reprise — Module candidatures spontanées centaure

Document de reprise à partir du **Lot 6**. Rouvre une discussion neuve sans tout réexpliquer.

## Le dispositif en une phrase

L'IA prépare un document de proposition de campagne. Une séance avec le conseiller le valide. L'envoi ne part qu'après cette validation. La machine prépare, l'humain décide.

---

## Stack et repo

- Repo : github.com/DoukyDPA/Iamonjobv2 — dossier local : `Iamonjobv2-clean/`
- Next.js 14 App Router, React, Tailwind, Supabase (auth), Firestore (Admin SDK), IA Gemini + Mistral, API France Travail, Railway
- Dossier monté dans Cowork : `PROJETS CBE/IAMONJOB/Iamonjobv2-clean/`

---

## Ce qui est fait (Lots 0 à 5)

### Lot 0 — Verdict API La Bonne Boîte
- LBB v2 autorisée (2 appels/seconde)
- Retourne : SIRET, nom, NAF, adresse, GPS, effectif, score, URL fiche LBB, website
- Ne retourne PAS d'email ni de téléphone

### Lot 1 — Raccordement du ciblage
**Fichiers :**
- `lib/france-travail.js` — cache de tokens refactorisé, `getRomeFromLabel()`, `getLaBonneBoite()`
- `app/api/rome/route.js` — POST `{ label }` → `{ metiers[] }`
- `app/api/labonneboite/route.js` — POST `{ romeCode, latitude, longitude, … }` → `{ total, companies[] }`

### Lot 2 — Résolution du contact fonctionnel
**Principe RGPD :** adresses de fonction uniquement (recrutement@, rh@, contact@…). Jamais une personne nommée.

**Fichiers :**
- `lib/contact-resolver.js` — pipeline 4 étapes : domaine LBB → annuaire SIRET → vérif MX → candidats par priorité
- `app/api/contact-resolver/route.js` — POST `{ companies[] }` max 30

### Lot 3 — Génération du document de proposition
**Fichiers :**
- `lib/ai/prompts.js` — 2 actions : `campaign_profile`, `campaign_email_draft`
- `lib/campaign.js` — `generateCampaign()`, `getCampaigns()`, `getCampaignById()`, `updateCampaign()`
- `app/api/campaign/generate/route.js` — POST `{ cvText, jobTitle, codeRome, companies[] }`
- `app/api/campaign/list/route.js` — GET → `{ campaigns[] }`
- `firestore.rules` — collection `campaigns` serveur uniquement

### Lot 4 — Interface de validation conseiller
**Fichiers :**
- `app/api/campaign/[campaignId]/route.js` — GET + PATCH avec 3 règles métier câblées côté serveur :
  - PATCH `status:'validated'` refusé si zéro `keep`
  - `validatedAt` horodaté côté serveur uniquement (jamais confiance au client)
  - Modif `companies` ou `emailTemplate` post-validation → repasse automatiquement en `pending_validation`
- `app/campagne/[campaignId]/page.jsx` — interface complète : profil candidat, sélection pitch, brouillon email éditable, tableau entreprises avec keep/reject par ligne, notes, journal de validation, bouton Valider
- `app/campagne/page.jsx` — liste des campagnes

**Règles métier :**
- Bouton Valider inactif si zéro `keep`
- Post-validation : tout passe en lecture seule
- Toute modification post-validation → `pending_validation` automatique

### Lot 5 — Envoi post-validation (Resend)
**Fichiers :**
- `lib/mailer.js` — wrapper Resend via fetch natif (zéro dépendance npm). Lit `RESEND_API_KEY` + `RESEND_FROM_EMAIL`
- `lib/send-queue.js` — filtre `keep + email + sentAt null`, batch `SEND_DAILY_MAX` (défaut 5), délai aléatoire 2–5 s entre chaque, met à jour `companies[i].sentAt` Firestore après chaque succès, passe en `done` si tout parti
- `app/api/campaign/[campaignId]/send/route.js` — POST, vérifie `status === validated | sending`, rate-limité 1/min et 3/jour
- `app/campagne/[campaignId]/page.jsx` — section "Envoi" : barre de progression, statut par entreprise avec horodatage, erreurs, bouton "Lancer l'envoi" / "Prochain lot"

**Variables d'env ajoutées (Railway + `.env.local`) :**
```
RESEND_API_KEY=
RESEND_FROM_EMAIL=
SEND_RATE_PER_MINUTE=1
SEND_RATE_PER_DAY=3
SEND_DAILY_MAX=5
SEND_DELAY_MIN_MS=2000
SEND_DELAY_MAX_MS=5000
```

---

## Structure Firestore d'une campagne

```
campaigns/{campaignId}
  uid:        string
  status:     'draft' | 'pending_validation' | 'validated' | 'sending' | 'done'
  jobTitle:   string
  codeRome:   string
  candidateProfile:
    summary:        string
    keySkills:      string[]
    pitchLines:     string[]
    decisionPoints: string[]
  emailTemplate:
    subject: string
    body:    string   ← {{NOM_ENTREPRISE}} {{VILLE}} {{SECTEUR}}
  companies[]:
    siret, name, naf, nafText, city, zipcode, headcountText, stars, lbbUrl
    email:         string|null
    candidates:    string[]
    domain:        string|null
    contactMethod: string
    emailBody:     string|null
    decision:      'pending' | 'keep' | 'reject'
    notes:         string
    sentAt:        string|null        ← ISO 8601, écrit par le serveur après envoi Resend
    response:      'none' | 'positive' | 'negative'   ← Lot 6 (à venir)
    respondedAt:   string|null                         ← Lot 6
    relanceAt:     string|null                         ← Lot 6
  validationLog:
    preparedAt:   Timestamp
    validatedAt:  Timestamp|null
    validatedBy:  string|null
    advisorNotes: string
  createdAt: Timestamp
  updatedAt: Timestamp
```

---

## Variables d'environnement complètes

```
# Firebase client
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# IA
GEMINI_API_KEY=
MISTRAL_API_KEY=

# France Travail
FRANCE_TRAVAIL_CLIENT_ID=
FRANCE_TRAVAIL_CLIENT_SECRET=

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# Rate limits
AI_RATE_PER_MINUTE=15
AI_RATE_PER_DAY=200
FT_RATE_PER_MINUTE=20
FT_RATE_PER_DAY=300
LBB_RATE_PER_MINUTE=5
LBB_RATE_PER_DAY=50
CR_RATE_PER_MINUTE=5
CR_RATE_PER_DAY=30
CAMPAIGN_RATE_PER_MINUTE=2
CAMPAIGN_RATE_PER_DAY=5
SEND_RATE_PER_MINUTE=1
SEND_RATE_PER_DAY=3
SEND_DAILY_MAX=5
SEND_DELAY_MIN_MS=2000
SEND_DELAY_MAX_MS=5000
```

---

## Lot 6 — Suivi, relance, raccord entretien (À FAIRE)

### Ce qu'il faut construire

**Backend :**
- PATCH `/api/campaign/[campaignId]` étendu pour accepter `companies[i].response` et `companies[i].respondedAt`
- Calcul automatique de `relanceAt = sentAt + 10 jours` côté serveur, stocké dans Firestore

**Frontend — extension de `app/campagne/[campaignId]/page.jsx` :**
- Section "Suivi des retours" visible quand `status === 'sending' | 'done'`
- Pour chaque entreprise avec `sentAt` renseigné : boutons Positif / Négatif / Sans réponse
- Date de relance affichée (J+10 après l'envoi)
- Si `response === 'positive'` : bouton "Préparer l'entretien" → lien ou déclenchement du skill `dossier-emploi`

**Règles métier :**
- La décision de relancer reste au candidat (pas de déclenchement automatique)
- Relance = même flux que l'envoi initial (bouton "Relancer" → POST `/send` qui cible les entreprises `response === 'none'` à J+10)

### Champs Firestore à ajouter sur chaque company
```js
response:    'none' | 'positive' | 'negative'  // défaut : 'none'
respondedAt: string | null
relanceAt:   string | null  // sentAt + 10 jours, calculé côté serveur
```

---

## Décisions actées (non à re-débattre)

| Question | Décision |
|---|---|
| Multi-comptes conseiller / candidat | Non — même uid pour les deux |
| Envoi : service | Resend |
| Envoi : déclenchement | Manuel par le candidat |
| Envoi : max par batch | 5 (SEND_DAILY_MAX) |

---

## Patterns à respecter (conventions du projet)

- Toute route API : `auth cookie __session → adminAuth.verifyIdToken → enforceRateLimit → logique métier → logEvent`
- Les logs ne contiennent jamais de données personnelles (pas de CV, pas d'emails, pas de noms)
- Les secrets ne quittent jamais le serveur. Tout appel API externe passe par un proxy `/api/…`
- Les prompts IA sont dans `lib/ai/prompts.js` uniquement. Le client envoie une action, jamais un `systemInstruction`
- Sanitisation : `inline(v, max)` pour valeurs courtes, `block(v, max)` pour blocs de texte

---

## Pour démarrer la discussion suivante

Copie-colle ce bloc en ouverture :

```
Je reprends le développement du module candidatures spontanées centaure sur IAMONJOB v2.
Les lots 0 à 5 sont terminés (ciblage LBB, résolution de contacts, génération campagne,
interface validation conseiller, envoi Resend avec étalement).
La feuille de route complète est dans CANDIDATURES-SPONTANEES-REPRISE.md à la racine du projet.
On attaque le Lot 6 : suivi des retours, relances, raccord entretien.
Le dossier est monté dans Cowork : PROJETS CBE/IAMONJOB/Iamonjobv2-clean/
```
