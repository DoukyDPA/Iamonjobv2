import React, { useState } from 'react';
import { FiSettings, FiInfo, FiShield, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import './LegalPages.css';

const CookiesPolicy = () => {
  const [preferences, setPreferences] = useState({
    essential: true, // Toujours activé
    analytics: false,
    functional: false
  });

  const handlePreferenceChange = (category) => {
    if (category === 'essential') return; // Ne peut pas être désactivé
    
    setPreferences(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const savePreferences = () => {
    // Ici on sauvegarderait les préférences
    localStorage.setItem('cookiePreferences', JSON.stringify(preferences));
    alert('Préférences sauvegardées !');
  };

  return (
    <div className="legal-page">
      <div className="container">
        <div className="legal-header">
          <h1><FiSettings /> Politique de cookies</h1>
          <p>Gestion des cookies et technologies similaires sur IAMONJOB</p>
          <div className="last-updated">
            <small>Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</small>
          </div>
        </div>

        <div className="legal-content">
          <section className="legal-section">
            <h2>Qu'est-ce qu'un cookie ?</h2>
            <div className="info-block">
              <p>Un cookie est un petit fichier texte déposé sur votre appareil (ordinateur, tablette, smartphone) lors de votre visite sur notre site. Il permet de reconnaître votre navigateur et de mémoriser certaines informations vous concernant.</p>
              
              <div className="cookie-benefits">
                <h3>Les cookies nous permettent de :</h3>
                <ul>
                  <li>Maintenir votre session de connexion</li>
                  <li>Mémoriser vos préférences d'utilisation</li>
                  <li>Améliorer la performance du site</li>
                  <li>Comprendre comment vous utilisez nos services</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="legal-section">
            <h2>Types de cookies utilisés</h2>
            <div className="cookies-types">
              <div className="cookie-category essential">
                <div className="category-header">
                  <h3><FiShield /> Cookies essentiels</h3>
                  <span className="status required">Requis</span>
                </div>
                <p>Ces cookies sont nécessaires au fonctionnement du site et ne peuvent pas être désactivés.</p>
                
                <div className="cookies-list">
                  <div className="cookie-item">
                    <h4>session_id</h4>
                    <div class="cookie-details">
                      <span><strong>Durée :</strong> Session</span>
                      <span><strong>But :</strong> Maintenir votre connexion</span>
                    </div>
                  </div>
                  
                  <div className="cookie-item">
                    <h4>csrf_token</h4>
                    <div class="cookie-details">
                      <span><strong>Durée :</strong> Session</span>
                      <span><strong>But :</strong> Protection contre les attaques CSRF</span>
                    </div>
                  </div>

                  <div className="cookie-item">
                    <h4>cookie_consent</h4>
                    <div class="cookie-details">
                      <span><strong>Durée :</strong> 1 an</span>
                      <span><strong>But :</strong> Mémoriser vos préférences de cookies</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="cookie-category functional">
                <div className="category-header">
                  <h3><FiSettings /> Cookies fonctionnels</h3>
                  <span className="status optional">Optionnel</span>
                </div>
                <p>Ces cookies améliorent votre expérience en mémorisant vos préférences.</p>
                
                <div className="cookies-list">
                  <div className="cookie-item">
                    <h4>user_preferences</h4>
                    <div class="cookie-details">
                      <span><strong>Durée :</strong> 30 jours</span>
                      <span><strong>But :</strong> Sauvegarder vos préférences d'interface</span>
                    </div>
                  </div>
                  
                  <div className="cookie-item">
                    <h4>language_pref</h4>
                    <div class="cookie-details">
                      <span><strong>Durée :</strong> 1 an</span>
                      <span><strong>But :</strong> Mémoriser votre langue préférée</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="cookie-category analytics">
                <div className="category-header">
                  <h3><FiInfo /> Cookies analytiques</h3>
                  <span className="status optional">Optionnel</span>
                </div>
                <p>Ces cookies nous aident à comprendre comment vous utilisez le site pour l'améliorer.</p>
                
                <div className="cookies-list">
                  <div className="cookie-item">
                    <h4>_analytics_session</h4>
                    <div class="cookie-details">
                      <span><strong>Durée :</strong> 30 minutes</span>
                      <span><strong>But :</strong> Mesurer l'audience du site</span>
                    </div>
                  </div>
                  
                  <div className="cookie-item">
                    <h4>user_journey</h4>
                    <div class="cookie-details">
                      <span><strong>Durée :</strong> 7 jours</span>
                      <span><strong>But :</strong> Analyser le parcours utilisateur</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="legal-section">
            <h2>Gestion de vos préférences</h2>
            <div className="preferences-manager">
              <h3>Configurez vos préférences de cookies</h3>
              <p>Vous pouvez choisir quels types de cookies accepter. Les cookies essentiels ne peuvent pas être désactivés car ils sont nécessaires au fonctionnement du site.</p>
              
              <div className="preferences-controls">
                <div className="preference-item">
                  <div className="preference-info">
                    <h4>Cookies essentiels</h4>
                    <p>Nécessaires au fonctionnement du site</p>
                  </div>
                  <div className="preference-toggle disabled">
                    <FiToggleRight />
                    <span>Toujours actif</span>
                  </div>
                </div>

                <div className="preference-item">
                  <div className="preference-info">
                    <h4>Cookies fonctionnels</h4>
                    <p>Améliorent votre expérience utilisateur</p>
                  </div>
                  <button 
                    className={`preference-toggle ${preferences.functional ? 'active' : ''}`}
                    onClick={() => handlePreferenceChange('functional')}
                  >
                    {preferences.functional ? <FiToggleRight /> : <FiToggleLeft />}
                    <span>{preferences.functional ? 'Activé' : 'Désactivé'}</span>
                  </button>
                </div>

                <div className="preference-item">
                  <div className="preference-info">
                    <h4>Cookies analytiques</h4>
                    <p>Nous aident à améliorer le site</p>
                  </div>
                  <button 
                    className={`preference-toggle ${preferences.analytics ? 'active' : ''}`}
                    onClick={() => handlePreferenceChange('analytics')}
                  >
                    {preferences.analytics ? <FiToggleRight /> : <FiToggleLeft />}
                    <span>{preferences.analytics ? 'Activé' : 'Désactivé'}</span>
                  </button>
                </div>
              </div>

              <div className="preferences-actions">
                <button className="btn btn-primary" onClick={savePreferences}>
                  Sauvegarder mes préférences
                </button>
                <button className="btn btn-outline" onClick={() => setPreferences({essential: true, analytics: false, functional: false})}>
                  Tout refuser (sauf essentiels)
                </button>
              </div>
            </div>
          </section>

          <section className="legal-section">
            <h2>Contrôle via votre navigateur</h2>
            <div className="browser-controls">
              <p>Vous pouvez également contrôler les cookies directement depuis votre navigateur :</p>
              
              <div className="browser-instructions">
                <div className="browser-item">
                  <h4>Chrome</h4>
                  <p>Paramètres → Confidentialité et sécurité → Cookies et autres données de sites</p>
                </div>
                
                <div className="browser-item">
                  <h4>Firefox</h4>
                  <p>Options → Vie privée et sécurité → Cookies et données de sites</p>
                </div>
                
                <div className="browser-item">
                  <h4>Safari</h4>
                  <p>Préférences → Confidentialité → Gérer les données de sites web</p>
                </div>
                
                <div className="browser-item">
                  <h4>Edge</h4>
                  <p>Paramètres → Confidentialité et services → Cookies et autorisations de site</p>
                </div>
              </div>
              
              <div className="warning-notice">
                <FiInfo />
                <p><strong>Attention :</strong> Désactiver certains cookies peut affecter le fonctionnement du site.</p>
              </div>
            </div>
          </section>

          <section className="legal-section">
            <h2>Cookies tiers</h2>
            <div className="info-block">
              <p><strong>Services externes utilisés :</strong></p>
              <ul>
                <li><strong>Aucun service de publicité</strong> - Nous ne utilisons pas de cookies publicitaires</li>
                <li><strong>Aucun traqueur social</strong> - Pas de boutons de partage qui vous suivent</li>
                <li><strong>Analyse interne uniquement</strong> - Pas de Google Analytics ou services tiers</li>
              </ul>
              
              <p>Cette politique de non-utilisation de cookies tiers garantit votre confidentialité et limite le suivi.</p>
            </div>
          </section>

          <section className="legal-section">
            <h2>Conservation et suppression</h2>
            <div className="info-block">
              <h3>Durées de conservation</h3>
              <ul>
                <li><strong>Cookies de session :</strong> Supprimés à la fermeture du navigateur</li>
                <li><strong>Cookies fonctionnels :</strong> 30 jours maximum</li>
                <li><strong>Cookies analytiques :</strong> 7 jours maximum</li>
                <li><strong>Préférences cookies :</strong> 1 an (pour éviter de redemander)</li>
              </ul>
              
              <h3>Suppression manuelle</h3>
              <p>Vous pouvez supprimer tous les cookies à tout moment :</p>
              <ul>
                <li>Via les paramètres de votre navigateur</li>
                <li>En utilisant le mode navigation privée</li>
                <li>En nous contactant pour assistance</li>
              </ul>
            </div>
          </section>

          <section className="legal-section">
            <h2>Mise à jour de cette politique</h2>
            <div className="info-block">
              <p>Cette politique peut être mise à jour pour refléter les changements dans notre utilisation des cookies ou pour se conformer à de nouvelles exigences légales.</p>
              
              <p>Toute modification importante sera :</p>
              <ul>
                <li>Notifiée par une bannière sur le site</li>
                <li>Communiquée par email si vous avez un compte</li>
                <li>Datée en haut de cette page</li>
              </ul>
            </div>
          </section>

          <section className="legal-section">
            <h2>Contact</h2>
            <div className="contact-info">
              <p>Pour des questions sur notre utilisation des cookies :</p>
              <ul>
                <li><strong>Email :</strong> dpo@cbesud94.fr</li>
                <li><strong>Courrier :</strong> CBE Sud 94 - Service Cookies, 123 Rue de l'Innovation, 94000 Créteil</li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default CookiesPolicy;
