# Questionnaires de suivi d'accompagnement

Les fiches hebdomadaires (PROMO 45+ et futurs parcours) sont remplies par les personnes accompagnées dans leur espace Iamonjob, et suivies par le conseiller dans `/conseiller`.

## Où sont les choses

| Élément | Fichier |
|---|---|
| Questionnaires, parcours, validation | `lib/questionnaires/catalogue.js` |
| Lecture / écriture Firestore | `lib/questionnaires/reponses.js` |
| API personne accompagnée | `app/api/questionnaires/route.js` |
| API conseiller | `app/api/conseiller/questionnaires/…`, `app/api/conseiller/parcours/route.js` |
| Écran personne accompagnée | `components/MesQuestionnaires.jsx` (colonne de gauche + mobile) |
| Tableau de suivi conseiller | `components/conseiller/SuiviQuestionnaires.jsx` |
| Import des fiches d'une promo suivie hors app | `scripts/import-questionnaires-archive.mjs` |

## Fonctionnement

1. Le conseiller clique sur « Constituer une promo », choisit le parcours (PROMO 45+), nomme la promo et coche les personnes.
2. Chaque personne voit « Mes questionnaires » dans son espace, choisit la fiche de la semaine et la remplit. Elle peut la relire et la corriger.
3. Le conseiller voit les notes semaine par semaine, les alertes (baisse de 2 points ou plus, note ≤ 4, engagement non tenu, fiche manquante) et chaque fiche complète.

Firestore : `questionnaireReponses/{beneficiaireId}__{questionnaireId}` ; le parcours est porté par `beneficiaires/{id}.parcoursId` et `.promo`. Règles fermées, tout passe par l'Admin SDK. La purge d'un dossier efface aussi ses réponses.

## Ajouter ou modifier un questionnaire

- S5 et S6 de PROMO 45+ : écrire l'objet dans `catalogue.js` (même forme que S1 à S4), l'ajouter à `QUESTIONNAIRES`, puis renseigner `questionnaireId` dans l'étape correspondante de `PARCOURS.promo45`.
- Modifier une fiche déjà remplie par quelqu'un : incrémenter `version`. Chaque réponse garde la version remplie.
- Les listes d'options marquées « à vérifier » ont été déduites des réponses de la promo d'octobre 2026 : à confronter au formulaire d'origine.
- Un nouveau type d'accompagnement : ajouter une entrée dans `PARCOURS`, en réutilisant ou non les questionnaires existants.

Pour que le tableau suive une trajectoire, une question alimente le socle commun via sa clé `socle` : `confiance`, `moral`, `motivation`, `energie`, `change`, `frein`, `petitPas`, `engagementTenu`, `obstacle`, `capable`, `engagement`, `metierVise`, `cap`.

## Import des fiches de la PROMO 45+ d'octobre 2026

Les 40 fiches (13 codes, S1 à S4) sont exportées dans un fichier gardé hors du dépôt (réponses libres personnelles).

```bash
node scripts/import-questionnaires-archive.mjs \
  --file="$HOME/Documents/Claude/Projects/IAMONJOB/promo45-fiches-archive.json" \
  --conseiller=ton.email@exemple.fr \
  --promo="PROMO 45+ · octobre 2026"
```

Ajouter `--dry-run` pour vérifier sans rien écrire. Relancer remplace les fiches importées, sans doublon.

### Rattacher les fiches aux dossiers

Une fois les personnes de la promo inscrites dans Iamonjob, leurs fiches archivées sont rattachées à leur dossier : elles s'affichent sur la même ligne que les fiches remplies dans l'app, dans la promo du dossier.

```bash
node --env-file=.env.local scripts/rattacher-archives-questionnaires.mjs \
  --promo-archive="PROMO 45+ · octobre 2026" --promo-dossiers="Promo 20" [--apply]
```

Le code d'archive est la fin du code du dossier (NKCC → AC-2026-018-NKCC). Écart d'un caractère toléré s'il est unique, appariement forcé possible avec `--force=CODE:SUFFIXE`. Une fiche rattachée garde `source: 'archive'`, son code d'origine (`archiveCode`) et reste en lecture seule pour la personne. Ne pas relancer l'import après le rattachement : il recréerait les fiches sous les anciens codes.

Fait le 12 octobre 2026 pour la PROMO 45+ d'octobre (Promo 20, d'abord nommée « Promo 21 » par erreur et renommée le 17 octobre avec `scripts/renommer-promo.mjs` ; les identifiants de documents gardent `promo-21`) : 40 fiches, 13 dossiers. Rapprochements non exacts : BACB → B9CB, HTGA → HT6A, ZCES → ZCE5. XXXX n'est pas 3DYP : son dossier est chez une autre conseillère. Ses 3 fiches restent dans la Promo 20 sous le code XXXX, sans dossier (`archive__promo-21__xxxx-sN`), pour garder la promo complète. Pour les autres promos, vérifier avant de laisser jouer l'appariement « par élimination ».

## Rapport de synthèse et export d'une promo

Dans le tableau de suivi, au-dessus de la promo affichée :

- **Rapport** : le serveur rassemble toutes les fiches de la promo, calcule les moyennes par semaine et le taux d'engagements tenus, puis Mistral (`mistral-large`, repli `mistral-small`) rédige la synthèse au format JSON. Le rapport est enregistré dans `questionnaireRapports` et relisible sans relancer l'IA (10 derniers par promo). Copier, imprimer / PDF, supprimer. Limite : 2 par minute, 20 par jour et par conseiller.
- **Exporter les fiches** : `.md` (consigne de synthèse + chiffres + toutes les réponses, à coller dans l'IA de son choix) ou `.csv` (une ligne par réponse, pour un tableur).

Code : `lib/questionnaires/rapport.js` (collecte, chiffres, prompt, export), `app/api/conseiller/questionnaires/rapport/route.js`, `app/api/conseiller/questionnaires/export/route.js`. Le prompt est la constante `SYSTEM` de `rapport.js`.

À savoir : les rapports contiennent des extraits de réponses sous les codes. Ils ne sont pas effacés par la purge d'un dossier : les supprimer à la main en fin de promo.

## Interactions conseiller / accompagné (octobre 2026)

### Envois du conseiller

Le conseiller prend l'initiative depuis la fiche d'une personne (clic sur son code dans « Mon groupe accompagné »), depuis une promo (« Envoyer à la promo ») ou depuis la base de questionnaires (« Envoyer »). Trois types :

| Type | Bouton chez la personne | Soldé quand |
|---|---|---|
| Offre (intitulé, entreprise, lieu, lien, mot) | « Offre de votre conseiller » | la personne l'ouvre |
| Message | « Message de votre conseiller » | la personne l'ouvre |
| Questionnaire | « Merci de répondre à quelques questions » | la personne y répond |

La personne peut répondre librement à une offre ou un message : le conseiller voit la réponse dans la fiche et reçoit le mail habituel (code seulement). Aucun email n'est envoyé à la personne : son compte repose sur une adresse fictive tirée de son code. Le bouton apparaît à sa prochaine connexion.

Un questionnaire du parcours de la personne (ex. PROMO 45+ S3) s'enregistre à sa place habituelle, dans la colonne S3 du tableau. Tout autre questionnaire est « ponctuel » : rangé dans `questionnaireReponses/envoi__{envoiId}` (sans étape), affiché dans la colonne « Ponctuels » de la promo et dans la fiche de la personne, exclu du rapport hebdomadaire.

Code : `lib/envois.js`, `app/api/envois/…` (personne), `app/api/conseiller/envois/…`, `components/EnvoisConseiller.jsx`, `components/conseiller/EnvoiModal.jsx`. Firestore : `envois/{id}`.

### Base de questionnaires : parcours et questionnaires

Deux niveaux, dans l'onglet Questionnaires :

- **Parcours** : un enchaînement de questionnaires (Semaine 1, 2… ou Étape 1, 2…). Usage « promo » (tout un groupe, suivi comparé semaine par semaine, bouton « Démarrer une promo ») ou « individuel » (une personne à son rythme, bouton « Attribuer à des personnes », aussi depuis la fiche de la personne). Ouverture des étapes : toutes d'emblée, ou l'une après l'autre (une étape s'ouvre quand la précédente est remplie). PROMO 45+ est le parcours du catalogue ; les autres vivent dans `parcoursPerso/{id}` (id public `parcours-{id}`). Un parcours déjà suivi garde ses étapes à leur place : on ajoute à la fin, on renomme ; pour réorganiser, « Modifier une copie ».
- **Questionnaires** : les fiches. Une même fiche peut être une étape d'un ou plusieurs parcours ET s'envoyer seule (« Envoyer une fois… », à une promo ou à des personnes). La ligne indique les parcours où elle sert.

Réutiliser et adapter : « Modifier » sur les vôtres (version +1), « Modifier une copie » sur le catalogue ou ceux d'un collègue (l'original ne bouge pas). Chaque réponse fige son détail (`detail`) à l'envoi : une fiche reste lisible même après modification du questionnaire.

Une personne suit un seul parcours à la fois : celui de sa promo, ou un parcours individuel. Les envois ponctuels restent toujours possibles.

Code : `lib/questionnaires/base.js` (questionnaires), `lib/questionnaires/parcours.js` (parcours, `resolveParcours`), `app/api/conseiller/questionnaires/base/…`, `app/api/conseiller/parcours-modeles/…`, `components/conseiller/BaseQuestionnaires.jsx`.

### Métiers de l'étape 2

La fiche d'une personne affiche les métiers qu'elle a mis de côté avec l'étoile, puis les 9 pistes de sa dernière analyse, avec un lien vers les offres France Travail. Seuls les intitulés sont lus (`cvs/{authUid}`), jamais le texte du CV. Les métiers simplement consultés ne sont pas transmis (ils restent dans le navigateur de la personne).

### Archiver une promo

« Archiver la promo » pose `promoArchivee: true` sur ses dossiers. Rien n'est supprimé : la promo passe dans « Promos archivées », les fiches restent lisibles, les personnes restent suivies et peuvent recevoir des envois. Côté personne, plus de pastille de relance, ses questionnaires restent ouverts. « Réactiver » revient en arrière. Route : `/api/conseiller/promos`.

### Transférer un dossier

Fiche de la personne → « Transférer » → un collègue de la même structure. Le dossier, ses fiches, ses messages et les envois changent de `conseillerUid` ; la personne garde son code, sa promo et son historique (`transferts`). Le collègue reçoit un mail (code seulement). L'annuaire (`conseillers/{uid}` : role, email, structureId) se remplit à chaque ouverture de `/conseiller` : un collègue n'apparaît qu'après sa première visite.

### Fichier des codes

« Télécharger mes codes » (et « Codes » sur une promo) produit un CSV (points-virgules, BOM, lisible par Excel) : code, colonne Prénom vide à compléter, promo, statut. Généré dans le navigateur, il ne transite pas par le serveur. À garder sur l'ordinateur du conseiller, jamais à redéposer dans l'appli.

### Tableau de bord conseiller

`/conseiller` est organisé en onglets (l'onglet ouvert est gardé dans l'adresse, ex. `/conseiller#promos`) :

| Onglet | Contenu |
|---|---|
| Promos | une carte par promo (participants, codes activés, fiches reçues) : constituer, modifier, envoyer, codes, archiver, liens vers les participants et le suivi |
| Accompagnements | une ligne par personne, filtre par promo, tri par date d'inscription (activation du code), par promo ou par code, recherche ; ajout d'une personne, fichier des codes |
| Questionnaires | suivi semaine par semaine, rapport, export, puis la base de questionnaires |
| Messages | messages des personnes (avis), réponses à vos envois, offres signalées hors sujet |
| Documents | bibliothèque, envoi, suivi des signatures |

Composants : `components/conseiller/PromosPanel.jsx`, `AccompagnementsPanel.jsx`, `ReponsesEnvois.jsx`, `DocumentsPanel.jsx`.

### Documents à signer

Fiche d'engagement, charte… Le conseiller dépose un PDF ou un Word (5 Mo maximum, bucket privé, dossier `documents/{structureId}/`) et/ou un texte, partagé avec sa structure, puis l'envoie (envoi de type `document`). Côté personne : bouton « Document à lire et signer ». Deux modes, choisis à la création :

- en ligne : la personne coche « J'ai lu et j'accepte » ; on garde son code, la date et la version, aucun nom ;
- papier : elle signe à la main avec son conseiller, qui clique « Marquer signé » (onglet Documents ou fiche de la personne). L'original reste à la structure.

Code : `lib/documents.js`, `app/api/conseiller/documents/…`, signature dans `lib/envois.js` (`signDocumentEnvoi`, `setSignaturePapier`). Firestore : `documentsModeles/{id}`.

### Renommer une promo

`node --env-file=.env.local scripts/renommer-promo.mjs --from="ancien" --to="nouveau" [--apply]` : dossiers, fiches, rapports et envois. Sans `--apply`, simple décompte. Vérifier d'abord que le nouveau libellé n'existe pas déjà (sinon les deux promos fusionnent).

### À déployer

`firebase deploy --only firestore:rules` (collections `envois`, `questionnairesPerso`, `documentsModeles` et `parcoursPerso` déclarées fermées ; le refus par défaut les couvrait déjà).
