'use client';

// ════════════════════════════════════════════════════════════════════════════
// Base de questionnaires — vue conseiller. Deux niveaux :
//
//   Parcours        un ENCHAÎNEMENT de questionnaires (Semaine 1, 2…) :
//                   « promo » (tout un groupe, suivi comparé semaine par semaine)
//                   ou « individuel » (une personne, à son rythme)
//   Questionnaires  les fiches elles-mêmes. Une même fiche peut servir d'étape
//                   dans un ou plusieurs parcours ET être envoyée seule, une fois.
//
// Tout se réutilise : un questionnaire ou un parcours du catalogue, ou d'un
// collègue, se modifie en copie ; les vôtres se modifient directement (les
// réponses déjà reçues gardent la version remplie).
//
// Props :
//   beneficiaires  dossiers du conseiller (destinataires possibles)
//   onChanged      rappel après attribution d'un parcours (recharge la liste)
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import {
  Library, Plus, Send, Copy, Pencil, Trash2, Eye, X, Loader2, ArrowUp, ArrowDown, ChevronDown, ChevronUp,
  Route, UsersRound, UserCheck, Lock, Unlock,
} from 'lucide-react';
import EnvoiModal from './EnvoiModal';
import { AssignModal } from './SuiviQuestionnaires';
import { Prenom } from './Prenoms';

const TYPES = [
  { id: 'textarea', label: 'Réponse libre (longue)' },
  { id: 'text', label: 'Réponse courte' },
  { id: 'choice', label: 'Un seul choix' },
  { id: 'multi', label: 'Plusieurs choix' },
  { id: 'scales', label: 'Notes de 0 à 10' },
  { id: 'list', label: 'Liste (3 réponses courtes)' },
];
const typeLabel = (t) => TYPES.find((x) => x.id === t)?.label || t;
const input = 'w-full p-2 text-sm rounded-lg border border-teal-200 bg-white outline-none focus:ring-2 focus:ring-teal-400 placeholder:text-teal-700/40';
const btn = 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-cream-200 bg-white text-teal-800 text-xs font-semibold hover:bg-teal-50 disabled:opacity-50';
const btnPrimary = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 disabled:bg-teal-200';

export default function BaseQuestionnaires({ beneficiaires = [], onChanged }) {
  const [items, setItems] = useState(null);
  const [parcours, setParcours] = useState([]);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [editing, setEditing] = useState(null); // questionnaire : { id?, definition }
  const [editingP, setEditingP] = useState(null); // parcours : { id?, definition }
  const [envoi, setEnvoi] = useState(null); // questionnaire à envoyer une fois
  const [promoDe, setPromoDe] = useState(null); // parcours à démarrer avec une promo
  const [attribuer, setAttribuer] = useState(null); // parcours individuel à attribuer

  async function load() {
    try {
      const r = await fetch('/api/conseiller/questionnaires/base');
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Chargement impossible.');
      setItems(d.questionnaires || []);
      setParcours(d.parcours || []);
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function retirer(q) {
    if (window.confirm && !window.confirm(`Retirer « ${q.titre} » de la base ? Les réponses déjà reçues restent lisibles.`)) return;
    const r = await fetch(`/api/conseiller/questionnaires/base/${encodeURIComponent(q.id)}`, { method: 'DELETE' });
    if (!r.ok) setError((await r.json().catch(() => ({}))).error || 'Échec.');
    await load();
  }
  async function retirerParcours(p) {
    if (window.confirm && !window.confirm(`Retirer le parcours « ${p.label} » ? Les personnes qui le suivent continuent.`)) return;
    const r = await fetch(`/api/conseiller/parcours-modeles/${encodeURIComponent(p.id)}`, { method: 'DELETE' });
    if (!r.ok) setError((await r.json().catch(() => ({}))).error || 'Échec.');
    await load();
  }

  // Modifier : le vôtre en place, sinon une copie (catalogue, collègue).
  const modifier = (q) => setEditing(q.mine
    ? { id: q.id, definition: JSON.parse(JSON.stringify(q.questionnaire)) }
    : { copie: true, definition: { titre: `${q.titre} (ma version)`, intro: q.questionnaire.intro || '', sections: JSON.parse(JSON.stringify(q.questionnaire.sections)) } });
  const modifierParcours = (p) => setEditingP(p.mine
    ? { id: p.id, suivi: beneficiaires.some((b) => b.parcoursId === p.id), definition: { label: p.label, description: p.description, usage: p.usage, deblocage: p.deblocage, etapes: p.etapes.map((e) => ({ label: e.label, questionnaireId: e.questionnaireId })) } }
    : { copie: true, definition: { label: `${p.label} (ma version)`, description: p.description, usage: p.usage, deblocage: p.deblocage, etapes: p.etapes.map((e) => ({ label: e.label, questionnaireId: e.questionnaireId })) } });

  const shown = open ? items || [] : (items || []).slice(0, 6);

  return (
    <section className="mt-8" aria-labelledby="base-q-title">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center">
          <Library className="w-6 h-6 text-amber-600" aria-hidden="true" />
        </div>
        <div>
          <h2 id="base-q-title" className="text-xl font-extrabold text-teal-800">Base de questionnaires</h2>
          <p className="text-sm text-teal-700/70">Les parcours enchaînent des questionnaires ; un même questionnaire peut aussi s'envoyer seul. Tout est partagé avec votre structure.</p>
        </div>
      </div>
      {error && <p className="text-sm text-rose-600 mb-3">{error}</p>}

      {!items ? (
        <div className="bg-white border border-cream-200 rounded-2xl shadow-card p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>
      ) : (
        <>
          {/* ── Parcours ── */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h3 className="text-sm font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5"><Route className="w-4 h-4" /> Parcours (enchaînements)</h3>
            <button
              onClick={() => setEditingP({ definition: { label: '', description: '', usage: 'individuel', deblocage: 'sequentiel', etapes: [{ label: 'Étape 1', questionnaireId: '' }] } })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-200 bg-white text-teal-800 text-sm font-semibold hover:bg-teal-50"
            >
              <Plus className="w-4 h-4" /> Nouveau parcours
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-3 mb-8">
            {parcours.map((p) => {
              const suivis = beneficiaires.filter((b) => b.parcoursId === p.id).length;
              return (
                <article key={p.id} className="bg-white border border-cream-200 rounded-2xl shadow-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-base font-extrabold text-teal-800">{p.label}</div>
                      <div className="text-[11px] text-teal-700/60">
                        {p.origine === 'catalogue' ? 'Catalogue Iamonjob' : p.mine ? 'Créé par vous' : 'Créé par un collègue'}
                        {suivis ? ` · suivi par ${suivis} personne${suivis > 1 ? 's' : ''}` : ''}
                      </div>
                    </div>
                    <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${p.usage === 'individuel' ? 'bg-indigo-50 text-indigo-700' : 'bg-pink-50 text-pink-700'}`}>
                      {p.usage === 'individuel' ? <UserCheck className="w-3 h-3" /> : <UsersRound className="w-3 h-3" />}
                      {p.usage === 'individuel' ? 'Individuel' : 'Promo'}
                    </span>
                  </div>
                  <ol className="mt-3 space-y-0.5 text-xs text-teal-800">
                    {p.etapes.map((e) => (
                      <li key={e.n} className={e.questionnaireId ? '' : 'text-teal-700/40'}>
                        <span className="font-semibold">{e.label}</span> · {e.titre || 'à écrire'}
                      </li>
                    ))}
                  </ol>
                  <div className="text-[11px] text-teal-700/60 mt-2 flex items-center gap-1">
                    {p.deblocage === 'sequentiel' ? <><Lock className="w-3 h-3" /> Une étape s'ouvre quand la précédente est remplie</> : <><Unlock className="w-3 h-3" /> Toutes les étapes ouvertes d'emblée</>}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {p.usage === 'individuel' ? (
                      <button onClick={() => setAttribuer(p)} disabled={!beneficiaires.length} className={btnPrimary} title="La ou les personnes choisies suivront ce parcours à leur rythme">
                        <UserCheck className="w-3.5 h-3.5" /> Attribuer à des personnes
                      </button>
                    ) : (
                      <button onClick={() => setPromoDe(p)} disabled={!beneficiaires.length} className={btnPrimary} title="Créer une promo qui suit ce parcours">
                        <UsersRound className="w-3.5 h-3.5" /> Démarrer une promo
                      </button>
                    )}
                    <button onClick={() => modifierParcours(p)} className={btn}>
                      {p.mine ? <><Pencil className="w-3.5 h-3.5" /> Modifier</> : <><Copy className="w-3.5 h-3.5" /> Modifier une copie</>}
                    </button>
                    {p.mine && <button onClick={() => retirerParcours(p)} className={btn}><Trash2 className="w-3.5 h-3.5" /> Retirer</button>}
                  </div>
                </article>
              );
            })}
          </div>

          {/* ── Questionnaires ── */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h3 className="text-sm font-bold text-teal-800 uppercase tracking-wider">Questionnaires</h3>
            <button
              onClick={() => setEditing({ definition: { titre: '', intro: '', sections: [{ titre: '', questions: [{ type: 'textarea', label: '' }] }] } })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-200 bg-white text-teal-800 text-sm font-semibold hover:bg-teal-50"
            >
              <Plus className="w-4 h-4" /> Nouveau questionnaire
            </button>
          </div>
          <div className="bg-white border border-cream-200 rounded-2xl shadow-card divide-y divide-cream-100">
            {shown.map((q) => (
              <div key={q.id} className="px-4 py-3 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[240px]">
                  <div className="text-sm font-semibold text-teal-900">{q.titre}</div>
                  <div className="text-[11px] text-teal-700/60">
                    {q.nbQuestions} questions · {q.origine === 'catalogue' ? 'Catalogue Iamonjob' : q.mine ? 'Créé par vous' : 'Créé par un collègue'}
                    {q.origine === 'perso' && q.version > 1 ? ` · version ${q.version}` : ''}
                  </div>
                  <div className="text-[11px] mt-0.5">
                    {q.parcours?.length
                      ? <span className="text-pink-700">Étape de : {q.parcours.map((p) => `${p.label} (${p.etapeLabel})`).join(', ')}</span>
                      : <span className="text-teal-700/50">Dans aucun parcours : à envoyer seul ou à ajouter à un parcours</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => setPreview(q)} className={btn}><Eye className="w-3.5 h-3.5" /> Aperçu</button>
                  <button onClick={() => modifier(q)} className={btn}>
                    {q.mine ? <><Pencil className="w-3.5 h-3.5" /> Modifier</> : <><Copy className="w-3.5 h-3.5" /> Modifier une copie</>}
                  </button>
                  {q.mine && <button onClick={() => retirer(q)} className={btn} aria-label="Retirer"><Trash2 className="w-3.5 h-3.5" /></button>}
                  <button onClick={() => setEnvoi(q)} disabled={!beneficiaires.length} className={btnPrimary} title="Envoi unique, en dehors d'un parcours, à une promo ou à des personnes">
                    <Send className="w-3.5 h-3.5" /> Envoyer une fois…
                  </button>
                </div>
              </div>
            ))}
            {items.length > 6 && (
              <button onClick={() => setOpen((o) => !o)} className="w-full px-4 py-2.5 text-sm font-semibold text-teal-700 hover:bg-cream-50 inline-flex items-center justify-center gap-1">
                {open ? <><ChevronUp className="w-4 h-4" /> Réduire</> : <><ChevronDown className="w-4 h-4" /> Voir les {items.length} questionnaires</>}
              </button>
            )}
          </div>
        </>
      )}

      {preview && <PreviewModal q={preview} onClose={() => setPreview(null)} />}
      {editing && (
        <EditorModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await load(); }}
        />
      )}
      {editingP && (
        <ParcoursEditor
          initial={editingP}
          questionnaires={items || []}
          onClose={() => setEditingP(null)}
          onSaved={async () => { setEditingP(null); await load(); }}
        />
      )}
      {envoi && (
        <EnvoiModal
          beneficiaires={beneficiaires}
          preset={{ type: 'questionnaire', questionnaireId: envoi.id, titre: envoi.titre }}
          onClose={() => setEnvoi(null)}
        />
      )}
      {promoDe && (
        <AssignModal
          parcours={parcours}
          beneficiaires={beneficiaires.filter((b) => !b.promoArchivee)}
          current={null}
          defaultParcoursId={promoDe.id}
          onClose={() => setPromoDe(null)}
          onDone={async () => { setPromoDe(null); await onChanged?.(); }}
        />
      )}
      {attribuer && (
        <AttribuerModal
          parcours={attribuer}
          beneficiaires={beneficiaires}
          onClose={() => setAttribuer(null)}
          onDone={async () => { setAttribuer(null); await onChanged?.(); }}
        />
      )}
    </section>
  );
}

// ─── Attribuer un parcours individuel ────────────────────────────────────────

function AttribuerModal({ parcours, beneficiaires, onClose, onDone }) {
  const initial = new Set(beneficiaires.filter((b) => b.parcoursId === parcours.id && !b.promo).map((b) => b.id));
  const [selected, setSelected] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const toggle = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const post = (body) => fetch('/api/conseiller/parcours', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      }).then(async (r) => { if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "L'attribution a échoué."); });
      const ajouts = [...selected].filter((id) => !initial.has(id));
      const retraits = [...initial].filter((id) => !selected.has(id));
      if (ajouts.length) await post({ beneficiaireIds: ajouts, parcoursId: parcours.id, promo: '' });
      if (retraits.length) await post({ beneficiaireIds: retraits, parcoursId: null });
      await onDone();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-900/50" role="dialog" aria-modal="true" aria-labelledby="attr-title" onClick={() => !saving && onClose()}>
      <div className="w-full max-w-lg max-h-[92vh] bg-white border border-cream-200 rounded-2xl shadow-card overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-cream-200 bg-teal-50/60 flex items-start gap-3">
          <div className="flex-1">
            <h2 id="attr-title" className="text-lg font-bold text-teal-800">Attribuer « {parcours.label} »</h2>
            <p className="text-sm text-teal-700/80 mt-0.5">Chaque personne cochée suit ce parcours à son rythme, dans « Mes questionnaires ». Une personne suit un seul parcours à la fois.</p>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-teal-700 hover:bg-cream-200/70"><X className="w-5 h-5" /></button>
        </div>
        <ul className="flex-1 overflow-y-auto px-6 py-4 space-y-1.5 iamj-scrollbar">
          {beneficiaires.map((b) => {
            const enPromo = Boolean(b.promo && b.parcoursId);
            const autre = !enPromo && b.parcoursId && b.parcoursId !== parcours.id;
            return (
              <li key={b.id}>
                <label className={`flex items-center gap-2 p-2 rounded-lg border border-cream-200 ${enPromo ? 'opacity-50' : 'hover:bg-cream-50 cursor-pointer'}`}>
                  <input type="checkbox" disabled={enPromo} checked={selected.has(b.id)} onChange={() => toggle(b.id)} className="accent-teal-600" />
                  <span className="font-mono text-sm font-semibold text-teal-800">{b.code}<Prenom code={b.code} /></span>
                  {enPromo && <span className="text-[11px] text-teal-700/60">dans la promo « {b.promo} »</span>}
                  {autre && <span className="text-[11px] text-amber-700">suit déjà un autre parcours (il sera remplacé)</span>}
                </label>
              </li>
            );
          })}
        </ul>
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

// ─── Éditeur de parcours ─────────────────────────────────────────────────────

function ParcoursEditor({ initial, questionnaires, onClose, onSaved }) {
  const [def, setDef] = useState(initial.definition);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const setEtape = (i, patch) => setDef((d) => ({ ...d, etapes: d.etapes.map((e, j) => (j === i ? { ...e, ...patch } : e)) }));
  const move = (i, dir) => setDef((d) => { const a = [...d.etapes]; const j = i + dir; if (j < 0 || j >= a.length) return d; [a[i], a[j]] = [a[j], a[i]]; return { ...d, etapes: a }; });
  const nomEtape = (n) => (def.usage === 'promo' ? `Semaine ${n}` : `Étape ${n}`);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const url = initial.id ? `/api/conseiller/parcours-modeles/${encodeURIComponent(initial.id)}` : '/api/conseiller/parcours-modeles';
      const r = await fetch(url, { method: initial.id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(def) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "L'enregistrement a échoué.");
      await onSaved();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-900/50" role="dialog" aria-modal="true" aria-labelledby="edit-p-title" onClick={() => !saving && onClose()}>
      <div className="w-full max-w-2xl max-h-[94vh] bg-white border border-cream-200 rounded-2xl shadow-card overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-cream-200 bg-teal-50/60 flex items-start gap-3">
          <div className="flex-1">
            <h2 id="edit-p-title" className="text-lg font-bold text-teal-800">{initial.id ? 'Modifier le parcours' : initial.copie ? 'Nouveau parcours à partir d’un existant' : 'Nouveau parcours'}</h2>
            <p className="text-sm text-teal-700/80 mt-0.5">
              {initial.suivi ? 'Déjà suivi : vous pouvez ajouter des étapes à la fin ou changer les intitulés. Pour réorganiser, faites une copie.' : 'Un enchaînement de questionnaires de la base, dans l’ordre.'}
            </p>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-teal-700 hover:bg-cream-200/70"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 iamj-scrollbar">
          <label className="block">
            <span className="block text-sm font-semibold text-teal-800 mb-1">Nom *</span>
            <input value={def.label} onChange={(e) => setDef({ ...def, label: e.target.value })} maxLength={80} className={input} placeholder="Retour à l'emploi en 4 étapes" />
          </label>
          <label className="block">
            <span className="block text-sm font-semibold text-teal-800 mb-1">Description</span>
            <input value={def.description || ''} onChange={(e) => setDef({ ...def, description: e.target.value })} maxLength={300} className={input} />
          </label>
          <div className="grid sm:grid-cols-2 gap-4">
            <fieldset>
              <legend className="text-sm font-semibold text-teal-800 mb-1">Pour qui</legend>
              <label className="flex items-start gap-2 text-sm text-teal-800"><input type="radio" checked={def.usage === 'promo'} onChange={() => setDef({ ...def, usage: 'promo' })} className="accent-teal-600 mt-0.5" /> Une promo (suivi collectif)</label>
              <label className="flex items-start gap-2 text-sm text-teal-800"><input type="radio" checked={def.usage === 'individuel'} onChange={() => setDef({ ...def, usage: 'individuel' })} className="accent-teal-600 mt-0.5" /> Une personne (accompagnement individuel)</label>
            </fieldset>
            <fieldset>
              <legend className="text-sm font-semibold text-teal-800 mb-1">Ouverture des étapes</legend>
              <label className="flex items-start gap-2 text-sm text-teal-800"><input type="radio" checked={def.deblocage === 'sequentiel'} onChange={() => setDef({ ...def, deblocage: 'sequentiel' })} className="accent-teal-600 mt-0.5" /> L'une après l'autre</label>
              <label className="flex items-start gap-2 text-sm text-teal-800"><input type="radio" checked={def.deblocage === 'libre'} onChange={() => setDef({ ...def, deblocage: 'libre' })} className="accent-teal-600 mt-0.5" /> Toutes d'emblée</label>
            </fieldset>
          </div>
          <div>
            <div className="text-sm font-semibold text-teal-800 mb-2">Étapes</div>
            <ol className="space-y-2">
              {def.etapes.map((e, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2 rounded-lg bg-cream-50/70 border border-cream-100 p-2">
                  <span className="text-xs font-bold text-pink-500 w-5 text-center">{i + 1}</span>
                  <input value={e.label} onChange={(ev) => setEtape(i, { label: ev.target.value })} maxLength={60} className="p-1.5 text-sm rounded-lg border border-teal-200 bg-white w-32" placeholder={nomEtape(i + 1)} />
                  <select value={e.questionnaireId || ''} onChange={(ev) => setEtape(i, { questionnaireId: ev.target.value })} className="flex-1 min-w-[180px] p-1.5 text-sm rounded-lg border border-teal-200 bg-white">
                    <option value="">Questionnaire à écrire plus tard</option>
                    {questionnaires.map((q) => <option key={q.id} value={q.id}>{q.titre}{q.origine === 'perso' && !q.mine ? ' (collègue)' : ''}</option>)}
                  </select>
                  <button onClick={() => move(i, -1)} className="text-teal-600 hover:text-teal-800" aria-label="Monter"><ArrowUp className="w-4 h-4" /></button>
                  <button onClick={() => move(i, 1)} className="text-teal-600 hover:text-teal-800" aria-label="Descendre"><ArrowDown className="w-4 h-4" /></button>
                  <button onClick={() => setDef({ ...def, etapes: def.etapes.filter((_, j) => j !== i) })} className="text-rose-500 hover:text-rose-700" aria-label="Supprimer l'étape"><Trash2 className="w-4 h-4" /></button>
                </li>
              ))}
            </ol>
            <button
              onClick={() => setDef({ ...def, etapes: [...def.etapes, { label: nomEtape(def.etapes.length + 1), questionnaireId: '' }] })}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-900"
            >
              <Plus className="w-4 h-4" /> Ajouter une étape
            </button>
            <p className="text-[11px] text-teal-700/60 mt-2">Il manque un questionnaire ? Créez-le dans « Questionnaires » plus bas (ou modifiez une copie d'un existant), puis revenez ici.</p>
          </div>
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

function IconBtn({ icon: Icon, label, onClick, danger }) {
  return (
    <button onClick={onClick} title={label} aria-label={label}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border ${danger ? 'border-rose-100 text-rose-600 hover:bg-rose-50' : 'border-cream-200 text-teal-700 hover:bg-teal-50'}`}>
      <Icon className="w-4 h-4" />
    </button>
  );
}

function PreviewModal({ q, onClose }) {
  const def = q.questionnaire;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-900/50" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[92vh] bg-white border border-cream-200 rounded-2xl shadow-card overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-cream-200 bg-teal-50/60 flex items-start gap-3">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-teal-800">{def.titre}</h2>
            {def.intro && <p className="text-sm text-teal-700/80 mt-0.5">{def.intro}</p>}
          </div>
          <button onClick={onClose} aria-label="Fermer" className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-teal-700 hover:bg-cream-200/70"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 iamj-scrollbar">
          {def.sections.map((s, i) => (
            <section key={i}>
              <h3 className="text-sm font-extrabold text-teal-800 mb-2"><span className="text-pink-500 mr-1.5">{i + 1}.</span>{s.titre}</h3>
              <ol className="space-y-2">
                {s.questions.map((qq) => (
                  <li key={qq.id} className="text-sm">
                    <div className="text-teal-900">{qq.label}{qq.required && <span className="text-pink-500"> *</span>}</div>
                    <div className="text-[11px] text-teal-700/60">
                      {typeLabel(qq.type)}
                      {qq.options ? ` : ${qq.options.join(' / ')}${qq.other ? ' / Autre' : ''}` : ''}
                      {qq.items ? ` : ${qq.items.map((it) => it.label).join(' / ')}` : ''}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Éditeur ─────────────────────────────────────────────────────────────────

function EditorModal({ initial, onClose, onSaved }) {
  const [def, setDef] = useState(initial.definition);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const setSection = (si, patch) => setDef((d) => ({ ...d, sections: d.sections.map((s, i) => (i === si ? { ...s, ...patch } : s)) }));
  const setQuestion = (si, qi, patch) => setSection(si, { questions: def.sections[si].questions.map((q, i) => (i === qi ? { ...q, ...patch } : q)) });
  const move = (arr, i, dir) => { const a = [...arr]; const j = i + dir; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; };

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const url = initial.id ? `/api/conseiller/questionnaires/base/${encodeURIComponent(initial.id)}` : '/api/conseiller/questionnaires/base';
      const r = await fetch(url, { method: initial.id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(def) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "L'enregistrement a échoué.");
      await onSaved();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-900/50" role="dialog" aria-modal="true" aria-labelledby="edit-q-title" onClick={() => !saving && onClose()}>
      <div className="w-full max-w-3xl max-h-[94vh] bg-white border border-cream-200 rounded-2xl shadow-card overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-cream-200 bg-teal-50/60 flex items-start gap-3">
          <div className="flex-1">
            <h2 id="edit-q-title" className="text-lg font-bold text-teal-800">{initial.id ? 'Modifier le questionnaire' : initial.copie ? 'Modifier une copie' : 'Nouveau questionnaire'}</h2>
            <p className="text-sm text-teal-700/80 mt-0.5">
              {initial.id
                ? 'Les réponses déjà reçues gardent la version remplie ; les prochaines utiliseront celle-ci.'
                : initial.copie
                  ? "L'original ne change pas : votre version rejoint la base, prête à être envoyée ou mise dans un parcours."
                  : 'Il rejoindra la base de votre structure.'}
            </p>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-teal-700 hover:bg-cream-200/70"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 iamj-scrollbar">
          <label className="block">
            <span className="block text-sm font-semibold text-teal-800 mb-1">Titre *</span>
            <input value={def.titre} onChange={(e) => setDef({ ...def, titre: e.target.value })} maxLength={120} className={input} placeholder="Point d'étape après l'atelier CV" />
          </label>
          <label className="block">
            <span className="block text-sm font-semibold text-teal-800 mb-1">Introduction</span>
            <textarea value={def.intro || ''} onChange={(e) => setDef({ ...def, intro: e.target.value })} maxLength={600} rows={2} className={input} placeholder="Quelques questions pour préparer notre prochain rendez-vous." />
          </label>

          {def.sections.map((s, si) => (
            <fieldset key={si} className="rounded-xl border border-cream-200 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <input value={s.titre} onChange={(e) => setSection(si, { titre: e.target.value })} maxLength={120} className={`${input} font-semibold`} placeholder={`Partie ${si + 1} (titre facultatif)`} />
                {def.sections.length > 1 && (
                  <button onClick={() => setDef({ ...def, sections: def.sections.filter((_, i) => i !== si) })} className="shrink-0 text-rose-500 hover:text-rose-700" aria-label="Supprimer la partie"><Trash2 className="w-4 h-4" /></button>
                )}
              </div>

              {s.questions.map((q, qi) => (
                <div key={qi} className="rounded-lg bg-cream-50/70 border border-cream-100 p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold text-pink-500 mt-2.5">{qi + 1}</span>
                    <textarea value={q.label} onChange={(e) => setQuestion(si, qi, { label: e.target.value })} rows={1} maxLength={300} className={input} placeholder="Intitulé de la question" />
                    <div className="flex flex-col">
                      <button onClick={() => setSection(si, { questions: move(s.questions, qi, -1) })} className="text-teal-600 hover:text-teal-800" aria-label="Monter"><ArrowUp className="w-4 h-4" /></button>
                      <button onClick={() => setSection(si, { questions: move(s.questions, qi, 1) })} className="text-teal-600 hover:text-teal-800" aria-label="Descendre"><ArrowDown className="w-4 h-4" /></button>
                    </div>
                    <button onClick={() => setSection(si, { questions: s.questions.filter((_, i) => i !== qi) })} className="text-rose-500 hover:text-rose-700 mt-2" aria-label="Supprimer la question"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 pl-5">
                    <select value={q.type} onChange={(e) => setQuestion(si, qi, { type: e.target.value })} className="p-1.5 text-xs rounded-lg border border-teal-200 bg-white">
                      {TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                    <label className="inline-flex items-center gap-1 text-xs text-teal-800">
                      <input type="checkbox" checked={Boolean(q.required)} onChange={(e) => setQuestion(si, qi, { required: e.target.checked })} className="accent-teal-600" /> Obligatoire
                    </label>
                    {(q.type === 'choice' || q.type === 'multi') && (
                      <label className="inline-flex items-center gap-1 text-xs text-teal-800">
                        <input type="checkbox" checked={Boolean(q.other)} onChange={(e) => setQuestion(si, qi, { other: e.target.checked })} className="accent-teal-600" /> « Autre (préciser) »
                      </label>
                    )}
                  </div>
                  {(q.type === 'choice' || q.type === 'multi') && (
                    <textarea
                      value={(q.options || []).join('\n')}
                      onChange={(e) => setQuestion(si, qi, { options: e.target.value.split('\n') })}
                      rows={3}
                      className={`${input} ml-5`}
                      placeholder={'Un choix par ligne\nOui\nNon'}
                    />
                  )}
                  {q.type === 'scales' && (
                    <textarea
                      value={(q.items || []).map((it) => it.label).join('\n')}
                      onChange={(e) => setQuestion(si, qi, {
                        items: e.target.value.split('\n').map((label, i) => ({ ...(q.items?.[i] || {}), id: q.items?.[i]?.id || `n${i + 1}`, label })),
                      })}
                      rows={3}
                      className={`${input} ml-5`}
                      placeholder={"Un élément noté par ligne (vide = la question elle-même)\nMa confiance en moi\nMon moral"}
                    />
                  )}
                </div>
              ))}
              <button
                onClick={() => setSection(si, { questions: [...s.questions, { type: 'textarea', label: '' }] })}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-900"
              >
                <Plus className="w-4 h-4" /> Ajouter une question
              </button>
            </fieldset>
          ))}
          <button
            onClick={() => setDef({ ...def, sections: [...def.sections, { titre: '', questions: [{ type: 'textarea', label: '' }] }] })}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-900"
          >
            <Plus className="w-4 h-4" /> Ajouter une partie
          </button>
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
