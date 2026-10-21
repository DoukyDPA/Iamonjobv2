'use client';

// Choix du statut d'une candidature (« Envoyée », « Relancée »…) et rappel de
// relance. Enregistre tout de suite via PATCH /api/candidature/[id].

import { useState } from 'react';
import { BellRing, Loader2 } from 'lucide-react';
import { CANDIDATURE_STATUSES, statusInfo, relanceReminder } from '@/lib/candidature-status';

export async function patchCandidature(id, body) {
  const r = await fetch(`/api/candidature/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Enregistrement impossible.');
  return d;
}

export function RelanceReminder({ candidature, className = '' }) {
  const msg = relanceReminder(candidature);
  if (!msg) return null;
  return (
    <p className={`inline-flex items-center gap-1.5 text-xs font-semibold text-pink-700 bg-pink-50 border border-pink-200 rounded-lg px-2 py-1 ${className}`}>
      <BellRing className="w-3.5 h-3.5" /> {msg}
    </p>
  );
}

/**
 * variant="buttons" : rangée de gros boutons (page de la candidature).
 * variant="select"  : liste déroulante compacte (liste des candidatures).
 */
export default function CandidatureStatus({ candidature, onChange, variant = 'buttons' }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const current = statusInfo(candidature.status).id;

  async function choose(id) {
    if (id === current) return;
    setBusy(true);
    setErr(null);
    try {
      await patchCandidature(candidature.id, { status: id });
      const now = Date.now();
      onChange?.({
        ...candidature,
        status: id,
        ...(id === 'sent' ? { sentAt: now } : {}),
        ...(id === 'relaunched' ? { relanceAt: now } : {}),
      });
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (variant === 'select') {
    return (
      <span className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <label className="sr-only" htmlFor={`st-${candidature.id}`}>Où en est cette candidature ?</label>
        <select
          id={`st-${candidature.id}`}
          value={current}
          disabled={busy}
          onChange={(e) => choose(e.target.value)}
          className="text-xs font-semibold rounded-lg border border-cream-300 bg-white text-teal-800 px-2 py-1"
        >
          {CANDIDATURE_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />}
        {err && <span className="text-xs text-rose-600">{err}</span>}
      </span>
    );
  }

  return (
    <div>
      <p className="text-sm font-semibold text-teal-800 mb-2">Où en est cette candidature ?</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Où en est cette candidature ?">
        {CANDIDATURE_STATUSES.map((s) => {
          const on = s.id === current;
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={busy}
              onClick={() => choose(s.id)}
              className={`px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${on ? 'bg-teal-600 border-teal-600 text-white' : 'bg-white border-cream-300 text-teal-800 hover:bg-teal-50'}`}
            >
              {s.label}
            </button>
          );
        })}
        {busy && <Loader2 className="w-4 h-4 animate-spin text-teal-600 self-center" />}
      </div>
      {err && <p className="mt-2 text-sm text-rose-600">{err}</p>}
    </div>
  );
}
