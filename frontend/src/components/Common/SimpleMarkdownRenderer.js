import React from 'react';
import ReactMarkdown from 'react-markdown';
import './SimpleMarkdownRenderer.css';

const markdownComponents = {
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
};

const SimpleMarkdownRenderer = ({ content, serviceType = 'default' }) => {
  if (!content) return null;

  // Détection des tableaux dans le contenu
  const hasTable = detectAnyTable(content);
  
  if (hasTable) {
    // Convertir les tableaux en Markdown valide
    const processedContent = convertAnyTableToMarkdown(content);
    const segments = splitMarkdownByTables(processedContent);

    return (
      <div className={`markdown-renderer ${serviceType}`}>
        {segments.map((segment, index) =>
          segment.type === 'table'
            ? renderTableSegment(segment.lines, serviceType, index)
            : <ReactMarkdown key={index} components={markdownComponents}>{segment.content}</ReactMarkdown>
        )}
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

// Fonction de détection unifiée des tableaux
const detectAnyTable = (content) => {
  const lines = content.split('\n');
  let hasVerticalBars = false;
  let hasTableStructure = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Détecter les lignes avec des barres verticales
    if (trimmed.includes('|')) {
      hasVerticalBars = true;
      
      // Vérifier si c'est une ligne de tableau (au moins 2 barres)
      const barCount = (trimmed.match(/\|/g) || []).length;
      if (barCount >= 2) {
        hasTableStructure = true;
      }
    }
    
    // Détecter les séparateurs de tableau (tirets longs)
    if (trimmed.match(/^-{10,}/) || trimmed.match(/^_{10,}/)) {
      hasTableStructure = true;
    }
  }
  
  return hasVerticalBars && hasTableStructure;
};

// Fonction de conversion unifiée des tableaux en Markdown
const convertAnyTableToMarkdown = (content) => {
  const lines = content.split('\n');
  const result = [];
  let inTable = false;
  let tableRows = [];
  let headers = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Détecter le début d'un tableau (ligne avec des barres verticales)
    if (trimmed.includes('|') && (trimmed.match(/\|/g) || []).length >= 2) {
      if (!inTable) {
        inTable = true;
        // Extraire les en-têtes de la ligne actuelle
        headers = trimmed.split('|').map(h => h.trim()).filter(h => h.length > 0);
        tableRows = [];
        continue;
      }
    }
    
    // Détecter les séparateurs de tableau (lignes de tirets)
    if (inTable && (trimmed.match(/^-{10,}/) || trimmed.match(/^_{10,}/))) {
      continue; // Ignorer les lignes de séparateurs
    }
    
    // Détecter la fin d'un tableau
    if (inTable && trimmed.length === 0) {
      // Ligne vide = fin du tableau
      if (tableRows.length > 0) {
        result.push(convertTableToMarkdown(headers, tableRows));
      }
      inTable = false;
      headers = [];
      tableRows = [];
      result.push(line); // Garder la ligne vide
      continue;
    }
    
    if (inTable && trimmed.length > 0) {
      // Ligne de données du tableau
      if (trimmed.includes('|')) {
        const cells = trimmed.split('|').map(cell => cell.trim()).filter(cell => cell.length > 0);
        if (cells.length > 1) {
          tableRows.push(cells);
        }
      }
    } else if (!inTable) {
      result.push(line);
    }
  }
  
  // Traiter le dernier tableau s'il y en a un
  if (inTable && tableRows.length > 0) {
    result.push(convertTableToMarkdown(headers, tableRows));
  }
  
  return result.join('\n');
};

// Fonction pour convertir un tableau en format Markdown
const convertTableToMarkdown = (headers, rows) => {
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

const splitMarkdownByTables = (content) => {
  const lines = content.split('\n');
  const segments = [];
  let i = 0;
  while (i < lines.length) {
    if (isTableRow(lines[i]) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const tableLines = [lines[i], lines[i + 1]];
      i += 2;
      while (i < lines.length && isTableRow(lines[i])) {
        tableLines.push(lines[i]);
        i++;
      }
      segments.push({ type: 'table', lines: tableLines });
    } else {
      const textLines = [lines[i]];
      i++;
      while (
        i < lines.length &&
        !(isTableRow(lines[i]) && i + 1 < lines.length && isTableSeparator(lines[i + 1]))
      ) {
        textLines.push(lines[i]);
        i++;
      }
      segments.push({ type: 'text', content: textLines.join('\n') });
    }
  }
  return segments;
};

const isTableRow = (line) => /^\s*\|.*\|\s*$/.test(line);
const isTableSeparator = (line) => /^\s*\|?(?:\s*-+\s*\|)+\s*$/.test(line);

const parseMarkdownTable = (lines) => {
  const [headerLine, , ...rowLines] = lines;
  const headers = headerLine.split('|').slice(1, -1).map((h) => h.trim());
  const rows = rowLines.map((row) =>
    row
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim())
  );
  return { headers, rows };
};

const renderTableSegment = (lines, serviceType, key) => {
  const { headers, rows } = parseMarkdownTable(lines);
  return (
    <div key={key} className="table-wrapper">
      <table
        className={`markdown-table ${
          serviceType === 'reconversion_analysis' ? 'metiers-table' : ''
        }`}
      >
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="markdown-th">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="markdown-td">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SimpleMarkdownRenderer;

