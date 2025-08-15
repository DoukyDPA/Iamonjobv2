# routes/static.py
"""
Routes pour les fichiers statiques et SPA
"""

from flask import Blueprint, request, jsonify, send_from_directory, send_file
import os

static_bp = Blueprint('static', __name__)

# Configuration des chemins
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_BUILD_DIR = os.path.join(BASE_DIR, 'frontend', 'build')

@static_bp.route('/static/<path:filename>')
def serve_static_fixed(filename):
    """Servir les fichiers statiques React avec correction Railway"""
    static_dir = os.path.join(FRONTEND_BUILD_DIR, 'static')
    
    try:
        # Vérifier si le fichier existe
        file_path = os.path.join(static_dir, filename)
        
        if os.path.exists(file_path):
            # Déterminer le type MIME
            if filename.endswith('.css'):
                mimetype = 'text/css'
            elif filename.endswith('.js'):
                mimetype = 'application/javascript'
            elif filename.endswith('.map'):
                mimetype = 'application/json'
            else:
                mimetype = None
            
            return send_from_directory(static_dir, filename, mimetype=mimetype)
        else:
            from flask import current_app
            current_app.logger.error(f"Fichier statique manquant: {file_path}")
            return '', 404
            
    except Exception as e:
        from flask import current_app
        current_app.logger.error(f"Erreur fichiers statiques: {e}")
        return '', 404

@static_bp.route('/manifest.json')
def serve_manifest():
    """Servir manifest.json depuis build root"""
    manifest_path = os.path.join(FRONTEND_BUILD_DIR, 'manifest.json')
    if os.path.exists(manifest_path):
        return send_file(manifest_path, mimetype='application/json')
    return '', 404

@static_bp.route('/logo_iamonjob.png')
def serve_logo():
    """Servir le logo depuis build root"""
    logo_path = os.path.join(FRONTEND_BUILD_DIR, 'logo_iamonjob.png')
    if os.path.exists(logo_path):
        return send_file(logo_path, mimetype='image/png')
    return '', 404

@static_bp.before_request
def fix_static_js():
    """Fix pour servir les fichiers JavaScript avec les bons headers"""
    
    # Intercepter les requêtes vers les fichiers JS problématiques
    if request.path.endswith('.js') and '/static/js/' in request.path:
        js_filename = os.path.basename(request.path)
        js_file = os.path.join(FRONTEND_BUILD_DIR, 'static', 'js', js_filename)
        
        if os.path.exists(js_file):
            try:
                with open(js_file, 'rb') as f:
                    content = f.read()
                
                from flask import Response
                response = Response(
                    content,
                    content_type='application/javascript; charset=utf-8'
                )
                response.headers['Cache-Control'] = 'public, max-age=31536000'
                response.headers['X-Content-Type-Options'] = 'nosniff'
                
                return response
            except Exception as e:
                print(f"❌ Erreur serving JS {js_filename}: {e}")
    
    # Intercepter manifest.json si nécessaire
    if request.path == '/manifest.json':
        manifest_file = os.path.join(FRONTEND_BUILD_DIR, 'manifest.json')
        if os.path.exists(manifest_file):
            try:
                with open(manifest_file, 'rb') as f:
                    content = f.read()
                
                from flask import Response
                response = Response(
                    content,
                    content_type='application/json; charset=utf-8'
                )
                return response
            except Exception as e:
                print(f"❌ Erreur serving manifest.json: {e}")
    
    # Continuer le traitement normal pour toutes les autres requêtes
    return None

@static_bp.route('/static/<path:filename>')
def serve_static(filename):
    """Servir les fichiers statiques React (CSS, JS, images)"""
    static_dir = os.path.join(FRONTEND_BUILD_DIR, 'static')
    try:
        return send_from_directory(static_dir, filename)
    except FileNotFoundError:
        # Si le fichier n'existe pas, renvoyer 404 au lieu de HTML
        return '', 404

def is_asset_file(filename):
    """Détermine si un fichier est un asset statique"""
    if '.' not in filename:
        return False
    
    extension = filename.split('.')[-1].lower()
    asset_extensions = {
        'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'webp',  # Images
        'json', 'xml', 'txt', 'pdf',                        # Documents
        'css', 'js', 'map',                                 # Code
        'woff', 'woff2', 'ttf', 'eot',                     # Fonts
        'mp3', 'wav', 'mp4', 'webm'                        # Media
    }
    
    return extension in asset_extensions

@static_bp.route('/<path:filename>')
def serve_assets_and_spa(filename):
    """
    Servir les assets publics ET gérer le SPA routing
    Résout le problème du logo et autres assets
    """
    # Exclure complètement les routes API
    if filename.startswith('api/'):
        # Abort pour laisser Flask gérer les routes API
        from flask import abort
        abort(404)
    
    # Si c'est un fichier asset, le servir depuis le build
    if is_asset_file(filename):
        try:
            return send_from_directory(FRONTEND_BUILD_DIR, filename)
        except:
            return '', 404
    
    # Sinon, servir React (SPA routing)
    return serve_react_app()

@static_bp.route('/')
def serve_react_root():
    """Servir React pour la route racine"""
    return serve_react_app()

@static_bp.route('/admin-interface')
def serve_admin_interface():
    """Route pour servir l'interface d'administration"""
    try:
        # Essayer d'abord le fichier corrigé
        html_file = os.path.join(BASE_DIR, 'admin_interface_fix.html')
        
        if not os.path.exists(html_file):
            # Fallback vers le fichier simple
            html_file = os.path.join(BASE_DIR, 'simple_admin_interface.html')
        
        if os.path.exists(html_file):
            with open(html_file, 'r', encoding='utf-8') as f:
                html_content = f.read()
            
            return html_content, 200, {'Content-Type': 'text/html'}
        else:
            return jsonify({
                "error": "Interface admin non trouvée"
            }), 404
            
    except Exception as e:
        print(f"❌ Erreur lors du chargement de l'interface admin: {e}")
        return jsonify({
            "error": "Erreur serveur"
        }), 500

def serve_react_app():
    """Fonction utilitaire pour servir l'app React"""
    index_path = os.path.join(FRONTEND_BUILD_DIR, 'index.html')
    
    if os.path.exists(index_path):
        return send_file(index_path)
    else:
        # Fallback si le build n'existe pas encore
        import uuid
        INSTANCE_ID = str(uuid.uuid4())[:8]
        
        return f"""
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <title>IAMONJOB - Déploiement</title>
            <style>
                body {{ 
                    font-family: Arial, sans-serif; 
                    padding: 50px; 
                    text-align: center; 
                    background: #f8f9fa; 
                    color: #333;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    background: white;
                    padding: 2rem;
                    border-radius: 10px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                }}
                .status {{ color: #28a745; margin: 1rem 0; }}
                .links {{ margin-top: 2rem; }}
                .links a {{ 
                    display: inline-block; 
                    margin: 0 1rem; 
                    padding: 0.5rem 1rem; 
                    background: #0a6b79; 
                    color: white; 
                    text-decoration: none; 
                    border-radius: 5px; 
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🚀 IAMONJOB</h1>
                <p class="status">✅ Serveur Flask actif avec Gunicorn</p>
                <p>Le build React est en cours de génération...</p>
                <p><em>Actualisez la page dans quelques instants.</em></p>
                <div class="links">
                    <a href="/debug">🔍 Debug</a>
                    <a href="/health">💚 Health</a>
                </div>
                <p><small>Instance: {INSTANCE_ID}</small></p>
            </div>
        </body>
        </html>
        """, 200 
