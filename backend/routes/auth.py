# FICHIER : backend/routes/auth.py
# Routes d'authentification

from flask import Blueprint, request, jsonify
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import secrets
import string
from datetime import datetime, timedelta
import os

auth_bp = Blueprint('auth', __name__)

# Configuration email (à adapter selon votre fournisseur)
SMTP_SERVER = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
SMTP_USERNAME = os.environ.get('SMTP_USERNAME', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
FROM_EMAIL = os.environ.get('FROM_EMAIL', 'noreply@iamonjob.com')

# Stockage temporaire des tokens de réinitialisation (en production, utiliser une base de données)
reset_tokens = {}

def generate_reset_token():
    """Génère un token de réinitialisation sécurisé"""
    return ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))

def send_reset_email(email, token):
    """Envoie un email de réinitialisation"""
    try:
        # Créer le message
        msg = MIMEMultipart()
        msg['From'] = FROM_EMAIL
        msg['To'] = email
        msg['Subject'] = "Réinitialisation de votre mot de passe - IAMONJOB"
        
        # URL de réinitialisation (à adapter selon votre domaine)
        reset_url = f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token={token}"
        
        # Corps de l'email
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #0a6b79;">IAMONJOB</h1>
                </div>
                
                <h2 style="color: #0a6b79;">Réinitialisation de votre mot de passe</h2>
                
                <p>Bonjour,</p>
                
                <p>Vous avez demandé la réinitialisation de votre mot de passe pour votre compte IAMONJOB.</p>
                
                <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_url}" 
                       style="background: linear-gradient(135deg, #0a6b79 0%, #22c55e 100%); 
                              color: white; 
                              padding: 15px 30px; 
                              text-decoration: none; 
                              border-radius: 8px; 
                              display: inline-block; 
                              font-weight: bold;">
                        Réinitialiser mon mot de passe
                    </a>
                </div>
                
                <p>Ou copiez-collez ce lien dans votre navigateur :</p>
                <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px;">
                    {reset_url}
                </p>
                
                <p><strong>Important :</strong></p>
                <ul>
                    <li>Ce lien est valide pendant 1 heure</li>
                    <li>Il ne peut être utilisé qu'une seule fois</li>
                    <li>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email</li>
                </ul>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                
                <p style="font-size: 12px; color: #666;">
                    Cet email a été envoyé automatiquement, merci de ne pas y répondre.<br>
                    © 2024 IAMONJOB - Votre assistant IA pour la recherche d'emploi
                </p>
            </div>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(body, 'html'))
        
        # Envoyer l'email
        if SMTP_USERNAME and SMTP_PASSWORD:
            server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            text = msg.as_string()
            server.sendmail(FROM_EMAIL, email, text)
            server.quit()
            return True
        else:
            # Mode développement - afficher l'URL dans les logs
            logging.info(f"🔗 Lien de réinitialisation pour {email}: {reset_url}")
            return True
            
    except Exception as e:
        logging.error(f"❌ Erreur envoi email réinitialisation: {e}")
        return False

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Endpoint pour demander la réinitialisation de mot de passe"""
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        
        if not email:
            return jsonify({'message': 'Email requis'}), 400
        
        if not email or '@' not in email:
            return jsonify({'message': 'Email invalide'}), 400
        
        # Générer un token de réinitialisation
        token = generate_reset_token()
        
        # Stocker le token avec expiration (1 heure)
        reset_tokens[token] = {
            'email': email,
            'expires': datetime.now() + timedelta(hours=1),
            'used': False
        }
        
        # Envoyer l'email
        if send_reset_email(email, token):
            logging.info(f"✅ Email de réinitialisation envoyé à {email}")
            return jsonify({
                'message': 'Email de réinitialisation envoyé',
                'success': True
            })
        else:
            return jsonify({
                'message': 'Erreur lors de l\'envoi de l\'email',
                'success': False
            }), 500
            
    except Exception as e:
        logging.error(f"❌ Erreur forgot-password: {e}")
        return jsonify({
            'message': 'Erreur interne du serveur',
            'success': False
        }), 500

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Endpoint pour réinitialiser le mot de passe avec un token"""
    try:
        data = request.get_json()
        token = data.get('token', '').strip()
        new_password = data.get('password', '').strip()
        
        if not token or not new_password:
            return jsonify({'message': 'Token et nouveau mot de passe requis'}), 400
        
        if len(new_password) < 6:
            return jsonify({'message': 'Le mot de passe doit contenir au moins 6 caractères'}), 400
        
        # Vérifier le token
        if token not in reset_tokens:
            return jsonify({'message': 'Token invalide ou expiré'}), 400
        
        token_data = reset_tokens[token]
        
        # Vérifier l'expiration
        if datetime.now() > token_data['expires']:
            del reset_tokens[token]
            return jsonify({'message': 'Token expiré'}), 400
        
        # Vérifier si déjà utilisé
        if token_data['used']:
            return jsonify({'message': 'Token déjà utilisé'}), 400
        
        # Marquer le token comme utilisé
        token_data['used'] = True
        
        # Ici, vous devriez mettre à jour le mot de passe dans votre base de données
        # Pour l'instant, on simule le succès
        logging.info(f"✅ Mot de passe réinitialisé pour {token_data['email']}")
        
        # Nettoyer le token
        del reset_tokens[token]
        
        return jsonify({
            'message': 'Mot de passe réinitialisé avec succès',
            'success': True
        })
        
    except Exception as e:
        logging.error(f"❌ Erreur reset-password: {e}")
        return jsonify({
            'message': 'Erreur interne du serveur',
            'success': False
        }), 500

@auth_bp.route('/verify-reset-token', methods=['POST'])
def verify_reset_token():
    """Endpoint pour vérifier la validité d'un token de réinitialisation"""
    try:
        data = request.get_json()
        token = data.get('token', '').strip()
        
        if not token:
            return jsonify({'message': 'Token requis'}), 400
        
        if token not in reset_tokens:
            return jsonify({'message': 'Token invalide'}), 400
        
        token_data = reset_tokens[token]
        
        # Vérifier l'expiration
        if datetime.now() > token_data['expires']:
            del reset_tokens[token]
            return jsonify({'message': 'Token expiré'}), 400
        
        # Vérifier si déjà utilisé
        if token_data['used']:
            return jsonify({'message': 'Token déjà utilisé'}), 400
        
        return jsonify({
            'message': 'Token valide',
            'success': True,
            'email': token_data['email']
        })
        
    except Exception as e:
        logging.error(f"❌ Erreur verify-reset-token: {e}")
        return jsonify({
            'message': 'Erreur interne du serveur',
            'success': False
        }), 500
