'use client';

// ════════════════════════════════════════════════════════════════════════════
// Suivi des questionnaires — vue conseiller, une promo à la fois.
//
// Pour chaque personne : ses notes semaine après semaine (confiance, moral,
// motivation), les alertes (baisse de 2 points ou plus, note basse, engagement
// non tenu, fiche manquante) et l'accès à chaque fiche complète.
//
// Les fiches archivées (promos suivies avant l'intégration dans Iamonjob)
// s'affichent de la même façon, sous leur code d'origine.
//
// Props :
//   beneficiaires  liste des dossiers du conseiller (avec parcoursId, promo)
//   onAssigned     rappel après une affectation, pour recharger la liste
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react';
import {
  ClipboardList, Loader2, AlertTriangle, TrendingUp, TrendingDown, Minus, X,
  UsersRound, CheckCircle2, Archive, Sparkles, Download, Copy, Printer, Trash2,
  Send, ArchiveRestore, FileSpreadsheet,
} from 'lucide-react';
import EnvoiModal from './EnvoiModal';
import { downloadCodesCsv } from './codesCsv';
import { Prenom } from './Prenoms';

const SCORES = [
  { key: 'confiance', short: 'C', label: 'Confiance' },
  { key: 'moral', short: 'M', label: 'Moral' },
  { key: 'motivation', short: 'Mo', label: 'Motivation' },
];

const scoreCls = (n) =>
  n == null ? 'text-teal-700/30'
  : n >= 7 ? 'text-teal-700'
  : n >= 5 ? 'text-amber-600'
  : 'text-rose-600';

function formatDate(ms) {
  if (!ms) return '';
  try { return new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }); } catch { return ''; }
}

const avg = (s) => {
  const v = SCORES.map((x) => s?.[x.key]).filter((n) => typeof n === 'number');
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

// Alertes d'une personne à partir de ses fiches triées par étape.
function computeAlerts(fiches, etapeCourante, seuils = { baisse: 2, noteBasse: 4 }) {
  const alerts = [];
  for (let i = 1; i < fiches.length; i++) {
    const a = fiches[i - 1], b = fiches[i];
    for (const s of SCORES) {
      const x = a.socle?.[s.key], y = b.socle?.[s.key];
      if (typeof x === 'number' && typeof y === 'number' && x - y >= seuils.baisse) {
        alerts.push({ tone: 'rose', text: `${s.label} −${x - y} (S${a.etape}→S${b.etape})` });
      }
    }
  }
  const last = fiches[fiches.length - 1];
  if (last) {
    const low = SCORES.filter((s) => typeof last.socle?.[s.key] === 'number' && last.socle[s.key] <= seuils.noteBasse);
    if (low.length) alerts.push({ tone: 'rose', text: `${low.map((s) => s.label).join(', ')} ≤ ${seuils.noteBasse} en S${last.etape}` });
    if (last.socle?.engagementTenu === 'Non') alerts.push({ tone: 'amber', text: `Engagement non tenu (S${last.etape})` });
  }
  if (etapeCourante && !fiches.some((f) => f.etape === etapeCourante)) {
    alerts.push({ tone: 'amber', text: `Pas de fiche S${etapeCourante}` });
  }
  return alerts;
}

export default function SuiviQuestionnaires({ beneficiaires = [], onAssigned, focusKey = null }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [promoKey, setPromoKey] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [rapportOpen, setRapportOpen] = useState(false);
  const [envoiOpen, setEnvoiOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const res = await fetch('/api/conseiller/questionnaires');
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Chargement impossible.');
      setData(d);
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => { load(); }, []);

  // Promos = dossiers avec parcours (groupés par libellé) + archives importées.
  const promos = useMemo(() => {
    if (!data) return [];
    const map = new Map();
    const parcoursById = Object.fromEntries((data.parcours || []).map((p) => [p.id, p]));
    const keyOf = (parcoursId, promo) => `${parcoursId}::${promo || ''}`;
    const ensure = (parcoursId, promo, archive) => {
      const k = keyOf(parcoursId, promo);
      if (!map.has(k)) {
        map.set(k, {
          key: k, parcoursId, promo, archive,
          // Sans promo : parcours individuel, toutes les personnes qui le suivent.
          label: promo || `${parcoursById[parcoursId]?.label || parcoursId}${parcoursById[parcoursId]?.usage === 'individuel' ? ' (individuel)' : ''}`,
          parcours: parcoursById[parcoursId] || null,
          participants: new Map(),
        });
      }
      return map.get(k);
    };
    for (const b of beneficiaires) {
      if (!b.parcoursId) continue;
      ensure(b.parcoursId, b.promo, false).participants.set(b.id, { id: b.id, code: b.code, fiches: [], ponctuels: [], archivee: Boolean(b.promoArchivee) });
    }
    const benById = new Map(beneficiaires.map((b) => [b.id, b]));
    for (const r of data.reponses || []) {
      // Une fiche live suit la promo actuelle du dossier (si elle a changé depuis).
      const ben = r.beneficiaireId ? benById.get(r.beneficiaireId) : null;
      // Questionnaire ponctuel d'une personne sans promo : visible dans sa fiche.
      if (r.etape == null && !ben?.parcoursId) continue;
      const p = ben?.parcoursId
        ? ensure(ben.parcoursId, ben.promo, false)
        : ensure(r.parcoursId, r.promo, r.source === 'archive');
      const pid = r.beneficiaireId || `archive:${r.participant}`;
      if (!p.participants.has(pid)) p.participants.set(pid, { id: pid, code: r.participant, fiches: [], ponctuels: [] });
      // Questionnaire envoyé hors parcours : pas d'étape, rangé à part.
      if (r.etape == null) p.participants.get(pid).ponctuels.push(r);
      else p.participants.get(pid).fiches.push(r);
    }
    return [...map.values()].map((p) => {
      const participants = [...p.participants.values()];
      participants.forEach((x) => x.fiches.sort((a, b) => a.etape - b.etape));
      const etapeCourante = Math.max(0, ...participants.flatMap((x) => x.fiches.map((f) => f.etape)));
      // Promo archivée par le conseiller : tous ses dossiers sont marqués.
      const dossiers = participants.filter((x) => x.archivee !== undefined);
      const archivee = dossiers.length > 0 && dossiers.every((x) => x.archivee);
      const ids = dossiers.map((x) => x.id);
      return { ...p, participants: participants.sort((a, b) => a.code.localeCompare(b.code)), etapeCourante, archivee, ids };
    }).sort((a, b) => Number(a.archive) - Number(b.archive) || a.label.localeCompare(b.label));
  }, [data, beneficiaires]);

  // Promos en cours d'un côté ; promos archivées et fiches importées de l'autre.
  const enCours = promos.filter((p) => !p.archive && !p.archivee);
  const archivees = promos.filter((p) => p.archive || p.archivee);
  const visibles = showArchived ? archivees : enCours;
  const promo = visibles.find((p) => p.key === promoKey) || visibles[0] || null;

  // Arrivée depuis l'onglet Promos : on ouvre directement la promo demandée.
  useEffect(() => {
    if (!focusKey || !promos.length) return;
    const p = promos.find((x) => x.key === focusKey);
    if (p) { setShowArchived(Boolean(p.archive || p.archivee)); setPromoKey(p.key); }
  }, [focusKey, promos.length]);

  async function toggleArchive(p) {
    const archivee = !p.archivee;
    if (archivee && window.confirm && !window.confirm(`Archiver « ${p.label} » ? Rien n'est supprimé : les personnes restent suivies, leurs fiches restent lisibles et vous pouvez toujours leur écrire.`)) return;
    setBusy(true);
    try {
      const r = await fetch('/api/conseiller/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parcoursId: p.parcoursId, promo: p.promo || '', archivee }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Échec.');
      setShowArchived(archivee);
      setPromoKey(p.key);
      await onAssigned?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8" aria-labelledby="suivi-q-title">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-pink-100 flex items-center justify-center">
            <ClipboardList className="w-6 h-6 text-pink-600" aria-hidden="true" />
          </div>
          <div>
            <h2 id="suivi-q-title" className="text-xl font-extrabold text-teal-800">Questionnaires de suivi</h2>
            <p className="text-sm text-teal-700/70">Les fiches hebdomadaires remplies par les personnes, promo par promo.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
        {archivees.length > 0 && (
          <button
            onClick={() => { setShowArchived((v) => !v); setPromoKey(null); }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-cream-200 bg-white text-teal-700 font-semibold text-sm hover:bg-cream-50"
          >
            <Archive className="w-4 h-4" /> {showArchived ? 'Promos en cours' : `Promos archivées (${archivees.length})`}
          </button>
        )}
        </div>
      </div>

      {error && <p className="text-sm text-rose-600 mb-3">{error}</p>}

      {!data ? (
        <div className="bg-white border border-cream-200 rounded-2xl shadow-card p-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
        </div>
      ) : promos.length > 0 && visibles.length === 0 ? (
        <div className="bg-white border border-cream-200 rounded-2xl shadow-card p-8 text-center">
          <p className="text-teal-800 font-semibold">{showArchived ? 'Aucune promo archivée' : 'Aucune promo en cours'}</p>
          <p className="text-sm text-teal-700/70 mt-1">
            {showArchived ? '' : 'Les promos terminées sont dans « Promos archivées ». Les nouvelles se constituent dans l\'onglet « Promos ».'}
          </p>
        </div>
      ) : promos.length === 0 ? (
        <div className="bg-white border border-cream-200 rounded-2xl shadow-card p-8 text-center">
          <p className="text-teal-800 font-semibold">Aucune promo pour l'instant</p>
          <p className="text-sm text-teal-700/70 mt-1">
            Constituez une promo dans l'onglet « Promos » : ses participants verront alors leurs
            questionnaires dans leur espace.
          </p>
        </div>
      ) : (
        <>
          {visibles.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-4" role="tablist" aria-label="Promos">
              {visibles.map((p) => (
                <button
                  key={p.key}
                  role="tab"
                  aria-selected={p.key === promo?.key}
                  onClick={() => setPromoKey(p.key)}
                  className={[
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-semibold',
                    p.key === promo?.key ? 'bg-teal-600 text-white border-teal-700' : 'bg-white text-teal-700 border-cream-200 hover:border-teal-300',
                  ].join(' ')}
                >
                  {p.archive && <Archive className="w-3.5 h-3.5" aria-hidden="true" />}
                  {p.label}
                </button>
              ))}
            </div>
          )}
          {promo && (
            <PromoActions
              promo={promo}
              busy={busy}
              onRapport={() => setRapportOpen(true)}
              onEnvoi={() => setEnvoiOpen(true)}
              onCodes={() => downloadCodesCsv(beneficiaires.filter((b) => promo.ids.includes(b.id)), { suffix: promo.label })}
              onArchive={() => toggleArchive(promo)}
            />
          )}
          {promo && (
            <PromoTable
              promo={promo}
              onOpen={setOpenId}
              seuils={{ baisse: 2, noteBasse: 4, ...(data?.seuils?.[promo.parcoursId] || {}) }}
              onSeuils={promo.archive ? null : async (v) => {
                const r = await fetch('/api/conseiller/questionnaires', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parcoursId: promo.parcoursId, ...v }) });
                const d = await r.json().catch(() => ({}));
                if (!r.ok) throw new Error(d.error || 'Échec.');
                await load();
              }}
            />
          )}
        </>
      )}

      {openId && <FicheModal id={openId} onClose={() => setOpenId(null)} />}
      {rapportOpen && promo && <RapportModal promo={promo} onClose={() => setRapportOpen(false)} />}
      {envoiOpen && promo && (
        <EnvoiModal
          preset={{ beneficiaireIds: promo.ids, promo: promo.label, label: `la promo « ${promo.label} »` }}
          onClose={() => setEnvoiOpen(false)}
          onSent={load}
        />
      )}
      {assignOpen && data && (
        <AssignModal
          parcours={data.parcours}
          beneficiaires={beneficiaires}
          current={promo && !promo.archive && !promo.archivee ? promo : null}
          onClose={() => setAssignOpen(false)}
          onDone={async () => { setAssignOpen(false); await onAssigned?.(); await load(); }}
        />
      )}
    </section>
  );
}

function PromoTable({ promo, onOpen, seuils = { baisse: 2, noteBasse: 4 }, onSeuils }) {
  const etapes = promo.parcours?.etapes || [];
  const rows = promo.participants.map((p) => {
    const first = p.fiches[0], last = p.fiches[p.fiches.length - 1];
    const delta = first && last && first !== last ? (avg(last.socle) ?? 0) - (avg(first.socle) ?? 0) : null;
    return { ...p, delta, alerts: computeAlerts(p.fiches, promo.etapeCourante, seuils) };
  });
  const hasPonctuels = promo.participants.some((p) => p.ponctuels?.length);
  const recues = rows.filter((r) => r.fiches.some((f) => f.etape === promo.etapeCourante)).length;
  const enAlerte = rows.filter((r) => r.alerts.some((a) => a.tone === 'rose')).length;
  const tenus = promo.participants.flatMap((p) => p.fiches).filter((f) => f.socle?.engagementTenu);
  const tauxTenus = tenus.length ? Math.round((tenus.filter((f) => f.socle.engagementTenu === 'Oui').length / tenus.length) * 100) : null;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Kpi label="Participants" value={rows.length} />
        <Kpi label={promo.etapeCourante ? `Fiches S${promo.etapeCourante} reçues` : 'Fiches reçues'} value={promo.etapeCourante ? `${recues}/${rows.length}` : '0'} />
        <Kpi label="En alerte" value={enAlerte} tone={enAlerte ? 'rose' : 'teal'} />
        <Kpi label="Engagements tenus" value={tauxTenus == null ? '–' : `${tauxTenus} %`} />
      </div>

      {onSeuils && <SeuilsAlerte key={promo.parcoursId} seuils={seuils} onSave={onSeuils} />}

      {promo.archivee && (
        <p className="text-xs text-teal-700/70 mb-2 flex items-center gap-1.5">
          <Archive className="w-3.5 h-3.5" /> Promo archivée : les fiches restent lisibles, les personnes restent suivies et peuvent encore recevoir vos envois.
        </p>
      )}
      {promo.archive && (
        <p className="text-xs text-teal-700/70 mb-2 flex items-center gap-1.5">
          <Archive className="w-3.5 h-3.5" /> Promo archivée : fiches importées, en lecture seule, sous les codes d'origine.
        </p>
      )}

      <div className="bg-white border border-cream-200 rounded-2xl shadow-card overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="bg-cream-50 text-teal-700/70 text-left text-xs uppercase tracking-wide">
              <th className="px-4 py-3 font-semibold">Code</th>
              {etapes.map((e) => (
                <th key={e.n} className="px-2 py-3 font-semibold text-center" title={e.titre || 'Questionnaire à venir'}>S{e.n}</th>
              ))}
              {hasPonctuels && <th className="px-2 py-3 font-semibold text-center" title="Questionnaires envoyés hors parcours">Ponctuels</th>}
              <th className="px-3 py-3 font-semibold text-center">Tendance</th>
              <th className="px-4 py-3 font-semibold">Alertes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-cream-100 align-top">
                <td className="px-4 py-3 font-mono font-semibold text-teal-800 whitespace-nowrap">{r.code}<Prenom code={r.code} /></td>
                {etapes.map((e) => {
                  const f = r.fiches.find((x) => x.etape === e.n);
                  return (
                    <td key={e.n} className="px-1.5 py-2 text-center">
                      {f ? (
                        <button
                          onClick={() => onOpen(f.id)}
                          className="inline-flex flex-col items-center px-2 py-1 rounded-lg border border-cream-200 hover:border-teal-400 hover:bg-teal-50/50 focus:outline-none focus:ring-2 focus:ring-teal-400"
                          aria-label={`Ouvrir la fiche S${e.n} de ${r.code}`}
                          title={SCORES.map((s) => `${s.label} ${f.socle?.[s.key] ?? '–'}`).join(' · ')}
                        >
                          <span className="font-mono text-xs tabular-nums whitespace-nowrap">
                            {SCORES.map((s, i) => (
                              <span key={s.key} className={`font-bold ${scoreCls(f.socle?.[s.key])}`}>
                                {i > 0 && <span className="text-teal-700/30 font-normal">/</span>}
                                {f.socle?.[s.key] ?? '–'}
                              </span>
                            ))}
                          </span>
                          {f.socle?.engagementTenu && (
                            <span className={`text-[10px] ${f.socle.engagementTenu === 'Oui' ? 'text-teal-600' : 'text-amber-600'}`}>
                              {f.socle.engagementTenu === 'Oui' ? 'tenu' : 'non tenu'}
                            </span>
                          )}
                        </button>
                      ) : (
                        <span className="text-teal-700/25">·</span>
                      )}
                    </td>
                  );
                })}
                {hasPonctuels && (
                  <td className="px-1.5 py-2 text-center">
                    <div className="flex flex-wrap justify-center gap-1">
                      {(r.ponctuels || []).map((f) => (
                        <button key={f.id} onClick={() => onOpen(f.id)} title={f.titre} className="px-1.5 py-0.5 rounded-md border border-amber-200 bg-amber-50 text-[10px] font-semibold text-amber-800 hover:border-amber-400 max-w-[90px] truncate">
                          {f.titre}
                        </button>
                      ))}
                    </div>
                  </td>
                )}
                <td className="px-3 py-3 text-center">
                  {r.delta == null ? <span className="text-teal-700/30">–</span>
                    : r.delta >= 0.5 ? <TrendingUp className="w-4 h-4 text-teal-600 inline" aria-label="En hausse" />
                    : r.delta <= -0.5 ? <TrendingDown className="w-4 h-4 text-rose-600 inline" aria-label="En baisse" />
                    : <Minus className="w-4 h-4 text-teal-700/50 inline" aria-label="Stable" />}
                </td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1">
                    {r.alerts.length === 0 ? (
                      <span className="text-xs text-teal-600 inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> RAS</span>
                    ) : r.alerts.map((a, i) => (
                      <span
                        key={i}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${
                          a.tone === 'rose' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        <AlertTriangle className="w-3 h-3" aria-hidden="true" /> {a.text}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-teal-700/60 mt-2">
        Chaque case : confiance / moral / motivation sur 10. Cliquez pour lire la fiche complète.
      </p>
    </>
  );
}

function Kpi({ label, value, tone = 'teal' }) {
  return (
    <div className="bg-white border border-cream-200 rounded-2xl shadow-card px-4 py-3">
      <div className="text-xs text-teal-700/60">{label}</div>
      <div className={`text-2xl font-extrabold ${tone === 'rose' ? 'text-rose-600' : 'text-teal-800'}`}>{value}</div>
    </div>
  );
}

// ─── Fiche complète ──────────────────────────────────────────────────────────

export function FicheModal({ id, onClose }) {
  const [fiche, setFiche] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/conseiller/questionnaires/${encodeURIComponent(id)}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || 'Fiche introuvable.');
        setFiche(d.reponse);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  const sections = useMemo(() => {
    const m = new Map();
    for (const l of fiche?.detail || []) {
      if (!m.has(l.section)) m.set(l.section, []);
      m.get(l.section).push(l);
    }
    return [...m.entries()];
  }, [fiche]);

  const s = fiche?.socle || {};
  const scores = [...SCORES, { key: 'energie', label: 'Énergie' }].filter((x) => typeof s[x.key] === 'number');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-900/50" role="dialog" aria-modal="true" aria-labelledby="fiche-q-title" onClick={onClose}>
      <div className="relative w-full max-w-2xl max-h-[92vh] bg-white border border-cream-200 rounded-2xl shadow-card overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-cream-200 bg-teal-50/60 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h2 id="fiche-q-title" className="text-lg font-bold text-teal-800">
              {fiche ? <><span className="font-mono">{fiche.participant}</span> · {fiche.etape != null ? `S${fiche.etape}` : 'Questionnaire ponctuel'} · {fiche.titre}</> : 'Fiche'}
            </h2>
            {fiche && (
              <p className="text-sm text-teal-700/70 mt-0.5">
                {fiche.source === 'archive' ? 'Fiche archivée' : `Envoyée le ${formatDate(fiche.submittedAt)}`}
                {fiche.updatedAt && fiche.submittedAt && fiche.updatedAt - fiche.submittedAt > 60000 ? `, corrigée le ${formatDate(fiche.updatedAt)}` : ''}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-teal-700 hover:bg-cream-200/70">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 iamj-scrollbar">
          {error && <p className="text-sm text-rose-600">{error}</p>}
          {!fiche && !error && <Loader2 className="w-6 h-6 animate-spin text-teal-600 mx-auto" />}
          {fiche && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {scores.map((x) => (
                  <div key={x.key} className="rounded-xl bg-cream-50 border border-cream-100 py-2 text-center">
                    <div className="text-[11px] text-teal-700/60">{x.label}</div>
                    <div className={`text-xl font-extrabold ${scoreCls(s[x.key])}`}>{s[x.key]}/10</div>
                  </div>
                ))}
              </div>
              {(s.engagementTenu || s.engagement) && (
                <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-3 text-sm space-y-1">
                  {s.engagementTenu && <p><span className="font-semibold text-teal-800">Engagement précédent tenu :</span> {s.engagementTenu}{s.obstacle ? ` · obstacle : ${s.obstacle}` : ''}</p>}
                  {s.engagement && <p><span className="font-semibold text-teal-800">S'engage à :</span> {s.engagement}</p>}
                </div>
              )}
              {sections.map(([titre, lignes]) => (
                <div key={titre}>
                  <h3 className="text-xs font-bold text-teal-800 uppercase tracking-wider mb-2">{titre}</h3>
                  <dl className="space-y-2">
                    {lignes.map((l, i) => (
                      <div key={i} className="text-sm">
                        <dt className="text-teal-700/70">{l.question}</dt>
                        <dd className="text-teal-900 whitespace-pre-wrap">{l.reponse || '–'}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
              <p className="text-[11px] text-teal-700/50">Réponses déclaratives. Données pseudonymisées : la correspondance code / identité reste hors de l'application.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Rapport de synthèse et export ───────────────────────────────────────────

const exportUrl = (promo, format) =>
  `/api/conseiller/questionnaires/export?${new URLSearchParams({ parcoursId: promo.parcoursId, promo: promo.promo || '', format })}`;

function PromoActions({ promo, onRapport, onEnvoi, onCodes, onArchive, busy }) {
  const btn = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-200 bg-white text-teal-800 text-sm font-semibold hover:bg-teal-50 disabled:opacity-50';
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {promo.ids?.length > 0 && (
        <>
          <button onClick={onEnvoi} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-500 text-white font-semibold text-sm hover:bg-pink-600" title="Offre, message ou questionnaire à toute la promo">
            <Send className="w-4 h-4" aria-hidden="true" /> Envoyer à la promo
          </button>
        </>
      )}
      <button
        onClick={onRapport}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold text-sm hover:bg-teal-700"
      >
        <Sparkles className="w-4 h-4" aria-hidden="true" /> Rapport
      </button>
      <span className="text-xs text-teal-700/60 ml-1">Exporter les fiches :</span>
      <a href={exportUrl(promo, 'md')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-200 bg-white text-teal-800 text-sm font-semibold hover:bg-teal-50" title="Consigne + toutes les réponses, à donner à l'IA de votre choix">
        <Download className="w-4 h-4" aria-hidden="true" /> Texte pour IA (.md)
      </a>
      <a href={exportUrl(promo, 'csv')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-200 bg-white text-teal-800 text-sm font-semibold hover:bg-teal-50" title="Une ligne par réponse, pour un tableur">
        <Download className="w-4 h-4" aria-hidden="true" /> Tableur (.csv)
      </a>
    </div>
  );
}

function rapportToText(promo, r) {
  const x = r.rapport || {};
  const L = [`Rapport de synthèse · ${promo.label}`, `Généré le ${formatDateLong(r.createdAt)} · ${r.nbFiches} fiches, ${r.nbParticipants} participants`, ''];
  const sec = (t) => { L.push('', t.toUpperCase()); };
  sec('Synthèse'); L.push(x.synthese || '');
  sec('Dynamique'); L.push(x.dynamique || '');
  (r.stats?.etapes || []).forEach((e) => L.push(`- ${e.label} : ${e.fiches} fiche(s), ${Object.entries(e.moyennes).map(([k, v]) => `${k} ${v}`).join(', ')}${e.engagementsTenus == null ? '' : `, engagements tenus ${e.engagementsTenus} %`}`));
  sec('Points forts'); (x.pointsForts || []).forEach((t) => L.push(`- ${t}`));
  sec('Freins récurrents'); (x.freins || []).forEach((f) => L.push(`- ${f.theme} : ${f.detail}`));
  sec('Personnes à surveiller'); (x.vigilance || []).forEach((v) => L.push(`- ${v.code} : ${v.motif} Action : ${v.suggestion}`));
  sec('Pistes collectives'); (x.pistesCollectives || []).forEach((t) => L.push(`- ${t}`));
  sec('Par personne'); (x.parPersonne || []).forEach((p) => L.push(`- ${p.code} : ${p.trajectoire} À suivre : ${p.aSuivre}`));
  L.push('', 'Synthèse générée par IA (Mistral) à partir de réponses déclaratives. À relire avant diffusion.');
  return L.join('\n');
}

function formatDateLong(ms) {
  if (!ms) return '';
  try { return new Date(ms).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
}

function RapportModal({ promo, onClose }) {
  const [rapports, setRapports] = useState(null);
  const [current, setCurrent] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const qs = new URLSearchParams({ parcoursId: promo.parcoursId, promo: promo.promo || '' });

  async function load() {
    try {
      const r = await fetch(`/api/conseiller/questionnaires/rapport?${qs}`);
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Chargement impossible.');
      setRapports(d.rapports || []);
      setCurrent((c) => c || d.rapports?.[0] || null);
    } catch (e) { setError(e.message); setRapports([]); }
  }
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function generate() {
    setBusy(true); setError(null);
    try {
      const r = await fetch('/api/conseiller/questionnaires/rapport', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parcoursId: promo.parcoursId, promo: promo.promo || '' }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'La génération a échoué.');
      setCurrent(d.rapport);
      setRapports((l) => [d.rapport, ...(l || [])]);
    } catch (e) { setError(e.message); }
    setBusy(false);
  }

  async function remove(id) {
    const r = await fetch(`/api/conseiller/questionnaires/rapport?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!r.ok) return;
    const rest = (rapports || []).filter((x) => x.id !== id);
    setRapports(rest);
    setCurrent(rest[0] || null);
  }

  async function copy() {
    try { await navigator.clipboard.writeText(rapportToText(promo, current)); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  }

  function print() {
    const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    const html = rapportToText(promo, current).split('\n').map((l) =>
      /^[A-ZÀ-Ý' ]{4,}$/.test(l) ? `<h2>${esc(l)}</h2>` : l.startsWith('- ') ? `<li>${esc(l.slice(2))}</li>` : l ? `<p>${esc(l)}</p>` : '').join('');
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!doctype html><meta charset="utf-8"><title>Rapport ${esc(promo.label)}</title><style>body{font:14px/1.5 system-ui,sans-serif;max-width:760px;margin:32px auto;color:#123}h2{font-size:13px;letter-spacing:.06em;color:#0f766e;margin-top:24px}li{margin:4px 0 4px 18px}</style>${html}`);
    w.document.close(); w.focus(); w.print();
  }

  const x = current?.rapport || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-900/50" role="dialog" aria-modal="true" aria-labelledby="rapport-title" onClick={() => !busy && onClose()}>
      <div className="relative w-full max-w-3xl max-h-[92vh] bg-white border border-cream-200 rounded-2xl shadow-card overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-cream-200 bg-teal-50/60 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h2 id="rapport-title" className="text-lg font-bold text-teal-800">Rapport de synthèse · {promo.label}</h2>
            <p className="text-sm text-teal-700/70 mt-0.5">
              {current ? `Généré le ${formatDateLong(current.createdAt)} · ${current.nbFiches} fiches, ${current.nbParticipants} participants` : 'Analyse de toutes les fiches de la promo par Mistral (hébergé en Europe).'}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Fermer" className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-teal-700 hover:bg-cream-200/70">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-cream-100 flex flex-wrap items-center gap-2">
          <button onClick={generate} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold text-sm hover:bg-teal-700 disabled:bg-teal-300">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {busy ? 'Analyse en cours (30 s à 1 min)…' : current ? 'Nouveau rapport' : 'Générer le rapport'}
          </button>
          {current && !busy && (
            <>
              <button onClick={copy} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-teal-200 text-teal-800 text-sm font-semibold hover:bg-teal-50">
                <Copy className="w-4 h-4" /> {copied ? 'Copié' : 'Copier'}
              </button>
              <button onClick={print} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-teal-200 text-teal-800 text-sm font-semibold hover:bg-teal-50">
                <Printer className="w-4 h-4" /> Imprimer / PDF
              </button>
            </>
          )}
          {rapports && rapports.length > 1 && (
            <select
              value={current?.id || ''}
              onChange={(e) => setCurrent(rapports.find((r) => r.id === e.target.value))}
              className="ml-auto p-2 text-sm rounded-lg border border-teal-200 bg-white"
              aria-label="Rapports précédents"
            >
              {rapports.map((r) => <option key={r.id} value={r.id}>{formatDateLong(r.createdAt)}</option>)}
            </select>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 iamj-scrollbar">
          {error && <p className="text-sm text-rose-600" role="alert">{error}</p>}
          {!rapports && <Loader2 className="w-6 h-6 animate-spin text-teal-600 mx-auto" />}
          {rapports && !current && !busy && (
            <p className="text-sm text-teal-700/80">
              Aucun rapport pour cette promo. Le rapport reprend les chiffres calculés par l'application et les réponses
              libres, sous les codes uniquement. Il est enregistré : tu pourras le relire sans relancer l'analyse.
            </p>
          )}
          {current && (
            <>
              <RSection titre="Synthèse"><p className="whitespace-pre-wrap">{x.synthese}</p></RSection>
              <RSection titre="Dynamique">
                <div className="overflow-x-auto mb-2">
                  <table className="text-xs w-full">
                    <thead><tr className="text-teal-700/60 text-left"><th className="py-1 pr-3">Semaine</th><th className="pr-3">Fiches</th>{SCORES.map((sc) => <th key={sc.key} className="pr-3">{sc.label}</th>)}<th>Engagements tenus</th></tr></thead>
                    <tbody>
                      {(current.stats?.etapes || []).map((e) => (
                        <tr key={e.n} className="border-t border-cream-100">
                          <td className="py-1 pr-3 font-semibold">{e.label}</td><td className="pr-3">{e.fiches}</td>
                          {SCORES.map((sc) => <td key={sc.key} className={`pr-3 font-bold ${scoreCls(e.moyennes?.[sc.key])}`}>{e.moyennes?.[sc.key] ?? '–'}</td>)}
                          <td>{e.engagementsTenus == null ? '–' : `${e.engagementsTenus} %`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p>{x.dynamique}</p>
              </RSection>
              <RList titre="Points forts" items={x.pointsForts} />
              <RSection titre="Freins récurrents">
                <ul className="space-y-1.5">{(x.freins || []).map((f, i) => <li key={i}><span className="font-semibold text-teal-800">{f.theme}.</span> {f.detail}</li>)}</ul>
              </RSection>
              <RSection titre="Personnes à surveiller">
                <ul className="space-y-2">{(x.vigilance || []).map((v, i) => (
                  <li key={i} className="rounded-xl border border-rose-200 bg-rose-50/40 p-3">
                    <span className="font-mono font-semibold text-teal-800">{v.code}<Prenom code={v.code} /></span> · {v.motif}
                    <div className="text-teal-700 mt-1"><span className="font-semibold">Action :</span> {v.suggestion}</div>
                  </li>
                ))}</ul>
              </RSection>
              <RList titre="Pistes collectives" items={x.pistesCollectives} />
              <RSection titre="Par personne">
                <ul className="space-y-2">{(x.parPersonne || []).map((p, i) => (
                  <li key={i}>
                    <span className="font-mono font-semibold text-teal-800">{p.code}<Prenom code={p.code} /></span> · {p.trajectoire}
                    {p.aSuivre && <div className="text-teal-700/80 text-xs mt-0.5">À suivre : {p.aSuivre}</div>}
                  </li>
                ))}</ul>
              </RSection>
              <div className="flex items-center justify-between pt-2">
                <p className="text-[11px] text-teal-700/50">Synthèse générée par IA à partir de réponses déclaratives. À relire avant diffusion.</p>
                <button onClick={() => remove(current.id)} className="inline-flex items-center gap-1 text-xs text-rose-600 hover:underline">
                  <Trash2 className="w-3.5 h-3.5" /> Supprimer ce rapport
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function RSection({ titre, children }) {
  return (
    <section className="text-sm text-teal-900">
      <h3 className="text-xs font-bold text-teal-800 uppercase tracking-wider mb-2">{titre}</h3>
      {children}
    </section>
  );
}

function RList({ titre, items }) {
  if (!items?.length) return null;
  return (
    <RSection titre={titre}>
      <ul className="list-disc pl-5 space-y-1">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>
    </RSection>
  );
}

// ─── Constituer une promo ────────────────────────────────────────────────────

export function AssignModal({ parcours: tous, beneficiaires, current, defaultParcoursId = null, onClose, onDone }) {
  // Une promo suit un parcours « promo » (les parcours individuels s'attribuent depuis la base).
  const parcours = tous.filter((p) => (p.usage || 'promo') === 'promo' && (!p.archived || p.id === current?.parcoursId));
  const [parcoursId, setParcoursId] = useState(current?.parcoursId || defaultParcoursId || parcours[0]?.id || '');
  const [promo, setPromo] = useState(current?.promo || '');
  const initial = useMemo(
    () => new Set(beneficiaires.filter((b) => current && b.parcoursId === current.parcoursId && (b.promo || '') === (current.promo || '')).map((b) => b.id)),
    [beneficiaires, current]
  );
  const [selected, setSelected] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const toggle = (id) => setSelected((s) => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  async function save() {
    if (!promo.trim()) { setError('Donnez un nom à la promo (ex. PROMO 45+ n°2).'); return; }
    setSaving(true);
    setError(null);
    try {
      const post = (body) => fetch('/api/conseiller/parcours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(async (r) => { if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "L'affectation a échoué."); });
      await post({ beneficiaireIds: [...selected], parcoursId, promo: promo.trim() });
      const retires = [...initial].filter((id) => !selected.has(id));
      if (retires.length) await post({ beneficiaireIds: retires, parcoursId: null });
      await onDone();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-900/50" role="dialog" aria-modal="true" aria-labelledby="assign-title" onClick={() => !saving && onClose()}>
      <div className="w-full max-w-lg max-h-[92vh] bg-white border border-cream-200 rounded-2xl shadow-card overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-cream-200 bg-teal-50/60 flex items-start gap-3">
          <div className="flex-1">
            <h2 id="assign-title" className="text-lg font-bold text-teal-800">{current ? `Modifier ${current.label}` : 'Constituer une promo'}</h2>
            <p className="text-sm text-teal-700/80 mt-0.5">Les personnes cochées verront les questionnaires du parcours dans leur espace.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-teal-700 hover:bg-cream-200/70">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 iamj-scrollbar">
          <label className="block">
            <span className="block text-sm font-semibold text-teal-800 mb-1">Parcours</span>
            <select value={parcoursId} onChange={(e) => setParcoursId(e.target.value)} className="w-full p-2.5 text-sm rounded-lg border border-teal-200 bg-white">
              {parcours.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block text-sm font-semibold text-teal-800 mb-1">Nom de la promo</span>
            <input value={promo} onChange={(e) => setPromo(e.target.value)} maxLength={80} placeholder="PROMO 45+ n°2" className="w-full p-2.5 text-sm rounded-lg border border-teal-200 bg-white" />
          </label>
          <fieldset>
            <legend className="text-sm font-semibold text-teal-800 mb-1">Personnes ({selected.size})</legend>
            <ul className="space-y-1.5">
              {beneficiaires.map((b) => {
                const ailleurs = b.parcoursId && !initial.has(b.id);
                return (
                  <li key={b.id}>
                    <label className="flex items-center gap-2 p-2 rounded-lg border border-cream-200 hover:bg-cream-50 cursor-pointer">
                      <input type="checkbox" checked={selected.has(b.id)} onChange={() => toggle(b.id)} className="accent-teal-600" />
                      <span className="font-mono text-sm font-semibold text-teal-800">{b.code}<Prenom code={b.code} /></span>
                      {ailleurs && <span className="text-[11px] text-amber-700">déjà dans « {b.promo || b.parcoursId} »</span>}
                      {b.status !== 'active' && <span className="text-[11px] text-teal-700/50">code non activé</span>}
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        </div>
        <div className="px-6 py-4 border-t border-cream-200 bg-cream-50/60">
          {error && <p className="text-sm text-rose-600 mb-2" role="alert">{error}</p>}
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 disabled:bg-teal-200">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

// Seuils d'alerte du parcours (pour toute la structure).
function SeuilsAlerte({ seuils, onSave }) {
  const [baisse, setBaisse] = useState(seuils.baisse);
  const [note, setNote] = useState(seuils.noteBasse);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const changed = Number(baisse) !== seuils.baisse || Number(note) !== seuils.noteBasse;
  const num = 'w-14 p-1 text-sm text-center rounded-lg border border-teal-200';
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-teal-800">
      <AlertTriangle className="w-3.5 h-3.5 text-rose-500" aria-hidden="true" />
      <span>Alerte si une note baisse de</span>
      <input type="number" min={1} max={10} value={baisse} onChange={(e) => setBaisse(e.target.value)} className={num} aria-label="Baisse en points" />
      <span>points ou plus, ou tombe à</span>
      <input type="number" min={0} max={10} value={note} onChange={(e) => setNote(e.target.value)} className={num} aria-label="Note basse" />
      <span>ou moins (sur 10). Réglage valable pour tout ce parcours.</span>
      {changed && (
        <button
          disabled={busy}
          onClick={async () => { setBusy(true); setMsg(null); try { await onSave({ baisse: Number(baisse), noteBasse: Number(note) }); setMsg('Seuils enregistrés.'); } catch (e) { setMsg(e.message); } finally { setBusy(false); } }}
          className="px-2.5 py-1 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:bg-teal-200"
        >
          Enregistrer
        </button>
      )}
      {msg && <span className="text-teal-700">{msg}</span>}
    </div>
  );
}
