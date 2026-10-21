'use client';

// Page CV : IAMONCV intégré comme fonctionnalité d'IAMONJOB.
//
// IAMONCV reste une page autonome (public/iamoncv.html), affichée ici dans un
// cadre same-origin. Autour, on met l'en-tête et le pied de page du site : on
// reste donc bien « sur le même site », avec les liens légaux et l'identité
// IAMONJOB. L'iframe partage l'origine, donc le cookie de session part avec les
// appels à /api/cv-assistant (Mistral) sans configuration.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default function CvPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.push('/login');
        return;
      }

      // Renouvelle le cookie de session (le token Firebase expire après 1h),
      // pour que les appels IA de l'iframe restent authentifiés.
      try {
        const token = await firebaseUser.getIdToken();
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
      } catch {
        /* on continue : la session en cours reste valable un moment */
      }

      setUser({
        email: firebaseUser.email,
        id: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || '',
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Le cookie de session ne dure qu'une heure. Une séance de CV peut durer plus :
  // on le renouvelle toutes les 40 minutes, et à la demande d'IAMONCV quand un
  // enregistrement reçoit un refus de session (message same-origin uniquement).
  useEffect(() => {
    async function refreshSession() {
      const u = auth.currentUser;
      if (!u) return false;
      try {
        const token = await u.getIdToken(true);
        const res = await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        return res.ok;
      } catch {
        return false;
      }
    }
    const timer = setInterval(refreshSession, 40 * 60 * 1000);
    async function onMessage(ev) {
      if (ev.origin !== window.location.origin) return;
      if (ev.data?.type !== 'iamoncv-refresh-session') return;
      const ok = await refreshSession();
      ev.source?.postMessage({ type: 'iamoncv-session-refreshed', ok }, window.location.origin);
    }
    window.addEventListener('message', onMessage);
    return () => { clearInterval(timer); window.removeEventListener('message', onMessage); };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-cream-100">
      <Header user={user} sessionLabel="Création de CV" />

      <main className="flex-1 flex flex-col">
        <iframe
          src="/iamoncv.html"
          title="IAMONCV — création de votre CV"
          allow="microphone"
          className="w-full border-0"
          style={{ height: 'calc(100vh - 4rem)' }}
        />
      </main>

      <Footer />
    </div>
  );
}
