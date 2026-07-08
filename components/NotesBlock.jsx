'use client';

// ════════════════════════════════════════════════════════════════════════════
// Bloc de notes personnelles — suivi d'une candidature ou d'une campagne.
//
// La personne écrit des notes libres (relances, ressenti d'entretien, contacts).
// La sauvegarde part au clic « Enregistrer » et au moment où le champ perd le
// focus, si le texte a changé. Un court message confirme l'enregistrement.
//
// Props :
//   initialValue  texte déjà en base (facultatif)
//   onSave        (texte) => Promise, écrit la note côté serveur
//   className     classes conteneur additionnelles (facultatif)
// ════════════════════════════════════════════════════════════════════════════

import { useState, useRef } from 'react';
import { NotebookPen, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function NotesBlock({ initialValue = '', onSave, className = '' }) {
  const [value, setValue] = useState(initialValue || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const savedRef = useRef(initialValue || '');

  async function persist() {
    if (saving) return;
    if (value === savedRef.current) return; // rien de neuf à écrire
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await onSave(value);
      savedRef.current = value;
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err?.message || "L'enregistrement a échoué.");
    } finally {
      setSaving(false);
    }
  }

  const dirty = value !== savedRef.current;

  return (
    <div className={`bg-white border border-cream-200 rounded-2xl overflow-hidden ${className}`}>
      <div className="px-5 py-4 border-b border-cream-200 bg-cream-50/60 flex items-center gap-2">
        <NotebookPen className="w-4 h-4 text-teal-600" />
        <span className="font-semibold text-teal-800">Mes notes personnelles</span>
        <span className="ml-auto text-xs text-teal-700/50">Visibles par vous seul</span>
      </div>
      <div className="px-5 py-4 space-y-3">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={persist}
          rows={5}
          maxLength={4000}
          placeholder="Vos notes de suivi : relances, dates, contacts, ressenti après un entretien…"
          className="w-full p-3 text-sm rounded-lg border border-cream-200 bg-cream-50/40 outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent resize-y placeholder:text-teal-700/40"
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={persist}
            disabled={saving || !dirty}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold shadow-soft hover:bg-teal-700 disabled:bg-teal-200 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600">
              <CheckCircle2 className="w-4 h-4" /> Enregistré
            </span>
          )}
          {error && (
            <span className="inline-flex items-center gap-1.5 text-sm text-rose-600">
              <AlertCircle className="w-4 h-4" /> {error}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
