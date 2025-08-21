import React, { useState, useRef, useEffect } from 'react';

const SimpleMarkdownRenderer = ({ content, serviceType = 'default' }) => {
  // TOUS les hooks doivent être appelés AVANT tout return
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef(null);
  const [showReadMore, setShowReadMore] = useState(false);

  // Styles selon le type de service
  const getServiceStyles = () => {
    const styles = {
      matching_cv_offre: { background: '#f0f9ff', borderColor: '#0ea5e9' },
      cover_letter: { background: '#fffbeb', borderColor: '#f59e0b' },
      interview_prep: { background: '#f0fdf4', borderColor: '#10b981' },
      default: { background: '#f8fafc', borderColor: '#e5e7eb' }
    };
    return styles[serviceType] || styles.default;
  };

  // Nettoyage et balisage des titres
  const preprocessContent = (text) => {
    if (!text || typeof text !== 'string') return '';
    return text
      // Supprimer les formules de politesse
      .replace(/^Bonjour,?\n*/gm, '')
      .replace(/Cordialement,?\n*\[.*\].*$/gm, '')
      .replace(/Expert en.*$/gm, '')
      .replace(/Merci.*$/gm, '')
      .replace(/Bien cordialement.*$/gm, '')
      .replace(/Sincèrement.*$/gm, '')
      
      // Nettoyer les titres Markdown
      .replace(/^[ \t]*(#+)\s*(.*)$/gm, (match, hashes, title) => {
        const level = Math.min(hashes.length, 3);
        return `\n[[H${level}]]${title.trim()}`;
      })
      
      // Nettoyer les listes mal formatées
      .replace(/^[ \t]*[-•*]\s*/gm, '• ')
      .replace(/^[ \t]*[0-9]+\.\s*/gm, (match) => match.trim())
      
      // Nettoyer les espaces multiples et lignes vides
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .trim();
  };

  // Rendu JSX
  const renderContent = (text) => {
    const processedText = preprocessContent(text);
    if (!processedText) return null;
    const lines = processedText.split(/\n/);
    const elements = [];
    let currentSection = [];
    let inTable = false;
    let tableLines = [];
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Détection de début de tableau
      if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
        if (!inTable) {
          // Fermer la section précédente
          if (currentSection.length > 0) {
            elements.push(renderParagraph(currentSection.join(' '), `p-${index}`));
            currentSection = [];
          }
          inTable = true;
          tableLines = [];
        }
        tableLines.push(trimmedLine);
        return;
      }
      
      // Détection de fin de tableau (ligne vide ou autre contenu)
      if (inTable && !trimmedLine.startsWith('|')) {
        if (tableLines.length > 0) {
          elements.push(renderTable(tableLines, `table-${index}`));
          tableLines = [];
        }
        inTable = false;
      }
      
      if (!inTable) {
        if (!trimmedLine) {
          if (currentSection.length > 0) {
            elements.push(renderParagraph(currentSection.join(' '), `p-${index}`));
            currentSection = [];
          }
          return;
        }
        
        const hMatch = trimmedLine.match(/^\[\[H([123])\]\](.*)$/);
        if (hMatch) {
          if (currentSection.length > 0) {
            elements.push(renderParagraph(currentSection.join(' '), `p-${index}`));
            currentSection = [];
          }
          const level = parseInt(hMatch[1], 10);
          const title = hMatch[2].trim();
          const style = {
            1: { fontSize: '2.2rem', fontWeight: '800', color: 'var(--primary-color)', marginTop: '2.2rem', marginBottom: '1.2rem', lineHeight: '1.15', border: 'none', padding: 0 },
            2: { fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary-color)', marginTop: '1.7rem', marginBottom: '1rem', lineHeight: '1.18', border: 'none', padding: 0 },
            3: { fontSize: '1.15rem', fontWeight: '700', color: 'var(--primary-color)', marginTop: '1.2rem', marginBottom: '0.7rem', lineHeight: '1.2', border: 'none', padding: 0 }
          }[level];
          const Tag = `h${level}`;
          elements.push(
            <Tag key={`h${level}-${index}`} style={style}>{title}</Tag>
          );
        }
        else if (/^[0-9]+\.\s/.test(trimmedLine) || /^[-•*]\s/.test(trimmedLine)) {
          if (currentSection.length > 0) {
            elements.push(renderParagraph(currentSection.join(' '), `p-${index}`));
            currentSection = [];
          }
          const listText = trimmedLine.replace(/^[0-9]+\.\s|^[-•*]\s/, '');
          elements.push(
            <div key={`li-${index}`} style={{
              display: 'flex',
              alignItems: 'flex-start',
              marginBottom: '0.75rem',
              paddingLeft: '1.5rem',
              background: 'none',
              border: 'none',
              borderRadius: 0
            }}>
              <span style={{
                color: 'var(--primary-color)',
                fontWeight: 'bold',
                marginRight: '0.75rem',
                minWidth: '1.2rem',
                fontSize: '1.1rem'
              }}>•</span>
              <span style={{ 
                flex: 1, 
                lineHeight: '1.6',
                color: '#374151'
              }}>
                {renderInlineFormatting(listText)}
              </span>
            </div>
          );
        }
        else if (trimmedLine === '---' || trimmedLine === '***') {
          if (currentSection.length > 0) {
            elements.push(renderParagraph(currentSection.join(' '), `p-${index}`));
            currentSection = [];
          }
        }
        else {
          currentSection.push(trimmedLine);
        }
      }
    });
    
    // Fermer le tableau si on est encore dedans
    if (inTable && tableLines.length > 0) {
      elements.push(renderTable(tableLines, 'table-final'));
    }
    
    if (currentSection.length > 0) {
      elements.push(renderParagraph(currentSection.join(' '), 'final-p'));
    }
    return elements;
  };

  const renderParagraph = (text, key) => (
    <p key={key} style={{
      marginBottom: '1rem',
      lineHeight: '1.7',
      color: '#374151',
      textAlign: 'justify'
    }}>
      {renderInlineFormatting(text)}
    </p>
  );

  const renderInlineFormatting = (text) => {
    if (!text || typeof text !== 'string') return text;
    
    // Debug optionnel - commenté pour la production
    // console.log('🔗 Debug - Traitement du texte:', text);
    
    const parts = [];
    let remaining = text;
    let key = 0;
    let hasLinks = false;
    
    // Traiter tous les liens Markdown [texte](url) de manière récursive
    while (remaining.includes('[') && remaining.includes('](') && remaining.includes(')')) {
      const start = remaining.indexOf('[');
      const endBracket = remaining.indexOf(']', start);
      const startUrl = remaining.indexOf('(', endBracket);
      const endUrl = remaining.indexOf(')', startUrl);
      
      if (start !== -1 && endBracket !== -1 && startUrl !== -1 && endUrl !== -1) {
        if (start > 0) {
          parts.push(remaining.substring(0, start));
        }
        const linkText = remaining.substring(start + 1, endBracket);
        const linkUrl = remaining.substring(startUrl + 1, endUrl);
        
        // console.log('🔗 Debug - Lien trouvé:', { linkText, linkUrl });
        
        // Vérifier que c'est bien un lien valide
        if (linkUrl && linkUrl.trim() && linkText && linkText.trim()) {
          hasLinks = true;
          parts.push(
            <a key={`link-${key++}`} href={linkUrl} target="_blank" rel="noopener noreferrer" style={{
              color: '#0a6b79',
              textDecoration: 'none',
              fontWeight: '500',
              borderBottom: '1px solid transparent',
              transition: 'border-bottom-color 0.2s'
            }} onMouseEnter={(e) => e.target.style.borderBottomColor = '#0a6b79'} onMouseLeave={(e) => e.target.style.borderBottomColor = 'transparent'}>
              {linkText}
            </a>
          );
        } else {
          // Si ce n'est pas un lien valide, garder le texte original
          parts.push(remaining.substring(start, endUrl + 1));
        }
        remaining = remaining.substring(endUrl + 1);
      } else {
        break;
      }
    }
    
    // Traiter le texte en gras **texte** et __texte__
    while (remaining.includes('**') || remaining.includes('__')) {
      let start, end, marker;
      
      if (remaining.includes('**')) {
        start = remaining.indexOf('**');
        end = remaining.indexOf('**', start + 2);
        marker = '**';
      } else {
        start = remaining.indexOf('__');
        end = remaining.indexOf('__', start + 2);
        marker = '__';
      }
      
      if (end !== -1) {
        if (start > 0) {
          parts.push(remaining.substring(0, start));
        }
        const boldText = remaining.substring(start + marker.length, end);
        parts.push(
          <strong key={`bold-${key++}`} style={{
            fontWeight: '700',
            color: '#1f2937'
          }}>{boldText}</strong>
        );
        remaining = remaining.substring(end + marker.length);
      } else {
        break;
      }
    }
    
    // Traiter le texte en italique *texte* et _texte_
    while (remaining.includes('*') || remaining.includes('_')) {
      let start, end, marker;
      
      if (remaining.includes('*') && !remaining.startsWith('*')) {
        start = remaining.indexOf('*');
        end = remaining.indexOf('*', start + 1);
        marker = '*';
      } else if (remaining.includes('_') && !remaining.startsWith('_')) {
        start = remaining.indexOf('_');
        end = remaining.indexOf('_', start + 1);
        marker = '_';
      } else {
        break;
      }
      
      if (end !== -1 && start < end) {
        if (start > 0) {
          parts.push(remaining.substring(0, start));
        }
        const italicText = remaining.substring(start + 1, end);
        parts.push(
          <em key={`italic-${key++}`} style={{
            fontStyle: 'italic',
            color: '#4b5563'
          }}>{italicText}</em>
        );
        remaining = remaining.substring(end + 1);
      } else {
        break;
      }
    }
    
    // Traiter le code inline `code`
    while (remaining.includes('`')) {
      const start = remaining.indexOf('`');
      const end = remaining.indexOf('`', start + 1);
      if (end !== -1) {
        if (start > 0) {
          parts.push(remaining.substring(0, start));
        }
        const codeText = remaining.substring(start + 1, end);
        parts.push(
          <code key={`code-${key++}`} style={{
            backgroundColor: '#f3f4f6',
            padding: '0.125rem 0.25rem',
            borderRadius: '3px',
            fontFamily: 'monospace',
            fontSize: '0.875em',
            color: '#1f2937'
          }}>{codeText}</code>
        );
        remaining = remaining.substring(end + 1);
      } else {
        break;
      }
    }
    
    // Traiter les listes numérotées et à puces qui n'ont pas été traitées
    if (remaining.match(/^[0-9]+\.\s/) || remaining.match(/^[-•*]\s/)) {
      const listText = remaining.replace(/^[0-9]+\.\s|^[-•*]\s/, '');
      parts.push(
        <span key={`list-${key++}`} style={{
          display: 'inline-flex',
          alignItems: 'flex-start',
          marginBottom: '0.5rem'
        }}>
          <span style={{
            color: 'var(--primary-color)',
            fontWeight: 'bold',
            marginRight: '0.5rem',
            minWidth: '1rem'
          }}>•</span>
          <span>{listText}</span>
        </span>
      );
      remaining = '';
    }
    
    if (remaining) {
      parts.push(remaining);
    }
    
    // Si on a trouvé des éléments formatés, retourner les parties, sinon retourner le texte original
    if (hasLinks || parts.length > 1) {
      // console.log('🔗 Debug - Parties trouvées avec formatage:', parts);
      return parts;
    } else {
      // console.log('🔗 Debug - Aucun formatage trouvé, retour du texte original');
      return text;
    }
  };

  const renderTable = (tableLines, key) => {
    if (tableLines.length < 2) return null;
    
    // console.log('🔍 Debug - Lignes du tableau reçues:', tableLines);
    
    const rows = tableLines.map(line => {
      // Enlever les | au début et à la fin
      const cleanLine = line.replace(/^\||\|$/g, '');
      // Diviser par les | et nettoyer chaque cellule
      return cleanLine.split('|').map(cell => cell.trim());
    });
    
    if (rows.length < 2) return null;
    
    const headers = rows[0];
    const dataRows = rows.slice(1);
    
    // Debug optionnel - commenté pour la production
    // console.log('🔍 Debug tableau - Headers:', headers);
    // console.log('🔍 Debug tableau - DataRows:', dataRows);
    
    return (
      <div key={key} style={{
        margin: '2rem 0',
        overflowX: 'auto',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.9rem'
        }}>
          <thead>
            <tr style={{
              backgroundColor: '#f9fafb',
              borderBottom: '2px solid #e5e7eb'
            }}>
              {headers.map((header, index) => (
                <th key={index} style={{
                  padding: '0.75rem',
                  textAlign: 'left',
                  fontWeight: '600',
                  color: '#374151',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  {renderInlineFormatting(header)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, rowIndex) => (
              <tr key={rowIndex} style={{
                backgroundColor: rowIndex % 2 === 0 ? '#ffffff' : '#f9fafb',
                borderBottom: '1px solid #f3f4f6'
              }}>
                {row.map((cell, cellIndex) => {
                  // console.log(`🔍 Debug cellule [${rowIndex}][${cellIndex}]:`, cell);
                  return (
                    <td key={cellIndex} style={{
                      padding: '0.75rem',
                      borderBottom: '1px solid #f3f4f6',
                      verticalAlign: 'top',
                      lineHeight: '1.5'
                    }}>
                      {renderInlineFormatting(cell)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const serviceStyles = getServiceStyles();
  const containerStyle = {
    background: serviceStyles.background,
    border: `1px solid ${serviceStyles.borderColor}`,
    borderRadius: '12px',
    padding: '2rem',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
    maxHeight: expanded ? 'none' : '400px',
    overflow: expanded ? 'visible' : 'hidden',
    position: 'relative',
    transition: 'max-height 0.3s'
  };

  useEffect(() => {
    if (!expanded && contentRef.current && typeof contentRef.current.scrollHeight === 'number') {
      setShowReadMore(contentRef.current.scrollHeight > 400);
    } else {
      setShowReadMore(false);
    }
  }, [expanded, content]);

  // Le return doit venir APRES tous les hooks
  if (!content || typeof content !== 'string' || content.trim() === '') {
    return <div>Aucun contenu à afficher</div>;
  }

  return (
    <div style={containerStyle} ref={contentRef}>
      {renderContent(content)}
      {!expanded && showReadMore && (
        <div style={{
          position: 'absolute',
          left: 0, right: 0, bottom: 0,
          height: '80px',
          background: 'linear-gradient(to top, rgba(248,248,248,0.95) 60%, transparent)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          pointerEvents: 'none'
        }} />
      )}
      {!expanded && showReadMore && (
        <button
          style={{
            position: 'absolute',
            left: 0, right: 0, bottom: '10px',
            margin: '0 auto',
            zIndex: 2,
            background: 'var(--primary-color)',
            color: 'white',
            border: 'none',
            borderRadius: '20px',
            padding: '0.5rem 1.5rem',
            fontWeight: 600,
            fontSize: '1rem',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            pointerEvents: 'auto'
          }}
          onClick={() => setExpanded(true)}
        >Lire la suite</button>
      )}
    </div>
  );
};

export default SimpleMarkdownRenderer;
