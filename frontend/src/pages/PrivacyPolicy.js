import React from 'react';
import { FiShield, FiMail, FiLock, FiEye, FiTrash2 } from 'react-icons/fi';
import './LegalPages.css';

const PrivacyPolicy = () => {
  return (
    <div className="legal-page">
      <div className="container">
        <div className="legal-header">
          <h1><FiShield /> Politique de confidentialité</h1>
          <p>Protection de vos données personnelles - Conforme RGPD</p>
          <div className="last-updated">
            <small>Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</small>
          </div>
        </div>

        <div className="legal-content">
          <section className="legal-section">
            <h2>Notre engagement</h2>
            <div className="info-block highlight">
              <p>Le CBE Sud 94 s'engage à protéger la confidentialité de vos données personnelles. Cette politique explique comment nous collectons, utilisons et protégeons vos informations lors de l'utilisation d'IAMONJOB.</p>
            </div>
          </section>

          <section className="legal-section">
            <h2>Responsable du traitement</h2>
            <div className="info-block">
              <p><strong>Organisme :</strong> CBE Sud 94 (Centre Bilan Emploi Sud 94)</p>
              <p><strong>Adresse :</strong> 123 Rue de l'Innovation, 94000 Créteil</p>
              <p><strong>Contact DPO :</strong> dpo@cbesud94.fr</p>
              <p><strong>Mission :</strong> Accompagnement à l'insertion professionnelle</p>
            </div>
          </section>

          <section className="legal-section">
            <h2>Données collectées</h2>
            <div className="data-types">
              <div className="data-category">
                <h3><FiEye /> Données d'identification</h3>
                <ul>
                  <li>Nom et prénom</li>
                  <li>Adresse email</li>
                  <li>Informations de profil professionnel</li>
                </ul>
                <p><strong>Base légale :</strong> Consentement et intérêt légitime</p>
              </div>

              <div className="data-category">
                <h3><FiLock /> Documents professionnels</h3>
                <ul>
                  <li>CV uploadés (contenu analysé puis supprimé)</li>
                  <li>Lettres de motivation générées</li>
                  <li>Offres d'emploi analysées</li>
                </ul>
                <p><strong>Base légale :</strong> Consentement explicite</p>
                <p><strong>Durée de conservation :</strong> 24 heures maximum</p>
              </div>

              <div className="data-category">
                <h3>Données techniques</h3>
                <ul>
                  <li>Adresse IP (anonymisée)</li>
                  <li>Informations de navigation</li>
                  <li>Logs d'utilisation (statistiques)</li>
                </ul>
                <p><strong>Base légale :</strong> Intérêt légitime</p>
              </div>
            </div>
          </section>

          <section className="legal-section">
            <h2>Finalités du traitement</h2>
            <div className="purposes-grid">
              <div className="purpose-card">
                <h3>Accompagnement professionnel</h3>
                <p>Analyse de CV, évaluation de compatibilité, génération de lettres de motivation</p>
              </div>
              <div className="purpose-card">
                <h3>Amélioration du service</h3>
                <p>Statistiques d'usage, optimisation des algorithmes IA</p>
              </div>
              <div className="purpose-card">
                <h3>Support utilisateur</h3>
                <p>Assistance technique, réponse aux demandes</p>
              </div>
            </div>
          </section>

          <section className="legal-section">
            <h2>Conservation des données</h2>
            <div className="info-block">
              <div className="retention-timeline">
                <div className="retention-item">
                  <strong>Documents uploadés :</strong> Suppression automatique après 24h
                </div>
                <div className="retention-item">
                  <strong>Données de compte :</strong> Tant que le compte est actif + 3 ans après suppression
                </div>
                <div className="retention-item">
                  <strong>Logs techniques :</strong> 12 mois maximum
                </div>
                <div className="retention-item">
                  <strong>Statistiques anonymes :</strong> Conservation illimitée (données anonymisées)
                </div>
              </div>
            </div>
          </section>

          <section className="legal-section">
            <h2>Vos droits RGPD</h2>
            <div className="rights-grid">
              <div className="right-card">
                <FiEye />
                <h3>Droit d'accès</h3>
                <p>Connaître les données vous concernant</p>
              </div>
              <div className="right-card">
                <FiLock />
                <h3>Droit de rectification</h3>
                <p>Corriger vos données inexactes</p>
              </div>
              <div className="right-card">
                <FiTrash2 />
                <h3>Droit à l'effacement</h3>
                <p>Supprimer vos données</p>
              </div>
              <div className="right-card">
                <FiShield />
                <h3>Droit à la portabilité</h3>
                <p>Récupérer vos données</p>
              </div>
            </div>
            
            <div className="exercise-rights">
              <h3>Comment exercer vos droits ?</h3>
              <p>Pour exercer vos droits ou pour toute question :</p>
              <ul>
                <li><strong>Email :</strong> dpo@cbesud94.fr</li>
                <li><strong>Courrier :</strong> CBE Sud 94 - DPO, 123 Rue de l'Innovation, 94000 Créteil</li>
                <li><strong>Délai de réponse :</strong> 1 mois maximum</li>
              </ul>
              <p>En cas de désaccord, vous pouvez saisir la CNIL : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a></p>
            </div>
          </section>

          <section className="legal-section">
            <h2>Sécurité des données</h2>
            <div className="security-measures">
              <h3>Mesures techniques et organisationnelles</h3>
              <ul>
                <li>Chiffrement des données en transit (HTTPS/TLS)</li>
                <li>Authentification sécurisée des utilisateurs</li>
                <li>Suppression automatique des documents sensibles</li>
                <li>Accès limité aux données par le personnel autorisé</li>
                <li>Sauvegardes sécurisées et régulières</li>
                <li>Monitoring et détection d'incidents</li>
              </ul>
            </div>
          </section>

          <section className="legal-section">
            <h2>Intelligence artificielle et données</h2>
            <div className="info-block">
              <h3>Traitement par IA</h3>
              <p>Votre CV et vos documents sont analysés par des modèles d'intelligence artificielle (OpenAI GPT-4, Mistral) pour :</p>
              <ul>
                <li>Évaluer la qualité et la structure de votre CV</li>
                <li>Générer des recommandations personnalisées</li>
                <li>Créer des lettres de motivation adaptées</li>
              </ul>
              
              <h3>Protection lors du traitement IA</h3>
              <ul>
                <li>Vos données ne sont pas utilisées pour entraîner les modèles IA</li>
                <li>Les analyses sont effectuées de manière temporaire</li>
                <li>Aucune donnée personnelle n'est conservée par les fournisseurs IA</li>
                <li>Suppression immédiate après traitement</li>
              </ul>
            </div>
          </section>

          <section className="legal-section">
            <h2>Transferts de données</h2>
            <div className="info-block">
              <p><strong>Hébergement :</strong> Données hébergées en Europe (respect RGPD)</p>
              <p><strong>Services IA :</strong> Transferts temporaires vers OpenAI/Mistral avec garanties de protection</p>
              <p><strong>Aucune vente de données :</strong> Vos données ne sont jamais vendues à des tiers</p>
            </div>
          </section>

          <section className="legal-section">
            <h2>Cookies et technologies similaires</h2>
            <div className="info-block">
              <p>Nous utilisons des cookies essentiels au fonctionnement du service.</p>
              <p>Pour plus d'informations, consultez notre <a href="/cookies">Politique de cookies</a>.</p>
            </div>
          </section>

          <section className="legal-section">
            <h2>Modifications de cette politique</h2>
            <div className="info-block">
              <p>Cette politique peut être mise à jour pour refléter les changements dans nos pratiques ou la législation.</p>
              <p>Toute modification importante sera communiquée par email ou notification sur le site.</p>
            </div>
          </section>

          <section className="legal-section">
            <h2>Contact</h2>
            <div className="contact-info">
              <div className="contact-item">
                <FiMail />
                <div>
                  <strong>Délégué à la Protection des Données</strong>
                  <p>dpo@cbesud94.fr</p>
                </div>
              </div>
              <div className="contact-item">
                <FiShield />
                <div>
                  <strong>Questions sur vos données</strong>
                  <p>confidentialite@cbesud94.fr</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
