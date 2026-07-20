'use client';

// ════════════════════════════════════════════════════════════════════════════
// Mon conseiller — point de contact humain, visible en permanence.
//
// La personne accompagnée peut écrire à son conseiller à tout moment, sans être
// liée à une offre précise. Elle voit le fil de ses échanges et sait quand le
// conseiller a répondu (date affichée, pastille sur les nouvelles réponses).
//
// S'appuie sur l'API /api/avis déjà en place (mêmes demandes que le bloc « avis
// sur les offres »). Le bouton ne s'affiche que si un conseiller est rattaché.
//
// Props :
//   variant  'sidebar' (bouton large, colonne de gauche) | 'mobile' (compact)
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import {
  MessageSquareHeart, Send, CheckCircle2, Clock, X,
  Paperclip, Download, FileText, Briefcase,
} from 'lucide-react';
import { Button } from './ui';

function formatBytes(b) {
  if (!b) return '';
  if (b < 1024) return `${b} o`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} Ko`;
  return `${(b / (1024 * 1024)).toFixed(1)} Mo`;
}

// Rendu commun d'une fiche partagée + pièce jointe (côté bénéficiaire).
export function SharedContext({ context }) {
  const shared = context?.shared;
  const att = context?.attachment;
  if (!shared && !att) return null;
  return (
    <div className="mt-2 space-y-1.5">
      {shared && (
        <div className="flex items-start gap-2 text-xs rounded-lg border border-teal-200 bg-teal-50/60 px-2.5 py-2">
          <Briefcase className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="font-semibold text-teal-800">
              {shared.kind === 'campaign' ? 'Campagne partagée' : 'Fiche partagée'} : {shared.title}
              {typeof shared.score === 'number' && (
                <span className="ml-1 text-teal-600">· {shared.score}%</span>
              )}
            </div>
            {shared.subtitle && <div className="text-teal-700/70">{shared.subtitle}</div>}
          </div>
        </div>
      )}
      {att && (
        att.downloadUrl ? (
          <a
            href={att.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs rounded-lg border border-cream-200 bg-white px-2.5 py-2 text-teal-700 hover:border-teal-300 hover:text-teal-900"
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="font-medium truncate max-w-[220px]">{att.name}</span>
            <span className="text-teal-700/50">{formatBytes(att.size)}</span>
            <Download className="w-3.5 h-3.5 shrink-0" />
          </a>
        ) : (
          <div className="inline-flex items-center gap-2 text-xs rounded-lg border border-cream-200 bg-white px-2.5 py-2 text-teal-700/60">
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="font-medium truncate max-w-[220px]">{att.name}</span>
          </div>
        )
      )}
    </div>
  );
}

const SEEN_KEY = 'conseiller_last_seen';

function formatDate(ms) {
  if (!ms) return '';
  try {
    return new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  } catch { return ''; }
}

function getLastSeen() {
  try { return Number(localStorage.getItem(SEEN_KEY)) || 0; } catch { return 0; }
}

export default function MonConseiller({ variant = 'sidebar' }) {
  const [linked, setLinked] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [avis, setAvis] = useState([]);
  const [conseiller, setConseiller] = useState(null);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [lastSeen, setLastSeen] = useState(0);
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

  async function load() {
    try {
      const res = await fetch('/api/avis');
      if (!res.ok) { setLoaded(true); return; }
      const data = await res.json();
      setLinked(Boolean(data.linked));
      setConseiller(data.conseiller || null);
      setAvis(Array.isArray(data.avis) ? data.avis : []);
    } catch {
      // silencieux : le bouton reste masqué
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    setLastSeen(getLastSeen());
    load();
  }, []);

  // Nombre de réponses non encore vues (répondues après la dernière ouverture).
  const unseenAnswers = avis.filter(
    (a) => a.status === 'answered' && (a.answeredAt ?? 0) > lastSeen
  ).length;

  function openPanel() {
    setOpen(true);
    setError(null);
    const now = Date.now();
    try { localStorage.setItem(SEEN_KEY, String(now)); } catch {}
    setLastSeen(now);
    load();
  }

  async function send() {
    // On autorise l'envoi si un message OU une pièce jointe est présent.
    if ((!note.trim() && !file) || sending) return;
    setSending(true);
    setError(null);
    try {
      let attachment = null;
      if (file) {
        const fd = new FormData();
        fd.append('file', file);
        const up = await fetch('/api/avis/attachment', { method: 'POST', body: fd });
        const upData = await up.json().catch(() => ({}));
        if (!up.ok) throw new Error(upData.error || "L'envoi de la pièce jointe a échoué.");
        attachment = upData.attachment;
      }

      const res = await fetch('/api/avis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: { metier: '', codeRome: null, offers: [], attachment },
          note,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "L'envoi a échoué.");
      }
      setNote('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  // Rien tant qu'on n'a pas confirmé le rattachement à un conseiller.
  if (!loaded || !linked) return null;

  const prenom = conseiller?.prenom || '';
  const photoUrl = conseiller?.photoUrl || null;
  const titre = prenom ? `Mon conseiller : ${prenom}` : 'Mon conseiller';

  const trigger =
    variant === 'mobile' ? (
      <button
        type="button"
        onClick={openPanel}
        className="relative inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold shadow-soft hover:bg-teal-700 shrink-0"
      >
        {photoUrl ? (
          <img src={photoUrl} alt="" className="w-5 h-5 rounded-full object-cover border border-white/50" />
        ) : (
          <MessageSquareHeart className="w-4 h-4" />
        )}
        {titre}
        {unseenAnswers > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-cream-50">
            {unseenAnswers}
          </span>
        )}
      </button>
    ) : (
      <button
        type="button"
        onClick={openPanel}
        className="relative w-full flex items-center gap-3 p-3 rounded-xl bg-teal-600 text-white shadow-card hover:bg-teal-700 transition-colors text-left"
      >
        {photoUrl ? (
          <img src={photoUrl} alt="" className="w-10 h-10 rounded-full object-cover shrink-0 border-2 border-white/40" />
        ) : (
          <MessageSquareHeart className="w-5 h-5 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold leading-tight truncate">{titre}</div>
          <div className="text-[11px] text-white/85 leading-tight">
            {unseenAnswers > 0 ? 'Nouvelle réponse !' : 'Lui écrire un message'}
          </div>
        </div>
        {unseenAnswers > 0 && (
          <span className="w-5 h-5 rounded-full bg-white text-teal-700 text-[11px] font-bold flex items-center justify-center shrink-0">
            {unseenAnswers}
          </span>
        )}
      </button>
    );

  return (
    <>
      {variant === 'sidebar' ? (
        <div className="mt-6 pt-5 border-t border-cream-200">
          <div className="text-xs font-bold tracking-[0.15em] text-teal-700/70 mb-3">
            CONTACT
          </div>
          {trigger}
          <p className="mt-2 text-[11px] leading-relaxed text-teal-700/70">
            Une question, un doute ? Votre conseiller vous répond ici. Le lien
            humain reste au cœur de votre accompagnement.
          </p>
        </div>
      ) : (
        trigger
      )}

      {/* ─────── Fenêtre d'échange ─────── */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-900/50 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="conseiller-title"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-lg max-h-[90vh] bg-white border border-cream-200 rounded-2xl shadow-card overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* En-tête */}
            <div className="px-6 py-5 border-b border-cream-200 bg-teal-50/60 flex items-start gap-3">
              {photoUrl ? (
                <img src={photoUrl} alt="" className="w-11 h-11 rounded-full object-cover shrink-0 border-2 border-teal-200" />
              ) : (
                <MessageSquareHeart className="w-6 h-6 text-teal-600 shrink-0 mt-0.5" aria-hidden="true" />
              )}
              <div className="flex-1 min-w-0">
                <h2 id="conseiller-title" className="text-lg font-bold text-teal-800">
                  {titre}
                </h2>
                <p className="text-sm text-teal-700/80 mt-0.5">
                  Écrivez-lui quand vous voulez. Il vous répondra dès que possible.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-teal-700 hover:bg-cream-200/70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corps scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 iamj-scrollbar">
              {/* Nouveau message */}
              <div>
                <label htmlFor="conseiller-note" className="block text-sm font-semibold text-teal-800 mb-1.5">
                  Votre message
                </label>
                <textarea
                  id="conseiller-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder="Posez votre question ou expliquez où vous en êtes…"
                  className="w-full p-3 text-sm rounded-lg border border-teal-200 bg-white outline-none focus:ring-2 focus:ring-teal-400 placeholder:text-teal-700/40"
                />
                {/* Pièce jointe */}
                <div className="mt-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                    className="sr-only"
                    onChange={(e) => { setFile(e.target.files?.[0] || null); setError(null); }}
                  />
                  {file ? (
                    <div className="inline-flex items-center gap-2 text-xs rounded-lg border border-teal-200 bg-teal-50/60 px-2.5 py-2 text-teal-800">
                      <Paperclip className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-medium truncate max-w-[220px]">{file.name}</span>
                      <span className="text-teal-700/50">{formatBytes(file.size)}</span>
                      <button
                        type="button"
                        onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                        aria-label="Retirer la pièce jointe"
                        className="ml-1 text-teal-500 hover:text-rose-500"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 hover:text-teal-900 rounded-lg border border-cream-200 bg-white px-2.5 py-2 hover:border-teal-300"
                    >
                      <Paperclip className="w-3.5 h-3.5" /> Joindre un fichier
                    </button>
                  )}
                  <p className="mt-1 text-[11px] text-teal-700/50">PDF, image ou Word · 5 Mo maximum.</p>
                </div>

                {error && <p className="text-sm text-rose-600 mt-2">{error}</p>}
                <div className="mt-2">
                  <Button
                    onClick={send}
                    loading={sending}
                    disabled={!note.trim() && !file}
                    icon={Send}
                  >
                    {sending ? 'Envoi…' : 'Envoyer à mon conseiller'}
                  </Button>
                </div>
              </div>

              {/* Fil des échanges */}
              {avis.length > 0 && (
                <div className="space-y-3 pt-1">
                  <h3 className="text-xs font-bold text-teal-800 uppercase tracking-wider">
                    Vos échanges
                  </h3>
                  {avis.map((a) => (
                    <div key={a.id} className="rounded-xl border border-cream-200 bg-cream-50/50 p-3">
                      {a.note && (
                        <p className="text-sm text-teal-800/90 whitespace-pre-wrap">
                          <span className="font-semibold text-teal-700">Vous · {formatDate(a.createdAt)} : </span>
                          {a.note}
                        </p>
                      )}
                      {a.context?.metier && (
                        <p className="text-[11px] text-teal-700/60 mt-1">
                          À propos du métier : {a.context.metier}
                        </p>
                      )}
                      <SharedContext context={a.context} />
                      {a.status === 'answered' ? (
                        <div className="mt-2 rounded-lg border border-teal-200 bg-white px-3 py-2">
                          <div className="flex items-center gap-2 text-xs font-semibold text-teal-700 mb-1">
                            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                            Réponse de votre conseiller · {formatDate(a.answeredAt)}
                          </div>
                          <p className="text-sm text-teal-800 whitespace-pre-wrap">{a.reply}</p>
                        </div>
                      ) : (
                        <div className="mt-2 flex items-center gap-2 text-xs text-amber-700">
                          <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
                          En attente de réponse. Votre conseiller a été prévenu.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
