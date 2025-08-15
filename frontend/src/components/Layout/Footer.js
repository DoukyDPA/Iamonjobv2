import React from 'react';
import { Link } from 'react-router-dom';
import { FiMail, FiPhone, FiLinkedin, FiTwitter } from 'react-icons/fi';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <div className="footer-logo">
              <img 
                src="/logo_iamonjob.png"
                alt="IAMONJOB" 
                className="footer-logo-image"
              />
            </div>
            <p>
              Votre assistant IA pour réussir votre recherche d'emploi. 
              Optimisez votre CV, préparez vos entretiens et trouvez le job de vos rêves.
            </p>
            <div className="footer-social">
              <a href="mailto:contact@cbesud94.fr" aria-label="Email" title="Nous contacter par email">
                <FiMail />
              </a>
              <a href="tel:+33123456789" aria-label="Téléphone" title="Nous appeler">
                <FiPhone />
              </a>
              <a href="https://linkedin.com/company/cbe-sud-94" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" title="Suivez-nous sur LinkedIn">
                <FiLinkedin />
              </a>
              <a href="https://twitter.com/cbesud94" target="_blank" rel="noopener noreferrer" aria-label="Twitter" title="Suivez-nous sur Twitter">
                <FiTwitter />
              </a>
            </div>
          </div>
          
          <div className="footer-section">
            <h4>Fonctionnalités</h4>
            <ul>
              <li><Link to="/features">Analyse de CV</Link></li>
              <li><Link to="/features">Évaluation d'offres</Link></li>
              <li><Link to="/features">Lettres de motivation</Link></li>
              <li><Link to="/features">Préparation d'entretiens</Link></li>
              <li><Link to="/dashboard">Tableau de bord</Link></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4>Ressources</h4>
            <ul>
              <li><a href="https://blog.cbesud94.fr" target="_blank" rel="noopener noreferrer">Blog</a></li>
              <li><Link to="/features">Guides pratiques</Link></li>
              <li><Link to="/faq">FAQ</Link></li>
              <li><Link to="/contact">Contact</Link></li>
              <li><a href="https://cbesud94.fr" target="_blank" rel="noopener noreferrer">CBE Sud 94</a></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4>Légal</h4>
            <ul>
              <li><Link to="/confidentialite">Confidentialité</Link></li>
              <li><Link to="/conditions">Conditions d'utilisation</Link></li>
              <li><Link to="/cookies">Politique cookies</Link></li>
              <li><Link to="/mentions-legales">Mentions légales</Link></li>
              <li><Link to="/accessibilite">Accessibilité</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>
            © {currentYear} <strong>IAMONJOB</strong> - Développé avec ❤️ par <strong>CBE Sud 94</strong> sous la marque <strong>Silveria</strong>
          </p>
          <p>
            <small>Conformité RGPD</small>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
