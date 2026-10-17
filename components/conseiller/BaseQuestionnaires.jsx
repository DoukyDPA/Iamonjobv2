'use client';

// ════════════════════════════════════════════════════════════════════════════
// Base de questionnaires — vue conseiller.
//
// Les questionnaires PROMO 45+ (catalogue) et ceux créés dans la structure.
// Le conseiller les consulte, les envoie à une promo ou à une personne, en
// crée de nouveaux, ou duplique un existant pour l'adapter.
//
// Props :
//   beneficiaires  dossiers du conseiller (destinataires possibles)
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import {
  Library, Plus, Send, Copy, Pencil, Trash2, Eye, X, Loader2, ArrowUp, ArrowDown, ChevronDown, ChevronUp,
} from 'lucide-react';
import EnvoiModal from './EnvoiModal';

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

export default function BaseQuestionnaires({ beneficiaires = [] }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [editing, setEditing] = useState(null); // { id?, definition }
  const [envoi, setEnvoi] = useState(null); // questionnaireId

  async function load() {
    try {
      const r = await fetch('/api/conseiller/questionnaires/base');
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Chargement impossible.');
      setItems(d.questionnaires || []);
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function retirer(q) {
    if (window.confirm && !window.confirm(`Retirer « ${q.titre} » de la base ? Les réponses déjà reçues restent lisibles.`)) return;
    const r = await fetch(`/api/conseiller/questionnaires/base/${encodeURIComponent(q.id)}`, { method: 'DELETE' });
    if (!r.ok) setError((await r.json().catch(() => ({}))).error || 'Échec.');
    await load();
  }

  const dupliquer = (q) => setEditing({
    definition: { titre: `${q.titre} (copie)`, intro: q.questionnaire.intro || '', sections: JSON.parse(JSON.stringify(q.questionnaire.sections)) },
  });

  const shown = open ? items || [] : (items || []).slice(0, 4);

  return (
    <section className="mt-8" aria-labelledby="base-q-title">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center">
            <Library className="w-6 h-6 text-amber-600" aria-hidden="true" />
          </div>
          <div>
            <h2 id="base-q-title" className="text-xl font-extrabold text-teal-800">Base de questionnaires</h2>
            <p className="text-sm text-teal-700/70">À envoyer à une promo entière ou à une personne. Ceux que vous créez sont partagés avec votre structure.</p>
          </div>
        </div>
        <button
          onClick={() => setEditing({ definition: { titre: '', intro: '', sections: [{ titre: '', questions: [{ type: 'textarea', label: '' }] }] } })}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-teal-200 bg-white text-teal-800 font-semibold text-sm hover:bg-teal-50"
        >
          <Plus className="w-4 h-4" /> Nouveau questionnaire
        </button>
      </div>

      {error && <p className="text-sm text-rose-600 mb-3">{error}</p>}
      {!items ? (
        <div className="bg-white border border-cream-200 rounded-2xl shadow-card p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>
      ) : (
        <div className="bg-white border border-cream-200 rounded-2xl shadow-card divide-y divide-cream-100">
          {shown.map((q) => (
            <div key={q.id} className="px-4 py-3 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[220px]">
                <div className="text-sm font-semibold text-teal-900">
                  {q.parcours?.[0] && <span className="text-[11px] font-bold text-pink-600 mr-1.5">{q.parcours[0].label} · S{q.parcours[0].etape}</span>}
                  {q.titre}
                </div>
                <div className="text-[11px] text-teal-700/60">
                  {q.nbQuestions} questions · {q.origine === 'catalogue' ? 'Catalogue Iamonjob' : q.mine ? 'Créé par vous' : 'Créé par un collègue'}
                  {q.origine === 'perso' && q.version > 1 ? ` · version ${q.version}` : ''}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <IconBtn icon={Eye} label="Aperçu" onClick={() => setPreview(q)} />
                <IconBtn icon={Copy} label="Dupliquer" onClick={() => dupliquer(q)} />
                {q.mine && <IconBtn icon={Pencil} label="Modifier" onClick={() => setEditing({ id: q.id, definition: JSON.parse(JSON.stringify(q.questionnaire)) })} />}
                {q.mine && <IconBtn icon={Trash2} label="Retirer" danger onClick={() => retirer(q)} />}
                <button onClick={() => setEnvoi(q.id)} disabled={!beneficiaires.length} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 disabled:bg-teal-200">
                  <Send className="w-3.5 h-3.5" /> Envoyer
                </button>
              </div>
            </div>
          ))}
          {items.length > 4 && (
            <button onClick={() => setOpen((o) => !o)} className="w-full px-4 py-2.5 text-sm font-semibold text-teal-700 hover:bg-cream-50 inline-flex items-center justify-center gap-1">
              {open ? <><ChevronUp className="w-4 h-4" /> Réduire</> : <><ChevronDown className="w-4 h-4" /> Voir les {items.length} questionnaires</>}
            </button>
          )}
        </div>
      )}

      {preview && <PreviewModal q={preview} onClose={() => setPreview(null)} />}
      {editing && (
        <EditorModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await load(); }}
        />
      )}
      {envoi && (
        <EnvoiModal
          beneficiaires={beneficiaires}
          preset={{ type: 'questionnaire', questionnaireId: envoi }}
          onClose={() => setEnvoi(null)}
        />
      )}
    </section>
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
            <h2 id="edit-q-title" className="text-lg font-bold text-teal-800">{initial.id ? 'Modifier le questionnaire' : 'Nouveau questionnaire'}</h2>
            <p className="text-sm text-teal-700/80 mt-0.5">
              {initial.id ? 'Les réponses déjà reçues gardent la version remplie.' : 'Il rejoindra la base de votre structure.'}
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
