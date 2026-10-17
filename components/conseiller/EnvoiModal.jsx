'use client';

// ════════════════════════════════════════════════════════════════════════════
// Envoi du conseiller — offre, message ou questionnaire, à une personne, à
// plusieurs ou à toute une promo.
//
// Props :
//   beneficiaires  dossiers du conseiller (pour choisir les destinataires)
//   preset         { beneficiaireIds?, promo?, label?, type?, questionnaireId? }
//                  destinataires fixés (fiche d'une personne, promo) et/ou type
//   onClose, onSent
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react';
import { Briefcase, MessageCircle, ClipboardList, X, Loader2, Send, CheckCircle2 } from 'lucide-react';

const TABS = [
  { id: 'offre', label: 'Une offre', icon: Briefcase, hint: 'La personne verra le bouton « Offre de votre conseiller ».' },
  { id: 'message', label: 'Un message', icon: MessageCircle, hint: 'La personne verra le bouton « Message de votre conseiller ».' },
  { id: 'questionnaire', label: 'Un questionnaire', icon: ClipboardList, hint: 'La personne verra le bouton « Merci de répondre à quelques questions ».' },
];

const input = 'w-full p-2.5 text-sm rounded-lg border border-teal-200 bg-white outline-none focus:ring-2 focus:ring-teal-400 placeholder:text-teal-700/40';

export default function EnvoiModal({ beneficiaires = [], preset = {}, onClose, onSent }) {
  const fixed = Array.isArray(preset.beneficiaireIds);
  const [type, setType] = useState(preset.type || 'offre');
  const [texte, setTexte] = useState('');
  const [offre, setOffre] = useState({ intitule: '', entreprise: '', lieu: '', url: '' });
  const [questionnaireId, setQuestionnaireId] = useState(preset.questionnaireId || '');
  const [base, setBase] = useState(null);
  const [mode, setMode] = useState('promo');
  const [promoKey, setPromoKey] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);

  useEffect(() => {
    fetch('/api/conseiller/questionnaires/base')
      .then((r) => r.json())
      .then((d) => setBase(d.questionnaires || []))
      .catch(() => setBase([]));
  }, []);

  // Promos en cours d'abord, puis archivées (l'accompagnement continue).
  const promos = useMemo(() => {
    const m = new Map();
    for (const b of beneficiaires) {
      if (!b.parcoursId) continue;
      const k = `${b.parcoursId}::${b.promo || ''}`;
      if (!m.has(k)) m.set(k, { key: k, label: b.promo || b.parcoursId, ids: [], archivee: true });
      const p = m.get(k);
      p.ids.push(b.id);
      if (!b.promoArchivee) p.archivee = false;
    }
    return [...m.values()].sort((a, b) => Number(a.archivee) - Number(b.archivee) || a.label.localeCompare(b.label));
  }, [beneficiaires]);

  useEffect(() => {
    if (!promoKey && promos[0]) setPromoKey(promos[0].key);
    if (!promos.length) setMode('individus');
  }, [promos, promoKey]);

  const cible = fixed
    ? { ids: preset.beneficiaireIds, promo: preset.promo || null, label: preset.label }
    : mode === 'promo'
      ? (() => { const p = promos.find((x) => x.key === promoKey); return { ids: p?.ids || [], promo: p?.label || null, label: p ? `Promo « ${p.label} »` : '' }; })()
      : { ids: [...selected], promo: null, label: `${selected.size} personne(s)` };

  const toggle = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  async function send() {
    setError(null);
    if (!cible.ids.length) { setError('Choisissez au moins une personne.'); return; }
    if (type === 'offre' && !offre.intitule.trim()) { setError("Indiquez l'intitulé de l'offre."); return; }
    if (type === 'message' && !texte.trim()) { setError('Le message est vide.'); return; }
    if (type === 'questionnaire' && !questionnaireId) { setError('Choisissez un questionnaire.'); return; }
    setSending(true);
    try {
      const res = await fetch('/api/conseiller/envois', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type, texte,
          beneficiaireIds: cible.ids,
          promo: cible.promo,
          offre: type === 'offre' ? offre : undefined,
          questionnaireId: type === 'questionnaire' ? questionnaireId : undefined,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "L'envoi a échoué.");
      setDone(d.created);
      await onSent?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  const tab = TABS.find((t) => t.id === type);
  const qChoisi = base?.find((q) => q.id === questionnaireId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-900/50" role="dialog" aria-modal="true" aria-labelledby="envoi-title" onClick={() => !sending && onClose()}>
      <div className="w-full max-w-xl max-h-[92vh] bg-white border border-cream-200 rounded-2xl shadow-card overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-cream-200 bg-teal-50/60 flex items-start gap-3">
          <div className="flex-1">
            <h2 id="envoi-title" className="text-lg font-bold text-teal-800">Envoyer {fixed && preset.label ? `à ${preset.label}` : ''}</h2>
            <p className="text-sm text-teal-700/80 mt-0.5">{tab.hint}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-teal-700 hover:bg-cream-200/70">
            <X className="w-5 h-5" />
          </button>
        </div>

        {done != null ? (
          <div className="px-6 py-10 text-center">
            <CheckCircle2 className="w-10 h-10 text-teal-600 mx-auto mb-3" />
            <p className="font-semibold text-teal-800">Envoyé à {done} personne{done > 1 ? 's' : ''}.</p>
            <p className="text-sm text-teal-700/70 mt-1">Le bouton s'affiche à leur prochaine connexion.</p>
            <button onClick={onClose} className="mt-5 px-5 py-2.5 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700">Fermer</button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 iamj-scrollbar">
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Type d'envoi">
                {TABS.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      role="tab"
                      aria-selected={t.id === type}
                      onClick={() => setType(t.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-semibold ${t.id === type ? 'bg-teal-600 text-white border-teal-700' : 'bg-white text-teal-700 border-cream-200 hover:border-teal-300'}`}
                    >
                      <Icon className="w-4 h-4" /> {t.label}
                    </button>
                  );
                })}
              </div>

              {!fixed && (
                <fieldset className="rounded-xl border border-cream-200 p-3">
                  <legend className="px-1 text-sm font-semibold text-teal-800">Destinataires</legend>
                  <div className="flex gap-4 text-sm mb-2">
                    {promos.length > 0 && (
                      <label className="inline-flex items-center gap-1.5"><input type="radio" checked={mode === 'promo'} onChange={() => setMode('promo')} className="accent-teal-600" /> Toute une promo</label>
                    )}
                    <label className="inline-flex items-center gap-1.5"><input type="radio" checked={mode === 'individus'} onChange={() => setMode('individus')} className="accent-teal-600" /> Des personnes</label>
                  </div>
                  {mode === 'promo' ? (
                    <select value={promoKey} onChange={(e) => setPromoKey(e.target.value)} className={input}>
                      {promos.map((p) => <option key={p.key} value={p.key}>{p.label} · {p.ids.length} pers.{p.archivee ? ' (archivée)' : ''}</option>)}
                    </select>
                  ) : (
                    <ul className="max-h-48 overflow-y-auto space-y-1 iamj-scrollbar">
                      {beneficiaires.map((b) => (
                        <li key={b.id}>
                          <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-cream-50 cursor-pointer">
                            <input type="checkbox" checked={selected.has(b.id)} onChange={() => toggle(b.id)} className="accent-teal-600" />
                            <span className="font-mono text-sm font-semibold text-teal-800">{b.code}</span>
                            {b.promo && <span className="text-[11px] text-teal-700/60">{b.promo}</span>}
                            {b.status !== 'active' && <span className="text-[11px] text-amber-700">non activé</span>}
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </fieldset>
              )}

              {type === 'offre' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="sm:col-span-2 block">
                    <span className="block text-sm font-semibold text-teal-800 mb-1">Intitulé du poste *</span>
                    <input value={offre.intitule} onChange={(e) => setOffre({ ...offre, intitule: e.target.value })} maxLength={200} className={input} placeholder="Assistant(e) administratif(ve)" />
                  </label>
                  <label className="block">
                    <span className="block text-sm font-semibold text-teal-800 mb-1">Entreprise</span>
                    <input value={offre.entreprise} onChange={(e) => setOffre({ ...offre, entreprise: e.target.value })} maxLength={160} className={input} />
                  </label>
                  <label className="block">
                    <span className="block text-sm font-semibold text-teal-800 mb-1">Lieu</span>
                    <input value={offre.lieu} onChange={(e) => setOffre({ ...offre, lieu: e.target.value })} maxLength={120} className={input} placeholder="Créteil (94)" />
                  </label>
                  <label className="sm:col-span-2 block">
                    <span className="block text-sm font-semibold text-teal-800 mb-1">Lien vers l'offre</span>
                    <input type="url" value={offre.url} onChange={(e) => setOffre({ ...offre, url: e.target.value })} maxLength={600} className={input} placeholder="https://candidat.francetravail.fr/offres/…" />
                  </label>
                </div>
              )}

              {type === 'questionnaire' && (
                <label className="block">
                  <span className="block text-sm font-semibold text-teal-800 mb-1">Questionnaire</span>
                  {!base ? <Loader2 className="w-5 h-5 animate-spin text-teal-600" /> : (
                    <select value={questionnaireId} onChange={(e) => setQuestionnaireId(e.target.value)} className={input}>
                      <option value="">Choisir dans la base…</option>
                      {base.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.parcours?.[0] ? `${q.parcours[0].label} S${q.parcours[0].etape} · ` : ''}{q.titre} ({q.nbQuestions} q.)
                        </option>
                      ))}
                    </select>
                  )}
                  {qChoisi?.parcours?.length > 0 && (
                    <span className="block text-[11px] text-teal-700/70 mt-1">
                      Pour les personnes de ce parcours, la réponse s'inscrit dans leur suivi hebdomadaire (colonne S{qChoisi.parcours[0].etape}).
                    </span>
                  )}
                </label>
              )}

              <label className="block">
                <span className="block text-sm font-semibold text-teal-800 mb-1">
                  {type === 'message' ? 'Message *' : 'Un mot pour accompagner (facultatif)'}
                </span>
                <textarea
                  value={texte}
                  onChange={(e) => setTexte(e.target.value)}
                  rows={type === 'message' ? 5 : 3}
                  maxLength={3000}
                  className={input}
                  placeholder={type === 'offre' ? 'Cette offre colle à votre projet, regardez le point sur…' : type === 'questionnaire' ? 'Prenez 5 minutes avant notre atelier de jeudi.' : 'Bonjour, …'}
                />
              </label>

              <p className="text-xs text-teal-700/60">
                Aucun email n'est envoyé (les participants n'en donnent pas) : le bouton apparaît à leur prochaine connexion. Pensez à le leur signaler en atelier ou par votre canal habituel.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-cream-200 bg-cream-50/60 flex flex-wrap items-center gap-3">
              {error && <p className="w-full text-sm text-rose-600" role="alert">{error}</p>}
              <button onClick={send} disabled={sending} className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 disabled:bg-teal-200">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Envoyer
              </button>
              <span className="text-xs text-teal-700/70">{cible.label}{cible.ids.length ? ` · ${cible.ids.length} destinataire(s)` : ''}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
