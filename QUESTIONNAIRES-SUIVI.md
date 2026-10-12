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
  --promo-archive="PROMO 45+ · octobre 2026" --promo-dossiers="Promo 21" [--apply]
```

Le code d'archive est la fin du code du dossier (NKCC → AC-2026-018-NKCC). Écart d'un caractère toléré s'il est unique, appariement forcé possible avec `--force=CODE:SUFFIXE`. Une fiche rattachée garde `source: 'archive'`, son code d'origine (`archiveCode`) et reste en lecture seule pour la personne. Ne pas relancer l'import après le rattachement : il recréerait les fiches sous les anciens codes.

Fait le 12 octobre 2026 pour la PROMO 45+ d'octobre (Promo 21) : 40 fiches, 13 dossiers. Rapprochements non exacts : BACB → B9CB, HTGA → HT6A, ZCES → ZCE5. XXXX n'est pas 3DYP : son dossier est chez une autre conseillère. Ses 3 fiches restent dans la Promo 21 sous le code XXXX, sans dossier (`archive__promo-21__xxxx-sN`), pour garder la promo complète. Pour les autres promos, vérifier avant de laisser jouer l'appariement « par élimination ».

## Rapport de synthèse et export d'une promo

Dans le tableau de suivi, au-dessus de la promo affichée :

- **Rapport** : le serveur rassemble toutes les fiches de la promo, calcule les moyennes par semaine et le taux d'engagements tenus, puis Mistral (`mistral-large`, repli `mistral-small`) rédige la synthèse au format JSON. Le rapport est enregistré dans `questionnaireRapports` et relisible sans relancer l'IA (10 derniers par promo). Copier, imprimer / PDF, supprimer. Limite : 2 par minute, 20 par jour et par conseiller.
- **Exporter les fiches** : `.md` (consigne de synthèse + chiffres + toutes les réponses, à coller dans l'IA de son choix) ou `.csv` (une ligne par réponse, pour un tableur).

Code : `lib/questionnaires/rapport.js` (collecte, chiffres, prompt, export), `app/api/conseiller/questionnaires/rapport/route.js`, `app/api/conseiller/questionnaires/export/route.js`. Le prompt est la constante `SYSTEM` de `rapport.js`.

À savoir : les rapports contiennent des extraits de réponses sous les codes. Ils ne sont pas effacés par la purge d'un dossier : les supprimer à la main en fin de promo.
