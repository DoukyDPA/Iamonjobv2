/* ===================================================================
   📱 IAMONJOB - CORRECTIONS RESPONSIVE MOBILE
   Corrections spécifiques pour améliorer l'expérience mobile
   ================================================================== */

/* ===== CORRECTIONS GÉNÉRALES MOBILE ===== */
@media (max-width: 768px) {
  /* Améliorer la lisibilité générale */
  body {
    font-size: 16px; /* Éviter le zoom automatique sur iOS */
    line-height: 1.5;
  }

  /* Conteneurs principaux */
  .container,
  .dashboard-content,
  .revolutionary-dashboard-content {
    padding: 0 16px !important;
    max-width: 100% !important;
  }

  /* Headers et titres */
  .dashboard-header h1,
  .revolutionary-hero-title {
    font-size: 2rem !important;
    line-height: 1.2 !important;
    margin-bottom: 1rem !important;
  }

  .section-title,
  .revolutionary-section-title {
    font-size: 1.5rem !important;
    line-height: 1.3 !important;
    margin-bottom: 1rem !important;
  }

  /* Espacement réduit */
  .dashboard,
  .revolutionary-dashboard {
    padding: 1rem 0 !important;
  }
}

/* ===== CORRECTIONS GRILLES DE SERVICES ===== */
@media (max-width: 768px) {
  /* Grille de services - 1 colonne sur mobile */
  .services-grid,
  .action-services-grid,
  .revolutionary-services-grid {
    grid-template-columns: 1fr !important;
    gap: 1rem !important;
    padding: 0 !important;
  }

  /* Cartes de services */
  .action-card,
  .service-card,
  .document-tile {
    padding: 1.5rem !important;
    min-height: auto !important;
    margin-bottom: 1rem;
  }

  /* Titres de services - éviter le débordement */
  .action-card-title,
  .service-title,
  .revolutionary-service-title {
    font-size: 1.1rem !important;
    line-height: 1.3 !important;
    word-wrap: break-word !important;
    overflow-wrap: break-word !important;
    hyphens: auto !important;
    margin-bottom: 0.75rem !important;
  }

  /* Descriptions de services */
  .action-description,
  .service-description,
  .revolutionary-service-description {
    font-size: 0.9rem !important;
    line-height: 1.4 !important;
    margin-bottom: 1rem !important;
  }

  /* Icônes de services */
  .action-icon,
  .service-icon,
  .revolutionary-service-icon {
    width: 50px !important;
    height: 50px !important;
    font-size: 1.5rem !important;
    margin-bottom: 1rem !important;
  }
}

/* ===== CORRECTIONS ONGLETS MOBILE ===== */
@media (max-width: 768px) {
  /* Onglets - scroll horizontal */
  .dashboard-tabs,
  .revolutionary-tabs {
    display: flex !important;
    overflow-x: auto !important;
    overflow-y: hidden !important;
    -webkit-overflow-scrolling: touch !important;
    scrollbar-width: none !important;
    -ms-overflow-style: none !important;
    padding: 0.5rem !important;
    gap: 0.5rem !important;
    flex-wrap: nowrap !important;
  }

  .dashboard-tabs::-webkit-scrollbar,
  .revolutionary-tabs::-webkit-scrollbar {
    display: none !important;
  }

  /* Boutons d'onglets */
  .tab-button,
  .revolutionary-tab-button {
    flex-shrink: 0 !important;
    padding: 0.75rem 1rem !important;
    font-size: 0.9rem !important;
    white-space: nowrap !important;
    min-width: auto !important;
  }

  /* Labels des onglets sur mobile */
  .revolutionary-tab-label {
    display: none !important;
  }

  .revolutionary-tab-label-mobile {
    display: block !important;
    font-size: 0.8rem !important;
    margin-top: 0.25rem !important;
  }
}

/* ===== CORRECTIONS CARTES DE DOCUMENTS ===== */
@media (max-width: 768px) {
  /* Grille de documents - 1 colonne */
  .document-types,
  .revolutionary-document-types {
    grid-template-columns: 1fr !important;
    gap: 1rem !important;
  }

  /* Cartes de documents */
  .document-type-card,
  .revolutionary-document-card {
    padding: 1.25rem !important;
    min-height: auto !important;
  }

  /* Headers de documents */
  .document-header,
  .revolutionary-document-header {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 0.75rem !important;
    margin-bottom: 1rem !important;
  }

  /* Icônes de documents */
  .document-icon,
  .revolutionary-document-icon {
    width: 40px !important;
    height: 40px !important;
    font-size: 1.25rem !important;
  }

  /* Titres de documents */
  .document-title,
  .revolutionary-document-info h4 {
    font-size: 1rem !important;
    line-height: 1.3 !important;
    margin-bottom: 0.25rem !important;
  }

  /* Sous-titres de documents */
  .document-subtitle,
  .revolutionary-document-info p {
    font-size: 0.8rem !important;
    line-height: 1.3 !important;
  }

  /* Actions de documents */
  .document-actions,
  .revolutionary-document-actions {
    margin-top: 1rem !important;
  }

  /* Boutons d'upload */
  .btn-upload,
  .revolutionary-btn-upload,
  .revolutionary-btn-text,
  .revolutionary-btn-questionnaire {
    width: 100% !important;
    padding: 0.75rem 1rem !important;
    font-size: 0.9rem !important;
    min-height: 44px !important; /* Taille tactile recommandée */
  }
}

/* ===== CORRECTIONS BADGES ET ÉTATS ===== */
@media (max-width: 768px) {
  /* Badges de prérequis */
  .requirements-badges {
    flex-direction: column !important;
    gap: 0.5rem !important;
  }

  .requirement-badge {
    align-self: flex-start !important;
    padding: 0.5rem 0.75rem !important;
    font-size: 0.8rem !important;
  }

  /* Badges de statut */
  .document-status-badge,
  .revolutionary-document-status {
    width: 32px !important;
    height: 32px !important;
    font-size: 0.9rem !important;
  }

  /* Badges de difficulté */
  .service-difficulty {
    font-size: 0.75rem !important;
    padding: 0.25rem 0.5rem !important;
  }
}

/* ===== CORRECTIONS MODALES MOBILE ===== */
@media (max-width: 768px) {
  .modal-overlay,
  .dashboard-modal-overlay {
    padding: 1rem !important;
  }

  .modal-content,
  .dashboard-modal-content {
    margin: 0 !important;
    max-height: calc(100vh - 2rem) !important;
    border-radius: 1rem !important;
  }

  .modal-header,
  .modal-body,
  .modal-footer,
  .dashboard-modal-header,
  .dashboard-modal-body,
  .dashboard-modal-actions {
    padding: 1rem !important;
  }

  .modal-footer,
  .dashboard-modal-actions {
    flex-direction: column !important;
    gap: 0.75rem !important;
  }

  .btn-navigation,
  .dashboard-modal-btn {
    width: 100% !important;
    padding: 0.75rem 1rem !important;
    min-height: 44px !important;
  }
}

/* ===== CORRECTIONS FORMULAIRES MOBILE ===== */
@media (max-width: 768px) {
  /* Inputs et textareas */
  .form-input,
  .form-textarea,
  .form-select,
  .text-input,
  .question-input,
  .dashboard-modal-textarea,
  .dashboard-modal-textarea-large {
    font-size: 16px !important; /* Éviter le zoom sur iOS */
    padding: 0.75rem !important;
    min-height: 44px !important;
  }

  .form-textarea,
  .text-input,
  .question-input,
  .dashboard-modal-textarea-large {
    min-height: 120px !important;
  }

  /* Groupes de formulaires */
  .form-group,
  .revolutionary-form-group {
    margin-bottom: 1.5rem !important;
  }

  /* Labels */
  .form-label,
  .revolutionary-form-label {
    font-size: 0.9rem !important;
    margin-bottom: 0.5rem !important;
  }

  /* Actions de formulaire */
  .text-actions,
  .form-actions {
    flex-direction: column !important;
    gap: 0.75rem !important;
  }

  .btn-text-save,
  .btn-text-cancel {
    width: 100% !important;
    padding: 0.75rem 1rem !important;
    min-height: 44px !important;
  }
}

/* ===== CORRECTIONS NAVIGATION MOBILE ===== */
@media (max-width: 768px) {
  /* Header */
  .header-content {
    padding: 0.75rem 1rem !important;
    min-height: 60px !important;
  }

  .logo-image {
    height: 35px !important;
  }

  .logo-text {
    font-size: 1.1rem !important;
  }

  /* Navigation mobile */
  .mobile-menu-button {
    padding: 0.5rem !important;
    min-width: 44px !important;
    min-height: 44px !important;
  }

  .mobile-menu-icon {
    width: 20px !important;
    height: 20px !important;
  }

  /* Menu utilisateur mobile */
  .nav-user-button {
    padding: 0.5rem 0.75rem !important;
    font-size: 0.8rem !important;
  }

  .user-avatar {
    width: 28px !important;
    height: 28px !important;
    font-size: 0.8rem !important;
  }
}

/* ===== CORRECTIONS FOOTER MOBILE ===== */
@media (max-width: 768px) {
  .footer-content {
    grid-template-columns: 1fr !important;
    gap: 2rem !important;
    padding: 0 1rem !important;
  }

  .footer-section h3 {
    font-size: 1.1rem !important;
    margin-bottom: 1rem !important;
  }

  .footer-section p,
  .footer-section a {
    font-size: 0.9rem !important;
    line-height: 1.5 !important;
  }
}

/* ===== CORRECTIONS SPÉCIFIQUES AUX MÉTIERS ===== */
@media (max-width: 768px) {
  /* Éviter le débordement des noms de métiers */
  .service-title,
  .action-card-title,
  .job-title,
  .partner-job-title {
    word-break: break-word !important;
    overflow-wrap: break-word !important;
    hyphens: auto !important;
    max-width: 100% !important;
  }

  /* Descriptions de métiers */
  .service-description,
  .action-description,
  .job-description,
  .partner-job-description {
    word-break: break-word !important;
    overflow-wrap: break-word !important;
    line-height: 1.4 !important;
  }

  /* Détails de jobs partenaires */
  .job-details,
  .partner-job-details {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 0.5rem !important;
  }

  .job-detail-item,
  .partner-job-detail-item {
    font-size: 0.8rem !important;
  }
}

/* ===== CORRECTIONS CHAT ET INTERFACES ===== */
@media (max-width: 768px) {
  .chat-container {
    margin: 1rem 0 !important;
    border-radius: 1rem !important;
  }

  .chat-header {
    padding: 1rem !important;
    font-size: 0.9rem !important;
  }

  .chat-messages {
    max-height: 300px !important;
    padding: 1rem !important;
  }

  .chat-input-container {
    padding: 1rem !important;
  }

  .chat-input {
    font-size: 16px !important; /* Éviter le zoom sur iOS */
    padding: 0.75rem !important;
    min-height: 44px !important;
  }
}

/* ===== CORRECTIONS BOUTONS ET ACTIONS ===== */
@media (max-width: 768px) {
  /* Boutons principaux */
  .btn,
  .btn-primary,
  .btn-secondary,
  .btn-success,
  .btn-outline {
    min-height: 44px !important;
    padding: 0.75rem 1rem !important;
    font-size: 0.9rem !important;
    border-radius: 0.5rem !important;
  }

  /* Boutons d'action */
  .action-button,
  .btn-action {
    width: 100% !important;
    padding: 0.75rem 1rem !important;
    font-size: 0.9rem !important;
    min-height: 44px !important;
  }

  /* Boutons de navigation */
  .btn-navigation {
    width: 100% !important;
    padding: 0.75rem 1rem !important;
    min-height: 44px !important;
  }
}

/* ===== CORRECTIONS PROGRESSION ET STATS ===== */
@media (max-width: 768px) {
  /* Barre de progression */
  .upload-progress-stats,
  .revolutionary-progress-panel {
    padding: 1.5rem !important;
    margin-bottom: 2rem !important;
  }

  .progress-header,
  .revolutionary-progress-header {
    flex-direction: column !important;
    gap: 1rem !important;
    text-align: center !important;
  }

  .progress-title,
  .revolutionary-progress-title {
    font-size: 1.2rem !important;
  }

  .progress-counter,
  .revolutionary-progress-badge {
    font-size: 0.9rem !important;
    padding: 0.5rem 1rem !important;
  }

  /* Grille de stats */
  .stats-grid {
    grid-template-columns: 1fr !important;
    gap: 1rem !important;
  }

  .stat-card {
    flex-direction: column !important;
    text-align: center !important;
    padding: 1.5rem !important;
    gap: 1rem !important;
  }

  .stat-icon {
    width: 60px !important;
    height: 60px !important;
    font-size: 1.5rem !important;
  }

  .stat-title {
    font-size: 1.1rem !important;
  }

  .stat-description {
    font-size: 0.9rem !important;
  }
}

/* ===== CORRECTIONS SPÉCIFIQUES TRÈS PETITS ÉCRANS ===== */
@media (max-width: 480px) {
  /* Conteneurs encore plus compacts */
  .container,
  .dashboard-content,
  .revolutionary-dashboard-content {
    padding: 0 12px !important;
  }

  /* Titres encore plus petits */
  .dashboard-header h1,
  .revolutionary-hero-title {
    font-size: 1.75rem !important;
  }

  .section-title,
  .revolutionary-section-title {
    font-size: 1.3rem !important;
  }

  /* Cartes encore plus compactes */
  .action-card,
  .service-card,
  .document-tile,
  .document-type-card,
  .revolutionary-document-card {
    padding: 1rem !important;
  }

  /* Boutons plus petits mais toujours tactiles */
  .btn,
  .btn-primary,
  .btn-secondary,
  .action-button,
  .btn-action {
    padding: 0.6rem 0.8rem !important;
    font-size: 0.85rem !important;
    min-height: 40px !important;
  }

  /* Onglets plus compacts */
  .tab-button,
  .revolutionary-tab-button {
    padding: 0.6rem 0.8rem !important;
    font-size: 0.8rem !important;
  }

  /* Icônes plus petites */
  .action-icon,
  .service-icon,
  .document-icon,
  .stat-icon {
    width: 40px !important;
    height: 40px !important;
    font-size: 1.25rem !important;
  }
}

/* ===== AMÉLIORATIONS D'ACCESSIBILITÉ MOBILE ===== */
@media (max-width: 768px) {
  /* Focus visible sur mobile */
  .btn:focus,
  .tab-button:focus,
  .action-button:focus,
  .form-input:focus,
  .form-textarea:focus {
    outline: 2px solid #0a6b79 !important;
    outline-offset: 2px !important;
  }

  /* Éviter les zones de clic trop petites */
  .mobile-menu-button,
  .nav-user-button,
  .modal-close,
  .dashboard-modal-close {
    min-width: 44px !important;
    min-height: 44px !important;
  }

  /* Améliorer la lisibilité des liens */
  a {
    text-decoration: underline !important;
  }

  /* Améliorer le contraste des textes */
  .text-light,
  .text-muted {
    color: #4b5563 !important;
  }
}

/* ===== CORRECTIONS SPÉCIFIQUES AUX PROBLÈMES IDENTIFIÉS ===== */

/* Correction du débordement des métiers */
@media (max-width: 768px) {
  .service-title,
  .action-card-title,
  .revolutionary-service-title {
    max-width: 100% !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  /* Pour les titres longs, permettre le retour à la ligne */
  .service-title.long-title,
  .action-card-title.long-title {
    white-space: normal !important;
    line-height: 1.3 !important;
    max-height: 2.6em !important;
    overflow: hidden !important;
    display: -webkit-box !important;
    -webkit-line-clamp: 2 !important;
    -webkit-box-orient: vertical !important;
  }
}

/* Amélioration de la visibilité des éléments sur mobile */
@media (max-width: 768px) {
  /* Augmenter la taille des éléments interactifs */
  .requirement-badge,
  .service-doc-tag,
  .badge {
    min-height: 32px !important;
    padding: 0.5rem 0.75rem !important;
    font-size: 0.8rem !important;
  }

  /* Améliorer la visibilité des icônes */
  .revolutionary-service-icon,
  .action-icon,
  .service-icon {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
  }

  /* Améliorer la lisibilité des descriptions */
  .service-description,
  .action-description,
  .coach-advice {
    background: rgba(248, 250, 252, 0.8) !important;
    padding: 0.75rem !important;
    border-radius: 0.5rem !important;
    border-left: 3px solid #0a6b79 !important;
  }
}

/* ===== CORRECTIONS FINALES POUR LA LISIBILITÉ ===== */
@media (max-width: 768px) {
  /* Assurer un espacement suffisant entre les éléments */
  .services-grid > *,
  .action-services-grid > *,
  .document-types > * {
    margin-bottom: 1rem !important;
  }

  /* Améliorer la séparation visuelle */
  .services-theme,
  .revolutionary-documents-group {
    margin-bottom: 2rem !important;
    padding-bottom: 1rem !important;
    border-bottom: 1px solid #e5e7eb !important;
  }

  /* Dernière section sans bordure */
  .services-theme:last-child,
  .revolutionary-documents-group:last-child {
    border-bottom: none !important;
  }
}
