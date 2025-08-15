import React, { useState } from 'react';
import { FiHelpCircle, FiChevronDown, FiChevronUp, FiSearch, FiFileText, FiTarget, FiMail, FiShield } from 'react-icons/fi';
import './LegalPages.css';

const FAQ = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [openItems, setOpenItems] = useState(new Set());

  const toggleItem = (id) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(id)) {
      newOpenItems.delete(id);
    } else {
      newOpenItems.add(id);
    }
    setOpenItems(newOpenItems);
  };

  const categories = [
    { id: 'all', name: 'Toutes les questions', icon: <FiHelpCircle /> },
    { id: 'general', name: 'Général', icon: <FiHelpCircle /> },
    { id: 'cv', name: 'Analyse de CV', icon: <FiFileText /> },
    { id: 'compatibility', name: 'Compatibilité', icon: <FiTarget /> },
    { id: 'letters', name: 'Lettres de motivation', icon: <FiMail /> },
    { id: 'privacy', name: 'Confidentialité', icon: <FiShield /> }
  ];

  const faqData = [
    // Questions générales
    {
      id: 1,
      category: 'general',
      question: "Qu'est-ce qu'IAMONJOB ?",
      answer: "IAMONJOB est une plateforme gratuite d'accompagnement à la recherche d'emploi développée par le CBE Sud 94. Nous utilisons l'intelligence artificielle pour analyser votre CV, évaluer votre compatibilité avec des offres d'emploi, générer des lettres de motivation personnalisées et vous préparer aux entretiens d'embauche."
    },
    {
      id: 2,
      category: 'general',
      question: "Le service est-il vraiment gratuit ?",
      answer: "Oui, IAMONJOB est entièrement gratuit. Il s'agit d'un service public d'accompagnement à l'emploi développé par le CBE Sud 94. Aucun frais n'est demandé pour utiliser nos fonctionnalités d'analyse de CV, de génération de lettres de motivation ou de conseils pour l'emploi."
    },
    {
      id: 3,
      category: 'general',
      question: "Qui peut utiliser IAMONJOB ?",
      answer: "IAMONJOB s'adresse à toute personne majeure en recherche d'emploi ou en reconversion professionnelle. Que vous soyez demandeur d'emploi, étudiant en fin de cursus, ou salarié souhaitant changer de poste, nos outils peuvent vous aider dans vos démarches."
    },
    {
      id: 4,
      category: 'general',
      question: "Ai-je besoin de créer un compte ?",
      answer: "Un compte est nécessaire pour utiliser nos services. Cela nous permet de sauvegarder vos préférences, de sécuriser vos données et de vous offrir une expérience personnalisée. L'inscription est simple et ne prend que quelques minutes."
    },

    // Questions sur l'analyse de CV
    {
      id: 5,
      category: 'cv',
      question: "Quels formats de CV acceptez-vous ?",
      answer: "Nous acceptons les formats PDF, DOC, DOCX et TXT. La taille maximale autorisée est de 16 MB. Pour une analyse optimale, nous recommandons le format PDF car il préserve la mise en forme de votre CV."
    },
    {
      id: 6,
      category: 'cv',
      question: "Comment fonctionne l'analyse de CV ?",
      answer: "Notre IA analyse votre CV selon plusieurs critères : structure et mise en forme, pertinence des mots-clés, cohérence du parcours, adéquation des compétences avec les standards du marché. Vous recevez ensuite un rapport détaillé avec des recommandations d'amélioration et un score global."
    },
    {
      id: 7,
      category: 'cv',
      question: "Combien de temps dure l'analyse ?",
      answer: "L'analyse de votre CV prend généralement entre 30 secondes et 2 minutes, selon la complexité du document et la charge de nos serveurs. Vous recevez les résultats en temps réel sur votre écran."
    },
    {
      id: 8,
      category: 'cv',
      question: "Que faire si mon CV n'est pas reconnu ?",
      answer: "Si votre CV n'est pas correctement analysé, vérifiez qu'il s'agit d'un format supporté et que le texte est bien lisible (pas d'image scannée). Si le problème persiste, contactez notre support à support@cbesud94.fr."
    },

    // Questions sur la compatibilité
    {
      id: 9,
      category: 'compatibility',
      question: "Comment évaluer la compatibilité avec une offre ?",
      answer: "Uploadez votre CV et copiez-collez le texte de l'offre d'emploi dans l'outil de compatibilité. Notre IA compare vos compétences, expériences et qualifications avec les exigences du poste pour vous donner un pourcentage de compatibilité et des conseils personnalisés."
    },
    {
      id: 10,
      category: 'compatibility',
      question: "Que signifie le score de compatibilité ?",
      answer: "Le score de compatibilité (0-100%) indique à quel point votre profil correspond aux exigences de l'offre. Un score de 70%+ indique une bonne adéquation. En plus du score, nous identifions les compétences manquantes et vous suggérons des améliorations."
    },
    {
      id: 11,
      category: 'compatibility',
      question: "Puis-je analyser plusieurs offres ?",
      answer: "Oui, vous pouvez analyser autant d'offres que vous le souhaitez. Chaque analyse est indépendante et vous pouvez comparer les résultats pour prioriser vos candidatures."
    },

    // Questions sur les lettres de motivation
    {
      id: 12,
      category: 'letters',
      question: "Comment générer une lettre de motivation ?",
      answer: "Après avoir uploadé votre CV et analysé une offre d'emploi, utilisez notre générateur de lettres de motivation. L'IA crée automatiquement une lettre personnalisée en se basant sur votre profil et les spécificités de l'offre."
    },
    {
      id: 13,
      category: 'letters',
      question: "Puis-je modifier la lettre générée ?",
      answer: "Absolument ! La lettre générée est un point de départ que vous pouvez et devez personnaliser selon votre style et vos spécificités. Nous recommandons toujours d'ajouter votre touche personnelle pour rendre la lettre authentique."
    },
    {
      id: 14,
      category: 'letters',
      question: "Les lettres sont-elles détectées comme étant générées par IA ?",
      answer: "Nos lettres sont conçues pour être naturelles et personnalisées. Cependant, nous recommandons toujours de les personnaliser et de les relire attentivement avant envoi pour qu'elles reflètent vraiment votre personnalité et votre motivation."
    },

    // Questions sur la confidentialité
    {
      id: 15,
      category: 'privacy',
      question: "Mes données sont-elles sécurisées ?",
      answer: "Oui, nous prenons la sécurité très au sérieux. Vos documents sont automatiquement supprimés après 24 heures, les échanges sont chiffrés (HTTPS), et nous respectons strictement le RGPD. Vos données ne sont jamais vendues ou partagées avec des tiers."
    },
    {
      id: 16,
      category: 'privacy',
      question: "Que faites-vous de mon CV ?",
      answer: "Votre CV est temporairement analysé par notre IA puis automatiquement supprimé de nos serveurs dans les 24 heures. Nous ne conservons aucune copie de vos documents personnels. Seules des statistiques anonymes peuvent être conservées pour améliorer notre service."
    },
    {
      id: 17,
      category: 'privacy',
      question: "Puis-je supprimer mes données ?",
      answer: "Oui, conformément au RGPD, vous avez le droit de supprimer vos données à tout moment. Vous pouvez supprimer votre compte depuis votre espace personnel ou nous contacter à dpo@cbesud94.fr pour une suppression complète."
    },
    {
      id: 18,
      category: 'privacy',
      question: "Utilisez-vous mes données pour entraîner l'IA ?",
      answer: "Non, vos données personnelles ne sont jamais utilisées pour entraîner nos modèles d'IA. Nous utilisons uniquement des modèles pré-entraînés (OpenAI, Mistral) et vos documents sont supprimés après analyse."
    },

    // Questions techniques
    {
      id: 19,
      category: 'general',
      question: "Que faire si le site ne fonctionne pas ?",
      answer: "Vérifiez d'abord votre connexion internet et essayez de rafraîchir la page. Si le problème persiste, videz le cache de votre navigateur ou essayez avec un autre navigateur. En cas de problème persistant, contactez notre support technique."
    },
    {
      id: 20,
      category: 'general',
      question: "Sur quels navigateurs fonctionne IAMONJOB ?",
      answer: "IAMONJOB fonctionne sur tous les navigateurs modernes : Chrome, Firefox, Safari, Edge (versions récentes recommandées). L'interface est également optimisée pour les appareils mobiles (smartphones et tablettes)."
    },
    {
      id: 21,
      category: 'general',
      question: "Comment contacter le support ?",
      answer: "Vous pouvez nous contacter par email à support@cbesud94.fr, par téléphone au +33 1 23 45 67 89, ou via notre formulaire de contact. Notre équipe répond généralement sous 24h en jours ouvrés."
    },
    {
      id: 22,
      category: 'general',
      question: "IAMONJOB garantit-il de trouver un emploi ?",
      answer: "Non, IAMONJOB est un outil d'aide à la recherche d'emploi qui améliore vos chances de succès, mais ne peut garantir l'obtention d'un emploi. Le succès dépend de nombreux facteurs : marché de l'emploi, secteur d'activité, concurrence, qualité de vos candidatures, etc."
    }
  ];

  const filteredFAQ = faqData.filter(item => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch = item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.answer.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="legal-page faq-page">
      <div className="container">
        <div className="legal-header">
          <h1><FiHelpCircle /> Foire aux questions</h1>
          <p>Trouvez rapidement les réponses à vos questions sur IAMONJOB</p>
        </div>

        {/* Barre de recherche */}
        <div className="faq-search">
          <div className="search-box">
            <FiSearch />
            <input
              type="text"
              placeholder="Rechercher une question..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {/* Filtres par catégorie */}
        <div className="faq-categories">
          {categories.map(category => (
            <button
              key={category.id}
              className={`category-button ${activeCategory === category.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(category.id)}
            >
              {category.icon}
              <span>{category.name}</span>
            </button>
          ))}
        </div>

        {/* Liste des questions */}
        <div className="faq-content">
          {filteredFAQ.length > 0 ? (
            <div className="faq-list">
              {filteredFAQ.map(item => (
                <div key={item.id} className="faq-item">
                  <button
                    className="faq-question"
                    onClick={() => toggleItem(item.id)}
                    aria-expanded={openItems.has(item.id)}
                  >
                    <span>{item.question}</span>
                    {openItems.has(item.id) ? <FiChevronUp /> : <FiChevronDown />}
                  </button>
                  
                  {openItems.has(item.id) && (
                    <div className="faq-answer">
                      <p>{item.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="no-results">
              <FiHelpCircle />
              <h3>Aucune question trouvée</h3>
              <p>Essayez de modifier votre recherche ou sélectionnez une autre catégorie.</p>
            </div>
          )}
        </div>

        {/* Section contact */}
        <div className="faq-contact">
          <h2>Vous ne trouvez pas la réponse à votre question ?</h2>
          <p>Notre équipe est là pour vous aider ! Contactez-nous et nous vous répondrons rapidement.</p>
          
          <div className="contact-options">
            <a href="/contact" className="btn btn-primary">
              <FiMail />
              Nous contacter
            </a>
            
            <div className="contact-info">
              <div className="contact-item">
                <strong>Email :</strong> support@cbesud94.fr
              </div>
              <div className="contact-item">
                <strong>Téléphone :</strong> +33 1 23 45 67 89
              </div>
              <div className="contact-item">
                <strong>Horaires :</strong> Lundi - Vendredi, 9h - 17h
              </div>
            </div>
          </div>
        </div>

        {/* Section liens utiles */}
        <div className="helpful-links">
          <h3>Liens utiles</h3>
          <div className="links-grid">
            <a href="/features" className="link-card">
              <FiFileText />
              <div>
                <h4>Découvrir nos fonctionnalités</h4>
                <p>Tout savoir sur nos outils d'aide à l'emploi</p>
              </div>
            </a>
            
            <a href="/confidentialite" className="link-card">
              <FiShield />
              <div>
                <h4>Politique de confidentialité</h4>
                <p>Comment nous protégeons vos données</p>
              </div>
            </a>
            
            <a href="/conditions" className="link-card">
              <FiHelpCircle />
              <div>
                <h4>Conditions d'utilisation</h4>
                <p>Les règles d'usage de notre plateforme</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQ;
