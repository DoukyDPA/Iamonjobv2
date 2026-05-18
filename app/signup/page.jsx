'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { Loader2, Mail, Lock, AlertCircle } from 'lucide-react';
import { BrandLogo, CatMascot } from '@/components/brand';
import AccessibilityBar from '@/components/layout/AccessibilityBar';
import Footer from '@/components/layout/Footer';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      const token = await user.getIdToken();
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      router.push('/');
      router.refresh();
    } catch (err) {
      const messages = {
        'auth/email-already-in-use': 'Cet email est déjà utilisé.',
        'auth/weak-password': 'Le mot de passe doit faire au moins 6 caractères.',
        'auth/invalid-email': 'Adresse email invalide.',
      };
      setError(messages[err.code] || err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-100 text-teal-900 flex flex-col">

      {/* Header */}
      <header className="bg-cream-50 border-b border-cream-200">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="focus:outline-none focus:ring-2 focus:ring-teal-500 rounded">
            <BrandLogo size="md" />
          </Link>
          <div className="hidden md:flex">
            <AccessibilityBar />
          </div>
        </div>
      </header>

      {/* Contenu central */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">

          {/* Mascotte + accroche */}
          <div className="flex flex-col items-center text-center mb-6">
            <CatMascot className="w-20 h-20 drop-shadow-soft" />
            <h1 className="mt-3 text-2xl font-extrabold text-teal-800">Créez votre compte</h1>
            <p className="text-sm text-teal-700/80 mt-1">
              C'est gratuit et ça prend moins d'une minute.
            </p>
          </div>

          {/* Carte formulaire */}
          <div className="bg-white border border-cream-200 rounded-2xl shadow-card p-8">
            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-teal-800 mb-1">Email</label>
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
                    placeholder="vous@exemple.fr"
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
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 border border-cream-300 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent outline-none transition-all bg-cream-50/40 text-teal-900 placeholder:text-teal-700/40"
                    placeholder="6 caractères minimum"
                  />
                </div>
                <p className="text-xs text-teal-700/60 mt-1.5">
                  Au moins 6 caractères. Préférez une phrase facile à retenir.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 disabled:bg-teal-200 disabled:cursor-not-allowed transition-all shadow-soft focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Créer mon compte
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-teal-700/80">
              Déjà un compte ?{' '}
              <Link href="/login" className="text-teal-700 hover:text-teal-900 hover:underline font-semibold">
                Se connecter
              </Link>
            </p>
          </div>

          {/* Mentions légales discrètes sous la carte */}
          <p className="mt-4 text-center text-xs text-teal-700/60">
            En créant un compte, vous acceptez nos{' '}
            <Link href="/cgu" className="underline hover:text-teal-800">conditions d'utilisation</Link>
            {' '}et notre{' '}
            <Link href="/confidentialite" className="underline hover:text-teal-800">politique de confidentialité</Link>.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
