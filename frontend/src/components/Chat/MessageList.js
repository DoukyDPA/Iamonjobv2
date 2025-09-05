import React from 'react';
import ReactMarkdown from 'react-markdown';
import { FiUser, FiBot, FiCopy, FiClock } from 'react-icons/fi';
import './MessageList.css';
import '../Common/SimpleMarkdownRenderer.css';

const MessageList = ({ messages }) => {
  if (!messages || messages.length === 0) {
    return (
      <div className="message-list empty">
        <div className="empty-state">
          <div className="empty-icon">💬</div>
          <h3>Aucun message</h3>
          <p>Commencez une conversation avec l'assistant IA</p>
        </div>
      </div>
    );
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const copyToClipboard = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
      // Optionnel: afficher une notification de succès
    } catch (err) {
      console.error('Erreur lors de la copie:', err);
    }
  };

  const renderMessageContent = (content, role) => {
    if (!content) return null;

    // Détection des tableaux dans le contenu (Markdown et format texte)
    const hasMarkdownTable = content.includes('|') && content.includes('\n|');
    const hasTextTable = detectTextTable(content);
    
    if (hasMarkdownTable || hasTextTable) {
      // Convertir les tableaux texte en Markdown si nécessaire
      const processedContent = hasTextTable ? convertTextTableToMarkdown(content) : content;
      // Utiliser ReactMarkdown pour les tableaux
      return (
        <div className="markdown-content">
          <ReactMarkdown
            components={{
              table: ({ children }) => (
                <div className="table-wrapper">
                  <table className="markdown-table">{children}</table>
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

    // Pour le contenu simple sans tableaux, utiliser le rendu basique
    return (
      <div className="plain-content">
        {content.split('\n').map((line, index) => (
          <div key={index}>
            {line}
            {index < content.split('\n').length - 1 && <br />}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="message-list">
      {messages.map((message, index) => {
        const isUser = message.role === 'user';
        const isAssistant = message.role === 'assistant';
        const isError = message.error;
        const isAction = message.type === 'quick_action';
        const isUpload = message.type === 'document_upload';

        return (
          <div
            key={index}
            className={`message ${
              isUser ? 'user-message' : 
              isError ? 'error-message' :
              isAction ? 'quick_action-message' :
              isUpload ? 'document_upload-message' :
              'assistant-message'
            }`}
          >
            {/* En-tête du message */}
            <div className="message-header">
              <div className="message-info">
                <div className={`message-icon ${isUser ? 'user-icon' : 'assistant-icon'}`}>
                  {isUser ? <FiUser /> : <FiBot />}
                </div>
                <span className="message-sender">
                  {isUser ? 'Vous' : 'Assistant IA'}
                </span>
                {isAction && <span className="action-badge">Action</span>}
                {isUpload && <span className="upload-badge">Upload</span>}
                {isError && <span className="error-badge">Erreur</span>}
              </div>
              
              <div className="message-actions">
                <span className="message-time">
                  <FiClock />
                  {formatTime(message.timestamp)}
                </span>
                <button
                  className="copy-btn"
                  onClick={() => copyToClipboard(message.content)}
                  title="Copier le message"
                >
                  <FiCopy />
                </button>
              </div>
            </div>

            {/* Corps du message */}
            <div className="message-body">
              {renderMessageContent(message.content, message.role)}
            </div>

            {/* Pied de message (si nécessaire) */}
            {message.documentInfo && (
              <div className="message-footer">
                <div className="document-info">
                  {message.documentInfo}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Fonction de détection des tableaux texte
const detectTextTable = (content) => {
  const lines = content.split('\n');
  let tableLines = 0;
  let separatorLines = 0;
  let potentialTableBlocks = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Détecter les lignes de séparateurs avec des tirets (plus flexible)
    if (trimmed.match(/^-{3,}/) || trimmed.match(/^-+\s*$/) || trimmed.match(/^_{3,}/) || 
        trimmed.match(/^-{10,}/) || trimmed.match(/^_{10,}/)) {
      separatorLines++;
    }
    
    // Détecter les lignes de contenu de tableau (plus flexible)
    if (trimmed.length > 0 && 
        (trimmed.includes('  ') || 
         trimmed.match(/^[A-Za-z].*\s{2,}[A-Za-z]/) ||
         trimmed.match(/^[A-Za-z].*\s{2,}[A-Za-z].*\s{2,}[A-Za-z]/) ||
         trimmed.match(/^[A-Za-z].*\s{3,}[A-Za-z]/))) {
      tableLines++;
    }
    
    // Détecter les blocs de tableau potentiels (ligne avec tirets suivie de lignes avec espaces)
    if (trimmed.match(/^-{3,}/) || trimmed.match(/^_{3,}/)) {
      // Vérifier les lignes suivantes pour voir si c'est un tableau
      let hasTableContent = false;
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const nextLine = lines[j].trim();
        if (nextLine.length > 0 && 
            (nextLine.includes('  ') || nextLine.match(/^[A-Za-z].*\s{2,}[A-Za-z]/))) {
          hasTableContent = true;
          break;
        }
      }
      if (hasTableContent) {
        potentialTableBlocks++;
      }
    }
  }
  
  // Un tableau texte a des séparateurs ET du contenu structuré
  return (separatorLines >= 1 && tableLines >= 2) || potentialTableBlocks >= 1;
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
    
    // Détecter le début d'un tableau (plus flexible)
    if (trimmed.match(/^-{3,}/) || trimmed.match(/^-+\s*$/) || trimmed.match(/^_{3,}/) ||
        trimmed.match(/^-{10,}/) || trimmed.match(/^_{10,}/)) {
      if (!inTable) {
        inTable = true;
        // Chercher la ligne d'en-tête avant le séparateur
        for (let j = i - 1; j >= 0; j--) {
          const prevLine = lines[j].trim();
          if (prevLine.length > 0 && 
              !prevLine.match(/^-+$/) && 
              !prevLine.match(/^_{3,}$/) &&
              !prevLine.match(/^-{3,}/) &&
              !prevLine.match(/^_{3,}/)) {
            // Essayer différents séparateurs pour les en-têtes
            headers = prevLine.split(/\s{2,}/).filter(h => h.trim().length > 0);
            if (headers.length < 2) {
              // Essayer avec des espaces simples si pas assez de colonnes
              headers = prevLine.split(/\s+/).filter(h => h.trim().length > 0);
            }
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
         !lines[i + 1].trim().match(/^-{3,}/) &&
         !lines[i + 1].trim().match(/^_{3,}/) &&
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
    
    if (inTable && trimmed.length > 0 && 
        !trimmed.match(/^-+$/) && 
        !trimmed.match(/^_{3,}$/) &&
        !trimmed.match(/^-{3,}/) &&
        !trimmed.match(/^_{3,}/)) {
      // Ligne de données du tableau
      let cells = trimmed.split(/\s{2,}/).filter(cell => cell.trim().length > 0);
      if (cells.length < 2) {
        // Essayer avec des espaces simples si pas assez de colonnes
        cells = trimmed.split(/\s+/).filter(cell => cell.trim().length > 0);
      }
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

export default MessageList;
