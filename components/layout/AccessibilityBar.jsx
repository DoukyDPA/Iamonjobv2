'use client';

import { useEffect, useState } from 'react';
import { Volume2, VolumeX, Contrast } from 'lucide-react';

const TEXT_LEVELS = ['sm', 'md', 'lg', 'xl'];

export default function AccessibilityBar({ onReadRequest }) {
  const [textLevel, setTextLevel] = useState(1); // index in TEXT_LEVELS
  const [highContrast, setHighContrast] = useState(false);
  const [reading, setReading] = useState(false);

  // Init depuis localStorage
  useEffect(() => {
    try {
      const t = localStorage.getItem('iamj_text');
      const c = localStorage.getItem('iamj_contrast');
      if (t) setTextLevel(Math.max(0, Math.min(3, Number(t))));
      if (c === '1') setHighContrast(true);
    } catch {}
  }, []);

  // Applique sur <html>
  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute('data-text-size', TEXT_LEVELS[textLevel]);
    try { localStorage.setItem('iamj_text', String(textLevel)); } catch {}
  }, [textLevel]);

  useEffect(() => {
    const html = document.documentElement;
    if (highContrast) html.setAttribute('data-contrast', 'high');
    else html.removeAttribute('data-contrast');
    try { localStorage.setItem('iamj_contrast', highContrast ? '1' : '0'); } catch {}
  }, [highContrast]);

  const decrease = () => setTextLevel((l) => Math.max(0, l - 1));
  const increase = () => setTextLevel((l) => Math.min(TEXT_LEVELS.length - 1, l + 1));

  const toggleRead = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (reading) {
      window.speechSynthesis.cancel();
      setReading(false);
      return;
    }
    const text = onReadRequest?.() || document.querySelector('main')?.innerText || '';
    if (!text.trim()) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'fr-FR';
    utter.onend = () => setReading(false);
    utter.onerror = () => setReading(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
    setReading(true);
  };

  const pill = 'flex items-center gap-1 px-3 py-1.5 rounded-full border border-cream-300 bg-white text-sm font-medium text-teal-700 hover:border-teal-400 hover:text-teal-800 transition-colors';
  const pillActive = 'border-teal-500 bg-teal-50 text-teal-800';

  return (
    <div className="flex items-center gap-2">
      <div className={pill} role="group" aria-label="Taille du texte">
        <button
          type="button"
          onClick={decrease}
          aria-label="Diminuer la taille du texte"
          className="px-1 hover:text-teal-900 disabled:opacity-40"
          disabled={textLevel === 0}
        >A−</button>
        <span aria-hidden="true" className="text-cream-300">|</span>
        <button
          type="button"
          onClick={increase}
          aria-label="Augmenter la taille du texte"
          className="px-1 hover:text-teal-900 disabled:opacity-40"
          disabled={textLevel === TEXT_LEVELS.length - 1}
        >A+</button>
      </div>

      <button
        type="button"
        onClick={() => setHighContrast((v) => !v)}
        aria-pressed={highContrast}
        className={`${pill} ${highContrast ? pillActive : ''}`}
      >
        <Contrast className="w-4 h-4" /> Contraste élevé
      </button>

      <button
        type="button"
        onClick={toggleRead}
        aria-pressed={reading}
        className={`${pill} ${reading ? pillActive : ''}`}
      >
        {reading ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        {reading ? 'Stop' : 'Lire'}
      </button>
    </div>
  );
}
