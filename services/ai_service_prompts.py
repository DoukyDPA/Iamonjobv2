# services/ai_service_mistral.py - Service IA avec vraie API Mistral
import os
import requests
import json
import logging
from typing import Optional

# Importer les nouveaux services
# (aucun import global de execute_ai_service ou AI_PROMPTS)
# Si besoin, fais l'import local dans la fonction concernée.

def call_mistral_api(prompt: str, context: Optional[str] = None, service_id: str = None) -> str:
    """
    Appelle l'API Mistral pour obtenir une réponse IA avec tracking des tokens
    
    Args:
        prompt: Question/demande à l'IA
        context: Contexte optionnel (contenu CV, offre, etc.)
    
    Returns:
        str: Réponse de Mistral IA
    """
    try:
        mistral_api_key = os.environ.get("MISTRAL_API_KEY")
        
        if not mistral_api_key:
            raise Exception("MISTRAL_API_KEY non configurée")
        
        # Construction du prompt complet
        full_prompt = _build_prompt(prompt, context)
        
        # Configuration de l'appel API
        url = "https://api.mistral.ai/v1/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {mistral_api_key}"
        }
        
        payload = {
            "model": "mistral-small-latest",  # Modèle rapide et efficace
            "messages": [
                {
                    "role": "system",
                    "content": "Tu es un expert en ressources humaines et coaching emploi. Tu aides les candidats à optimiser leur recherche d'emploi avec des conseils précis et actionnables. Réponds toujours en français avec un ton professionnel mais bienveillant."
                },
                {
                    "role": "user", 
                    "content": full_prompt
                }
            ],
            "max_tokens": 1000,
            "temperature": 0.7,
            "top_p": 1,
            "stream": False
        }
        
        print(f"🤖 Appel Mistral API...")
        
        # === TRACKING DES TOKENS ===
        # Estimer les tokens d'entrée (prompt + contexte)
        estimated_input_tokens = len(full_prompt.split()) * 1.3  # Estimation approximative
        
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        
        if response.status_code == 200:
            response_data = response.json()
            ai_response = response_data['choices'][0]['message']['content']
            
            # === CALCUL DES TOKENS CONSOMMÉS ===
            usage = response_data.get('usage', {})
            input_tokens = usage.get('prompt_tokens', estimated_input_tokens)
            output_tokens = usage.get('completion_tokens', 0)
            total_tokens = usage.get('total_tokens', input_tokens + output_tokens)
            
            print(f"✅ Réponse Mistral reçue: {len(ai_response)} caractères")
            print(f"🔢 Tokens consommés: {total_tokens} (entrée: {input_tokens}, sortie: {output_tokens})")
            
            # === ENREGISTREMENT DES TOKENS ===
            try:
                # Récupérer l'email de l'utilisateur depuis le contexte Flask
                from flask import request
                if hasattr(request, 'current_user') and request.current_user:
                    user_email = request.current_user.email
                    
                    # Importer et utiliser le token tracker
                    from services.token_tracker import record_tokens
                    
                    # Enregistrer la consommation de tokens
                    service_name = "mistral_api_call"
                    if "cv" in prompt.lower():
                        service_name = "cv_analysis"
                    elif "compatibilite" in prompt.lower() or "matching" in prompt.lower():
                        service_name = "compatibility_check"
                    elif "lettre" in prompt.lower():
                        service_name = "letter_generation"
                    elif "entretien" in prompt.lower():
                        service_name = "interview_prep"
                    
                    success = record_tokens(user_email, int(total_tokens), service_name)
                    if success:
                        print(f"✅ Tokens enregistrés pour {user_email}: {total_tokens} tokens")
                    else:
                        print(f"⚠️ Échec enregistrement tokens pour {user_email}")
                        
            except Exception as token_error:
                print(f"⚠️ Erreur tracking tokens: {token_error}")
                # Ne pas faire échouer l'appel principal pour une erreur de tracking
            
            return ai_response
        else:
            print(f"❌ Erreur API Mistral: {response.status_code}")
            print(f"📋 Réponse complète: {response.text}")
            raise Exception(f"Erreur API Mistral {response.status_code}: {response.text}")
            
    except Exception as e:
        print(f"❌ Erreur appel Mistral: {e}")
        print(f"🔍 Type d'erreur: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        raise e

def _build_prompt(prompt: str, context: Optional[str] = None) -> str:
    """Construit le prompt complet avec contexte"""
    
    if context:
        return f"""CONTEXTE:
{context}

DEMANDE:
{prompt}

Analyse le contexte fourni et réponds de manière détaillée et structurée."""
    else:
        return prompt

def _fallback_response(prompt: str, service_id: str = None) -> str:
    """Réponse de fallback si l'API Mistral n'est pas disponible"""
    
    prompt_lower = prompt.lower()
    
    # Priorité 0 : Services identifiés par leur ID (plus spécifique)
    if service_id:
        service_id_lower = service_id.lower()
        
        # Services de lettre de motivation
        if "cover_letter" in service_id_lower or "letter" in service_id_lower:
            return """✉️ **Génération de lettre de motivation** (Service temporairement indisponible)

La génération de lettre de motivation nécessite une configuration API.

💡 **Pour obtenir une lettre complète :**
- Contactez l'administrateur pour configurer l'API Mistral
- Vos documents ont été enregistrés et seront utilisés dès que le service sera disponible

*Fonctionnalité temporairement désactivée.*"""
        
        # Services ATS
        elif "ats" in service_id_lower:
            return """🎯 **Optimisation ATS** (Service temporairement indisponible)

L'optimisation ATS de votre CV nécessite une configuration API.

💡 **Pour obtenir une optimisation complète :**
- Contactez l'administrateur pour configurer l'API Mistral
- Votre CV a été enregistré et sera optimisé dès que le service sera disponible

*Fonctionnalité temporairement désactivée.*"""
    
    # Priorité 1 : Services de compatibilité/matching (plus spécifique)
    if ("compatibilit" in prompt_lower or "matching" in prompt_lower or 
        ("offre" in prompt_lower and "emploi" in prompt_lower)):
        return """🎯 **Analyse de compatibilité** (Service temporairement indisponible)

L'analyse de compatibilité nécessite une configuration API.

💡 **Pour obtenir une analyse complète :**
- Contactez l'administrateur pour configurer l'API Mistral
- Vos documents ont été enregistrés et seront analysés dès que le service sera disponible

*Fonctionnalité temporairement désactivée.*"""

    # Priorité 2 : Services de lettre de motivation (AVANT CV générique)
    elif ("lettre" in prompt_lower or "motivation" in prompt_lower) or "cover_letter" in prompt_lower:
        return """✉️ **Génération de lettre de motivation** (Service temporairement indisponible)

La génération de lettre de motivation nécessite une configuration API.

💡 **Pour obtenir une lettre complète :**
- Contactez l'administrateur pour configurer l'API Mistral
- Vos documents ont été enregistrés et seront utilisés dès que le service sera disponible

*Fonctionnalité temporairement désactivée.*"""

    # Priorité 3 : Services d'entretien
    elif ("entretien" in prompt_lower or "interview" in prompt_lower):
        return """🎤 **Préparation à l'entretien** (Service temporairement indisponible)

La préparation à l'entretien nécessite une configuration API.

💡 **Pour obtenir une préparation complète :**
- Contactez l'administrateur pour configurer l'API Mistral
- Vos documents ont été enregistrés et seront utilisés dès que le service sera disponible

*Fonctionnalité temporairement désactivée.*"""

    # Priorité 4 : Services de CV (moins spécifique)
    elif "cv" in prompt_lower or "curriculum" in prompt_lower:
        return """📄 **Analyse de CV** (Service temporairement indisponible)

L'analyse de votre CV nécessite une configuration API.

💡 **Pour obtenir une analyse complète :**
- Contactez l'administrateur pour configurer l'API Mistral
- Votre CV a été enregistré et sera analysé dès que le service sera disponible

*Fonctionnalité temporairement désactivée.*"""

    else:
        return f"""🤖 **Assistant IA emploi** (Service temporairement indisponible)

L'intelligence artificielle nécessite une configuration API.

💡 **Services disponibles une fois configuré :**
- 📄 Analyse de CV personnalisée
- 🎯 Compatibilité avec les offres d'emploi
- ✉️ Rédaction de lettres de motivation
- 🎤 Préparation aux entretiens

*Contactez l'administrateur pour activer l'API Mistral.*"""

# === FONCTIONS SPÉCIALISÉES ===

def analyze_cv_with_ai(cv_content: str) -> str:
    """Analyse un CV avec l'IA Mistral"""
    
    prompt = """ANALYSE APPROFONDIE DE CV

Analyse ce CV de manière professionnelle et détaillée. Fournis :

1. **SYNTHÈSE** (3-4 lignes de résumé du profil)

2. **POINTS FORTS** (5 éléments maximum)
   - Forces principales identifiées
   - Atouts compétitifs

3. **AXES D'AMÉLIORATION** (5 éléments maximum)  
   - Points faibles à corriger
   - Manques identifiés

4. **RECOMMANDATIONS CONCRÈTES**
   - Actions précises à mener
   - Optimisations suggérées

5. **NOTE GLOBALE** /10 avec justification

Utilise un ton professionnel et bienveillant. Sois précis et actionnable."""

    return call_mistral_api(prompt, cv_content)



def generate_cover_letter_enhanced(cv_content: str, job_content: str, questionnaire_content: str = "", user_notes: str = "") -> str:
    """Génère une lettre de motivation personnalisée avec CV + Questionnaire + Offre"""
    
    # Construction du contexte enrichi
    context_parts = [f"=== CV DU CANDIDAT ===\n{cv_content}"]
    
    # Ajouter le questionnaire s'il est disponible
    if questionnaire_content:
        context_parts.append(f"=== PROFIL PERSONNEL ET ASPIRATIONS ===\n{questionnaire_content}")
    
    context_parts.append(f"=== OFFRE D'EMPLOI ===\n{job_content}")
    
    if user_notes:
        context_parts.append(f"=== NOTES PERSONNELLES ===\n{user_notes}")
    
    context = "\n\n".join(context_parts)
    
    # Prompt adapté selon la disponibilité du questionnaire
    questionnaire_instruction = ""
    if questionnaire_content:
        questionnaire_instruction = """
IMPORTANT : Utilise OBLIGATOIREMENT les informations du profil personnel pour :
- Personnaliser la motivation et les valeurs
- Adapter le discours aux aspirations du candidat  
- Créer une cohérence entre le profil personnel et la candidature
- Montrer l'alignement entre les objectifs personnels et le poste"""
    else:
        questionnaire_instruction = """
NOTE : Seuls le CV et l'offre sont disponibles. Base-toi uniquement sur ces éléments."""
    
    prompt = f"""GÉNÉRATION DE LETTRE DE MOTIVATION PERSONNALISÉE

À partir des éléments fournis, rédige une lettre de motivation structurée, authentique et persuasive.

{questionnaire_instruction}

STRUCTURE DEMANDÉE :

**[EN-TÊTE]**
[Vos coordonnées]
[Coordonnées entreprise]
[Date]

**OBJET :** Candidature pour le poste de [Titre exact du poste]

**[INTRODUCTION - Accroche personnalisée]**
- Référence précise à l'offre
- Motivation authentique pour ce poste PRÉCIS
- {f"Lien avec vos aspirations personnelles" if questionnaire_content else "Accroche basée sur le CV"}

**[DÉVELOPPEMENT - Paragraphe 1 : VOS ATOUTS]**
- Compétences clés en lien direct avec les exigences
- Expériences pertinentes avec résultats concrets
- {f"Qualités personnelles en phase avec vos valeurs" if questionnaire_content else "Soft skills déduites du CV"}

**[DÉVELOPPEMENT - Paragraphe 2 : VOTRE PROJET]**
- Ce que vous apportez concrètement à l'entreprise
- {f"Cohérence avec vos objectifs de carrière" if questionnaire_content else "Projection professionnelle basée sur le CV"}
- Valeur ajoutée spécifique pour ce poste

**[CONCLUSION]**
- Disponibilité et motivation pour un entretien
- Formule de politesse professionnelle

CONSIGNES DE RÉDACTION :
✅ Personnalisez selon l'entreprise et ses valeurs
✅ Utilisez les mots-clés exacts de l'offre d'emploi
✅ Ton professionnel mais authentique et enthousiaste
✅ Longueur : 1 page maximum (300-400 mots)
✅ {f"Intégrez naturellement les éléments du profil personnel" if questionnaire_content else "Restez factuel basé sur le CV"}
✅ Évitez les clichés et formules toutes faites
✅ Montrez votre connaissance de l'entreprise

Fournis la lettre complète, prête à envoyer et parfaitement adaptée au candidat."""

    return call_mistral_api(prompt, context)

# Fonction de fallback pour compatibilité avec l'existant
def generate_cover_letter(cv_content: str, job_content: str, user_notes: str = "") -> str:
    """Version de compatibilité - utilise la version enhanced"""
    return generate_cover_letter_enhanced(cv_content, job_content, "", user_notes)

def prepare_interview(cv_content: str, job_content: str) -> str:
    """Prépare un candidat à l'entretien d'embauche"""
    
    prompt = """PRÉPARATION À L'ENTRETIEN D'EMBAUCHE

À partir du CV et de l'offre fournis, prépare le candidat à l'entretien.

FOURNIS :

1. **QUESTIONS PROBABLES** (10 questions types)
   - Questions sur le parcours
   - Questions techniques
   - Questions comportementales

2. **RÉPONSES SUGGÉRÉES**
   - Structure STAR pour les exemples
   - Points clés à mentionner
   - Exemples concrets du CV

3. **QUESTIONS À POSER**
   - Sur le poste et les missions
   - Sur l'équipe et l'entreprise
   - Sur l'évolution

4. **CONSEILS PRATIQUES**
   - Préparation matérielle
   - Attitude et communication
   - Gestion du stress

Format clair et actionnable pour une préparation efficace."""

    context = f"CV:\n{cv_content}\n\nOFFRE:\n{job_content}"
    return call_mistral_api(prompt, context)

# === FONCTION PRINCIPALE POUR APP.PY ===

def chat_avec_ia(message: str, context: Optional[str] = None) -> str:
    """
    Fonction principale d'interaction avec l'IA
    Compatible avec l'interface existante
    """
    return call_mistral_api(message, context)

def chat_avec_ia_action_rapide_optimized(action: str) -> str:
    """Exécute une action rapide avec Mistral IA"""
    return call_mistral_api(f"Action rapide: {action}")
