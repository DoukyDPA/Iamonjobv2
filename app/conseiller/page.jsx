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

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import {
  Loader2, Users, UserPlus, ShieldCheck, ShieldAlert, ShieldX,
  Compass, Copy, Check, X, AlertCircle, Send,
  MessageSquareHeart, Clock, CheckCircle2, ExternalLink, Coins, Eye, Trash2,
  Camera, UserCircle, Flag, Ban, ThumbsUp, Undo2, LayoutDashboard, UsersRound,
  ClipboardList, MessagesSquare, FileSignature, HeartHandshake, Printer, Crown,
} from 'lucide-react';
import FichePersonne from '@/components/conseiller/FichePersonne';
import BaseQuestionnaires from '@/components/conseiller/BaseQuestionnaires';
import PromosPanel from '@/components/conseiller/PromosPanel';
import AccompagnementsPanel from '@/components/conseiller/AccompagnementsPanel';
import LotCodesModal, { printCoupons } from '@/components/conseiller/LotCodesModal';
import ATraiter from '@/components/conseiller/ATraiter';
import EquipePanel from '@/components/conseiller/EquipePanel';
import { PrenomsProvider, PrenomsBar, Prenom } from '@/components/conseiller/Prenoms';
import DocumentsPanel from '@/components/conseiller/DocumentsPanel';
import ReponsesEnvois from '@/components/conseiller/ReponsesEnvois';

// Onglets du tableau de bord (l'onglet ouvert est gardé dans l'adresse : #promos…).
const ONGLETS = [
  { id: 'promos', label: 'Promos', icon: UsersRound },
  { id: 'accompagnements', label: 'Accompagnements', icon: HeartHandshake },
  { id: 'questionnaires', label: 'Questionnaires', icon: ClipboardList },
  { id: 'messages', label: 'Messages', icon: MessagesSquare },
  { id: 'documents', label: 'Documents', icon: FileSignature },
];
// Onglet réservé au responsable de structure.
const ONGLET_EQUIPE = { id: 'equipe', label: 'Équipe', icon: Crown };

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
import SuiviQuestionnaires from '@/components/conseiller/SuiviQuestionnaires';

// ─── Libellés et styles des statuts ─────────────────────────────────────────

const CONSENT = {
  granted: { label: 'Accordé',    cls: 'bg-teal-50 text-teal-700 border-teal-200',   Icon: ShieldCheck },
  pending: { label: 'En attente', cls: 'bg-amber-50 text-amber-700 border-amber-200', Icon: ShieldAlert },
  revoked: { label: 'Retiré',     cls: 'bg-rose-50 text-rose-700 border-rose-200',    Icon: ShieldX },
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
  const [fiche, setFiche] = useState(null); // bénéficiaire ouvert | null
  const [onglet, setOnglet] = useState('accompagnements');
  const [profilOpen, setProfilOpen] = useState(false);
  const [promoFiltre, setPromoFiltre] = useState('');
  const [suiviFocus, setSuiviFocus] = useState(null);
  const [lotOpen, setLotOpen] = useState(false);
  const [responsable, setResponsable] = useState(false);

  // Onglet lu dans l'adresse au chargement, et mis à jour à chaque changement.
  useEffect(() => {
    const h = (typeof window !== 'undefined' ? window.location.hash : '').replace('#', '');
    if (ONGLETS.some((o) => o.id === h) || h === 'equipe') setOnglet(h);
  }, []);
  function changerOnglet(id) {
    setOnglet(id);
    try { window.history.replaceState(null, '', `#${id}`); } catch { /* sans effet */ }
  }

  async function load() {
    const res = await fetch('/api/conseiller/beneficiaires');
    if (res.status === 403) { setForbidden(true); setLoading(false); return; }
    if (!res.ok) { setError('Chargement impossible.'); setLoading(false); return; }
    const data = await res.json();
    setList(data.beneficiaires || []);
    // Responsable de structure ? (onglet Équipe)
    fetch('/api/conseiller/equipe').then((r) => (r.ok ? r.json() : null)).then((d) => setResponsable(Boolean(d?.responsable))).catch(() => {});
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
  const nonActives = list.filter((b) => b.status !== 'active').length;
  const promosEnCours = new Set(list.filter((b) => b.parcoursId && !b.promoArchivee).map((b) => `${b.parcoursId}::${b.promo || ''}`)).size;
  const avisEnAttente = avis.filter((a) => a.status === 'pending').length;

  return (
    <PrenomsProvider>
    <div className="min-h-screen bg-cream-100 text-teal-900 flex flex-col">
      <Header />

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-6">

        {/* En-tête du tableau de bord */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-teal-100 flex items-center justify-center">
              <LayoutDashboard className="w-6 h-6 text-teal-700" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-teal-800">Tableau de bord</h1>
              <p className="text-sm text-teal-700/70">Vos promos, vos accompagnements, vos échanges.</p>
            </div>
          </div>
          <button
            onClick={() => setProfilOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-teal-200 bg-white text-teal-800 font-semibold text-sm hover:bg-teal-50"
          >
            <UserCircle className="w-4 h-4" /> Mon profil
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Indicateurs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <Stat icon={Users} label="Personnes suivies" value={total} tone="teal" />
          <Stat icon={UsersRound} label="Promos en cours" value={promosEnCours} tone="teal" />
          <Stat icon={MessageSquareHeart} label="Messages à traiter" value={avisEnAttente} tone={avisEnAttente > 0 ? 'amber' : 'teal'} />
          <Stat icon={Clock} label="Accès non activés" value={nonActives} tone={nonActives > 0 ? 'amber' : 'teal'} />
        </div>

        {/* Prénoms lus dans le fichier local du conseiller, jamais envoyés */}
        <PrenomsBar />

        {/* Ce qui demande une action aujourd'hui */}
        <ATraiter
          list={list}
          avisEnAttente={avisEnAttente}
          onOpenPersonne={setFiche}
          onGoTo={(id) => changerOnglet(id)}
        />

        {/* Onglets */}
        <nav className="flex gap-1 overflow-x-auto border-b border-cream-200 mb-6 -mx-1 px-1" role="tablist" aria-label="Sections du tableau de bord">
          {(responsable ? [...ONGLETS, ONGLET_EQUIPE] : ONGLETS).map((o) => {
            const Icon = o.icon;
            const badge = o.id === 'messages' ? avisEnAttente : 0;
            const actif = onglet === o.id;
            return (
              <button
                key={o.id}
                role="tab"
                aria-selected={actif}
                onClick={() => changerOnglet(o.id)}
                className={`relative inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${actif ? 'border-teal-600 text-teal-800' : 'border-transparent text-teal-700/70 hover:text-teal-800 hover:border-teal-200'}`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" /> {o.label}
                {badge > 0 && <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">{badge}</span>}
              </button>
            );
          })}
        </nav>

        {onglet === 'promos' && (
          <PromosPanel
            beneficiaires={list}
            onChanged={load}
            onVoirSuivi={(p) => { setSuiviFocus(p.key); changerOnglet('questionnaires'); }}
            onVoirPersonnes={(p) => { setPromoFiltre(p.promo || ''); changerOnglet('accompagnements'); }}
          />
        )}

        {onglet === 'accompagnements' && (
          <AccompagnementsPanel
            key={promoFiltre}
            list={list}
            promoFiltre={promoFiltre}
            onOpen={setFiche}
            onDelete={setConfirmDelete}
            onCreate={handleCreate}
            onCreateMany={() => setLotOpen(true)}
            creating={creating}
          />
        )}

        {onglet === 'questionnaires' && (
          <>
            <SuiviQuestionnaires beneficiaires={list} onAssigned={load} focusKey={suiviFocus} />
            <BaseQuestionnaires beneficiaires={list} onChanged={load} />
          </>
        )}

        {onglet === 'messages' && (
          <>
            <AvisQueue
              avis={avis}
              drafts={drafts}
              setDrafts={setDrafts}
              onReply={sendReply}
              replyingId={replyingId}
              onOpenFiche={(a) => setOpenFiche({ avisId: a.id, code: a.beneficiaireCode })}
            />
            <ReponsesEnvois beneficiaires={list} onOpenPersonne={setFiche} />
            <OfferReportsPanel />
          </>
        )}

        {onglet === 'documents' && <DocumentsPanel beneficiaires={list} onOpenPersonne={setFiche} />}

        {onglet === 'equipe' && responsable && <EquipePanel onChanged={load} />}
      </main>

      {/* Mon profil : prénom + photo, visibles par les personnes accompagnées */}
      {profilOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-900/50" role="dialog" aria-modal="true" aria-label="Mon profil" onClick={() => setProfilOpen(false)}>
          <div className="w-full max-w-xl relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setProfilOpen(false)} aria-label="Fermer" className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center text-teal-700 hover:bg-cream-200/70">
              <X className="w-5 h-5" />
            </button>
            <ProfilePanel />
          </div>
        </div>
      )}

      {lotOpen && <LotCodesModal onClose={() => setLotOpen(false)} onCreated={load} />}

      {/* Fiche d'une personne : métiers, envois, transfert */}
      {fiche && <FichePersonne beneficiaire={fiche} onClose={() => setFiche(null)} onChanged={load} />}

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
              Le dossier <span className="font-mono font-semibold">{confirmDelete.code}<Prenom code={confirmDelete.code} /></span> et toutes ses
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
                onClick={() => printCoupons([newCode])}
                className="mt-5 w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-teal-200 bg-white text-teal-800 rounded-xl font-semibold hover:bg-teal-50 transition-all"
              >
                <Printer className="w-4 h-4" /> Imprimer le coupon
              </button>
              <button
                onClick={() => setNewCode(null)}
                className="mt-2 w-full px-5 py-2.5 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-all"
              >
                Terminé
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
    </PrenomsProvider>
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

// « Mon profil » : le conseiller renseigne un prénom et une photo. La personne
// accompagnée les voit ensuite sous « Mon conseiller : prénom ». Composant
// autonome : il charge et enregistre son propre état.
function ProfilePanel() {
  const [profile, setProfile] = useState(null);
  const [prenom, setPrenom] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const fileRef = useRef(null);

  async function loadProfile() {
    try {
      const res = await fetch('/api/conseiller/profile');
      if (!res.ok) return;
      const d = await res.json();
      setProfile(d.profile || null);
      setPrenom(d.profile?.prenom || '');
    } catch { /* silencieux */ }
  }

  useEffect(() => { loadProfile(); }, []);

  async function savePrenom() {
    setSaving(true); setErr(null); setMsg(null);
    try {
      const res = await fetch('/api/conseiller/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prenom }),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setProfile(d.profile);
      setMsg('Profil enregistré.');
    } catch {
      setErr("L'enregistrement a échoué. Réessayez.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadPhoto(file) {
    if (!file) return;
    setUploading(true); setErr(null); setMsg(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/conseiller/profile/photo', { method: 'POST', body: fd });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "L'envoi de la photo a échoué.");
      setProfile(d.profile);
      setMsg('Photo mise à jour.');
    } catch (e) {
      setErr(e.message || "L'envoi de la photo a échoué.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="mb-6 bg-white border border-cream-200 rounded-2xl shadow-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <UserCircle className="w-5 h-5 text-teal-700" aria-hidden="true" />
        <h2 className="text-base font-extrabold text-teal-800">Mon profil</h2>
        <span className="text-xs text-teal-700/60">visible par les personnes que vous accompagnez</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-5">
        {/* Photo + bouton de changement */}
        <div className="flex items-center gap-3 shrink-0">
          {profile?.photoUrl ? (
            <img src={profile.photoUrl} alt="Votre photo" className="w-16 h-16 rounded-full object-cover border-2 border-cream-200" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center">
              <UserCircle className="w-9 h-9 text-teal-500" aria-hidden="true" />
            </div>
          )}
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".png,.jpg,.jpeg,.webp"
              className="sr-only"
              onChange={(e) => uploadPhoto(e.target.files?.[0] || null)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-cream-300 text-teal-700 text-sm font-semibold hover:bg-cream-50 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              {profile?.photoUrl ? 'Changer la photo' : 'Ajouter une photo'}
            </button>
            <p className="mt-1 text-[11px] text-teal-700/50">PNG, JPEG ou WebP · 3 Mo maximum.</p>
          </div>
        </div>

        {/* Prénom + enregistrement */}
        <div className="flex-1 min-w-0">
          <label htmlFor="conseiller-prenom" className="block text-sm font-semibold text-teal-800 mb-1.5">
            Votre prénom
          </label>
          <div className="flex items-center gap-2">
            <input
              id="conseiller-prenom"
              type="text"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              maxLength={40}
              placeholder="Ex : Camille"
              className="flex-1 p-2.5 text-sm rounded-lg border border-cream-300 bg-white outline-none focus:ring-2 focus:ring-teal-400 placeholder:text-teal-700/40"
            />
            <button
              type="button"
              onClick={savePrenom}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:bg-teal-200"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Enregistrer
            </button>
          </div>
          {msg && <p className="mt-2 text-sm text-teal-700">{msg}</p>}
          {err && <p className="mt-2 text-sm text-rose-600">{err}</p>}
        </div>
      </div>
    </div>
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
        <h2 className="text-xl font-extrabold text-teal-800">Messages</h2>
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
              <span className="font-mono font-semibold text-teal-800">{a.beneficiaireCode}<Prenom code={a.beneficiaireCode} /></span>
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
              <span className="font-mono font-semibold text-teal-800">{a.beneficiaireCode}<Prenom code={a.beneficiaireCode} /></span>
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

// ════════════════════════════════════════════════════════════════════════════
// Offres signalées « hors sujet ».
//
// Un candidat qui signale une offre ne la masque que pour lui. Ici, le
// conseiller tranche : « Exclure » la retire pour tous sur ce métier,
// « Garder » la laisse visible (elle reste masquée pour qui l'a signalée).
// Regroupement par métier : c'est ce qui fait voir les défauts récurrents.
// ════════════════════════════════════════════════════════════════════════════
function OfferReportsPanel() {
  const [view, setView] = useState('pending');
  const [reports, setReports] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [failed, setFailed] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  async function load(status = view) {
    try {
      const res = await fetch(`/api/conseiller/offer-reports?status=${status}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setReports(data.reports || []);
      if (status === 'pending') setPendingCount((data.reports || []).length);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }

  useEffect(() => { load(view); }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  async function decide(id, decision) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/conseiller/offer-reports/${encodeURIComponent(id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      if (!res.ok) throw new Error();
      setReports((r) => r.filter((x) => x.id !== id));
      if (view === 'pending') setPendingCount((n) => Math.max(0, n - 1));
    } catch {
      setFailed(true);
    } finally {
      setBusyId(null);
    }
  }

  // Regroupement par métier, métiers les plus signalés d'abord.
  const groups = Object.values(
    reports.reduce((acc, r) => {
      const k = r.metierKey || r.metier;
      if (!acc[k]) acc[k] = { metier: r.metier, codeRome: r.codeRome, total: 0, items: [] };
      acc[k].items.push(r);
      acc[k].total += r.reportCount;
      return acc;
    }, {})
  ).sort((a, b) => b.total - a.total);

  const tabs = [['pending', 'À valider'], ['excluded', 'Exclues'], ['kept', 'Gardées']];

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Flag className="w-5 h-5 text-teal-700" aria-hidden="true" />
        <h2 className="text-xl font-extrabold text-teal-800">Offres signalées « hors sujet »</h2>
        {pendingCount > 0 && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
            {pendingCount} à valider
          </span>
        )}
        <div className="ml-auto flex gap-1 bg-cream-50 border border-cream-200 rounded-lg p-1">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              className={`px-3 py-1 rounded-md text-sm ${view === key ? 'bg-white shadow-soft font-semibold text-teal-800' : 'text-teal-700/70 hover:text-teal-800'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {failed && (
        <p className="text-sm text-rose-600 mb-3">Chargement ou décision impossible. Réessayez.</p>
      )}

      {!failed && groups.length === 0 && (
        <p className="text-sm text-teal-700/60">
          {view === 'pending' ? 'Aucun signalement en attente.' : 'Rien ici pour le moment.'}
        </p>
      )}

      <div className="space-y-4">
        {groups.map((g) => (
          <div key={g.metier} className="bg-white border border-cream-200 rounded-2xl shadow-card p-5">
            <div className="flex flex-wrap items-baseline gap-2 mb-3">
              <span className="font-bold text-teal-800">{g.metier}</span>
              {g.codeRome && <span className="font-mono text-xs text-teal-700/60">{g.codeRome}</span>}
              <span className="text-xs text-teal-700/60">
                · {g.items.length} offre{g.items.length > 1 ? 's' : ''}, {g.total} signalement{g.total > 1 ? 's' : ''}
              </span>
            </div>
            <ul className="divide-y divide-cream-100">
              {g.items.map((r) => (
                <li key={r.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-teal-800 truncate">
                      {r.offer?.url ? (
                        <a href={r.offer.url} target="_blank" rel="noopener noreferrer" className="hover:underline inline-flex items-center gap-1">
                          {r.offer?.intitule} <ExternalLink className="w-3 h-3 opacity-60" />
                        </a>
                      ) : r.offer?.intitule}
                    </div>
                    <div className="text-xs text-teal-700/60 truncate">
                      {[r.offer?.entreprise, r.offer?.lieu, r.offer?.source, r.offer?.codeRome].filter(Boolean).join(' · ')}
                      {' · '}{r.reportCount} signalement{r.reportCount > 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {view === 'pending' ? (
                      <>
                        <button
                          type="button"
                          disabled={busyId === r.id}
                          onClick={() => decide(r.id, 'excluded')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold hover:bg-rose-100 disabled:opacity-50"
                          title="Hors sujet : l'offre disparaît pour tous sur ce métier"
                        >
                          <Ban className="w-3.5 h-3.5" /> Exclure
                        </button>
                        <button
                          type="button"
                          disabled={busyId === r.id}
                          onClick={() => decide(r.id, 'kept')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 text-xs font-semibold hover:bg-teal-100 disabled:opacity-50"
                          title="L'offre est pertinente : elle reste visible"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" /> Garder
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => decide(r.id, 'pending')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cream-50 text-teal-700 border border-cream-200 text-xs font-semibold hover:bg-cream-100 disabled:opacity-50"
                        title="Annuler la décision et remettre en file"
                      >
                        <Undo2 className="w-3.5 h-3.5" /> Annuler
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
