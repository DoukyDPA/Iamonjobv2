'use client';

// ════════════════════════════════════════════════════════════════════════════
// Activation d'un compte bénéficiaire par code.
//
// La personne arrive avec le code remis par son conseiller. Elle choisit son
// mot de passe et valide son consentement, sur une seule page. On active côté
// serveur, puis on la connecte et on l'emmène dans l'application.
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { codeToEmail } from '@/lib/beneficiaire-auth';
import {
  Loader2, KeyRound, Lock, AlertCircle, ShieldCheck,
  EyeOff, MapPin, Trash2, ChevronDown, IdCard,
} from 'lucide-react';
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

export default function ActiverPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showMore, setShowMore] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) { setError('Le mot de passe doit faire au moins 8 caractères.'); return; }
    if (password !== confirm) { setError('Les deux mots de passe ne correspondent pas.'); return; }
    if (!consent) { setError('Merci de cocher la case de consentement pour continuer.'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/activation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, password, consent }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "L'activation a échoué."); setLoading(false); return; }

      // Compte créé côté serveur : on connecte la personne avec son code.
      const { user } = await signInWithEmailAndPassword(auth, codeToEmail(code), password);
      await setSessionCookie(user);
      router.push('/');
      router.refresh();
    } catch {
      setError("Un souci est survenu. Réessayez dans un instant.");
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
            <h1 className="mt-3 text-2xl font-extrabold text-teal-800">Activez votre accès</h1>
            <p className="text-sm text-teal-700/80 mt-1">
              Entrez le code remis par votre conseiller et choisissez votre mot de passe.
            </p>
          </div>

          <div className="bg-white border border-cream-200 rounded-2xl shadow-card p-8">
            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field id="code" label="Votre code" icon={KeyRound}
                value={code} onChange={setCode} placeholder="AC-2026-001-K7QD" mono autoCapitalize />
              <Field id="password" label="Choisissez un mot de passe" icon={Lock} type="password"
                value={password} onChange={setPassword} placeholder="8 caractères minimum" autoComplete="new-password" />
              <Field id="confirm" label="Confirmez le mot de passe" icon={Lock} type="password"
                value={confirm} onChange={setConfirm} placeholder="Le même mot de passe" autoComplete="new-password" />

              {/* ── Pédagogie données personnelles ── */}
              <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-4">
                <p className="text-sm font-bold text-teal-800 mb-3">Vos données, en clair</p>

                <ul className="space-y-2.5">
                  <InfoLine icon={IdCard}>
                    <strong>Un code, pas votre nom.</strong> Vous êtes identifié par votre code,
                    jamais par votre état civil. On ne vous demande aucune adresse email.
                  </InfoLine>
                  <InfoLine icon={EyeOff}>
                    <strong>Votre CV ne part pas tout de suite.</strong> À la première étape, il
                    devient un simple texte que vous relisez. Un bouton retire nom, e-mail et
                    téléphone en un clic, avant toute analyse.
                  </InfoLine>
                  <InfoLine icon={MapPin}>
                    <strong>Analyse en Europe.</strong> Quand vous lancez l'analyse, le texte est
                    traité par une intelligence artificielle française (Mistral). Aucun envoi vers
                    Google pour votre compte.
                  </InfoLine>
                  <InfoLine icon={Trash2}>
                    <strong>Vous gardez la main.</strong> Votre CV reste sur votre compte,
                    accessible par vous. Vous pouvez le supprimer quand vous voulez.
                  </InfoLine>
                </ul>

                <button
                  type="button"
                  onClick={() => setShowMore((v) => !v)}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-900"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${showMore ? 'rotate-180' : ''}`} />
                  {showMore ? 'Réduire' : 'En savoir plus'}
                </button>

                {showMore && (
                  <div className="mt-3 pt-3 border-t border-teal-100 space-y-2.5 text-sm text-teal-800/90">
                    <p>
                      <strong>Qui voit votre dossier.</strong> Votre conseiller n'y accède qu'avec
                      l'accord que vous donnez ici. Vous pouvez le retirer à tout moment, et
                      l'accès s'arrête.
                    </p>
                    <p>
                      <strong>Conservation.</strong> Votre texte est enregistré de façon chiffrée.
                      Il disparaît dès que vous supprimez votre compte.
                    </p>
                    <p>
                      <strong>Usage.</strong> Vos données servent seulement à votre accompagnement.
                      Elles ne sont ni revendues, ni utilisées à des fins publicitaires.
                    </p>
                    <p>
                      <strong>Vos droits.</strong> Accès, rectification, effacement, portabilité.
                      Pour les exercer, écrivez à{' '}
                      <a href="mailto:contact@cbe-sud94.org" className="text-teal-700 underline">contact@cbe-sud94.org</a>.
                      Détails dans la{' '}
                      <Link href="/confidentialite" className="text-teal-700 underline">politique de confidentialité</Link>.
                    </p>
                  </div>
                )}
              </div>

              <label className="flex items-start gap-3 p-3 bg-cream-50/60 border border-cream-200 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-teal-600"
                />
                <span className="text-sm text-teal-800/90 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" aria-hidden="true" />
                  J'ai lu ces informations et j'autorise l'utilisation de mon CV et de mes données
                  pour l'analyse, les pistes métier et les candidatures, dans le cadre de mon
                  accompagnement.
                </span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 disabled:bg-teal-200 disabled:cursor-not-allowed transition-all shadow-soft focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Activer mon accès
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-teal-700/80">
              Déjà activé ?{' '}
              <Link href="/acces" className="text-teal-700 hover:text-teal-900 hover:underline font-semibold">
                Connectez-vous
              </Link>
            </p>
          </div>

          <p className="mt-4 text-center text-xs text-teal-700/60">
            🔒 Vos données restent confidentielles. Voir notre{' '}
            <Link href="/confidentialite" className="underline hover:text-teal-800">politique de confidentialité</Link>.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function InfoLine({ icon: Icon, children }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-teal-800/90 leading-relaxed">
      <Icon className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}

function Field({ id, label, icon: Icon, value, onChange, type = 'text', placeholder, autoComplete, mono, autoCapitalize }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-teal-800 mb-1">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-500" aria-hidden="true" />
        <input
          id={id}
          type={type}
          required
          value={value}
          autoComplete={autoComplete}
          autoCapitalize={autoCapitalize ? 'characters' : 'off'}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full pl-10 pr-3 py-2.5 border border-cream-300 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent outline-none transition-all bg-cream-50/40 text-teal-900 placeholder:text-teal-700/40 ${mono ? 'font-mono tracking-wide' : ''}`}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}
