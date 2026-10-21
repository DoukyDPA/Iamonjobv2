'use client';

// ════════════════════════════════════════════════════════════════════════════
// Onglet « Documents » — fiche d'engagement, charte, règlement…
//
// Bibliothèque partagée avec la structure (PDF ou Word, et/ou un texte), envoi
// à une personne ou à une promo, et suivi des signatures : en ligne par la
// personne (sous son code), ou sur papier, marqué ici par le conseiller.
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FileSignature, Plus, Send, Trash2, Download, X, Loader2, CheckCircle2, Clock, PenLine,
} from 'lucide-react';
import EnvoiModal from './EnvoiModal';
import { Prenom } from './Prenoms';

function formatDate(ms) {
  if (!ms) return '';
  try { return new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; }
}
const input = 'w-full p-2.5 text-sm rounded-lg border border-teal-200 bg-white outline-none focus:ring-2 focus:ring-teal-400 placeholder:text-teal-700/40';

export default function DocumentsPanel({ beneficiaires = [], onOpenPersonne }) {
  const [docs, setDocs] = useState(null);
  const [envois, setEnvois] = useState([]);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [envoiDoc, setEnvoiDoc] = useState(null);
  const [suivi, setSuivi] = useState(null); // id du document dont on affiche les signatures

  async function load() {
    try {
      const [d, e] = await Promise.all([
        fetch('/api/conseiller/documents').then((r) => r.json()),
        fetch('/api/conseiller/envois').then((r) => r.json()),
      ]);
      setDocs(d.documents || []);
      setEnvois((e.envois || []).filter((x) => x.type === 'document'));
    } catch (err) { setError(err.message); setDocs([]); }
  }
  useEffect(() => { load(); }, []);

  const parDoc = useMemo(() => {
    const m = new Map();
    for (const e of envois) {
      const id = e.document?.id;
      if (!id) continue;
      if (!m.has(id)) m.set(id, []);
      m.get(id).push(e);
    }
    return m;
  }, [envois]);

  async function ouvrir(d) {
    const r = await fetch(`/api/conseiller/documents/${encodeURIComponent(d.id)}`);
    const x = await r.json().catch(() => ({}));
    if (x.document?.fichier?.downloadUrl) window.open(x.document.fichier.downloadUrl, '_blank', 'noopener');
  }
  async function retirer(d) {
    if (window.confirm && !window.confirm(`Retirer « ${d.titre} » de la bibliothèque ? Les signatures déjà recueillies restent.`)) return;
    const r = await fetch(`/api/conseiller/documents/${encodeURIComponent(d.id)}`, { method: 'DELETE' });
    if (!r.ok) setError((await r.json().catch(() => ({}))).error || 'Échec.');
    await load();
  }
  async function signePapier(id, signe) {
    await fetch(`/api/conseiller/envois/${encodeURIComponent(id)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'signe-papier', signe }),
    });
    await load();
  }

  const benById = new Map(beneficiaires.map((b) => [b.id, b]));

  return (
    <section aria-labelledby="docs-title">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 id="docs-title" className="text-xl font-extrabold text-teal-800">Documents</h2>
          <p className="text-sm text-teal-700/70">Fiche d'engagement, charte… à faire lire et signer en début de parcours. Partagés avec votre structure.</p>
        </div>
        <button onClick={() => setCreating(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold text-sm hover:bg-teal-700">
          <Plus className="w-4 h-4" /> Ajouter un document
        </button>
      </div>
      {error && <p className="text-sm text-rose-600 mb-3">{error}</p>}

      {!docs ? (
        <div className="bg-white border border-cream-200 rounded-2xl shadow-card p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>
      ) : docs.length === 0 ? (
        <div className="bg-white border border-cream-200 rounded-2xl shadow-card p-8 text-center">
          <FileSignature className="w-10 h-10 text-teal-400 mx-auto mb-3" />
          <p className="text-teal-800 font-semibold">Aucun document pour l'instant</p>
          <p className="text-sm text-teal-700/70 mt-1">Déposez votre fiche d'engagement (PDF ou Word) ou écrivez-en le texte, puis envoyez-la à une promo.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map((d) => {
            const liste = parDoc.get(d.id) || [];
            const signes = liste.filter((e) => e.signature).length;
            const ouvert = suivi === d.id;
            return (
              <article key={d.id} className="bg-white border border-cream-200 rounded-2xl shadow-card">
                <div className="px-4 py-3 flex flex-wrap items-center gap-3">
                  <FileSignature className="w-5 h-5 text-indigo-600 shrink-0" />
                  <div className="flex-1 min-w-[200px]">
                    <div className="text-sm font-semibold text-teal-900">{d.titre}</div>
                    <div className="text-[11px] text-teal-700/60">
                      {d.mode === 'papier' ? 'Signature papier' : 'Signature en ligne'}
                      {d.fichier ? ` · ${d.fichier.name}` : ' · texte'}
                      {liste.length ? ` · ${signes}/${liste.length} signé(s)` : ' · pas encore envoyé'}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {d.fichier && (
                      <button onClick={() => ouvrir(d)} title="Ouvrir" className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-cream-200 text-teal-700 hover:bg-teal-50"><Download className="w-4 h-4" /></button>
                    )}
                    {liste.length > 0 && (
                      <button onClick={() => setSuivi(ouvert ? null : d.id)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-cream-200 text-xs font-semibold text-teal-700 hover:bg-teal-50">
                        {ouvert ? 'Masquer' : 'Signatures'}
                      </button>
                    )}
                    {d.mine && (
                      <button onClick={() => retirer(d)} title="Retirer" className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-rose-100 text-rose-600 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></button>
                    )}
                    <button onClick={() => setEnvoiDoc(d.id)} disabled={!beneficiaires.length} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 disabled:bg-teal-200">
                      <Send className="w-3.5 h-3.5" /> Envoyer
                    </button>
                  </div>
                </div>
                {ouvert && (
                  <ul className="border-t border-cream-100 divide-y divide-cream-100">
                    {liste.sort((a, b) => String(a.beneficiaireCode).localeCompare(String(b.beneficiaireCode))).map((e) => (
                      <li key={e.id} className="px-4 py-2 flex flex-wrap items-center gap-3 text-sm">
                        <button onClick={() => benById.get(e.beneficiaireId) && onOpenPersonne?.(benById.get(e.beneficiaireId))} className="font-mono font-semibold text-teal-800 hover:underline">{e.beneficiaireCode}<Prenom code={e.beneficiaireCode} /></button>
                        {e.signature ? (
                          <span className="inline-flex items-center gap-1 text-teal-700 text-xs"><CheckCircle2 className="w-3.5 h-3.5" /> Signé {e.signature.mode === 'papier' ? 'sur papier' : 'en ligne'} le {formatDate(e.signature.at)}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700 text-xs"><Clock className="w-3.5 h-3.5" /> {e.status === 'vu' ? 'Lu, non signé' : 'Pas encore ouvert'} · envoyé le {formatDate(e.createdAt)}</span>
                        )}
                        {d.mode === 'papier' && e.signature?.mode !== 'en-ligne' && (
                          <button onClick={() => signePapier(e.id, !e.signature)} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline">
                            <PenLine className="w-3.5 h-3.5" /> {e.signature ? 'Annuler « signé »' : 'Marquer signé'}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-teal-700/60 mt-3">
        Signature en ligne : la personne coche « J'ai lu et j'accepte », on garde son code et la date, sans nom. Signature papier : elle signe avec vous, vous cochez « Marquer signé » ; l'original reste à la structure.
      </p>

      {creating && <NouveauDocument onClose={() => setCreating(false)} onSaved={async () => { setCreating(false); await load(); }} />}
      {envoiDoc && <EnvoiModal beneficiaires={beneficiaires} preset={{ type: 'document', documentId: envoiDoc }} onClose={() => setEnvoiDoc(null)} onSent={load} />}
    </section>
  );
}

function NouveauDocument({ onClose, onSaved }) {
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [texte, setTexte] = useState('');
  const [mode, setMode] = useState('en-ligne');
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('titre', titre);
      fd.append('description', description);
      fd.append('texte', texte);
      fd.append('mode', mode);
      if (file) fd.append('file', file);
      const r = await fetch('/api/conseiller/documents', { method: 'POST', body: fd });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "L'enregistrement a échoué.");
      await onSaved();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-900/50" role="dialog" aria-modal="true" aria-labelledby="newdoc-title" onClick={() => !saving && onClose()}>
      <div className="w-full max-w-xl max-h-[92vh] bg-white border border-cream-200 rounded-2xl shadow-card overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-cream-200 bg-teal-50/60 flex items-start gap-3">
          <div className="flex-1">
            <h2 id="newdoc-title" className="text-lg font-bold text-teal-800">Ajouter un document</h2>
            <p className="text-sm text-teal-700/80 mt-0.5">Il rejoint la bibliothèque de votre structure.</p>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-teal-700 hover:bg-cream-200/70"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 iamj-scrollbar">
          <label className="block">
            <span className="block text-sm font-semibold text-teal-800 mb-1">Titre *</span>
            <input value={titre} onChange={(e) => setTitre(e.target.value)} maxLength={160} className={input} placeholder="Fiche d'engagement PROMO 45+" />
          </label>
          <label className="block">
            <span className="block text-sm font-semibold text-teal-800 mb-1">Présentation</span>
            <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={600} className={input} placeholder="Ce que vous vous engagez à faire pendant les six semaines." />
          </label>
          <div>
            <span className="block text-sm font-semibold text-teal-800 mb-1">Fichier (PDF ou Word, 5 Mo maximum)</span>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm" />
          </div>
          <label className="block">
            <span className="block text-sm font-semibold text-teal-800 mb-1">Ou le texte du document</span>
            <textarea value={texte} onChange={(e) => setTexte(e.target.value)} rows={6} maxLength={20000} className={input} placeholder="Facultatif si vous joignez un fichier. Affiché à la personne avant la signature." />
          </label>
          <fieldset>
            <legend className="text-sm font-semibold text-teal-800 mb-1">Signature</legend>
            <label className="flex items-start gap-2 text-sm text-teal-800 mb-1">
              <input type="radio" checked={mode === 'en-ligne'} onChange={() => setMode('en-ligne')} className="accent-teal-600 mt-0.5" />
              <span>En ligne <span className="text-teal-700/60">(« J'ai lu et j'accepte », sous le code, sans nom)</span></span>
            </label>
            <label className="flex items-start gap-2 text-sm text-teal-800">
              <input type="radio" checked={mode === 'papier'} onChange={() => setMode('papier')} className="accent-teal-600 mt-0.5" />
              <span>Sur papier avec vous <span className="text-teal-700/60">(vous la marquez signée ensuite)</span></span>
            </label>
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
