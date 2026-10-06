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
