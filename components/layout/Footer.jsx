'use client';

import { BrandLogo } from '../brand';
import { Mail, Heart } from 'lucide-react';

export default function Footer() {
  const year = new Date().getFullYear();

  const legalLinks = [
    { label: 'Mentions légales',         href: '/mentions-legales' },
    { label: 'Politique de confidentialité', href: '/confidentialite' },
    { label: "Conditions d'utilisation",  href: '/cgu' },
    { label: 'Accessibilité',             href: '/accessibilite' },
  ];

  return (
    <footer className="bg-cream-50 border-t border-cream-200 mt-auto">
      <div className="max-w-[1280px] mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">

        {/* Bloc 1 : Identité + intro */}
        <div className="space-y-3">
          <BrandLogo size="sm" />
          <p className="text-sm text-teal-800/80 leading-relaxed">
            IAMONJOB accompagne les demandeurs d'emploi dans leur reconversion
            grâce à l'intelligence artificielle, en proposant des pistes
            réalistes et des outils concrets pour réussir.
          </p>
          <a
            href="mailto:contact@cbe-sud94.org"
            className="inline-flex items-center gap-1.5 text-sm text-teal-700 hover:text-teal-900 hover:underline"
          >
            <Mail className="w-4 h-4" /> contact@cbe-sud94.org
          </a>
        </div>

        {/* Bloc 2 : Liens légaux */}
        <div>
          <h3 className="text-xs font-bold tracking-[0.15em] text-teal-700/70 uppercase mb-3">
            Informations
          </h3>
          <ul className="space-y-2">
            {legalLinks.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="text-sm text-teal-800/90 hover:text-teal-600 hover:underline focus:outline-none focus:ring-2 focus:ring-teal-400 rounded"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Bloc 3 : Partenaire / Structure créatrice */}
        <div>
          <h3 className="text-xs font-bold tracking-[0.15em] text-teal-700/70 uppercase mb-3">
            Site réalisé par
          </h3>
          <a
            href="https://silveria.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex flex-col items-start gap-2 p-3 rounded-xl border border-cream-200 hover:border-teal-400 hover:bg-white transition-all focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            <img
              src="https://i.postimg.cc/HWBSwZTB/LOGO-CBE-SILVERIA.png"
              alt="CBE Silveria"
              className="h-14 w-auto"
              style={{ objectFit: 'contain' }}
            />
            <span className="text-xs text-teal-700/70 group-hover:text-teal-800">
              silveria.fr →
            </span>
          </a>
        </div>
      </div>

      {/* Bandeau bas */}
      <div className="border-t border-cream-200 bg-cream-100">
        <div className="max-w-[1280px] mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-teal-700/70">
          <p>© {year} IAMONJOB · Tous droits réservés.</p>
          <p className="inline-flex items-center gap-1">
            Fait avec
            <Heart className="w-3.5 h-3.5 text-pink-500" fill="currentColor" strokeWidth={0} />
            pour les demandeurs d'emploi
          </p>
        </div>
      </div>
    </footer>
  );
}
