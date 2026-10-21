'use client';

// ════════════════════════════════════════════════════════════════════════════
// Onglet « Équipe » — réservé au responsable de structure.
//
// Inviter un conseiller par son e-mail (il crée son accès lui-même), retirer
// l'accès d'un salarié qui part (ses dossiers passent d'abord à un collègue),
// réattribuer des dossiers, nommer un autre responsable. Sans informaticien.
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { Loader2, UserPlus, Mail, X, ShieldCheck, UserMinus, ArrowRightLeft, Crown } from 'lucide-react';

const fmt = (ms) => (ms ? new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'jamais');

async function post(body) {
  const r = await fetch('/api/conseiller/equipe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Action impossible.');
  return d;
}

export default function EquipePanel({ onChanged }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [depart, setDepart] = useState(null); // membre qui part
  const [versUid, setVersUid] = useState('');

  async function load() {
    try {
      const r = await fetch('/api/conseiller/equipe');
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Chargement impossible.');
      setData(d);
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function run(body, ok) {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const d = await post(body);
      setMsg(typeof ok === 'function' ? ok(d) : ok);
      await load();
      await onChanged?.();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (!data && !error) return <Loader2 className="w-6 h-6 animate-spin text-teal-600" />;
  if (!data?.responsable) return <p className="text-sm text-teal-700">{error || 'Réservé au responsable de la structure.'}</p>;

  const autres = (uid) => data.membres.filter((m) => m.uid !== uid);

  return (
    <section aria-labelledby="equipe-title" className="space-y-5">
      <div>
        <h2 id="equipe-title" className="text-xl font-extrabold text-teal-800">Équipe{data.structure?.nom ? ` · ${data.structure.nom}` : ''}</h2>
        <p className="text-sm text-teal-700/70">Vous êtes responsable : vous invitez vos conseillers, retirez un accès au départ d'un salarié et réattribuez ses dossiers.</p>
      </div>

      {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}
      {msg && <p className="text-sm text-teal-800 bg-teal-50 border border-teal-200 rounded-xl px-3 py-2" role="status">{msg}</p>}

      {/* Inviter */}
      <div className="bg-white border border-cream-200 rounded-2xl shadow-card p-4">
        <h3 className="font-bold text-teal-800 flex items-center gap-2"><UserPlus className="w-4 h-4" /> Inviter un conseiller</h3>
        <form
          className="mt-2 flex flex-wrap gap-2"
          onSubmit={async (e) => { e.preventDefault(); if (await run({ action: 'inviter', email }, `Invitation enregistrée pour ${email}. Un e-mail lui explique comment créer son accès.`)) setEmail(''); }}
        >
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom.nom@structure.fr" className="flex-1 min-w-[14rem] p-2.5 text-sm rounded-lg border border-teal-200" />
          <button disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold text-sm hover:bg-teal-700 disabled:bg-teal-200">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Inviter
          </button>
        </form>
        <p className="text-xs text-teal-700/70 mt-1.5">La personne va sur la connexion conseiller, crée son accès avec cette adresse, et rejoint votre structure.</p>
        {data.structure.invitations.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {data.structure.invitations.map((e) => (
              <li key={e} className="inline-flex items-center gap-1.5 text-xs rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-amber-900">
                <Mail className="w-3.5 h-3.5" /> {e} <span className="text-amber-700/70">· en attente</span>
                <button onClick={() => run({ action: 'annuler', email: e }, 'Invitation annulée.')} aria-label={`Annuler l'invitation de ${e}`} className="ml-1 hover:text-rose-600"><X className="w-3.5 h-3.5" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Membres */}
      <div className="bg-white border border-cream-200 rounded-2xl shadow-card overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="bg-cream-50 text-teal-700/70 text-left text-xs uppercase tracking-wide">
              <th className="px-4 py-3">Conseiller</th>
              <th className="px-4 py-3">Dossiers</th>
              <th className="px-4 py-3">Dernière visite</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.membres.map((m) => (
              <tr key={m.uid} className="border-t border-cream-100">
                <td className="px-4 py-3">
                  <div className="font-semibold text-teal-900 flex items-center gap-1.5">
                    {m.prenom || m.email}
                    {m.responsable && <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5"><Crown className="w-3 h-3" /> responsable</span>}
                    {m.uid === data.moi && <span className="text-[10px] text-teal-700/60">(vous)</span>}
                  </div>
                  {m.prenom && <div className="text-xs text-teal-700/70">{m.email}</div>}
                </td>
                <td className="px-4 py-3">{m.dossiers}</td>
                <td className="px-4 py-3 text-xs">{fmt(m.lastSeenAt)}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {m.uid !== data.moi && (
                    <>
                      <button onClick={() => run({ action: 'responsable', email: m.email, oui: !m.responsable }, m.responsable ? 'Rôle de responsable retiré.' : `${m.email} est maintenant responsable.`)} disabled={busy} className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline mr-3">
                        <ShieldCheck className="w-3.5 h-3.5" /> {m.responsable ? 'Retirer responsable' : 'Nommer responsable'}
                      </button>
                      <button onClick={() => { setDepart(m); setVersUid(''); }} disabled={busy} className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:underline">
                        <UserMinus className="w-3.5 h-3.5" /> Retirer l'accès
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-teal-700/70">Un conseiller apparaît ici après sa première visite de l'espace conseiller.</p>

      {/* Départ d'un salarié */}
      {depart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-900/50" role="dialog" aria-modal="true" aria-labelledby="depart-title" onClick={() => !busy && setDepart(null)}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-card p-6" onClick={(e) => e.stopPropagation()}>
            <h2 id="depart-title" className="text-lg font-bold text-teal-800">Retirer l'accès de {depart.prenom || depart.email}</h2>
            <p className="text-sm text-teal-700/80 mt-1">
              Sa connexion est coupée et son adresse ne pourra plus entrer, même si son domaine est autorisé.
              {depart.dossiers > 0 && <> Ses <strong>{depart.dossiers} dossiers</strong> passent d'abord au collègue choisi, avec leurs fiches et leurs messages. Les personnes accompagnées ne perdent rien.</>}
            </p>
            {depart.dossiers > 0 && (
              <select value={versUid} onChange={(e) => setVersUid(e.target.value)} className="mt-4 w-full p-2.5 text-sm rounded-lg border border-teal-200 bg-white">
                <option value="">Qui reprend ses dossiers ?</option>
                {autres(depart.uid).map((c) => <option key={c.uid} value={c.uid}>{c.prenom ? `${c.prenom} · ` : ''}{c.email}</option>)}
              </select>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setDepart(null)} disabled={busy} className="px-4 py-2 rounded-xl border border-cream-200 text-teal-700 font-semibold">Annuler</button>
              <button
                disabled={busy || (depart.dossiers > 0 && !versUid)}
                onClick={async () => { if (await run({ action: 'retirer', uid: depart.uid, versUid }, (d) => `Accès retiré${d.moved ? `, ${d.moved} dossier(s) réattribué(s)` : ''}.`)) setDepart(null); }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 disabled:bg-rose-200"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />} Retirer l'accès
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Réattribution simple (congé, réorganisation) */}
      <Reattribuer membres={data.membres} busy={busy} onRun={run} />
    </section>
  );
}

function Reattribuer({ membres, busy, onRun }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  return (
    <div className="bg-white border border-cream-200 rounded-2xl shadow-card p-4">
      <h3 className="font-bold text-teal-800 flex items-center gap-2"><ArrowRightLeft className="w-4 h-4" /> Réattribuer tous les dossiers d'un conseiller</h3>
      <p className="text-xs text-teal-700/70 mt-1">Pour un congé long ou une réorganisation. L'accès du conseiller n'est pas touché.</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select value={from} onChange={(e) => setFrom(e.target.value)} className="p-2 text-sm rounded-lg border border-teal-200 bg-white">
          <option value="">De…</option>
          {membres.filter((m) => m.dossiers > 0).map((m) => <option key={m.uid} value={m.uid}>{m.prenom || m.email} ({m.dossiers})</option>)}
        </select>
        <select value={to} onChange={(e) => setTo(e.target.value)} className="p-2 text-sm rounded-lg border border-teal-200 bg-white">
          <option value="">Vers…</option>
          {membres.filter((m) => m.uid !== from).map((m) => <option key={m.uid} value={m.uid}>{m.prenom || m.email}</option>)}
        </select>
        <button
          disabled={busy || !from || !to}
          onClick={async () => { if (window.confirm('Réattribuer tous ses dossiers ?')) { if (await onRun({ action: 'reattribuer', fromUid: from, toUid: to }, (d) => `${d.moved} dossier(s) réattribué(s).`)) { setFrom(''); setTo(''); } } }}
          className="px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold text-sm hover:bg-teal-700 disabled:bg-teal-200"
        >
          Réattribuer
        </button>
      </div>
    </div>
  );
}
