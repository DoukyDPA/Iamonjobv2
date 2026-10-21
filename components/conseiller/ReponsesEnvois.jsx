'use client';

// ════════════════════════════════════════════════════════════════════════════
// Réponses des personnes à vos envois (offres, messages, questionnaires,
// documents signés), du plus récent au plus ancien. Un clic sur le code ouvre
// la fiche de la personne.
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { Loader2, Briefcase, MessageCircle, ClipboardList, FileSignature, Send } from 'lucide-react';
import EnvoiModal from './EnvoiModal';
import { Prenom } from './Prenoms';

const ICONS = { offre: Briefcase, message: MessageCircle, questionnaire: ClipboardList, document: FileSignature };

function formatDate(ms) {
  if (!ms) return '';
  try { return new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }); } catch { return ''; }
}

export default function ReponsesEnvois({ beneficiaires = [], onOpenPersonne }) {
  const [envois, setEnvois] = useState(null);
  const [nouveau, setNouveau] = useState(false);
  const [voirTout, setVoirTout] = useState(false);

  async function load() {
    try {
      const r = await fetch('/api/conseiller/envois');
      const d = await r.json();
      setEnvois(d.envois || []);
    } catch { setEnvois([]); }
  }
  useEffect(() => { load(); }, []);

  const reponses = (envois || []).filter((e) => e.status === 'repondu')
    .sort((a, b) => (b.reponduAt ?? 0) - (a.reponduAt ?? 0));
  const enAttente = (envois || []).filter((e) => e.status !== 'repondu').length;
  const shown = voirTout ? reponses : reponses.slice(0, 15);
  const benById = new Map(beneficiaires.map((b) => [b.id, b]));

  return (
    <section className="mt-8" aria-labelledby="rep-title">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h3 id="rep-title" className="text-lg font-extrabold text-teal-800">Réponses à vos envois</h3>
          <p className="text-sm text-teal-700/70">
            {envois ? `${reponses.length} réponse(s) · ${enAttente} envoi(s) sans réponse ou non ouverts` : 'Chargement…'}
          </p>
        </div>
        <button onClick={() => setNouveau(true)} disabled={!beneficiaires.length} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold text-sm hover:bg-teal-700 disabled:bg-teal-200">
          <Send className="w-4 h-4" /> Nouvel envoi
        </button>
      </div>
      {!envois ? (
        <div className="bg-white border border-cream-200 rounded-2xl shadow-card p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-teal-600" /></div>
      ) : reponses.length === 0 ? (
        <div className="bg-white border border-cream-200 rounded-2xl shadow-card p-6 text-sm text-teal-700/70 text-center">Aucune réponse pour l'instant.</div>
      ) : (
        <ul className="bg-white border border-cream-200 rounded-2xl shadow-card divide-y divide-cream-100">
          {shown.map((e) => {
            const Icon = ICONS[e.type] || MessageCircle;
            const titre = e.type === 'offre' ? e.offre?.intitule : e.type === 'questionnaire' ? e.questionnaire?.titre : e.type === 'document' ? e.document?.titre : (e.texte || '').slice(0, 90);
            const ben = benById.get(e.beneficiaireId);
            return (
              <li key={e.id} className="px-4 py-3 flex items-start gap-3">
                <Icon className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 text-sm">
                  <div className="text-teal-900">
                    <button onClick={() => ben && onOpenPersonne?.(ben)} className="font-mono font-semibold hover:underline">{e.beneficiaireCode}<Prenom code={e.beneficiaireCode} /></button>
                    <span className="text-teal-700/60"> · {formatDate(e.reponduAt)} · </span>{titre}
                  </div>
                  {e.reponse?.texte && <p className="text-teal-800 whitespace-pre-wrap mt-0.5">« {e.reponse.texte} »</p>}
                  {e.type === 'questionnaire' && <p className="text-xs text-teal-700/70 mt-0.5">Questionnaire rempli : réponses dans la fiche de la personne.</p>}
                  {e.type === 'document' && e.signature && <p className="text-xs text-teal-700/70 mt-0.5">Signé {e.signature.mode === 'papier' ? 'sur papier' : 'en ligne'}.</p>}
                </div>
              </li>
            );
          })}
          {reponses.length > 15 && (
            <li><button onClick={() => setVoirTout((v) => !v)} className="w-full px-4 py-2.5 text-sm font-semibold text-teal-700 hover:bg-cream-50">{voirTout ? 'Réduire' : `Voir les ${reponses.length} réponses`}</button></li>
          )}
        </ul>
      )}
      {nouveau && <EnvoiModal beneficiaires={beneficiaires} preset={{ type: 'message' }} onClose={() => setNouveau(false)} onSent={load} />}
    </section>
  );
}
