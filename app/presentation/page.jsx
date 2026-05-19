'use client';

import { useState } from 'react';
import {
  FileText, Compass, MessageCircle, Briefcase, Star,
  Clock, Shield, Heart, CheckCircle2, Loader2, Send,
  ArrowRight, AlertCircle, Sparkles, Target, Users,
} from 'lucide-react';
import { BrandLogo, CatMascot, BrandArrow } from '@/components/brand';
import Footer from '@/components/layout/Footer';

export const dynamic = 'force-dynamic';

const STEPS = [
  {
    n: 1,
    icon: FileText,
    title: 'Importez votre CV',
    body: 'Lecture automatique en quelques secondes. Vos données restent privées, vous gardez la main dessus.',
  },
  {
    n: 2,
    icon: Compass,
    title: 'Découvrez vos pistes',
    body: '9 métiers possibles, calibrés sur vos compétences réelles : 3 proches, 3 en lien logique, 3 plus créatifs.',
  },
  {
    n: 3,
    icon: MessageCircle,
    title: 'Enquêtez sur un métier',
    body: 'Discutez avec un « professionnel de terrain » virtuel pour comprendre la réalité d\'un poste avant de vous y projeter.',
  },
  {
    n: 4,
    icon: Briefcase,
    title: 'Trouvez de vraies offres',
    body: 'Offres tirées en direct de France Travail, filtrées sur votre métier et votre département.',
  },
  {
    n: 5,
    icon: Star,
    title: 'Préparez votre candidature',
    body: 'Score de compatibilité, lettre de motivation, questions d\'entretien, plan d\'action sur 4 semaines.',
  },
];

const BENEFITS = [
  {
    icon: Clock,
    title: '30 minutes, à votre rythme',
    body: 'Pas besoin de bloquer une demi-journée. Vous pouvez même découper le test sur plusieurs sessions.',
  },
  {
    icon: Sparkles,
    title: 'Un outil pensé pour vous',
    body: 'Conçu avec des conseillers du CBE Sud 94 et leurs publics. On veut savoir si ça vous parle, à vous.',
  },
  {
    icon: Target,
    title: 'Votre avis compte vraiment',
    body: 'Chaque retour oriente la suite. On lit tout, on vous recontacte si on a besoin de creuser un point.',
  },
  {
    icon: Heart,
    title: 'Gratuit, sans pub, à vie',
    body: "Aujourd'hui pour le test, demain pour vous accompagner. L'outil restera gratuit pour les demandeurs d'emploi.",
  },
];

export default function PresentationPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    situation: '',
    heardFrom: '',
    consent: false,
    website: '', // honeypot anti-bot, doit rester vide
  });
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState('');

  const onChange = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (status === 'submitting') return;
    setStatus('submitting');
    setErrorMsg('');
    try {
      const res = await fetch('/api/beta-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'envoi.");
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || "Erreur lors de l'envoi.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-cream-100 text-teal-900">
      {/* ─────────── Header public ─────────── */}
      <header className="bg-cream-50 border-b border-cream-200 sticky top-0 z-30">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between gap-6">
          <a href="/presentation" className="shrink-0 focus:outline-none focus:ring-2 focus:ring-teal-500 rounded">
            <BrandLogo size="md" />
          </a>
          <div className="flex items-center gap-3">
            <a
              href="#formulaire"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-teal-700 hover:text-teal-900 hover:underline"
            >
              Devenir testeur
            </a>
            <a
              href="/login"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-teal-200 text-sm font-semibold text-teal-700 hover:bg-teal-50 hover:border-teal-300 transition-all shadow-soft"
            >
              J'ai déjà un compte
            </a>
          </div>
        </div>
      </header>

      {/* ─────────── Hero ─────────── */}
      <section className="relative overflow-hidden">
        <div className="max-w-[1280px] mx-auto px-6 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
          <div className="space-y-6 animate-fade-in">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 border border-pink-200 text-xs font-bold tracking-wider text-pink-600 uppercase">
              <Sparkles className="w-3.5 h-3.5" /> Version de test — accès gratuit
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-teal-800 leading-tight">
              Aidez-nous à construire l'outil qui vous aurait{' '}
              <span className="text-pink-500">vraiment</span> aidé.
            </h1>
            <p className="text-lg text-teal-800/85 leading-relaxed">
              IAMonJob est un compagnon de recherche d'emploi et de reconversion.
              On l'ouvre maintenant à un petit groupe de testeurs : essayez-le 30 minutes,
              dites-nous ce qui marche et ce qui coince. <strong>Votre retour façonne la version finale</strong>,
              qui restera gratuite pour les demandeurs d'emploi.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href="#formulaire"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-teal-600 text-white font-semibold shadow-card hover:bg-teal-700 transition-all focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2"
              >
                Je deviens testeur <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="#parcours"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-cream-300 text-teal-700 font-semibold hover:border-teal-400 hover:bg-cream-50 transition-all"
              >
                Voir comment ça marche
              </a>
            </div>
            <div className="flex items-center gap-4 pt-2 text-sm text-teal-700/80">
              <span className="inline-flex items-center gap-1.5"><Clock className="w-4 h-4 text-teal-600" /> ~30 min</span>
              <span className="inline-flex items-center gap-1.5"><Shield className="w-4 h-4 text-teal-600" /> Données protégées</span>
              <span className="inline-flex items-center gap-1.5"><Heart className="w-4 h-4 text-pink-500" /> 100% gratuit</span>
            </div>
          </div>

          <div className="relative hidden md:flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-100/40 via-cream-50 to-pink-50 rounded-3xl blur-2xl" aria-hidden="true" />
            <div className="relative bg-white border border-cream-200 rounded-3xl shadow-card p-10 max-w-sm">
              <div className="flex justify-center mb-4">
                <CatMascot className="w-28 h-28" />
              </div>
              <p className="text-center text-teal-800 font-semibold mb-1">
                Bonjour, je suis IAMonJob.
              </p>
              <p className="text-center text-sm text-teal-700/80 leading-relaxed">
                Je lis votre CV, j'explore avec vous des métiers possibles,
                je vous prépare aux entretiens. À votre rythme.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── Bénéfices ─────────── */}
      <section className="bg-white border-y border-cream-200">
        <div className="max-w-[1280px] mx-auto px-6 py-16">
          <div className="text-center mb-12 max-w-2xl mx-auto">
            <h2 className="text-3xl font-extrabold text-teal-800 mb-3">
              Pourquoi rejoindre le test ?
            </h2>
            <p className="text-teal-800/80">
              On ne cherche pas des « bêta testeurs techniques ». On cherche des personnes
              comme vous, qui ont un CV, des questions, et l'envie de partager leur expérience.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {BENEFITS.map((b, i) => {
              const Icon = b.icon;
              return (
                <div
                  key={i}
                  className="bg-cream-50 border border-cream-200 rounded-2xl p-6 hover:shadow-card hover:border-teal-200 transition-all"
                >
                  <div className="w-11 h-11 rounded-xl bg-teal-600/10 border border-teal-200 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-teal-700" />
                  </div>
                  <h3 className="font-bold text-teal-800 mb-2">{b.title}</h3>
                  <p className="text-sm text-teal-800/80 leading-relaxed">{b.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─────────── Le parcours en 5 étapes ─────────── */}
      <section id="parcours" className="bg-cream-100">
        <div className="max-w-[1280px] mx-auto px-6 py-16">
          <div className="text-center mb-12 max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-teal-700/70 uppercase mb-3">
              <BrandArrow className="w-6 h-4" /> Ce que vous allez tester
            </span>
            <h2 className="text-3xl font-extrabold text-teal-800 mb-3">
              Un parcours en 5 étapes, à votre rythme.
            </h2>
            <p className="text-teal-800/80">
              Vous pouvez vous arrêter à n'importe quelle étape, revenir en arrière,
              recommencer avec un autre CV. Rien n'est figé.
            </p>
          </div>

          <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {STEPS.map((s) => {
              const Icon = s.icon;
              return (
                <li
                  key={s.n}
                  className="bg-white border border-cream-200 rounded-2xl p-5 flex flex-col hover:shadow-card hover:border-teal-200 transition-all"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-9 h-9 rounded-full bg-teal-600 text-white text-sm font-extrabold flex items-center justify-center shadow-soft">
                      {s.n}
                    </span>
                    <Icon className="w-5 h-5 text-teal-600/70" />
                  </div>
                  <h3 className="font-bold text-teal-800 mb-2">{s.title}</h3>
                  <p className="text-sm text-teal-800/80 leading-relaxed flex-1">{s.body}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ─────────── Ce qu'on attend de vous ─────────── */}
      <section className="bg-white border-y border-cream-200">
        <div className="max-w-[1280px] mx-auto px-6 py-16 grid lg:grid-cols-2 gap-10 items-start">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-teal-700/70 uppercase mb-3">
              <Users className="w-4 h-4" /> Comment ça se passe
            </span>
            <h2 className="text-3xl font-extrabold text-teal-800 mb-4">
              Trois étapes simples, pas plus.
            </h2>
            <p className="text-teal-800/85 leading-relaxed mb-6">
              On ne vous demande pas de devenir expert en évaluation produit.
              On vous demande d'utiliser l'outil normalement et de nous dire ce que vous
              avez ressenti — c'est tout.
            </p>
            <ol className="space-y-4">
              {[
                {
                  title: 'Inscrivez-vous ici',
                  body: 'Quelques infos sur votre situation actuelle. On vous envoie un lien d\'accès dans la foulée.',
                },
                {
                  title: 'Testez avec votre vrai CV',
                  body: 'Faites-le pour de vrai, sur votre vraie situation. C\'est ce qui rend votre retour utile.',
                },
                {
                  title: 'Dites-nous ce que vous en pensez',
                  body: '5 questions courtes par email, à votre rythme. Pas de visio, pas de RDV — juste vos mots, quand vous avez 5 minutes.',
                },
              ].map((s, i) => (
                <li key={i} className="flex gap-4">
                  <span className="shrink-0 w-8 h-8 rounded-full bg-pink-500 text-white text-sm font-extrabold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-bold text-teal-800 mb-1">{s.title}</h3>
                    <p className="text-sm text-teal-800/80 leading-relaxed">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <aside className="bg-cream-50 border border-cream-200 rounded-2xl p-7 shadow-soft">
            <div className="flex items-start gap-4 mb-4">
              <CatMascot className="w-14 h-14 shrink-0" />
              <div>
                <h3 className="font-bold text-teal-800 mb-1">Ce qui nous intéresse</h3>
                <p className="text-sm text-teal-800/80">
                  Pas seulement « ça a marché ou pas ». Ce qu'on veut, c'est votre expérience honnête.
                </p>
              </div>
            </div>
            <ul className="space-y-3 text-sm">
              {[
                "Qu'est-ce qui vous a aidé concrètement ?",
                "Qu'est-ce qui vous a laissé sur votre faim ?",
                "Avez-vous compris ce qu'on attendait de vous à chaque étape ?",
                "Les pistes proposées vous ont-elles parlé ?",
                "Est-ce que vous recommanderiez à quelqu'un dans votre situation ?",
              ].map((q, i) => (
                <li key={i} className="flex items-start gap-2 text-teal-800/85">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-teal-600" />
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      {/* ─────────── Formulaire ─────────── */}
      <section id="formulaire" className="bg-cream-100 scroll-mt-24">
        <div className="max-w-2xl mx-auto px-6 py-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-teal-800 mb-3">
              Inscrivez-vous comme testeur
            </h2>
            <p className="text-teal-800/80">
              On vous envoie un lien d'accès par email sous 48 heures (souvent bien avant).
            </p>
          </div>

          {status === 'success' ? (
            <div className="bg-white border border-emerald-200 rounded-2xl p-8 shadow-card animate-fade-in text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="text-xl font-extrabold text-teal-800 mb-2">Merci, c'est noté !</h3>
              <p className="text-teal-800/85 leading-relaxed">
                On a bien reçu votre inscription. Vous recevrez un email avec votre lien d'accès
                à <strong>{form.email}</strong> dans les prochaines 48 heures.
              </p>
              <p className="text-sm text-teal-700/70 mt-3">
                Pensez à vérifier votre dossier de courrier indésirable au cas où.
              </p>
            </div>
          ) : (
            <form
              onSubmit={submit}
              className="bg-white border border-cream-200 rounded-2xl p-6 sm:p-8 shadow-card space-y-5"
              noValidate
            >
              {/* Honeypot anti-bot — invisible aux humains */}
              <div className="hidden" aria-hidden="true">
                <label>
                  Site web (laissez vide)
                  <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.website}
                    onChange={onChange('website')}
                  />
                </label>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Prénom et nom" required>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={onChange('name')}
                    placeholder="ex : Léa Dubois"
                    className="iamj-input"
                    maxLength={120}
                    autoComplete="name"
                  />
                </Field>
                <Field label="Email" required>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={onChange('email')}
                    placeholder="vous@exemple.fr"
                    className="iamj-input"
                    maxLength={200}
                    autoComplete="email"
                  />
                </Field>
              </div>

              <Field label="Téléphone (optionnel)">
                <input
                  type="tel"
                  value={form.phone}
                  onChange={onChange('phone')}
                  placeholder="06 ..."
                  className="iamj-input"
                  maxLength={40}
                  autoComplete="tel"
                />
              </Field>

              <Field
                label="Votre situation actuelle"
                required
                hint="En 2-3 phrases : êtes-vous en recherche d'emploi, en reconversion, en hésitation entre plusieurs voies ?"
              >
                <textarea
                  required
                  rows={4}
                  value={form.situation}
                  onChange={onChange('situation')}
                  placeholder="Ex : je suis en reconversion après 10 ans dans la vente, j'hésite entre la formation et le médico-social."
                  className="iamj-input resize-y"
                  maxLength={2000}
                />
              </Field>

              <Field label="Comment avez-vous entendu parler de IAMonJob ? (optionnel)">
                <input
                  type="text"
                  value={form.heardFrom}
                  onChange={onChange('heardFrom')}
                  placeholder="Bouche-à-oreille, conseiller, réseau social..."
                  className="iamj-input"
                  maxLength={120}
                />
              </Field>

              <label className="flex items-start gap-3 p-3 bg-cream-50 border border-cream-200 rounded-xl cursor-pointer hover:border-teal-200 transition-colors">
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={onChange('consent')}
                  className="mt-0.5 w-4 h-4 rounded border-cream-300 text-teal-600 focus:ring-teal-400"
                  required
                />
                <span className="text-sm text-teal-800/85 leading-relaxed">
                  J'accepte que mes informations soient utilisées <strong>uniquement</strong> dans le
                  cadre de cette phase de test (envoi d'un accès, recueil de retours).
                  Je peux demander leur suppression à tout moment en écrivant à{' '}
                  <a href="mailto:contact@cbe-sud94.org" className="text-teal-700 underline hover:text-teal-900">
                    contact@cbe-sud94.org
                  </a>.
                </span>
              </label>

              {status === 'error' && (
                <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <p className="text-xs text-teal-700/70">
                  Vos données restent confidentielles et ne sont jamais revendues.
                </p>
                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-600 text-white font-semibold shadow-card hover:bg-teal-700 disabled:bg-teal-300 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2"
                >
                  {status === 'submitting' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours…
                    </>
                  ) : (
                    <>
                      Envoyer mon inscription <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      <Footer />

      {/* Styles locaux : champs de formulaire */}
      <style jsx global>{`
        .iamj-input {
          display: block;
          width: 100%;
          padding: 0.625rem 0.875rem;
          background-color: #FBF8F2;
          border: 1px solid #EDE3CE;
          border-radius: 0.75rem;
          color: #0B3936;
          font-size: 0.95rem;
          transition: border-color .15s, box-shadow .15s, background-color .15s;
          outline: none;
        }
        .iamj-input:focus {
          border-color: #1F7D72;
          background-color: #fff;
          box-shadow: 0 0 0 3px rgba(31, 125, 114, 0.18);
        }
        .iamj-input::placeholder { color: rgba(11, 57, 54, 0.4); }
      `}</style>
    </div>
  );
}

/* ─────────── Sous-composant : champ de formulaire ─────────── */
function Field({ label, required, hint, children }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-teal-800 mb-1.5">
        {label}
        {required && <span className="text-pink-500 ml-1" aria-hidden="true">*</span>}
      </span>
      {children}
      {hint && <span className="block text-xs text-teal-700/70 mt-1.5">{hint}</span>}
    </label>
  );
}
