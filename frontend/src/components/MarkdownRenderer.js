import React from 'react';
import ReactMarkdown from 'react-markdown';

const MarkdownRenderer = ({ content, serviceType = 'default' }) => {
  if (!content) return <div>Aucun contenu à afficher</div>;

  // Appliquer la classe CSS selon le type de service
  const getServiceClass = () => {
    const serviceClasses = {
      'matching_cv_offre': 'matching-cv-offre',
      'cover_letter': 'cover-letter', 
      'interview_prep': 'interview-prep',
      'default': 'default'
    };
    return serviceClasses[serviceType] || 'default';
  };

  return (
    <div className={`markdown-renderer ${getServiceClass()}`}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
