'use client';

import { useEffect, useState } from 'react';
import { Gauge, Loader2, X, HelpCircle, Star, Send } from 'lucide-react';
import Header from './Header';
import Sidebar, { STEPS } from './Sidebar';
import Footer from './Footer';
import MonConseiller from '../MonConseiller';
import MesQuestionnaires from '../MesQuestionnaires';
import EnvoisConseiller from '../EnvoisConseiller';
import { CatMascot } from '../brand';
import SeanceBanner from '../SeanceBanner';
import { ErrorBanner } from '../ui';

const PSEUDO_NOTICE_KEY = 'hide_pseudo_notice';

/**
 * Bandeau rassurant : quand la personne se connecte par code, son nom affiché
 * ressemble à un identifiant technique. On explique pourquoi, une fois, avec le
 * ton juste. La fermeture est mémorisée.
 */
function PseudoNotice({ user }) {
  const isCoded = Boolean(user?.email?.endsWith('@iamonjob.local'));
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isCoded) return;
    try {
      if (localStorage.getItem(PSEUDO_NOTICE_KEY) !== '1') setShow(true);
    } catch {
      setShow(true);
    }
  }, [isCoded]);

  if (!show) return null;

  const dismiss = () => {
    try { localStorage.setItem(PSEUDO_NOTICE_KEY, '1'); } catch {}
    setShow(false);
  };

  return (
    <div className="bg-teal-50 border-b border-teal-100">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-3 flex items-start gap-3">
        <CatMascot className="w-9 h-9 shrink-0" />
        <p className="flex-1 text-sm text-teal-800/90 leading-relaxed">
          <strong>Non, vous n'êtes pas devenu un petit robot de science-fiction !</strong>{' '}
          Ce code un peu étrange à la place de votre nom protège vos données personnelles :
          IAMONJOB préfère vous identifier ainsi. L'essentiel reste ailleurs, dans le lien
          humain avec votre conseiller.
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Fermer ce message"
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-teal-600 hover:bg-teal-100"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * Barre des étapes sur téléphone et tablette. La sidebar n'apparaît qu'en
 * grand écran : sans cette barre, une personne qui n'a qu'un téléphone ne
 * voyait pas les 5 étapes, ni « Mes métiers », ni « Mes candidatures ».
 * Collée sous l'en-tête pendant le défilement.
 */
function MobileStepBar({ currentStep, maxUnlocked, onNavigate, favoriteJobs, onOpenFavorite }) {
  const current = STEPS.find((s) => s.n === currentStep);
  return (
    <div className="lg:hidden sticky top-16 z-10 bg-cream-50/95 backdrop-blur border-b border-cream-200 px-3 py-2">
      <nav aria-label="Parcours en 5 étapes" className="flex items-center justify-between gap-1.5">
        {STEPS.map((s) => {
          const isActive = currentStep === s.n;
          const isUnlocked = s.n <= maxUnlocked;
          return (
            <button
              key={s.n}
              type="button"
              onClick={() => isUnlocked && onNavigate?.(s.n)}
              disabled={!isUnlocked}
              aria-current={isActive ? 'step' : undefined}
              aria-label={`Étape ${s.n} : ${s.label}`}
              title={s.label}
              className={[
                'flex-1 h-10 rounded-xl text-sm font-bold border transition-colors',
                isActive
                  ? 'bg-teal-600 text-white border-teal-600 shadow-soft'
                  : isUnlocked
                  ? 'bg-white text-teal-700 border-cream-300'
                  : 'bg-cream-100 text-teal-700/40 border-cream-200',
              ].join(' ')}
            >
              {s.n}
            </button>
          );
        })}
      </nav>
      <div className="mt-1.5 flex items-center gap-2 text-xs">
        <span className="font-semibold text-teal-800 truncate">
          Étape {currentStep} : {current?.label}
        </span>
        <span className="flex-1" />
        {favoriteJobs.length > 0 && (
          <details className="relative">
            <summary className="list-none cursor-pointer inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-cream-300 text-teal-700 font-semibold">
              <Star className="w-3 h-3 text-amber-500" fill="currentColor" aria-hidden="true" />
              Mes métiers ({favoriteJobs.length})
            </summary>
            <ul className="absolute right-0 mt-1 w-64 max-w-[80vw] bg-white border border-cream-200 rounded-xl shadow-card p-1.5 space-y-1 z-20">
              {favoriteJobs.map((job) => (
                <li key={job.title}>
                  <button
                    type="button"
                    onClick={(e) => { e.currentTarget.closest('details')?.removeAttribute('open'); onOpenFavorite?.(job); }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-amber-50 text-sm text-teal-800"
                  >
                    {job.title}
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}
        <a href="/campagne" className="sm:hidden inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-cream-300 text-teal-700 font-semibold">
          <Send className="w-3 h-3" aria-hidden="true" /> Candidatures
        </a>
      </div>
    </div>
  );
}

/** Lien « Aide » vers la bonne section du mode d'emploi. */
function StepHelpLink({ step, coded }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
      {coded ? (
        <p className="text-xs text-teal-700/80">
          Votre compte est gardé tant que vous venez <strong>au moins une fois par mois</strong>.
        </p>
      ) : <span />}
      <a
        href={`/aide#etape-${step}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-900 hover:underline"
      >
        <HelpCircle className="w-4 h-4" aria-hidden="true" /> Aide sur cette étape
      </a>
    </div>
  );
}

/** Couleur de la pastille mobile selon le score /20 (cohérent avec la sidebar). */
const mobileRatingTile = (n) => {
  if (n == null) return 'bg-teal-600 border-teal-700';
  if (n >= 16) return 'bg-emerald-600 border-emerald-700';
  if (n >= 10) return 'bg-amber-600 border-amber-700';
  return 'bg-rose-600 border-rose-700';
};

/**
 * Shell principal : header, sidebar de parcours, contenu central crème.
 * `children` reçoit le contenu de l'étape courante.
 */
export default function AppShell({
  user,
  currentStep,
  maxUnlocked,
  onNavigate,
  error,
  onCloseError,
  sessionLabel,
  cvRating,
  isRatingCv,
  canRateCv,
  onRateCv,
  onShowRatingDetails,
  favoriteJobs = [],
  onOpenFavorite,
  onRemoveFavorite,
  children,
}) {
  return (
    <div className="min-h-screen bg-cream-100 text-teal-900 flex flex-col">
      <Header user={user} sessionLabel={sessionLabel} />

      <SeanceBanner user={user} />
      <PseudoNotice user={user} />

      <MobileStepBar
        currentStep={currentStep}
        maxUnlocked={maxUnlocked}
        onNavigate={onNavigate}
        favoriteJobs={favoriteJobs}
        onOpenFavorite={onOpenFavorite}
      />

      {/* ─── Bande "Évaluation du CV" — visible UNIQUEMENT sur mobile ───
          La sidebar (lg+) porte déjà ce bloc. Sur mobile, sans cette bande,
          la note disparaîtrait complètement. */}
      <div className="lg:hidden bg-cream-50 border-b border-cream-200 px-4 py-3">
        <div className="flex items-center gap-3">
          {cvRating ? (
            <>
              <div
                className={[
                  'flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-white shadow-soft shrink-0',
                  mobileRatingTile(cvRating.score),
                ].join(' ')}
                aria-label={`Note de votre CV : ${cvRating.score} sur 20`}
              >
                <Gauge className="w-4 h-4 text-white/90" aria-hidden="true" />
                <span
                  className="text-xl font-extrabold leading-none tabular-nums"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.25)' }}
                >
                  {cvRating.score}
                  <span className="text-xs font-bold text-white/90 ml-0.5">/20</span>
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider font-bold text-teal-700/60">
                  Note de votre CV
                </div>
                <button
                  type="button"
                  onClick={onShowRatingDetails}
                  className="text-xs font-semibold text-teal-700 hover:text-teal-900 hover:underline truncate block"
                >
                  Pourquoi cette note ?
                </button>
              </div>
              <button
                type="button"
                onClick={onRateCv}
                disabled={isRatingCv}
                className="text-[11px] text-teal-700/70 hover:text-teal-800 hover:underline disabled:opacity-50 shrink-0"
              >
                {isRatingCv ? '…' : 'Réévaluer'}
              </button>
            </>
          ) : (
            <>
              <span className="w-9 h-9 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0">
                {isRatingCv ? (
                  <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                ) : (
                  <Gauge className="w-4 h-4 text-teal-600" />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider font-bold text-teal-700/60">
                  Évaluation
                </div>
                <div className="text-sm font-semibold text-teal-800">
                  {isRatingCv ? 'Analyse en cours…' : 'Notez votre CV'}
                </div>
              </div>
              <button
                type="button"
                onClick={onRateCv}
                disabled={isRatingCv}
                className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold shadow-soft hover:bg-teal-700 disabled:bg-teal-300 disabled:cursor-not-allowed shrink-0"
              >
                {isRatingCv ? 'En cours' : 'Noter mon CV'}
              </button>
            </>
          )}
        </div>
        <p className="mt-2 text-[10px] leading-snug text-teal-700/70">
          Note <strong>indicative</strong> : un CV ne prend vraiment du sens que <strong>face à un poste précis</strong>.
          N'hésitez pas à en discuter avec un conseiller bien <strong>humain</strong>.
        </p>
        <div className="mt-3 flex flex-wrap justify-start gap-2">
          <MonConseiller variant="mobile" />
          <MesQuestionnaires variant="mobile" />
          <EnvoisConseiller variant="mobile" />
        </div>
      </div>

      <div className="flex-1 flex">
        <Sidebar
          currentStep={currentStep}
          maxUnlocked={maxUnlocked}
          onNavigate={onNavigate}
          cvRating={cvRating}
          isRatingCv={isRatingCv}
          canRateCv={canRateCv}
          onRateCv={onRateCv}
          onShowRatingDetails={onShowRatingDetails}
          favoriteJobs={favoriteJobs}
          onOpenFavorite={onOpenFavorite}
          onRemoveFavorite={onRemoveFavorite}
        />

        <div className="flex-1 flex flex-col">
          <main className="flex-1 px-4 sm:px-6 lg:px-10 py-8 max-w-[1024px] mx-auto w-full">
            {error && <ErrorBanner message={error} onClose={onCloseError} />}
            <StepHelpLink step={currentStep} coded={Boolean(user?.email?.endsWith('@iamonjob.local'))} />
            {children}
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}
