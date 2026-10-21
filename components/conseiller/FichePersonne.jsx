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
  ExternalLink, Trash2, Eye, CheckCircle2, Clock, Compass, FileSignature, PenLine, Route, KeyRound, MonitorSmartphone,
} from 'lucide-react';
import EnvoiModal from './EnvoiModal';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { statusInfo, relanceReminder } from '@/lib/candidature-status';
import { SITUATIONS_SORTIE } from '@/lib/sortie';
import { FicheModal } from './SuiviQuestionnaires';
import { Prenom } from './Prenoms';

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
  const [acces, setAcces] = useState(beneficiaire.status);
  const [accesMsg, setAccesMsg] = useState(null);

  // Rendez-vous : le conseiller ouvre l'espace de la personne, pour que le
  // travail fait ensemble aille dans SON dossier. Séance tracée et visible.
  async function travaillerAvec() {
    if (!window.confirm(`Travailler avec ${beneficiaire.code} ?\n\nVous allez ouvrir son espace, avec elle, pendant votre rendez-vous. Tout ce que vous ferez sera enregistré dans son dossier, et elle verra que vous avez travaillé avec elle aujourd'hui.\n\nVous serez déconnecté de votre espace conseiller : « Terminer la séance » vous ramène à la connexion.`)) return;
    setAccesMsg(null);
    try {
      const r = await fetch(`/api/conseiller/beneficiaires/${encodeURIComponent(beneficiaire.id)}/seance`, { method: 'POST' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Impossible d'ouvrir son espace.");
      const { user } = await signInWithCustomToken(auth, d.token);
      const token = await user.getIdToken();
      await fetch('/api/auth/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
      try { sessionStorage.setItem('iamj_seance', JSON.stringify({ code: d.code })); } catch { /* ignoré */ }
      window.location.href = '/';
    } catch (e) {
      setAccesMsg({ ok: false, text: e.message });
    }
  }

  // Mot de passe oublié : la personne n'a pas d'e-mail dans l'outil. On remet
  // son code « à activer » ; son dossier ne bouge pas.
  async function reinitialiserAcces() {
    if (!window.confirm(`Réinitialiser l'accès de ${beneficiaire.code} ?\n\nSon mot de passe actuel cessera de fonctionner. La personne choisira un nouveau mot de passe sur la page d'activation, avec le même code. Son dossier, son CV et ses candidatures sont conservés.`)) return;
    setAccesMsg(null);
    try {
      const r = await fetch(`/api/conseiller/beneficiaires/${encodeURIComponent(beneficiaire.id)}/acces`, { method: 'POST' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'La réinitialisation a échoué.');
      setAcces('reset');
      setAccesMsg({ ok: true, text: `Accès réinitialisé. Dites à la personne d'aller sur la page de connexion, « Activer mon code », de taper ${beneficiaire.code} et de choisir un nouveau mot de passe.` });
      await onChanged?.();
    } catch (e) {
      setAccesMsg({ ok: false, text: e.message });
    }
  }

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
            <h2 id="fiche-p-title" className="text-lg font-bold text-teal-800 font-mono">{beneficiaire.code}<Prenom code={beneficiaire.code} /></h2>
            <p className="text-sm text-teal-700/80 mt-0.5">
              {beneficiaire.promo ? `${beneficiaire.promo}${beneficiaire.promoArchivee ? ' (archivée)' : ''}` : 'Pas de promo'}
              {' · '}{acces === 'active' ? 'Accès activé' : acces === 'reset' ? 'Accès réinitialisé, nouveau mot de passe à choisir' : 'Code non activé'}
            </p>
          </div>
          <button onClick={() => setEnvoiOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700">
            <Send className="w-4 h-4" /> Envoyer
          </button>
          {acces === 'active' && (
            <button onClick={travaillerAvec} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-800 text-sm font-semibold hover:bg-indigo-100" title="En rendez-vous : ouvrir son espace pour travailler ensemble, dans son dossier">
              <MonitorSmartphone className="w-4 h-4" /> <span className="hidden sm:inline">Travailler avec</span>
            </button>
          )}
          {(acces === 'active' || acces === 'reset') && (
            <button onClick={reinitialiserAcces} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-teal-200 bg-white text-teal-800 text-sm font-semibold hover:bg-teal-50" title="Mot de passe oublié : la personne en choisira un nouveau avec son code">
              <KeyRound className="w-4 h-4" /> <span className="hidden sm:inline">Réinitialiser l'accès</span>
            </button>
          )}
          <button onClick={() => setTransfertOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-teal-200 bg-white text-teal-800 text-sm font-semibold hover:bg-teal-50" title="Confier ce suivi à un collègue de la structure">
            <ArrowRightLeft className="w-4 h-4" /> Transférer
          </button>
          <button type="button" onClick={onClose} aria-label="Fermer" className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-teal-700 hover:bg-cream-200/70">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 iamj-scrollbar">
          {error && <p className="text-sm text-rose-600">{error}</p>}
          {accesMsg && (
            <p className={`text-sm rounded-xl px-3 py-2 border ${accesMsg.ok ? 'bg-teal-50 border-teal-200 text-teal-900' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>{accesMsg.text}</p>
          )}
          {!data && !error && <Loader2 className="w-6 h-6 animate-spin text-teal-600 mx-auto" />}

          {data && (
            <>
              {data.avancement && <Avancement a={data.avancement} />}

              <RendezVous beneficiaire={beneficiaire} initial={data.dossier?.prochainRdv} onChanged={onChanged} />

              <SortiePersonne beneficiaire={beneficiaire} initial={data.dossier?.sortie} onChanged={onChanged} />

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

// Où en est la personne : étape atteinte, repères chiffrés, candidatures.
// Pour préparer un rendez-vous en deux minutes. Ni CV ni lettre en clair.
function Avancement({ a }) {
  const etape = a.candidatures.length ? 5 : a.favoris ? 3 : a.analyse ? 2 : a.cv ? 1 : 0;
  const reperes = [
    a.noteCv != null && `CV noté ${a.noteCv}/20`,
    a.favoris > 0 && `${a.favoris} métier${a.favoris > 1 ? 's' : ''} mis de côté`,
    `${a.candidatures.length} offre${a.candidatures.length > 1 ? 's' : ''} analysée${a.candidatures.length > 1 ? 's' : ''}`,
    `${a.campagnes.length} campagne${a.campagnes.length > 1 ? 's' : ''} spontanée${a.campagnes.length > 1 ? 's' : ''}`,
  ].filter(Boolean);
  const envoyees = a.candidatures.filter((c) => ['sent', 'relaunched', 'interview', 'rejected'].includes(c.status)).length;
  return (
    <section>
      <h3 className="text-xs font-bold text-teal-800 uppercase tracking-wider mb-2">Où en est la personne</h3>
      <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-3">
        <div className="flex items-center gap-1.5" aria-label={`Étape ${etape} sur 5`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className={`h-2 flex-1 rounded-full ${n <= etape ? 'bg-teal-600' : 'bg-cream-200'}`} />
          ))}
        </div>
        <p className="mt-2 text-sm text-teal-900">
          <strong>{etape === 0 ? 'Pas encore commencé' : `Étape ${etape} sur 5`}</strong>
          {reperes.length > 0 && <> · {reperes.join(' · ')}</>}
          {envoyees > 0 && <> · {envoyees} candidature{envoyees > 1 ? 's' : ''} envoyée{envoyees > 1 ? 's' : ''}</>}
        </p>
        {a.candidatures.length > 0 && (
          <ul className="mt-2 space-y-1">
            {a.candidatures.slice(0, 10).map((c) => (
              <li key={c.id} className="text-xs text-teal-800 flex flex-wrap items-center gap-x-2">
                <span className="font-semibold">{c.intitule || 'Offre'}</span>
                {c.entreprise && <span className="text-teal-700/70">· {c.entreprise}</span>}
                {c.score != null && <span className="text-amber-700">· {c.score} %</span>}
                <span className="rounded-full bg-white border border-cream-300 px-1.5">{statusInfo(c.status).label}</span>
                {c.lettre && <span className="text-teal-700/60">· lettre prête</span>}
                {relanceReminder(c) && <span className="text-pink-700 font-semibold">· à relancer</span>}
              </li>
            ))}
          </ul>
        )}
        {a.campagnes.length > 0 && (
          <p className="mt-2 text-xs text-teal-700/80">
            Campagnes : {a.campagnes.map((c) => `${c.metier} (${c.retenues}/${c.entreprises} entreprises retenues)`).join(' ; ')}
          </p>
        )}
      </div>
    </section>
  );
}

// Situation à la sortie : alimente le bilan pour les financeurs.
function SortiePersonne({ beneficiaire, initial, onChanged }) {
  const [situation, setSituation] = useState(initial?.situation || '');
  const [date, setDate] = useState(initial?.date || new Date().toISOString().slice(0, 10));
  const [precision, setPrecision] = useState(initial?.precision || '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function enregistrer(effacer = false) {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/conseiller/beneficiaires/${encodeURIComponent(beneficiaire.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortie: effacer ? null : { situation, date, precision } }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Échec.');
      if (effacer) { setSituation(''); setPrecision(''); }
      setMsg(effacer ? 'Situation effacée.' : 'Situation enregistrée.');
      await onChanged?.();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h3 className="text-xs font-bold text-teal-800 uppercase tracking-wider mb-2">Situation à la sortie</h3>
      <div className="flex flex-wrap items-end gap-2">
        <select value={situation} onChange={(e) => setSituation(e.target.value)} className="p-2 text-sm rounded-lg border border-teal-200 bg-white max-w-full">
          <option value="">Toujours accompagnée (pas de sortie)</option>
          {SITUATIONS_SORTIE.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        {situation && (
          <>
            <label className="text-xs text-teal-800">Date
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="ml-1 p-1.5 text-sm rounded-lg border border-teal-200" />
            </label>
            <input value={precision} onChange={(e) => setPrecision(e.target.value)} maxLength={200} placeholder="Précision (métier, organisme…) sans nom" className="flex-1 min-w-[12rem] p-2 text-sm rounded-lg border border-teal-200" />
          </>
        )}
        <button onClick={() => enregistrer(!situation)} disabled={busy || (!situation && !initial)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:bg-teal-200">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} Enregistrer
        </button>
      </div>
      {msg && <p className="text-xs text-teal-700 mt-1">{msg}</p>}
    </section>
  );
}

// Prochain rendez-vous (rappel la veille dans l'espace de la personne) et
// « Préparer mon rendez-vous » : synthèse du dossier en une dizaine de lignes.
function RendezVous({ beneficiaire, initial, onChanged }) {
  const [date, setDate] = useState(initial?.date || '');
  const [heure, setHeure] = useState(initial?.heure || '');
  const [lieu, setLieu] = useState(initial?.lieu || '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [synth, setSynth] = useState(null);
  const [synthBusy, setSynthBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const base = `/api/conseiller/beneficiaires/${encodeURIComponent(beneficiaire.id)}`;

  async function enregistrer(effacer = false) {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch(base, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prochainRdv: effacer ? null : { date, heure, lieu } }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Échec.');
      if (effacer) { setDate(''); setHeure(''); setLieu(''); }
      setMsg(effacer ? 'Rendez-vous retiré.' : 'Rendez-vous enregistré : la personne le voit dans son espace, avec un rappel la veille.');
      await onChanged?.();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function preparer() {
    setSynthBusy(true);
    setSynth(null);
    try {
      const r = await fetch(`${base}/synthese`, { method: 'POST' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Synthèse impossible.');
      setSynth({ ok: true, text: d.synthese });
    } catch (e) {
      setSynth({ ok: false, text: e.message });
    } finally {
      setSynthBusy(false);
    }
  }

  return (
    <section>
      <h3 className="text-xs font-bold text-teal-800 uppercase tracking-wider mb-2">Prochain rendez-vous</h3>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-teal-800">Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="ml-1 p-1.5 text-sm rounded-lg border border-teal-200" />
        </label>
        <label className="text-xs text-teal-800">Heure
          <input type="time" value={heure} onChange={(e) => setHeure(e.target.value)} className="ml-1 p-1.5 text-sm rounded-lg border border-teal-200" />
        </label>
        <input value={lieu} onChange={(e) => setLieu(e.target.value)} maxLength={160} placeholder="Lieu (ex. : CBE, bureau 2)" className="flex-1 min-w-[10rem] p-2 text-sm rounded-lg border border-teal-200" />
        <button onClick={() => enregistrer(false)} disabled={busy || !date} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:bg-teal-200">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} Enregistrer
        </button>
        {initial && <button onClick={() => enregistrer(true)} disabled={busy} className="text-sm font-semibold text-rose-600 hover:underline">Retirer</button>}
      </div>
      {msg && <p className="text-xs text-teal-700 mt-1">{msg}</p>}

      <div className="mt-3">
        <button onClick={preparer} disabled={synthBusy} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-800 text-sm font-semibold hover:bg-indigo-100 disabled:opacity-60">
          {synthBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Compass className="w-4 h-4" />} Préparer mon rendez-vous
        </button>
        <span className="ml-2 text-[11px] text-teal-700/60">Synthèse du dossier par l'IA (Mistral), sans le CV ni aucun nom. Rien n'est enregistré.</span>
        {synth && (
          <div className={`mt-2 rounded-xl border px-4 py-3 text-sm whitespace-pre-wrap ${synth.ok ? 'bg-indigo-50/50 border-indigo-100 text-teal-900' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
            {synth.text}
            {synth.ok && (
              <div className="mt-2">
                <button
                  onClick={async () => { try { await navigator.clipboard.writeText(synth.text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignoré */ } }}
                  className="text-xs font-semibold text-indigo-700 hover:underline"
                >
                  {copied ? 'Copiée' : 'Copier la synthèse'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
