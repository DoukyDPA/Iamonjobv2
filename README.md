# IAMONJOB - Plateforme d'Aide aux Demandeurs d'Emploi

## 📋 Description du Projet

IAMONJOB est une application web complète destinée à accompagner les demandeurs d'emploi dans leur recherche. Elle utilise l'intelligence artificielle (Mistral AI) pour fournir des services personnalisés d'analyse de CV, de génération de lettres de motivation, de préparation aux entretiens et de conseil en carrière.

## 🏗️ Architecture Technique

### Stack Technologique

- **Backend**: Flask 2.3.3 (Python)
- **Frontend**: React 18.2.0
- **Base de données**: Supabase (PostgreSQL)
- **IA**: Mistral AI API
- **Déploiement**: Railway
- **Gestion d'état**: Stateless avec Supabase Storage

### Architecture Globale

```
IAMONJOB/
├── app.py                     # Point d'entrée principal Flask
├── frontend/                  # Application React
│   ├── src/
│   │   ├── components/        # Composants React réutilisables
│   │   ├── pages/            # Pages de l'application
│   │   ├── services/         # Services API frontend
│   │   └── styles/           # Fichiers CSS
│   └── public/               # Assets statiques
├── backend/
│   ├── routes/               # Routes API Flask
│   │   ├── api/             # Blueprints API
│   │   └── generic_services.py  # Services génériques
│   └── admin/               # Interface d'administration
├── services/                 # Services backend
│   ├── ai_service.py        # Interface IA principale
│   ├── ai_service_mistral.py # Intégration Mistral AI
│   ├── ai_service_prompts.py # Prompts IA spécialisés
│   ├── supabase_storage.py  # Gestion stockage Supabase
│   └── stateless_manager.py # Gestion état stateless
├── config/                   # Configuration
│   ├── app_config.py        # Config application
│   ├── flask_config.py      # Config Flask
│   └── professional_config.py # Config production
└── uploads/                  # Stockage temporaire fichiers
```

## 🚀 Installation et Démarrage

### Prérequis

- Python 3.8+
- Node.js 16+
- Compte Supabase
- Clé API Mistral AI

### Configuration des Variables d'Environnement

Créer un fichier `.env` à la racine :

```bash
# Supabase
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=votre_cle_anonyme
SUPABASE_SERVICE_KEY=votre_cle_service

# Flask
FLASK_SECRET_KEY=votre_cle_secrete
FLASK_DEBUG=False

# IA
MISTRAL_API_KEY=votre_cle_mistral
USE_MISTRAL=True

# Admin (optionnel)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=mot_de_passe_securise
```

Ces variables sont chargées par le gestionnaire centralisé `config/config_manager.py`.
En production sur [Railway](https://railway.app), les clés Supabase sont
définies comme variables d'environnement dans le tableau de bord du
projet et ne sont jamais commit dans le dépôt.

### Installation Backend

```bash
# Installation des dépendances Python
pip install -r requirements.txt

# Démarrage du serveur Flask
python app.py

# Démarrage en production avec Gunicorn et sa configuration
gunicorn -c gunicorn.conf.py app:app
```

Le serveur backend démarre sur `http://localhost:8080`

### Installation Frontend

```bash
# Navigation vers le dossier frontend
cd frontend

# Installation des dépendances
npm install

# Démarrage en mode développement
npm start
```

L'application React démarre sur `http://localhost:3000`

### Build Production

```bash
# Build du frontend
cd frontend
npm run build

# Le build sera servi automatiquement par Flask
```

## 📚 Documentation des API

### Routes Principales

#### Services IA (`/api/services`)
- `POST /api/services/matching-cv-offre` - Analyse de compatibilité CV/Offre
- `POST /api/services/analyze-cv` - Analyse approfondie du CV
- `POST /api/services/cv-ats-optimization` - Optimisation CV pour ATS
- `POST /api/services/cover-letter-generate` - Génération lettre de motivation
- `POST /api/services/interview-prepare` - Préparation entretien
- `POST /api/services/professional-pitch` - Création pitch professionnel

#### Documents (`/api/documents`)
- `POST /api/documents/upload-cv` - Upload CV
- `POST /api/documents/upload-offre-emploi` - Upload offre d'emploi
- `POST /api/documents/upload-questionnaire` - Upload questionnaire
- `GET /api/documents/status` - Statut des documents
- `DELETE /api/documents/delete/{type}` - Suppression document

#### Chat (`/api/chat`)
- `POST /api/chat/session` - Session de chat IA
- `GET /api/chat/history` - Historique des conversations

#### Partenaires (`/api/partner-jobs`)
- `GET /api/partner-jobs/partners` - Liste des entreprises partenaires
- `POST /api/documents/upload-offre-partenaire` - Import offre partenaire

### Structure des Requêtes

Exemple d'appel API pour l'analyse de CV :

```javascript
const response = await fetch('/api/services/analyze-cv', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    service_id: 'analyze_cv',
    user_notes: 'Notes optionnelles'
  })
});
```

## 🎯 Fonctionnalités Principales

### 1. Gestion des Documents
- Upload et stockage sécurisé de CV, offres d'emploi et questionnaires
- Analyse automatique du contenu
- Persistance via Supabase

### 2. Services IA

#### Analyse de CV
- Évaluation détaillée des points forts/faibles
- Suggestions d'amélioration
- Optimisation pour ATS (Applicant Tracking Systems)

#### Compatibilité CV/Offre
- Score de correspondance détaillé
- Analyse des compétences manquantes
- Recommandations personnalisées

#### Génération de Contenu
- Lettres de motivation personnalisées
- Pitch professionnel
- Emails de relance

#### Préparation Entretien
- Questions probables avec réponses suggérées
- Technique STAR
- Conseils pratiques

### 3. Offres Partenaires
- Intégration d'offres d'emploi de partenaires
- Import direct comme offre utilisateur
- Analyse de compatibilité automatique

### 4. Interface d'Administration
- Accès sécurisé (`/admin`)
- Monitoring des services
- Gestion des utilisateurs

## 🔧 Configuration des Services IA

Les services IA sont configurés dans `backend/routes/generic_services.py` :

```python
SERVICES_CONFIG = {
    "service_id": {
        "title": "Titre du service",
        "prompt_key": "clé_prompt",
        "output_key": "clé_sortie",
        "requires_cv": True/False,
        "requires_job": True/False,
        "requires_questionnaire": True/False
    }
}
```

Les prompts sont définis dans `services/ai_service_prompts.py` et peuvent être personnalisés selon les besoins.

## 📊 Gestion de l'État

L'application utilise une architecture stateless avec Supabase pour la persistance :

1. **Session Utilisateur** : Stockée dans Supabase, identifiée par session_id
2. **Documents** : Sauvegardés dans la session Supabase
3. **Historique** : Chat et actions conservés dans Supabase

Le `StatelessDataManager` gère la synchronisation entre les workers :

```python
# Récupération des données
user_data = StatelessDataManager.get_user_data()

# Sauvegarde des données
StatelessDataManager.save_user_data(data)
```

## 🧪 Tests

### Tests de Production

```bash
python test_production_ready.py
```

Vérifie :
- Routes API
- Intégration Supabase
- Services IA
- Gestion des documents
- Authentication

### Tests Locaux

```bash
# Tests backend
python -m pytest tests/

# Tests frontend
cd frontend && npm test
```

## 🚢 Déploiement sur Railway

1. **Préparation**
   - Fork le repository sur GitHub
   - Créer un projet Supabase
   - Obtenir une clé API Mistral

2. **Configuration Railway**
   - Connecter le repository GitHub
   - Configurer les variables d'environnement
   - Railway détecte automatiquement le Procfile

3. **Déploiement**
   - Push sur la branche main déclenche le déploiement
   - Build automatique du frontend
   - Démarrage du serveur Gunicorn

## 🔒 Sécurité

- **Authentication** : Flask-Login avec sessions sécurisées
- **CORS** : Configuration stricte des origines autorisées
- **Secrets** : Variables d'environnement pour toutes les clés
- **Validation** : Vérification des inputs utilisateur
- **HTTPS** : Forcé en production via Railway

## 📝 Contribution

### Workflow de Développement

1. Créer une branche feature : `git checkout -b feature/nouvelle-fonctionnalite`
2. Développer et tester localement
3. Commit avec message descriptif : `git commit -m "feat: ajout nouvelle fonctionnalité"`
4. Push et créer une Pull Request

### Standards de Code

- **Python** : PEP 8
- **JavaScript** : ESLint configuration React
- **CSS** : BEM methodology
- **Commits** : Convention Conventional Commits

### Ajout de Nouveaux Services

1. Ajouter la configuration dans `SERVICES_CONFIG`
2. Créer le prompt dans `ai_service_prompts.py`
3. Ajouter la route API si nécessaire
4. Créer le composant React correspondant

## 🆘 Support et Debugging

### Logs
- Backend : Console Python avec niveaux INFO/WARNING/ERROR
- Frontend : Console navigateur
- Production : Logs Railway

### Problèmes Fréquents

**Erreur Supabase**
- Vérifier les clés API
- Vérifier la connexion réseau
- Consulter les logs Supabase

**Service IA ne répond pas**
- Vérifier la clé Mistral API
- Vérifier les limites de tokens
- Consulter les logs d'erreur

**Upload de fichier échoue**
- Vérifier la taille du fichier (< 10MB)
- Vérifier le format (PDF, DOCX, TXT)
- Vérifier les permissions du dossier uploads/

## 📄 Licence

Propriétaire - Tous droits réservés

## 👥 Équipe

Développé par le CBE Sud 94 avec l'intelligence artificielle.

---

*Documentation mise à jour : Janvier 2025*
