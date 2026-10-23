'use client';

// ════════════════════════════════════════════════════════════════════════════
// Onglet « Structures » — réservé à l'administrateur de la plateforme
// (adresses listées dans ADMIN_EMAILS).
//
// Créer une structure (une autre association qui utilise l'outil), y nommer
// un ou plusieurs responsables. Chaque responsable invite ensuite ses propres
// conseillers depuis son onglet « Équipe ».
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { Loader2, Building2, Plus, Crown, Mail, X, Pencil, Check } from 'lucide-react';

async function post(body) {
  const r = await fetch('/api/admin/structures', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Action impossible.');
  return d;
}

function CarteStructure({ s, busy, run }) {
  const [email, setEmail] = useState('');
  const [edit, setEdit] = useState(false);
  const [nom, setNom] = useState(s.nom);
  const enAttente = s.invitations.filter((e) => s.responsables.includes(e));
  const actifs = s.responsables.filter((e) => !s.invitations.includes(e));

  return (
    <div className="bg-white border border-cream-200 rounded-2xl shadow-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          {edit ? (
            <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); if (await run({ action: 'renommer', structureId: s.id, nom }, 'Structure renommée.')) setEdit(false); }}>
              <input value={nom} onChange={(e) => setNom(e.target.value)} className="p-1.5 text-sm rounded-lg border border-teal-200" aria-label="Nom de la structure" />
              <button disabled={busy} aria-label="Enregistrer le nom" className="text-teal-700"><Check className="w-4 h-4" /></button>
            </form>
          ) : (
            <h3 className="font-bold text-teal-800 flex items-center gap-2">
              <Building2 className="w-4 h-4" /> {s.nom}
              <button onClick={() => setEdit(true)} aria-label={`Renommer ${s.nom}`} className="text-teal-700/60 hover:text-teal-800"><Pencil className="w-3.5 h-3.5" /></button>
            </h3>
          )}
          <p className="text-xs text-teal-700/60 mt-0.5">Identifiant : {s.id}</p>
        </div>
        <p className="text-xs text-teal-700/80 text-right">
          {s.conseillers ?? '?'} conseiller{s.conseillers > 1 ? 's' : ''}<br />
          {s.beneficiaires ?? '?'} personne{s.beneficiaires > 1 ? 's' : ''} suivie{s.beneficiaires > 1 ? 's' : ''}
        </p>
      </div>

      <div className="mt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700/70">Responsables</p>
        {actifs.length === 0 && enAttente.length === 0 && <p className="text-sm text-amber-800 mt-1">Aucun responsable : personne ne peut inviter de conseillers ici.</p>}
        <ul className="mt-1.5 flex flex-wrap gap-2">
          {actifs.map((e) => (
            <li key={e} className="inline-flex items-center gap-1.5 text-xs rounded-lg border border-teal-200 bg-teal-50 px-2 py-1 text-teal-900">
              <Crown className="w-3.5 h-3.5 text-amber-600" /> {e}
              <button onClick={() => run({ action: 'retirerResponsable', structureId: s.id, email: e }, `${e} n'est plus responsable.`)} aria-label={`Retirer le rôle de responsable à ${e}`} className="ml-1 hover:text-rose-600"><X className="w-3.5 h-3.5" /></button>
            </li>
          ))}
          {enAttente.map((e) => (
            <li key={e} className="inline-flex items-center gap-1.5 text-xs rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-amber-900">
              <Mail className="w-3.5 h-3.5" /> {e} <span className="text-amber-700/70">· invité, pas encore inscrit</span>
              <button onClick={() => run({ action: 'annuler', structureId: s.id, email: e }, 'Invitation annulée.')} aria-label={`Annuler l'invitation de ${e}`} className="ml-1 hover:text-rose-600"><X className="w-3.5 h-3.5" /></button>
            </li>
          ))}
        </ul>
        <form
          className="mt-2 flex flex-wrap gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await run({ action: 'responsable', structureId: s.id, email }, (d) => (d.invite ? `Invitation envoyée à ${email} : à son inscription, il sera responsable de ${s.nom}.` : `${email} est maintenant responsable de ${s.nom}.`))) setEmail('');
          }}
        >
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="responsable@structure.fr" className="flex-1 min-w-[14rem] p-2 text-sm rounded-lg border border-teal-200" />
          <button disabled={busy} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-600 text-white font-semibold text-sm hover:bg-teal-700 disabled:bg-teal-200">
            <Crown className="w-4 h-4" /> Nommer responsable
          </button>
        </form>
      </div>
    </div>
  );
}

export default function StructuresPanel() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);
  const [nom, setNom] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const r = await fetch('/api/admin/structures');
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Chargement impossible.');
      setData(d);
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function run(body, ok) {
    setBusy(true); setError(null); setMsg(null);
    try {
      const d = await post(body);
      setMsg(typeof ok === 'function' ? ok(d) : ok);
      await load();
      return true;
    } catch (e) { setError(e.message); return false; } finally { setBusy(false); }
  }

  if (!data && !error) return <Loader2 className="w-6 h-6 animate-spin text-teal-600" />;
  if (!data?.admin) return <p className="text-sm text-teal-700">{error || "Réservé à l'administrateur de la plateforme."}</p>;

  return (
    <section aria-labelledby="structures-title" className="space-y-5">
      <div>
        <h2 id="structures-title" className="text-xl font-extrabold text-teal-800">Structures</h2>
        <p className="text-sm text-teal-700/70">Vous administrez la plateforme : vous créez les structures qui utilisent IAMONJOB et vous y nommez leurs responsables. Chaque responsable invite ensuite ses conseillers depuis son onglet « Équipe ».</p>
      </div>

      {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}
      {msg && <p className="text-sm text-teal-800 bg-teal-50 border border-teal-200 rounded-xl px-3 py-2" role="status">{msg}</p>}

      <div className="bg-white border border-cream-200 rounded-2xl shadow-card p-4">
        <h3 className="font-bold text-teal-800 flex items-center gap-2"><Plus className="w-4 h-4" /> Ajouter une structure</h3>
        <form className="mt-2 flex flex-wrap gap-2" onSubmit={async (e) => { e.preventDefault(); if (await run({ action: 'creer', nom }, `Structure « ${nom} » créée. Nommez maintenant son responsable.`)) setNom(''); }}>
          <input required value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom de la structure (ex. Mission locale de Créteil)" className="flex-1 min-w-[14rem] p-2.5 text-sm rounded-lg border border-teal-200" />
          <button disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold text-sm hover:bg-teal-700 disabled:bg-teal-200">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Créer
          </button>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {data.structures.map((s) => <CarteStructure key={s.id} s={s} busy={busy} run={run} />)}
      </div>
    </section>
  );
}
