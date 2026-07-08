'use client';

// ════════════════════════════════════════════════════════════════════════════
// Tableau de bord conseiller — le « radar ».
//
// Lecture seule sur le groupe accompagné. Une ligne par personne, avec statut
// de consentement, mode de pilotage et avancement. Le conseiller repère qui
// décroche et agit seulement sur ces cas. Il crée aussi de nouveaux
// bénéficiaires : un code pseudonyme sort, à remettre à la personne.
//
// L'accès réel est gardé côté serveur (rôle conseiller). Cette page se contente
// d'afficher, et bascule en message clair si l'API répond 403.
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import {
  Loader2, Users, UserPlus, ShieldCheck, ShieldAlert, ShieldX,
  Compass, Copy, Check, X, AlertCircle, Send,
  MessageSquareHeart, Clock, CheckCircle2, ExternalLink, Coins, Eye, Trash2,
} from 'lucide-react';

// Format court des grands nombres : 12 340 → « 12,3 k », lisible d'un coup d'œil.
function formatTokens(n) {
  const v = Number(n) || 0;
  if (v >= 1000) return `${(v / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} k`;
  return v.toLocaleString('fr-FR');
}
import { BrandLogo } from '@/components/brand';
import AccessibilityBar from '@/components/layout/AccessibilityBar';
import Footer from '@/components/layout/Footer';
import { SharedContext } from '@/components/MonConseiller';
import FicheConseiller from '@/components/FicheConseiller';

// ─── Libellés et styles des statuts ─────────────────────────────────────────

const CONSENT = {
  granted: { label: 'Accordé',    cls: 'bg-teal-50 text-teal-700 border-teal-200',   Icon: ShieldCheck },
  pending: { label: 'En attente', cls: 'bg-amber-50 text-amber-700 border-amber-200', Icon: ShieldAlert },
  revoked: { label: 'Retiré',     cls: 'bg-rose-50 text-rose-700 border-rose-200',    Icon: ShieldX },
};

const PILOTAGE = {
  autonome: { label: 'Autonome', cls: 'bg-teal-50 text-teal-700 border-teal-200' },
  mixte:    { label: 'Mixte',    cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  pilote:   { label: 'Piloté',   cls: 'bg-amber-50 text-amber-700 border-amber-200' },
};

function Badge({ map, value }) {
  const it = map[value] || { label: value, cls: 'bg-gray-50 text-gray-600 border-gray-200' };
  const Icon = it.Icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold ${it.cls}`}>
      {Icon && <Icon className="w-3.5 h-3.5" aria-hidden="true" />}
      {it.label}
    </span>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ConseillerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState(null);
  const [list, setList] = useState([]);
  const [creating, setCreating] = useState(false);
  const [newCode, setNewCode] = useState(null);
  const [copied, setCopied] = useState(false);
  const [avis, setAvis] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [replyingId, setReplyingId] = useState(null);
  const [openFiche, setOpenFiche] = useState(null); // { avisId, code } | null
  const [confirmDelete, setConfirmDelete] = useState(null); // bénéficiaire | null
  const [deletingId, setDeletingId] = useState(null);

  async function load() {
    const res = await fetch('/api/conseiller/beneficiaires');
    if (res.status === 403) { setForbidden(true); setLoading(false); return; }
    if (!res.ok) { setError('Chargement impossible.'); setLoading(false); return; }
    const data = await res.json();
    setList(data.beneficiaires || []);
    // File des avis. Un échec ici ne bloque pas l'affichage du groupe.
    try {
      const ar = await fetch('/api/conseiller/avis');
      if (ar.ok) { const ad = await ar.json(); setAvis(ad.avis || []); }
    } catch { /* silencieux */ }
    setLoading(false);
  }

  async function sendReply(avisId) {
    const reply = (drafts[avisId] || '').trim();
    if (!reply) return;
    setReplyingId(avisId);
    setError(null);
    try {
      const res = await fetch(`/api/conseiller/avis/${avisId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply }),
      });
      if (!res.ok) throw new Error();
      setDrafts((d) => { const n = { ...d }; delete n[avisId]; return n; });
      await load();
    } catch {
      setError("L'envoi de la réponse a échoué. Réessayez.");
    } finally {
      setReplyingId(null);
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) { router.push('/login'); return; }
      const token = await firebaseUser.getIdToken();
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      await load();
    });
    return () => unsub();
  }, [router]);

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/conseiller/beneficiaires', { method: 'POST' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setNewCode(data.code);
      setCopied(false);
      await load();
    } catch {
      setError('La création a échoué. Réessayez.');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id) {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/conseiller/beneficiaires/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setConfirmDelete(null);
      await load();
    } catch {
      setError('La suppression a échoué. Réessayez.');
    } finally {
      setDeletingId(null);
    }
  }

  function copyCode() {
    if (!newCode) return;
    navigator.clipboard?.writeText(newCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // ── Écrans d'état ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-100">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="min-h-screen bg-cream-100 text-teal-900 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-md text-center bg-white border border-cream-200 rounded-2xl shadow-card p-8">
            <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h1 className="text-xl font-extrabold text-teal-800">Espace réservé aux conseillers</h1>
            <p className="text-sm text-teal-700/80 mt-2">
              Votre compte n'a pas le rôle conseiller. Rapprochez-vous de votre structure
              pour l'obtenir, puis reconnectez-vous.
            </p>
            <Link href="/" className="inline-block mt-5 px-5 py-2.5 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-all">
              Retour à l'accueil
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ── Compteurs de tête ────────────────────────────────────────────────────

  const total = list.length;
  const enAttente = list.filter((b) => b.consentStatus !== 'granted').length;
  const autonomes = list.filter((b) => b.pilotage === 'autonome').length;
  const tokensMois = list.reduce((s, b) => s + (b.usage?.tokensThisMonth || 0), 0);

  return (
    <div className="min-h-screen bg-cream-100 text-teal-900 flex flex-col">
      <Header />

      <main className="flex-1 max-w-[1100px] w-full mx-auto px-6 py-8">

        {/* Titre + action */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-teal-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-teal-700" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-teal-800">Mon groupe accompagné</h1>
              <p className="text-sm text-teal-700/70">Suivi en lecture seule, une ligne par personne.</p>
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 disabled:bg-teal-200 transition-all shadow-soft focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Ajouter une personne
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Cartes de synthèse */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Stat icon={Users} label="Personnes suivies" value={total} tone="teal" />
          <Stat icon={ShieldAlert} label="Consentement à obtenir" value={enAttente} tone="amber" />
          <Stat icon={Compass} label="En autonomie" value={autonomes} tone="teal" />
          <Stat icon={Coins} label="Tokens IA ce mois" value={formatTokens(tokensMois)} tone="teal" />
        </div>

        {/* Tableau radar */}
        {total === 0 ? (
          <div className="bg-white border border-cream-200 rounded-2xl shadow-card p-10 text-center">
            <Compass className="w-10 h-10 text-teal-400 mx-auto mb-3" />
            <p className="text-teal-800 font-semibold">Aucune personne pour l'instant</p>
            <p className="text-sm text-teal-700/70 mt-1">
              Cliquez sur « Ajouter une personne ». Un code sortira, à remettre à l'intéressé
              pour qu'il crée son accès.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-cream-200 rounded-2xl shadow-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-cream-50 text-teal-700/70 text-left text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 font-semibold">Code</th>
                  <th className="px-4 py-3 font-semibold">Consentement</th>
                  <th className="px-4 py-3 font-semibold">Pilotage</th>
                  <th className="px-4 py-3 font-semibold">Candidatures</th>
                  <th className="px-4 py-3 font-semibold">Tokens (mois)</th>
                  <th className="px-4 py-3 font-semibold">Tokens (total)</th>
                  <th className="px-4 py-3 font-semibold">Accès</th>
                  <th className="px-4 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {list.map((b) => (
                  <tr key={b.id} className="border-t border-cream-100 hover:bg-cream-50/50">
                    <td className="px-4 py-3 font-mono font-semibold text-teal-800">{b.code}</td>
                    <td className="px-4 py-3"><Badge map={CONSENT} value={b.consentStatus} /></td>
                    <td className="px-4 py-3"><Badge map={PILOTAGE} value={b.pilotage} /></td>
                    <td className="px-4 py-3 text-teal-700">{b.candidaturesCount}</td>
                    <td className="px-4 py-3 font-medium text-teal-800">{formatTokens(b.usage?.tokensThisMonth)}</td>
                    <td className="px-4 py-3 text-teal-700/70">{formatTokens(b.usage?.tokensTotal)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${b.status === 'active' ? 'text-teal-600' : 'text-amber-600'}`}>
                        {b.status === 'active' ? 'Actif' : 'Code non activé'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setConfirmDelete(b)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400"
                        aria-label={`Supprimer le dossier ${b.code}`}
                        title="Supprimer ce dossier"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* File des avis demandés */}
        <AvisQueue
          avis={avis}
          drafts={drafts}
          setDrafts={setDrafts}
          onReply={sendReply}
          replyingId={replyingId}
          onOpenFiche={(a) => setOpenFiche({ avisId: a.id, code: a.beneficiaireCode })}
        />
      </main>

      {/* Modale : confirmation de suppression d'un dossier */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-teal-900/40"
          role="dialog"
          aria-modal="true"
          onClick={() => deletingId ? null : setConfirmDelete(null)}
        >
          <div className="bg-white rounded-2xl shadow-card p-7 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6 text-rose-600" />
            </div>
            <h2 className="text-lg font-extrabold text-teal-800 text-center">Supprimer ce dossier ?</h2>
            <p className="text-sm text-teal-700/80 mt-2 text-center">
              Le dossier <span className="font-mono font-semibold">{confirmDelete.code}</span> et toutes ses
              données (candidatures, campagnes, CV, échanges) seront effacés définitivement. Cette action est
              irréversible.
            </p>
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={!!deletingId}
                className="flex-1 px-4 py-2.5 rounded-xl border border-cream-300 text-teal-700 font-semibold hover:bg-cream-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(confirmDelete.id)}
                disabled={!!deletingId}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 disabled:bg-rose-300"
              >
                {deletingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale : fiche partagée en entier */}
      {openFiche && (
        <FicheConseiller
          avisId={openFiche.avisId}
          code={openFiche.code}
          onClose={() => setOpenFiche(null)}
        />
      )}

      {/* Modale : code fraîchement généré */}
      {newCode && (
        <div className="fixed inset-0 bg-teal-900/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-card p-8 max-w-sm w-full relative">
            <button
              onClick={() => setNewCode(null)}
              className="absolute top-4 right-4 text-teal-500 hover:text-teal-800"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center mx-auto mb-3">
                <Send className="w-6 h-6 text-teal-700" />
              </div>
              <h2 className="text-lg font-extrabold text-teal-800">Code créé</h2>
              <p className="text-sm text-teal-700/80 mt-1">
                Remettez ce code à la personne. Elle choisira son mot de passe à la première
                connexion.
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <span className="font-mono text-xl font-bold text-teal-900 bg-cream-50 border border-cream-200 rounded-xl px-4 py-2">
                  {newCode}
                </span>
                <button
                  onClick={copyCode}
                  className="p-2.5 rounded-xl border border-cream-300 hover:bg-cream-50 text-teal-700"
                  aria-label="Copier le code"
                >
                  {copied ? <Check className="w-5 h-5 text-teal-600" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
              <button
                onClick={() => setNewCode(null)}
                className="mt-6 w-full px-5 py-2.5 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-all"
              >
                Terminé
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

// ─── Sous-composants ───────────────────────────────────────────────────────

function Header() {
  return (
    <header className="bg-cream-50 border-b border-cream-200">
      <div className="max-w-[1100px] mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="focus:outline-none focus:ring-2 focus:ring-teal-500 rounded">
          <BrandLogo size="md" />
        </Link>
        <div className="hidden md:flex">
          <AccessibilityBar />
        </div>
      </div>
    </header>
  );
}

function Stat({ icon: Icon, label, value, tone }) {
  const tones = {
    teal: 'bg-teal-100 text-teal-700',
    amber: 'bg-amber-100 text-amber-700',
  };
  return (
    <div className="bg-white border border-cream-200 rounded-2xl shadow-card p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${tones[tone] || tones.teal}`}>
        <Icon className="w-6 h-6" aria-hidden="true" />
      </div>
      <div>
        <div className="text-2xl font-extrabold text-teal-800 leading-none">{value}</div>
        <div className="text-xs text-teal-700/70 mt-1">{label}</div>
      </div>
    </div>
  );
}

// Photo des emplois figés au moment de la demande. Lecture rapide pour le
// conseiller : intitulé, entreprise, lieu, avec lien vers l'annonce.
function OffersPreview({ offers = [] }) {
  if (!offers.length) return null;
  return (
    <ul className="mt-2 space-y-1">
      {offers.slice(0, 6).map((o, i) => (
        <li key={i} className="text-xs text-teal-700/80 flex items-start gap-1.5">
          <span className="text-teal-400 mt-0.5">•</span>
          <span>
            {o.url ? (
              <a href={o.url} target="_blank" rel="noopener noreferrer"
                 className="font-semibold text-teal-700 hover:underline inline-flex items-center gap-1">
                {o.intitule}<ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            ) : (
              <span className="font-semibold text-teal-700">{o.intitule}</span>
            )}
            {(o.entreprise || o.lieu) && (
              <span className="text-teal-700/60"> — {[o.entreprise, o.lieu].filter(Boolean).join(', ')}</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

// File des demandes d'avis. En attente d'abord (avec zone de réponse), puis les
// demandes déjà traitées, repliées visuellement.
function FicheButton({ avis, onOpenFiche }) {
  if (!avis.context?.shared) return null;
  return (
    <button
      type="button"
      onClick={() => onOpenFiche(avis)}
      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-200 bg-white text-xs font-semibold text-teal-700 hover:border-teal-300 hover:bg-teal-50 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-400"
    >
      <Eye className="w-3.5 h-3.5" /> Voir la fiche complète
    </button>
  );
}

function AvisQueue({ avis, drafts, setDrafts, onReply, replyingId, onOpenFiche }) {
  if (!avis || avis.length === 0) return null;
  const pending = avis.filter((a) => a.status === 'pending');
  const answered = avis.filter((a) => a.status === 'answered');

  return (
    <section className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquareHeart className="w-5 h-5 text-teal-700" aria-hidden="true" />
        <h2 className="text-xl font-extrabold text-teal-800">Avis demandés</h2>
        {pending.length > 0 && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
            {pending.length} en attente
          </span>
        )}
      </div>

      <div className="space-y-3">
        {pending.map((a) => (
          <div key={a.id} className="bg-white border border-amber-200 rounded-2xl shadow-card p-5">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-amber-500" aria-hidden="true" />
              <span className="font-mono font-semibold text-teal-800">{a.beneficiaireCode}</span>
              <span className="text-teal-700/60">demande un avis sur</span>
              <span className="font-semibold text-teal-800">{a.context?.metier || 'des emplois'}</span>
            </div>
            {a.note && (
              <p className="mt-2 text-sm text-teal-800 bg-cream-50 border border-cream-200 rounded-lg px-3 py-2 whitespace-pre-wrap">
                {a.note}
              </p>
            )}
            <OffersPreview offers={a.context?.offers} />
            <SharedContext context={a.context} />
            <FicheButton avis={a} onOpenFiche={onOpenFiche} />

            <div className="mt-3">
              <label htmlFor={`reply-${a.id}`} className="sr-only">Votre réponse</label>
              <textarea
                id={`reply-${a.id}`}
                value={drafts[a.id] || ''}
                onChange={(e) => setDrafts((d) => ({ ...d, [a.id]: e.target.value }))}
                rows={2}
                maxLength={2000}
                placeholder="Votre avis, en quelques mots…"
                className="w-full p-3 text-sm rounded-lg border border-cream-300 bg-white outline-none focus:ring-2 focus:ring-teal-400 placeholder:text-teal-700/40"
              />
              <div className="mt-2 flex justify-end">
                <button
                  onClick={() => onReply(a.id)}
                  disabled={replyingId === a.id || !(drafts[a.id] || '').trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 disabled:bg-teal-200 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                >
                  {replyingId === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Répondre
                </button>
              </div>
            </div>
          </div>
        ))}

        {answered.map((a) => (
          <div key={a.id} className="bg-white border border-cream-200 rounded-2xl shadow-card p-5 opacity-90">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-teal-600" aria-hidden="true" />
              <span className="font-mono font-semibold text-teal-800">{a.beneficiaireCode}</span>
              <span className="text-teal-700/60">— {a.context?.metier || 'emplois'} · répondu</span>
            </div>
            {a.note && (
              <p className="mt-2 text-sm text-teal-800/90 bg-cream-50 border border-cream-200 rounded-lg px-3 py-2 whitespace-pre-wrap">
                {a.note}
              </p>
            )}
            <SharedContext context={a.context} />
            <FicheButton avis={a} onOpenFiche={onOpenFiche} />
            <p className="mt-2 text-sm text-teal-800 whitespace-pre-wrap">
              <span className="font-semibold text-teal-700">Votre réponse : </span>{a.reply}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
