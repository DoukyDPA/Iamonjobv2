'use client';

// ════════════════════════════════════════════════════════════════════════════
// Mes questionnaires — fiches de suivi de l'accompagnement.
//
// Visible seulement si le conseiller a affecté un parcours à la personne
// (ex. PROMO 45+). La personne choisit le questionnaire de la semaine, le
// remplit, et peut relire ou corriger ses réponses ensuite. Les réponses
// partent à son conseiller, sous son code, jamais sous son nom.
//
// API : /api/questionnaires (GET état du parcours, POST réponse).
//
// Props :
//   variant  'sidebar' (bloc dans la colonne de gauche) | 'mobile' (compact)
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react';
import {
  ClipboardList, ClipboardCheck, ChevronLeft, ChevronRight, Lock, X, CheckCircle2, Send,
} from 'lucide-react';
import { Button } from './ui';
import { AUTRE, allQuestions } from '@/lib/questionnaires/catalogue';

function formatDate(ms) {
  if (!ms) return '';
  try {
    return new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  } catch { return ''; }
}

export default function MesQuestionnaires({ variant = 'sidebar' }) {
  const [state, setState] = useState(null);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null); // questionnaireId en cours | null
  const [flash, setFlash] = useState(null);

  async function load() {
    try {
      const res = await fetch('/api/questionnaires');
      if (!res.ok) return;
      setState(await res.json());
    } catch { /* silencieux : le bloc reste masqué */ }
  }

  useEffect(() => { load(); }, []);

  if (!state?.parcours) return null;

  const etapes = state.etapes || [];
  const dispo = etapes.filter((e) => e.disponible);
  const remplis = etapes.filter((e) => e.rempli).length;
  const prochaine = dispo.find((e) => !e.rempli) || null;

  function openPanel(qid = null) {
    setOpen(true);
    setFlash(null);
    setCurrent(qid);
  }

  const sousTitre = prochaine
    ? `À remplir : ${prochaine.label}`
    : remplis > 0 ? 'Tout est à jour, merci !' : 'Vos questionnaires';

  const trigger =
    variant === 'mobile' ? (
      <button
        type="button"
        onClick={() => openPanel()}
        className="relative inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-teal-200 text-teal-800 text-xs font-semibold shadow-soft hover:bg-teal-50 shrink-0"
      >
        <ClipboardList className="w-4 h-4" />
        Mes questionnaires
        {prochaine && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-pink-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-cream-50">
            1
          </span>
        )}
      </button>
    ) : (
      <button
        type="button"
        onClick={() => openPanel()}
        className="relative w-full flex items-center gap-3 p-3 rounded-xl bg-white border border-teal-200 text-teal-800 shadow-soft hover:bg-teal-50 transition-colors text-left"
      >
        <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center shrink-0">
          <ClipboardList className="w-5 h-5 text-teal-700" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-teal-700/70 leading-tight">
            {state.parcours.label}
          </div>
          <div className="text-sm font-bold leading-tight">Mes questionnaires</div>
          <div className="text-[11px] text-teal-700/80 leading-tight mt-0.5 truncate">{sousTitre}</div>
        </div>
        <span className="text-[11px] font-bold text-teal-700 shrink-0">{remplis}/{dispo.length}</span>
      </button>
    );

  const questionnaire = current ? state.questionnaires?.[current] : null;
  const etapeCourante = current ? etapes.find((e) => e.questionnaireId === current) : null;

  return (
    <>
      {variant === 'sidebar' ? (
        <div className="mt-6 pt-5 border-t border-cream-200">
          <div className="text-xs font-bold tracking-[0.15em] text-teal-700/70 mb-3">MON SUIVI</div>
          {trigger}
        </div>
      ) : trigger}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-900/50 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="questionnaires-title"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[92vh] bg-white border border-cream-200 rounded-2xl shadow-card overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-cream-200 bg-teal-50/60 flex items-start gap-3">
              {questionnaire ? (
                <button
                  type="button"
                  onClick={() => setCurrent(null)}
                  aria-label="Retour à la liste"
                  className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-teal-700 hover:bg-cream-200/70"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              ) : (
                <ClipboardList className="w-6 h-6 text-teal-600 shrink-0 mt-0.5" aria-hidden="true" />
              )}
              <div className="flex-1 min-w-0">
                <h2 id="questionnaires-title" className="text-lg font-bold text-teal-800">
                  {questionnaire ? `${etapeCourante?.label} · ${questionnaire.titre}` : 'Mes questionnaires'}
                </h2>
                <p className="text-sm text-teal-700/80 mt-0.5">
                  {questionnaire
                    ? questionnaire.intro
                    : `${state.parcours.label}${state.promo ? ` · ${state.promo}` : ''}. Vos réponses vont à votre conseiller, sous votre code.`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-teal-700 hover:bg-cream-200/70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {questionnaire ? (
              <QuestionnaireForm
                key={questionnaire.id}
                questionnaire={questionnaire}
                initial={etapeCourante?.answers || {}}
                dejaRempli={Boolean(etapeCourante?.rempli)}
                onDone={async (created) => {
                  await load();
                  setCurrent(null);
                  setFlash(created ? 'Merci, votre questionnaire est envoyé à votre conseiller.' : 'Vos corrections sont enregistrées.');
                }}
              />
            ) : (
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3 iamj-scrollbar">
                {flash && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-teal-50 border border-teal-200 text-sm text-teal-800">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> {flash}
                  </div>
                )}
                <ul className="space-y-2">
                  {etapes.map((e) => (
                    <li key={e.n}>
                      <button
                        type="button"
                        disabled={!e.disponible}
                        onClick={() => setCurrent(e.questionnaireId)}
                        className={[
                          'w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors',
                          !e.disponible
                            ? 'border-cream-200 bg-cream-50 opacity-60 cursor-not-allowed'
                            : e === prochaine
                            ? 'border-pink-300 bg-pink-50/50 hover:bg-pink-50'
                            : 'border-cream-200 bg-white hover:bg-teal-50/50 hover:border-teal-200',
                        ].join(' ')}
                      >
                        <span className={[
                          'w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold border',
                          e.rempli ? 'bg-teal-600 text-white border-teal-700' : 'bg-white text-teal-700 border-teal-200',
                        ].join(' ')}>
                          {e.rempli ? <ClipboardCheck className="w-4 h-4" /> : e.n}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold text-teal-800">
                            {e.label}{e.titre ? ` · ${e.titre}` : ''}
                          </span>
                          <span className="block text-xs text-teal-700/70">
                            {!e.disponible
                              ? 'Bientôt disponible'
                              : e.rempli
                              ? `Envoyé le ${formatDate(e.submittedAt)}. Vous pouvez le relire ou le corriger.`
                              : e === prochaine ? 'À remplir maintenant' : 'À remplir'}
                          </span>
                        </span>
                        {e.disponible ? <ChevronRight className="w-4 h-4 text-teal-600 shrink-0" /> : <Lock className="w-4 h-4 text-teal-700/40 shrink-0" />}
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-teal-700/60 pt-2">
                  Ces questionnaires vous aident à mesurer votre progression semaine après semaine. Il
                  n'y a pas de bonne ou de mauvaise réponse : soyez simplement sincère.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ─── Formulaire ──────────────────────────────────────────────────────────────

function QuestionnaireForm({ questionnaire, initial, dejaRempli, onDone }) {
  const [answers, setAnswers] = useState(initial || {});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [missing, setMissing] = useState([]);

  const questions = useMemo(() => allQuestions(questionnaire), [questionnaire]);
  const set = (id, v) => {
    setAnswers((a) => ({ ...a, [id]: v }));
    setMissing((m) => m.filter((x) => x !== id));
  };

  // Contrôle local des questions obligatoires (le serveur revérifie).
  function localMissing() {
    return questions.filter((q) => {
      if (!q.required) return false;
      const a = answers[q.id];
      if (q.type === 'scales') return q.items.some((it) => a?.[it.id] === undefined);
      if (q.type === 'grid') return q.rows.some((r) => !a?.[r.id]);
      if (q.type === 'choice') return !a?.value;
      if (q.type === 'multi') return !a?.values?.length;
      if (q.type === 'list') return !a?.some?.(Boolean);
      return !String(a || '').trim();
    }).map((q) => q.id);
  }

  async function submit() {
    const miss = localMissing();
    if (miss.length) {
      setMissing(miss);
      setError('Il manque quelques réponses obligatoires, signalées en rose.');
      document.getElementById(`q-${miss[0]}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/questionnaires', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionnaireId: questionnaire.id, answers }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.missing?.length) setMissing(data.missing);
        throw new Error(data.error || "L'envoi a échoué.");
      }
      await onDone(Boolean(data.created));
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7 iamj-scrollbar">
        {questionnaire.sections.map((s, i) => (
          <section key={s.titre}>
            <h3 className="text-sm font-extrabold text-teal-800 mb-3">
              <span className="text-pink-500 mr-1.5">{i + 1}.</span>{s.titre}
            </h3>
            <div className="space-y-5">
              {s.questions.map((q) => (
                <Question
                  key={q.id}
                  q={q}
                  value={answers[q.id]}
                  onChange={(v) => set(q.id, v)}
                  invalid={missing.includes(q.id)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="px-6 py-4 border-t border-cream-200 bg-cream-50/60">
        {error && <p className="text-sm text-rose-600 mb-2" role="alert">{error}</p>}
        <Button onClick={submit} loading={sending} icon={Send}>
          {sending ? 'Envoi…' : dejaRempli ? 'Enregistrer mes corrections' : 'Envoyer à mon conseiller'}
        </Button>
      </div>
    </>
  );
}

const inputCls = 'w-full p-2.5 text-sm rounded-lg border border-teal-200 bg-white outline-none focus:ring-2 focus:ring-teal-400 placeholder:text-teal-700/40';

function Question({ q, value, onChange, invalid }) {
  const wrap = `rounded-xl ${invalid ? 'ring-2 ring-pink-300 bg-pink-50/40 p-3 -m-1' : ''}`;
  const label = (
    <span className="block text-sm font-semibold text-teal-800 mb-2">
      {q.label}{q.required && <span className="text-pink-500" aria-hidden="true"> *</span>}
    </span>
  );

  if (q.type === 'scales') {
    return (
      <fieldset id={`q-${q.id}`} className={wrap}>
        <legend className="contents">{label}</legend>
        <div className="space-y-3">
          {q.items.map((it) => (
            <ScaleRow
              key={it.id}
              name={`${q.id}-${it.id}`}
              label={it.label}
              value={value?.[it.id]}
              onChange={(n) => onChange({ ...(value || {}), [it.id]: n })}
            />
          ))}
        </div>
      </fieldset>
    );
  }

  if (q.type === 'choice' || q.type === 'multi') {
    const multi = q.type === 'multi';
    const options = q.other ? [...q.options, AUTRE] : q.options;
    const selected = multi ? (value?.values || []) : (value?.value ? [value.value] : []);
    const atMax = multi && q.max && selected.length >= q.max;
    const toggle = (opt) => {
      if (!multi) return onChange({ ...(value || {}), value: opt });
      const has = selected.includes(opt);
      if (!has && atMax) return;
      onChange({ ...(value || {}), values: has ? selected.filter((x) => x !== opt) : [...selected, opt] });
    };
    return (
      <fieldset id={`q-${q.id}`} className={wrap}>
        <legend className="contents">{label}</legend>
        {multi && (q.min || q.max) && (
          <p className="text-[11px] text-teal-700/60 -mt-1 mb-2">
            {q.min && q.max ? `Entre ${q.min} et ${q.max} choix.` : q.max ? `${q.max} choix maximum.` : `Au moins ${q.min} choix.`}
          </p>
        )}
        <div className="grid sm:grid-cols-2 gap-2">
          {options.map((opt) => {
            const on = selected.includes(opt);
            return (
              <label
                key={opt}
                className={[
                  'flex items-start gap-2 p-2.5 rounded-lg border text-sm cursor-pointer transition-colors',
                  on ? 'border-teal-500 bg-teal-50 text-teal-900' : 'border-cream-200 bg-white text-teal-800 hover:border-teal-300',
                  !on && atMax ? 'opacity-50 cursor-not-allowed' : '',
                ].join(' ')}
              >
                <input
                  type={multi ? 'checkbox' : 'radio'}
                  name={q.id}
                  checked={on}
                  disabled={!on && atMax}
                  onChange={() => toggle(opt)}
                  className="mt-0.5 accent-teal-600"
                />
                <span>{opt}</span>
              </label>
            );
          })}
        </div>
        {selected.includes(AUTRE) && (
          <input
            type="text"
            value={value?.other || ''}
            onChange={(e) => onChange({ ...(value || {}), other: e.target.value })}
            maxLength={500}
            placeholder="Précisez…"
            aria-label="Précisez votre réponse « Autre »"
            className={`${inputCls} mt-2`}
          />
        )}
      </fieldset>
    );
  }

  if (q.type === 'grid') {
    return (
      <fieldset id={`q-${q.id}`} className={wrap}>
        <legend className="contents">{label}</legend>
        <div className="space-y-2">
          {q.rows.map((r) => (
            <div key={r.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 rounded-lg border border-cream-200 bg-white">
              <span className="flex-1 text-sm text-teal-800" id={`${q.id}-${r.id}-l`}>{r.label}</span>
              <div className="flex gap-1.5 shrink-0" role="radiogroup" aria-labelledby={`${q.id}-${r.id}-l`}>
                {q.options.map((opt) => {
                  const on = value?.[r.id] === opt;
                  return (
                    <label
                      key={opt}
                      className={[
                        'px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors',
                        on ? 'bg-teal-600 text-white border-teal-700' : 'bg-white text-teal-700 border-teal-200 hover:bg-teal-50',
                      ].join(' ')}
                    >
                      <input
                        type="radio"
                        name={`${q.id}-${r.id}`}
                        checked={on}
                        onChange={() => onChange({ ...(value || {}), [r.id]: opt })}
                        className="sr-only"
                      />
                      {opt}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </fieldset>
    );
  }

  if (q.type === 'list') {
    const arr = Array.isArray(value) ? value : [];
    return (
      <fieldset id={`q-${q.id}`} className={wrap}>
        <legend className="contents">{label}</legend>
        <div className="space-y-2">
          {Array.from({ length: q.count }, (_, i) => (
            <input
              key={i}
              type="text"
              value={arr[i] || ''}
              maxLength={500}
              aria-label={`${q.label} (${i + 1})`}
              placeholder={`${i + 1}.`}
              onChange={(e) => {
                const next = Array.from({ length: q.count }, (_, j) => arr[j] || '');
                next[i] = e.target.value;
                onChange(next);
              }}
              className={inputCls}
            />
          ))}
        </div>
      </fieldset>
    );
  }

  // text / textarea
  return (
    <label id={`q-${q.id}`} className={`block ${wrap}`}>
      {label}
      {q.type === 'text' ? (
        <input type="text" value={value || ''} maxLength={300} onChange={(e) => onChange(e.target.value)} className={inputCls} />
      ) : (
        <textarea value={value || ''} rows={3} maxLength={3000} onChange={(e) => onChange(e.target.value)} className={inputCls} />
      )}
    </label>
  );
}

function ScaleRow({ name, label, value, onChange }) {
  const id = `${name}-l`;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span id={id} className="text-sm text-teal-800">{label}</span>
        <span className="text-sm font-bold text-teal-700 tabular-nums">{value ?? '–'}/10</span>
      </div>
      <div className="grid grid-cols-11 gap-1" role="radiogroup" aria-labelledby={id}>
        {Array.from({ length: 11 }, (_, n) => {
          const on = value === n;
          return (
            <label
              key={n}
              className={[
                'h-8 rounded-md border text-xs font-semibold flex items-center justify-center cursor-pointer transition-colors',
                on ? 'bg-teal-600 text-white border-teal-700' : 'bg-white text-teal-700 border-teal-200 hover:bg-teal-50',
              ].join(' ')}
            >
              <input type="radio" name={name} checked={on} onChange={() => onChange(n)} className="sr-only" />
              {n}
            </label>
          );
        })}
      </div>
    </div>
  );
}
