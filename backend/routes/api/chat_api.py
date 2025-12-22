from flask import Blueprint, jsonify, request, Response, stream_with_context
from services.supabase_storage import SupabaseStorage
from services.ai_service_mistral import chat_avec_ia, stream_mistral_api

chat_api = Blueprint('chat_api', __name__)

@chat_api.route('/session', methods=['GET'])
def get_chat_session():
    """Récupérer la session de chat de l'utilisateur (historique)"""
    try:
        storage = SupabaseStorage()
        session_data = storage.get_session_data()
        
        return jsonify({
            "success": True,
            "session": session_data
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@chat_api.route('/message', methods=['POST'])
def send_message():
    """
    Envoi de message classique (sans streaming)
    Garde la compatibilité avec l'ancien système si besoin.
    """
    try:
        data = request.json
        user_message = data.get('message', '')
        
        # 1. Sauvegarder le message utilisateur
        storage = SupabaseStorage()
        storage.add_message('user', user_message)
        
        # 2. Obtenir la réponse IA
        ai_response = chat_avec_ia(user_message)
        
        # 3. Sauvegarder la réponse IA
        storage.add_message('assistant', ai_response)
        
        return jsonify({
            "success": True,
            "response": ai_response
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@chat_api.route('/stream', methods=['POST'])
def stream_chat():
    """
    NOUVELLE ROUTE : Streaming de la réponse IA
    """
    try:
        data = request.json
        user_message = data.get('message', '')
        
        # 1. Sauvegarder le message utilisateur immédiatement
        storage = SupabaseStorage()
        storage.add_message('user', user_message)

        # 2. Fonction génératrice qui sauvegarde aussi la réponse à la fin
        def generate_and_save():
            full_response = ""
            # On stream la réponse de Mistral
            for chunk in stream_mistral_api(user_message):
                full_response += chunk
                yield chunk
            
            # Une fois fini, on sauvegarde la réponse complète en base
            if full_response:
                storage.add_message('assistant', full_response)

        # 3. Retourner le flux (Stream)
        return Response(
            stream_with_context(generate_and_save()),
            mimetype='text/event-stream'
        )
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
