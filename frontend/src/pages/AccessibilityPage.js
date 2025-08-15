import React from 'react';
import { FiEye, FiMail, FiMonitor, FiUsers } from 'react-icons/fi';
import './LegalPages.css';

const AccessibilityPage = () => {
  return (
    <div className="legal-page">
      <div className="container">
        <div className="legal-header">
          <h1><FiEye /> Accessibilité numérique</h1>
          <p>Notre engagement pour un service accessible à tous</p>
          <div className="last-updated">
            <small>Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</small>
          </div>
        </div>

        <div className="legal-content">
          <section className="legal-section">
            <h2>Notre engagement</h2>
            <div className="info-block highlight">
              <p>Le CBE Sud 94 s'engage à rendre IAMONJOB accessible à tous les utilisateurs, quel que soit leur handicap ou leurs limitations techniques. Cette déclaration d'accessibilité s'applique au site web iamonjob.fr.</p>
            </div>
          </section>

          <section className="legal-section">
            <h2>État de conformité</h2>
            <div className="info-block">
              <p><strong>IAMONJOB</strong> est <strong>partiellement conforme</strong> avec le Référentiel Général d'Amélioration de l'Accessibilité (RGAA) version 4.1 en raison des non-conformités énumérées ci-dessous.</p>
              
              <h3>Mesures prises pour assurer l'accessibilité</h3>
              <ul>
                <li>Intégration de l'accessibilité dès la conception</li>
                <li>Formation de l'équipe de développement aux standards d'accessibilité</li>
                <li>Tests réguliers avec des outils d'accessibilité</li>
                <li>Prise en compte des retours d'utilisateurs en situation de handicap</li>
              </ul>
            </div>
          </section>

          <section className="legal-section">
            <h2>Résultats des tests</h2>
            <div className="info-block">
              <p>L'audit de conformité réalisé révèle que :</p>
              
              <div className="accessibility-score">
                <div className="score-item">
                  <h3>Critères conformes</h3>
                  <div className="score-number">78%</div>
                  <p>des critères RGAA sont respectés</p>
                </div>
              </div>
              
              <h3>Points positifs identifiés</h3>
              <ul>
                <li>✅ Navigation au clavier fonctionnelle</li>
                <li>✅ Contrastes de couleurs suffisants</li>
                <li>✅ Textes alternatifs pour les images importantes</li>
                <li>✅ Structure sémantique correcte</li>
                <li>✅ Formulaires bien étiquetés</li>
                <li>✅ Absence d'éléments clignotants</li>
              </ul>
            </div>
          </section>

          <section className="legal-section">
            <h2>Contenus non accessibles</h2>
            <div className="info-block">
              <h3>Non-conformités identifiées</h3>
              <ul>
                <li><strong>Images décoratives :</strong> Certaines images décoratives ne sont pas correctement ignorées par les lecteurs d'écran</li>
                <li><strong>Contrastes :</strong> Quelques éléments d'interface ont un contraste insuffisant (boutons secondaires)</li>
                <li><strong>Focus visible :</strong> L'indicateur de focus n'est pas toujours suffisamment visible</li>
                <li><strong>Messages d'erreur :</strong> Certains messages d'erreur ne sont pas liés programmatiquement aux champs concernés</li>
              </ul>

              <h3>Dérogations pour charge disproportionnée</h3>
              <ul>
                <li><strong>Contenus générés par IA :</strong> Les résultats d'analyse générés par l'intelligence artificielle peuvent parfois présenter des structures complexes difficiles à rendre totalement accessibles</li>
                <li><strong>Graphiques complexes :</strong> Certains graphiques de statistiques n'ont pas encore d'alternative textuelle complète</li>
              </ul>

              <h3>Contenus non soumis à l'obligation d'accessibilité</h3>
              <ul>
                <li>Documents PDF uploadés par les utilisateurs</li>
                <li>Contenus de sites web externes intégrés</li>
              </ul>
            </div>
          </section>

          <section className="legal-section">
            <h2>Amélioration et contact</h2>
            <div className="info-block">
              <h3>Plan d'amélioration</h3>
              <p>Nous nous engageons à corriger ces non-conformités selon le calendrier suivant :</p>
              
              <div className="improvement-timeline">
                <div className="timeline-item">
                  <strong>Court terme (3 mois) :</strong>
                  <ul>
                    <li>Amélioration des contrastes</li>
                    <li>Correction des focus visibles</li>
                    <li>Optimisation des messages d'erreur</li>
                  </ul>
                </div>
                
                <div className="timeline-item">
                  <strong>Moyen terme (6 mois) :</strong>
                  <ul>
                    <li>Alternatives textuelles pour tous les graphiques</li>
                    <li>Amélioration de la navigation au clavier</li>
                    <li>Tests utilisateurs avec des personnes en situation de handicap</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section className="legal-section">
            <h2>Technologies utilisées</h2>
            <div className="info-block">
              <p>L'accessibilité de IAMONJOB s'appuie sur les technologies suivantes :</p>
              <ul>
                <li>HTML5 sémantique</li>
                <li>CSS3 pour la présentation</li>
                <li>JavaScript pour les interactions</li>
                <li>React pour l'interface utilisateur</li>
                <li>ARIA (Accessible Rich Internet Applications) pour l'enrichissement sémantique</li>
              </ul>
            </div>
          </section>

          <section className="legal-section">
            <h2>Environnement de test</h2>
            <div className="info-block">
              <p>Les tests ont été effectués avec les combinaisons suivantes :</p>
              
              <h3><FiMonitor /> Navigateurs et lecteurs d'écran</h3>
              <ul>
                <li>Firefox avec NVDA (Windows)</li>
                <li>Chrome avec NVDA (Windows)</li>
                <li>Safari avec VoiceOver (macOS)</li>
                <li>Chrome avec TalkBack (Android)</li>
              </ul>
              
              <h3>Outils de test utilisés</h3>
              <ul>
                <li>Axe DevTools</li>
                <li>WAVE Web Accessibility Evaluation Tool</li>
                <li>Colour Contrast Analyser</li>
                <li>Tests manuels de navigation au clavier</li>
              </ul>
            </div>
          </section>

          <section className="legal-section">
            <h2>Retour d'information et contact</h2>
            <div className="info-block">
              <p>Si vous n'arrivez pas à accéder à un contenu ou à un service, vous pouvez nous contacter pour être orienté vers une alternative accessible ou obtenir le contenu sous une autre forme.</p>
              
              <div className="contact-methods">
                <div className="contact-item">
                  <FiMail />
                  <div>
                    <strong>Email</strong>
                    <p>accessibilite@cbesud94.fr</p>
                  </div>
                </div>
                
                <div className="contact-item">
                  <FiUsers />
                  <div>
                    <strong>Formulaire de contact</strong>
                    <p><a href="/contact">Utilisez notre formulaire de contact</a> en précisant "Accessibilité" dans l'objet</p>
                  </div>
                </div>
              </div>
              
              <p>Nous nous efforçons de répondre dans les <strong>5 jours ouvrés</strong>.</p>
            </div>
          </section>

          <section className="legal-section">
            <h2>Voies de recours</h2>
            <div className="info-block">
              <p>Si vous constatez un défaut d'accessibilité vous empêchant d'accéder à un contenu ou une fonctionnalité du site, que vous nous le signalez et que vous ne parvenez pas à obtenir une réponse rapide de notre part, vous êtes en droit de faire appel au Défenseur des droits.</p>
              
              <h3>Plusieurs moyens sont à votre disposition :</h3>
              <ul>
                <li><strong>Écrire un message au Défenseur des droits :</strong> <a href="https://formulaire.defenseurdesdroits.fr/" target="_blank" rel="noopener noreferrer">formulaire.defenseurdesdroits.fr</a></li>
                <li><strong>Contacter le délégué du Défenseur des droits dans votre région :</strong> <a href="https://www.defenseurdesdroits.fr/saisir/delegues" target="_blank" rel="noopener noreferrer">defenseurdesdroits.fr/saisir/delegues</a></li>
                <li><strong>Envoyer un courrier par la poste (gratuit, ne pas mettre de timbre) :</strong><br />
                  Défenseur des droits<br />
                  Libre réponse 71120<br />
                  75342 Paris CEDEX 07
                </li>
                <li><strong>Appeler le 09 69 39 00 00</strong> (coût d'un appel local)</li>
              </ul>
            </div>
          </section>

          <section className="legal-section">
            <h2>Aide à l'utilisation</h2>
            <div className="info-block">
              <h3>Raccourcis clavier disponibles</h3>
              <ul>
                <li><strong>Tab :</strong> Navigation entre les éléments interactifs</li>
                <li><strong>Shift + Tab :</strong> Navigation arrière</li>
                <li><strong>Entrée/Espace :</strong> Activation des boutons et liens</li>
                <li><strong>Échap :</strong> Fermeture des modales et menus</li>
                <li><strong>Flèches directionnelles :</strong> Navigation dans les menus</li>
              </ul>
              
              <h3>Conseils d'utilisation</h3>
              <ul>
                <li>Activez le mode de contraste élevé de votre système si nécessaire</li>
                <li>Utilisez la fonction zoom de votre navigateur pour agrandir le texte</li>
                <li>Les principales fonctions sont accessibles au clavier</li>
                <li>Les formulaires indiquent clairement les champs obligatoires</li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AccessibilityPage;
