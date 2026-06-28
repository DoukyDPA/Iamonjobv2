'use client';

// ════════════════════════════════════════════════════════════════════════════
// Page d'export PDF — /campagne/[campaignId]/pdf
//
// Vue optimisée impression du dossier de candidatures spontanées.
// Bouton sticky "Imprimer" → window.print() → navigateur propose "Enregistrer en PDF".
//
// CSS @media print : masque le bouton, applique les marges, insère les sauts
// de page entre entreprises.
//
// Accès : authentifié (cookie __session), lecture seule.
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { Loader2, AlertCircle, Printer, ChevronLeft } from 'lucide-react';

// ─── Utilitaires ──────────────────────────────────────────────────────────

function formatDate(ts) {
  if (!ts) return '—';
  const d = typeof ts === 'object' && ts._seconds
    ? new Date(ts._seconds * 1000)
    : new Date(ts);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function Stars({ score }) {
  if (!score) return null;
  // hiring_potential LBB peut dépasser 5 — on affiche juste la valeur brute
  return (
    <span className="text-amber-500" aria-label={`Score LBB : ${score}`}>
      ★ {score}
    </span>
  );
}

// ─── Sections du dossier ──────────────────────────────────────────────────

function PageHeader({ jobTitle, date }) {
  return (
    <div className="pdf-page-header mb-10 border-b-2 border-teal-700 pb-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold tracking-widest text-teal-600 uppercase mb-1">
            IAMonJob · Dossier de candidatures spontanées
          </p>
          <h1 className="text-2xl font-bold text-teal-900 mt-1">{jobTitle}</h1>
        </div>
        <div className="text-right text-xs text-slate-500 mt-1">
          <p>Généré le {date}</p>
        </div>
      </div>
    </div>
  );
}

function ProfileSection({ profile }) {
  return (
    <section className="mb-8">
      <h2 className="section-title">Profil candidat</h2>

      {profile.summary && (
        <p className="text-sm text-slate-700 leading-relaxed mb-4">{profile.summary}</p>
      )}

      {profile.keySkills?.length > 0 && (
        <div className="mb-4">
          <p className="label">Compétences clés</p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {profile.keySkills.map((s, i) => (
              <span key={i} className="skill-badge">{s}</span>
            ))}
          </div>
        </div>
      )}

      {profile.pitchLines?.length > 0 && (
        <div className="mb-4">
          <p className="label">Phrase d'accroche</p>
          <blockquote className="mt-1 pl-4 border-l-4 border-teal-400 text-sm italic text-slate-700">
            {profile.pitchLines[0]}
          </blockquote>
        </div>
      )}

      {profile.decisionPoints?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="label text-amber-800 mb-2">Points d'attention</p>
          <ul className="space-y-1">
            {profile.decisionPoints.map((pt, i) => (
              <li key={i} className="text-xs text-amber-800 flex gap-2">
                <span className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-amber-500" />
                {pt}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function EmailTemplateSection({ subject, body }) {
  return (
    <section className="mb-8">
      <h2 className="section-title">Modèle de mail</h2>
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
          <p className="label mb-0.5">Objet</p>
          <p className="text-sm font-medium text-slate-800">{subject}</p>
        </div>
        <div className="px-4 py-3">
          <p className="label mb-1.5">Corps</p>
          <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">{body}</pre>
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-2">
        Les marqueurs <code>{'{{NOM_ENTREPRISE}}'}</code>, <code>{'{{VILLE}}'}</code>, <code>{'{{SECTEUR}}'}</code> sont
        remplacés automatiquement dans chaque mail personnalisé ci-dessous.
      </p>
    </section>
  );
}

function CompanyCard({ company, index }) {
  const hasEmail = !!company.email;

  return (
    <div className="company-card">
      {/* En-tête entreprise */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-teal-600 bg-teal-50 border border-teal-200 rounded px-2 py-0.5">
              #{index + 1}
            </span>
            <h3 className="text-base font-bold text-teal-900">{company.name}</h3>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-600">
            {company.city && <span>📍 {company.city} {company.zipcode}</span>}
            {company.nafText && (
              <span>🏢 {company.nafText.replace(/\(.*?\)/g, '').trim()}</span>
            )}
            {company.headcountText && <span>👥 {company.headcountText}</span>}
            {company.stars && <span><Stars score={company.stars} /></span>}
          </div>
        </div>
        {hasEmail ? (
          <div className="text-right shrink-0">
            <p className="label mb-0.5">Email</p>
            <p className="text-sm font-mono text-teal-700">{company.email}</p>
          </div>
        ) : (
          <div className="text-right shrink-0">
            <span className="text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded px-2 py-1">
              Formulaire / courrier
            </span>
          </div>
        )}
      </div>

      {/* Avertissement adresse déduite */}
      {hasEmail && (
        <div className="mb-3 bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-800">
          ⚠ Adresse déduite algorithmiquement (domaine MX confirmé, adresse non vérifiée).
          Confirmez-la sur le site de l'entreprise avant d'envoyer.
        </div>
      )}

      {/* Mail personnalisé */}
      {hasEmail && company.emailBody && (
        <div className="mb-3">
          <p className="label mb-1">Mail personnalisé</p>
          <div className="bg-slate-50 border border-slate-200 rounded p-3">
            <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">{company.emailBody}</pre>
          </div>
        </div>
      )}

      {!hasEmail && (
        <div className="mb-3 bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800">
          Aucun email résolu pour cette entreprise. Approche recommandée : formulaire de contact sur
          le site web ou courrier postal au service RH.
        </div>
      )}

      {/* Notes */}
      {company.notes && (
        <div>
          <p className="label mb-1">Notes de séance</p>
          <p className="text-xs text-slate-700 bg-white border border-slate-200 rounded p-2 whitespace-pre-wrap">
            {company.notes}
          </p>
        </div>
      )}
    </div>
  );
}

function AdvisorNotesSection({ notes }) {
  if (!notes) return null;
  return (
    <section className="mt-6 mb-8">
      <h2 className="section-title">Notes du conseiller</h2>
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <p className="text-sm text-slate-700 whitespace-pre-wrap">{notes}</p>
      </div>
    </section>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────

export default function CampaignPdfPage() {
  const { campaignId } = useParams();
  const router = useRouter();

  const [authReady, setAuthReady] = useState(false);
  const [campaign, setCampaign] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) { router.push('/login'); return; }
      const token = await firebaseUser.getIdToken();
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      setAuthReady(true);
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!authReady) return;
    (async () => {
      try {
        const res = await fetch(`/api/campaign/${campaignId}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Erreur ${res.status}`);
        }
        const { campaign: data } = await res.json();
        setCampaign(data);
      } catch (err) {
        setLoadError(err.message);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [authReady, campaignId]);

  if (!authReady || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <AlertCircle className="w-10 h-10 text-rose-500" />
        <p className="font-semibold">{loadError}</p>
        <button onClick={() => router.back()} className="text-sm text-teal-600 underline">Retour</button>
      </div>
    );
  }

  if (!campaign) return null;

  const profile      = campaign.candidateProfile || {};
  const template     = campaign.emailTemplate    || {};
  const advisorNotes = campaign.validationLog?.advisorNotes || '';
  const validatedAt  = campaign.validationLog?.validatedAt;

  // Entreprises retenues uniquement
  const kept = (campaign.companies || []).filter((c) => c.decision === 'keep');

  return (
    <>
      {/* ══ CSS global print ══════════════════════════════════════════════ */}
      <style>{`
        /* ─── Utilitaires partagés ─── */
        .section-title {
          font-size: 0.875rem;
          font-weight: 700;
          color: #0f766e;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #ccfbf1;
          padding-bottom: 0.5rem;
          margin-bottom: 1rem;
        }
        .label {
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: #64748b;
        }
        .skill-badge {
          display: inline-block;
          padding: 0.15rem 0.6rem;
          border-radius: 9999px;
          font-size: 0.7rem;
          font-weight: 500;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #15803d;
        }
        .company-card {
          border: 1px solid #e2e8f0;
          border-radius: 0.75rem;
          padding: 1.25rem;
          margin-bottom: 1.5rem;
          background: #fff;
        }

        /* ─── Bouton print masqué à l'impression ─── */
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 2cm; size: A4; }

          /* Saut de page entre entreprises */
          .company-card { page-break-inside: avoid; break-inside: avoid; }
          .page-break-before { page-break-before: always; break-before: always; }

          /* Enlever les ombres à l'impression */
          .company-card { box-shadow: none; border: 1px solid #cbd5e1; }
        }
      `}</style>

      {/* ══ Barre sticky (masquée à l'impression) ════════════════════════ */}
      <div className="no-print sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-800 font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            Retour
          </button>

          <div className="text-center">
            <p className="text-sm font-semibold text-teal-800">
              {campaign.jobTitle} · {kept.length} entreprise{kept.length > 1 ? 's' : ''}
            </p>
            {validatedAt && (
              <p className="text-xs text-slate-500">
                Validé le {formatDate(validatedAt)}
              </p>
            )}
          </div>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Imprimer / Enregistrer en PDF
          </button>
        </div>
      </div>

      {/* ══ Contenu du dossier ════════════════════════════════════════════ */}
      <div className="max-w-4xl mx-auto px-6 py-10 bg-white min-h-screen">

        <PageHeader
          jobTitle={campaign.jobTitle}
          date={formatDate(validatedAt || campaign.createdAt)}
        />

        <ProfileSection profile={profile} />

        <EmailTemplateSection
          subject={template.subject || ''}
          body={template.body || ''}
        />

        {/* Notes conseiller avant les fiches */}
        <AdvisorNotesSection notes={advisorNotes} />

        {/* Fiches entreprises */}
        {kept.length > 0 ? (
          <section>
            <h2 className="section-title">
              Entreprises retenues ({kept.length})
            </h2>
            {kept.map((company, idx) => (
              <CompanyCard key={idx} company={company} index={idx} />
            ))}
          </section>
        ) : (
          <div className="border border-amber-200 rounded-xl p-6 bg-amber-50 text-sm text-amber-800 text-center">
            Aucune entreprise marquée comme retenue. Revenez sur le dossier pour sélectionner des cibles.
          </div>
        )}

        {/* Pied de page */}
        <div className="mt-12 pt-6 border-t border-slate-200 text-center text-xs text-slate-400">
          <p>
            Dossier généré par IAMonJob · {formatDate(new Date())}
          </p>
          <p className="mt-1">
            Ce document est confidentiel et destiné au bénéficiaire identifié ci-dessus.
          </p>
        </div>
      </div>
    </>
  );
}
