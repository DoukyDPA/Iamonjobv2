'use client';

import { useEffect, useState } from 'react';
import { LogOut, Send, Users } from 'lucide-react';
import { BrandLogo } from '../brand';
import { auth } from '@/lib/firebase/client';
import AccessibilityBar from './AccessibilityBar';
import DeleteAccountButton from '../account/DeleteAccountButton';

export default function Header({ user, sessionLabel, onReadRequest }) {
  const initial = (user?.name || user?.email || '?').charAt(0).toUpperCase();
  const displayName = user?.name || user?.email?.split('@')[0] || '';

  // Le lien conseiller n'apparaît que si le compte porte le rôle. On lit le
  // rôle dans le token déjà en mémoire, sans appel réseau.
  const [isConseiller, setIsConseiller] = useState(false);
  useEffect(() => {
    let alive = true;
    auth.currentUser
      ?.getIdTokenResult()
      .then((res) => { if (alive) setIsConseiller(res?.claims?.role === 'conseiller'); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <header className="bg-cream-50 border-b border-cream-200 sticky top-0 z-20">
      <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center gap-6">
        {/* Logo */}
        <a href="/" className="shrink-0 focus:outline-none focus:ring-2 focus:ring-teal-500 rounded">
          <BrandLogo size="md" />
        </a>

        <span className="hidden md:block h-6 w-px bg-cream-300" aria-hidden="true" />

        {/* Salutation */}
        <p className="hidden md:block text-sm text-teal-800 truncate">
          Bonjour <strong className="font-semibold">{displayName}</strong>
          {sessionLabel && <span className="text-teal-700/60"> · {sessionLabel}</span>}
        </p>

        {/* Lien candidatures spontanées */}
        <a
          href="/campagne"
          className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
          Mes candidatures
        </a>

        {/* Lien espace conseiller, réservé au rôle conseiller */}
        {isConseiller && (
          <a
            href="/conseiller"
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            Espace conseiller
          </a>
        )}

        <div className="flex-1" />

        {/* Barre d'accessibilité */}
        <div className="hidden md:flex">
          <AccessibilityBar onReadRequest={onReadRequest} />
        </div>

        {/* Avatar + déconnexion */}
        <div className="flex items-center gap-2">
          <div
            className="w-10 h-10 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center shadow-soft"
            aria-label={`Connecté en tant que ${displayName}`}
            title={user?.email}
          >
            {initial}
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              title={`Déconnexion (${user?.email})`}
              className="p-2 text-teal-700/70 hover:text-teal-900 hover:bg-cream-200 rounded-lg transition-colors"
              aria-label="Se déconnecter"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
          <DeleteAccountButton email={user?.email} />
        </div>
      </div>
    </header>
  );
}
