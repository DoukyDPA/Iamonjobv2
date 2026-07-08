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
  X,
} from 'lucide-react';
import { CatMascot } from '../brand';
import MonConseiller from '../MonConseiller';

const STEPS = [
  { n: 1, label: 'Mon CV',         icon: FileText },
  { n: 2, label: 'Mes pistes',     icon: Compass },
  { n: 3, label: 'Enquête métier', icon: MessageCircle },
  { n: 4, label: "Offres d'emploi",icon: Briefcase },
  { n: 5, label: 'Compatibilité',  icon: Star },
];

/**
 * Pastille pleinement colorée selon le score /20.
 * Texte blanc + ombre légère pour garantir la lisibilité du chiffre
 * y compris sur les teintes les plus saturées (WCAG AA visé).
 */
const ratingTile = (n) => {
  if (n == null) return 'bg-teal-600 border-teal-700';
  if (n >= 16) return 'bg-emerald-600 border-emerald-700';
  if (n >= 10) return 'bg-amber-600 border-amber-700';
  return 'bg-rose-600 border-rose-700';
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
  favoriteJobs = [],
  onOpenFavorite,
  onRemoveFavorite,
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

      {/* ─────── Contact conseiller (toujours visible) ─────── */}
      <MonConseiller variant="sidebar" />

      {/* ─────── Bloc « Mes métiers » (favoris) ─────── */}
      {favoriteJobs.length > 0 && (
        <div className="mt-6 pt-5 border-t border-cream-200">
          <div className="text-xs font-bold tracking-[0.15em] text-teal-700/70 mb-3 flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-amber-500" fill="currentColor" />
            MES MÉTIERS
          </div>
          <ul className="space-y-1.5">
            {favoriteJobs.map((job) => (
              <li key={job.title} className="group flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onOpenFavorite?.(job)}
                  title={`Reprendre l'enquête métier : ${job.title}`}
                  className="flex-1 min-w-0 flex items-center gap-2 px-3 py-2 rounded-xl text-left bg-white border border-cream-200 hover:border-amber-300 hover:bg-amber-50/40 transition-all"
                >
                  <Star className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="currentColor" />
                  <span className="text-sm font-medium text-teal-800 truncate">{job.title}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveFavorite?.(job)}
                  title="Retirer de mes métiers"
                  aria-label={`Retirer ${job.title} de mes métiers`}
                  className="shrink-0 p-1.5 rounded-lg text-teal-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ─────── Bloc « Noter mon CV » ─────── */}
      <div className="mt-6 pt-5 border-t border-cream-200">
        <div className="text-xs font-bold tracking-[0.15em] text-teal-700/70 mb-3">
          ÉVALUATION
        </div>

        {cvRating ? (
          <div className="space-y-2">
            <div
              className={[
                'rounded-xl border-2 px-4 py-4 flex items-center gap-3 text-white shadow-card',
                ratingTile(cvRating.score),
              ].join(' ')}
              aria-live="polite"
              aria-label={`Note de votre CV : ${cvRating.score} sur 20`}
            >
              <Gauge className="w-6 h-6 shrink-0 text-white/90" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider font-bold text-white/85">
                  Note de votre CV
                </div>
                <div
                  className="text-4xl font-extrabold leading-none mt-0.5 tabular-nums"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.25)' }}
                >
                  {cvRating.score}
                  <span className="text-base font-bold text-white/90 ml-0.5">/20</span>
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
              className="w-full text-[11px] text-teal-700/70 hover:text-teal-800 hover:underline disabled:opacity-50 disabled:cursor-not-allowed px-1 text-left"
            >
              {isRatingCv ? 'Nouvelle évaluation…' : 'Réévaluer'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onRateCv}
            disabled={isRatingCv}
            className={[
              'w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left cursor-pointer',
              isRatingCv
                ? 'bg-white border-cream-200 text-teal-700 cursor-wait'
                : canRateCv
                ? 'bg-white border-teal-200 hover:border-teal-400 hover:bg-teal-50 text-teal-700 shadow-soft'
                : 'bg-white border-cream-300 hover:border-teal-300 hover:bg-cream-50 text-teal-700/80',
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

        {/* Appel au soutien — renvoie vers HelloAsso dans un nouvel onglet */}
        <a
          href="https://www.helloasso.com/associations/comite-de-bassin-d-emploi-sud-val-de-marnais/formulaires/2"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 block rounded-xl overflow-hidden border border-cream-200 hover:border-pink-300 hover:shadow-card transition-all focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-2 focus:ring-offset-cream-100"
          aria-label="Soutenir IAMonJob sur HelloAsso (s'ouvre dans un nouvel onglet)"
          title="Soutenir IAMonJob"
        >
          <img
            src="https://i.postimg.cc/pTqVfhGF/IAMAPUB.png"
            alt="Soutenez IAMonJob"
            loading="lazy"
            className="w-full h-auto block"
          />
        </a>
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
