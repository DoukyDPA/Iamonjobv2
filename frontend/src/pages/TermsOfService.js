import React from 'react';
import { FiFileText, FiUser, FiShield, FiAlertTriangle } from 'react-icons/fi';
import './LegalPages.css';

const TermsOfService = () => {
  return (
    <div className="legal-page">
      <div className="container">
        <div className="legal-header">
          <h1><FiFileText /> Conditions générales d'utilisation</h1>
          <p>Règles d'utilisation de la plateforme IAMONJOB</p>
          <div className="last-updated">
            <small>Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</small>
          </div>
        </div>

        <div className="legal-content">
          <section className="legal-section">
            <h2>Article 1 - Objet et acceptation</h2>
            <div className="info-block">
              <p>Les présentes Conditions Générales d'Utilisation (CGU) régissent l'utilisation de la plateforme IAMONJOB, service d'accompagnement à la recherche d'emploi par intelligence artificielle, opéré par le CBE Sud 94.</p>
              
              <p>L'utilisation de la plateforme implique l'acceptation pleine et entière des présentes CGU. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser nos services.</p>
            </div>
          </section>

          <section className="legal-section">
            <h2>Article 2 - Présentation du service</h2>
            <div className="service-features">
              <h3><FiShield /> IAMONJOB vous propose :</h3>
              <ul>
                <li>Analyse automatisée de CV par intelligence artificielle</li>
                <li>Évaluation de compatibilité entre votre profil et des offres d'emploi</li>
                <li>Génération de lettres de motivation personnalisées</li>
                <li>Conseils pour la préparation d'entretiens d'embauche</li>
                <li>Accompagnement dans les démarches de reconversion professionnelle</li>
              </ul>
              
              <div className="important-notice">
                <FiAlertTriangle />
                <p><strong>Important :</strong> IAMONJOB est un outil d'aide à la recherche d'emploi. Les conseils fournis ne garantissent pas l'obtention d'un emploi.</p>
              </div>
            </div>
          </section>

          <section className="legal-section">
            <h2>Article 3 - Accès et inscription</h2>
            <div className="info-block">
              <h3>Conditions d'accès</h3>
              <ul>
                <li>Le service est accessible gratuitement à toute personne majeure</li>
                <li>Une connexion internet stable est requise</li>
                <li>L'inscription nécessite une adresse email valide</li>
              </ul>
              
              <h3>Création de compte</h3>
              <p>Lors de votre inscription, vous vous engagez à :</p>
              <ul>
                <li>Fournir des informations exactes et à jour</li>
                <li>Maintenir la confidentialité de vos identifiants</li>
                <li>Nous informer de toute utilisation non autorisée de votre compte</li>
                <li>Respecter les présentes CGU</li>
              </ul>
            </div>
          </section>

          <section className="legal-section">
            <h2>Article 4 - Utilisation du service</h2>
            <div className="usage-rules">
              <h3><FiUser /> Utilisation autorisée</h3>
              <div className="allowed-uses">
                <div className="use-case">
                  <h4>✅ Vous pouvez :</h4>
                  <ul>
                    <li>Utiliser le service pour votre recherche d'emploi personnelle</li>
                    <li>Uploader vos CV et documents professionnels</li>
                    <li>Partager les résultats avec des conseillers en emploi</li>
                    <li>Utiliser les conseils générés pour vos candidatures</li>
                  </ul>
                </div>
              </div>

              <h3><FiAlertTriangle /> Utilisation interdite</h3>
              <div className="forbidden-uses">
                <div className="use-case danger">
                  <h4>❌ Il est formellement interdit de :</h4>
                  <ul>
                    <li>Utiliser le service à des fins commerciales sans autorisation</li>
                    <li>Tenter de contourner les mesures de sécurité</li>
                    <li>Uploader des contenus illégaux, diffamatoires ou inappropriés</li>
                    <li>Partager vos identifiants de connexion</li>
                    <li>Utiliser des robots ou scripts automatisés</li>
                    <li>Surcharger intentionnellement nos serveurs</li>
                    <li>Extraire ou copier le contenu du site de manière massive</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section className="legal-section">
            <h2>Article 5 - Propriété intellectuelle</h2>
            <div className="info-block">
              <h3>Nos droits</h3>
              <p>IAMONJOB, son contenu, sa structure, ses algorithmes et son design sont protégés par le droit d'auteur et appartiennent au CBE Sud 94.</p>
              
              <h3>Vos contenus</h3>
              <p>Vous conservez tous vos droits sur les documents que vous uploadez (CV, lettres de motivation). En utilisant notre service, vous nous accordez une licence temporaire pour :</p>
              <ul>
                <li>Analyser vos documents par IA</li>
                <li>Générer des recommandations personnalisées</li>
                <li>Améliorer nos algorithmes (données anonymisées uniquement)</li>
              </ul>
              
              <p><strong>Suppression automatique :</strong> Vos documents sont automatiquement supprimés de nos serveurs après 24 heures.</p>
            </div>
          </section>

          <section className="legal-section">
            <h2>Article 6 - Protection des données</h2>
            <div className="info-block">
              <p>Le traitement de vos données personnelles est régi par notre <a href="/confidentialite">Politique de confidentialité</a>, conforme au RGPD.</p>
              
              <p><strong>Principes clés :</strong></p>
              <ul>
                <li>Minimisation des données collectées</li>
                <li>Finalités précises et légitimes</li>
                <li>Conservation limitée dans le temps</li>
                <li>Sécurité renforcée</li>
                <li>Respect de vos droits</li>
              </ul>
            </div>
          </section>

          <section className="legal-section">
            <h2>Article 7 - Responsabilités et garanties</h2>
            <div className="responsibilities">
              <h3>Nos engagements</h3>
              <div className="commitment-block">
                <p>Le CBE Sud 94 s'engage à :</p>
                <ul>
                  <li>Fournir un service de qualité dans la limite du possible</li>
                  <li>Protéger vos données personnelles</li>
                  <li>Maintenir la confidentialité de vos informations</li>
                  <li>Améliorer continuellement nos services</li>
                </ul>
              </div>

              <h3>Limitations de responsabilité</h3>
              <div className="limitation-block">
                <p><strong>Le CBE Sud 94 ne peut être tenu responsable :</strong></p>
                <ul>
                  <li>De l'obtention ou non d'un emploi suite à l'utilisation du service</li>
                  <li>De la qualité des offres d'emploi tierces référencées</li>
                  <li>Des interruptions de service dues à des causes externes</li>
                  <li>Des dommages indirects liés à l'utilisation de la plateforme</li>
                </ul>
                
                <div className="important-notice">
                  <FiAlertTriangle />
                  <p><strong>Nature du service :</strong> IAMONJOB est un outil d'aide et de conseil. Les recommandations fournies ne constituent pas des garanties d'embauche.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="legal-section">
            <h2>Article 8 - Disponibilité du service</h2>
            <div className="info-block">
              <p>Nous nous efforçons de maintenir le service accessible 24h/24 et 7j/7, mais ne pouvons garantir une disponibilité absolue.</p>
              
              <p><strong>Interruptions possibles :</strong></p>
              <ul>
                <li>Maintenance programmée (avec préavis)</li>
                <li>Pannes techniques imprévisibles</li>
                <li>Cas de force majeure</li>
              </ul>
              
              <p>En cas d'interruption, nous nous efforçons de rétablir le service dans les meilleurs délais.</p>
            </div>
          </section>

          <section className="legal-section">
            <h2>Article 9 - Modification et suspension</h2>
            <div className="info-block">
              <h3>Modification du service</h3>
              <p>Nous nous réservons le droit de modifier, améliorer ou interrompre tout ou partie du service, avec un préavis approprié.</p>
              
              <h3>Suspension de compte</h3>
              <p>En cas de non-respect des présentes CGU, nous pouvons :</p>
              <ul>
                <li>Suspendre temporairement votre accès</li>
                <li>Supprimer définitivement votre compte</li>
                <li>Signaler aux autorités compétentes si nécessaire</li>
              </ul>
            </div>
          </section>

          <section className="legal-section">
            <h2>Article 10 - Résiliation</h2>
            <div className="info-block">
              <h3>Résiliation par l'utilisateur</h3>
              <p>Vous pouvez supprimer votre compte à tout moment depuis votre espace personnel ou en nous contactant.</p>
              
              <h3>Résiliation par le CBE Sud 94</h3>
              <p>Nous pouvons résilier votre accès en cas de :</p>
              <ul>
                <li>Violation des présentes CGU</li>
                <li>Utilisation abusive du service</li>
                <li>Comportement inapproprié</li>
              </ul>
              
              <h3>Effets de la résiliation</h3>
              <p>En cas de résiliation :</p>
              <ul>
                <li>Votre accès au service est immédiatement suspendu</li>
                <li>Vos données sont supprimées selon notre politique de conservation</li>
                <li>Vous perdez l'accès à tout contenu généré</li>
              </ul>
            </div>
          </section>

          <section className="legal-section">
            <h2>Article 11 - Évolution des CGU</h2>
            <div className="info-block">
              <p>Ces CGU peuvent être modifiées à tout moment pour s'adapter aux évolutions du service ou de la réglementation.</p>
              
              <p><strong>Notification des changements :</strong></p>
              <ul>
                <li>Les modifications importantes sont notifiées par email</li>
                <li>La version en vigueur est toujours accessible sur cette page</li>
                <li>La date de dernière mise à jour est indiquée en haut</li>
              </ul>
              
              <p>L'utilisation continue du service après modification vaut acceptation des nouvelles conditions.</p>
            </div>
          </section>

          <section className="legal-section">
            <h2>Article 12 - Droit applicable et litiges</h2>
            <div className="info-block">
              <p><strong>Droit applicable :</strong> Les présentes CGU sont régies par le droit français.</p>
              
              <p><strong>Résolution des conflits :</strong></p>
              <ol>
                <li>En cas de difficulté, contactez-nous pour une résolution amiable</li>
                <li>À défaut d'accord, les tribunaux français sont compétents</li>
                <li>Pour les consommateurs : tribunaux du lieu de résidence</li>
              </ol>
              
              <p><strong>Médiation :</strong> En cas de litige, vous pouvez recourir à la médiation avant toute action judiciaire.</p>
            </div>
          </section>

          <section className="legal-section">
            <h2>Contact</h2>
            <div className="contact-info">
              <p>Pour toute question sur ces conditions d'utilisation :</p>
              <ul>
                <li><strong>Email :</strong> legal@cbesud94.fr</li>
                <li><strong>Courrier :</strong> CBE Sud 94, 123 Rue de l'Innovation, 94000 Créteil</li>
                <li><strong>Téléphone :</strong> +33 1 23 45 67 89</li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
