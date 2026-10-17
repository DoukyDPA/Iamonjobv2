'use client';

// ════════════════════════════════════════════════════════════════════════════
// Onglet « Promos » — les promos du conseiller, en cours et archivées.
//
// Une carte par promo : participants, codes activés, fiches reçues. Actions :
// constituer ou modifier, envoyer à toute la promo, codes, archiver ou
// réactiver, voir les participants (onglet Accompagnements) et le suivi des
// questionnaires (onglet Questionnaires).
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react';
import {
  UsersRound, Archive, ArchiveRestore, Send, FileSpreadsheet, ClipboardList, Users, Pencil, Loader2,
} from 'lucide-react';
import EnvoiModal from './EnvoiModal';
import { AssignModal } from './SuiviQuestionnaires';
import { downloadCodesCsv } from './codesCsv';

function formatDate(ms) {
  if (!ms) return '';
  try { return new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; }
}

export default function PromosPanel({ beneficiaires = [], onChanged, onVoirSuivi, onVoirPersonnes }) {
  const [data, setData] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [assign, setAssign] = useState(null); // { current } | null
  const [envoi, setEnvoi] = useState(null); // promo | null
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/conseiller/questionnaires').then((r) => r.json()).then(setData).catch(() => setData({ parcours: [], reponses: [] }));
  }, []);

  const promos = useMemo(() => {
    const m = new Map();
    const parcoursById = Object.fromEntries((data?.parcours || []).map((p) => [p.id, p]));
    for (const b of beneficiaires) {
      if (!b.parcoursId) continue;
      const key = `${b.parcoursId}::${b.promo || ''}`;
      if (!m.has(key)) {
        m.set(key, {
          key, parcoursId: b.parcoursId, promo: b.promo || '', label: b.promo || parcoursById[b.parcoursId]?.label || b.parcoursId,
          parcoursLabel: parcoursById[b.parcoursId]?.label || b.parcoursId, membres: [], fiches: 0, debut: null,
        });
      }
      const p = m.get(key);
      p.membres.push(b);
      if (b.createdAt && (!p.debut || b.createdAt < p.debut)) p.debut = b.createdAt;
    }
    const promoOf = new Map(beneficiaires.map((b) => [b.id, `${b.parcoursId}::${b.promo || ''}`]));
    for (const r of data?.reponses || []) {
      const k = r.beneficiaireId ? promoOf.get(r.beneficiaireId) : null;
      if (k && m.has(k)) m.get(k).fiches += 1;
    }
    return [...m.values()].map((p) => ({
      ...p,
      archivee: p.membres.every((b) => b.promoArchivee),
      actives: p.membres.filter((b) => b.status === 'active').length,
    })).sort((a, b) => (b.debut ?? 0) - (a.debut ?? 0));
  }, [beneficiaires, data]);

  const enCours = promos.filter((p) => !p.archivee);
  const archivees = promos.filter((p) => p.archivee);
  const visibles = showArchived ? archivees : enCours;

  async function toggleArchive(p) {
    const archivee = !p.archivee;
    if (archivee && window.confirm && !window.confirm(`Archiver « ${p.label} » ? Rien n'est supprimé : les personnes restent suivies, leurs fiches restent lisibles et vous pouvez toujours leur écrire.`)) return;
    setBusy(p.key);
    setError(null);
    try {
      const r = await fetch('/api/conseiller/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parcoursId: p.parcoursId, promo: p.promo, archivee }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Échec.');
      await onChanged?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  const btn = 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-cream-200 bg-white text-teal-800 text-xs font-semibold hover:bg-teal-50 disabled:opacity-50';

  return (
    <section aria-labelledby="promos-title">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 id="promos-title" className="text-xl font-extrabold text-teal-800">Promos</h2>
          <p className="text-sm text-teal-700/70">Les accompagnements collectifs. Une promo terminée s'archive : rien n'est supprimé.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {archivees.length > 0 && (
            <button onClick={() => setShowArchived((v) => !v)} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-cream-200 bg-white text-teal-700 font-semibold text-sm hover:bg-cream-50">
              <Archive className="w-4 h-4" /> {showArchived ? `En cours (${enCours.length})` : `Archivées (${archivees.length})`}
            </button>
          )}
          <button onClick={() => setAssign({ current: null })} disabled={!data || !beneficiaires.length} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold text-sm hover:bg-teal-700 disabled:bg-teal-200">
            <UsersRound className="w-4 h-4" /> Constituer une promo
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-rose-600 mb-3">{error}</p>}

      {!data ? (
        <div className="bg-white border border-cream-200 rounded-2xl shadow-card p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>
      ) : visibles.length === 0 ? (
        <div className="bg-white border border-cream-200 rounded-2xl shadow-card p-8 text-center">
          <p className="text-teal-800 font-semibold">{showArchived ? 'Aucune promo archivée' : 'Aucune promo en cours'}</p>
          <p className="text-sm text-teal-700/70 mt-1">« Constituer une promo » affecte un parcours (ex. PROMO 45+) à des personnes : elles verront leurs questionnaires dans leur espace.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {visibles.map((p) => (
            <article key={p.key} className={`bg-white border rounded-2xl shadow-card p-5 ${p.archivee ? 'border-cream-200 opacity-90' : 'border-teal-100'}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-extrabold text-teal-800">{p.label}</h3>
                  <p className="text-xs text-teal-700/60">{p.parcoursLabel}{p.debut ? ` · depuis le ${formatDate(p.debut)}` : ''}</p>
                </div>
                {p.archivee && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cream-100 text-teal-700/70 text-[11px] font-semibold"><Archive className="w-3 h-3" /> Archivée</span>}
              </div>
              <dl className="grid grid-cols-3 gap-2 mt-4 text-center">
                <div className="rounded-xl bg-cream-50 border border-cream-100 py-2"><dt className="text-[11px] text-teal-700/60">Participants</dt><dd className="text-xl font-bold text-teal-800">{p.membres.length}</dd></div>
                <div className="rounded-xl bg-cream-50 border border-cream-100 py-2"><dt className="text-[11px] text-teal-700/60">Codes activés</dt><dd className="text-xl font-bold text-teal-800">{p.actives}</dd></div>
                <div className="rounded-xl bg-cream-50 border border-cream-100 py-2"><dt className="text-[11px] text-teal-700/60">Fiches reçues</dt><dd className="text-xl font-bold text-teal-800">{p.fiches}</dd></div>
              </dl>
              <div className="flex flex-wrap gap-1.5 mt-4">
                <button onClick={() => onVoirPersonnes?.(p)} className={btn}><Users className="w-3.5 h-3.5" /> Participants</button>
                <button onClick={() => onVoirSuivi?.(p)} className={btn}><ClipboardList className="w-3.5 h-3.5" /> Suivi</button>
                <button onClick={() => setEnvoi(p)} className={btn}><Send className="w-3.5 h-3.5" /> Envoyer</button>
                <button onClick={() => downloadCodesCsv(p.membres, { suffix: p.label })} className={btn}><FileSpreadsheet className="w-3.5 h-3.5" /> Codes</button>
                {!p.archivee && <button onClick={() => setAssign({ current: p })} className={btn}><Pencil className="w-3.5 h-3.5" /> Modifier</button>}
                <button onClick={() => toggleArchive(p)} disabled={busy === p.key} className={btn}>
                  {p.archivee ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />} {p.archivee ? 'Réactiver' : 'Archiver'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {assign && data && (
        <AssignModal
          parcours={data.parcours}
          beneficiaires={beneficiaires.filter((b) => !b.promoArchivee || (assign.current && b.promo === assign.current.promo))}
          current={assign.current}
          onClose={() => setAssign(null)}
          onDone={async () => { setAssign(null); await onChanged?.(); }}
        />
      )}
      {envoi && (
        <EnvoiModal
          preset={{ beneficiaireIds: envoi.membres.map((b) => b.id), promo: envoi.label, label: `la promo « ${envoi.label} »` }}
          onClose={() => setEnvoi(null)}
        />
      )}
    </section>
  );
}
