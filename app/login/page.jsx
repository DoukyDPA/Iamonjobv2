'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { Loader2, Mail, Lock, AlertCircle, KeyRound, Users } from 'lucide-react';
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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Après connexion, on aiguille selon le rôle : un conseiller arrive sur son
  // espace, tout le monde sinon sur l'accueil.
  async function routeByRole(user) {
    await setSessionCookie(user);
    let role = null;
    try { role = (await user.getIdTokenResult()).claims.role; } catch { /* défaut */ }
    router.push(role === 'conseiller' ? '/conseiller' : '/');
    router.refresh();
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      await routeByRole(user);
    } catch (err) {
      setError(err.code === 'auth/invalid-credential' ? 'Email ou mot de passe incorrect.' : err.message);
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
            <h1 className="mt-3 text-2xl font-extrabold text-teal-800">Bon retour parmi nous !</h1>
            <p className="text-sm text-teal-700/80 mt-1">
              Connectez-vous pour reprendre votre parcours.
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

            <form onSubmit={handleLogin} className="space-y-4">
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

            <div className="mt-6 pt-5 border-t border-cream-200">
              <p className="text-xs font-bold tracking-[0.12em] text-teal-700/60 text-center mb-3">
                PREMIÈRE FOIS ICI ?
              </p>
              <div className="grid gap-2">
                <Link
                  href="/acces"
                  className="flex items-center gap-3 p-3 rounded-xl border border-cream-300 hover:border-teal-300 hover:bg-cream-50 transition-colors"
                >
                  <KeyRound className="w-5 h-5 text-teal-600 shrink-0" />
                  <span className="text-sm">
                    <span className="font-semibold text-teal-800">J'ai un code</span>
                    <span className="block text-xs text-teal-700/70">Vous êtes accompagné par un conseiller.</span>
                  </span>
                </Link>
                <Link
                  href="/conseiller/connexion"
                  className="flex items-center gap-3 p-3 rounded-xl border border-cream-300 hover:border-teal-300 hover:bg-cream-50 transition-colors"
                >
                  <Users className="w-5 h-5 text-teal-600 shrink-0" />
                  <span className="text-sm">
                    <span className="font-semibold text-teal-800">Je suis conseiller</span>
                    <span className="block text-xs text-teal-700/70">Accès réservé aux conseillers autorisés.</span>
                  </span>
                </Link>
              </div>
            </div>
          </div>

          {/* Rassurance RGPD discrète sous la carte */}
          <p className="mt-4 text-center text-xs text-teal-700/60">
            🔒 Vos données restent confidentielles. Voir notre{' '}
            <Link href="/confidentialite" className="underline hover:text-teal-800">
              politique de confidentialité
            </Link>.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
