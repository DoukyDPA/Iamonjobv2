'use client';

// ════════════════════════════════════════════════════════════════════════════
// Fiche d'une personne — vue conseiller.
//
//   Métiers   ceux que la personne a mis de côté à l'étape 2 (étoile), puis les
//             9 pistes proposées par l'analyse, pour l'aider à trouver des pistes
//   Envois    offres, messages, questionnaires envoyés, avec leur statut et
//             les réponses
//   Actions   envoyer, transférer à un collègue de la structure
//
// Le texte du CV n'est jamais affiché ici, seulement les intitulés de métiers.
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import {
  X, Loader2, Star, Send, ArrowRightLeft, Briefcase, MessageCircle, ClipboardList,
  ExternalLink, Trash2, Eye, CheckCircle2, Clock, Compass, FileSignature, PenLine, Route,
} from 'lucide-react';
import EnvoiModal from './EnvoiModal';
import { FicheModal } from './SuiviQuestionnaires';

const ICONS = { offre: Briefcase, message: MessageCircle, questionnaire: ClipboardList, document: FileSignature };
const LABELS = { offre: 'Offre', message: 'Message', questionnaire: 'Questionnaire', document: 'Document' };
const PISTES = [
  { key: 'proches', label: 'Métiers proches' },
  { key: 'logiques', label: 'En lien logique' },
  { key: 'eloignes', label: 'Pistes créatives' },
];

function formatDate(ms) {
  if (!ms) return '';
  try { return new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; }
}

// Recherche d'offres France Travail sur l'intitulé (ouverte dans un onglet).
const ftUrl = (title) => `https://candidat.francetravail.fr/offres/recherche?motsCles=${encodeURIComponent(title)}`;

function statut(e) {
  if (e.type === 'document') {
    if (e.signature) return { text: `Signé ${e.signature.mode === 'papier' ? 'sur papier' : 'en ligne'} le ${formatDate(e.signature.at)}`, cls: 'text-teal-700', icon: CheckCircle2 };
    return { text: e.status === 'vu' ? 'Lu, pas encore signé' : 'Pas encore ouvert', cls: 'text-amber-700', icon: Clock };
  }
  if (e.status === 'repondu') return { text: e.type === 'questionnaire' ? 'Répondu' : 'A répondu', cls: 'text-teal-700', icon: CheckCircle2 };
  if (e.status === 'vu') return { text: `Lu le ${formatDate(e.vuAt)}`, cls: 'text-teal-700/70', icon: Eye };
  return { text: 'Pas encore ouvert', cls: 'text-amber-700', icon: Clock };
}

export default function FichePersonne({ beneficiaire, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [envoiOpen, setEnvoiOpen] = useState(false);
  const [ficheId, setFicheId] = useState(null);
  const [transfertOpen, setTransfertOpen] = useState(false);

  async function load() {
    try {
      const r = await fetch(`/api/conseiller/beneficiaires/${encodeURIComponent(beneficiaire.id)}`);
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Chargement impossible.');
      setData(d);
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, [beneficiaire.id]);

  async function retirer(id) {
    if (!window.confirm || window.confirm('Retirer cet envoi ? Le bouton disparaîtra chez la personne.')) {
      await fetch(`/api/conseiller/envois/${encodeURIComponent(id)}`, { method: 'DELETE' });
      await load();
    }
  }

  async function signePapier(id, signe) {
    await fetch(`/api/conseiller/envois/${encodeURIComponent(id)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'signe-papier', signe }),
    });
    await load();
  }

  const m = data?.metiers;
  const nbPistes = m ? PISTES.reduce((n, p) => n + (m.pistes?.[p.key]?.length || 0), 0) : 0;

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-900/50" role="dialog" aria-modal="true" aria-labelledby="fiche-p-title" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[92vh] bg-white border border-cream-200 rounded-2xl shadow-card overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-cream-200 bg-teal-50/60 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h2 id="fiche-p-title" className="text-lg font-bold text-teal-800 font-mono">{beneficiaire.code}</h2>
            <p className="text-sm text-teal-700/80 mt-0.5">
              {beneficiaire.promo ? `${beneficiaire.promo}${beneficiaire.promoArchivee ? ' (archivée)' : ''}` : 'Pas de promo'}
              {' · '}{beneficiaire.status === 'active' ? 'Accès activé' : 'Code non activé'}
            </p>
          </div>
          <button onClick={() => setEnvoiOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700">
            <Send className="w-4 h-4" /> Envoyer
          </button>
          <button onClick={() => setTransfertOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-teal-200 bg-white text-teal-800 text-sm font-semibold hover:bg-teal-50" title="Confier ce suivi à un collègue de la structure">
            <ArrowRightLeft className="w-4 h-4" /> Transférer
          </button>
          <button type="button" onClick={onClose} aria-label="Fermer" className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-teal-700 hover:bg-cream-200/70">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 iamj-scrollbar">
          {error && <p className="text-sm text-rose-600">{error}</p>}
          {!data && !error && <Loader2 className="w-6 h-6 animate-spin text-teal-600 mx-auto" />}

          {data && (
            <>
              {/* Métiers de l'étape 2 */}
              <section>
                <h3 className="text-xs font-bold text-teal-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Compass className="w-4 h-4" /> Ses métiers (étape 2)
                </h3>
                {!m.favoris.length && !nbPistes ? (
                  <p className="text-sm text-teal-700/70">
                    {beneficiaire.status === 'active' ? "La personne n'a pas encore analysé son CV." : "Le code n'est pas encore activé."}
                  </p>
                ) : (
                  <>
                    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 mb-3">
                      <div className="text-sm font-semibold text-teal-800 flex items-center gap-1.5 mb-1.5">
                        <Star className="w-4 h-4 text-amber-500" fill="currentColor" /> Mis de côté par la personne
                        {m.favorisLe && <span className="text-[11px] font-normal text-teal-700/60">· {formatDate(m.favorisLe)}</span>}
                      </div>
                      {m.favoris.length ? (
                        <ul className="flex flex-wrap gap-2">
                          {m.favoris.map((j) => <MetierChip key={j.title} job={j} strong />)}
                        </ul>
                      ) : <p className="text-xs text-teal-700/70">Aucun métier étoilé pour l'instant.</p>}
                    </div>
                    {nbPistes > 0 && (
                      <div className="grid sm:grid-cols-3 gap-3">
                        {PISTES.map((p) => (
                          <div key={p.key}>
                            <div className="text-[11px] font-semibold text-teal-700/70 uppercase tracking-wide mb-1">{p.label}</div>
                            <ul className="space-y-1">
                              {(m.pistes[p.key] || []).map((j) => <MetierChip key={j.title} job={j} />)}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-[11px] text-teal-700/50 mt-2">
                      Pistes proposées par l'analyse du CV{m.analyseLe ? ` du ${formatDate(m.analyseLe)}` : ''}. Un clic ouvre les offres France Travail sur ce métier.
                    </p>
                  </>
                )}
              </section>

              {/* Parcours suivi */}
              <ParcoursPersonne beneficiaire={beneficiaire} onChanged={async () => { await onChanged?.(); }} />

              {/* Envois */}
              <section>
                <h3 className="text-xs font-bold text-teal-800 uppercase tracking-wider mb-2">Mes envois ({data.envois.length})</h3>
                {!data.envois.length ? (
                  <p className="text-sm text-teal-700/70">Rien d'envoyé pour l'instant. « Envoyer » adresse une offre, un message ou un questionnaire.</p>
                ) : (
                  <ul className="space-y-2">
                    {data.envois.map((e) => {
                      const Icon = ICONS[e.type];
                      const st = statut(e);
                      const StIcon = st.icon;
                      const titre = e.type === 'offre' ? e.offre?.intitule : e.type === 'questionnaire' ? e.questionnaire?.titre : e.type === 'document' ? e.document?.titre : e.texte;
                      return (
                        <li key={e.id} className="rounded-xl border border-cream-200 p-3">
                          <div className="flex items-start gap-2">
                            <Icon className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-teal-900">
                                <span className="font-semibold">{LABELS[e.type]}</span> · <span className={e.type === 'message' ? 'whitespace-pre-wrap' : ''}>{titre}</span>
                                {e.offre?.url && <a href={e.offre.url} target="_blank" rel="noopener noreferrer" className="ml-1 inline-flex text-teal-600 hover:text-teal-800"><ExternalLink className="w-3.5 h-3.5" /></a>}
                              </div>
                              {e.type !== 'message' && e.texte && <p className="text-xs text-teal-700/70 mt-0.5 whitespace-pre-wrap">« {e.texte} »</p>}
                              <div className="text-[11px] text-teal-700/60 mt-1 flex flex-wrap items-center gap-x-3">
                                <span>{formatDate(e.createdAt)}{e.promo ? ` · envoi à la promo ${e.promo}` : ''}</span>
                                <span className={`inline-flex items-center gap-1 ${st.cls}`}><StIcon className="w-3.5 h-3.5" />{st.text}</span>
                              </div>
                              {e.reponse?.texte && (
                                <div className="mt-2 rounded-lg bg-teal-50/60 border border-teal-100 px-3 py-2 text-sm text-teal-900 whitespace-pre-wrap">
                                  <span className="text-xs font-semibold text-teal-700">Sa réponse · {formatDate(e.reponduAt)} : </span>{e.reponse.texte}
                                </div>
                              )}
                            </div>
                            {e.type === 'document' && e.document?.mode === 'papier' && e.signature?.mode !== 'en-ligne' && (
                              <button onClick={() => signePapier(e.id, !e.signature)} className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline">
                                <PenLine className="w-3.5 h-3.5" /> {e.signature ? 'Annuler « signé »' : 'Marquer signé'}
                              </button>
                            )}
                            {e.type === 'questionnaire' && e.reponseId && (
                              <button onClick={() => setFicheId(e.reponseId)} className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline">
                                <Eye className="w-3.5 h-3.5" /> Réponses
                              </button>
                            )}
                            <button onClick={() => retirer(e.id)} className="shrink-0 w-7 h-7 inline-flex items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50" aria-label="Retirer cet envoi" title="Retirer cet envoi">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {data.dossier.transferts?.length > 0 && (
                <p className="text-[11px] text-teal-700/60">
                  Dossier transféré {data.dossier.transferts.length} fois, dernier transfert le {formatDate(data.dossier.transferts[data.dossier.transferts.length - 1].le)}.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>

      {envoiOpen && (
        <EnvoiModal
          preset={{ beneficiaireIds: [beneficiaire.id], label: beneficiaire.code }}
          onClose={() => setEnvoiOpen(false)}
          onSent={load}
        />
      )}
      {ficheId && <FicheModal id={ficheId} onClose={() => setFicheId(null)} />}
      {transfertOpen && (
        <TransfertModal
          beneficiaire={beneficiaire}
          onClose={() => setTransfertOpen(false)}
          onDone={async () => { setTransfertOpen(false); onClose(); await onChanged?.(); }}
        />
      )}
    </>
  );
}

function MetierChip({ job, strong = false }) {
  return (
    <li className={strong ? '' : 'list-none'}>
      <a
        href={ftUrl(job.title)}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1 text-sm rounded-lg px-2 py-1 border hover:border-teal-400 hover:bg-teal-50 ${strong ? 'bg-white border-amber-200 font-semibold text-teal-900' : 'border-cream-200 text-teal-800'}`}
        title="Voir les offres France Travail"
      >
        {job.title}
        {job.codeRome && <span className="text-[10px] font-mono text-teal-700/50">{job.codeRome}</span>}
        <ExternalLink className="w-3 h-3 opacity-50" />
      </a>
    </li>
  );
}

function TransfertModal({ beneficiaire, onClose, onDone }) {
  const [collegues, setCollegues] = useState(null);
  const [toUid, setToUid] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/conseiller/collegues').then((r) => r.json()).then((d) => setCollegues(d.collegues || [])).catch(() => setCollegues([]));
  }, []);

  async function go() {
    if (!toUid) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/conseiller/beneficiaires/${encodeURIComponent(beneficiaire.id)}/transfert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUid }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Le transfert a échoué.');
      await onDone();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-teal-900/50" role="dialog" aria-modal="true" aria-labelledby="transfert-title" onClick={() => !busy && onClose()}>
      <div className="w-full max-w-md bg-white border border-cream-200 rounded-2xl shadow-card p-6" onClick={(e) => e.stopPropagation()}>
        <h2 id="transfert-title" className="text-lg font-bold text-teal-800">Transférer {beneficiaire.code}</h2>
        <p className="text-sm text-teal-700/80 mt-1">
          Le dossier, ses fiches de suivi, ses messages et vos envois passent chez le collègue choisi. La personne garde son code et ne voit aucune différence, sauf le prénom et la photo de son conseiller.
        </p>
        {!collegues ? <Loader2 className="w-5 h-5 animate-spin text-teal-600 mt-4" /> : collegues.length === 0 ? (
          <p className="text-sm text-amber-700 mt-4">
            Aucun collègue de votre structure n'est encore inscrit. Un conseiller apparaît ici après sa première visite de l'espace conseiller.
          </p>
        ) : (
          <select value={toUid} onChange={(e) => setToUid(e.target.value)} className="mt-4 w-full p-2.5 text-sm rounded-lg border border-teal-200 bg-white">
            <option value="">Choisir un collègue…</option>
            {collegues.map((c) => <option key={c.uid} value={c.uid}>{c.prenom ? `${c.prenom} · ` : ''}{c.email}</option>)}
          </select>
        )}
        {error && <p className="text-sm text-rose-600 mt-3">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} disabled={busy} className="px-4 py-2 rounded-xl border border-cream-200 text-teal-700 font-semibold hover:bg-cream-50">Annuler</button>
          <button onClick={go} disabled={!toUid || busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:bg-teal-200">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Transférer
          </button>
        </div>
      </div>
    </div>
  );
}

// Parcours de la personne : sa promo, ou un parcours individuel à attribuer.
function ParcoursPersonne({ beneficiaire, onChanged }) {
  const [liste, setListe] = useState(null);
  const [choix, setChoix] = useState(beneficiaire.promo ? '' : beneficiaire.parcoursId || '');
  const [actuel, setActuel] = useState(beneficiaire.promo ? null : beneficiaire.parcoursId || null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    fetch('/api/conseiller/parcours-modeles').then((r) => r.json()).then((d) => setListe(d.parcours || [])).catch(() => setListe([]));
  }, []);

  async function enregistrer(parcoursId) {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch('/api/conseiller/parcours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beneficiaireIds: [beneficiaire.id], parcoursId: parcoursId || null, promo: '' }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Échec.');
      setActuel(parcoursId || null);
      setMsg(parcoursId ? 'Parcours attribué : la personne le voit dans « Mes questionnaires ».' : 'Parcours retiré. Ses fiches déjà remplies restent.');
      await onChanged?.();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  const individuels = (liste || []).filter((p) => p.usage === 'individuel' && !p.archived);
  const nomActuel = (liste || []).find((p) => p.id === actuel)?.label;

  return (
    <section>
      <h3 className="text-xs font-bold text-teal-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Route className="w-4 h-4" /> Parcours de questionnaires
      </h3>
      {beneficiaire.promo ? (
        <p className="text-sm text-teal-800">
          Suit le parcours de la promo <strong>{beneficiaire.promo}</strong>{beneficiaire.promoArchivee ? ' (archivée)' : ''}. Pour lui proposer un parcours individuel, retirez-la d'abord de la promo (onglet Promos, « Modifier »). Vous pouvez toujours lui envoyer un questionnaire seul avec « Envoyer ».
        </p>
      ) : !liste ? <Loader2 className="w-5 h-5 animate-spin text-teal-600" /> : (
        <div className="space-y-2">
          <p className="text-sm text-teal-800">{actuel ? <>Suit le parcours individuel <strong>{nomActuel || actuel}</strong>.</> : 'Aucun parcours pour l’instant.'}</p>
          {individuels.length === 0 ? (
            <p className="text-xs text-teal-700/70">Aucun parcours individuel dans la base : créez-en un dans l'onglet Questionnaires (« Nouveau parcours », pour une personne).</p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <select value={choix} onChange={(e) => setChoix(e.target.value)} className="p-2 text-sm rounded-lg border border-teal-200 bg-white">
                <option value="">Choisir un parcours individuel…</option>
                {individuels.map((p) => <option key={p.id} value={p.id}>{p.label} · {p.etapes.length} étapes</option>)}
              </select>
              <button onClick={() => enregistrer(choix)} disabled={!choix || choix === actuel || busy} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:bg-teal-200">
                {busy && <Loader2 className="w-4 h-4 animate-spin" />} {actuel ? 'Changer' : 'Attribuer'}
              </button>
              {actuel && <button onClick={() => enregistrer(null)} disabled={busy} className="text-sm font-semibold text-rose-600 hover:underline">Retirer</button>}
            </div>
          )}
          {msg && <p className="text-xs text-teal-700">{msg}</p>}
        </div>
      )}
    </section>
  );
}
