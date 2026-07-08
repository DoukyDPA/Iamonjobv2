'use client';

// ════════════════════════════════════════════════════════════════════════════
// Page détail — Fiche candidature France Travail
// Route : /candidature/[candidatureId]
//
// Affiche :
//  • Résumé de l'offre + score de compatibilité
//  • Forces / faiblesses issues de l'analyse
//  • Bouton "Générer la lettre de motivation" → POST /api/candidature/:id/cover-letter
//  • Bouton "Préparer l'entretien"            → POST /api/candidature/:id/interview
//  • Les résultats sont mis en cache Firestore (1 génération par section)
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import {
  Loader2, ArrowLeft, Briefcase, Star, CheckCircle2, AlertCircle,
  FileText, MessageSquare, ChevronDown, ChevronUp, Sparkles, Building2,
  MapPin, Clock,
} from 'lucide-react';
import { Button, Badge, Card } from '@/components/ui';
import NotesBlock from '@/components/NotesBlock';
import ShareToConseiller from '@/components/ShareToConseiller';

const TYPE_LABEL = {
  classique: { label: 'Classique',  color: 'bg-teal-100 text-teal-700' },
  piege:     { label: 'Piège',      color: 'bg-rose-100 text-rose-700' },
  technique: { label: 'Technique',  color: 'bg-amber-100 text-amber-700' },
};

function formatDate(ts) {
  if (!ts) return '';
  try {
    const d = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return ''; }
}

function ScoreDial({ score }) {
  const pct = Math.max(0, Math.min(100, score ?? 0));
  const color = pct >= 70 ? 'text-emerald-600' : pct >= 45 ? 'text-amber-500' : 'text-rose-500';
  return (
    <div className={`flex flex-col items-center ${color}`}>
      <span className="text-4xl font-bold leading-none">{pct}%</span>
      <span className="text-xs font-medium mt-1 opacity-70">compatibilité</span>
    </div>
  );
}

function Section({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-teal-50/50 transition-colors"
      >
        <span className="flex items-center gap-2 font-semibold text-teal-800">
          <Icon className="w-4 h-4 text-teal-600" />
          {title}
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-teal-400" /> : <ChevronDown className="w-4 h-4 text-teal-400" />}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </Card>
  );
}

export default function CandidatureDetailPage() {
  const router = useRouter();
  const { candidatureId } = useParams();

  const [authReady, setAuthReady]     = useState(false);
  const [cand, setCand]               = useState(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState(null);

  // Lettre de motivation
  const [coverLetter, setCoverLetter]           = useState(null);
  const [isGenCover, setIsGenCover]             = useState(false);
  const [coverError, setCoverError]             = useState(null);

  // Questions d'entretien
  const [interviewPrep, setInterviewPrep]       = useState(null);
  const [isGenInterview, setIsGenInterview]     = useState(false);
  const [interviewError, setInterviewError]     = useState(null);

  // Auth + session cookie
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

  // Chargement de la fiche via l'API DELETE existante (GET individuel)
  useEffect(() => {
    if (!authReady || !candidatureId) return;
    fetch(`/api/candidature/${candidatureId}`)
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((data) => {
        setCand(data.candidature);
        if (data.candidature?.coverLetter)   setCoverLetter(data.candidature.coverLetter);
        if (data.candidature?.interviewPrep) setInterviewPrep(data.candidature.interviewPrep);
      })
      .catch(() => setError('Fiche introuvable ou accès refusé.'))
      .finally(() => setIsLoading(false));
  }, [authReady, candidatureId]);

  const generateCoverLetter = async () => {
    setIsGenCover(true);
    setCoverError(null);
    try {
      const res = await fetch(`/api/candidature/${candidatureId}/cover-letter`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
      setCoverLetter(data.coverLetter);
    } catch (err) {
      setCoverError(err.message);
    } finally {
      setIsGenCover(false);
    }
  };

  const generateInterview = async () => {
    setIsGenInterview(true);
    setInterviewError(null);
    try {
      const res = await fetch(`/api/candidature/${candidatureId}/interview`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
      setInterviewPrep(data.interviewPrep);
    } catch (err) {
      setInterviewError(err.message);
    } finally {
      setIsGenInterview(false);
    }
  };

  if (!authReady || isLoading) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cream-100 flex flex-col items-center justify-center gap-4 p-8">
        <AlertCircle className="w-10 h-10 text-rose-400" />
        <p className="text-rose-700 font-medium">{error}</p>
        <Button variant="secondary" onClick={() => router.back()}>Retour</Button>
      </div>
    );
  }

  const { offer = {}, compatibility = {}, createdAt } = cand || {};

  return (
    <div className="min-h-screen bg-cream-100">
      {/* En-tête */}
      <header className="bg-white border-b border-cream-200 shadow-soft">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => router.push('/campagne')}
            className="p-2 rounded-lg text-teal-600 hover:bg-teal-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-teal-800 truncate flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-amber-500 shrink-0" />
              {offer.intitule || 'Candidature'}
            </h1>
            {offer.entreprise && (
              <p className="text-xs text-teal-700/60 mt-0.5">{offer.entreprise}</p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-4">

        {/* Carte résumé */}
        <Card className="px-5 py-5">
          <div className="flex items-start gap-5">
            <ScoreDial score={compatibility.score} />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-wrap gap-2 text-xs text-teal-700/70">
                {offer.entreprise && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />{offer.entreprise}
                  </span>
                )}
                {offer.lieu && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />{offer.lieu}
                  </span>
                )}
                {offer.typeContrat && (
                  <Badge variant="gray">{offer.typeContrat}</Badge>
                )}
                {createdAt && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />Analysée le {formatDate(createdAt)}
                  </span>
                )}
              </div>
              {compatibility.conseilGlobal && (
                <p className="text-sm text-teal-800/80 leading-relaxed">
                  {compatibility.conseilGlobal}
                </p>
              )}
              {offer.url && (
                <a
                  href={offer.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-teal-600 underline hover:text-teal-800"
                >
                  Voir l'offre sur France Travail
                </a>
              )}
            </div>
          </div>
        </Card>

        {/* Forces / Faiblesses */}
        <Section title="Analyse de compatibilité" icon={Star}>
          <div className="grid sm:grid-cols-2 gap-4 mt-1">
            <div>
              <h3 className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">Points forts</h3>
              <ul className="space-y-1.5">
                {(compatibility.forces || []).map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-teal-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">Points à compenser</h3>
              <ul className="space-y-1.5">
                {(compatibility.faiblesses || []).map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-teal-800">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        {/* Lettre de motivation */}
        <Section title="Lettre de motivation" icon={FileText} defaultOpen={!!coverLetter}>
          {coverLetter ? (
            <div className="prose prose-sm max-w-none text-teal-900 whitespace-pre-wrap leading-relaxed text-sm mt-1">
              {coverLetter}
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3 mt-1">
              <p className="text-sm text-teal-700/70">
                Générée à partir de l'analyse de compatibilité et de la description du poste. Sauvegardée automatiquement.
              </p>
              {coverError && (
                <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />{coverError}
                </div>
              )}
              <Button onClick={generateCoverLetter} disabled={isGenCover} icon={isGenCover ? Loader2 : Sparkles}>
                {isGenCover ? 'Génération en cours…' : 'Générer la lettre'}
              </Button>
            </div>
          )}
        </Section>

        {/* Préparation entretien */}
        <Section title="Préparation entretien" icon={MessageSquare} defaultOpen={!!interviewPrep}>
          {interviewPrep?.questions?.length > 0 ? (
            <div className="space-y-4 mt-1">
              {interviewPrep.questions.map((q, i) => {
                const cfg = TYPE_LABEL[q.type] || TYPE_LABEL.classique;
                return (
                  <div key={i} className="border border-cream-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-teal-800 flex-1">{q.question}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                    {q.why && (
                      <p className="text-xs text-teal-700/60">
                        <span className="font-semibold">Pourquoi :</span> {q.why}
                      </p>
                    )}
                    {q.advice && (
                      <p className="text-xs text-teal-700 bg-teal-50 rounded-lg px-3 py-2">
                        <span className="font-semibold">Conseil :</span> {q.advice}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3 mt-1">
              <p className="text-sm text-teal-700/70">
                5 questions ciblées sur vos forces, vos écarts et les exigences du poste. Sauvegardées automatiquement.
              </p>
              {interviewError && (
                <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />{interviewError}
                </div>
              )}
              <Button onClick={generateInterview} disabled={isGenInterview} icon={isGenInterview ? Loader2 : Sparkles}>
                {isGenInterview ? 'Génération en cours…' : 'Préparer l\'entretien'}
              </Button>
            </div>
          )}
        </Section>

        {/* Partage avec le conseiller */}
        <ShareToConseiller
          shared={{
            kind: 'candidature',
            id: candidatureId,
            title: offer.intitule || 'Candidature',
            subtitle: [offer.entreprise, offer.lieu].filter(Boolean).join(' · '),
            score: typeof compatibility.score === 'number' ? compatibility.score : null,
            summary: compatibility.conseilGlobal || '',
          }}
        />

        {/* Notes personnelles de suivi */}
        <NotesBlock
          initialValue={cand?.notes || ''}
          onSave={async (text) => {
            const res = await fetch(`/api/candidature/${candidatureId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ notes: text }),
            });
            if (!res.ok) {
              const d = await res.json().catch(() => ({}));
              throw new Error(d.error || `Erreur ${res.status}`);
            }
          }}
        />

      </main>
    </div>
  );
}
