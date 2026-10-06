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
  UsersRound, CheckCircle2, Archive,
} from 'lucide-react';

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
function computeAlerts(fiches, etapeCourante) {
  const alerts = [];
  for (let i = 1; i < fiches.length; i++) {
    const a = fiches[i - 1], b = fiches[i];
    for (const s of SCORES) {
      const x = a.socle?.[s.key], y = b.socle?.[s.key];
      if (typeof x === 'number' && typeof y === 'number' && x - y >= 2) {
        alerts.push({ tone: 'rose', text: `${s.label} −${x - y} (S${a.etape}→S${b.etape})` });
      }
    }
  }
  const last = fiches[fiches.length - 1];
  if (last) {
    const low = SCORES.filter((s) => typeof last.socle?.[s.key] === 'number' && last.socle[s.key] <= 4);
    if (low.length) alerts.push({ tone: 'rose', text: `${low.map((s) => s.label).join(', ')} ≤ 4 en S${last.etape}` });
    if (last.socle?.engagementTenu === 'Non') alerts.push({ tone: 'amber', text: `Engagement non tenu (S${last.etape})` });
  }
  if (etapeCourante && !fiches.some((f) => f.etape === etapeCourante)) {
    alerts.push({ tone: 'amber', text: `Pas de fiche S${etapeCourante}` });
  }
  return alerts;
}

export default function SuiviQuestionnaires({ beneficiaires = [], onAssigned }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [promoKey, setPromoKey] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [assignOpen, setAssignOpen] = useState(false);

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
          label: promo || parcoursById[parcoursId]?.label || parcoursId,
          parcours: parcoursById[parcoursId] || null,
          participants: new Map(),
        });
      }
      return map.get(k);
    };
    for (const b of beneficiaires) {
      if (!b.parcoursId) continue;
      ensure(b.parcoursId, b.promo, false).participants.set(b.id, { id: b.id, code: b.code, fiches: [] });
    }
    const benById = new Map(beneficiaires.map((b) => [b.id, b]));
    for (const r of data.reponses || []) {
      // Une fiche live suit la promo actuelle du dossier (si elle a changé depuis).
      const ben = r.beneficiaireId ? benById.get(r.beneficiaireId) : null;
      const p = ben?.parcoursId
        ? ensure(ben.parcoursId, ben.promo, false)
        : ensure(r.parcoursId, r.promo, r.source === 'archive');
      const pid = r.beneficiaireId || `archive:${r.participant}`;
      if (!p.participants.has(pid)) p.participants.set(pid, { id: pid, code: r.participant, fiches: [] });
      p.participants.get(pid).fiches.push(r);
    }
    return [...map.values()].map((p) => {
      const participants = [...p.participants.values()];
      participants.forEach((x) => x.fiches.sort((a, b) => a.etape - b.etape));
      const etapeCourante = Math.max(0, ...participants.flatMap((x) => x.fiches.map((f) => f.etape)));
      return { ...p, participants: participants.sort((a, b) => a.code.localeCompare(b.code)), etapeCourante };
    }).sort((a, b) => Number(a.archive) - Number(b.archive) || a.label.localeCompare(b.label));
  }, [data, beneficiaires]);

  const promo = promos.find((p) => p.key === promoKey) || promos[0] || null;

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
        <button
          onClick={() => setAssignOpen(true)}
          disabled={!data || beneficiaires.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-teal-200 bg-white text-teal-800 font-semibold text-sm hover:bg-teal-50 disabled:opacity-50"
        >
          <UsersRound className="w-4 h-4" /> Constituer une promo
        </button>
      </div>

      {error && <p className="text-sm text-rose-600 mb-3">{error}</p>}

      {!data ? (
        <div className="bg-white border border-cream-200 rounded-2xl shadow-card p-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
        </div>
      ) : promos.length === 0 ? (
        <div className="bg-white border border-cream-200 rounded-2xl shadow-card p-8 text-center">
          <p className="text-teal-800 font-semibold">Aucune promo pour l'instant</p>
          <p className="text-sm text-teal-700/70 mt-1">
            « Constituer une promo » affecte un parcours (ex. PROMO 45+) à des personnes. Elles verront
            alors leurs questionnaires dans leur espace.
          </p>
        </div>
      ) : (
        <>
          {promos.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-4" role="tablist" aria-label="Promos">
              {promos.map((p) => (
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
          {promo && <PromoTable promo={promo} onOpen={setOpenId} />}
        </>
      )}

      {openId && <FicheModal id={openId} onClose={() => setOpenId(null)} />}
      {assignOpen && data && (
        <AssignModal
          parcours={data.parcours}
          beneficiaires={beneficiaires}
          current={promo && !promo.archive ? promo : null}
          onClose={() => setAssignOpen(false)}
          onDone={async () => { setAssignOpen(false); await onAssigned?.(); await load(); }}
        />
      )}
    </section>
  );
}

function PromoTable({ promo, onOpen }) {
  const etapes = promo.parcours?.etapes || [];
  const rows = promo.participants.map((p) => {
    const first = p.fiches[0], last = p.fiches[p.fiches.length - 1];
    const delta = first && last && first !== last ? (avg(last.socle) ?? 0) - (avg(first.socle) ?? 0) : null;
    return { ...p, delta, alerts: computeAlerts(p.fiches, promo.etapeCourante) };
  });
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
              <th className="px-3 py-3 font-semibold text-center">Tendance</th>
              <th className="px-4 py-3 font-semibold">Alertes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-cream-100 align-top">
                <td className="px-4 py-3 font-mono font-semibold text-teal-800 whitespace-nowrap">{r.code}</td>
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

function FicheModal({ id, onClose }) {
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
              {fiche ? <><span className="font-mono">{fiche.participant}</span> · S{fiche.etape} · {fiche.titre}</> : 'Fiche'}
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

// ─── Constituer une promo ────────────────────────────────────────────────────

function AssignModal({ parcours, beneficiaires, current, onClose, onDone }) {
  const [parcoursId, setParcoursId] = useState(current?.parcoursId || parcours[0]?.id || '');
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
                      <span className="font-mono text-sm font-semibold text-teal-800">{b.code}</span>
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
