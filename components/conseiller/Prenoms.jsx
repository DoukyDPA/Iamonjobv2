'use client';

// ════════════════════════════════════════════════════════════════════════════
// Prénoms à côté des codes, côté conseiller, sans que le serveur les voie.
//
// Le conseiller choisit son fichier des codes (CSV ou Excel) sur son
// ordinateur. Le fichier est lu ici, dans le navigateur ; seuls les codes et
// les prénoms restent en mémoire. Par défaut, ils disparaissent à la
// fermeture de l'onglet. « Se souvenir sur cet ordinateur » les garde dans ce
// navigateur, pour ce compte conseiller seulement. Rien n'est envoyé.
// La promesse « un code, jamais un nom » tient côté serveur.
// ════════════════════════════════════════════════════════════════════════════

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Contact, Loader2, EyeOff } from 'lucide-react';
import { auth } from '@/lib/firebase/client';
import { readCodesFile } from '@/lib/codes-file';
import { normalizeCode } from '@/lib/beneficiaire-auth';

const Ctx = createContext({ map: {}, label: () => '' });

const keyFor = (uid) => `iamj_prenoms_${uid || 'anon'}`;

export function PrenomsProvider({ children }) {
  const [map, setMap] = useState({});
  const [remember, setRemember] = useState(false);

  // Rechargement : d'abord l'onglet (session), sinon ce navigateur si demandé.
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    try {
      const raw = sessionStorage.getItem(keyFor(uid)) || localStorage.getItem(keyFor(uid));
      if (raw) {
        setMap(JSON.parse(raw) || {});
        setRemember(Boolean(localStorage.getItem(keyFor(uid))));
      }
    } catch { /* stockage indisponible : on reste en mémoire */ }
  }, []);

  const save = (next, keep) => {
    const uid = auth.currentUser?.uid;
    setMap(next);
    setRemember(keep);
    try {
      sessionStorage.setItem(keyFor(uid), JSON.stringify(next));
      if (keep) localStorage.setItem(keyFor(uid), JSON.stringify(next));
      else localStorage.removeItem(keyFor(uid));
    } catch { /* ignoré */ }
  };

  const clear = () => {
    const uid = auth.currentUser?.uid;
    setMap({});
    setRemember(false);
    try { sessionStorage.removeItem(keyFor(uid)); localStorage.removeItem(keyFor(uid)); } catch { /* ignoré */ }
  };

  const label = (code) => map[normalizeCode(code)] || '';

  return <Ctx.Provider value={{ map, label, save, clear, remember }}>{children}</Ctx.Provider>;
}

export const usePrenoms = () => useContext(Ctx);

/** « · Karim B. » à côté d'un code, si le conseiller a chargé son fichier. */
export function Prenom({ code, className = '' }) {
  const { label } = usePrenoms();
  const l = label(code);
  if (!l) return null;
  return <span className={`font-sans font-semibold text-pink-700 ${className}`}> · {l}</span>;
}

/** Barre « Afficher mes prénoms » du tableau de bord. */
export function PrenomsBar() {
  const { map, save, clear, remember } = usePrenoms();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [keep, setKeep] = useState(false);
  const input = useRef(null);
  const count = Object.keys(map).length;

  useEffect(() => { setKeep(remember); }, [remember]);

  async function onFile(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setBusy(true);
    setMsg(null);
    try {
      const { map: m, count: n } = await readCodesFile(f);
      save(m, keep);
      setMsg({ ok: true, text: `${n} prénom${n > 1 ? 's' : ''} affiché${n > 1 ? 's' : ''}. Le fichier n'a pas été envoyé.` });
    } catch (err) {
      setMsg({ ok: false, text: err.message || 'Fichier illisible.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-pink-200 bg-pink-50/50 px-4 py-3">
      <Contact className="w-5 h-5 text-pink-600 shrink-0" aria-hidden="true" />
      <div className="flex-1 min-w-[14rem] text-sm text-teal-900">
        {count > 0
          ? <><strong>{count} prénom{count > 1 ? 's' : ''}</strong> affiché{count > 1 ? 's' : ''} à côté des codes, sur cet écran seulement.</>
          : <>Vous préférez voir des prénoms ? Choisissez votre <strong>fichier des codes</strong> (complété avec les prénoms). Il est lu sur votre ordinateur, jamais envoyé.</>}
        {msg && <span className={`block text-xs mt-0.5 ${msg.ok ? 'text-teal-700' : 'text-rose-600'}`}>{msg.text}</span>}
      </div>
      <label className="inline-flex items-center gap-1.5 text-xs text-teal-800">
        <input
          type="checkbox"
          checked={keep}
          onChange={(e) => { setKeep(e.target.checked); if (count) save(map, e.target.checked); }}
          className="accent-teal-600"
        />
        Se souvenir sur cet ordinateur
      </label>
      <input ref={input} type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={onFile} />
      <button type="button" onClick={() => input.current?.click()} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-pink-300 text-pink-800 text-sm font-semibold hover:bg-pink-50 disabled:opacity-50">
        {busy && <Loader2 className="w-4 h-4 animate-spin" />} {count ? 'Changer de fichier' : 'Afficher mes prénoms'}
      </button>
      {count > 0 && (
        <button type="button" onClick={() => { clear(); setMsg(null); }} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-teal-700 hover:bg-white">
          <EyeOff className="w-4 h-4" /> Masquer
        </button>
      )}
    </div>
  );
}
