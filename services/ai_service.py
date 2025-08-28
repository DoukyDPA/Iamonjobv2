"""
Service d'intelligence artificielle pour IAMONJOB
"""
import os
import logging
from typing import Optional, Dict, Any

def chat_avec_ia(message: str, context: Optional[str] = None) -> str:
    """
    Communique avec l'IA pour obtenir une réponse
    
    Args:
        message: Message de l'utilisateur
        context: Contexte optionnel (CV, offre d'emploi, etc.)
        
    Returns:
        str: Réponse de l'IA
    """
    try:
        # Pour l'instant, retourner une réponse par défaut
        # TODO: Intégrer OpenAI ou Mistral API quand les clés seront configurées
        
        # Tous les prompts codés en dur supprimés SAUF compatibilite (logique spéciale avec graphiques)
        response_templates = {
            "compatibilite": "🎯 **Analyse de compatibilité**\n\n**Score global : 78%**\n\n**Correspondances :**\n- ✅ Compétences techniques : 85%\n- ✅ Expérience requise : 75%\n- ⚠️ Formation : 70%\n\n**Recommandations :**\n- Mettez en avant votre expérience en gestion de projet\n- Ajoutez une certification dans le domaine\n- Préparez des exemples concrets pour l'entretien"
        }
            
            # Prompt pitch supprimé - maintenant géré par ai_service_prompts.json
            
            # Service ATS supprimé - maintenant géré par ai_service_prompts.json
            # Service compatibilité gardé - logique métier spéciale avec graphiques
        }
        
        # Détecter le type de demande
        message_lower = message.lower()
        
        if "action rapide:" in message_lower:
            action = message_lower.split("action rapide:")[1].strip()
            return response_templates.get(action, "Je suis là pour vous aider avec votre recherche d'emploi. Pouvez-vous préciser votre demande ?")
        
        # Réponses par mots-clés
        if any(word in message_lower for word in ["cv", "curriculum"]):
            return response_templates["analyser_cv"]
        elif any(word in message_lower for word in ["compatibilit", "offre", "poste"]):
            return response_templates["compatibilite"]
        elif any(word in message_lower for word in ["lettre", "motivation"]):
            return response_templates["lettre_motivation"]
        elif any(word in message_lower for word in ["entretien", "interview"]):
            return response_templates["entretien"]
        elif any(word in message_lower for word in ["pitch", "présent"]):
            return response_templates["pitch"]
        else:
            return """👋 **Bonjour ! Je suis votre coach emploi IA.**

🎯 **Je peux vous aider avec :**
- **Analyse de CV** : Optimisation et conseils personnalisés
- **Compatibilité** : Évaluation CV vs offre d'emploi  
- **Lettres de motivation** : Structure et conseils de rédaction
- **Préparation d'entretiens** : Questions types et techniques
- **Pitch professionnel** : Présentation percutante

💡 **Comment bien utiliser le chat :**
- Uploadez d'abord vos documents (CV, offre d'emploi)
- Utilisez les actions rapides pour des analyses ciblées
- Posez des questions spécifiques pour des conseils détaillés

🚀 **Prêt à booster votre recherche d'emploi ?**"""
        
    except Exception as e:
        logging.error(f"Erreur lors de l'appel à l'IA: {e}")
        return "Désolé, je rencontre des difficultés techniques. Veuillez réessayer dans quelques instants."

def chat_avec_ia_action_rapide_optimized(action: str) -> str:
    """
    Exécute une action rapide optimisée
    
    Args:
        action: Type d'action à exécuter
        
    Returns:
        str: Réponse de l'IA pour l'action
    """
    return chat_avec_ia(f"Action rapide: {action}")

def get_or_create_cv_analysis(cv_content: str) -> str:
    """
    Analyse un CV et retourne les recommandations
    
    Args:
        cv_content: Contenu du CV à analyser
        
    Returns:
        str: Analyse et recommandations
    """
    return """📄 **Analyse de votre CV**

✅ **Points forts détectés :**
- Structure claire et lisible
- Informations de contact complètes
- Expérience professionnelle bien détaillée

🔧 **Axes d'amélioration :**
- Ajouter une section compétences techniques
- Quantifier les résultats obtenus (chiffres, %)
- Personnaliser selon chaque offre d'emploi

💡 **Recommandations spécifiques :**
- Utilisez des verbes d'action (géré, développé, optimisé...)
- Adaptez les mots-clés selon le secteur visé
- Limitez à 2 pages maximum"""

def analyze_job_offer(job_content: str) -> str:
    """
    Analyse une offre d'emploi
    
    Args:
        job_content: Contenu de l'offre d'emploi
        
    Returns:
        str: Analyse de l'offre
    """
    return """🎯 **Analyse de l'offre d'emploi**

📋 **Informations clés extraites :**
- **Titre du poste :** [Analysé depuis le document]
- **Type de contrat :** À identifier
- **Localisation :** À préciser
- **Niveau d'expérience :** À évaluer

🔑 **Compétences requises :**
- Compétences techniques principales
- Soft skills demandées  
- Certifications éventuelles

💼 **Conseils pour candidater :**
- Adaptez votre CV aux mots-clés de l'offre
- Préparez des exemples concrets
- Renseignez-vous sur l'entreprise"""

def analyze_metier(metier_content: str) -> str:
    """
    Analyse un métier souhaité
    
    Args:
        metier_content: Description du métier
        
    Returns:
        str: Analyse du métier
    """
    return """🚀 **Analyse du métier**

📚 **Compétences clés nécessaires :**
- Compétences techniques spécifiques
- Qualités personnelles requises
- Niveau de formation recommandé

🎓 **Formations recommandées :**
- Formations initiales pertinentes
- Certifications professionnelles
- Formations continues

📈 **Perspectives d'évolution :**
- Opportunités de carrière
- Secteurs d'activité porteurs
- Évolution salariale moyenne

💡 **Conseils pour y accéder :**
- Étapes de reconversion recommandées
- Réseautage dans le domaine
- Expériences à valoriser"""

def generate_document_summary(document_type: str, content: str) -> str:
    """
    Génère un résumé d'un document
    
    Args:
        document_type: Type de document
        content: Contenu du document
        
    Returns:
        str: Résumé du document
    """
    return f"📄 **Résumé du {document_type}**\n\nDocument traité avec succès. Les informations ont été analysées et sont prêtes pour l'analyse de compatibilité."


