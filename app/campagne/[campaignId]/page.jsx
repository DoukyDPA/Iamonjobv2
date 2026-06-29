'use client';

// ════════════════════════════════════════════════════════════════════════════
// Page de validation conseiller — Lot 4 du module candidatures spontanées
//
// Accès : /campagne/[campaignId]
//
// Flux :
//   1. Chargement de la campagne via GET /api/campaign/[campaignId]
//   2. Lecture du profil, du brouillon email, des entreprises
//   3. Le conseiller / candidat ajuste les décisions (keep/reject) et les emails
//   4. Bouton "Valider" → PATCH status:'validated'  (≥1 entreprise en keep)
//   5. Post-validation : tout passe en lecture seule
//   6. Toute modification post-validation repasse en pending_validation automatiquement
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import {
  Loader2, CheckCircle2, Clock, Send, AlertCircle, ChevronLeft,
  Building2, MapPin, Star, Mail, FileText, MessageSquare,
  ThumbsUp, ThumbsDown, HelpCircle, Lock, ExternalLink, RefreshCw,
  ClipboardList, ShieldCheck, Info, X, Download,
} from 'lucide-react';
import { Button, Badge, Card } from '@/components/ui';

// ─── Constantes ───────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  draft:              { label: 'Brouillon',             color: 'gray',    Icon: Clock },
  pending_validation: { label: 'Validée',               color: 'emerald', Icon: CheckCircle2 },
  validated:          { label: 'Validée',               color: 'emerald', Icon: CheckCircle2 },
  done:               { label: 'Candidatures envoyées', color: 'teal',    Icon: CheckCircle2 },
  sending:            { label: 'Candidatures envoyées', color: 'teal',    Icon: CheckCircle2 },
};

// ─── Composants utilitaires locaux ────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  const Icon = cfg.Icon;
  const colorMap = {
    gray:    'bg-slate-100 text-slate-600 border-slate-200',
    amber:   'bg-amber-50 text-amber-700 border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    teal:    'bg-teal-50 text-teal-700 border-teal-100',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-medium ${colorMap[cfg.color]}`}>
      <Icon className="w-3.5 h-3.5" />
      {cfg.label}
    </span>
  );
}

function StarScore({ stars }) {
  if (!stars) return <span className="text-slate-400 text-xs">—</span>;
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3].map((i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i <= stars ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`}
        />
      ))}
    </span>
  );
}

function SectionHeading({ icon: Icon, children, className = '' }) {
  return (
    <h2 className={`flex items-center gap-2 text-base font-bold text-teal-800 ${className}`}>
      {Icon && <Icon className="w-5 h-5 text-teal-600 shrink-0" />}
      {children}
    </h2>
  );
}

// Textarea auto-hauteur
function AutoTextarea({ value, onChange, readOnly, placeholder, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      placeholder={placeholder}
      rows={3}
      className={`w-full resize-none rounded-xl border px-4 py-3 text-sm leading-relaxed outline-none transition-all overflow-hidden
        ${readOnly
          ? 'bg-cream-50 border-cream-200 text-teal-800/80 cursor-default'
          : 'bg-white border-cream-200 text-teal-900 focus:ring-2 focus:ring-teal-400 focus:border-transparent'
        } ${className}`}
    />
  );
}

// ─── Page principale ──────────────────────────────────────────────────────

export default function CampaignValidationPage() {
  const { campaignId } = useParams();
  const router = useRouter();

  // Auth
  const [authReady, setAuthReady] = useState(false);
  const [uid, setUid] = useState(null);

  // Données campagne
  const [campaign, setCampaign] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // État local éditable (miroir mutable des données Firestore)
  const [companies, setCompanies] = useState([]);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [advisorNotes, setAdvisorNotes] = useState('');
  const [selectedPitchIndex, setSelectedPitchIndex] = useState(0);

  // UX
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // (export PDF : pas d'état local, simple lien vers /pdf)

  // Panels expandés
  const [expandedRow, setExpandedRow] = useState(null);

  // ── Auth ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.push('/login');
        return;
      }
      const token = await firebaseUser.getIdToken();
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      setUid(firebaseUser.uid);
      setAuthReady(true);
    });
    return () => unsub();
  }, [router]);

  // ── Chargement de la campagne ─────────────────────────────────────────

  const loadCampaign = useCallback(async () => {
    if (!authReady) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/campaign/${campaignId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Erreur ${res.status}`);
      }
      const { campaign: data } = await res.json();
      setCampaign(data);
      setCompanies(data.companies || []);
      setEmailSubject(data.emailTemplate?.subject || '');
      setEmailBody(data.emailTemplate?.body || '');
      setAdvisorNotes(data.validationLog?.advisorNotes || '');
      setSelectedPitchIndex(0);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [campaignId, authReady]);

  useEffect(() => { loadCampaign(); }, [loadCampaign]);

  // ── Helpers d'état ────────────────────────────────────────────────────

  const isReadOnly = campaign?.status === 'validated'
    || campaign?.status === 'done';

  const keepCount = companies.filter((c) => c.decision === 'keep').length;
  const canValidate = keepCount >= 1 && !isReadOnly;

  // ── Mise à jour d'une entreprise dans l'état local ───────────────────

  const updateCompany = (idx, patch) => {
    setCompanies((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
    // Sur campagne validée : repasse en pending_validation automatiquement
    // (le PATCH API s'en chargera côté serveur, on met à jour l'état local aussi)
    if (isReadOnly) {
      setCampaign((prev) => ({ ...prev, status: 'pending_validation' }));
    }
  };

  // Personnalise un email avec les données d'une entreprise
  const personalizeEmail = (body, company) => {
    const sector = (company.nafText || company.naf || '').replace(/\(.*?\)/g, '').trim();
    return body
      .replace(/\{\{NOM_ENTREPRISE\}\}/g, company.name || '')
      .replace(/\{\{VILLE\}\}/g, company.city || '')
      .replace(/\{\{SECTEUR\}\}/g, sector || 'votre secteur');
  };

  // Régénère les emailBody de toutes les entreprises quand le template change
  const applyTemplateToAll = () => {
    setCompanies((prev) =>
      prev.map((c) =>
        c.email
          ? { ...c, emailBody: personalizeEmail(emailBody, c) }
          : c
      )
    );
  };

  // ── Sauvegarde intermédiaire ──────────────────────────────────────────

  const saveDraft = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/campaign/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companies,
          emailTemplate: { subject: emailSubject, body: emailBody },
          validationLog: {
            ...(campaign?.validationLog || {}),
            advisorNotes,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Erreur ${res.status}`);
      }
      const { newStatus } = await res.json();
      setCampaign((prev) => ({ ...prev, status: newStatus || prev.status }));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Soumission au conseiller ─────────────────────────────────────────

  const submitForValidation = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/campaign/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pending_validation' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Erreur ${res.status}`);
      }
      setCampaign((prev) => ({ ...prev, status: 'pending_validation' }));
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Validation ────────────────────────────────────────────────────────

  const validateCampaign = async () => {
    if (isValidating || !canValidate) return;
    setIsValidating(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/campaign/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'validated',
          companies,
          emailTemplate: { subject: emailSubject, body: emailBody },
          validationLog: {
            ...(campaign?.validationLog || {}),
            advisorNotes,
            validatedAt: new Date().toISOString(), // remplacé côté serveur
            validatedBy: uid,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Erreur ${res.status}`);
      }
      setCampaign((prev) => ({ ...prev, status: 'validated' }));
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setIsValidating(false);
    }
  };

  // (envoi supprimé — export PDF uniquement)

  // ── Rendu conditionnel ────────────────────────────────────────────────

  if (!authReady || isLoading) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-cream-100 flex flex-col items-center justify-center gap-4 p-6">
        <AlertCircle className="w-10 h-10 text-rose-500" />
        <p className="text-teal-800 font-semibold">{loadError}</p>
        <Button variant="secondary" onClick={() => router.push('/')} icon={ChevronLeft}>
          Retour à l'accueil
        </Button>
      </div>
    );
  }

  if (!campaign) return null;

  const profile = campaign.candidateProfile || {};
  const validationLog = campaign.validationLog || {};

  // ── Rendu principal ───────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-cream-100 text-teal-900">

      {/* ══ En-tête de page ═══════════════════════════════════════════════ */}
      <header className="bg-white border-b border-cream-200 shadow-soft sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-800 font-medium self-start"
          >
            <ChevronLeft className="w-4 h-4" />
            Retour
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold text-teal-800 truncate">
                Campagne : {campaign.jobTitle}
              </h1>
              <StatusBadge status={campaign.status} />
            </div>
            <p className="text-xs text-teal-700/60 mt-0.5">
              {companies.length} entreprise{companies.length > 1 ? 's' : ''} · {keepCount} retenue{keepCount > 1 ? 's' : ''}
            </p>
          </div>

          {/* Actions en-tête */}
          <div className="flex items-center gap-2 shrink-0">
            {campaign.status === 'draft' && (
              <Button
                onClick={submitForValidation}
                disabled={isSubmitting}
                variant="secondary"
                icon={Send}
                size="sm"
              >
                {isSubmitting ? 'Validation…' : 'Valider la campagne'}
              </Button>
            )}
            {!isReadOnly && (
              <Button
                onClick={saveDraft}
                disabled={isSaving}
                variant="secondary"
                size="sm"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}
                {saveSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              </Button>
            )}
            {isReadOnly && (
              <span className="inline-flex items-center gap-1.5 text-xs text-teal-600 bg-teal-50 border border-teal-100 rounded-lg px-3 py-1.5">
                <Lock className="w-3.5 h-3.5" />
                Lecture seule
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ══ Bandeau d'erreur ══════════════════════════════════════════════ */}
      {saveError && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-4">
          <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="flex-1">{saveError}</span>
            <button onClick={() => setSaveError(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ══ 1. Profil candidat ══════════════════════════════════════════ */}
        <Card>
          <div className="px-6 pt-5 pb-2 border-b border-cream-200 bg-cream-50/60">
            <SectionHeading icon={FileText}>Profil candidat</SectionHeading>
          </div>
          <div className="px-6 py-5 space-y-5">

            {/* Résumé */}
            {profile.summary && (
              <p className="text-sm text-teal-800 leading-relaxed">{profile.summary}</p>
            )}

            {/* Compétences clés */}
            {profile.keySkills?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-teal-600 uppercase tracking-wider mb-2">
                  Compétences clés
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.keySkills.map((s, i) => (
                    <Badge key={i} variant="teal">{s}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Phrases d'accroche */}
            {profile.pitchLines?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-teal-600 uppercase tracking-wider mb-2">
                  Phrase d'accroche retenue
                </p>
                <div className="space-y-2">
                  {profile.pitchLines.map((line, i) => (
                    <label
                      key={i}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedPitchIndex === i
                          ? 'bg-teal-50 border-teal-300'
                          : 'bg-white border-cream-200 hover:border-teal-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="pitchLine"
                        checked={selectedPitchIndex === i}
                        onChange={() => setSelectedPitchIndex(i)}
                        className="mt-0.5 accent-teal-600"
                        disabled={isReadOnly}
                      />
                      <span className="text-sm text-teal-800 leading-relaxed">{line}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Points d'attention */}
            {profile.decisionPoints?.length > 0 && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4" />
                  Points d'attention pour la séance
                </p>
                <ul className="space-y-2">
                  {profile.decisionPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>

        {/* ══ 2. Brouillon email ══════════════════════════════════════════ */}
        <Card>
          <div className="px-6 pt-5 pb-2 border-b border-cream-200 bg-cream-50/60 flex items-center justify-between gap-4">
            <SectionHeading icon={Mail}>Brouillon email</SectionHeading>
            {!isReadOnly && (
              <Button
                onClick={applyTemplateToAll}
                variant="ghost"
                size="sm"
                icon={RefreshCw}
              >
                Appliquer à toutes les entreprises
              </Button>
            )}
          </div>
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-teal-600 uppercase tracking-wider mb-1.5">
                Objet
              </label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                readOnly={isReadOnly}
                className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all
                  ${isReadOnly
                    ? 'bg-cream-50 border-cream-200 text-teal-800/80 cursor-default'
                    : 'bg-white border-cream-200 text-teal-900 focus:ring-2 focus:ring-teal-400 focus:border-transparent'
                  }`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-teal-600 uppercase tracking-wider mb-1.5">
                Corps (marqueurs : {'{{'} NOM_ENTREPRISE {'}}'},  {'{{'} VILLE {'}}'},  {'{{'} SECTEUR {'}}'})
              </label>
              <AutoTextarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                readOnly={isReadOnly}
                placeholder="Corps du mail…"
              />
            </div>
          </div>
        </Card>

        {/* ══ 3. Entreprises ══════════════════════════════════════════════ */}
        <Card>
          <div className="px-6 pt-5 pb-2 border-b border-cream-200 bg-cream-50/60">
            <SectionHeading icon={Building2}>
              Entreprises ciblées
              <span className="ml-2 text-sm font-normal text-teal-700/60">
                ({keepCount} retenue{keepCount > 1 ? 's' : ''} sur {companies.length})
              </span>
            </SectionHeading>
          </div>

          <div className="divide-y divide-cream-100">
            {companies.map((company, idx) => {
              const isExpanded = expandedRow === idx;
              const decisionColor = {
                keep:    'bg-emerald-50 border-emerald-200',
                reject:  'bg-rose-50 border-rose-100',
                pending: 'bg-white border-cream-200',
              }[company.decision] || 'bg-white border-cream-200';

              return (
                <div key={idx} className={`border-l-4 transition-colors ${
                  company.decision === 'keep'
                    ? 'border-l-emerald-400'
                    : company.decision === 'reject'
                    ? 'border-l-rose-300'
                    : 'border-l-cream-200'
                }`}>
                  {/* ── Ligne principale ─────────────────────────────── */}
                  <div
                    className={`px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-4 cursor-pointer hover:bg-cream-50/60 transition-colors ${decisionColor}`}
                    onClick={() => setExpandedRow(isExpanded ? null : idx)}
                  >
                    {/* Infos entreprise */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-teal-800 text-sm truncate">{company.name}</span>
                        <StarScore stars={company.stars} />
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-teal-700/70">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {company.city}{company.zipcode ? ` (${company.zipcode})` : ''}
                        </span>
                        {(company.nafText || company.naf) && (
                          <span className="flex items-center gap-1 font-medium text-teal-700">
                            <Building2 className="w-3 h-3" />
                            {(company.nafText || company.naf).replace(/\(.*?\)/g, '').trim()}
                          </span>
                        )}
                        {company.headcountText && (
                          <span>{company.headcountText}</span>
                        )}
                        {company.lbbHasEmail && !company.email && (
                          <span className="text-emerald-600 font-medium" title="La Bonne Boîte indique qu'un email existe pour cette entreprise">
                            ✉ email LBB
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Email */}
                    <div className="shrink-0 text-xs">
                      {company.email ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="flex items-center gap-1 text-teal-600">
                            <Mail className="w-3.5 h-3.5" />
                            {company.email}
                          </span>
                          <span className="text-amber-500 font-medium" title="Adresse déduite algorithmiquement — à vérifier avant envoi">
                            ⚠ à vérifier
                          </span>
                        </div>
                      ) : (
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(`"${company.name}" contact recrutement site officiel`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-teal-600 hover:text-teal-800 hover:underline"
                          title="Rechercher le site de l'entreprise sur Google"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Trouver le site
                        </a>
                      )}
                    </div>

                    {/* Boutons décision */}
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {!isReadOnly && (
                        <>
                          <button
                            onClick={() => updateCompany(idx, { decision: 'keep' })}
                            title="Garder"
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all
                              ${company.decision === 'keep'
                                ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                                : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                              }`}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                            Garder
                          </button>
                          <button
                            onClick={() => updateCompany(idx, { decision: 'reject' })}
                            title="Écarter"
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all
                              ${company.decision === 'reject'
                                ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                                : 'bg-white text-rose-600 border-rose-200 hover:bg-rose-50'
                              }`}
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                            Écarter
                          </button>
                        </>
                      )}
                      {isReadOnly && (
                        <Badge variant={company.decision === 'keep' ? 'emerald' : company.decision === 'reject' ? 'rose' : 'gray'}>
                          {company.decision === 'keep' ? 'Retenue' : company.decision === 'reject' ? 'Écartée' : 'En attente'}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* ── Panneau expandé ──────────────────────────────── */}
                  {isExpanded && (
                    <div className="px-4 sm:px-6 pb-5 pt-2 space-y-4 bg-cream-50/40 border-t border-cream-100">

                      {/* Avertissement adresse déduite */}
                      {company.email && (
                        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                          <Info className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>
                            <strong>Adresse déduite algorithmiquement</strong> — le domaine répond
                            au courrier (enregistrement MX confirmé), mais l'adresse exacte n'est pas
                            vérifiée. Confirmez-la sur le site de l'entreprise avant d'envoyer.
                            {company.candidates?.length > 1 && !isReadOnly && (
                              <> Vous pouvez aussi choisir une autre variante ci-dessous.</>
                            )}
                          </span>
                        </div>
                      )}

                      {/* Sélection email si plusieurs candidats */}
                      {company.candidates?.length > 1 && !isReadOnly && (
                        <div>
                          <label className="block text-xs font-semibold text-teal-600 uppercase tracking-wider mb-1.5">
                            Choisir une autre variante
                          </label>
                          <select
                            value={company.email || ''}
                            onChange={(e) => updateCompany(idx, { email: e.target.value, emailBody: personalizeEmail(emailBody, company) })}
                            className="w-full sm:w-auto rounded-xl border border-cream-200 bg-white px-3 py-2 text-sm text-teal-800 outline-none focus:ring-2 focus:ring-teal-400"
                          >
                            {company.candidates.map((addr, ci) => (
                              <option key={ci} value={addr}>{addr}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Corps email personnalisé */}
                      {company.email ? (
                        <div>
                          <label className="block text-xs font-semibold text-teal-600 uppercase tracking-wider mb-1.5">
                            Corps de l'email personnalisé
                          </label>
                          <AutoTextarea
                            value={company.emailBody || ''}
                            onChange={(e) => updateCompany(idx, { emailBody: e.target.value })}
                            readOnly={isReadOnly}
                            placeholder="Corps personnalisé…"
                          />
                        </div>
                      ) : (
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(`"${company.name}" contact recrutement site officiel`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-medium transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Rechercher sur Google
                        </a>
                      )}

                      {/* Notes libres */}
                      <div>
                        <label className="block text-xs font-semibold text-teal-600 uppercase tracking-wider mb-1.5">
                          Notes (séance, contacts, remarques)
                        </label>
                        <AutoTextarea
                          value={company.notes || ''}
                          onChange={(e) => updateCompany(idx, { notes: e.target.value })}
                          readOnly={isReadOnly}
                          placeholder="Notes libres…"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* ══ 4. Journal de validation ═════════════════════════════════════ */}
        <Card>
          <div className="px-6 pt-5 pb-2 border-b border-cream-200 bg-cream-50/60">
            <SectionHeading icon={ClipboardList}>Journal de validation</SectionHeading>
          </div>
          <div className="px-6 py-5 space-y-4">

            {/* Date de validation si validée */}
            {campaign.status === 'validated' && validationLog.validatedAt && (
              <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                <ShieldCheck className="w-5 h-5 shrink-0" />
                Campagne validée — {new Date(
                  typeof validationLog.validatedAt === 'object' && validationLog.validatedAt._seconds
                    ? validationLog.validatedAt._seconds * 1000
                    : validationLog.validatedAt
                ).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}
              </div>
            )}

            {/* Notes conseiller */}
            <div>
              <label className="block text-xs font-semibold text-teal-600 uppercase tracking-wider mb-1.5">
                Notes du conseiller
              </label>
              <AutoTextarea
                value={advisorNotes}
                onChange={(e) => setAdvisorNotes(e.target.value)}
                readOnly={isReadOnly}
                placeholder="Observations de la séance, ajustements à prévoir…"
              />
            </div>

            {/* Récap avant validation */}
            {!isReadOnly && (
              <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 text-sm space-y-2">
                <p className="font-semibold text-teal-800 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Récapitulatif avant validation
                </p>
                <ul className="space-y-1 text-teal-700">
                  <li className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${keepCount >= 1 ? 'bg-emerald-500' : 'bg-rose-400'}`} />
                    {keepCount} entreprise{keepCount > 1 ? 's' : ''} retenue{keepCount > 1 ? 's' : ''}
                    {keepCount === 0 && ' — au moins une obligatoire'}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    {companies.filter((c) => c.decision === 'keep' && c.email).length} email
                    {companies.filter((c) => c.decision === 'keep' && c.email).length > 1 ? 's' : ''} prêt
                    {companies.filter((c) => c.decision === 'keep' && c.email).length > 1 ? 's' : ''} à l'envoi
                  </li>
                </ul>
              </div>
            )}

            {/* Bouton Valider */}
            {!isReadOnly && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2">
                <Button
                  onClick={validateCampaign}
                  disabled={!canValidate || isValidating}
                  icon={ShieldCheck}
                >
                  {isValidating ? 'Validation…' : 'Valider la campagne'}
                </Button>
                {!canValidate && keepCount === 0 && (
                  <p className="text-xs text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Marquez au moins une entreprise comme « Garder »
                  </p>
                )}
              </div>
            )}

            {/* Post-validation : invitation à télécharger le dossier */}
            {campaign.status === 'validated' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800 space-y-1">
                <p className="font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Campagne validée
                </p>
                <p className="text-emerald-700 text-xs">
                  {keepCount} entreprise{keepCount > 1 ? 's' : ''} retenue{keepCount > 1 ? 's' : ''}.
                  Téléchargez le dossier PDF depuis la section ci-dessous.
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* ══ 5. Télécharger le dossier ════════════════════════════════════ */}
        {(campaign.status === 'validated' || campaign.status === 'done') && (() => {
          const keptWithEmail    = companies.filter((c) => c.decision === 'keep' && c.email).length;
          const keptWithoutEmail = companies.filter((c) => c.decision === 'keep' && !c.email).length;

          return (
            <Card>
              <div className="px-6 pt-5 pb-2 border-b border-cream-200 bg-cream-50/60">
                <SectionHeading icon={Download}>
                  Télécharger le dossier
                </SectionHeading>
              </div>
              <div className="px-6 py-5 space-y-4">

                {/* Récap entreprises */}
                <div className="divide-y divide-cream-100 rounded-xl border border-cream-200 overflow-hidden">
                  {companies
                    .filter((c) => c.decision === 'keep')
                    .map((c, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-3 bg-white text-sm">
                        {c.email ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : (
                          <Info className="w-4 h-4 text-amber-400 shrink-0" />
                        )}
                        <span className="flex-1 font-medium text-teal-800 truncate">{c.name}</span>
                        <span className="text-xs text-teal-700/60 truncate hidden sm:block">
                          {c.email || 'formulaire / courrier'}
                        </span>
                      </div>
                    ))
                  }
                </div>

                {keptWithoutEmail > 0 && (
                  <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    {keptWithoutEmail} entreprise{keptWithoutEmail > 1 ? 's' : ''} sans email — le dossier
                    inclut les instructions pour une démarche par formulaire ou courrier.
                  </div>
                )}

                {/* Explication */}
                <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 text-sm text-teal-800 space-y-1">
                  <p className="font-semibold flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Dossier complet prêt
                  </p>
                  <p className="text-xs text-teal-700">
                    Le dossier contient le profil, le modèle d'email, et une fiche par entreprise
                    avec le mail personnalisé prêt à copier. Le demandeur d'emploi envoie ses
                    candidatures à son propre rythme.
                  </p>
                </div>

                {/* Bouton */}
                <div className="pt-1">
                  <a
                    href={`/campagne/${campaignId}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    Ouvrir le dossier PDF
                  </a>
                  <p className="mt-2 text-xs text-teal-700/60">
                    S'ouvre dans un nouvel onglet · bouton «&nbsp;Imprimer / Enregistrer en PDF&nbsp;» en haut de page
                  </p>
                </div>

              </div>
            </Card>
          );
        })()}

      </main>
    </div>
  );
}
