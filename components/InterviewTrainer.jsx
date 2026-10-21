'use client';

// ════════════════════════════════════════════════════════════════════════════
// S'entraîner à l'entretien, à voix haute.
//
// L'outil lit la question du recruteur (voix du navigateur), la personne
// répond en parlant (dictée) ou en écrivant, puis reçoit un retour : ce qui
// marche, ce qu'on peut améliorer, et un exemple de réponse tiré de la sienne.
// Rien n'est enregistré : c'est un entraînement.
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { Volume2, Loader2, ChevronLeft, ChevronRight, Mic, RotateCcw } from 'lucide-react';
import DictateButton from './DictateButton';

function speak(text) {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return false;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    u.rate = 0.95;
    const fr = synth.getVoices().find((v) => v.lang?.startsWith('fr'));
    if (fr) u.voice = fr;
    synth.speak(u);
    return true;
  } catch { return false; }
}

export default function InterviewTrainer({ questions = [], intitule = '' }) {
  const [i, setI] = useState(0);
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [fb, setFb] = useState(null);
  const [err, setErr] = useState(null);
  const [canSpeak, setCanSpeak] = useState(false);

  useEffect(() => { setCanSpeak(typeof window !== 'undefined' && 'speechSynthesis' in window); }, []);
  useEffect(() => () => { try { window.speechSynthesis?.cancel(); } catch { /* rien */ } }, []);

  if (!questions.length) return null;
  const q = questions[Math.min(i, questions.length - 1)];

  const go = (n) => { setI(n); setAnswer(''); setFb(null); setErr(null); try { window.speechSynthesis?.cancel(); } catch { /* rien */ } };

  async function evaluer() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'mistral', action: 'interview_feedback', params: { intitule, question: q.question, why: q.why, answer } }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Le retour n’a pas pu être préparé.');
      setFb(d.result);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const note = typeof fb?.note === 'number' ? Math.max(1, Math.min(5, Math.round(fb.note))) : null;

  return (
    <div className="rounded-2xl border-2 border-teal-200 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="font-bold text-teal-800 flex items-center gap-2"><Mic className="w-4 h-4" /> S'entraîner à voix haute</h3>
        <span className="text-xs text-teal-700/70">Question {i + 1} sur {questions.length}</span>
      </div>

      <p className="text-lg font-semibold text-teal-900">« {q.question} »</p>
      {canSpeak && (
        <button type="button" onClick={() => speak(q.question)} className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-200 text-sm font-semibold text-teal-800 hover:bg-teal-50">
          <Volume2 className="w-4 h-4" /> Écouter la question
        </button>
      )}

      <div className="mt-4">
        <div className="flex items-end justify-between gap-2 mb-1">
          <label htmlFor={`rep-${i}`} className="text-sm font-semibold text-teal-800">Votre réponse</label>
          <DictateButton value={answer} onChange={setAnswer} label="Répondre en parlant" />
        </div>
        <textarea
          id={`rep-${i}`}
          rows={5}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Répondez comme si le recruteur était en face de vous. Vous pouvez parler : touchez « Répondre en parlant »."
          className="w-full p-3 text-sm rounded-xl border border-cream-300 bg-cream-50/40 focus:ring-2 focus:ring-teal-400 outline-none"
        />
        <div className="mt-2 flex justify-end">
          <button type="button" onClick={evaluer} disabled={busy || answer.trim().length < 15} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:bg-teal-200">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Avoir un retour
          </button>
        </div>
        {err && <p className="mt-2 text-sm text-rose-600">{err}</p>}
      </div>

      {fb && (
        <div className="mt-4 rounded-xl bg-cream-50 border border-cream-200 p-4 space-y-3 text-sm text-teal-900">
          {note && (
            <p className="font-semibold text-amber-500" aria-label={`${note} sur 5`}>
              {'★'.repeat(note)}<span className="text-teal-700/30">{'★'.repeat(5 - note)}</span>
            </p>
          )}
          {fb.retour && <p>{fb.retour}</p>}
          {fb.pointsForts?.length > 0 && (
            <div><p className="font-semibold text-emerald-800">Ce qui marche</p><ul className="list-disc ml-5">{fb.pointsForts.map((x, k) => <li key={k}>{x}</li>)}</ul></div>
          )}
          {fb.aAmeliorer?.length > 0 && (
            <div><p className="font-semibold text-amber-800">À améliorer</p><ul className="list-disc ml-5">{fb.aAmeliorer.map((x, k) => <li key={k}>{x}</li>)}</ul></div>
          )}
          {fb.exemple && (
            <div>
              <p className="font-semibold text-teal-800">Une version plus forte de votre réponse</p>
              <p className="italic">{fb.exemple}</p>
              {canSpeak && <button type="button" onClick={() => speak(fb.exemple)} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline"><Volume2 className="w-3.5 h-3.5" /> L'écouter</button>}
            </div>
          )}
          <button type="button" onClick={() => { setAnswer(''); setFb(null); }} className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline">
            <RotateCcw className="w-3.5 h-3.5" /> Réessayer cette question
          </button>
        </div>
      )}

      <div className="mt-4 flex justify-between">
        <button type="button" onClick={() => go(i - 1)} disabled={i === 0} className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /> Précédente</button>
        <button type="button" onClick={() => go(i + 1)} disabled={i >= questions.length - 1} className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 disabled:opacity-30">Suivante <ChevronRight className="w-4 h-4" /></button>
      </div>
    </div>
  );
}
