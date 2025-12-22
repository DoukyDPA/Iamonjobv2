from flask import Blueprint, jsonify, request, Response, stream_with_context
from services.supabase_storage import SupabaseStorage
from services.ai_service_mistral import chat_avec_ia, stream_mistral_api
from services.token_tracker import record_tokens # Assurez-vous d'avoir ce service ou créez-le
import logging

logger = logging.getLogger(__name__)
chat_api = Blueprint('chat_api', __name__)

# ... (gardez la route get_chat_session telle quelle)

@chat_api.route('/stream', methods=['POST'])
def stream_chat():
    """
    Streaming intelligent avec tracking de tokens
    """
    try:
        data = request.json
        user_message = data.get('message', '')
        # Récupération de l'email utilisateur (supposons qu'il est dans la request ou session)
        from flask import session
        user_email = session.get('user_email', 'anonymous') 

        storage = SupabaseStorage()
        
        # 1. Sauvegarde message utilisateur
        storage.add_message('user', user_message)

        def generate_and_track():
            full_response = ""
            
            # Stream des chunks
            for chunk in stream_mistral_api(user_message):
                full_response += chunk
                yield chunk
            
            # FIN DU STREAM : Tâches de fond
            if full_response:
                # A. Sauvegarde BDD
                storage.add_message('assistant', full_response)
                
                # B. Tracking Tokens (Estimation)
                # Mistral ne renvoie pas l'usage en mode stream pour l'instant
                # On estime : 1 token ≈ 4 caractères en moyenne (ou 0.75 mot)
                # C'est une approximation acceptable pour le monitoring
                try:
                    estimated_input = len(user_message) / 3.5
                    estimated_output = len(full_response) / 3.5
                    total_estimated = int(estimated_input + estimated_output)
                    
                    # Enregistrement
                    record_tokens(user_email, total_estimated, "chat_stream")
                    logger.info(f"💰 Tokens estimés (Stream): {total_estimated} pour {user_email}")
                except Exception as e:
                    logger.warning(f"⚠️ Erreur tracking tokens: {e}")

        return Response(
            stream_with_context(generate_and_track()),
            mimetype='text/event-stream'
        )
        
    except Exception as e:
        logger.error(f"❌ Erreur Stream: {e}")
        return jsonify({"error": str(e)}), 500
