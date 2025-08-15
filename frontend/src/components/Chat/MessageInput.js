// REMPLACER DANS : frontend/src/components/Chat/MessageInput.js
// Version simplifiée SANS les QuickActions hardcodées

import React, { useState, useRef, useEffect } from 'react';
import { FiSend, FiMic } from 'react-icons/fi';

const MessageInput = ({ value, onChange, onSend, disabled }) => {
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef(null);

  // Auto-resize du textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [value]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (value.trim() && !disabled) {
      onSend(e);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Reconnaissance vocale (si supportée)
  const toggleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('La reconnaissance vocale n\'est pas supportée par votre navigateur');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onChange(value + transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <div style={{
      borderTop: '1px solid #e5e7eb',
      background: 'white',
      padding: '1rem'
    }}>
      {/* Zone de saisie principale */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
        {/* Zone de texte */}
        <div style={{ flex: 1, position: 'relative' }}>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={disabled ? 'Traitement en cours...' : 'Écrivez votre message...'}
            disabled={disabled}
            style={{
              width: '100%',
              minHeight: '44px',
              maxHeight: '120px',
              padding: '0.75rem 3rem 0.75rem 0.75rem',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              fontSize: '1rem',
              lineHeight: '1.5',
              resize: 'none',
              outline: 'none',
              transition: 'border-color 0.2s ease',
              fontFamily: 'inherit'
            }}
            onFocus={(e) => e.target.style.borderColor = '#0a6b79'}
            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
          />
          
          {/* Bouton microphone dans le textarea */}
          <button
            type="button"
            onClick={toggleVoiceInput}
            disabled={disabled}
            title="Reconnaissance vocale"
            style={{
              position: 'absolute',
              right: '0.5rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: isListening ? '#ef4444' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: isListening ? 'white' : '#6b7280',
              padding: '0.5rem',
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              opacity: disabled ? 0.5 : 1
            }}
          >
            <FiMic style={{ fontSize: '1.1rem' }} />
          </button>
        </div>

        {/* Bouton d'envoi */}
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          style={{
            background: (disabled || !value.trim()) ? '#e5e7eb' : '#0a6b79',
            color: (disabled || !value.trim()) ? '#9ca3af' : 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '0.75rem',
            cursor: (disabled || !value.trim()) ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '44px',
            height: '44px'
          }}
          onMouseEnter={(e) => {
            if (!disabled && value.trim()) {
              e.target.style.background = '#085a66';
            }
          }}
          onMouseLeave={(e) => {
            if (!disabled && value.trim()) {
              e.target.style.background = '#0a6b79';
            }
          }}
        >
          <FiSend style={{ fontSize: '1.1rem' }} />
        </button>
      </form>

      {/* Indicateur de reconnaissance vocale */}
      {isListening && (
        <div style={{
          marginTop: '0.5rem',
          padding: '0.5rem',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#dc2626',
          fontSize: '0.9rem',
          textAlign: 'center'
        }}>
          🎤 Écoute en cours... Parlez maintenant
        </div>
      )}
    </div>
  );
};

export default MessageInput;
