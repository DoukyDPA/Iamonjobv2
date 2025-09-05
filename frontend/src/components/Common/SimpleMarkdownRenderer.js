import React from 'react';
import ReactMarkdown from 'react-markdown';
import './SimpleMarkdownRenderer.css';

const SimpleMarkdownRenderer = ({ content, serviceType = 'default' }) => {
  if (!content) return null;

  // Détection des tableaux dans le contenu (Markdown et format texte)
  const hasMarkdownTable = content.includes('|') && content.includes('\n|');
  const hasTextTable = detectTextTable(content);
  
  if (hasMarkdownTable || hasTextTable) {
    // Convertir les tableaux texte en Markdown si nécessaire
    const processedContent = hasTextTable ? convertTextTableToMarkdown(content) : content;
    
    // Utiliser ReactMarkdown pour les tableaux
    return (
      <div className={`markdown-renderer ${serviceType}`}>
        <ReactMarkdown
          components={{
            table: ({ children }) => (
              <div className="table-wrapper">
                <table className={`markdown-table ${serviceType === 'reconversion_analysis' ? 'metiers-table' : ''}`}>
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => <thead>{children}</thead>,
            tbody: ({ children }) => <tbody>{children}</tbody>,
            tr: ({ children }) => <tr>{children}</tr>,
            th: ({ children }) => <th className="markdown-th">{children}</th>,
            td: ({ children }) => <td className="markdown-td">{children}</td>,
            h1: ({ children }) => <h1 className="markdown-h1">{children}</h1>,
            h2: ({ children }) => <h2 className="markdown-h2">{children}</h2>,
            h3: ({ children }) => <h3 className="markdown-h3">{children}</h3>,
            p: ({ children }) => <p className="markdown-p">{children}</p>,
            ul: ({ children }) => <ul className="markdown-ul">{children}</ul>,
            ol: ({ children }) => <ol className="markdown-ol">{children}</ol>,
            li: ({ children }) => <li className="markdown-li">{children}</li>,
            strong: ({ children }) => <strong className="markdown-strong">{children}</strong>,
            em: ({ children }) => <em className="markdown-em">{children}</em>,
            code: ({ children, className }) => {
              const isInline = !className;
              return isInline ? (
                <code className="markdown-code-inline">{children}</code>
              ) : (
                <pre className="markdown-code-block">
                  <code>{children}</code>
                </pre>
              );
            },
            blockquote: ({ children }) => (
              <blockquote className="markdown-blockquote">{children}</blockquote>
            ),
            a: ({ children, href }) => (
              <a href={href} className="markdown-link" target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ),
          }}
        >
          {processedContent}
        </ReactMarkdown>
      </div>
    );
  }

  // Nettoyage intelligent du contenu pour le rendu simple
  const cleanContent = preprocessContent(content);
  
  // Parsing intelligent basé sur la structure
  const parsedContent = parseStructuredContent(cleanContent);
  
  return (
    <div className={`markdown-renderer ${serviceType}`}>
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

// Fonction de détection des tableaux texte
const detectTextTable = (content) => {
  const lines = content.split('\n');
  let tableLines = 0;
  let separatorLines = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Détecter les lignes de séparateurs avec des tirets
    if (trimmed.match(/^-{3,}$/) || trimmed.match(/^-+\s*$/) || trimmed.match(/^_{3,}$/)) {
      separatorLines++;
    }
    
    // Détecter les lignes de contenu de tableau (avec des espaces multiples ou des tirets)
    if (trimmed.length > 0 && 
        (trimmed.includes('  ') || 
         trimmed.match(/^[A-Za-z].*\s{2,}[A-Za-z]/) ||
         trimmed.match(/^[A-Za-z].*\s{2,}[A-Za-z].*\s{2,}[A-Za-z]/))) {
      tableLines++;
    }
  }
  
  // Un tableau texte a généralement plusieurs lignes de séparateurs et de contenu
  return separatorLines >= 2 && tableLines >= 3;
};

// Fonction de conversion des tableaux texte en Markdown
const convertTextTableToMarkdown = (content) => {
  const lines = content.split('\n');
  const result = [];
  let inTable = false;
  let tableLines = [];
  let headers = [];
  let isFirstTable = true;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Détecter le début d'un tableau
    if (trimmed.match(/^-{3,}$/) || trimmed.match(/^-+\s*$/) || trimmed.match(/^_{3,}$/)) {
      if (!inTable) {
        inTable = true;
        // Chercher la ligne d'en-tête avant le séparateur
        for (let j = i - 1; j >= 0; j--) {
          const prevLine = lines[j].trim();
          if (prevLine.length > 0 && !prevLine.match(/^-+$/) && !prevLine.match(/^_{3,}$/)) {
            headers = prevLine.split(/\s{2,}/).filter(h => h.trim().length > 0);
            break;
          }
        }
        tableLines = [];
        continue;
      }
    }
    
    // Détecter la fin d'un tableau
    if (inTable && (trimmed.length === 0 || 
        (i < lines.length - 1 && lines[i + 1].trim().length > 0 && 
         !lines[i + 1].trim().match(/^-+$/) && 
         !lines[i + 1].trim().match(/^_{3,}$/) &&
         !lines[i + 1].trim().includes('  ')))) {
      
      if (tableLines.length > 0) {
        // Convertir le tableau en Markdown
        result.push(convertTableToMarkdown(headers, tableLines, isFirstTable));
        isFirstTable = false;
      }
      
      inTable = false;
      headers = [];
      tableLines = [];
    }
    
    if (inTable && trimmed.length > 0 && !trimmed.match(/^-+$/) && !trimmed.match(/^_{3,}$/)) {
      // Ligne de données du tableau
      const cells = trimmed.split(/\s{2,}/).filter(cell => cell.trim().length > 0);
      if (cells.length > 1) {
        tableLines.push(cells);
      }
    } else if (!inTable) {
      result.push(line);
    }
  }
  
  // Traiter le dernier tableau s'il y en a un
  if (inTable && tableLines.length > 0) {
    result.push(convertTableToMarkdown(headers, tableLines, isFirstTable));
  }
  
  return result.join('\n');
};

// Fonction pour convertir un tableau en format Markdown
const convertTableToMarkdown = (headers, rows, isFirstTable) => {
  if (headers.length === 0 || rows.length === 0) return '';
  
  const result = [];
  
  // En-tête
  result.push('| ' + headers.join(' | ') + ' |');
  
  // Séparateur
  result.push('| ' + headers.map(() => '---').join(' | ') + ' |');
  
  // Lignes de données
  rows.forEach(row => {
    // Ajuster le nombre de colonnes si nécessaire
    const adjustedRow = [...row];
    while (adjustedRow.length < headers.length) {
      adjustedRow.push('');
    }
    while (adjustedRow.length > headers.length) {
      adjustedRow.pop();
    }
    
    result.push('| ' + adjustedRow.join(' | ') + ' |');
  });
  
  // Ajouter un espace après le tableau pour la lisibilité
  result.push('');
  
  return result.join('\n');
};

export default SimpleMarkdownRenderer;
