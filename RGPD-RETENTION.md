# Rétention des données et droit à l'effacement

Ce projet collecte deux types de données personnelles. Voici comment chacune est gérée et purgée.

## CV des utilisateurs (`cvs/{uid}`)

Le CV est lié au compte. Il disparaît dans trois cas : l'utilisateur supprime son compte (bouton « Supprimer mon compte » dans l'en-tête), tu le supprimes manuellement, ou la purge automatique retire un compte inactif (voir plus bas). La route `app/api/account/delete/route.js` efface le document CV, les compteurs de rate limit et le compte Firebase Auth, en une fois. Elle passe par le helper partagé `lib/account-deletion.js`, qui décrit à un seul endroit ce qu'on efface. L'action est irréversible.

## Comptes inactifs (purge automatique)

IAMONJOB vise les demandeurs d'emploi actifs. Passé `INACTIVE_ACCOUNT_DAYS` jours sans activité (30 par défaut), un compte utilisateur est supprimé, avec les mêmes effets que la suppression manuelle. Les conseillers ne sont jamais concernés : tout compte portant le custom claim `role: 'conseiller'` est écarté.

L'activité vient des métadonnées Firebase Auth : dernière connexion et dernier rafraîchissement de jeton (ce dernier bouge tant que la personne utilise l'app). Aucun champ à stocker.

La logique est dans `lib/purge-inactive.js`, déclenchée par la route `app/api/admin/purge-inactive`. Cette route est protégée par un secret d'en-tête (`x-cron-secret`, variable `CRON_SECRET`) et attend un appel d'un ordonnanceur externe, une fois par jour.

### Changer la durée

Change `INACTIVE_ACCOUNT_DAYS` (par exemple 45 ou 60) et redéploie. Rien d'autre. Un plancher de 7 jours protège contre une valeur trop basse posée par erreur. Pense alors à mettre à jour `/confidentialite`, qui doit annoncer la durée réelle.

### Observer avant d'effacer

Un mode « à blanc » compte ce qui partirait sans rien supprimer :

```bash
curl -X POST "https://<app>/api/admin/purge-inactive?dryRun=1" \
  -H "x-cron-secret: $CRON_SECRET"
```

La réponse donne `scanned`, `conseillersSkipped`, `matched` (comptes qui seraient effacés) et `deleted` (0 en mode à blanc). Lance-le quelques jours avant d'activer la vraie purge pour vérifier le volume.

### Planifier

Programme un appel quotidien depuis l'ordonnanceur de ton choix (Railway Cron, cron-job.org, GitHub Actions) :

```bash
curl -X POST https://<app>/api/admin/purge-inactive \
  -H "x-cron-secret: $CRON_SECRET"
```

### Limite : pas de préavis email

Le système ne conserve pas les adresses email des utilisateurs, par choix de conception. Impossible donc de prévenir avant l'effacement. La purge est silencieuse. La page `/confidentialite` doit l'annoncer clairement : durée de conservation et suppression automatique sans notification.

## Inscriptions bêta (`beta_signups`)

Chaque inscription porte un champ `expireAt`, fixé à 180 jours après la création (réglable via `BETA_SIGNUP_RETENTION_DAYS`). Pour que Firestore purge ces documents tout seul, il faut activer une **TTL policy** sur ce champ. C'est une opération unique côté Google Cloud.

### Activer la TTL (une seule fois)

Console Google Cloud, projet `iamonjobv2` :

1. Va dans **Firestore → onglet TTL** (ou « Time-to-live »).
2. Crée une policy : collection `beta_signups`, champ `expireAt`.
3. Valide. Google supprime ensuite, en continu, tout document dont `expireAt` est passé.

En ligne de commande, équivalent gcloud :

```bash
gcloud firestore fields ttls update expireAt \
  --collection-group=beta_signups \
  --enable-ttl \
  --project=iamonjobv2
```

Note : la purge TTL n'est pas instantanée. Google supprime les documents périmés dans les 24 à 72 heures suivant leur date d'expiration. C'est conforme : la donnée n'est plus exploitée, elle est juste retirée par lots.

### Avant la TTL : documents déjà en base

Les inscriptions créées avant l'ajout du champ `expireAt` n'ont pas de date de péremption. Soit tu les laisses (elles ne seront jamais purgées automatiquement), soit tu leur ajoutes un `expireAt` à la main, soit tu les supprimes après le test.

## Pages légales

Pense à vérifier que `/confidentialite` décrit bien la réalité : durée de conservation de 180 jours pour les inscriptions, traitement du CV par une IA tierce (Gemini ou Mistral), hébergement, et la façon d'exercer le droit à l'effacement (le bouton dans l'app, plus le contact email).
