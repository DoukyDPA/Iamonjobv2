'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';

// Bouton « Supprimer mon compte » avec confirmation explicite.
// Effacement total et irréversible : on demande à l'utilisateur de taper
// SUPPRIMER pour éviter tout déclenchement par erreur.
export default function DeleteAccountButton({ email }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const ready = confirmText.trim().toUpperCase() === 'SUPPRIMER';

  async function handleDelete() {
    if (!ready || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Échec de la suppression.');
      }
      // Compte effacé : on renvoie vers la page de connexion.
      window.location.href = '/login';
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Supprimer mon compte"
        aria-label="Supprimer mon compte"
        className="p-2 text-red-600/70 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h2 id="delete-account-title" className="text-lg font-bold text-teal-900">
              Supprimer définitivement mon compte
            </h2>
            <p className="mt-3 text-sm text-teal-800">
              Cette action efface ton compte ({email}), ton CV et toutes tes données.
              Elle est irréversible. Pour confirmer, tape{' '}
              <strong className="font-semibold">SUPPRIMER</strong> ci-dessous.
            </p>

            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="SUPPRIMER"
              autoComplete="off"
              className="mt-4 w-full rounded-lg border border-cream-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />

            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setOpen(false); setConfirmText(''); setError(''); }}
                disabled={busy}
                className="px-4 py-2 text-sm rounded-lg text-teal-800 hover:bg-cream-200 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!ready || busy}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy ? 'Suppression…' : 'Supprimer mon compte'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
