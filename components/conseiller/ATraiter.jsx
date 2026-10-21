'use client';

// ════════════════════════════════════════════════════════════════════════════
// « À traiter aujourd'hui » — en tête du tableau de bord, la liste de ce qui
// demande une action, plutôt que des compteurs :
//   messages en attente, codes non activés depuis plus de 7 jours, accès
//   réinitialisés pas encore repris, personnes sans visite depuis 15 jours.
// Les alertes des questionnaires restent dans l'onglet Questionnaires (calcul
// à partir des fiches), avec un lien direct.
// Chaque ligne ouvre la fiche concernée.
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { MessageSquareHeart, KeyRound, Clock, UserX, ClipboardList, ChevronDown, CheckCircle2, CalendarDays } from 'lucide-react';
import { Prenom } from './Prenoms';

const DAY = 24 * 60 * 60 * 1000;

export default function ATraiter({ list = [], avisEnAttente = 0, onOpenPersonne, onGoTo }) {
  const [ouvert, setOuvert] = useState(null);
  const now = Date.now();
  const actifs = list.filter((b) => !b.promoArchivee);

  const nonActives = actifs.filter((b) => b.status === 'invited' && b.createdAt && now - b.createdAt > 7 * DAY);
  const resets = actifs.filter((b) => b.status === 'reset');
  const decroches = actifs
    .filter((b) => b.status === 'active' && b.lastSeenAt && now - b.lastSeenAt > 15 * DAY)
    .sort((a, b) => a.lastSeenAt - b.lastSeenAt);

  // Rendez-vous du jour (date du dossier comparée à aujourd'hui, heure locale).
  const auj = new Date();
  const ymd = `${auj.getFullYear()}-${String(auj.getMonth() + 1).padStart(2, '0')}-${String(auj.getDate()).padStart(2, '0')}`;
  const rdvJour = actifs.filter((b) => b.prochainRdv?.date === ymd).sort((a, b) => String(a.prochainRdv.heure).localeCompare(String(b.prochainRdv.heure)));

  const groupes = [
    rdvJour.length > 0 && { id: 'rdv', icon: CalendarDays, tone: 'teal', text: `${rdvJour.length} rendez-vous aujourd'hui`, personnes: rdvJour, detail: (b) => `${b.prochainRdv.heure || 'heure ?'}${b.prochainRdv.lieu ? ` · ${b.prochainRdv.lieu}` : ''}` },
    avisEnAttente > 0 && { id: 'messages', icon: MessageSquareHeart, tone: 'amber', text: `${avisEnAttente} message${avisEnAttente > 1 ? 's' : ''} en attente de réponse`, action: () => onGoTo?.('messages') },
    decroches.length > 0 && { id: 'decroches', icon: UserX, tone: 'rose', text: `${decroches.length} personne${decroches.length > 1 ? 's' : ''} sans visite depuis plus de 15 jours (compte supprimé à 30 jours)`, personnes: decroches, detail: (b) => { const j = Math.floor((now - b.lastSeenAt) / DAY); return `vu il y a ${j} j · compte supprimé dans ${Math.max(0, 30 - j)} j`; } },
    nonActives.length > 0 && { id: 'codes', icon: Clock, tone: 'amber', text: `${nonActives.length} code${nonActives.length > 1 ? 's' : ''} non activé${nonActives.length > 1 ? 's' : ''} depuis plus de 7 jours`, personnes: nonActives, detail: (b) => `créé il y a ${Math.floor((now - b.createdAt) / DAY)} j` },
    resets.length > 0 && { id: 'resets', icon: KeyRound, tone: 'amber', text: `${resets.length} accès réinitialisé${resets.length > 1 ? 's' : ''}, nouveau mot de passe pas encore choisi`, personnes: resets, detail: () => 'à réactiver' },
  ].filter(Boolean);

  const tones = {
    amber: 'border-amber-200 bg-amber-50/60 text-amber-900',
    rose: 'border-rose-200 bg-rose-50/60 text-rose-900',
    teal: 'border-teal-200 bg-teal-50/60 text-teal-900',
  };

  return (
    <section aria-labelledby="atraiter-title" className="mb-5 bg-white border border-cream-200 rounded-2xl shadow-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 id="atraiter-title" className="text-base font-extrabold text-teal-800">À traiter aujourd'hui</h2>
        <button type="button" onClick={() => onGoTo?.('questionnaires')} className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:underline">
          <ClipboardList className="w-3.5 h-3.5" /> Alertes des questionnaires
        </button>
      </div>
      {groupes.length === 0 ? (
        <p className="text-sm text-teal-700 inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-teal-600" /> Rien d'urgent : pas de message en attente, personne ne décroche.</p>
      ) : (
        <ul className="space-y-2">
          {groupes.map((g) => {
            const Icon = g.icon;
            const isOpen = ouvert === g.id;
            return (
              <li key={g.id} className={`rounded-xl border px-3 py-2 ${tones[g.tone]}`}>
                <button
                  type="button"
                  onClick={() => (g.action ? g.action() : setOuvert(isOpen ? null : g.id))}
                  aria-expanded={g.personnes ? isOpen : undefined}
                  className="w-full flex items-center gap-2 text-left text-sm font-semibold"
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="flex-1">{g.text}</span>
                  {g.personnes && <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
                </button>
                {isOpen && g.personnes && (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {g.personnes.slice(0, 40).map((b) => (
                      <li key={b.id}>
                        <button type="button" onClick={() => onOpenPersonne?.(b)} className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-cream-300 px-2 py-1 text-xs text-teal-900 hover:border-teal-400">
                          <span className="font-mono font-semibold">{b.code}<Prenom code={b.code} /></span>
                          <span className="text-teal-700/70">{g.detail(b)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
