import React from 'react';
import { FiMail, FiPhone, FiMapPin } from 'react-icons/fi';
import './LegalPages.css';

const LegalNotice = () => {
  return (
    <div className="legal-page">
      <div className="container">
        <div className="legal-header">
          <h1>Mentions légales</h1>
          <p>Informations légales obligatoires conformément à la loi française</p>
        </div>

        <div className="legal-content">
          <section className="legal-section">
            <h2>Éditeur du site</h2>
            <div className="info-block">
              <h3>CBE Sud 94</h3>
              <p><strong>Raison sociale :</strong> Comité de Bassin d'Emploi Sud 94</p>
              <p><strong>Forme juridique :</strong> Association loi 1901</p>
              <p><strong>Adresse du siège social :</strong><br />
                1 Rue de la Corderie - Centra 328 <br />
                94586 Rungis Cedex l<br />
                France
              </p>
              <p><strong>Téléphone :</strong> +33 1 77 28 41 64</p>
              <p><strong>Email :</strong> contact@cbe-sud94.org</p>
              <p><strong>Numéro SIRET :</strong> [À compléter]</p>
              <p><strong>Code APE :</strong> [À compléter]</p>
            </div>
          </section>

          <section className="legal-section">
            <h2>Directeur de la publication</h2>
            <div className="info-block">
              <p><strong>Directeur :</strong> Daniel Pigeon-Angelini</p>
              <p><strong>Qualité :</strong> Directeur du CBE Sud 94</p>
              <p><strong>Contact :</strong> d.pigeon-angelini@cbe-sud94.org</p>
            </div>
          </section>

          <section className="legal-section">
            <h2>Hébergement</h2>
            <div className="info-block">
              <p><strong>Hébergeur :</strong> Railway</p>
              <p><strong>Adresse :</strong> Railway Corp.<br />
              2261 Market Street #4008<br />
              San Francisco, CA 94114<br />
              États-Unis</p>
              <p><strong>Site web :</strong> <a href="https://railway.app" target="_blank" rel="noopener noreferrer">https://railway.app</a></p>
            </div>
          </section>

          <section className="legal-section">
            <h2>Conception et développement</h2>
            <div className="info-block">
              <p><strong>Développement :</strong> CBE Sud 94 - Équipe technique</p>
              <p><strong>Marque :</strong> Silveria</p>
              <p><strong>Technologies utilisées :</strong> React, Flask, Python</p>
            </div>
          </section>

          <section className="legal-section">
            <h2>Propriété intellectuelle</h2>
            <div className="info-block">
              <p>Le site IAMONJOB et l'ensemble de son contenu (textes, images, vidéos, logos, icônes, sons, logiciels, etc.) sont la propriété exclusive du CBE Sud 94, sauf mentions contraires.</p>
              
              <p>Toute reproduction, représentation, modification, publication, adaptation de tout ou partie des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite, sauf autorisation écrite préalable du CBE Sud 94.</p>
              
              <p>Toute exploitation non autorisée du site ou de l'un quelconque des éléments qu'il contient sera considérée comme constitutive d'une contrefaçon et poursuivie conformément aux dispositions des articles L.335-2 et suivants du Code de Propriété Intellectuelle.</p>
            </div>
          </section>

          <section className="legal-section">
            <h2>Protection des données personnelles</h2>
            <div className="info-block">
              <p>Conformément à la loi « Informatique et Libertés » du 6 janvier 1978 modifiée et au Règlement Général sur la Protection des Données (RGPD), vous disposez d'un droit d'accès, de rectification, d'effacement, de portabilité et de limitation du traitement des données vous concernant.</p>
              
              <p>Pour exercer ces droits ou pour toute question sur le traitement de vos données, vous pouvez nous contacter :</p>
              <ul>
                <li>Par email : contact@cbe-sud94.org</li>
                <li>Par courrier : CBE Sud 94 - DPO, 1 rue de la Corderie, Centra 328, 94586 Rungis Cedex</li>
              </ul>
              
              <p>Pour plus d'informations, consultez notre <a href="/confidentialite">Politique de confidentialité</a>.</p>
            </div>
          </section>

          <section className="legal-section">
            <h2>Cookies</h2>
            <div className="info-block">
              <p>Ce site utilise des cookies pour améliorer votre expérience utilisateur et réaliser des statistiques de visite.</p>
              <p>Pour en savoir plus sur les cookies utilisés et gérer vos préférences, consultez notre <a href="/cookies">Politique de cookies</a>.</p>
            </div>
          </section>

          <section className="legal-section">
            <h2>Limitation de responsabilité</h2>
            <div className="info-block">
              <p>Les informations contenues sur ce site sont aussi précises que possible et le site est périodiquement remis à jour, mais peut toutefois contenir des inexactitudes, des omissions ou des lacunes.</p>
              
              <p>Le CBE Sud 94 ne pourra être tenu responsable de tout dommage de quelque nature que ce soit résultant de l'interprétation ou de l'utilisation des informations et/ou documents disponibles sur ce site.</p>
              
              <p>Les conseils et recommandations fournis par l'assistant IA sont donnés à titre informatif et ne sauraient engager la responsabilité du CBE Sud 94 quant aux résultats obtenus dans le cadre d'une recherche d'emploi.</p>
            </div>
          </section>

          <section className="legal-section">
            <h2>Droit applicable</h2>
            <div className="info-block">
              <p>Les présentes mentions légales sont régies par le droit français.</p>
              <p>En cas de litige, les tribunaux français seront seuls compétents.</p>
            </div>
          </section>

          <section className="legal-section">
            <h2>Contact</h2>
            <div className="contact-info">
              <div className="contact-item">
                <FiMail />
                <div>
                  <strong>Email</strong>
                  <p>contact@cbe-sud94.org</p>
                </div>
              </div>
              <div className="contact-item">
                <FiPhone />
                <div>
                  <strong>Téléphone</strong>
                  <p>+33 1 76 28 41 64</p>
                </div>
              </div>
              <div className="contact-item">
                <FiMapPin />
                <div>
                  <strong>Adresse</strong>
                  <p>CBE Sud 94<br />1 Rue de la Corderie - Centra 328<br />94586 Rungis Cedex</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default LegalNotice;
