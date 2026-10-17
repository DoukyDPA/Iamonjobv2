'use client';

// ════════════════════════════════════════════════════════════════════════════
// Envois du conseiller — ce que le conseiller adresse de lui-même à la personne.
//
// Un bouton apparaît pour chaque envoi en attente :
//   « Offre de votre conseiller »
//   « Message de votre conseiller »
//   « Merci de répondre à quelques questions »
// Une offre ou un message est soldé dès qu'il est ouvert ; un questionnaire,
// une fois rempli. Tout reste relisible dans « Tout voir ».
//
// API : /api/envois (GET), /api/envois/[id] (POST vu | reponse | questionnaire).
//
// Props :
//   variant  'sidebar' (colonne de gauche) | 'mobile' (boutons compacts)
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import {
  Briefcase, MessageCircle, ClipboardList, X, ChevronLeft, ChevronRight,
  ExternalLink, Send, CheckCircle2, MapPin, Building2, Inbox, FileSignature, Download, PenLine,
} from 'lucide-react';
import { Button } from './ui';
import { QuestionnaireForm } from './MesQuestionnaires';

const TYPES = {
  offre: { icon: Briefcase, bouton: 'Offre de votre conseiller', court: 'Offre', tone: 'bg-pink-500 hover:bg-pink-600 text-white' },
  message: { icon: MessageCircle, bouton: 'Message de votre conseiller', court: 'Message', tone: 'bg-teal-600 hover:bg-teal-700 text-white' },
  questionnaire: { icon: ClipboardList, bouton: 'Merci de répondre à quelques questions', court: 'Questions', tone: 'bg-amber-500 hover:bg-amber-600 text-white' },
  document: { icon: FileSignature, bouton: 'Document à lire et signer', court: 'Document', tone: 'bg-indigo-600 hover:bg-indigo-700 text-white' },
};

function formatDate(ms) {
  if (!ms) return '';
  try { return new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }); } catch { return ''; }
}

// Un questionnaire attend une réponse, un document en ligne une signature ;
// le reste (offre, message, document papier) est soldé dès l'ouverture.
const enAttente = (e) => {
  if (e.type === 'questionnaire') return e.status !== 'repondu';
  if (e.type === 'document' && e.document?.mode === 'en-ligne') return e.status !== 'repondu';
  return e.status === 'nouveau';
};

export default function EnvoisConseiller({ variant = 'sidebar' }) {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [flash, setFlash] = useState(null);

  async function load() {
    try {
      const res = await fetch('/api/envois');
      if (!res.ok) return;
      setData(await res.json());
    } catch { /* silencieux */ }
  }
  useEffect(() => { load(); }, []);

  const envois = data?.envois || [];
  if (!envois.length) return null;

  const pending = envois.filter(enAttente);
  const parType = ['document', 'offre', 'message', 'questionnaire']
    .map((t) => ({ type: t, items: pending.filter((e) => e.type === t) }))
    .filter((g) => g.items.length);

  function openEnvoi(id) {
    setFlash(null);
    setCurrentId(id);
    setOpen(true);
    const e = envois.find((x) => x.id === id);
    if (e && e.status === 'nouveau') {
      fetch(`/api/envois/${encodeURIComponent(id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'vu' }),
      }).then(load).catch(() => {});
    }
  }
  // Un clic sur un bouton ouvre l'envoi le plus ancien de ce type.
  const openGroup = (g) => openEnvoi(g.items[g.items.length - 1].id);
  const openList = () => { setFlash(null); setCurrentId(null); setOpen(true); };

  const current = currentId ? envois.find((e) => e.id === currentId) : null;

  const buttons = parType.map((g) => {
    const T = TYPES[g.type];
    const Icon = T.icon;
    return variant === 'mobile' ? (
      <button
        key={g.type}
        type="button"
        onClick={() => openGroup(g)}
        className={`relative inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-soft shrink-0 ${T.tone}`}
      >
        <Icon className="w-4 h-4" /> {T.bouton}
        {g.items.length > 1 && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-cream-50">{g.items.length}</span>
        )}
      </button>
    ) : (
      <button
        key={g.type}
        type="button"
        onClick={() => openGroup(g)}
        className={`relative w-full flex items-center gap-2.5 p-3 rounded-xl shadow-card transition-colors text-left animate-fade-in ${T.tone}`}
      >
        <Icon className="w-5 h-5 shrink-0" />
        <span className="flex-1 text-sm font-bold leading-tight">{T.bouton}</span>
        {g.items.length > 1 && (
          <span className="w-5 h-5 rounded-full bg-white/90 text-teal-800 text-[11px] font-bold flex items-center justify-center shrink-0">{g.items.length}</span>
        )}
      </button>
    );
  });

  return (
    <>
      {variant === 'sidebar' ? (
        <div className="mt-6 pt-5 border-t border-cream-200">
          <div className="text-xs font-bold tracking-[0.15em] text-teal-700/70 mb-3">DE VOTRE CONSEILLER</div>
          <div className="space-y-2">{buttons}</div>
          <button type="button" onClick={openList} className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-900 hover:underline">
            <Inbox className="w-3.5 h-3.5" /> Tout voir ({envois.length})
          </button>
        </div>
      ) : (
        <>
          {buttons}
          {!buttons.length && (
            <button type="button" onClick={openList} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-teal-200 text-teal-800 text-xs font-semibold shadow-soft shrink-0">
              <Inbox className="w-4 h-4" /> De mon conseiller
            </button>
          )}
        </>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-900/50 animate-fade-in"
          role="dialog" aria-modal="true" aria-labelledby="envois-title"
          onClick={() => setOpen(false)}
        >
          <div className="relative w-full max-w-2xl max-h-[92vh] bg-white border border-cream-200 rounded-2xl shadow-card overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-cream-200 bg-teal-50/60 flex items-start gap-3">
              {current ? (
                <button type="button" onClick={() => setCurrentId(null)} aria-label="Retour à la liste" className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-teal-700 hover:bg-cream-200/70">
                  <ChevronLeft className="w-5 h-5" />
                </button>
              ) : (
                <Inbox className="w-6 h-6 text-teal-600 shrink-0 mt-0.5" aria-hidden="true" />
              )}
              <div className="flex-1 min-w-0">
                <h2 id="envois-title" className="text-lg font-bold text-teal-800">
                  {current ? TYPES[current.type].bouton : 'De votre conseiller'}
                </h2>
                <p className="text-sm text-teal-700/80 mt-0.5">
                  {current ? `Envoyé le ${formatDate(current.createdAt)}` : 'Les offres, messages et questionnaires que votre conseiller vous a adressés.'}
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-teal-700 hover:bg-cream-200/70">
                <X className="w-5 h-5" />
              </button>
            </div>

            {current ? (
              current.type === 'document' ? (
                <DocumentEnvoi
                  envoi={current}
                  doc={data.documents?.[current.document?.id]}
                  onSigned={async () => { await load(); setCurrentId(null); setFlash('Merci, votre signature est enregistrée et transmise à votre conseiller.'); }}
                />
              ) : current.type === 'questionnaire' ? (
                <QuestionnaireEnvoi
                  envoi={current}
                  questionnaire={data.questionnaires?.[current.questionnaire?.id]}
                  onDone={async (created) => {
                    await load();
                    setCurrentId(null);
                    setFlash(created ? 'Merci, vos réponses sont envoyées à votre conseiller.' : 'Vos corrections sont enregistrées.');
                  }}
                />
              ) : (
                <MessageEnvoi
                  envoi={current}
                  onReplied={async () => { await load(); setCurrentId(null); setFlash('Votre réponse est partie chez votre conseiller.'); }}
                />
              )
            ) : (
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-2 iamj-scrollbar">
                {flash && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-teal-50 border border-teal-200 text-sm text-teal-800 mb-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> {flash}
                  </div>
                )}
                {envois.map((e) => {
                  const T = TYPES[e.type];
                  const Icon = T.icon;
                  const titre = e.type === 'offre' ? e.offre?.intitule : e.type === 'questionnaire' ? e.questionnaire?.titre : e.type === 'document' ? e.document?.titre : (e.texte || '').slice(0, 80);
                  const attente = enAttente(e);
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => openEnvoi(e.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${attente ? 'border-pink-300 bg-pink-50/50 hover:bg-pink-50' : 'border-cream-200 bg-white hover:bg-teal-50/50'}`}
                    >
                      <span className="w-9 h-9 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-teal-700" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-teal-800 truncate">{T.court} · {titre}</span>
                        <span className="block text-xs text-teal-700/70">
                          {formatDate(e.createdAt)} · {e.status === 'repondu' ? (e.type === 'questionnaire' ? 'Répondu' : e.type === 'document' ? 'Signé' : 'Vous avez répondu') : attente ? (e.type === 'document' ? 'À signer' : 'À ouvrir') : 'Lu'}
                        </span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-teal-600 shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// Offre ou message : contenu + réponse libre au conseiller.
function MessageEnvoi({ envoi, onReplied }) {
  const [texte, setTexte] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const o = envoi.offre;

  async function send() {
    if (!texte.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/envois/${encodeURIComponent(envoi.id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reponse', texte }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "L'envoi a échoué.");
      await onReplied();
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 iamj-scrollbar">
      {o && (
        <div className="rounded-xl border border-pink-200 bg-pink-50/40 p-4">
          <h3 className="text-base font-bold text-teal-900">{o.intitule}</h3>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-teal-700/80">
            {o.entreprise && <span className="inline-flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{o.entreprise}</span>}
            {o.lieu && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{o.lieu}</span>}
          </div>
          {o.url && (
            <a href={o.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700">
              Voir l'offre <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      )}
      {envoi.texte && (
        <div>
          {o && <div className="text-xs font-bold text-teal-800 uppercase tracking-wider mb-1">Le mot de votre conseiller</div>}
          <p className="text-sm text-teal-900 whitespace-pre-wrap leading-relaxed">{envoi.texte}</p>
        </div>
      )}

      {envoi.reponse?.texte ? (
        <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 mb-1">
            <CheckCircle2 className="w-4 h-4" /> Votre réponse · {formatDate(envoi.reponduAt)}
          </div>
          <p className="text-sm text-teal-800 whitespace-pre-wrap">{envoi.reponse.texte}</p>
        </div>
      ) : (
        <div>
          <label htmlFor="envoi-reponse" className="block text-sm font-semibold text-teal-800 mb-1.5">Répondre à mon conseiller</label>
          <textarea
            id="envoi-reponse"
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder={o ? "Cette offre vous intéresse ? Vous avez postulé ? Dites-le à votre conseiller…" : 'Votre réponse…'}
            className="w-full p-3 text-sm rounded-lg border border-teal-200 bg-white outline-none focus:ring-2 focus:ring-teal-400 placeholder:text-teal-700/40"
          />
          {error && <p className="text-sm text-rose-600 mt-1">{error}</p>}
          <div className="mt-2">
            <Button onClick={send} loading={sending} disabled={!texte.trim()} icon={Send}>Envoyer</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionnaireEnvoi({ envoi, questionnaire, onDone }) {
  if (!questionnaire) {
    return <p className="px-6 py-8 text-sm text-teal-700/80">Ce questionnaire n'est plus disponible.</p>;
  }
  if (envoi.importe) {
    return <p className="px-6 py-8 text-sm text-teal-700/80">Ce questionnaire a déjà été transmis à votre conseiller.</p>;
  }
  return (
    <>
      {(envoi.texte || questionnaire.intro) && (
        <div className="px-6 pt-4 text-sm text-teal-800/90 space-y-1">
          {envoi.texte && <p className="whitespace-pre-wrap"><strong>Votre conseiller : </strong>{envoi.texte}</p>}
          {questionnaire.intro && <p className="text-teal-700/70">{questionnaire.intro}</p>}
        </div>
      )}
      <div className="px-6 pt-3 text-base font-bold text-teal-800">{questionnaire.titre}</div>
      <QuestionnaireForm
        key={envoi.id}
        questionnaire={questionnaire}
        initial={envoi.answers || {}}
        dejaRempli={envoi.status === 'repondu'}
        submitUrl={`/api/envois/${encodeURIComponent(envoi.id)}`}
        buildBody={(answers) => ({ action: 'questionnaire', answers })}
        onDone={onDone}
      />
    </>
  );
}

// Document : texte et/ou fichier à télécharger, puis signature en ligne
// (« J'ai lu et j'accepte », sous le code) ou rappel de la signature papier.
function DocumentEnvoi({ envoi, doc, onSigned }) {
  const [ok, setOk] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  if (!doc) return <p className="px-6 py-8 text-sm text-teal-700/80">Ce document n'est plus disponible. Parlez-en à votre conseiller.</p>;

  async function signer() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/envois/${encodeURIComponent(envoi.id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'signer' }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'La signature a échoué.');
      await onSigned();
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 iamj-scrollbar">
      <div>
        <h3 className="text-base font-bold text-teal-900">{doc.titre}</h3>
        {doc.description && <p className="text-sm text-teal-700/80 mt-1">{doc.description}</p>}
        {envoi.texte && <p className="text-sm text-teal-800 mt-2 whitespace-pre-wrap"><strong>Votre conseiller : </strong>{envoi.texte}</p>}
      </div>
      {doc.fichier?.downloadUrl && (
        <a href={doc.fichier.downloadUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-teal-200 bg-white text-teal-800 text-sm font-semibold hover:bg-teal-50">
          <Download className="w-4 h-4" /> Ouvrir le document ({doc.fichier.name})
        </a>
      )}
      {doc.texte && (
        <div className="rounded-xl border border-cream-200 bg-cream-50/60 p-4 text-sm text-teal-900 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto iamj-scrollbar">{doc.texte}</div>
      )}

      {envoi.signature ? (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-teal-50 border border-teal-200 text-sm text-teal-800">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          {envoi.signature.mode === 'papier' ? 'Signé avec votre conseiller' : 'Vous avez signé ce document'}{envoi.signature.at ? ` le ${formatDate(envoi.signature.at)}` : ''}.
        </div>
      ) : doc.mode === 'papier' ? (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
          <PenLine className="w-4 h-4 shrink-0 mt-0.5" />
          Prenez le temps de le lire. Vous le signerez sur papier avec votre conseiller, lors de votre prochain rendez-vous.
        </div>
      ) : (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
          <label className="flex items-start gap-2 text-sm text-teal-900 cursor-pointer">
            <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} className="accent-teal-600 mt-0.5" />
            <span>J'ai lu ce document et je l'accepte.</span>
          </label>
          <p className="text-[11px] text-teal-700/60 mt-1 ml-6">Votre accord est enregistré sous votre code, avec la date. Aucun nom n'est demandé.</p>
          {error && <p className="text-sm text-rose-600 mt-2">{error}</p>}
          <div className="mt-3">
            <Button onClick={signer} loading={sending} disabled={!ok} icon={PenLine}>Je signe</Button>
          </div>
        </div>
      )}
    </div>
  );
}
