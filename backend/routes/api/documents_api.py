from flask import Blueprint, jsonify, request
from services.supabase_storage import SupabaseStorage

documents_api = Blueprint('documents_api', __name__)

@documents_api.route('/', methods=['GET'])
def get_documents():
    """Récupérer les documents de l'utilisateur"""
    try:
        # Simuler la récupération de documents
        documents = {
            "cv": {"uploaded": True, "name": "CV_User.pdf", "url": "/uploads/cv.pdf"},
            "offre_emploi": {"uploaded": True, "name": "Offre_Emploi.pdf", "url": "/uploads/offre.pdf"}
        }
        
        return jsonify({
            "success": True,
            "documents": documents,
            "count": len(documents)
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
