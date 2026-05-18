'use client';

import {
  FileText,
  Compass,
  MessageCircle,
  Briefcase,
  Star,
  HelpCircle,
} from 'lucide-react';
import { CatMascot } from '../brand';

const STEPS = [
  { n: 1, label: 'Mon CV',         icon: FileText },
  { n: 2, label: 'Mes pistes',     icon: Compass },
  { n: 3, label: 'Enquête métier', icon: MessageCircle },
  { n: 4, label: "Offres d'emploi",icon: Briefcase },
  { n: 5, label: 'Compatibilité',  icon: Star },
];

export default function Sidebar({ currentStep = 1, maxUnlocked = 1, onNavigate }) {
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
