'use client';

// ════════════════════════════════════════════════════════════════════════════
// Accès conseiller — connexion ou première inscription.
//
// Le conseiller entre son email professionnel et un mot de passe. S'il a déjà un
// compte, on le connecte ; sinon on le crée. Dans les deux cas, on demande le
// rôle conseiller au serveur, qui vérifie l'email contre la liste d'autorisation
// (emails ou domaines). Si c'est bon, on rafraîchit le token pour embarquer le
// rôle, on pose le cookie de session, et on file vers l'espace conseiller.
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { Loader2, Mail, Lock, AlertCircle, ShieldCheck } from 'lucide-react';
import { BrandLogo, CatMascot } from '@/components/brand';
import AccessibilityBar from '@/components/layout/AccessibilityBar';
import Footer from '@/components/layout/Footer';

async function setSessionCookie(token) {
  await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
}

export default function ConseillerConnexionPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Connexion, ou création du compte si l'email est inconnu.
      let cred;
      try {
        cred = await signInWithEmailAndPassword(auth, email, password);
      } catch (err) {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          cred = await createUserWithEmailAndPassword(auth, email, password);
        } else {
          throw err;
        }
      }

      // 2. Demande du rôle conseiller (vérif liste d'autorisation côté serveur).
      const token = await cred.user.getIdToken();
      const res = await fetch('/api/conseiller/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        await signOut(auth);
        setError(d.error || "Accès conseiller refusé.");
        setLoading(false);
        return;
      }

      // 3. Token rafraîchi pour embarquer le rôle, puis cookie de session.
      const freshToken = await cred.user.getIdToken(true);
      await setSessionCookie(freshToken);
      router.push('/conseiller');
      router.refresh();
    } catch (err) {
      const messages = {
        'auth/email-already-in-use': 'Cet email a déjà un compte. Vérifiez le mot de passe.',
        'auth/weak-password': 'Le mot de passe doit faire au moins 6 caractères.',
        'auth/invalid-email': 'Adresse email invalide.',
        'auth/wrong-password': 'Mot de passe incorrect.',
      };
      setError(messages[err.code] || 'Connexion impossible. Réessayez.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream-100 text-teal-900 flex flex-col">
      <header className="bg-cream-50 border-b border-cream-200">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="focus:outline-none focus:ring-2 focus:ring-teal-500 rounded">
            <BrandLogo size="md" />
          </Link>
          <div className="hidden md:flex"><AccessibilityBar /></div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center text-center mb-6">
            <CatMascot className="w-20 h-20 drop-shadow-soft" />
            <h1 className="mt-3 text-2xl font-extrabold text-teal-800">Espace conseiller</h1>
            <p className="text-sm text-teal-700/80 mt-1">
              Connectez-vous, ou créez votre accès si c'est la première fois.
            </p>
          </div>

          <div className="bg-white border border-cream-200 rounded-2xl shadow-card p-8">
            <div className="mb-4 flex items-start gap-2 text-xs text-teal-700/80 bg-teal-50/60 border border-teal-100 rounded-xl px-3 py-2">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-teal-600" />
              <span>Accès réservé aux conseillers autorisés par leur structure.</span>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-teal-800 mb-1">Email professionnel</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-500" aria-hidden="true" />
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 border border-cream-300 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent outline-none transition-all bg-cream-50/40 text-teal-900 placeholder:text-teal-700/40"
                    placeholder="vous@structure.fr"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-teal-800 mb-1">Mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-500" aria-hidden="true" />
                  <input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 border border-cream-300 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent outline-none transition-all bg-cream-50/40 text-teal-900 placeholder:text-teal-700/40"
                    placeholder="6 caractères minimum"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 disabled:bg-teal-200 disabled:cursor-not-allowed transition-all shadow-soft focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Accéder à mon espace
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-teal-700/80">
              Vous êtes accompagné ?{' '}
              <Link href="/acces" className="text-teal-700 hover:text-teal-900 hover:underline font-semibold">
                Accès par code
              </Link>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
