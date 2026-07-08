'use client';

// ════════════════════════════════════════════════════════════════════════════
// Partager une fiche avec son conseiller.
//
// Se pose au bas d'une fiche candidature/compatibilité ou d'une campagne. La
// personne envoie un instantané de la fiche à son conseiller, avec un mot si
// elle veut. Réutilise l'API /api/avis (le conseiller retrouve le partage dans
// sa file). Ne s'affiche que si un conseiller est rattaché.
//
// Props :
//   shared  { kind: 'candidature' | 'campaign', id, title, subtitle, score, summary }
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { Share2, Send, Loader2, CheckCircle2 } from 'lucide-react';

export default function ShareToConseiller({ shared }) {
  const [linked, setLinked] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/avis')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setLinked(Boolean(d?.linked)); })
      .catch(() => {})
      .finally(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, []);

  async function share() {
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/avis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: { metier: shared?.title || '', codeRome: null, offers: [], shared },
          note,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Le partage a échoué.");
      }
      setDone(true);
      setOpen(false);
      setNote('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  // Rien tant qu'on n'a pas confirmé le rattachement à un conseiller.
  if (!loaded || !linked) return null;

  if (done) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        Partagé avec votre conseiller. Il pourra le consulter et vous répondre.
      </div>
    );
  }

  return (
    <div className="bg-teal-50/50 border border-teal-100 rounded-2xl px-5 py-4">
      {!open ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Share2 className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-teal-800">Partager avec mon conseiller</p>
              <p className="text-sm text-teal-700/70">
                Envoyez cette fiche à votre conseiller pour avoir son regard.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold shadow-soft hover:bg-teal-700 transition-colors shrink-0"
          >
            <Share2 className="w-4 h-4" /> Partager
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="font-semibold text-teal-800 flex items-center gap-2">
            <Share2 className="w-4 h-4 text-teal-600" /> Partager cette fiche
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Un mot pour votre conseiller ? (facultatif)"
            className="w-full p-3 text-sm rounded-lg border border-teal-200 bg-white outline-none focus:ring-2 focus:ring-teal-400 placeholder:text-teal-700/40"
          />
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={share}
              disabled={sending}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold shadow-soft hover:bg-teal-700 disabled:bg-teal-200 transition-colors"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? 'Envoi…' : 'Envoyer à mon conseiller'}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setError(null); }}
              className="px-3 py-2 rounded-lg text-sm text-teal-700 hover:bg-teal-100"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
