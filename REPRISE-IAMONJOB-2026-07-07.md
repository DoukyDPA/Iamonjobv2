# Note de reprise, IAMONJOB

Date : 7 juillet 2026
Périmètre : optimisation de la chaîne métier autour du code ROME, et agrégation multi-sources des offres.

## En une phrase

On a transformé une chaîne où l'IA proposait des métiers un peu au hasard et où le salaire était une estimation approximative, en une chaîne unifiée autour d'un code ROME officiel qui sert de clé commune aux offres, aux entreprises et au salaire.

## Ce qui a été construit

Quatre briques, dans l'ordre où on les a posées.

### 1. Salaire sourcé

Avant, le salaire de la fiche métier sortait d'un champ que l'IA remplissait au jugé. Maintenant il vient de données réelles. La brique interroge l'endpoint « histogram » d'Adzuna, calcule une fourchette (quartile bas, médiane, quartile haut) sur la distribution réelle des offres, et affiche la source avec le nombre d'offres et l'année. Si Adzuna ne répond pas ou renvoie trop peu d'offres, l'ancienne estimation IA reprend la main, marquée « indicative ».

Fichiers : `lib/salary.js`, `app/api/salary/route.js`, et le câblage dans `components/App.jsx` (fonction `discoverJob`).

### 2. Code ROME fiabilisé

Avant, le code ROME était deviné par Gemini, qui pouvait halluciner un code inexistant. Maintenant il vient de ROMEO 2.0, le moteur officiel de France Travail, qui renvoie un code avec un score de prédiction. Si ROMEO est indisponible ou ne trouve rien de fiable, le repli Gemini reprend la main. La signature de la fonction n'a pas changé, donc rien d'autre n'a bougé.

Fichier : `lib/france-travail.js` (fonctions `romeoPredict`, `getRomeViaRomeo`, `getRomeViaAI`, `getRomeFromLabel`).

### 3. Clé ROME unifiée

Avant, les offres cherchaient par mots-clés pendant que les entreprises cherchaient par code ROME. Deux logiques pour le même métier. Maintenant le code ROME est résolu une seule fois à la sélection du métier, puis partagé. Les offres France Travail sont interrogées par `codeROME` (précis, taxonomie officielle), avec repli mots-clés si besoin. Le lanceur de campagne réutilise le code déjà résolu au lieu de rappeler l'API.

Fichiers : `lib/france-travail.js` (fonction `searchOffers`), `app/api/france-travail/route.js`, `components/App.jsx`, `components/CampaignLauncher.jsx`.

### 4. Métiers proposés calés sur le ROME

C'est le chaînon qui rend le reste cohérent. Après l'analyse du CV, les 9 métiers suggérés par l'IA passent tous par un appel ROMEO groupé (un seul appel pour les neuf). Chaque intitulé est calé sur son appellation ROME officielle, avec son code attaché à la carte. On force l'appellation la plus proche, même pour les pistes créatives, pour une cohérence totale. Effet de bord : le code voyage avec la carte, donc plus aucune résolution au clic.

Fichiers : `lib/france-travail.js` (fonction `normalizeSuggestionsToRome`), `app/api/ai/route.js`, `components/App.jsx`.

### 5. Offres multi-sources

Les offres ne viennent plus d'une seule plateforme. Un agrégateur interroge France Travail (par code ROME), Adzuna (par mot-clé) et Jooble (optionnel) en parallèle. Les résultats sont fusionnés en round-robin pour garantir la diversité, dédoublonnés quand une annonce apparaît sur plusieurs sites, puis plafonnés. Chaque offre garde sa source, affichée en badge sur sa carte. Une source en panne n'empêche pas les autres.

Fichiers : `lib/offers.js`, `app/api/france-travail/route.js`, `components/App.jsx`.

## Ce qu'il reste à activer

Le code est prêt et tourne en repli tant que ces activations ne sont pas faites. Rien ne casse en attendant.

- **ROMEO 2.0** : à souscrire dans ton tableau de bord francetravail.io, sur ton application existante (bouton « Utiliser l'API »). Aucune nouvelle clé, tes identifiants France Travail actuels suffisent. Tant que ce n'est pas souscrit, la résolution ROME et la normalisation des métiers retombent sur Gemini.

- **Adzuna** : tes clés `ADZUNA_APP_ID` et `ADZUNA_APP_KEY` doivent être présentes dans `.env.local` en local, et dans les variables Railway en production. Elles servent à la fois au salaire et aux offres Adzuna.

- **Jooble** : bloqué. La clé actuelle renvoie un 403 depuis tous les contextes testés (Mac, Railway, et le site jooble.org lui-même). Diagnostic : la clé n'est pas active. Jooble valide manuellement les demandes avant d'activer. Action : vérifier le mail d'activation, ou relancer leur support en signalant le 403 sur tous les appels. Le code est correct et conforme à leur doc officielle, rien à modifier. Dès que la clé est active, les offres Jooble apparaissent automatiquement, sans redéploiement. La clé partagée en clair pendant le debug est à régénérer par prudence.

## Robustesse

Chaque brique a un repli. Salaire Adzuna absent, on garde l'estimation IA. ROMEO indisponible, on garde Gemini. Offre par ROME sans résultat, on bascule sur les mots-clés. Une source d'offres en panne, les autres continuent. L'application reste fonctionnelle dans tous les cas de figure.

## Points de vigilance et pistes futures

- La route s'appelle toujours `/api/france-travail` alors qu'elle agrège désormais trois sources. C'est cosmétique. On pourra la renommer en `/api/offres` plus tard, en ajustant l'appel côté interface.

- La localisation du salaire Adzuna est nationale pour l'instant. Le champ `userLocation` contient souvent un code postal ou un département, qu'Adzuna n'accepte pas comme lieu. Un mapping code postal vers région donnerait des fourchettes régionales.

- L'endpoint voisin `/predictionCompetences` de ROMEO pourrait fiabiliser aussi le rapprochement des compétences du CV, comme on l'a fait pour les métiers.

- Le libellé ROME officiel est parfois moins parlant que l'intitulé IA (« Responsable qualité services » contre « Responsable qualité »). Le champ `titleOriginal` est conservé sur chaque métier : si un jour le ton officiel gêne, on peut afficher l'intitulé IA en titre et l'appellation ROME en sous-titre.

## Variables d'environnement concernées

```
FRANCE_TRAVAIL_CLIENT_ID
FRANCE_TRAVAIL_CLIENT_SECRET
FRANCE_TRAVAIL_ROMEO_SCOPE        (défaut api_romeov2)
FRANCE_TRAVAIL_ROMEO_MIN_SCORE    (défaut 0.4)
ADZUNA_APP_ID
ADZUNA_APP_KEY
JOOBLE_API_KEY                    (optionnel)
```

## Fichiers créés ou modifiés

Créés : `lib/salary.js`, `lib/offers.js`, `app/api/salary/route.js`.

Modifiés : `lib/france-travail.js`, `app/api/france-travail/route.js`, `app/api/ai/route.js`, `components/App.jsx`, `components/CampaignLauncher.jsx`, `.env.example`.

## Reprise git

Le premier commit a été bloqué en local par des fichiers verrous résiduels dans `.git`. Pour committer proprement :

```bash
cd "/Users/danielpigeon-angelini/Desktop/COWORK/PROJETS CBE/IAMONJOB/Iamonjobv2-clean"
find .git -name '*.lock' -delete
git add -A
git commit -m "feat: salaire sourcé, ROME fiabilisé et offres multi-sources"
git push origin main
```

Dépôt distant : https://github.com/DoukyDPA/Iamonjobv2 (branche main).
Ne jamais committer `.env.local`, il est bien ignoré par git.
