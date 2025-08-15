from flask import Blueprint, jsonify, request
from services.supabase_storage import SupabaseStorage

chat_api = Blueprint('chat_api', __name__)

@chat_api.route('/session', methods=['GET'])
def get_chat_session():
    """Récupérer la session de chat de l'utilisateur"""
    try:
        # Simuler une session de chat
        session = {
            "id": "session_123",
            "user_email": "user@example.com",
            "chat_history": [
                {"role": "system", "content": "Bonjour ! Comment puis-je vous aider ?"}
            ],
            "documents": {
                "cv": {"uploaded": True, "name": "CV_User.pdf"},
                "offre_emploi": {"uploaded": True, "name": "Offre_Emploi.pdf"}
            }
        }
        
        return jsonify({
            "success": True,
            "session": session
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
