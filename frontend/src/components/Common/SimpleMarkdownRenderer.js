import React from 'react';
import './SimpleMarkdownRenderer.css';

const SimpleMarkdownRenderer = ({ content }) => {
  if (!content) return null;

  // Nettoyage intelligent du contenu
  const cleanContent = preprocessContent(content);
  
  // Parsing intelligent basé sur la structure
  const parsedContent = parseStructuredContent(cleanContent);
  
  return (
    <div className="markdown-renderer">
      {parsedContent}
    </div>
  );
};

// Nettoyage intelligent du contenu
const preprocessContent = (content) => {
  let cleaned = content;
  
  // Supprimer les artefacts de markdown
  cleaned = cleaned.replace(/```[\s\S]*?```/g, ''); // Blocs de code
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1'); // Code inline
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1'); // Bold
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1'); // Italic
  
  // Nettoyer les espaces multiples
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n'); // Max 2 sauts de ligne
  cleaned = cleaned.replace(/[ \t]+/g, ' '); // Espaces multiples
  
  // Nettoyer les caractères spéciaux (GARDER les accents français et caractères utiles !)
  cleaned = cleaned.replace(/[^\w\s.,!?;:()[\]{}"'\-–—…àáâäãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿńňñòóôöõøōőṕŕřśšşșťțùúûüũūűůųẃẍÿýžźżÀÁÂÄÃÅĀĂĄÇĆČĐĎÈÉÊËĒĖĘĚĞǴḦÎÏÍĪĮÌŁḾŃŇÑÒÓÔÖÕØŌŐṔŔŘŚŠŞȘŢȚÙÚÛÜŨŪŰŮŲẂẌŸÝŽŹŻ\/]/g, '');
  
  return cleaned.trim();
};

// Parsing intelligent basé sur la structure
const parseStructuredContent = (content) => {
  const lines = content.split('\n').filter(line => line.trim());
  const elements = [];
  
  let currentSection = null;
  let currentList = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Détection des titres de section
    if (isSectionHeader(line)) {
      if (currentList) {
        elements.push(renderList(currentList));
        currentList = null;
      }
      currentSection = createSectionHeader(line);
      elements.push(currentSection);
      continue;
    }
    
    // Détection des listes
    if (isListItem(line)) {
      if (!currentList) {
        currentList = [];
      }
      currentList.push(extractListItem(line));
      continue;
    }
    
    // Détection des exemples
    if (isExample(line)) {
      if (currentList) {
        elements.push(renderList(currentList));
        currentList = null;
      }
      elements.push(createExample(line));
      continue;
    }
    
    // Détection des instructions
    if (isInstruction(line)) {
      if (currentList) {
        elements.push(renderList(currentList));
        currentList = null;
      }
      elements.push(createInstruction(line));
      continue;
    }
    
    // Texte normal
    if (currentList) {
      elements.push(renderList(currentList));
      currentList = null;
    }
    elements.push(createParagraph(line));
  }
  
  // Fermer la liste en cours
  if (currentList) {
    elements.push(renderList(currentList));
  }
  
  return elements;
};

// Détection intelligente des éléments
const isSectionHeader = (line) => {
  return /^\d+\.\s+[A-Z]/.test(line) || /^[A-Z][^.!?]*:$/.test(line);
};

const isListItem = (line) => {
  return /^[•·▪▫◦‣⁃]\s/.test(line) || /^[a-z]\)\s/.test(line) || /^-\s/.test(line);
};

const isExample = (line) => {
  return /^Exemple\s*:/.test(line) || /^[A-Z][^.!?]*\s*:/.test(line);
};

const isInstruction = (line) => {
  return /^Ajoutez\s/.test(line) || /^Rédigez\s/.test(line) || /^Préparez\s/.test(line);
};

// Extraction des éléments
const extractListItem = (line) => {
  return line.replace(/^[•·▪▫◦‣⁃]\s/, '').replace(/^[a-z]\)\s/, '').replace(/^-\s/, '');
};

// Création des éléments de rendu
const createSectionHeader = (line) => (
  <h3 key={`header-${line}`} className="markdown-section-header">
    {line}
  </h3>
);

const createExample = (line) => (
  <div key={`example-${line}`} className="markdown-example">
    <strong>{line}</strong>
  </div>
);

const createInstruction = (line) => (
  <div key={`instruction-${line}`} className="markdown-instruction">
    {line}
  </div>
);

const createParagraph = (line) => (
  <p key={`para-${line}`} className="markdown-paragraph">
    {line}
  </p>
);

const renderList = (items) => (
  <ul key={`list-${items.join('')}`} className="markdown-list">
    {items.map((item, index) => (
      <li key={index} className="markdown-list-item">
        {item}
      </li>
    ))}
  </ul>
);

export default SimpleMarkdownRenderer;
