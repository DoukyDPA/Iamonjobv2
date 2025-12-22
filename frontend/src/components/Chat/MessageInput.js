import React, { useState, useRef, useEffect } from 'react';
import { FiSend, FiMic } from 'react-icons/fi';
import './MessageInput.css'; // Import du CSS externe

const MessageInput = ({ value, onChange, onSend, disabled }) => {
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef(null);

  // Auto-resize intelligent
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 150)}px`;
    }
  }, [value]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (value.trim() && !disabled) {
      onSend(e);
      // Reset height après envoi
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Gestion vocale
  const toggleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Votre navigateur ne supporte pas la saisie vocale.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      window.speechRecognitionInstance?.stop();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    window.speechRecognitionInstance = recognition;
    
    recognition.lang = 'fr-FR';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      // Ajoute un espace si du texte existe déjà
      const newText = value ? `${value} ${transcript}` : transcript;
      onChange(newText);
    };

    recognition.start();
  };

  return (
    <div className="message-input-container">
      {isListening && (
        <div className="voice-indicator">
          <span>●</span> Écoute en cours...
        </div>
      )}

      <form onSubmit={handleSubmit} className="input-form">
        <div className="textarea-wrapper">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={disabled ? 'L\'IA écrit...' : 'Posez votre question...'}
            disabled={disabled}
            className="chat-textarea"
            rows={1}
          />
          
          <button
            type="button"
            onClick={toggleVoiceInput}
            disabled={disabled}
            className={`voice-btn ${isListening ? 'listening' : ''}`}
            title="Saisie vocale"
          >
            <FiMic size={20} />
          </button>
        </div>

        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="send-btn"
          title="Envoyer"
        >
          <FiSend size={20} />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
