'use client';

// ════════════════════════════════════════════════════════════════════════════
// Séance avec le conseiller.
//
// 1. Pendant la séance (le conseiller a ouvert l'espace de la personne) : un
//    bandeau le rappelle en permanence, avec « Terminer la séance », qui
//    déconnecte complètement et ramène à la connexion conseiller.
// 2. Ensuite, quand la personne revient seule : « Votre conseiller a
//    travaillé avec vous le 17 octobre. » Elle sait toujours qui a agi dans
//    son espace.
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { Users, X, CalendarDays } from 'lucide-react';

const SEANCE_KEY = 'iamj_seance';
const VU_KEY = 'iamj_seance_vue';

export default function SeanceBanner({ user }) {
  const [enSeance, setEnSeance] = useState(null); // { code } | null
  const [derniere, setDerniere] = useState(null); // ms | null
  const [rdv, setRdv] = useState(null); // { date, heure, lieu, quand } | null

  useEffect(() => {
    let alive = true;
    auth.currentUser?.getIdTokenResult().then((r) => {
      if (!alive) return;
      let flag = null;
      try { flag = JSON.parse(sessionStorage.getItem(SEANCE_KEY) || 'null'); } catch { /* ignoré */ }
      if (r?.claims?.seanceConseiller || flag) {
        setEnSeance({ code: flag?.code || user?.name || '' });
        return;
      }
      if (r?.claims?.role !== 'beneficiaire') return;
      fetch('/api/mon-dossier').then((x) => (x.ok ? x.json() : null)).then((d) => {
        if (!alive || !d) return;
        // Rappel de rendez-vous : aujourd'hui, demain, ou dans les 3 jours.
        if (d.prochainRdv?.date) {
          const today = new Date(); today.setHours(0, 0, 0, 0);
          const [y, m, j] = d.prochainRdv.date.split('-').map(Number);
          const ecart = Math.round((new Date(y, m - 1, j) - today) / 86400000);
          if (ecart >= 0 && ecart <= 3) {
            const quand = ecart === 0 ? "aujourd'hui" : ecart === 1 ? 'demain' : `le ${new Date(y, m - 1, j).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`;
            setRdv({ ...d.prochainRdv, quand });
          }
        }
        if (!d.seances?.length) return;
        const last = d.seances[0];
        let vu = 0;
        try { vu = Number(localStorage.getItem(`${VU_KEY}_${auth.currentUser?.uid}`)) || 0; } catch { /* ignoré */ }
        if (last > vu && Date.now() - last < 30 * 24 * 3600 * 1000) setDerniere(last);
      }).catch(() => {});
    }).catch(() => {});
    return () => { alive = false; };
  }, [user?.name]);

  async function terminer() {
    try { sessionStorage.removeItem(SEANCE_KEY); } catch { /* ignoré */ }
    try { await signOut(auth); } catch { /* on poursuit */ }
    try { await fetch('/auth/signout', { method: 'POST', redirect: 'manual' }); } catch { /* ignoré */ }
    window.location.href = '/conseiller/connexion';
  }

  if (enSeance) {
    return (
      <div className="bg-indigo-700 text-white">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center gap-3 text-sm">
          <Users className="w-4 h-4 shrink-0" aria-hidden="true" />
          <p className="flex-1 min-w-[14rem]">
            <strong>Séance avec le conseiller</strong>{enSeance.code ? <> dans l'espace de <span className="font-mono">{enSeance.code}</span></> : null}.
            Tout ce que vous faites ici est enregistré dans son dossier.
          </p>
          <button type="button" onClick={terminer} className="px-3 py-1.5 rounded-lg bg-white text-indigo-800 font-semibold hover:bg-indigo-50">
            Terminer la séance
          </button>
        </div>
      </div>
    );
  }

  if (rdv) {
    return (
      <div className="bg-pink-50 border-b border-pink-100">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-3 text-sm text-pink-900">
          <CalendarDays className="w-4 h-4 shrink-0" aria-hidden="true" />
          <p className="flex-1">
            <strong>Rendez-vous avec votre conseiller {rdv.quand}{rdv.heure ? ` à ${rdv.heure.replace(':', ' h ')}` : ''}</strong>
            {rdv.lieu ? <>, {rdv.lieu}</> : null}. En cas d'empêchement, prévenez-le avec « Mon conseiller ».
          </p>
        </div>
      </div>
    );
  }

  if (derniere) {
    const date = new Date(derniere).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
    const fermer = () => {
      try { localStorage.setItem(`${VU_KEY}_${auth.currentUser?.uid}`, String(derniere)); } catch { /* ignoré */ }
      setDerniere(null);
    };
    return (
      <div className="bg-indigo-50 border-b border-indigo-100">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-3 text-sm text-indigo-900">
          <Users className="w-4 h-4 shrink-0" aria-hidden="true" />
          <p className="flex-1">Votre conseiller a travaillé avec vous dans votre espace le <strong>{date}</strong>. Ce que vous avez fait ensemble est enregistré ici.</p>
          <button type="button" onClick={fermer} aria-label="Fermer ce message" className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-indigo-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }
  return null;
}
