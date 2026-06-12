# Rétention des données et droit à l'effacement

Ce projet collecte deux types de données personnelles. Voici comment chacune est gérée et purgée.

## CV des utilisateurs (`cvs/{uid}`)

Le CV est lié au compte. Il disparaît dans deux cas : l'utilisateur supprime son compte (bouton « Supprimer mon compte » dans l'en-tête), ou tu le supprimes manuellement. La route `app/api/account/delete/route.js` efface le document CV, les compteurs de rate limit et le compte Firebase Auth, en une fois. L'action est irréversible.

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
