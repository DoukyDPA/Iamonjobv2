# FICHIER : services/ai_service_prompts.py
# AJOUTER CES PROMPTS MANQUANTS au dictionnaire AI_PROMPTS

AI_PROMPTS = {
    # === SERVICES LETTRE DE MOTIVATION ===
    "cover_letter_advice": {
        "title": "CONSEILS PERSONNALISÉS POUR LETTRE DE MOTIVATION",
        "prompt": """Tu es un expert en candidatures et lettres de motivation.

Analyse le CV et l'offre d'emploi fournis, puis donne des conseils personnalisés pour rédiger une excellente lettre de motivation.

{questionnaire_instruction}

## ANALYSE DE VOTRE PROFIL
- Points forts de votre CV à mettre en avant
- Compétences clés qui correspondent à l'offre
- Expériences les plus pertinentes pour ce poste

## STRUCTURE RECOMMANDÉE
1. **Accroche personnalisée** : Comment commencer de manière impactante
2. **Correspondance CV/Offre** : Points clés à mettre en avant  
3. **Valeur ajoutée** : Ce que vous apportez uniquement
4. **Conclusion efficace** : Appel à l'action professionnel

## CONSEILS SPÉCIFIQUES
- Mots-clés de l'offre à utiliser
- Erreurs à éviter pour votre profil
- Angles d'approche recommandés
- Ton et style appropriés

## ÉLÉMENTS À PERSONNALISER
- Exemples concrets de vos réalisations à mentionner
- Liens entre votre parcours et l'offre
- Valeurs de l'entreprise à intégrer

Personnalise selon {questionnaire_context}. Sois concret et actionnable."""
    },

    "cover_letter_generate": {
        "title": "GÉNÉRATION LETTRE DE MOTIVATION COMPLÈTE",
        "prompt": """Rédige une lettre de motivation professionnelle et personnalisée en analysant le CV et l'offre d'emploi fournis.

{questionnaire_instruction}

## STRUCTURE OBLIGATOIRE :

**[EN-TÊTE]**
- Coordonnées du candidat (utiliser les infos du CV)
- Coordonnées de l'entreprise (utiliser les infos de l'offre)
- Date et lieu

**[OBJET]** : Candidature pour le poste de [titre exact du poste]

**[MADAME, MONSIEUR]** ou nom du contact si mentionné

**[CORPS DE LA LETTRE]**

**§1 - ACCROCHE PERSONNALISÉE**
- Mentionner le poste et comment vous l'avez découvert
- Phrase d'accroche qui suscite l'intérêt
- Lien avec l'entreprise si possible

**§2 - CORRESPONDANCE PROFIL/POSTE**
- Analyser les exigences principales du poste
- Mettre en avant vos compétences et expériences pertinentes du CV
- Utiliser des exemples concrets et chiffrés de vos réalisations

**§3 - VALEUR AJOUTÉE ET MOTIVATION**
- Ce que vous apportez de unique à l'entreprise
- Votre connaissance de l'entreprise et de ses enjeux
- Vos motivations spécifiques pour ce poste

**§4 - CONCLUSION ET APPEL À L'ACTION**
- Demande d'entretien de manière naturelle
- Disponibilité
- Formule de politesse appropriée

**[SIGNATURE]**
- Cordialement / Bien cordialement
- Nom complet

## CONSIGNES IMPORTANTES :
✅ Utilise un ton professionnel mais authentique
✅ Adapte le vocabulaire au secteur d'activité
✅ Reste dans 3/4 de page maximum
✅ Évite les formulations banales
✅ Quantifie les réalisations quand possible
✅ Utilise les mots-clés de l'offre
✅ Personnalise selon {questionnaire_context}

Rédige la lettre complète prête à être envoyée."""
    },

    "interview_prep": {
        "title": "PRÉPARATION COMPLÈTE À L'ENTRETIEN D'EMBAUCHE",
        "prompt": """Prépare le candidat de manière exhaustive à son entretien d'embauche en analysant son CV et l'offre d'emploi.

{questionnaire_instruction}

## 1. ANALYSE DU CONTEXTE
- Présentation de l'entreprise et de ses enjeux
- Analyse du poste et de ses spécificités
- Profil idéal recherché

## 2. PRÉPARATION DE LA PRÉSENTATION
**"Présentez-vous en 2 minutes"**
- Parcours synthétique personnalisé
- Mise en avant des expériences pertinentes
- Lien avec le poste visé

## 3. QUESTIONS PROBABLES ET RÉPONSES
**Questions sur le parcours :**
- Pourquoi ce poste vous intéresse-t-il ?
- Quelle est votre plus grande réussite professionnelle ?
- Parlez-moi de votre expérience chez [entreprise précédente]

**Questions techniques :**
- Compétences spécifiques au poste
- Cas pratiques potentiels
- Gestion de situations difficiles

**Questions sur l'entreprise :**
- Que savez-vous de notre entreprise ?
- Pourquoi voulez-vous nous rejoindre ?
- Où vous voyez-vous dans 5 ans ?

## 4. VOS QUESTIONS À POSER
- Sur l'équipe et l'organisation
- Sur les défis du poste
- Sur l'évolution professionnelle

## 5. CONSEILS PRATIQUES
- Tenue vestimentaire appropriée
- Langage corporel et attitude
- Gestion du stress
- Éléments à apporter (CV, portfolio, etc.)

## 6. PRÉPARATION SPÉCIFIQUE
- Anecdotes professionnelles à avoir en tête
- Exemples chiffrés de réalisations
- Points faibles à transformer en forces

Personnalise selon {questionnaire_context}. Sois très concret et actionnable."""
    },

    "professional_pitch": {
        "title": "PITCH PROFESSIONNEL PERSONNALISÉ",
        "prompt": """Crée un pitch professionnel percutant en analysant le CV et le contexte professionnel.

{questionnaire_instruction}

## PITCH COURT (30 secondes)
Version concise pour networking ou introduction rapide
- Nom et fonction actuelle
- Expertise principale
- Valeur ajoutée en une phrase

## PITCH MOYEN (1 minute)
Version développée pour entretien ou présentation
- Présentation personnelle
- Parcours clé avec 2-3 expériences marquantes
- Compétences et expertise
- Objectif professionnel

## PITCH LONG (2 minutes)
Version complète pour présentation détaillée
- Parcours détaillé et cohérent
- Réalisations significatives avec chiffres
- Compétences techniques et humaines
- Vision et objectifs futurs

## CONSEILS D'ADAPTATION
- Comment adapter selon l'interlocuteur
- Ajustements selon le contexte (entretien, réseau, etc.)
- Éléments à personnaliser selon la situation

## TECHNIQUES DE PRÉSENTATION
- Storytelling et structure narrative
- Langage corporel et gestuelle
- Intonation et rythme
- Gestion du trac

## EXEMPLES CONCRETS
- Phrases d'accroche percutantes
- Transitions fluides entre les parties
- Conclusions mémorables

Personnalise selon {questionnaire_context}. Crée un pitch authentique qui reflète la personnalité du candidat."""
    },

    "presentation_slides": {
        "title": "PRÉSENTATION POWERPOINT STRUCTURÉE",
        "prompt": """Crée une présentation PowerPoint professionnelle pour présenter le profil du candidat.

{questionnaire_instruction}

## SLIDE 1 - PAGE DE TITRE
- Nom et prénom
- Poste/fonction actuelle ou visée
- Phrase d'accroche professionnelle
- Date et contexte de la présentation

## SLIDE 2 - PROFIL PROFESSIONNEL
- Résumé du parcours en 3-4 points
- Années d'expérience
- Secteurs d'activité
- Expertise principale

## SLIDE 3 - EXPÉRIENCES CLÉS
- 3-4 expériences les plus significatives
- Entreprises et dates
- Responsabilités principales
- Réalisations chiffrées

## SLIDE 4 - COMPÉTENCES
**Compétences techniques :**
- Technologies, logiciels, méthodes
- Certifications

**Compétences humaines :**
- Leadership, communication, etc.
- Langues parlées

## SLIDE 5 - RÉALISATIONS
- Projets marquants avec résultats
- Chiffres et impacts mesurables
- Reconnaissances obtenues

## SLIDE 6 - FORMATION
- Diplômes principaux
- Formations continues
- Certifications récentes

## SLIDE 7 - OBJECTIFS
- Projet professionnel
- Motivations
- Valeurs professionnelles

## SLIDE 8 - CONTACT
- Coordonnées complètes
- LinkedIn et réseaux professionnels
- Disponibilité

## CONSEILS VISUELS
- Palette de couleurs professionnelle
- Polices lisibles et cohérentes
- Graphiques et icônes suggestifs
- Photos professionnelles si pertinentes

Personnalise selon {questionnaire_context}. Fournis le contenu détaillé de chaque slide."""
    },

    "reconversion_analysis": {
        "title": "ANALYSE DE RECONVERSION PROFESSIONNELLE",
        "prompt": """Tu es un expert en reconversion professionnelle. Tu dois analyser le MÉTIER VISÉ (décrit dans le questionnaire) et créer un plan de transition depuis le CV actuel vers ce nouveau métier.

{questionnaire_instruction}

## MISSION PRINCIPALE
Analyser le MÉTIER VISÉ (objectif de reconversion) décrit dans le questionnaire et créer un plan concret pour y arriver depuis le profil actuel.

## ANALYSE DU MÉTIER VISÉ (OBJECTIF DE RECONVERSION)
- Compétences requises pour ce métier
- Profil type recherché par les recruteurs  
- Tendances du marché dans ce secteur
- Niveau de difficulté de la reconversion

## ANALYSE DE LA TRANSITION (CV ACTUEL vs MÉTIER VISÉ)
- Compétences transférables depuis le CV actuel
- Expériences valorisables dans le nouveau secteur
- Compétences manquantes à développer
- Gap de compétences à combler

## PLAN D'ACTION STRUCTURÉ

**Phase 1 - Préparation (3-6 mois)**
- Formations nécessaires
- Compétences à développer
- Réseau professionnel à construire
- Certifications à obtenir

**Phase 2 - Transition (6-12 mois)**
- Stratégies de recherche d'emploi
- Types de postes accessibles
- Entreprises ciblées
- Accompagnement recommandé

**Phase 3 - Consolidation (12-24 mois)**
- Évolution professionnelle
- Perfectionnement continu
- Développement de l'expertise

## RESSOURCES ET OUTILS
- Organismes de formation
- Plateformes d'apprentissage
- Réseaux professionnels
- Aides financières disponibles

## STRATÉGIES DE COMMUNICATION
- Comment présenter la reconversion
- Valorisation du parcours atypique
- Argumentaires pour convaincre

## RISQUES ET MITIGATION
- Obstacles potentiels
- Stratégies de contournement
- Plans B en cas de difficultés

## TIMELINE RÉALISTE
- Étapes avec délais
- Jalons et objectifs intermédiaires
- Indicateurs de réussite

Personnalise selon {questionnaire_context}. Sois très concret et actionnable."""
    },

    "career_transition": {
        "title": "VERS QUEL MÉTIER ALLER ?",
        "prompt": """Tu es conseiller emploi, spécialiste du recrutement et des reconversions professionnelles, avec une grande créativité. Tu es capable de produire des idées surprenantes et pertinentes en matière de reconversion.

Analyse le CV et le questionnaire fournis pour identifier les compétences techniques (hard skills) et humaines (soft skills).

## CLASSIFICATION DES COMPÉTENCES
Regroupe-les par catégories logiques pour faciliter l’association avec des métiers.

## MÉTIERS PROCHES
Propose 4 métiers similaires prenant mieux en compte les envies exprimées.

## MÉTIERS EN CONTINUITÉ LOGIQUE
Suggère 4 métiers cohérents avec le parcours et indique les compétences transférables.

## MÉTIERS ÉLOIGNÉS MAIS RÉALISTES
Propose 4 métiers très différents envisageables grâce aux compétences et aux soft skills.

## TABLEAU COMPARATIF
Dresse un tableau en format Markdown avec exactement cette structure :

| Métier | Compétences mobilisables | Compétences à acquérir |
|--------|-------------------------|----------------------|
| Nom du métier | Compétences existantes utilisables | Formation/compétences à développer |

**IMPORTANT :** Utilise exactement ce format de tableau Markdown avec les | pour les séparateurs. Chaque ligne doit commencer et finir par |.

Personnalise selon {questionnaire_context}."""
    },

    "industry_orientation": {
        "title": "ET POURQUOI PAS UN MÉTIER DANS L'INDUSTRIE ?",
        "prompt": """Tu es un conseiller en orientation professionnelle expert, spécialisé dans la reconversion vers les métiers industriels.

## MISSION
Analyser le profil du candidat pour proposer des orientations métiers concrètes et adaptées dans le secteur industriel.

## STRUCTURE DE L'ANALYSE
### 1. DIAGNOSTIC DU PROFIL (synthétique)
- **Formation** : niveau et domaine principal
- **Expérience** : nombre d'années et secteurs
- **Compétences clés** : 3-5 compétences techniques principales
- **Soft skills** : 3 qualités humaines majeures
- **Centres d'intérêt** : éléments pertinents pour l'industrie

### 2. SECTEURS INDUSTRIELS RECOMMANDÉS
Identifier 2-3 secteurs porteurs adaptés au profil :
- Nom du secteur
- Justification en 1 ligne
- Taux de recrutement actuel

### 3. MÉTIERS INDUSTRIELS PROPOSÉS
Proposer **3 MÉTIERS** précis et réalistes proches des compétences du candidats et **3 MÉTIERS** un peu plus éloignés mais accessibles. Tu ne proposeras que des métiers de salariés d'entreprises de l'industrie (en évitant par exemple les proposition de consultants ou d'indépendant travaillant pour l'industrie)

**Format tableau obligatoire :**
Utilise exactement ce format Markdown avec des liens cliquables :

| Métiers proches | Secteur | Atouts du profil | Compétences à valoriser | Formation suggérée | Perspectives |
|-----------------|---------|------------------|------------------------|-------------------|--------------|
| [Responsable RH Industrie](https://www.lindustrie-recrute.fr/?s=Responsable+RH+Industrie) | Industrie manufacturière | Gestion des équipes, connaissance du secteur | Management, droit social | Formation continue | Évolution vers DRH |
| [Technicien maintenance](https://www.lindustrie-recrute.fr/?s=Technicien+maintenance) | Industrie lourde | Compétences techniques, rigueur | Mécanique, électricité | Certifications | Chef d'équipe |

| Métiers un peu plus éloignés mais accessibles | Secteur | Atouts du profil | Compétences à valoriser | Formation suggérée | Perspectives |
|-----------------------------------------------|---------|------------------|------------------------|-------------------|--------------|
| [Ingénieur production](https://www.lindustrie-recrute.fr/?s=Ingénieur+production) | Industrie pharmaceutique | Analyse, optimisation | Process, qualité | Master spécialisé | Directeur technique |
| [Chef de projet industriel](https://www.lindustrie-recrute.fr/?s=Chef+projet+industriel) | BTP industriel | Coordination, planning | Gestion de projet | Certification PMP | Directeur projet |

**IMPORTANT :** 
- Chaque ligne doit commencer et finir par |
- Chaque intitulé de poste DOIT être un lien Markdown au format [Nom du métier](URL)
- L'URL doit être : https://www.lindustrie-recrute.fr/?s=Nom+du+métier (site de recrutement de l'UIMM avec recherche automatique)
- Fournis uniquement ce tableau (sans bloc de code) avant le message de conclusion

### 4. MESSAGE DE CONCLUSION
**🏭 CONSEIL CARRIÈRE INDUSTRIE**  
*L'industrie française recrute activement et offre des parcours évolutifs valorisants. Vos compétences actuelles sont transférables : identifiez les entreprises locales qui recrutent, participez aux journées portes ouvertes et contactez directement les responsables RH du secteur qui vous intéresse. La formation continue est encouragée et souvent financée par l'entreprise.*

---
## RÈGLES D'EXÉCUTION
- Longueur totale : 400-500 mots maximum
- Ton : professionnel, encourageant et concret
- Éviter le jargon technique complexe
- Proposer des métiers RÉELLEMENT accessibles selon le profil
- Prioriser les secteurs en tension qui recrutent"""
    },

    "follow_up_email": {
        "title": "EMAILS DE RELANCE PROFESSIONNELS",
        "prompt": """Crée 3 types d'emails de relance professionnels post-candidature adaptés au profil et au poste.

{questionnaire_instruction}

## EMAIL 1 : PREMIÈRE RELANCE (7-10 jours après candidature)

**Objet :** Suivi de ma candidature - [Poste] - [Nom candidat]

**Contenu :**
- Rappel courtois de la candidature envoyée
- Référence précise (poste, date d'envoi)
- Réaffirmation de l'intérêt
- Éventuel complément d'information
- Demande polie de retour sur le processus
- Formule de politesse

## EMAIL 2 : RELANCE APRÈS ENTRETIEN (3-5 jours)

**Objet :** Merci pour l'entretien - [Poste] - [Date entretien]

**Contenu :**
- Remerciements sincères
- Rappel d'un point marquant de l'échange
- Précision ou complément si nécessaire
- Réaffirmation de l'intérêt et de la motivation
- Disponibilité pour informations complémentaires
- Formule de politesse

## EMAIL 3 : RELANCE LONGUE DURÉE (3-4 semaines)

**Objet :** Candidature [Poste] - Maintien de mon intérêt

**Contenu :**
- Référence à l'échange précédent
- Compréhension des délais du processus
- Maintien de l'intérêt pour le poste
- Mise en avant d'un point fort spécifique
- Proposition d'échange téléphonique
- Ton plus direct mais respectueux

## VARIANTES SELON CONTEXTE

**Si aucune réponse :**
- Approche plus personnalisée
- Rappel de la valeur ajoutée
- Dernière tentative avant abandon

**Si accusé de réception automatique :**
- Recherche du bon interlocuteur
- Personnalisation maximale
- Démonstration de motivation

**Si délai annoncé dépassé :**
- Compréhension des contraintes
- Maintien de l'intérêt
- Actualisation de la disponibilité

## CONSEILS GÉNÉRAUX
- Ton professionnel mais chaleureux
- Personnalisation selon l'entreprise
- Concision (150 mots maximum)
- Call-to-action clair
- Respecter les délais annoncés
- Maximum 2 relances

Personnalise selon {questionnaire_context} et le niveau du poste visé."""
    },

    "salary_negotiation": {
        "title": "PRÉPARATION À LA NÉGOCIATION SALARIALE",
        "prompt": """Prépare une stratégie complète de négociation salariale basée sur le profil et le marché.

{questionnaire_instruction}

## ANALYSE DE VOTRE VALEUR

**Compétences valorisables :**
- Expertise technique spécifique
- Compétences rares ou recherchées
- Polyvalence et adaptabilité
- Expérience dans le secteur

**Réalisations quantifiables :**
- Chiffres d'affaires générés
- Économies réalisées
- Projets menés avec succès
- Équipes managées

## ÉTUDE DE MARCHÉ SALARIALE

**Recherche des fourchettes :**
- Salaires moyens pour le poste
- Variations selon la taille d'entreprise
- Différences géographiques
- Évolution sur 2-3 ans

**Critères d'évaluation :**
- Années d'expérience
- Niveau d'études
- Certifications
- Responsabilités

## STRATÉGIES DE NÉGOCIATION

**Préparation de l'argumentation :**
- Valeur ajoutée unique
- Résultats mesurables
- Potentiel de contribution
- Comparaison avec le marché

**Techniques de négociation :**
- Moment opportun pour négocier
- Présentation des arguments
- Gestion des objections
- Alternatives au salaire de base

## ÉLÉMENTS NÉGOCIABLES

**Rémunération directe :**
- Salaire de base
- Primes et bonus
- Intéressement
- Avantages en nature

**Avantages indirects :**
- Télétravail
- Formations
- Congés supplémentaires
- Évolution de carrière

## SCRIPTS DE NÉGOCIATION

**Ouverture de négociation :**
- Phrase d'accroche
- Présentation des arguments
- Demande précise

**Réponses aux objections :**
- Budget serré
- Politique salariale
- Période d'essai

**Techniques de closing :**
- Récapitulation des points
- Proposition de compromis
- Confirmation des accords

## CONSEILS PRATIQUES
- Timing optimal pour négocier
- Langage corporel et attitude
- Gestion du stress
- Préparation aux contre-propositions

## ERREURS À ÉVITER
- Négocier trop tôt
- Être trop gourmand
- Menacer de partir
- Négliger les avantages

Personnalise selon {questionnaire_context} et le niveau du poste. Sois très concret avec des exemples de phrases."""
    },

    "matching_cv_offre": {
        "title": "ANALYSE DE MATCHING CV/OFFRE PROFESSIONNELLE",
        "prompt": """Tu es un expert RH senior. Analyse la compatibilité entre ce profil candidat et cette offre d'emploi.

Évalue précisément l'adéquation sur 6 domaines et fournis une analyse professionnelle complète.

{questionnaire_instruction}

STRUCTURE OBLIGATOIRE DE TA RÉPONSE :

**SCORE_GLOBAL: [note sur 100]**
**SCORE_TECHNIQUE: [note sur 100]**
**SCORE_SOFT: [note sur 100]**
**SCORE_EXPERIENCE: [note sur 100]**
**SCORE_FORMATION: [note sur 100]**
**SCORE_CULTURE: [note sur 100]**

## 📊 ANALYSE DÉTAILLÉE

### ✅ Points forts
[Analyse les vraies forces du candidat pour ce poste]

### ⚠️ Points d'attention  
[Identifie les vraies faiblesses ou manques]

### 🎯 Écarts à combler
[Détermine ce qui doit être amélioré]

## 💡 RECOMMANDATIONS

### Pour la candidature
[Conseils concrets pour optimiser la candidature]

### Pour l'entretien
[Stratégies spécifiques pour l'entretien]

## 🏆 VERDICT FINAL
[Ton évaluation globale et prédiction de réussite]

TERMINE OBLIGATOIREMENT PAR CE JSON :
```json
{{"compatibilityScore": [score], "technical": [score], "soft": [score], "experience": [score], "education": [score], "culture": [score]}}
```
{questionnaire_context}"""
    },
    "cv_ats_optimization": {
        "title": "OPTIMISATION CV POUR ATS",
        "prompt": """Tu es un expert en recrutement spécialisé dans l’optimisation de CV pour les systèmes ATS.
Analyse mon CV et l'offre d'emploi jointe pour :

1. Identifier les mots-clés essentiels de l'offre (compétences techniques, qualifications, responsabilités, terminologie sectorielle).
2. Évaluer la compatibilité ATS de mon CV (structure, placement des mots-clés, format lisible par machine).
3. Proposer des améliorations concrètes : reformulations adaptées, structure compatible et liste des mots-clés manquants à intégrer."""
    },


    "analyze_cv": {
        "title": "ANALYSE EXPERTE DE CV PAR COACH EMPLOI",
        "prompt": """Tu es Coach emploi senior, expert en ressources humaines et en recrutement.\n\nTu maîtrises l’analyse stratégique de CV, la rédaction optimisée de candidatures, la compréhension fine des attentes des recruteurs et la capacité à donner des conseils concrets et personnalisés pour améliorer un profil.\n\nMon contexte est le suivant : je souhaite te soumettre un CV afin que tu l’évalues et me proposes des pistes d’amélioration pertinentes, comme le ferait un coach emploi expérimenté. Je veux maximiser mes chances d’être sélectionné pour un poste. Le CV n’est pas encore optimisé, et j’ai besoin de savoir comment le rendre plus percutant et professionnel.\n\nTu vas analyser ce CV.\n\nPour ça, voici les étapes à suivre :\n\nLire et comprendre le CV dans son ensemble.\n\nDonner une note globale sur 10 de la qualité du CV, en expliquant ta note.\n\nIdentifier les points forts du CV.\n\nIdentifier les points faibles du CV.\n\nFournir une liste de recommandations concrètes, organisées par priorité.\n\nDonner des exemples si possible (formulations, structuration, sections à ajouter ou à améliorer).\n\nVoici les caractéristiques du résultat attendu :\n\nUn ton professionnel, bienveillant et direct.\n\nDes conseils personnalisés (pas génériques).\n\nDes améliorations concrètes, faciles à mettre en œuvre.\n\nUne mise en lumière des forces du candidat tout en pointant les axes d'amélioration.\n\nUne approche de coach emploi, qui connaît les attentes réelles des recruteurs.\n"""
    }
}  # <-- Fermeture correcte du dictionnaire

# FONCTION MANQUANTE pour compatibilité
def generate_cover_letter_advice(cv_content, job_content, questionnaire_content=""):
    """Fonction de compatibilité pour les anciens appels"""
    return execute_ai_service(
        service_id="cover_letter_advice",
        cv_content=cv_content,
        job_content=job_content,
        questionnaire_content=questionnaire_content
    )

def generate_interview_prep(cv_content, job_content, questionnaire_content="", user_notes=""):
    """Fonction de compatibilité pour les anciens appels"""
    return execute_ai_service(
        service_id="interview_prep",
        cv_content=cv_content,
        job_content=job_content,
        questionnaire_content=questionnaire_content,
        user_notes=user_notes
    )

def generate_professional_pitch(cv_content, job_content="", questionnaire_content="", user_notes=""):
    """Fonction de compatibilité pour les anciens appels"""
    return execute_ai_service(
        service_id="professional_pitch",
        cv_content=cv_content,
        job_content=job_content,
        questionnaire_content=questionnaire_content,
        user_notes=user_notes
    )

def execute_ai_service(service_id, cv_content, job_content="", questionnaire_content="", user_notes=""):
    """Fonction générique pour exécuter un service IA selon l'identifiant"""
    try:
        from services.ai_service_mistral import call_mistral_api
        
        # Récupérer le prompt depuis le dictionnaire centralisé
        if service_id in AI_PROMPTS:
            service_config = AI_PROMPTS[service_id]
            prompt_template = service_config["prompt"]
            
            # Remplacer les variables de contexte dans le prompt
            prompt = prompt_template.replace("{cv_content}", cv_content or "CV non disponible")
            prompt = prompt.replace("{job_content}", job_content or "Offre d'emploi non disponible")
            prompt = prompt.replace("{questionnaire_content}", questionnaire_content or "Questionnaire non disponible")
            prompt = prompt.replace("{user_notes}", user_notes or "")
            
            # Remplacer les placeholders dans le prompt
            prompt = prompt.replace("{questionnaire_instruction}", 
                "Analysez le profil personnel fourni pour personnaliser l'analyse." if questionnaire_content else 
                "Analysez le CV et l'offre d'emploi fournis.")
            
            prompt = prompt.replace("{questionnaire_context}", 
                f"\n\nCONTEXTE PERSONNEL:\n{questionnaire_content}" if questionnaire_content else "")
            
            # Appeler l'API avec le prompt personnalisé (sans contexte séparé)
            return call_mistral_api(prompt)
        else:
            # Fallback pour les services non configurés
            prompt = f"SERVICE: {service_id}\nCV:\n{cv_content}\n\nOFFRE:\n{job_content}\n\nQUESTIONNAIRE:\n{questionnaire_content}\n\nNOTES:\n{user_notes}"
            return call_mistral_api(prompt)
            
    except ImportError:
        return f"Service IA temporairement indisponible pour {service_id}"
    except Exception as e:
        return f"Erreur lors de l'exécution du service {service_id}: {str(e)}"

def generate_generic_service(service_id, cv_content, job_content="", questionnaire_content="", user_notes=""):
    """Fonction générique pour tous les services"""
    return execute_ai_service(
        service_id=service_id,
        cv_content=cv_content,
        job_content=job_content,
        questionnaire_content=questionnaire_content,
        user_notes=user_notes
    )


# === Fonctions utilitaires pour l'administration des prompts ===
def get_all_prompts():
    """Retourne la configuration complète des prompts."""
    return AI_PROMPTS


def get_prompt(service_id):
    """Retourne le prompt d'un service donné."""
    return AI_PROMPTS.get(service_id)

def reload_prompts_from_file():
    """Recharge les prompts depuis le fichier JSON"""
    try:
        import json
        import os
        
        prompts_file = os.path.join(os.path.dirname(__file__), 'ai_service_prompts.json')
        
        if os.path.exists(prompts_file):
            with open(prompts_file, 'r', encoding='utf-8') as f:
                saved_prompts = json.load(f)
                # Mettre à jour AI_PROMPTS avec les prompts sauvegardés
                for service_id, prompt_data in saved_prompts.items():
                    if service_id in AI_PROMPTS:
                        AI_PROMPTS[service_id].update(prompt_data)
                    else:
                        AI_PROMPTS[service_id] = prompt_data
                
                print(f"✅ Prompts rechargés depuis le fichier: {len(saved_prompts)} services")
                print(f"📁 Fichier source: {prompts_file}")
                return True
        else:
            print("⚠️ Fichier de prompts non trouvé, utilisation des prompts par défaut")
            return False
            
    except Exception as e:
        print(f"❌ Erreur lors du rechargement des prompts: {e}")
        return False


def update_prompt(service_id, new_prompt):
    """Met à jour le contenu du prompt pour un service."""
    try:
        import json
        import os
        
        # Chemin vers le fichier des prompts
        prompts_file = os.path.join(os.path.dirname(__file__), 'ai_service_prompts.json')
        
        # Charger les prompts existants depuis le fichier
        if os.path.exists(prompts_file):
            with open(prompts_file, 'r', encoding='utf-8') as f:
                saved_prompts = json.load(f)
        else:
            saved_prompts = {}
        
        # Mettre à jour le prompt
        if service_id in AI_PROMPTS:
            # Mettre à jour en mémoire
            AI_PROMPTS[service_id]["prompt"] = new_prompt
            
            # Mettre à jour dans le fichier
            saved_prompts[service_id] = AI_PROMPTS[service_id]
            
            # Sauvegarder la configuration mise à jour
            with open(prompts_file, 'w', encoding='utf-8') as f:
                json.dump(saved_prompts, f, ensure_ascii=False, indent=2)
            
            print(f"✅ Prompt mis à jour et sauvegardé pour {service_id}")
            print(f"📁 Sauvegardé dans: {prompts_file}")
            return True
        else:
            print(f"❌ Service {service_id} non trouvé dans AI_PROMPTS")
            return False
            
    except Exception as e:
        print(f"❌ Erreur lors de la mise à jour du prompt: {e}")
        return False

print("✅ Prompts manquants ajoutés à AI_PROMPTS")
print("✅ Fonctions de compatibilité créées")

# Charger les prompts depuis le fichier au démarrage
print("🔄 Chargement des prompts depuis le fichier...")
reload_prompts_from_file()
