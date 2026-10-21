'use client';

// ════════════════════════════════════════════════════════════════════════════
// LetterTools — lettre de motivation affichée, avec ce qu'il faut pour la
// récupérer sans savoir sélectionner du texte à la souris :
//   « Copier la lettre », « Télécharger en Word », « Modifier la lettre ».
// La modification se fait dans l'outil ; `onSave` décide où l'enregistrer
// (candidature en base, ou simple état de la page).
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Copy, Check, FileDown, Pencil, Loader2 } from 'lucide-react';
import CoverLetterText from './CoverLetterText';
import { downloadDocx, plainLetter } from '@/lib/docx-client';

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Navigateur ancien ou page non sécurisée : méthode de secours.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}

const btn = 'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors';

export default function LetterTools({ text, onSave, filename = 'lettre-de-motivation.docx', className = '' }) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  if (!text) return null;

  async function onCopy() {
    const ok = await copyText(plainLetter(text));
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 2500);
    else setErr('La copie a échoué. Utilisez « Télécharger en Word ».');
  }

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      await onSave?.(draft.trim());
      setEditing(false);
    } catch (e) {
      setErr(e.message || "L'enregistrement a échoué.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      {editing ? (
        <div>
          <label htmlFor="letter-edit" className="block text-sm font-semibold text-teal-800 mb-1">Modifiez votre lettre</label>
          <textarea
            id="letter-edit"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={18}
            className="w-full p-4 text-sm leading-relaxed border border-cream-300 rounded-xl bg-white text-teal-900 focus:ring-2 focus:ring-teal-400 outline-none"
          />
          <div className="mt-2 flex flex-wrap gap-2 justify-end">
            <button type="button" onClick={() => setEditing(false)} disabled={busy} className={`${btn} border-cream-300 bg-white text-teal-700 hover:bg-cream-50`}>Annuler</button>
            <button type="button" onClick={save} disabled={busy || !draft.trim()} className={`${btn} border-teal-600 bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50`}>
              {busy && <Loader2 className="w-4 h-4 animate-spin" />} Enregistrer ma lettre
            </button>
          </div>
        </div>
      ) : (
        <CoverLetterText text={text} className="text-teal-900 text-sm" />
      )}

      {!editing && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={onCopy} className={`${btn} border-teal-600 bg-teal-600 text-white hover:bg-teal-700`}>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Lettre copiée' : 'Copier la lettre'}
          </button>
          <button type="button" onClick={() => downloadDocx(text, filename)} className={`${btn} border-teal-200 bg-white text-teal-800 hover:bg-teal-50`}>
            <FileDown className="w-4 h-4" /> Télécharger en Word
          </button>
          {onSave && (
            <button type="button" onClick={() => { setDraft(plainLetter(text)); setEditing(true); setErr(null); }} className={`${btn} border-teal-200 bg-white text-teal-800 hover:bg-teal-50`}>
              <Pencil className="w-4 h-4" /> Modifier la lettre
            </button>
          )}
        </div>
      )}
      {copied && <p className="mt-2 text-xs text-teal-700" role="status">Collez-la ensuite dans votre message ou votre document (appui long puis « Coller » sur téléphone).</p>}
      {err && <p className="mt-2 text-sm text-rose-600">{err}</p>}
    </div>
  );
}
