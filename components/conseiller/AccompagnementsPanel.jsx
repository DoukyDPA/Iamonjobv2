'use client';

// ════════════════════════════════════════════════════════════════════════════
// Onglet « Accompagnements » — une ligne par personne suivie.
//
// Filtre par promo (toutes, sans promo, une promo), tri par date
// d'inscription, par code ou par promo, recherche par code. Un clic sur le
// code ouvre la fiche (métiers, envois, transfert).
// ════════════════════════════════════════════════════════════════════════════

import { useMemo, useState } from 'react';
import {
  FolderOpen, Trash2, Download, UserPlus, Loader2, Search, ShieldCheck, ShieldAlert, ShieldX, Compass, UsersRound, FileSpreadsheet,
} from 'lucide-react';
import { downloadCodesCsv } from './codesCsv';
import { Prenom, usePrenoms } from './Prenoms';

const CONSENT = {
  granted: { label: 'Accordé', cls: 'bg-teal-50 text-teal-700 border-teal-200', Icon: ShieldCheck },
  pending: { label: 'En attente', cls: 'bg-amber-50 text-amber-700 border-amber-200', Icon: ShieldAlert },
  revoked: { label: 'Retiré', cls: 'bg-rose-50 text-rose-700 border-rose-200', Icon: ShieldX },
};

const SANS = '__sans__';
const TRIS = [
  { id: 'inscription-desc', label: 'Inscription : plus récentes' },
  { id: 'inscription-asc', label: 'Inscription : plus anciennes' },
  { id: 'visite', label: 'Dernière visite : la plus ancienne' },
  { id: 'promo', label: 'Promo' },
  { id: 'code', label: 'Code' },
];

// « aujourd'hui », « hier », « il y a 12 j » ; couleur selon l'ancienneté.
const DAY = 24 * 60 * 60 * 1000;
export function derniereVisite(b, now = Date.now()) {
  if (b.status !== 'active' || !b.lastSeenAt) return { label: '–', cls: 'text-teal-700/40', jours: null };
  const j = Math.floor((now - b.lastSeenAt) / DAY);
  const label = j <= 0 ? "aujourd'hui" : j === 1 ? 'hier' : `il y a ${j} j`;
  const cls = j >= 15 ? 'text-rose-700 font-semibold' : j >= 7 ? 'text-amber-700' : 'text-teal-800';
  return { label, cls, jours: j };
}

// Activité IA du mois, en mots simples. Les seuils sont indicatifs : une
// analyse de CV ou d'offre pèse quelques milliers d'unités. Le chiffre exact
// reste dans l'infobulle, pour le responsable de structure.
function activite(n) {
  const v = Number(n) || 0;
  if (v === 0) return { label: 'aucune', cls: 'text-teal-700/40' };
  if (v < 20000) return { label: 'faible', cls: 'text-amber-700' };
  return { label: 'régulière', cls: 'text-emerald-700 font-semibold' };
}
function formatDate(ms) {
  if (!ms) return '';
  try { return new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; }
}
// Date d'inscription : activation du code ; à défaut, création du code.
const dateInscription = (b) => b.activatedAt || b.createdAt || 0;

function Consent({ value }) {
  const it = CONSENT[value] || { label: value, cls: 'bg-gray-50 text-gray-600 border-gray-200' };
  const Icon = it.Icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${it.cls}`}>
      {Icon && <Icon className="w-3 h-3" aria-hidden="true" />}{it.label}
    </span>
  );
}

export default function AccompagnementsPanel({ list = [], promoFiltre = '', onOpen, onDelete, onCreate, onCreateMany, creating }) {
  const [promo, setPromo] = useState(promoFiltre);
  const [tri, setTri] = useState('inscription-desc');
  const [q, setQ] = useState('');
  const { label: prenomDe } = usePrenoms();

  const promos = useMemo(() => {
    // Une promo est archivée quand toutes ses personnes le sont.
    const arch = new Map();
    for (const b of list) if (b.promo) arch.set(b.promo, (arch.has(b.promo) ? arch.get(b.promo) : true) && Boolean(b.promoArchivee));
    return [...arch.entries()].map(([label, archivee]) => ({ label, archivee }))
      .sort((a, b) => Number(a.archivee) - Number(b.archivee) || a.label.localeCompare(b.label, 'fr', { numeric: true }));
  }, [list]);

  const rows = useMemo(() => {
    const s = q.trim().toUpperCase();
    let r = list.filter((b) => (!promo ? true : promo === SANS ? !b.promo : b.promo === promo))
      .filter((b) => !s || String(b.code || '').toUpperCase().includes(s) || prenomDe(b.code).toUpperCase().includes(s));
    const byDate = (a, b) => dateInscription(b) - dateInscription(a);
    r = [...r].sort(
      tri === 'inscription-asc' ? (a, b) => -byDate(a, b)
      : tri === 'code' ? (a, b) => String(a.code).localeCompare(String(b.code))
      : tri === 'visite' ? (a, b) => (a.lastSeenAt ?? Infinity) - (b.lastSeenAt ?? Infinity)
      : tri === 'promo' ? (a, b) => String(a.promo || '~').localeCompare(String(b.promo || '~'), 'fr', { numeric: true }) || byDate(a, b)
      : byDate
    );
    return r;
  }, [list, promo, tri, q, prenomDe]);

  const select = 'p-2 text-sm rounded-lg border border-teal-200 bg-white';
  const [bilanOpen, setBilanOpen] = useState(false);
  const [du, setDu] = useState('');
  const [au, setAu] = useState('');
  const bilanUrl = () => {
    const p = new URLSearchParams();
    if (promo) p.set('promo', promo);
    if (du) p.set('du', du);
    if (au) p.set('au', au);
    return `/api/conseiller/bilan?${p.toString()}`;
  };

  return (
    <section aria-labelledby="acc-title">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 id="acc-title" className="text-xl font-extrabold text-teal-800">Accompagnements</h2>
          <p className="text-sm text-teal-700/70">Une ligne par personne. Cliquez sur un code pour ouvrir sa fiche : métiers, envois, transfert.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => downloadCodesCsv(rows, { suffix: promo && promo !== SANS ? promo : '' })}
            disabled={!rows.length}
            title="Tableur à garder sur votre ordinateur : complétez les prénoms, ne le partagez pas"
            className="inline-flex items-center gap-2 px-4 py-2 border border-teal-200 bg-white text-teal-800 rounded-xl font-semibold text-sm hover:bg-teal-50 disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Télécharger les codes{promo ? ' (filtre)' : ''}
          </button>
          <button
            onClick={() => setBilanOpen((v) => !v)}
            aria-expanded={bilanOpen}
            className="inline-flex items-center gap-2 px-4 py-2 border border-teal-200 bg-white text-teal-800 rounded-xl font-semibold text-sm hover:bg-teal-50"
            title="Tableur pour rendre compte aux financeurs : chiffres et situations de sortie, sans aucun nom"
          >
            <FileSpreadsheet className="w-4 h-4" /> Bilan financeurs
          </button>
          <button onClick={onCreate} disabled={creating} className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl font-semibold text-sm hover:bg-teal-700 disabled:bg-teal-200">
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Ajouter une personne
          </button>
          {onCreateMany && (
            <button onClick={onCreateMany} disabled={creating} className="inline-flex items-center gap-2 px-4 py-2 border border-teal-600 bg-white text-teal-800 rounded-xl font-semibold text-sm hover:bg-teal-50 disabled:opacity-50" title="Créer plusieurs codes d'un coup et imprimer un coupon par personne">
              <UsersRound className="w-4 h-4" /> Créer une promo de codes
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <label className="inline-flex items-center gap-1.5 text-sm text-teal-800">
          Promo
          <select value={promo} onChange={(e) => setPromo(e.target.value)} className={select}>
            <option value="">Toutes ({list.length})</option>
            <option value={SANS}>Sans promo</option>
            {promos.map((p) => <option key={p.label} value={p.label}>{p.label}{p.archivee ? ' (archivée)' : ''}</option>)}
          </select>
        </label>
        <label className="inline-flex items-center gap-1.5 text-sm text-teal-800">
          Trier par
          <select value={tri} onChange={(e) => setTri(e.target.value)} className={select}>
            {TRIS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </label>
        <label className="relative">
          <Search className="w-4 h-4 text-teal-600/60 absolute left-2.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Code ou prénom…" aria-label="Rechercher un code ou un prénom" className="pl-8 p-2 text-sm rounded-lg border border-teal-200 bg-white w-36" />
        </label>
        <span className="text-xs text-teal-700/60 ml-auto">{rows.length} personne{rows.length > 1 ? 's' : ''}</span>
      </div>

      {bilanOpen && (
        <div className="mb-4 rounded-2xl border border-teal-200 bg-white p-4 flex flex-wrap items-end gap-3">
          <p className="w-full text-sm text-teal-800">
            Bilan {promo ? (promo === SANS ? 'des personnes sans promo' : `de la promo ${promo}`) : 'de toutes vos personnes'} : une ligne par code (offres analysées, candidatures, entretiens, situation à la sortie) et un récapitulatif. Aucun nom.
          </p>
          <label className="text-sm text-teal-800">Du <input type="date" value={du} onChange={(e) => setDu(e.target.value)} className="ml-1 p-1.5 rounded-lg border border-teal-200" /></label>
          <label className="text-sm text-teal-800">au <input type="date" value={au} onChange={(e) => setAu(e.target.value)} className="ml-1 p-1.5 rounded-lg border border-teal-200" /></label>
          <a href={bilanUrl()} className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl font-semibold text-sm hover:bg-teal-700">
            <Download className="w-4 h-4" /> Télécharger le bilan
          </a>
          <span className="text-xs text-teal-700/70">Renseignez la « Situation à la sortie » dans la fiche de chaque personne.</span>
        </div>
      )}

      <p className="mb-3 text-xs text-teal-700/70">
        Le fichier des codes se complète avec les prénoms sur votre ordinateur. Ne l'envoyez à personne et ne le joignez jamais à un message : c'est votre seule table de correspondance. « Afficher mes prénoms », en haut, le lit sur votre ordinateur sans l'envoyer.
      </p>

      {list.length === 0 ? (
        <div className="bg-white border border-cream-200 rounded-2xl shadow-card p-10 text-center">
          <Compass className="w-10 h-10 text-teal-400 mx-auto mb-3" />
          <p className="text-teal-800 font-semibold">Aucune personne pour l'instant</p>
          <p className="text-sm text-teal-700/70 mt-1">« Ajouter une personne » crée un code, à remettre à l'intéressé pour qu'il crée son accès.</p>
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white border border-cream-200 rounded-2xl shadow-card overflow-x-auto">
            <table className="w-full text-sm min-w-[920px]">
              <thead>
                <tr className="bg-cream-50 text-teal-700/70 text-left text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 font-semibold">Code</th>
                  <th className="px-4 py-3 font-semibold">Promo</th>
                  <th className="px-4 py-3 font-semibold">Inscription</th>
                  <th className="px-4 py-3 font-semibold">Dernière visite</th>
                  <th className="px-4 py-3 font-semibold">Consentement</th>
                  <th className="px-4 py-3 font-semibold">Candidatures</th>
                  <th className="px-4 py-3 font-semibold">Activité (mois)</th>
                  <th className="px-4 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => (
                  <tr key={b.id} className="border-t border-cream-100 hover:bg-cream-50/50">
                    <td className="px-4 py-3 font-mono font-semibold text-teal-800">
                      <button onClick={() => onOpen(b)} className="hover:underline focus:outline-none focus:ring-2 focus:ring-teal-400 rounded" title="Ouvrir sa fiche">{b.code}<Prenom code={b.code} /></button>
                    </td>
                    <td className="px-4 py-3 text-xs text-teal-700">
                      {b.promo ? <span className={b.promoArchivee ? 'text-teal-700/50' : ''}>{b.promo}{b.promoArchivee ? ' · archivée' : ''}</span> : <span className="text-teal-700/40">–</span>}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {b.status === 'reset'
                        ? <span className="text-amber-700">Accès réinitialisé <span className="text-teal-700/50">(à réactiver)</span></span>
                        : b.status === 'active'
                        ? <span className="text-teal-800">{formatDate(b.activatedAt) || 'Activé'}</span>
                        : <span className="text-amber-700">Code non activé <span className="text-teal-700/50">(créé le {formatDate(b.createdAt)})</span></span>}
                    </td>
                    <td className={`px-4 py-3 text-xs whitespace-nowrap ${derniereVisite(b).cls}`}>{derniereVisite(b).label}</td>
                    <td className="px-4 py-3"><Consent value={b.consentStatus} /></td>
                    <td className="px-4 py-3 text-teal-700">{b.candidaturesCount}</td>
                    <td className={`px-4 py-3 ${activite(b.usage?.tokensThisMonth).cls}`} title={`${(Number(b.usage?.tokensThisMonth) || 0).toLocaleString('fr-FR')} jetons IA ce mois-ci`}>{activite(b.usage?.tokensThisMonth).label}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => onOpen(b)} className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-teal-700 hover:bg-teal-50 mr-1" aria-label={`Ouvrir la fiche ${b.code}`} title="Métiers, envois, transfert">
                        <FolderOpen className="w-4 h-4" />
                      </button>
                      <button onClick={() => onDelete(b)} className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-rose-600 hover:bg-rose-50" aria-label={`Supprimer le dossier ${b.code}`} title="Supprimer ce dossier">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {rows.map((b) => (
              <div key={b.id} className="bg-white border border-cream-200 rounded-2xl shadow-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <button onClick={() => onOpen(b)} className="font-mono font-bold text-teal-800 text-base hover:underline inline-flex items-center gap-1.5">
                    {b.code}<Prenom code={b.code} /> <FolderOpen className="w-4 h-4 text-teal-600" />
                  </button>
                  <button onClick={() => onDelete(b)} className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-rose-600 hover:bg-rose-50 shrink-0" aria-label={`Supprimer le dossier ${b.code}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <Consent value={b.consentStatus} />
                  {b.promo && <span className="text-teal-700">{b.promo}{b.promoArchivee ? ' · archivée' : ''}</span>}
                  <span className={b.status === 'active' ? 'text-teal-700/70' : 'text-amber-700'}>
                    {b.status === 'active' ? `Inscrit le ${formatDate(b.activatedAt)}` : b.status === 'reset' ? 'Accès à réactiver' : 'Code non activé'}
                  </span>
                  {b.status === 'active' && <span className={derniereVisite(b).cls}>Vu {derniereVisite(b).label}</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
