'use client';

import { Gauge, Loader2 } from 'lucide-react';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { ErrorBanner } from '../ui';

/** Couleur de la pastille mobile selon le score /10 (cohérent avec la sidebar). */
const mobileRatingTile = (n) => {
  if (n == null) return 'bg-teal-600 border-teal-700';
  if (n >= 8) return 'bg-emerald-600 border-emerald-700';
  if (n >= 5) return 'bg-amber-600 border-amber-700';
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
  children,
}) {
  return (
    <div className="min-h-screen bg-cream-100 text-teal-900 flex flex-col">
      <Header user={user} sessionLabel={sessionLabel} />

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
                aria-label={`Note de votre CV : ${cvRating.score} sur 10`}
              >
                <Gauge className="w-4 h-4 text-white/90" aria-hidden="true" />
                <span
                  className="text-xl font-extrabold leading-none tabular-nums"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.25)' }}
                >
                  {cvRating.score}
                  <span className="text-xs font-bold text-white/90 ml-0.5">/10</span>
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
          Note <strong>indicative</strong> — un CV ne prend vraiment du sens que <strong>face à un poste précis</strong>.
          N'hésitez pas à en discuter avec un conseiller bien <strong>humain</strong>.
        </p>
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
        />

        <div className="flex-1 flex flex-col">
          <main className="flex-1 px-4 sm:px-6 lg:px-10 py-8 max-w-[1024px] mx-auto w-full">
            {error && <ErrorBanner message={error} onClose={onCloseError} />}
            {children}
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}
