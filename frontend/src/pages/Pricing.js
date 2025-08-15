import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiCheck, FiX } from 'react-icons/fi';
import './Pricing.css';

const Pricing = () => {
  const [billingPeriod, setBillingPeriod] = useState('monthly');

  const plans = [
    {
      name: 'Gratuit',
      price: {
        monthly: 0,
        yearly: 0
      },
      description: 'Pour découvrir IAMONJOB',
      features: [
        { text: '5 analyses de CV par mois', included: true },
        { text: '3 lettres de motivation', included: true },
        { text: 'Chat IA limité', included: true },
        { text: 'Suggestions de base', included: true },
        { text: 'Support par email', included: false },
        { text: 'Analyses approfondies', included: false },
        { text: 'Suivi de candidatures', included: false },
        { text: 'API access', included: false }
      ],
      cta: 'Commencer gratuitement',
      popular: false
    },
    {
      name: 'Pro',
      price: {
        monthly: 19.99,
        yearly: 199.99
      },
      description: 'Pour les chercheurs d\'emploi actifs',
      features: [
        { text: 'Analyses de CV illimitées', included: true },
        { text: 'Lettres de motivation illimitées', included: true },
        { text: 'Chat IA illimité', included: true },
        { text: 'Analyses de compatibilité', included: true },
        { text: 'Support prioritaire', included: true },
        { text: 'Préparation d\'entretiens', included: true },
        { text: 'Suivi de candidatures', included: true },
        { text: 'API access', included: false }
      ],
      cta: 'Essai gratuit 7 jours',
      popular: true
    },
    {
      name: 'Entreprise',
      price: {
        monthly: 'Sur devis',
        yearly: 'Sur devis'
      },
      description: 'Pour les recruteurs et entreprises',
      features: [
        { text: 'Tout du plan Pro', included: true },
        { text: 'Multi-utilisateurs', included: true },
        { text: 'Tableau de bord RH', included: true },
        { text: 'Analyses de masse', included: true },
        { text: 'Support dédié', included: true },
        { text: 'Formation équipe', included: true },
        { text: 'Personnalisation', included: true },
        { text: 'API complète', included: true }
      ],
      cta: 'Nous contacter',
      popular: false
    }
  ];

  return (
    <div className="pricing-page">
      {/* Hero Section */}
      <section className="pricing-hero">
        <div className="container">
          <h1>Tarifs simples et transparents</h1>
          <p>Choisissez le plan qui correspond à vos besoins</p>
          
          {/* Billing Toggle */}
          <div className="billing-toggle">
            <button 
              className={`toggle-btn ${billingPeriod === 'monthly' ? 'active' : ''}`}
              onClick={() => setBillingPeriod('monthly')}
            >
              Mensuel
            </button>
            <button 
              className={`toggle-btn ${billingPeriod === 'yearly' ? 'active' : ''}`}
              onClick={() => setBillingPeriod('yearly')}
            >
              Annuel
              <span className="discount-badge">-20%</span>
            </button>
          </div>
        </div>
      </section>

      {/* Plans Section */}
      <section className="pricing-plans">
        <div className="container">
          <div className="plans-grid">
            {plans.map((plan, index) => (
              <div 
                key={index} 
                className={`plan-card ${plan.popular ? 'popular' : ''}`}
              >
                {plan.popular && (
                  <div className="popular-badge">Plus populaire</div>
                )}
                
                <div className="plan-header">
                  <h3>{plan.name}</h3>
                  <p className="plan-description">{plan.description}</p>
                  <div className="plan-price">
                    {typeof plan.price[billingPeriod] === 'number' ? (
                      <>
                        <span className="currency">€</span>
                        <span className="amount">{plan.price[billingPeriod]}</span>
                        <span className="period">
                          /{billingPeriod === 'monthly' ? 'mois' : 'an'}
                        </span>
                      </>
                    ) : (
                      <span className="custom-price">{plan.price[billingPeriod]}</span>
                    )}
                  </div>
                </div>
                
                <ul className="plan-features">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className={feature.included ? 'included' : 'not-included'}>
                      {feature.included ? <FiCheck /> : <FiX />}
                      <span>{feature.text}</span>
                    </li>
                  ))}
                </ul>
                
                <div className="plan-footer">
                  <Link 
                    to={plan.name === 'Entreprise' ? '/contact' : '/register'} 
                    className={`btn btn-block ${plan.popular ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="pricing-faq">
        <div className="container">
          <h2>Questions fréquentes</h2>
          <div className="faq-grid">
            <div className="faq-item">
              <h4>Puis-je changer de plan à tout moment ?</h4>
              <p>Oui, vous pouvez passer à un plan supérieur ou inférieur à tout moment. Les changements prennent effet immédiatement.</p>
            </div>
            <div className="faq-item">
              <h4>Y a-t-il un engagement ?</h4>
              <p>Non, tous nos plans sont sans engagement. Vous pouvez annuler à tout moment sans frais.</p>
            </div>
            <div className="faq-item">
              <h4>Comment fonctionne l'essai gratuit ?</h4>
              <p>L'essai gratuit de 7 jours vous donne accès à toutes les fonctionnalités Pro. Aucune carte bancaire requise.</p>
            </div>
            <div className="faq-item">
              <h4>Proposez-vous des réductions étudiants ?</h4>
              <p>Oui ! Les étudiants bénéficient de 50% de réduction sur le plan Pro. Contactez-nous avec votre carte étudiante.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="pricing-cta">
        <div className="container">
          <h2>Prêt à booster votre recherche d'emploi ?</h2>
          <p>Commencez gratuitement, sans carte bancaire</p>
          <Link to="/register" className="btn btn-primary btn-lg">
            Démarrer maintenant
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Pricing;
