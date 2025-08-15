# routes/admin.py
"""
Routes pour l'administration
"""

from flask import Blueprint, request, jsonify, session
from datetime import datetime
import os
from services.stateless_manager import StatelessDataManager

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/api/chat/history', methods=['GET'])
def get_chat_history():
    """Récupère l'historique du chat de l'utilisateur"""
    try:
        user_data = StatelessDataManager.get_user_data()
        chat_history = user_data.get('chat_history', [])
        
        cleaned_history = []
        for message in chat_history:
            if isinstance(message, dict) and 'role' in message and 'content' in message:
                cleaned_message = {
                    'role': message['role'],
                    'content': message['content'],
                    'timestamp': message.get('timestamp', datetime.now().isoformat()),
                    'action_type': message.get('action_type', None),
                    'metadata': message.get('metadata', {})
                }
                cleaned_history.append(cleaned_message)
        
        return jsonify({
            "success": True,
            "history": cleaned_history
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "history": []
        }), 500

@admin_bp.route('/api/chat/clear', methods=['POST'])
def clear_chat_history():
    """Efface l'historique du chat (optionnel)"""
    try:
        # Utiliser la nouvelle fonction centralisée
        success = StatelessDataManager.clear_generic_actions_history()
        
        if success:
            return jsonify({
                "success": True,
                "message": "Historique des actions génériques effacé avec succès"
            })
        else:
            return jsonify({
                "success": False,
                "error": "Erreur lors de l'effacement de l'historique"
            }), 500

    except Exception as e:
        print(f"❌ Erreur effacement historique: {e}")
        return jsonify({
            "success": False,
            "error": f"Erreur lors de l'effacement: {str(e)}"
        }), 500

@admin_bp.route('/api/analyses', methods=['GET'])
def get_analyses():
    """Récupère toutes les analyses sauvegardées"""
    try:
        from services.stateless_manager import get_user_data
        
        user_data = get_user_data()
        
        analyses = {
            "cv_analysis": user_data.get('cv_analysis'),
            "cover_letter": user_data.get('cover_letter'),
            "interview_prep": user_data.get('interview_prep')
        }
        
        return jsonify({
            "success": True,
            "analyses": analyses
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Erreur: {str(e)}"}), 500 
