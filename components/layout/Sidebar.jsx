'use client';

import {
  FileText,
  Compass,
  MessageCircle,
  Briefcase,
  Star,
  HelpCircle,
  Gauge,
  Loader2,
  Info,
} from 'lucide-react';
import { CatMascot } from '../brand';

const STEPS = [
  { n: 1, label: 'Mon CV',         icon: FileText },
  { n: 2, label: 'Mes pistes',     icon: Compass },
  { n: 3, label: 'Enquête métier', icon: MessageCircle },
  { n: 4, label: "Offres d'emploi",icon: Briefcase },
  { n: 5, label: 'Compatibilité',  icon: Star },
];

/** Couleur du score sur 10. */
const ratingColor = (n) => {
  if (n == null) return 'text-teal-700 bg-cream-50 border-cream-300';
  if (n >= 8) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (n >= 5) return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-rose-700 bg-rose-50 border-rose-200';
};

export default function Sidebar({
  currentStep = 1,
  maxUnlocked = 1,
  onNavigate,
  cvRating = null,
  isRatingCv = false,
  canRateCv = false,
  onRateCv,
  onShowRatingDetails,
}) {
  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-cream-200 bg-cream-100 px-5 py-6">
      <div className="text-xs font-bold tracking-[0.15em] text-teal-700/70 mb-4">
        VOTRE PARCOURS
      </div>

      <nav aria-label="Parcours en 5 étapes" className="space-y-1.5">
        {STEPS.map((s) => {
          const isActive = currentStep === s.n;
          const isUnlocked = s.n <= maxUnlocked;
          const Icon = s.icon;
          return (
            <button
              key={s.n}
              onClick={() => isUnlocked && onNavigate?.(s.n)}
              disabled={!isUnlocked}
              aria-current={isActive ? 'step' : undefined}
              className={[
                'group w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all',
                isActive
                  ? 'bg-white border border-cream-200 shadow-soft'
                  : isUnlocked
                  ? 'hover:bg-cream-200/70 border border-transparent'
                  : 'opacity-50 cursor-not-allowed border border-transparent',
              ].join(' ')}
            >
              {/* Numéro */}
              <span
                className={[
                  'w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 border transition-colors',
                  isActive
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-cream-50 text-teal-700/70 border-cream-300',
                ].join(' ')}
              >
                {s.n}
              </span>

              <div className="flex-1 min-w-0">
                <div className="text-[10px] tracking-wider font-semibold text-teal-700/60 uppercase">
                  Étape {s.n}
                </div>
                <div className={`text-sm font-semibold flex items-center gap-1.5 ${isActive ? 'text-teal-800' : 'text-teal-700/80'}`}>
                  <Icon className="w-3.5 h-3.5 text-teal-600/70" />
                  {s.label}
                </div>
              </div>

              {isActive && <span className="w-1 h-8 rounded-full bg-teal-600" aria-hidden="true" />}
            </button>
          );
        })}
      </nav>

      {/* ─────── Bloc « Noter mon CV » ─────── */}
      <div className="mt-6 pt-5 border-t border-cream-200">
        <div className="text-xs font-bold tracking-[0.15em] text-teal-700/70 mb-3">
          ÉVALUATION
        </div>

        {cvRating ? (
          <div className="space-y-2">
            <div
              className={[
                'rounded-xl border px-3 py-3 flex items-center gap-3',
                ratingColor(cvRating.score),
              ].join(' ')}
              aria-live="polite"
            >
              <Gauge className="w-5 h-5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider font-bold opacity-70">
                  Note de votre CV
                </div>
                <div className="text-xl font-extrabold leading-none">
                  {cvRating.score}<span className="text-sm font-bold opacity-70">/10</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onShowRatingDetails}
              className="w-full text-left text-xs font-semibold text-teal-700 hover:text-teal-900 hover:underline px-1"
            >
              Pourquoi cette note ?
            </button>

            <button
              type="button"
              onClick={onRateCv}
              disabled={isRatingCv || !canRateCv}
              className="w-full text-[11px] text-teal-700/70 hover:text-teal-800 hover:underline disabled:opacity-50 disabled:cursor-not-allowed px-1"
            >
              {isRatingCv ? 'Nouvelle évaluation…' : 'Réévaluer'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onRateCv}
            disabled={isRatingCv || !canRateCv}
            className={[
              'w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
              isRatingCv
                ? 'bg-white border-cream-200 text-teal-700 cursor-wait'
                : canRateCv
                ? 'bg-white border-teal-200 hover:border-teal-400 hover:bg-teal-50 text-teal-700 shadow-soft'
                : 'bg-cream-50 border-cream-200 text-teal-700/50 cursor-not-allowed',
            ].join(' ')}
            title={!canRateCv ? 'Importez d\'abord votre CV à l\'étape 1' : undefined}
          >
            <span className="w-7 h-7 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0">
              {isRatingCv ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
              ) : (
                <Gauge className="w-3.5 h-3.5 text-teal-600" />
              )}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] tracking-wider font-semibold text-teal-700/60 uppercase">
                Évaluation
              </div>
              <div className="text-sm font-semibold">
                {isRatingCv ? 'Analyse en cours…' : 'Noter mon CV'}
              </div>
            </div>
          </button>
        )}

        <p className="mt-3 text-[11px] leading-relaxed text-teal-700/70 flex items-start gap-1.5">
          <Info className="w-3 h-3 mt-0.5 shrink-0 text-teal-500" />
          <span>
            Cette note est <strong>indicative</strong> : un CV ne prend vraiment du sens
            que <strong>face à un poste précis</strong>. N'hésitez pas à en discuter
            avec un conseiller bien <strong>humain</strong> pour un regard approfondi.
          </span>
        </p>
      </div>

      <div className="flex-1" />

      {/* Aide en bas */}
      <div className="mt-8 p-4 bg-cream-50 border border-cream-200 rounded-xl flex items-start gap-3">
        <div className="shrink-0">
          <CatMascot className="w-10 h-10" />
        </div>
        <div className="text-xs leading-relaxed">
          <div className="font-bold text-teal-800 mb-1 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5" /> Besoin d'aide ?
          </div>
          <p className="text-teal-700/80">
            Cliquez sur les « ? » pour comprendre chaque terme.
          </p>
        </div>
      </div>
    </aside>
  );
}
