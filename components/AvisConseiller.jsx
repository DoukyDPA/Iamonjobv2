'use client';

// ════════════════════════════════════════════════════════════════════════════
// Avis conseiller — bloc côté personne accompagnée (étape « emplois possibles »).
//
// Après le tableau des offres, la personne peut demander un regard à son
// conseiller sans quitter le parcours. Le bloc reste discret : il n'apparaît que
// si un conseiller est rattaché. Une fois la demande envoyée, il montre l'attente
// puis la réponse. Le but tient en une phrase : garder le lien vivant.
//
// Props :
//   metier    intitulé du métier ciblé
//   codeRome  code ROME (optionnel)
//   offers    offres affichées (on en fige un instantané côté serveur)
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { MessageSquareHeart, Send, CheckCircle2, Clock } from 'lucide-react';
import { Button, Card } from './ui';

function formatDate(ms) {
  if (!ms) return '';
  try {
    return new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  } catch { return ''; }
}

export default function AvisConseiller({ metier, codeRome, offers = [] }) {
  const [linked, setLinked] = useState(false);
  const [avis, setAvis] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    try {
      const res = await fetch('/api/avis');
      if (!res.ok) { setLoaded(true); return; }
      const data = await res.json();
      setLinked(Boolean(data.linked));
      setAvis(Array.isArray(data.avis) ? data.avis : []);
    } catch {
      // silencieux : le bloc reste simplement masqué
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => { load(); }, []);

  async function send() {
    setSending(true);
    setError(null);
    try {
      const context = {
        metier: metier || '',
        codeRome: codeRome || null,
        offers: (offers || []).map((o) => ({
          intitule: o.intitule,
          entreprise: o.entreprise,
          lieu: o.lieu,
          url: o.url,
          source: o.source,
        })),
      };
      const res = await fetch('/api/avis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, note }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "L'envoi a échoué.");
      }
      setNote('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  // Rien tant qu'on n'a pas confirmé le rattachement à un conseiller.
  if (!loaded || !linked) return null;

  const pending = avis.filter((a) => a.status === 'pending');
  const answered = avis.filter((a) => a.status === 'answered');

  return (
    <Card className="p-5 border-teal-200 bg-teal-50/40">
      <div className="flex items-start gap-3">
        <MessageSquareHeart className="w-6 h-6 text-teal-600 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1">
          <h3 className="text-base font-bold text-teal-800">Un doute sur ces pistes ?</h3>
          <p className="text-sm text-teal-700/80 mt-1">
            Votre conseiller peut regarder ces emplois et vous donner son avis. Vous
            gardez la main, il vous répondra dès que possible.
          </p>

          <div className="mt-3">
            <label htmlFor="avis-note" className="sr-only">Message pour votre conseiller</label>
            <textarea
              id="avis-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Une question précise ? (facultatif)"
              className="w-full p-3 text-sm rounded-lg border border-teal-200 bg-white outline-none focus:ring-2 focus:ring-teal-400 placeholder:text-teal-700/40"
            />
          </div>

          {error && <p className="text-sm text-rose-600 mt-2">{error}</p>}

          <div className="mt-3">
            <Button onClick={send} loading={sending} icon={Send}>
              {sending ? 'Envoi…' : "Demander l'avis de mon conseiller"}
            </Button>
          </div>

          {pending.length > 0 && (
            <div className="mt-4 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
              Demande envoyée le {formatDate(pending[0].createdAt)}. Votre conseiller a été prévenu.
            </div>
          )}

          {answered.length > 0 && (
            <div className="mt-4 space-y-2">
              {answered.map((a) => (
                <div key={a.id} className="rounded-lg border border-teal-200 bg-white px-3 py-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-teal-700 mb-1">
                    <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                    Réponse de votre conseiller · {formatDate(a.answeredAt)}
                  </div>
                  <p className="text-sm text-teal-800 whitespace-pre-wrap">{a.reply}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
