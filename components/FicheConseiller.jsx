'use client';

// ════════════════════════════════════════════════════════════════════════════
// Fiche partagée — vue conseiller (lecture seule).
//
// Ouverte depuis la file d'avis. Charge en direct la fiche partagée par la
// personne (candidature ou campagne) via /api/conseiller/avis/[id]/fiche, et
// l'affiche en entier : offre et lien, analyse, lettre, entretien pour une
// candidature ; profil, entreprises et email pour une campagne. Les notes
// personnelles ne sont jamais renvoyées par l'API, donc jamais affichées.
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import {
  X, Loader2, AlertCircle, Briefcase, Building2, MapPin, ExternalLink,
  CheckCircle2, AlertTriangle, FileText, MessageSquare, Star, Mail, Users,
} from 'lucide-react';
import CoverLetterText from './CoverLetterText';

const DECISION = {
  keep:    { label: 'Retenue',   cls: 'bg-teal-50 text-teal-700 border-teal-200' },
  reject:  { label: 'Écartée',   cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  pending: { label: 'À décider', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
};

function Score({ score }) {
  if (typeof score !== 'number') return null;
  const cls = score >= 70 ? 'text-emerald-600' : score >= 45 ? 'text-amber-500' : 'text-rose-500';
  return <span className={`text-3xl font-extrabold ${cls}`}>{score}%</span>;
}

function Block({ title, icon: Icon, children }) {
  return (
    <section className="border border-cream-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-cream-50/70 border-b border-cream-200">
        {Icon && <Icon className="w-4 h-4 text-teal-600" aria-hidden="true" />}
        <h3 className="text-sm font-bold text-teal-800">{title}</h3>
      </div>
      <div className="px-4 py-3 text-sm text-teal-800">{children}</div>
    </section>
  );
}

function CandidatureView({ fiche }) {
  const { offer = {}, compatibility = {}, coverLetter, interviewPrep } = fiche;
  return (
    <div className="space-y-4">
      <Block title="Offre" icon={Briefcase}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-semibold text-teal-900">{offer.intitule || 'Offre'}</p>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-teal-700/70">
              {offer.entreprise && <span className="inline-flex items-center gap-1"><Building2 className="w-3 h-3" />{offer.entreprise}</span>}
              {offer.lieu && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{offer.lieu}</span>}
              {offer.typeContrat && <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{offer.typeContrat}</span>}
            </div>
          </div>
          <Score score={compatibility.score} />
        </div>
        {offer.url && (
          <a
            href={offer.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-900 hover:underline"
          >
            Voir l'offre <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </Block>

      {compatibility.conseilGlobal && (
        <Block title="Conseil global" icon={MessageSquare}>
          <p className="whitespace-pre-wrap">{compatibility.conseilGlobal}</p>
        </Block>
      )}

      {(compatibility.forces?.length > 0 || compatibility.faiblesses?.length > 0) && (
        <div className="grid sm:grid-cols-2 gap-4">
          {compatibility.forces?.length > 0 && (
            <Block title="Forces" icon={CheckCircle2}>
              <ul className="space-y-1.5">
                {compatibility.forces.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </Block>
          )}
          {compatibility.faiblesses?.length > 0 && (
            <Block title="Points de vigilance" icon={AlertTriangle}>
              <ul className="space-y-1.5">
                {compatibility.faiblesses.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </Block>
          )}
        </div>
      )}

      {coverLetter && (
        <Block title="Lettre de motivation" icon={FileText}>
          <CoverLetterText text={coverLetter} />
        </Block>
      )}

      {interviewPrep?.questions?.length > 0 && (
        <Block title="Préparation entretien" icon={MessageSquare}>
          <div className="space-y-3">
            {interviewPrep.questions.map((q, i) => (
              <div key={i} className="border border-cream-200 rounded-lg p-3 space-y-1.5">
                <p className="font-semibold text-teal-800">{q.question}</p>
                {q.why && <p className="text-xs text-teal-700/60"><span className="font-semibold">Pourquoi :</span> {q.why}</p>}
                {q.advice && <p className="text-xs text-teal-700 bg-teal-50 rounded-lg px-3 py-2"><span className="font-semibold">Conseil :</span> {q.advice}</p>}
              </div>
            ))}
          </div>
        </Block>
      )}
    </div>
  );
}

function CampaignView({ fiche }) {
  const { jobTitle, candidateProfile = {}, emailTemplate = {}, companies = [] } = fiche;
  return (
    <div className="space-y-4">
      <Block title="Campagne" icon={Briefcase}>
        <p className="font-semibold text-teal-900">{jobTitle || 'Campagne de candidatures'}</p>
        <p className="mt-1 text-xs text-teal-700/70">
          {companies.length} entreprise{companies.length > 1 ? 's' : ''} ·{' '}
          {companies.filter((c) => c.decision === 'keep').length} retenue(s)
        </p>
      </Block>

      {candidateProfile.summary && (
        <Block title="Profil candidat" icon={FileText}>
          <p className="whitespace-pre-wrap leading-relaxed">{candidateProfile.summary}</p>
          {candidateProfile.keySkills?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {candidateProfile.keySkills.map((s, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-xs font-medium border border-teal-100">{s}</span>
              ))}
            </div>
          )}
        </Block>
      )}

      {companies.length > 0 && (
        <Block title="Entreprises ciblées" icon={Building2}>
          <ul className="space-y-2">
            {companies.map((co, i) => {
              const d = DECISION[co.decision] || DECISION.pending;
              const link = co.lbbUrl || co.website;
              return (
                <li key={i} className="flex items-start justify-between gap-3 border-b border-cream-100 last:border-0 pb-2 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-semibold text-teal-800">
                      {link ? (
                        <a href={link} target="_blank" rel="noopener noreferrer" className="hover:underline inline-flex items-center gap-1">
                          {co.name || 'Entreprise'}<ExternalLink className="w-3 h-3 opacity-60" />
                        </a>
                      ) : (co.name || 'Entreprise')}
                    </p>
                    <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-teal-700/60">
                      {co.city && <span>{[co.city, co.zipcode].filter(Boolean).join(' ')}</span>}
                      {co.nafText && <span>· {co.nafText}</span>}
                      {typeof co.stars === 'number' && <span className="inline-flex items-center gap-0.5">· {co.stars}<Star className="w-3 h-3 fill-current" /></span>}
                      {co.hasEmail && <span className="inline-flex items-center gap-0.5 text-teal-600">· <Mail className="w-3 h-3" />contact</span>}
                    </div>
                  </div>
                  <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border ${d.cls}`}>{d.label}</span>
                </li>
              );
            })}
          </ul>
        </Block>
      )}

      {(emailTemplate.subject || emailTemplate.body) && (
        <Block title="Modèle d'email" icon={Mail}>
          {emailTemplate.subject && <p className="text-sm"><span className="font-semibold text-teal-700">Objet : </span>{emailTemplate.subject}</p>}
          {emailTemplate.body && <p className="mt-2 whitespace-pre-wrap leading-relaxed text-teal-800/90">{emailTemplate.body}</p>}
        </Block>
      )}
    </div>
  );
}

export default function FicheConseiller({ avisId, code, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetch(`/api/conseiller/avis/${avisId}/fiche`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || 'Chargement impossible.');
        return d;
      })
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [avisId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-900/50"
      role="dialog"
      aria-modal="true"
      aria-label="Fiche partagée"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] bg-white border border-cream-200 rounded-2xl shadow-card overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-cream-200 bg-teal-50/60 flex items-center gap-3">
          <Briefcase className="w-5 h-5 text-teal-600 shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-teal-800">Fiche partagée</h2>
            {code && <p className="text-xs font-mono text-teal-700/70">{code}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-teal-700 hover:bg-cream-200/70"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-7 h-7 animate-spin text-teal-600" />
            </div>
          )}
          {!loading && error && (
            <div className="flex items-start gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {!loading && !error && data?.kind === 'candidature' && <CandidatureView fiche={data.fiche} />}
          {!loading && !error && data?.kind === 'campaign' && <CampaignView fiche={data.fiche} />}
        </div>
      </div>
    </div>
  );
}
