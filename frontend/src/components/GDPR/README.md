# Interface GDPR - IAMONJOB

## Description

Interface utilisateur complète pour la gestion des droits RGPD dans l'application IAMONJOB. Cette interface permet aux utilisateurs de gérer leurs données personnelles conformément au Règlement Général sur la Protection des Données (RGPD).

## Composants

### 1. GDPRUserInterface.js
Interface principale avec 4 onglets :
- **Vue d'ensemble** : Statistiques et résumé des données utilisateur
- **Consentement** : Gestion des préférences de confidentialité
- **Mes droits** : Actions RGPD (export, suppression de compte)
- **Informations** : Détails légaux et contacts

### 2. GDPRUserInterface.css
Styles modernes et responsives avec :
- Design en dégradé et animations
- Interface mobile-friendly
- Notifications toast
- Modales de confirmation

### 3. GDPRPage.js
Page wrapper pour intégrer l'interface dans l'application

### 4. GDPRTestComponent.js
Composant de test pour vérifier le fonctionnement de l'API

## Fonctionnalités

### Pour l'utilisateur
- ✅ **Vue d'ensemble** : Consulter ses données et statistiques
- ✅ **Gestion du consentement** : Activer/désactiver marketing et analytics
- ✅ **Export des données** : Télécharger toutes ses données (droit de portabilité)
- ✅ **Suppression de compte** : Demander la suppression définitive (droit à l'oubli)
- ✅ **Annulation de suppression** : Annuler une demande de suppression
- ✅ **Informations légales** : Contacts DPO, base légale, etc.

### Pour l'administrateur
- ✅ **Gestion des suppressions** : Voir les comptes en attente de suppression
- ✅ **Exécution des suppressions** : Supprimer définitivement un compte
- ✅ **Purge automatique** : Nettoyer les anciennes données
- ✅ **Statistiques RGPD** : Tableaux de bord de conformité

## API Endpoints

### Utilisateur
- `GET /api/gdpr/status` - Statut de l'API
- `GET /api/gdpr/data-summary` - Résumé des données utilisateur
- `POST /api/gdpr/consent` - Mettre à jour le consentement
- `GET /api/gdpr/export` - Exporter les données
- `POST /api/gdpr/delete-account` - Demander la suppression
- `POST /api/gdpr/cancel-deletion` - Annuler la suppression

### Administrateur
- `GET /api/admin/gdpr/pending-deletions` - Comptes en attente
- `DELETE /api/admin/gdpr/execute-deletion/<email>` - Exécuter suppression
- `POST /api/admin/gdpr/purge-old-data` - Purge automatique
- `GET /api/admin/gdpr/stats` - Statistiques RGPD

## Installation

1. Les composants sont déjà intégrés dans l'application
2. La route `/gdpr` est accessible via le menu d'administration
3. L'API backend est configurée et fonctionnelle

## Utilisation

### Accès utilisateur
1. Se connecter à l'application
2. Aller dans le menu "Administration" → "Mes données RGPD"
3. Ou accéder directement à `/gdpr`

### Test de l'API
1. Utiliser le composant `GDPRTestComponent` pour tester les endpoints
2. Vérifier les logs du serveur pour les erreurs
3. Tester avec différents utilisateurs (admin/normal)

## Conformité RGPD

### Droits respectés
- ✅ **Droit d'accès** : Consultation des données
- ✅ **Droit de rectification** : Modification des préférences
- ✅ **Droit à l'effacement** : Suppression du compte
- ✅ **Droit à la portabilité** : Export des données
- ✅ **Droit d'opposition** : Gestion du consentement

### Sécurité
- ✅ Authentification requise pour tous les endpoints
- ✅ Vérification des droits administrateur
- ✅ Confirmation explicite pour la suppression
- ✅ Délai de grâce de 30 jours
- ✅ Logs d'audit des actions

## Personnalisation

### Styles
Modifier `GDPRUserInterface.css` pour adapter le design :
- Couleurs et dégradés
- Animations et transitions
- Responsive design
- Thème sombre/clair

### Fonctionnalités
Ajouter de nouveaux endpoints dans `gdpr_api.py` et les intégrer dans l'interface.

## Support

Pour toute question ou problème :
- Vérifier les logs du serveur
- Tester avec `GDPRTestComponent`
- Consulter la documentation de l'API
- Contacter l'équipe de développement
