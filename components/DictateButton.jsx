'use client';

// ════════════════════════════════════════════════════════════════════════════
// Bouton « Dicter » : la personne parle, le texte s'ajoute dans la case.
// Reconnaissance vocale du navigateur (Chrome, Edge, Safari récents), sans IA
// ni coût. Le bouton ne s'affiche pas si le navigateur ne sait pas faire.
//
// Usage : <DictateButton value={texte} onChange={setTexte} />
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';

export default function DictateButton({ value = '', onChange, className = '', label = 'Dicter' }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [err, setErr] = useState(null);
  const recRef = useRef(null);
  const baseRef = useRef('');
  const finalRef = useRef('');

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition));
    return () => { try { recRef.current?.stop(); } catch { /* déjà arrêté */ } };
  }, []);

  if (!supported) return null;

  function start() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = 'fr-FR';
    rec.continuous = true;
    rec.interimResults = true;
    baseRef.current = value ? value.replace(/\s*$/, ' ') : '';
    finalRef.current = '';
    rec.onresult = (ev) => {
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const t = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) finalRef.current += t;
        else interim += t;
      }
      onChange?.(baseRef.current + finalRef.current + interim);
    };
    rec.onerror = (ev) => {
      if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
        setErr("Le micro n'est pas autorisé. Autorisez-le dans votre navigateur, puis réessayez.");
      } else if (ev.error !== 'no-speech' && ev.error !== 'aborted') {
        setErr('La dictée a été interrompue. Réessayez.');
      }
    };
    rec.onend = () => {
      setListening(false);
      onChange?.((baseRef.current + finalRef.current).replace(/\s+$/, ''));
    };
    recRef.current = rec;
    setErr(null);
    try {
      rec.start();
      setListening(true);
    } catch {
      setErr('La dictée ne démarre pas. Réessayez.');
    }
  }

  function stop() {
    try { recRef.current?.stop(); } catch { /* déjà arrêté */ }
  }

  return (
    <span className={`inline-flex flex-col ${className}`}>
      <button
        type="button"
        onClick={listening ? stop : start}
        aria-pressed={listening}
        aria-label={listening ? 'Arrêter la dictée' : 'Dicter au lieu d’écrire'}
        title={listening ? 'Arrêter la dictée' : 'Parler au lieu d’écrire'}
        className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${
          listening
            ? 'bg-rose-600 border-rose-600 text-white animate-pulse'
            : 'bg-white border-teal-200 text-teal-800 hover:bg-teal-50'
        }`}
      >
        {listening ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        {listening ? (label ? 'Arrêter' : '') : label}
      </button>
      {err && <span className="mt-1 text-xs text-rose-600">{err}</span>}
    </span>
  );
}
