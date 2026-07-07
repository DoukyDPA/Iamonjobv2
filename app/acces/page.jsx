'use client';

// ════════════════════════════════════════════════════════════════════════════
// Connexion bénéficiaire par code (visites de retour).
//
// La personne entre son code et son mot de passe. En interne, le code devient
// l'adresse email fictive utilisée par Firebase. Si le code n'est pas encore
// activé, on renvoie vers la page d'activation.
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { codeToEmail, isPlausibleCode } from '@/lib/beneficiaire-auth';
import { Loader2, KeyRound, Lock, AlertCircle } from 'lucide-react';
import { BrandLogo, CatMascot } from '@/components/brand';
import AccessibilityBar from '@/components/layout/AccessibilityBar';
import Footer from '@/components/layout/Footer';

async function setSessionCookie(user) {
  const token = await user.getIdToken();
  await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
}

export default function AccesPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!isPlausibleCode(code)) { setError('Code non reconnu. Vérifiez la saisie.'); return; }

    setLoading(true);
    try {
      const { user } = await signInWithEmailAndPassword(auth, codeToEmail(code), password);
      await setSessionCookie(user);
      router.push('/');
      router.refresh();
    } catch (err) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
        setError('Code ou mot de passe incorrect. Première connexion ? Activez votre code.');
      } else {
        setError('Connexion impossible. Réessayez.');
      }
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
            <h1 className="mt-3 text-2xl font-extrabold text-teal-800">Accès accompagné</h1>
            <p className="text-sm text-teal-700/80 mt-1">Entrez votre code et votre mot de passe.</p>
          </div>

          <div className="bg-white border border-cream-200 rounded-2xl shadow-card p-8">
            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="code" className="block text-sm font-semibold text-teal-800 mb-1">Votre code</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-500" aria-hidden="true" />
                  <input
                    id="code"
                    type="text"
                    required
                    value={code}
                    autoCapitalize="characters"
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 border border-cream-300 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent outline-none transition-all bg-cream-50/40 text-teal-900 placeholder:text-teal-700/40 font-mono tracking-wide"
                    placeholder="AC-2026-001-K7QD"
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
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 border border-cream-300 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent outline-none transition-all bg-cream-50/40 text-teal-900 placeholder:text-teal-700/40"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 disabled:bg-teal-200 disabled:cursor-not-allowed transition-all shadow-soft focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Se connecter
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-teal-700/80">
              Première connexion ?{' '}
              <Link href="/activer" className="text-teal-700 hover:text-teal-900 hover:underline font-semibold">
                Activez votre code
              </Link>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
