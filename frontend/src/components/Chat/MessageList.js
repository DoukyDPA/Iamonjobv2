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

    // Détection des tableaux dans le contenu
    const hasTable = detectAnyTable(content);
    
    if (hasTable) {
      // Convertir les tableaux en Markdown valide
      const processedContent = convertAnyTableToMarkdown(content);
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

export default MessageList;
